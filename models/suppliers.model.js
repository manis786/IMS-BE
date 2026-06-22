import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  city: { type: String },
  address: { type: String },
  balance: { type: Number, default: 0 },
  paymentTerms: { type: String, default: 'Net 30' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  totalOrders: { type: Number, default: 0 }
}, { timestamps: true });

// ID ka auto-increment ya custom logic agar chahiye toh yahan set kar sakte hain
// Filhal MongoDB ki default _id use hogi

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;