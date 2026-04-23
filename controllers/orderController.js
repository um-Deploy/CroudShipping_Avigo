const Order = require("../models/Order");
const Partner = require("../models/Partner");
const User = require("../models/User");
const axios = require("axios");
const { getIO } = require("../socket");
const { sendOTPdelivery } = require("../services/smsServicedelivered");
const { calculatePrice } = require("../services/pricingService");

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

const normalizePhone = (phone) => String(phone || "").trim();

const hasSamePhone = (left, right) => {
  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);

  return normalizedLeft !== "" && normalizedLeft === normalizedRight;
};

const buildPublicOrderPayload = (order) => ({
  _id: order._id,
  trackingId: order.trackingId,
  status: order.status,
  createdAt: order.createdAt,
  pickup: order.pickup,
  drop: order.drop,
  receiver: {
    name: order.receiver?.name || "Receiver",
    phone: order.receiver?.phone || "",
    optionalPhone: order.receiver?.optionalPhone || "",
  },
  parcelType: order.parcelType,
  weight: order.weight,
  distance: order.distance,
  price: order.price,
  totalAmount: order.totalAmount,
  paymentMode: order.paymentMode,
  paymentStatus: order.paymentStatus,
  userId: order.userId
    ? {
      _id: order.userId._id,
      name: order.userId.name,
    }
    : null,
  partnerId: order.partnerId
    ? {
      _id: order.partnerId._id,
      name: order.partnerId.name,
      phone: order.partnerId.phone,
      rating: order.partnerId.rating,
      vehicleType: order.partnerId.vehicleType,
      vehicleNumber: order.partnerId.vehicleNumber,
      profilePic: order.partnerId.profilePic,
    }
    : null,
});



const redispatchOrder = async (orderId, io) => {
  try {

    const order = await Order.findById(orderId);

    if (!order) return;


    // stop if already accepted, Prevent redispatch after cancellation
    if (order.status !== "pending" || order.isDispatched) return;



    // limit redispatch attempts
    if (order.dispatchRound >= 5) return;

    // validate pickup location
    if (!order.pickup || !order.pickup.lng || !order.pickup.lat) {
      console.log("Invalid pickup location");
      return;
    }

    const round = order.dispatchRound + 1;

    const radius = 5000 * round;

    const partners = await Partner.find({
      isOnline: true,
      isBusy: false,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              order.pickup.lng,
              order.pickup.lat
            ]
          },
          $maxDistance: radius
        }
      }
    });

    const orderUser = await User.findById(order.userId).select("phone");
    const eligiblePartners = partners.filter(
      (partner) => !hasSamePhone(partner.phone, orderUser?.phone)
    );


    if (eligiblePartners.length === 0) {
      order.dispatchRound = round;
      await order.save();

      setTimeout(() => {
        redispatchOrder(order._id, io);
      }, 10000);

      return;
    }


    eligiblePartners.forEach((partner) => {
      io.to(`partner-${partner._id}`).emit("newOrderRequest", {
        orderId: order._id,
        trackingId: order.trackingId,
        pickupOtp: order.pickupOtp,
        pickup: order.pickup,
        drop: order.drop,
        price: order.price,
        parcelType: order.parcelType,
        distance: Number(order.distance.toFixed(2))
      });
    });


    order.dispatchRound = round;
    await order.save();

    // schedule next redispatch round
    setTimeout(() => {
      redispatchOrder(order._id, io);
    }, 10000);

  } catch (err) {
    console.log("Redispatch error:", err.message);
  }
};





// 🔹 Get My Orders
const getMyOrders = async (req, res) => {
  try {

    let orders;

    if (req.user.role === "user") {

      orders = await Order.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .populate("userId", "name phone")
        .populate("partnerId", "name phone location");

    }
    else if (req.user.role === "partner") {

      orders = await Order.find({ partnerId: req.user.id })
        .sort({ createdAt: -1 })
        .populate("userId", "name phone")
        .populate("partnerId", "name phone location");

    }
    else if (req.user.role === "admin") {

      // 🔥 ADMIN CAN SEE ALL ORDERS
      orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate("userId", "name phone")
        .populate("partnerId", "name phone");

    }

    res.json(orders);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPublicOrderByTrackingId = async (req, res) => {
  try {
    const trackingId = String(req.params.trackingId || "").trim().toUpperCase();

    if (!trackingId) {
      return res.status(400).json({
        message: "Tracking ID is required",
      });
    }

    const order = await Order.findOne({ trackingId })
      .populate("userId", "name")
      .populate(
        "partnerId",
        "name phone rating vehicleType vehicleNumber profilePic"
      );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(buildPublicOrderPayload(order));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching public order",
      error: error.message,
    });
  }
};


const getRouteDistance = async (pickup, drop) => {
  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}` +
      `?overview=false&access_token=${MAPBOX_TOKEN}`;

    const response = await axios.get(url);

    if (!response.data.routes || response.data.routes.length === 0) {
      return 0;
    }

    const distanceMeters = response.data.routes[0].distance;
    return distanceMeters / 1000;

  } catch (error) {
    console.log("Mapbox distance error:", error.message);
    return 0;
  }
};


// 🔹 Estimate Price (pre-booking — NO order created)
const estimatePrice = async (req, res) => {
  try {
    const {
      pickup, drop,
      length, breadth, height,
      weight, deliveryType,
      productWorth, vehicleType,
      pickupCity, dropCity
    } = req.body;

    // Require pickup + drop for distance
    if (!pickup?.lat || !pickup?.lng || !drop?.lat || !drop?.lng) {
      return res.status(400).json({ message: "Pickup and drop locations required" });
    }

    const distanceKm = await getRouteDistance(pickup, drop);

    const breakdown = await calculatePrice({
      length:       Number(length)  || 0,        // cm
      breadth:      Number(breadth) || 0,        // cm
      height:       Number(height)  || 0,        // cm
      deadWeight:   (Number(weight) || 0) / 1000, // frontend sends grams → convert to kg
      distance:     distanceKm,
      deliveryType: deliveryType || "standard",
      pickupCity:   pickupCity || pickup?.city || "",
      dropCity:     dropCity || drop?.city || "",
    });

    res.json(breakdown);

  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: "Price estimation failed",
      error: error.message,
    });
  }
};


// 🔹 Create Order
const createOrder = async (req, res) => {
  try {

    // validate pickup location BEFORE creating order
    if (!req.body.pickup || !req.body.pickup.lng || !req.body.pickup.lat) {
      return res.status(400).json({
        message: "Pickup location required"
      });

    }

    // validate drop location
    if (!req.body.drop || !req.body.drop.lng || !req.body.drop.lat) {
      return res.status(400).json({
        message: "Drop location required"
      });
    }

    const distanceKm = await getRouteDistance(
      req.body.pickup,
      req.body.drop
    );

    const trackingId = `AV-${Math.floor(1000 + Math.random() * 9000)}`;
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    //Delivery OTP
    // OTP Function by Arjun
    // await sendOTPdelivery(String(req.body.receiver.phone), deliveryOtp);
    console.log(`Delivery OTP sent to ${req.body.receiver.phone}`);


    // ── Server-side Price Calculation (via pricingService) ────────────
    const pricing = await calculatePrice({
      length:       Number(req.body.length)  || 0,        // cm
      breadth:      Number(req.body.breadth) || 0,        // cm
      height:       Number(req.body.height)  || 0,        // cm
      deadWeight:   (Number(req.body.weight) || 0) / 1000, // frontend sends grams → convert to kg
      distance:     distanceKm,
      deliveryType: req.body.deliveryType || "standard",
      pickupCity:   req.body.pickupCity || req.body.pickup?.city || "",
      dropCity:     req.body.dropCity || req.body.drop?.city || "",
    });

    const discount = 0;

    // create order
    const newOrder = await Order.create({
      ...req.body,
      userId: req.user.id,
      distance: distanceKm,
      trackingId,
      pickupOtp,
      deliveryOtp,
      price:       pricing.totalAmount,
      baseFare:    pricing.baseFare,
      deliveryFee: pricing.deliveryFee,
      platformFee: pricing.platformFee,
      gstAmount:   pricing.gst,
      discount,
      totalAmount: pricing.totalAmount,
    });



    let driversNotified = 0;
    let dispatchWarning = null;

    // Dispatch is best-effort. If this part fails, the order should still be
    // created successfully because it is already persisted in MongoDB.
    try {
      const io = getIO();
      const orderUser = await User.findById(req.user.id).select("phone");

      // 🔎 Find nearby online partners
      const nearbyPartners = await Partner.find({
        isOnline: true,
        isBusy: false,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [
                newOrder.pickup.lng,
                newOrder.pickup.lat
              ],
            },
            $maxDistance: 5000, // 5km initial radius
          },
        },
      });

      const eligiblePartners = nearbyPartners.filter(
        (partner) => !hasSamePhone(partner.phone, orderUser?.phone)
      );

      driversNotified = eligiblePartners.length;

      // 📡 Send order request to nearby drivers
      eligiblePartners.forEach((partner) => {
        io.to(`partner-${partner._id}`).emit("newOrderRequest", {
          orderId: newOrder._id,
          trackingId: newOrder.trackingId,
          pickupOtp: newOrder.pickupOtp,
          pickup: newOrder.pickup,
          drop: newOrder.drop,
          price: newOrder.price,
          parcelType: newOrder.parcelType,
          distance: Number(newOrder.distance.toFixed(2))
        });
      });

      // schedule redispatch if nobody accepts
      setTimeout(() => {
        redispatchOrder(newOrder._id, io);
      }, 10000);

      // auto cancel order if nobody accepts within 2 minutes
      setTimeout(async () => {
        const order = await Order.findById(newOrder._id);

        if (!order) return;
        if (order.status === "pending") {

          order.status = "cancelled";
          await order.save();

          // free assigned driver if any
          if (order.partnerId) {
            await Partner.findByIdAndUpdate(order.partnerId, {
              isBusy: false
            });
          }

          io.to(order._id.toString()).emit("orderCancelled", {
            orderId: order._id,
            reason: "No driver available"
          });

        }

      }, 120000); // 2 minutes
    } catch (dispatchError) {
      dispatchWarning = dispatchError.message;
      console.log(
        `[CreateOrder] Order ${newOrder._id} created, but partner dispatch failed: ${dispatchError.message}`
      );
    }

    res.status(201).json({
      message: "Order Created Successfully",
      order: newOrder,
      pricing,
      driversNotified,
      ...(dispatchWarning ? { dispatchWarning } : {}),
    });

  } catch (error) {

    res.status(error.statusCode || 500).json({
      message: "Error Creating Order",
      error: error.message,
    });

  }
};



// 🔹 Get Pending Orders (for partners)
const getPendingOrders = async (req, res) => {
  try {

    let orders = await Order.find({ status: "pending" })
      .populate("userId", "name phone")
      .populate("partnerId", "name phone");

    if (req.user.role === "partner") {
      const partner = await Partner.findById(req.user.id).select("phone");

      orders = orders.filter(
        (order) => !hasSamePhone(order.userId?.phone, partner?.phone)
      );
    }

    // Ensure trackingId exists for all returned orders
    for (const order of orders) {
      if (!order.trackingId) {
        order.trackingId = `AV-${Math.floor(1000 + Math.random() * 9000)}`;
        await order.save();
      }
    }

    res.json(orders);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// 🔹 Accept Order
const acceptOrder = async (req, res) => {
  try {

    if (req.user.role !== "partner") {
      return res.status(403).json({
        message: "Only partners can accept orders",
      });
    }

    // check if driver already busy
    const partner = await Partner.findById(req.user.id);

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found"
      });
    }

    if (partner.isBusy) {
      return res.status(400).json({
        message: "Driver already delivering another order"
      });
    }

    const pendingOrder = await Order.findById(req.params.id).populate(
      "userId",
      "phone"
    );

    if (!pendingOrder) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (pendingOrder.status !== "pending") {
      return res.status(400).json({
        message: "Order already accepted by another driver",
      });
    }

    if (hasSamePhone(partner.phone, pendingOrder.userId?.phone)) {
      return res.status(400).json({
        message: "You cannot accept your own order",
      });
    }


    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      {
        status: "accepted",
        partnerId: req.user.id,
        isDispatched: true
      },
      { returnDocument: "after" }
    );

    if (!order) {
      return res.status(400).json({
        message: "Order already accepted by another driver",
      });
    }

    // mark driver as busy
    await Partner.findByIdAndUpdate(req.user.id, {
      isBusy: true
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name phone")
      .populate("partnerId", "name phone rating vehicleType vehicleNumber profilePic location");

    const io = getIO();

    io.to(order._id.toString()).emit("orderAccepted", {
      orderId: order._id,
      partner: populatedOrder.partnerId,
      order: populatedOrder,
      status: populatedOrder.status,
    });

    res.json(populatedOrder);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 🔹 Driver Reject Order
const rejectOrder = async (req, res) => {
  try {

    if (req.user.role !== "partner") {
      return res.status(403).json({
        message: "Only partners can reject orders",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // do nothing if already accepted
    if (order.status !== "pending") {
      return res.status(400).json({
        message: "Order already processed",
      });
    }

    res.json({
      message: "Order rejected"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




// 🔹 Update Order Status
const cancelOrderByUser = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only users can cancel orders",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only cancel your own order",
      });
    }

    if (!["pending", "accepted"].includes(order.status)) {
      return res.status(400).json({
        message: "Only pending or accepted orders can be cancelled",
      });
    }

    const io = getIO();
    const assignedPartnerId = order.partnerId;

    order.status = "cancelled";
    order.isDispatched = false;
    await order.save();

    if (assignedPartnerId) {
      await Partner.findByIdAndUpdate(assignedPartnerId, {
        isBusy: false,
      });
    }

    io.emit("orderCancelled", {
      orderId: order._id,
      reason: "Cancelled by user",
      status: "cancelled",
    });

    io.to(order._id.toString()).emit("orderStatusUpdated", {
      orderId: order._id,
      status: order.status,
    });

    await order.populate("userId", "name phone");
    await order.populate("partnerId", "name phone");

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {

    const { status } = req.body;
    const normalizedStatus = status ? status.trim().toLowerCase() : "";

    console.log(`[OrderUpdate] Request for Order ${req.params.id}: Target Status = "${normalizedStatus}"`);

    const order = await Order.findById(req.params.id);

    if (!order) {
      console.log(`[OrderUpdate] Error: Order ${req.params.id} not found`);
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (req.user.role !== "partner") {
      return res.status(403).json({
        message: "Only partners can update order status",
      });
    }

    // ensure order is assigned
    if (!order.partnerId) {
      return res.status(400).json({
        message: "Order not assigned to any partner yet"
      });
    }

    // ensure correct driver
    if (order.partnerId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not assigned to this order",
      });
    }

    // prevent status update before acceptance
    if (order.status === "pending") {
      return res.status(400).json({
        message: "Order must be accepted before updating status"
      });
    }

    // ✅ VALIDATE STATUS BEFORE UPDATING
    const validStatuses = [
      "picked",
      "in_transit",
      "near_drop",
      "delivered",
      "cancelled"
    ];

    if (!validStatuses.includes(normalizedStatus)) {
      console.log(`[OrderUpdate] Error: Invalid status "${normalizedStatus}" received`);
      return res.status(400).json({
        message: "Invalid order status"
      });
    }

    const finalStatus = normalizedStatus;

    // free driver after delivery or cancellation
    if (finalStatus === "delivered" || finalStatus === "cancelled") {
      await Partner.findByIdAndUpdate(order.partnerId, {
        isBusy: false
      });
    }

    // 🔥 HANDLE PARTNER CANCELLATION (Release to other partners)
    if (finalStatus === "cancelled") {
      const io = getIO();

      // Notify user the current partner stopped
      io.to(order._id.toString()).emit("orderCancelledByPartner", {
        orderId: order._id,
        partnerId: order.partnerId
      });

      // Reset order fields to allow redispatch
      order.status = "pending";
      order.partnerId = null;
      order.isDispatched = false;
      await order.save();

      // Trigger redispatch to find new partners
      redispatchOrder(order._id, io);

      console.log(`[OrderUpdate] Order ${order._id} cancelled by partner and put back to pool`);
      return res.json({
        message: "Order released successfully and marked for redispatch",
        status: "pending"
      });
    }

    order.status = finalStatus;
    await order.save();

    // Populate before sending response to ensure frontend has details
    await order.populate("userId", "name phone");
    await order.populate("partnerId", "name phone");

    const io = getIO();

    io.to(order._id.toString()).emit("orderStatusUpdated", {
      orderId: order._id,
      status: order.status,
    });

    res.json(order);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get Active Order (for partner reconnection)
const getActiveOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      partnerId: req.user.id,
      status: { $in: ["accepted", "picked", "in_transit", "near_drop"] }
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name phone");

    if (order && !order.trackingId) {
      order.trackingId = `AV-${Math.floor(1000 + Math.random() * 9000)}`;
      await order.save();
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
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
};
