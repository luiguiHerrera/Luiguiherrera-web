// Read-only identity-probe contracts. This module constructs no release request.
import { P, need, exactKeys, canonical, sha, verifiedOrigin, validateProductReport } from './release-core.mjs';

export const PROBE = 'PROBE_IDENTITY';
const SHA = /^[a-f0-9]{40}$/, HASH = /^[a-f0-9]{64}$/, DEPLOYMENT = /^dpl_[a-zA-Z0-9]{10,80}$/;
const RUN = /^[1-9][0-9]{0,19}$/;
const matches = (pattern, value) => typeof value === 'string' && pattern.test(value);
const releaseInputs = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha',
  'expected_previous_production_deployment', 'previous_publication_date'];
const metadataKeys = ['github_deployment_id', 'status_id', 'status_sha256', 'commit_status_id', 'commit_status_sha256'];
const targetKeys = ['operation', 'phase', 'candidate_git_sha', 'deployment_id', 'origin',
  'authority_run_id', 'sealed_manifest_sha256', ...metadataKeys];

export function selectProbeTarget(inputs) {
  need(inputs && typeof inputs === 'object' && !Array.isArray(inputs), 'PROBE_INPUT_FIELDS');
  const allowed = ['operation', 'probe_git_sha', 'probe_deployment_id', ...releaseInputs];
  need(Object.keys(inputs).every(k => allowed.includes(k)), 'PROBE_INPUT_FIELDS');
  need(Object.values(inputs).every(v => typeof v === 'string'), 'PROBE_INPUT_TYPE');
  need(inputs.operation === PROBE, 'PROBE_OPERATION_REQUIRED');
  need(releaseInputs.every(k => !(k in inputs) || inputs[k] === ''), 'PROBE_RELEASE_INPUT_FORBIDDEN');
  need(matches(SHA, inputs.probe_git_sha) && matches(DEPLOYMENT, inputs.probe_deployment_id), 'PROBE_FIXTURE_IDENTITY');
  return { operation: PROBE, phase: 'preview', candidate_git_sha: inputs.probe_git_sha,
    deployment_id: inputs.probe_deployment_id };
}

function fixtureIdentity(target) {
  need(target && typeof target === 'object' && !Array.isArray(target) &&
    Object.keys(target).every(k => targetKeys.includes(k)), 'PROBE_TARGET_FIELDS');
  need(target.operation === PROBE && target.phase === 'preview' &&
    matches(SHA, target.candidate_git_sha) && matches(DEPLOYMENT, target.deployment_id), 'PROBE_FIXTURE_IDENTITY');
}

function metadataProof(target) {
  need(['github_deployment_id', 'status_id', 'commit_status_id'].every(k =>
    Number.isSafeInteger(target[k]) && target[k] > 0) &&
    matches(HASH, target.status_sha256) && matches(HASH, target.commit_status_sha256), 'PROBE_METADATA_PROOF');
}

export function validateProbeTarget(target) {
  fixtureIdentity(target);
  need(typeof target.origin === 'string' && verifiedOrigin(target.origin, 'preview') === target.origin, 'PROBE_ORIGIN');
  need(typeof target.authority_run_id === 'string' &&
    /^\d{8}T\d{9}Z-[a-f0-9-]{36}$/.test(target.authority_run_id) &&
    matches(HASH, target.sealed_manifest_sha256), 'PROBE_AUTHORITY_IDENTITY');
  // A fixture's authority is observed, never selected for publication. No date ordering applies.
  if (metadataKeys.some(k => k in target)) metadataProof(target);
  return target;
}

function completePage(values, code) {
  need(Array.isArray(values) && values.length < 100 && values.every(x => x &&
    typeof x === 'object' && Number.isSafeInteger(x.id) && x.id > 0) &&
    new Set(values.map(x => x.id)).size === values.length, code);
}

function timestamp(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z')),
  'PROBE_TIMESTAMP');
}

export function resolveProbePreview(deployments, statusSets, commitStatuses, target) {
  fixtureIdentity(target);
  // Before resolution the operator supplies only immutable identifiers, never a URL or proof.
  exactKeys(target, ['operation', 'phase', 'candidate_git_sha', 'deployment_id'], 'PROBE_UNRESOLVED_TARGET');
  completePage(deployments, 'PROBE_DEPLOYMENT_METADATA_INCOMPLETE');
  completePage(commitStatuses, 'PROBE_COMMIT_METADATA_INCOMPLETE');
  need(statusSets && typeof statusSets === 'object' && !Array.isArray(statusSets), 'PROBE_STATUS_SETS');
  const creator = x => x?.creator?.login === P.vercel_creator_login && x.creator.id === P.vercel_creator_id;
  const details = P.vercel_details_base_url + target.deployment_id.slice(4);
  // A later Production deployment of the same commit must not replace this exact Preview.
  const selected = commitStatuses.filter(x => x.context === 'Vercel' && x.target_url === details)
    .sort((a, b) => b.id - a.id)[0];
  need(selected && creator(selected) && selected.state === 'success', 'PROBE_VERCEL_ID_BINDING');
  timestamp(selected.updated_at);
  const matches = [];
  for (const deployment of deployments) {
    if (!creator(deployment) || deployment.sha !== target.candidate_git_sha ||
      deployment.environment !== 'Preview' || deployment.production_environment !== false) continue;
    const statuses = statusSets[String(deployment.id)];
    completePage(statuses, 'PROBE_DEPLOYMENT_STATUS_INCOMPLETE');
    // Never revive an older success after this GitHub deployment is failed or made inactive.
    const status = [...statuses].sort((a, b) => b.id - a.id)[0];
    if (!status || !creator(status) || status.state !== 'success' || status.environment !== 'Preview' ||
      status.updated_at !== selected.updated_at) continue;
    need(status.deployment_url === `https://api.github.com/repos/${P.repository}/deployments/${deployment.id}`, 'PROBE_DEPLOYMENT_LINK');
    need(typeof status.environment_url === 'string', 'PROBE_PREVIEW_LINKS');
    const origin = verifiedOrigin(status.environment_url, 'preview');
    need(status.environment_url === origin && status.target_url === origin && status.log_url === origin, 'PROBE_PREVIEW_LINKS');
    matches.push({ ...target, origin, github_deployment_id: deployment.id,
      status_id: status.id, status_sha256: sha(canonical(status)),
      commit_status_id: selected.id, commit_status_sha256: sha(canonical(selected)) });
  }
  need(matches.length === 1, 'PROBE_PREVIEW_METADATA_AMBIGUOUS');
  return matches[0];
}

function validateRun(run) {
  exactKeys(run, ['id', 'attempt', 'execution_sha'], 'PROBE_RUN_FIELDS');
  need(matches(RUN, run.id) && matches(RUN, run.attempt) && matches(SHA, run.execution_sha), 'PROBE_RUN_IDENTITY');
}

export function attestProbe(report, run, target, workflowHash, time) {
  validateProductReport(report);
  validateRun(run);
  validateProbeTarget(target);
  metadataProof(target);
  need(matches(HASH, workflowHash), 'PROBE_WORKFLOW_HASH');
  timestamp(time);
  const body = {
    kind: 'statistical-levels.identity-probe-attestation.v1', operation: PROBE,
    phase: 'preview', classification: 'PROBE_ONLY', production_release_target: false,
    workflow_path: P.workflow_path, workflow_sha256: workflowHash,
    workflow_run_id: run.id, workflow_run_attempt: run.attempt, workflow_execution_sha: run.execution_sha,
    probe_git_sha: target.candidate_git_sha, probe_deployment_id: target.deployment_id,
    preview_origin: target.origin, project_id: P.project, authority_run_id: target.authority_run_id,
    sealed_manifest_sha256: target.sealed_manifest_sha256, qa_suite_version: P.qa_suite_version,
    result: 'PASS', timestamp: time,
    preview_metadata: Object.fromEntries(metadataKeys.map(k => [k, target[k]])),
    product_report_sha256: sha(canonical(report)), product_report: report,
  };
  return { ...body, attestation_sha256: sha(canonical(body)) };
}

export function validateProbeAttestation(envelope, run, target, workflowHash) {
  need(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'PROBE_ATTESTATION_FIELDS');
  const expected = attestProbe(envelope.product_report, run, target, workflowHash, envelope.timestamp);
  exactKeys(envelope, Object.keys(expected), 'PROBE_ATTESTATION_FIELDS');
  exactKeys(envelope.preview_metadata, metadataKeys, 'PROBE_ATTESTATION_METADATA_FIELDS');
  need(canonical(envelope).equals(canonical(expected)), 'PROBE_ATTESTATION_BINDING');
  return expected;
}

export function validateProbeRoleIdentity(identity, run) {
  validateRun(run);
  exactKeys(identity, ['Account', 'Arn', 'UserId'], 'PROBE_AWS_IDENTITY_FIELDS');
  const role = P.release_role_arn.split('/').at(-1), session = 'sl-probe-' + run.id;
  need(P.release_role_arn === `arn:aws:iam::${P.account_id}:role/${role}` &&
    identity.Account === P.account_id &&
    identity.Arn === `arn:aws:sts::${P.account_id}:assumed-role/${role}/${session}` &&
    typeof identity.UserId === 'string' &&
    new RegExp('^AROA[A-Z0-9]{17}:' + session + '$').test(identity.UserId), 'PROBE_AWS_ROLE_MISMATCH');
  return { result: 'PASS', assumed_role: role, account_match: true, session_match: true,
    workflow_run_id: run.id, workflow_run_attempt: run.attempt, workflow_execution_sha: run.execution_sha };
}
