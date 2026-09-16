const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const authLimiter = rateLimit({
  windowMs: env.rateLimitAuth.windowMs,
  max: env.rateLimitAuth.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' }
    });
  }
});

const decisionLimiter = rateLimit({
  windowMs: env.rateLimitDecision.windowMs,
  max: env.rateLimitDecision.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  keyGenerator: (req) => req.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many decisions. Slow down.' }
    });
  }
});

module.exports = { authLimiter, decisionLimiter };
