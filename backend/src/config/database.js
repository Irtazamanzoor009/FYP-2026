const mongoose = require('mongoose');
const { error } = require("../utils/logger")

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    return conn;
  } catch (err) {
    error('❌ MongoDB connection error:', err);
    throw err;
  }
};

module.exports = connectDB;
