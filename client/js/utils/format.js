window.BES = window.BES || {};

BES.money = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${v < 0 ? '-' : ''}$${formatted}`;
};

BES.pct = (n) => `${Math.round((Number(n) || 0) * 10) / 10}`;

BES.delta = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) < 0.05) return '';
  const sign = v > 0 ? '↑' : '↓';
  return `${sign} ${v > 0 ? '+' : ''}${Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(1)}`;
};

BES.clsDelta = (n) => (Number(n) > 0 ? 'up' : Number(n) < 0 ? 'down' : '');

BES.prettyKey = (key) =>
  String(key)
    .replace(/Delta$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());

BES.uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);

BES.when = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

BES.escape = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

BES.spark = (values, color = '#d4a017') => {
  const nums = (values || []).map(Number);
  if (nums.length < 2) return `<svg class="chart" viewBox="0 0 300 120" role="img" aria-label="Trend"></svg>`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pts = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * 300;
      const y = 110 - ((v - min) / span) * 90;
      return `${x},${y}`;
    })
    .join(' ');
  return `<svg class="chart" viewBox="0 0 300 120" role="img" aria-label="Trend"><polyline fill="none" stroke="${color}" stroke-width="3" points="${pts}" /></svg>`;
};
