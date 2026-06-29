import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  costPrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  // stock field ko ab logic mein use nahi karenge
  minStock: { type: Number, default: 10 },
  barcode: { type: String },
  status: { type: String, default: "active" }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

export default Product