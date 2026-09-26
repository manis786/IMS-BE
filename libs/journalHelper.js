import JournalEntry from '../models/journal.model.js';

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
    const newJournal = new JournalEntry({
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