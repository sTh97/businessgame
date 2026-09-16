const mongoose = require('mongoose');
const { sanitizeName } = require('../utils/sanitize');
const { AppError } = require('../utils/http');
const { phaseForLevel, phaseLabel, endingForState, founderRating } = require('../utils/state');
const workforceEngine = require('../game-engine/workforceEngine');
const financialEngine = require('../game-engine/financialEngine');
const simulationEngine = require('../game-engine/simulationEngine');
const marketEngine = require('../game-engine/marketEngine');
const { defaultFlags, defaultProperty } = require('../game-engine/flags');
const competitorEngine = require('../game-engine/competitorEngine');
const IndustryConfigService = require('./IndustryConfigService');
const SaveGameService = require('./SaveGameService');
const {
  games,
  gameStates,
  events,
  decisions,
  decisionHistory,
  projects,
  workforce,
  financialHistory,
  marketStates,
  userAchievements,
  achievements,
  employees: employeeCol
} = require('../repositories');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function assertOwner(userId, gameId) {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    throw new AppError('NOT_FOUND', 'Game not found', 404);
  }
  const game = await games.findById(gameId);
  if (!game) throw new AppError('NOT_FOUND', 'Game not found', 404);
  if (String(game.userId) !== String(userId)) {
    throw new AppError('FORBIDDEN', 'You do not own this game', 403);
  }
  return game;
}

function publicGame(game) {
  return {
    gameId: String(game._id),
    industry: game.industry,
    difficulty: game.difficulty,
    companyName: game.companyName,
    founderName: game.founderName,
    status: game.status,
    currentLevel: game.currentLevel,
    gameStateVersion: game.gameStateVersion,
    score: game.score || 0,
    rating: founderRating(game.score || 0),
    createdAt: game.createdAt,
    updatedAt: game.updatedAt
  };
}

async function listGames(userId, status) {
  const q = { userId };
  if (status) q.status = status;
  const rows = await games.find(q).sort({ updatedAt: -1 }).lean();
  return { games: rows.map(publicGame) };
}

async function preview(industry, difficulty) {
  return IndustryConfigService.previewStartingState(industry, difficulty);
}

async function createGame(userId, body) {
  const industryId = body.industry;
  const difficulty = body.difficulty;
  const companyName = sanitizeName(body.companyName);
  const founderName = sanitizeName(body.founderName);
  const previewed = await IndustryConfigService.previewStartingState(industryId, difficulty);
  const industry = await IndustryConfigService.getIndustry(industryId);
  const cfg = industry.industryConfig;

  const gameDoc = {
    userId,
    industry: industryId,
    difficulty,
    companyName,
    founderName,
    status: 'initializing',
    currentLevel: 1,
    gameStateVersion: 1,
    difficultyModifiers: previewed.difficultyModifiers,
    score: 0,
    seenEventIds: cfg.openingEventId ? [cfg.openingEventId] : []
  };

  const openingId = cfg.openingEventId;
  const stateDoc = {
    version: 1,
    level: 1,
    gameMonth: 1,
    state: previewed.startingState,
    industryState: { ...(cfg.startingIndustryState || {}) },
    flags: defaultFlags(),
    property: defaultProperty(),
    pendingConsequences: [],
    currentEvent: openingId ? { eventId: openingId, status: 'pending' } : { eventId: null, status: 'none' },
    score: 0
  };

  const peopleRows = (cfg.startingPeople || []).map((p) => ({ ...p }));
  const workforceRows = workforceEngine.syncAggregatesFromPeople(peopleRows, cfg.roles);
  workforceEngine.recomputeWorkforce(stateDoc.state, workforceRows, cfg.roles, stateDoc.property, stateDoc.flags, peopleRows);
  financialEngine.recompute(stateDoc.state, cfg, cfg.initialMarket);
  const market = { asOfLevel: 1, ...marketEngine.initialMarket(cfg) };

  const created = await SaveGameService.withTransaction(async (session) =>
    SaveGameService.persistNewGame({
      game: gameDoc,
      state: stateDoc,
      workforceRows,
      peopleRows,
      market,
      session
    })
  );

  const fresh = await games.findById(created._id).lean();
  const gs = await gameStates.findOne({ gameId: created._id }).lean();
  return { game: publicGame(fresh), gameState: serializeState(gs, fresh) };
}

function serializeState(gs, game) {
  const level = gs.level;
  return {
    version: gs.version,
    level,
    gameMonth: gs.gameMonth,
    phase: phaseForLevel(level),
    phaseLabel: phaseLabel(phaseForLevel(level)),
    state: gs.state,
    industryState: gs.industryState,
    flags: gs.flags || defaultFlags(),
    property: gs.property || defaultProperty(),
    pendingConsequences: gs.pendingConsequences,
    currentEvent: gs.currentEvent,
    score: gs.score,
    lastOutcome: gs.lastOutcome || null,
    companyName: game.companyName,
    founderName: game.founderName,
    industry: game.industry,
    difficulty: game.difficulty,
    status: game.status
  };
}

async function getGame(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  return { game: publicGame(game) };
}

async function dashboard(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  if (!gs) throw new AppError('NOT_FOUND', 'Game state missing', 404);
  let currentEvent = null;
  if (gs.currentEvent?.eventId) {
    currentEvent = await events.findById(gs.currentEvent.eventId).lean();
  }
  return {
    game: publicGame(game),
    state: serializeState(gs, game),
    currentEvent: currentEvent
      ? {
          eventId: currentEvent._id,
          title: currentEvent.title,
          category: currentEvent.category,
          narrative: currentEvent.narrative,
          status: gs.currentEvent.status
        }
      : null
  };
}

async function currentEvent(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  if (!gs?.currentEvent?.eventId) {
    return { event: null, decisions: [] };
  }
  const event = await events.findById(gs.currentEvent.eventId).lean();
  if (!event) return { event: null, decisions: [] };
  const opts = await decisions.find({ _id: { $in: event.decisionIds } }).lean();
  const order = new Map(event.decisionIds.map((id, i) => [id, i]));
  opts.sort((a, b) => (order.get(a._id) ?? 0) - (order.get(b._id) ?? 0));
  return {
    event: {
      eventId: event._id,
      title: event.title,
      category: event.category,
      narrative: event.narrative,
      isCritical: Boolean(event.isCritical)
    },
    decisions: opts.map((d) => ({
      decisionId: d._id,
      label: d.label,
      summary: d.summary,
      tone: d.tone
    }))
  };
}

async function submitDecision(userId, gameId, body) {
  const { eventId, decisionId, expectedStateVersion, idempotencyKey } = body;
  if (!UUID_RE.test(String(idempotencyKey || ''))) {
    throw new AppError('VALIDATION_ERROR', 'idempotencyKey must be a UUID', 400);
  }
  if (expectedStateVersion == null || Number.isNaN(Number(expectedStateVersion))) {
    throw new AppError('VALIDATION_ERROR', 'expectedStateVersion required', 400);
  }

  const existing = await decisionHistory.findOne({ idempotencyKey }).lean();
  if (existing) {
    return existing.result;
  }

  const game = await assertOwner(userId, gameId);
  if (game.status !== 'active') {
    throw new AppError('VALIDATION_ERROR', 'Game is not active', 400);
  }
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  if (!gs) throw new AppError('NOT_FOUND', 'Game state missing', 404);
  if (gs.version !== Number(expectedStateVersion)) {
    throw new AppError('STALE_STATE_VERSION', 'State changed — refetch and retry', 409, {
      currentState: serializeState(gs, game)
    });
  }
  if (!gs.currentEvent || gs.currentEvent.eventId !== eventId || gs.currentEvent.status !== 'pending') {
    throw new AppError('VALIDATION_ERROR', 'Decision does not match the current pending event', 400);
  }

  const decision = await decisions.findOne({ _id: decisionId, eventId }).lean();
  if (!decision) throw new AppError('VALIDATION_ERROR', 'decisionId does not belong to eventId', 400);

  const event = await events.findById(eventId).lean();
  const content = await IndustryConfigService.loadContent(game.industry);
  const [wf, people, proj, market, unlocked] = await Promise.all([
    workforce.find({ gameId: game._id }).lean(),
    employeeCol.find({ gameId: game._id }).lean(),
    projects.find({ gameId: game._id }).lean(),
    marketStates.findOne({ gameId: game._id }).sort({ asOfLevel: -1, _id: -1 }).lean(),
    userAchievements.find({ gameId: game._id }).lean()
  ]);

  const computed = simulationEngine.processDecision({
    game: game.toObject ? game.toObject() : game,
    gameState: gs,
    decision,
    event,
    industryConfig: content.industry.industryConfig,
    events: content.events,
    workforce: wf,
    people,
    projects: proj,
    market,
    achievements: content.achievements,
    unlockedAchievementIds: unlocked.map((u) => u.achievementId),
    seenEventIds: game.seenEventIds || [],
    rngSeed: null
  });

  const resultPayload = {
    newState: {
      version: computed.newGameState.version,
      level: computed.newGameState.level,
      gameMonth: computed.newGameState.gameMonth,
      phase: computed.phase,
      phaseLabel: phaseLabel(computed.phase),
      state: computed.newGameState.state,
      industryState: computed.newGameState.industryState,
      flags: computed.newGameState.flags,
      property: computed.newGameState.property,
      currentEvent: computed.newGameState.currentEvent,
      score: computed.newGameState.score,
      status: computed.gamePatch.status
    },
    outcome: computed.outcome,
    nextEvent: computed.nextEvent
      ? { eventId: computed.nextEvent._id, title: computed.nextEvent.title, category: computed.nextEvent.category }
      : null
  };

  const history = {
    gameId: game._id,
    level: gs.level,
    eventId,
    eventTitle: event?.title,
    decisionId,
    decisionLabel: decision.label,
    immediateOutcome: computed.outcome.immediate,
    financialImpact: {
      cashDelta: computed.outcome.immediate.cashDelta || 0,
      revenueDelta: computed.outcome.immediate.revenueDelta || 0
    },
    randomResolutions: computed.outcome.randomResolutions,
    delayed: computed.outcome.delayed,
    result: resultPayload,
    idempotencyKey
  };

  try {
    const persisted = await SaveGameService.withTransaction(async (session) =>
      SaveGameService.persistDecision({
        gameId: game._id,
        expectedVersion: Number(expectedStateVersion),
        computed,
        userId,
        history,
        session
      })
    );
    if (persisted.duplicate) return persisted.existing.result;
  } catch (err) {
    if (err.code === 'STALE_STATE_VERSION') {
      const fresh = await gameStates.findOne({ gameId: game._id }).lean();
      throw new AppError('STALE_STATE_VERSION', err.message, 409, { currentState: serializeState(fresh, game) });
    }
    if (err.code === 11000) {
      const again = await decisionHistory.findOne({ idempotencyKey }).lean();
      if (again) return again.result;
    }
    throw err;
  }

  return resultPayload;
}

async function history(userId, gameId, page = 1, limit = 20) {
  await assertOwner(userId, gameId);
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(50, Math.max(1, Number(limit) || 20));
  const q = { gameId };
  const [entries, total] = await Promise.all([
    decisionHistory
      .find(q)
      .sort({ resolvedAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
    decisionHistory.countDocuments(q)
  ]);
  return {
    entries: entries.map((e) => ({
      level: e.level,
      eventId: e.eventId,
      situation: e.eventTitle,
      decision: e.decisionLabel,
      immediateOutcome: e.immediateOutcome,
      financialImpact: e.financialImpact,
      resolvedAt: e.resolvedAt
    })),
    page: p,
    limit: l,
    total,
    hasMore: p * l < total
  };
}

async function financials(userId, gameId, limit = 24) {
  await assertOwner(userId, gameId);
  const l = Math.min(48, Math.max(1, Number(limit) || 24));
  const periods = await financialHistory.find({ gameId }).sort({ gameMonth: -1 }).limit(l).lean();
  periods.reverse();
  return { periods };
}

async function listProjects(userId, gameId) {
  await assertOwner(userId, gameId);
  const rows = await projects.find({ gameId }).sort({ createdLevel: -1 }).lean();
  return { projects: rows };
}

async function listEmployees(userId, gameId) {
  await assertOwner(userId, gameId);
  const [rows, people] = await Promise.all([
    workforce.find({ gameId }).lean(),
    employeeCol.find({ gameId }).lean()
  ]);
  return { workforce: rows, people };
}

async function listPeople(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const industry = await IndustryConfigService.getIndustry(game.industry);
  const people = await employeeCol.find({ gameId }).lean();
  return { people, roles: industry.industryConfig.roles || [] };
}

async function workplace(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  const people = await employeeCol.find({ gameId }).lean();
  return {
    property: gs.property || defaultProperty(),
    flags: gs.flags || defaultFlags(),
    people
  };
}

async function competitors(userId, gameId) {
  await assertOwner(userId, gameId);
  const row = await marketStates.findOne({ gameId }).sort({ asOfLevel: -1, _id: -1 }).lean();
  const market = competitorEngine.ensureCompetitors(row || {});
  return { competitors: market.competitors, intel: market.intel, competitionIntensity: market.competitionIntensity };
}

async function submitAction(userId, gameId, body) {
  const { type, payload, expectedStateVersion, idempotencyKey } = body;
  if (!UUID_RE.test(String(idempotencyKey || ''))) {
    throw new AppError('VALIDATION_ERROR', 'idempotencyKey must be a UUID', 400);
  }
  const existing = await decisionHistory.findOne({ idempotencyKey }).lean();
  if (existing) return existing.result;

  const game = await assertOwner(userId, gameId);
  if (game.status !== 'active') throw new AppError('VALIDATION_ERROR', 'Game is not active', 400);
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  if (!gs) throw new AppError('NOT_FOUND', 'Game state missing', 404);
  if (gs.version !== Number(expectedStateVersion)) {
    throw new AppError('STALE_STATE_VERSION', 'State changed — refetch and retry', 409, {
      currentState: serializeState(gs, game)
    });
  }

  const content = await IndustryConfigService.loadContent(game.industry);
  const [wf, people, proj, market] = await Promise.all([
    workforce.find({ gameId: game._id }).lean(),
    employeeCol.find({ gameId: game._id }).lean(),
    projects.find({ gameId: game._id }).lean(),
    marketStates.findOne({ gameId: game._id }).sort({ asOfLevel: -1, _id: -1 }).lean()
  ]);

  const computed = simulationEngine.processAction({
    type,
    payload: payload || {},
    game: game.toObject ? game.toObject() : game,
    gameState: gs,
    industryConfig: content.industry.industryConfig,
    workforce: wf,
    people,
    projects: proj,
    market,
    seenEventIds: game.seenEventIds || [],
    rngSeed: null
  });

  const resultPayload = {
    newState: {
      version: computed.newGameState.version,
      level: computed.newGameState.level,
      gameMonth: computed.newGameState.gameMonth,
      phase: computed.phase,
      phaseLabel: phaseLabel(computed.phase),
      state: computed.newGameState.state,
      industryState: computed.newGameState.industryState,
      flags: computed.newGameState.flags,
      property: computed.newGameState.property,
      currentEvent: computed.newGameState.currentEvent,
      score: computed.newGameState.score,
      status: computed.gamePatch.status
    },
    outcome: computed.outcome,
    nextEvent: null
  };

  const history = {
    gameId: game._id,
    level: gs.level,
    eventId: `action:${type}`,
    eventTitle: `Action: ${type}`,
    decisionId: type,
    decisionLabel: type,
    immediateOutcome: computed.outcome.immediate,
    financialImpact: { cashDelta: computed.outcome.immediate.cashDelta || 0 },
    randomResolutions: computed.outcome.randomResolutions,
    delayed: computed.outcome.delayed,
    result: resultPayload,
    idempotencyKey
  };

  try {
    const persisted = await SaveGameService.withTransaction(async (session) =>
      SaveGameService.persistDecision({
        gameId: game._id,
        expectedVersion: Number(expectedStateVersion),
        computed,
        userId,
        history,
        session
      })
    );
    if (persisted.duplicate) return persisted.existing.result;
  } catch (err) {
    if (err.code === 'STALE_STATE_VERSION') {
      const fresh = await gameStates.findOne({ gameId: game._id }).lean();
      throw new AppError('STALE_STATE_VERSION', err.message, 409, { currentState: serializeState(fresh, game) });
    }
    if (err.code === 11000) {
      const again = await decisionHistory.findOne({ idempotencyKey }).lean();
      if (again) return again.result;
    }
    throw err;
  }

  return resultPayload;
}

async function listAchievements(userId, gameId) {
  await assertOwner(userId, gameId);
  const [catalog, unlocked] = await Promise.all([
    achievements.find({}).lean(),
    userAchievements.find({ gameId }).lean()
  ]);
  const have = new Set(unlocked.map((u) => u.achievementId));
  return {
    unlocked: catalog.filter((a) => have.has(a._id)),
    locked: catalog.filter((a) => !have.has(a._id))
  };
}

async function market(userId, gameId) {
  await assertOwner(userId, gameId);
  const row = await marketStates.findOne({ gameId }).sort({ asOfLevel: -1, _id: -1 }).lean();
  return { market: row };
}

async function restart(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const body = {
    industry: game.industry,
    difficulty: game.difficulty,
    companyName: game.companyName,
    founderName: game.founderName
  };
  await games.updateOne({ _id: game._id }, { $set: { status: 'abandoned' } });
  return createGame(userId, body);
}

async function founderReport(userId, gameId) {
  const game = await assertOwner(userId, gameId);
  const gs = await gameStates.findOne({ gameId: game._id }).lean();
  const ending = endingForState(gs.state, game.status, gs.level);
  return {
    game: publicGame(game),
    ending,
    rating: founderRating(game.score || 0),
    state: gs.state,
    level: gs.level,
    gameMonth: gs.gameMonth
  };
}

module.exports = {
  listGames,
  preview,
  createGame,
  getGame,
  dashboard,
  currentEvent,
  submitDecision,
  history,
  financials,
  listProjects,
  listEmployees,
  listPeople,
  workplace,
  competitors,
  submitAction,
  listAchievements,
  market,
  restart,
  founderReport
};
