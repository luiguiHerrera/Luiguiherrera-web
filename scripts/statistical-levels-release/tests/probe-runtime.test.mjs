import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { readProbeRoleIdentity, probeGithub, probeOIDC } from '../scripts/probe-runtime.mjs';
import { P, selectTarget, ADOPT, PROMOTE } from '../scripts/release-core.mjs';
import { normalizeReleaseInputs } from '../scripts/runtime-io.mjs';

const run = { id: '500', attempt: '1', execution_sha: 'b'.repeat(40) };
const session = { PATH: '/synthetic', AWS_REGION: 'eu-south-2', AWS_ACCESS_KEY_ID: 'synthetic-key',
  AWS_SECRET_ACCESS_KEY: 'synthetic-secret', AWS_SESSION_TOKEN: 'synthetic-session',
  AWS_PROFILE: 'must-not-be-used', AWS_ENDPOINT_URL: 'https://must-not-be-used.invalid' };
const identity = { Account: P.account_id,
  Arn: `arn:aws:sts::${P.account_id}:assumed-role/LuiguiHerreraStatisticalLevelsReleaseInvoker/sl-probe-500`,
  UserId: 'AROA' + 'A'.repeat(17) + ':sl-probe-500' };

test('identity subprocess is exactly STS with no profile, endpoint override, retry, or raw output', t => {
  let calls = 0;
  t.mock.method(childProcess, 'execFileSync', (program, args, options) => {
    calls++;
    assert.equal(program, 'aws');
    assert.deepEqual(args, ['sts', 'get-caller-identity', '--region', 'eu-south-2', '--output', 'json',
      '--no-cli-pager', '--cli-connect-timeout', '10', '--cli-read-timeout', '30']);
    assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
    assert.equal(options.env.AWS_MAX_ATTEMPTS, '1');
    assert.equal(options.env.AWS_CONFIG_FILE, '/dev/null');
    assert.equal(options.env.AWS_SHARED_CREDENTIALS_FILE, '/dev/null');
    assert.equal(options.env.AWS_PROFILE, undefined);
    assert.equal(options.env.AWS_ENDPOINT_URL, undefined);
    return JSON.stringify(identity);
  });
  syncBuiltinESMExports();
  try {
    const proof = readProbeRoleIdentity(run, session);
    assert.equal(proof.result, 'PASS');
    assert.equal(calls, 1);
    for (const raw of [identity.Account, identity.Arn, identity.UserId, session.AWS_SESSION_TOKEN])
      assert.ok(!JSON.stringify(proof).includes(raw));
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('wrong role fails after exactly one read-only identity call', t => {
  let calls = 0;
  t.mock.method(childProcess, 'execFileSync', () => { calls++; return JSON.stringify({ ...identity, Arn: identity.Arn.replace('ReleaseInvoker', 'OtherRole') }); });
  syncBuiltinESMExports();
  try { assert.throws(() => readProbeRoleIdentity(run, session), /PROBE_AWS_ROLE_MISMATCH/); assert.equal(calls, 1); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('missing hosted session prevents any AWS process', t => {
  t.mock.method(childProcess, 'execFileSync', () => assert.fail('AWS subprocess reached'));
  syncBuiltinESMExports();
  try {
    for (const key of ['AWS_SESSION_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'])
      assert.throws(() => readProbeRoleIdentity(run, { ...session, [key]: undefined }), /AWS_SESSION_REQUIRED/);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('probe metadata refuses arbitrary endpoints and write routes before transport', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('transport reached'));
  for (const route of ['https://api.vercel.com/v13/deployments', '/actions/workflows/x/dispatches', '/git/refs', '/secrets'])
    await assert.rejects(probeGithub(route), /PROBE_GITHUB_PATH/);
});

test('probe OIDC refuses unapproved audience before requesting a token', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('transport reached'));
  await assert.rejects(probeOIDC('https://other.invalid', {}), /PROBE_OIDC_AUDIENCE/);
});

test('release input normalization preserves every legacy output and rejection', () => {
  const capture = input => { try { return { value: selectTarget(input) }; } catch (error) { return { error: error.message }; } };
  const future = { operation: PROMOTE, candidate_git_sha: 'd'.repeat(40), candidate_deployment_id: 'dpl_SyntheticFuture123',
    expected_previous_production_sha: P.baseline.production_git_sha,
    expected_previous_production_deployment: P.baseline.production_deployment_id, previous_publication_date: P.baseline.publication_date_utc };
  for (const value of [undefined, null, false, true, 0, 1, '', 'x', [], ['x'], {}, { operation: ADOPT }, future,
    { operation: 'UNKNOWN' }, { operation: ADOPT, extra: '' }, { operation: PROMOTE }, { operation: ADOPT, candidate_git_sha: 'invalid' }])
    assert.deepEqual(capture(normalizeReleaseInputs(value)), capture(value));
  for (const original of [{ operation: ADOPT }, future]) {
    assert.deepEqual(capture(normalizeReleaseInputs({ ...original, probe_git_sha: '', probe_deployment_id: '' })), capture(original));
    for (const key of ['probe_git_sha', 'probe_deployment_id'])
      for (const value of ['nonempty', null, false, 0])
        assert.throws(() => normalizeReleaseInputs({ ...original, [key]: value }), /RELEASE_PROBE_INPUT_FORBIDDEN/);
  }
});
