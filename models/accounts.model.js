import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  level: { 
    type: Number, 
    enum: [1, 2, 3] 
  },
  type: { 
    type: String, 
    enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] 
  },
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    default: null 
  },
  isGroup: { 
    type: Boolean, 
    default: false 
  }
});

const Account = mongoose.model('Account', accountSchema);

export default Account;