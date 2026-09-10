import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbeHttpSession, runProbePreflight, sanitizeProbeLocation, sanitizeProbeHttpResponse, validateProbeHttpEvidence, PROBE_HTTP_SCHEMA } from '../scripts/probe-http.mjs';
const origin = 'https://luiguiherrera-probefixture-luigui-herrera-s-projects.vercel.app';
const path = '/niveles-estadisticos', en = '/en/statistical-levels';
const target = { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40), deployment_id: 'dpl_SyntheticProbeFixture123', origin,
  authority_run_id: '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d', sealed_manifest_sha256: 'b'.repeat(64) };
const token = 'synthetic-oidc-value-only';
const html = '<html><div id="sl-controls"></div><div id="sl-authority">' + target.authority_run_id + '</div></html>';
const app = (body = html, headers = {}) => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } });
const redirect = (status, location, headers = {}) => new Response('', { status, headers: { ...(location === null ? {} : { location }), ...headers } });
const login = 'https://vercel.com/login?next=sensitive-query-value';
function harness(responses, options = {}) {
  const calls = [], journal = [], events = []; let n = 0;
  const session = createProbeHttpSession({ target: options.target ?? target, tokenSource: { get: async () => { events.push('validated-token-lease'); return options.token ?? token; } },
    transport: async (url, init) => { calls.push({ url, init }); events.push('http-' + calls.length); const result = responses[n++]; if (result instanceof Error) throw result; return typeof result === 'function' ? result(url, init) : result; },
    onEvidence: async evidence => { journal.push(evidence); events.push('persist-' + evidence.result); if (options.callbackError) throw options.callbackError; } });
  return { session, calls, journal, events };
}
async function run(responses, options) { const h = harness(responses, options); const response = await h.session.get(origin + path); return { ...h, response, evidence: h.session.evidence() }; }
async function rejected(responses, code, options) {
  const h = harness(responses, options); await assert.rejects(h.session.get(origin + path), { message: code });
  assert.equal(h.journal.at(-1).result, 'FAIL'); assert.equal(h.journal.at(-1).error_code, code);
  assert.deepEqual(validateProbeHttpEvidence(h.session.evidence(), target), h.journal.at(-1)); return h;
}
test('1 direct authenticated200 requires exact fixture application HTML and persists PASS', async () => {
  const h = await run([new Response('', { status: 401 }), app()]);
  assert.equal(h.evidence.result, 'PASS'); assert.equal(h.evidence.schema_version, PROBE_HTTP_SCHEMA);
  assert.equal(h.evidence.routes[0].authority_match, true); assert.equal(await h.response.text(), html);
  assert.deepEqual(h.calls[0].init.headers, {}); assert.equal(h.calls[1].init.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.ok(h.calls.every(x => x.init.redirect === 'manual' && x.init.method === 'GET' && x.init.credentials === 'omit'));
  assert.equal(h.events[0], 'validated-token-lease');
});
test('2 anonymous login redirect and authenticated200 proves access without following anonymous', async () => {
  const h = await run([redirect(302, login), app()]); assert.equal(h.calls.length, 2); assert.equal(h.evidence.access, 'PASS');
  assert.equal(h.evidence.anonymous.classification, 'PROTECTION_AUTH_REDIRECT'); assert.equal(h.evidence.anonymous.http_status_exact, 302);
});
test('3 both controls at same login endpoint preserve precise differential rejection', async () => {
  const h = await rejected([redirect(302, login), redirect(307, login.replace('sensitive-query-value', 'different-nonce'))], 'TRUSTED_SOURCE_NOT_ACCEPTED_BY_PROTECTION_LAYER');
  assert.equal(h.calls.length, 2); assert.equal(h.journal.at(-1).routes[0].hops[0].http_status_exact, 307);
});
for (const status of [301, 302, 303, 307, 308]) test('4/5 safe same-origin ' + status + ' followed manually with explicit header', async () => {
  const h = await run([redirect(302, login), redirect(status, path + '/'), app()]); assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].url, origin + path + '/'); assert.equal(h.calls[2].init.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.equal(h.evidence.routes[0].hops[0].classification, 'SAME_ORIGIN_CANONICAL_PATH_REDIRECT'); assert.equal(h.evidence.routes[0].final_path, path + '/');
  assert.equal(h.journal.find(x => x.routes[0].hops.length === 1).result, 'NOT_CERTIFIED');
});
test('6 cross-origin custom domain never receives OIDC or any follow request', async () => {
  const h = await rejected([redirect(302, login), redirect(308, 'https://www.luiguiherrera.com/niveles-estadisticos')], 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT');
  assert.equal(h.calls.length, 2); assert.equal(h.journal.at(-1).cross_origin_oidc_forward, false);
  assert.equal(h.journal.at(-1).routes[0].hops[0].classification, 'CROSS_ORIGIN_APPLICATION_OR_CANONICAL_REDIRECT');
});
test('7 cross-origin Vercel auth endpoint gets protection classification without a follow', async () => {
  const h = await rejected([new Response('', { status: 401 }), redirect(302, login)], 'PROBE_HTTP_PROTECTION_AUTH_REDIRECT'); assert.equal(h.calls.length, 2);
});
test('8 exact303 plus Vercel readiness code fails readiness consistency separately', async () => {
  const h = await rejected([redirect(302, login), redirect(303, 'https://vercel.com/project/status', { 'x-vercel-error': 'DEPLOYMENT_NOT_READY_REDIRECTING' })], 'BLOCKED_PREVIEW_READINESS_INCONSISTENCY');
  assert.equal(h.calls.length, 2); assert.equal(h.journal.at(-1).routes[0].hops[0].classification, 'DEPLOYMENT_NOT_READY');
});
test('303 alone is not classified as deployment readiness', async () => {
  const h = await rejected([redirect(302, login), redirect(303, 'https://vercel.com/project/status')], 'PROBE_HTTP_PLATFORM_REDIRECT');
  assert.equal(h.journal.at(-1).routes[0].hops[0].classification, 'OTHER_VERCEL_PLATFORM_REDIRECT');
});
test('9 redirect loop fails before another request and journals the loop response', async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/app'), redirect(308, path)], 'PROBE_HTTP_REDIRECT_LOOP'); assert.equal(h.calls.length, 3);
});
test('10 more than two same-origin redirects fails at the third redirect', async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/one'), redirect(307, '/two'), redirect(307, '/three')], 'PROBE_HTTP_REDIRECT_LIMIT');
  assert.equal(h.calls.length, 4); assert.equal(h.journal.at(-1).routes[0].hops.length, 3);
});
test('exactly two safe redirects can reach authenticated fixture content', async () => {
  const h = await run([redirect(302, login), redirect(307, '/one'), redirect(308, '/two'), app()]); assert.equal(h.evidence.result, 'PASS'); assert.equal(h.calls.length, 4);
});
for (const suffix of ['?token=sensitive-query-value', '?ordinary=value', '?', '#sensitive-fragment', '#']) test('11 any query or fragment redirect is conservatively refused: ' + suffix[0], async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/safe' + suffix)], 'PROBE_HTTP_UNSAFE_REDIRECT'); assert.equal(h.calls.length, 2);
  assert.ok(!JSON.stringify(h.journal).includes('sensitive-query-value') && !JSON.stringify(h.journal).includes('sensitive-fragment'));
});
test('12 Location sanitizer retains structural origin data, never query or fragment values', () => {
  const value = sanitizeProbeLocation('/normal?token=sensitive-query-value#sensitive-fragment', origin + path, origin);
  assert.equal(value.path, '/normal'); assert.equal(value.host, new URL(origin).hostname); assert.equal(value.scheme, 'https');
  assert.equal(value.origin_classification, 'RELATIVE'); assert.equal(value.query_present, true); assert.equal(value.fragment_present, true);
  assert.doesNotMatch(JSON.stringify(value), /sensitive-query-value|sensitive-fragment|token=/);
  assert.equal(sanitizeProbeLocation('/normal#fragment?embedded-query', origin + path, origin).query_present, false);
});
test('13 response header allowlist never reads or serializes Set-Cookie', async () => {
  const h = await run([redirect(302, login, { 'set-cookie': 'private-cookie=value' }), app(html, { 'set-cookie': 'private-cookie=another', authorization: token,
    server: 'Vercel', 'x-vercel-id': 'iad1::abcde-123', 'x-vercel-cache': 'MISS' })]);
  const serialized = JSON.stringify(h.evidence); assert.doesNotMatch(serialized, /private-cookie|set-cookie|authorization|another/);
  assert.equal(h.evidence.routes[0].hops[0].headers.server.value, 'Vercel'); assert.equal(h.evidence.routes[0].hops[0].headers['x-vercel-id'].value, 'iad1::abcde-123');
});
test('14 token reflected into response safe headers/path is redacted and never journaled', async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/' + token, { server: token, 'x-vercel-id': token, 'x-vercel-error': token })], 'PROBE_HTTP_PLATFORM_ERROR');
  assert.ok(!JSON.stringify(h.journal).includes(token)); const loc = h.journal.at(-1).routes[0].hops[0].location;
  assert.equal(loc.path, null); assert.equal(loc.path_redacted, true); assert.match(loc.path_sha256, /^[a-f0-9]{64}$/);
});
test('body reflection of the token is rejected before any application Response is returned', async () => {
  const h = await rejected([redirect(302, login), app(html + token)], 'PROBE_HTTP_SECRET_IN_CONTENT'); assert.ok(!JSON.stringify(h.journal).includes(token));
});
for (const bad of ['https://other.example/niveles-estadisticos', origin + '/', origin + path + '?x=1', origin + '/en/statistical-levels', origin.replace('https:', 'http:') + path]) test('15 initial URL scope rejects ' + (bad === origin + '/' ? 'root' : 'noncanonical request'), async () => {
  const h = harness([]); await assert.rejects(h.session.get(bad), { message: 'PROBE_HTTP_REQUEST_SCOPE' }); assert.equal(h.calls.length, 0);
  assert.equal(h.journal.at(-1).access, 'NOT_ATTEMPTED'); assert.ok(!JSON.stringify(h.journal).includes('other.example'));
});
test('15 correct path with another authority marker is not accepted as the exact fixture', async () => {
  await rejected([redirect(302, login), app(html.replace(target.authority_run_id, 'another-authority'))], 'PROBE_HTTP_FIXTURE_CONTENT_MISMATCH');
});
test('authority text alone without actual Statistical Levels structures cannot certify an auth page', async () => {
  await rejected([redirect(302, login), app(target.authority_run_id)], 'PROBE_HTTP_FIXTURE_CONTENT_MISMATCH');
});
test('HTML content-type is mandatory even when authority and component markers occur in text', async () => {
  await rejected([redirect(302, login), new Response(html, { status: 200, headers: { 'content-type': 'text/plain' } })], 'PROBE_HTTP_CONTENT_TYPE');
});
test('EN route uses the same fixture and no second anonymous control', async () => {
  const h = await run([redirect(302, login), app(), app()]); const response = await h.session.get(origin + en);
  assert.equal(await response.text(), html); assert.equal(h.calls.length, 3); assert.equal(h.calls[2].init.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.deepEqual(h.session.evidence().routes.map(x => [x.path, x.result]), [[path, 'PASS'], [en, 'PASS']]);
});
test('canonical success cannot hide a later EN failure', async () => {
  const h = await run([redirect(302, login), app(), new Response('', { status: 503 })]);
  await assert.rejects(h.session.get(origin + en), { message: 'PROBE_HTTP_STATUS' }); assert.equal(h.session.evidence().result, 'FAIL');
  assert.equal(h.session.evidence().routes[0].result, 'PASS'); assert.equal(h.session.evidence().routes[1].result, 'FAIL');
});
for (const location of ['http://' + new URL(origin).hostname + '/safe', origin + ':444/safe', origin + ':443/safe', 'https://user:private-password@' + new URL(origin).hostname + '/safe', '/api/private', '/_next/data', '/auth/login', '/safe/../normal', '/safe/%2e%2e/normal', '/%2ftoken', 'javascript:private-secret', '//other.example/path']) test('unsafe scheme/port/userinfo/path is not followed: ' + location.split(':')[0], async () => {
  const h = harness([redirect(302, login), redirect(307, location)]); await assert.rejects(h.session.get(origin + path)); assert.equal(h.calls.length, 2); assert.equal(h.session.evidence().result, 'FAIL');
  assert.doesNotMatch(JSON.stringify(h.journal), /private-password|private-secret/);
});
test('malformed locations and missing Location are recorded without raw values', async () => {
  await rejected([redirect(302, login), redirect(307, null)], 'PROBE_HTTP_REDIRECT_LOCATION');
  const value = sanitizeProbeLocation('https://[invalid-host?private=value', origin + path, origin); assert.equal(value.present, true); assert.equal(value.valid, false); assert.equal(value.host, null);
});
test('credential-shaped arbitrary host/path segments are redacted', () => {
  const raw = 'https://' + ['ghp_', 'a'.repeat(40)].join('') + '.example/' + 'b'.repeat(80);
  const value = sanitizeProbeLocation(raw, origin + path, origin); assert.equal(value.host, null); assert.equal(value.path, null); assert.equal(value.valid, false);
});
test('unknown diagnostic header values are redacted', () => {
  const value = sanitizeProbeHttpResponse(app(html, { server: 'unreviewed-value', 'x-vercel-id': 'opaque-value', 'x-vercel-cache': 'opaque-value', 'x-vercel-error': 'opaque-value' }), origin + path, origin);
  for (const field of Object.values(value.headers)) { assert.equal(field.value, null); assert.equal(field.redacted, true); }
});
test('transport exceptions never reflect token, request URL, headers or provider text', async () => {
  const h = await rejected([new Error('request headers ' + token + ' sensitive-query-value')], 'PROBE_HTTP_TRANSPORT_FAILURE'); assert.equal(h.calls.length, 1);
  assert.ok(!JSON.stringify(h.journal).includes(token)); assert.doesNotMatch(JSON.stringify(h.journal), /sensitive-query-value|request headers/);
});
test('failed OIDC lease creates no HTTP and records only safe failure code', async () => {
  const journal = []; const session = createProbeHttpSession({ target, tokenSource: { get() { throw new Error(token); } }, transport() { assert.fail('HTTP before OIDC'); }, onEvidence: async value => journal.push(value) });
  await assert.rejects(session.get(origin + path), { message: 'PROBE_HTTP_TOKEN_UNAVAILABLE' }); assert.equal(journal[0].anonymous, null); assert.ok(!JSON.stringify(journal).includes(token));
});
test('evidence persistence failure stops before trusted request and hides exception text', async () => {
  const h = harness([redirect(302, login), app()], { callbackError: new Error(token) });
  await assert.rejects(h.session.get(origin + path), { message: 'PROBE_HTTP_EVIDENCE_WRITE_FAILED' }); assert.equal(h.calls.length, 1);
});
test('transport cannot silently follow redirects even if its final body is valid fixture HTML', async () => {
  const response = app(); Object.defineProperty(response, 'redirected', { value: true });
  await rejected([redirect(302, login), response], 'PROBE_HTTP_TRANSPORT_REDIRECT');
});
test('strict evidence rejects unknown fields, inconsistent PASS, unbound fixture and secret header fields', async () => {
  const { evidence } = await run([redirect(302, login), app()]);
  const mutations = [x => { x.token = token; }, x => { x.fixture.candidate_git_sha = 'c'.repeat(40); }, x => { x.routes[0].authority_match = false; },
    x => { x.routes[0].hops[0].http_status_exact = 307; }, x => { x.routes[0].hops[0].headers['set-cookie'] = 'private'; },
    x => { x.routes[0].hops[0].location.query_values = 'private'; }, x => { x.cross_origin_oidc_forward = true; }, x => { x.max_redirects = 3; },
    x => { x.routes[0].hops[0].classification = 'PROTECTION_AUTH_REDIRECT'; }, x => { x.routes[0].final_path = '/different'; }];
  for (const mutate of mutations) { const value = structuredClone(evidence); mutate(value); assert.throws(() => validateProbeHttpEvidence(value, target)); }
});
test('session rejects another Preview and production targets before any transport', () => {
  for (const delta of [{ operation: 'ADOPT_EXISTING_PRODUCTION_BASELINE' }, { phase: 'production' }, { origin: 'https://other.vercel.app' }, { origin: 'https://www.luiguiherrera.com' }]) assert.throws(() => harness([], { target: { ...target, ...delta } }));
});
test('convenience preflight returns sanitized evidence only', async () => {
  let n = 0; const value = await runProbePreflight({ target, tokenSource: { get: async () => token }, transport: async () => n++ ? app() : redirect(302, login), onEvidence: async () => {} });
  assert.equal(value.result, 'PASS'); assert.equal(value.routes.length, 1); assert.ok(!JSON.stringify(value).includes(token)); assert.equal(Object.hasOwn(value, 'body'), false);
});
test('canonical JSON sorted-key persistence roundtrip validates semantically', async () => {
  const { evidence } = await run([redirect(302, login), app(html, { server: 'Vercel' })]);
  const sort = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(sort) : Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  assert.equal(validateProbeHttpEvidence(JSON.parse(JSON.stringify(sort(evidence))), target).result, 'PASS');
});
test('validator rejects nonenumerable toJSON without invoking it', async () => {
  const { evidence } = await run([redirect(302, login), app()]); let invoked = false;
  Object.defineProperty(evidence, 'toJSON', { value() { invoked = true; return { token }; } });
  assert.throws(() => validateProbeHttpEvidence(evidence, target)); assert.equal(invoked, false);
});
test('validator rejects inherited toJSON and nested getters without evaluating them', async () => {
  const { evidence } = await run([redirect(302, login), app()]); let invoked = false;
  const inherited = Object.create({ toJSON() { invoked = true; return token; } }); Object.assign(inherited, evidence);
  assert.throws(() => validateProbeHttpEvidence(inherited, target)); assert.equal(invoked, false);
  const nested = structuredClone(evidence); Object.defineProperty(nested.routes[0], 'authority_match', { enumerable: true, get() { invoked = true; return true; } });
  assert.throws(() => validateProbeHttpEvidence(nested, target)); assert.equal(invoked, false);
});
for (const part of ['z'.repeat(20), 'y'.repeat(32), 'w'.repeat(40), ['vcp_', 'synthetic'].join('')]) test('opaque20–40 and Vercel credential path segments are redacted', async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/share/' + part)], 'PROBE_HTTP_UNSAFE_REDIRECT');
  assert.equal(h.journal.at(-1).routes[0].hops[0].location.path, null); assert.ok(!JSON.stringify(h.journal).includes(part));
});
test('anonymous readiness inconsistency stops before any OIDC-authenticated GET', async () => {
  const h = await rejected([redirect(303, 'https://vercel.com/project/status', { 'x-vercel-error': 'DEPLOYMENT_NOT_READY_REDIRECTING' }), app()], 'BLOCKED_PREVIEW_READINESS_INCONSISTENCY');
  assert.equal(h.calls.length, 1); assert.deepEqual(h.calls[0].init.headers, {}); assert.equal(h.session.evidence().access, 'NOT_ATTEMPTED'); assert.equal(h.session.evidence().routes[0].hops.length, 0);
});
for (const value of ['FUNCTION_INVOCATION_FAILED', 'unclassified-lowercase-value']) test('200 platform-error headers block otherwise valid application content: ' + value, async () => {
  const h = await rejected([redirect(302, login), app(html, { 'x-vercel-error': value })], 'PROBE_HTTP_PLATFORM_ERROR');
  assert.equal(h.session.evidence().routes[0].hops[0].classification, 'VERCEL_PLATFORM_ERROR');
});
test('oversized streamed body fails promptly without waiting on an unconsumed clone branch', { timeout: 3000 }, async () => {
  const h = await rejected([redirect(302, login), app(html + 'x'.repeat(8 * 1024 * 1024))], 'PROBE_HTTP_BODY_SIZE'); assert.equal(h.calls.length, 2);
});
test('canonical forged PASS cannot certify 200 with a correctly classified platform-error header', async () => {
  const { evidence } = await run([redirect(302, login), app()]);
  evidence.routes[0].hops[0] = sanitizeProbeHttpResponse(app(html, { 'x-vercel-error': 'FUNCTION_INVOCATION_FAILED' }), origin + path, origin);
  assert.equal(evidence.routes[0].hops[0].classification, 'VERCEL_PLATFORM_ERROR');
  const sort = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(sort) : Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  assert.throws(() => validateProbeHttpEvidence(JSON.parse(JSON.stringify(sort(evidence))), target), { message: 'PROBE_HTTP_EVIDENCE_INVALID' });
});
test('canonical forged PASS cannot certify an anonymous deployment-readiness inconsistency', async () => {
  const { evidence } = await run([redirect(302, login), app()]);
  evidence.anonymous = sanitizeProbeHttpResponse(redirect(303, 'https://vercel.com/project/status', { 'x-vercel-error': 'DEPLOYMENT_NOT_READY_REDIRECTING' }), origin + path, origin);
  assert.equal(evidence.anonymous.classification, 'DEPLOYMENT_NOT_READY');
  const sort = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(sort) : Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  assert.throws(() => validateProbeHttpEvidence(JSON.parse(JSON.stringify(sort(evidence))), target), { message: 'PROBE_HTTP_EVIDENCE_INVALID' });
});
