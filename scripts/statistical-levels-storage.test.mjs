import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { probe } from './statistical-levels-storage-probe.mjs';
import { sealArchive, runPrefix, readSealedArchive } from './statistical-levels-archive.mjs';
import { hash, runtimeConfig, assertNoSecrets } from './statistical-levels-storage.mjs';
import { prepareHosted, publishCandidate, validateCandidate } from './statistical-levels-hosted.mjs';
import { createEngine, generateSnapshots } from './statistical-levels-offline.mjs';

export class MemoryStore {
  constructor() { this.objects = new Map(); this.events = []; }
  async identity() { this.events.push('identity'); if (this.unavailable) throw new Error('AWS_OPERATION_FAILED'); }
  async put(key, bytes, { condition = true } = {}) {
    this.events.push('put:' + key);
    if (!condition || !/^statistical-levels\/(raw-authority|provisioning-probes)\//.test(key)) throw new Error('AccessDenied');
    if (this.objects.has(key)) throw new Error('PreconditionFailed');
    if (this.failAt && key.endsWith(this.failAt)) throw new Error('AWS_OPERATION_FAILED');
    const until = new Date(); until.setUTCFullYear(until.getUTCFullYear() + 5);
    const value = { bytes: Buffer.from(bytes), version: String(this.objects.size + 1), retention: { Mode: 'GOVERNANCE', RetainUntilDate: until.toISOString() } };
    this.objects.set(key, value); return { version: value.version };
  }
  async get(key) {
    this.events.push('get:' + key);
    const value = this.objects.get(key); if (!value) throw new Error('NoSuchKey');
    return { bytes: this.corrupt === key ? Buffer.from('corrupted') : Buffer.from(value.bytes), version: value.version };
  }
  async retention(key) { return this.objects.get(key).retention; }
  async delete() { throw new Error('AccessDenied'); }
  async retain() { throw new Error('AccessDenied'); }
}
const runId = '20260907T000000Z-00000000-0000-4000-8000-000000000000';
const prefix = runPrefix('provisioning-probes', runId);
const small = store => ({ store, prefix, runId, expectedCount: 1, produce: async function* () { yield { name: 'raw/probe.bin', bytes: Buffer.from('fixture') }; }, describe: item => ({ SOURCE_FILE: item.name }), provenance: { PROVIDER: 'FIXTURE' } });

test('synthetic protocol: complete seal, five-year retention and all six negative operations', async () => {
  const store = new MemoryStore(), result = await probe(store, runId);
  assert.equal(result.HOSTED_PROBE, 'PASS'); assert.equal(store.objects.size, 6);
  assert.equal(result.LOCAL_SHA256, result.READBACK_SHA256);
  assert.ok(store.events.indexOf('get:' + prefix + 'SHA256SUMS') < store.events.indexOf('put:' + prefix + 'SEALED'));
});
test('identity unavailable creates nothing', async () => {
  const store = new MemoryStore(); store.unavailable = true;
  await assert.rejects(probe(store, runId), /AWS_OPERATION_FAILED/); assert.equal(store.objects.size, 0);
});
test('reservation collision stops before producing input', async () => {
  const store = new MemoryStore(); await sealArchive(small(store)); let produced = false;
  await assert.rejects(sealArchive({ ...small(store), produce: async function* () { produced = true; } }), /RUN_ID_COLLISION/);
  assert.equal(produced, false);
});
for (const name of ['raw/probe.bin', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS']) {
  test('failure at ' + name + ' cannot seal', async () => {
    const store = new MemoryStore(); store.failAt = name;
    await assert.rejects(sealArchive(small(store)), /AWS_OPERATION_FAILED/);
    assert.equal(store.objects.has(prefix + 'SEALED'), false);
  });
}
test('partial archive cannot seal', async () => {
  const store = new MemoryStore(); await assert.rejects(sealArchive({ ...small(store), expectedCount: 2 }), /INCOMPLETE_RAW_ARCHIVE/);
  assert.equal(store.objects.has(prefix + 'SEALED'), false);
});
test('readback mismatch cannot seal', async () => {
  const store = new MemoryStore(); store.corrupt = prefix + 'raw/probe.bin';
  await assert.rejects(sealArchive(small(store)), /READBACK_MISMATCH/);
  assert.equal(store.objects.has(prefix + 'SEALED'), false);
});
test('post-seal inputs are downloaded again; subsequent corruption fails closed', async () => {
  const store = new MemoryStore(), authority = await sealArchive(small(store));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-test-'));
  try {
    const before = store.events.filter(e => e === 'get:' + prefix + 'raw/probe.bin').length;
    await readSealedArchive(store, authority, path.join(dir, 'good'));
    assert.equal(store.events.filter(e => e === 'get:' + prefix + 'raw/probe.bin').length, before + 1);
    assert.equal(hash(fs.readFileSync(path.join(dir, 'good/raw/probe.bin'))), hash(Buffer.from('fixture')));
    store.corrupt = prefix + 'raw/probe.bin';
    await assert.rejects(readSealedArchive(store, authority, path.join(dir, 'bad')), /ARCHIVED_INPUT_MISMATCH/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('runtime rejects local identity, unset readiness and persistent profiles', () => {
  assert.throws(() => runtimeConfig({}), /UNTRUSTED_RUNTIME/);
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/vercel-deployment', GITHUB_REPOSITORY: 'luiguiHerrera/Luiguiherrera-web' };
  for (const ready of [undefined, 'false', 'TRUE']) assert.throws(() => runtimeConfig({ ...env, STAT_LEVELS_RAW_AUTHORITY_READY: ready }, true), /RAW_AUTHORITY_NOT_READY/);
});
test('evidence scan rejects known secrets, JWTs and unmasked authorization', () => {
  assert.throws(() => assertNoSecrets('sensitive-value', { AWS_SESSION_TOKEN: 'sensitive-value' }), /SECRET_LEAK/);
  assert.throws(() => assertNoSecrets(['eyJabcdefghijk', 'abcdefghijk', 'abcdefghijk'].join('.'), {}), /SECRET_LEAK/);
  assert.throws(() => assertNoSecrets(['Authorization:', 'Bearer', 'sensitive-value'].join(' '), {}), /SECRET_LEAK/);
  assertNoSecrets('AWS_SESSION_TOKEN: ***\nAuthorization: Bearer ***', {});
});

test('publication validation, missing sidecar and commit failure block push', () => {
  const candidate = { gitSha: 'a'.repeat(40), output: '/missing-candidate', config: {}, archive: '/missing-archive' };
  for (const failure of ['validation', 'missing-sidecar', 'commit', 'remote-advance', 'missing-staged-sidecar']) {
    const calls = []; let validations = 0;
    const git = args => {
      calls.push(args);
      if (args.includes('rev-parse')) return args.includes('origin/vercel-deployment') && failure === 'remote-advance' ? 'b'.repeat(40) : candidate.gitSha;
      if (args.includes('diff')) return failure === 'missing-staged-sidecar' ? 'lib/statistical-levels/generated/manifest.json' : 'lib/statistical-levels/generated-provenance.json\nlib/statistical-levels/generated/manifest.json';
      if (args.includes('commit')) throw new Error('COMMIT_FAILED');
      return '';
    };
    const validate = () => { validations++; if (failure === 'validation' || failure === 'missing-sidecar') throw new Error(failure); };
    assert.throws(() => publishCandidate(candidate, { git, install() {}, validate }));
    assert.ok(!calls.some(args => args.includes('push')));
    if (failure !== 'commit') assert.ok(!calls.some(args => args.includes('commit')));
    assert.ok(validations > 0);
  }
});
test('publication success stages the sidecar and commits before normal push', () => {
  const calls = [], candidate = { gitSha: 'a'.repeat(40) };
  publishCandidate(candidate, { validate() {}, install() {}, git: args => {
    calls.push(args);
    if (args.includes('rev-parse')) return candidate.gitSha;
    if (args.includes('diff')) return 'lib/statistical-levels/generated-provenance.json\nlib/statistical-levels/generated/manifest.json';
    return '';
  } });
  assert.ok(calls.find(args => args.includes('add')).includes('lib/statistical-levels/generated-provenance.json'));
  assert.ok(calls.findIndex(args => args.includes('commit')) < calls.findIndex(args => args.includes('push')));
  assert.deepEqual(calls.at(-1), ['push', 'origin', 'HEAD:vercel-deployment']);
});
test('workflow isolation, exact official action pin, readiness ordering and concurrency', () => {
  const real = fs.readFileSync('.github/workflows/update-statistical-levels.yml', 'utf8');
  const synthetic = fs.readFileSync('.github/workflows/probe-statistical-levels-storage.yml', 'utf8');
  assert.match(real, /concurrency:\n  group: statistical-levels-raw-authority-publication\n  cancel-in-progress: false/);
  assert.ok(real.indexOf('test "$STAT_LEVELS_RAW_AUTHORITY_READY" = "true"') < real.indexOf('uses:'));
  assert.ok(real.indexOf('hosted.mjs prepare') < real.indexOf('hosted.mjs publish'));
  assert.match(synthetic, /contents: read\n  id-token: write/);
  assert.doesNotMatch(synthetic, /schedule:|pull_request|hosted\.mjs|build:stat-levels|contents: write|secrets\./);
  assert.match(synthetic, /persist-credentials: false/);
  for (const workflow of [real, synthetic]) {
    assert.match(workflow, /aws-actions\/configure-aws-credentials@cbe3b392738ccf3f987d68400dafcf4b0624a56c/);
    assert.match(workflow, /audience: sts.amazonaws.com/);
    assert.match(workflow, /mask-aws-account-id: true/);
    assert.match(workflow, /unset-current-credentials: true/);
    assert.doesNotMatch(workflow, /aws-access-key-id:|aws-secret-access-key:|role-chaining:|environment:/);
  }
});

const baselineConfig = JSON.parse(fs.readFileSync('lib/statistical-levels/baseline-config.json'));
const frozenArchive = path.join(os.homedir(), baselineConfig.RAW_ARCHIVE_RELATIVE_PATH);
const hasArchive = fs.existsSync(frozenArchive);
// SYNTHETIC_STORAGE_FAILURE_INPUT_V1: test-only provider-shaped bytes, not market authority.
// Independent literal identity set; no private archive, network or clock input.
const fixtureTickers = 'SPY QQQ IWM DIA VOO RSP UUP TLT IEF SHY HYG LQD GLD SLV USO XLK XLF XLV XLE XLY XLP XLI XLB XLU XLRE XLC AIQ BOTZ CIBR FINX ITA PAVE PHO SMH BTCUSD ETHUSD EWJ FXI EFA EEM'.split(' ');
const fixtureSymbol = ticker => ({ BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD' })[ticker] ?? ticker;
const fixtureManifestHash = '93e7cd0ef8df919db05338553b7983d522a0d050f41f9a5c65749e7b96bb772d';
function syntheticStorageInput(asset) {
  assert.ok(fixtureTickers.includes(asset.ticker), 'UNKNOWN_SYNTHETIC_ASSET');
  assert.equal(asset.yahooSymbol, fixtureSymbol(asset.ticker), 'SYNTHETIC_SYMBOL_MISMATCH');
  return Buffer.from(JSON.stringify({ chart: { result: [{ meta: { symbol: fixtureSymbol(asset.ticker) }, timestamp: [946684800], indicators: {
    quote: [{ open: [100], high: [101], low: [99], close: [100], volume: [1] }], adjclose: [{ adjclose: [100] }]
  } }], error: null } }) + '\n');
}
const fixtureResponse = asset => ({ bytes: syntheticStorageInput(asset), url: `fixture://synthetic-storage-failure-v1/${asset.ticker}`, fetchedAt: '2026-09-06T16:32:25Z' });
function fixtureManifest() {
  return fixtureTickers.map(ticker => ({ ticker, yahooSymbol: fixtureSymbol(ticker) })).sort((a, b) => a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0)
    .map(asset => `${hash(syntheticStorageInput(asset))}  raw/${asset.ticker}.json\n`).join('');
}
function assertSyntheticReadback(archive, store, rawPrefix) {
  for (const ticker of fixtureTickers) {
    const name = `raw/${ticker}.json`;
    assert.deepEqual(fs.readFileSync(path.join(archive, name)), syntheticStorageInput({ ticker, yahooSymbol: fixtureSymbol(ticker) }));
    assert.ok(store.events.filter(e => e === 'get:' + rawPrefix + name).length >= 2, 'POST_SEAL_REREAD_REQUIRED');
  }
  for (const name of ['RESERVATION', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS', 'SEALED']) assert.ok(fs.statSync(path.join(archive, name)).isFile());
}
test('synthetic storage fixture: independent identities, parser schema and deterministic hash', t => {
  const source = fs.readFileSync('scripts/build-statistical-levels.mjs', 'utf8');
  const e = createEngine(source, '2026-09-06T16:32:25Z').engine;
  assert.deepEqual(Array.from(e.universe, a => [a.ticker, a.yahooSymbol]), fixtureTickers.map(ticker => [ticker, fixtureSymbol(ticker)]));
  assert.equal(e.universe[0].ticker, 'SPY');
  const first = fixtureManifest(), second = fixtureManifest();
  assert.equal(first, second); assert.equal(hash(first), fixtureManifestHash);
  assert.equal(new Set(fixtureTickers).size, 40);
  for (const asset of e.universe) {
    const bytes = syntheticStorageInput(asset), parsed = e.parseYahooChart(bytes.toString());
    assert.deepEqual(bytes, syntheticStorageInput(asset));
    assert.equal(parsed.rows.length, 1); assert.equal(parsed.reason, null);
    const row = parsed.rows[0];
    assert.deepEqual([row.date, row.open, row.high, row.low, row.close, row.adjustedClose, row.volume], ['2000-01-01', 100, 101, 99, 100, 100, 1]);
  }
  assert.throws(() => syntheticStorageInput({ ticker: 'UNKNOWN', yahooSymbol: 'UNKNOWN' }), /UNKNOWN_SYNTHETIC_ASSET/);
  assert.throws(() => syntheticStorageInput({ ticker: 'SPY', yahooSymbol: 'QQQ' }), /SYNTHETIC_SYMBOL_MISMATCH/);
  t.diagnostic(`SYNTHETIC_STORAGE_FAILURE_INPUT_V1 entries=40 first=${hash(first)} second=${hash(second)}`);
});
const failureExpectations = {
  identity: ['AWS_OPERATION_FAILED', 0, 0], storage: ['AWS_OPERATION_FAILED', 0, 0],
  partial: ['PARTIAL_PROVIDER_FAILURE', 2, 0], collision: ['RUN_ID_COLLISION', 0, 0],
  readback: ['READBACK_MISMATCH', 1, 0], manifest: ['AWS_OPERATION_FAILED', 40, 0],
  provenance: ['AWS_OPERATION_FAILED', 40, 0], validation: ['SNAPSHOT_VALIDATION_FAILED', 40, 1]
};
for (const failure of ['identity', 'storage', 'partial', 'collision', 'readback', 'manifest', 'provenance', 'validation']) {
  test('real adapter failure injection: ' + failure, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-hosted-test-'));
    const store = new MemoryStore(), rawPrefix = runPrefix('raw-authority', runId);
    let fetched = 0, generated = 0, validated = 0;
    if (failure === 'identity') store.unavailable = true;
    if (failure === 'storage') store.failAt = 'RESERVATION';
    if (failure === 'collision') await store.put(rawPrefix + 'RESERVATION', Buffer.from('reserved'));
    if (failure === 'readback') store.corrupt = rawPrefix + 'raw/SPY.json';
    if (failure === 'manifest') store.failAt = 'raw-manifest.json';
    if (failure === 'provenance') store.failAt = 'provenance-manifest.json';
    try {
      await assert.rejects(prepareHosted({ store, storageConfig: { region: 'fixture', bucket: 'fixture' }, directory, gitSha: 'a'.repeat(40), assertRuntime() {}, runId,
        fetcher: async asset => { fetched++; if (failure === 'partial' && fetched === 2) throw new Error('PARTIAL_PROVIDER_FAILURE'); return fixtureResponse(asset); },
        generate: ({ archive }) => { generated++; assert.ok(store.objects.has(rawPrefix + 'SEALED')); assertSyntheticReadback(archive, store, rawPrefix); },
        validate: () => { validated++; throw new Error('SNAPSHOT_VALIDATION_FAILED'); } }), { message: failureExpectations[failure][0] });
      if (failure !== 'validation') { assert.equal(generated, 0); assert.equal(store.objects.has(rawPrefix + 'SEALED'), false); }
      else assert.equal(generated, 1);
      if (['identity', 'storage', 'collision'].includes(failure)) assert.equal(fetched, 0);
      assert.equal(fs.existsSync(path.join(directory, 'candidate.json')), false);
      assert.deepEqual([fetched, generated], failureExpectations[failure].slice(1));
      assert.equal(validated, failure === 'validation' ? 1 : 0);
      if (failure === 'identity' || failure === 'storage') assert.equal(store.objects.size, 0);
      if (failure === 'collision') assert.equal(store.objects.size, 1);
      const rawNames = [...store.objects.keys()].filter(key => key.startsWith(rawPrefix + 'raw/'));
      assert.equal(rawNames.length, ['manifest', 'provenance', 'validation'].includes(failure) ? 40 : ['partial', 'readback'].includes(failure) ? 1 : 0);
      if (rawNames.length) assert.equal(rawNames[0], rawPrefix + 'raw/SPY.json');
      if (failure === 'manifest') assert.equal(store.objects.has(rawPrefix + 'raw-manifest.json'), false);
      if (failure === 'provenance') { assert.equal(store.objects.has(rawPrefix + 'raw-manifest.json'), true); assert.equal(store.objects.has(rawPrefix + 'provenance-manifest.json'), false); }
      if (failure === 'validation') assert.equal(store.objects.size, 45);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
  });
}
test('synthetic storage fixture: positive orchestration reaches seal and filesystem readback', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-synthetic-positive-'));
  const store = new MemoryStore(), rawPrefix = runPrefix('raw-authority', runId);
  let fetched = 0, generated = 0, validated = 0;
  try {
    const candidate = await prepareHosted({ store, storageConfig: { region: 'fixture', bucket: 'fixture' }, directory, gitSha: 'a'.repeat(40), assertRuntime() {}, runId,
      fetcher: async asset => { fetched++; return fixtureResponse(asset); },
      generate: ({ archive }) => { generated++; assertSyntheticReadback(archive, store, rawPrefix); },
      validate: () => { validated++; return { TEST_ONLY_ORCHESTRATION: true }; } });
    assert.deepEqual([fetched, generated, validated], [40, 1, 1]);
    assert.equal(store.objects.size, 45); assert.equal(candidate.validation.TEST_ONLY_ORCHESTRATION, true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'candidate.json'))).validation.TEST_ONLY_ORCHESTRATION, true);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
for (const malformed of [false, true]) test('synthetic storage fixture: rejects ' + (malformed ? 'malformed JSON' : 'wrong provider symbol') + ' before later failure stages', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-synthetic-invalid-'));
  const store = new MemoryStore(); let generated = 0;
  try {
    await assert.rejects(prepareHosted({ store, storageConfig: { region: 'fixture', bucket: 'fixture' }, directory, gitSha: 'a'.repeat(40), assertRuntime() {}, runId,
      fetcher: async asset => { const response = fixtureResponse(asset); response.bytes = malformed ? Buffer.from('{malformed') : Buffer.from(response.bytes.toString().replace('"symbol":"SPY"', '"symbol":"WRONG"')); return response; },
      generate: () => { generated++; }, validate: () => { throw new Error('UNEXPECTED_VALIDATION'); }
    }), malformed ? { name: 'SyntaxError' } : { message: 'ARCHIVED_PROVIDER_IDENTITY_INVALID' });
    assert.equal(generated, 0); assert.equal(store.objects.has(runPrefix('raw-authority', runId) + 'SEALED'), false);
    assert.equal(fs.existsSync(path.join(directory, 'candidate.json')), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test('identical frozen archived bytes reproduce all 81 snapshots; sidecar corruption blocks validation', { skip: !hasArchive || JSON.parse(fs.readFileSync('lib/statistical-levels/generated-provenance.json')).BASELINE_ID !== baselineConfig.BASELINE_ID }, () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-equivalence-'));
  const output = path.join(directory, 'generated');
  try {
    const result = generateSnapshots({ archive: frozenArchive, output, config: baselineConfig });
    assert.equal(result.runManifest.NETWORK_ATTEMPTS, 0);
    assert.equal(validateCandidate(output, baselineConfig, frozenArchive).SNAPSHOT_COUNT, 81);
    for (const snapshot of result.runManifest.snapshots) assert.equal(hash(fs.readFileSync('lib/statistical-levels/generated/' + snapshot.file)), snapshot.SHA256);
    const sidecar = JSON.parse(fs.readFileSync(output + '-provenance.json'));
    sidecar.snapshots[0].SNAPSHOT_SHA256 = '0'.repeat(64);
    fs.writeFileSync(output + '-provenance.json', JSON.stringify(sidecar));
    assert.throws(() => validateCandidate(output, baselineConfig, frozenArchive), /SNAPSHOT_HASH_INVALID/);
    fs.rmSync(output + '-provenance.json');
    assert.throws(() => validateCandidate(output, baselineConfig, frozenArchive), /ENOENT/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
