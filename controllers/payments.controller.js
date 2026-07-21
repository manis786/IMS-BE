import mongoose from 'mongoose';
import Transaction from '../models/transactions.model.js';
import Sale from '../models/sale.model.js';
import Purchase from '../models/purchases.model.js';
import Customer from '../models/customer.model.js';
import Supplier from '../models/suppliers.model.js';
import Account from '../models/accounts.model.js';
import { postToLedger } from '../libs/journalHelper.js'; // Ensure path is correct for your project

export const receiveCustomerPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, amountPaid, paymentMethod, referenceNo } = req.body;

    if (!customerId || !amountPaid || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: "Customer ID, amount paid, and payment method are required." 
      });
    }

    const paidAmountVal = Number(amountPaid);

    // 1. Dynamic Account Fetching (COA se direct find karega taake mismatch ka masla na ho)
    const cashAccount = await Account.findOne({ 
      $or: [{ type: 'Cash' }, { type: 'Bank' }, { code: '1101' }] 
    }).session(session);

    const receivableAccount = await Account.findOne({ 
      $or: [{ type: 'Accounts Receivable' }, { code: '1201' }] 
    }).session(session);

    if (!cashAccount || !receivableAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: "Accounting Error: Cash/Bank or Accounts Receivable account is missing in Chart of Accounts!" 
      });
    }

    // 2. Customer ki unpaid/pending invoices fetch karo (FIFO method - Purani pehle)[cite: 4]
    const unpaidInvoices = await Sale.find({ 
      customer: customerId, 
      paymentStatus: { $ne: 'Paid' } 
    }).sort({ createdAt: 1 }).session(session);

    let remainingPayment = paidAmountVal;
    const allocations = [];

    // 3. Invoices ke against payment adjust karo[cite: 4]
    for (let invoice of unpaidInvoices) {
      if (remainingPayment <= 0) break;

      const dueAmount = (invoice.grandTotal || invoice.totalAmount) - (invoice.paidAmount || 0);

      if (remainingPayment >= dueAmount) {
        remainingPayment -= dueAmount;
        invoice.paidAmount = invoice.grandTotal || invoice.totalAmount;
        invoice.paymentStatus = 'Paid';
        invoice.remainingAmount = 0;
        invoice.status = 'paid';
      } else {
        invoice.paidAmount = (invoice.paidAmount || 0) + remainingPayment;
        invoice.paymentStatus = 'Partial';
        invoice.remainingAmount = (invoice.grandTotal || invoice.totalAmount) - invoice.paidAmount;
        remainingPayment = 0;
      }

      await invoice.save({ session });
      allocations.push({ invoiceId: invoice._id, allocatedAmount: invoice.paidAmount });
    }

    // 4. Customer ka total balance update karo (Udhaar kam hoga)
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { balance: -paidAmountVal }
    }, { session });

    let advanceAmount = 0;
    if (remainingPayment > 0) {
      advanceAmount = remainingPayment;
    }

    // 5. Financial Transaction record create karo[cite: 4]
    const paymentTransaction = await Transaction.create([{
      type: 'RECEIVE_PAYMENT',
      customer: customerId,
      totalAmount: paidAmountVal,
      paymentMethod,
      refId: referenceNo,
      notes: `Payment received: ${paidAmountVal} (Allocated: ${paidAmountVal - advanceAmount}, Advance: ${advanceAmount})`
    }], { session });

    // 6. Double-Entry Ledger Posting (Debit: Cash/Bank, Credit: Accounts Receivable)
    await postToLedger({
      date: new Date(),
      description: `Customer Payment Received - Ref: ${referenceNo || 'N/A'}`,
      referenceType: 'RECEIVE_PAYMENT',
      referenceId: paymentTransaction[0]._id,
      lines: [
        { accountId: cashAccount._id, debit: paidAmountVal, credit: 0 },
        { accountId: receivableAccount._id, debit: 0, credit: paidAmountVal }
      ]
    }, session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Customer payment received, allocated, and posted to ledger successfully.",
      data: {
        paymentTransaction: paymentTransaction[0],
        allocations,
        advanceCredit: advanceAmount
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const paySupplierBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplierId, amountPaid, paymentMethod, referenceNo } = req.body;

    if (!supplierId || !amountPaid || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: "Supplier ID, amount paid, and payment method are required." 
      });
    }

    const paidAmountVal = Number(amountPaid);

    // Dynamic Account Fetching for Supplier Payment
    const cashAccount = await Account.findOne({ 
      $or: [{ type: 'Cash' }, { type: 'Bank' }, { code: '1001' }] 
    }).session(session);

    const payableAccount = await Account.findOne({ 
      $or: [{ type: 'Accounts Payable' }, { code: '2101' }] 
    }).session(session);

    if (!cashAccount || !payableAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        message: "Accounting Error: Cash/Bank or Accounts Payable account is missing in Chart of Accounts!" 
      });
    }

    // 1. Supplier ke unpaid/pending purchase bills fetch karo (FIFO method - Purane pehle)[cite: 4]
    const unpaidBills = await Purchase.find({ 
      supplier: supplierId, 
      paymentStatus: { $ne: 'Paid' } 
    }).sort({ createdAt: 1 }).session(session);

    let remainingPayment = paidAmountVal;
    const allocations = [];

    // 2. Bills ke against payment adjust karo[cite: 4]
    for (let bill of unpaidBills) {
      if (remainingPayment <= 0) break;

      const dueAmount = bill.totalAmount - (bill.paidAmount || 0);

      if (remainingPayment >= dueAmount) {
        remainingPayment -= dueAmount;
        bill.paidAmount = bill.totalAmount;
        bill.paymentStatus = 'Paid';
      } else {
        bill.paidAmount = (bill.paidAmount || 0) + remainingPayment;
        bill.paymentStatus = 'Partial';
        remainingPayment = 0;
      }

      await bill.save({ session });
      allocations.push({ billId: bill._id, allocatedAmount: bill.paidAmount });
    }

    let advanceAmount = 0;
    if (remainingPayment > 0) {
      advanceAmount = remainingPayment;
    }

    // 3. Financial Transaction record create karo[cite: 4]
    const paymentTransaction = await Transaction.create([{
      type: 'PAY_SUPPLIER',
      supplier: supplierId,
      totalAmount: paidAmountVal,
      paymentMethod,
      refId: referenceNo,
      notes: `Supplier payment paid: ${paidAmountVal} (Allocated: ${paidAmountVal - advanceAmount}, Advance: ${advanceAmount})`
    }], { session });

    // 4. Double-Entry Ledger Posting for Supplier Payment (Debit: Accounts Payable, Credit: Cash/Bank)
    await postToLedger({
      date: new Date(),
      description: `Supplier Payment Paid - Ref: ${referenceNo || 'N/A'}`,
      referenceType: 'PAY_SUPPLIER',
      referenceId: paymentTransaction[0]._id,
      lines: [
        { accountId: payableAccount._id, debit: paidAmountVal, credit: 0 },
        { accountId: cashAccount._id, debit: 0, credit: paidAmountVal }
      ]
    }, session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Supplier payment processed and posted to ledger successfully.",
      data: {
        paymentTransaction: paymentTransaction[0],
        allocations,
        advanceCredit: advanceAmount
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Supplier Payment Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};