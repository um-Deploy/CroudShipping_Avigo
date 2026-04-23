const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const PricingConfig = require("../models/PricingConfig");
const { invalidateCache } = require("../services/pricingService");

// ── GET current active pricing config ────────────────────────────────────
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const config = await PricingConfig.findOneAndUpdate(
      { isActive: true },
      { $setOnInsert: { label: "default", isActive: true } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        sort: { updatedAt: -1, createdAt: -1 },
      }
    );

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch config", error: error.message });
  }
});

// ── UPDATE pricing config ────────────────────────────────────────────────
router.put("/", protect, adminOnly, async (req, res) => {
  try {
    const config = await PricingConfig.findOneAndUpdate(
      { isActive: true },
      { $set: req.body },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        sort: { updatedAt: -1, createdAt: -1 },
      }
    );

    // Invalidate in-memory cache so next request gets fresh values
    invalidateCache();

    res.json({
      message: "Pricing config updated successfully",
      config,
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
});

module.exports = router;
