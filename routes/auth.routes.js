import express from "express"
import { registerUser , getAllUser , verifyOTP, loginUser, resendOtp} from "../controllers/users.controller.js"

const router = express.Router()

// Signup/Register Route
router.route("/register").post(registerUser)
router.route("/getAllusers").get(getAllUser)
router.route("/verify").get(verifyOTP)
router.route("/resendOTP").post(resendOtp)

// Login Route
router.route("/login").post(loginUser)


export default router