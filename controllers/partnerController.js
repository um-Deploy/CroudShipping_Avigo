const Partner = require("../models/Partner");
const jwt = require("jsonwebtoken");

const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const redis = require("../config/redis");

const PartnerVerification = require("../models/PartnerVerification");

// ─────────────────────────────────────
// Partner Signup
// ─────────────────────────────────────
exports.partnerSignup = async (req, res) => {
  try {

    const {
      name,
      phone,
      gender,
      age,
      aadhaarNumber,
      licenceNumber,
      vehicleType,
      vehicleNumber
    } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({
        message: "Phone is required"
      });
    }

    // Normalize phone
    const phoneNumber = phone.trim();

    // Check if partner already exists
    const existingPartner = await Partner.findOne({ phone: phoneNumber });

    if (existingPartner) {
      return res.status(400).json({
        message: "Partner already registered"
      });
    }

    // Create Partner
    const partner = new Partner({
      name,
      phone: phoneNumber,
      gender,
      age,
      vehicleType,
      vehicleNumber
    });

    await partner.save();

    // Create Verification Record
    const verification = new PartnerVerification({
      partnerId: partner._id,
      aadhaarNumber,
      licenceNumber
    });

    await verification.save();

    res.status(201).json({
      message: "Partner registered successfully",
      partner
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }
};


// ─────────────────────────────────────
// Partner Login
// ─────────────────────────────────────
exports.partnerLogin = async (req, res) => {
  try {

    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone is required"
      });
    }

    const phoneNumber = phone.trim();

    const partner = await Partner.findOne({ phone: phoneNumber });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found"
      });
    }

    const token = jwt.sign(
      {
        id: partner._id,
        role: "partner"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      partner
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }
};

// ─────────────────────────────────────
// Go Online
// ─────────────────────────────────────
exports.goOnline = async (req, res) => {

  try {

    const { partnerId, lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Latitude and longitude required"
      });
    }

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        isOnline: true,
        isBusy: false,
        location: {
          type: "Point",
          coordinates: [lng, lat]
        }
      },
      { returnDocument: "after" }
    );

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found"
      });
    }

    res.json({
      message: "Partner is now online",
      partner
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }

};


// ─────────────────────────────────────
// Go Offline
// ─────────────────────────────────────
exports.goOffline = async (req, res) => {

  try {

    const { partnerId } = req.body;

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      { isOnline: false }
    );

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found"
      });
    }

    res.json({
      message: "Partner is now offline"
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }

};
// ─────────────────────────────────────
// Update Driver Location
// ─────────────────────────────────────
exports.updateLocation = async (req, res) => {

  try {

    const { partnerId, lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Latitude and longitude required"
      });
    }

    const partner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        location: {
          type: "Point",
          coordinates: [lng, lat]
        }
      }
    );

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found"
      });
    }

    res.json({
      message: "Location updated"
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }

};


// ─────────────────────────────────────
// Find Nearby Drivers
// ─────────────────────────────────────
exports.getNearbyPartners = async (req, res) => {
  try {

    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        message: "Latitude and longitude required"
      });
    }

    const maxDistance = radius ? parseInt(radius) : 3000;

    const partners = await Partner.find({
      isOnline: true,
      isBusy: false,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxDistance
        }
      }
    }).select("name vehicleType rating location");

    res.json({
      count: partners.length,
      partners
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error: error.message
    });

  }
};


//Profile pic uploads

exports.uploadPartnerProfilePic = async (req, res) => {
  try {

    const { partnerId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const partner = await Partner.findById(partnerId);

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `avigo_partner_profiles/${partnerId}`,
            public_id: "profile",
            overwrite: true
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);

      });
    };

    const result = await streamUpload();

    const updatedPartner = await Partner.findByIdAndUpdate(
      partnerId,
      { profilePic: result.secure_url },
      { returnDocument: "after" }
    );

    res.json({
      message: "Partner profile updated",
      profilePic: result.secure_url,
      partner: updatedPartner
    });

  } catch (error) {

    res.status(500).json({
      message: "Upload failed",
      error: error.message
    });

  }
};

// ─────────────────────────────────────
// Get All Partners
// ─────────────────────────────────────
exports.getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.status(200).json(partners);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};