const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const { getIO } = require("../socket");

// Create User
const createUser = async (req, res) => {
  try {

    const { name, phone, role } = req.body;

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const newUser = await User.create({
      name,
      phone,
      role,
    });

    // 🔥 Emit socket event
    const io = getIO();

    io.emit("userCreated", {
      userId: newUser._id,
      name: newUser.name,
      phone: newUser.phone,
      role: newUser.role
    });

    res.status(201).json({
      message: "User Created Successfully",
      user: newUser,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error Creating User",
      error: error.message,
    });
  }
};



// Upload Profile Picture
const uploadProfilePic = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const user = await User.findById(userId);

    // 🔥 Delete old image from Cloudinary
    if (user.profilePic) {
      const urlParts = user.profilePic.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = "avigo_profiles/" + fileName.split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    // Upload new image
    const streamUpload = () => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `avigo_profiles/${userId}`,
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: result.secure_url },
      { returnDocument: "after" }
    );

    res.status(200).json({
      message: "Profile picture updated",
      profilePic: result.secure_url,
      user: updatedUser,
    });

  } catch (error) {
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};

// GetAllUsers
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  uploadProfilePic,
  getAllUsers,
};