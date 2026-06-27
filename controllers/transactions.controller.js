import Transaction from '../models/transactions.model.js'; // .js extension zaroori hai ES Modules mein

export const addTransaction = async (req, res) => {
  try {
    // Ab 'totalAmount' bhi req.body se aayega
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to log transaction: " + err.message });
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