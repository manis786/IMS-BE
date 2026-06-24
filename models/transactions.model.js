import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'WASTAGE'], required: true },
  quantity: { type: Number, required: true },
  refId: { type: String },
  date: { type: Date, default: Date.now },
  notes: { type: String }
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;