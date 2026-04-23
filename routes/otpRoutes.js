const express = require("express");
const router = express.Router();

const {
  getLoginAccountOptions,
  sendSignupOtp,
  verifySignupOtp,
  sendLoginOtp,
  verifyLoginOtp,
} = require("../controllers/otpController");

// ================================
// 🔹 SIGNUP OTP
// ================================
router.post("/send-signup-otp", sendSignupOtp);
router.post("/verify-signup-otp", verifySignupOtp);

// ================================
// 🔹 LOGIN OTP
// ================================
router.post("/login-options", getLoginAccountOptions);
router.post("/send-login-otp", sendLoginOtp);
router.post("/verify-login-otp", verifyLoginOtp);

module.exports = router;
