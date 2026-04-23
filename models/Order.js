const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Partner",
    default: null,
  },

  trackingId: {
    type: String,
    unique: true
  },

  dispatchRound: {
    type: Number,
    default: 0
  },

  dispatchAttempts: {
    type: Number,
    default: 0
  },

  isDispatched: {
    type: Boolean,
    default: false
  },

  pickup: {
    address: String,
    lat: Number,
    lng: Number,
  },

  drop: {
    address: String,
    lat: Number,
    lng: Number,
  },

  receiver: {
    name: { type: String, required: true, default: "Receiver" },
    phone: { type: String, required: true, default: "" },
    optionalPhone: { type: String, default: "" },
  },
  distance: {
    type: Number,
    default: 0
  },

  parcelType: {
    type: String,
    enum: ["document", "box", "fragile", "other"],
    default: "document",
  },

  weight: Number,

  price: Number,

  paymentMode: {
    type: String,
    enum: ["cash", "online", "wallet"],
    default: "online",
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "paid",
  },

  paymentGateway: {
    type: String,
    default: "razorpay",
  },

  transactionId: {
    type: String,
    default: "",
  },

  baseFare: {
    type: Number,
    default: 0
  },

  deliveryFee: {
    type: Number,
    default: 0
  },

  platformFee: {
    type: Number,
    default: 0
  },

  discount: {
    type: Number,
    default: 0
  },

  gstAmount: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  pickupOtp: {
    type: String,
    default: null
  },

  deliveryOtp: {
    type: String,
    default: null
  },

  status: {
    type: String,
    enum: [
      "pending",
      "accepted",
      "picked",
      "in_transit",
      "near_drop",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

});

orderSchema.index({ userId: 1 });
orderSchema.index({ partnerId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);