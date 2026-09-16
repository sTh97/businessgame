const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  mongodbUri: required('MONGODB_URI'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  csrfSecret: required('CSRF_SECRET'),
  bcryptCost: Number(process.env.BCRYPT_COST || 12),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  rateLimitAuth: {
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_AUTH_MAX || 10)
  },
  rateLimitDecision: {
    windowMs: Number(process.env.RATE_LIMIT_DECISION_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_DECISION_MAX || 60)
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@businessempire.local'
  },
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  isProd: (process.env.NODE_ENV || 'development') === 'production'
};

module.exports = env;
