import { generateKeyPairSync, sign } from 'node:crypto';
import { P } from '../scripts/release-core.mjs';
import { evaluateProbeOIDC } from '../scripts/probe-oidc.mjs';

// Synthetic test-only material is generated in memory and is never serialized to disk.
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const key = { ...publicKey.export({ format: 'jwk' }), kid: 'probe-integration-test', alg: 'RS256', use: 'sig' };
export const jwks = { keys: [key] };
export const env = { GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '2' };
export function signedFixture(audience = P.vercel_audience, extra = {}, now = Math.floor(Date.now() / 1000)) {
  const claims = { iss: P.issuer, aud: audience, sub: P.aws_subject, repository: P.repository,
    repository_id: P.repository_id, repository_owner_id: P.repository_owner_id, ref: 'refs/heads/' + P.branch,
    workflow_ref: P.workflow_ref, workflow_sha: env.GITHUB_SHA, workflow: P.workflow_name, sha: env.GITHUB_SHA,
    event_name: 'workflow_dispatch', run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT,
    iat: now, nbf: now, exp: now + 300, ...extra };
  const body = [ { alg: 'RS256', kid: key.kid }, claims ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  const token = body + '.' + sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url');
  return { token, evidence: evaluateProbeOIDC(token, jwks, audience, env, now) };
}
