const mongoose = require("mongoose");
const Order = require("./models/Order");
require("dotenv").config();

const updateOrders = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI is not defined in .env");
    
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const orders = await Order.find();
    console.log(`Total orders found: ${orders.length}`);

    let updatedCount = 0;
    for (const order of orders) {
      if (!order.trackingId) {
        const trackingId = `AV-${Math.floor(1000 + Math.random() * 9000)}`;
        order.trackingId = trackingId;
        await order.save();
        updatedCount++;
        console.log(`Updated Order ${order._id} -> ${trackingId}`);
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} orders.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

updateOrders();
