import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpyFlowPublisher } from './spy-flow-publication.mjs';
import { CapitalFlowSourceError } from './capital-flows-source.mjs';
import { sessionDates } from '../research/mcclellan-core.mjs';

const asOf = '2026-11-26T22:00:00Z';
function model(cutoffDate, amount = 100) {
  return { id: 'sp500', cutoffDate, refreshMode: 'automatic', vehicles: ['SPY'],
    points: sessionDates('2024-01-02', cutoffDate).slice(-400).map(date => ({ date, flow: amount, complete: true, funds: [] })),
    retrievedAt: asOf, sourceHash: `source-${cutoffDate}-${amount}`, comparisons: [] };
}
function harness() {
  const entries = new Map();
  const cache = { get: async key => structuredClone(entries.get(key) ?? null),
    set: async (key, value) => { entries.set(key, structuredClone(value)); } };
  let clock = Date.parse(asOf), candidate = model('2026-11-24'), failure, calls = 0;
  const requests = [];
  const options = { cache, seed: model('2026-11-20'), now: () => clock,
    fetchSource: async (id, options) => { calls++; requests.push({id, ...options}); if (failure) throw failure; return candidate; } };
  return { entries, cache, options, get: createSpyFlowPublisher(options),
    restart: () => createSpyFlowPublisher(options), requests, calls: () => calls,
    source: value => { candidate = value; failure = undefined; },
    fail: () => { failure = new CapitalFlowSourceError('Source HTTP 503'); },
    advance: () => { clock += 3_600_001; } };
}

test('a valid SPY cut advances 20 -> 24 although the last closed session is 25', async () => {
  const h = harness(); const current = await h.get();
  assert.equal(current.cutoffDate, '2026-11-24'); assert.equal(current.lastRefreshError, undefined);
  assert.equal(h.requests[0].minimumCutoffDate, '2026-11-20');
  assert.equal(h.entries.get('cut:2026-11-24').sourceHash, current.sourceHash);
  await h.restart()(); assert.equal(h.calls(), 1, 'another instance reuses the hourly attempt and persisted cut');
});

test('provider rollback and outage retain the newest date, bytes, hash and acquisition instant across instances', async () => {
  const h = harness(); const original = await h.get(); const bytes = JSON.stringify(original);
  h.source(model('2026-11-23')); const rollback = await h.restart()(true);
  assert.equal(rollback.cutoffDate, '2026-11-24'); assert.match(rollback.lastRefreshError, /moved backwards/);
  h.fail(); const outage = await h.restart()(true);
  assert.equal(outage.cutoffDate, original.cutoffDate); assert.equal(outage.sourceHash, original.sourceHash);
  assert.equal(outage.retrievedAt, original.retrievedAt); assert.deepEqual(outage.points, original.points);
  assert.equal(JSON.stringify(h.entries.get('cut:2026-11-24')), bytes);
  assert.equal(h.entries.has('cut:2026-11-23'), false);
});

test('a recovered source advances to 25 and valid same-date revisions recalculate the publication', async () => {
  const h = harness(); await h.get(); h.fail(); await h.get(true);
  h.source(model('2026-11-25')); const recovered = await h.get(true);
  assert.equal(recovered.cutoffDate, '2026-11-25'); assert.equal(recovered.lastRefreshError, undefined);
  h.source(model('2026-11-25', 200)); const revised = await h.get(true);
  assert.equal(revised.points.at(-1).flow, 200); assert.notEqual(revised.sourceHash, recovered.sourceHash);
});

test('two instances completing out of order cannot erase or return an older published date', async () => {
  const h = harness(); let resolveNew, resolveOld;
  const newPending = new Promise(resolve => { resolveNew = resolve; });
  const oldPending = new Promise(resolve => { resolveOld = resolve; });
  const newer = createSpyFlowPublisher({...h.options, fetchSource: () => newPending});
  const older = createSpyFlowPublisher({...h.options, fetchSource: () => oldPending});
  const a = newer(true), b = older(true);
  resolveNew(model('2026-11-25')); assert.equal((await a).cutoffDate, '2026-11-25');
  resolveOld(model('2026-11-24')); assert.equal((await b).cutoffDate, '2026-11-25');
  h.fail(); assert.equal((await h.restart()(true)).cutoffDate, '2026-11-25');
});

test('cold failure uses the dated seed and programming errors are propagated', async () => {
  const h = harness(); h.fail(); const fallback = await h.get();
  assert.equal(fallback.cutoffDate, '2026-11-20'); assert.match(fallback.lastRefreshError, /503/);
  assert.equal([...h.entries.keys()].some(key => key.startsWith('cut:')), false);
  const error = new TypeError('bug');
  const get = createSpyFlowPublisher({...h.options, fetchSource: async () => { throw error; }});
  await assert.rejects(get(true), failure => failure === error);
});
