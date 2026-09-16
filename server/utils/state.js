function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function addDelta(target, deltas) {
  if (!deltas) return { applied: {}, shown: {} };
  const applied = {};
  for (const [key, raw] of Object.entries(deltas)) {
    if (raw == null || typeof raw === 'object') continue;
    const value = Number(raw) || 0;
    if (value === 0) continue;
    target[key] = (Number(target[key]) || 0) + value;
    applied[key] = value;
  }
  return { applied, shown: applied };
}

function mergeInto(target, source) {
  if (!source) return target;
  for (const [k, v] of Object.entries(source)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = mergeInto(target[k] && typeof target[k] === 'object' ? target[k] : {}, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function phaseForLevel(level) {
  if (level <= 10) return 'survival';
  if (level <= 25) return 'early-growth';
  if (level <= 40) return 'expansion';
  if (level <= 55) return 'professionalization';
  if (level <= 70) return 'market-competition';
  if (level <= 85) return 'major-corporation';
  return 'empire';
}

function phaseLabel(phase) {
  return {
    survival: 'Survival',
    'early-growth': 'Early Growth',
    expansion: 'Expansion',
    professionalization: 'Professionalization',
    'market-competition': 'Market Competition',
    'major-corporation': 'Major Corporation',
    empire: 'Empire'
  }[phase] || phase;
}

function founderRating(score) {
  if (score < 200) return { id: 'failed-founder', label: 'Failed Founder' };
  if (score < 400) return { id: 'survivor', label: 'Survivor' };
  if (score < 600) return { id: 'business-operator', label: 'Business Operator' };
  if (score < 750) return { id: 'successful-entrepreneur', label: 'Successful Entrepreneur' };
  if (score < 900) return { id: 'industry-leader', label: 'Industry Leader' };
  return { id: 'business-empire', label: 'Business Empire' };
}

function endingForState(state, status, level) {
  if (status === 'failed' || (state.cash <= 0 && state.debt > state.cash + 50000 && state.reputation < 15)) {
    return { id: 'bankrupt', label: 'Bankrupt' };
  }
  if (status === 'acquired') return { id: 'acquired', label: 'Acquired' };
  if (level >= 100 && state.companyValue >= 50000000 && state.marketShare >= 15) {
    return { id: 'business-empire', label: 'Business Empire' };
  }
  if (level >= 100 && state.companyValue >= 20000000) return { id: 'industry-leader', label: 'Industry Leader' };
  if (level >= 100 && state.customers >= 40) return { id: 'international-company', label: 'International Company' };
  if (level >= 100 && state.companyValue >= 5000000) return { id: 'national-leader', label: 'National Leader' };
  if (level >= 100) return { id: 'stable-business', label: 'Stable Business' };
  return { id: 'in-progress', label: 'In Progress' };
}

module.exports = {
  clone,
  addDelta,
  mergeInto,
  phaseForLevel,
  phaseLabel,
  founderRating,
  endingForState
};
