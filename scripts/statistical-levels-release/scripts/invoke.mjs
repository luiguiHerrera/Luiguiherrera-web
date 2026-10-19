// The only cloud mutation this future workflow can request. Never used by local tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ADOPT, P, need, sha, canonical, validateControllerRequest, controllerOutcome } from './release-core.mjs';
import { adoptInvocationReceipt, nativeInvocationIdentity } from './adopt-invocation-receipt.mjs';
// Failure diagnostics are not a G5 receipt and cannot authorize acceptance or retry.
// Exact constants from deployed controller f223db... (decoded 8859882a...).
const CONTROLLER_CODES = new Set([
  "412",
  "412_ALREADY_PUBLISHED",
  "412_PRECONDITION_FAILED",
  "ANCESTRY_MISMATCH",
  "AUTHORITY_DAY_MISMATCH",
  "AUTHORITY_NAMESPACE",
  "AUTHORITY_NOT_SEALED",
  "AUTHORITY_READ_UNAVAILABLE",
  "BASELINE_DAY_MISMATCH",
  "BASELINE_IDENTITY_MISMATCH",
  "BASELINE_MARKER_CONFLICT",
  "BASELINE_MARKER_IDENTITY",
  "BASELINE_PROVENANCE_MISMATCH",
  "BLOCKED_CONCURRENT_MAIN_ACTIVITY",
  "CAPABILITY_COUNT",
  "CAPABILITY_LEDGER_CHANGED",
  "CERT_BEFORE_PRODUCTION_READY",
  "COMMIT_IDENTITY",
  "DAILY_AUTHORITY_CONFLICT",
  "DATA_ONLY_POLICY",
  "DEPLOYMENT_ID_INVALID",
  "GENERATED_FILE_TYPE",
  "GENERATOR_BYTES_CHANGED",
  "GENERATOR_PARENT_MISMATCH",
  "GENERATOR_POLICY_CHANGED",
  "GIT_BLOB_MISMATCH",
  "HTTP_ORIGIN_DENIED",
  "HTTP_READ_OR_WRITE_FAILED",
  "HTTP_RESPONSE_LIMIT",
  "HTTP_STATUS",
  "HTTP_TRANSPORT_FAILURE",
  "INPUT_BINDING",
  "INPUT_COVERAGE",
  "INTENT_CONFLICT",
  "INVALID_ACCOUNT",
  "INVALID_ATTESTATION",
  "INVALID_ATTESTATION_ID",
  "INVALID_AUTHORITY",
  "INVALID_DEPLOYMENT",
  "INVALID_HASH",
  "INVALID_MAIN_OBSERVATION",
  "INVALID_PUBLICATION_DATE",
  "INVALID_SHA",
  "INVALID_TIMESTAMP",
  "INVALID_WORKFLOW_RUN_ID",
  "MANIFEST_INVALID",
  "OPERATION_DENIED",
  "ORPHAN_RESPONSE",
  "PREDECESSOR_DATE_INVALID",
  "PREVIEW_ORIGIN_MISMATCH",
  "PREVIOUS_CERTIFIED_MARKER_MISSING",
  "PREVIOUS_MARKER_MAIN_INCONSISTENT",
  "PREVIOUS_MARKER_SCHEMA",
  "PRODUCTION_CERT_BEFORE_REBUILD",
  "PRODUCTION_IDENTITY_MISMATCH",
  "PRODUCTION_LINEAGE_MISMATCH",
  "PRODUCTION_PROJECT_MISMATCH",
  "PROVENANCE_HASH_MISMATCH",
  "PROVENANCE_MISMATCH",
  "PUBLIC_AUTHORITY_MISMATCH",
  "PUBLIC_CERTIFICATION_MISMATCH",
  "QA_ABSENT",
  "QA_APPLICATION_ERRORS",
  "QA_BINDING_MISMATCH",
  "QA_CHECK_INVALID",
  "QA_COVERAGE",
  "QA_DEFECT_FAILURE",
  "QA_EVENT_CLASSIFICATION",
  "QA_EXPIRED",
  "QA_HASH_MISMATCH",
  "QA_INLINE_MISMATCH",
  "QA_INTERACTION_FAILURE",
  "QA_JOBS_INCOMPLETE",
  "QA_JOB_INVALID",
  "QA_JOB_NOT_UNIQUE",
  "QA_JOB_ORDER",
  "QA_MARKER_INVALID",
  "QA_NOT_CANONICAL",
  "QA_REPOSITORY_IDENTITY",
  "QA_RUN_MISMATCH",
  "QA_SCHEMA",
  "QA_SIZE_LIMIT",
  "QA_UNSAFE_EVENT",
  "QA_WORKFLOW_NAME",
  "QA_WORKFLOW_NOT_APPROVED",
  "RAW_COVERAGE",
  "RAW_HASH_MISMATCH",
  "RAW_MANIFEST_MISMATCH",
  "RAW_RECORD_HASH",
  "RELEASE_DENIED",
  "REQUEST_SCHEMA",
  "S3_INTEGRITY",
  "SEALED_OBJECT_MISMATCH",
  "SEALED_OBJECT_SET",
  "SEALED_PATH_DENIED",
  "SEAL_HASH_BINDING",
  "SEAL_HASH_MISMATCH",
  "SECRET_ARN_MISMATCH",
  "SECRET_INVALID",
  "SECRET_NOT_LOADED",
  "SECRET_ORIGIN_DENIED",
  "SECRET_SCOPE_METADATA",
  "SECRET_UNAVAILABLE",
  "SNAPSHOT_COVERAGE",
  "SNAPSHOT_HASH",
  "SNAPSHOT_PROVENANCE",
  "STATE_BUCKET_MISMATCH",
  "STATE_EVENT_CONFLICT",
  "STATE_KEY_DENIED",
  "STATE_READBACK_MISMATCH",
  "STATE_READ_UNAVAILABLE",
  "STATE_SIZE_LIMIT",
  "STATE_WRITE_UNAVAILABLE",
  "TOKEN_EXPIRED_OR_EXPIRING",
  "TRUNCATED_GIT_TREE",
  "UNCLASSIFIED_FAIL_CLOSED",
  "VERCEL_AUTH_DENIED",
  "VERCEL_BRANCH_MISMATCH",
  "VERCEL_INVALID_RESPONSE",
  "VERCEL_NOT_READY",
  "VERCEL_PROJECT_MISMATCH",
  "VERCEL_SHA_MISMATCH",
  "WORKFLOW_CANDIDATE_ANCESTRY",
  "WRITE_ENDPOINT_DENIED",
  "WRONG_BRANCH",
  "WRONG_REPOSITORY",
  "WRONG_SHA"
]);
const LOCAL_CODES = new Set([
  'CONTROLLER_INVOCATION_FAILED', 'CONTROLLER_RESPONSE_INVALID', 'ADOPTION_RESPONSE_FIELDS',
  'ADOPTION_RESPONSE_INVALID', 'PROMOTION_RESPONSE_INVALID', 'RECEIPT_ADOPT_ONLY',
  'RECEIPT_EXECUTION_BINDING', 'RECEIPT_WORKFLOW_IDENTITY', 'RECEIPT_TIME_ORDER',
  'INVOCATION_NOT_SUCCESSFUL', 'INVOCATION_VERSION', 'INVOCATION_NATIVE_LOG_UNAVAILABLE',
  'INVOCATION_NATIVE_LOG_ENCODING', 'INVOCATION_NATIVE_TERMINAL_AMBIGUOUS',
  'INVOCATION_NATIVE_TERMINAL_MISMATCH', 'INVOCATION_NATIVE_START_MISMATCH', 'AWS_SESSION_REQUIRED',
]);
let stage = 'REQUEST_VALIDATION', metadata, response, responseHash = null, invocationStartedAt = null;
let invocationAttempted = false, diagnosticAttempted = false;
function failureNative() {
  // Reuse the success verifier without mutating its input. A rejected native
  // identity is explicitly unavailable here; no synthetic terminal is produced.
  try { return { verification: 'VALIDATED', ...nativeInvocationIdentity(metadata) }; }
  catch (error) { return { verification: 'UNAVAILABLE_OR_REJECTED', request_id: null,
    code: LOCAL_CODES.has(error.message) ? error.message : 'UNCLASSIFIED' }; }
}
async function retainFailure(error) {
  if (diagnosticAttempted) throw new Error('DIAGNOSTIC_ALREADY_ATTEMPTED');
  diagnosticAttempted = true;
  const states = ['DENIED', 'BLOCKED_CONCURRENT_MAIN_ACTIVITY', 'BASELINE_ADOPTED',
    'ALREADY_ADOPTED', 'PROMOTED_NOT_CERTIFIED', 'VERCEL_AUTH_DENIED'];
  const failure = {
    schema_version: 'statistical-levels.controller-invocation-failure.v1',
    acceptance: 'FAIL', retry_permitted: false, stage,
    code: LOCAL_CODES.has(error?.message) ? error.message : 'UNCLASSIFIED',
    invocation_attempted: invocationAttempted, invocation_started_at: invocationStartedAt,
    recorded_at: new Date().toISOString(),
    execution: {
      function_arn: P.lambda_arn,
      run_id: /^[1-9][0-9]{0,19}$/.test(process.env.GITHUB_RUN_ID || '') ? process.env.GITHUB_RUN_ID : null,
      run_attempt: /^[1-9][0-9]{0,4}$/.test(process.env.GITHUB_RUN_ATTEMPT || '') ? process.env.GITHUB_RUN_ATTEMPT : null,
      execution_sha: /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '') ? process.env.GITHUB_SHA : null,
    },
    aws: {
      status_code: Number.isInteger(metadata?.StatusCode) && metadata.StatusCode >= 100 && metadata.StatusCode <= 599 ? metadata.StatusCode : null,
      function_error: metadata && Object.hasOwn(metadata, 'FunctionError')
        ? (['Handled', 'Unhandled'].includes(metadata.FunctionError) ? metadata.FunctionError : 'UNRECOGNIZED') : null,
      metadata_available: !!metadata && typeof metadata === 'object' && !Array.isArray(metadata),
    },
    controller: {
      state: states.includes(response?.state) ? response.state : 'UNAVAILABLE_OR_UNRECOGNIZED',
      code: response?.state === 'DENIED' && response.provider_fetch === false &&
        Object.keys(response).sort().join(',') === 'code,provider_fetch,state'
        ? (CONTROLLER_CODES.has(response.code) ? response.code : 'UNRECOGNIZED') : null,
      response_sha256: responseHash,
    },
    native: failureNative(),
  };
  // Never persist exception bodies, stderr, request, response, metadata or LogResult.
  await fs.writeFile(path.join(process.env.RUNNER_TEMP, 'statistical-levels-controller-failure.json'),
    canonical(failure), { flag: 'wx', mode: 0o600 });
  // Authorize upload only after this process creates the sanitized artifact.
  // A preexisting path or failed write must never make prior bytes eligible.
  await fs.appendFile(process.env.GITHUB_OUTPUT, 'controller_failure_diagnostic_ready=true\n');
}
try {
  const requestFile = path.join(process.env.RUNNER_TEMP, 'statistical-levels-release-request.json');
  const request = JSON.parse(await fs.readFile(requestFile, 'utf8'));
  validateControllerRequest(request);
  need(process.env.AWS_REGION === 'eu-south-2' && process.env.AWS_SESSION_TOKEN, 'AWS_SESSION_REQUIRED');
  const output = path.join(process.env.RUNNER_TEMP, 'statistical-levels-controller-response.json');
  invocationStartedAt = new Date().toISOString();
  stage = 'AWS_TRANSPORT';
  invocationAttempted = true;
  const metadataBytes = execFileSync('aws', ['lambda', 'invoke', '--function-name', P.lambda_arn,
    '--region', 'eu-south-2', '--invocation-type', 'RequestResponse', ...(request.operation === ADOPT ? ['--log-type', 'Tail'] : []), '--cli-binary-format', 'raw-in-base64-out',
    '--payload', 'fileb://' + requestFile, '--cli-read-timeout', '930', '--no-cli-pager', output],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 950000,
      env: { ...process.env, AWS_MAX_ATTEMPTS: '1', AWS_PAGER: '' } });
  stage = 'AWS_METADATA_PARSE';
  metadata = JSON.parse(metadataBytes);
  stage = 'AWS_INVOCATION_STATUS';
  need(metadata.StatusCode === 200 && !metadata.FunctionError, 'CONTROLLER_INVOCATION_FAILED');
  stage = 'RESPONSE_READ';
  const responseBytes = await fs.readFile(output);
  responseHash = sha(responseBytes);
  stage = 'RESPONSE_PARSE';
  response = JSON.parse(responseBytes);
  stage = 'CONTROLLER_RESULT';
  const outcome = controllerOutcome(request.operation, response);
  if (request.operation === ADOPT) {
    stage = 'INVOCATION_RECEIPT';
    const receipt = adoptInvocationReceipt({ request, response, metadata, environment: process.env,
      workflowSha256: sha(await fs.readFile(P.workflow_path)), startedAt: invocationStartedAt, completedAt: new Date().toISOString() });
    stage = 'RECEIPT_PERSISTENCE';
    await fs.writeFile(path.join(process.env.RUNNER_TEMP, 'statistical-levels-g5-invocation-receipt.json'),
      canonical(receipt), { flag: 'wx', mode: 0o600 });
  }
  if (outcome.stdout) process.stdout.write(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  process.exitCode = outcome.exitCode;
  if (outcome.exitCode !== 0) { stage = 'CONTROLLER_RESULT'; await retainFailure(); }
} catch (error) {
  process.stderr.write('CONTROLLER_INVOCATION_NOT_CONFIRMED_NO_RETRY\n'); process.exitCode = 1;
  try { await retainFailure(error); }
  catch { process.stderr.write('CONTROLLER_FAILURE_DIAGNOSTIC_UNAVAILABLE_NO_RETRY\n'); }
}
