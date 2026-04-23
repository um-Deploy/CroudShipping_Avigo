const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Partner = require("../models/Partner");
const { getIO } = require("../socket");


// Generate Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};



// 🔹 Register User
const registerUser = async (req, res) => {
  try {

    const { name, phone, role, password } = req.body;

    // check if user already exists
    let user = await User.findOne({ phone });

    if (user) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // create user
    user = await User.create({
      name,
      phone,
      role: role || "user",
      password: hashedPassword
    });

    // 🔥 Emit socket event
    const io = getIO();

    io.emit("userCreated", {
      userId: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: "User registered",
      token,
      user
    });

  } catch (error) {

    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });

  }
};



// 🔹 Login User
const loginUser = async (req, res) => {
  try {

    const { phone } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {

    res.status(500).json({
      message: "Login failed",
      error: error.message
    });

  }
};


// Get current logged-in user
const getMe = async (req, res) => {
  try {

    let account = await User.findById(req.user.id).select("-__v");

    // If not found in users, check partners
    if (!account) {
      account = await Partner.findById(req.user.id).select("-__v");
    }

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    res.json({
      _id: account._id,
      name: account.name,
      phone: account.phone,
      role: account.role,
      profilePic: account.profilePic
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};


// 🔹 Login with Password (MVP alternative to OTP)
const loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    let user = await User.findOne({ phone });
    let role = "user";

    if (!user) {
      user = await Partner.findOne({ phone });
      role = "partner";
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Password not set for this account. Please use OTP login." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = generateToken(user._id, user.role || role);

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// 🔹 Set or Update Password
const setPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: "Phone and password are required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    let user = await User.findOneAndUpdate({ phone }, { password: hashed }, { new: true });
    if (!user) {
      user = await Partner.findOneAndUpdate({ phone }, { password: hashed }, { new: true });
    }

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ message: "Password set successfully" });

  } catch (error) {
    res.status(500).json({ message: "Failed to set password", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginWithPassword,
  setPassword,
  getMe
};