const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer authenticated user id; fallback to IP.
    if (req.user && req.user.id) return `user:${req.user.id}`;
    return `ip:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  apiLimiter
};

