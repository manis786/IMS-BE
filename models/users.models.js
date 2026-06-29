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
    isActive: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
    },
}, { timestamps: true })

const Users = mongoose.model("Users", userSchema)
export default Users