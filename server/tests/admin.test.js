const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { applyHeartbeat, formatDuration, MAX_GAP_MS, secretsEqual } = require('../utils/presence');

describe('presence time tracking', () => {
  test('adds elapsed time when last seen is recent', () => {
    const now = 1_700_000_000_000;
    const result = applyHeartbeat({ timeSpentMs: 1000, lastSeenAt: new Date(now - 40000) }, now);
    assert.equal(result.addedMs, 40000);
    assert.equal(result.timeSpentMs, 41000);
  });

  test('does not add a large gap as a new session', () => {
    const now = 1_700_000_000_000;
    const result = applyHeartbeat({ timeSpentMs: 5000, lastSeenAt: new Date(now - MAX_GAP_MS - 1) }, now);
    assert.equal(result.addedMs, 0);
    assert.equal(result.timeSpentMs, 5000);
  });

  test('formats durations', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(45000), '45s');
    assert.equal(formatDuration(125000), '2m 5s');
    assert.equal(formatDuration(3723000), '1h 2m');
  });
});

describe('admin credentials compare', () => {
  test('matches exact strings', () => {
    assert.equal(secretsEqual('admin', 'admin'), true);
    assert.equal(secretsEqual('12345678', '12345678'), true);
    assert.equal(secretsEqual('admin', 'Admin'), false);
    assert.equal(secretsEqual('12345678', '12345679'), false);
  });
});
