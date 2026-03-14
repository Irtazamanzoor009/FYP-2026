const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies.pro_manage_bot_token;

    if (!token) {
      throw { statusCode: 401, message: "No token provided" };
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw { statusCode: 401, message: "Invalid or expired token" };
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw { statusCode: 401, message: "User not found" };
    }

    req.user = user

    next();
  } catch (err) {
    next(err);
  }
};
