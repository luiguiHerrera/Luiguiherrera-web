import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { P, canonical, productGates, sha } from '../scripts/release-core.mjs';
import { account } from '../scripts/network-accounting.mjs';
import { signedFixture } from './probe-oidc-fixture.mjs';
import { attestProbe } from '../scripts/probe-core.mjs';
import { createProbeHttpSession } from '../scripts/probe-http.mjs';
import { createProbeTokenBudget } from '../scripts/probe-token-budget.mjs';
import { runProtectedProbeQA } from '../scripts/probe-gate.mjs';
import { buildProbeEvidence, probeEvidenceFiles, sanitizeProbeAccounting, writeProbeEvidence } from '../scripts/probe-evidence.mjs';
import { createProductQAObservability, productQAObservabilityFiles } from '../scripts/product-qa-observability.mjs';

const origin = 'https://luiguiherrera-fixture-luigui-herrera-s-projects.vercel.app';
const decode = files => Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, JSON.parse(bytes)]));
let httpFixture = null, certificationFixture = null, budgetFixture = null;
function validSSR(route = '/niveles-estadisticos') {
  const h1 = route === '/en/statistical-levels' ? 'Where is this asset relative to its own history?' : '¿Dónde está este activo frente a su propia historia?';
  return '<html><body><div class="sl-page"><header class="sl-heading"><h1>' + h1 + '</h1></header><div id="sl-controls" class="sl-controls"></div></div></body></html>';
}
function browserAuthority(target) {
  return { schema_version: 'statistical-levels.probe-browser-authority.v1',
    fixture: { origin: target.origin, deployment_id: target.deployment_id, candidate_git_sha: target.candidate_git_sha,
      authority_run_id: target.authority_run_id, sealed_manifest_sha256: target.sealed_manifest_sha256 },
    result: 'PASS', error_code: null, routes: ['/niveles-estadisticos', '/en/statistical-levels'].map(path => ({ path,
      route_identity_exact_match: true, open_guide_action: 'CLICKED', guide_open: true, sl_authority_dom_present: true, authority_field_structured: true,
      browser_authority_run_id_exact_match: true, result: 'PASS', error_code: null })) };
}
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
    productReport, accounting, awsProof, attestation, httpPreflight: structuredClone(httpFixture),
    certificationHttp: structuredClone(certificationFixture), tokenBudget: structuredClone(budgetFixture), browserAuthority: browserAuthority(context.target),
    oidcEvidence: [signedFixture().evidence, signedFixture(P.aws_audience).evidence] };
}
function failedQA(events = []) {
  const value = fixture();
  return { ...value, outcomes: { resolve: 'success', qa: 'failure', aws_assume: 'skipped', aws_identity: 'skipped' },
    oidcEvidence: [signedFixture().evidence], accounting: { ...account(events, false, origin), authFailures: [] }, httpPreflight: null, certificationHttp: null, tokenBudget: null, browserAuthority: null, productReport: null, awsProof: null, attestation: null };
}
function blank(outcomes) {
  const value = fixture();
  return { context: { ...value.context, target: null }, outcomes, oidcEvidence: [], productReport: null, accounting: null, awsProof: null, attestation: null };
}

// Exercise the real bounded preflight producer with an in-memory transport.
// These current probe evidence fixtures are unrelated to historical data oracles.
const seedTarget = fixture().context.target;
let seedRequests = 0;
const session = createProbeHttpSession({ target: seedTarget, tokenSource: { get: async () => 'synthetic-unit-credential' },
  transport: async url => seedRequests++ === 0 ? new Response('', { status: 302, headers: { location: 'https://vercel.com/login' } }) : new Response(validSSR(new URL(url).pathname), { status: 200, headers: { 'content-type': 'text/html' } }),
  onEvidence: value => { httpFixture = value; } });
await session.get(origin + '/niveles-estadisticos');
certificationFixture = structuredClone(httpFixture);
const seedBudget = createProbeTokenBudget({ origin, assertProtected: () => true,
  requestOIDCToken: async () => ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'), 'unit'].join('.'),
  onEvidence: value => { budgetFixture = value; } });
await seedBudget.certificationTokenSource.get();
await seedBudget.markCertified();
await session.get(origin + '/en/statistical-levels');

test('evidence has exactly nine canonical JSON files; manifest covers other eight exact bytes', () => {
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

for (const field of ['productReport', 'accounting', 'attestation', 'awsProof', 'httpPreflight', 'certificationHttp', 'tokenBudget', 'browserAuthority']) {
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

test('writer emits only the nine allowlisted files and refuses a raw/screenshot directory', async () => {
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

for (const [claim, code] of [['environment', 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM'],
  ['job_workflow_ref', 'JOB_WORKFLOW_REF_MISMATCH'], ['job_workflow_sha', 'JOB_WORKFLOW_SHA_MISMATCH']]) {
  test('signed ' + claim + ' rejection is precise, safe and certifies no HTTP attempt', () => {
    const marker = 'untrusted-claim-marker';
    const { token, evidence } = signedFixture(P.vercel_audience, { [claim]: marker });
    const input = { ...failedQA(), accounting: null, oidcEvidence: [evidence] };
    const json = decode(buildProbeEvidence(input)), trusted = json['trusted-sources-qa.json'];
    assert.equal(json['probe-summary.json'].result, 'FAIL');
    assert.deepEqual(json['probe-summary.json'].evidence_issues, ['MISSING_TOKEN_BUDGET']);
    assert.deepEqual(json['probe-summary.json'].failed_oidc_gates, [{ audience_kind: 'VERCEL', error_code: code }]);
    assert.equal(trusted.http_access_through_trusted_source, 'NOT_ATTEMPTED');
    assert.equal(trusted.oidc_claim_evidence[0].claims[claim + '_present'], true);
    assert.equal(trusted.oidc_claim_evidence[0].error_code, code);
    assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
    assert.ok(!JSON.stringify(json).includes(token)); assert.ok(!JSON.stringify(json).includes(marker));
  });
}

test('token refresh failure after valid initial token never claims HTTP was not attempted', () => {
  const input = { ...failedQA(), accounting: null,
    oidcEvidence: [signedFixture().evidence, signedFixture(P.vercel_audience, { environment: 'unexpected' }).evidence] };
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['trusted-sources-qa.json'].http_access_through_trusted_source, 'NOT_CERTIFIED');
  assert.equal(json['trusted-sources-qa.json'].oidc_validation_result, 'FAIL');
  assert.equal(json['probe-summary.json'].result, 'FAIL');
});

for (const bad of [undefined, [], [signedFixture().evidence], [signedFixture(P.aws_audience).evidence],
  [signedFixture().evidence, signedFixture(P.aws_audience, { sub: 'wrong' }).evidence]]) {
  test('successful steps require complete passing diagnostics for both audiences: ' + String(bad?.length), () => {
    const input = fixture(); input.oidcEvidence = bad;
    assert.equal(decode(buildProbeEvidence(input))['probe-summary.json'].result, 'FAIL');
  });
}

for (const mutate of [value => { value.token = 'private-token-marker'; },
  value => { value.claims.environment_value_or_expected_classification = 'private-token-marker'; },
  value => { value.claims.environment_present = true; }, value => { value.error_code = 'private-token-marker'; }]) {
  test('OIDC diagnostic schema rejects arbitrary values without reflecting them: ' + mutate.toString(), () => {
    const input = fixture(); mutate(input.oidcEvidence[0]);
    const json = decode(buildProbeEvidence(input));
    assert.equal(json['probe-summary.json'].result, 'FAIL');
    assert.ok(json['probe-summary.json'].evidence_issues.includes('INVALID_OIDC_EVIDENCE'));
    assert.ok(!JSON.stringify(json).includes('private-token-marker'));
  });
}

test('no diagnostics or HTTP ledger means access not certified, never a Vercel denial', () => {
  const json = decode(buildProbeEvidence({ ...failedQA(), accounting: null, oidcEvidence: [] }));
  assert.equal(json['trusted-sources-qa.json'].http_access_through_trusted_source, 'NOT_CERTIFIED');
  assert.equal(json['trusted-sources-qa.json'].oidc_validation_result, 'NOT_RUN');
});

test('failed AWS preflight remains FAIL when assumption and caller identity are skipped', () => {
  const input = fixture(); input.outcomes.aws_assume = input.outcomes.aws_identity = 'skipped'; input.awsProof = null;
  input.oidcEvidence[1] = signedFixture(P.aws_audience, { environment: 'unexpected' }).evidence;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['trusted-sources-qa.json'].result, 'PASS');
  assert.equal(json['aws-oidc-summary.json'].oidc_validation_result, 'FAIL');
  assert.equal(json['aws-oidc-summary.json'].assume_role_with_web_identity, 'NOT_RUN');
  assert.equal(json['probe-summary.json'].result, 'FAIL');
});


test('redirect diagnostic wrapper preserves exact V3 direct-job metadata for both audiences', () => {
  const input = fixture(), json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].schema_version, 'statistical-levels.identity-probe-summary.v3');
  for (const name of ['trusted-sources-qa.json', 'aws-oidc-summary.json']) {
    assert.ok(json[name].schema_version.endsWith(name === 'trusted-sources-qa.json' ? '.v7' : '.v3'));
    assert.equal(json[name].oidc_claim_evidence[0].schema_version, 'statistical-levels.probe-oidc-evidence.v3');
    const c = json[name].oidc_claim_evidence[0].claims;
    assert.equal(c.job_workflow_ref_value, P.workflow_ref);
    assert.equal(c.runtime_job_workflow_ref, P.workflow_ref);
    assert.equal(c.job_workflow_ref_match, true);
    assert.equal(c.job_workflow_sha_value, input.context.run.execution_sha);
    assert.equal(c.runtime_job_workflow_sha, input.context.run.execution_sha);
    assert.equal(c.job_workflow_sha_match, true);
    assert.equal(c.runtime_job_workflow_repository, P.repository);
    assert.equal(c.runtime_job_workflow_file_path, P.workflow_path);
    for (const field of ['runtime_job_equals_caller_ref', 'runtime_job_equals_caller_sha', 'runtime_job_equals_caller_repository']) assert.equal(c[field], true);
  }
});

test('otherwise valid workflow identity evidence cannot be attached to a different execution SHA', () => {
  const input = fixture(); input.context.run.execution_sha = '9'.repeat(40);
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.ok(json['probe-summary.json'].evidence_issues.includes('OIDC_EXECUTION_CONTEXT_MISMATCH'));
});

test('HTTP preflight survives canonical journal serialization and fixture-bound finalization', () => {
  const input = fixture(); input.httpPreflight = JSON.parse(canonical(input.httpPreflight));
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'PASS');
  assert.deepEqual(json['trusted-sources-qa.json'].http_preflight, input.httpPreflight);
});

test('one passing language preflight cannot certify both product routes', () => {
  const input = fixture(); input.httpPreflight.routes.pop(); input.httpPreflight.token_source_get_count = 1; input.httpPreflight.trusted_http_request_count = 1;
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['trusted-sources-qa.json'].http_access_through_trusted_source, 'PASS');
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.ok(json['probe-summary.json'].evidence_issues.includes('MISSING_QA_EVIDENCE'));
});

test('HTTP success without passing OIDC diagnostics cannot establish trusted access', () => {
  const input = fixture(); input.oidcEvidence = [];
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.equal(json['trusted-sources-qa.json'].http_access_through_trusted_source, 'NOT_CERTIFIED');
  assert.ok(json['probe-summary.json'].evidence_issues.includes('HTTP_WITHOUT_PASSING_OIDC'));
});

for (const mutation of [
  value => { value.fixture.candidate_git_sha = '9'.repeat(40); },
  value => { value.fixture.deployment_id = 'dpl_AnotherFixture012345'; },
  value => { value.fixture.authority_run_id = value.fixture.authority_run_id.replace(/^2026/, '2025'); },
  value => { value.routes[0].hops[0].http_status_exact = 307; },
  value => { value.cross_origin_oidc_forward = true; },
  value => { value.max_redirects = 3; },
]) {
  test('altered HTTP identity or redirect decision is rejected by artifact finalization: ' + mutation.toString(), () => {
    const input = fixture(); mutation(input.httpPreflight);
    const json = decode(buildProbeEvidence(input));
    assert.equal(json['probe-summary.json'].result, 'FAIL');
    assert.equal(json['trusted-sources-qa.json'].http_preflight, null);
    assert.ok(json['probe-summary.json'].evidence_issues.includes('INVALID_HTTP_PREFLIGHT'));
  });
}

test('raw extra HTTP headers and inherited serializers cannot enter the artifact', () => {
  const input = fixture();
  Object.defineProperty(input.httpPreflight, 'toJSON', { value: () => ({ stolen: 'private-http-marker' }) });
  const json = decode(buildProbeEvidence(input));
  assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.equal(json['trusted-sources-qa.json'].http_preflight, null);
  assert.ok(!JSON.stringify(json).includes('private-http-marker'));
  const other = fixture(); other.httpPreflight.routes[0].hops[0].headers['set-cookie'] = 'private-cookie-marker';
  const otherJSON = decode(buildProbeEvidence(other));
  assert.equal(otherJSON['probe-summary.json'].result, 'FAIL');
  assert.ok(!JSON.stringify(otherJSON).includes('private-cookie-marker'));
});

test('matching protection redirects retain exact safe diagnostics in the nine-file failure artifact', async () => {
  const input = failedQA(); let latest, calls = 0;
  const token = signedFixture().token;
  const probe = createProbeHttpSession({ target: input.context.target, tokenSource: { get: async () => token },
    transport: async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers['x-vercel-trusted-oidc-idp-token'], calls === 1 ? undefined : token);
      return new Response(null, { status: 302, headers: { location: 'https://vercel.com/login?token=private-query-marker#private-fragment-marker',
        server: 'Vercel', 'set-cookie': 'private-cookie-marker' } });
    }, onEvidence: value => { latest = value; } });
  await assert.rejects(probe.get(origin + '/niveles-estadisticos'), /BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED/);
  assert.equal(calls, 2);
  input.httpPreflight = JSON.parse(canonical(latest));
  const denialBudget = createProbeTokenBudget({ origin, assertProtected: () => true,
    requestOIDCToken: async () => ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'), 'unit'].join('.'),
    onEvidence: value => { input.tokenBudget = value; } });
  await denialBudget.certificationTokenSource.get();
  const json = decode(buildProbeEvidence(input));
  const saved = json['trusted-sources-qa.json'];
  assert.equal(saved.http_access_through_trusted_source, 'FAIL');
  assert.equal(saved.http_preflight.error_code, 'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED');
  assert.equal(saved.http_preflight.anonymous.http_status_exact, 302);
  assert.equal(saved.http_preflight.routes[0].hops[0].http_status_exact, 302);
  assert.equal(saved.http_preflight.routes[0].hops[0].location.host, 'vercel.com');
  assert.equal(saved.http_preflight.routes[0].hops[0].location.path, '/login');
  assert.equal(saved.http_preflight.routes[0].hops[0].location.query_present, true);
  for (const marker of [token, 'private-query-marker', 'private-fragment-marker', 'private-cookie-marker']) assert.ok(!JSON.stringify(json).includes(marker));
  assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
});

async function baselineStoppedFixture(kind) {
  const input = failedQA(); input.oidcEvidence = []; input.accounting = null; let latest, tokenCalls = 0;
  const body = validSSR();
  const probe = createProbeHttpSession({ target: input.context.target,
    tokenSource: { get: async () => { tokenCalls++; throw new Error('must not request a credential'); } },
    transport: async () => new Response(kind === 'PUBLIC' ? body : '', { status: kind === 'PUBLIC' ? 200 : 503, headers: { 'content-type': 'text/html' } }),
    onEvidence: value => { latest = value; } });
  await assert.rejects(probe.establishAnonymousBaseline()); assert.equal(tokenCalls, 0);
  input.httpPreflight = JSON.parse(canonical(latest));
  input.tokenBudget = createProbeTokenBudget({ origin, assertProtected: () => false, requestOIDCToken: async () => { throw new Error('UNREACHABLE'); }, onEvidence: async () => {} }).evidence();
  return input;
}
for (const kind of ['PUBLIC', 'AMBIGUOUS']) {
  test('20 evidence records ' + kind + ' baseline and no OIDC/trusted/QA/AWS attempt', async () => {
    const input = await baselineStoppedFixture(kind), json = decode(buildProbeEvidence(input));
    const trusted = json['trusted-sources-qa.json'];
    assert.equal(trusted.schema_version, 'statistical-levels.identity-probe-trusted-sources.v7');
    assert.equal(trusted.anonymous_protection_baseline, kind);
    assert.equal(trusted.anonymous_http_status, kind === 'PUBLIC' ? 200 : 503);
    assert.equal(trusted.vercel_oidc_token_requested, false); assert.equal(trusted.trusted_request_attempted, false);
    assert.equal(trusted.oidc_validation_result, 'NOT_RUN'); assert.equal(trusted.http_access_through_trusted_source, 'NOT_RUN');
    assert.equal(trusted.trusted_sources_access, 'NOT_RUN'); assert.equal(trusted.trusted_sources_live_certified, false);
    assert.equal(trusted.baseline_stop_reason, kind === 'PUBLIC' ? 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED' : 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
    assert.equal(trusted.preview_qa_result, 'NOT_RUN');
    assert.equal(trusted.product_report, null); assert.equal(json['qa-attestation.json'].attestation, null);
    assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
    assert.ok(!json['probe-summary.json'].evidence_issues.includes('HTTP_WITHOUT_PASSING_OIDC'));
  });
  test(kind + ' evidence rejects forged successful OIDC/QA/AWS outcomes', async () => {
    const stopped = await baselineStoppedFixture(kind), input = fixture(); input.httpPreflight = stopped.httpPreflight;
    const json = decode(buildProbeEvidence(input)); assert.equal(json['probe-summary.json'].result, 'FAIL');
    for (const issue of ['OIDC_WITHOUT_PROTECTED_BASELINE', 'QA_WITHOUT_PROTECTED_BASELINE', 'AWS_WITHOUT_PROTECTED_BASELINE']) assert.ok(json['probe-summary.json'].evidence_issues.includes(issue), issue);
    assert.equal(json['trusted-sources-qa.json'].trusted_sources_live_certified, false);
    assert.equal(json['trusted-sources-qa.json'].trusted_sources_access, 'NOT_RUN');
    assert.equal(json['aws-oidc-summary.json'].result, 'FAIL'); // Proof cannot override the failed protection/QA prerequisites.
  });
  for (const mutate of [x => { x.anonymous_protection_baseline = 'PROTECTED'; }, x => { x.vercel_oidc_token_requested = true; },
    x => { x.trusted_request_attempted = true; }, x => { x.trusted_sources_live_certified = true; }]) {
    test(kind + ' cannot be relabeled as protected/token/trusted/live in sanitized evidence: ' + mutate.toString(), async () => {
      const input = await baselineStoppedFixture(kind); mutate(input.httpPreflight);
      const json = decode(buildProbeEvidence(input)); assert.equal(json['probe-summary.json'].result, 'FAIL');
      assert.equal(json['trusted-sources-qa.json'].http_preflight, null); assert.equal(json['trusted-sources-qa.json'].trusted_sources_live_certified, false);
      assert.ok(json['probe-summary.json'].evidence_issues.includes('INVALID_HTTP_PREFLIGHT'));
    });
  }
}
test('20 protected success evidence independently certifies exact affirmative baseline', () => {
  const json = decode(buildProbeEvidence(fixture())), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.anonymous_protection_baseline, 'PROTECTED'); assert.equal(trusted.vercel_oidc_token_requested, true);
  assert.equal(trusted.trusted_request_attempted, true); assert.equal(trusted.trusted_sources_access, 'PASS'); assert.equal(trusted.trusted_sources_live_certified, true);
});

async function lifecycleEvidence(mode) {
  const input = fixture();
  let now = 1800000000000, requests = 0, httpCalls = 0, failure = null;
  const realNow = Date.now; Date.now = () => now;

  try {
    await runProtectedProbeQA({ target: input.context.target,
      requestOIDCToken: async () => {
        requests++;
        if (mode === 'refresh-identity-failure' && requests === 2) throw new Error('OIDC_IDENTITY_FAILURE');
        return ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 600 })).toString('base64url'), 'unit'].join('.');
      },
      onEvidence: value => { input.httpPreflight = value; },
      onTokenEvidence: value => { input.tokenBudget = value; },
      onCertificationEvidence: value => { input.certificationHttp = value; },
      transport: async url => {
        httpCalls++;
        if (httpCalls === 1) return new Response('', { status: 302, headers: { location: 'https://vercel.com/login' } });
        if (mode === 'EN-failure' && httpCalls === 3) return new Response('', { status: 503 });
        return new Response(validSSR(new URL(url).pathname), { status: 200, headers: { 'content-type': 'text/html' } });
      },
      runQA: async ({ tokenSource }) => {
        if (mode !== 'no-refresh') { now += 575000; await tokenSource.get(); }
        if (mode === 'budget-exhausted') { now += 575000; await tokenSource.get(); }
        return input.productReport;
      }
    });
  } catch (e) { failure = e.message; } finally { Date.now = realNow; }
  input.oidcEvidence = [signedFixture().evidence];
  if (requests === 2) input.oidcEvidence.push(mode === 'refresh-identity-failure' ? signedFixture(P.vercel_audience, { environment: 'unexpected' }).evidence : signedFixture().evidence);
  if (failure) {
    input.outcomes.qa = 'failure'; input.outcomes.aws_assume = input.outcomes.aws_identity = 'skipped';
    input.productReport = input.accounting = input.attestation = input.awsProof = input.browserAuthority = null;
  } else input.oidcEvidence.push(signedFixture(P.aws_audience).evidence);
  return { input, requests, failure };
}
for (const mode of ['no-refresh', 'one-refresh']) test('phase artifact counters and AWS separation: ' + mode, async () => {
  const { input, requests, failure } = await lifecycleEvidence(mode); assert.equal(failure, null);
  const result = decode(buildProbeEvidence(input)), qa = result['trusted-sources-qa.json'];
  assert.equal(result['probe-summary.json'].result, 'PASS');
  assert.equal(qa.vercel_certification_oidc_token_request_count, 1);
  assert.equal(qa.vercel_post_certification_qa_refresh_count, mode === 'one-refresh' ? 1 : 0);
  assert.equal(qa.vercel_total_oidc_token_request_count, requests);
  assert.equal(qa.trusted_sources_certified_before_qa_refresh, true);
  assert.equal(qa.certification_http.routes.length, 1); assert.equal(qa.trusted_sources_live_certified, true);
  assert.equal(result['aws-oidc-summary.json'].oidc_claim_evidence.length, 1);
});
for (const mode of ['refresh-identity-failure', 'budget-exhausted', 'EN-failure']) test('recorded certification survives later QA failure: ' + mode, async () => {
  const { input, failure } = await lifecycleEvidence(mode); assert.ok(failure);
  const result = decode(buildProbeEvidence(input)), qa = result['trusted-sources-qa.json'];
  assert.equal(result['probe-summary.json'].result, 'FAIL');
  assert.equal(qa.trusted_sources_access, 'PASS'); assert.equal(qa.trusted_sources_live_certified, true);
  assert.equal(qa.result, 'FAIL'); assert.equal(result['aws-oidc-summary.json'].result, 'NOT_RUN');
  assert.equal(qa.vercel_certification_oidc_token_request_count, 1); assert.ok(qa.vercel_total_oidc_token_request_count <= 2);
  if (mode === 'budget-exhausted') assert.equal(qa.token_budget_stop_reason, 'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED');
});
for (const mutate of [
  x => { x.tokenBudget.vercel_certification_oidc_token_request_count = 2; },
  x => { x.tokenBudget.vercel_post_certification_qa_refresh_count = 2; },
  x => { x.tokenBudget.origin = 'https://luiguiherrera-otherfixture-luigui-herrera-s-projects.vercel.app'; },
  x => { x.tokenBudget.certification_recorded = false; },
  x => { x.certificationHttp.routes[0].path = '/en/statistical-levels'; },
  x => { x.certificationHttp.anonymous_protection_baseline = 'PUBLIC'; },
  x => { x.oidcEvidence.push(signedFixture().evidence, signedFixture().evidence); }
]) test('forged phase budget or certification receipt cannot certify QA/AWS: ' + mutate.toString(), () => {
  const input = fixture(); mutate(input); const result = decode(buildProbeEvidence(input));
  assert.equal(result['probe-summary.json'].result, 'FAIL'); assert.equal(result['qa-attestation.json'].result, 'FAIL');
  assert.equal(result['aws-oidc-summary.json'].result, 'FAIL');
});
test('a valid budget from certification intermediate state cannot authorize QA/AWS', () => {
  const input = fixture();
  Object.assign(input.tokenBudget, { phase: 'CERTIFICATION', certification_recorded: false, trusted_sources_certified_before_qa_refresh: false });
  const result = decode(buildProbeEvidence(input));
  assert.equal(result['probe-summary.json'].result, 'FAIL'); assert.equal(result['aws-oidc-summary.json'].result, 'FAIL');
});

// Three independent layers: protection acceptance, initial DOM binding, then browser authority/product QA.
async function httpLayerFailure(html, status = 200) {
  const input = failedQA(); input.accounting = null;
  let requests = 0;
  await assert.rejects(runProtectedProbeQA({ target: input.context.target,
    requestOIDCToken: async () => ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'), 'unit'].join('.'),
    onEvidence: value => { input.httpPreflight = value; },
    onTokenEvidence: value => { input.tokenBudget = value; },
    onCertificationEvidence: value => { input.certificationHttp = value; },
    transport: async () => requests++ === 0 ? new Response('', { status: 302, headers: { location: 'https://vercel.com/login' } }) :
      new Response(html, { status, headers: status === 302 ? { location: 'https://vercel.com/login' } : { 'content-type': 'text/html' } }),
    runQA: async () => { assert.fail('browser QA must not run after failed HTTP binding'); }
  }));
  return input;
}
for (const [name, html] of [
  ['generic unrelated HTML', '<html><body><h1>Unrelated</h1></body></html>'],
  ['marker names only in comments', '<html><body><!-- <div class="sl-page"><header class="sl-heading"><h1>¿Dónde está este activo frente a su propia historia?</h1></header><div id="sl-controls" class="sl-controls"></div></div> --></body></html>'],
  ['marker names only in script string', '<html><body><script>const stale = \'<div id="sl-controls" class="sl-controls"></div>\';</script></body></html>'],
]) test('layer 2 failure preserves validated layer 1 and cannot reach layer 3/AWS: ' + name, async () => {
  const input = await httpLayerFailure(html), json = decode(buildProbeEvidence(input)), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.vercel_protection_oidc_accepted, true);
  assert.equal(trusted.trusted_sources_access, 'PASS'); assert.equal(trusted.trusted_sources_live_certified, true);
  assert.equal(trusted.http_application_fixture_binding, 'FAIL');
  assert.equal(trusted.browser_authority_run_id_exact_match, 'NOT_RUN'); assert.equal(trusted.preview_product_qa, 'NOT_RUN');
  assert.equal(trusted.browser_authority, null); assert.equal(trusted.certification_http, null);
  assert.equal(trusted.vercel_certification_oidc_token_request_count, 1); assert.equal(trusted.vercel_post_certification_qa_refresh_count, 0);
  assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
});

test('protection denial remains layer 1 FAIL rather than false HTTP application success', async () => {
  const json = decode(buildProbeEvidence(await httpLayerFailure('', 302))), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.vercel_protection_oidc_accepted, false); assert.equal(trusted.trusted_sources_access, 'FAIL');
  assert.equal(trusted.http_application_fixture_binding, 'FAIL'); assert.equal(trusted.browser_authority_run_id_exact_match, 'NOT_RUN');
});

test('valid SSR with no sl-authority separately records browser-mounted exact authority', () => {
  const json = decode(buildProbeEvidence(fixture())), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.vercel_protection_oidc_accepted, true); assert.equal(trusted.http_application_fixture_binding, 'PASS');
  assert.equal(trusted.sl_controls_dom_present, true); assert.equal(trusted.second_ssr_marker_match, true);
  assert.equal(trusted.http_sl_authority_dom_present, false); assert.equal(trusted.sl_authority_dom_present, true);
  assert.equal(trusted.browser_authority_run_id_exact_match, 'PASS'); assert.equal(trusted.preview_product_qa, 'PASS');
  assert.equal(json['probe-summary.json'].result, 'PASS');
});

function failedBrowserAuthority(input, error = 'BROWSER_AUTHORITY_MISMATCH') {
  input.outcomes.qa = 'failure'; input.outcomes.aws_assume = input.outcomes.aws_identity = 'skipped';
  input.attestation = input.awsProof = null; input.oidcEvidence = [signedFixture().evidence];
  input.browserAuthority.result = 'FAIL'; input.browserAuthority.error_code = error;
  const route = input.browserAuthority.routes[1]; route.result = 'FAIL'; route.error_code = error;
  route.browser_authority_run_id_exact_match = false;
  if (error === 'BROWSER_AUTHORITY_DOM') { route.sl_authority_dom_present = false; route.authority_field_structured = false; }
  return input;
}
for (const error of ['BROWSER_AUTHORITY_MISMATCH', 'BROWSER_AUTHORITY_DOM']) test('browser authority rejection preserves both earlier layers: ' + error, () => {
  const input = failedBrowserAuthority(fixture(), error), json = decode(buildProbeEvidence(input)), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.vercel_protection_oidc_accepted, true); assert.equal(trusted.trusted_sources_access, 'PASS');
  assert.equal(trusted.http_application_fixture_binding, 'PASS'); assert.equal(trusted.certification_http.routes.length, 1);
  assert.equal(trusted.browser_authority_run_id_exact_match, 'FAIL'); assert.equal(trusted.preview_product_qa, 'FAIL');
  assert.equal(trusted.browser_authority.error_code, error); assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
});

test('malformed browser proof cannot leak its values or rewrite earlier layer facts', () => {
  const input = fixture(); input.browserAuthority.observed_raw_html = 'private-browser-evidence-marker';
  const json = decode(buildProbeEvidence(input)), trusted = json['trusted-sources-qa.json'];
  assert.equal(trusted.vercel_protection_oidc_accepted, true); assert.equal(trusted.http_application_fixture_binding, 'PASS');
  assert.equal(trusted.browser_authority, null); assert.equal(json['probe-summary.json'].result, 'FAIL');
  assert.ok(json['probe-summary.json'].evidence_issues.includes('INVALID_BROWSER_AUTHORITY'));
  assert.ok(!JSON.stringify(json).includes('private-browser-evidence-marker'));
});
for (const mutate of [
  x => { x.fixture.origin = 'https://luiguiherrera-otherfixture-luigui-herrera-s-projects.vercel.app'; },
  x => { x.fixture.candidate_git_sha = 'f'.repeat(40); },
  x => { x.fixture.deployment_id = 'dpl_AnotherFixture012345'; },
  x => { x.fixture.authority_run_id += '-different'; },
  x => { x.fixture.sealed_manifest_sha256 = 'f'.repeat(64); },
  x => { x.routes[0].browser_authority_run_id_exact_match = false; },
  x => { x.routes[0].route_identity_exact_match = false; },
  x => { x.routes[0].guide_open = false; },
  x => { x.routes.pop(); },
]) test('forged or foreign browser proof cannot authorize QA/AWS: ' + mutate.toString(), () => {
  const input = fixture(); mutate(input.browserAuthority);
  const json = decode(buildProbeEvidence(input)), trusted = json['trusted-sources-qa.json'];
  assert.equal(json['probe-summary.json'].result, 'FAIL'); assert.equal(json['aws-oidc-summary.json'].result, 'FAIL');
  assert.equal(trusted.vercel_protection_oidc_accepted, true); assert.equal(trusted.http_application_fixture_binding, 'PASS');
  assert.equal(trusted.browser_authority_run_id_exact_match, 'FAIL');
});

test('the CLI requires exact browser authority before attestation and again before AWS', async () => {
  const source = await fs.readFile(new URL('../scripts/probe-cli.mjs', import.meta.url), 'utf8');
  const first = source.indexOf("requireProbeBrowserAuthority(await readOptional(path.join(qaDirectory, 'browser-authority.json')), verified)");
  const attestation = source.indexOf("await save(path.join(root, 'qa-attestation.json'), attestProbe");
  const next = source.indexOf("requireProbeBrowserAuthority(await readOptional(path.join(qaDirectory, 'browser-authority.json')), context.target)");
  const aws = source.indexOf("if (mode === 'aws-preflight') await probeOIDC(P.aws_audience)");
  assert.ok(first > 0 && first < attestation); assert.ok(next > attestation && next < aws);
});


// Evidence-only extension: legacy result bytes stay independent of observability availability.
test('observability retains the exact first assertion through finalizer and canonical nine-file publication', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-observation-artifact-'));
  try {
    const rsc = { kind: 'request_failure', url: origin + '/niveles-estadisticos?_rsc=discarded-query-value',
      type: 'Fetch', canceled: true, rsc: true, prefetch: true, error_code: 'net::ERR_ABORTED' };
    const platform = { kind: 'request_failure', url: 'https://vercel.live/_next-live/feedback/session', type: 'Script' };
    const input = failedQA([rsc, platform]);
    const observer = createProductQAObservability({ out: path.join(dir, 'qa'), origin });
    observer.context({ suite_id: 'qa-statistical-levels.mjs', test_id: 'keyboard-order', test_name: 'keyboard order',
      assertion_id: 'focus-window', action_id: 'Tab', route: '/niveles-estadisticos',
      source_file: 'scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs', source_line: 147 });
    observer.recordEvent(rsc);
    const first = new assert.AssertionError({ actual: false, expected: true, operator: 'strictEqual', message: 'keyboard order must reach 3Y' });
    assert.equal(observer.captureFailure(first), first);
    observer.recordEvent(platform);
    observer.captureFailure(new Error('PRODUCT_SUITE_FAILED'));
    observer.finish(input.accounting);
    const productObservability = observer.evidence();
    const original = buildProbeEvidence(input), changed = buildProbeEvidence({ ...input, productObservability });
    for (const name of ['probe-summary.json', 'trusted-sources-qa.json', 'application-network-summary.json', 'aws-oidc-summary.json', 'qa-attestation.json']) assert.deepEqual(changed[name], original[name], name);
    const decoded = decode(changed);
    for (const name of productQAObservabilityFiles) assert.equal(decoded[name].capture_status, 'RECORDED');
    const captured = decoded['first-product-failure.json'].evidence.failure;
    assert.equal(captured.message, first.message); assert.equal(captured.expected, true); assert.equal(captured.actual, false);
    assert.equal(captured.assertion_id, 'focus-window');
    assert.equal(decoded['probe-summary.json'].result, 'FAIL');
    const published = path.join(dir, 'artifact');
    await writeProbeEvidence(published, { ...input, productObservability });
    assert.deepEqual((await fs.readdir(published)).sort(), [...probeEvidenceFiles].sort());
    const combined = Object.values(changed).map(bytes => bytes.toString()).join('');
    assert.ok(!combined.includes('discarded-query-value'));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('unavailable or hostile observation cannot rewrite legacy PASS/FAIL or expose unsafe fields', () => {
  const input = fixture(), baseline = buildProbeEvidence(input);
  for (const observation of [null, { firstFailure: { token: 'must-never-export-this-input' }, timeline: null, phaseSummary: null }]) {
    const value = buildProbeEvidence({ ...input, productObservability: observation });
    for (const name of ['probe-summary.json', 'trusted-sources-qa.json', 'application-network-summary.json', 'aws-oidc-summary.json', 'qa-attestation.json']) assert.deepEqual(value[name], baseline[name], name);
    for (const name of productQAObservabilityFiles) {
      const file = JSON.parse(value[name]);
      assert.equal(file.capture_status, observation === null ? 'NOT_AVAILABLE' : 'REJECTED');
      assert.equal(file.evidence, null);
      assert.ok(!value[name].toString().includes('must-never-export-this-input'));
    }
  }
});

test('cleanup abort before classifier still preserves valid pending first-failure evidence', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-observation-cleanup-'));
  try {
    const observer = createProductQAObservability({ out: dir, origin });
    observer.context({ suite_id: 'qa-statistical-levels.mjs', test_id: 'cleanup-fixture', action_id: 'assertion' });
    const first = new assert.AssertionError({ actual: 0, expected: 1, operator: 'strictEqual', message: 'first failure survives close abort' });
    observer.captureFailure(first);
    observer.lifecycle('BROWSER_CLOSE_ABORTED'); observer.flush();
    const input = failedQA(); input.accounting = null;
    const files = decode(buildProbeEvidence({ ...input, productObservability: observer.evidence() }));
    assert.equal(files['first-product-failure.json'].capture_status, 'RECORDED');
    assert.equal(files['first-product-failure.json'].evidence.failure.message, first.message);
    assert.equal(files['product-qa-phase-summary.json'].evidence.classifier_alignment, 'PENDING');
    assert.equal(files['probe-summary.json'].result, 'FAIL');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
