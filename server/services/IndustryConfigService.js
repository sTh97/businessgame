const { industries, events, decisions, levels, achievements } = require('../repositories');
const { AppError } = require('../utils/http');
const { DIFFICULTY_MODIFIERS } = require('../game-content/software-house/config');
const { applyStartingModifiers } = require('../game-engine/simulationEngine');
const financialEngine = require('../game-engine/financialEngine');
const { clone } = require('../utils/state');

async function getIndustry(id) {
  const doc = await industries.findById(id).lean();
  if (!doc) throw new AppError('NOT_FOUND', 'Unknown industry', 404);
  return doc;
}

async function listIndustries() {
  return industries.find({}).lean();
}

async function previewStartingState(industryId, difficulty) {
  const mods = DIFFICULTY_MODIFIERS[difficulty];
  if (!mods) throw new AppError('VALIDATION_ERROR', 'Invalid difficulty', 400);
  const industry = await getIndustry(industryId);
  if (industry.locked) {
    throw new AppError('VALIDATION_ERROR', `${industry.name} unlocks in a later release`, 400);
  }
  const state = applyStartingModifiers(industry.industryConfig.startingState, mods);
  financialEngine.recompute(state, industry.industryConfig, industry.industryConfig.initialMarket);
  return {
    industry: {
      id: industry._id,
      name: industry.name,
      tagline: industry.tagline,
      description: industry.description,
      coreBottleneck: industry.industryConfig.coreBottleneck,
      primaryRevenueDriver: industry.industryConfig.primaryRevenueDriver,
      signatureRisk: industry.industryConfig.signatureRisk
    },
    difficulty,
    difficultyModifiers: clone(mods),
    startingState: state,
    roles: industry.industryConfig.roles
  };
}

async function loadContent(industryId) {
  const [industry, eventDocs, decisionDocs, levelDocs, achievementDocs] = await Promise.all([
    getIndustry(industryId),
    events.find({ industry: industryId }).lean(),
    decisions.find({}).lean(),
    levels.find({ industry: industryId }).lean(),
    achievements.find({}).lean()
  ]);
  return { industry, events: eventDocs, decisions: decisionDocs, levels: levelDocs, achievements: achievementDocs };
}

module.exports = {
  getIndustry,
  listIndustries,
  previewStartingState,
  loadContent,
  DIFFICULTY_MODIFIERS
};
