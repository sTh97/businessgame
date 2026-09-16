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
    assert.equal(result.newGameState.flags.housing, 'rent');
    assert.equal(result.newGameState.flags.workMode, 'office');
    assert.ok(result.nextEvent._id !== 'swh-remote-client-address');
  });

  test('remote founding forbids office-rent events and allows remote follow-ups', () => {
    const { eventDocs, decisionDocs } = flatten();
    const decision = decisionDocs.find((d) => d._id === 'swh-01-founding-bet-A');
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
      people: softwareHouseConfig.startingPeople,
      projects: [],
      market: softwareHouseConfig.initialMarket,
      achievements: [],
      unlockedAchievementIds: [],
      seenEventIds: ['swh-01-founding-bet'],
      rngSeed: 7
    });
    assert.equal(result.newGameState.flags.workMode, 'remote');
    assert.equal(result.newGameState.flags.housing, 'none');
    const office = eventDocs.find((e) => e._id === 'swh-19-office-expansion');
    const { flagsMatch, flagsForbidden } = require('../game-engine/flags');
    assert.equal(flagsForbidden(office.forbidsFlags, result.newGameState.flags), true);
    const remoteEvt = eventDocs.find((e) => e._id === 'swh-remote-client-address');
    assert.equal(flagsMatch(remoteEvt.requiresFlags, result.newGameState.flags), true);
  });
});

describe('ops actions', () => {
  function actionInput(type, payload, extra = {}) {
    const state = simulationEngine.applyStartingModifiers(
      softwareHouseConfig.startingState,
      DIFFICULTY_MODIFIERS.normal
    );
    return {
      type,
      payload: payload || {},
      game: {
        industry: 'software-house',
        status: 'active',
        difficultyModifiers: DIFFICULTY_MODIFIERS.normal
      },
      gameState: {
        gameId: 'test',
        version: extra.version || 1,
        level: extra.level || 2,
        gameMonth: extra.gameMonth || 2,
        state: extra.state || state,
        industryState: { ...softwareHouseConfig.startingIndustryState },
        flags: extra.flags || {
          workMode: 'remote',
          housing: 'none',
          carPolicy: 'none',
          fuelPolicy: 'none',
          founderFocus: null
        },
        property: extra.property || {
          kind: 'none',
          monthlyCost: 0,
          assetValue: 0,
          renovationLevel: 0,
          rooms: []
        },
        pendingConsequences: [],
        currentEvent: { eventId: 'swh-02-first-hire', status: 'pending' }
      },
      industryConfig: softwareHouseConfig,
      people: extra.people || softwareHouseConfig.startingPeople.map((p) => ({ ...p, taskBurndown: { ...p.taskBurndown } })),
      projects: extra.projects || [],
      market: extra.market || { ...softwareHouseConfig.initialMarket },
      seenEventIds: ['swh-01-founding-bet'],
      rngSeed: extra.rngSeed ?? 11
    };
  }

  test('hire does not skip the situation and adds a named person', () => {
    const result = simulationEngine.processAction(actionInput('hire', { role: 'qa' }));
    assert.equal(result.newGameState.level, 2);
    assert.equal(result.newGameState.currentEvent.eventId, 'swh-02-first-hire');
    assert.equal(result.people.length, 4);
    assert.equal(result.newGameState.gameMonth, 3);
    assert.ok(result.outcome.founderProfessionalism != null);
  });

  test('rent-office flips housing flags and keeps the pending card', () => {
    const result = simulationEngine.processAction(actionInput('rent-office', {}));
    assert.equal(result.newGameState.flags.housing, 'rent');
    assert.equal(result.newGameState.flags.workMode, 'office');
    assert.equal(result.newGameState.property.kind, 'rented');
    assert.ok(result.newGameState.property.rooms.length >= 3);
    assert.equal(result.newGameState.level, 2);
    assert.equal(result.newGameState.currentEvent.eventId, 'swh-02-first-hire');
  });

  test('assign-room is a light action and does not tick the month', () => {
    const rented = simulationEngine.processAction(actionInput('rent-office', {}, { rngSeed: 4 }));
    const personId = rented.people[0].personId;
    const roomId = rented.newGameState.property.rooms[0].id;
    const assigned = simulationEngine.processAction({
      ...actionInput('assign-room', { personId, roomId }, { rngSeed: 5 }),
      gameState: rented.newGameState,
      people: rented.people,
      projects: rented.projects,
      market: rented.market
    });
    assert.equal(assigned.newGameState.gameMonth, rented.newGameState.gameMonth);
    assert.equal(assigned.newGameState.level, rented.newGameState.level);
    assert.equal(
      assigned.people.find((p) => p.personId === personId).assignedRoomId,
      roomId
    );
  });

  test('commission intel spends cash and returns a lesson', () => {
    const result = simulationEngine.processAction(actionInput('commission-intel', {}, { rngSeed: 2 }));
    assert.ok(result.newGameState.state.cash < softwareHouseConfig.startingState.cash);
    assert.ok(result.outcome.lesson);
    assert.equal(result.newGameState.level, 2);
  });
});

describe('event engine flags', () => {
  test('never selects office expansion while remote with no housing', () => {
    const eventEngine = require('../game-engine/eventEngine');
    const { eventDocs } = flatten();
    const office = eventDocs.find((e) => e._id === 'swh-19-office-expansion');
    const { flagsForbidden } = require('../game-engine/flags');
    const flags = { workMode: 'remote', housing: 'none', carPolicy: 'none', fuelPolicy: 'none' };
    assert.equal(flagsForbidden(office.forbidsFlags, flags), true);
    for (let i = 0; i < 30; i += 1) {
      const next = eventEngine.selectNextEvent({
        events: eventDocs,
        industry: 'software-house',
        level: 16,
        state: { cash: 80000, employees: 8, reputation: 40 },
        industryState: {},
        seenEventIds: ['swh-01-founding-bet'],
        rng: () => (i + 1) / 40,
        flags
      });
      assert.ok(next);
      assert.notEqual(next._id, 'swh-19-office-expansion');
    }
  });
});
