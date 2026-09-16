const { clamp } = require('../utils/sanitize');

const SUGGESTIONS = [
  {
    id: 'undercut',
    title: 'Undercut on a visible bid',
    lesson: 'Price wars buy share and train the market to expect cheap.',
    risk: 'high',
    onSuccess: { marketShare: 1.2, revenue: 9000, cash: 6000, reputation: -2 },
    onFailure: { cash: -14000, reputation: -8, marketShare: -0.4 }
  },
  {
    id: 'upmarket',
    title: 'Go upmarket and refuse cheap work',
    lesson: 'Positioning is a bet that some clients will pay for craft.',
    risk: 'medium',
    onSuccess: { reputation: 8, brandStrength: 10, revenue: 7000, cash: 7000 },
    onFailure: { customers: -1, revenue: -4000, cash: -5000 }
  },
  {
    id: 'poach',
    title: 'Poach a rival’s delivery lead',
    lesson: 'Talent raids work until your culture cannot absorb the hire.',
    risk: 'high',
    onSuccess: { quality: 8, operationalCapacity: 8, cash: -9000, reputation: -3 },
    onFailure: { cash: -9000, reputation: -10, employeeMorale: -6 }
  },
  {
    id: 'productize',
    title: 'Productize the last three similar builds',
    lesson: 'Repeatable offers raise margin if you can say no to custom.',
    risk: 'medium',
    onSuccess: { revenue: 11000, cash: 8000, brandStrength: 6, marketShare: 0.6 },
    onFailure: { cash: -12000, operationalCapacity: -8, quality: -4 }
  },
  {
    id: 'niche',
    title: 'Own a vertical (clinics, logistics, or trade)',
    lesson: 'A narrow beachhead beats a vague “we do software.”',
    risk: 'low',
    onSuccess: { reputation: 5, customers: 1, cash: 5000, brandStrength: 5 },
    onFailure: { cash: -4000, pipeline: 0 }
  }
];

function defaultCompetitors() {
  return [
    { id: 'riv-northline', name: 'Northline Digital', aggression: 0.55, pricePressure: 0.48, quality: 61 },
    { id: 'riv-harbor', name: 'Harbor Stack', aggression: 0.4, pricePressure: 0.35, quality: 72 },
    { id: 'riv-kite', name: 'Kite & Co. Studio', aggression: 0.7, pricePressure: 0.62, quality: 54 }
  ];
}

function ensureCompetitors(market) {
  const next = { ...(market || {}) };
  if (!Array.isArray(next.competitors) || !next.competitors.length) {
    next.competitors = defaultCompetitors();
  }
  if (!next.intel) next.intel = { analyzedAt: null, suggestions: [], lastResult: null };
  return next;
}

function commissionAnalysis(state, market, rng) {
  const fee = 8000;
  if ((state.cash || 0) < fee) {
    return { ok: false, message: 'Not enough cash to commission analysis ($8,000).', market, lesson: null };
  }
  state.cash -= fee;
  const prof = Number(state.founderProfessionalism) || 50;
  const p = clamp(0.42 + (prof - 50) * 0.006, 0.08, 0.92);
  const roll = rng();
  const next = ensureCompetitors(market);
  if (roll >= p) {
    next.competitionIntensity = clamp((next.competitionIntensity || 0.4) + 0.06, 0.1, 1);
    state.reputation = (state.reputation || 0) - 3;
    state.founderProfessionalism = clamp(prof - 3, 0, 100);
    next.intel = {
      analyzedAt: Date.now(),
      suggestions: [],
      lastResult: 'failure'
    };
    return {
      ok: true,
      success: false,
      message: 'The brief leaked. Rivals noticed you shopping for a playbook.',
      lesson: 'Intel is a weapon that can be turned around. Quiet analysis beats loud strategy theater.',
      market: next,
      probability: p,
      roll
    };
  }

  const shuffled = SUGGESTIONS.slice().sort(() => rng() - 0.5);
  const picks = shuffled.slice(0, 3).map((s) => ({
    id: s.id,
    title: s.title,
    lesson: s.lesson,
    risk: s.risk
  }));
  next.intel = { analyzedAt: Date.now(), suggestions: picks, lastResult: 'success' };
  state.founderProfessionalism = clamp(prof + 2, 0, 100);
  return {
    ok: true,
    success: true,
    message: 'Three growth options, each with a real chance of failing.',
    lesson: 'Good analysis names the trade-off, not a guaranteed path.',
    suggestions: picks,
    market: next,
    probability: p,
    roll
  };
}

function pursueSuggestion(state, market, suggestionId, rng) {
  const next = ensureCompetitors(market);
  const catalog = SUGGESTIONS.find((s) => s.id === suggestionId);
  const known = (next.intel?.suggestions || []).find((s) => s.id === suggestionId);
  if (!catalog || !known) {
    return { ok: false, message: 'Commission analysis first, then pursue a listed option.', market: next };
  }
  const riskP = { low: 0.7, medium: 0.52, high: 0.38 }[catalog.risk] || 0.5;
  const prof = Number(state.founderProfessionalism) || 50;
  const p = clamp(riskP + (prof - 50) * 0.004, 0.08, 0.92);
  const roll = rng();
  const success = roll < p;
  const branch = success ? catalog.onSuccess : catalog.onFailure;
  for (const [k, v] of Object.entries(branch || {})) {
    if (k === 'pipeline') continue;
    state[k] = (Number(state[k]) || 0) + v;
  }
  if (!success) {
    next.competitionIntensity = clamp((next.competitionIntensity || 0.4) + 0.08, 0.1, 1);
    const rival = next.competitors[0];
    if (rival) rival.aggression = clamp((rival.aggression || 0.5) + 0.1, 0, 1);
    state.founderProfessionalism = clamp(prof - 4, 0, 100);
  } else {
    state.founderProfessionalism = clamp(prof + 3, 0, 100);
  }
  next.intel = { ...(next.intel || {}), lastPursued: suggestionId, lastPursueSuccess: success };
  return {
    ok: true,
    success,
    message: success ? `It landed: ${catalog.title}` : `It backfired: ${catalog.title}`,
    lesson: catalog.lesson,
    market: next,
    probability: p,
    roll,
    applied: branch
  };
}

module.exports = {
  SUGGESTIONS,
  defaultCompetitors,
  ensureCompetitors,
  commissionAnalysis,
  pursueSuggestion
};
