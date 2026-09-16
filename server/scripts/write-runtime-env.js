'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CSRF_SECRET'];
const OPTIONAL = [
  'NODE_ENV',
  'CORS_ORIGINS',
  'PUBLIC_APP_URL',
  'BCRYPT_COST',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'RATE_LIMIT_AUTH_WINDOW_MS',
  'RATE_LIMIT_AUTH_MAX',
  'RATE_LIMIT_DECISION_WINDOW_MS',
  'RATE_LIMIT_DECISION_MAX'
];

const snapshot = {};
for (const key of [...REQUIRED, ...OPTIONAL]) {
  if (process.env[key]) snapshot[key] = process.env[key];
}

const dest = path.join(__dirname, '..', '.runtime-env.json');
fs.writeFileSync(dest, JSON.stringify(snapshot));
console.log(`Wrote ${path.basename(dest)} with keys: ${Object.keys(snapshot).join(', ') || '(none)'}`);

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`
Missing required environment variables: ${missing.join(', ')}

Netlify Functions cannot read your local .env file, and netlify.toml
cannot pass secrets to functions.

1. Netlify → Site configuration → Environment variables
2. Add these with scopes All (Builds + Functions), context Production:
   ${REQUIRED.join(', ')}
3. Prefer the short mongodb+srv:// Atlas URI (long replica-host URIs can be dropped)
4. Trigger deploy → Deploy site
`);
  process.exit(1);
}
