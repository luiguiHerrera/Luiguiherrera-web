import { createHash } from 'node:crypto';
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
export const TRANSITION = 'EXTRAORDINARY_EDITORIAL_AUTHORITY_TRANSITION';
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, DEPLOYMENT = /^dpl_[a-zA-Z0-9]{10,80}$/;
const futureInputs = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha', 'expected_previous_production_deployment', 'previous_publication_date'];
export function selectTarget(inputs) {
  need(inputs && !Array.isArray(inputs) && Object.keys(inputs).every(k => ['operation', ...futureInputs, 'resume_production_deployment_id'].includes(k)), 'DISPATCH_INPUT_FIELDS');
  need([ADOPT, PROMOTE].includes(inputs.operation), 'OPERATION_REQUIRED');
  for (const value of Object.values(inputs)) need(typeof value === 'string', 'DISPATCH_INPUT_TYPE');
  if (inputs.resume_production_deployment_id) need(inputs.operation === PROMOTE && DEPLOYMENT.test(inputs.resume_production_deployment_id), 'RESUME_DEPLOYMENT');
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
    previous_publication_date: inputs.previous_publication_date, ...(inputs.resume_production_deployment_id ? { resume_production_deployment_id: inputs.resume_production_deployment_id } : {}) };
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
  need([ADOPT, PROMOTE, TRANSITION].includes(target.operation) && SHA.test(target.candidate_git_sha) && DEPLOYMENT.test(target.deployment_id), 'ATTESTATION_CANDIDATE');
  need(target.operation === ADOPT ? target.phase === 'production' : ['preview','production'].includes(target.phase), 'ATTESTATION_PHASE');
  verifiedOrigin(target.origin, target.phase);
  need(typeof target.authority_run_id === 'string' && /^\d{8}T\d{9}Z-[a-f0-9-]{36}$/.test(target.authority_run_id) && HASH.test(target.sealed_manifest_sha256), 'AUTHORITY_IDENTITY');
  if (target.operation === ADOPT) {
    need(target.candidate_git_sha === P.baseline.production_git_sha && target.deployment_id === P.baseline.production_deployment_id &&
      target.authority_run_id === P.baseline.authority_run_id && target.sealed_manifest_sha256 === P.baseline.sealed_manifest_sha256, 'BASELINE_IDENTITY');
  } else if (target.operation === TRANSITION) {
    need(target.phase === 'production' && target.authority_run_id === P.baseline.authority_run_id && target.sealed_manifest_sha256 === P.baseline.sealed_manifest_sha256, 'TRANSITION_SNAPSHOT_IDENTITY');
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
function previewTime(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z')),
  'PREVIEW_TIMESTAMP');
  return Date.parse(value);
}
function previewLatest(records, code, parentCreated) {
  need(Array.isArray(records) && records.length < 100 && records.every(x => x && Number.isSafeInteger(x.id) && x.id > 0) &&
    new Set(records.map(x => x.id)).size === records.length, code);
  const ordered = [...records].sort((a, b) => a.id - b.id);
  let previousCreated;
  for (const record of ordered) {
    const updated = previewTime(record.updated_at);
    // Creation metadata is checked when supplied; updated_at remains mandatory.
    // IDs select the latest record within its own stream, never across streams.
    if (Object.hasOwn(record, 'created_at')) {
      const created = previewTime(record.created_at);
      need(created <= updated && (previousCreated === undefined || previousCreated <= created) &&
        (parentCreated === undefined || parentCreated <= created), 'PREVIEW_TIMESTAMP');
      previousCreated = created;
    }
    need(parentCreated === undefined || parentCreated <= updated, 'PREVIEW_TIMESTAMP');
  }
  return ordered.at(-1);
}
export function resolvePreview(deployments, statusSets, commitStatuses, target) {
  need(target.operation === PROMOTE && SHA.test(target.candidate_git_sha) && DEPLOYMENT.test(target.deployment_id), 'PREVIEW_TARGET');
  need(Array.isArray(deployments) && deployments.length < 100 && Array.isArray(commitStatuses) && commitStatuses.length < 100, 'DEPLOYMENT_METADATA_INCOMPLETE');
  const creator = x => x?.creator?.login === P.vercel_creator_login && x.creator.id === P.vercel_creator_id;
  const commit = previewLatest(commitStatuses.filter(s => s.context === 'Vercel'), 'DEPLOYMENT_METADATA_INCOMPLETE');
  need(commit && creator(commit) && commit.state === 'success' &&
    commit.target_url === P.vercel_details_base_url + target.deployment_id.slice(4), 'VERCEL_ID_BINDING');
  const matches = [];
  for (const deployment of deployments) {
    if (!creator(deployment) || deployment.sha !== target.candidate_git_sha || deployment.environment !== 'Preview' || deployment.production_environment !== false) continue;
    const parentCreated = Object.hasOwn(deployment, 'created_at') ? previewTime(deployment.created_at) : undefined;
    if (Object.hasOwn(deployment, 'updated_at')) {
      const updated = previewTime(deployment.updated_at);
      need(parentCreated === undefined || parentCreated <= updated, 'PREVIEW_TIMESTAMP');
    }
    const statuses = statusSets[String(deployment.id)];
    const latest = previewLatest(statuses, 'DEPLOYMENT_STATUS_INCOMPLETE', parentCreated);
    // Commit status and deployment status are independent publications. Identity
    // links and unique resolution bind them; timestamp equality does not.
    if (!latest || !creator(latest) || latest.state !== 'success' || latest.environment !== 'Preview') continue;
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
  need((canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels'])) || canonical(report.routes).equals(canonical(['/analisiscuantitativo', '/en/quantitative-analysis']))) &&
    canonical(report.viewports).equals(canonical([[1440, 900], [390, 844]])), 'QA_COVERAGE');
  for (const key of ['application_console_errors', 'required_application_request_failures', 'broken_assets', 'hydration_errors', 'overflow'])
    need(Number.isInteger(report[key]) && report[key] === 0, 'QA_APPLICATION_ERRORS');
  need(report.unclassified_failures.length === 0 && report.expected_values === 'PASS', 'UNCLASSIFIED_QA');
  for (const kind of ['raw_platform_events', 'raw_rsc_events']) {
    need(Array.isArray(report[kind]), 'RAW_ACCOUNTING_ABSENT');
    for (const event of report[kind]) {
      exactKeys(event, ['sha256', 'count', 'classification'], 'UNSAFE_RAW_ACCOUNTING');
      need(/^[a-f0-9]{64}$/.test(event.sha256) && Number.isInteger(event.count) && event.count >= 0 &&
        event.classification === (kind === 'raw_rsc_events' ? 'rsc_transition_completed_non_application' : 'platform_non_application'), 'RAW_ACCOUNTING_INVALID');
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
  const cert = ['production_qa_attestation_id','production_qa_attestation_hash'];
  if (cert.some(k => Object.hasOwn(request,k))) { need(request.operation === PROMOTE && cert.every(k => Object.hasOwn(request,k)) && !Object.hasOwn(request,'observe_production_deployment_id'), 'CERTIFICATE_FIELDS'); keys.push(...cert); need(/^[1-9][0-9]{0,19}$/.test(request.production_qa_attestation_id) && HASH.test(request.production_qa_attestation_hash), 'CERTIFICATE_ID'); }
  if (Object.hasOwn(request,'observe_production_deployment_id')) { need(request.operation === PROMOTE && DEPLOYMENT.test(request.observe_production_deployment_id), 'OBSERVE_DEPLOYMENT'); keys.push('observe_production_deployment_id'); }
  exactKeys(request, keys);
  need(Object.values(request).every(v => typeof v === 'string'), 'REQUEST_STRING_FIELDS');
  for (const key of ['candidate_git_sha', 'workflow_execution_sha']) need(SHA.test(request[key]), 'REQUEST_SHA');
  for (const key of ['sealed_manifest_sha256', 'qa_attestation_hash']) need(HASH.test(request[key]), 'REQUEST_HASH');
  need(/^[1-9][0-9]{0,19}$/.test(request.workflow_run_id) && /^[1-9][0-9]{0,19}$/.test(request.qa_attestation_id) && request.qa_attestation.length < 60000, 'INLINE_QA_SCHEMA');
  const inline = JSON.parse(request.qa_attestation);
  need(inline.phase === (request.operation === ADOPT ? 'production' : 'preview'), 'INLINE_QA_PHASE');
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
  if (response.state === 'PUBLISHED') {
    exactKeys(response, ['state','production_deployment_id','marker_sha256','provider_fetch'], 'PUBLICATION_RESPONSE_FIELDS');
    need(DEPLOYMENT.test(response.production_deployment_id) && HASH.test(response.marker_sha256), 'PUBLICATION_RESPONSE_INVALID');
    return { exitCode: 0, stdout: 'PUBLISHED: exact Production certified and marker recorded.\n', stderr: '' };
  }
  // A future promotion cannot be mistaken for baseline adoption or publication certification.
  if (response.state === 'PROMOTED_NOT_CERTIFIED') {
    need(DEPLOYMENT.test(response.production_deployment_id), 'PROMOTION_RESPONSE_INVALID');
    return { exitCode: 1, stdout: 'PROMOTED_NOT_CERTIFIED: separate production QA and approval required.\n', stderr: '' };
  }
  return { exitCode: 1, stdout: '', stderr: 'CONTROLLER_REQUIRES_FOUNDER_REVIEW\n' };
}

// An accepted build is deliberately not a publication certificate. The final
// workflow gate requires PUBLISHED after independent public production QA.
export function promotionStage(response, expectedId) {
  need(response?.provider_fetch === false && ['PRODUCTION_BUILD_PENDING','PROMOTED_NOT_CERTIFIED'].includes(response.state), 'PROMOTION_STAGE_UNCONFIRMED');
  need(DEPLOYMENT.test(response.production_deployment_id) && (!expectedId || expectedId === response.production_deployment_id), 'PRODUCTION_DEPLOYMENT_CHANGED');
  need(Object.keys(response).every(k => ['state','production_deployment_id','provider_fetch','ready_at_ms'].includes(k)), 'PROMOTION_STAGE_FIELDS');
  if (response.ready_at_ms !== undefined) need(response.state === 'PROMOTED_NOT_CERTIFIED' && Number.isSafeInteger(response.ready_at_ms) && response.ready_at_ms > 0, 'PRODUCTION_READY_TIME');
  return response;
}

export function productionTarget(selection, authority, observed) {
  promotionStage(observed);
  need(selection.operation === PROMOTE && observed.state === 'PROMOTED_NOT_CERTIFIED' && Number.isSafeInteger(observed.ready_at_ms), 'PRODUCTION_NOT_READY');
  const target = { ...selection, phase:'production', origin:P.production_origin,
    deployment_id:observed.production_deployment_id, authority_run_id:authority.authority_run_id,
    sealed_manifest_sha256:authority.sealed_manifest_sha256 };
  validateTarget(target);
  return target;
}

export function certificationRequest(preview, envelope, check, run, workflowHash, observed) {
  validateControllerRequest(preview);
  need(preview.operation === PROMOTE && !preview.production_qa_attestation_id && !preview.observe_production_deployment_id, 'CERTIFICATION_REQUEST_PHASE');
  const target = productionTarget({operation:PROMOTE,candidate_git_sha:preview.candidate_git_sha,
    expected_previous_production_sha:preview.expected_previous_production_sha}, preview, observed);
  validateAttestation(envelope,run,target,workflowHash);
  need(Date.parse(envelope.timestamp) >= observed.ready_at_ms, 'QA_BEFORE_PRODUCTION_READY');
  validateQAAge(envelope.timestamp, PROMOTE);
  need(check?.app?.slug === 'github-actions' && check.name === 'statistical-levels-production-qa' &&
    check.status === 'completed' && check.conclusion === 'success' && check.head_sha === run.execution_sha &&
    check.external_id === run.id && Date.parse(check.completed_at) >= Date.parse(envelope.timestamp), 'PRODUCTION_CHECK_IDENTITY');
  need(check.output?.text === canonical(envelope.controller_payload).toString(), 'PRODUCTION_CHECK_BYTES');
  const request = {...preview, production_qa_attestation_id:String(check.id), production_qa_attestation_hash:envelope.controller_payload_sha256};
  validateControllerRequest(request);
  return request;
}

export function publicationReceipt(request, response, run, workflowHash) {
  validateControllerRequest(request);
  need(request.operation === PROMOTE && request.production_qa_attestation_id && response.state === 'PUBLISHED', 'PUBLICATION_NOT_CERTIFIED');
  need(controllerOutcome(PROMOTE,response).exitCode === 0, 'PUBLICATION_NOT_CERTIFIED');
  return {schema:'statistical-levels.published-receipt.v1',...run,workflow_sha256:workflowHash,
    candidate_git_sha:request.candidate_git_sha,preview_deployment_id:request.candidate_deployment_id,
    production_deployment_id:response.production_deployment_id,authority_run_id:request.authority_run_id,
    sealed_manifest_sha256:request.sealed_manifest_sha256,publication_date:request.authority_run_id.slice(0,8).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'),
    production_qa_attestation_id:request.production_qa_attestation_id,
    production_qa_attestation_hash:request.production_qa_attestation_hash,marker_sha256:response.marker_sha256,state:'PUBLISHED'};
}

export function validateDailyCI(run, jobs, sha) {
  for (const repo of [run.repository,run.head_repository]) need(repo?.full_name === P.repository &&
    String(repo.id) === P.repository_id && String(repo.owner?.id) === P.repository_owner_id && repo.private === false, 'DAILY_CI_REPOSITORY');
  need(run.workflow_id === 336203586 && run.path === '.github/workflows/ci.yml' && run.head_sha === sha &&
    run.head_branch === P.branch && run.event === 'workflow_run' && run.status === 'completed' && run.conclusion === 'success', 'DAILY_CI_IDENTITY');
  need(jobs.total_count === 1 && jobs.jobs?.length === 1, 'DAILY_CI_JOB_SET');
  const job=jobs.jobs[0];
  need(job.name === 'validate' && job.status === 'completed' && job.conclusion === 'success', 'DAILY_CI_NOOP_OR_FAILED');
  for (const name of ['Bind qualification to event SHA and governed metadata-repair successor lineage',
    'Test bounded CI admission and producer readback','Authenticate fresh native capture handoff',
    'Run existing release, native proof, policy and security tests','Reject missing or skipped mandatory coverage and candidate drift',
    'Revalidate exact branch and emit bounded qualification evidence']) {
    const steps=job.steps.filter(s=>s.name === name);
    need(steps.length === 1 && steps[0].status === 'completed' && steps[0].conclusion === 'success', 'DAILY_CI_MANDATORY_STEP');
  }
}

export function publishedCheck(check, run, workflowHash, jobs) {
  validateRunMetadata(run,{id:String(run.id),attempt:String(run.run_attempt),execution_sha:run.head_sha});
  need(run.status === 'completed' && run.conclusion === 'success', 'PUBLICATION_RUN_NOT_SUCCESS');
  need(check.app?.slug === 'github-actions' && check.name === 'statistical-levels-published' && check.status === 'completed' &&
    check.conclusion === 'success' && check.external_id === String(run.id) && check.head_sha === run.head_sha, 'PUBLISHED_CHECK_IDENTITY');
  const r=JSON.parse(check.output.text);
  need(r.schema === 'statistical-levels.published-receipt.v1' && r.state === 'PUBLISHED' && r.execution_sha === run.head_sha &&
    r.id === String(run.id) && r.attempt === String(run.run_attempt) && r.workflow_sha256 === workflowHash &&
    SHA.test(r.candidate_git_sha) && DEPLOYMENT.test(r.production_deployment_id) && HASH.test(r.marker_sha256) &&
    HASH.test(r.production_qa_attestation_hash) && /^[1-9][0-9]*$/.test(r.production_qa_attestation_id), 'PUBLISHED_RECEIPT_INVALID');
  need(canonical(r).toString() === check.output.text, 'PUBLISHED_RECEIPT_NOT_CANONICAL');
  need(jobs?.total_count === jobs?.jobs?.length && jobs.total_count <= 100, 'PUBLISHED_JOBS_INCOMPLETE');
  const gate=jobs.jobs.filter(j=>j.name === 'statistical-levels-published-sha256-'+r.marker_sha256);
  need(gate.length === 1 && String(gate[0].run_id) === String(run.id) && gate[0].run_attempt === run.run_attempt && gate[0].head_sha === run.head_sha && gate[0].status === 'completed' && gate[0].conclusion === 'success', 'PUBLISHED_SERVER_DIGEST');
  return r;
}

// Extraordinary authority linkage. These functions validate server context;
// they never select a deployment, change traffic, or issue publication authority.
export function transitionUTC(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value), 'TRANSITION_TIMESTAMP');
  const time = Date.parse(value);
  need(Number.isFinite(time) && new Date(time).toISOString().slice(0,19) === value.slice(0,19), 'TRANSITION_TIMESTAMP');
  return time;
}
export function validateTransitionRequest(request) {
  const keys = ['operation','direction','phase','authorization_sha256','expected_head_sha256'];
  need(request?.operation === TRANSITION && ['rebind','rollback'].includes(request.direction) && ['prepare','certify'].includes(request.phase), 'TRANSITION_OPERATION');
  if (request.phase === 'certify') keys.push('production_qa_attestation_id','production_qa_attestation_hash');
  exactKeys(request,keys,'TRANSITION_REQUEST_FIELDS');
  need(Object.values(request).every(v=>typeof v==='string') && HASH.test(request.authorization_sha256) && HASH.test(request.expected_head_sha256), 'TRANSITION_REQUEST_IDENTITY');
  if (request.phase === 'certify') need(/^[1-9][0-9]{0,19}$/.test(request.production_qa_attestation_id) && HASH.test(request.production_qa_attestation_hash), 'TRANSITION_QA_REFERENCE');
  return request;
}
export function selectTransition(inputs) {
  need(inputs?.operation === TRANSITION && typeof inputs.transition_request === 'string' && inputs.transition_request.length < 2048, 'TRANSITION_DISPATCH');
  const empty = [...futureInputs,'resume_production_deployment_id','probe_git_sha','probe_deployment_id'];
  need(Object.keys(inputs).every(k=>['operation','transition_request',...empty].includes(k)) && empty.every(k=>!Object.hasOwn(inputs,k)||inputs[k]===''), 'TRANSITION_CALLER_TARGET_FORBIDDEN');
  const selection=JSON.parse(inputs.transition_request);
  exactKeys(selection,['direction','phase','authorization_sha256','expected_head_sha256'],'TRANSITION_SELECTION_FIELDS');
  need(['prepare','certify'].includes(selection.phase),'TRANSITION_PHASE');
  validateTransitionRequest({operation:TRANSITION,...selection,phase:'prepare'});
  return selection;
}
export function transitionPrepareRequest(selection) {
  return validateTransitionRequest({operation:TRANSITION,...selection,phase:'prepare'});
}
export function validateTransitionContext(proof,selection,run,workflowHash,now=Date.now()) {
  exactKeys(proof,['schema','request_sha256','response_sha256','response','native','execution','started_at','completed_at'],'TRANSITION_NATIVE_PROOF_FIELDS');
  const request=transitionPrepareRequest(selection),response=proof.response;
  need(proof.schema==='sl.transition-invocation-evidence.v1' && proof.request_sha256===sha(canonical(request)) && proof.response_sha256===sha(canonical(response)), 'TRANSITION_NATIVE_PROOF_BINDING');
  need(canonical(proof.execution).equals(canonical({...run,workflow_sha256:workflowHash})), 'TRANSITION_NATIVE_EXECUTION');
  exactKeys(proof.native,['status_code','executed_version','request_id'],'TRANSITION_NATIVE_FIELDS');
  need(proof.native.status_code===200 && /^(?:\$LATEST|[1-9][0-9]*)$/.test(proof.native.executed_version) && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(proof.native.request_id), 'TRANSITION_NATIVE_IDENTITY');
  need(transitionUTC(proof.started_at)<=transitionUTC(proof.completed_at) && transitionUTC(proof.completed_at)<=now && now-transitionUTC(proof.completed_at)<=900000,'TRANSITION_CONTEXT_FRESHNESS');
  exactKeys(response,['state','intent_sha256','qa_context','provider_fetch'],'TRANSITION_PREPARATION_FIELDS');
  need(response.state==='TRANSITION_PREPARED_NOT_CERTIFIED' && response.provider_fetch===false,'TRANSITION_NOT_PREPARED');
  const ctx=response.qa_context,g=ctx.authorization,i=ctx.intent;
  exactKeys(ctx,['schema','authorization','intent','active_binding','target','ready_at_ms','observed_at_utc'],'TRANSITION_CONTEXT_FIELDS');
  need(ctx.schema==='sl.transition-qa-context.v1' && sha(canonical(g))===selection.authorization_sha256 && g.schema==='sl.editorial-authorization.v1', 'TRANSITION_SERVER_GRANT');
  need(g.execution_sha===run.execution_sha && g.release_workflow_sha256===workflowHash && HASH.test(g.snapshot_manifest_sha256),'TRANSITION_EXECUTION_GRANT');
  need(g.source?.sha==='8c770af7059b33a2e841f5afa4b87344db4aa177' && g.source.parent==='c4bb2047ed54fd3c1fdd40f6fddd99ec187b31ce' && g.source.tree==='c44eadb389e02ce6c0113526ac2ca3ba6ef33adc','TRANSITION_EDITORIAL_SOURCE');
  need(sha(canonical(i))===response.intent_sha256 && i.schema==='sl.authority-intent.v1' && i.kind===selection.direction && i.authorization_sha256===selection.authorization_sha256 && i.previous_head_sha256===selection.expected_head_sha256 && i.baseline_marker_sha256===g.baseline_marker_sha256 && i.snapshot_manifest_sha256===g.snapshot_manifest_sha256, 'TRANSITION_INTENT_BINDING');
  const target=selection.direction==='rebind'?{sha:g.source.sha,deployment:g.deployment}:{sha:P.baseline.production_git_sha,deployment:P.baseline.production_deployment_id};
  const expected={operation:TRANSITION,phase:'production',candidate_git_sha:target.sha,deployment_id:target.deployment,authority_run_id:P.baseline.authority_run_id,sealed_manifest_sha256:P.baseline.sealed_manifest_sha256,origin:P.production_origin};
  need(canonical(i.binding).equals(canonical(target)) && canonical(ctx.target).equals(canonical(expected)), 'TRANSITION_SERVER_TARGET');
  validateTarget(ctx.target);
  need(Number.isSafeInteger(ctx.ready_at_ms) && ctx.ready_at_ms<=transitionUTC(ctx.observed_at_utc) && transitionUTC(ctx.observed_at_utc)<=transitionUTC(proof.completed_at),'TRANSITION_READY_CONTEXT');
  const window=g[selection.direction+'_window'];
  need(Array.isArray(window)&&window.length===2&&transitionUTC(window[0])<=transitionUTC(i.prepared_at_utc)&&transitionUTC(i.prepared_at_utc)<=transitionUTC(window[1])&&now<=transitionUTC(window[1]),'TRANSITION_CONTEXT_WINDOW');
  return ctx;
}
export function transitionQABinding(ctx,selection,envelope,run,startedAt) {
  validateAttestation(envelope,run,ctx.target,ctx.authorization.release_workflow_sha256);
  need(canonical(ctx.active_binding).equals(canonical(ctx.intent.binding)),'TRANSITION_PUBLIC_TARGET_REQUIRED');
  need(transitionUTC(startedAt)>=Math.max(transitionUTC(ctx.intent.prepared_at_utc),ctx.ready_at_ms,transitionUTC(ctx.observed_at_utc)) && transitionUTC(startedAt)<=transitionUTC(envelope.timestamp),'TRANSITION_QA_FRESHNESS');
  return {schema:'sl.transition-qa-binding.v1',direction:selection.direction,authorization_sha256:selection.authorization_sha256,previous_head_sha256:selection.expected_head_sha256,intent_sha256:sha(canonical(ctx.intent)),snapshot_manifest_sha256:ctx.authorization.snapshot_manifest_sha256,run_id:run.id,run_attempt:run.attempt,workflow_execution_sha:run.execution_sha,payload_sha256:envelope.controller_payload_sha256,qa_started_at_utc:startedAt};
}
export function transitionCheckBody(ctx,selection,envelope,run,startedAt,completedAt) {
  const binding=transitionQABinding(ctx,selection,envelope,run,startedAt);
  need(transitionUTC(completedAt)>=transitionUTC(envelope.timestamp),'TRANSITION_CHECK_TIME');
  return {name:'statistical-levels-production-qa',head_sha:run.execution_sha,external_id:run.id,status:'completed',conclusion:'success',completed_at:completedAt,output:{title:'Statistical Levels extraordinary '+selection.direction+' QA',summary:canonical(binding).toString(),text:canonical(envelope.controller_payload).toString()}};
}
export function transitionCertificationRequest(ctx,selection,envelope,check,jobs,run,workflowHash,now=Date.now()) {
  need(selection.phase==='certify','TRANSITION_CERTIFY_PHASE');
  validateAttestation(envelope,run,ctx.target,workflowHash);
  need(check?.output && typeof check.output.summary==='string' && check.output.summary.length<4096,'TRANSITION_QA_ABSENT');
  const binding=JSON.parse(check.output.summary);
  const expected=transitionQABinding(ctx,selection,envelope,run,binding.qa_started_at_utc);
  need(canonical(binding).equals(canonical(expected))&&check.output.summary===canonical(expected).toString(),'TRANSITION_QA_BINDING');
  need(check.name==='statistical-levels-production-qa'&&check.app?.slug==='github-actions'&&check.head_sha===run.execution_sha&&check.external_id===run.id&&check.status==='completed'&&check.conclusion==='success'&&check.output.text===canonical(envelope.controller_payload).toString(),'TRANSITION_QA_CHECK');
  need(transitionUTC(envelope.timestamp)<=now&&now-transitionUTC(envelope.timestamp)<=900000&&transitionUTC(check.completed_at)>=transitionUTC(envelope.timestamp),'TRANSITION_QA_FRESHNESS');
  need(Array.isArray(jobs?.jobs)&&Number.isInteger(jobs.total_count)&&jobs.total_count===jobs.jobs.length&&jobs.total_count>0&&jobs.total_count<=100,'TRANSITION_QA_JOBS_INCOMPLETE');
  const prefix='statistical-levels-transition-'+selection.direction+'-qa-sha256-';
  const qa=jobs.jobs.filter(j=>j.name==='Statistical Levels extraordinary '+selection.direction+' QA');
  const seals=jobs.jobs.filter(j=>j.name?.startsWith(prefix));
  need(qa.length===1&&seals.length===1&&qa[0].id!==seals[0].id,'TRANSITION_QA_JOB_UNIQUE');
  need(seals[0].name===prefix+sha(canonical({binding,payload:envelope.controller_payload})),'TRANSITION_QA_JOB_DIGEST');
  for(const j of [...qa,...seals])need(String(j.run_id)===run.id&&String(j.run_attempt)===run.attempt&&j.head_sha===run.execution_sha&&j.head_branch===P.branch&&j.status==='completed'&&j.conclusion==='success','TRANSITION_QA_JOB_IDENTITY');
  need(transitionUTC(qa[0].started_at)<=transitionUTC(binding.qa_started_at_utc)&&transitionUTC(envelope.timestamp)<=transitionUTC(qa[0].completed_at)&&transitionUTC(qa[0].completed_at)<=transitionUTC(seals[0].started_at)&&transitionUTC(seals[0].started_at)<=transitionUTC(seals[0].completed_at)&&transitionUTC(seals[0].completed_at)<=now,'TRANSITION_QA_JOB_ORDER');
  return validateTransitionRequest({operation:TRANSITION,...selection,production_qa_attestation_id:String(check.id),production_qa_attestation_hash:envelope.controller_payload_sha256});
}
