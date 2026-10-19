// Prospective G6 evidence only. No network, credentials, raw requests or log output.
import { ADOPT, P, need, validateControllerRequest, controllerOutcome } from './release-core.mjs';

const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export function nativeInvocationIdentity(metadata) {
  need(metadata?.StatusCode === 200 && !Object.hasOwn(metadata, 'FunctionError'), 'INVOCATION_NOT_SUCCESSFUL');
  need(typeof metadata.ExecutedVersion === 'string' && /^(?:\$LATEST|[1-9][0-9]*)$/.test(metadata.ExecutedVersion), 'INVOCATION_VERSION');
  need(typeof metadata.LogResult === 'string' && metadata.LogResult.length > 0 && metadata.LogResult.length <= 8192 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(metadata.LogResult), 'INVOCATION_NATIVE_LOG_UNAVAILABLE');
  const bytes = Buffer.from(metadata.LogResult, 'base64');
  need(bytes.length <= 4096 && bytes.toString('base64') === metadata.LogResult, 'INVOCATION_NATIVE_LOG_ENCODING');
  // Current controller's authenticated LoggingConfig is Text. Missing/truncated
  // native terminal lines fail closed; application lines are never persisted.
  const lines = bytes.toString('utf8').split(/\r?\n/);
  const report = lines.filter(x => x.startsWith('REPORT RequestId:'));
  const end = lines.filter(x => x.startsWith('END RequestId:'));
  const start = lines.filter(x => x.startsWith('START RequestId:'));
  need(report.length === 1 && end.length === 1 && start.length <= 1, 'INVOCATION_NATIVE_TERMINAL_AMBIGUOUS');
  const r = report[0].match(new RegExp('^REPORT RequestId: (' + UUID + ')\\tDuration: [0-9]+(?:\\.[0-9]+)? ms\\t'));
  const e = end[0].match(new RegExp('^END RequestId: (' + UUID + ')\\s*$'));
  need(r && e && r[1] === e[1] && !/\bStatus: (?:error|timeout)\b|\bError Type:/.test(report[0]), 'INVOCATION_NATIVE_TERMINAL_MISMATCH');
  if (start.length) {
    const s = start[0].match(new RegExp('^START RequestId: (' + UUID + ') Version: (\\$LATEST|[1-9][0-9]*)\\s*$'));
    need(s && s[1] === r[1] && s[2] === metadata.ExecutedVersion, 'INVOCATION_NATIVE_START_MISMATCH');
  }
  return { status_code: 200, executed_version: metadata.ExecutedVersion, request_id: r[1] };
}

export function adoptInvocationReceipt({ request, response, metadata, environment, workflowSha256, startedAt, completedAt }) {
  validateControllerRequest(request);
  need(request.operation === ADOPT && controllerOutcome(ADOPT, response).exitCode === 0, 'RECEIPT_ADOPT_ONLY');
  need(environment.GITHUB_REPOSITORY === P.repository && environment.GITHUB_REF === 'refs/heads/' + P.branch &&
    environment.GITHUB_RUN_ID === request.workflow_run_id && environment.GITHUB_SHA === request.workflow_execution_sha &&
    /^[1-9][0-9]*$/.test(environment.GITHUB_RUN_ATTEMPT || ''), 'RECEIPT_EXECUTION_BINDING');
  need(typeof workflowSha256 === 'string' && /^[a-f0-9]{64}$/.test(workflowSha256), 'RECEIPT_WORKFLOW_IDENTITY');
  need([startedAt, completedAt].every(x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x))) &&
    Date.parse(completedAt) >= Date.parse(startedAt), 'RECEIPT_TIME_ORDER');
  return {
    schema_version: 'statistical-levels.g5-adopt-invocation-receipt.v1', operation: ADOPT,
    target: { production_git_sha: request.candidate_git_sha, production_deployment_id: request.candidate_deployment_id,
      authority_run_id: request.authority_run_id, sealed_manifest_sha256: request.sealed_manifest_sha256 },
    execution: { function_arn: P.lambda_arn, invocation_type: 'RequestResponse', ...nativeInvocationIdentity(metadata),
      github_repository: environment.GITHUB_REPOSITORY, github_ref: environment.GITHUB_REF,
      workflow_path: P.workflow_path, workflow_sha256: workflowSha256,
      workflow_run_id: request.workflow_run_id, workflow_run_attempt: environment.GITHUB_RUN_ATTEMPT,
      workflow_execution_sha: request.workflow_execution_sha, started_at: startedAt, completed_at: completedAt },
    qa: { qa_attestation_id: request.qa_attestation_id, qa_attestation_hash: request.qa_attestation_hash },
    response: { state: response.state, marker_sha256: response.marker_sha256, vercel_write: response.vercel_write, provider_fetch: response.provider_fetch },
  };
}
