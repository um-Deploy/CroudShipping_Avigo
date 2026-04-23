const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const Order = require("../models/Order");




const {
  createOrder,
  estimatePrice,
  getPendingOrders,
  acceptOrder,
  rejectOrder,
  cancelOrderByUser,
  updateOrderStatus,
  getMyOrders,
  getActiveOrder,
  getPublicOrderByTrackingId
} = require("../controllers/orderController");

router.get("/public/:trackingId", getPublicOrderByTrackingId);
router.post("/estimate-price", protect, estimatePrice);
router.post("/create", protect, createOrder);
router.get("/pending", protect, getPendingOrders);
router.put("/accept/:id", protect, acceptOrder);
router.put("/reject/:id", protect, rejectOrder);
router.put("/cancel/:id", protect, cancelOrderByUser);
router.put("/status/:id", protect, updateOrderStatus);
router.get("/active", protect, getActiveOrder);

router.get("/all", protect, adminOnly, async (req, res) => {

  const orders = await Order.find()
  .populate("userId","name phone")
  .populate("partnerId","name phone");

  res.json(orders);

});

router.get("/my", protect, getMyOrders);

module.exports = router;
