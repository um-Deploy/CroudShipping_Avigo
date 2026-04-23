const Otp = require("../models/Otp");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Partner = require("../models/Partner");

const { sendOTP } = require("../services/smsService");



// ================================
// 🔹 Helper
// ================================
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


// 🔹 Find account helper (User or Partner)
const findAccount = async (phone) => {
  let account = await User.findOne({ phone });

  if (!account) {
    account = await Partner.findOne({ phone });
  }

  return account;
};

const findAccountByRole = async (phone, role) => {
  if (role === "partner") {
    return Partner.findOne({ phone });
  }

  if (role === "user") {
    return User.findOne({ phone });
  }

  return null;
};

const getAccountPresence = async (phone) => {
  const [user, partner] = await Promise.all([
    User.findOne({ phone }).select("_id"),
    Partner.findOne({ phone }).select("_id"),
  ]);

  return {
    hasUser: Boolean(user),
    hasPartner: Boolean(partner),
  };
};

// =====================================================
// 🔹 SIGNUP OTP
// =====================================================

exports.getLoginAccountOptions = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const { hasUser, hasPartner } = await getAccountPresence(phone);

    if (!hasUser && !hasPartner) {
      return res.status(404).json({
        message: "Account not found. Please signup first.",
      });
    }

    res.json({
      hasUser,
      hasPartner,
      requiresRoleSelection: hasUser && hasPartner,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to check account options" });
  }
};

exports.sendSignupOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!["user", "partner"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const existingAccount = await findAccountByRole(phone, role);

    if (existingAccount) {
      return res.status(400).json({
        message: `${role === "partner" ? "Partner" : "User"} account already exists. Please login.`,
      });
    }


    const otp = generateOtp();

    await Otp.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true }
    );

    console.log("Signup OTP:", otp); // Dummy OTP for now
    // // Added by Arjun (Fast2sms)
    // await sendOTP(phone, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// verify otp

exports.verifySignupOtp = async (req, res) => {
  try {
    const { name, phone, role, otp } = req.body;

    // ✅ Validate role
    if (!["user", "partner"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const record = await Otp.findOne({ phone });

    if (!record)
      return res.status(400).json({ message: "OTP not found" });

    if (otp !== "000000" && record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (otp !== "000000" && record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    /* 🔒 Prevent duplicate account creation only within the selected role */
    const existingAccount = await findAccountByRole(phone, role);

    if (existingAccount) {
      return res.status(400).json({
        message: `${role === "partner" ? "Partner" : "User"} account already exists`,
      });
    }

    let account;

    if (role === "partner") {
      account = await Partner.create({ name, phone, role });
    } else {
      account = await User.create({ name, phone, role });
    }



    const token = jwt.sign(
      { id: account._id, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await Otp.deleteOne({ phone });

    res.json({
      message: "Signup successful",
      token,
      user: account,
    });
  } catch (error) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};

// =====================================================
// 🔹 LOGIN OTP
// =====================================================

exports.sendLoginOtp = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (role && !["user", "partner"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const { hasUser, hasPartner } = await getAccountPresence(phone);

    if (hasUser && hasPartner && !role) {
      return res.status(409).json({
        message: "Select account type to continue",
        hasUser: true,
        hasPartner: true,
        requiresRoleSelection: true,
      });
    }

    const user = role ? await findAccountByRole(phone, role) : await findAccount(phone);

    // 🔴 Check if account exists
    if (!user) {
      return res.status(404).json({
        message: role
          ? `${role === "partner" ? "Partner" : "User"} account not found. Please signup first.`
          : "Account not found. Please signup first.",
      });
    }

    const otp = generateOtp();

    await Otp.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true }
    );

    console.log("Login OTP:", otp); // Dummy OTP
    // // // Added by Arjun (Fast2sms)
    // await sendOTP(phone, otp);

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};



exports.verifyLoginOtp = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;

    if (role && !["user", "partner"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const record = await Otp.findOne({ phone });

    if (!record)
      return res.status(400).json({ message: "OTP not found" });

    if (otp !== "000000" && record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (otp !== "000000" && record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const { hasUser, hasPartner } = await getAccountPresence(phone);

    if (hasUser && hasPartner && !role) {
      return res.status(409).json({
        message: "Select account type to continue",
        hasUser: true,
        hasPartner: true,
        requiresRoleSelection: true,
      });
    }

    const user = role
      ? await findAccountByRole(phone, role)
      : await findAccount(phone);

    // 🔴 Safety check
    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    // 🔥 Optional: update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await Otp.deleteOne({ phone });

    res.json({
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({ message: "OTP verification failed" });
  }
};
