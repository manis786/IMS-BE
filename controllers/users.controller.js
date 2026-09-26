import configs from "../config/config.js"
import { generateOtp } from "../libs/generateOTP.js"
import transporter from "../libs/mailTransportter.js"
import { errorRes, successRes } from "../libs/responseHandler.js"
import Users from "../models/users.models.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const registerUser = async (req, res) => {
    try {
        const { userName, name, email, password, role, branch, phone } = req.body;
        const salt = await bcrypt.genSalt(8)
        const OTP = generateOtp()
        const hashedPassword = await bcrypt.hash(password || 'User@123', salt);
        
        const newUser = await Users.create({
            userName: userName || email?.split('@')[0] || `user_${Date.now()}`,
            name: name || userName || '',
            email,
            password: hashedPassword,
            role: role || 'CASHIER',
            branch: branch || 'Karachi HQ',
            phone: phone || '',
            isActive: true,
            otp: OTP
        });

        try {
            if (configs.SMTP_USER && configs.SMTP_PASS) {
                await transporter.sendMail({
                    from: configs.SMTP_USER,
                    to: email,
                    subject: "Please Verify Your Email",
                    html: `<h1>Welcome to Exclusive Mart ERP</h1>
              <p>Your account has been created.</p>
              <b>Your OTP is ${OTP}</b>`
                });
            }
        } catch (mailErr) {
            console.warn("Mail sending skipped:", mailErr.message);
        }

        successRes(res, 200, true, "User created successfully!", newUser);
    } catch (error) {
        errorRes(res, 400, false, error.message || "Something went wrong, please try later!", null);
    }
};

const getAllUser = async (req, res) => {
    try {
        const response = await Users.find().select("-password").sort({ createdAt: -1 });
        successRes(res, 200, true, "Users Fetched", response);
    } catch (error) {
        errorRes(res, 400, false, "Error While Getting Users from Database", null);
    }
};

const verifyOTP = async (req, res) => {
    try {
        const email = req.body?.email || req.query?.email;
        const otp = req.body?.otp || req.query?.otp;
        if (!email || !otp) {
            return errorRes(res, 400, false, "Email and OTP are required!", null);
        }
        const user = await Users.findOne({ email });
        if (!user) {
            return errorRes(res, 404, false, "User not Found with this Email!", null);
        }
        if (String(user.otp) !== String(otp)) {
            return errorRes(res, 400, false, "Invalid OTP ! Verification Failed.", null);
        }
        user.isActive = true;
        user.otp = null;
        await user.save();
        return successRes(res, 200, true, "Email Verified Successfully! You can Login with Your Email", null);
    } catch (error) {
        return errorRes(res, 500, false, error.message || "Something went wrong during Verification!", null);
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and Password required" });
        }

        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const isMatched = await bcrypt.compare(password, user.password);
        if (!isMatched) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            configs.JWT_SECRET,
            { expiresIn: '9h' }
        );

        return res.status(200).json({ 
            success: true, 
            token: token,
            user: {
                id: user._id,
                userName: user.userName,
                name: user.name || user.userName,
                email: user.email,
                role: user.role || 'CASHIER',
                branch: user.branch || 'Karachi HQ',
                phone: user.phone || '',
                isActive: user.isActive
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Agar password update ho raha hai toh usko hash karein
        if (updateData.password) {
            const salt = await bcrypt.genSalt(8);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        const updated = await Users.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
        if (!updated) return res.status(404).json({ success: false, message: "User not found" });
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Users.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "User not found" });
        return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorRes(res, 400, false, "User not Found", null);
        }
        const user = await Users.findOne({ email });
        if (!user) {
            return errorRes(res, 400, false, "User Not Found", null);
        }
        if (user.isActive) {
            return errorRes(res, 400, false, "This User is Already Verified , Please Login", null);
        }
        const newOTP = generateOtp();
        user.otp = newOTP;
        await user.save();
        try {
            if (configs.SMTP_USER && configs.SMTP_PASS) {
                await transporter.sendMail({
                    from: configs.SMTP_USER,
                    to: email,
                    subject: "Please Verify Your Email",
                    html: `<h1>Please Verify Your Email Account</h1>
              <p>Your OTP is ${newOTP}</p>`
                });
            }
        } catch (mailErr) {
            console.warn("Mail send skipped:", mailErr.message);
        }

        successRes(res, 200, true, "OTP Resend, Please Check your Email");
    } catch (error) {
        errorRes(res, 400, false, error.message || "Error Occurred", null);
    }
};

export { registerUser, getAllUser, verifyOTP, loginUser, resendOtp, updateUser, deleteUser };