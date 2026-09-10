import fs from 'node:fs/promises';
import path from 'node:path';
import { canonical, exactKeys, need, P, sha, validateProductReport, verifiedOrigin } from './release-core.mjs';
import { validateProbeAttestation } from './probe-core.mjs';

export const probeEvidenceFiles = Object.freeze([
  'probe-summary.json', 'trusted-sources-qa.json', 'application-network-summary.json',
  'aws-oidc-summary.json', 'qa-attestation.json', 'evidence-sha256.json',
]);
const HASH = /^[a-f0-9]{64}$/, SHA = /^[a-f0-9]{40}$/, ID = /^[1-9][0-9]{0,19}$/;
const OPERATION = 'PROBE_IDENTITY';
const outcomeNames = ['resolve', 'qa', 'aws_assume', 'aws_identity'];
const outcomeValues = ['success', 'failure', 'cancelled', 'skipped'];
const role = 'LuiguiHerreraStatisticalLevelsReleaseInvoker';
const eventKeys = ['kind', 'origin', 'path', 'type', 'status', 'canceled', 'rsc', 'prefetch', 'error_code', 'source'];
const accountingKeys = ['raw_platform_events', 'raw_rsc_events', 'application_console_errors',
  'required_application_request_failures', 'hydration_errors', 'unclassified_failures', 'ledger'];
const eventTypes = ['', 'Document', 'Stylesheet', 'Image', 'Media', 'Font', 'Script', 'TextTrack', 'XHR',
  'Fetch', 'Prefetch', 'EventSource', 'WebSocket', 'Manifest', 'SignedExchange', 'Ping', 'CSPViolationReport', 'Preflight', 'Other'];
const classificationForKind = { request_failure: 'required_application_request_failure',
  console_error: 'application_console_error', exception: 'hydration_or_application_exception',
  unknown: 'unclassified', unclassified: 'unclassified' };

function jsonCopy(value) { return JSON.parse(canonical(value)); }
function equal(a, b) { return canonical(a).equals(canonical(b)); }
function matches(pattern, value) { return typeof value === 'string' && pattern.test(value); }
function validRun(run) {
  exactKeys(run, ['id', 'attempt', 'execution_sha']);
  need(matches(ID, run.id) && matches(ID, run.attempt) && matches(SHA, run.execution_sha), 'EVIDENCE_RUN');
  return { id: run.id, attempt: run.attempt, execution_sha: run.execution_sha };
}
function validFixture(target) {
  if (target === null) return null;
  const keys = ['operation', 'phase', 'candidate_git_sha', 'deployment_id', 'origin',
    'github_deployment_id', 'status_id', 'status_sha256', 'commit_status_id', 'commit_status_sha256'];
  const authorityPresent = Object.hasOwn(target, 'authority_run_id') || Object.hasOwn(target, 'sealed_manifest_sha256');
  exactKeys(target, authorityPresent ? [...keys, 'authority_run_id', 'sealed_manifest_sha256'] : keys);
  need(target.operation === OPERATION && target.phase === 'preview' && matches(SHA, target.candidate_git_sha) &&
    matches(/^dpl_[a-zA-Z0-9]{10,80}$/, target.deployment_id), 'EVIDENCE_FIXTURE');
  need(verifiedOrigin(target.origin) === target.origin, 'EVIDENCE_ORIGIN');
  for (const key of ['github_deployment_id', 'status_id', 'commit_status_id']) need(Number.isSafeInteger(target[key]) && target[key] > 0, 'EVIDENCE_METADATA_ID');
  for (const key of ['status_sha256', 'commit_status_sha256']) need(matches(HASH, target[key]), 'EVIDENCE_METADATA_HASH');
  if (authorityPresent) need(matches(/^\d{8}T\d{9}Z-[a-f0-9-]{36}$/, target.authority_run_id) && matches(HASH, target.sealed_manifest_sha256), 'EVIDENCE_AUTHORITY');
  return jsonCopy(target);
}
function validContext(context) {
  exactKeys(context, ['run', 'target', 'workflow_sha256']);
  need(matches(HASH, context.workflow_sha256), 'EVIDENCE_WORKFLOW_HASH');
  return { run: validRun(context.run), target: validFixture(context.target), workflow_sha256: context.workflow_sha256 };
}
function safeOrigin(origin, previewOrigin) {
  need(typeof origin === 'string' && origin.length <= 2048, 'EVIDENCE_EVENT_ORIGIN');
  if (['', 'null', previewOrigin, 'https://vercel.live'].includes(origin)) return origin;
  const parsed = new URL(origin);
  need(['https:', 'http:'].includes(parsed.protocol) && parsed.origin === origin && !parsed.username && !parsed.password &&
    parsed.pathname === '/' && !parsed.search && !parsed.hash, 'EVIDENCE_EVENT_ORIGIN');
  // Keep every event; only unrelated origin strings are replaced by irreversible identifiers.
  return 'sha256:' + sha(origin);
}
function group(ledger, classification) {
  const counts = new Map();
  for (const item of ledger.filter(x => x.classification === classification)) {
    const hash = sha(canonical(item.event)); counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([sha256, count]) => ({ sha256, count, classification }));
}
export function sanitizeProbeAccounting(input, previewOrigin) {
  need(previewOrigin && verifiedOrigin(previewOrigin) === previewOrigin, 'EVIDENCE_ACCOUNTING_PREVIEW');
  const hasAuth = input && Object.hasOwn(input, 'authFailures');
  exactKeys(input, hasAuth ? [...accountingKeys, 'authFailures'] : accountingKeys);
  need(Array.isArray(input.ledger) && input.ledger.length <= 100000, 'EVIDENCE_LEDGER_SIZE');
  const original = [], ledger = [];
  for (const item of input.ledger) {
    exactKeys(item, ['event', 'classification']); exactKeys(item.event, eventKeys);
    const event = item.event;
    need(typeof event.kind === 'string' && Object.hasOwn(classificationForKind, event.kind) && eventTypes.includes(event.type), 'EVIDENCE_EVENT_ENUM');
    need(Number.isInteger(event.status) && event.status >= 0 && event.status <= 599, 'EVIDENCE_EVENT_STATUS');
    need(['canceled', 'rsc', 'prefetch'].every(k => typeof event[k] === 'boolean'), 'EVIDENCE_EVENT_BOOL');
    need(typeof event.error_code === 'string' && /^(?:|net::ERR_[A-Z_]{1,80})$/.test(event.error_code), 'EVIDENCE_EVENT_CODE');
    need(['', 'Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.source), 'EVIDENCE_EVENT_SOURCE');
    const origin = safeOrigin(event.origin, previewOrigin);
    need(event.path === '' || matches(HASH, event.path) || (event.origin === 'https://vercel.live' && event.path === '/_next-live/feedback/'), 'EVIDENCE_EVENT_PATH');
    const platform = event.origin === 'https://vercel.live' && event.path === '/_next-live/feedback/' && ['request_failure', 'console_error', 'exception'].includes(event.kind);
    const rsc = event.kind === 'request_failure' && event.origin === previewOrigin && event.canceled &&
      event.rsc && event.prefetch && event.error_code === 'net::ERR_ABORTED';
    need(platform ? item.classification === 'platform_non_application' :
      item.classification === classificationForKind[event.kind] || (rsc && item.classification === 'rsc_non_application'), 'EVIDENCE_EVENT_CLASSIFICATION');
    original.push(jsonCopy(item)); ledger.push({ event: { ...jsonCopy(event), origin }, classification: item.classification });
  }
  const grouped = { raw_platform_events: group(original, 'platform_non_application'), raw_rsc_events: group(original, 'rsc_non_application') };
  for (const key of Object.keys(grouped)) need(equal(input[key], grouped[key]), 'EVIDENCE_ACCOUNTING_GROUPS');
  const counters = { application_console_errors: 'application_console_error', required_application_request_failures: 'required_application_request_failure', hydration_errors: 'hydration_or_application_exception' };
  const result = { ...grouped };
  for (const [key, classification] of Object.entries(counters)) {
    const count = original.filter(x => x.classification === classification).length;
    need(input[key] === count, 'EVIDENCE_ACCOUNTING_COUNTER'); result[key] = count;
  }
  const unclassified = original.filter(x => x.classification === 'unclassified').map(x => sha(canonical(x.event)));
  need(equal(input.unclassified_failures, unclassified), 'EVIDENCE_UNCLASSIFIED_EVENTS');
  const authFailures = hasAuth ? input.authFailures : [];
  need(Array.isArray(authFailures) && authFailures.length <= 100000 && authFailures.every(x => x === 'CREDENTIAL_SCOPE_OR_REDIRECT_REJECTED'), 'EVIDENCE_AUTH_FAILURE');
  return { ...result, unclassified_failures: unclassified, ledger, authFailures: [...authFailures] };
}
function validAWS(proof, run) {
  exactKeys(proof, ['result', 'assumed_role', 'account_match', 'session_match', 'workflow_run_id', 'workflow_run_attempt', 'workflow_execution_sha']);
  need(proof.result === 'PASS' && proof.assumed_role === role && proof.account_match === true && proof.session_match === true &&
    proof.workflow_run_id === run.id && proof.workflow_run_attempt === run.attempt && proof.workflow_execution_sha === run.execution_sha, 'EVIDENCE_AWS_PROOF');
  return jsonCopy(proof);
}
function rejectedDigest(input) {
  try { const bytes = canonical(input); return bytes.length <= 20_000_000 ? sha(bytes) : null; } catch { return null; }
}

export function buildProbeEvidence(input) {
  const issues = [];
  function inspect(value, validator, code) {
    if (value === null || value === undefined) return null;
    try { return validator(value); } catch { issues.push(code); return null; }
  }
  need(input && typeof input === 'object' && !Array.isArray(input), 'EVIDENCE_INPUT');
  const allowed = ['context', 'outcomes', 'productReport', 'accounting', 'awsProof', 'attestation'];
  if (Object.keys(input).some(k => !allowed.includes(k))) issues.push('UNEXPECTED_INPUT_FIELD');
  const context = inspect(input.context, validContext, 'INVALID_CONTEXT');
  let outcomes;
  try {
    exactKeys(input.outcomes, outcomeNames);
    need(Object.values(input.outcomes).every(x => outcomeValues.includes(x)), 'EVIDENCE_OUTCOME');
    outcomes = { ...input.outcomes };
  } catch { issues.push('INVALID_OUTCOMES'); outcomes = Object.fromEntries(outcomeNames.map(k => [k, 'failure'])); }
  const report = inspect(input.productReport, value => {
    validateProductReport(value);
    for (const group of [...value.raw_platform_events, ...value.raw_rsc_events]) need(matches(HASH, group.sha256), 'EVIDENCE_GROUP_HASH');
    return jsonCopy(value);
  }, 'INVALID_PRODUCT_REPORT');
  const accounting = inspect(input.accounting, value => sanitizeProbeAccounting(value, context?.target?.origin), 'INVALID_NETWORK_ACCOUNTING');
  const aws = inspect(input.awsProof, value => { need(context, 'EVIDENCE_RUN'); return validAWS(value, context.run); }, 'INVALID_AWS_PROOF');
  const attestation = inspect(input.attestation, value => {
    need(context?.target && report, 'EVIDENCE_QA_BINDING');
    validateProbeAttestation(value, context.run, context.target, context.workflow_sha256);
    need(matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, value.timestamp), 'EVIDENCE_TIMESTAMP');
    need(equal(value.product_report, report), 'EVIDENCE_REPORT_BINDING');
    return jsonCopy(value);
  }, 'INVALID_ATTESTATION');
  if (report && accounting) {
    for (const key of ['raw_platform_events', 'raw_rsc_events', 'application_console_errors',
      'required_application_request_failures', 'hydration_errors', 'unclassified_failures']) {
      if (!equal(report[key], accounting[key])) issues.push('PRODUCT_NETWORK_MISMATCH');
    }
  }
  const noNetworkFailures = accounting && accounting.application_console_errors === 0 &&
    accounting.required_application_request_failures === 0 && accounting.hydration_errors === 0 &&
    accounting.unclassified_failures.length === 0 && accounting.authFailures.length === 0;
  const complete = { resolve: !!context?.target, qa: !!(report && accounting && attestation && noNetworkFailures),
    aws_assume: true, aws_identity: !!aws };
  const steps = {};
  for (const name of outcomeNames) {
    const outcome = outcomes[name];
    steps[name] = { outcome, result: outcome === 'skipped' ? 'NOT_RUN' : outcome === 'success' && complete[name] ? 'PASS' : 'FAIL' };
    if (outcome === 'success' && !complete[name]) issues.push('MISSING_' + name.toUpperCase() + '_EVIDENCE');
  }
  if (outcomes.qa === 'success' && steps.resolve.result !== 'PASS') issues.push('QA_WITHOUT_RESOLVED_PREVIEW');
  if (['aws_assume', 'aws_identity'].some(k => outcomes[k] === 'success') && steps.qa.result !== 'PASS') issues.push('AWS_WITHOUT_PASSING_QA');
  if (outcomes.aws_identity === 'success' && steps.aws_assume.result !== 'PASS') issues.push('IDENTITY_WITHOUT_ASSUME_ROLE');
  if (outcomes.resolve === 'skipped' && context?.target) issues.push('UNEXPECTED_RESOLUTION_EVIDENCE');
  if (outcomes.qa === 'skipped' && (report || accounting || attestation)) issues.push('UNEXPECTED_QA_EVIDENCE');
  if (outcomes.aws_identity === 'skipped' && aws) issues.push('UNEXPECTED_AWS_EVIDENCE');
  const uniqueIssues = [...new Set(issues)].sort();
  const result = uniqueIssues.length || Object.values(steps).some(x => x.result === 'FAIL') ? 'FAIL' :
    Object.values(steps).every(x => x.result === 'PASS') ? 'PASS' : 'NOT_RUN';
  const safeContext = context ?? { run: null, target: null, workflow_sha256: null };
  const qaState = steps.qa.result === 'PASS' && uniqueIssues.some(x => /PRODUCT|NETWORK|ATTESTATION|QA_WITHOUT/.test(x)) ? 'FAIL' : steps.qa.result;
  const evidence = {
    'probe-summary.json': { schema_version: 'statistical-levels.identity-probe-summary.v1', operation: OPERATION,
      classification: 'PROBE_ONLY', production_release_target: false, result, ...safeContext, steps, evidence_issues: uniqueIssues },
    'trusted-sources-qa.json': { schema_version: 'statistical-levels.identity-probe-trusted-sources.v1', result: qaState,
      preview_origin: context?.target?.origin ?? null, http_access_through_trusted_source: qaState,
      audience: P.vercel_audience, product_report: report },
    'application-network-summary.json': { schema_version: 'statistical-levels.identity-probe-network.v1', result: accounting ?
      (qaState === 'PASS' && noNetworkFailures ? 'PASS' : 'FAIL') : steps.qa.result === 'NOT_RUN' ? 'NOT_RUN' : 'FAIL',
      preview_origin: context?.target?.origin ?? null, unrelated_origin_redaction: 'SHA256', accounting,
      rejected_accounting_sha256: input.accounting != null && !accounting ? rejectedDigest(input.accounting) : null },
    'aws-oidc-summary.json': { schema_version: 'statistical-levels.identity-probe-aws.v1',
      result: steps.aws_identity.result, assume_role_with_web_identity: steps.aws_assume.result,
      credential_model: 'GITHUB_OIDC', identity: aws },
    'qa-attestation.json': { schema_version: 'statistical-levels.identity-probe-attestation-evidence.v1', result: qaState, attestation },
  };
  const files = Object.fromEntries(Object.entries(evidence).map(([name, value]) => [name, canonical(value)]));
  files['evidence-sha256.json'] = canonical({ schema_version: 'statistical-levels.identity-probe-evidence-sha256.v1', algorithm: 'SHA256',
    files: Object.fromEntries(Object.keys(files).sort().map(name => [name, { sha256: sha(files[name]), bytes: files[name].length }])) });
  return files;
}

export async function writeProbeEvidence(directory, input) {
  const files = buildProbeEvidence(input);
  const destination = path.resolve(directory);
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(destination);
  need(stat.isDirectory() && !stat.isSymbolicLink() && (await fs.readdir(destination)).length === 0, 'EVIDENCE_DESTINATION_NOT_EMPTY_OR_UNSAFE');
  // Publish the complete six-file bundle together; a write failure cannot expose a partial artifact.
  const staging = await fs.mkdtemp(path.join(path.dirname(destination), '.probe-evidence-publish-'));
  try {
    for (const name of probeEvidenceFiles) await fs.writeFile(path.join(staging, name), files[name], { flag: 'wx', mode: 0o600 });
    const current = await fs.lstat(destination);
    need(current.isDirectory() && !current.isSymbolicLink() && (await fs.readdir(destination)).length === 0, 'EVIDENCE_DESTINATION_NOT_EMPTY_OR_UNSAFE');
    await fs.rename(staging, destination);
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
  return JSON.parse(files['probe-summary.json']);
}
