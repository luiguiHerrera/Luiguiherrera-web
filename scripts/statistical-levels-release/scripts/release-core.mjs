import { createHash, createPublicKey, verify } from 'node:crypto';
import fs from 'node:fs/promises';

export const P = JSON.parse(await fs.readFile(new URL('../policy.json', import.meta.url), 'utf8'));
export const sha = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  function order(v) {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('NONFINITE_JSON');
    if (Array.isArray(v)) return v.map(order);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, order(v[k])]));
    return v;
  }
  return Buffer.from(JSON.stringify(order(value)));
}
export function need(ok, code) { if (!ok) throw new Error(code); }
export function exactKeys(value, keys, code = 'UNEXPECTED_FIELD') {
  need(value && !Array.isArray(value) && typeof value === 'object', code);
  need(Object.keys(value).sort().join('\n') === [...keys].sort().join('\n'), code);
}
export const ADOPT = 'ADOPT_EXISTING_PRODUCTION_BASELINE';
export const PROMOTE = 'PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE';
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, DEPLOYMENT = /^dpl_[a-zA-Z0-9]{10,80}$/;
const futureInputs = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha', 'expected_previous_production_deployment', 'previous_publication_date'];
export function selectTarget(inputs) {
  need(inputs && !Array.isArray(inputs) && Object.keys(inputs).every(k => ['operation', ...futureInputs].includes(k)), 'DISPATCH_INPUT_FIELDS');
  need([ADOPT, PROMOTE].includes(inputs.operation), 'OPERATION_REQUIRED');
  for (const value of Object.values(inputs)) need(typeof value === 'string', 'DISPATCH_INPUT_TYPE');
  if (inputs.operation === ADOPT) {
    need(futureInputs.every(k => !inputs[k]), 'ADOPTION_FUTURE_INPUT_FORBIDDEN');
    return { operation: ADOPT, phase: 'production', candidate_git_sha: P.baseline.production_git_sha,
      deployment_id: P.baseline.production_deployment_id, origin: P.production_origin,
      authority_run_id: P.baseline.authority_run_id, sealed_manifest_sha256: P.baseline.sealed_manifest_sha256 };
  }
  need(futureInputs.every(k => typeof inputs[k] === 'string' && inputs[k]), 'FUTURE_RELEASE_TARGET_UNSET');
  need(SHA.test(inputs.candidate_git_sha) && SHA.test(inputs.expected_previous_production_sha) &&
    DEPLOYMENT.test(inputs.candidate_deployment_id) && DEPLOYMENT.test(inputs.expected_previous_production_deployment) &&
    /^\d{4}-\d{2}-\d{2}$/.test(inputs.previous_publication_date) && Number.isFinite(Date.parse(inputs.previous_publication_date)) && new Date(inputs.previous_publication_date).toISOString().slice(0, 10) === inputs.previous_publication_date, 'FUTURE_TARGET_IDENTITY');
  need(inputs.candidate_git_sha !== inputs.expected_previous_production_sha && inputs.candidate_git_sha !== P.baseline.production_git_sha, 'NO_OP_RELEASE_FORBIDDEN');
  return { operation: PROMOTE, phase: 'preview', candidate_git_sha: inputs.candidate_git_sha, deployment_id: inputs.candidate_deployment_id,
    expected_previous_production_sha: inputs.expected_previous_production_sha,
    expected_previous_production_deployment: inputs.expected_previous_production_deployment,
    previous_publication_date: inputs.previous_publication_date };
}
export function verifiedOrigin(value, phase = 'preview') {
  const url = new URL(value);
  need(url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    url.pathname === '/' && !url.search && !url.hash, 'QA_ORIGIN');
  if (phase === 'production') need(url.origin === P.production_origin, 'PRODUCTION_ORIGIN');
  else need(phase === 'preview' && new RegExp(P.preview_hostname_pattern).test(url.hostname), 'PREVIEW_ORIGIN');
  return url.origin;
}
export function validateTarget(target) {
  need([ADOPT, PROMOTE].includes(target.operation) && SHA.test(target.candidate_git_sha) && DEPLOYMENT.test(target.deployment_id), 'ATTESTATION_CANDIDATE');
  need(target.phase === (target.operation === ADOPT ? 'production' : 'preview'), 'ATTESTATION_PHASE');
  verifiedOrigin(target.origin, target.phase);
  need(typeof target.authority_run_id === 'string' && /^\d{8}T\d{9}Z-[a-f0-9-]{36}$/.test(target.authority_run_id) && HASH.test(target.sealed_manifest_sha256), 'AUTHORITY_IDENTITY');
  if (target.operation === ADOPT) {
    need(target.candidate_git_sha === P.baseline.production_git_sha && target.deployment_id === P.baseline.production_deployment_id &&
      target.authority_run_id === P.baseline.authority_run_id && target.sealed_manifest_sha256 === P.baseline.sealed_manifest_sha256, 'BASELINE_IDENTITY');
  } else {
    need(target.authority_run_id.slice(0, 8) > P.baseline.authority_run_id.slice(0, 8), 'FUTURE_AUTHORITY_REQUIRED');
    need(target.candidate_git_sha !== P.baseline.production_git_sha && target.candidate_git_sha !== target.expected_previous_production_sha, 'NO_OP_RELEASE_FORBIDDEN');
  }
}
export function validateRun(env, workflowBytes, frozen) {
  need(env.GITHUB_REPOSITORY === P.repository, 'REPOSITORY');
  need(env.GITHUB_REF === 'refs/heads/' + P.branch, 'WORKFLOW_REF_BRANCH');
  need(env.GITHUB_EVENT_NAME === 'workflow_dispatch', 'TRIGGER');
  need(env.GITHUB_WORKFLOW_REF === P.workflow_ref, 'WORKFLOW_PATH');
  need(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') && env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA, 'WORKFLOW_EXECUTION_SHA');
  need(env.GITHUB_WORKFLOW === P.workflow_name, 'WORKFLOW_NAME');
  need(/^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? ''), 'RUN_ID');
  need(frozen.workflow_path === P.workflow_path && /^[a-f0-9]{64}$/.test(frozen.workflow_sha256), 'WORKFLOW_FREEZE');
  need(sha(workflowBytes) === frozen.workflow_sha256, 'WORKFLOW_SHA');
}
export function validateOIDCClaims(claims, audience, env, now) {
  need([P.vercel_audience, P.aws_audience].includes(audience), 'OIDC_AUDIENCE');
  const expected = { iss: P.issuer, aud: audience, repository: P.repository,
    ref: 'refs/heads/' + P.branch, workflow_ref: P.workflow_ref, workflow: P.workflow_name, sha: env.GITHUB_SHA,
    workflow_sha: env.GITHUB_SHA, run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT,
    event_name: 'workflow_dispatch', repository_id: P.repository_id, repository_owner_id: P.repository_owner_id };
  need(!('environment' in claims) && !('job_workflow_ref' in claims), 'UNEXPECTED_ENVIRONMENT_OR_REUSABLE_IDENTITY');
  for (const [key, value] of Object.entries(expected)) need(claims[key] === value, 'OIDC_' + key.toUpperCase());
  need(Number.isInteger(claims.exp) && Number.isInteger(claims.iat) && Number.isInteger(claims.nbf) &&
    claims.exp > now + 30 && claims.iat <= now + 30 && claims.nbf <= now + 30 && now - claims.iat <= 600, 'OIDC_TIME');
  if (audience === P.aws_audience) need(claims.sub === P.aws_subject, 'AWS_DEFAULT_SUBJECT_MISMATCH');
  return claims;
}
export function verifyOIDC(token, jwks, audience, env, now) {
  need(typeof token === 'string' && token.length < 20000, 'OIDC_TOKEN_FORMAT');
  const parts = token.split('.'); need(parts.length === 3, 'OIDC_TOKEN_FORMAT');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  need(header.alg === 'RS256' && typeof header.kid === 'string' && !header.jku && !header.x5u && !header.crit, 'OIDC_ALGORITHM');
  const matches = jwks.keys.filter(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256') && (!k.use || k.use === 'sig'));
  need(matches.length === 1, 'OIDC_KEY');
  const key = createPublicKey({ key: matches[0], format: 'jwk' });
  need(key.asymmetricKeyDetails.modulusLength >= 2048, 'OIDC_KEY_SIZE');
  need(verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url')), 'OIDC_SIGNATURE');
  return validateOIDCClaims(JSON.parse(Buffer.from(parts[1], 'base64url')), audience, env, now);
}
export function resolvePreview(deployments, statusSets, commitStatuses, target) {
  need(target.operation === PROMOTE && SHA.test(target.candidate_git_sha) && DEPLOYMENT.test(target.deployment_id), 'PREVIEW_TARGET');
  need(Array.isArray(deployments) && deployments.length < 100 && Array.isArray(commitStatuses) && commitStatuses.length < 100, 'DEPLOYMENT_METADATA_INCOMPLETE');
  const creator = x => x?.creator?.login === P.vercel_creator_login && x.creator.id === P.vercel_creator_id;
  const commits = commitStatuses.filter(s => s.context === 'Vercel').sort((a, b) => b.id - a.id);
  const commit = commits[0];
  need(commit && creator(commit) && commit.state === 'success' &&
    commit.target_url === P.vercel_details_base_url + target.deployment_id.slice(4), 'VERCEL_ID_BINDING');
  const matches = [];
  for (const deployment of deployments) {
    if (!creator(deployment) || deployment.sha !== target.candidate_git_sha || deployment.environment !== 'Preview' || deployment.production_environment !== false) continue;
    const statuses = statusSets[String(deployment.id)];
    need(Array.isArray(statuses) && statuses.length < 100, 'DEPLOYMENT_STATUS_INCOMPLETE');
    const latest = [...statuses].sort((a, b) => b.id - a.id)[0];
    if (!latest || !creator(latest) || latest.state !== 'success' || latest.environment !== 'Preview' || latest.updated_at !== commit.updated_at) continue;
    need(latest.deployment_url === `https://api.github.com/repos/${P.repository}/deployments/${deployment.id}`, 'PREVIEW_STATUS');
    const origin = verifiedOrigin(latest.environment_url);
    need(latest.target_url === origin && latest.log_url === origin, 'DEPLOYMENT_URL_BINDING');
    matches.push({ ...target, origin, github_deployment_id: deployment.id, status_id: latest.id, status_sha256: sha(canonical(latest)) });
  }
  need(matches.length === 1, 'PREVIEW_METADATA_AMBIGUOUS');
  return matches[0];
}
export function headersForRequest(url, headers, token, redirectedFrom, origin) {
  verifiedOrigin(origin, 'preview');
  const destination = new URL(url);
  if (redirectedFrom && new URL(redirectedFrom).origin === origin && destination.origin !== origin) throw new Error('CROSS_ORIGIN_REDIRECT');
  const clean = Object.fromEntries(Object.entries(headers).filter(([name]) => ![
    'x-vercel-trusted-oidc-idp-token', 'authorization', 'x-vercel-protection-bypass'
  ].includes(name.toLowerCase())));
  if (destination.origin === origin) {
    need(destination.protocol === 'https:' && !destination.username && !destination.password && typeof token === 'string' && token, 'CREDENTIAL_DESTINATION');
    clean['x-vercel-trusted-oidc-idp-token'] = token;
  }
  return clean;
}
export async function protectedGet(url, token, origin, transport = fetch) {
  need(new URL(url).origin === verifiedOrigin(origin), 'CREDENTIAL_DESTINATION');
  const response = await transport(url, { method: 'GET', redirect: 'manual',
    headers: headersForRequest(url, {}, token, undefined, origin), signal: AbortSignal.timeout(30000) });
  need(response.status < 300 || response.status >= 400, 'PREVIEW_REDIRECT_REJECTED');
  need(response.status === 200, 'PREVIEW_HTTP_STATUS');
  return response;
}
export async function publicProductionGet(url, transport = fetch) {
  need(new URL(url).origin === verifiedOrigin(P.production_origin, 'production'), 'PUBLIC_PRODUCTION_DESTINATION');
  const response = await transport(url, { method: 'GET', redirect: 'error', credentials: 'omit', headers: {}, signal: AbortSignal.timeout(30000) });
  need(response.status === 200, 'PRODUCTION_HTTP_STATUS');
  return response;
}
export const productGates = ['SEASONALITY', 'DRAWDOWN', 'PATTERNS', 'NULL_STATES', 'CORRELATION',
  'SL_DEF_001', 'SL_DEF_002', 'SL_DEF_003', 'SL_DEF_004', 'SL_DEF_005', 'SL_DEF_006'];
export function validateProductReport(report) {
  exactKeys(report, ['result', 'gates', 'snapshot_count', 'provenance_coverage', 'capability_ids', 'routes', 'viewports', 'application_console_errors', 'required_application_request_failures', 'broken_assets', 'hydration_errors', 'overflow', 'raw_platform_events', 'raw_rsc_events', 'unclassified_failures', 'expected_values'], 'UNEXPECTED_REPORT_FIELD');
  exactKeys(report.gates, productGates, 'PRODUCT_GATE_COVERAGE');
  for (const value of Object.values(report.gates)) need(value === 'PASS', 'PRODUCT_GATE_FAILURE');
  need(report.result === 'PASS' && report.snapshot_count === 81 && report.provenance_coverage === 100, 'DATA_COVERAGE');
  need(canonical(report.capability_ids).equals(canonical(P.capabilities)), 'CAPABILITY_LOSS');
  need(canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels'])) &&
    canonical(report.viewports).equals(canonical([[1440, 900], [390, 844]])), 'QA_COVERAGE');
  for (const key of ['application_console_errors', 'required_application_request_failures', 'broken_assets', 'hydration_errors', 'overflow'])
    need(Number.isInteger(report[key]) && report[key] === 0, 'QA_APPLICATION_ERRORS');
  need(report.unclassified_failures.length === 0 && report.expected_values === 'PASS', 'UNCLASSIFIED_QA');
  for (const kind of ['raw_platform_events', 'raw_rsc_events']) {
    need(Array.isArray(report[kind]), 'RAW_ACCOUNTING_ABSENT');
    for (const event of report[kind]) {
      exactKeys(event, ['sha256', 'count', 'classification'], 'UNSAFE_RAW_ACCOUNTING');
      need(/^[a-f0-9]{64}$/.test(event.sha256) && Number.isInteger(event.count) && event.count >= 0 &&
        event.classification === (kind === 'raw_rsc_events' ? 'rsc_non_application' : 'platform_non_application'), 'RAW_ACCOUNTING_INVALID');
    }
  }
}
export function attest(report, run, deployment, workflowHash, timestamp) {
  validateProductReport(report);
  exactKeys(run, ['id', 'attempt', 'execution_sha'], 'RUN_FIELDS');
  need(/^[a-f0-9]{40}$/.test(run.execution_sha), 'WORKFLOW_EXECUTION_SHA');
  need(/^[1-9][0-9]{0,19}$/.test(run.id) && /^[1-9][0-9]*$/.test(run.attempt), 'RUN_ID');
  validateTarget(deployment);
  need(/^[a-f0-9]{64}$/.test(workflowHash) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp) && Number.isFinite(Date.parse(timestamp)), 'ATTESTATION_METADATA');
  const payload = { candidate_git_sha: deployment.candidate_git_sha, deployment_id: deployment.deployment_id,
    authority_run_id: deployment.authority_run_id, sealed_manifest_sha256: deployment.sealed_manifest_sha256,
    project_id: P.project, test_version: P.test_version, phase: deployment.phase, result: 'PASS',
    snapshot_count: 81, provenance_coverage: 100, capability_ids: P.capabilities, timestamp,
    defects: Object.fromEntries(productGates.filter(x => x.startsWith('SL_DEF')).map(x => [x, 'PASS'])),
    interactions: 'PASS', expected_values: 'PASS', routes: report.routes, viewports: report.viewports,
    application_console_errors: 0, hydration_errors: 0, required_application_request_failures: 0,
    broken_assets: 0, overflow: 0, raw_platform_events: report.raw_platform_events,
    raw_rsc_events: report.raw_rsc_events, unclassified_failures: [], origin: deployment.origin,
    public_authority_run_id: deployment.authority_run_id };
  const body = { workflow_path: P.workflow_path, workflow_sha256: workflowHash,
    workflow_run_id: run.id, workflow_run_attempt: run.attempt, workflow_execution_sha: run.execution_sha, operation: deployment.operation, candidate_git_sha: deployment.candidate_git_sha,
    deployment_id: deployment.deployment_id, authority_run_id: deployment.authority_run_id,
    sealed_manifest_sha256: deployment.sealed_manifest_sha256, qa_suite_version: P.qa_suite_version,
    result: 'PASS', timestamp, controller_payload_sha256: sha(canonical(payload)),
    product_report_sha256: sha(canonical(report)), product_report: report, controller_payload: payload };
  return { ...body, attestation_sha256: sha(canonical(body)) };
}
export function validateAttestation(envelope, run, deployment, workflowHash) {
  const expected = attest(envelope.product_report, run, deployment, workflowHash, envelope.timestamp);
  need(canonical(envelope).equals(canonical(expected)), 'ATTESTATION_BINDING');
  return expected;
}
export function validateAncestry(compare, executionSHA, candidateSHA) {
  need(SHA.test(candidateSHA) && compare.base_commit?.sha === candidateSHA && compare.merge_base_commit?.sha === candidateSHA && compare.behind_by === 0,
    'CANDIDATE_ANCESTRY_UNRESOLVED');
  need(compare.status === (executionSHA === candidateSHA ? 'identical' : 'ahead') &&
    (executionSHA !== candidateSHA || compare.ahead_by === 0) &&
    Number.isInteger(compare.ahead_by) && compare.ahead_by >= (executionSHA === candidateSHA ? 0 : 1), 'CANDIDATE_UNRELATED');
}
export function validateRunMetadata(metadata, run) {
  for (const repository of [metadata.repository, metadata.head_repository]) need(repository?.full_name === P.repository &&
    String(repository.id) === P.repository_id && String(repository.owner?.id) === P.repository_owner_id && repository.private === false, 'PUBLIC_REPOSITORY_IDENTITY');
  need(String(metadata.id) === run.id && String(metadata.run_attempt) === run.attempt && metadata.name === P.workflow_name &&
    metadata.head_sha === run.execution_sha && metadata.head_branch === P.branch &&
    metadata.path === P.workflow_path && metadata.event === 'workflow_dispatch', 'PUBLIC_RUN_IDENTITY');
}
export function validateJobs(data, run, hash, expectedId) {
  need(/^[a-f0-9]{64}$/.test(hash) && Array.isArray(data.jobs) && data.total_count === data.jobs.length && data.total_count <= 100, 'JOB_EVIDENCE_INCOMPLETE');
  const qa = data.jobs.filter(j => j.name === P.qa_job_name);
  const markers = data.jobs.filter(j => j.name?.startsWith(P.qa_marker_prefix));
  need(qa.length === 1 && markers.length === 1 && markers[0].name === P.qa_marker_prefix + hash && qa[0].id !== markers[0].id, 'QA_JOB_PROOF_AMBIGUOUS');
  need(Date.parse(qa[0].completed_at) <= Date.parse(markers[0].started_at) && Date.parse(markers[0].started_at) <= Date.parse(markers[0].completed_at), 'QA_JOB_ORDER');
  for (const job of [qa[0], markers[0]]) need(String(job.run_id) === run.id && String(job.run_attempt) === run.attempt &&
    job.head_sha === run.execution_sha && job.head_branch === P.branch && job.workflow_name === P.workflow_name &&
    job.status === 'completed' && job.conclusion === 'success', 'QA_JOB_PROOF_FAILED');
  need(/^[1-9][0-9]{0,19}$/.test(String(markers[0].id)) && (!expectedId || String(markers[0].id) === expectedId), 'MARKER_JOB_ID');
  return markers[0];
}
export function requestFor(envelope, jobs, run, workflowHash, selection) {
  const q = envelope.controller_payload;
  const target = { ...selection, origin: q.origin, authority_run_id: q.authority_run_id, sealed_manifest_sha256: q.sealed_manifest_sha256 };
  validateAttestation(envelope, run, target, workflowHash);
  const marker = validateJobs(jobs, run, envelope.controller_payload_sha256);
  need(Date.parse(marker.completed_at) >= Date.parse(envelope.timestamp), 'MARKER_TIME_BINDING');
  const request = { operation: target.operation,
    candidate_git_sha: target.candidate_git_sha, candidate_deployment_id: target.deployment_id,
    authority_run_id: target.authority_run_id, sealed_manifest_sha256: target.sealed_manifest_sha256,
    qa_attestation_id: String(marker.id), qa_attestation_hash: envelope.controller_payload_sha256,
    workflow_run_id: run.id, workflow_execution_sha: run.execution_sha,
    qa_attestation: canonical(q).toString() };
  if (target.operation === PROMOTE) Object.assign(request, { expected_previous_production_sha: target.expected_previous_production_sha,
    expected_previous_production_deployment: target.expected_previous_production_deployment, previous_publication_date: target.previous_publication_date });
  validateControllerRequest(request);
  return request;
}
export function validateControllerRequest(request) {
  const keys = ['operation', 'candidate_git_sha', 'candidate_deployment_id', 'authority_run_id', 'sealed_manifest_sha256',
    'qa_attestation_id', 'qa_attestation_hash', 'workflow_run_id', 'workflow_execution_sha', 'qa_attestation'];
  need([ADOPT, PROMOTE].includes(request.operation), 'REQUEST_OPERATION');
  if (request.operation === PROMOTE) keys.push('expected_previous_production_sha', 'expected_previous_production_deployment', 'previous_publication_date');
  exactKeys(request, keys);
  need(Object.values(request).every(v => typeof v === 'string'), 'REQUEST_STRING_FIELDS');
  for (const key of ['candidate_git_sha', 'workflow_execution_sha']) need(SHA.test(request[key]), 'REQUEST_SHA');
  for (const key of ['sealed_manifest_sha256', 'qa_attestation_hash']) need(HASH.test(request[key]), 'REQUEST_HASH');
  need(/^[1-9][0-9]{0,19}$/.test(request.workflow_run_id) && /^[1-9][0-9]{0,19}$/.test(request.qa_attestation_id) && request.qa_attestation.length < 60000, 'INLINE_QA_SCHEMA');
  const inline = JSON.parse(request.qa_attestation);
  need(canonical(inline).toString() === request.qa_attestation && sha(canonical(inline)) === request.qa_attestation_hash, 'INLINE_QA_HASH');
  exactKeys(inline, ['candidate_git_sha','deployment_id','authority_run_id','sealed_manifest_sha256','project_id','test_version','phase','result','snapshot_count','provenance_coverage','capability_ids','timestamp','defects','interactions','expected_values','routes','viewports','application_console_errors','hydration_errors','required_application_request_failures','broken_assets','overflow','raw_platform_events','raw_rsc_events','unclassified_failures','origin','public_authority_run_id'], 'INLINE_QA_FIELDS');
  const target = { operation: request.operation, phase: inline.phase, candidate_git_sha: request.candidate_git_sha,
    deployment_id: request.candidate_deployment_id, authority_run_id: request.authority_run_id,
    sealed_manifest_sha256: request.sealed_manifest_sha256, origin: inline.origin, expected_previous_production_sha: request.expected_previous_production_sha };
  validateTarget(target);
  for (const [key, value] of Object.entries({ candidate_git_sha: request.candidate_git_sha, deployment_id: request.candidate_deployment_id,
    authority_run_id: request.authority_run_id, sealed_manifest_sha256: request.sealed_manifest_sha256, public_authority_run_id: request.authority_run_id,
    project_id: P.project, test_version: P.test_version, result: 'PASS' })) need(inline[key] === value, 'REQUEST_QA_BINDING');
  need(inline.interactions === 'PASS' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(inline.timestamp) && Number.isFinite(Date.parse(inline.timestamp)), 'INLINE_QA_COMPLETION');
  exactKeys(inline.defects, productGates.filter(k => k.startsWith('SL_DEF')), 'INLINE_QA_DEFECTS');
  validateProductReport({ result: inline.result, gates: { ...Object.fromEntries(productGates.filter(k => !k.startsWith('SL_DEF')).map(k => [k, inline.interactions])), ...inline.defects },
    snapshot_count: inline.snapshot_count, provenance_coverage: inline.provenance_coverage, capability_ids: inline.capability_ids,
    routes: inline.routes, viewports: inline.viewports, application_console_errors: inline.application_console_errors,
    required_application_request_failures: inline.required_application_request_failures, broken_assets: inline.broken_assets,
    hydration_errors: inline.hydration_errors, overflow: inline.overflow, raw_platform_events: inline.raw_platform_events,
    raw_rsc_events: inline.raw_rsc_events, unclassified_failures: inline.unclassified_failures, expected_values: inline.expected_values });
  if (request.operation === PROMOTE) selectTarget({ operation: PROMOTE, candidate_git_sha: request.candidate_git_sha,
    candidate_deployment_id: request.candidate_deployment_id, expected_previous_production_sha: request.expected_previous_production_sha,
    expected_previous_production_deployment: request.expected_previous_production_deployment, previous_publication_date: request.previous_publication_date });
}
export async function releaseAfterQA({ report, run, deployment, workflowHash, timestamp, sealDigest, invoke }) {
  const envelope = attest(report, run, deployment, workflowHash, timestamp);
  const jobs = await sealDigest(envelope.controller_payload_sha256, envelope);
  const request = requestFor(envelope, jobs, run, workflowHash, deployment);
  return invoke(request);
}

export function oidcLease(initial, refresh, clock = () => Math.floor(Date.now() / 1000)) {
  let token = initial, pending, closed = false;
  return { get: async () => {
    need(!closed, 'OIDC_LEASE_CLOSED');
    const expiry = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).exp;
    if (expiry <= clock() + 60) {
      pending ??= refresh().finally(() => { pending = undefined; });
      token = await pending;
    }
    need(!closed && JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).exp > clock() + 30, 'OIDC_REFRESH_EXPIRED');
    return token;
  }, clear: () => { closed = true; token = undefined; } };
}

export function validateQAAge(timestamp, operation, now = Date.now()) {
  need([ADOPT, PROMOTE].includes(operation), 'REQUEST_OPERATION');
  const age = now - Date.parse(timestamp);
  need(Number.isFinite(age) && age >= 0 && age <= (operation === ADOPT ? 900000 : 86400000), 'QA_EXPIRED');
}
export function controllerOutcome(operation, response) {
  need([ADOPT, PROMOTE].includes(operation) && response && response.provider_fetch === false, 'CONTROLLER_RESPONSE_INVALID');
  if (operation === ADOPT) {
    exactKeys(response, ['state', 'marker_sha256', 'vercel_write', 'provider_fetch'], 'ADOPTION_RESPONSE_FIELDS');
    need(['BASELINE_ADOPTED', 'ALREADY_ADOPTED'].includes(response.state) && response.vercel_write === false && HASH.test(response.marker_sha256), 'ADOPTION_RESPONSE_INVALID');
    return { exitCode: 0, stdout: response.state + ': existing Production certified; no Vercel write.\n', stderr: '' };
  }
  // A future promotion cannot be mistaken for baseline adoption or publication certification.
  if (response.state === 'PROMOTED_NOT_CERTIFIED') {
    need(DEPLOYMENT.test(response.production_deployment_id), 'PROMOTION_RESPONSE_INVALID');
    return { exitCode: 1, stdout: 'PROMOTED_NOT_CERTIFIED: separate production QA and approval required.\n', stderr: '' };
  }
  return { exitCode: 1, stdout: '', stderr: 'CONTROLLER_REQUIRES_FOUNDER_REVIEW\n' };
}
