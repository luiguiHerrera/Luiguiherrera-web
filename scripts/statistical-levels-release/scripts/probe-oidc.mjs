import { createPublicKey, verify } from 'node:crypto';
import { P, exactKeys, need } from './release-core.mjs';

// Direct jobs bind signed OIDC identity to GitHub's native job-definition context.
// Only bounded workflow identity metadata is exported, never tokens or credentials.
const VERSION = 'statistical-levels.probe-oidc-evidence.v3';
const workflowPath = '.github/workflows/statistical-levels-release.yml';
const matchRules = [
  ['issuer_match', 'OIDC_ISSUER_MISMATCH'], ['audience_match', 'OIDC_AUDIENCE_MISMATCH'],
  ['subject_match', 'OIDC_SUBJECT_MISMATCH'], ['repository_match', 'OIDC_REPOSITORY_MISMATCH'],
  ['repository_id_match', 'OIDC_REPOSITORY_ID_MISMATCH'], ['repository_owner_id_match', 'OIDC_REPOSITORY_OWNER_ID_MISMATCH'],
  ['ref_match', 'OIDC_REF_MISMATCH'], ['workflow_ref_match', 'WORKFLOW_REF_MISMATCH'],
  ['workflow_sha_match', 'WORKFLOW_SHA_MISMATCH'], ['sha_match', 'OIDC_SHA_MISMATCH'],
  ['workflow_match', 'OIDC_WORKFLOW_MISMATCH'], ['event_name_match', 'OIDC_EVENT_NAME_MISMATCH'],
  ['run_id_match', 'OIDC_RUN_ID_MISMATCH'], ['run_attempt_match', 'OIDC_RUN_ATTEMPT_MISMATCH'],
  ['time_valid', 'OIDC_TIME'],
];
const runtimeKeys = ['runtime_job_equals_caller_ref', 'runtime_job_equals_caller_sha',
  'runtime_job_equals_caller_repository', 'runtime_job_workflow_file_path_match'];
const unsignedCodes = ['PROBE_OIDC_AUDIENCE', 'PROBE_OIDC_EXPECTED_RUN_IDENTITY', 'PROBE_OIDC_EXPECTED_WORKFLOW_IDENTITY', 'OIDC_TOKEN_FORMAT',
  'OIDC_HEADER_FORMAT', 'OIDC_ALGORITHM', 'OIDC_KEY', 'OIDC_KEY_SIZE', 'OIDC_SIGNATURE'];
const booleanKeys = [...matchRules.map(([key]) => key), 'environment_present', 'job_workflow_ref_present',
  'job_workflow_sha_present', 'job_workflow_ref_match', 'job_workflow_sha_match', ...runtimeKeys];
const identityFields = [
  ['job_workflow_ref_value', 'job_workflow_ref_value_classification', 'ref'],
  ['job_workflow_sha_value', 'job_workflow_sha_value_classification', 'sha'],
  ['runtime_job_workflow_ref', 'runtime_job_workflow_ref_classification', 'ref'],
  ['runtime_job_workflow_sha', 'runtime_job_workflow_sha_classification', 'sha'],
  ['runtime_job_workflow_repository', 'runtime_job_workflow_repository_classification', 'repository'],
  ['runtime_job_workflow_file_path', 'runtime_job_workflow_file_path_classification', 'path'],
];
const claimKeys = [...booleanKeys, 'subject_classification', 'environment_value_or_expected_classification',
  'caller_workflow_sha', ...identityFields.flatMap(([value, classification]) => [value, classification])];
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
class Rejected extends Error {}
function requireCheck(condition, code) { if (!condition) throw new Rejected(code); }

function subjectClass(value) {
  if (typeof value !== 'string' || value.length === 0) return 'MISSING_OR_INVALID';
  if (value === P.aws_subject) return 'EXPECTED_BRANCH';
  if (/^repo:[^:]+\/[^:]+:ref:refs\/heads\/.+$/.test(value)) return 'OTHER_BRANCH';
  if (/^repo:[^:]+\/[^:]+:environment:.+$/.test(value)) return 'ENVIRONMENT';
  if (/^repo:[^:]+\/[^:]+:pull_request$/.test(value)) return 'PULL_REQUEST';
  return 'OTHER';
}

// A failed comparison may retain a well-formed alternate workflow identity for
// diagnosis. Format acceptance here does not authorize that identity: all trust
// decisions below still require exact equality with the qualified direct caller.
const credentialPattern = /(?:eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:gh[pousr]_|github_pat_|vcp_|AKIA|ASIA)[A-Za-z0-9_]{8,}|Bearer|Authorization|ACTIONS_ID_TOKEN_REQUEST_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)/i;
const repositoryPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const pathPattern = /^\.github\/workflows\/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,199}\.ya?ml$/;
function validIdentity(value, kind) {
  if (typeof value !== 'string' || value.length > 1024 || credentialPattern.test(value)) return false;
  if (kind === 'sha') return /^[a-f0-9]{40}$/.test(value);
  if (kind === 'repository') return repositoryPattern.test(value) && !value.split('/').some(part => part === '.' || part === '..');
  if (kind === 'path') return pathPattern.test(value);
  const match = /^([^/]+\/[^/]+)\/(\.github\/workflows\/[^@]+)@(.+)$/.exec(value);
  if (!match || !validIdentity(match[1], 'repository') || !validIdentity(match[2], 'path')) return false;
  return /^[a-f0-9]{40}$/.test(match[3]) ||
    (/^refs\/(?:heads|tags)\/[A-Za-z0-9_-][A-Za-z0-9_./-]{0,499}$/.test(match[3]) &&
      !match[3].includes('..') && !match[3].includes('//') && !/[/.]$/.test(match[3]));
}
function identityMetadata(source, key, kind) {
  const present = own(source, key);
  const valid = present && validIdentity(source[key], kind);
  return { value: valid ? source[key] : null,
    classification: !present ? 'ABSENT' : valid ? 'VALID_IDENTITY_METADATA' : 'INVALID_IDENTITY_METADATA' };
}
function safeClaims(claims, audience, env, now) {
  const metadata = [
    identityMetadata(claims, 'job_workflow_ref', 'ref'), identityMetadata(claims, 'job_workflow_sha', 'sha'),
    identityMetadata(env, 'SL_JOB_WORKFLOW_REF', 'ref'), identityMetadata(env, 'SL_JOB_WORKFLOW_SHA', 'sha'),
    identityMetadata(env, 'SL_JOB_WORKFLOW_REPOSITORY', 'repository'), identityMetadata(env, 'SL_JOB_WORKFLOW_FILE_PATH', 'path'),
  ];
  const [tokenRef, tokenSha, runtimeRef, runtimeSha, runtimeRepository, runtimePath] = metadata;
  return {
    issuer_match: claims.iss === P.issuer,
    audience_match: claims.aud === audience,
    subject_classification: subjectClass(claims.sub), subject_match: claims.sub === P.aws_subject,
    repository_match: claims.repository === P.repository,
    repository_id_match: claims.repository_id === P.repository_id,
    repository_owner_id_match: claims.repository_owner_id === P.repository_owner_id,
    ref_match: claims.ref === 'refs/heads/' + P.branch,
    workflow_ref_match: claims.workflow_ref === P.workflow_ref,
    workflow_sha_match: claims.workflow_sha === env.GITHUB_SHA,
    sha_match: claims.sha === env.GITHUB_SHA, workflow_match: claims.workflow === P.workflow_name,
    event_name_match: claims.event_name === 'workflow_dispatch',
    run_id_match: claims.run_id === env.GITHUB_RUN_ID, run_attempt_match: claims.run_attempt === env.GITHUB_RUN_ATTEMPT,
    time_valid: Number.isInteger(claims.exp) && Number.isInteger(claims.iat) && Number.isInteger(claims.nbf) &&
      claims.exp > now + 30 && claims.iat <= now + 30 && claims.nbf <= now + 30 && now - claims.iat <= 600,
    environment_present: own(claims, 'environment'),
    environment_value_or_expected_classification: own(claims, 'environment') ? 'UNEXPECTED_PRESENT' : 'ABSENT',
    job_workflow_ref_present: own(claims, 'job_workflow_ref'),
    job_workflow_sha_present: own(claims, 'job_workflow_sha'),
    job_workflow_ref_match: tokenRef.value !== null && tokenRef.value === runtimeRef.value,
    job_workflow_sha_match: tokenSha.value !== null && tokenSha.value === runtimeSha.value,
    caller_workflow_sha: env.GITHUB_WORKFLOW_SHA,
    runtime_job_equals_caller_ref: runtimeRef.value === env.GITHUB_WORKFLOW_REF,
    runtime_job_equals_caller_sha: runtimeSha.value === env.GITHUB_WORKFLOW_SHA,
    runtime_job_equals_caller_repository: runtimeRepository.value === env.GITHUB_REPOSITORY,
    runtime_job_workflow_file_path_match: runtimePath.value === workflowPath,
    ...Object.fromEntries(identityFields.flatMap(([value, classification], index) =>
      [[value, metadata[index].value], [classification, metadata[index].classification]])),
  };
}

function claimError(claims) {
  if (claims.environment_present) return 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM';
  if (runtimeKeys.some(key => !claims[key])) return 'UNEXPECTED_REUSABLE_OR_ALTERNATE_JOB_WORKFLOW_IDENTITY';
  const existingMismatch = matchRules.find(([key]) => !claims[key]);
  if (existingMismatch) return existingMismatch[1];
  if (!claims.job_workflow_ref_present) return 'MISSING_JOB_WORKFLOW_REF';
  if (!claims.job_workflow_sha_present) return 'MISSING_JOB_WORKFLOW_SHA';
  if (!claims.job_workflow_ref_match) return 'JOB_WORKFLOW_REF_MISMATCH';
  if (!claims.job_workflow_sha_match) return 'JOB_WORKFLOW_SHA_MISMATCH';
  return null;
}

function evidence(kind, signed, claims, error) {
  return { schema_version: VERSION, audience_kind: kind, signature_verified: signed,
    result: error === null ? 'PASS' : 'FAIL', error_code: error, claims };
}

// Uses only supplied token/JWKS bytes. No network, credentials file, or provider API.
export function evaluateProbeOIDC(token, jwks, audience, env, now) {
  const kind = audience === P.vercel_audience ? 'VERCEL' : audience === P.aws_audience ? 'AWS' : 'UNSUPPORTED';
  let signed = false;
  try {
    requireCheck(kind !== 'UNSUPPORTED', 'PROBE_OIDC_AUDIENCE');
    requireCheck(object(env) && typeof env.GITHUB_SHA === 'string' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA) &&
      typeof env.GITHUB_RUN_ID === 'string' && /^[1-9][0-9]{0,19}$/.test(env.GITHUB_RUN_ID) &&
      typeof env.GITHUB_RUN_ATTEMPT === 'string' && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT) && Number.isInteger(now), 'PROBE_OIDC_EXPECTED_RUN_IDENTITY');
    requireCheck(env.GITHUB_WORKFLOW_REF === P.workflow_ref && env.GITHUB_WORKFLOW_SHA === env.GITHUB_SHA &&
      env.GITHUB_REPOSITORY === P.repository, 'PROBE_OIDC_EXPECTED_WORKFLOW_IDENTITY');
    requireCheck(typeof token === 'string' && token.length < 20000, 'OIDC_TOKEN_FORMAT');
    const parts = token.split('.');
    requireCheck(parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part) &&
      Buffer.from(part, 'base64url').toString('base64url') === part), 'OIDC_TOKEN_FORMAT');
    let header;
    try { header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); }
    catch { throw new Rejected('OIDC_HEADER_FORMAT'); }
    requireCheck(object(header), 'OIDC_HEADER_FORMAT');
    requireCheck(header.alg === 'RS256' && typeof header.kid === 'string' && header.kid.length > 0 && header.kid.length <= 256 &&
      !own(header, 'jku') && !own(header, 'x5u') && !own(header, 'crit'), 'OIDC_ALGORITHM');
    requireCheck(object(jwks) && Array.isArray(jwks.keys) && jwks.keys.length <= 100, 'OIDC_KEY');
    const matches = jwks.keys.filter(key => object(key) && key.kid === header.kid && key.kty === 'RSA' &&
      (!key.alg || key.alg === 'RS256') && (!key.use || key.use === 'sig'));
    requireCheck(matches.length === 1, 'OIDC_KEY');
    let key;
    try { key = createPublicKey({ key: matches[0], format: 'jwk' }); }
    catch { throw new Rejected('OIDC_KEY'); }
    requireCheck(key.asymmetricKeyType === 'rsa' && key.asymmetricKeyDetails.modulusLength >= 2048, 'OIDC_KEY_SIZE');
    requireCheck(verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url')), 'OIDC_SIGNATURE');
    signed = true;
    let claims;
    try { claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); }
    catch { throw new Rejected('OIDC_CLAIMS_FORMAT'); }
    requireCheck(object(claims), 'OIDC_CLAIMS_FORMAT');
    const safe = safeClaims(claims, audience, env, now);
    return evidence(kind, true, safe, claimError(safe));
  } catch (error) {
    // No crypto/parser exception, input value, key, token, or raw claim is reflected.
    return evidence(kind, signed, null, error instanceof Rejected ? error.message : 'OIDC_VERIFICATION_FAILED');
  }
}

export function validateProbeOIDCEvidence(value) {
  const invalid = 'INVALID_PROBE_OIDC_EVIDENCE';
  exactKeys(value, ['schema_version', 'audience_kind', 'signature_verified', 'result', 'error_code', 'claims'], invalid);
  need(value.schema_version === VERSION && ['VERCEL', 'AWS', 'UNSUPPORTED'].includes(value.audience_kind) &&
    typeof value.signature_verified === 'boolean' && ['PASS', 'FAIL'].includes(value.result), invalid);
  if (value.claims === null) {
    need(value.result === 'FAIL', invalid);
    need(value.signature_verified ? ['OIDC_CLAIMS_FORMAT', 'OIDC_VERIFICATION_FAILED'].includes(value.error_code) :
      [...unsignedCodes, 'OIDC_VERIFICATION_FAILED'].includes(value.error_code), invalid);
    need(value.audience_kind === 'UNSUPPORTED' ? value.error_code === 'PROBE_OIDC_AUDIENCE' : value.error_code !== 'PROBE_OIDC_AUDIENCE', invalid);
  } else {
    const claims = value.claims;
    exactKeys(claims, claimKeys, invalid);
    need(value.signature_verified && value.audience_kind !== 'UNSUPPORTED' && booleanKeys.every(key => typeof claims[key] === 'boolean'), invalid);
    need(['EXPECTED_BRANCH', 'OTHER_BRANCH', 'ENVIRONMENT', 'PULL_REQUEST', 'OTHER', 'MISSING_OR_INVALID'].includes(claims.subject_classification) &&
      claims.subject_match === (claims.subject_classification === 'EXPECTED_BRANCH'), invalid);
    need(claims.environment_value_or_expected_classification === (claims.environment_present ? 'UNEXPECTED_PRESENT' : 'ABSENT') &&
      validIdentity(claims.caller_workflow_sha, 'sha'), invalid);
    for (const [field, classification, kind] of identityFields) {
      need(['ABSENT', 'VALID_IDENTITY_METADATA', 'INVALID_IDENTITY_METADATA'].includes(claims[classification]), invalid);
      need(claims[classification] === 'VALID_IDENTITY_METADATA' ? validIdentity(claims[field], kind) : claims[field] === null, invalid);
    }
    for (const key of ['job_workflow_ref', 'job_workflow_sha']) {
      need(claims[key + '_present'] === (claims[key + '_value_classification'] !== 'ABSENT'), invalid);
      need(claims[key + '_match'] === (claims[key + '_value'] !== null &&
        claims[key + '_value'] === claims['runtime_' + key]), invalid);
    }
    need(claims.runtime_job_equals_caller_ref === (claims.runtime_job_workflow_ref === P.workflow_ref) &&
      claims.runtime_job_equals_caller_sha === (claims.runtime_job_workflow_sha === claims.caller_workflow_sha) &&
      claims.runtime_job_equals_caller_repository === (claims.runtime_job_workflow_repository === P.repository) &&
      claims.runtime_job_workflow_file_path_match === (claims.runtime_job_workflow_file_path === workflowPath), invalid);
    const error = claimError(claims);
    need(value.error_code === error && value.result === (error === null ? 'PASS' : 'FAIL'), invalid);
  }
  // Copy only validated primitives. Stringifying a caller object would execute
  // an inherited/non-enumerable toJSON method after validation.
  return { schema_version: VERSION, audience_kind: value.audience_kind,
    signature_verified: value.signature_verified, result: value.result, error_code: value.error_code,
    claims: value.claims === null ? null : Object.fromEntries(claimKeys.map(key => [key, value.claims[key]])) };
}
