import { fixtureHTML } from './probe-fixture-html.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runProtectedProbeQA, requireProtectedProbeHTTP } from '../scripts/probe-gate.mjs';
import { P } from '../scripts/release-core.mjs';
const target = { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40),
  deployment_id: 'dpl_GatedProbeFixture123', origin: 'https://luiguiherrera-gatedfixture-luigui-herrera-s-projects.vercel.app',
  authority_run_id: P.baseline.authority_run_id, sealed_manifest_sha256: P.baseline.sealed_manifest_sha256 };
const app = (path = '/niveles-estadisticos') => new Response(fixtureHTML(path), { status: 200, headers: { 'content-type': 'text/html' } });
const login = () => new Response('', { status: 302, headers: { location: 'https://vercel.com/login' } });
const redir = location => new Response('', { status: 307, headers: { location } });
async function execute(responses, options = {}) {
  const count = { vercel_oidc: 0, anonymous_http: 0, trusted_http: 0, qa: 0, aws_oidc: 0, controller: 0 };
  const order = []; let latest = null, error = null;
  try {
    await runProtectedProbeQA({ target,
      requestOIDCToken: async () => {
        assert.equal(latest.anonymous_protection_baseline, 'PROTECTED'); assert.equal(latest.anonymous_baseline_complete, true);
        count.vercel_oidc++; order.push('VERCEL_OIDC');
        if (options.tokenFailure) throw new Error('synthetic upstream diagnostic must not leak');
        return ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url'), 'unit'].join('.');
      },
      onEvidence: async evidence => {
        latest = evidence;
        if (evidence.anonymous_baseline_complete) order.push('BASELINE_' + evidence.anonymous_protection_baseline);
        if (options.persistFailure && evidence.anonymous_protection_baseline === 'PROTECTED') throw new Error('synthetic persistence failure');
      },
      transport: async (url, init) => {
        assert.equal(new URL(url).origin, target.origin); assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit');
        if (Object.hasOwn(init.headers, 'x-vercel-trusted-oidc-idp-token')) {
          assert.equal(latest.anonymous_protection_baseline, 'PROTECTED'); assert.equal(count.vercel_oidc, 1); count.trusted_http++; order.push('TRUSTED_HTTP');
        } else { assert.deepEqual(init.headers, {}); assert.equal(count.vercel_oidc, 0); count.anonymous_http++; order.push('ANONYMOUS_HTTP'); }
        const response = responses.shift(); if (response instanceof Error) throw response;
        assert.ok(response instanceof Response, 'unexpected additional request'); return response;
      },
      runQA: async ({ tokenSource, protectedGet }) => {
        requireProtectedProbeHTTP(latest, target); count.qa++; order.push('QA');
        assert.ok(await tokenSource.get());
        for (const path of ['/niveles-estadisticos', '/en/statistical-levels']) assert.equal(await (await protectedGet(target.origin + path)).text(), fixtureHTML(path));
        await assert.rejects(protectedGet(target.origin + '/niveles-estadisticos'), { message: 'PROBE_QA_PREFLIGHT_SCOPE' });
        return { local_mock_qa: true };
      }
    });
    // Mirrors the explicit protected-HTTP proof recheck before the CLI AWS branch.
    requireProtectedProbeHTTP(latest, target); count.aws_oidc++; order.push('AWS_OIDC');
  } catch (caught) { error = caught.message; }
  return { count, order, latest, error };
}
for (const [name, responses, classification, code] of [
  ['1 direct anonymous verified200', () => [app()], 'PUBLIC', 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED'],
  ['2 anonymous safe same-origin redirect then verified200', () => [redir('/niveles-estadisticos/'), app()], 'PUBLIC', 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED'],
  ['3 anonymous503', () => [new Response('', { status: 503 })], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['4 anonymous500', () => [new Response('', { status: 500 })], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['5 anonymous unknown redirect', () => [redir('https://unclassified.example/path')], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['anonymous401 is not protection proof by status alone', () => [new Response('', { status: 401 })], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['anonymous403 is not protection proof by status alone', () => [new Response('', { status: 403 })], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['anonymous network anomaly', () => [new Error('local synthetic transport failure')], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'],
  ['anonymous200 unknown body', () => [new Response('unclassified page', { status: 200, headers: { 'content-type': 'text/html' } })], 'AMBIGUOUS', 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS']
]) test(name + ':14/15/16 PUBLIC or AMBIGUOUS cannot request OIDC, trusted HTTP, QA or AWS', async () => {
  const result = await execute(responses()); assert.equal(result.error, code); assert.equal(result.latest.anonymous_protection_baseline, classification);
  for (const key of ['vercel_oidc', 'trusted_http', 'qa', 'aws_oidc', 'controller']) assert.equal(result.count[key], 0, key);
  assert.equal(result.latest.vercel_oidc_token_requested, false); assert.equal(result.latest.trusted_request_attempted, false);
  assert.equal(result.latest.trusted_sources_access, 'NOT_RUN'); assert.equal(result.latest.trusted_sources_live_certified, false);
  assert.throws(() => requireProtectedProbeHTTP(result.latest, target));
});
test('6/7/13 recognized protection creates exactly one token only after persisted baseline and reaches QA/AWS once', async () => {
  const result = await execute([login(), app(), app('/en/statistical-levels')]); assert.equal(result.error, null);
  assert.deepEqual(result.count, { vercel_oidc: 1, anonymous_http: 1, trusted_http: 2, qa: 1, aws_oidc: 1, controller: 0 });
  assert.ok(result.order.indexOf('BASELINE_PROTECTED') < result.order.indexOf('VERCEL_OIDC'));
  assert.ok(result.order.indexOf('VERCEL_OIDC') < result.order.indexOf('TRUSTED_HTTP'));
  assert.ok(result.order.indexOf('TRUSTED_HTTP') < result.order.indexOf('QA'));
  assert.equal(result.latest.trusted_sources_access, 'PASS'); assert.equal(result.latest.trusted_sources_live_certified, true);
});
test('8 protected baseline plus trusted safe same-origin redirect reaches exact content', async () => {
  const result = await execute([login(), redir('/niveles-estadisticos/'), app(), app('/en/statistical-levels')]);
  assert.equal(result.error, null); assert.equal(result.count.vercel_oidc, 1); assert.equal(result.count.trusted_http, 3); assert.equal(result.count.qa, 1);
});
for (const [name, trusted, code] of [
  ['9 equivalent protection denial', login, 'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED'],
  ['10 ambiguous trusted503', () => new Response('', { status: 503 }), 'PROBE_HTTP_STATUS'],
  ['11 cross-origin trusted redirect', () => redir('https://elsewhere.example/product'), 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT'],
  ['12 trusted query redirect', () => redir('/safe?opaque=value'), 'PROBE_HTTP_UNSAFE_REDIRECT'],
  ['12 trusted fragment redirect', () => redir('/safe#opaque'), 'PROBE_HTTP_UNSAFE_REDIRECT']
]) test(name + ' cannot reach browser QA or AWS', async () => {
  const result = await execute([login(), trusted()]); assert.equal(result.error, code); assert.equal(result.count.vercel_oidc, 1);
  assert.equal(result.count.trusted_http, 1); assert.equal(result.count.qa, 0); assert.equal(result.count.aws_oidc, 0);
  assert.equal(result.latest.trusted_sources_access, 'FAIL'); assert.equal(result.latest.trusted_sources_live_certified, false);
});
test('persisting PROTECTED must succeed before any credential factory call', async () => {
  const result = await execute([login()], { persistFailure: true });
  assert.equal(result.count.vercel_oidc, 0); assert.equal(result.count.trusted_http, 0); assert.equal(result.count.qa, 0); assert.equal(result.count.aws_oidc, 0); assert.ok(result.error);
});
test('token factory failure after PROTECTED cannot reach trusted HTTP or QA/AWS', async () => {
  const result = await execute([login()], { tokenFailure: true }); assert.equal(result.count.vercel_oidc, 1);
  assert.equal(result.count.trusted_http, 0); assert.equal(result.count.qa, 0); assert.equal(result.count.aws_oidc, 0);
  assert.ok(!result.error.includes('synthetic upstream')); assert.equal(result.latest.trusted_request_attempted, false);
});
test('CLI creates only a lazy Vercel factory and rechecks protected proof before AWS token/identity branches', async () => {
  const cli = await fs.readFile(new URL('../scripts/probe-cli.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(cli, /oidcLease|await probeOIDC\(P\.vercel_audience\)/);
  assert.match(cli, /requestOIDCToken: \(\) => probeOIDC\(P\.vercel_audience\)/);
  assert.ok(cli.indexOf('requireProtectedProbeHTTP(await readOptional') < cli.indexOf("if (mode === 'aws-preflight')"));
  const workflow = await fs.readFile(new URL('../../../.github/workflows/statistical-levels-release.yml', import.meta.url), 'utf8');
  const probe = workflow.split('  identity-probe:\n')[1]; assert.doesNotMatch(probe, /continue-on-error/);
  assert.ok(probe.indexOf('probe-cli.mjs qa') < probe.indexOf('probe-cli.mjs aws-preflight'));
  assert.match(probe, /"Effect":"Deny","NotAction":"sts:GetCallerIdentity","Resource":"\*"/);
});
