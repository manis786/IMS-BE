import mongoose from 'mongoose';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';

export const createSale = async (req, res) => {
  try {
    const { customerId, items, subTotal, discount, tax, grandTotal, paymentMethod, type } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are missing!" });
    }

    // 1. Sale Header Save
    const newSale = new Sale({
      customer: customerId ? new mongoose.Types.ObjectId(customerId) : null,
      invoiceNumber: `INV-${Date.now()}`,
      subTotal,
      discount,
      tax,
      grandTotal,
      paymentMethod,
      type: type || 'pos',
      status: paymentMethod === 'Credit' ? 'pending' : 'paid'
    });

    const savedSale = await newSale.save();

    // 2. Process Items (Transactions & Stock)
    for (const item of items) {
      console.log("ITEM DATA RECEIVED:", item);
      // Save Detail Record
      const qty = Number(item.quantity) || 0; 
  const total = Number(item.total) || 0;
  await Transaction.create({
    product: item.productId,
    type: 'SALE',
    quantity: Number(item.quantity), // Explicit Number conversion
    price: Number(item.price),
    totalAmount: Number(item.total), // Yeh field 'totalAmount' hai
    saleId: savedSale._id,
    customer: customerId || null
  });

      // Stock Deduction
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // 3. Customer Ledger (If Udhaar)
    if (paymentMethod === 'Credit' && customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { balance: grandTotal }
      });
    }

    res.status(201).json({ message: "Sale successful", invoiceId: savedSale._id });
  } catch (err) {
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
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Status update karo
    const updatedSale = await Sale.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ message: "Sale invoice nahi mili!" });
    }

    res.status(200).json({ message: "Sale status updated successfully", updatedSale });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Update failed: " + err.message });
  }
};