const express = require("express");
const router = express.Router();


const {
  registerUser,
  loginUser,
  loginWithPassword,
  setPassword,
  getMe
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login-password", loginWithPassword);
router.post("/set-password", setPassword);
router.get("/me", protect, getMe);

module.exports = router;