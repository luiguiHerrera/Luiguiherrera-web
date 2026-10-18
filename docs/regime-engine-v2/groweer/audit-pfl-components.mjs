// Offline Groweer diagnostic: frozen PFL components on preserved P8 sector prices.
// Run through scripts/trends-test-register.mjs; stdout is the reproducible result.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  simpleReturns, sampleCovariance, correlationFromCovariance,
  portfolioRisk, behaviourClusters,
} from '../../../lib/portfolio-fragility/engine.ts';
import { buildDemoHistory } from '../../../lib/portfolio-fragility/demo-data.ts';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rawDir = 'docs/regime-engine-v2/p8/evidence/';
const tickers = ['XLK', 'XLY', 'XLC', 'XLF', 'XLE', 'XLI', 'XLB', 'XLV', 'XLP', 'XLU', 'XLRE'].sort();
const lineage = [];
function series(ticker) {
  const path = `${rawDir}yahoo-${ticker}.json.gz`;
  const raw = gunzipSync(readFileSync(path));
  const metadata = read(`${rawDir}yahoo-${ticker}.json.metadata.json`);
  const sha = createHash('sha256').update(raw).digest('hex');
  assert.equal(sha, metadata.raw_sha256);
  const frame = JSON.parse(raw).chart.result[0];
  assert.equal(frame.meta.symbol, ticker);
  assert.equal(frame.meta.currency, 'USD');
  const adjusted = frame.indicators.adjclose[0].adjclose;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: frame.meta.exchangeTimezoneName, year: 'numeric', month: '2-digit', day: '2-digit' });
  const rows = new Map();
  const rejected = [];
  frame.timestamp.forEach((stamp, i) => {
    const date = fmt.format(new Date(stamp * 1000));
    if (typeof adjusted[i] !== 'number' || !Number.isFinite(adjusted[i]) || adjusted[i] <= 0) {
      rejected.push({ date, reason: 'MISSING_OR_INVALID_NATIVE_ADJCLOSE' });
      return;
    }
    assert.ok(!rows.has(date), `Duplicate native date ${ticker} ${date}`);
    rows.set(date, adjusted[i]);
  });
  lineage.push({ ticker, path, raw_sha256: sha, captured_at: metadata.captured_at,
    available_at: metadata.available_at, source_published_at: metadata.source_published_at,
    replay_class: 'R2', rows: rows.size, first: [...rows.keys()][0], last: [...rows.keys()].at(-1), rejected });
  return rows;
}
const prices = new Map(tickers.map((ticker) => [ticker, series(ticker)]));
const calendar = [...series('SPY').keys()].sort();
const baseline = read('docs/regime-engine-v2/sweeper/historical-r2-output.json');
const rows = [], excluded = [];
const weights = tickers.map(() => 1 / tickers.length);
// Match the existing PFL 60-return minimum and 252-return maximum exactly.
for (const day of baseline) {
  const end = calendar.indexOf(day.date);
  assert.ok(end >= 0);
  const fullWindow = calendar.slice(Math.max(0, end - 252), end + 1);
  // Trim only the initial pre-inception prefix; never drop an interior missing session.
  const firstCommon = fullWindow.findIndex((date) => tickers.every((ticker) => prices.get(ticker).has(date)));
  if (firstCommon < 0) { excluded.push({ date: day.date, reason: 'NO_COMMON_NATIVE_HISTORY' }); continue; }
  const dates = fullWindow.slice(firstCommon);
  const absent = dates.flatMap((date) => tickers.filter((ticker) => !prices.get(ticker).has(date)).map((ticker) => ({ date, ticker })));
  if (absent.length) { excluded.push({ date: day.date, reason: 'INTERIOR_MISSING_SESSION', absent }); continue; }
  const values = dates.map((date) => tickers.map((ticker) => prices.get(ticker).get(date)));
  const returns = simpleReturns(dates, values);
  if (returns.status !== 'OK') { excluded.push({ date: day.date, reason: returns.reason_code }); continue; }
  if (returns.excluded_gap_end_dates.length) { excluded.push({ date: day.date, reason: 'GAPPED_SESSION_WINDOW' }); continue; }
  const cov = sampleCovariance(tickers, returns.returns);
  if (cov.status !== 'OK') { excluded.push({ date: day.date, reason: cov.reason_code }); continue; }
  const corr = correlationFromCovariance(tickers, cov.covariance_daily);
  if (corr.status !== 'OK') { excluded.push({ date: day.date, reason: corr.reason_code }); continue; }
  const risk = portfolioRisk(tickers, weights, cov.covariance_annual);
  const cluster = behaviourClusters(tickers, weights, corr.correlation, cov.observation_count);
  if (risk.status !== 'OK' || cluster.status !== 'OK') {
    excluded.push({ date: day.date, reason: risk.status !== 'OK' ? risk.reason_code : cluster.reason_code }); continue;
  }
  rows.push({ date: day.date, regime: day.regime, canonical_c: day.pillarStates.fragility,
    first_window_date: dates[0], last_window_date: dates.at(-1), return_observations: cov.observation_count,
    quality_flags: [...new Set([...cov.quality_flags, ...cluster.quality_flags])],
    cluster_count: cluster.cluster_count, largest_cluster_capital_share: cluster.largest_cluster_capital_share,
    diversification_ratio: risk.diversification_ratio, portfolio_volatility_annual: risk.portfolio_volatility,
    risk_contribution_hhi: risk.percentage_contribution.reduce((sum, x) => sum + x * x, 0),
    portfolio_capital_hhi: weights.reduce((sum, x) => sum + x * x, 0) });
}
const demo = buildDemoHistory();
const demoDates = [...new Set(demo.map((row) => row.date))].sort();
const demoRanges = [];
for (const date of demoDates) {
  const previous = demoRanges.at(-1);
  if (!previous || Date.parse(date) - Date.parse(previous.end) > 7 * 86400000) demoRanges.push({ start: date, end: date, dates: 1 });
  else { previous.end = date; previous.dates++; }
}
assert.equal(rows.length + excluded.length, baseline.length);
assert.ok(rows.every((row) => row.last_window_date === row.date && row.return_observations >= 60 && row.return_observations <= 252));
assert.ok(rows.every((row) => Math.abs(row.portfolio_capital_hhi - 1 / 11) < 1e-12));
process.stdout.write(JSON.stringify({
  scope: 'Same-price-family diagnostic; no canonical integration, new core family, prediction or OOS claim.',
  universe: tickers, weights, window: { minimum_returns: 60, maximum_returns: 252, clustering_threshold: 0.7 },
  price_basis: 'Actual Yahoo native adjclose from preserved P8 bytes, with no quote.close fallback.',
  calendar: 'Same SPY observed-session R2 proxy, no future rows or interior date deletion.',
  methodology_note: 'PFL functions retain their original constants. Equal weights are an explicit hypothetical portfolio for compatibility, not observed market holdings.',
  local_demo: { actual_market_observations: 0, rows: demo.length, distinct_dates: demoDates.length,
    tickers: [...new Set(demo.map((row) => row.assetId))].sort(), ranges: demoRanges,
    source: demo[0].source, provenance: demo[0].provenance,
    calendar: 'Weekdays generated by code; includes exchange holidays; synthetic only.' },
  native_lineage: lineage, baseline_sessions: baseline.length, eligible_sessions: rows.length, excluded, rows,
}));
