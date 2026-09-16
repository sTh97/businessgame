const { clamp } = require('../utils/sanitize');

function applyProjectEffects(projects, effects, ctx) {
  const list = Array.isArray(projects) ? projects.slice() : [];
  if (!effects) return { projects: list, stateDeltas: {} };
  const stateDeltas = {};

  if (effects.create) {
    for (const spec of [].concat(effects.create)) {
      list.push({
        projectName: spec.projectName,
        client: spec.client || 'Client',
        contractValue: spec.contractValue || 0,
        cost: spec.cost || 0,
        duration: spec.duration || 3,
        remaining: spec.duration || 3,
        requiredCapacity: spec.requiredCapacity || 20,
        risk: spec.risk || 0.15,
        qualityRequirement: spec.qualityRequirement || 60,
        deadlineMonth: (ctx.gameMonth || 1) + (spec.duration || 3),
        paymentTerms: spec.paymentTerms || 'milestone',
        status: spec.status || 'in-progress',
        createdLevel: ctx.level,
        _new: true
      });
      if (spec.upfront) {
        stateDeltas.cash = (stateDeltas.cash || 0) + spec.upfront;
      }
    }
  }

  if (effects.completeOldest) {
    const open = list.find((p) => p.status === 'in-progress' || p.status === 'delayed');
    if (open) {
      open.status = 'completed';
      open.remaining = 0;
      stateDeltas.cash = (stateDeltas.cash || 0) + (open.contractValue || 0) * 0.5;
      stateDeltas.reputation = (stateDeltas.reputation || 0) + 3;
    }
  }

  if (effects.failOldest) {
    const open = list.find((p) => p.status === 'in-progress' || p.status === 'delayed');
    if (open) {
      open.status = 'failed';
      stateDeltas.reputation = (stateDeltas.reputation || 0) - 8;
      stateDeltas.cash = (stateDeltas.cash || 0) - Math.round((open.cost || 0) * 0.2);
    }
  }

  if (effects.cancelOldest) {
    const open = list.find((p) => p.status === 'in-progress' || p.status === 'delayed');
    if (open) {
      open.status = 'cancelled';
    }
  }

  return { projects: list, stateDeltas };
}

function tickProjects(projects, state, rng) {
  const events = [];
  let activeLoad = 0;
  for (const project of projects) {
    if (project.status !== 'in-progress' && project.status !== 'delayed') continue;
    activeLoad += project.requiredCapacity || 0;
    project.remaining = Math.max(0, (project.remaining ?? project.duration) - 1);

    const overloaded = (state.operationalCapacity || 0) < (project.requiredCapacity || 0);
    const qualityGap = (project.qualityRequirement || 0) > (state.quality || 0);
    if (overloaded || qualityGap) {
      if (rng() < (project.risk || 0.2) + (overloaded ? 0.15 : 0) + (qualityGap ? 0.1 : 0)) {
        project.status = 'delayed';
        events.push({ type: 'project-delayed', projectName: project.projectName });
      }
    }

    if (project.remaining <= 0) {
      const failChance = clamp(
        (project.risk || 0.1) + (state.quality < project.qualityRequirement ? 0.25 : 0) +
          ((state.operationalCapacity || 0) < project.requiredCapacity ? 0.2 : 0),
        0.05,
        0.9
      );
      if (rng() < failChance && project.status === 'delayed') {
        project.status = 'failed';
        state.reputation = (state.reputation || 0) - 10;
        state.cash -= Math.round((project.cost || 0) * 0.15);
        events.push({ type: 'project-failed', projectName: project.projectName });
      } else {
        project.status = 'completed';
        state.cash += project.contractValue || 0;
        state.revenue += Math.round((project.contractValue || 0) * 0.15);
        state.reputation = (state.reputation || 0) + 4;
        state.customers = (state.customers || 0) + 1;
        events.push({ type: 'project-completed', projectName: project.projectName, value: project.contractValue });
      }
    }
  }
  if (activeLoad > 80) {
    state.employeeMorale = (state.employeeMorale || 50) - 2;
  }
  return events;
}

module.exports = { applyProjectEffects, tickProjects };
