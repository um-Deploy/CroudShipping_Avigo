require("dotenv").config();

const connectDB = require("./config/db");
connectDB();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketManager = require("./socket");



// Routes
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const otpRoutes = require("./routes/otpRoutes");
const routeRoutes = require("./routes/routeRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const ekycRoutes = require("./routes/ekycRoutes");
const pricingRoutes = require("./routes/pricingRoutes");

const Partner = require("./models/Partner");
const Order = require("./models/Order");




const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));
app.use("/admin", express.static("adminFrontend"));

//API Routes
app.use("/api/users", userRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/route", routeRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/ekyc", ekycRoutes);
app.use("/api/pricing", pricingRoutes);





app.get("/", (req, res) => {
  res.send("🚀 Avigo Backend Running");
});

// Initialize Socket.io
socketManager.init(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});