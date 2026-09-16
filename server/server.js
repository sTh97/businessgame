const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDb } = require('./config/db');
const { createApp } = require('./app');
const { seedIfNeeded } = require('./scripts/seed');

async function main() {
  await connectDb();
  await seedIfNeeded();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info('server_listen', { port: env.port, env: env.nodeEnv });
  });
}

main().catch((err) => {
  logger.error('boot_failed', { message: err.message, stack: err.stack });
  process.exit(1);
});
