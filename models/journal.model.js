import mongoose from 'mongoose';

const JournalLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account', // 🔥 FIXED: 'accounts' ko badal kar 'Account' kiya model sync ke liye
    required: true
  },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 }
});

const JournalEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  description: { type: String, required: true, trim: true },
  referenceType: {
    type: String,
    enum: ['POS_SALE', 'CREDIT_SALE', 'PURCHASE', 'MANUAL'],
    required: true
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lines: [JournalLineSchema]
}, {
  timestamps: true
});

// Double entry balancing safeguard rules
JournalEntrySchema.pre('save', function (next) {
  const totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  // Floating point adjustment (.01 rounding handle)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return next(new Error(`Accounting Rule Violation: Total Debits (${totalDebit.toFixed(2)}) must equal Total Credits (${totalCredit.toFixed(2)})`));
  }
  next();
});

export default mongoose.model('JournalEntry', JournalEntrySchema, 'journals');