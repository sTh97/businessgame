const FIRST = [
  'Amina', 'Omar', 'Lea', 'Hassan', 'Noor', 'Sam', 'Rina', 'Viktor', 'Maya', 'Idris',
  'Sofia', 'Kenji', 'Priya', 'Jonas', 'Hana', 'Mateo', 'Zara', 'Nico', 'Lila', 'Farid'
];
const LAST = [
  'Shah', 'Rizvi', 'Chen', 'Khan', 'Okoye', 'Berg', 'Nakamura', 'Costa', 'Ilić', 'Rahman',
  'Duarte', 'Novak', 'Patel', 'Vogel', 'Abebe', 'Sørensen', 'Tanaka', 'Moreau', 'Silva', 'Yilmaz'
];

function pickName(rng, used = []) {
  const usedSet = new Set(used);
  for (let i = 0; i < 40; i += 1) {
    const first = FIRST[Math.floor(rng() * FIRST.length)];
    const last = LAST[Math.floor(rng() * LAST.length)];
    const name = `${first} ${last}`;
    if (!usedSet.has(name)) return name;
  }
  return `${FIRST[0]} ${LAST[Math.floor(rng() * LAST.length)]} ${Math.floor(rng() * 90)}`;
}

function newPersonId(rng) {
  return `p-${Math.floor(rng() * 1e9).toString(16)}-${Date.now().toString(16).slice(-6)}`;
}

module.exports = { pickName, newPersonId, FIRST, LAST };
