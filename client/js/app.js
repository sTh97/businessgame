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

function layout(content, { user, nav, hud, wrapClass } = {}) {
  const header =
    hud != null
      ? hud
      : `
      <header class="topbar">
        <a class="brand" href="#/businesses">
          <span class="brand-mark" aria-hidden="true">${BES.icon('star')}</span>
          <span class="brand-name">Business Empire</span>
        </a>
        <div class="row">
          ${user ? `<span class="muted hud-email">${BES.escape(user.email)}</span><button class="btn btn-ghost" id="logout">Log out</button>` : ''}
        </div>
      </header>`;
  return `
    <div class="wrap ${wrapClass || ''}">
      ${header}
      ${nav || ''}
      ${content}
    </div>
  `;
}

function bindLogout() {
  document.getElementById('logout')?.addEventListener('click', async () => {
    stopPresence();
    await BES.api.logout();
    state.user = null;
    location.hash = '#/login';
  });
}

let presenceTimer = null;

function startPresence() {
  if (presenceTimer) return;
  const beat = () => {
    if (document.visibilityState === 'hidden') return;
    BES.api.heartbeat().catch(() => {});
  };
  beat();
  presenceTimer = setInterval(beat, 25000);
}

function stopPresence() {
  if (presenceTimer) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
}

function initials(name) {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = ((parts[0] && parts[0][0]) || '?') + (parts[1] ? parts[1][0] : '');
  return BES.escape(letters.toUpperCase());
}

function avatarHue(name) {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

function avatarHtml(name, extraClass = '') {
  return `<span class="avatar ${extraClass}" style="--av:${avatarHue(name)}">${initials(name)}</span>`;
}

function toneMeta(tone) {
  if (tone === 'risky') return { icon: 'flame', label: 'Risky' };
  if (tone === 'bold') return { icon: 'bolt', label: 'Bold' };
  if (tone === 'cautious') return { icon: 'shield', label: 'Cautious' };
  return { icon: 'spark', label: 'Call' };
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 960px)').matches;
}

function closeSheets() {
  appEl.querySelectorAll('.sheet').forEach((el) => el.setAttribute('hidden', ''));
  appEl.querySelector('.sheet-backdrop')?.setAttribute('hidden', '');
  document.getElementById('nav-more')?.setAttribute('aria-expanded', 'false');
}

function openSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  const toggling = !sheet.hasAttribute('hidden');
  closeSheets();
  if (toggling) return;
  sheet.removeAttribute('hidden');
  appEl.querySelector('.sheet-backdrop')?.removeAttribute('hidden');
  if (id === 'nav-more-sheet') {
    document.getElementById('nav-more')?.setAttribute('aria-expanded', 'true');
  }
}

function bindSheets() {
  appEl.querySelectorAll('[data-sheet-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isMobileLayout() && btn.closest('.person-card, .room')) return;
      openSheet(btn.getAttribute('data-sheet-open'));
    });
  });
  document.getElementById('nav-more')?.addEventListener('click', () => openSheet('nav-more-sheet'));
  appEl.querySelectorAll('[data-sheet-close]').forEach((el) => el.addEventListener('click', closeSheets));
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
    startPresence();
    return state.user;
  } catch {
    location.hash = '#/login';
    return null;
  }
}

function renderLanding() {
  appEl.innerHTML = layout(
    `
    <section class="hero hero-splash">
      <div class="hero-glow" aria-hidden="true"></div>
      <p class="hero-kicker">Single-player · Persistent · Honest economics</p>
      <h1>Build a company.<br />Live with the consequences.</h1>
      <p>A server-authoritative flight simulator for entrepreneurship. Cash, reputation, debt, and delayed fallout — none of it is computed in the browser.</p>
      <div class="row hero-cta">
        <a class="btn btn-primary" href="#/register">Create account</a>
        <a class="btn" href="#/login">Log in</a>
        <a class="btn btn-ghost" href="#/admin">Admin</a>
      </div>
    </section>
  `,
    { wrapClass: 'wrap-splash' }
  );
}

function renderAuth(mode) {
  const title = mode === 'register' ? 'Found your account' : mode === 'forgot' ? 'Reset access' : 'Welcome back';
  appEl.innerHTML = layout(`
    <div class="auth-grid">
      <form class="card" id="auth-form">
        ${mode === 'reset' ? '' : `<div class="field"><label for="email">Email</label><input id="email" type="email" required autocomplete="email" /></div>`}
        ${mode === 'forgot' ? '' : `<div class="field"><label for="password">${mode === 'reset' ? 'New password' : 'Password'}</label><input id="password" type="password" required minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" /></div>`}
        <button class="btn btn-primary btn-block" type="submit">${mode === 'register' ? 'Sign up' : mode === 'forgot' ? 'Send reset link' : mode === 'reset' ? 'Update password' : 'Log in'}</button>
        <p class="hint auth-links">
          ${mode === 'login' ? `<a href="#/register">Need an account?</a> · <a href="#/forgot">Forgot password</a> · <a href="#/admin">Admin</a>` : `<a href="#/login">Back to login</a>`}
        </p>
        <p class="hint" id="auth-msg"></p>
      </form>
      <section class="hero auth-copy">
        <h1>${title}</h1>
        <p class="auth-pitch">Single-player. Persistent. Honest economics. Software House is playable now; five more industries follow as content packs.</p>
      </section>
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
  appEl.innerHTML = layout(
    `
    <section class="hero hero-compact">
      <h1>My Businesses</h1>
      <p>Continue an empire, start a new one, or review what failed.</p>
      <a class="btn btn-primary" href="#/new">Start new business</a>
    </section>
    <div class="list save-list">
      ${
        games.length
          ? games
              .map((g) => {
                const level = Number(g.currentLevel) || 0;
                return `
          <a class="list-item save-slot" href="#/game/${g.gameId}">
            <span class="save-emblem">${BES.industryIcon(g.industry)}</span>
            <div class="save-body">
              <strong>${BES.escape(g.companyName)}</strong>
              <div class="muted">${BES.escape(g.industry)} · ${BES.escape(g.difficulty)}</div>
              <div class="save-progress" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${level}" aria-label="Level ${level}">
                <span style="width:${Math.max(6, Math.min(100, level))}%"></span>
              </div>
              <div class="save-level">Level ${level}</div>
            </div>
            <span class="badge ${g.status}">${g.status}</span>
          </a>`;
              })
              .join('')
          : `<div class="card muted">No companies yet. Found one.</div>`
      }
    </div>
  `,
    { user }
  );
  bindLogout();
}

async function renderCreate() {
  const user = await requireUser();
  if (!user) return;
  const { industries } = await BES.api.industries();
  let selected = industries.find((i) => !i.locked)?.id || 'software-house';
  let difficulty = 'normal';
  let step = 1;
  let companyName = '';
  let founderName = '';

  const paint = async () => {
    const form = document.getElementById('create-form');
    if (form) {
      companyName = form.companyName?.value || companyName;
      founderName = form.founderName?.value || founderName;
    }
    const preview = await BES.api.preview(selected, difficulty).catch(() => null);
    const ind = industries.find((i) => i.id === selected);
    appEl.innerHTML = layout(
      `
      <section class="hero hero-compact"><h1>New business</h1><p>Industry and difficulty lock in at founding.</p></section>
      <form class="card create-form" id="create-form">
        <div class="create-progress" aria-label="Step ${step} of 3">
          <span class="create-dot ${step >= 1 ? 'on' : ''}"></span>
          <span class="create-dot ${step >= 2 ? 'on' : ''}"></span>
          <span class="create-dot ${step >= 3 ? 'on' : ''}"></span>
          <span class="create-step-label">Step ${step} of 3</span>
        </div>
        <div class="create-step ${step === 1 ? 'is-active' : ''}">
          <p class="create-label">Choose your industry</p>
          <div class="industry-grid">
            ${industries
              .map(
                (i) => `
              <button type="button" class="industry ${i.id === selected ? 'selected' : ''} ${i.locked ? 'locked' : ''}" data-id="${i.id}" ${i.locked ? 'disabled' : ''}>
                <span class="industry-emblem">${BES.industryIcon(i.id)}</span>
                <h3>${BES.escape(i.name)}</h3>
                <div class="muted">${BES.escape(i.tagline || '')}</div>
                ${i.locked ? `<div class="badge">Release ${i.release}</div>` : ''}
              </button>`
              )
              .join('')}
          </div>
          <p class="hint create-desc">${BES.escape(ind?.description || '')}</p>
        </div>
        <div class="create-step ${step === 2 ? 'is-active' : ''}">
          <p class="create-label">Choose difficulty</p>
          <div class="diff-row">
            ${['easy', 'normal', 'hard', 'expert']
              .map(
                (d) =>
                  `<button type="button" class="diff ${d === difficulty ? 'selected' : ''}" data-d="${d}"><b>${d}</b></button>`
              )
              .join('')}
          </div>
        </div>
        <div class="create-step ${step === 3 ? 'is-active' : ''}">
          <p class="create-label">Name the company</p>
          <div class="field"><label>Company name</label><input name="companyName" minlength="2" maxlength="60" required value="${BES.escape(companyName)}" /></div>
          <div class="field"><label>Founder name</label><input name="founderName" minlength="2" maxlength="60" required value="${BES.escape(founderName)}" /></div>
          ${
            preview
              ? `<div class="hud-chips hud-chips-wrap create-preview">
                  <div class="chip" title="Starting cash">${BES.icon('cash')}<span>${BES.money(preview.startingState.cash)}</span></div>
                  <div class="chip" title="Burn / month">${BES.icon('flame')}<span>${BES.money(preview.startingState.monthlyExpenses)}</span></div>
                  <div class="chip" title="Reputation">${BES.icon('shield')}<span>${preview.startingState.reputation}</span></div>
                  <div class="chip" title="Team">${BES.icon('people')}<span>${preview.startingState.employees}</span></div>
                </div>`
              : ''
          }
          <button class="btn btn-primary btn-block" type="submit">Start business</button>
        </div>
        <div class="create-nav">
          ${step > 1 ? `<button type="button" class="btn" data-create-dir="back">Back</button>` : `<span></span>`}
          ${step < 3 ? `<button type="button" class="btn btn-primary" data-create-dir="next">Next</button>` : ''}
        </div>
        <p class="hint" id="create-msg"></p>
      </form>
    `,
      { user }
    );
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
    appEl.querySelectorAll('[data-create-dir]').forEach((btn) =>
      btn.addEventListener('click', () => {
        step = btn.dataset.createDir === 'next' ? Math.min(3, step + 1) : Math.max(1, step - 1);
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
  return `<div class="prof"><div class="prof-track xp-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${BES.escape(label)}"><span class="xp-fill" style="width:${v}%"></span><span class="xp-value">${v}</span></div></div>`;
}

function metricCards(s) {
  const items = [
    ['cash', 'Cash', BES.money(s.cash)],
    ['chart', 'Revenue', BES.money(s.revenue)],
    ['bolt', 'Profit/Loss', BES.money(s.netProfit)],
    ['star', 'Company value', BES.money(s.companyValue)],
    ['user', 'Professionalism', Math.round(s.founderProfessionalism || 0)],
    ['people', 'Customers', s.customers],
    ['shield', 'Reputation', Math.round(s.reputation)],
    ['briefcase', 'Capacity', Math.round(s.operationalCapacity)]
  ];
  return `<div class="kpi-grid hud-chips hud-chips-wrap">${items
    .map(
      ([icon, label, value]) =>
        `<div class="kpi chip" title="${label}">${BES.icon(icon)}<span class="value">${value}</span></div>`
    )
    .join('')}</div>`;
}

function founderBlock(game, st) {
  const s = st.state;
  const fuses = st.pendingConsequences || [];
  return `
    <div class="label muted">FOUNDER</div>
    <div class="founder-head">
      <span class="prof-ring" style="--pct:${Math.round(s.founderProfessionalism || 0)}">${avatarHtml(game.founderName)}</span>
      <div>
        <h3>${BES.escape(game.founderName)}</h3>
        <p class="muted">${BES.escape(game.companyName)}</p>
      </div>
    </div>
    ${profBar(s.founderProfessionalism)}
    <p class="muted">Month ${st.gameMonth} · Version ${st.version} · Team ${s.employees || 0}</p>
    <p>Quality ${Math.round(s.quality)} · Morale ${Math.round(s.employeeMorale)} · Debt ${BES.money(s.debt)}</p>
    <p class="hint">${BES.escape(st.flags?.workMode || 'undecided')} · ${BES.escape(st.flags?.housing || 'none')} · focus ${BES.escape(st.flags?.founderFocus || 'none')}</p>
    ${
      fuses.length
        ? `<div class="fuse-chip"><span class="fuse-chip-icon">${BES.icon('flame')}</span><div><b>Fuses lit · ${fuses.length}</b>${fuses
            .map((p) => `<p class="hint">${BES.escape(p.label)} · lv ${p.triggerLevel}</p>`)
            .join('')}</div></div>`
        : ''
    }
  `;
}

function gameHud(user, game, st) {
  const s = st.state;
  const prof = Math.round(s.founderProfessionalism || 0);
  const fuses = (st.pendingConsequences || []).length;
  return `
    <header class="hud-header">
      <a class="brand" href="#/businesses" title="My businesses">
        <span class="brand-mark" aria-hidden="true">${BES.icon('star')}</span>
        <span class="brand-copy">
          <span class="brand-name">Business Empire</span>
          <span class="hud-company">${BES.escape(game.companyName)}</span>
        </span>
      </a>
      <div class="hud-chips" role="group" aria-label="Company stats">
        <div class="chip" title="Cash">${BES.icon('cash')}<span>${BES.money(s.cash)}</span></div>
        <div class="chip" title="Reputation">${BES.icon('shield')}<span>${Math.round(s.reputation)}</span></div>
        <div class="chip" title="Level">${BES.icon('star')}<span>Lv ${st.level}</span></div>
        <div class="chip" title="Morale">${BES.icon('people')}<span>${Math.round(s.employeeMorale)}</span></div>
      </div>
      <div class="hud-actions">
        <button type="button" class="hud-founder-btn" data-sheet-open="founder-sheet" aria-label="Founder details, ${fuses} fuses">
          <span class="prof-ring" style="--pct:${prof}">${avatarHtml(game.founderName)}</span>
          ${fuses ? `<span class="fuse-count">${fuses}</span>` : ''}
        </button>
        <button class="btn-icon" id="logout" aria-label="Log out" title="Log out">${BES.icon('logout')}</button>
      </div>
    </header>
  `;
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
      return `<div class="delta-line ${BES.clsDelta(n)}"><span>${BES.prettyKey(k)}</span><span class="${BES.clsDelta(n)}">${n > 0 ? '+' : ''}${moneyish ? BES.money(n) : n}</span></div>`;
    })
    .join('');
  const delayed = (outcome.delayed || [])
    .map(
      (d) =>
        `<div class="fuse-chip ${d.matured ? 'resolved' : ''}"><span class="fuse-chip-icon">${BES.icon(d.matured ? 'star' : 'flame')}</span><div><b>${d.matured ? 'Resolved' : 'Fuse lit'}</b><p class="hint">${BES.escape(d.label)}</p></div></div>`
    )
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
  overlay.className = 'overlay overlay-reveal';
  overlay.innerHTML = `<div class="card overlay-card" role="dialog" aria-live="assertive"><p class="hero-kicker">Outcome</p><h2 class="brand-name">Consequences</h2>${prof != null ? profBar(prof) : ''}${lines || '<p class="muted">No immediate metric change.</p>'}${rolls}${delayed}${lesson}<button class="btn btn-primary btn-block" id="close-out">Continue</button></div>`;
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
        <p class="narrative">${BES.escape(ev.event.narrative)}</p>
        <div class="choices">
          ${ev.decisions
            .map((d) => {
              const tone = d.tone || 'neutral';
              const meta = toneMeta(tone);
              return `<button class="choice tone-${BES.escape(tone)}" data-id="${d.decisionId}">
                <span class="choice-icon">${BES.icon(meta.icon)}</span>
                <span class="choice-body"><b>${BES.escape(d.label)}</b><span>${BES.escape(d.summary || '')}</span></span>
                <span class="choice-risk">${meta.label}</span>
              </button>`;
            })
            .join('')}
        </div>
        <p class="hint focus-label">Founder time this month</p>
        <div class="row focus-row">
          <button class="btn" data-focus="sales">${BES.icon('chart')} Focus: sales</button>
          <button class="btn" data-focus="delivery">${BES.icon('briefcase')} Focus: delivery</button>
          <button class="btn" data-focus="culture">${BES.icon('people')} Focus: culture</button>
        </div>
      </div>`;
    }
  } else if (tab === 'financials') {
    const fin = await BES.api.financials(gameId);
    const revs = fin.periods.map((p) => p.revenue);
    const cash = fin.periods.map((p) => p.cashBalance);
    const val = fin.periods.map((p) => p.companyValuation);
    const profit = fin.periods.map((p) => p.netProfit);
    const recent = fin.periods.slice(-8);
    panel = `<div class="card"><h3>Trends</h3>
      <p class="muted">Revenue</p>${BES.spark(revs)}
      <p class="muted">Profit</p>${BES.spark(profit, '#3ecf8e')}
      <p class="muted">Cash</p>${BES.spark(cash, '#6ea8ff')}
      <p class="muted">Valuation</p>${BES.spark(val)}
      <table class="mini-table"><thead><tr><th>Period</th><th>Revenue</th><th>Net</th><th>Cash</th></tr></thead><tbody>
      ${recent
        .map(
          (p) =>
            `<tr><td>${BES.escape(p.period)}</td><td>${BES.money(p.revenue)}</td><td>${BES.money(p.netProfit)}</td><td>${BES.money(p.cashBalance)}</td></tr>`
        )
        .join('')}
      </tbody></table>
      <div class="list fin-list">
        ${recent
          .map(
            (p) => `<div class="list-item fin-row">
              <div class="fin-period">${BES.escape(p.period)}</div>
              <div class="fin-chips">
                <span class="chip" title="Revenue">${BES.icon('chart')}<span>${BES.money(p.revenue)}</span></span>
                <span class="chip" title="Net">${BES.icon('bolt')}<span>${BES.money(p.netProfit)}</span></span>
                <span class="chip" title="Cash">${BES.icon('cash')}<span>${BES.money(p.cashBalance)}</span></span>
              </div>
            </div>`
          )
          .join('')}
      </div>
    </div>`;
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
            `<div class="list-item"><div class="save-emblem">${BES.icon('briefcase')}</div><div><strong>${BES.escape(p.projectName)}</strong><div class="muted">${BES.escape(p.client || '')} · ${BES.money(p.contractValue)}</div></div><span class="badge">${BES.escape(p.status)}</span></div>`
        )
        .join('') || '<p class="muted">No projects in flight.</p>'
    }</div></div>`;
  } else if (tab === 'people') {
    const { people, roles } = await BES.api.people(gameId);
    const { projects } = await BES.api.projects(gameId);
    const open = projects.filter((p) => p.status === 'in-progress' || p.status === 'delayed');
    const assignSelect = (idPrefix) =>
      open.length
        ? `<label class="hint">Assign project</label><select data-assign-project>
                      <option value="">—</option>
                      ${open.map((pr) => `<option value="${BES.escape(String(pr._id || pr.projectName))}">${BES.escape(pr.projectName)}</option>`).join('')}
                    </select>`
        : '';
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
            const sheetId = `person-sheet-${BES.escape(p.personId)}`;
            return `<div class="card person-card" data-person="${BES.escape(p.personId)}">
              <button type="button" class="person-head" data-sheet-open="${sheetId}">
                ${avatarHtml(p.name)}
                <span class="person-meta">
                  <strong>${BES.escape(p.name)}</strong>
                  <span class="muted">${BES.escape(p.title || p.role)} · ${BES.money(p.salary)} / mo</span>
                </span>
                ${p.isManager ? '<span class="badge active">manager</span>' : ''}
                <span class="person-key">Morale ${Math.round(p.morale)}</span>
              </button>
              <button type="button" class="btn person-primary" data-act="train">Train</button>
              <div class="sheet person-sheet" id="${sheetId}" hidden>
                <div class="sheet-chrome">
                  <div class="sheet-handle"></div>
                  <div class="sheet-head">
                    <h3>${BES.escape(p.name)}</h3>
                    <button type="button" class="btn-icon" data-sheet-close aria-label="Close">${BES.icon('close')}</button>
                  </div>
                </div>
                ${profBar(p.professionalism, 'Professionalism')}
                <p class="hint">Morale ${Math.round(p.morale)} · Skill ${Math.round(p.skill)} · Tasks ${burn.remaining || 0}/${burn.assigned || 0}</p>
                <div class="person-actions">
                  <button class="btn" data-act="promote">Promote</button>
                  <button class="btn" data-act="make-manager">Make manager</button>
                  <button class="btn" data-act="train">1:1 / train</button>
                  <button class="btn btn-danger" data-act="fire">Fire</button>
                </div>
                ${assignSelect()}
              </div>
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
        <div class="row place-row">
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
              const sheetId = `room-sheet-${BES.escape(r.id)}`;
              return `<div class="room">
                <button type="button" class="room-head" data-sheet-open="${sheetId}">
                  ${avatarHtml(occ ? occ.name : r.label)}
                  <span class="person-meta">
                    <strong>${BES.escape(r.label)}</strong>
                    <span class="muted">Quality ${r.quality} · ${occ ? BES.escape(occ.name) : 'Empty'}</span>
                  </span>
                </button>
                <button type="button" class="btn person-primary" data-sheet-open="${sheetId}">Assign</button>
                <div class="sheet room-sheet" id="${sheetId}" hidden>
                  <div class="sheet-chrome">
                    <div class="sheet-handle"></div>
                    <div class="sheet-head">
                      <h3>${BES.escape(r.label)}</h3>
                      <button type="button" class="btn-icon" data-sheet-close aria-label="Close">${BES.icon('close')}</button>
                    </div>
                  </div>
                  <div class="muted">Quality ${r.quality}</div>
                  <div>${occ ? BES.escape(occ.name) : 'Empty'}</div>
                  <select data-room="${BES.escape(r.id)}">
                    <option value="">Assign…</option>
                    ${(wp.people || []).map((p) => `<option value="${BES.escape(p.personId)}">${BES.escape(p.name)}</option>`).join('')}
                  </select>
                </div>
              </div>`;
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
        <button class="btn btn-primary btn-block" id="intel-btn">Commission analysis ($8,000)</button>
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
    ['situation', 'Situation', 'situation'],
    ['financials', 'Financials', 'chart'],
    ['projects', 'Projects', 'briefcase'],
    ['people', 'People', 'people'],
    ['workplace', 'Workplace', 'building'],
    ['market', 'Market', 'globe'],
    ['history', 'History', 'spark']
  ];
  const moreActive = tab === 'projects' || tab === 'history';

  appEl.innerHTML = layout(
    `
    <div class="header-meta">
      <strong>${BES.escape(game.companyName)}</strong>
      <span>${BES.escape(game.industry)}</span>
      <span>Level ${st.level} · ${BES.escape(st.phaseLabel)}</span>
      <span>${BES.escape(game.difficulty)}</span>
      <span>Score ${game.score}</span>
    </div>
    <div class="tabs">
      ${tabs.map(([id, label, icon]) => `<button class="tab ${tab === id ? 'active' : ''}" data-tab="${id}">${BES.icon(icon)} ${label}</button>`).join('')}
    </div>
    <div class="dash">
      <div class="dash-main">${panel}</div>
      <div class="side-stack dash-aside">
        <div class="card founder-card">
          ${founderBlock(game, st)}
        </div>
      </div>
    </div>
    <nav class="bottom-nav">
      ${[
        ['situation', 'Now', 'situation'],
        ['people', 'People', 'people'],
        ['workplace', 'Office', 'building'],
        ['market', 'Market', 'globe'],
        ['financials', 'Money', 'cash']
      ]
        .map(
          (t) =>
            `<button type="button" data-tab="${t[0]}" class="${tab === t[0] ? 'active' : ''}">${BES.icon(t[2])}<span>${t[1]}</span></button>`
        )
        .join('')}
      <button type="button" id="nav-more" class="${moreActive ? 'active' : ''}" aria-expanded="false" aria-haspopup="true">${BES.icon('more')}<span>More</span></button>
    </nav>
    <div class="sheet-backdrop" data-sheet-close hidden></div>
    <div class="sheet" id="founder-sheet" hidden>
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h3>Founder</h3>
        <button type="button" class="btn-icon" data-sheet-close aria-label="Close">${BES.icon('close')}</button>
      </div>
      ${founderBlock(game, st)}
      ${metricCards(st.state)}
    </div>
    <div class="sheet" id="nav-more-sheet" hidden>
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h3>More</h3>
        <button type="button" class="btn-icon" data-sheet-close aria-label="Close">${BES.icon('close')}</button>
      </div>
      <div class="more-nav">
        <button type="button" class="list-item ${tab === 'projects' ? 'active' : ''}" data-tab="projects">${BES.icon('briefcase')} Projects</button>
        <button type="button" class="list-item ${tab === 'history' ? 'active' : ''}" data-tab="history">${BES.icon('spark')} History</button>
      </div>
    </div>
  `,
    { user, hud: gameHud(user, game, st), wrapClass: `wrap-game tab-${tab}` }
  );
  bindLogout();
  bindSheets();

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

async function requireAdmin() {
  if (!BES.http.adminToken) {
    location.hash = '#/admin/login';
    return false;
  }
  try {
    await BES.api.adminMe();
    return true;
  } catch {
    BES.api.adminLogout();
    location.hash = '#/admin/login';
    return false;
  }
}

function renderAdminLogin() {
  appEl.innerHTML = layout(`
    <div class="auth-grid">
      <form class="card" id="admin-form">
        <div class="field"><label for="username">Username</label><input id="username" type="text" required autocomplete="username" /></div>
        <div class="field"><label for="password">Password</label><input id="password" type="password" required minlength="8" autocomplete="current-password" /></div>
        <button class="btn btn-primary btn-block" type="submit">Enter admin</button>
        <p class="hint auth-links"><a href="#/login">Player login</a></p>
        <p class="hint" id="auth-msg"></p>
      </form>
      <section class="hero auth-copy">
        <h1>Operator console</h1>
        <p class="auth-pitch">See who signed in, how long they stayed, which games they started, and the level they are playing.</p>
      </section>
    </div>
  `);
  document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('auth-msg');
    try {
      await BES.api.adminLogin(username.value, password.value);
      location.hash = '#/admin';
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

function statusBadge(status) {
  return `<span class="badge ${BES.escape(status || '')}">${BES.escape(status || 'unknown')}</span>`;
}

async function renderAdmin() {
  const ok = await requireAdmin();
  if (!ok) return;
  const data = await BES.api.adminOverview();
  const totals = data.totals || {};
  const users = data.users || [];
  const history = data.loginHistory || [];

  const userRows = users
    .map((u) => {
      const games = (u.games || [])
        .map(
          (g) =>
            `<li><strong>${BES.escape(g.companyName)}</strong> · ${BES.escape(g.industry)} · Lv ${g.currentLevel} ${statusBadge(g.status)}</li>`
        )
        .join('');
      const logins = (u.loginHistory || [])
        .map((row) => `<li>${BES.escape(BES.when(row.loggedInAt))} · ${BES.escape(row.ip || 'ip unknown')}</li>`)
        .join('');
      return `
        <tr>
          <td>
            <strong>${BES.escape(u.email)}</strong>
            <div class="muted">${BES.escape(BES.when(u.lastLoginAt))}</div>
          </td>
          <td>${u.loginCount || 0}</td>
          <td>${BES.escape(u.timeSpent || '0s')}</td>
          <td>${u.gamesInitiated || 0}</td>
          <td>${u.playingLevel != null ? `Lv ${u.playingLevel}` : '—'}${u.highestLevel ? `<div class="muted">Peak ${u.highestLevel}</div>` : ''}</td>
        </tr>
        <tr class="admin-detail">
          <td colspan="5">
            <div class="admin-detail-grid">
              <div>
                <h3>Games</h3>
                ${games ? `<ul class="admin-list">${games}</ul>` : `<p class="muted">No games yet</p>`}
              </div>
              <div>
                <h3>Recent logins</h3>
                ${logins ? `<ul class="admin-list">${logins}</ul>` : `<p class="muted">No login history yet</p>`}
              </div>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  const historyRows = history
    .map(
      (row) => `
      <tr>
        <td>${BES.escape(row.email)}</td>
        <td>${BES.escape(BES.when(row.loggedInAt))}</td>
        <td>${BES.escape(row.ip || '—')}</td>
        <td class="admin-ua">${BES.escape(row.userAgent || '—')}</td>
      </tr>`
    )
    .join('');

  appEl.innerHTML = layout(
    `
    <section class="hero hero-compact">
      <h1>Admin</h1>
      <p>Live player activity: logins, time on site, games started, and current level.</p>
    </section>
    <div class="kpi-grid admin-kpis">
      <div class="kpi"><div class="label">${BES.icon('people')} Users logged in</div><div class="value">${totals.usersLoggedIn || 0}</div><div class="delta">${totals.registeredUsers || 0} registered</div></div>
      <div class="kpi"><div class="label">${BES.icon('clock')} Time on site</div><div class="value">${BES.escape(totals.totalTimeSpent || '0s')}</div><div class="delta">${totals.totalLogins || 0} logins</div></div>
      <div class="kpi"><div class="label">${BES.icon('briefcase')} Games started</div><div class="value">${totals.gamesInitiated || 0}</div></div>
      <div class="kpi"><div class="label">${BES.icon('star')} Players</div><div class="value">${users.length}</div></div>
    </div>
    <section class="card admin-panel">
      <h2>Players</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Logins</th>
              <th>Time on site</th>
              <th>Games</th>
              <th>Playing</th>
            </tr>
          </thead>
          <tbody>
            ${userRows || `<tr><td colspan="5" class="muted">No players yet</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
    <section class="card admin-panel">
      <h2>Login history</h2>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>When</th>
              <th>IP</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows || `<tr><td colspan="4" class="muted">No logins recorded yet</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `,
    {
      wrapClass: 'wrap-admin',
      hud: `
      <header class="topbar">
        <a class="brand" href="#/admin">
          <span class="brand-mark" aria-hidden="true">${BES.icon('shield')}</span>
          <span class="brand-name">Admin</span>
        </a>
        <div class="row">
          <span class="muted hud-email">admin</span>
          <button class="btn btn-ghost" id="logout">Log out</button>
        </div>
      </header>`
    }
  );
  document.getElementById('logout')?.addEventListener('click', () => {
    BES.api.adminLogout();
    location.hash = '#/admin/login';
  });
}

async function render() {
  const r = route();
  try {
    if (r.path === '/') return renderLanding();
    if (r.path === '/login') return renderAuth('login');
    if (r.path === '/register') return renderAuth('register');
    if (r.path === '/forgot') return renderAuth('forgot');
    if (r.path === '/reset-password') return renderAuth('reset');
    if (r.path === '/admin/login') return renderAdminLogin();
    if (r.path === '/admin') return renderAdmin();
    if (r.path === '/businesses') return renderBusinesses();
    if (r.path === '/new') return renderCreate();
    if (r.parts[0] === 'game' && r.parts[1]) return renderGame(r.parts[1], r.parts[2] || 'situation');
    renderLanding();
  } catch (err) {
    appEl.innerHTML = layout(`<div class="card"><h2>Something broke</h2><p>${BES.escape(err.message)}</p></div>`);
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => {
  if (BES.http.accessToken) BES.api.heartbeat().catch(() => {});
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && BES.http.accessToken) {
    BES.api.heartbeat().catch(() => {});
  }
});
render();
