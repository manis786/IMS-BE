import mongoose from 'mongoose';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';
import Account from '../models/accounts.model.js'; // Ensure path is correct for your project
import { postToLedger } from '../libs/journalHelper.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("--- CREATE SALE INCOMING REQ.BODY ---", JSON.stringify(req.body, null, 2));

    const { 
      customerId, 
      items, 
      subTotal, 
      discount, 
      tax, 
      grandTotal, 
      paymentMethod, 
      type, 
      status 
    } = req.body;

    let { deliveryCharges } = req.body;

    if (!items || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Items are missing!" });
    }

    const computedGrandTotal = Number(grandTotal) || 0;
    const subTotalVal = Number(subTotal) || 0;
    const taxVal = Number(tax) || 0;
    const discountVal = Number(discount) || 0;

    let deliveryVal = Number(deliveryCharges) || 0;
    if (deliveryVal === 0) {
      const calculatedExtras = subTotalVal + taxVal - discountVal;
      if (computedGrandTotal > calculatedExtras) {
        deliveryVal = Number((computedGrandTotal - calculatedExtras).toFixed(2));
      }
    }

    const currentStatus = status || 'paid';
    let remainingAmount = (currentStatus === 'pending' || paymentMethod === 'Credit') ? computedGrandTotal : 0;

    const newSale = new Sale({
      customer: customerId && isValidObjectId(customerId) ? new mongoose.Types.ObjectId(customerId) : null,
      invoiceNumber: `INV-${Date.now()}`,
      subTotal: subTotalVal,
      discount: discountVal,
      tax: taxVal,
      deliveryCharges: deliveryVal,
      grandTotal: computedGrandTotal,
      paymentMethod,
      remainingAmount,
      type: type || 'pos',
      status: paymentMethod === 'Credit' ? 'pending' : 'paid'
    });

    const savedSale = await newSale.save({ session });

    let totalCOGS = 0;

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      
      const productDoc = await Product.findById(item.productId).session(session);
      if (!productDoc) {
        throw new Error(`Product with ID ${item.productId} not found!`);
      }
      
      const itemCost = Number(productDoc.costPrice || 0);
      totalCOGS += (itemCost * qty);

      await Transaction.create([{
        product: item.productId,
        type: 'SALE',
        quantity: qty,
        price: price,
        totalAmount: Number(item.total || (qty * price)),
        saleId: savedSale._id,
        customer: customerId && isValidObjectId(customerId) ? customerId : null
      }], { session });

      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -qty }
      }, { session });
    }

    if (paymentMethod === 'Credit' && customerId && isValidObjectId(customerId)) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { balance: computedGrandTotal }
      }, { session });
    }

    if (paymentMethod !== 'Credit') {
      // 🔥 Dynamic Account Fetching by Codes (COA se direct uthayega)
      const cashAccount = await Account.findOne({ code: process.env.ACCOUNT_CASH_CODE || '1001' }).session(session);
      const revenueAccount = await Account.findOne({ code: process.env.ACCOUNT_REVENUE_CODE || '4107' }).session(session);
      const cogsAccount = await Account.findOne({ code: process.env.ACCOUNT_COGS_CODE || '5107' }).session(session);
      const inventoryAccount = await Account.findOne({ code: process.env.ACCOUNT_INVENTORY_CODE || '1301' }).session(session);

      if (!cashAccount || !revenueAccount || !cogsAccount || !inventoryAccount) {
        throw new Error("Essential accounting accounts (Cash, Revenue, COGS, Inventory) are missing in Chart of Accounts!");
      }

      const journalLines = [
        { accountId: cashAccount._id, debit: computedGrandTotal, credit: 0 },
        { accountId: revenueAccount._id, debit: 0, credit: subTotalVal },
        { accountId: cogsAccount._id, debit: totalCOGS, credit: 0 },
        { accountId: inventoryAccount._id, debit: 0, credit: totalCOGS }
      ];

      if (taxVal > 0) {
        const taxAccount = await Account.findOne({ code: process.env.ACCOUNT_TAX_CODE || '2201' }).session(session);
        if (taxAccount) journalLines.push({ accountId: taxAccount._id, debit: 0, credit: taxVal });
      }

      if (deliveryVal > 0) {
        const deliveryAccount = await Account.findOne({ code: process.env.ACCOUNT_DELIVERY_CODE || '4101' }).session(session);
        if (deliveryAccount) journalLines.push({ accountId: deliveryAccount._id, debit: 0, credit: deliveryVal });
      }

      if (discountVal > 0) {
        const discountAccount = await Account.findOne({ code: process.env.ACCOUNT_DISCOUNT_CODE || '5101' }).session(session);
        if (discountAccount) journalLines.push({ accountId: discountAccount._id, debit: discountVal, credit: 0 });
      }

      await postToLedger({
        date: new Date(),
        description: `POS Cash Sale - Invoice #${savedSale.invoiceNumber}`,
        referenceType: 'POS_SALE',
        referenceId: savedSale._id,
        lines: journalLines
      }, session);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Sale successful", invoiceId: savedSale._id });
  } catch (err) {
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

    if (status === 'approved' && updatedSale.paymentMethod === 'Credit') {
      const stockTransactions = await Transaction.find({ saleId: updatedSale._id }).session(session);
      let totalCOGS = 0;

      for (const trans of stockTransactions) {
        const prod = await Product.findById(trans.product).session(session);
        if (prod) totalCOGS += (Number(prod.costPrice || 0) * trans.quantity);
      }

      // 🔥 Dynamic Account Fetching for Credit Sales
      const receivableAccount = await Account.findOne({ code: process.env.ACCOUNT_RECEIVABLE_CODE || '1201' }).session(session);
      const revenueAccount = await Account.findOne({ code: process.env.ACCOUNT_REVENUE_CODE || '4107' }).session(session);
      const cogsAccount = await Account.findOne({ code: process.env.ACCOUNT_COGS_CODE || '5107' }).session(session);
      const inventoryAccount = await Account.findOne({ code: process.env.ACCOUNT_INVENTORY_CODE || '1301' }).session(session);

      if (!receivableAccount || !revenueAccount || !cogsAccount || !inventoryAccount) {
        throw new Error("Essential accounting accounts (Receivable, Revenue, COGS, Inventory) are missing in Chart of Accounts!");
      }

      const subTotalVal = Number(updatedSale.subTotal || 0);
      const taxVal = Number(updatedSale.tax || 0);
      let deliveryVal = Number(updatedSale.deliveryCharges || 0);
      const discountVal = Number(updatedSale.discount || 0);
      const grandTotalVal = Number(updatedSale.grandTotal || 0);

      if (deliveryVal === 0) {
        const calculatedExtras = subTotalVal + taxVal - discountVal;
        if (grandTotalVal > calculatedExtras) {
          deliveryVal = Number((grandTotalVal - calculatedExtras).toFixed(2));
        }
      }

      const journalLines = [
        { accountId: receivableAccount._id, debit: grandTotalVal, credit: 0 },
        { accountId: revenueAccount._id, debit: 0, credit: subTotalVal },
        { accountId: cogsAccount._id, debit: totalCOGS, credit: 0 },
        { accountId: inventoryAccount._id, debit: 0, credit: totalCOGS }
      ];

      if (taxVal > 0) {
        const taxAccount = await Account.findOne({ code: process.env.ACCOUNT_TAX_CODE || '2201' }).session(session);
        if (taxAccount) journalLines.push({ accountId: taxAccount._id, debit: 0, credit: taxVal });
      }

      if (deliveryVal > 0) {
        const deliveryAccount = await Account.findOne({ code: process.env.ACCOUNT_DELIVERY_CODE || '4101' }).session(session);
        if (deliveryAccount) journalLines.push({ accountId: deliveryAccount._id, debit: 0, credit: deliveryVal });
      }

      if (discountVal > 0) {
        const discountAccount = await Account.findOne({ code: process.env.ACCOUNT_DISCOUNT_CODE || '5101' }).session(session);
        if (discountAccount) journalLines.push({ accountId: discountAccount._id, debit: discountVal, credit: 0 });
      }

      await postToLedger({
        date: new Date(),
        description: `Credit Sale Approved - Invoice #${updatedSale.invoiceNumber}`,
        referenceType: 'CREDIT_SALE',
        referenceId: updatedSale._id,
        lines: journalLines
      }, session);
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

export const getUnpaidSalesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!isValidObjectId(customerId)) {
      return res.status(400).json({ message: "Invalid Customer ID format!" });
    }

    const unpaidSales = await Sale.find({
      customer: customerId,
      $or: [
        { status: 'pending' },
        { remainingAmount: { $gt: 0 } }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(unpaidSales);
  } catch (err) {
    console.error("Fetch Unpaid Sales Error:", err);
    res.status(500).json({ error: "Failed to fetch unpaid invoices: " + err.message });
  }
};