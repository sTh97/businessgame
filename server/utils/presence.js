const crypto = require('crypto');

const MAX_GAP_MS = 2 * 60 * 1000;

function secretsEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  const len = Math.max(left.length, right.length, 1);
  const x = Buffer.alloc(len);
  const y = Buffer.alloc(len);
  left.copy(x);
  right.copy(y);
  return crypto.timingSafeEqual(x, y) && left.length === right.length;
}

function applyHeartbeat(user, now = Date.now()) {
  const last = user?.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
  const elapsed = last ? now - last : 0;
  const added = elapsed > 0 && elapsed <= MAX_GAP_MS ? elapsed : 0;
  return {
    timeSpentMs: (Number(user?.timeSpentMs) || 0) + added,
    lastSeenAt: new Date(now),
    addedMs: added
  };
}

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function clientIp(req) {
  const forwarded = req?.get?.('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 80);
  return String(req?.ip || '').slice(0, 80);
}

function clientAgent(req) {
  return String(req?.get?.('user-agent') || '').slice(0, 300);
}

module.exports = { applyHeartbeat, formatDuration, clientIp, clientAgent, secretsEqual, MAX_GAP_MS };
