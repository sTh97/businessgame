const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { connectDb, disconnectDb } = require('../config/db');
const logger = require('../utils/logger');
const {
  industries,
  events,
  decisions,
  levels,
  achievements
} = require('../repositories');
const { industries: industryPacks } = require('../game-content/software-house/config');
const { flatten } = require('../game-content/software-house/events');
const { buildLevels } = require('../game-content/levels');
const achievementPack = require('../game-content/achievements');

async function seedAll() {
  const { eventDocs, decisionDocs } = flatten();
  const levelDocs = buildLevels('software-house', 100);

  await Promise.all([
    industries.deleteMany({}),
    events.deleteMany({ industry: 'software-house' }),
    decisions.deleteMany({}),
    levels.deleteMany({ industry: 'software-house' }),
    achievements.deleteMany({})
  ]);

  await industries.insertMany(
    industryPacks.map((cfg) => ({
      _id: cfg.id,
      name: cfg.name,
      tagline: cfg.tagline,
      description: cfg.description,
      locked: Boolean(cfg.locked),
      release: cfg.release || 1,
      industryConfig: cfg
    }))
  );
  await events.insertMany(eventDocs);
  await decisions.insertMany(decisionDocs);
  await levels.insertMany(levelDocs);
  await achievements.insertMany(achievementPack);

  logger.info('content_seeded', {
    industries: industryPacks.length,
    events: eventDocs.length,
    decisions: decisionDocs.length,
    levels: levelDocs.length,
    achievements: achievementPack.length
  });
}

async function seedIfNeeded() {
  const count = await events.countDocuments({ industry: 'software-house' });
  if (count > 0) {
    logger.info('content_present', { events: count });
    return;
  }
  await seedAll();
}

if (require.main === module) {
  connectDb()
    .then(seedAll)
    .then(() => disconnectDb())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('seed_failed', { message: err.message, stack: err.stack });
      process.exit(1);
    });
}

module.exports = { seedAll, seedIfNeeded };
