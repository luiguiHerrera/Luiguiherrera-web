import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createProbeQACache, PROBE_QA_HTTP_PATHS } from '../scripts/probe-qa-http.mjs';
import { PROBE_HTTP_PATHS } from '../scripts/probe-http.mjs';
import { runProtectedProbeQA, requireProtectedProbeHTTP } from '../scripts/probe-gate.mjs';
import { createProductQAObservability } from '../scripts/product-qa-observability.mjs';
import { account } from '../scripts/network-accounting.mjs';
import { P } from '../scripts/release-core.mjs';
import { fixtureHTML } from './probe-fixture-html.mjs';

const origin = 'https://luiguiherrera-qacachefixture-luigui-herrera-s-projects.vercel.app';
const target = { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40),
  deployment_id: 'dpl_QACacheFixture123', origin,
  authority_run_id: P.baseline.authority_run_id, sealed_manifest_sha256: P.baseline.sealed_manifest_sha256 };
const token = 'local.synthetic.lease';
const htmlResponse = (html = '<h1>Methodology</h1>', status = 200) => new Response([204, 205].includes(status) ? null : html,
  { status, headers: { 'content-type': 'text/html' } });
const seed = () => new Map(PROBE_HTTP_PATHS.map(route => [origin + route, htmlResponse(fixtureHTML(route))]));
async function cache(options = {}) {
  const calls = [], tokens = []; let certified = options.certified ?? true;
  const protectedGet = await createProbeQACache({ origin: options.origin ?? origin,
    certifiedResponses: options.certifiedResponses ?? seed(),
    tokenSource: { get: async destination => { tokens.push(destination); return token; } },
    assertCertified: () => { assert.equal(certified, true, 'certification required'); },
    transport: async (url, init) => { calls.push({ url, init }); return options.reply ? options.reply(url, init) : htmlResponse(); } });
  return { protectedGet, calls, tokens, close: () => { certified = false; } };
}
const productSource = fs.readFileSync(new URL('../scripts/qa/qa-statistical-levels.mjs', import.meta.url), 'utf8');
const loopStart = productSource.indexOf("  for(const route of ['/niveles-estadisticos','/en/statistical-levels','/metodologia','/en/methodology']){");
const productRouteLoop = productSource.slice(loopStart, productSource.indexOf('  const ledger=', loopStart));
async function productAssertions(protectedGet, observability) {
  assert.ok(loopStart > 0 && productRouteLoop.includes('assert.equal(response.status,200)') && productRouteLoop.includes("assert.ok(html.includes('<h1'))"));
  const report = { routes: [] };
  await vm.runInNewContext('(async () => {\n' + productRouteLoop + '\n})()', {
    globalThis: { __SL_RELEASE_QA__: { protectedGet, observability } }, base: origin, assert, report });
  return report;
}

test('1 explicit frozen QA cache contains all four exact product routes', async () => {
  assert.ok(Object.isFrozen(PROBE_QA_HTTP_PATHS));
  assert.deepEqual(PROBE_QA_HTTP_PATHS, ['/niveles-estadisticos', '/en/statistical-levels', '/metodologia', '/en/methodology']);
  const x = await cache();
  for (const route of PROBE_QA_HTTP_PATHS) assert.equal((await x.protectedGet(origin + route)).status, 200);
  assert.deepEqual(x.calls.map(call => call.url), ['/metodologia', '/en/methodology'].map(route => origin + route));
});
for (const [number, route] of [[2, '/metodologia'], [3, '/en/methodology']]) test(number + ' ' + route + ' returns its exact cached response', async () => {
  const x = await cache({ reply: url => htmlResponse('<h1>' + new URL(url).pathname + '</h1>') });
  assert.equal(await (await x.protectedGet(origin + route)).text(), '<h1>' + route + '</h1>');
});
for (const [number, name, url] of [
  [4, 'fifth arbitrary route', origin + '/other'],
  [5, 'same path at another origin', 'https://unrelated.example/metodologia'],
  [6, 'query-added methodology', origin + '/metodologia?view=qa'],
  [7, 'fragment-added methodology', origin + '/metodologia#intro'],
  [25, 'userinfo', origin.replace('https://', 'https://user@') + '/metodologia'],
  [26, 'explicit port', origin + ':443/metodologia'],
  [27, 'HTTP', origin.replace('https:', 'http:') + '/metodologia'],
  [28, 'dot segment', origin + '/other/../metodologia'],
  [29, 'percent-encoded path', origin + '/%6detodologia'],
  [30, 'trailing slash', origin + '/metodologia/'],
  [31, 'URL object instead of exact string', new URL(origin + '/metodologia')]
]) test(number + ' rejects ' + name + ' without network side effects', async () => {
  const x = await cache(), count = x.calls.length;
  await assert.rejects(x.protectedGet(url), { message: 'PROBE_QA_PREFLIGHT_SCOPE' });
  assert.equal(x.calls.length, count);
});
test('8 exact existing product route loop passes methodology 200 plus H1', async () => {
  const x = await cache(); assert.equal((await productAssertions(x.protectedGet)).routes.length, 4);
});
for (const status of [204, 205, 400, 404, 500, 503]) test('9 methodology HTTP ' + status + ' reaches unchanged product HTTP-200 assertion', async () => {
  const x = await cache({ reply: () => htmlResponse('<h1>Methodology</h1>', status) });
  await assert.rejects(productAssertions(x.protectedGet), error => error.code === 'ERR_ASSERTION' && error.expected === 200 && error.actual === status);
});
test('10 methodology without H1 reaches unchanged product H1 assertion', async () => {
  const x = await cache({ reply: () => htmlResponse('<main>Methodology</main>') });
  await assert.rejects(productAssertions(x.protectedGet), error => error.code === 'ERR_ASSERTION' && error.actual === false && error.expected === true);
});
test('11 QA cache does not expand the frozen Trusted Sources certification routes', async () => {
  await cache(); assert.ok(Object.isFrozen(PROBE_HTTP_PATHS));
  assert.deepEqual(PROBE_HTTP_PATHS, ['/niveles-estadisticos', '/en/statistical-levels']);
});

async function gate(options = {}) {
  let now = 1800000000000, requests = 0, latest, budget, receipt, failure, qaCount = 0;
  const realNow = Date.now; Date.now = () => now;
  const calls = [], tokens = [], order = [];
  try {
    await runProtectedProbeQA({ target,
      requestOIDCToken: async () => {
        assert.equal(latest.anonymous_protection_baseline, 'PROTECTED'); assert.equal(latest.anonymous_baseline_complete, true);
        order.push('TOKEN'); requests++;
        return ['unit', Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + 600 })).toString('base64url'), 'unit'].join('.');
      },
      onEvidence: value => { latest = value; }, onTokenEvidence: value => { budget = value; },
      onCertificationEvidence: value => { receipt = value; order.push('CERTIFICATION'); },
      transport: async (url, init) => {
        calls.push(url); const route = new URL(url).pathname;
        if (calls.length === 1) return options.anonymous ?? new Response('', { status: 302, headers: { location: 'https://vercel.com/login' } });
        tokens.push(init.headers['x-vercel-trusted-oidc-idp-token']);
        if (PROBE_HTTP_PATHS.includes(route)) return htmlResponse(fixtureHTML(route));
        assert.ok(receipt); assert.equal(budget.certification_recorded, true); assert.equal(budget.phase, 'POST_CERTIFICATION_QA');
        order.push('QA_PREFETCH');
        if (options.expireAfterMethodology) now += 575000;
        return htmlResponse();
      },
      runQA: async ({ protectedGet, tokenSource }) => {
        qaCount++; requireProtectedProbeHTTP(latest, target);
        await productAssertions(protectedGet);
        await options.qa?.({ tokenSource, advance: seconds => { now += seconds * 1000; } });
      } });
  } catch (error) { failure = error.message; } finally { Date.now = realNow; }
  return { requests, latest, budget, receipt, calls, tokens, order, failure, qaCount };
}
test('12 Trusted Sources evidence remains exactly two routes and excludes methodology traffic', async () => {
  const x = await gate(); assert.equal(x.failure, undefined); assert.equal(x.qaCount, 1);
  assert.deepEqual(x.latest.routes.map(route => route.path), PROBE_HTTP_PATHS);
  assert.equal(x.latest.trusted_http_request_count, 2); assert.equal(x.calls.length, 5);
  assert.equal(x.receipt.routes.length, 1); assert.equal(x.latest.trusted_sources_live_certified, true);
});
test('13 anonymous gate rejects public content without token or methodology HTTP', async () => {
  const x = await gate({ anonymous: htmlResponse(fixtureHTML('/niveles-estadisticos')) });
  assert.equal(x.requests, 0); assert.equal(x.calls.length, 1); assert.equal(x.qaCount, 0);
  assert.equal(x.failure, 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED');
});
test('14 methodology prefetch uses only existing single QA renewal and never exceeds total two tokens', async () => {
  const x = await gate({ expireAfterMethodology: true, qa: ({ tokenSource }) => tokenSource.get() });
  assert.equal(x.failure, 'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED'); assert.equal(x.requests, 2);
  assert.equal(x.budget.vercel_certification_oidc_token_request_count, 1);
  assert.equal(x.budget.vercel_certification_oidc_refresh_count, 0);
  assert.equal(x.budget.vercel_post_certification_qa_refresh_count, 1);
  assert.equal(x.budget.vercel_total_oidc_token_request_count, 2);
});
test('15 same valid qualified token is reused across both methodology prefetches', async () => {
  const x = await gate(); assert.equal(x.failure, undefined); assert.equal(x.requests, 1);
  assert.equal(new Set(x.tokens).size, 1); assert.equal(x.tokens.length, 4);
  assert.equal(x.budget.vercel_post_certification_qa_refresh_count, 0);
  assert.ok(x.order.indexOf('CERTIFICATION') < x.order.indexOf('QA_PREFETCH'));
});
for (const destination of ['https://unrelated.example/methodology', origin + '/other', '/en/methodology', '/metodologia?secret=value', '/metodologia#fragment']) {
  test('16 methodology redirect is never followed or forwarded: ' + destination.replace(/\?.*$/, '?[omitted]'), async () => {
    let calls = 0;
    await assert.rejects(cache({ reply: (_url, init) => {
      calls++; assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit');
      assert.deepEqual(Object.keys(init.headers), ['x-vercel-trusted-oidc-idp-token']);
      return new Response('', { status: 307, headers: { location: destination } });
    } }), { message: 'PROBE_QA_HTTP_REDIRECT' });
    assert.equal(calls, 1);
  });
}
test('17 protectedGet consumes cache only and performs zero network or token requests', async () => {
  const x = await cache(), calls = x.calls.length, tokens = x.tokens.length;
  for (const route of PROBE_QA_HTTP_PATHS) await x.protectedGet(origin + route);
  assert.equal(x.calls.length, calls); assert.equal(x.tokens.length, tokens);
});
test('18 consumed response is uncached and cannot trigger a refetch', async () => {
  const x = await cache(); await x.protectedGet(origin + '/metodologia');
  await assert.rejects(x.protectedGet(origin + '/metodologia'), { message: 'PROBE_QA_PREFLIGHT_SCOPE' });
  assert.equal(x.calls.length, 2); assert.equal(x.tokens.length, 2);
});
test('19 next real product assertion retains exact first-failure identity and immutable expected/actual evidence', async t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-qa-cache-observation-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const observability = createProductQAObservability({ out, origin, codeRoot: out, clock: () => 100 });
  const x = await cache({ reply: () => htmlResponse('<h1>Methodology</h1>', 404) });
  let captured;
  try { await productAssertions(x.protectedGet, observability); } catch (error) { captured = error; observability.captureFailure(error); }
  assert.equal(captured?.code, 'ERR_ASSERTION');
  const first = observability.evidence().firstFailure;
  assert.equal(first.failure.test_id, 'sl-main:L150'); assert.equal(first.failure.assertion_id, 'sl-main:L150:C107');
  assert.deepEqual(first.failure.route, { origin_class: 'EXACT_PREVIEW', path: '/metodologia', query_key_names: [] }); assert.equal(first.failure.expected, 200); assert.equal(first.failure.actual, 404);
  observability.captureFailure(new Error('PRODUCT_SUITE_FAILED'));
  assert.deepEqual(observability.evidence().firstFailure, first);
});
test('20 identical synthetic event classifier output is unchanged by cache population', async () => {
  const events = [
    { kind: 'request_failure', url: origin + '/niveles-estadisticos', type: 'Fetch', canceled: true, rsc: true, prefetch: true, error_code: 'net::ERR_ABORTED' },
    { kind: 'request_failure', url: 'https://vercel.live/_next-live/feedback/feedback.js', type: 'Script' },
    { kind: 'console_error', url: origin + '/niveles-estadisticos', source: 'Log.entryAdded' }
  ];
  const before = account(events, false, origin); await cache(); assert.deepEqual(account(events, false, origin), before);
});
const frozen = {
  '21 metadata resolver and diagnostics unchanged': { 'probe-runtime.mjs': '4ae5cc4bbdb34b20366bcdace9043f4bcc2f0029bf9cc4385d6d7ab7e4cb899e' },
  '22 PROBE cannot invoke controller; authorization source unchanged': { 'probe-core.mjs': '1f9febf65554472832d4858af453662d87f27925e5b282cfe2b04a6b66ebba41' },
  '23 ADOPT transport and runner unchanged': { 'release-core.mjs': 'c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70', 'qa-runner.mjs': '4584b988912f702a3b79f8de19640dd8eb0c0ebf61e45d0330af6ae975c03262' },
  '24 PROMOTE transport and browser harness unchanged': { 'release-core.mjs': 'c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70', 'browser-harness-base.mjs': '3d3a5f048d1e75f56f88ccb728e09aa7e892cc8f6b627dff81e05664145c18b9' }
};
for (const [name, files] of Object.entries(frozen)) test(name, () => {
  for (const [file, expected] of Object.entries(files)) assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../scripts/' + file, import.meta.url))).digest('hex'), expected, file);
});
test('transport reporting redirect-followed or different response URL fails closed', async () => {
  for (const fields of [{ redirected: true }, { url: 'https://unrelated.example/metodologia' }]) {
    await assert.rejects(cache({ reply: () => Object.assign({ status: 200, text: async () => '<h1>Methodology</h1>' }, fields) }),
      { message: 'PROBE_QA_HTTP_TRANSPORT_REDIRECT' });
  }
});
test('uncertified phase cannot acquire token or prefetch methodology', async () => {
  await assert.rejects(cache({ certified: false }), /certification required/);
});
test('closed certification cannot consume previously prefetched cache', async () => {
  const x = await cache(); x.close(); await assert.rejects(x.protectedGet(origin + '/metodologia'), /certification required/);
  assert.equal(x.calls.length, 2);
});
test('extra or missing seed entries cannot create a broader cache', async () => {
  const extra = seed(); extra.set(origin + '/other', htmlResponse());
  const wrong = seed(); wrong.delete(origin + PROBE_HTTP_PATHS[1]); wrong.set(origin + '/other', htmlResponse());
  for (const certifiedResponses of [extra, wrong, new Map()]) await assert.rejects(cache({ certifiedResponses }), { message: 'PROBE_QA_HTTP_OPTIONS' });
});
test('QA body reflecting the in-memory token fails without exposing the body', async () => {
  await assert.rejects(cache({ reply: () => htmlResponse('<h1>' + token + '</h1>') }), { message: 'PROBE_QA_HTTP_SECRET_IN_CONTENT' });
});
test('QA response body size is bounded before runQA', async () => {
  await assert.rejects(cache({ reply: () => htmlResponse('x'.repeat(8 * 1024 * 1024 + 1)) }), { message: 'PROBE_QA_HTTP_BODY_SIZE' });
});
test('transport errors are reduced to a fixed non-secret code and never retried', async () => {
  let calls = 0;
  await assert.rejects(cache({ reply: () => { calls++; throw new Error(token); } }), { message: 'PROBE_QA_HTTP_TRANSPORT_FAILURE' });
  assert.equal(calls, 1);
});
