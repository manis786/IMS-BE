import express from "express"
import { registerUser, getAllUser, verifyOTP, loginUser, resendOtp, updateUser, deleteUser } from "../controllers/users.controller.js"

const router = express.Router()

// User CRUD & Auth Routes
router.route("/register").post(registerUser)
router.route("/getAllusers").get(getAllUser)
router.route("/users").get(getAllUser).post(registerUser)
router.route("/users/:id").put(updateUser).delete(deleteUser)
router.route("/verify").get(verifyOTP).post(verifyOTP)
router.route("/resendOTP").post(resendOtp)

// Login Route
router.route("/login").post(loginUser)

export default router