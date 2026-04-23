const mongoose = require("mongoose");

const pricingConfigSchema = new mongoose.Schema({

  // ── Rideshare Base Pricing (By Distance Bucket) ────────────────────────
  sameCityBase: { type: Number, default: 79, min: 0 },
  localBase: { type: Number, default: 99, min: 0 },
  shortBase: { type: Number, default: 129, min: 0 },
  mediumBase: { type: Number, default: 149, min: 0 },
  longBase: { type: Number, default: 199, min: 0 },

  // ── Weight Increments ──────────────────────────────────────────────────
  weightIncrements: {
    upTo500g: { type: Number, default: 0, min: 0 },
    upTo1kg: { type: Number, default: 50, min: 0 },
    upTo2kg: { type: Number, default: 100, min: 0 },
    upTo4kg: { type: Number, default: 200, min: 0 },
    upTo8kg: { type: Number, default: 300, min: 0 },
    upTo10kg: { type: Number, default: 450, min: 0 }
  },

  // ── Delivery Type Charges ──────────────────────────────────────────────
  deliveryCharges: {
    standard: { type: Number, default: 0, min: 0 },
    express:  { type: Number, default: 50, min: 0 },
    sameDay:  { type: Number, default: 100, min: 0 },
  },

  volumetricDivisor: {
    type: Number,
    default: 5000
  },

  // ── Fees & Taxes ───────────────────────────────────────────────────────
  platformFeePercent: { type: Number, default: 10, min: 0, max: 100 },
  gstPercent: { type: Number, default: 18, min: 0, max: 100 },

  // ── Surge Multiplier (future-ready) ────────────────────────────────────
  surgeMultiplier: {
    type: Number,
    default: 1.0,
    min: 1.0
  },

  // ── Meta ────────────────────────────────────────────────────────────────
  isActive: {
    type: Boolean,
    default: true
  },

  label: {
    type: String,
    default: "default"
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

// Pre-save hook to update timestamp
pricingConfigSchema.pre("findOneAndUpdate", function () {
  this.set({ updatedAt: new Date() });
});

module.exports = mongoose.model("PricingConfig", pricingConfigSchema);
