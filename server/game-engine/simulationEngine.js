const { clone, addDelta, phaseForLevel } = require('../utils/state');
const decisionEngine = require('./decisionEngine');
const financialEngine = require('./financialEngine');
const workforceEngine = require('./workforceEngine');
const projectEngine = require('./projectEngine');
const eventEngine = require('./eventEngine');
const marketEngine = require('./marketEngine');
const scoringEngine = require('./scoringEngine');
const achievementEngine = require('./achievementEngine');
const failureEngine = require('./failureEngine');
const { createRng } = require('../utils/rng');

function applyStartingModifiers(startingState, modifiers) {
  const state = clone(startingState);
  state.cash = Math.round(state.cash * (modifiers.cashMultiplier ?? 1));
  state.monthlyExpenses = Math.round(state.monthlyExpenses * (modifiers.expenseMultiplier ?? 1));
  state.reputation = (state.reputation || 0) + (modifiers.startingReputationBonus || 0);
  return state;
}

function processDecision(input) {
  const rng = createRng(input.rngSeed);
  const game = input.game;
  const prev = input.gameState;
  const decision = input.decision;
  const industryConfig = input.industryConfig;
  const difficultyBonus = game.difficultyModifiers?.probabilityBonus || 0;

  const state = clone(prev.state);
  const industryState = clone(prev.industryState || {});
  let workforce = clone(input.workforce || []);
  let projects = clone(input.projects || []);
  let market = clone(input.market || marketEngine.initialMarket(industryConfig));

  const before = snapshotMetrics(state);

  const immediate = {};
  Object.assign(immediate, decisionEngine.applyDirectEffects(state, industryState, decision.directEffects));
  Object.assign(
    immediate,
    decisionEngine.applyIndustryEffects(industryState, decision.industryDirectEffects)
  );
  Object.assign(
    immediate,
    decisionEngine.applyConditionalEffects(state, industryState, decision.conditionalEffects)
  );

  const { resolutions, applied: probApplied } = decisionEngine.applyProbabilityEffects(
    state,
    industryState,
    decision.probabilityEffects,
    rng,
    difficultyBonus
  );
  Object.assign(immediate, probApplied);

  const hiddenApplied = decisionEngine.applyHiddenEffects(industryState, decision.hiddenEffects);

  workforce = workforceEngine.applyWorkforceEffects(
    workforce,
    decision.workforceEffects,
    industryConfig.roles
  );
  workforceEngine.recomputeWorkforce(state, workforce, industryConfig.roles);

  const projectResult = projectEngine.applyProjectEffects(projects, decision.projectEffects, {
    gameMonth: prev.gameMonth,
    level: prev.level
  });
  projects = projectResult.projects;
  Object.assign(immediate, addDelta(state, projectResult.stateDeltas).applied);

  const duration = decision.durationMonths || 1;
  const newMonth = prev.gameMonth + duration;
  const newLevel = prev.level + 1;

  const projectTicks = projectEngine.tickProjects(projects, state, rng);
  market = marketEngine.tickMarket(market, state, newLevel, rng);
  marketEngine.applyMarketToState(state, market);

  const pending = [
    ...(prev.pendingConsequences || []),
    ...decisionEngine.buildPendingConsequences(
      decision.delayedEffects,
      decision._id,
      prev.level,
      prev.gameMonth
    )
  ];

  const split = eventEngine.resolveMaturedConsequences(pending, newLevel, newMonth, rng);
  const maturedReports = [];
  let preferredPool = null;
  for (const mc of split.matured) {
    const report = eventEngine.applyMaturedConsequence(state, industryState, mc, rng);
    maturedReports.push(report);
    if (report.hit && report.eventPool) preferredPool = report.eventPool;
  }

  state.exceptionalLosses = 0;
  const financials = financialEngine.recompute(state, industryConfig, market);
  financialEngine.applyCashFlow(state, {});
  financialEngine.recompute(state, industryConfig, market);

  failureEngine.clampState(state);
  state.level = newLevel;

  const failureCheck = failureEngine.evaluateFailureConditions(
    { ...state, level: newLevel, _criticalUsed: Boolean(game.criticalUsed) },
    industryConfig
  );

  let gameStatus = game.status;
  let nextEvent = null;
  if (failureCheck.triggered && !failureCheck.recoverable) {
    gameStatus = 'failed';
  } else if (failureCheck.triggered && failureCheck.recoverable) {
    nextEvent = (input.events || []).find((e) => e._id === failureCheck.recoveryEventId) || null;
    game.criticalUsed = true;
  }

  if (!nextEvent && newLevel >= 100) {
    gameStatus = 'completed';
  }

  if (!nextEvent && gameStatus === 'active') {
    nextEvent = eventEngine.selectNextEvent({
      events: input.events,
      industry: game.industry,
      level: newLevel,
      state,
      industryState,
      seenEventIds: input.seenEventIds,
      rng,
      preferredPool
    });
  }

  const score = scoringEngine.compute(state, game, industryConfig);
  const newAchievements = achievementEngine.evaluate(
    input.achievements,
    { state, industryState, level: newLevel },
    input.unlockedAchievementIds
  );

  const after = snapshotMetrics(state);
  const deltas = diffMetrics(before, after);

  const outcome = {
    immediate: deltas,
    hiddenKeys: Object.keys(hiddenApplied),
    delayed: [
      ...decisionEngine
        .buildPendingConsequences(decision.delayedEffects, decision._id, prev.level, prev.gameMonth)
        .map((d) => ({
          label: d.label,
          triggerLevel: d.triggerLevel,
          banner: 'MONTHS LATER…'
        })),
      ...maturedReports
        .filter((m) => m.hit)
        .map((m) => ({ label: m.label, triggerLevel: m.triggerLevel, matured: true, applied: m.applied }))
    ],
    randomResolutions: resolutions,
    projectTicks,
    failureCheck,
    score
  };

  const newGameState = {
    gameId: prev.gameId,
    version: prev.version + 1,
    level: newLevel,
    gameMonth: newMonth,
    state,
    industryState,
    pendingConsequences: split.remaining,
    currentEvent: nextEvent
      ? { eventId: nextEvent._id, status: 'pending' }
      : { eventId: null, status: 'none' },
    score: score.businessScore,
    lastOutcome: outcome
  };

  return {
    newGameState,
    gamePatch: {
      status: gameStatus,
      currentLevel: newLevel,
      gameStateVersion: prev.version + 1,
      score: score.businessScore,
      criticalUsed: Boolean(game.criticalUsed),
      seenEventIds: nextEvent ? [...new Set([...(input.seenEventIds || []), nextEvent._id])] : input.seenEventIds
    },
    workforce,
    projects,
    market: { ...market, asOfLevel: newLevel },
    financials: {
      ...financials,
      period: `gameMonth:${newMonth}`,
      gameMonth: newMonth,
      level: newLevel
    },
    outcome,
    nextEvent,
    newAchievements,
    phase: phaseForLevel(newLevel)
  };
}

function snapshotMetrics(state) {
  return {
    cash: state.cash,
    revenue: state.revenue,
    monthlyExpenses: state.monthlyExpenses,
    netProfit: state.netProfit,
    debt: state.debt,
    companyValue: state.companyValue,
    reputation: state.reputation,
    customers: state.customers,
    employees: state.employees,
    employeeMorale: state.employeeMorale,
    operationalCapacity: state.operationalCapacity,
    quality: state.quality,
    marketShare: state.marketShare,
    brandStrength: state.brandStrength
  };
}

function diffMetrics(before, after) {
  const out = {};
  for (const key of Object.keys(after)) {
    const delta = (Number(after[key]) || 0) - (Number(before[key]) || 0);
    if (Math.abs(delta) >= 0.05) out[`${key}Delta`] = Math.round(delta * 10) / 10;
  }
  return out;
}

module.exports = { processDecision, applyStartingModifiers, snapshotMetrics };
