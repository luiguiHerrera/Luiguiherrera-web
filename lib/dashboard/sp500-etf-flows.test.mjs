import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionDates } from '../research/mcclellan-core.mjs';
import { buildFundFlows, aggregateFundFlows, flowWindow, interpretFlows, compareRevisions } from './sp500-etf-flows.mjs';
import { parseIvv, parseSpy } from '../../scripts/research/sp500-etf-flows-preview.mjs';
import ExcelJS from 'exceljs';

const asOf = '2026-11-23T18:00:00Z';
const row = (date, shares, nav = 10) => ({ date, shares, nav });
const fund = (rows, ticker = 'SPY', splits = {}) => buildFundFlows(ticker, rows, { asOf, splits });
const aggregate = rows => aggregateFundFlows([fund(rows)], ['SPY']).points;

test('uses daily NAV then sums flows; AUM/price returns cannot become capital flows', () => {
  const points = aggregate([row('2026-11-18', 100, 10), row('2026-11-19', 110, 12), row('2026-11-20', 105, 9)]);
  assert.equal(points[1].flow, 120);
  assert.equal(points[2].flow, -45);
  assert.equal(flowWindow(points, 2).total, 75);
  assert.notEqual(flowWindow(points, 2).total, (105 - 100) * 9);
  assert.equal(aggregate([row('2026-11-19', 100, 10), row('2026-11-20', 100, 13)]).at(-1).flow, 0);
});
test('weekends, US holidays and special exchange closures do not count as sessions', () => {
  assert.equal(fund([row('2026-11-13', 100), row('2026-11-16', 101)]).points.at(-1).flow, 10);
  assert.equal(fund([row('2026-07-02', 100), row('2026-07-06', 101)]).points.at(-1).flow, 10);
  assert.equal(fund([row('2025-01-08', 100), row('2025-01-10', 101)]).points.at(-1).flow, 10);
});
test('rejects non-session rows, open sessions and non-final same-day candidates', () => {
  const f = fund([row('2026-11-20', 100), row('2026-11-21', 110), row('2026-11-23', 120)]);
  assert.deepEqual(f.audit.invalid, ['2026-11-21']);
  assert.deepEqual(f.audit.unclosed, ['2026-11-23']);
  assert.equal(f.points.length, 1);
});
test('a missing session is not zero; no daily flow bridges the missing date', () => {
  const f = fund([row('2026-11-17', 100), row('2026-11-19', 110), row('2026-11-20', 120)]);
  assert.equal(f.points[1].flow, null);
  const points = aggregateFundFlows([f], ['SPY']).points;
  assert.equal(points.find(point => point.date === '2026-11-18').flow, null);
  assert.equal(flowWindow(points, 2), null);
  assert.equal(flowWindow(points, 1).total, 100);
});
test('does not silently compress missing dates supplied by a caller', () => {
  const points = ['2026-11-18', '2026-11-20'].map(date => ({ date, flow: 10, complete: true }));
  assert.equal(flowWindow(points, 2), null);
});
test('aggregates a fixed universe at a common cutoff, never asynchronous fund dates', () => {
  const spy = fund([row('2026-11-18', 100), row('2026-11-19', 110), row('2026-11-20', 120)]);
  const ivv = fund([row('2026-11-18', 200), row('2026-11-19', 190)], 'IVV');
  const result = aggregateFundFlows([spy, ivv], ['SPY', 'IVV']);
  assert.equal(result.cutoffDate, '2026-11-19');
  assert.equal(result.points.at(-1).flow, 0);
  assert.deepEqual(result.lagging, ['SPY']);
  assert.throws(() => aggregateFundFlows([spy], ['SPY', 'IVV']), /Missing fund/);
  assert.throws(() => aggregateFundFlows([spy], ['SPY', 'SPY']), /unique/);
});
test('one missing fund makes an aggregate incomplete rather than changing ETF membership', () => {
  const spy = fund([row('2026-11-17', 100), row('2026-11-18', 110), row('2026-11-19', 120), row('2026-11-20', 130)]);
  const ivv = fund([row('2026-11-17', 200), row('2026-11-19', 210), row('2026-11-20', 220)], 'IVV');
  const result = aggregateFundFlows([spy, ivv], ['SPY', 'IVV']);
  assert.equal(result.points[1].flow, null);
  assert.equal(result.points[2].flow, null);
  assert.equal(result.points[3].flow, 200);
});
test('unverified split-like jumps are quarantined, verified ratios are adjusted', () => {
  const rows = [row('2026-11-19', 100, 20), row('2026-11-20', 200, 10)];
  assert.equal(fund(rows).points.at(-1).status, 'review-required');
  assert.equal(fund(rows, 'SPY', { '2026-11-20': 2 }).points.at(-1).flow, 0);
  const reverse = [row('2026-11-19', 200, 10), row('2026-11-20', 100, 20)];
  assert.equal(fund(reverse, 'SPY', { '2026-11-20': 0.5 }).points.at(-1).flow, 0);
});
test('invalid quantities and inconsistent NAV × shares are excluded', () => {
  const f = fund([row('2026-11-17', 100), row('2026-11-18', 0), { ...row('2026-11-19', 110), assets: 5000 }, row('2026-11-20', 120)]);
  assert.deepEqual(f.audit.invalid, ['2026-11-18']);
  assert.equal(f.audit.anomalies.length, 1);
  assert.equal(f.points.at(-1).flow, null);
});
test('duplicate conflicts fail; revisions are detected by effective date', () => {
  assert.throws(() => fund([row('2026-11-20', 100), row('2026-11-20', 110)]), /conflicting duplicate/);
  assert.equal(fund([row('2026-11-20', 100), row('2026-11-20', 100)]).audit.duplicates.length, 1);
  assert.equal(compareRevisions([row('2026-11-20', 100)], [row('2026-11-20', 101)]).length, 1);
});

function historicalPoints(tail) {
  const dates = sessionDates('2025-01-02', '2026-11-20');
  return dates.map((date, i) => ({ date, flow: i >= dates.length - tail.length ? tail[i - dates.length + tail.length] : i % 2 ? 10 : -10, complete: true }));
}
test('historical consistency rules produce all three states deterministically', () => {
  assert.equal(interpretFlows(historicalPoints([1, 1, 1, 1, 1]), 5).state, 'inflows');
  assert.equal(interpretFlows(historicalPoints([-1, -1, -1, -1, -1]), 5).state, 'outflows');
  assert.equal(interpretFlows(historicalPoints([100, 100, -1, -1, -1]), 5).state, 'mixed');
  assert.equal(interpretFlows(historicalPoints([0, 0, 0, 0, 0]), 5).state, 'mixed');
});
test('no arbitrary USD minimum; scaling all flows preserves the interpretation', () => {
  const points = historicalPoints([1, 1, 1, 1, 1]);
  assert.equal(interpretFlows(points, 5).state, interpretFlows(points.map(point => ({ ...point, flow: point.flow * 1e9 })), 5).state);
});
test('calibration excludes current window; sparse histories cannot claim mixed flows', () => {
  const points = historicalPoints([1, 1, 1, 1, 1]);
  const result = interpretFlows(points, 5);
  assert.ok(result.calibration.end < result.current.start);
  assert.equal(interpretFlows(points.slice(-30), 20).state, 'unavailable');
});
test('IVV parser maps fund shares, not portfolio holding quantities, and rejects schema drift', () => {
  const xml = '<ss:Workbook><ss:Data>iShares Core S&amp;P 500 ETF</ss:Data><ss:Worksheet ss:Name="Historical"><ss:Row>' + ['As Of', 'NAV per Share', 'Ex-Dividends', 'Shares Outstanding'].map(v => `<ss:Cell><ss:Data ss:Type="String">${v}</ss:Data></ss:Cell>`).join('') + '</ss:Row><ss:Row><ss:Cell><ss:Data ss:Type="String">Nov 20, 2026</ss:Data></ss:Cell><ss:Cell><ss:Data ss:Type="Number">12.25</ss:Data></ss:Cell><ss:Cell/><ss:Cell><ss:Data ss:Type="Number">1000</ss:Data></ss:Cell></ss:Row></ss:Worksheet></ss:Workbook>';
  assert.deepEqual(parseIvv(Buffer.from(xml)), [{ date: '2026-11-20', nav: 12.25, shares: 1000 }]);
  assert.throws(() => parseIvv(Buffer.from(xml.replace('NAV per Share', 'Price'))), /schema/);
});
test('SPY parser uses exact workbook values rather than rounded web millions', async () => {
  const w = new ExcelJS.Workbook(); const s = w.addWorksheet('navhist');
  s.getCell('B2').value = 'SPY';s.getRow(4).values = ['Date', 'NAV', 'Shares Outstanding', 'Total Net Assets'];
  s.getRow(5).values = ['20-Nov-2026', 689.507034, 1054382116, 727003885626.79];
  const rows = await parseSpy(await w.xlsx.writeBuffer());
  assert.equal(rows[0].shares, 1054382116);assert.equal(rows[0].nav, 689.507034);
});
