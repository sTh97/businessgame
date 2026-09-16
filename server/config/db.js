const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  /* older node */
}

const isServerless = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: isServerless ? 1 : 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 15000,
    maxIdleTimeMS: isServerless ? 10000 : 0
  });
  logger.info('mongodb_connected', { host: mongoose.connection.host, serverless: isServerless });
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
