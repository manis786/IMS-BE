import Transaction from '../models/transactions.model.js'; // .js extension zaroori hai ES Modules mein

export const addTransaction = async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to log transaction" });
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
      .populate('product', 'name') 
      .sort({ date: -1 });
      
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all transactions" });
  }
};