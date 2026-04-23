const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true,
    unique: true
  },

   role: {
    type: String,
    default: "partner",
    enum: ["partner"]
  },

profilePic: {
    type: String,
    default: "",
  },


   gender: {
    type: String,
    enum: ["male", "female"],
    required: false
  },


  age: {
    type: Number,
    min: 18,
    max: 70,
    required: false
  },

  vehicleType: {
 type: String,
 enum: ["cycle","bike","scooter","car"],
 default: "bike"
},

  vehicleNumber: {
    type: String
  },

  rating: {
    type: Number,
    default: 5
  },

  totalEarnings: {
  type: Number,
  default: 0
},

totalDeliveries: {
  type: Number,
  default: 0
},

  

  isOnline: {
    type: Boolean,
    default: false
  },

  isBusy: {
  type: Boolean,
  default: false
},

  

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number], // [lng, lat]
      default: [0,0]
    }
  },

  socketId: {
    type: String,
    default: null
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  ekyc_otp: {
    type: String,
    default: null
  },

  email: {
    type: String,
    default: ""
  },

  password: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

partnerSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Partner", partnerSchema);