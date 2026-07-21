import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Core Data (Payment ke waqt inhein optional kar diya hai taaki error na aaye)
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
  type: { 
    type: String, 
    enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'WASTAGE', 'RECEIVE_PAYMENT', ''], 
    required: true 
  },
  quantity: { type: Number, required: false },
  price: { type: Number, required: false }, // Per unit price
  
  // Total Amount (Payment ke waqt yeh amountPaid ke barabar aa jayegi)
  totalAmount: { type: Number, required: true }, 
  
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