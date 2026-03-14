const { error } = require("../utils/logger");

module.exports = (err, req, res, next) => {
  error('❌ Error:', err.stack || err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(err.requiresOTP !== undefined && { requiresOTP: err.requiresOTP }),
    ...(err.userId && { userId: err.userId }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
