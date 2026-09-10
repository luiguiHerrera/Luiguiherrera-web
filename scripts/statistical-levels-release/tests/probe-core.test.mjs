import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PROBE, selectProbeTarget, validateProbeTarget, resolveProbePreview, attestProbe,
  validateProbeAttestation, validateProbeRoleIdentity } from '../scripts/probe-core.mjs';
import { P, ADOPT, PROMOTE, canonical, sha, selectTarget, validateTarget, validateControllerRequest,
  productGates, validateOIDCClaims, headersForRequest, protectedGet } from '../scripts/release-core.mjs';

// These are synthetic fixtures, never a release request or live identity.
const run = { id: '500', attempt: '1', execution_sha: 'b'.repeat(40) };
const workflowHash = 'e'.repeat(64), time = '2026-09-10T08:00:00.000Z';
const origin = 'https://luiguiherrera-probefixture-luigui-herrera-s-projects.vercel.app';
const inputs = { operation: PROBE, probe_git_sha: P.baseline.production_git_sha,
  probe_deployment_id: 'dpl_SyntheticProbeFixture123' };
const releaseFields = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha',
  'expected_previous_production_deployment', 'previous_publication_date'];
const report = () => ({ result: 'PASS', gates: Object.fromEntries(productGates.map(k => [k, 'PASS'])),
  snapshot_count: 81, provenance_coverage: 100, capability_ids: P.capabilities,
  routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440, 900], [390, 844]],
  application_console_errors: 0, required_application_request_failures: 0, broken_assets: 0,
  hydration_errors: 0, overflow: 0, raw_platform_events: [], raw_rsc_events: [],
  unclassified_failures: [], expected_values: 'PASS' });
const creator = { login: P.vercel_creator_login, id: P.vercel_creator_id };
function metadata() {
  return {
    deployments: [{ id: 100, creator, sha: inputs.probe_git_sha, environment: 'Preview', production_environment: false }],
    statusSets: { '100': [{ id: 200, creator, state: 'success', environment: 'Preview', updated_at: time,
      environment_url: origin, target_url: origin, log_url: origin,
      deployment_url: `https://api.github.com/repos/${P.repository}/deployments/100` }] },
    commitStatuses: [{ id: 300, creator, state: 'success', context: 'Vercel',
      target_url: P.vercel_details_base_url + inputs.probe_deployment_id.slice(4), updated_at: time }],
  };
}
function resolve(data = metadata()) {
  return resolveProbePreview(data.deployments, data.statusSets, data.commitStatuses, selectProbeTarget(inputs));
}
function target() {
  return { ...resolve(), authority_run_id: P.baseline.authority_run_id,
    sealed_manifest_sha256: P.baseline.sealed_manifest_sha256 };
}
const envelope = () => attestProbe(report(), run, target(), workflowHash, time);

test('probe selects only immutable fixture identifiers with its own operation', () => {
  assert.deepEqual(selectProbeTarget(inputs), { operation: PROBE, phase: 'preview',
    candidate_git_sha: inputs.probe_git_sha, deployment_id: inputs.probe_deployment_id });
  assert.notEqual(selectProbeTarget(inputs).operation, PROMOTE);
});
test('empty release defaults are accepted without becoming release requirements', () => {
  assert.deepEqual(selectProbeTarget({ ...inputs, ...Object.fromEntries(releaseFields.map(k => [k, ''])) }), selectProbeTarget(inputs));
});
for (const field of releaseFields) test('nonempty release input rejected: ' + field, () => {
  assert.throws(() => selectProbeTarget({ ...inputs, [field]: 'not-a-probe-input' }), /PROBE_RELEASE_INPUT_FORBIDDEN/);
});
for (const [name, change] of [
  ['missing operation', x => delete x.operation], ['unknown operation', x => { x.operation = 'PROBE_ANYTHING'; }],
  ['adoption operation', x => { x.operation = ADOPT; }], ['promotion operation', x => { x.operation = PROMOTE; }],
  ['missing SHA', x => delete x.probe_git_sha], ['malformed SHA', x => { x.probe_git_sha = 'main'; }],
  ['missing deployment', x => delete x.probe_deployment_id], ['malformed deployment', x => { x.probe_deployment_id = 'latest'; }],
  ['URL input', x => { x.origin = origin; }], ['role input', x => { x.role_arn = P.release_role_arn; }],
  ['array value', x => { x.probe_git_sha = [inputs.probe_git_sha]; }],
  ['null release field', x => { x.candidate_git_sha = null; }],
]) test('probe input fails closed: ' + name, () => {
  const value = { ...inputs }; change(value); assert.throws(() => selectProbeTarget(value));
});
for (const value of [null, [], 'probe']) test('nonobject probe input rejected: ' + JSON.stringify(value), () => {
  assert.throws(() => selectProbeTarget(value));
});

test('same-day and older authority allowed only as a probe fixture', () => {
  for (const authority of [P.baseline.authority_run_id, '20260906T083000000Z-11111111-2222-4333-8444-555555555555']) {
    const value = { ...target(), authority_run_id: authority };
    assert.equal(validateProbeTarget(value), value);
    assert.equal(attestProbe(report(), run, value, workflowHash, time).authority_run_id, authority);
    assert.throws(() => validateTarget({ ...value, operation: PROMOTE, candidate_git_sha: 'd'.repeat(40),
      expected_previous_production_sha: P.baseline.production_git_sha }), /FUTURE_AUTHORITY_REQUIRED/);
  }
});
test('legacy ADOPT target selection is unchanged and rejects probe inputs', () => {
  const a = selectTarget({ operation: ADOPT });
  assert.equal(a.candidate_git_sha, P.baseline.production_git_sha);
  assert.equal(a.phase, 'production');
  assert.throws(() => selectTarget(inputs));
  assert.throws(() => validateTarget(target()));
});
for (const [name, delta] of [
  ['wrong operation', { operation: PROMOTE }], ['production phase', { phase: 'production' }],
  ['public production origin', { origin: P.production_origin }], ['another project host', { origin: 'https://other.vercel.app' }],
  ['HTTP', { origin: origin.replace('https:', 'http:') }], ['query', { origin: origin + '/?token=synthetic' }],
  ['credential URL', { origin: origin.replace('https://', 'https://synthetic@') }],
  ['array origin', { origin: [origin] }], ['noncanonical origin', { origin: origin + '/' }],
  ['missing authority', { authority_run_id: undefined }], ['bad seal', { sealed_manifest_sha256: 'bad' }],
  ['array SHA', { candidate_git_sha: [inputs.probe_git_sha] }], ['array seal', { sealed_manifest_sha256: ['a'.repeat(64)] }],
  ['unknown field', { publication_date: '2026-09-10' }], ['partial proof', { status_id: undefined }],
]) test('resolved target rejects ' + name, () => assert.throws(() => validateProbeTarget({ ...target(), ...delta })));

test('exact metadata resolves Preview with digested proof fields', () => {
  const d = metadata(), t = resolve(d);
  assert.equal(t.origin, origin); assert.equal(t.operation, PROBE);
  assert.equal(t.github_deployment_id, 100); assert.equal(t.status_id, 200); assert.equal(t.commit_status_id, 300);
  assert.equal(t.status_sha256, sha(canonical(d.statusSets['100'][0])));
  assert.equal(t.commit_status_sha256, sha(canonical(d.commitStatuses[0])));
});
test('later Production status of same commit cannot replace exact Preview status', () => {
  const d = metadata();
  d.commitStatuses.push({ ...d.commitStatuses[0], id: 500, target_url: P.vercel_details_base_url + 'DifferentProduction123',
    updated_at: '2026-09-10T09:00:00Z' });
  d.deployments.push({ ...d.deployments[0], id: 101, environment: 'Production', production_environment: true });
  assert.equal(resolve(d).commit_status_id, 300);
  assert.equal(resolve(d).origin, origin);
});
test('a later failure for the exact supplied deployment cannot fall back to earlier success', () => {
  const d = metadata(); d.commitStatuses.push({ ...d.commitStatuses[0], id: 301, state: 'failure' });
  assert.throws(() => resolve(d), /PROBE_VERCEL_ID_BINDING/);
});
test('latest exact-ID success supersedes an earlier exact-ID failure only with matching status', () => {
  const d = metadata(); d.commitStatuses.push({ ...d.commitStatuses[0], id: 299, state: 'failure' });
  assert.equal(resolve(d).commit_status_id, 300);
});
for (const [name, delta] of [
  ['failed', { state: 'failure' }], ['inactive', { state: 'inactive' }],
  ['untrusted', { creator: { ...creator, id: 1 } }],
]) test('newer ' + name + ' status on same Preview cannot revive older success', () => {
  const d = metadata(); d.statusSets['100'].push({ ...d.statusSets['100'][0], id: 201, ...delta });
  assert.throws(() => resolve(d), /PROBE_PREVIEW_METADATA_AMBIGUOUS/);
});
for (const [name, mutate] of [
  ['wrong commit SHA', d => { d.deployments[0].sha = 'a'.repeat(40); }],
  ['wrong deployment ID', d => { d.commitStatuses[0].target_url = P.vercel_details_base_url + 'WrongPreview123'; }],
  ['wrong project', d => { d.commitStatuses[0].target_url = d.commitStatuses[0].target_url.replace('luiguiherrera-web', 'another-project'); }],
  ['spoofed commit creator', d => { d.commitStatuses[0].creator = { ...creator, id: 1 }; }],
  ['spoofed deployment creator', d => { d.deployments[0].creator = { ...creator, login: 'someone-else' }; }],
  ['spoofed status creator', d => { d.statusSets['100'][0].creator = { ...creator, id: 1 }; }],
  ['non-ready status', d => { d.statusSets['100'][0].state = 'pending'; }],
  ['non-ready commit status', d => { d.commitStatuses[0].state = 'pending'; }],
  ['wrong status context', d => { d.commitStatuses[0].context = 'Unknown'; }],
  ['Production deployment', d => { d.deployments[0].production_environment = true; }],
  ['Production status', d => { d.statusSets['100'][0].environment = 'Production'; }],
  ['timestamp mismatch', d => { d.statusSets['100'][0].updated_at = '2026-09-10T09:00:00Z'; }],
  ['invalid timestamp', d => { d.commitStatuses[0].updated_at = '2026-02-30T08:00:00Z'; }],
  ['wrong deployment link', d => { d.statusSets['100'][0].deployment_url += '/other'; }],
  ['wrong target link', d => { d.statusSets['100'][0].target_url = 'https://other.invalid'; }],
  ['wrong log link', d => { d.statusSets['100'][0].log_url = 'https://other.invalid'; }],
  ['origin with credentials', d => { d.statusSets['100'][0].environment_url = origin + '?token=synthetic'; }],
  ['missing status page', d => { delete d.statusSets['100']; }],
  ['empty deployment page', d => { d.deployments = []; }],
  ['empty commit page', d => { d.commitStatuses = []; }],
  ['duplicate commit ID', d => { d.commitStatuses.push({ ...d.commitStatuses[0] }); }],
  ['duplicate deployment ID', d => { d.deployments.push({ ...d.deployments[0] }); }],
  ['duplicate status ID', d => { d.statusSets['100'].push({ ...d.statusSets['100'][0] }); }],
  ['commit pagination', d => { d.commitStatuses = Array.from({ length: 100 }, (_, i) => ({ ...d.commitStatuses[0], id: i + 1 })); }],
  ['deployment pagination', d => { d.deployments = Array.from({ length: 100 }, (_, i) => ({ ...d.deployments[0], id: i + 1 })); }],
  ['status pagination', d => { d.statusSets['100'] = Array.from({ length: 100 }, (_, i) => ({ ...d.statusSets['100'][0], id: i + 1 })); }],
]) test('Preview metadata rejects ' + name, () => {
  const d = metadata(); mutate(d); assert.throws(() => resolve(d));
});
test('two independently matching Preview deployments are ambiguous', () => {
  const d = metadata(); d.deployments.push({ ...d.deployments[0], id: 101 });
  d.statusSets['101'] = [{ ...d.statusSets['100'][0], id: 201,
    deployment_url: `https://api.github.com/repos/${P.repository}/deployments/101` }];
  assert.throws(() => resolve(d), /PROBE_PREVIEW_METADATA_AMBIGUOUS/);
});
test('resolver rejects caller-provided resolved origin or proof', () => {
  const d = metadata();
  assert.throws(() => resolveProbePreview(d.deployments, d.statusSets, d.commitStatuses,
    { ...selectProbeTarget(inputs), origin }), /PROBE_UNRESOLVED_TARGET/);
});

test('probe attestation binds independent run and fixture with no release payload', () => {
  const e = envelope();
  assert.equal(e.workflow_execution_sha, run.execution_sha); assert.notEqual(e.probe_git_sha, run.execution_sha);
  assert.equal(e.operation, PROBE); assert.equal(e.classification, 'PROBE_ONLY');
  assert.equal(e.production_release_target, false);
  assert.equal(e.product_report_sha256, sha(canonical(report())));
  for (const key of ['controller_payload', 'controller_request', 'qa_attestation', 'previous_publication_date']) assert.ok(!(key in e));
  assert.deepEqual(validateProbeAttestation(e, run, target(), workflowHash), e);
  assert.throws(() => validateControllerRequest(e));
});
test('attestation canonicalization permits object key order only', () => {
  const e = envelope(), reordered = Object.fromEntries(Object.entries(e).reverse());
  assert.deepEqual(validateProbeAttestation(reordered, run, target(), workflowHash), e);
});
for (const field of ['kind', 'operation', 'phase', 'classification', 'production_release_target', 'workflow_path',
  'workflow_sha256', 'workflow_run_id', 'workflow_run_attempt', 'workflow_execution_sha', 'probe_git_sha',
  'probe_deployment_id', 'preview_origin', 'project_id', 'authority_run_id', 'sealed_manifest_sha256',
  'qa_suite_version', 'result', 'timestamp', 'preview_metadata', 'product_report_sha256', 'attestation_sha256']) {
  test('attestation rejects changed binding ' + field, () => {
    const e = envelope(); e[field] = 'altered';
    assert.throws(() => validateProbeAttestation(e, run, target(), workflowHash));
  });
}
test('rehashing a modified attestation cannot substitute fixture identity', () => {
  const e = envelope(); e.probe_git_sha = 'a'.repeat(40); delete e.attestation_sha256;
  e.attestation_sha256 = sha(canonical(e));
  assert.throws(() => validateProbeAttestation(e, run, target(), workflowHash));
});
for (const [name, mutate] of [
  ['capability loss', p => { p.capability_ids = p.capability_ids.slice(1); }],
  ['missing defect', p => { delete p.gates.SL_DEF_006; }],
  ['failed QA', p => { p.gates.PATTERNS = 'FAIL'; }],
  ['application failure', p => { p.required_application_request_failures = 1; }],
  ['unknown sensitive field', p => { p.authorization = 'synthetic-canary'; }],
  ['missing raw accounting', p => { delete p.raw_rsc_events; }],
]) test('failed product report cannot produce probe attestation: ' + name, () => {
  const p = report(); mutate(p); assert.throws(() => attestProbe(p, run, target(), workflowHash, time));
});
test('unknown envelope fields including credentials rejected', () => {
  assert.throws(() => validateProbeAttestation({ ...envelope(), oidc_token: 'synthetic-canary' }, run, target(), workflowHash));
  assert.throws(() => validateProbeAttestation({ ...envelope(), controller_payload: undefined }, run, target(), workflowHash));
  const e = envelope(); e.preview_metadata.authorization = undefined;
  assert.throws(() => validateProbeAttestation(e, run, target(), workflowHash));
});
test('metadata proof is mandatory for attestation even if target shape is otherwise valid', () => {
  const t = target(); for (const k of ['github_deployment_id', 'status_id', 'status_sha256', 'commit_status_id', 'commit_status_sha256']) delete t[k];
  validateProbeTarget(t);
  assert.throws(() => attestProbe(report(), run, t, workflowHash, time), /PROBE_METADATA_PROOF/);
});
for (const [name, r] of [['missing attempt', { id: '500', execution_sha: run.execution_sha }],
  ['numeric id', { ...run, id: 500 }], ['wrong execution SHA type', { ...run, execution_sha: [run.execution_sha] }]]) {
  test('attestation rejects invalid run: ' + name, () => assert.throws(() => attestProbe(report(), r, target(), workflowHash, time)));
}
test('separate probe schema allows no controller payload or arbitrary extra fields', async () => {
  const schema = JSON.parse(await fs.readFile(new URL('../probe-attestation-schema.json', import.meta.url), 'utf8'));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(envelope()).sort());
  assert.equal(schema.properties.operation.const, PROBE);
  assert.equal(schema.properties.production_release_target.const, false);
  assert.ok(!schema.properties.controller_payload);
});

const role = P.release_role_arn.split('/').at(-1);
const caller = () => ({ Account: P.account_id,
  Arn: `arn:aws:sts::${P.account_id}:assumed-role/${role}/sl-probe-${run.id}`,
  UserId: `AROA${'A'.repeat(17)}:sl-probe-${run.id}` });
test('exact STS assumed-role/session identity becomes redacted proof', () => {
  const value = validateProbeRoleIdentity(caller(), run);
  assert.deepEqual(value, { result: 'PASS', assumed_role: role, account_match: true, session_match: true,
    workflow_run_id: run.id, workflow_run_attempt: run.attempt, workflow_execution_sha: run.execution_sha });
  const text = JSON.stringify(value); assert.ok(!text.includes(P.account_id));
  assert.ok(!text.includes('arn:')); assert.ok(!text.includes('AROA'));
});
for (const [name, mutate] of [
  ['wrong account', x => { x.Account = '111111111111'; }],
  ['wrong ARN account', x => { x.Arn = x.Arn.replace(P.account_id, '111111111111'); }],
  ['root identity', x => { x.Arn = `arn:aws:iam::${P.account_id}:root`; }],
  ['raw authority role', x => { x.Arn = x.Arn.replace(role, 'StatisticalLevelsRawAuthority'); }],
  ['other role', x => { x.Arn = x.Arn.replace(role, 'OtherRole'); }],
  ['wrong run session', x => { x.Arn = x.Arn.replace('/sl-probe-500', '/sl-probe-501'); }],
  ['wrong UserId session', x => { x.UserId += '-other'; }],
  ['nonrole UserId', x => { x.UserId = `AIDA${'A'.repeat(17)}:sl-probe-500`; }],
  ['credential field', x => { x.AWS_SESSION_TOKEN = 'synthetic-canary'; }],
  ['missing UserId', x => { delete x.UserId; }],
]) test('STS identity rejects ' + name, () => {
  const x = caller(); mutate(x); assert.throws(() => validateProbeRoleIdentity(x, run));
});

test('probe still requires exact Vercel and AWS OIDC audiences', () => {
  const now = 1800000000, env = { GITHUB_SHA: run.execution_sha, GITHUB_RUN_ID: run.id, GITHUB_RUN_ATTEMPT: run.attempt };
  const claims = audience => ({ iss: P.issuer, aud: audience, repository: P.repository,
    ref: 'refs/heads/' + P.branch, workflow_ref: P.workflow_ref, workflow: P.workflow_name, sha: run.execution_sha,
    workflow_sha: run.execution_sha, run_id: run.id, run_attempt: run.attempt, event_name: 'workflow_dispatch',
    repository_id: P.repository_id, repository_owner_id: P.repository_owner_id,
    exp: now + 300, iat: now, nbf: now, sub: P.aws_subject });
  for (const audience of [P.vercel_audience, P.aws_audience]) {
    validateOIDCClaims(claims(audience), audience, env, now);
    assert.throws(() => validateOIDCClaims({ ...claims(audience), aud: 'wrong' }, audience, env, now));
  }
});
test('probe protected GET refuses cross-origin redirect and never forwards its token', async () => {
  const token = 'synthetic-canary', seen = [];
  await assert.rejects(protectedGet(origin + '/niveles-estadisticos', token, origin, async (url, options) => {
    seen.push({ url, options }); return { status: 302 };
  }));
  assert.equal(seen.length, 1); assert.equal(seen[0].options.redirect, 'manual');
  assert.equal(seen[0].options.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.throws(() => headersForRequest('https://other.invalid/', {}, token, origin, origin), /CROSS_ORIGIN_REDIRECT/);
  assert.deepEqual(headersForRequest('https://other.invalid/', { authorization: token,
    'x-vercel-trusted-oidc-idp-token': token, 'x-vercel-protection-bypass': token }, token, undefined, origin), {});
});
