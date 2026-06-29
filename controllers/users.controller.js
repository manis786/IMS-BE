import configs from "../config/config.js"
import { generateOtp } from "../libs/generateOTP.js"
import transporter from "../libs/mailTransportter.js"
import { errorRes, successRes } from "../libs/responseHandler.js"
import Users from "../models/users.models.js"
import jwt from "jsonwebtoken"

import bcrypt from "bcryptjs"

const registerUser = async (req, res) => {
    try {
        const { userName, email, password } = req.body;
        const salt = await bcrypt.genSalt(8)
        const OTP = generateOtp()
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await Users.create({
            userName,
            email,
            password: hashedPassword,
            otp: OTP
        })
        console.log("OTP ==>", OTP);
        await transporter.sendMail({
            from: configs.SMTP_USER,
            to: email,
            subject: "Please Verify Your Email",
            html: `<h1>Please Verify Your Email Account</h1>
      </br>
      </br>
      <b>Your OTP is ${OTP}</b>`
        })
        successRes(res, 200, true, "User created successfully! Please verify your email!", null)
    } catch (error) {
        errorRes(res, 400, false, error.message || "Something went wrong, please try later!", null)
    }
}
const getAllUser = async (req, res) => {
    try {
        const response = await Users.find()
        successRes(res, 200, true, "USers Fetched", response)
        console.log("All Users Fetched from Database")
    } catch (error) {
        errorRes(res, 400, false, "Error While Getting Users from Database", null)
        console.log("Error While Getting Users from Database")
    }
}
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
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
        await transporter.sendMail({
            from: configs.SMTP_USER,
            to: email,
            subject: "Your Account is Now Verified",
            html: `<h1>EMAIL VERIFIED</h1>
            <h3>Your Email is Now Verified and You can Login With Your Email</h3>
      </br>
      </br>
      `
        })
        return successRes(res, 200, true, "Email Verified Successfully! You can Login with Your Email", null);
    } catch (error) {
        return errorRes(res, 500, false, error.message || "Something went wrong during Verification!", null);
    }
}
// const loginUser = async (req, res) => {
//     console.log("Request received at /api/auth/login with body:", req.body);
//     try {
//         const { email, password } = req.body
//         if (!email || !password) {
//             return errorRes(res, 400, false, "Please Enter User Details for Login", null)
//             console.log("Please Enter User Email or Password to Continue")
//             console.log(req.body)
//         }
//         // Check Email from Database
//         const user = await Users.findOne({ email })
//         if (!user) {
//             return errorRes(res, 400, false, "Email Id not Found, Please Register!")
//         }
//         if (!user.isActive) {
//             return errorRes(res, 400, false, "Your Account is not Active , Please Verify!", null)
//         }
//         // Compare Password

//         const isMatched = await bcrypt.compare(password, user.password)
//         if (!isMatched) {
//             return errorRes(res, 400, false, "Invalid Credentials", null)
//         }
//         // Generate Token

//         const token = jwt.sign({
//             userName: user.userName,
//             email: user.email,
//             id: user.id
//         }, configs.JWT_SECRET)

//       return res.status(200).json({ success: true, message: "Login Successful", token: token });
//     } catch (error) {
//         errorRes(res, 400, false, error.message || "Error While Login", null)
//     }
// }


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

        const token = jwt.sign({ id: user.id }, configs.JWT_SECRET);
        
        // Sirf ye ek line return karo
        return res.status(200).json({ success: true, token: token });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) {
            return errorRes(res, 400, false, "User not Found", null)
        }
        const user = await Users.findOne({ email })
        if (!user) {
            return errorRes(res, 400, false, "User Not Found", null)
        }
        if (user.isActive) {
            return errorRes(res, 400, false, "This User is Already Verified , Please Login", null)
        }
        const newOTP = generateOtp()
        user.otp = newOTP
        await user.save()
        await transporter.sendMail({
            from: configs.SMTP_USER,
            to: email,
            subject: "Please Verify Your Email",
            html: `<h1>Please Verify Your Email Account</h1>
      </br>
      </br>
      <b>Your OTP is ${newOTP}</b>`
        })


        successRes(res, 200, true, "OTP Resend , Please Check your Email")
    } catch (error) {
        errorRes(res, 400, false, error.message || "Error Occured", null)
    }

}
export { registerUser, getAllUser, verifyOTP, loginUser, resendOtp }