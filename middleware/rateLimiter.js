const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req),
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  apiLimiter
};

