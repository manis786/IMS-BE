import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
  balance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

// Bas ye line change ki hai:
const Customer = mongoose.model('Customer', customerSchema);
export default Customer;