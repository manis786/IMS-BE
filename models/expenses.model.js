import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  category: { 
    type: String, 
    required: true,
    trim: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  date: { 
    type: String, 
    required: true, 
    default: () => new Date().toISOString().split('T')[0] 
  },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque'], 
    default: 'Cash' 
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending'], 
    default: 'Paid' 
  },
  branch: { 
    type: String, 
    default: 'Karachi HQ' 
  },
  description: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
