function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeName(value, { min = 2, max = 60 } = {}) {
  const cleaned = stripHtml(value);
  if (cleaned.length < min || cleaned.length > max) {
    const err = new Error(`Must be between ${min} and ${max} characters`);
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }
  return cleaned;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

module.exports = { stripHtml, sanitizeName, clamp, roundMoney, round1 };
