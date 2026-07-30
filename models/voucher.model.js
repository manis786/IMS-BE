import mongoose from 'mongoose';

const voucherItemSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    debit: {
        type: Number,
        default: 0,
        min: 0
    },
    credit: {
        type: Number,
        default: 0,
        min: 0
    },
    narration: {
        type: String,
        trim: true
    }
});

const voucherSchema = new mongoose.Schema({
    voucherType: {
        type: String,
        enum: ['Cash Payment', 'Cash Receipt', 'Bank Payment', 'Bank Receipt', 'Journal'],
        required: true
    },
    voucherNumber: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    items: [voucherItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Draft', 'Posted'],
        default: 'Posted'
    }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);