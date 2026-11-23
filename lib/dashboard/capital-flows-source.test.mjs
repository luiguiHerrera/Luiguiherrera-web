import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { buildCapitalFlowModel, fetchCapitalFlowSource, latestClosedFlowSession, parseFarsideHistory, CAPITAL_FLOW_SOURCES } from './capital-flows-source.mjs';
import { sessionDates } from '../research/mcclellan-core.mjs';

const asOf = '2026-11-23T20:00:00Z';
const dates = sessionDates('2024-01-02', '2026-11-20').slice(-450);
async function workbook(ticker = 'SPY', rows = dates) {
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('navhist');
  sheet.getCell('B2').value = ticker;
  sheet.getRow(4).values = ['Date', 'NAV', 'Shares Outstanding', 'Total Net Assets'];
  rows.forEach((date, i) => sheet.addRow([new Date(`${date}T12:00Z`), 100 + i / 100, 10000 + i * 10, (100 + i / 100) * (10000 + i * 10)]));
  return Buffer.from(await book.xlsx.writeBuffer());
}
const englishDate = date => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00Z`)).replace('Sept', 'Sep');
const html = (rows = dates) => `<table><tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>GBTC</th><th>Total</th></tr>${rows.map(date => `<tr><td>${englishDate(date)}</td><td>2.0</td><td>1.0</td><td>(1.0)</td><td>2.0</td></tr>`).join('')}</table>`;

test('closed-session freshness handles NY close, DST, weekends, holidays and the one-hour buffer', () => {
  assert.equal(latestClosedFlowSession(asOf), '2026-11-20');
  assert.equal(latestClosedFlowSession('2026-11-23T21:59:59Z'), '2026-11-20');
  assert.equal(latestClosedFlowSession('2026-11-23T22:00:00Z'), '2026-11-23');
  assert.equal(latestClosedFlowSession('2026-11-27T17:59:59Z'), '2026-11-25');
  assert.equal(latestClosedFlowSession('2026-11-27T19:00:00Z'), '2026-11-27');
  assert.equal(latestClosedFlowSession('2026-07-03T21:00:00Z'), '2026-07-02');
});
test('automated SP500 is SPY throughout, with no IVV contributions or raw observations published', async () => {
  const model = await buildCapitalFlowModel('sp500', await workbook(), asOf);
  assert.deepEqual(model.vehicles, ['SPY']);
  assert.equal(model.points.length, 400);
  assert.equal(model.cutoffDate, '2026-11-20');
  assert.equal(model.comparisons[0].current, 10 * (100 + 449 / 100));
  assert.ok(model.comparisons.every(metric => metric.samples === 252));
  assert.ok(model.points.every(point => point.funds.length === 0 && !('shares' in point) && !('nav' in point)));
  assert.equal('observations' in model, false);
  assert.match(model.sourceHash, /^[a-f0-9]{64}$/);
});
test('GLD preserves endpoint NAV for headlines and averages while chart sums daily NAV', async () => {
  const model = await buildCapitalFlowModel('gold', await workbook('GLD'), asOf);
  const five = model.comparisons.find(metric => metric.sessions === 5);
  assert.equal(five.current, 50 * (100 + 449 / 100));
  assert.notEqual(five.current, model.points.slice(-5).reduce((sum, point) => sum + point.flow, 0));
  assert.equal(model.metricBasis, 'ending-nav');
});
test('published BTC uses complete archive, validates totals, and removes raw fund contributions', async () => {
  const model = await buildCapitalFlowModel('btc', Buffer.from(html()), asOf);
  assert.equal(model.points.length, 400);
  assert.deepEqual(model.comparisons.map(metric => metric.current), [2e6, 10e6, 40e6]);
  assert.equal(model.cutoffDate, '2026-11-20');
  assert.ok(model.points.every(point => point.funds.length === 0));
});
test('ambiguous BTC tables and changed headers fail instead of selecting a different source', () => {
  assert.throws(() => parseFarsideHistory(html() + html()), /schema/);
  assert.throws(() => parseFarsideHistory('<table><tr><th>Date</th><th>Total</th></tr></table>'), /schema/);
});
test('a missing negotiated session or truncated archive cannot replace validated history', async () => {
  const missing = dates.filter((_, i) => i !== dates.length - 10);
  await assert.rejects(buildCapitalFlowModel('sp500', await workbook('SPY', missing), asOf), /Incomplete/);
  await assert.rejects(buildCapitalFlowModel('btc', Buffer.from(html(missing)), asOf), /Incomplete/);
  await assert.rejects(buildCapitalFlowModel('btc', Buffer.from(html(dates.slice(-30))), asOf), /Incomplete/);
});
test('all-dash BTC placeholders cannot advance the effective closing date', async () => {
  const input = html().replace('</table>', '<tr><td>23 Nov 2026</td><td>-</td><td>-</td><td>-</td><td>0.0</td></tr></table>');
  const model = await buildCapitalFlowModel('btc', Buffer.from(input), '2026-11-24T07:00:00Z');
  assert.equal(model.cutoffDate, '2026-11-20');
});
test('HTTP failures, empty bodies, oversize and invalid documents are rejected before caching', async () => {
  for (const response of [new Response('', { status: 403 }), new Response(''), new Response('x', { headers: { 'Content-Length': '12000001' } }), new Response('<html>challenge</html>')]) {
    await assert.rejects(fetchCapitalFlowSource('sp500', { asOf, fetcher: async () => response }));
  }
});
test('automatic fetch uses named public source, bounded request and no private credentials', async () => {
  let request;
  const bytes = await workbook();
  const model = await fetchCapitalFlowSource('sp500', { asOf, fetcher: async (url, options) => { request = { url, options }; return new Response(bytes); } });
  assert.equal(request.url, CAPITAL_FLOW_SOURCES.sp500.url);
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.redirect, 'error');
  assert.equal('authorization' in request.options.headers, false);
  assert.equal(model.refreshMode, 'automatic');
});
test('stale source cannot overwrite cache even when its historical data are internally valid', async () => {
  const bytes = await workbook();
  await assert.rejects(fetchCapitalFlowSource('sp500', { asOf: '2026-11-24T07:00:00Z', fetcher: async () => new Response(bytes) }), /Latest closed session/);
});
test('BTC uses the archive public REST representation and validates its identity', async () => {
  let requested;
  const page = { id: 1321, link: CAPITAL_FLOW_SOURCES.btc.url, content: { rendered: html() } };
  const model = await fetchCapitalFlowSource('btc', { asOf, fetcher: async url => { requested = url; return Response.json(page); } });
  assert.equal(requested, CAPITAL_FLOW_SOURCES.btc.download);
  assert.equal(model.comparisons[0].current, 2e6);
  for (const change of [{ id: 8 }, { link: 'https://example.com/' }, { content: { rendered: null } }]) {
    await assert.rejects(fetchCapitalFlowSource('btc', { asOf, fetcher: async () => Response.json({ ...page, ...change }) }), /identity/);
  }
});
test('revisions are recalculated from the full fetched history rather than appended to stale values', async () => {
  const book = new ExcelJS.Workbook(); await book.xlsx.load(await workbook());
  const sheet = book.getWorksheet('navhist'), row = sheet.lastRow;
  row.getCell(3).value += 100;
  row.getCell(4).value = row.getCell(2).value * row.getCell(3).value;
  const model = await buildCapitalFlowModel('sp500', Buffer.from(await book.xlsx.writeBuffer()), asOf);
  assert.equal(model.comparisons[0].current, 110 * (100 + 449 / 100));
});
