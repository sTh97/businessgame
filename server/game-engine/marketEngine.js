const { clamp, round1 } = require('../utils/sanitize');

const CONDITIONS = ['boom', 'normal', 'slowdown', 'recession'];

function initialMarket(industryConfig) {
  const m = industryConfig.initialMarket || {};
  return {
    asOfLevel: 1,
    marketGrowth: m.marketGrowth ?? 3.5,
    inflation: m.inflation ?? 5.5,
    interestRate: m.interestRate ?? 11.5,
    consumerDemand: m.consumerDemand ?? 1,
    competitionIntensity: m.competitionIntensity ?? 0.35,
    economicCondition: m.economicCondition ?? 'normal',
    technologyTrend: m.technologyTrend ?? 'steady',
    conditionRemaining: 0
  };
}

function tickMarket(market, state, level, rng) {
  const next = { ...market, asOfLevel: level };
  if (level % 5 !== 0 && !next.conditionRemaining) {
    next.competitionIntensity = clamp(
      next.competitionIntensity + (state.marketShare > 8 ? 0.02 : 0),
      0.1,
      1
    );
    return next;
  }

  if (next.conditionRemaining > 0) {
    next.conditionRemaining -= 1;
    if (next.conditionRemaining <= 0) {
      next.economicCondition = 'normal';
      next.marketGrowth = 3.2;
      next.consumerDemand = 1;
    }
  } else if (rng() < 0.18) {
    const roll = rng();
    if (roll < 0.25) {
      next.economicCondition = 'recession';
      next.marketGrowth = -1.5;
      next.consumerDemand = 0.7;
      next.interestRate = clamp(next.interestRate + 1.5, 6, 22);
      next.conditionRemaining = 8 + Math.floor(rng() * 8);
    } else if (roll < 0.55) {
      next.economicCondition = 'slowdown';
      next.marketGrowth = 1.1;
      next.consumerDemand = 0.85;
      next.conditionRemaining = 5 + Math.floor(rng() * 5);
    } else if (roll < 0.8) {
      next.economicCondition = 'boom';
      next.marketGrowth = 7.5;
      next.consumerDemand = 1.2;
      next.conditionRemaining = 4 + Math.floor(rng() * 4);
    }
  }

  next.inflation = round1(clamp(next.inflation + (rng() - 0.5) * 0.6, 2, 18));
  next.interestRate = round1(clamp(next.interestRate + (rng() - 0.48) * 0.4, 6, 22));
  next.marketGrowth = round1(clamp(next.marketGrowth + (rng() - 0.5) * 0.8, -4, 12));
  next.competitionIntensity = clamp(
    next.competitionIntensity + (state.marketShare || 0) * 0.004 + (rng() - 0.5) * 0.03,
    0.1,
    1
  );
  if (!CONDITIONS.includes(next.economicCondition)) next.economicCondition = 'normal';
  return next;
}

function applyMarketToState(state, market) {
  if (!market) return;
  if (market.economicCondition === 'recession') {
    state.revenue *= 0.92;
    state.customers = Math.max(0, state.customers - (state.customers > 0 ? 1 : 0));
  } else if (market.economicCondition === 'boom') {
    state.revenue *= 1.04;
  }
  if (market.competitionIntensity > 0.75) {
    state.marketShare = Math.max(0, (state.marketShare || 0) * 0.98);
  }
}

module.exports = { initialMarket, tickMarket, applyMarketToState };
