const { clamp } = require('./sanitize');

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function getField(ctx, name) {
  const bag = ctx || {};
  if (bag.state && Object.prototype.hasOwnProperty.call(bag.state, name)) {
    return Number(bag.state[name]) || 0;
  }
  if (bag.industryState && Object.prototype.hasOwnProperty.call(bag.industryState, name)) {
    return Number(bag.industryState[name]) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(bag, name)) {
    return Number(bag[name]) || 0;
  }
  return 0;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const s = String(expr);
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let n = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        n += s[i];
        i += 1;
      }
      tokens.push({ type: 'num', value: Number(n) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        id += s[i];
        i += 1;
      }
      tokens.push({ type: 'id', value: id });
      continue;
    }
    throw new Error(`Invalid formula token at "${ch}"`);
  }
  return tokens;
}

function compileFormula(expr) {
  const tokens = tokenize(expr);
  return function evalCompiled(ctx) {
    let i = 0;
    function peek() {
      return tokens[i];
    }
    function eat(type) {
      const t = tokens[i];
      if (!t || (type && t.type !== type)) throw new Error('Unexpected formula token');
      i += 1;
      return t;
    }
    function parsePrimary() {
      const t = peek();
      if (!t) throw new Error('Unexpected end of formula');
      if (t.type === 'num') {
        eat();
        return t.value;
      }
      if (t.type === 'id') {
        eat();
        return getField(ctx, t.value);
      }
      if (t.type === '(') {
        eat('(');
        const v = parseAdd();
        eat(')');
        return v;
      }
      if (t.type === '-') {
        eat('-');
        return -parsePrimary();
      }
      throw new Error('Unexpected formula token');
    }
    function parseMul() {
      let v = parsePrimary();
      while (peek() && (peek().type === '*' || peek().type === '/')) {
        const op = eat().type;
        const r = parsePrimary();
        v = op === '*' ? v * r : r === 0 ? 0 : v / r;
      }
      return v;
    }
    function parseAdd() {
      let v = parseMul();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = eat().type;
        const r = parseMul();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    const result = parseAdd();
    if (i !== tokens.length) throw new Error('Trailing formula tokens');
    return result;
  };
}

const formulaCache = new Map();

function evalFormula(expr, ctx) {
  const key = String(expr);
  let compiled = formulaCache.get(key);
  if (!compiled) {
    compiled = compileFormula(key);
    formulaCache.set(key, compiled);
  }
  return compiled(ctx);
}

const CMP = [
  { op: '>=', fn: (a, b) => a >= b },
  { op: '<=', fn: (a, b) => a <= b },
  { op: '==', fn: (a, b) => a === b },
  { op: '!=', fn: (a, b) => a !== b },
  { op: '>', fn: (a, b) => a > b },
  { op: '<', fn: (a, b) => a < b }
];

function evalCondition(expr, ctx) {
  const raw = String(expr).trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  for (const { op, fn } of CMP) {
    const idx = raw.indexOf(op);
    if (idx === -1) continue;
    const left = raw.slice(0, idx).trim();
    const right = raw.slice(idx + op.length).trim();
    const lv = IDENT.test(left) ? getField(ctx, left) : evalFormula(left, ctx);
    let rv;
    if (IDENT.test(right)) rv = getField(ctx, right);
    else if (/^-?\d+(\.\d+)?$/.test(right)) rv = Number(right);
    else rv = evalFormula(right, ctx);
    return fn(lv, rv);
  }
  return Boolean(evalFormula(raw, ctx));
}

function conditionFromModifier(modifier) {
  const cond = String(modifier.condition || '').trim();
  const source = modifier.source;
  if (!cond) return null;
  if (/^[<>!=]/.test(cond) && source) {
    return `${source}${cond}`;
  }
  return cond;
}

function evalModifier(modifier, ctx) {
  if (typeof modifier.value === 'number' && modifier.condition) {
    const expr = conditionFromModifier(modifier);
    return expr && evalCondition(expr, ctx) ? modifier.value : 0;
  }
  if (typeof modifier.value === 'number') return modifier.value;
  if (modifier.formula) return evalFormula(modifier.formula, ctx);
  return 0;
}

function evalSuccessProbability(baseProbability, modifiers, ctx, difficultyBonus = 0) {
  const sum = (modifiers || []).reduce((acc, m) => acc + evalModifier(m, ctx), 0);
  return clamp((Number(baseProbability) || 0) + sum + Number(difficultyBonus || 0), 0.05, 0.95);
}

function matchesEligibility(eligibility, ctx) {
  if (!eligibility || Object.keys(eligibility).length === 0) return true;
  for (const [field, rule] of Object.entries(eligibility)) {
    const value = getField(ctx, field);
    if (rule && typeof rule === 'object') {
      if (rule.gte != null && !(value >= rule.gte)) return false;
      if (rule.lte != null && !(value <= rule.lte)) return false;
      if (rule.gt != null && !(value > rule.gt)) return false;
      if (rule.lt != null && !(value < rule.lt)) return false;
      if (rule.eq != null && value !== rule.eq) return false;
    } else if (typeof rule === 'number' && value !== rule) {
      return false;
    }
  }
  return true;
}

module.exports = {
  evalFormula,
  evalCondition,
  evalModifier,
  evalSuccessProbability,
  getField,
  matchesEligibility
};
