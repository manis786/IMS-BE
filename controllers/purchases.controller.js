import mongoose from 'mongoose';
import Purchase from '../models/purchases.model.js';
import Product from '../models/products.model.js';
import Supplier from '../models/suppliers.model.js';
import Transaction from '../models/transactions.model.js';
import Account from '../models/accounts.model.js';
import { postToLedger } from '../libs/journalHelper.js';

// =========================================================================
// 1. ADD PURCHASE (Only Draft/Pending Order Create)
// =========================================================================
export const addPurchase = async (req, res) => {
  try {
    const { supplier, items, totalAmount } = req.body;

    // Status default 'Pending' hi rahega (No Stock In, No Ledger Entry)
    const newPurchase = await Purchase.create({
      supplier,
      items,
      totalAmount,
      status: 'Pending'
    });

    res.status(201).json({ 
      success: true, 
      message: "Purchase order created as Pending", 
      data: newPurchase 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 2. GET ALL PURCHASES
// =========================================================================
export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name')             
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });      
      
    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// 3. RECEIVE & APPROVE PURCHASE (Purchase Manager Se Trigger Hoga)
// =========================================================================
export const receivePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // A. PO Fetch Check
    const purchase = await Purchase.findById(id).session(session);
    if (!purchase) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Purchase Order nahi mila" });
    }

    if (purchase.status === 'Approved' || purchase.status === 'Received') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Yeh PO pehle se Approve ho chuka hai" });
    }

    // B. Status set to 'Approved'
    purchase.status = 'Approved';
    await purchase.save({ session });

    // C. Supplier Balance Update (Liability)
    await Supplier.findByIdAndUpdate(
      purchase.supplier,
      { $inc: { balance: purchase.totalAmount } },
      { session }
    );

    // D. Stock In & Operational Transaction Logs
    for (const item of purchase.items) {
      const pId = item.product;
      const qty = Number(item.quantity);
      const cost = Number(item.costPrice);
      const totalItemAmount = qty * cost;

      await Transaction.create([{
        product: pId,
        type: 'PURCHASE',
        quantity: qty,
        price: cost,
        totalAmount: totalItemAmount,
        purchaseId: purchase._id,
        supplier: purchase.supplier || null
      }], { session });

      await Product.findByIdAndUpdate(
        pId,
        { $inc: { stock: qty } },
        { session }
      );
    }

    // E. Dynamic Double-Entry Ledger Posting By Codes (1301 & 2101)
    const inventoryCode = process.env.ACCOUNT_INVENTORY_CODE || '1301';
    const payableCode = process.env.ACCOUNT_PAYABLE_CODE || '2101';

    const inventoryAccount = await Account.findOne({ code: inventoryCode }).session(session);
    const payableAccount = await Account.findOne({ code: payableCode }).session(session);

    if (inventoryAccount && payableAccount) {
      const journalLines = [
        { accountId: inventoryAccount._id, debit: purchase.totalAmount, credit: 0 },
        { accountId: payableAccount._id, debit: 0, credit: purchase.totalAmount }
      ];

      if (typeof postToLedger === 'function') {
        await postToLedger({
          date: new Date(),
          description: `Approved Purchase Order - PO: PO-${purchase._id.toString().slice(-5).toUpperCase()}`,
          referenceType: 'PURCHASE',
          referenceId: purchase._id,
          lines: journalLines
        }, session);
      }
    } else {
      console.warn("⚠️ COA Accounts (1301/2101) match nahi hue. Double-Entry Posting skip hui!");
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Purchase Approved! Stock In and Double Entry Posted Successfully.",
      data: purchase
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Approve Purchase Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePurchaseStatus = async (req, res) => {
  return receivePurchase(req, res);
};