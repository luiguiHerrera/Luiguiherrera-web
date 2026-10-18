// Shared by the offline generator, presentation and adversarial regression tests.
export function closeLocationBucket(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return null;
  return value <= .33 ? 0 : value >= .67 ? 2 : 1;
}

export function commonPricePaths(series, width = 100, height = 44) {
  const values = series.flatMap(p => [p.close, p.ma200]).filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!values.length) return { close: '', ma200: '' };
  const min = Math.min(...values), spread = Math.max(Math.max(...values) - min, 1);
  const paths = {};
  for (const key of ['close', 'ma200']) {
    let connected = false;
    paths[key] = series.map((point, i) => {
      const value = point[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) { connected = false; return ''; }
      const command = connected ? 'L' : 'M'; connected = true;
      return `${command} ${(i / Math.max(series.length - 1, 1) * width).toFixed(2)} ${(height - ((value - min) / spread) * (height - 8) - 4).toFixed(2)}`;
    }).filter(Boolean).join(' ');
  }
  return paths;
}

function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

// Daily = UTC date; weekly = Monday of the ISO week; monthly = first of month.
// This matches the same calendar period across exchange and 24/7 assets.
export function canonicalPeriodDate(date, frequency) {
  if (!validDate(date)) return null;
  if (frequency === 'daily') return date;
  if (frequency === 'monthly') return `${date.slice(0, 7)}-01`;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function isCompletedPeriod(date, frequency, asOf) {
  const key = canonicalPeriodDate(date, frequency);
  const current = canonicalPeriodDate(asOf.slice(0, 10), frequency);
  return key !== null && current !== null && key < current;
}

export function datedCorrelation(first, second, minimum = 20) {
  function index(rows) {
    const map = new Map(), duplicates = new Set();
    for (const row of rows) {
      if (!validDate(row.date)) continue;
      if (map.has(row.date)) duplicates.add(row.date);
      map.set(row.date, row.value);
    }
    // Ambiguous duplicate dates are unavailable, never paired arbitrarily.
    for (const date of duplicates) map.delete(date);
    return map;
  }
  const a = index(first), b = index(second), pairs = [];
  for (const date of [...a.keys()].sort()) {
    const x = a.get(date), y = b.get(date);
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) pairs.push({ date, x, y });
  }
  const n = pairs.length;
  if (n < minimum) return { value: null, n };
  const mx = pairs.reduce((s, p) => s + p.x, 0) / n, my = pairs.reduce((s, p) => s + p.y, 0) / n;
  let numerator = 0, xx = 0, yy = 0;
  for (const { x, y } of pairs) { numerator += (x - mx) * (y - my); xx += (x - mx) ** 2; yy += (y - my) ** 2; }
  const denominator = Math.sqrt(xx * yy);
  return { value: denominator === 0 ? null : Number((numerator / denominator).toFixed(3)), n };
}

// A date is disclosed even when N is too small for a coefficient. Weekly/monthly
// joins use canonical keys; through dates conservatively use the earlier actual
// completed observation end from the final matched pair.
export function datedCorrelationEvidence(first, second, minimum = 20) {
  const valid = rows => {
    const map = new Map(), duplicates = new Set();
    for (const row of rows) {
      if (!validDate(row.date)) continue;
      if (map.has(row.date)) duplicates.add(row.date);
      map.set(row.date, row);
    }
    for (const date of duplicates) map.delete(date);
    return map;
  };
  const a = valid(first), b = valid(second);
  const dates = [...a.keys()].filter(date => Number.isFinite(a.get(date).value) && Number.isFinite(b.get(date)?.value)).sort();
  const last = dates.at(-1);
  const through = last ? [a.get(last).observedThrough ?? last, b.get(last).observedThrough ?? last].sort()[0] : null;
  return { ...datedCorrelation(first, second, minimum), effectiveThroughDate: through };
}

export const dailyReturnAliases = [
  { oldAlias: '1W', periods: 4, alias: '4D', es: '4 sesiones diarias', en: '4 daily sessions' },
  { oldAlias: '1M', periods: 12, alias: '12D', es: '12 sesiones diarias', en: '12 daily sessions' },
  { oldAlias: '3M', periods: 52, alias: '52D', es: '52 sesiones diarias', en: '52 daily sessions' },
  { oldAlias: '6M', periods: 126, alias: '126D', es: '126 sesiones diarias', en: '126 daily sessions' },
  { oldAlias: '1Y', periods: 252, alias: '252D', es: '252 sesiones diarias', en: '252 daily sessions' },
];
