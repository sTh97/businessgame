window.BES = window.BES || {};

const appEl = document.getElementById('app');
const toastEl = document.getElementById('toast');
const state = {
  user: null,
  gameId: null
};

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const parts = path.split('/').filter(Boolean);
  return { path: '/' + parts.join('/'), parts, params };
}

function layout(content, { user, nav } = {}) {
  return `
    <div class="wrap">
      <header class="topbar">
        <a class="brand" href="#/businesses">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-name">Business Empire</span>
        </a>
        <div class="row">
          ${user ? `<span class="muted">${BES.escape(user.email)}</span><button class="btn btn-ghost" id="logout">Log out</button>` : ''}
        </div>
      </header>
      ${nav || ''}
      ${content}
    </div>
  `;
}

function bindLogout() {
  document.getElementById('logout')?.addEventListener('click', async () => {
    await BES.api.logout();
    state.user = null;
    location.hash = '#/login';
  });
}

async function requireUser() {
  if (state.user) return state.user;
  if (!BES.http.accessToken) {
    const ok = await BES.http.refresh();
    if (!ok) {
      location.hash = '#/login';
      return null;
    }
  }
  try {
    state.user = await BES.api.me();
    return state.user;
  } catch {
    location.hash = '#/login';
    return null;
  }
}

function renderLanding() {
  appEl.innerHTML = layout(`
    <section class="hero">
      <h1>Build a company. Live with the consequences.</h1>
      <p>A server-authoritative flight simulator for entrepreneurship. Cash, reputation, debt, and delayed fallout — none of it is computed in the browser.</p>
      <div class="row" style="margin-top:20px">
        <a class="btn btn-primary" href="#/register">Create account</a>
        <a class="btn" href="#/login">Log in</a>
      </div>
    </section>
  `);
}

function renderAuth(mode) {
  const title = mode === 'register' ? 'Found your account' : mode === 'forgot' ? 'Reset access' : 'Welcome back';
  appEl.innerHTML = layout(`
    <div class="auth-grid">
      <section class="hero">
        <h1>${title}</h1>
        <p>Single-player. Persistent. Honest economics. Software House is playable now; five more industries follow as content packs.</p>
      </section>
      <form class="card" id="auth-form">
        ${mode === 'reset' ? '' : `<div class="field"><label for="email">Email</label><input id="email" type="email" required autocomplete="email" /></div>`}
        ${mode === 'forgot' ? '' : `<div class="field"><label for="password">${mode === 'reset' ? 'New password' : 'Password'}</label><input id="password" type="password" required minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" /></div>`}
        <button class="btn btn-primary btn-block" type="submit">${mode === 'register' ? 'Sign up' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Log in'}</button>
        <p class="hint" style="margin-top:12px">
          ${mode === 'login' ? `<a href="#/register">Need an account?</a> · <a href="#/forgot">Forgot password</a>` : `<a href="#/login">Back to login</a>`}
        </p>
        <p class="hint" id="auth-msg"></p>
      </form>
    </div>
  `);
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('auth-msg');
    try {
      if (mode === 'register') {
        await BES.api.register(email.value, password.value);
        await BES.api.login(email.value, password.value);
        location.hash = '#/businesses';
      } else if (mode === 'login') {
        await BES.api.login(email.value, password.value);
        location.hash = '#/businesses';
      } else if (mode === 'forgot') {
        await BES.api.forgot(email.value);
        msg.textContent = 'If that email exists, a reset link was issued.';
      } else if (mode === 'reset') {
        const token = route().params.get('token');
        await BES.api.reset(token, password.value);
        msg.textContent = 'Password updated. You can log in.';
      }
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

async function renderBusinesses() {
  const user = await requireUser();
  if (!user) return;
  const data = await BES.api.games();
  const games = data.games || [];
  appEl.innerHTML = layout(`
    <section class="hero">
      <h1>My Businesses</h1>
      <p>Continue an empire, start a new one, or review what failed.</p>
      <a class="btn btn-primary" href="#/new">Start new business</a>
    </section>
    <div class="list" style="padding-bottom:40px">
      ${
        games.length
          ? games
              .map(
                (g) => `
          <a class="list-item" href="#/game/${g.gameId}">
            <div>
              <strong>${BES.escape(g.companyName)}</strong>
              <div class="muted">${BES.escape(g.industry)} · ${BES.escape(g.difficulty)} · Level ${g.currentLevel}</div>
            </div>
            <span class="badge ${g.status}">${g.status}</span>
          </a>`
              )
              .join('')
          : `<div class="card muted">No companies yet. Found one.</div>`
      }
    </div>
  `, { user });
  bindLogout();
}

async function renderCreate() {
  const user = await requireUser();
  if (!user) return;
  const { industries } = await BES.api.industries();
  let selected = industries.find((i) => !i.locked)?.id || 'software-house';
  let difficulty = 'normal';

  const paint = async () => {
    const preview = await BES.api.preview(selected, difficulty).catch(() => null);
    const ind = industries.find((i) => i.id === selected);
    appEl.innerHTML = layout(`
      <section class="hero"><h1>New business</h1><p>Industry and difficulty lock in at founding.</p></section>
      <form class="card" id="create-form" style="margin-bottom:48px">
        <div class="industry-grid">
          ${industries
            .map(
              (i) => `
            <button type="button" class="industry ${i.id === selected ? 'selected' : ''} ${i.locked ? 'locked' : ''}" data-id="${i.id}" ${i.locked ? 'disabled' : ''}>
              <h3>${BES.escape(i.name)}</h3>
              <div class="muted">${BES.escape(i.tagline || '')}</div>
              ${i.locked ? `<div class="badge" style="margin-top:8px">Release ${i.release}</div>` : ''}
            </button>`
            )
            .join('')}
        </div>
        <p class="hint" style="margin:14px 0">${BES.escape(ind?.description || '')}</p>
        <div class="diff-row">
          ${['easy', 'normal', 'hard', 'expert']
            .map(
              (d) =>
                `<button type="button" class="diff ${d === difficulty ? 'selected' : ''}" data-d="${d}">${d}</button>`
            )
            .join('')}
        </div>
        <div class="field" style="margin-top:16px"><label>Company name</label><input name="companyName" minlength="2" maxlength="60" required /></div>
        <div class="field"><label>Founder name</label><input name="founderName" minlength="2" maxlength="60" required /></div>
        ${
          preview
            ? `<div class="kpi-grid" style="margin:12px 0 18px">
                <div class="kpi"><div class="label">Starting cash</div><div class="value">${BES.money(preview.startingState.cash)}</div></div>
                <div class="kpi"><div class="label">Burn / month</div><div class="value">${BES.money(preview.startingState.monthlyExpenses)}</div></div>
                <div class="kpi"><div class="label">Reputation</div><div class="value">${preview.startingState.reputation}</div></div>
                <div class="kpi"><div class="label">Team</div><div class="value">${preview.startingState.employees}</div></div>
              </div>`
            : ''
        }
        <button class="btn btn-primary" type="submit">Start business</button>
        <p class="hint" id="create-msg"></p>
      </form>
    `, { user });
    bindLogout();
    appEl.querySelectorAll('.industry').forEach((btn) =>
      btn.addEventListener('click', () => {
        selected = btn.dataset.id;
        paint();
      })
    );
    appEl.querySelectorAll('.diff').forEach((btn) =>
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.d;
        paint();
      })
    );
    document.getElementById('create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const created = await BES.api.createGame({
          industry: selected,
          difficulty,
          companyName: fd.get('companyName'),
          founderName: fd.get('founderName')
        });
        location.hash = `#/game/${created.game.gameId}`;
      } catch (err) {
        document.getElementById('create-msg').textContent = err.message;
      }
    });
  };
  await paint();
}

function profBar(value, label = 'Founder professionalism') {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return `<div class="prof"><div class="prof-label">${BES.escape(label)} · ${v}</div><div class="prof-track" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${BES.escape(label)}"><span style="width:${v}%"></span></div></div>`;
}

function metricCards(s) {
  const items = [
    ['Cash', BES.money(s.cash)],
    ['Revenue', BES.money(s.revenue)],
    ['Profit/Loss', BES.money(s.netProfit)],
    ['Company value', BES.money(s.companyValue)],
    ['Professionalism', Math.round(s.founderProfessionalism || 0)],
    ['Customers', s.customers],
    ['Reputation', Math.round(s.reputation)],
    ['Capacity', Math.round(s.operationalCapacity)]
  ];
  return `<div class="kpi-grid">${items
    .map(([label, value]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join('')}</div>`;
}

function showOutcome(outcome, onDone, afterProf) {
  const immediate = outcome.immediate || {};
  const lines = Object.entries(immediate)
    .filter(([, v]) => Math.abs(Number(v)) >= 0.05)
    .map(([k, v]) => {
      const n = Number(v);
      const moneyish =
        k.toLowerCase().includes('cash') ||
        k.toLowerCase().includes('revenue') ||
        k.toLowerCase().includes('value') ||
        k.toLowerCase().includes('debt') ||
        k.toLowerCase().includes('salary');
      return `<div class="delta-line"><span>${BES.prettyKey(k)}</span><span class="${BES.clsDelta(n)}">${n > 0 ? '+' : ''}${moneyish ? BES.money(n) : n}</span></div>`;
    })
    .join('');
  const delayed = (outcome.delayed || [])
    .map((d) => `<div class="banner">${d.matured ? 'RESOLVED: ' : 'MONTHS LATER… '} ${BES.escape(d.label)}</div>`)
    .join('');
  const rolls = (outcome.randomResolutions || [])
    .map(
      (r) =>
        `<p class="hint">${BES.escape(r.key)}: ${(r.finalProbability * 100).toFixed(0)}% chance · roll ${(r.roll * 100).toFixed(0)}% · ${r.result ? 'success' : 'failure'}</p>`
    )
    .join('');
  const lesson = outcome.lesson || outcome.message
    ? `<div class="lesson">${BES.escape(outcome.lesson || outcome.message)}</div>`
    : '';
  const prof = afterProf != null ? afterProf : outcome.founderProfessionalism;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="card overlay-card" role="dialog" aria-live="assertive"><h2 class="brand-name">Consequences</h2>${prof != null ? profBar(prof) : ''}${lines || '<p class="muted">No immediate metric change.</p>'}${rolls}${delayed}${lesson}<button class="btn btn-primary btn-block" style="margin-top:16px" id="close-out">Continue</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#close-out').addEventListener('click', () => {
    overlay.remove();
    onDone();
  });
}

async function runAction(gameId, version, type, payload, tab) {
  const result = await BES.api.action(gameId, {
    type,
    payload: payload || {},
    expectedStateVersion: version,
    idempotencyKey: BES.uuid()
  });
  const after = result.newState?.state?.founderProfessionalism ?? result.outcome?.founderProfessionalism;
  showOutcome(result.outcome, () => renderGame(gameId, tab), after);
  return result;
}

async function renderGame(gameId, tab = 'situation') {
  const user = await requireUser();
  if (!user) return;
  state.gameId = gameId;
  const dash = await BES.api.dashboard(gameId);
  const game = dash.game;
  const st = dash.state;
  const ended = game.status === 'failed' || game.status === 'completed';

  let panel = '';
  if (tab === 'situation') {
    const ev = await BES.api.currentEvent(gameId);
    if (ended) {
      const report = await BES.api.report(gameId);
      panel = `<div class="card situation ${game.status === 'failed' ? 'crit' : ''}">
        <div class="cat-pill">${game.status}</div>
        <h2>${BES.escape(report.ending.label)}</h2>
        <p>Founder rating: <strong>${BES.escape(report.rating.label)}</strong> (${game.score})</p>
        <div class="row"><button class="btn btn-primary" id="restart">Restart this setup</button><a class="btn" href="#/businesses">My businesses</a></div>
      </div>`;
    } else if (!ev.event) {
      panel = `<div class="card"><p>No pending situation. The market is quiet — unusual, and probably temporary.</p></div>`;
    } else {
      panel = `<div class="card situation ${ev.event.isCritical ? 'crit' : ''}">
        <div class="cat-pill">${BES.escape(ev.event.category)}${ev.event.isCritical ? ' · critical' : ''}</div>
        ${profBar(st.state.founderProfessionalism)}
        <h2>${BES.escape(ev.event.title)}</h2>
        <p>${BES.escape(ev.event.narrative)}</p>
        <div class="choices">
          ${ev.decisions
            .map(
              (d) => `<button class="choice tone-${BES.escape(d.tone || 'neutral')}" data-id="${d.decisionId}">
                <b>${BES.escape(d.label)}</b><span>${BES.escape(d.summary || '')}</span>
              </button>`
            )
            .join('')}
        </div>
        <p class="hint" style="margin-top:16px">Founder time this month</p>
        <div class="row">
          <button class="btn" data-focus="sales">Focus: sales</button>
          <button class="btn" data-focus="delivery">Focus: delivery</button>
          <button class="btn" data-focus="culture">Focus: culture</button>
        </div>
      </div>`;
    }
  } else if (tab === 'financials') {
    const fin = await BES.api.financials(gameId);
    const revs = fin.periods.map((p) => p.revenue);
    const cash = fin.periods.map((p) => p.cashBalance);
    const val = fin.periods.map((p) => p.companyValuation);
    const profit = fin.periods.map((p) => p.netProfit);
    panel = `<div class="card"><h3>Trends</h3>
      <p class="muted">Revenue</p>${BES.spark(revs)}
      <p class="muted">Profit</p>${BES.spark(profit, '#3ecf8e')}
      <p class="muted">Cash</p>${BES.spark(cash, '#6ea8ff')}
      <p class="muted">Valuation</p>${BES.spark(val)}
      <table class="mini-table"><thead><tr><th>Period</th><th>Revenue</th><th>Net</th><th>Cash</th></tr></thead><tbody>
      ${fin.periods
        .slice(-8)
        .map(
          (p) =>
            `<tr><td>${BES.escape(p.period)}</td><td>${BES.money(p.revenue)}</td><td>${BES.money(p.netProfit)}</td><td>${BES.money(p.cashBalance)}</td></tr>`
        )
        .join('')}
      </tbody></table></div>`;
  } else if (tab === 'history') {
    const hist = await BES.api.history(gameId, 1);
    panel = `<div class="card"><h3>Decision history</h3><div class="list">${
      hist.entries
        .map(
          (e) =>
            `<div class="list-item"><div><strong>Lv ${e.level}: ${BES.escape(e.situation || '')}</strong><div class="muted">${BES.escape(e.decision || '')}</div></div><span class="${BES.clsDelta(e.financialImpact?.cashDelta)}">${e.financialImpact?.cashDelta ? BES.money(e.financialImpact.cashDelta) : ''}</span></div>`
        )
        .join('') || '<p class="muted">No decisions yet.</p>'
    }</div></div>`;
  } else if (tab === 'projects') {
    const { projects } = await BES.api.projects(gameId);
    panel = `<div class="card"><h3>Projects</h3><div class="list">${
      projects
        .map(
          (p) =>
            `<div class="list-item"><div><strong>${BES.escape(p.projectName)}</strong><div class="muted">${BES.escape(p.client || '')} · ${BES.money(p.contractValue)}</div></div><span class="badge">${BES.escape(p.status)}</span></div>`
        )
        .join('') || '<p class="muted">No projects in flight.</p>'
    }</div></div>`;
  } else if (tab === 'people') {
    const { people, roles } = await BES.api.people(gameId);
    const { projects } = await BES.api.projects(gameId);
    const open = projects.filter((p) => p.status === 'in-progress' || p.status === 'delayed');
    panel = `<div class="side-stack">
      <div class="card">
        <h3>Hire</h3>
        <p class="muted">Named people, not headcount. Hiring spends cash and can still go wrong.</p>
        <div class="row">${(roles || [])
          .map(
            (r) =>
              `<button class="btn" data-hire="${r.id}">Hire ${BES.escape(r.title)} · ${BES.money(r.salary)}</button>`
          )
          .join('')}</div>
      </div>
      <div class="person-grid">
        ${(people || [])
          .map((p) => {
            const burn = p.taskBurndown || {};
            return `<div class="card person-card" data-person="${BES.escape(p.personId)}">
              <strong>${BES.escape(p.name)}</strong>
              ${p.isManager ? '<span class="badge active">manager</span>' : ''}
              <div class="muted">${BES.escape(p.title || p.role)} · ${BES.money(p.salary)} / mo</div>
              ${profBar(p.professionalism, 'Professionalism')}
              <p class="hint">Morale ${Math.round(p.morale)} · Skill ${Math.round(p.skill)} · Tasks ${burn.remaining || 0}/${burn.assigned || 0}</p>
              <div class="person-actions">
                <button class="btn" data-act="promote">Promote</button>
                <button class="btn" data-act="make-manager">Make manager</button>
                <button class="btn" data-act="train">1:1 / train</button>
                <button class="btn btn-danger" data-act="fire">Fire</button>
              </div>
              ${
                open.length
                  ? `<label class="hint">Assign project</label><select data-assign-project>
                      <option value="">—</option>
                      ${open.map((pr) => `<option value="${BES.escape(String(pr._id || pr.projectName))}">${BES.escape(pr.projectName)}</option>`).join('')}
                    </select>`
                  : ''
              }
            </div>`;
          })
          .join('') || '<div class="card muted">No one on the books.</div>'}
      </div>
    </div>`;
  } else if (tab === 'workplace') {
    const wp = await BES.api.workplace(gameId);
    const prop = wp.property || {};
    const flags = wp.flags || {};
    panel = `<div class="side-stack">
      <div class="card">
        <h3>Workplace</h3>
        <p>Kind: <strong>${BES.escape(prop.kind || 'none')}</strong> · Reno ${prop.renovationLevel || 0}/3</p>
        <p class="muted">Monthly occupancy ${BES.money(prop.monthlyCost)} · Asset ${BES.money(prop.assetValue)}</p>
        <p class="muted">Work mode ${BES.escape(flags.workMode || 'undecided')} · Housing ${BES.escape(flags.housing || 'none')}</p>
        <div class="row" style="margin-top:12px">
          <button class="btn btn-primary" data-place="rent-office">Rent office</button>
          <button class="btn" data-place="buy-office">Buy office</button>
          <button class="btn" data-place="renovate">Renovate</button>
        </div>
      </div>
      <div class="card">
        <h3>Rooms</h3>
        <div class="room-grid">
          ${(prop.rooms || [])
            .map((r) => {
              const occ = (wp.people || []).find((p) => p.personId === r.occupantId);
              return `<div class="room"><strong>${BES.escape(r.label)}</strong><div class="muted">Quality ${r.quality}</div><div>${occ ? BES.escape(occ.name) : 'Empty'}</div>
                <select data-room="${BES.escape(r.id)}">
                  <option value="">Assign…</option>
                  ${(wp.people || []).map((p) => `<option value="${BES.escape(p.personId)}">${BES.escape(p.name)}</option>`).join('')}
                </select></div>`;
            })
            .join('') || '<p class="muted">No rooms until you rent or buy.</p>'}
        </div>
      </div>
      <div class="card">
        <h3>Policies</h3>
        <p class="muted">Car: ${BES.escape(flags.carPolicy || 'none')} · Fuel: ${BES.escape(flags.fuelPolicy || 'none')}</p>
        <p class="hint">Car policy</p>
        <div class="row">
          <button class="btn" data-car="none">None</button>
          <button class="btn" data-car="allowance">Allowance</button>
          <button class="btn" data-car="company-cars">Company cars</button>
        </div>
        <p class="hint">Fuel policy</p>
        <div class="row">
          <button class="btn" data-fuel="none">None</button>
          <button class="btn" data-fuel="capped">Capped</button>
          <button class="btn" data-fuel="unlimited">Unlimited</button>
        </div>
      </div>
    </div>`;
  } else if (tab === 'market') {
    const { market } = await BES.api.market(gameId);
    const intel = await BES.api.competitors(gameId);
    const ach = await BES.api.achievements(gameId);
    panel = `<div class="side-stack">
      <div class="card"><h3>Market</h3>
        <p>Condition: <strong>${BES.escape(market?.economicCondition || 'unknown')}</strong></p>
        <p class="muted">Growth ${market?.marketGrowth}% · Inflation ${market?.inflation}% · Rates ${market?.interestRate}% · Demand ${market?.consumerDemand} · Competition ${Math.round((market?.competitionIntensity || intel.competitionIntensity || 0) * 100)}%</p>
      </div>
      <div class="card">
        <h3>Rivals</h3>
        ${(intel.competitors || [])
          .map(
            (c) =>
              `<div class="list-item"><div><strong>${BES.escape(c.name)}</strong><div class="muted">Aggression ${Math.round(c.aggression * 100)} · Price pressure ${Math.round(c.pricePressure * 100)} · Quality ${c.quality}</div></div></div>`
          )
          .join('')}
        <button class="btn btn-primary btn-block" id="intel-btn" style="margin-top:12px">Commission analysis ($8,000)</button>
        <p class="hint">Can leak. Rivals notice loud strategy theater.</p>
        ${(intel.intel?.suggestions || [])
          .map(
            (s) =>
              `<div class="list-item"><div><strong>${BES.escape(s.title)}</strong><div class="muted">${BES.escape(s.risk)} risk · ${BES.escape(s.lesson)}</div></div><button class="btn" data-pursue="${BES.escape(s.id)}">Pursue</button></div>`
          )
          .join('')}
      </div>
      <div class="card"><h3>Achievements</h3>
        ${ach.unlocked.map((a) => `<div class="list-item"><strong>${BES.escape(a.title)}</strong><span class="badge active">unlocked</span></div>`).join('')}
        ${ach.locked.map((a) => `<div class="list-item muted"><span>${BES.escape(a.title)}</span><span class="badge">locked</span></div>`).join('')}
      </div>
    </div>`;
  }

  const tabs = [
    ['situation', 'Situation'],
    ['financials', 'Financials'],
    ['projects', 'Projects'],
    ['people', 'People'],
    ['workplace', 'Workplace'],
    ['market', 'Market'],
    ['history', 'History']
  ];

  appEl.innerHTML = layout(`
    <div class="header-meta">
      <strong>${BES.escape(game.companyName)}</strong>
      <span>${BES.escape(game.industry)}</span>
      <span>Level ${st.level} · ${BES.escape(st.phaseLabel)}</span>
      <span>${BES.escape(game.difficulty)}</span>
      <span>Score ${game.score}</span>
    </div>
    <div style="margin:14px 0 18px">${metricCards(st.state)}</div>
    <div class="tabs">
      ${tabs.map(([id, label]) => `<button class="tab ${tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}
    </div>
    <div class="dash">
      <div>${panel}</div>
      <div class="side-stack">
        <div class="card">
          <div class="label muted">FOUNDER</div>
          <h3 style="margin:6px 0">${BES.escape(game.founderName)}</h3>
          ${profBar(st.state.founderProfessionalism)}
          <p class="muted">Month ${st.gameMonth} · Version ${st.version} · Team ${st.state.employees || 0}</p>
          <p>Quality ${Math.round(st.state.quality)} · Morale ${Math.round(st.state.employeeMorale)} · Debt ${BES.money(st.state.debt)}</p>
          <p class="hint">${BES.escape(st.flags?.workMode || 'undecided')} · ${BES.escape(st.flags?.housing || 'none')} · focus ${BES.escape(st.flags?.founderFocus || 'none')}</p>
        </div>
        ${
          (st.pendingConsequences || []).length
            ? `<div class="card"><div class="banner">FUSES LIT</div>${st.pendingConsequences
                .map((p) => `<p class="hint">${BES.escape(p.label)} · lv ${p.triggerLevel}</p>`)
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
    <nav class="bottom-nav">
      ${[
        ['situation', 'Now'],
        ['people', 'People'],
        ['workplace', 'Office'],
        ['market', 'Market'],
        ['financials', 'Money']
      ]
        .map((t) => `<button data-tab="${t[0]}" class="${tab === t[0] ? 'active' : ''}">${t[1]}</button>`)
        .join('')}
    </nav>
  `, { user });
  bindLogout();

  appEl.querySelectorAll('[data-tab]').forEach((el) =>
    el.addEventListener('click', () => renderGame(gameId, el.dataset.tab))
  );
  document.getElementById('restart')?.addEventListener('click', async () => {
    const data = await BES.api.restart(gameId);
    location.hash = `#/game/${data.game.gameId}`;
  });
  appEl.querySelectorAll('.choice').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const result = await BES.api.decide(gameId, {
          eventId: dash.currentEvent.eventId,
          decisionId: btn.dataset.id,
          expectedStateVersion: st.version,
          idempotencyKey: BES.uuid()
        });
        showOutcome(
          result.outcome,
          () => renderGame(gameId, 'situation'),
          result.newState?.state?.founderProfessionalism
        );
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        if (err.code === 'STALE_STATE_VERSION') renderGame(gameId, 'situation');
      }
    })
  );

  const bindOps = (selector, eventName, handler) => {
    appEl.querySelectorAll(selector).forEach((el) => {
      el.addEventListener(eventName, async () => {
        if (ended) return;
        el.disabled = true;
        try {
          await handler(el);
        } catch (err) {
          toast(err.message);
          el.disabled = false;
          if (err.code === 'STALE_STATE_VERSION') renderGame(gameId, tab);
        }
      });
    });
  };

  bindOps('[data-focus]', 'click', (el) =>
    runAction(gameId, st.version, 'founder-focus', { focus: el.dataset.focus }, tab)
  );
  bindOps('[data-hire]', 'click', (el) => runAction(gameId, st.version, 'hire', { role: el.dataset.hire }, tab));
  bindOps('[data-act]', 'click', (el) => {
    const card = el.closest('[data-person]');
    return runAction(gameId, st.version, el.dataset.act, { personId: card?.dataset.person }, tab);
  });
  bindOps('[data-assign-project]', 'change', (el) => {
    if (!el.value) {
      el.disabled = false;
      return Promise.resolve();
    }
    const card = el.closest('[data-person]');
    return runAction(gameId, st.version, 'assign-project', { personId: card?.dataset.person, projectId: el.value }, tab);
  });
  bindOps('[data-place]', 'click', (el) => runAction(gameId, st.version, el.dataset.place, {}, tab));
  bindOps('[data-car]', 'click', (el) =>
    runAction(gameId, st.version, 'set-policy', { carPolicy: el.dataset.car }, tab)
  );
  bindOps('[data-fuel]', 'click', (el) =>
    runAction(gameId, st.version, 'set-policy', { fuelPolicy: el.dataset.fuel }, tab)
  );
  bindOps('[data-room]', 'change', (el) => {
    if (!el.value) {
      el.disabled = false;
      return Promise.resolve();
    }
    return runAction(gameId, st.version, 'assign-room', { roomId: el.dataset.room, personId: el.value }, tab);
  });
  bindOps('#intel-btn', 'click', () => runAction(gameId, st.version, 'commission-intel', {}, tab));
  bindOps('[data-pursue]', 'click', (el) =>
    runAction(gameId, st.version, 'pursue-suggestion', { suggestionId: el.dataset.pursue }, tab)
  );
}

async function render() {
  const r = route();
  try {
    if (r.path === '/' ) return renderLanding();
    if (r.path === '/login') return renderAuth('login');
    if (r.path === '/register') return renderAuth('register');
    if (r.path === '/forgot') return renderAuth('forgot');
    if (r.path === '/reset-password') return renderAuth('reset');
    if (r.path === '/businesses') return renderBusinesses();
    if (r.path === '/new') return renderCreate();
    if (r.parts[0] === 'game' && r.parts[1]) return renderGame(r.parts[1], r.parts[2] || 'situation');
    renderLanding();
  } catch (err) {
    appEl.innerHTML = layout(`<div class="card"><h2>Something broke</h2><p>${BES.escape(err.message)}</p></div>`);
  }
}

window.addEventListener('hashchange', render);
render();
