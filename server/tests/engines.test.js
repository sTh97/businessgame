const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const financialEngine = require('../game-engine/financialEngine');
const { evalSuccessProbability, evalFormula, evalCondition } = require('../utils/formula');
const { managementOverheadFactor } = require('../game-engine/workforceEngine');
const simulationEngine = require('../game-engine/simulationEngine');
const { softwareHouseConfig, DIFFICULTY_MODIFIERS } = require('../game-content/software-house/config');
const { flatten } = require('../game-content/software-house/events');

describe('financial engine', () => {
  test('operating and net profit worked example', () => {
    const op = financialEngine.operatingProfit(180000, 140000);
    assert.equal(op, 40000);
    const taxes = financialEngine.taxAmount(op - 2500, 0.29);
    const np = financialEngine.netProfit(op, 2500, taxes, 0);
    assert.equal(Math.round(np), 26625);
  });

  test('company valuation worked example', () => {
    const v = financialEngine.companyValuation({
      annualRevenue: 2160000,
      netProfitValue: 319500,
      reputation: 70,
      debt: 150000,
      config: { revenueMultiple: 2.2, profitMultiple: 6, brandPremiumFactor: 500000 }
    });
    assert.equal(v, 10703000);
  });
});

describe('probability modifiers', () => {
  test('clamps to 5-95 and applies modifiers', () => {
    const p = evalSuccessProbability(
      0.7,
      [
        { formula: 'reputation * 0.002' },
        { value: -0.15, source: 'operationalCapacity', condition: '>85' }
      ],
      { state: { reputation: 25, operationalCapacity: 90 } },
      0
    );
    assert.ok(p >= 0.05 && p <= 0.95);
    assert.ok(Math.abs(p - 0.6) < 0.001);
  });

  test('formulas and conditions', () => {
    assert.equal(evalFormula('reputation * 0.002', { state: { reputation: 50 } }), 0.1);
    assert.equal(evalCondition('operationalCapacity > 85', { state: { operationalCapacity: 91 } }), true);
    assert.equal(evalCondition('operationalCapacity > 85', { state: { operationalCapacity: 80 } }), false);
  });
});

describe('workforce overhead', () => {
  test('100 employees overhead factor 1.32', () => {
    assert.equal(Number(managementOverheadFactor(100).toFixed(2)), 1.32);
  });
});

describe('simulation pipeline', () => {
  test('processes founding decision and increments level/version', () => {
    const { eventDocs, decisionDocs } = flatten();
    const decision = decisionDocs.find((d) => d._id === 'swh-01-founding-bet-B');
    const state = simulationEngine.applyStartingModifiers(
      softwareHouseConfig.startingState,
      DIFFICULTY_MODIFIERS.normal
    );
    const result = simulationEngine.processDecision({
      game: {
        industry: 'software-house',
        status: 'active',
        difficultyModifiers: DIFFICULTY_MODIFIERS.normal,
        seenEventIds: ['swh-01-founding-bet']
      },
      gameState: {
        gameId: 'test',
        version: 1,
        level: 1,
        gameMonth: 1,
        state,
        industryState: { ...softwareHouseConfig.startingIndustryState },
        pendingConsequences: [],
        currentEvent: { eventId: 'swh-01-founding-bet', status: 'pending' }
      },
      decision,
      industryConfig: softwareHouseConfig,
      events: eventDocs,
      workforce: softwareHouseConfig.startingWorkforce,
      projects: [],
      market: softwareHouseConfig.initialMarket,
      achievements: [],
      unlockedAchievementIds: [],
      seenEventIds: ['swh-01-founding-bet'],
      rngSeed: 42
    });
    assert.equal(result.newGameState.version, 2);
    assert.equal(result.newGameState.level, 2);
    assert.ok(result.newGameState.state.cash < state.cash);
    assert.ok(result.nextEvent);
    assert.equal(result.gamePatch.status, 'active');
  });
});
