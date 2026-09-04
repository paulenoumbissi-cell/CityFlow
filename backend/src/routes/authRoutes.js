import { Router } from "express";
import {
  login,
  register,
  sendOtp,
  verifyOtp,
  resendOtp,
  updateProfile,
} from "../controllers/authController.js";

const router = Router();

// Routes OTP SMS / WhatsApp
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

// Routes classiques & Profil
router.post("/login", login);
router.post("/register", register);
router.put("/profile", updateProfile);

export default router;
