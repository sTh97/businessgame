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

function metricCards(s) {
  const items = [
    ['Cash', BES.money(s.cash)],
    ['Revenue', BES.money(s.revenue)],
    ['Profit/Loss', BES.money(s.netProfit)],
    ['Company value', BES.money(s.companyValue)],
    ['Employees', s.employees],
    ['Customers', s.customers],
    ['Reputation', Math.round(s.reputation)],
    ['Capacity', Math.round(s.operationalCapacity)]
  ];
  return `<div class="kpi-grid">${items
    .map(([label, value]) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join('')}</div>`;
}

function showOutcome(outcome, onDone) {
  const immediate = outcome.immediate || {};
  const lines = Object.entries(immediate)
    .filter(([, v]) => Math.abs(Number(v)) >= 0.05)
    .map(([k, v]) => {
      const n = Number(v);
      return `<div class="delta-line"><span>${BES.prettyKey(k)}</span><span class="${BES.clsDelta(n)}">${n > 0 ? '+' : ''}${k.toLowerCase().includes('cash') || k.toLowerCase().includes('revenue') || k.toLowerCase().includes('value') || k.toLowerCase().includes('debt') ? BES.money(n) : n}</span></div>`;
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
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="card overlay-card" role="dialog" aria-live="assertive"><h2 class="brand-name">Consequences</h2>${lines || '<p class="muted">No immediate metric change.</p>'}${rolls}${delayed}<button class="btn btn-primary btn-block" style="margin-top:16px" id="close-out">Continue</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#close-out').addEventListener('click', () => {
    overlay.remove();
    onDone();
  });
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
    const { workforce } = await BES.api.employees(gameId);
    panel = `<div class="card"><h3>Workforce</h3><table class="mini-table"><thead><tr><th>Role</th><th>Count</th><th>Skill</th><th>Morale</th></tr></thead><tbody>
      ${workforce.map((w) => `<tr><td>${BES.escape(w.title || w.role)}</td><td>${w.count}</td><td>${Math.round(w.avgSkill)}</td><td>${Math.round(w.avgMorale)}</td></tr>`).join('')}
    </tbody></table></div>`;
  } else if (tab === 'market') {
    const { market } = await BES.api.market(gameId);
    const ach = await BES.api.achievements(gameId);
    panel = `<div class="side-stack">
      <div class="card"><h3>Market</h3>
        <p>Condition: <strong>${BES.escape(market?.economicCondition || 'unknown')}</strong></p>
        <p class="muted">Growth ${market?.marketGrowth}% · Inflation ${market?.inflation}% · Rates ${market?.interestRate}% · Demand ${market?.consumerDemand} · Competition ${Math.round((market?.competitionIntensity || 0) * 100)}%</p>
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
          <p class="muted">Month ${st.gameMonth} · Version ${st.version}</p>
          <p>Quality ${Math.round(st.state.quality)} · Morale ${Math.round(st.state.employeeMorale)} · Debt ${BES.money(st.state.debt)}</p>
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
      ${tabs
        .slice(0, 5)
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
        showOutcome(result.outcome, () => {
          if (result.newState.status === 'failed' || result.newState.status === 'completed') {
            renderGame(gameId, 'situation');
          } else {
            renderGame(gameId, 'situation');
          }
        });
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        if (err.code === 'STALE_STATE_VERSION') renderGame(gameId, 'situation');
      }
    })
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
