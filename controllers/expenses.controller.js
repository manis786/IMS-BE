import mongoose from 'mongoose';
import Expense from '../models/expenses.model.js';
import Account from '../models/accounts.model.js';
import { postToLedger } from '../libs/journalHelper.js';

// 1. Get All Expenses
export const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create Expense
export const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, category, amount, date, paymentMethod, status, branch, description } = req.body;

    if (!title || !category || amount === undefined || amount === null) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Title, category, and amount are required.' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    const newExpense = new Expense({
      title,
      category,
      amount: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'Cash',
      status: status || 'Paid',
      branch: branch || 'Karachi HQ',
      description: description || ''
    });

    const savedExpense = await newExpense.save({ session });

    // Double-entry posting if status is 'Paid'
    if (savedExpense.status === 'Paid') {
      try {
        const cashOrBank = savedExpense.paymentMethod === 'Cash'
          ? await Account.findOne({ $or: [{ code: '1001' }, { code: '1101' }, { type: 'Cash' }] }).session(session)
          : await Account.findOne({ $or: [{ code: '1102' }, { type: 'Bank' }] }).session(session);

        const expenseAccount = await Account.findOne({ 
          $or: [
            { name: { $regex: new RegExp(category, 'i') } },
            { type: 'Expense' }
          ] 
        }).session(session);

        if (cashOrBank && expenseAccount) {
          await postToLedger({
            date: new Date(savedExpense.date),
            description: `Expense: ${savedExpense.title} (${savedExpense.category})`,
            referenceType: 'EXPENSE',
            referenceId: savedExpense._id,
            lines: [
              { accountId: expenseAccount._id, debit: numAmount, credit: 0 },
              { accountId: cashOrBank._id, debit: 0, credit: numAmount }
            ]
          }, session);
        }
      } catch (ledgerErr) {
        console.warn('⚠️ Double-entry posting skipped for expense:', ledgerErr.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Expense recorded successfully!', data: savedExpense });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Create Expense Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Delete Expense
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
