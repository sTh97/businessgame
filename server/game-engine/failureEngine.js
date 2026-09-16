const { clamp } = require('../utils/sanitize');

function evaluateFailureConditions(state, industryConfig) {
  const rules = industryConfig.failureConditions || [];
  for (const rule of rules) {
    const triggered = matches(rule, state);
    if (!triggered) continue;
    const recoverable = isRecoverable(rule, state);
    return {
      triggered: true,
      recoverable,
      code: rule.code,
      title: rule.title,
      description: rule.description,
      recoveryEventId: rule.recoveryEventId || 'swh-critical-turnaround'
    };
  }
  return { triggered: false, recoverable: false };
}

function matches(rule, state) {
  if (rule.code === 'bankruptcy' && state.cash < 0 && state.revenue < state.monthlyExpenses) return true;
  if (rule.code === 'liquidity-crisis' && state.cash < 0) return true;
  if (rule.code === 'unsustainable-debt' && state.debt > Math.max(50000, state.cash * 8 + state.revenue * 12)) {
    return true;
  }
  if (rule.code === 'reputation-collapse' && state.reputation <= 5 && (state.level || 0) >= 6) return true;
  if (rule.code === 'customer-collapse' && state.customers <= 0 && state.revenue <= 0 && (state.level || 0) >= 12) {
    return true;
  }
  if (rule.predicate) {
    const p = rule.predicate;
    if (p.cashLt != null && !(state.cash < p.cashLt)) return false;
    if (p.reputationLte != null && !(state.reputation <= p.reputationLte)) return false;
    return true;
  }
  return false;
}

function isRecoverable(rule, state) {
  if (rule.neverRecoverable) return false;
  if (state._criticalUsed) return false;
  if (rule.code === 'bankruptcy' && state.reputation < 8 && state.customers === 0) return false;
  return true;
}

function clampState(state) {
  state.reputation = clamp(state.reputation, 0, 100);
  state.quality = clamp(state.quality, 0, 100);
  return state;
}

module.exports = { evaluateFailureConditions, clampState };
