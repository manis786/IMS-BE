import mongoose from 'mongoose';

// Ensure standard collection schemas for Ledger/Journal exist or fall back safely
const JournalSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  referenceType: { type: String, required: true }, // e.g., 'POS_SALE', 'PURCHASE'
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  lines: [{
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  }]
}, { timestamps: true });

const Journal = mongoose.models.journals || mongoose.model('journals', JournalSchema);

/**
 * Double-Entry Core Helper function (NAMED EXPORT)
 * This safely logs financial balances into MongoDB within a transaction session.
 */
export const postToLedger = async (journalData, session) => {
  try {
    const { date, description, referenceType, referenceId, lines } = journalData;

    // 1. Double Entry validation check: Debits MUST equal Credits
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    // Rounding off difference check to prevent precision drops
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Accounting Equation Violation! Total Debit (${totalDebit}) must equal Total Credit (${totalCredit}).`);
    }

    // 2. Insert dynamic double-entry lines safely bound to the session
    const newJournal = new Journal({
      date,
      description,
      referenceType,
      referenceId,
      lines
    });

    await newJournal.save({ session });
    console.log(`✅ Ledger Posted Automatically: ${description}`);
    return true;
  } catch (error) {
    console.error("❌ Double Entry Posting Failed:", error.message);
    throw error; // Throwing error triggers mongoose session transaction rollback automatically
  }
};