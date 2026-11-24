// Pure preview calculation. USD throughout; never substitute AUM changes for flows.
import { isSession, isClosed, sessionDates } from '../research/mcclellan-core.mjs';

export const INTERPRETATION_RULE = { percentile: 0.9, minimumHistory: 60, maximumHistory: 252 };
const sum = values => values.reduce((total, value) => total + value, 0);

export function quantile(values, probability) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  // Nearest rank: a reproducible observed frequency, without interpolation.
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
}

export function buildFundFlows(ticker, observations, { asOf, splits = {} }) {
  if (!Number.isFinite(Date.parse(asOf))) throw new Error('Invalid acquisition instant');
  const byDate = new Map();
  const audit = { received: observations.length, invalid: [], unclosed: [], duplicates: [], anomalies: [], gaps: [] };
  for (const row of observations) {
    // This preview deliberately uses only the independently supported 2024–2028 calendar.
    if (typeof row.date !== 'string' || row.date < '2024-01-01' || row.date > '2028-12-31') continue;
    if (!isSession(row.date)) { audit.invalid.push(row.date); continue; }
    if (!isClosed(row.date, asOf)) { audit.unclosed.push(row.date); continue; }
    if (!(Number.isFinite(row.nav) && row.nav > 0 && Number.isSafeInteger(row.shares) && row.shares > 0)) {
      audit.invalid.push(row.date); continue;
    }
    if (byDate.has(row.date)) {
      const previous = byDate.get(row.date);
      if (previous.nav !== row.nav || previous.shares !== row.shares) throw new Error(`${ticker}: conflicting duplicate ${row.date}`);
      audit.duplicates.push(row.date); continue;
    }
    if (row.assets != null && (!Number.isFinite(row.assets) || row.assets <= 0 || Math.abs(row.nav * row.shares / row.assets - 1) > 0.0001)) {
      audit.anomalies.push({ date: row.date, reason: 'NAV × shares does not reconcile with reported assets' });
      continue;
    }
    byDate.set(row.date, { date: row.date, shares: row.shares, nav: row.nav });
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const points = rows.map((row, index) => {
    const previous = rows[index - 1];
    const point = { ...row, ticker, previousShares: previous?.shares ?? null, splitFactor: 1, deltaShares: null, flow: null, status: 'baseline' };
    if (!previous) return point;
    if (sessionDates(previous.date, row.date).length !== 2) {
      audit.gaps.push(row.date); return { ...point, status: 'missing-previous-session' };
    }
    const splitFactor = splits[row.date] ?? 1;
    if (!Number.isFinite(splitFactor) || splitFactor <= 0) throw new Error('Invalid verified split factor');
    const shareRatio = row.shares / previous.shares;
    const navRatio = row.nav / previous.nav;
    const splitLike = [2, 3, 4, 5, 10, 0.5, 1 / 3, 0.25, 0.2, 0.1].some(ratio =>
      Math.abs(shareRatio / ratio - 1) <= 0.01 && Math.abs(navRatio * ratio - 1) <= 0.15);
    if (splitFactor === 1 && (splitLike || Math.abs(navRatio - 1) > 0.35)) {
      audit.anomalies.push({ date: row.date, reason: 'Unverified corporate action or exceptional NAV change' });
      return { ...point, status: 'review-required' };
    }
    const deltaShares = row.shares - previous.shares * splitFactor;
    return { ...point, splitFactor, deltaShares, flow: deltaShares * row.nav, status: 'complete' };
  });
  return { ticker, points, audit };
}

export function aggregateFundFlows(funds, included) {
  if (!included.length || new Set(included).size !== included.length) throw new Error('A fixed, unique ETF universe is required');
  const selected = included.map(ticker => {
    const fund = funds.find(fund => fund.ticker === ticker);
    if (!fund?.points.length) throw new Error(`Missing fund: ${ticker}`);
    return fund;
  });
  const end = selected.map(fund => fund.points.at(-1).date).sort()[0];
  const start = selected.map(fund => fund.points[0].date).sort().at(-1);
  if (start > end) return { points: [], cutoffDate: null, lagging: [] };
  const indexes = selected.map(fund => new Map(fund.points.map(point => [point.date, point])));
  const points = sessionDates(start, end).map(date => {
    const members = indexes.map(index => index.get(date));
    const complete = members.every(point => point?.status === 'complete' && Number.isFinite(point.flow));
    return { date, flow: complete ? sum(members.map(point => point.flow)) : null,
      funds: members.map((point, i) => ({ ticker: included[i], flow: point?.flow ?? null })), complete };
  });
  return { points, cutoffDate: end, lagging: selected.filter(fund => fund.points.at(-1).date > end).map(fund => fund.ticker) };
}

export function flowWindow(points, sessions, endIndex = points.length - 1) {
  const rows = points.slice(Math.max(0, endIndex - sessions + 1), endIndex + 1);
  if (rows.length !== sessions || rows.some(point => !point.complete || !Number.isFinite(point.flow))) return null;
  // Prevent callers from silently compressing absent exchange sessions.
  if (sessionDates(rows[0].date, rows.at(-1).date).length !== sessions) return null;
  return { total: sum(rows.map(point => point.flow)), positive: rows.filter(point => point.flow > 0).length,
    negative: rows.filter(point => point.flow < 0).length, zero: rows.filter(point => point.flow === 0).length,
    sessions, start: rows[0].date, end: rows.at(-1).date };
}

export function interpretFlows(points, sessions) {
  const current = flowWindow(points, sessions);
  if (!current) return { state: 'unavailable', current: null, calibration: null };
  const prior = [];
  // Calibration observations end BEFORE the current window starts (no look-ahead).
  for (let end = points.length - sessions - 1; end >= sessions - 1 && prior.length < INTERPRETATION_RULE.maximumHistory; end--) {
    const window = flowWindow(points, sessions, end);
    if (window) prior.push(window);
  }
  if (prior.length < INTERPRETATION_RULE.minimumHistory) return { state: 'unavailable', current, calibration: { windows: prior.length } };
  const positiveThreshold = quantile(prior.map(window => window.positive / sessions), INTERPRETATION_RULE.percentile);
  const negativeThreshold = quantile(prior.map(window => window.negative / sessions), INTERPRETATION_RULE.percentile);
  const state = current.total > 0 && current.positive > sessions / 2 && current.positive / sessions >= positiveThreshold ? 'inflows'
    : current.total < 0 && current.negative > sessions / 2 && current.negative / sessions >= negativeThreshold ? 'outflows' : 'mixed';
  return { state, current, calibration: { windows: prior.length, positiveThreshold, negativeThreshold,
    start: prior.at(-1).start, end: prior[0].end } };
}

export function compareRevisions(previous, current) {
  const old = new Map(previous.map(row => [row.date, row]));
  return current.filter(row => old.has(row.date) && (old.get(row.date).shares !== row.shares || old.get(row.date).nav !== row.nav))
    .map(row => ({ date: row.date, before: old.get(row.date), after: row }));
}
