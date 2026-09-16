const { clamp } = require('../utils/sanitize');
const { AppError } = require('../utils/http');
const { mintPerson, activePeople } = require('./workforceEngine');
const { applySetFlags, applySetProperty, studioRooms } = require('./flags');
const competitorEngine = require('./competitorEngine');

const HEAVY = new Set([
  'hire',
  'fire',
  'train',
  'rent-office',
  'buy-office',
  'renovate',
  'set-policy',
  'commission-intel',
  'pursue-suggestion'
]);

function findPerson(people, personId) {
  return activePeople(people).find((p) => p.personId === personId || String(p._id) === String(personId));
}

function applyAction(ctx) {
  const { type, payload = {}, state, flags, property, people, projects, market, roles, rng } = ctx;
  const lesson = [];
  const delayed = [];
  let nextFlags = { ...flags };
  let nextProperty = { ...property, rooms: (property?.rooms || []).map((r) => ({ ...r })) };
  const nextPeople = people.map((p) => ({
    ...p,
    taskBurndown: { assigned: 0, remaining: 0, ...(p.taskBurndown || {}) }
  }));
  let nextMarket = { ...market };
  let nextProjects = projects;

  if (type === 'hire') {
    const role = payload.role;
    const catalog = (roles || []).find((r) => r.id === role);
    if (!catalog) throw new AppError('VALIDATION_ERROR', 'Unknown role', 400);
    const cost = catalog.salary;
    if (state.cash < cost) throw new AppError('VALIDATION_ERROR', 'Not enough cash to hire', 400);
    state.cash -= cost;
    const person = mintPerson({
      role,
      roles,
      rng,
      usedNames: nextPeople.map((p) => p.name),
      skill: 48 + Math.floor(rng() * 25),
      morale: 62 + Math.floor(rng() * 16),
      salary: catalog.salary
    });
    const pHire = clamp(0.55 + ((state.founderProfessionalism || 50) - 50) * 0.006, 0.1, 0.9);
    if (rng() > pHire) {
      person.skill = Math.max(30, person.skill - 12);
      person.professionalism = 42;
      delayed.push({
        label: `${person.name} may not be the hire you hoped`,
        triggerLevel: '+3',
        probability: 0.45,
        effects: { quality: -5, employeeMorale: -4 }
      });
      lesson.push('A rushed hire is a delayed quality problem wearing a smile.');
    } else {
      lesson.push('Hiring is a cash decision and a culture decision. You just made both.');
    }
    nextPeople.push(person);
  } else if (type === 'fire') {
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    person.status = 'departed';
    state.cash -= Math.round(person.salary * 0.5);
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) - 6, 0, 100);
    for (const p of nextPeople) {
      if (p.status !== 'departed') p.morale = clamp(p.morale - 8, 0, 100);
    }
    const proj = nextProjects.find((pr) => String(pr._id) === String(person.assignedProjectId) || pr.projectName === person.assignedProjectId);
    if (proj && (proj.status === 'in-progress' || proj.status === 'delayed')) {
      proj.risk = clamp((proj.risk || 0.15) + 0.12, 0.05, 0.9);
    }
    lesson.push('Letting someone go saves payroll and spends trust. Remaining work does not vanish.');
  } else if (type === 'promote') {
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    person.salary = Math.round(person.salary * 1.18);
    person.skill = clamp(person.skill + 6, 0, 100);
    person.professionalism = clamp(person.professionalism + 6, 0, 100);
    person.morale = clamp(person.morale + 8, 0, 100);
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 2, 0, 100);
    lesson.push('Promotion is a public story about what you reward.');
  } else if (type === 'make-manager') {
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    const managers = activePeople(nextPeople).filter((p) => p.isManager).length;
    const n = activePeople(nextPeople).length;
    person.isManager = true;
    person.title = person.title?.includes('Lead') ? person.title : `Lead ${person.title}`;
    person.salary = Math.round(person.salary * 1.1);
    if (managers + 1 > Math.max(1, Math.ceil(n / 3))) {
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) - 4, 0, 100);
      lesson.push('Too many managers is politics with a payroll. Coordination is not the same as leadership.');
    } else {
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 3, 0, 100);
      lesson.push('A manager buys you leverage — and a new failure mode if they cannot coach.');
    }
  } else if (type === 'assign-project') {
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    const project = nextProjects.find(
      (pr) => String(pr._id) === String(payload.projectId) || pr.projectName === payload.projectId
    );
    if (!project) throw new AppError('NOT_FOUND', 'Project not found', 400);
    person.assignedProjectId = String(project._id || project.projectName);
    person.taskBurndown = { assigned: 10, remaining: 10 };
    lesson.push('Unassigned work is how “we’re busy” becomes a missed date.');
  } else if (type === 'assign-room') {
    if ((nextProperty.kind || 'none') === 'none') {
      throw new AppError('VALIDATION_ERROR', 'Rent or buy a workplace before assigning rooms', 400);
    }
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    const room = (nextProperty.rooms || []).find((r) => r.id === payload.roomId);
    if (!room) throw new AppError('NOT_FOUND', 'Room not found', 400);
    for (const r of nextProperty.rooms) {
      if (r.occupantId === person.personId) r.occupantId = null;
    }
    room.occupantId = person.personId;
    person.assignedRoomId = room.id;
    person.morale = clamp(person.morale + 2, 0, 100);
    lesson.push('Space is culture you can walk through.');
  } else if (type === 'train') {
    const person = findPerson(nextPeople, payload.personId);
    if (!person) throw new AppError('NOT_FOUND', 'Employee not found', 400);
    if (state.cash < 2500) throw new AppError('VALIDATION_ERROR', 'Training costs $2,500', 400);
    state.cash -= 2500;
    person.professionalism = clamp(person.professionalism + 8, 0, 100);
    person.skill = clamp(person.skill + 5, 0, 100);
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 1, 0, 100);
    lesson.push('Skill compounds slower than invoices, which is why weak companies skip it.');
  } else if (type === 'founder-focus') {
    const focus = payload.focus;
    if (!['sales', 'delivery', 'culture'].includes(focus)) {
      throw new AppError('VALIDATION_ERROR', 'Focus must be sales, delivery, or culture', 400);
    }
    nextFlags = applySetFlags(nextFlags, { founderFocus: focus });
    if (focus === 'sales') {
      state.revenue = (state.revenue || 0) + 1500;
      lesson.push('Founder-led sales fills the pipe and starves delivery if you live there.');
    } else if (focus === 'delivery') {
      state.quality = clamp((state.quality || 70) + 2, 0, 100);
      lesson.push('You cannot outsource the last 10% of quality. Someone has to sit in the work.');
    } else {
      for (const p of nextPeople) {
        if (p.status !== 'departed') p.morale = clamp(p.morale + 4, 0, 100);
      }
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 2, 0, 100);
      lesson.push('Culture is what people do when you are not in the standup.');
    }
  } else if (type === 'rent-office') {
    if (state.cash < 12000) throw new AppError('VALIDATION_ERROR', 'Need $12,000 deposit to rent', 400);
    state.cash -= 12000;
    const patched = applySetProperty(
      nextProperty,
      {
        kind: 'rented',
        monthlyCost: 3500,
        assetValue: 0,
        renovationLevel: 0,
        rooms: studioRooms(4)
      },
      nextFlags
    );
    nextProperty = patched.property;
    nextFlags = patched.flags;
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 2, 0, 100);
    lesson.push('Rent is flexibility. You buy an address, not an asset.');
  } else if (type === 'buy-office') {
    const down = 40000;
    if (state.cash < down) throw new AppError('VALIDATION_ERROR', 'Need $40,000 down payment', 400);
    state.cash -= down;
    state.debt = (state.debt || 0) + 80000;
    const patched = applySetProperty(
      nextProperty,
      {
        kind: 'owned',
        monthlyCost: 900,
        assetValue: 120000,
        renovationLevel: 0,
        rooms: studioRooms(6)
      },
      nextFlags
    );
    nextProperty = patched.property;
    nextFlags = patched.flags;
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 3, 0, 100);
    lesson.push('Ownership lowers rent and raises the cost of being wrong about location.');
  } else if (type === 'renovate') {
    const level = Number(nextProperty.renovationLevel) || 0;
    if ((nextProperty.kind || 'none') === 'none') {
      throw new AppError('VALIDATION_ERROR', 'You need a workplace to renovate', 400);
    }
    if (level >= 3) throw new AppError('VALIDATION_ERROR', 'Already fully renovated', 400);
    const cost = 12000 * (level + 1);
    if (state.cash < cost) throw new AppError('VALIDATION_ERROR', `Renovation costs $${cost.toLocaleString('en-US')}`, 400);
    state.cash -= cost;
    nextProperty.renovationLevel = level + 1;
    nextProperty.rooms = (nextProperty.rooms || []).map((r) => ({ ...r, quality: clamp(r.quality + 8, 0, 100) }));
    for (const p of nextPeople) {
      if (p.status !== 'departed') p.morale = clamp(p.morale + 5, 0, 100);
    }
    state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 3, 0, 100);
    lesson.push('The office is a signal to clients and a daily tax or gift to the team.');
  } else if (type === 'set-policy') {
    const { carPolicy, fuelPolicy } = payload;
    if (carPolicy && !['none', 'allowance', 'company-cars'].includes(carPolicy)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid car policy', 400);
    }
    if (fuelPolicy && !['none', 'capped', 'unlimited'].includes(fuelPolicy)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid fuel policy', 400);
    }
    nextFlags = applySetFlags(nextFlags, {
      ...(carPolicy ? { carPolicy } : {}),
      ...(fuelPolicy ? { fuelPolicy } : {})
    });
    if (carPolicy === 'none' || fuelPolicy === 'none') {
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) - 1, 0, 100);
    } else {
      state.founderProfessionalism = clamp((state.founderProfessionalism || 50) + 2, 0, 100);
    }
    lesson.push('Perks are recurring costs wearing a morale costume. Unlimited fuel invites unlimited stories.');
  } else if (type === 'commission-intel') {
    const result = competitorEngine.commissionAnalysis(state, nextMarket, rng);
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.message, 400);
    nextMarket = result.market;
    lesson.push(result.lesson);
    return {
      flags: nextFlags,
      property: nextProperty,
      people: nextPeople.filter((p) => p.status !== 'departed'),
      projects: nextProjects,
      market: nextMarket,
      heavy: true,
      delayed,
      outcomeExtra: result,
      lesson: result.lesson,
      message: result.message
    };
  } else if (type === 'pursue-suggestion') {
    const result = competitorEngine.pursueSuggestion(state, nextMarket, payload.suggestionId, rng);
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.message, 400);
    nextMarket = result.market;
    lesson.push(result.lesson);
    return {
      flags: nextFlags,
      property: nextProperty,
      people: nextPeople.filter((p) => p.status !== 'departed'),
      projects: nextProjects,
      market: nextMarket,
      heavy: true,
      delayed,
      outcomeExtra: result,
      lesson: result.lesson,
      message: result.message
    };
  } else {
    throw new AppError('VALIDATION_ERROR', `Unknown action type: ${type}`, 400);
  }

  return {
    flags: nextFlags,
    property: nextProperty,
    people: nextPeople.filter((p) => p.status !== 'departed'),
    projects: nextProjects,
    market: nextMarket,
    heavy: HEAVY.has(type),
    delayed,
    lesson: lesson[0] || null,
    message: lesson[0] || 'Done.'
  };
}

module.exports = { applyAction, HEAVY };
