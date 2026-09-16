const { clamp } = require('../utils/sanitize');
const { founderRating } = require('../utils/state');

function normalize(value, min, max) {
  if (max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 1000, 0, 1000);
}

function compute(state, game, industryConfig) {
  const b = (industryConfig.scoreBenchmarks || {})[game.difficulty] || industryConfig.scoreBenchmarks?.normal || {
    cash: [0, 2000000],
    revenue: [0, 400000],
    valuation: [0, 15000000],
    reputation: [0, 100],
    employees: [0, 80],
    marketShare: [0, 20]
  };

  const financialPerformanceScore = normalize(state.cash + state.netProfit * 6, b.cash[0], b.cash[1]);
  const growthScore = normalize(state.revenue, b.revenue[0], b.revenue[1]);
  const reputationScore = normalize(state.reputation, 0, 100);
  const employeePerformanceScore = normalize(
    (state.employeeMorale || 0) * 0.6 + (state.quality || 0) * 0.4,
    0,
    100
  );
  const marketShareScore = normalize(state.marketShare || 0, b.marketShare[0], b.marketShare[1]);
  const leverage = state.debt / Math.max(1, state.cash + 1);
  const riskManagementScore = clamp(1000 - leverage * 250 - Math.max(0, -state.cash) / 200, 0, 1000);
  const strategicDecisionsScore = normalize(state.companyValue || 0, b.valuation[0], b.valuation[1]);

  const businessScore = Math.round(
    financialPerformanceScore * 0.25 +
      growthScore * 0.15 +
      reputationScore * 0.15 +
      employeePerformanceScore * 0.1 +
      marketShareScore * 0.15 +
      riskManagementScore * 0.1 +
      strategicDecisionsScore * 0.1
  );

  return {
    businessScore: clamp(businessScore, 0, 1000),
    parts: {
      financialPerformanceScore,
      growthScore,
      reputationScore,
      employeePerformanceScore,
      marketShareScore,
      riskManagementScore,
      strategicDecisionsScore
    },
    rating: founderRating(businessScore)
  };
}

module.exports = { compute, normalize };
