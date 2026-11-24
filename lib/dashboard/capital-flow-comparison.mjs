import { flowWindow } from './sp500-etf-flows.mjs';
import { isClosed, isSession, sessionDates } from '../research/mcclellan-core.mjs';

export function metricAt(points, sessions, end = points.length - 1, observations) {
  const current = flowWindow(points, sessions, end);
  if (!current) return null;
  if (!observations) return current.total;
  // Preserve the existing GLD proxy convention: endpoint share change × final NAV.
  const index = observations.findIndex(row => row.date === current.end);
  const latest = observations[index], base = observations[index - sessions];
  if (!latest || !base || sessionDates(base.date, latest.date).length !== sessions + 1) return null;
  return (latest.shares - base.shares) * latest.nav;
}

export function compareFlowWindow(points, sessions, observations) {
  const current = metricAt(points, sessions, points.length - 1, observations);
  const samples = [];
  for (let end = points.length - sessions - 1; end >= sessions - 1 && samples.length < 252; end--) {
    const value = metricAt(points, sessions, end, observations);
    if (value != null) samples.push({ value, start: points[end - sessions + 1].date, end: points[end].date });
  }
  return { current, average: samples.length >= 20 ? samples.reduce((sum, row) => sum + row.value, 0) / samples.length : null,
    samples: samples.length, referenceStart: samples.at(-1)?.start ?? null, referenceEnd: samples[0]?.end ?? null };
}

export function summarizeFlowWindow(points) {
  const valid = points.filter(point => point.flow != null && point.complete);
  const complete = valid.length === points.length && points.length > 0;
  const positive = valid.filter(point => point.flow > 0), negative = valid.filter(point => point.flow < 0);
  const largestInflow = positive.reduce((best, point) => !best || point.flow > best.flow ? point : best, null);
  const largestOutflow = negative.reduce((best, point) => !best || point.flow < best.flow ? point : best, null);
  const last = points.at(-1);
  const sign = last?.flow == null ? 0 : Math.sign(last.flow);
  let streak = 0;
  if (sign) for (let i = points.length - 1; i >= 0; i--) {
    if (!points[i].complete || points[i].flow == null || Math.sign(points[i].flow) !== sign) break;
    streak++;
  }
  return { complete, total: complete ? valid.reduce((sum, point) => sum + point.flow, 0) : null,
    positive: positive.length, negative: negative.length, zero: valid.length - positive.length - negative.length,
    missing: points.length - valid.length, inflows: complete ? positive.reduce((sum, point) => sum + point.flow, 0) : null,
    outflows: complete ? negative.reduce((sum, point) => sum + point.flow, 0) : null,
    largestInflow, largestOutflow, streak, streakSign: sign };
}

function publishedNumber(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (!text || text === '-' || text === '–' || text === '—' || text.toLowerCase() === 'n/a') return null;
  const valueNumber = Number(/^\([\d.]+\)$/.test(text) ? '-' + text.slice(1, -1) : text);
  return Number.isFinite(valueNumber) ? valueNumber : null;
}

export function parsePublishedBtcRows(rows, asOf) {
  const headers = rows.find(row => row[0] === 'Date' && row.at(-1) === 'Total');
  if (!headers || headers.length < 5) throw new Error('Unexpected published BTC table');
  const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
  const byDate = new Map(), excluded = [];
  for (const cells of rows) {
    const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(cells[0] ?? '');
    if (!match || !months[match[2]]) continue;
    const date = `${match[3]}-${months[match[2]]}-${match[1].padStart(2,'0')}`;
    if (!isSession(date) || !isClosed(date, asOf)) { excluded.push({ date, reason: 'Non-session or not closed' }); continue; }
    const values = cells.slice(1, -1).map(publishedNumber);
    const total = publishedNumber(cells.at(-1));
    const numeric = values.filter(value => value != null);
    // An all-dash fund row with a displayed 0 total is a placeholder, never a zero flow.
    if (cells.length !== headers.length || total == null || !numeric.length) { excluded.push({ date, reason: 'Incomplete published row' }); continue; }
    const discrepancy = Math.abs(total - numeric.reduce((sum, value) => sum + value, 0));
    if (discrepancy > (numeric.length + 1) * 0.05 + 1e-6) { excluded.push({ date, reason: 'Total does not reconcile within displayed rounding' }); continue; }
    const point = { date, flow: total * 1e6, complete: true,
      funds: values.map((value, i) => ({ ticker: headers[i + 1], flow: value == null ? null : value * 1e6 })) };
    if (byDate.has(date) && byDate.get(date).flow !== point.flow) throw new Error('Conflicting published BTC totals');
    byDate.set(date, point);
  }
  const dates = [...byDate.keys()].sort();
  if (!dates.length) return { points: [], excluded, vehicles: headers.slice(1, -1) };
  const points = sessionDates(dates[0], dates.at(-1)).map(date => byDate.get(date) ?? { date, flow: null, complete: false, funds: [] });
  return { points, excluded, vehicles: headers.slice(1, -1) };
}
