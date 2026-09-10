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
  const calls = [], journal = [], events = [], tokenBaselines = []; const counters = { oidcRequests: 0, anonymousRequests: 0, trustedRequests: 0 }; let n = 0;
  const session = createProbeHttpSession({ target: options.target ?? target, tokenSource: { get: async () => { counters.oidcRequests++; tokenBaselines.push(session.evidence().anonymous_protection_baseline); events.push('validated-token-lease'); if (options.tokenError) throw options.tokenError; return options.token ?? token; } },
    transport: async (url, init) => { calls.push({ url, init }); if (init.headers['x-vercel-trusted-oidc-idp-token']) counters.trustedRequests++; else counters.anonymousRequests++; events.push('http-' + calls.length); const result = responses[n++]; if (result instanceof Error) throw result; return typeof result === 'function' ? result(url, init) : result; },
    onEvidence: async evidence => { journal.push(evidence); events.push('persist-' + evidence.result); if (options.callbackError) throw options.callbackError; } });
  return { session, calls, journal, events, counters, tokenBaselines };
}
async function run(responses, options) { const h = harness(responses, options); const response = await h.session.get(origin + path); return { ...h, response, evidence: h.session.evidence() }; }
async function rejected(responses, code, options) {
  const h = harness(responses, options); await assert.rejects(h.session.get(origin + path), { message: code });
  assert.equal(h.journal.at(-1).result, 'FAIL'); assert.equal(h.journal.at(-1).error_code, code);
  assert.deepEqual(validateProbeHttpEvidence(h.session.evidence(), target), h.journal.at(-1)); return h;
}
test('1 direct authenticated200 requires exact fixture application HTML and persists PASS', async () => {
  const h = await run([redirect(302, login), app()]);
  assert.equal(h.evidence.result, 'PASS'); assert.equal(h.evidence.schema_version, PROBE_HTTP_SCHEMA);
  assert.equal(h.evidence.routes[0].authority_match, true); assert.equal(await h.response.text(), html);
  assert.deepEqual(h.calls[0].init.headers, {}); assert.equal(h.calls[1].init.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.ok(h.calls.every(x => x.init.redirect === 'manual' && x.init.method === 'GET' && x.init.credentials === 'omit'));
  assert.equal(h.events[0], 'http-1'); assert.ok(h.events.indexOf('validated-token-lease') > h.events.indexOf('persist-NOT_CERTIFIED')); assert.deepEqual(h.tokenBaselines, ['PROTECTED']);
});
test('2 anonymous login redirect and authenticated200 proves access without following anonymous', async () => {
  const h = await run([redirect(302, login), app()]); assert.equal(h.calls.length, 2); assert.equal(h.evidence.access, 'PASS');
  assert.equal(h.evidence.anonymous.classification, 'PROTECTION_AUTH_REDIRECT'); assert.equal(h.evidence.anonymous.http_status_exact, 302);
});
test('3 both controls at same login endpoint preserve precise differential rejection', async () => {
  const h = await rejected([redirect(302, login), redirect(307, login.replace('sensitive-query-value', 'different-nonce'))], 'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED');
  assert.equal(h.calls.length, 2); assert.equal(h.journal.at(-1).routes[0].hops[0].http_status_exact, 307);
});
for (const status of [301, 302, 303, 307, 308]) test('4/5 safe same-origin ' + status + ' followed manually with explicit header', async () => {
  const h = await run([redirect(302, login), redirect(status, path + '/'), app()]); assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].url, origin + path + '/'); assert.equal(h.calls[2].init.headers['x-vercel-trusted-oidc-idp-token'], token);
  assert.equal(h.evidence.routes[0].hops[0].classification, 'SAME_ORIGIN_CANONICAL_PATH_REDIRECT'); assert.equal(h.evidence.routes[0].final_path, path + '/');
  assert.equal(h.journal.find(x => x.routes[0]?.hops.length === 1).result, 'NOT_CERTIFIED');
});
test('6 cross-origin custom domain never receives OIDC or any follow request', async () => {
  const h = await rejected([redirect(302, login), redirect(308, 'https://www.luiguiherrera.com/niveles-estadisticos')], 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT');
  assert.equal(h.calls.length, 2); assert.equal(h.journal.at(-1).cross_origin_oidc_forward, false);
  assert.equal(h.journal.at(-1).routes[0].hops[0].classification, 'CROSS_ORIGIN_APPLICATION_OR_CANONICAL_REDIRECT');
});
test('7 cross-origin Vercel auth endpoint gets protection classification without a follow', async () => {
  const h = await rejected([redirect(302, login), redirect(302, 'https://vercel.com/sso-api/login')], 'PROBE_HTTP_PROTECTION_AUTH_REDIRECT'); assert.equal(h.calls.length, 2);
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
  const h = await rejected([new Error('request headers ' + token + ' sensitive-query-value')], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'); assert.equal(h.calls.length, 1);
  assert.ok(!JSON.stringify(h.journal).includes(token)); assert.doesNotMatch(JSON.stringify(h.journal), /sensitive-query-value|request headers/);
});
test('failed OIDC lease follows protected baseline and creates no trusted HTTP', async () => {
  const h = await rejected([redirect(302, login)], 'PROBE_HTTP_TOKEN_UNAVAILABLE', { tokenError: new Error(token) });
  assert.equal(h.counters.anonymousRequests, 1); assert.equal(h.counters.oidcRequests, 1); assert.equal(h.counters.trustedRequests, 0);
  assert.equal(h.session.evidence().anonymous_protection_baseline, 'PROTECTED'); assert.ok(!JSON.stringify(h.journal).includes(token));
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
  const h = await rejected([redirect(303, 'https://vercel.com/project/status', { 'x-vercel-error': 'DEPLOYMENT_NOT_READY_REDIRECTING' }), app()], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assert.equal(h.calls.length, 1); assert.deepEqual(h.calls[0].init.headers, {}); assert.equal(h.session.evidence().access, 'NOT_ATTEMPTED'); assert.equal(h.session.evidence().routes.length, 0); assert.equal(h.session.evidence().anonymous_protection_baseline, 'AMBIGUOUS');
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
  evidence.anonymous_hops[0] = structuredClone(evidence.anonymous);
  assert.equal(evidence.anonymous.classification, 'DEPLOYMENT_NOT_READY');
  const sort = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(sort) : Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])])) : value;
  assert.throws(() => validateProbeHttpEvidence(JSON.parse(JSON.stringify(sort(evidence))), target), { message: 'PROBE_HTTP_EVIDENCE_INVALID' });
});

function assertNoTrustedReachability(h, baseline, anonymousCount = 1) {
  const proof = h.session.evidence();
  assert.equal(proof.anonymous_protection_baseline, baseline);
  assert.equal(proof.anonymous_baseline_complete, true);
  assert.equal(h.counters.oidcRequests, 0); assert.equal(h.counters.trustedRequests, 0);
  assert.equal(h.counters.anonymousRequests, anonymousCount);
  assert.equal(proof.token_source_get_count, 0); assert.equal(proof.vercel_oidc_token_requested, false);
  assert.equal(proof.trusted_request_attempted, false); assert.equal(proof.trusted_http_request_count, 0);
  assert.equal(proof.trusted_sources_access, 'NOT_RUN'); assert.equal(proof.trusted_sources_live_certified, false);
  assert.equal(proof.routes.length, 0); assert.ok(h.calls.every(call => Object.keys(call.init.headers).length === 0));
}
test('gate1 anonymous verified200 is PUBLIC and stops with zero token or trusted requests', async () => {
  const h = await rejected([app(), app()], 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED');
  assertNoTrustedReachability(h, 'PUBLIC'); assert.equal(h.session.evidence().anonymous_content_classification, 'VERIFIED_APPLICATION_CONTENT');
});
test('gate2 anonymous safe same-origin redirect to verified app is PUBLIC with zero token requests', async () => {
  const h = await rejected([redirect(307, path + '/'), app(), app()], 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED');
  assertNoTrustedReachability(h, 'PUBLIC', 2); assert.equal(h.session.evidence().anonymous_hops.length, 2);
  assert.equal(h.calls[1].url, origin + path + '/'); assert.equal(h.session.evidence().anonymous.request_path, path + '/');
});
for (const status of [503, 500, 502, 504, 401, 403]) test('gate3/4 anonymous status alone is AMBIGUOUS with zero OIDC requests: ' + status, async () => {
  const h = await rejected([new Response('', { status }), app()], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assertNoTrustedReachability(h, 'AMBIGUOUS'); assert.equal(h.session.evidence().anonymous.http_status_exact, status);
});
test('gate5 anonymous unknown redirect is AMBIGUOUS and never requests OIDC', async () => {
  const h = await rejected([redirect(302, 'https://vercel.com/unknown-state'), app()], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assertNoTrustedReachability(h, 'AMBIGUOUS'); assert.equal(h.session.evidence().anonymous.classification, 'OTHER_VERCEL_PLATFORM_REDIRECT');
});
test('gate6 protected establishment is anonymous-only and idempotent before exactly one permitted token request', async () => {
  const h = harness([redirect(302, login), app()]);
  const baseline = await h.session.establishAnonymousBaseline(); await h.session.establishAnonymousBaseline();
  assert.equal(baseline.anonymous_protection_baseline, 'PROTECTED'); assert.equal(h.calls.length, 1); assert.equal(h.counters.oidcRequests, 0);
  await h.session.get(origin + path); assert.equal(h.counters.oidcRequests, 1); assert.equal(h.counters.trustedRequests, 1);
  assert.equal(h.session.evidence().token_source_get_count, 1); assert.deepEqual(h.tokenBaselines, ['PROTECTED']);
});
test('gate7 protected anonymous baseline plus trusted fixture200 certifies causal access', async () => {
  const h = await run([redirect(302, login), app()]);
  assert.equal(h.evidence.anonymous_protection_baseline, 'PROTECTED'); assert.equal(h.evidence.trusted_sources_access, 'PASS');
  assert.equal(h.evidence.trusted_sources_live_certified, true); assert.equal(h.counters.oidcRequests, 1);
});
test('gate8 protected baseline plus safe trusted redirect ends in verified fixture PASS', async () => {
  const h = await run([redirect(302, login), redirect(308, '/normal-app'), app()]);
  assert.equal(h.evidence.trusted_sources_access, 'PASS'); assert.equal(h.evidence.trusted_http_request_count, 2);
  assert.equal(h.counters.oidcRequests, 1); assert.equal(h.calls[2].init.headers['x-vercel-trusted-oidc-idp-token'], token);
});
test('gate9 protected baseline plus equivalent trusted denial records confirmed mismatch separately', async () => {
  const h = await rejected([redirect(302, login), redirect(307, login)], 'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED');
  assert.equal(h.session.evidence().anonymous_protection_baseline, 'PROTECTED'); assert.equal(h.session.evidence().trusted_sources_access, 'FAIL');
  assert.equal(h.session.evidence().trusted_sources_live_certified, false); assert.equal(h.counters.oidcRequests, 1);
});
test('gate10 protected baseline plus trusted503 cannot certify Trusted Sources', async () => {
  const h = await rejected([redirect(302, login), new Response('', { status: 503 })], 'PROBE_HTTP_STATUS');
  assert.equal(h.session.evidence().anonymous_protection_baseline, 'PROTECTED'); assert.equal(h.session.evidence().trusted_sources_live_certified, false);
  assert.equal(h.counters.oidcRequests, 1); assert.equal(h.counters.trustedRequests, 1);
});
test('gate11 cross-origin trusted redirect never receives a forwarded token', async () => {
  const h = await rejected([redirect(302, login), redirect(308, 'https://different.vercel.app/normal')], 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT');
  assert.equal(h.calls.length, 2); assert.ok(h.calls.every(call => new URL(call.url).origin === origin));
  assert.equal(h.session.evidence().cross_origin_oidc_forward, false);
});
for (const suffix of ['?credential=private-query-canary', '#private-fragment-canary']) test('gate12 trusted query or fragment redirect is never followed: ' + suffix[0], async () => {
  const h = await rejected([redirect(302, login), redirect(307, '/normal' + suffix)], 'PROBE_HTTP_UNSAFE_REDIRECT');
  assert.equal(h.counters.trustedRequests, 1); assert.equal(h.calls.length, 2); assert.doesNotMatch(JSON.stringify(h.journal), /private-query-canary|private-fragment-canary/);
});
test('gate13 token helper runs only after PROTECTED classification has been persisted', async () => {
  const journal = [], order = []; let session;
  session = createProbeHttpSession({ target, tokenSource: { get: async () => {
    order.push('token'); assert.equal(session.evidence().anonymous_protection_baseline, 'PROTECTED');
    assert.equal(journal.at(-1).anonymous_protection_baseline, 'PROTECTED'); return token;
  } }, transport: async (_url, init) => { order.push(Object.keys(init.headers).length ? 'trusted' : 'anonymous'); return Object.keys(init.headers).length ? app() : redirect(302, login); },
  onEvidence: async proof => { journal.push(proof); if (proof.anonymous_protection_baseline === 'PROTECTED' && !proof.vercel_oidc_token_requested) order.push('protected-persisted'); } });
  await session.get(origin + path);
  assert.ok(order.indexOf('anonymous') < order.indexOf('protected-persisted')); assert.ok(order.indexOf('protected-persisted') < order.indexOf('token')); assert.ok(order.indexOf('token') < order.indexOf('trusted'));
});
for (const kind of ['public', 'ambiguous']) test('gate20 artifact records exact stopped baseline and unreachable trusted counters: ' + kind, async () => {
  const h = await rejected([kind === 'public' ? app() : new Response('', { status: 503 })], kind === 'public' ? 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED' : 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  const proof = JSON.parse(JSON.stringify(h.journal.at(-1))); assertNoTrustedReachability(h, kind.toUpperCase());
  assert.equal(validateProbeHttpEvidence(proof, target).anonymous_protection_baseline, kind.toUpperCase());
});
for (const status of [300, 304, 305, 306]) test('unsupported3xx plus login Location is ambiguous, never a positive protection proof: ' + status, async () => {
  const response = new Response(null, { status, headers: { location: login } });
  const h = await rejected([response], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'); assertNoTrustedReachability(h, 'AMBIGUOUS');
});
for (const location of ['http://vercel.com/login', 'https://vercel.com:443/login', 'https://vercel.com:444/login', 'https://user@vercel.com/login']) test('unsafe protection-shaped location cannot create an OIDC token: ' + location, async () => {
  const h = await rejected([redirect(302, location)], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'); assertNoTrustedReachability(h, 'AMBIGUOUS');
});
for (const kind of ['empty', 'wrong-fixture', 'platform-error', 'network']) test('unverified anonymous content or anomaly remains ambiguous: ' + kind, async () => {
  const response = kind === 'empty' ? app('') : kind === 'wrong-fixture' ? app(html.replace(target.authority_run_id, 'other')) : kind === 'platform-error' ? app(html, { 'x-vercel-error': 'FUNCTION_INVOCATION_FAILED' }) : new Error('unrecorded-network-detail');
  const h = await rejected([response], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS'); assertNoTrustedReachability(h, 'AMBIGUOUS'); assert.doesNotMatch(JSON.stringify(h.journal), /unrecorded-network-detail/);
});
test('anonymous two-hop bound and loop are enforced without any token helper call', async () => {
  const excessive = await rejected([redirect(307, '/one'), redirect(307, '/two'), redirect(307, '/three')], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assertNoTrustedReachability(excessive, 'AMBIGUOUS', 3); assert.equal(excessive.session.evidence().anonymous_baseline_error_code, 'PROBE_HTTP_REDIRECT_LIMIT');
  const loop = await rejected([redirect(307, '/one'), redirect(307, path)], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assertNoTrustedReachability(loop, 'AMBIGUOUS', 2); assert.equal(loop.session.evidence().anonymous_baseline_error_code, 'PROBE_HTTP_REDIRECT_LOOP');
});
test('failure to persist positive protection proof prevents token helper reachability', async () => {
  let tokenCalls = 0; const session = createProbeHttpSession({ target, tokenSource: { get() { tokenCalls++; return token; } }, transport: async () => redirect(302, login),
    onEvidence: async proof => { if (proof.anonymous_protection_baseline === 'PROTECTED') throw new Error('private-persistence-detail'); } });
  await assert.rejects(session.get(origin + path), { message: 'PROBE_HTTP_EVIDENCE_WRITE_FAILED' }); assert.equal(tokenCalls, 0);
});
test('concurrent call during protected evidence persistence closes session before token helper', async () => {
  let tokenCalls = 0, interrupted = false, session;
  session = createProbeHttpSession({ target, tokenSource: { get() { tokenCalls++; return token; } }, transport: async () => redirect(302, login),
    onEvidence: async proof => { if (proof.anonymous_protection_baseline === 'PROTECTED' && !interrupted) { interrupted = true; await assert.rejects(session.get(origin + path), { message: 'PROBE_HTTP_REQUEST_SCOPE' }); } } });
  await assert.rejects(session.get(origin + path), { message: 'PROBE_HTTP_REQUEST_SCOPE' }); assert.equal(tokenCalls, 0);
});
test('validator rejects forged protected or successful evidence from an unprotected anonymous response', async () => {
  const { evidence } = await run([redirect(302, login), app()]);
  for (const response of [app(), new Response('', { status: 401 }), new Response('', { status: 503 }), new Response(null, { status: 304, headers: { location: login } })]) {
    const forged = structuredClone(evidence); forged.anonymous = sanitizeProbeHttpResponse(response, origin + path, origin); forged.anonymous_hops = [structuredClone(forged.anonymous)];
    assert.throws(() => validateProbeHttpEvidence(JSON.parse(JSON.stringify(forged)), target));
  }
});
test('validator rejects token, trusted-attempt or live-success reachability added to PUBLIC/AMBIGUOUS evidence', async () => {
  for (const kind of ['public', 'ambiguous']) {
    const h = await rejected([kind === 'public' ? app() : new Response('', { status: 503 })], kind === 'public' ? 'BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED' : 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
    for (const mutate of [proof => { proof.vercel_oidc_token_requested = true; }, proof => { proof.token_source_get_count = 1; }, proof => { proof.trusted_request_attempted = true; }, proof => { proof.trusted_http_request_count = 1; }, proof => { proof.trusted_sources_live_certified = true; }]) {
      const forged = structuredClone(h.session.evidence()); mutate(forged); assert.throws(() => validateProbeHttpEvidence(forged, target));
    }
  }
});
for (const status of [300, 304, 305, 306]) test('anonymous unsupported3xx same-origin Location is not followed: ' + status, async () => {
  const h = await rejected([new Response(null, { status, headers: { location: '/normal' } }), app()], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  assertNoTrustedReachability(h, 'AMBIGUOUS'); assert.equal(h.session.evidence().anonymous_baseline_error_code, 'PROBE_HTTP_STATUS');
});
test('tokenSource getter is rejected without execution before the anonymous gate', () => {
  let getterCalls = 0;
  const tokenSource = Object.defineProperty({}, 'get', { get() { getterCalls++; return () => token; } });
  assert.throws(() => createProbeHttpSession({ target, tokenSource, transport: async () => app(), onEvidence: async () => {} }), { message: 'PROBE_HTTP_OPTIONS' });
  assert.equal(getterCalls, 0);
});
test('AMBIGUOUS evidence cannot substitute a PUBLIC blocker or confirmed Trusted Sources mismatch', async () => {
  const h = await rejected([new Response('', { status: 503 })], 'BLOCKED_ANONYMOUS_PROTECTION_BASELINE_AMBIGUOUS');
  for (const code of ['BLOCKED_PREVIEW_NOT_DEMONSTRABLY_PROTECTED', 'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED', 'PROBE_HTTP_REQUEST_SCOPE']) {
    const forged = structuredClone(h.session.evidence()); forged.error_code = code; forged.classification = code;
    assert.throws(() => validateProbeHttpEvidence(forged, target));
  }
});
test('forged unsupported anonymous304 to login chain cannot establish PROTECTED', async () => {
  const { evidence } = await run([redirect(302, login), app()]);
  const first = sanitizeProbeHttpResponse(new Response(null, { status: 304, headers: { location: '/normal' } }), origin + path, origin);
  const last = sanitizeProbeHttpResponse(redirect(302, login), origin + '/normal', origin);
  evidence.anonymous_hops = [first, last]; evidence.anonymous = structuredClone(last); evidence.anonymous_http_request_count = 2;
  assert.throws(() => validateProbeHttpEvidence(evidence, target));
});
