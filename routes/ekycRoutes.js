const express = require("express");
const router = express.Router();

const {
  getEkycStatus,
  submitEkyc,
  verifyEkycOtp
} = require("../controllers/ekycController");

// GET /api/ekyc/status/:partnerId
router.get("/status/:partnerId", getEkycStatus);

// POST /api/ekyc/submit
router.post("/submit", submitEkyc);

// POST /api/ekyc/verify
router.post("/verify", verifyEkycOtp);

module.exports = router;
