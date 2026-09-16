const { evalCondition } = require('../utils/formula');

function evaluate(achievements, ctx, alreadyUnlocked) {
  const unlocked = [];
  const have = new Set(alreadyUnlocked || []);
  for (const a of achievements || []) {
    if (have.has(a._id)) continue;
    const cond = a.condition || {};
    let ok = true;
    if (cond.expr) ok = evalCondition(cond.expr, ctx);
    else ok = evalCondition(stringifyCondition(cond), ctx);
    if (ok) unlocked.push(a);
  }
  return unlocked;
}

function stringifyCondition(cond) {
  if (cond.expr) return cond.expr;
  if (cond.field && cond.op && cond.value != null) {
    return `${cond.field} ${cond.op} ${cond.value}`;
  }
  const parts = [];
  for (const [k, v] of Object.entries(cond)) {
    if (k === 'expr') continue;
    if (v && typeof v === 'object') {
      if (v.gt != null) parts.push(`${k} > ${v.gt}`);
      if (v.gte != null) parts.push(`${k} >= ${v.gte}`);
    } else if (typeof v === 'number' || typeof v === 'string') {
      parts.push(`${k} > ${v}`);
    }
  }
  return parts.join(' && ') || 'false';
}

module.exports = { evaluate };
