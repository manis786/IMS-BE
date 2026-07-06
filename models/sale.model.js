import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
  invoiceNumber: { type: String, required: true, unique: true },
  date: { 
    type: String, 
    required: true,
    default: () => new Date().toISOString().split('T')[0] // Fallback agar date na aaye
  },
  subTotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Mobile', 'Credit'], required: true },
  type: { type: String, enum: ['pos', 'credit'], default: 'pos' },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  remainingAmount: { type: Number, default: 0 }
}, { timestamps: true });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;