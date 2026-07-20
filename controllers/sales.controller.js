import mongoose from 'mongoose';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import { postToLedger } from '../libs/journalHelper.js';

// Chart of Accounts IDs Configuration
const ACCOUNT_CONFIG = {
  CASH: process.env.ACCOUNT_CASH_ID || '65e1a123f123456789abcdef',       
  RECEIVABLE: process.env.ACCOUNT_RECEIVABLE_ID || '65e1b456f123456789abcdef', 
  REVENUE: process.env.ACCOUNT_REVENUE_ID || '65e1c789f123456789abcdef',    
  COGS: process.env.ACCOUNT_COGS_ID || '65e1d012f123456789abcdef',       
  INVENTORY: process.env.ACCOUNT_INVENTORY_ID || '65e1e345f123456789abcdef',
  DISCOUNT_ALLOWED: process.env.ACCOUNT_DISCOUNT_ID || '65e1f999f123456789abcdef', // 🔥 Added
  TAX_PAYABLE: process.env.ACCOUNT_TAX_ID || '65e1f888f123456789abcdef'            // 🔥 Added
};

// Safety check function for Mongo ObjectIds
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createSale = async (req, res) => {
  // Database ACID Transaction Session Start
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, items, subTotal, discount, tax, grandTotal, paymentMethod, type, status } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Items are missing!" });
    }

    const currentStatus = status || 'paid';
    let remainingAmount = (currentStatus === 'pending' || paymentMethod === 'Credit') ? grandTotal : 0;

    // 1. Sale Header Save
  const newSale = new Sale({
      customer: customerId && isValidObjectId(customerId) ? new mongoose.Types.ObjectId(customerId) : null,
      invoiceNumber: `INV-${Date.now()}`,
      subTotal,
      discount: discount || 0,
      tax: tax || 0,
      grandTotal,
      paymentMethod,
      remainingAmount,
      type: type || 'pos',
      status: paymentMethod === 'Credit' ? 'pending' : 'paid'
    });

    const savedSale = await newSale.save({ session });

    let totalCOGS = 0;

    // 2. Process Items (Transactions & Stock)
    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      
      const productDoc = await Product.findById(item.productId).session(session);
      if (!productDoc) {
        throw new Error(`Product with ID ${item.productId} not found!`);
      }
      
      const itemCost = Number(productDoc.costPrice || 0);
      totalCOGS += (itemCost * qty);

      // Stock transaction details register karein
      await Transaction.create([{
        product: item.productId,
        type: 'SALE',
        quantity: qty,
        price: price,
        totalAmount: Number(item.total || (qty * price)),
        saleId: savedSale._id,
        customer: customerId && isValidObjectId(customerId) ? customerId : null
      }], { session });

      // Stock minus karein
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -qty }
      }, { session });
    }

    // 3. Customer Udhaar Balance update
    if (paymentMethod === 'Credit' && customerId && isValidObjectId(customerId)) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { balance: grandTotal }
      }, { session });
    }

    // 4. POS (Cash) Sale Double-Entry Ledger Posting
if (paymentMethod !== 'Credit') {
      const allIdsValid = Object.values(ACCOUNT_CONFIG).every(id => isValidObjectId(id));
      
      if (allIdsValid) {
        const journalLines = [
          { accountId: ACCOUNT_CONFIG.CASH, debit: grandTotal, credit: 0 },
          { accountId: ACCOUNT_CONFIG.REVENUE, debit: 0, credit: subTotal }, // Gross Base Revenue
          { accountId: ACCOUNT_CONFIG.COGS, debit: totalCOGS, credit: 0 },
          { accountId: ACCOUNT_CONFIG.INVENTORY, debit: 0, credit: totalCOGS }
        ];

        // Dynamic checking: Agar invoice par discount hai to Expense/Discount allowed badhao
        if (discount > 0) {
          journalLines.push({ accountId: ACCOUNT_CONFIG.DISCOUNT_ALLOWED, debit: discount, credit: 0 });
        }
        // Dynamic checking: Agar invoice par tax charged hai to tax liability badhao
        if (tax > 0) {
          journalLines.push({ accountId: ACCOUNT_CONFIG.TAX_PAYABLE, debit: 0, credit: tax });
        }

        await postToLedger({
          date: new Date(),
          description: `POS Cash Sale - Invoice #${savedSale.invoiceNumber}`,
          referenceType: 'POS_SALE',
          referenceId: savedSale._id,
          lines: journalLines
        }, session);
      }
    }

    // Agar sab sahi chala toh database changes permanently save ho jayengi
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Sale successful", invoiceId: savedSale._id });
  } catch (err) {
    // Agar koi ek bhi error aya toh pura transaction rollback
    await session.abortTransaction();
    session.endSession();
    console.error("Sale Error Detail:", err);
    res.status(500).json({ error: "Sale failed: " + err.message });
  }
};

export const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.status(200).json(sales);
  } catch (err) {
    res.status(500).json({ error: "Errors While Fetching Sales Data" });
  }
};

export const updateSaleStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const currentSale = await Sale.findById(id).session(session);
    if (!currentSale) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Sale invoice nahi mili!" });
    }

    // Double entry duplication safety check
    if (currentSale.status === 'approved' && status === 'approved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invoice is already approved!" });
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true, session }
    );

    // Credit sales approval par ledger entry generate karein
  if (status === 'approved' && updatedSale.paymentMethod === 'Credit') {
      const stockTransactions = await Transaction.find({ saleId: updatedSale._id }).session(session);
      let totalCOGS = 0;

      for (const trans of stockTransactions) {
        const prod = await Product.findById(trans.product).session(session);
        if (prod) totalCOGS += (Number(prod.costPrice || 0) * trans.quantity);
      }

      const allIdsValid = Object.values(ACCOUNT_CONFIG).every(id => isValidObjectId(id));

      if (allIdsValid) {
        const journalLines = [
          { accountId: ACCOUNT_CONFIG.RECEIVABLE, debit: updatedSale.grandTotal, credit: 0 },
          { accountId: ACCOUNT_CONFIG.REVENUE, debit: 0, credit: updatedSale.subTotal },
          { accountId: ACCOUNT_CONFIG.COGS, debit: totalCOGS, credit: 0 },
          { accountId: ACCOUNT_CONFIG.INVENTORY, debit: 0, credit: totalCOGS }
        ];

        if (updatedSale.discount > 0) {
          journalLines.push({ accountId: ACCOUNT_CONFIG.DISCOUNT_ALLOWED, debit: updatedSale.discount, credit: 0 });
        }
        if (updatedSale.tax > 0) {
          journalLines.push({ accountId: ACCOUNT_CONFIG.TAX_PAYABLE, debit: 0, credit: updatedSale.tax });
        }

        await postToLedger({
          date: new Date(),
          description: `Credit Sale Approved - Invoice #${updatedSale.invoiceNumber}`,
          referenceType: 'CREDIT_SALE',
          referenceId: updatedSale._id,
          lines: journalLines
        }, session);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Sale status updated successfully", updatedSale });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Update failed: " + err.message });
  }
};