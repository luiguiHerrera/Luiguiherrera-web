import test from 'node:test';
import assert from 'node:assert/strict';
import { admitDaily, selectionKey, publishedKey } from './statistical-levels-daily.mjs';
import { hash, jsonBytes, S3Store } from './statistical-levels-storage.mjs';

// All stores and identities below are synthetic. No SDK, AWS or provider call.
const day = new Date().toISOString().slice(0, 10);
const baseline = day.replaceAll('-', '') + 'T000000000Z-11111111-1111-4111-8111-111111111111';
const sha = 'a'.repeat(40);
function fakeStore() {
  const objects = new Map(), calls = [];
  const retention = new Date(); retention.setUTCFullYear(retention.getUTCFullYear() + 5);
  return { objects, calls,
    findExact: async key => { calls.push(['find', key]); return objects.has(key); },
    get: async (key, version) => { calls.push(['get', key, version]); const obj = objects.get(key); assert.ok(obj); assert.ok(!version || version === obj.version); return obj; },
    put: async (key, bytes) => { calls.push(['put', key]); if (objects.has(key)) throw new Error('PreconditionFailed'); const result = { bytes, version: 'version-' + objects.size }; objects.set(key, result); return { version: result.version }; },
    retention: async () => ({ Mode: 'GOVERNANCE', RetainUntilDate: retention.toISOString() }),
    add: (key, value) => objects.set(key, { bytes: jsonBytes(value), version: 'existing-' + objects.size }),
  };
}
function fixture() {
  const now = new Date().toISOString(), store = fakeStore(), state = fakeStore();
  const context = { day, now, runId: baseline, gitSha: sha, producerRunId: '123', producerAttempt: '1' };
  const selected = { schema: 'statistical-levels.daily-selection.v1', day, run_id: baseline,
    source_sha: sha, producer_run_id: '122', producer_attempt: '1', created_at: now };
  const prefix = `statistical-levels/raw-authority/${baseline}/`;
  const seal = { PROTOCOL: 'statistical-levels.raw-archive.v1', RUN_ID: baseline, SNAPSHOT_CUTOFF: now,
    OBJECTS: Object.fromEntries(Array.from({ length: 44 }, (_, i) => ['object' + i, {}])) };
  const addSelection = () => store.add(selectionKey(day), selected);
  const addSeal = () => store.add(prefix + 'SEALED', seal);
  return { context, store, state, selected, seal, prefix, addSelection, addSeal };
}
test('daily new day selects durably before it grants a first fetch', async () => {
  const f = fixture(), out = await admitDaily(f);
  assert.equal(out.mode, 'FETCH_NEW');
  assert.equal(f.state.calls[0][0], 'find');
  assert.deepEqual(f.store.calls.map(c => c[0]), ['find', 'put', 'get']);
  assert.equal(JSON.parse(out.selection.utf8).run_id, baseline);
});
test('daily duplicate incomplete authority rejects instead of granting a second fetch', async () => {
  const f = fixture(); f.addSelection();
  await assert.rejects(admitDaily(f), /DAILY_SELECTED_ARCHIVE_INCOMPLETE/);
  assert.equal(f.store.calls.filter(c => c[0] === 'put').length, 0);
});
test('daily sealed unpublished authority is reused without writing or fetching', async () => {
  const f = fixture(); f.addSelection(); f.addSeal();
  const out = await admitDaily(f); assert.equal(out.mode, 'REUSE_SEALED');
  assert.equal(out.provider_fetches, 0); assert.equal(out.authority.runId, baseline);
  assert.equal(f.store.calls.filter(c => c[0] === 'put').length, 0);
});
test('daily reuse rejects changed source instead of falsifying generator provenance', async () => {
  const f = fixture(); f.addSelection(); f.addSeal(); f.context.gitSha = 'b'.repeat(40);
  await assert.rejects(admitDaily(f), /DAILY_REUSE_SOURCE_ADVANCED/);
});
test('daily generated authority is no-op, not a newly qualified or promoted candidate', async () => {
  const f = fixture(); f.addSelection(); f.addSeal();
  f.currentProvenance = { BASELINE_ID: baseline, SOURCE_STATE: 'COMMITTED', GENERATOR_COMMIT: sha,
    CONFIG: { RAW_ARCHIVE_SEAL_SHA256: hash(jsonBytes(f.seal)), RAW_ARCHIVE_SEAL_VERSION: 'existing-1' } };
  const out = await admitDaily(f); assert.equal(out.mode, 'GENERATED_NOOP'); assert.equal(out.provider_fetches, 0);
});
test('daily complete published marker prevents even a selection write', async () => {
  const f = fixture();
  const marker = { publication_date_utc: day, authority_run_id: baseline, sealed_manifest_sha256: '1'.repeat(64),
    generated_commit: sha, preview_deployment_id: 'dpl_abcdefghijklm', production_deployment_id: 'dpl_ABCDEFGHIJKLM',
    production_git_sha: sha, qa_attestation_hash: '2'.repeat(64), production_qa_attestation_hash: '3'.repeat(64),
    production_certified_at_utc: f.context.now, production_certified_at: f.context.now,
    controller_version: 'statistical-levels-release-controller.v2', previous_production_sha: 'b'.repeat(40),
    previous_production_deployment: 'dpl_1234567890123', new_production_sha: sha, new_production_deployment: 'dpl_ABCDEFGHIJKLM',
    main_sha_observed: 'c'.repeat(40), main_sha_observed_before_release: 'c'.repeat(40), main_sha_observed_after_release: 'c'.repeat(40),
    previous_publication_date: '2026-09-08', previous_publication_marker_sha256: '4'.repeat(64) };
  f.state.add(publishedKey(day), marker);
  const out = await admitDaily(f); assert.equal(out.mode, 'PUBLISHED_NOOP'); assert.equal(f.store.calls.length, 0);
});
for (const code of ['AccessDenied', 'AWS_OPERATION_FAILED']) test('daily publication-state ' + code + ' cannot mean absence', async () => {
  const f = fixture(); f.state.findExact = async () => { throw new Error(code); };
  await assert.rejects(admitDaily(f), new RegExp(code)); assert.equal(f.store.calls.length, 0);
});
test('daily ambiguous selection write is never repeated or converted to a fetch', async () => {
  const f = fixture(); let puts = 0; f.store.put = async () => { puts++; throw new Error('AWS_OPERATION_FAILED'); };
  await assert.rejects(admitDaily(f), /AWS_OPERATION_FAILED/); assert.equal(puts, 1);
});
test('daily concurrent winner is observed without issuing a second reservation', async () => {
  const f = fixture(); let puts = 0; f.store.put = async () => { puts++; f.addSelection(); f.addSeal(); throw new Error('PreconditionFailed'); };
  const out = await admitDaily(f); assert.equal(out.mode, 'REUSE_SEALED'); assert.equal(puts, 1);
});
for (const [field, value] of [['day', '2026-09-08'], ['source_sha', 'invalid'], ['run_id', 'foreign'], ['schema', 'foreign'], ['producer_attempt', '0']]) {
  test('daily selection rejects altered ' + field, async () => {
    const f = fixture(); f.selected[field] = value; f.addSelection();
    await assert.rejects(admitDaily(f), /DAILY_SELECTION_IDENTITY/);
  });
}
test('daily seal from another authority cannot qualify reuse', async () => {
  const f = fixture(); f.addSelection(); f.seal.RUN_ID = baseline + '-other'; f.addSeal();
  await assert.rejects(admitDaily(f), /DAILY_SEAL_BINDING/);
});
test('daily current provenance with another seal cannot qualify generated no-op', async () => {
  const f = fixture(); f.addSelection(); f.addSeal(); f.currentProvenance = { BASELINE_ID: baseline };
  await assert.rejects(admitDaily(f), /DAILY_GENERATED_BINDING/);
});
test('native exact-key absence requires complete successful listing', async () => {
  const config = { bucket: 'synthetic-bucket', account: '000000000000' };
  const fake = { config, cli: () => ({ IsTruncated: false, Name: config.bucket, Prefix: 'key' }) };
  assert.equal(await S3Store.prototype.findExact.call(fake, 'key'), false);
  fake.cli = () => ({ IsTruncated: true, Name: config.bucket, Prefix: 'key' });
  await assert.rejects(S3Store.prototype.findExact.call(fake, 'key'), /EXISTENCE_LIST_INCOMPLETE/);
});

test('real hosted CLI preserves bounded preflight failure artifact without secret values or provider access', async t => {
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-daily-failure-model-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const secret = 'synthetic-private-marker-never-exported';
  const result = spawnSync(process.execPath, ['scripts/statistical-levels-hosted.mjs', 'prepare'], {
    encoding: 'utf8', env: { PATH: process.env.PATH, RUNNER_TEMP: temp, GITHUB_REF: 'refs/heads/foreign',
      GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: sha, AWS_SECRET_ACCESS_KEY: secret } });
  assert.equal(result.status, 1);
  const file = path.join(temp, 'statistical-levels-authority/failure-artifact/prepare.json');
  const text = fs.readFileSync(file, 'utf8'), value = JSON.parse(text);
  assert.equal(value.phase, 'RUNTIME_PREFLIGHT'); assert.equal(value.code, 'UNTRUSTED_RUNTIME');
  assert.equal(value.result, 'FAIL_CLOSED'); assert.equal(value.recovery_or_retry_authorized, false);
  assert.ok(!(text + result.stdout + result.stderr).includes(secret));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});


test('source freshness rejects an advanced remote before daily reservation or providers', async () => {
  const { preflightSource } = await import('./statistical-levels-hosted.mjs');
  const calls = [];
  const git = args => { calls.push(args); if (args[0] === 'rev-parse') return sha;
    if (args[0] === 'status') return ''; return 'b'.repeat(40) + '\trefs/heads/vercel-deployment'; };
  assert.throws(() => preflightSource(git, sha), /PREFETCH_REMOTE_ADVANCED/);
  assert.equal(calls.length, 3);
});
