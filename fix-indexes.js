require("dotenv").config();
const mongoose = require("mongoose");
const Partner = require("./models/Partner");

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🟢 Connected to DB to fix indexes...");

    // This forces the creation of the 2dsphere index
    await Partner.collection.createIndex({ location: "2dsphere" });
    
    console.log("✅ 2dsphere index created successfully on 'partners' collection!");
    process.exit(0);
  } catch (err) {
    console.error("🔴 Failed to create index:", err.message);
    process.exit(1);
  }
};

fixIndexes();
