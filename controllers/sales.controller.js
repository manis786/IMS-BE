import mongoose from 'mongoose';
import Sale from '../models/sale.model.js';
import Transaction from '../models/transactions.model.js';
import Product from '../models/products.model.js';
import Customer from '../models/customer.model.js';

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, items, subTotal, discount, tax, grandTotal, paymentMethod } = req.body;

    // 1. Sale Header Save
    const newSale = new Sale({
      customer: customerId,
      invoiceNumber: `INV-${Date.now()}`,
      subTotal,
       discount, 
       tax,
       grandTotal, 
       paymentMethod,
       status: paymentMethod === 'Credit' ? 'pending' : 'paid'
      
    });
    const savedSale = await newSale.save({ session });

    // 2. Process Items (Transactions & Stock)
    for (const item of items) {
      // Save Detail Record
      await Transaction.create([{
        product: item.productId,
        type: 'SALE',
        quantity: item.quantity,
        price: item.price,
        totalAmount: item.total, // Ensure this is (qty * price)
        saleId: savedSale._id,
        customer: customerId
      }], { session });

      // Stock Deduction
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      }, { session });
    }

    // 3. Customer Ledger (If Udhaar)
    if (paymentMethod === 'Credit') {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { balance: grandTotal }
      }, { session });
    }

    await session.commitTransaction();
    res.status(201).json({ message: "Sale successful", invoiceId: savedSale._id });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: "Sale failed: " + err.message });
  } finally {
    session.endSession();
  }
};