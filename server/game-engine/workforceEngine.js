const { clamp } = require('../utils/sanitize');

function managementOverheadFactor(employees) {
  return Math.min(1.6, 1 + Math.max(0, employees - 20) * 0.004);
}

function effectiveOutputPerEmployee(baseOutput, employees) {
  return baseOutput / managementOverheadFactor(employees);
}

function recomputeWorkforce(state, workforce, roles) {
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));
  let employees = 0;
  let salary = 0;
  let moraleSum = 0;
  let skillSum = 0;
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
    skillSum += row.avgSkill * count;
    const base = role ? role.output : 8;
    output += count * effectiveOutputPerEmployee(base, Math.max(employees, 1)) * (row.avgProductivity / 70);
  }

  state.employees = employees;
  const overhead = 4000;
  const other = Number(state.otherExpenses) || 0;
  state.monthlyExpenses = salary + overhead + other;

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

function applyWorkforceEffects(workforce, effects, roles) {
  if (!effects) return workforce;
  const list = Array.isArray(workforce) ? workforce : [];
  const roleMap = new Map((roles || []).map((r) => [r.id, r]));

  if (effects.hire) {
    for (const hire of [].concat(effects.hire)) {
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
      const add = hire.count ?? 1;
      const addSalary = hire.unitSalary ?? role.salary ?? 6000;
      const total = row.count + add;
      row.unitSalary = ((row.unitSalary || addSalary) * row.count + addSalary * add) / total;
      row.avgSkill = (row.avgSkill * row.count + (hire.skill ?? row.avgSkill) * add) / total;
      row.avgMorale = (row.avgMorale * row.count + (hire.morale ?? row.avgMorale) * add) / total;
      row.avgProductivity =
        (row.avgProductivity * row.count + (hire.productivity ?? row.avgProductivity) * add) / total;
      row.count = total;
    }
  }

  if (effects.fire) {
    for (const fire of [].concat(effects.fire)) {
      const row = list.find((w) => w.role === fire.role);
      if (!row) continue;
      row.count = Math.max(0, row.count - (fire.count ?? 1));
    }
  }

  if (effects.moraleDelta) {
    for (const row of list) {
      row.avgMorale = clamp(row.avgMorale + effects.moraleDelta, 0, 100);
    }
  }

  return list.filter((w) => w.count > 0);
}

module.exports = {
  managementOverheadFactor,
  effectiveOutputPerEmployee,
  recomputeWorkforce,
  applyWorkforceEffects
};
