import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Received', 'Approved'], default: 'Pending' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Purchase', purchaseSchema);