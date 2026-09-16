const { clamp } = require('../utils/sanitize');
const { pickName, newPersonId } = require('../utils/names');
const { policyMonthlyCost } = require('./flags');

function managementOverheadFactor(employees) {
  return Math.min(1.6, 1 + Math.max(0, employees - 20) * 0.004);
}

function effectiveOutputPerEmployee(baseOutput, employees) {
  return baseOutput / managementOverheadFactor(employees);
}

function activePeople(people) {
  return (people || []).filter((p) => p && p.status !== 'departed');
}

function recomputeFromPeople(state, people, roles, property, flags) {
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));
  const list = activePeople(people);
  let salary = 0;
  let moraleSum = 0;
  let output = 0;
  let managers = 0;
  const n = list.length;

  for (const p of list) {
    const role = roleMap.get(p.role);
    p.salary = Number(p.salary) || role?.salary || 6000;
    p.morale = clamp(Number(p.morale) || 60, 0, 100);
    p.skill = clamp(Number(p.skill) || 55, 0, 100);
    p.professionalism = clamp(Number(p.professionalism) || 55, 0, 100);
    p.productivity = clamp(Number(p.productivity) || 65, 0, 100);
    salary += p.salary;
    moraleSum += p.morale;
    if (p.isManager) managers += 1;
    const base = role ? role.output : 8;
    const mgrBoost = p.isManager ? 0.85 : 1;
    output += mgrBoost * effectiveOutputPerEmployee(base, Math.max(n, 1)) * (p.productivity / 70) * (0.7 + p.skill / 200);
  }

  const overhead = 4000;
  const managerRelief = 1 - Math.min(0.2, managers * 0.04);
  const other = Number(state.otherExpenses) || 0;
  const propCost = Number(property?.monthlyCost) || 0;
  const policyCost = policyMonthlyCost(flags, n);
  state.employees = n;
  state.monthlyExpenses = Math.round(salary + overhead * managerRelief + other + propCost + policyCost);
  state.policyCost = policyCost;
  state.propertyCost = propCost;

  if (n > 0) {
    state.employeeMorale = moraleSum / n;
    const capacity = Math.round((output / Math.max(8, n * 0.6)) * 12);
    state.operationalCapacity = clamp(capacity, 20, 160);
    if (managers > Math.max(1, Math.ceil(n / 3))) {
      state.employeeMorale = clamp(state.employeeMorale - 6, 0, 100);
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) - 2, 0, 100);
    }
  } else {
    state.employeeMorale = 40;
    state.operationalCapacity = 20;
  }
  return { employees: n, salary, managers };
}

function recomputeWorkforce(state, workforce, roles, property, flags, people) {
  if (people && people.length) {
    return recomputeFromPeople(state, people, roles, property, flags);
  }
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));
  let employees = 0;
  let salary = 0;
  let moraleSum = 0;
  let output = 0;

  for (const row of workforce || []) {
    const role = roleMap.get(row.role);
    const count = Math.max(0, Number(row.count) || 0);
    row.unitSalary = Number(row.unitSalary) || role?.salary || 6000;
    row.count = count;
    row.totalSalary = count * row.unitSalary;
    row.avgMorale = clamp(Number(row.avgMorale) || 60, 0, 100);
    row.avgSkill = clamp(Number(row.avgSkill) || 55, 0, 100);
    row.avgProductivity = clamp(Number(row.avgProductivity) || 65, 0, 100);
    employees += count;
    salary += row.totalSalary;
    moraleSum += row.avgMorale * count;
    const base = role ? role.output : 8;
    output += count * effectiveOutputPerEmployee(base, Math.max(employees, 1)) * (row.avgProductivity / 70);
  }

  state.employees = employees;
  const overhead = 4000;
  const other = Number(state.otherExpenses) || 0;
  const propCost = Number(property?.monthlyCost) || 0;
  const policyCost = policyMonthlyCost(flags, employees);
  state.monthlyExpenses = salary + overhead + other + propCost + policyCost;

  if (employees > 0) {
    state.employeeMorale = moraleSum / employees;
    const capacity = Math.round((output / Math.max(8, employees * 0.6)) * 10);
    state.operationalCapacity = clamp(capacity, 20, 160);
  } else {
    state.employeeMorale = 40;
    state.operationalCapacity = 20;
  }
  return { employees, salary };
}

function mintPerson({ role, roles, rng, usedNames, skill, morale, productivity, salary, professionalism, isManager }) {
  const catalog = (roles || []).find((r) => r.id === role) || { id: role, title: role, salary: 6000 };
  return {
    personId: newPersonId(rng || Math.random),
    name: pickName(rng || Math.random, usedNames),
    role: catalog.id,
    title: catalog.title || role,
    professionalism: clamp(professionalism ?? 58, 0, 100),
    salary: salary ?? catalog.salary ?? 6000,
    morale: clamp(morale ?? 68, 0, 100),
    skill: clamp(skill ?? 55, 0, 100),
    productivity: clamp(productivity ?? 65, 0, 100),
    isManager: Boolean(isManager),
    assignedProjectId: null,
    assignedRoomId: null,
    taskBurndown: { assigned: 0, remaining: 0 },
    status: 'active'
  };
}

function applyWorkforceEffects(workforce, effects, roles, people, rng) {
  const nextPeople = Array.isArray(people) ? people.map((p) => ({ ...p, taskBurndown: { ...(p.taskBurndown || {}) } })) : [];
  const list = Array.isArray(workforce) ? workforce.map((w) => ({ ...w })) : [];
  if (!effects) return { workforce: list, people: nextPeople };
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));
  const roll = rng || Math.random;

  if (effects.hire) {
    for (const hire of [].concat(effects.hire)) {
      const count = hire.count ?? 1;
      const used = nextPeople.map((p) => p.name);
      for (let i = 0; i < count; i += 1) {
        nextPeople.push(
          mintPerson({
            role: hire.role,
            roles,
            rng: roll,
            usedNames: used,
            skill: hire.skill,
            morale: hire.morale,
            productivity: hire.productivity,
            salary: hire.unitSalary,
            professionalism: hire.professionalism
          })
        );
        used.push(nextPeople[nextPeople.length - 1].name);
      }
      let row = list.find((w) => w.role === hire.role);
      const role = roleMap.get(hire.role) || { title: hire.role, salary: 6000 };
      if (!row) {
        row = {
          role: hire.role,
          title: role.title || hire.role,
          count: 0,
          avgSkill: hire.skill ?? 55,
          avgMorale: hire.morale ?? 65,
          avgProductivity: hire.productivity ?? 65,
          unitSalary: role.salary || 6000,
          totalSalary: 0
        };
        list.push(row);
      }
      const add = count;
      const addSalary = hire.unitSalary ?? role.salary ?? 6000;
      const total = row.count + add;
      row.unitSalary = ((row.unitSalary || addSalary) * row.count + addSalary * add) / Math.max(1, total);
      row.avgSkill = (row.avgSkill * row.count + (hire.skill ?? row.avgSkill) * add) / Math.max(1, total);
      row.avgMorale = (row.avgMorale * row.count + (hire.morale ?? row.avgMorale) * add) / Math.max(1, total);
      row.avgProductivity =
        (row.avgProductivity * row.count + (hire.productivity ?? row.avgProductivity) * add) / Math.max(1, total);
      row.count = total;
    }
  }

  if (effects.fire) {
    for (const fire of [].concat(effects.fire)) {
      const row = list.find((w) => w.role === fire.role);
      if (row) row.count = Math.max(0, row.count - (fire.count ?? 1));
      let left = fire.count ?? 1;
      for (const p of nextPeople) {
        if (left <= 0) break;
        if (p.role === fire.role && p.status !== 'departed') {
          p.status = 'departed';
          left -= 1;
        }
      }
    }
  }

  if (effects.moraleDelta) {
    for (const row of list) row.avgMorale = clamp(row.avgMorale + effects.moraleDelta, 0, 100);
    for (const p of nextPeople) {
      if (p.status !== 'departed') p.morale = clamp(p.morale + effects.moraleDelta, 0, 100);
    }
  }

  return { workforce: list.filter((w) => w.count > 0), people: nextPeople.filter((p) => p.status !== 'departed') };
}

function syncAggregatesFromPeople(people, roles) {
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));
  const byRole = new Map();
  for (const p of activePeople(people)) {
    let row = byRole.get(p.role);
    if (!row) {
      const role = roleMap.get(p.role) || { title: p.role, salary: p.salary };
      row = {
        role: p.role,
        title: p.title || role.title,
        count: 0,
        avgSkill: 0,
        avgMorale: 0,
        avgProductivity: 0,
        unitSalary: 0,
        totalSalary: 0
      };
      byRole.set(p.role, row);
    }
    row.count += 1;
    row.avgSkill += p.skill;
    row.avgMorale += p.morale;
    row.avgProductivity += p.productivity;
    row.unitSalary += p.salary;
    row.totalSalary += p.salary;
  }
  return [...byRole.values()].map((row) => ({
    ...row,
    avgSkill: row.avgSkill / row.count,
    avgMorale: row.avgMorale / row.count,
    avgProductivity: row.avgProductivity / row.count,
    unitSalary: row.unitSalary / row.count
  }));
}

module.exports = {
  managementOverheadFactor,
  effectiveOutputPerEmployee,
  recomputeWorkforce,
  recomputeFromPeople,
  applyWorkforceEffects,
  mintPerson,
  activePeople,
  syncAggregatesFromPeople
};
