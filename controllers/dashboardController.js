const Order = require("../models/Order");
const User = require("../models/User");
const mongoose = require("mongoose");

const getDashboardStats = async (req, res) => {
  try {
    const role = req.user.role;

    // 👤 USER DASHBOARD
    if (role === "user") {
      const activeOrder = await Order.findOne({
        userId: req.user.id,
        status: { $in: ["pending", "accepted", "picked", "in_transit", "near_drop"] },
      }).populate("partnerId", "name phone profilePic rating vehicleNumber location");

      const totalOrders = await Order.countDocuments({ userId: req.user.id });
      const pending = await Order.countDocuments({
        userId: req.user.id,
        status: "pending",
      });
      const delivered = await Order.countDocuments({
        userId: req.user.id,
        status: "delivered",
      });

      return res.json({
        role,
        totalOrders,
        pending,
        delivered,
        activeOrder,
      });
    }

    // 🛵 PARTNER DASHBOARD
if (role === "partner") {
  const assigned = await Order.countDocuments({
    partnerId: req.user.id,
  });

  const completed = await Order.countDocuments({
    partnerId: req.user.id,
    status: "delivered",
  });

  const active = await Order.countDocuments({
    partnerId: req.user.id,
    status: { $in: ["accepted", "picked", "in_transit", "near_drop"] },
  });

  const earningsAgg = await Order.aggregate([
    {
      $match: {
        partnerId: new mongoose.Types.ObjectId(req.user.id),
        status: "delivered",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$price" },
      },
    },
  ]);

  const totalRevenue = earningsAgg[0]?.total || 0;

  // 🔥 Commission %
  const commissionPercentage = process.env.PARTNER_PERCENTAGE || 80;

  const totalEarnings = (totalRevenue * commissionPercentage) / 100;

  return res.json({
    role,
    assigned,
    active,
    completed,
    totalEarnings,
  });
}


   
    // 👑 ADMIN DASHBOARD

    if (role === "admin") {
  const totalUsers = await User.countDocuments({ role: "user" });
  const totalPartners = await User.countDocuments({ role: "partner" });
  const totalOrders = await Order.countDocuments();

  const activeOrders = await Order.countDocuments({
    status: { $in: ["pending", "accepted", "picked", "in_transit", "near_drop"] },
  });

  const revenueAgg = await Order.aggregate([
    { $match: { status: "delivered" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$price" },
      },
    },
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  return res.json({
    role,
    totalUsers,
    totalPartners,
    totalOrders,
    activeOrders,
    totalRevenue,
  });
}

    return res.status(403).json({ message: "Invalid role" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardStats };
