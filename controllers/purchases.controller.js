import mongoose from 'mongoose';
import Purchase from '../models/purchases.model.js';
import Product from '../models/products.model.js';
import Supplier from '../models/suppliers.model.js';
import Transaction from '../models/transactions.model.js'; // Transaction model import kiya
import { postToLedger } from '../libs/journalHelper.js';

const ACCOUNT_CONFIG = {
  INVENTORY: process.env.ACCOUNT_INVENTORY_ID || '65e1e345f123456789abcdef', 
  PAYABLE: process.env.ACCOUNT_PAYABLE_ID || '65e1f678f123456789abcdef'     
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const addPurchase = async (req, res) => {
  try {
    const newPurchase = await Purchase.create(req.body);
    res.status(201).json({ success: true, data: newPurchase });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name')             
      .populate('items.product', 'name');      
      
    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const receivePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase || purchase.status === 'Approved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid PO or already Approved" });
    }

    purchase.status = 'Approved';
    await purchase.save({ session });

    await Supplier.findByIdAndUpdate(
      purchase.supplier, 
      { $inc: { balance: purchase.totalAmount } },
      { session }
    );

    // Stock In History Logs for Receive Purchase
    for (const item of purchase.items) {
      const pId = item.productId || item.product;
      await Transaction.create([{
        product: pId,
        type: 'PURCHASE', // Type 'PURCHASE' rakha taake stock-in pehchana jaye
        quantity: Number(item.quantity),
        price: Number(item.price),
        totalAmount: Number(item.total || (item.quantity * item.price)),
        purchaseId: purchase._id,
        supplier: purchase.supplier || null
      }], { session });

      await Product.findByIdAndUpdate(
        pId, 
        { $inc: { stock: Number(item.quantity) } },
        { session }
      );
    }

    const allIdsValid = Object.values(ACCOUNT_CONFIG).every(id => isValidObjectId(id));
    if (allIdsValid) {
      const journalLines = [
        { accountId: ACCOUNT_CONFIG.INVENTORY, debit: purchase.totalAmount, credit: 0 },
        { accountId: ACCOUNT_CONFIG.PAYABLE, debit: 0, credit: purchase.totalAmount }
      ];

      await postToLedger({
        date: new Date(),
        description: `Purchase Approved - PO: ${purchase.poNumber || 'PO-' + purchase._id.toString().slice(-5).toUpperCase()}`,
        referenceType: 'PURCHASE',
        referenceId: purchase._id,
        lines: journalLines
      }, session);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePurchaseStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const currentPurchase = await Purchase.findById(id).session(session);
    if (!currentPurchase) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Purchase record nahi mila!" });
    }

    if (currentPurchase.status === 'approved' && status === 'approved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Purchase is already approved!" });
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true, session }
    );

    if (status === 'approved') {
      for (const item of updatedPurchase.items) {
        const pId = item.productId || item.product; 
        
        // Stock In History Log update status par bhi transaction sync karega
        await Transaction.create([{
          product: pId,
          type: 'PURCHASE',
          quantity: Number(item.quantity),
          price: Number(item.price),
          totalAmount: Number(item.total || (item.quantity * item.price)),
          purchaseId: updatedPurchase._id,
          supplier: updatedPurchase.supplier || null
        }], { session });

        await Product.findByIdAndUpdate(
          pId, 
          { $inc: { stock: Number(item.quantity) } },
          { session }
        );
      }

      const allIdsValid = Object.values(ACCOUNT_CONFIG).every(id => isValidObjectId(id));
      if (allIdsValid) {
        const journalLines = [
          { accountId: ACCOUNT_CONFIG.INVENTORY, debit: updatedPurchase.totalAmount, credit: 0 },
          { accountId: ACCOUNT_CONFIG.PAYABLE, debit: 0, credit: updatedPurchase.totalAmount }
        ];

        await postToLedger({
          date: new Date(),
          description: `Purchase Status Approved - PO: ${updatedPurchase.poNumber || 'PO-' + updatedPurchase._id.toString().slice(-5).toUpperCase()}`,
          referenceType: 'PURCHASE',
          referenceId: updatedPurchase._id,
          lines: journalLines
        }, session);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Status updated successfully", updatedPurchase });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Error:", err);
    res.status(500).json({ error: "Update failed: " + err.message });
  }
};