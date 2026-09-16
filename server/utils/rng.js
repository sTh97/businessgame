const crypto = require('crypto');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  if (seed == null) {
    return () => crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
  }
  if (typeof seed === 'function') return seed;
  if (typeof seed === 'number') return mulberry32(seed);
  const n = Number.parseInt(String(seed).replace(/-/g, '').slice(0, 8), 16);
  return mulberry32(Number.isFinite(n) ? n : 1);
}

module.exports = { createRng, mulberry32 };
