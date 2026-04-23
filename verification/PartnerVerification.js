const mongoose = require("mongoose");

const partnerVerificationSchema = new mongoose.Schema({

  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    required: true
  },

  aadhaarNumber: {
    type: String,
    required: true
  },

  aadhaarVerified: {
    type: Boolean,
    default: false
  },

  licenceNumber: {
    type: String,
    required: true
  },

  licenceVerified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model(
  "PartnerVerification",
  partnerVerificationSchema
);