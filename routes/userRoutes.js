const express = require("express");
const router = express.Router();

const { createUser, uploadProfilePic, getAllUsers } = require("../controllers/userController");
const upload = require("../config/multer");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// Existing route
router.post("/create", createUser);

// New route for uploading profile picture
router.post("/upload-profile", upload.single("profilePic"), uploadProfilePic);

// Get all users for admin
router.get("/all", protect, adminOnly, getAllUsers);

module.exports = router;