import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReceipt } from './producer-receipt.mjs';
import { hash } from '../statistical-levels-storage.mjs';

// Synthetic test inputs only: no process identity, real credentials or transport.
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-receipt-model-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = 'a'.repeat(40), published = 'b'.repeat(40), tree = 'c'.repeat(40);
  const baseline = '20261020T170000000Z-11111111-1111-4111-8111-111111111111';
  const prefix = `statistical-levels/raw-authority/${baseline}/`;
  const objects = {}, bytes = {};
  const add = (name, value) => {
    bytes[name] = Buffer.from(JSON.stringify(value));
    objects[name] = { SHA256: hash(bytes[name]), BYTES: bytes[name].length, VERSION_ID: `version-${name}` };
  };
  for (let n = 0; n < 40; n++) add(`raw/T${n}.json`, { synthetic: n });
  for (const name of ['RESERVATION', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS']) add(name, { synthetic: name });
  bytes.SEALED = Buffer.from(JSON.stringify({ RUN_ID: baseline, OBJECTS: objects }));
  const config = { RAW_ARCHIVE_SEAL_SHA256: hash(bytes.SEALED), RAW_ARCHIVE_SEAL_VERSION: 'seal-version' };
  const candidate = { gitSha: source, config, authority: { prefix, runId: baseline, sealSHA256: config.RAW_ARCHIVE_SEAL_SHA256, sealVersion: 'seal-version' } };
  const provenance = { GENERATOR_COMMIT: source, SOURCE_STATE: 'COMMITTED', BASELINE_ID: baseline, RAW_ARCHIVE_RELATIVE_PATH: prefix, CONFIG: config };
  const env = { GITHUB_REPOSITORY: 'luiguiHerrera/Luiguiherrera-web', GITHUB_REPOSITORY_ID: '1263772150', GITHUB_REF: 'refs/heads/vercel-deployment',
    GITHUB_WORKFLOW: 'Update statistical levels', GITHUB_WORKFLOW_REF: 'luiguiHerrera/Luiguiherrera-web/.github/workflows/update-statistical-levels.yml@refs/heads/vercel-deployment',
    GITHUB_SHA: source, GITHUB_WORKFLOW_SHA: source, GITHUB_EVENT_NAME: 'schedule', GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1', GITHUB_ACTIONS: 'true',
    STAT_LEVELS_RAW_AUTHORITY_READY: 'true', STAT_LEVELS_AWS_REGION: 'eu-south-2', STAT_LEVELS_RAW_BUCKET: 'sl-raw-authority-f9f4587745fa332cccfe',
    STAT_LEVELS_RAW_ROLE_ARN: 'arn:aws:iam::732159826922:role/LuiguiHerreraStatisticalLevelsRawAuthority',
    AWS_ACCESS_KEY_ID: 'ASIA' + 'A'.repeat(16), AWS_SECRET_ACCESS_KEY: 'synthetic-secret-never-used', AWS_SESSION_TOKEN: 'synthetic-session-never-used' };
  const identity = { Account: '732159826922', Arn: 'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-12345-1' };
  const calls = [];
  const store = {
    cli: (...args) => { assert.deepEqual(args, ['sts', 'get-caller-identity', []]); return identity; },
    get: async (key, version) => {
      calls.push([key, version]);
      const name = key.slice(prefix.length);
      assert.ok(key.startsWith(prefix));
      assert.equal(version, name === 'SEALED' ? 'seal-version' : objects[name].VERSION_ID);
      return { bytes: bytes[name], version };
    },
    put: () => assert.fail('NO_REMOTE_WRITE'), delete: () => assert.fail('NO_DELETE'), retain: () => assert.fail('NO_RETENTION_WRITE'),
  };
  const git = args => {
    if (args.join(' ') === 'rev-parse HEAD') return published;
    if (args.join(' ') === `rev-parse ${published}^{tree}`) return tree;
    if (args[0] === 'show' && args[1] === '-s') return source;
    if (args[0] === 'status') return '';
    if (args[0] === 'ls-remote') return `${published}\trefs/heads/vercel-deployment`;
    if (args[0] === 'show' && args[1].endsWith('generated-provenance.json')) return JSON.stringify(provenance);
    assert.fail('Unexpected git call');
  };
  return { env, git, store, candidate, destination: path.join(directory, 'receipt'), clock: () => new Date('2026-10-20T17:10:00Z'), calls, identity, bytes, objects, provenance };
}

test('producer binds exact pushed child and 45 S3 version reads; artifact contains metadata only', async t => {
  const f = fixture(t), r = await createReceipt(f);
  assert.equal(f.calls.length, 45);
  assert.equal(new Set(f.calls.map(c => c[0])).size, 45);
  assert.equal(r.source_sha, 'a'.repeat(40)); assert.equal(r.published_sha, 'b'.repeat(40));
  assert.deepEqual(Object.keys(r.metadata_objects).sort(), ['RESERVATION', 'SEALED', 'SHA256SUMS', 'provenance-manifest.json', 'raw-manifest.json'].sort());
  assert.deepEqual(fs.readdirSync(path.join(f.destination, 'artifact')), ['publication-receipt.json']);
  const artifact = fs.readFileSync(path.join(f.destination, 'artifact/publication-receipt.json'), 'utf8');
  assert.ok(!artifact.includes(f.env.AWS_SECRET_ACCESS_KEY) && !artifact.includes(f.env.AWS_SESSION_TOKEN));
});

for (const [field, value, code] of [
  ['GITHUB_REPOSITORY', 'foreign/repo', 'RECEIPT_REPOSITORY'], ['GITHUB_REPOSITORY_ID', '1', 'RECEIPT_REPOSITORY'],
  ['GITHUB_REF', 'refs/heads/main', 'RECEIPT_WORKFLOW'], ['GITHUB_WORKFLOW', 'Other', 'RECEIPT_WORKFLOW'],
  ['GITHUB_WORKFLOW_REF', 'foreign', 'RECEIPT_WORKFLOW_REF'], ['GITHUB_EVENT_NAME', 'push', 'RECEIPT_EVENT'],
  ['GITHUB_WORKFLOW_SHA', 'd'.repeat(40), 'RECEIPT_WORKFLOW_SHA'], ['GITHUB_RUN_ID', '9007199254740993', 'RECEIPT_RUN_RANGE'],
  ['GITHUB_RUN_ATTEMPT', '0', 'RECEIPT_RUN'], ['GITHUB_SHA', 'd'.repeat(40), 'RECEIPT_WORKFLOW_SHA'],
]) test(`producer rejects native ${field}`, async t => {
  const f = fixture(t); f.env[field] = value;
  await assert.rejects(createReceipt(f), new RegExp(code)); assert.equal(f.calls.length, 0);
});

for (const mode of ['wrong_parent', 'dirty', 'remote_moved', 'wrong_principal', 'uncommitted', 'wrong_config', 'wrong_archive', 'wrong_seal']) {
  test(`producer rejects ${mode} before readback`, async t => {
    const f = fixture(t), original = f.git;
    if (mode === 'wrong_parent') f.git = a => a[0] === 'show' && a[1] === '-s' ? 'd'.repeat(40) : original(a);
    if (mode === 'dirty') f.git = a => a[0] === 'status' ? ' M code' : original(a);
    if (mode === 'remote_moved') f.git = a => a[0] === 'ls-remote' ? 'd'.repeat(40) + '\trefs/heads/vercel-deployment' : original(a);
    if (mode === 'wrong_principal') f.identity.Arn += '-foreign';
    if (mode === 'uncommitted') f.provenance.SOURCE_STATE = 'WORKTREE';
    if (mode === 'wrong_config') f.provenance.CONFIG = { other: 1 };
    if (mode === 'wrong_archive') f.provenance.BASELINE_ID += '-foreign';
    if (mode === 'wrong_seal') f.candidate.authority.sealVersion = 'foreign';
    await assert.rejects(createReceipt(f)); assert.equal(f.calls.length, 0);
  });
}

for (const readNumber of [1, 2, 20, 45]) for (const corruption of ['bytes', 'version', 'unavailable']) {
  test(`producer fails closed at S3 read ${readNumber}: ${corruption}`, async t => {
    const f = fixture(t), original = f.store.get;
    f.store.get = async (...args) => {
      const r = await original(...args);
      if (f.calls.length !== readNumber) return r;
      if (corruption === 'unavailable') throw new Error('AccessDenied');
      return { ...r, ...(corruption === 'bytes' ? { bytes: Buffer.from('corrupt') } : { version: 'foreign' }) };
    };
    await assert.rejects(createReceipt(f));
    assert.ok(!fs.existsSync(path.join(f.destination, 'artifact/publication-receipt.json')));
  });
}

test('producer rechecks branch after all readbacks and never emits stale receipt', async t => {
  const f = fixture(t), original = f.git;
  f.git = a => a[0] === 'ls-remote' && f.calls.length === 45 ? 'd'.repeat(40) + '\trefs/heads/vercel-deployment' : original(a);
  await assert.rejects(createReceipt(f), /RECEIPT_REF_MOVED/);
  assert.equal(f.calls.length, 45);
  assert.ok(!fs.existsSync(path.join(f.destination, 'artifact/publication-receipt.json')));
});

for (const mode of ['FETCH_NEW', 'REUSE_SEALED']) test(`daily ${mode} binds a separately reread selection without private raw export`, async t => {
  const f = fixture(t), original = f.store.get;
  f.candidate.config.SNAPSHOT_CUTOFF = '2026-10-20T17:04:00Z';
  f.provenance.CONFIG = f.candidate.config;
  const value = { schema: 'statistical-levels.daily-selection.v1', day: '2026-10-20', run_id: f.candidate.authority.runId,
    source_sha: f.env.GITHUB_SHA, producer_run_id: mode === 'FETCH_NEW' ? '12345' : '12344', producer_attempt: '1', created_at: '2026-10-20T17:00:00Z' };
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  f.dailyAdmission = { mode, day: value.day, selection: { key: 'statistical-levels/raw-authority/daily/2026-10-20/SELECTED.json', version: 'selection-version', sha256: hash(bytes), utf8: bytes.toString() } };
  let selectionReads = 0;
  f.store.get = async (key, version) => {
    if (key === f.dailyAdmission.selection.key) { selectionReads++; assert.equal(version, 'selection-version'); return { bytes, version }; }
    return original(key, version);
  };
  const receipt = await createReceipt(f);
  assert.equal(f.calls.length, 45); assert.equal(selectionReads, 1);
  assert.deepEqual(receipt.daily_admission, f.dailyAdmission);
});
