const express = require("express");
const router = express.Router();
const multer = require("../config/multer");
const partnerController = require("../controllers/partnerController");

const {
  partnerSignup,
  partnerLogin,
  goOnline,
  goOffline,
  updateLocation,
  getNearbyPartners,
  getAllPartners
} = require("../controllers/partnerController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

router.post("/signup", partnerSignup);
router.post("/login", partnerLogin);

router.post("/online", goOnline);
router.post("/offline", goOffline);

router.post("/location", updateLocation);

router.get("/nearby", getNearbyPartners);


router.post(
  "/upload-profile",
  multer.single("profilePic"),
  partnerController.uploadPartnerProfilePic
);

router.get("/all", protect, adminOnly, getAllPartners);

module.exports = router;