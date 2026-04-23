/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  PRICING SERVICE — Rideshare Parcel Pricing Engine
 *
 *  Pricing is based on:
 *   1. Distance bucket (same_city, local, short, medium, long)
 *   2. Weight slab (upTo500g, upTo1kg, upTo2kg, upTo4kg, upTo8kg, upTo10kg)
 *   3. Delivery type charge (standard, express, sameDay)
 * ──────────────────────────────────────────────────────────────────────────────
 */

const PricingConfig = require("../models/PricingConfig");

let _cachedConfig = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CONFIG = {
  label: "default",
  isActive: true,
};

const getConfig = async () => {
  const now = Date.now();
  if (_cachedConfig && now < _cacheExpiry) {
    return _cachedConfig;
  }

  const config = await PricingConfig.findOneAndUpdate(
    { isActive: true },
    { $setOnInsert: DEFAULT_CONFIG },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      sort: { updatedAt: -1, createdAt: -1 },
    }
  );

  _cachedConfig = config;
  _cacheExpiry = now + CACHE_TTL_MS;
  return config;
};

const invalidateCache = () => {
  _cachedConfig = null;
  _cacheExpiry = 0;
};

// ── CORE CALCULATION ─────────────────────────────────────────────────────

const calculatePrice = async ({
  length = 0,
  breadth = 0,
  height = 0,
  deadWeight = 0,
  distance = 0,
  deliveryType = "standard",
  pickupCity = "",
  dropCity = "",
}) => {
  const config = await getConfig();

  // 1. Distance Bucket & Base Price
  let distanceCategory = "";
  let basePrice = 0;

  const isSameCity =
    pickupCity &&
    dropCity &&
    pickupCity.trim().toLowerCase() === dropCity.trim().toLowerCase();

  if (isSameCity) {
    distanceCategory = "same_city";
    basePrice = config.sameCityBase;
  } else if (distance <= 50) {
    distanceCategory = "local";
    basePrice = config.localBase;
  } else if (distance <= 200) {
    distanceCategory = "short";
    basePrice = config.shortBase;
  } else if (distance <= 600) {
    distanceCategory = "medium";
    basePrice = config.mediumBase;
  } else {
    distanceCategory = "long";
    basePrice = config.longBase;
  }

  // 2. Delivery Type Charge & Validation
  const deliveryKey = _normalizeDeliveryType(deliveryType);
  if (distanceCategory === "long" && deliveryKey === "sameDay") {
    const error = new Error("Same-day delivery is not available for long distances");
    error.statusCode = 400;
    throw error;
  }

  // 3. Weight Calculation
  const volumetricWeight =
    length > 0 && breadth > 0 && height > 0
      ? (length * breadth * height) / (config.volumetricDivisor || 5000)
      : 0;

  const chargeableWeight = Math.max(deadWeight, volumetricWeight);

  // 4. Weight Slab Pricing
  let weightCharge = 0;
  if (chargeableWeight <= 0.5) {
    weightCharge = config.weightIncrements.upTo500g;
  } else if (chargeableWeight <= 1) {
    weightCharge = config.weightIncrements.upTo1kg;
  } else if (chargeableWeight <= 2) {
    weightCharge = config.weightIncrements.upTo2kg;
  } else if (chargeableWeight <= 4) {
    weightCharge = config.weightIncrements.upTo4kg;
  } else if (chargeableWeight <= 8) {
    weightCharge = config.weightIncrements.upTo8kg;
  } else {
    // Cap at the maximum weight increment for anything > 8kg
    weightCharge = config.weightIncrements.upTo10kg;
  }

  // 5. Delivery Type Charge Cost
  const deliveryCharge = config.deliveryCharges?.[deliveryKey] ?? 0;

  // 6. Surge Multiplier (Future)
  const surgeMultiplier = config.surgeMultiplier ?? 1.0;

  // 7. Subtotal
  const rawSubtotal = (basePrice + weightCharge + deliveryCharge) * surgeMultiplier;
  const computedDeliveryFee = rawSubtotal - basePrice;

  // 8. Fees & Taxes (Kept from old to match orderController expectations)
  const platformFee = (rawSubtotal * (config.platformFeePercent || 0)) / 100;
  const gst = (platformFee * (config.gstPercent || 0)) / 100;

  const totalAmount = rawSubtotal + platformFee + gst;

  const r = (n) => Math.round(n * 100) / 100;

  return {
    volumetricWeight: r(volumetricWeight),
    chargeableWeight: r(chargeableWeight),
    deadWeight: r(deadWeight),

    distanceCategory,
    baseFare: r(basePrice),
    basePrice: r(basePrice),
    weightCharge: r(weightCharge),
    deliveryCharge: r(deliveryCharge),
    deliveryFee: r(computedDeliveryFee),

    deliveryType: deliveryKey,
    surgeMultiplier: r(surgeMultiplier),

    subtotal: r(rawSubtotal),
    platformFee: r(platformFee),
    gst: r(gst),

    totalAmount: r(totalAmount),
    distance: r(distance)
  };
};

const _normalizeDeliveryType = (raw) => {
  const cleaned = String(raw || "standard").trim().toLowerCase();
  if (cleaned === "same day" || cleaned === "sameday" || cleaned === "same_day") return "sameDay";
  if (cleaned === "express") return "express";
  return "standard";
};

module.exports = {
  calculatePrice,
  getConfig,
  invalidateCache,
};
