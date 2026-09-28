import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyInputs } from '../scripts/preview-qa.mjs';
import { P, ADOPT, PROMOTE, sha, selectTarget, validateTarget, validateAncestry, validateRun, validateAttestation } from '../scripts/release-core.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const manifest = JSON.parse(await fs.readFile(new URL('../source-inputs.json', import.meta.url)));
const provenancePath = 'lib/statistical-levels/generated-provenance.json';
const ledgerPath = 'docs/statistical-levels-capability-ledger.json';
const adopt = selectTarget({ operation: ADOPT });
const promote = { operation: PROMOTE, phase: 'preview', candidate_git_sha: 'a'.repeat(40),
  deployment_id: 'dpl_TestFutureCandidate123', expected_previous_production_sha: P.baseline.production_git_sha };

test('requalified ADOPT binds current production separately from execution and rejects the superseded target', async t => {
  assert.equal(adopt.candidate_git_sha, 'c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f');
  assert.equal(adopt.deployment_id, 'dpl_BBWPr52pL9JmHQwtAGKkNNSg9a8Q');
  assert.equal(adopt.authority_run_id, '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d');
  assert.equal(adopt.sealed_manifest_sha256, '129f45149f6a280f1681ce3903a304e18a07dbaa6894bcc8e9b94587dbdf26cb');
  for (const change of [
    { candidate_git_sha: '4ee6adb006f360fea13837db5f7d45815f297b55' },
    { deployment_id: 'dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6' },
    { candidate_git_sha: '0c8fce262fce44650729883862ec948778ebea45' },
  ]) await assert.rejects(verifyInputs('/nonexistent-cross-owned-baseline', manifest, { ...adopt, ...change }), { message: 'BASELINE_IDENTITY' });
  const f = await fixture(t);
  assert.deepEqual(await f.verify(), { authority_run_id: adopt.authority_run_id, sealed_manifest_sha256: adopt.sealed_manifest_sha256 });
});

async function write(dir, name, bytes) {
  await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
  await fs.writeFile(path.join(dir, name), bytes);
}
async function fixture(t, operation = ADOPT) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-input-model-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  t.mock.method(globalThis, 'fetch', () => assert.fail('Input verification must remain offline'));
  const paths = new Set([...Object.keys(manifest), ...P.allowlist, ledgerPath]);
  for (const name of paths) await write(dir, name, await fs.readFile(path.join(root, name)));
  const provenance = JSON.parse(await fs.readFile(path.join(dir, provenancePath)));
  if (operation === ADOPT) {
    // Synthetic authenticated baseline: only this test process changes its policy pin.
    // The production policy file and all frozen identity values remain untouched.
    provenance.CONFIG = structuredClone(P.authority);
    provenance.BASELINE_ID = P.baseline.authority_run_id;
    provenance.GENERATOR_COMMIT = provenance.CONFIG.GENERATOR_COMMIT;
    provenance.CONFIG_SHA256 = sha(JSON.stringify(provenance.CONFIG));
    provenance.SOURCE_BUNDLE = structuredClone(P.source_bundle);
    for (const item of provenance.SOURCE_BUNDLE) {
      const bytes = Buffer.from('synthetic frozen historical source: ' + item.file);
      await write(dir, item.file, bytes);item.SHA256 = sha(bytes);
    }
    provenance.GENERATOR_SHA256 = sha(JSON.stringify(provenance.SOURCE_BUNDLE));
    for (const entry of provenance.snapshots) {
      for (const key of ['GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']) entry[key] = provenance[key];
      for (const input of entry.INPUTS) {
        input.RAW_SOURCE_ID = provenance.BASELINE_ID + '/raw/' + path.basename(input.RAW_SOURCE_ID);
        input.SNAPSHOT_CUTOFF = provenance.CONFIG.SNAPSHOT_CUTOFF;
      }
    }
    const name = 'lib/statistical-levels/generated/manifest.json';
    const data = JSON.parse(await fs.readFile(path.join(dir, name)));data.baseline.id = provenance.BASELINE_ID;
    const bytes = JSON.stringify(data);await write(dir, name, bytes);
    provenance.snapshots.find(x => x.FILE === 'manifest.json').SNAPSHOT_SHA256 = sha(bytes);
    const originalPin = P.baseline.provenance_sha256;
    t.after(() => { P.baseline.provenance_sha256 = originalPin; });
  }
  async function save(authenticate = false) {
    const bytes = JSON.stringify(provenance);await write(dir, provenancePath, bytes);
    if (authenticate) P.baseline.provenance_sha256 = sha(bytes);
  }
  await save(operation === ADOPT);
  return { dir, provenance, save, verify: () => verifyInputs(dir, manifest, operation === ADOPT ? adopt : promote) };
}

test('ADOPT accepts authenticated historical source bytes despite current manifest mismatch', async t => {
  const f = await fixture(t);
  assert.notEqual(sha(await fs.readFile(path.join(f.dir, P.source_bundle[0].file))), manifest[P.source_bundle[0].file]);
  assert.deepEqual(await f.verify(), { authority_run_id: adopt.authority_run_id, sealed_manifest_sha256: adopt.sealed_manifest_sha256 });
});

for (const [name, change, error] of [
  ['1 wrong baseline SHA', { candidate_git_sha: 'a'.repeat(40) }, 'BASELINE_IDENTITY'],
  ['2 wrong baseline deployment', { deployment_id: 'dpl_WrongBaseline12345' }, 'BASELINE_IDENTITY'],
  ['4 wrong baseline authority run', { authority_run_id: '20260909T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d' }, 'BASELINE_IDENTITY'],
  ['5 wrong baseline seal', { sealed_manifest_sha256: 'a'.repeat(64) }, 'BASELINE_IDENTITY'],
  ['7 wrong Production origin', { origin: 'https://wrong.invalid' }, 'PRODUCTION_ORIGIN'],
  ['8 non-baseline product commit as ADOPT', { candidate_git_sha: '9566f0a9f2adda773c9a11187b5dfd1d9b3c0a90' }, 'BASELINE_IDENTITY'],
]) test('ADOPT rejects ' + name + ' before reading any checkout', async () => {
  await assert.rejects(verifyInputs('/nonexistent-adopt-checkout', manifest, { ...adopt, ...change }), { message: error });
});

test('ADOPT rejects 3 wrong provenance hash before reading historical bundle paths', async t => {
  const f = await fixture(t);f.provenance.SOURCE_BUNDLE = [{ file: '../untrusted', SHA256: 'a'.repeat(64) }];
  await f.save();
  await assert.rejects(f.verify(), { message: 'BASELINE_PROVENANCE_HASH' });
});

test('ADOPT validates provenance self-hashes before historical bundle paths', async t => {
  const f = await fixture(t);f.provenance.SOURCE_BUNDLE = [{ file: '../untrusted', SHA256: 'a'.repeat(64) }];
  await f.save(true);
  await assert.rejects(f.verify(), { message: 'PROVENANCE_SELF_HASH' });
});

test('ADOPT rejects 6 modified generated snapshot bytes', async t => {
  const f = await fixture(t);await fs.appendFile(path.join(f.dir, P.allowlist.find(x => x.includes('/assets/'))), ' ');
  await assert.rejects(f.verify(), { message: 'SNAPSHOT_BYTE_HASH' });
});

test('ADOPT rejects 9 tampered historical SOURCE_BUNDLE file', async t => {
  const f = await fixture(t);await fs.appendFile(path.join(f.dir, f.provenance.SOURCE_BUNDLE[0].file), 'tamper');
  await assert.rejects(f.verify(), { message: 'BASELINE_SOURCE_HASH' });
});

for (const file of ['../escape', '/absolute', 'scripts/../escape', 'scripts/./escape', 'scripts//escape', 'scripts\\escape']) {
  test('ADOPT rejects 10 unsafe authenticated historical bundle path: ' + file, async t => {
    const f = await fixture(t);f.provenance.SOURCE_BUNDLE[0].file = file;
    f.provenance.GENERATOR_SHA256 = sha(JSON.stringify(f.provenance.SOURCE_BUNDLE));await f.save(true);
    await assert.rejects(f.verify(), { message: 'BASELINE_SOURCE_PATH' });
  });
}

for (const kind of ['file', 'parent']) test('ADOPT rejects 10 historical bundle symlink: ' + kind, async t => {
  const f = await fixture(t);const source = path.join(f.dir, kind === 'file' ? f.provenance.SOURCE_BUNDLE[0].file : 'scripts');
  await fs.rename(source, source + '-real');await fs.symlink(source + '-real', source);
  await assert.rejects(f.verify(), { message: 'BASELINE_SOURCE_SYMLINK' });
});

test('ADOPT rejects missing historical bundle file', async t => {
  const f = await fixture(t);await fs.unlink(path.join(f.dir, f.provenance.SOURCE_BUNDLE[0].file));
  await assert.rejects(f.verify(), { code: 'ENOENT' });
});

test('PROMOTE accepts exact current input manifest and source bundle', async t => {
  const f = await fixture(t, PROMOTE);await f.verify();
});

test('PROMOTE rejects 11 changed current component bytes', async t => {
  const f = await fixture(t, PROMOTE);await fs.appendFile(path.join(f.dir, 'components/layout/Header.tsx'), ' ');
  await assert.rejects(f.verify(), { message: 'QA_INPUT_HASH' });
});

test('PROMOTE rejects 12 current source-input expected hash mismatch', async t => {
  const f = await fixture(t, PROMOTE);
  await assert.rejects(verifyInputs(f.dir, { ...manifest, 'package.json': 'a'.repeat(64) }, promote), { message: 'QA_INPUT_HASH' });
});

test('PROMOTE rejects 13 self-consistent SOURCE_BUNDLE different from policy', async t => {
  const f = await fixture(t, PROMOTE);f.provenance.SOURCE_BUNDLE[0].SHA256 = 'a'.repeat(64);
  f.provenance.GENERATOR_SHA256 = sha(JSON.stringify(f.provenance.SOURCE_BUNDLE));await f.save();
  await assert.rejects(f.verify(), { message: 'GENERATOR_SOURCE_BUNDLE' });
});

for (const kind of ['missing', 'symlink', 'unsafe-path']) test('PROMOTE preserves rejection: ' + kind, async t => {
  const f = await fixture(t, PROMOTE);const name = 'components/layout/Header.tsx';
  if (kind === 'unsafe-path') {
    await assert.rejects(verifyInputs(f.dir, { '../escape': 'a'.repeat(64), ...manifest }, promote), { message: 'QA_INPUT_PATH' });
  } else {
    const source = path.join(f.dir, name);await fs.rename(source, source + '-real');
    if (kind === 'symlink') await fs.symlink(source + '-real', source);
    await assert.rejects(f.verify(), kind === 'missing' ? { code: 'ENOENT' } : { message: 'QA_INPUT_SYMLINK' });
  }
});

test('unknown operation cannot select either source authority', async () => {
  await assert.rejects(verifyInputs('/nonexistent-checkout', {}, { ...adopt, operation: 'OTHER' }), { message: 'OPERATION_REQUIRED' });
});

// Independent target and policy oracles for the explicitly authorized two-field migration.
const oldPolicyHash = '672c81cce8eb0e84869e111e4816a46716edf402f9a546caa06f3b33c8382aec';
const newPolicyHash = 'e8865e7b7c392147f111a4f558434d536cbdfbb648d463053a74701b2bb98e9a';
const policyBytes = await fs.readFile(new URL('../policy.json', import.meta.url), 'utf8');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const currentTarget = {
  operation: 'ADOPT_EXISTING_PRODUCTION_BASELINE', phase: 'production',
  candidate_git_sha: 'c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f',
  deployment_id: 'dpl_BBWPr52pL9JmHQwtAGKkNNSg9a8Q', origin: 'https://www.luiguiherrera.com',
  authority_run_id: '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d',
  sealed_manifest_sha256: '129f45149f6a280f1681ce3903a304e18a07dbaa6894bcc8e9b94587dbdf26cb',
};

function assertPolicyContract(bytes, expected = newPolicyHash) {
  assert.equal(digest(bytes), expected, 'explicit target policy contract');
}

test('policy migration changes exactly the production commit and deployment; every other policy byte remains frozen', () => {
  assertPolicyContract(policyBytes);
  const parsed = JSON.parse(policyBytes);
  assert.equal(parsed.baseline.production_git_sha, currentTarget.candidate_git_sha);
  assert.equal(parsed.baseline.production_deployment_id, currentTarget.deployment_id);
  let restored = policyBytes;
  for (const [field, previous] of [
    ['production_git_sha', '4ee6adb006f360fea13837db5f7d45815f297b55'],
    ['production_deployment_id', 'dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6'],
  ]) {
    const token = `"${field}": "${parsed.baseline[field]}"`;
    assert.equal(restored.split(token).length, 2, field + ' occurs exactly once');
    restored = restored.replace(token, `"${field}": "${previous}"`);
  }
  assertPolicyContract(restored, oldPolicyHash);
  assert.throws(() => assertPolicyContract(policyBytes, oldPolicyHash), { code: 'ERR_ASSERTION' });
});

for (const [name, mutate] of [
  ['target commit', p => { p.baseline.production_git_sha = 'b'.repeat(40); }],
  ['target deployment', p => { p.baseline.production_deployment_id = 'dpl_WrongTarget123456'; }],
  ['unrelated authority identity', p => { p.baseline.authority_run_id = '20260909T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d'; }],
  ['unrelated workflow binding', p => { p.workflow_ref += '-unreviewed'; }],
]) test('policy contract rejects corruption of ' + name, () => {
  const parsed = JSON.parse(policyBytes);mutate(parsed);
  const corrupted = JSON.stringify(parsed, null, 2) + '\n';
  assert.throws(() => assertPolicyContract(corrupted), { code: 'ERR_ASSERTION' });
});

test('new target is exact and cannot be supplied as an ADOPT dispatch override', () => {
  assert.deepEqual(selectTarget({ operation: ADOPT }), currentTarget);
  assert.doesNotThrow(() => validateTarget(currentTarget));
  assert.throws(() => selectTarget({ operation: ADOPT, candidate_git_sha: currentTarget.candidate_git_sha }), { message: 'ADOPTION_FUTURE_INPUT_FORBIDDEN' });
});

for (const field of ['candidate_git_sha', 'deployment_id', 'authority_run_id', 'sealed_manifest_sha256']) {
  test('new target rejects missing baseline identity: ' + field, () => {
    const incomplete = { ...currentTarget };delete incomplete[field];
    assert.throws(() => validateTarget(incomplete), /ATTESTATION_CANDIDATE|AUTHORITY_IDENTITY/);
  });
}

test('current production remains forbidden as a future PROMOTE no-op', () => {
  assert.throws(() => selectTarget({ operation: PROMOTE,
    candidate_git_sha: currentTarget.candidate_git_sha, candidate_deployment_id: currentTarget.deployment_id,
    expected_previous_production_sha: 'b'.repeat(40), expected_previous_production_deployment: 'dpl_Previous123456789',
    previous_publication_date: '2026-09-08',
  }), { message: 'NO_OP_RELEASE_FORBIDDEN' });
});

const executionSHA = 'e'.repeat(40); // Synthetic descendant, not a claim about live Git history.
const ancestry = { base_commit: { sha: currentTarget.candidate_git_sha },
  merge_base_commit: { sha: currentTarget.candidate_git_sha }, behind_by: 0, ahead_by: 3, status: 'ahead' };
for (const [name, change] of [
  ['wrong production base', { base_commit: { sha: '4ee6adb006f360fea13837db5f7d45815f297b55' } }],
  ['target-only rebind with divergent execution', { merge_base_commit: { sha: '4ee6adb006f360fea13837db5f7d45815f297b55' } }],
  ['missing production history', { behind_by: 1 }],
  ['execution not a descendant', { status: 'diverged' }],
]) test('new target retains ancestry rejection: ' + name, () => {
  validateTarget(currentTarget);
  assert.throws(() => validateAncestry({ ...ancestry, ...change }, executionSHA, currentTarget.candidate_git_sha), /CANDIDATE_ANCESTRY_UNRESOLVED|CANDIDATE_UNRELATED/);
});

// Build attestation bytes independently of attest()/selectTarget()/canonical().
const serialize = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});
function policyEvidence() {
  const capabilities = Array.from({ length: 87 }, (_, i) => 'SL-CAP-' + String(i + 1).padStart(3, '0'));
  const defects = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['SL_DEF_' + String(i + 1).padStart(3, '0'), 'PASS']));
  const report = { result: 'PASS', gates: { SEASONALITY: 'PASS', DRAWDOWN: 'PASS', PATTERNS: 'PASS', NULL_STATES: 'PASS', CORRELATION: 'PASS', ...defects },
    snapshot_count: 81, provenance_coverage: 100, capability_ids: capabilities,
    routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440, 900], [390, 844]],
    application_console_errors: 0, required_application_request_failures: 0, broken_assets: 0, hydration_errors: 0, overflow: 0,
    raw_platform_events: [], raw_rsc_events: [], unclassified_failures: [], expected_values: 'PASS' };
  const run = { id: '260532', attempt: '1', execution_sha: executionSHA };
  const workflowBytes = Buffer.from('synthetic reviewed workflow for target policy validation');
  const workflowHash = digest(workflowBytes);
  const timestamp = '2026-09-28T12:00:00.000Z';
  const payload = { candidate_git_sha: currentTarget.candidate_git_sha, deployment_id: currentTarget.deployment_id,
    authority_run_id: currentTarget.authority_run_id, sealed_manifest_sha256: currentTarget.sealed_manifest_sha256,
    project_id: 'prj_kT4Z9GpDUghMK5Xfd9E3SzV2PvE6', test_version: 'statistical-levels-release-qa.v1', phase: 'production',
    result: 'PASS', snapshot_count: 81, provenance_coverage: 100, capability_ids: capabilities, timestamp, defects,
    interactions: 'PASS', expected_values: 'PASS', routes: report.routes, viewports: report.viewports,
    application_console_errors: 0, hydration_errors: 0, required_application_request_failures: 0, broken_assets: 0, overflow: 0,
    raw_platform_events: [], raw_rsc_events: [], unclassified_failures: [], origin: currentTarget.origin,
    public_authority_run_id: currentTarget.authority_run_id };
  const body = { workflow_path: '.github/workflows/statistical-levels-release.yml', workflow_sha256: workflowHash,
    workflow_run_id: run.id, workflow_run_attempt: run.attempt, workflow_execution_sha: executionSHA,
    operation: 'ADOPT_EXISTING_PRODUCTION_BASELINE', candidate_git_sha: currentTarget.candidate_git_sha,
    deployment_id: currentTarget.deployment_id, authority_run_id: currentTarget.authority_run_id,
    sealed_manifest_sha256: currentTarget.sealed_manifest_sha256, qa_suite_version: 'statistical-levels-release-qa.v1',
    result: 'PASS', timestamp, controller_payload_sha256: digest(serialize(payload)), product_report_sha256: digest(serialize(report)),
    product_report: report, controller_payload: payload };
  const envelope = { ...body, attestation_sha256: digest(serialize(body)) };
  const env = { GITHUB_REPOSITORY: 'luiguiHerrera/Luiguiherrera-web', GITHUB_REF: 'refs/heads/vercel-deployment',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'luiguiHerrera/Luiguiherrera-web/.github/workflows/statistical-levels-release.yml@refs/heads/vercel-deployment',
    GITHUB_SHA: executionSHA, GITHUB_WORKFLOW_SHA: executionSHA, GITHUB_WORKFLOW: 'Statistical Levels controlled release',
    GITHUB_RUN_ID: run.id, GITHUB_RUN_ATTEMPT: run.attempt };
  return { run, workflowBytes, workflowHash, envelope, env,
    frozen: { workflow_path: body.workflow_path, workflow_sha256: workflowHash } };
}

test('new policy accepts an independent exact target, descendant execution, workflow and same-run attestation', () => {
  const f = policyEvidence();
  assertPolicyContract(policyBytes);
  validateTarget(currentTarget);
  validateAncestry(ancestry, executionSHA, currentTarget.candidate_git_sha);
  validateRun(f.env, f.workflowBytes, f.frozen);
  assert.deepEqual(validateAttestation(f.envelope, f.run, currentTarget, f.workflowHash), f.envelope);
});

for (const [name, change] of [
  ['another run', { id: '260533' }], ['another attempt', { attempt: '2' }],
  ['another execution', { execution_sha: 'f'.repeat(40) }],
]) test('new policy rejects attestation from ' + name, () => {
  const f = policyEvidence();
  assert.throws(() => validateAttestation(f.envelope, { ...f.run, ...change }, currentTarget, f.workflowHash), { message: 'ATTESTATION_BINDING' });
});

test('new target cannot accept stale workflow binding or mismatched workflow execution', () => {
  const f = policyEvidence();
  assert.throws(() => validateRun(f.env, f.workflowBytes, { ...f.frozen, workflow_sha256: 'a'.repeat(64) }), { message: 'WORKFLOW_SHA' });
  assert.throws(() => validateRun({ ...f.env, GITHUB_WORKFLOW_SHA: 'f'.repeat(40) }, f.workflowBytes, f.frozen), { message: 'WORKFLOW_EXECUTION_SHA' });
  assert.throws(() => validateAttestation(f.envelope, f.run, currentTarget, 'a'.repeat(64)), { message: 'ATTESTATION_BINDING' });
});
