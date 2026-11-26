import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { sessionDates } from '../research/mcclellan-core.mjs';
import { EWJ_FLOW_SOURCE, EWJ_FLOW_PAGE, EWJ_FLOW_LICENSE, EWJ_FLOW_METHODOLOGY,
  EWJ_FLOW_METHOD, EwjFlowSourceError, parseEwjFundFeed, fetchEwjFundFeed,
  mergeEwjFlowHistory, buildEwjAutomaticModel } from './ewj-capital-flows-source.mjs';

const asOf = '2026-11-26T12:00:00Z';
const dates = sessionDates('2024-01-02', '2026-11-24').slice(-401);
const fixture = () => {
  const daily = dates.slice(1).map((d, index) => ({ d, navDate: dates[index], src: 'history', house: 'iShares', flow: index === 398 ? 0 : (index % 7 - 3) * 1000 }));
  const window = count => ({ flow: daily.slice(-count).reduce((sum, point) => sum + point.flow, 0), days: count, of: count,
    from: daily.at(-count).d, to: daily.at(-1).d, heartbeat: 0 });
  return { schemaVersion: 3, ticker: 'EWJ', seriesId: 'S000004249', issuer: 'iShares', coverage: 'daily', asOf: daily.at(-1).d,
    cite: { publisher: 'ETFIQ', page: EWJ_FLOW_PAGE, methodology: EWJ_FLOW_METHODOLOGY, as_of: daily.at(-1).d, class: 'ETFIQ-computed', license: EWJ_FLOW_LICENSE },
    daily, heartbeats: [], splits: [], windows: { '1D': window(1), '1W': window(5), '1M': window(21) },
    monthly: [{ src: 'nport', flow: 999999999 }], netAssets: { issuerSecret: 100 }, sharesOutstanding: 200, nav: 50 };
};
const feed = data => ({ data, sourceHash: createHash('sha256').update(JSON.stringify(data)).digest('hex'), retrievedAt: asOf });
const empty = () => ({ points: [], cutoffDate: null });

test('EWJ preserves explicitly reported zero and daily USD units; model recomputes own 20-session window', () => {
  const data = fixture(), published = feed(data), model = buildEwjAutomaticModel(empty(), published, asOf);
  assert.equal(model.id, 'ewj'); assert.equal(model.kind, 'published'); assert.equal(model.metricBasis, 'daily-sum');
  assert.equal(model.refreshMode, 'automatic'); assert.deepEqual(model.vehicles, ['EWJ']);
  assert.equal(model.methodology, EWJ_FLOW_METHOD);
  assert.equal(model.cutoffDate, '2026-11-24'); assert.equal(model.points.length, 400); assert.equal(model.points[398].flow, 0);
  const expected = data.daily.slice(-20).reduce((sum, row) => sum + row.flow, 0);
  assert.equal(model.comparisons.find(metric => metric.sessions === 20).current, expected);
  assert.notEqual(expected, data.windows['1M'].flow);
  for (const metric of model.comparisons) {
    assert.equal(metric.samples, 252);
    const totals = [];
    for (let end = 400 - metric.sessions - 1; totals.length < 252; end--) {
      totals.push(data.daily.slice(end - metric.sessions + 1, end + 1).reduce((sum, row) => sum + row.flow, 0));
    }
    assert.equal(metric.average, totals.reduce((sum, total) => sum + total, 0) / 252);
  }
  assert.equal(model.sourceHash, published.sourceHash);
  const serialized = JSON.stringify(model);
  for (const privateField of ['issuerSecret', 'sharesOutstanding', 'nport', 'netAssets', 'navDate']) assert.ok(!serialized.includes(privateField));
  assert.ok(model.notes.some(note => note.includes('NAV del recuento anterior')));
  assert.ok(model.sources.some(source => source.url === EWJ_FLOW_LICENSE));
});

test('identity, license, source dates, schema and active provider flags fail closed', () => {
  for (const mutate of [
    data => data.ticker = 'IVV', data => data.seriesId = 'other', data => data.issuer = 'Other',
    data => data.coverage = 'monthly', data => data.schemaVersion = 4,
    data => data.cite.class = 'issuer-published', data => data.cite.license = 'other', data => data.cite.publisher = 'Other',
    data => data.asOf = '2026-11-23', data => data.cite.as_of = '2026-11-23',
    data => data.heartbeats.push({ d: data.asOf }), data => data.splits.push({ d: data.asOf }),
    data => data.daily[0].src = 'nport', data => data.daily[0].house = 'Other',
    data => data.daily[0].flow = '0', data => data.daily[0].flow = Infinity,
    data => data.daily[0].navDate = data.daily[0].d,
    data => data.daily.splice(1, 0, { ...data.daily[0] }), data => data.daily.reverse(),
    data => data.daily[0].d = '2026-02-31', data => data.daily[0].d = '2026-11-26',
  ]) { const data = fixture(); mutate(data); assert.throws(() => parseEwjFundFeed(data, asOf)); }
  assert.throws(() => parseEwjFundFeed(fixture(), '2026-11-24T15:00:00Z'), /unclosed/);
  assert.throws(() => parseEwjFundFeed(fixture(), 'bad'), /acquisition/);
});

test('provider 1D/1W totals and declared sessions reconcile within stated USD rounding', () => {
  for (const key of ['1D', '1W']) {
    const data = fixture(), count = data.windows[key].days;
    data.windows[key].flow += count / 2 + 0.5;
    assert.equal(parseEwjFundFeed(data, asOf).length, 400);
    data.windows[key].flow += 0.001;
    assert.throws(() => parseEwjFundFeed(data, asOf), /reconcile/);
  }
  for (const mutate of [data => data.windows['1W'].days--, data => data.windows['1W'].to = '2026-11-23',
    data => data.windows['1D'].heartbeat = 1]) {
    const data = fixture(); mutate(data); assert.throws(() => parseEwjFundFeed(data, asOf));
  }
});

test('gaps and null reports stay unavailable, not zero; complete last400 remains mandatory', () => {
  for (const remove of [false, true]) {
    const data = fixture();
    if (remove) data.daily.splice(100, 1); else data.daily[100].flow = null;
    const merged = mergeEwjFlowHistory(empty(), feed(data), asOf);
    assert.equal(merged.points[100].flow, null); assert.equal(merged.points[100].complete, false);
    assert.throws(() => buildEwjAutomaticModel(empty(), feed(data), asOf), /400 complete/);
  }
  const short = fixture(); short.daily.shift();
  assert.throws(() => buildEwjAutomaticModel(empty(), feed(short), asOf), /400 complete/);
});

test('validated revisions merge, while rollback and invalid retained metadata are rejected', () => {
  const original = fixture(), history = mergeEwjFlowHistory(empty(), feed(original), asOf);
  const revised = fixture(); revised.daily[100].flow += 12;
  const merged = mergeEwjFlowHistory(history, feed(revised), asOf);
  assert.equal(merged.points[100].flow, history.points[100].flow + 12); assert.equal(merged.methodology, EWJ_FLOW_METHOD);
  const missingRevision = fixture(); missingRevision.daily[100].flow = null;
  assert.equal(mergeEwjFlowHistory(history, feed(missingRevision), asOf).points[100].flow, null);
  assert.throws(() => buildEwjAutomaticModel(history, feed(missingRevision), asOf), /400 complete/);
  const older = fixture(); older.daily.pop(); older.asOf = older.cite.as_of = older.daily.at(-1).d; delete older.windows;
  assert.throws(() => mergeEwjFlowHistory(history, feed(older), asOf), /backwards/);
  assert.throws(() => mergeEwjFlowHistory({ ...history, methodology: 'legacy-current-nav' }, feed(revised), asOf), /another method/);
  assert.throws(() => mergeEwjFlowHistory({ ...history, methodology: undefined }, feed(revised), asOf), /another method/);
  assert.throws(() => mergeEwjFlowHistory({ ...history, cutoffDate: '2026-11-25' }, feed(revised), asOf), /retained cutoff/);
  assert.throws(() => mergeEwjFlowHistory(history, { ...feed(revised), sourceHash: 'x' }, asOf), /retrieval metadata/);
});

test('a complete retained history cannot conceal a truncated, gapped or null fresh source', () => {
  const original = fixture(), history = mergeEwjFlowHistory(empty(), feed(original), asOf);
  for (const mutate of [data => data.daily.shift(), data => data.daily.splice(100, 1), data => data.daily[100].flow = null,
    data => {
      data.daily.splice(100, 1);
      const previous = sessionDates('2024-01-02', dates[0]).at(-2);
      data.daily.unshift({ d: dates[0], navDate: previous, src: 'history', house: 'iShares', flow: 0 });
    }]) {
    const data = fixture(); mutate(data);
    assert.throws(() => buildEwjAutomaticModel(history, feed(data), asOf), /fresh 400 complete contiguous/);
  }
  assert.equal(buildEwjAutomaticModel(history, feed(original), asOf).cutoffDate, original.asOf);
});

test('dated archive clipping never includes future points and can store less than the model window', () => {
  const data = fixture(), full = mergeEwjFlowHistory(empty(), feed(data), asOf);
  const through = data.daily[200].d;
  const clipped = mergeEwjFlowHistory(full, feed(data), asOf, through);
  assert.equal(clipped.cutoffDate, through); assert.equal(clipped.points.length, 201);
  assert.ok(clipped.points.every(point => point.date <= through));
  assert.throws(() => mergeEwjFlowHistory(empty(), feed(data), asOf, '2024-01-01'), /no history/);
});

test('transport uses public JSON once with a bounded identified request and exact byte hash', async () => {
  const data = fixture(), bytes = Buffer.from(JSON.stringify(data)); const calls = [];
  const result = await fetchEwjFundFeed({ asOf, fetcher: async (url, options) => {
    calls.push({ url, options }); return new Response(bytes, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  } });
  assert.equal(calls.length, 1); assert.equal(calls[0].url, EWJ_FLOW_SOURCE);
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.cache, 'no-store'); assert.equal(calls[0].options.redirect, 'error');
  assert.match(calls[0].options.headers['User-Agent'], /LuiguiHerreraDashboard/); assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(result.retrievedAt, asOf); assert.deepEqual(result.data, data);
  assert.equal(result.sourceHash, createHash('sha256').update(bytes).digest('hex'));
});

test('transport rejects HTTP failures, non-JSON, malformed JSON and declared or streamed oversize bodies without retries', async () => {
  for (const response of [new Response('denied', { status: 403 }), new Response('{}'),
    new Response('bad', { headers: { 'content-type': 'application/json' } }),
    new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '4000001' } }),
    new Response(' '.repeat(4_000_001), { headers: { 'content-type': 'application/json' } })]) {
    let calls = 0;
    await assert.rejects(fetchEwjFundFeed({ asOf, fetcher: async () => { calls++; return response; } }), EwjFlowSourceError);
    assert.equal(calls, 1);
  }
  await assert.rejects(fetchEwjFundFeed({ asOf, fetcher: async () => { throw new Error('offline'); } }), /unavailable source/);
});
