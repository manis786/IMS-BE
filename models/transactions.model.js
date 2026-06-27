import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Core Data
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { 
    type: String, 
    enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'WASTAGE'], 
    required: true 
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // Per unit price
  
  // Nayi Field: Total Amount
  totalAmount: { type: Number, required: true }, // quantity * price
  
  // Relations (Nullable)
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', default: null },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  
  // Reference & Notes
  refId: { type: String, default: null }, 
  notes: { type: String, default: null }
  
}, { 
  timestamps: true 
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;