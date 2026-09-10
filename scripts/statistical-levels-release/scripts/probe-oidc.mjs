import { createPublicKey, verify } from 'node:crypto';
import { P, exactKeys, need } from './release-core.mjs';

// This architecture has neither a GitHub job environment nor a reusable workflow.
// Evidence contains classifications and booleans only, never signed claim values.
const VERSION = 'statistical-levels.probe-oidc-evidence.v1';
const presence = ['environment', 'job_workflow_ref', 'job_workflow_sha'];
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
const presenceRules = [
  ['environment_present', 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM'],
  ['job_workflow_ref_present', 'UNEXPECTED_JOB_WORKFLOW_REF'],
  ['job_workflow_sha_present', 'UNEXPECTED_JOB_WORKFLOW_SHA'],
];
const unsignedCodes = ['PROBE_OIDC_AUDIENCE', 'PROBE_OIDC_EXPECTED_RUN_IDENTITY', 'OIDC_TOKEN_FORMAT',
  'OIDC_HEADER_FORMAT', 'OIDC_ALGORITHM', 'OIDC_KEY', 'OIDC_KEY_SIZE', 'OIDC_SIGNATURE'];
const booleanKeys = [...matchRules.map(([key]) => key), ...presenceRules.map(([key]) => key)];
const claimKeys = [...booleanKeys, 'subject_classification', 'environment_value_or_expected_classification',
  'job_workflow_ref_value_or_expected_classification', 'job_workflow_sha_match_if_applicable'];
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

function safeClaims(claims, audience, env, now) {
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
    environment_present: own(claims, presence[0]),
    environment_value_or_expected_classification: own(claims, presence[0]) ? 'UNEXPECTED_PRESENT' : 'ABSENT',
    job_workflow_ref_present: own(claims, presence[1]),
    job_workflow_ref_value_or_expected_classification: own(claims, presence[1]) ? 'UNEXPECTED_PRESENT' : 'ABSENT',
    job_workflow_sha_present: own(claims, presence[2]),
    job_workflow_sha_match_if_applicable: 'NOT_APPLICABLE',
  };
}

function claimError(claims) {
  return presenceRules.find(([key]) => claims[key])?.[1] ?? matchRules.find(([key]) => !claims[key])?.[1] ?? null;
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
      claims.job_workflow_ref_value_or_expected_classification === (claims.job_workflow_ref_present ? 'UNEXPECTED_PRESENT' : 'ABSENT') &&
      claims.job_workflow_sha_match_if_applicable === 'NOT_APPLICABLE', invalid);
    const error = claimError(claims);
    need(value.error_code === error && value.result === (error === null ? 'PASS' : 'FAIL'), invalid);
  }
  // Copy only validated primitives. Stringifying a caller object would execute
  // an inherited/non-enumerable toJSON method after validation.
  return { schema_version: VERSION, audience_kind: value.audience_kind,
    signature_verified: value.signature_verified, result: value.result, error_code: value.error_code,
    claims: value.claims === null ? null : Object.fromEntries(claimKeys.map(key => [key, value.claims[key]])) };
}
