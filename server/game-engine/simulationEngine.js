const { clone, addDelta, phaseForLevel } = require('../utils/state');
const { clamp } = require('../utils/sanitize');
const decisionEngine = require('./decisionEngine');
const financialEngine = require('./financialEngine');
const workforceEngine = require('./workforceEngine');
const projectEngine = require('./projectEngine');
const eventEngine = require('./eventEngine');
const marketEngine = require('./marketEngine');
const scoringEngine = require('./scoringEngine');
const achievementEngine = require('./achievementEngine');
const failureEngine = require('./failureEngine');
const actionEngine = require('./actionEngine');
const { createRng } = require('../utils/rng');
const { defaultFlags, defaultProperty, defaultIntel } = require('./flags');

function applyStartingModifiers(startingState, modifiers) {
  const state = clone(startingState);
  state.cash = Math.round(state.cash * (modifiers.cashMultiplier ?? 1));
  state.monthlyExpenses = Math.round(state.monthlyExpenses * (modifiers.expenseMultiplier ?? 1));
  state.reputation = (state.reputation || 0) + (modifiers.startingReputationBonus || 0);
  state.founderProfessionalism = clamp(
    (state.founderProfessionalism || 55) + (modifiers.startingReputationBonus || 0),
    0,
    100
  );
  return state;
}

function applyFounderFocus(state, industryState, flags) {
  const focus = flags?.founderFocus;
  if (focus === 'sales') {
    state.revenue = (Number(state.revenue) || 0) * 1.02;
    industryState.pipeline = (Number(industryState.pipeline) || 0) + 4;
  } else if (focus === 'delivery') {
    state.quality = clamp((state.quality || 70) + 1, 0, 100);
    industryState.deliveryRisk = Math.max(0, (Number(industryState.deliveryRisk) || 0) - 2);
  } else if (focus === 'culture') {
    state.employeeMorale = clamp((state.employeeMorale || 50) + 2, 0, 100);
  }
}

function finishFinancials(state, industryConfig, market) {
  state.exceptionalLosses = 0;
  const financials = financialEngine.recompute(state, industryConfig, market);
  financialEngine.applyCashFlow(state, {});
  financialEngine.recompute(state, industryConfig, market);
  failureEngine.clampState(state);
  state.founderProfessionalism = clamp(Number(state.founderProfessionalism) || 50, 0, 100);
  return financials;
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
  let flags = clone(prev.flags || defaultFlags());
  let property = clone(prev.property || defaultProperty());
  let workforce = clone(input.workforce || []);
  let people = clone(input.people || industryConfig.startingPeople || []);
  let projects = clone(input.projects || []);
  let market = clone(input.market || marketEngine.initialMarket(industryConfig));
  if (!market.intel) market.intel = defaultIntel();

  const before = snapshotMetrics(state);

  const meta = decisionEngine.applyDecisionMeta(state, flags, property, decision);
  flags = meta.flags;
  property = meta.property;

  const immediate = {};
  Object.assign(immediate, decisionEngine.applyDirectEffects(state, industryState, decision.directEffects));
  Object.assign(immediate, decisionEngine.applyIndustryEffects(industryState, decision.industryDirectEffects));
  Object.assign(immediate, decisionEngine.applyConditionalEffects(state, industryState, decision.conditionalEffects));

  const { resolutions, applied: probApplied } = decisionEngine.applyProbabilityEffects(
    state,
    industryState,
    decision.probabilityEffects,
    rng,
    difficultyBonus
  );
  Object.assign(immediate, probApplied);

  const hiddenApplied = decisionEngine.applyHiddenEffects(industryState, decision.hiddenEffects);

  const wfApplied = workforceEngine.applyWorkforceEffects(
    workforce,
    decision.workforceEffects,
    industryConfig.roles,
    people,
    rng
  );
  workforce = wfApplied.workforce;
  people = wfApplied.people;
  workforceEngine.recomputeWorkforce(state, workforce, industryConfig.roles, property, flags, people);
  workforce = workforceEngine.syncAggregatesFromPeople(people, industryConfig.roles);

  const projectResult = projectEngine.applyProjectEffects(projects, decision.projectEffects, {
    gameMonth: prev.gameMonth,
    level: prev.level
  });
  projects = projectResult.projects;
  Object.assign(immediate, addDelta(state, projectResult.stateDeltas).applied);

  applyFounderFocus(state, industryState, flags);

  const duration = decision.durationMonths || 1;
  const newMonth = prev.gameMonth + duration;
  const newLevel = prev.level + 1;

  const projectTicks = projectEngine.tickProjects(projects, state, rng, people);
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

  const financials = finishFinancials(state, industryConfig, market);
  workforceEngine.recomputeWorkforce(state, workforce, industryConfig.roles, property, flags, people);
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
      preferredPool,
      flags
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
    score,
    lesson: null,
    founderProfessionalism: state.founderProfessionalism
  };

  const newGameState = {
    gameId: prev.gameId,
    version: prev.version + 1,
    level: newLevel,
    gameMonth: newMonth,
    state,
    industryState,
    flags,
    property,
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
    people,
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

function processAction(input) {
  const rng = createRng(input.rngSeed);
  const prev = input.gameState;
  const industryConfig = input.industryConfig;
  const state = clone(prev.state);
  const industryState = clone(prev.industryState || {});
  let flags = clone(prev.flags || defaultFlags());
  let property = clone(prev.property || defaultProperty());
  let people = clone(input.people || []);
  let projects = clone(input.projects || []);
  let market = clone(input.market || marketEngine.initialMarket(industryConfig));
  const before = snapshotMetrics(state);

  const applied = actionEngine.applyAction({
    type: input.type,
    payload: input.payload,
    state,
    flags,
    property,
    people,
    projects,
    market,
    roles: industryConfig.roles,
    rng
  });

  flags = applied.flags;
  property = applied.property;
  people = applied.people;
  projects = applied.projects;
  market = applied.market;

  workforceEngine.recomputeWorkforce(state, [], industryConfig.roles, property, flags, people);
  const workforce = workforceEngine.syncAggregatesFromPeople(people, industryConfig.roles);

  let newMonth = prev.gameMonth;
  let financials = financialEngine.recompute(state, industryConfig, market);
  const pending = [...(prev.pendingConsequences || [])];

  if (applied.heavy) {
    newMonth += 1;
    projectEngine.tickProjects(projects, state, rng, people);
    applyFounderFocus(state, industryState, flags);
    financials = finishFinancials(state, industryConfig, market);
    workforceEngine.recomputeWorkforce(state, workforce, industryConfig.roles, property, flags, people);
    for (const de of applied.delayed || []) {
      pending.push(
        ...decisionEngine.buildPendingConsequences([de], `action:${input.type}`, prev.level, prev.gameMonth)
      );
    }
  }

  const after = snapshotMetrics(state);
  const outcome = {
    immediate: diffMetrics(before, after),
    delayed: (applied.delayed || []).map((d) => ({ label: d.label, triggerLevel: d.triggerLevel, banner: 'MONTHS LATER…' })),
    randomResolutions: applied.outcomeExtra?.probability
      ? [
          {
            key: input.type,
            finalProbability: applied.outcomeExtra.probability,
            roll: applied.outcomeExtra.roll,
            result: applied.outcomeExtra.success
          }
        ]
      : [],
    lesson: applied.lesson,
    message: applied.message,
    founderProfessionalism: state.founderProfessionalism,
    score: scoringEngine.compute(state, input.game, industryConfig)
  };

  const newGameState = {
    gameId: prev.gameId,
    version: prev.version + 1,
    level: prev.level,
    gameMonth: newMonth,
    state,
    industryState,
    flags,
    property,
    pendingConsequences: pending,
    currentEvent: prev.currentEvent,
    score: outcome.score.businessScore,
    lastOutcome: outcome
  };

  return {
    newGameState,
    gamePatch: {
      status: input.game.status,
      currentLevel: prev.level,
      gameStateVersion: prev.version + 1,
      score: outcome.score.businessScore,
      criticalUsed: Boolean(input.game.criticalUsed),
      seenEventIds: input.seenEventIds
    },
    workforce,
    people,
    projects,
    market: { ...market, asOfLevel: prev.level },
    financials: {
      ...financials,
      period: `gameMonth:${newMonth}`,
      gameMonth: newMonth,
      level: prev.level
    },
    outcome,
    nextEvent: null,
    newAchievements: [],
    phase: phaseForLevel(prev.level)
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
    brandStrength: state.brandStrength,
    founderProfessionalism: state.founderProfessionalism
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

module.exports = { processDecision, processAction, applyStartingModifiers, snapshotMetrics };
