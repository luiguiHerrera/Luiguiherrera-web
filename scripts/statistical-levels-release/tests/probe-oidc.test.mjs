import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { P } from '../scripts/release-core.mjs';
import { evaluateProbeOIDC, validateProbeOIDCEvidence } from '../scripts/probe-oidc.mjs';

// Synthetic signing keys exist only in process memory; no real JWT is requested.
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJWK = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'synthetic', alg: 'RS256', use: 'sig' };
const jwks = { keys: [publicJWK] }, now = 1800000000;
const env = { GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '500', GITHUB_RUN_ATTEMPT: '1' };
const claims = (audience = P.vercel_audience) => ({ iss: P.issuer, aud: audience, sub: P.aws_subject,
  repository: P.repository, repository_id: P.repository_id, repository_owner_id: P.repository_owner_id,
  ref: 'refs/heads/' + P.branch, workflow_ref: P.workflow_ref, workflow_sha: env.GITHUB_SHA,
  sha: env.GITHUB_SHA, workflow: P.workflow_name, event_name: 'workflow_dispatch',
  run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT, exp: now + 300, iat: now, nbf: now });
function token(payload = claims(), header = { alg: 'RS256', kid: 'synthetic' }, key = pair.privateKey) {
  const encode = obj => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');
  const body = encode(header) + '.' + encode(payload);
  return body + '.' + sign('RSA-SHA256', Buffer.from(body), key).toString('base64url');
}
function evaluate(payload = claims(), audience = P.vercel_audience) {
  const result = evaluateProbeOIDC(token(payload), jwks, audience, env, now);
  assert.deepEqual(validateProbeOIDCEvidence(result), result);
  return result;
}

for (const audience of [P.vercel_audience, P.aws_audience]) test('exact normal branch identity passes for ' + audience, () => {
  const result = evaluate(claims(audience), audience);
  assert.equal(result.result, 'PASS'); assert.equal(result.signature_verified, true); assert.equal(result.error_code, null);
  assert.equal(result.claims.subject_match, true); assert.equal(result.claims.subject_classification, 'EXPECTED_BRANCH');
  assert.equal(result.claims.environment_present, false); assert.equal(result.claims.job_workflow_ref_present, false);
  assert.equal(result.claims.job_workflow_sha_present, false);
});

const mismatches = [
  ['iss', 'OIDC_ISSUER_MISMATCH', 'issuer_match'], ['aud', 'OIDC_AUDIENCE_MISMATCH', 'audience_match'],
  ['sub', 'OIDC_SUBJECT_MISMATCH', 'subject_match'], ['repository', 'OIDC_REPOSITORY_MISMATCH', 'repository_match'],
  ['repository_id', 'OIDC_REPOSITORY_ID_MISMATCH', 'repository_id_match'],
  ['repository_owner_id', 'OIDC_REPOSITORY_OWNER_ID_MISMATCH', 'repository_owner_id_match'],
  ['ref', 'OIDC_REF_MISMATCH', 'ref_match'], ['workflow_ref', 'WORKFLOW_REF_MISMATCH', 'workflow_ref_match'],
  ['workflow_sha', 'WORKFLOW_SHA_MISMATCH', 'workflow_sha_match'], ['sha', 'OIDC_SHA_MISMATCH', 'sha_match'],
  ['workflow', 'OIDC_WORKFLOW_MISMATCH', 'workflow_match'], ['event_name', 'OIDC_EVENT_NAME_MISMATCH', 'event_name_match'],
  ['run_id', 'OIDC_RUN_ID_MISMATCH', 'run_id_match'], ['run_attempt', 'OIDC_RUN_ATTEMPT_MISMATCH', 'run_attempt_match'],
];
for (const [field, code, safeKey] of mismatches) {
  test('exact claim mismatch: ' + field, () => {
    const result = evaluate({ ...claims(), [field]: 'synthetic-wrong-value' });
    assert.equal(result.result, 'FAIL'); assert.equal(result.error_code, code); assert.equal(result.claims[safeKey], false);
    assert.ok(!JSON.stringify(result).includes('synthetic-wrong-value'));
  });
  test('missing claim rejected: ' + field, () => {
    const value = claims(); delete value[field];
    assert.equal(evaluate(value).error_code, code);
  });
}
for (const [field, code] of [
  ['environment', 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM'],
  ['job_workflow_ref', 'UNEXPECTED_JOB_WORKFLOW_REF'],
  ['job_workflow_sha', 'UNEXPECTED_JOB_WORKFLOW_SHA'],
]) for (const value of ['', null, false, 'synthetic-present-value']) test('unexpected ' + field + ' presence fails: ' + JSON.stringify(value), () => {
  const result = evaluate({ ...claims(), [field]: value });
  assert.equal(result.error_code, code); assert.equal(result.claims[field + '_present'], true);
  assert.ok(!JSON.stringify(result).includes('synthetic-present-value'));
});
test('Preview is not an allowed GitHub Actions environment', () => {
  const result = evaluate({ ...claims(), environment: 'Preview', sub: 'repo:' + P.repository + ':environment:Preview' });
  assert.equal(result.error_code, 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM');
  assert.equal(result.claims.subject_classification, 'ENVIRONMENT'); assert.equal(result.claims.subject_match, false);
});
test('same-path reusable identity is still unqualified and rejected', () => {
  assert.equal(evaluate({ ...claims(), job_workflow_ref: P.workflow_ref }).error_code, 'UNEXPECTED_JOB_WORKFLOW_REF');
  assert.equal(evaluate({ ...claims(), job_workflow_sha: env.GITHUB_SHA }).error_code, 'UNEXPECTED_JOB_WORKFLOW_SHA');
});
test('all unexpected presence booleans survive independent first error', () => {
  const result = evaluate({ ...claims(), environment: 'Preview', job_workflow_ref: P.workflow_ref, job_workflow_sha: env.GITHUB_SHA });
  assert.equal(result.error_code, 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM');
  for (const field of ['environment_present', 'job_workflow_ref_present', 'job_workflow_sha_present']) assert.equal(result.claims[field], true);
});
for (const [sub, classification] of [
  ['repo:' + P.repository + ':ref:refs/heads/main', 'OTHER_BRANCH'],
  ['repo:' + P.repository + ':environment:Preview', 'ENVIRONMENT'],
  ['repo:' + P.repository + ':pull_request', 'PULL_REQUEST'],
  ['repo:' + P.repository + ':ref:refs/tags/release', 'OTHER'], ['', 'MISSING_OR_INVALID'], [null, 'MISSING_OR_INVALID'],
]) test('subject classification preserves branch-only gate: ' + classification, () => {
  const result = evaluate({ ...claims(), sub });
  assert.equal(result.error_code, 'OIDC_SUBJECT_MISMATCH'); assert.equal(result.claims.subject_classification, classification);
  assert.ok(!JSON.stringify(result).includes(P.repository));
});
test('AWS also rejects environment subject without environment claim', () => {
  const result = evaluate({ ...claims(P.aws_audience), sub: 'repo:' + P.repository + ':environment:Preview' }, P.aws_audience);
  assert.equal(result.error_code, 'OIDC_SUBJECT_MISMATCH');
});
test('harmless additional signed claims do not alter evidence or identity', () => {
  assert.deepEqual(evaluate({ ...claims(), actor: 'synthetic-unreported-actor', runner_environment: 'github-hosted',
    repository_visibility: 'public', arbitrary: { authorization: 'synthetic-never-serialized' } }), evaluate());
});
for (const delta of [{ exp: now + 30 }, { exp: '1800000300' }, { iat: now + 31 }, { iat: now - 601 }, { nbf: now + 31 }, { nbf: null }]) {
  test('existing time gate rejects ' + JSON.stringify(delta), () => {
    const result = evaluate({ ...claims(), ...delta }); assert.equal(result.error_code, 'OIDC_TIME'); assert.equal(result.claims.time_valid, false);
  });
}
test('existing time boundaries remain accepted', () => {
  assert.equal(evaluate({ ...claims(), exp: now + 31, iat: now - 600, nbf: now + 30 }).result, 'PASS');
});
test('wrong immutable numeric ID types do not coerce', () => {
  assert.equal(evaluate({ ...claims(), repository_id: Number(P.repository_id) }).error_code, 'OIDC_REPOSITORY_ID_MISMATCH');
  assert.equal(evaluate({ ...claims(), repository_owner_id: Number(P.repository_owner_id) }).error_code, 'OIDC_REPOSITORY_OWNER_ID_MISMATCH');
});

function cryptoResult(value, keys = jwks, audience = P.vercel_audience, expectedEnv = env, time = now) {
  const result = evaluateProbeOIDC(value, keys, audience, expectedEnv, time);
  assert.deepEqual(validateProbeOIDCEvidence(result), result); return result;
}
for (const value of [null, false, '', 'not.a.jwt', 'x'.repeat(20000), 'a.b.c.d']) test('malformed token emits no claims: ' + String(value).slice(0, 20), () => {
  const result = cryptoResult(value); assert.equal(result.error_code, 'OIDC_TOKEN_FORMAT'); assert.equal(result.signature_verified, false); assert.equal(result.claims, null);
});
for (const header of ['{', [], null]) test('invalid JWT header emits precise code: ' + JSON.stringify(header), () => {
  assert.equal(cryptoResult(token(claims(), header)).error_code, 'OIDC_HEADER_FORMAT');
});
for (const header of [{ alg: 'none', kid: 'synthetic' }, { alg: 'HS256', kid: 'synthetic' },
  { alg: 'RS256', kid: '' }, { alg: 'RS256', kid: 'synthetic', jku: 'https://synthetic.invalid/key' },
  { alg: 'RS256', kid: 'synthetic', x5u: '' }, { alg: 'RS256', kid: 'synthetic', crit: [] }]) {
  test('algorithm/header substitution is rejected: ' + JSON.stringify(header), () => {
    const result = cryptoResult(token(claims(), header)); assert.equal(result.error_code, 'OIDC_ALGORITHM'); assert.equal(result.claims, null);
  });
}
for (const [name, keys] of [['null', null], ['missing keys', {}], ['empty keys', { keys: [] }],
  ['duplicate signing key', { keys: [publicJWK, publicJWK] }], ['wrong kid', { keys: [{ ...publicJWK, kid: 'other' }] }],
  ['wrong algorithm', { keys: [{ ...publicJWK, alg: 'HS256' }] }], ['encryption key', { keys: [{ ...publicJWK, use: 'enc' }] }],
  ['invalid modulus', { keys: [{ ...publicJWK, n: 'not-a-valid-key' }] }]]) {
  test('invalid JWKS fails without exposing claims: ' + name, () => {
    const result = cryptoResult(token(), keys); assert.ok(['OIDC_KEY', 'OIDC_KEY_SIZE'].includes(result.error_code)); assert.equal(result.claims, null);
  });
}
test('RSA modulus below 2048 remains rejected', () => {
  const weak = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const keys = { keys: [{ ...weak.publicKey.export({ format: 'jwk' }), kid: 'synthetic' }] };
  const result = cryptoResult(token(claims(), undefined, weak.privateKey), keys);
  assert.equal(result.error_code, 'OIDC_KEY_SIZE'); assert.equal(result.claims, null);
});
test('invalid signature never exports attacker claim classifications', () => {
  const signed = token({ ...claims(), environment: 'synthetic-never-exported' }).split('.');
  const bytes = Buffer.from(signed[2], 'base64url'); bytes[0] ^= 1; signed[2] = bytes.toString('base64url');
  const result = cryptoResult(signed.join('.'));
  assert.equal(result.error_code, 'OIDC_SIGNATURE'); assert.equal(result.signature_verified, false); assert.equal(result.claims, null);
});
for (const payload of ['{', [], null, '"arbitrary signed string"']) test('malformed signed claims emit no metadata: ' + JSON.stringify(payload), () => {
  const result = cryptoResult(token(payload)); assert.equal(result.error_code, 'OIDC_CLAIMS_FORMAT'); assert.equal(result.signature_verified, true); assert.equal(result.claims, null);
});
test('unsupported caller audience is bounded without echoing its value', () => {
  const result = cryptoResult(token(), jwks, 'https://synthetic-wrong-audience.invalid');
  assert.equal(result.audience_kind, 'UNSUPPORTED'); assert.equal(result.error_code, 'PROBE_OIDC_AUDIENCE');
  assert.ok(!JSON.stringify(result).includes('synthetic-wrong-audience'));
});
for (const expectedEnv of [null, {}, { ...env, GITHUB_SHA: 'main' }, { ...env, GITHUB_RUN_ID: undefined }, { ...env, GITHUB_RUN_ATTEMPT: 1 }]) {
  test('invalid expected execution context fails closed: ' + JSON.stringify(expectedEnv), () => {
    assert.equal(cryptoResult(token(), jwks, P.vercel_audience, expectedEnv).error_code, 'PROBE_OIDC_EXPECTED_RUN_IDENTITY');
  });
}

test('serialized evidence contains no token, signature, raw values or bearer credentials', () => {
  const signed = token({ ...claims(), job_workflow_ref: 'synthetic-secret-canary' });
  const result = cryptoResult(signed), encoded = JSON.stringify(result);
  for (const value of [...signed.split('.'), signed, P.issuer, P.aws_subject, P.workflow_ref, env.GITHUB_SHA, 'synthetic-secret-canary']) assert.ok(!encoded.includes(value));
  assert.ok(!/eyJ[A-Za-z0-9_-]+\.|Bearer |Authorization|AWS_ACCESS_KEY_ID|AWS_SESSION_TOKEN/.test(encoded));
  assert.ok(encoded.length < 2000);
});
for (const [name, mutate] of [
  ['raw token field', x => { x.token = 'synthetic'; }], ['claim value field', x => { x.claims.repository = P.repository; }],
  ['unknown error', x => { x.error_code = 'SYNTHETIC_ERROR'; x.result = 'FAIL'; }],
  ['false success', x => { x.claims.workflow_ref_match = false; }], ['wrong result', x => { x.result = 'FAIL'; }],
  ['boolean as string', x => { x.claims.issuer_match = 'true'; }], ['subject contradiction', x => { x.claims.subject_classification = 'OTHER'; }],
  ['environment contradiction', x => { x.claims.environment_present = true; }],
  ['job ref contradiction', x => { x.claims.job_workflow_ref_value_or_expected_classification = 'UNEXPECTED_PRESENT'; }],
  ['unqualified reusable match', x => { x.claims.job_workflow_sha_match_if_applicable = true; }],
  ['unsupported audience with claims', x => { x.audience_kind = 'UNSUPPORTED'; }],
  ['unsigned claims', x => { x.signature_verified = false; }],
]) test('evidence sanitizer rejects ' + name, () => {
  const value = evaluate(); mutate(value); assert.throws(() => validateProbeOIDCEvidence(value), /INVALID_PROBE_OIDC_EVIDENCE/);
});
test('evidence sanitizer returns a detached safe object', () => {
  const original = evaluate(), copy = validateProbeOIDCEvidence(original);
  copy.claims.issuer_match = false; assert.equal(original.claims.issuer_match, true);
});
for (const placement of ['outer-own', 'outer-prototype', 'claims-own', 'claims-prototype']) {
  test('evidence sanitizer never calls unvalidated toJSON: ' + placement, () => {
    const original = evaluate(), expected = validateProbeOIDCEvidence(original);
    let calls = 0;
    const hostile = () => { calls++; return { authorization: 'synthetic-unvalidated-field' }; };
    const target = placement.startsWith('claims') ? original.claims : original;
    if (placement.endsWith('prototype')) Object.setPrototypeOf(target, { toJSON: hostile });
    else Object.defineProperty(target, 'toJSON', { value: hostile });
    const safe = validateProbeOIDCEvidence(original);
    assert.deepEqual(safe, expected); assert.equal(calls, 0);
    assert.ok(!JSON.stringify(safe).includes('synthetic-unvalidated-field'));
    assert.deepEqual(validateProbeOIDCEvidence(safe), safe);
  });
}
