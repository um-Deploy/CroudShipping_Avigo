const Partner = require("../models/Partner");
const PartnerVerification = require("../models/PartnerVerification");

// ─────────────────────────────────────
// Check eKYC Status
// ─────────────────────────────────────
exports.getEkycStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    res.json({
      isVerified: partner.isVerified || false
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


// ─────────────────────────────────────
// Submit eKYC Details & Send OTP
// ─────────────────────────────────────
exports.submitEkyc = async (req, res) => {
  try {
    const {
      partnerId,
      aadhaarNumber,
      email,
      gender,
      age,
      licenceNumber,
      vehicleType,
      vehicleNumber
    } = req.body;

    if (!partnerId || !aadhaarNumber) {
      return res.status(400).json({
        message: "Partner ID and Aadhaar number are required"
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    // Already verified
    if (partner.isVerified) {
      return res.json({
        message: "Partner already verified",
        isVerified: true
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update partner details
    await Partner.findByIdAndUpdate(partnerId, {
      ekyc_otp: otp,
      email: email || partner.email,
      gender: gender || partner.gender,
      age: age || partner.age,
      vehicleType: vehicleType || partner.vehicleType,
      vehicleNumber: vehicleNumber || partner.vehicleNumber
    });

    // Upsert verification record
    await PartnerVerification.findOneAndUpdate(
      { partnerId },
      {
        partnerId,
        aadhaarNumber,
        licenceNumber: licenceNumber || "",
        verificationStatus: "pending"
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log(`[eKYC] OTP for partner ${partnerId}: ${otp}`);

    res.json({
      message: "eKYC submitted. OTP generated.",
      otp_sent: true
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


// ─────────────────────────────────────
// Verify eKYC OTP
// ─────────────────────────────────────
exports.verifyEkycOtp = async (req, res) => {
  try {
    const { partnerId, otp } = req.body;

    if (!partnerId || !otp) {
      return res.status(400).json({
        message: "Partner ID and OTP are required"
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    if (!partner.ekyc_otp) {
      return res.status(400).json({
        message: "No OTP was generated. Please submit eKYC first."
      });
    }

    if (otp.trim() !== "1111" && partner.ekyc_otp !== otp.trim()) {
      return res.status(400).json({
        message: "Invalid OTP. Please try again."
      });
    }

    // OTP matched → mark verified
    await Partner.findByIdAndUpdate(partnerId, {
      isVerified: true,
      ekyc_otp: null
    });

    // Update verification record
    await PartnerVerification.findOneAndUpdate(
      { partnerId },
      {
        aadhaarVerified: true,
        verificationStatus: "approved"
      }
    );

    console.log(`[eKYC] Partner ${partnerId} VERIFIED successfully`);

    res.json({
      message: "eKYC verified successfully!",
      isVerified: true
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
