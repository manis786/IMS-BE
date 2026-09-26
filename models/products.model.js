import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { 
    type: String, 
    unique: true, 
    sparse: true,
    default: () => `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  costPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  minStock: { type: Number, default: 10 },
  barcode: { type: String, default: '' },
  status: { type: String, default: "active" }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

export default Product