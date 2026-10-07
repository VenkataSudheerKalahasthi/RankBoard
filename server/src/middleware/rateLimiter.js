const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 3000, // Generous limit for campus NAT / shared IPs and dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development or localhost requests
    const ip = req.ip || req.connection?.remoteAddress || '';
    return (
      process.env.NODE_ENV === 'development' ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1'
    );
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Platform sync rate limiter (prevent student or bot spamming external coding APIs)
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many platform refresh requests. Please wait a few minutes before synchronizing again.',
  },
});

module.exports = {
  apiLimiter,
  syncLimiter,
};
