const { phaseForLevel } = require('../utils/state');
const { matchesEligibility } = require('../utils/formula');
const { addDelta } = require('../utils/state');
const { flagsMatch, flagsForbidden } = require('./flags');

function pickWeighted(items, rng) {
  const total = items.reduce((s, i) => s + (i.weight || 1), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight || 1;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function selectNextEvent({
  events,
  industry,
  level,
  state,
  industryState,
  seenEventIds,
  rng,
  preferredPool,
  flags
}) {
  const phase = phaseForLevel(level);
  const seen = new Set(seenEventIds || []);
  const ctx = { state, industryState, level };

  let pool = (events || []).filter((e) => {
    if (e.industry !== industry) return false;
    if (e.isCritical) return false;
    if (e.minLevel && level < e.minLevel) return false;
    if (e.maxLevel && level > e.maxLevel) return false;
    if (Array.isArray(e.phaseEligible) && e.phaseEligible.length && !e.phaseEligible.includes(phase)) {
      return false;
    }
    if (seen.has(e._id) && !e.repeatable) return false;
    if (preferredPool && Array.isArray(e.eventPoolIds) && e.eventPoolIds.length) {
      if (!e.eventPoolIds.includes(preferredPool)) return false;
    }
    if (!flagsMatch(e.requiresFlags, flags)) return false;
    if (flagsForbidden(e.forbidsFlags, flags)) return false;
    return matchesEligibility(e.eligibility, ctx);
  });

  if (!pool.length) {
    pool = (events || []).filter((e) => {
      if (e.industry !== industry || e.isCritical) return false;
      if (seen.has(e._id) && !e.repeatable) return false;
      if (!flagsMatch(e.requiresFlags, flags)) return false;
      if (flagsForbidden(e.forbidsFlags, flags)) return false;
      return true;
    });
  }

  const brandNew = pool.filter((e) => !seen.has(e._id));
  const use = brandNew.length ? brandNew : pool.filter((e) => e.repeatable);
  if (!use.length) return null;
  return pickWeighted(use, rng);
}

function applyMaturedConsequence(state, industryState, consequence, rng) {
  const p = consequence.probability == null ? 1 : consequence.probability;
  const hit = rng() < p;
  const applied = hit ? addDelta(state, consequence.effects).applied : {};
  if (hit && consequence.industryEffects) {
    addDelta(industryState, consequence.industryEffects);
  }
  return {
    hit,
    label: consequence.label,
    triggerLevel: consequence.triggerLevel,
    applied,
    eventPool: consequence.eventPool || null
  };
}

function resolveMaturedConsequences(pending, newLevel, newMonth, rng) {
  const matured = [];
  const remaining = [];
  for (const item of pending || []) {
    const byLevel = item.triggerLevel != null && newLevel >= item.triggerLevel;
    const byMonth = item.triggerMonth != null && item.triggerLevel == null && newMonth >= item.triggerMonth;
    if (byLevel || byMonth) matured.push(item);
    else remaining.push(item);
  }
  return { matured, remaining, rng };
}

module.exports = {
  selectNextEvent,
  applyMaturedConsequence,
  resolveMaturedConsequences,
  pickWeighted
};
