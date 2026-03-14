const { log } = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  log(`Endpoint hit: ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    log(`Request completed: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms`);
  });

  next();
};

module.exports = loggerMiddleware;
