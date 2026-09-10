import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { P, canonical, productGates, sha } from '../scripts/release-core.mjs';
import { account } from '../scripts/network-accounting.mjs';
import { attestProbe } from '../scripts/probe-core.mjs';
import { buildProbeEvidence, probeEvidenceFiles, sanitizeProbeAccounting, writeProbeEvidence } from '../scripts/probe-evidence.mjs';

const origin = 'https://luiguiherrera-fixture-luigui-herrera-s-projects.vercel.app';
const decode = files => Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, JSON.parse(bytes)]));
function fixture(events = []) {
  const context = { run: { id: '12345', attempt: '2', execution_sha: 'b'.repeat(40) }, workflow_sha256: 'c'.repeat(64),
    target: { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40),
      deployment_id: 'dpl_abcdefghij1234567890', origin, authority_run_id: P.baseline.authority_run_id,
      sealed_manifest_sha256: P.baseline.sealed_manifest_sha256, github_deployment_id: 101, status_id: 202,
      status_sha256: 'd'.repeat(64), commit_status_id: 303, commit_status_sha256: 'e'.repeat(64) } };
  const accounting = { ...account(events, true, origin), authFailures: [] };
  const productReport = { result: 'PASS', gates: Object.fromEntries(productGates.map(k => [k, 'PASS'])),
    snapshot_count: 81, provenance_coverage: 100, capability_ids: P.capabilities,
    routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440, 900], [390, 844]],
    application_console_errors: 0, required_application_request_failures: 0, broken_assets: 0, hydration_errors: 0, overflow: 0,
    raw_platform_events: accounting.raw_platform_events, raw_rsc_events: accounting.raw_rsc_events,
    unclassified_failures: [], expected_values: 'PASS' };
  const attestation = attestProbe(productReport, context.run, context.target, context.workflow_sha256, '2026-09-10T08:00:00Z');
  const awsProof = { result: 'PASS', assumed_role: 'LuiguiHerreraStatisticalLevelsReleaseInvoker', account_match: true,
    session_match: true, workflow_run_id: context.run.id, workflow_run_attempt: context.run.attempt, workflow_execution_sha: context.run.execution_sha };
  return { context, outcomes: { resolve: 'success', qa: 'success', aws_assume: 'success', aws_identity: 'success' },
    productReport, accounting, awsProof, attestation };
}
function failedQA(events = []) {
  const value = fixture();
  return { ...value, outcomes: { resolve: 'success', qa: 'failure', aws_assume: 'skipped', aws_identity: 'skipped' },
    accounting: { ...account(events, false, origin), authFailures: [] }, productReport: null, awsProof: null, attestation: null };
}
function blank(outcomes) {
  const value = fixture();
  return { context: { ...value.context, target: null }, outcomes, productReport: null, accounting: null, awsProof: null, attestation: null };
}

test('evidence has exactly six canonical JSON files; manifest covers other five exact bytes', () => {
  const files = buildProbeEvidence(fixture()), json = decode(files);
  assert.deepEqual(Object.keys(files).sort(), [...probeEvidenceFiles].sort());
  assert.equal(json['probe-summary.json'].result, 'PASS');
  assert.equal(json['probe-summary.json'].production_release_target, false);
  assert.equal(json['trusted-sources-qa.json'].http_access_through_trusted_source, 'PASS');
  assert.equal(json['aws-oidc-summary.json'].result, 'PASS');
  const manifest = json['evidence-sha256.json'];
  assert.deepEqual(Object.keys(manifest.files).sort(), probeEvidenceFiles.filter(x => x !== 'evidence-sha256.json').sort());
  for (const [name, entry] of Object.entries(manifest.files)) {
    assert.equal(entry.sha256, sha(files[name])); assert.equal(entry.bytes, files[name].length);
    assert.ok(files[name].equals(canonical(JSON.parse(files[name]))));
  }
});

test('full ledger preserves duplicate RSC/platform evidence and original grouped hashes', () => {
  const rsc = { kind: 'request_failure', url: origin + '/niveles-estadisticos?_rsc=private', type: 'Fetch',
    canceled: true, rsc: true, prefetch: true, error_code: 'net::ERR_ABORTED' };
  const platform = { kind: 'console_error', url: 'https://vercel.live/_next-live/feedback/session?secret=hidden', source: 'Runtime.consoleAPICalled' };
  const value = fixture([rsc, rsc, platform]), json = decode(buildProbeEvidence(value));
  const saved = json['application-network-summary.json'].accounting;
  assert.equal(saved.ledger.length, 3); assert.equal(saved.raw_rsc_events[0].count, 2);
  assert.deepEqual(saved.raw_rsc_events, value.accounting.raw_rsc_events);
  assert.deepEqual(saved.raw_platform_events, value.accounting.raw_platform_events);
  assert.deepEqual(saved.ledger, value.accounting.ledger);
  assert.equal(json['probe-summary.json'].result, 'PASS');
});

test('failed preflight emits FAIL plus NOT_RUN downstream without assuming any identity', () => {
  const json = decode(buildProbeEvidence(blank({ resolve: 'failure', qa: 'skipped', aws_assume: 'skipped', aws_identity: 'skipped' })));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.equal(json['probe-summary.json'].target, null);
  assert.equal(json['trusted-sources-qa.json'].result, 'NOT_RUN');
  assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
});

test('all skipped is NOT_RUN, never PASS', () => {
  const json = decode(buildProbeEvidence(blank({ resolve: 'skipped', qa: 'skipped', aws_assume: 'skipped', aws_identity: 'skipped' })));
  assert.equal(json['probe-summary.json'].result, 'NOT_RUN');
});

test('generic QA step failure cannot turn valid local report into PASS', () => {
  const input = fixture(); input.outcomes.qa = 'failure'; input.outcomes.aws_assume = input.outcomes.aws_identity = 'skipped'; input.awsProof = null;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['trusted-sources-qa.json'].result, 'FAIL');
  assert.equal(json['qa-attestation.json'].result, 'FAIL');
});

test('cancelled QA remains FAIL while skipped AWS remains NOT_RUN', () => {
  const input = failedQA(); input.outcomes.qa = 'cancelled';
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['trusted-sources-qa.json'].result, 'FAIL'); assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
});

test('partial resolved target retains verified Preview and full failing network ledger', () => {
  const input = failedQA([{ kind: 'request_failure', url: origin + '/niveles-estadisticos', type: 'Document', status: 500 }]);
  delete input.context.target.authority_run_id; delete input.context.target.sealed_manifest_sha256;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].target.origin, origin);
  assert.equal(json['application-network-summary.json'].accounting.ledger.length, 1);
  assert.equal(json['application-network-summary.json'].accounting.required_application_request_failures, 1);
});

for (const field of ['productReport', 'accounting', 'attestation', 'awsProof']) {
  test(`successful step with missing ${field} evidence fails closed`, () => {
    const input = fixture(); input[field] = null;
    assert.equal(decode(buildProbeEvidence(input))['probe-summary.json'].result, 'FAIL');
  });
}

test('AWS action success is recorded separately from failed caller identity proof', () => {
  const input = fixture(); input.outcomes.aws_identity = 'failure'; input.awsProof = null;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['aws-oidc-summary.json'].assume_role_with_web_identity, 'PASS');
  assert.equal(json['aws-oidc-summary.json'].result, 'FAIL'); assert.equal(json['probe-summary.json'].result, 'FAIL');
});

test('AWS success without passing QA is never an overall PASS', () => {
  const input = fixture(); input.outcomes.qa = 'failure';
  const summary = decode(buildProbeEvidence(input))['probe-summary.json'];
  assert.equal(summary.result, 'FAIL'); assert.ok(summary.evidence_issues.includes('AWS_WITHOUT_PASSING_QA'));
});

test('foreign origins are hashed without suppressing required application failures', () => {
  const input = failedQA([{ kind: 'request_failure', url: 'https://unrelated.example/asset?X-Amz-Credential=sensitive', type: 'Script', status: 403 }]);
  const json = decode(buildProbeEvidence(input)), saved = json['application-network-summary.json'].accounting;
  assert.equal(saved.ledger.length, 1); assert.equal(saved.required_application_request_failures, 1);
  assert.equal(saved.ledger[0].event.origin, 'sha256:' + sha('https://unrelated.example'));
  assert.equal(saved.ledger[0].event.path, sha('/asset'));
  assert.ok(!JSON.stringify(json).includes('unrelated.example')); assert.ok(!JSON.stringify(json).includes('X-Amz-Credential'));
});

test('unclassified event ledger and its original event hash remain visible and FAIL', () => {
  const input = failedQA([{ kind: 'unknown', url: origin + '/unexpected', type: 'Other' }]);
  const json = decode(buildProbeEvidence(input)), saved = json['application-network-summary.json'].accounting;
  assert.equal(saved.ledger.length, 1); assert.equal(saved.ledger[0].classification, 'unclassified');
  assert.equal(saved.unclassified_failures.length, 1); assert.equal(json['probe-summary.json'].result, 'FAIL');
});

test('unknown accounting fields are not leaked and leave a rejected-source digest', () => {
  const input = fixture(), marker = 'sensitive' + '-test-only-header-value';
  input.accounting.Authorization = marker;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['application-network-summary.json'].accounting, null);
  assert.equal(json['application-network-summary.json'].rejected_accounting_sha256, sha(canonical(input.accounting)));
  assert.ok(!JSON.stringify(json).includes(marker));
});

test('attestation extra JWT/header fields are rejected rather than copied', () => {
  const input = fixture(), token = ['eyJ', Buffer.from('test-only-header').toString('base64url'), '.payload.signature'].join('');
  input.attestation.headers = { Authorization: token };
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['qa-attestation.json'].attestation, null);
  assert.ok(!JSON.stringify(json).includes(token));
});

test('product report arbitrary fields are rejected without leaking them', () => {
  const input = fixture(); input.productReport.cookie = 'private' + '-cookie-marker';
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['trusted-sources-qa.json'].product_report, null);
  assert.ok(!JSON.stringify(json).includes('private-cookie-marker'));
});

test('AWS proof cannot contain full account, ARN, credentials or additional fields', () => {
  const input = fixture(); input.awsProof.Account = P.account_id;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['aws-oidc-summary.json'].identity, null);
  assert.ok(!JSON.stringify(json).includes(P.account_id));
});

for (const mutation of [
  value => { value.awsProof.assumed_role = 'another-role'; },
  value => { value.awsProof.workflow_run_id = '9'; },
  value => { value.awsProof.workflow_execution_sha = 'f'.repeat(40); },
  value => { value.attestation.product_report_sha256 = '0'.repeat(64); },
  value => { value.context.target.origin += '?credential=forbidden'; },
  value => { value.context.target.candidate_git_sha = [value.context.target.candidate_git_sha]; },
  value => { value.accounting.required_application_request_failures = 0.5; },
  value => { value.accounting.raw_rsc_events = [{ sha256: 'a'.repeat(64), count: 1, classification: 'rsc_non_application' }]; },
  value => { value.outcomes.qa = 'unknown'; },
]) {
  test('malformed or mismatched evidence fails closed: ' + mutation.toString(), () => {
    const input = fixture(); mutation(input);
    assert.equal(decode(buildProbeEvidence(input))['probe-summary.json'].result, 'FAIL');
  });
}

test('forged canceled RSC classification cannot conceal a required request', () => {
  const accounting = account([{ kind: 'request_failure', url: origin + '/x', type: 'Fetch', canceled: true, rsc: true, prefetch: false, error_code: 'net::ERR_ABORTED' }], true, origin);
  accounting.ledger[0].classification = 'rsc_non_application';
  assert.throws(() => sanitizeProbeAccounting(accounting, origin), /EVIDENCE_EVENT_CLASSIFICATION/);
});

test('credential scoping failures remain counted and prevent successful QA', () => {
  const input = fixture(); input.accounting.authFailures.push('CREDENTIAL_SCOPE_OR_REDIRECT_REJECTED');
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.equal(json['application-network-summary.json'].accounting.authFailures.length, 1);
});

test('unsafe signed event URLs are never emitted', () => {
  const input = failedQA([{ kind: 'exception', url: origin + '/x' }]);
  input.accounting.ledger[0].event.origin = origin + '?token=sensitive-marker';
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.ok(!JSON.stringify(json).includes('sensitive-marker'));
});

test('raw event paths, embedded credentials and unknown context fields are never copied', () => {
  const input = failedQA([{ kind: 'exception', url: origin + '/x' }]);
  input.accounting.ledger[0].event.path = '/x?access_token=private-path-marker';
  input.context.extra = 'private-context-marker';
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.ok(!JSON.stringify(json).includes('private-path-marker'));
  assert.ok(!JSON.stringify(json).includes('private-context-marker'));
});

test('skipped steps cannot reuse stale successful evidence', () => {
  const input = fixture(); input.outcomes.qa = 'skipped';
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.ok(json['probe-summary.json'].evidence_issues.includes('UNEXPECTED_QA_EVIDENCE'));
});

test('writer emits only the six allowlisted files and refuses a raw/screenshot directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-evidence-unit-'));
  try {
    const out = path.join(root, 'evidence'); await writeProbeEvidence(out, fixture());
    assert.deepEqual((await fs.readdir(out)).sort(), [...probeEvidenceFiles].sort());
    assert.deepEqual(await fs.readdir(root), ['evidence']);
    for (const file of await fs.readdir(out)) assert.equal((await fs.stat(path.join(out, file))).mode & 0o777, 0o600);
    await assert.rejects(writeProbeEvidence(out, fixture()), /EVIDENCE_DESTINATION_NOT_EMPTY_OR_UNSAFE/);
    const raw = path.join(root, 'raw'); await fs.mkdir(raw); await fs.writeFile(path.join(raw, 'screenshot.png'), 'private');
    await assert.rejects(writeProbeEvidence(raw, fixture()), /EVIDENCE_DESTINATION_NOT_EMPTY_OR_UNSAFE/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('writer rejects symlink destination without modifying the linked directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-evidence-unit-'));
  try {
    const target = path.join(root, 'target'), link = path.join(root, 'link'); await fs.mkdir(target); await fs.symlink(target, link);
    await assert.rejects(writeProbeEvidence(link, fixture()), /EVIDENCE_DESTINATION_NOT_EMPTY_OR_UNSAFE/);
    assert.deepEqual(await fs.readdir(target), []);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('pure evidence module contains no invocation, transport, SDK, or cloud subprocess import', async () => {
  const source = await fs.readFile(new URL('../scripts/probe-evidence.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import[^\n]*(?:invoke|runtime-io|child_process|aws-sdk)|\bfetch\(|InvokeFunction|GetSecretValue|PutObject/);
});
