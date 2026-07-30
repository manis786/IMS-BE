import mongoose from 'mongoose';
import Voucher from '../models/voucher.model.js';
import JournalEntry from '../models/journal.model.js';

// 1. Get Next Sequential Voucher Number
export const getNextVoucherNumber = async (req, res) => {
    try {
        const { type } = req.params;
        
        const prefixes = {
            'Cash Payment': 'CP',
            'Cash Receipt': 'CR',
            'Bank Payment': 'BP',
            'Bank Receipt': 'BR',
            'Journal': 'JV'
        };

        const prefix = prefixes[type] || 'VO';
        const year = new Date().getFullYear();
        const regexPattern = new RegExp(`^${prefix}-${year}-\\d+$`);

        // Database se us type ka last voucher find karo
        const lastVoucher = await Voucher.findOne({ 
            voucherType: type, 
            voucherNumber: { $regex: regexPattern } 
        }).sort({ createdAt: -1 });

        let nextSeq = 1;

        if (lastVoucher && lastVoucher.voucherNumber) {
            const parts = lastVoucher.voucherNumber.split('-');
            const lastNum = parseInt(parts[2], 10);
            if (!isNaN(lastNum)) {
                nextSeq = lastNum + 1;
            }
        }

        const paddedSeq = String(nextSeq).padStart(3, '0');
        const nextVoucherNumber = `${prefix}-${year}-${paddedSeq}`;

        return res.status(200).json({ success: true, voucherNumber: nextVoucherNumber });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Create Voucher & Post to Journal Entry
export const createVoucher = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { voucherType, voucherNumber, date, items, narration } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Voucher must have at least one line item.' });
        }

        let totalDebit = 0;
        let totalCredit = 0;

        items.forEach(item => {
            totalDebit += Number(item.debit) || 0;
            totalCredit += Number(item.credit) || 0;
        });

        // Double Entry Validation Check
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ 
                success: false, 
                message: `Debit and Credit must be equal. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}` 
            });
        }

        // 1. Save Voucher Header & Items
        const newVoucher = new Voucher({
            voucherType,
            voucherNumber,
            date: date || Date.now,
            items,
            totalAmount: totalDebit
        });

        const savedVoucher = await newVoucher.save({ session });

        // 2. Format lines according to your JournalEntry schema
        const journalLines = items.map(item => ({
            accountId: item.account, // JournalLineSchema expects accountId
            debit: item.debit || 0,
            credit: item.credit || 0
        }));

        // 3. Create Journal Entry
        const journalEntry = new JournalEntry({
            date: savedVoucher.date,
            description: narration || `${savedVoucher.voucherType} - ${savedVoucher.voucherNumber}`,
            referenceType: 'MANUAL', // Allowed enum value in your journal model
            referenceId: savedVoucher._id,
            lines: journalLines
        });

        await journalEntry.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: 'Voucher created and posted to journals successfully',
            data: savedVoucher
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ success: false, error: error.message });
    }
};