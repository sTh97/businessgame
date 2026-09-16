const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  /* older node */
}

async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 15000
  });
  logger.info('mongodb_connected', { host: mongoose.connection.host });
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
