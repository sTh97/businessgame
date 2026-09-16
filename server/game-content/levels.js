const { phaseForLevel } = require('../utils/state');

function unlockedMechanics(level) {
  const list = ['founding'];
  if (level >= 3) list.push('hiring');
  if (level >= 6) list.push('project-delivery');
  if (level >= 8) list.push('outsourcing');
  if (level >= 11) list.push('debt-investors');
  if (level >= 16) list.push('process');
  if (level >= 20) list.push('ma-offers');
  if (level >= 26) list.push('departments');
  return list;
}

function eventPoolIds(level) {
  const phase = phaseForLevel(level);
  if (phase === 'survival') return ['swh-lvl-1to10-crisis', 'swh-lvl-1to10-opportunity'];
  if (phase === 'early-growth') return ['swh-lvl-11to25-growth', 'swh-lvl-11to25-crisis'];
  return ['swh-lvl-26plus'];
}

function buildLevels(industry = 'software-house', max = 100) {
  const rows = [];
  for (let level = 1; level <= max; level += 1) {
    rows.push({
      _id: `${industry}#${level}`,
      industry,
      level,
      phase: phaseForLevel(level),
      unlockedMechanics: unlockedMechanics(level),
      eventPoolIds: eventPoolIds(level)
    });
  }
  return rows;
}

module.exports = { buildLevels, unlockedMechanics };
