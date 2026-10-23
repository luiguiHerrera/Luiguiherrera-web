import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readBoundedProviderBody, fetchRaw, assertProviderUniverse, prepareHosted, publishCandidate } from './statistical-levels-hosted.mjs';

// Isolated response/storage doubles: no provider request, AWS call or Git write.
function response(chunks = [Buffer.from('valid')], options = {}) {
  const stats = { reads: 0, cancellations: 0, releases: 0, bodyCancellations: 0 };
  const reader = {
    async read() { stats.reads++; if (options.readError) throw options.readError;
      return chunks.length ? { done: false, value: chunks.shift() } : { done: true }; },
    cancel() { stats.cancellations++; if (options.cancelError) throw options.cancelError; return options.cancelReject ? Promise.reject(options.cancelReject) : Promise.resolve(); },
    releaseLock() { stats.releases++; },
  };
  return { status: options.status ?? 200, headers: new Headers(options.headers), stats,
    body: { getReader: () => reader, cancel: () => { stats.bodyCancellations++; } },
    arrayBuffer: () => { throw new Error('UNBOUNDED_BUFFER_FORBIDDEN'); } };
}
const asset = { ticker: 'SPY', yahooSymbol: 'SPY' };
const acquire = (r, onProgress = () => {}) => fetchRaw(asset, { request: async () => r, wait: async n => assert.equal(n, 250), onProgress });

test('bounded body preserves exact fragmented bytes, ignoring missing or false Content-Length', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }, { 'Content-Length': '999999999' }]) {
    const r = response([Buffer.from('ab'), Buffer.from('c')], { headers });
    assert.deepEqual(await readBoundedProviderBody(r, { limit: 4 }), Buffer.from('abc'));
    assert.equal(r.stats.cancellations, 0); assert.equal(r.stats.releases, 1);
  }
});
test('fragmented over-limit body is cancelled before copying or reading subsequent chunks', async () => {
  const r = response([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('never-read')], { headers: { 'Content-Length': '1' } });
  const observations = [];
  await assert.rejects(readBoundedProviderBody(r, { limit: 4, onProgress: p => observations.push(p) }), /^Error: PROVIDER_SIZE_REJECTED$/);
  assert.equal(r.stats.reads, 2); assert.equal(r.stats.cancellations, 1); assert.equal(r.stats.releases, 1);
  assert.deepEqual(observations.at(-1), { bytes_observed: 4, bytes_retained: 2 });
});
test('single oversized chunk, exact limit, empty body and invalid stream fail closed', async () => {
  for (const chunks of [[Buffer.alloc(5)], [Buffer.alloc(4)], []]) {
    const r = response(chunks); await assert.rejects(readBoundedProviderBody(r, { limit: 4 }), /PROVIDER_SIZE_REJECTED/);
    assert.equal(r.stats.cancellations, 1);
  }
  await assert.rejects(readBoundedProviderBody({}), /PROVIDER_BODY_UNAVAILABLE/);
  await assert.rejects(readBoundedProviderBody(response(['string-not-bytes'])), /PROVIDER_BODY_READ_FAILED/);
});
test('cancellation throw or rejection never masks original size rejection', async () => {
  for (const options of [{ cancelError: new Error('PRIVATE_CANCEL') }, { cancelReject: new Error('PRIVATE_CANCEL') }]) {
    const r = response([Buffer.alloc(4)], options);
    await assert.rejects(readBoundedProviderBody(r, { limit: 4 }), /^Error: PROVIDER_SIZE_REJECTED$/);
    assert.equal(r.stats.releases, 1);
  }
});
test('read failures and timeouts sanitize raw exceptions without retry', async () => {
  for (const [name, code] of [['Error', 'PROVIDER_BODY_READ_FAILED'], ['TimeoutError', 'PROVIDER_TIMEOUT_OR_ABORT'], ['AbortError', 'PROVIDER_TIMEOUT_OR_ABORT']]) {
    const error = Object.assign(new Error('PRIVATE_EXCEPTION_URL_BODY'), { name });
    const r = response([], { readError: error }), observed = [];
    await assert.rejects(acquire(r, p => observed.push(p)), new RegExp('^Error: ' + code + '$'));
    assert.equal(r.stats.reads, 1); assert.equal(r.stats.cancellations, 1);
    assert.equal(observed.at(-1).failure_kind, code); assert.doesNotMatch(JSON.stringify(observed), /PRIVATE_EXCEPTION|https:/);
  }
});
test('request failure and timeout are one attempt with no private exception propagation', async () => {
  for (const name of ['Error', 'TimeoutError', 'AbortError']) {
    let count = 0;
    await assert.rejects(fetchRaw(asset, { wait: async () => {}, request: async () => { count++; throw Object.assign(new Error('PRIVATE_TRANSPORT'), { name }); } }),
      new RegExp('^Error: ' + (name === 'Error' ? 'PROVIDER_TRANSPORT_FAILED' : 'PROVIDER_TIMEOUT_OR_ABORT') + '$'));
    assert.equal(count, 1);
  }
});
test('HTTP 429 only reports bounded numeric retry hint, never retries or reads body', async () => {
  for (const [hint, expected] of [['60', 60], ['86400', 86400], ['86401', null], ['SECRET_HEADER', null], ['Fri, 23 Oct 2026 12:00:00 GMT', null]]) {
    const r = response([Buffer.from('PRIVATE_BODY')], { status: 429, headers: { 'Retry-After': hint } }), observed = [];
    await assert.rejects(acquire(r, p => observed.push(p)), /PROVIDER_RESPONSE_REJECTED/);
    assert.equal(r.stats.reads, 0); assert.equal(r.stats.bodyCancellations, 1);
    assert.equal(observed.at(-1).http_status, 429); assert.equal(observed.at(-1).retry_after_seconds_hint, expected);
    assert.doesNotMatch(JSON.stringify(observed), /PRIVATE_BODY|SECRET_HEADER|Fri,/);
  }
});
test('redirect status and compressed response retain existing rejection', async () => {
  for (const options of [{ status: 302 }, { headers: { 'Content-Encoding': 'gzip' } }]) {
    const r = response([Buffer.from('private')], options);
    await assert.rejects(acquire(r), /PROVIDER_RESPONSE_REJECTED/); assert.equal(r.stats.reads, 0);
  }
});
test('valid acquisition preserves URL, headers, 30-second signal and spacing; observer cannot affect it', async () => {
  let count = 0, spacing = 0;
  const value = await fetchRaw(asset, { wait: async n => { spacing++; assert.equal(n, 250); }, onProgress: () => { throw new Error('OBSERVER'); },
    request: async (url, options) => {
      count++; assert.match(url, /^https:\/\/query1.finance.yahoo.com\/v8\/finance\/chart\/SPY\?/);
      assert.equal(options.redirect, 'error'); assert.equal(options.headers['Accept-Encoding'], 'identity');
      assert.ok(options.signal instanceof AbortSignal); assert.equal(options.signal.aborted, false);
      return response([Buffer.from('exact-provider-bytes')]);
    } });
  assert.equal(count, 1); assert.equal(spacing, 1); assert.equal(value.bytes.toString(), 'exact-provider-bytes');
  assert.ok(Number.isFinite(Date.parse(value.fetchedAt)));
});
test('universe enforces exactly forty distinct immutable asset identities', () => {
  const universe = Array.from({ length: 40 }, (_, i) => ({ ticker: 'A' + i, yahooSymbol: 'A' + i }));
  assertProviderUniverse(universe);
  for (const invalid of [universe.slice(1), [...universe, asset], [...universe.slice(1), universe[1]], [...universe.slice(1), { ticker: 'bad ticker', yahooSymbol: 'A' }]]) {
    assert.throws(() => assertProviderUniverse(invalid), /PROVIDER_UNIVERSE_BUDGET/);
  }
});

class MemoryStore {
  constructor() { this.objects = new Map(); this.events = []; }
  async identity() { this.events.push('identity'); }
  async put(key, bytes) {
    this.events.push('put:' + key); if (this.objects.has(key)) throw new Error('PreconditionFailed');
    const until = new Date(); until.setUTCFullYear(until.getUTCFullYear() + 5);
    const value = { bytes: Buffer.from(bytes), version: String(this.objects.size + 1), retention: { Mode: 'GOVERNANCE', RetainUntilDate: until.toISOString() } };
    this.objects.set(key, value); return { version: value.version };
  }
  async get(key) { const v = this.objects.get(key); return { bytes: this.corruptRaw && key.includes('/raw/') ? Buffer.from('wrong') : Buffer.from(v.bytes), version: v.version }; }
  async retention(key) { return this.objects.get(key).retention; }
}
const runId = '20261023T000000Z-00000000-0000-4000-8000-000000000000';
function prepareFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-durability-model-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const progress = [], store = new MemoryStore();
  const options = { directory, store, storageConfig: { region: 'eu-south-2', bucket: 'FIXTURE' }, runId, gitSha: 'a'.repeat(40), assertRuntime() {}, generate() {}, validate() { return { model: true }; }, onProgress: p => progress.push(p) };
  const fetcher = async asset => ({ bytes: Buffer.from(JSON.stringify({ chart: { result: [{ meta: { symbol: asset.yahooSymbol }, timestamp: [1725451200], indicators: { quote: [{ open: [100], high: [101], low: [99], close: [100], volume: [1000] }], adjclose: [{ adjclose: [100] }] } }] } })), url: 'https://fixture.invalid', fetchedAt: new Date().toISOString() });
  return { options, store, progress, fetcher };
}
test('partial fetch records actual attempts/readbacks, sanitizes callback and cannot seal', async t => {
  const f = prepareFixture(t); let calls = 0;
  await assert.rejects(prepareHosted({ ...f.options, fetcher: async (asset, { onProgress }) => {
    calls++; onProgress({ http_status: 200, bytes_observed: 10, bytes_retained: 10, retry_after_seconds_hint: 'SECRET', failure_kind: 'PRIVATE_EXCEPTION', url: 'PRIVATE_URL', body: 'PRIVATE_BODY' });
    if (calls === 2) throw new Error('FIXTURE_FETCH_FAILURE'); return f.fetcher(asset);
  } }), /FIXTURE_FETCH_FAILURE/);
  const last = f.progress.at(-1);
  assert.equal(calls, 2); assert.equal(last.fetch_attempts, 2); assert.equal(last.fetch_completed, 1); assert.equal(last.raw_verified, 1);
  assert.equal(last.retries, 0); assert.equal(last.global_quota, 'UNPROVEN'); assert.equal(last.provider_health, 'UNPROVEN');
  assert.doesNotMatch(JSON.stringify(f.progress), /PRIVATE_|SECRET/);
  assert.ok(![...f.store.objects.keys()].some(p => p.endsWith('/SEALED')));
});
test('failed raw readback reports completed fetch but no verified input or seal', async t => {
  const f = prepareFixture(t); f.store.corruptRaw = true;
  await assert.rejects(prepareHosted({ ...f.options, fetcher: f.fetcher }), /READBACK_MISMATCH/);
  assert.equal(f.progress.at(-1).fetch_attempts, 1); assert.equal(f.progress.at(-1).fetch_completed, 1); assert.equal(f.progress.at(-1).raw_verified, 0);
  assert.ok(![...f.store.objects.keys()].some(p => p.endsWith('/SEALED')));
});
test('complete synthetic acquisition is forty invocations; sealed reuse fetches zero', async t => {
  const f = prepareFixture(t); let fetches = 0;
  const candidate = await prepareHosted({ ...f.options, fetcher: asset => { fetches++; return f.fetcher(asset); } });
  assert.equal(fetches, 40); assert.equal(f.progress.at(-1).fetch_attempts, 40); assert.equal(f.progress.at(-1).fetch_completed, 40); assert.equal(f.progress.at(-1).raw_verified, 40);
  const reused = prepareFixture(t);
  await prepareHosted({ ...reused.options, store: f.store, existingAuthority: candidate.authority, fetcher: () => { throw new Error('MUST_NOT_FETCH'); } });
  assert.equal(reused.progress.at(-1).fetch_attempts, 0); assert.equal(reused.progress.at(-1).raw_verified, 0);
  assert.equal(reused.progress.at(-1).stage, 'CANDIDATE_PREPARED');
});
function publication(remote, pushError = null) {
  const calls = [], progress = [], candidate = { gitSha: 'a'.repeat(40), config: {} };
  return { candidate, calls, progress, options: { validate() {}, install: () => calls.push(['INSTALL']), onProgress: p => progress.push(p), git: args => {
    calls.push(args); if (args[0] === 'rev-parse') return args[1] === 'HEAD' ? candidate.gitSha : remote;
    if (args[0] === 'diff') return 'lib/statistical-levels/generated-provenance.json\nlib/statistical-levels/generated/manifest.json';
    if (args[0] === 'push' && pushError) throw pushError; return '';
  } } };
}
test('remote advance emits only validated SHA and blocks installation, commit and push', () => {
  for (const remote of ['b'.repeat(40), 'PRIVATE_REMOTE_OUTPUT']) {
    const p = publication(remote);
    assert.throws(() => publishCandidate(p.candidate, p.options), /PUBLICATION_OVERLAP_REMOTE_ADVANCED/);
    assert.equal(p.progress.at(-1).observed_remote_sha, remote.length === 40 ? remote : null);
    assert.equal(p.progress.at(-1).commit_attempted, false); assert.equal(p.progress.at(-1).push_attempted, false);
    assert.ok(!p.calls.some(args => args.includes('INSTALL') || args.includes('commit') || args.includes('push')));
    assert.doesNotMatch(JSON.stringify(p.progress), /PRIVATE_REMOTE_OUTPUT/);
  }
});
test('ambiguous push remains unconfirmed and is not repeated; success still requires readback', () => {
  const error = new Error('PRIVATE_PUSH_ERROR'), p = publication('a'.repeat(40), error);
  assert.throws(() => publishCandidate(p.candidate, p.options), e => e === error);
  assert.equal(p.calls.filter(args => args[0] === 'push').length, 1);
  assert.equal(p.progress.at(-1).push_attempted, true); assert.equal(p.progress.at(-1).push_command_succeeded, false);
  assert.doesNotMatch(JSON.stringify(p.progress), /PRIVATE_PUSH_ERROR/);
  const success = publication('a'.repeat(40)); publishCandidate(success.candidate, success.options);
  assert.equal(success.progress.at(-1).push_command_succeeded, true);
  assert.equal(success.progress.at(-1).publication_readback, 'STILL_REQUIRED');
});
test('observer failure cannot suppress a material publication rejection', () => {
  const p = publication('b'.repeat(40));
  assert.throws(() => publishCandidate(p.candidate, { ...p.options, onProgress() { throw new Error('OBSERVER'); } }), /PUBLICATION_OVERLAP_REMOTE_ADVANCED/);
  assert.ok(!p.calls.some(args => args[0] === 'push'));
});
test('existing hosted artifact step already collects additional bounded progress JSON', () => {
  const workflow = fs.readFileSync('.github/workflows/update-statistical-levels.yml', 'utf8');
  assert.match(workflow, /failure-artifact\/\*\.json/);
  assert.match(workflow, /name: Retain bounded updater failure diagnostics\n        if: failure\(\)/);
});
