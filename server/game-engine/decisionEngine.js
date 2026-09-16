const { addDelta } = require('../utils/state');
const { evalCondition, evalSuccessProbability } = require('../utils/formula');

function applyDirectEffects(state, industryState, deltas) {
  if (!deltas) return {};
  const copy = { ...deltas };
  if (copy.monthlyExpenses) {
    state.otherExpenses = (Number(state.otherExpenses) || 0) + Number(copy.monthlyExpenses);
    delete copy.monthlyExpenses;
  }
  const s = addDelta(state, copy);
  return s.applied;
}

function applyIndustryEffects(industryState, deltas) {
  return addDelta(industryState, deltas).applied;
}

function applyConditionalEffects(state, industryState, conditionals) {
  const applied = {};
  const ctx = { state, industryState };
  for (const item of conditionals || []) {
    if (!item || !item.if || !item.then) continue;
    if (evalCondition(item.if, ctx)) {
      Object.assign(applied, addDelta(state, item.then).applied);
      if (item.industryThen) {
        Object.assign(applied, addDelta(industryState, item.industryThen).applied);
      }
    }
  }
  return applied;
}

function applyProbabilityEffects(state, industryState, probabilityEffects, rng, difficultyBonus) {
  const ctx = { state, industryState };
  const resolutions = [];
  const applied = {};
  for (const pe of probabilityEffects || []) {
    const finalProbability = evalSuccessProbability(
      pe.baseProbability,
      pe.modifiers,
      ctx,
      difficultyBonus
    );
    const roll = rng();
    const success = roll < finalProbability;
    const branch = success ? pe.onSuccess : pe.onFailure;
    Object.assign(applied, addDelta(state, branch).applied);
    if (success && pe.onSuccessIndustry) {
      addDelta(industryState, pe.onSuccessIndustry);
    }
    if (!success && pe.onFailureIndustry) {
      addDelta(industryState, pe.onFailureIndustry);
    }
    resolutions.push({
      key: pe.key,
      finalProbability,
      roll,
      result: success,
      applied: branch || {}
    });
  }
  return { resolutions, applied };
}

function applyHiddenEffects(industryState, hidden) {
  return addDelta(industryState, hidden).applied;
}

function buildPendingConsequences(delayedEffects, decisionId, currentLevel, currentMonth) {
  const pending = [];
  for (const de of delayedEffects || []) {
    let triggerLevel = currentLevel;
    if (typeof de.triggerLevel === 'string' && de.triggerLevel.startsWith('+')) {
      triggerLevel = currentLevel + Number(de.triggerLevel.slice(1));
    } else if (typeof de.triggerLevel === 'number') {
      triggerLevel = de.triggerLevel;
    }
    let triggerMonth = currentMonth;
    if (typeof de.triggerMonth === 'string' && de.triggerMonth.startsWith('+')) {
      triggerMonth = currentMonth + Number(de.triggerMonth.slice(1));
    } else if (typeof de.triggerMonth === 'number') {
      triggerMonth = de.triggerMonth;
    }
    pending.push({
      sourceDecisionId: decisionId,
      label: de.label || 'Delayed consequence',
      triggerLevel,
      triggerMonth,
      probability: de.probability == null ? 1 : de.probability,
      eventPool: de.eventPool || null,
      effects: de.effects || {},
      industryEffects: de.industryEffects || {},
      hidden: Boolean(de.hidden)
    });
  }
  return pending;
}

module.exports = {
  applyDirectEffects,
  applyIndustryEffects,
  applyConditionalEffects,
  applyProbabilityEffects,
  applyHiddenEffects,
  buildPendingConsequences
};
