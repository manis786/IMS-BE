import Transaction from '../models/transactions.model.js'; // .js extension zaroori hai ES Modules mein

export const addTransaction = async (req, res) => {
  try {
    // Sahi tarike se data destructure karo
    const { product, type, quantity, price, totalAmount, refId, purchaseId, saleId, supplier } = req.body;
    
    if (!product || !quantity || !type) {
       return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const newTransaction = await Transaction.create({
      product, type, quantity, price, totalAmount, refId, purchaseId, saleId, supplier
    });

    res.status(201).json({ success: true, data: newTransaction });
  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getTransactionsByProduct = async (req, res) => {
  try {
    const transactions = await Transaction.find({ product: req.params.productId }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('product', 'name')      // Product ka naam
      .populate('customer', 'name')     // Customer ka naam (Nayi Field)
      .populate('supplier', 'name')     // Supplier ka naam (Nayi Field)
      .sort({ createdAt: -1 });         // 'date' ki jagah 'createdAt' use karo

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all transactions" });
  }
};