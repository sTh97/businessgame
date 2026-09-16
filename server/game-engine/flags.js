function defaultFlags() {
  return {
    workMode: 'undecided',
    housing: 'none',
    carPolicy: 'none',
    fuelPolicy: 'none',
    founderFocus: null
  };
}

function defaultProperty() {
  return {
    kind: 'none',
    monthlyCost: 0,
    assetValue: 0,
    renovationLevel: 0,
    rooms: []
  };
}

function defaultIntel() {
  return {
    analyzedAt: null,
    suggestions: [],
    lastResult: null
  };
}

function applySetFlags(flags, patch) {
  const next = { ...defaultFlags(), ...(flags || {}) };
  if (!patch) return next;
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) next[k] = v;
  }
  return next;
}

function applySetProperty(property, patch, flags) {
  const next = { ...defaultProperty(), ...(property || {}) };
  if (!patch) return { property: next, flags };
  Object.assign(next, patch);
  if (Array.isArray(patch.rooms)) next.rooms = patch.rooms.map((r) => ({ ...r }));
  let nextFlags = flags;
  if (patch.kind === 'rented') nextFlags = applySetFlags(flags, { housing: 'rent', workMode: 'office' });
  if (patch.kind === 'owned') nextFlags = applySetFlags(flags, { housing: 'own', workMode: 'office' });
  if (patch.kind === 'coworking') nextFlags = applySetFlags(flags, { housing: 'coworking', workMode: 'hybrid' });
  if (patch.kind === 'none') nextFlags = applySetFlags(flags, { housing: 'none', workMode: 'remote' });
  return { property: next, flags: nextFlags };
}

function flagsMatch(required, flags) {
  if (!required || !Object.keys(required).length) return true;
  const f = flags || {};
  for (const [k, v] of Object.entries(required)) {
    if (Array.isArray(v)) {
      if (!v.includes(f[k])) return false;
    } else if (f[k] !== v) return false;
  }
  return true;
}

function flagsForbidden(forbids, flags) {
  if (!forbids || !Object.keys(forbids).length) return false;
  const f = flags || {};
  for (const [k, v] of Object.entries(forbids)) {
    if (Array.isArray(v)) {
      if (v.includes(f[k])) return true;
    } else if (f[k] === v) return true;
  }
  return false;
}

function policyMonthlyCost(flags, headcount) {
  const n = Math.max(0, headcount || 0);
  let c = 0;
  const car = flags?.carPolicy || 'none';
  const fuel = flags?.fuelPolicy || 'none';
  if (car === 'allowance') c += n * 200;
  if (car === 'company-cars') c += n * 800;
  if (fuel === 'capped') c += n * 80;
  if (fuel === 'unlimited') c += n * 220;
  return c;
}

function studioRooms(count = 4) {
  const labels = ['Founder den', 'Build bay', 'Quiet room', 'Client parlor', 'War room', 'Library'];
  return Array.from({ length: count }, (_, i) => ({
    id: `room-${i + 1}`,
    label: labels[i] || `Room ${i + 1}`,
    quality: 50 + i * 5,
    occupantId: null
  }));
}

module.exports = {
  defaultFlags,
  defaultProperty,
  defaultIntel,
  applySetFlags,
  applySetProperty,
  flagsMatch,
  flagsForbidden,
  policyMonthlyCost,
  studioRooms
};
