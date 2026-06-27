import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  
  subTotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  
  paymentMethod: { type: String, enum: ['Cash', 'Card', 'Mobile', 'Credit'], required: true },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' }
}, { timestamps: true });

const Sale = mongoose.model('Sale', saleSchema);
export default Sale;