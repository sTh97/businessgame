window.BES = window.BES || {};

(function () {
  const svg = (inner) =>
    `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  const ICONS = {
    cash: svg(
      '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v9.6M9.4 9.4c.7-1.1 5.2-1.2 5.2 1.3 0 2.2-2.3 2.3-2.6 2.3s-2.6.4-2.6 2.2c0 2.4 4.4 2.3 5.3 1.1"/>'
    ),
    shield: svg('<path d="M12 3.2 4.8 6.2v5.6c0 4.4 3 7.4 7.2 8.8 4.2-1.4 7.2-4.4 7.2-8.8V6.2z"/>'),
    people: svg(
      '<circle cx="9" cy="8" r="3"/><path d="M3.6 19c.5-3.2 2.8-5.2 5.4-5.2s4.9 2 5.4 5.2"/><circle cx="16.8" cy="9" r="2.2"/><path d="M15.8 13.9c2.1.4 3.8 2.1 4.4 5.1"/>'
    ),
    briefcase: svg(
      '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6.2A2.2 2.2 0 0 1 10.2 4h3.6A2.2 2.2 0 0 1 16 6.2V8M3 13h18"/>'
    ),
    building: svg(
      '<path d="M4 21h16M6.2 21V4.8h11.6V21"/><path d="M9.2 8.2h.01M14.8 8.2h.01M9.2 12h.01M14.8 12h.01M9.2 15.8h.01M14.8 15.8h.01"/>'
    ),
    chart: svg('<path d="M4 19.2h16M7.2 16V10M12 16V6.5M16.8 16v-4"/>'),
    star: svg('<path d="M12 3.4 14.7 9l6.1.9-4.4 4.3 1 6.1L12 17.4 6.6 20.3l1-6.1L3.2 9.9 9.3 9z"/>'),
    flame: svg(
      '<path d="M12 21a6.4 6.4 0 0 0 6.4-6.4c0-3.6-2.6-6-4.6-9.2-2.6 2.6-3.4 5.2-3.4 7.1 0-3.4-.8-5.4-2.8-7.7-2.6 3.4-3.6 6-3.6 9.8A6.4 6.4 0 0 0 12 21z"/>'
    ),
    bolt: svg('<path d="M13 2.5 4.8 13.2h6.4L10 21.5l8.4-11.2h-6.2z"/>'),
    more: svg(
      '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>'
    ),
    spark: svg(
      '<path d="M12 3.2v3.4M12 17.4v3.4M5.2 7.4l2.4 1.4M16.4 15.2l2.4 1.4M5.2 16.6l2.4-1.4M16.4 8.8l2.4-1.4"/>'
    ),
    code: svg('<path d="M8.2 7.5 3.8 12l4.4 4.5M15.8 7.5 20.2 12l-4.4 4.5M13.2 5.5 10.8 18.5"/>'),
    cpu: svg(
      '<rect x="7" y="7" width="10" height="10" rx="1.4"/><path d="M9.2 3.4v3.6M14.8 3.4v3.6M9.2 17v3.6M14.8 17v3.6M3.4 9.2h3.6M3.4 14.8h3.6M17 9.2h3.6M17 14.8h3.6"/>'
    ),
    chair: svg(
      '<path d="M7 11V7.2A2.2 2.2 0 0 1 9.2 5h5.6A2.2 2.2 0 0 1 17 7.2V11"/><path d="M6 11v5.2A2 2 0 0 0 8 18.2h8a2 2 0 0 0 2-2V11"/><path d="M6 13H4.6A1.6 1.6 0 0 0 3 14.6V17M18 13h1.4A1.6 1.6 0 0 1 21 14.6V17"/>'
    ),
    bank: svg('<path d="M3.4 10.2 12 4.4l8.6 5.8M4.5 10.2v7.4h15v-7.4M2.5 20h19M8 13.4v4.2M12 13.4v4.2M16 13.4v4.2"/>'),
    globe: svg(
      '<circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.8 2.8 2.8 13.6 0 16.4M12 3.8c-2.8 2.8-2.8 13.6 0 16.4"/>'
    ),
    logout: svg('<path d="M10 4.5H6.2A2.2 2.2 0 0 0 4 6.7v10.6A2.2 2.2 0 0 0 6.2 19.5H10M10.5 12H20M16.4 8.4 20 12l-3.6 3.6"/>'),
    close: svg('<path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"/>'),
    situation: svg('<circle cx="12" cy="12" r="8.2"/><path d="M12 8.2V12l2.6 2.6"/>'),
    user: svg('<circle cx="12" cy="8.2" r="3.3"/><path d="M5.2 19.4c.8-3.6 3.2-5.4 6.8-5.4s6 1.8 6.8 5.4"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.2V12l3.2 2"/>')
  };

  const INDUSTRY = {
    'software-house': 'code',
    'ai-company': 'cpu',
    'real-estate': 'building',
    furniture: 'chair',
    bank: 'bank',
    tourism: 'globe'
  };

  BES.icon = (name) => ICONS[name] || ICONS.star;

  BES.industryIcon = (idOrName) => {
    const raw = String(idOrName || '').toLowerCase();
    if (INDUSTRY[raw]) return BES.icon(INDUSTRY[raw]);
    const hit = Object.keys(INDUSTRY).find((k) => raw.includes(k) || raw.includes(k.replace('-', ' ')));
    return BES.icon(hit ? INDUSTRY[hit] : 'briefcase');
  };
})();
