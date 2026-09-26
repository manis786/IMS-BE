import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    name: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        enum: ['ADMIN', 'MANAGER', 'CASHIER', 'AUDITOR'],
        default: 'CASHIER'
    },
    branch: {
        type: String,
        default: 'Karachi HQ'
    },
    phone: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    otp: {
        type: String,
    },
}, { timestamps: true })

const Users = mongoose.model("Users", userSchema)
export default Users