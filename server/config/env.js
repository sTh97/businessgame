const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

function tryReadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    /* ignore unreadable snapshot */
  }
  return null;
}

const runtimeEnvPaths = [
  path.join(__dirname, '..', '.runtime-env.json'),
  path.join(process.cwd(), 'server', '.runtime-env.json'),
  path.join(process.cwd(), '.runtime-env.json'),
  path.join(__dirname, '.runtime-env.json'),
  path.join(__dirname, 'server', '.runtime-env.json'),
  path.join(__dirname, '..', '..', 'server', '.runtime-env.json')
];

for (const filePath of runtimeEnvPaths) {
  const parsed = tryReadJson(filePath);
  if (!parsed || typeof parsed !== 'object') continue;
  for (const [key, value] of Object.entries(parsed)) {
    if (value == null || value === '') continue;
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = String(value);
    }
  }
  break;
}

if (!process.env.CORS_ORIGINS && process.env.URL) {
  process.env.CORS_ORIGINS = process.env.URL;
}
if (!process.env.PUBLIC_APP_URL && process.env.URL) {
  process.env.PUBLIC_APP_URL = process.env.URL;
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    const onNetlify = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const hint = onNetlify
      ? ` Add ${name} in Netlify → Site configuration → Environment variables (all scopes), then trigger a new deploy. Local .env and netlify.toml are not available to this function.`
      : '';
    throw new Error(`Missing required environment variable: ${name}.${hint}`);
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
