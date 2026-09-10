// Probe-only transport diagnostics. Raw redirect URLs, tokens and response bodies never enter the journal.
import { createHash } from 'node:crypto';
import { validateProbeTarget } from './probe-core.mjs';

export const PROBE_HTTP_SCHEMA = 'statistical-levels.probe-http-evidence.v1';
export const PROBE_HTTP_PATHS = Object.freeze(['/niveles-estadisticos', '/en/statistical-levels']);
export const PROBE_HTTP_MAX_REDIRECTS = 2;
const TOKEN_HEADER = 'x-vercel-trusted-oidc-idp-token';
const HEADER_NAMES = ['server', 'x-vercel-id', 'x-vercel-cache', 'x-vercel-error'];
const AUTH_HOSTS = ['vercel.com', 'www.vercel.com'];
const AUTH_PATHS = ['/login', '/sso-api', '/sso-api/login', '/auth/login'];
const LOCATION_KEYS = ['present', 'scheme', 'host', 'path', 'query_present', 'fragment_present', 'origin_classification', 'valid', 'userinfo_present', 'port_present', 'host_redacted', 'path_redacted', 'host_sha256', 'path_sha256'];
const RESPONSE_KEYS = ['request_path', 'http_status_exact', 'location', 'headers', 'classification'];
const ROUTE_KEYS = ['path', 'result', 'error_code', 'classification', 'final_path', 'authority_match', 'html_content_type', 'application_structure_match', 'hops'];
const EVIDENCE_KEYS = ['schema_version', 'operation', 'fixture', 'max_redirects', 'anonymous', 'routes', 'result', 'access', 'classification', 'error_code', 'cross_origin_oidc_forward'];
const FIXTURE_KEYS = ['origin', 'candidate_git_sha', 'deployment_id', 'authority_run_id', 'sealed_manifest_sha256'];
const ERRORS = ['PROBE_HTTP_REQUEST_SCOPE', 'PROBE_HTTP_TOKEN_UNAVAILABLE', 'PROBE_HTTP_TRANSPORT_FAILURE', 'PROBE_HTTP_RESPONSE_INVALID', 'PROBE_HTTP_TRANSPORT_REDIRECT', 'PROBE_HTTP_REDIRECT_LOCATION', 'PROBE_HTTP_UNSAFE_REDIRECT', 'PROBE_HTTP_REDIRECT_LOOP', 'PROBE_HTTP_REDIRECT_LIMIT', 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT', 'PROBE_HTTP_PROTECTION_AUTH_REDIRECT', 'TRUSTED_SOURCE_NOT_ACCEPTED_BY_PROTECTION_LAYER', 'BLOCKED_PREVIEW_READINESS_INCONSISTENCY', 'PROBE_HTTP_PLATFORM_REDIRECT', 'PROBE_HTTP_PLATFORM_ERROR', 'PROBE_HTTP_STATUS', 'PROBE_HTTP_BODY_READ_FAILURE', 'PROBE_HTTP_BODY_SIZE', 'PROBE_HTTP_CONTENT_TYPE', 'PROBE_HTTP_FIXTURE_CONTENT_MISMATCH', 'PROBE_HTTP_SECRET_IN_CONTENT'];
const HASH = /^[a-f0-9]{64}$/;
function copy(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') { invariant(Number.isFinite(value)); return value; }
  invariant(value && typeof value === 'object');
  const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
  invariant((array ? proto === Array.prototype : proto === Object.prototype || proto === null) && !('toJSON' in value));
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  invariant(names.every(name => typeof name === 'string'));
  const result = array ? [] : Object.create(null);
  for (const name of names) {
    if (array && name === 'length') continue;
    const property = descriptors[name]; invariant(property.enumerable && Object.hasOwn(property, 'value'));
    if (array) invariant(/^(?:0|[1-9][0-9]*)$/.test(name));
    result[name] = copy(property.value);
  }
  if (array) invariant(result.length === value.length && names.length === value.length + 1);
  return result;
}
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const invariant = (value, code = 'PROBE_HTTP_EVIDENCE_INVALID') => { if (!value) fail(code); };
const keys = (value, expected) => invariant(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === expected.length && expected.every(k => Object.hasOwn(value, k)));
function secretLike(value, secrets = []) {
  return typeof value === 'string' && (secrets.some(x => typeof x === 'string' && x.length && value.toLowerCase().includes(x.toLowerCase())) ||
    /(?:eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:github_pat_|gh[pousr]_|vcp_|vcpat_|AKIA|ASIA)[A-Za-z0-9_]+|(?:bearer|password|credential|secret|signature|access_token|id_token|bypass_token)(?:[=:_/-]|$))/i.test(value));
}
function safeHost(value, secrets) {
  return typeof value === 'string' && value.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value) && !secretLike(value, secrets) && !value.split('.').some(part => /^[a-z0-9]{20,}$/.test(part));
}
function safePath(value, secrets) {
  return typeof value === 'string' && value.length <= 512 && /^\/(?:[A-Za-z0-9_-]{1,64}\/?)*$/.test(value) && !secretLike(value, secrets) &&
    !value.split('/').some(part => part.length >= 20 && !['niveles-estadisticos', 'statistical-levels'].includes(part));
}
function normalApplicationPath(value) {
  return safePath(value) && !/^\/(?:api|_next|_vercel|auth|oauth|login|logout|sso-api)(?:\/|$)/i.test(value);
}
function validFixture(target) {
  target = copy(target);
  try { validateProbeTarget(target); } catch { fail('PROBE_HTTP_TARGET'); }
  return Object.fromEntries(FIXTURE_KEYS.map(k => [k, target[k]]));
}
function baseLocation(present = false) {
  return { present, scheme: null, host: null, path: null, query_present: false, fragment_present: false,
    origin_classification: 'NONE', valid: false, userinfo_present: false, port_present: false,
    host_redacted: false, path_redacted: false, host_sha256: null, path_sha256: null };
}

// Only structural URL data is retained. Queries, fragments and userinfo are never copied.
export function sanitizeProbeLocation(raw, requestURL, previewOrigin, sensitiveValues = []) {
  const result = baseLocation(raw !== null && raw !== undefined);
  if (!result.present) return result;
  if (typeof raw !== 'string') return result;
  result.query_present = raw.split('#', 1)[0].includes('?'); result.fragment_present = raw.includes('#');
  if (!raw.length || raw.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(raw)) return result;
  let parsed;
  try { parsed = new URL(raw, requestURL); } catch { return result; }
  result.scheme = parsed.protocol === 'https:' ? 'https' : parsed.protocol === 'http:' ? 'http' : 'OTHER';
  result.userinfo_present = !!(parsed.username || parsed.password);
  const authority = raw.match(/^(?:[A-Za-z][A-Za-z0-9+.-]*:)?\/\/([^/?#]*)/);
  result.port_present = !!(parsed.port || authority?.[1].match(/:\d+$/));
  const relative = !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) && !raw.startsWith('//');
  result.origin_classification = relative && parsed.origin === previewOrigin ? 'RELATIVE' : parsed.origin === previewOrigin ? 'SAME_ORIGIN' : 'CROSS_ORIGIN';
  const hostSafe = safeHost(parsed.hostname, sensitiveValues), pathSafe = safePath(parsed.pathname, sensitiveValues);
  result.host = hostSafe ? parsed.hostname : null; result.path = pathSafe ? parsed.pathname : null;
  result.host_redacted = !hostSafe; result.path_redacted = !pathSafe;
  result.host_sha256 = hostSafe ? null : hash(parsed.hostname); result.path_sha256 = pathSafe ? null : hash(parsed.pathname);
  // Encoded or dot-segment paths are never normalized into an authorized destination.
  const rawPath = raw.split(/[?#]/, 1)[0].replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/]+/, '').replace(/^\/\/[^/]+/, '');
  result.valid = ['https', 'http'].includes(result.scheme) && hostSafe && pathSafe && !/%|(?:^|\/)\.{1,2}(?:\/|$)/.test(rawPath) && !result.userinfo_present;
  return result;
}
function safeHeader(name, raw, secrets = []) {
  const present = raw !== null && raw !== undefined;
  if (!present) return { present: false, value: null, redacted: false };
  const bounded = typeof raw === 'string' && raw.length <= 160 && !secretLike(raw, secrets);
  const valid = bounded && (name === 'server' ? /^(?:Vercel|vercel|nginx|cloudflare|Next\.js)$/.test(raw) :
    name === 'x-vercel-cache' ? /^(?:HIT|MISS|STALE|BYPASS|PRERENDER|REVALIDATED|ERROR)$/.test(raw) :
    name === 'x-vercel-error' ? /^[A-Z][A-Z0-9_]{0,79}$/.test(raw) :
    /^[a-z0-9]{3,8}::(?:[a-z0-9]{3,8}::)?[a-z0-9-]{1,100}$/.test(raw));
  return { present: true, value: valid ? raw : null, redacted: !valid };
}
function responseClass(response) {
  const { http_status_exact: status, location: loc, headers } = response;
  if (status === 303 && headers['x-vercel-error'].value === 'DEPLOYMENT_NOT_READY_REDIRECTING') return 'DEPLOYMENT_NOT_READY';
  if (headers['x-vercel-error'].present) return 'VERCEL_PLATFORM_ERROR';
  if (status >= 300 && status < 400) {
    if (!loc.present) return 'REDIRECT_WITHOUT_LOCATION';
    if (!loc.valid) return 'UNSAFE_OR_UNPARSEABLE_REDIRECT';
    if (AUTH_HOSTS.includes(loc.host) && AUTH_PATHS.includes(loc.path)) return 'PROTECTION_AUTH_REDIRECT';
    if (loc.origin_classification === 'CROSS_ORIGIN') return loc.host === 'vercel.com' || loc.host.endsWith('.vercel.com') ? 'OTHER_VERCEL_PLATFORM_REDIRECT' : 'CROSS_ORIGIN_APPLICATION_OR_CANONICAL_REDIRECT';
    if (loc.path === response.request_path || loc.path === response.request_path + '/' || response.request_path === loc.path + '/') return 'SAME_ORIGIN_CANONICAL_PATH_REDIRECT';
    return 'SAME_ORIGIN_APPLICATION_REDIRECT';
  }
  if (status >= 200 && status < 300) return 'APPLICATION_CONTENT_CANDIDATE';
  return 'HTTP_ERROR';
}
export function sanitizeProbeHttpResponse(response, requestURL, previewOrigin, sensitiveValues = []) {
  invariant(Number.isInteger(response?.status) && response.status >= 100 && response.status <= 599, 'PROBE_HTTP_RESPONSE_INVALID');
  const get = name => { try { return response.headers.get(name); } catch { fail('PROBE_HTTP_RESPONSE_INVALID'); } };
  const request = new URL(requestURL);
  invariant(request.origin === previewOrigin && normalApplicationPath(request.pathname), 'PROBE_HTTP_REQUEST_SCOPE');
  const result = { request_path: request.pathname, http_status_exact: response.status,
    location: sanitizeProbeLocation(get('location'), requestURL, previewOrigin, sensitiveValues),
    headers: Object.fromEntries(HEADER_NAMES.map(name => [name, safeHeader(name, get(name), sensitiveValues)])), classification: '' };
  result.classification = responseClass(result); return result;
}
function followAllowed(loc, fixture) {
  return loc.valid && ['SAME_ORIGIN', 'RELATIVE'].includes(loc.origin_classification) && loc.scheme === 'https' &&
    loc.host === new URL(fixture.origin).hostname && !loc.userinfo_present && !loc.port_present &&
    !loc.query_present && !loc.fragment_present && normalApplicationPath(loc.path);
}
function sameLogin(a, b) {
  return a?.classification === 'PROTECTION_AUTH_REDIRECT' && b?.classification === 'PROTECTION_AUTH_REDIRECT' &&
    ['scheme', 'host', 'path'].every(k => a.location[k] === b.location[k]);
}
function redirectFailure(response, evidence, route) {
  if (response.classification === 'VERCEL_PLATFORM_ERROR') return 'PROBE_HTTP_PLATFORM_ERROR';
  if (response.classification === 'DEPLOYMENT_NOT_READY') return 'BLOCKED_PREVIEW_READINESS_INCONSISTENCY';
  if (response.classification === 'PROTECTION_AUTH_REDIRECT') return sameLogin(evidence.anonymous, response) ? 'TRUSTED_SOURCE_NOT_ACCEPTED_BY_PROTECTION_LAYER' : 'PROBE_HTTP_PROTECTION_AUTH_REDIRECT';
  if (response.classification === 'OTHER_VERCEL_PLATFORM_REDIRECT') return 'PROBE_HTTP_PLATFORM_REDIRECT';
  if (response.classification === 'CROSS_ORIGIN_APPLICATION_OR_CANONICAL_REDIRECT') return 'PROBE_HTTP_CROSS_ORIGIN_REDIRECT';
  if (!response.location.present) return 'PROBE_HTTP_REDIRECT_LOCATION';
  if (!followAllowed(response.location, evidence.fixture)) return 'PROBE_HTTP_UNSAFE_REDIRECT';
  if (route.hops.some(hop => hop.request_path === response.location.path)) return 'PROBE_HTTP_REDIRECT_LOOP';
  if (route.hops.length > PROBE_HTTP_MAX_REDIRECTS) return 'PROBE_HTTP_REDIRECT_LIMIT';
  return null;
}
function validateLocation(value, fixture) {
  keys(value, LOCATION_KEYS);
  for (const name of ['present', 'query_present', 'fragment_present', 'valid', 'userinfo_present', 'port_present', 'host_redacted', 'path_redacted']) invariant(typeof value[name] === 'boolean');
  invariant([null, 'https', 'http', 'OTHER'].includes(value.scheme));
  invariant(['NONE', 'SAME_ORIGIN', 'CROSS_ORIGIN', 'RELATIVE'].includes(value.origin_classification));
  invariant(value.host === null || safeHost(value.host)); invariant(value.path === null || safePath(value.path));
  for (const name of ['host', 'path']) invariant(value[name + '_redacted'] ? value[name] === null && HASH.test(value[name + '_sha256']) : value[name + '_sha256'] === null);
  if (!value.present) invariant(LOCATION_KEYS.every(key => value[key] === baseLocation()[key]));
  if (value.valid) invariant(value.present && ['https', 'http'].includes(value.scheme) && value.host !== null && value.path !== null && !value.userinfo_present && !value.host_redacted && !value.path_redacted && value.origin_classification !== 'NONE');
  if (['SAME_ORIGIN', 'RELATIVE'].includes(value.origin_classification)) invariant(value.scheme === 'https' && value.host === new URL(fixture.origin).hostname);
  if (value.origin_classification === 'CROSS_ORIGIN' && value.valid) invariant(value.host !== new URL(fixture.origin).hostname || value.scheme !== 'https' || value.port_present);
}
function validateResponse(value, fixture) {
  keys(value, RESPONSE_KEYS); invariant(normalApplicationPath(value.request_path));
  invariant(Number.isInteger(value.http_status_exact) && value.http_status_exact >= 100 && value.http_status_exact <= 599);
  validateLocation(value.location, fixture); keys(value.headers, HEADER_NAMES);
  for (const name of HEADER_NAMES) {
    const header = value.headers[name]; keys(header, ['present', 'value', 'redacted']);
    invariant(typeof header.present === 'boolean' && typeof header.redacted === 'boolean');
    if (!header.present) invariant(header.value === null && !header.redacted);
    else if (header.redacted) invariant(header.value === null);
    else invariant(typeof header.value === 'string' && ['present', 'value', 'redacted'].every(key => safeHeader(name, header.value)[key] === header[key]));
  }
  invariant(value.classification === responseClass(value));
}
export function validateProbeHttpEvidence(value, target) {
  value = copy(value);
  keys(value, EVIDENCE_KEYS); keys(value.fixture, FIXTURE_KEYS);
  const fixture = validFixture({ operation: 'PROBE_IDENTITY', phase: 'preview', ...value.fixture });
  if (target) invariant(JSON.stringify(fixture) === JSON.stringify(validFixture(target)), 'PROBE_HTTP_FIXTURE_MISMATCH');
  invariant(value.schema_version === PROBE_HTTP_SCHEMA && value.operation === 'PROBE_IDENTITY' && value.max_redirects === 2 && value.cross_origin_oidc_forward === false);
  invariant(Array.isArray(value.routes) && value.routes.length <= 2);
  invariant(['NOT_CERTIFIED', 'PASS', 'FAIL'].includes(value.result) && ['NOT_ATTEMPTED', 'NOT_CERTIFIED', 'PASS', 'FAIL'].includes(value.access));
  invariant(value.error_code === null || ERRORS.includes(value.error_code));
  if (value.anonymous !== null) { validateResponse(value.anonymous, fixture); invariant(value.anonymous.request_path === PROBE_HTTP_PATHS[0]); }
  for (const [index, route] of value.routes.entries()) {
    keys(route, ROUTE_KEYS); invariant(route.path === PROBE_HTTP_PATHS[index] && ['IN_PROGRESS', 'PASS', 'FAIL'].includes(route.result));
    invariant(route.error_code === null || ERRORS.includes(route.error_code));
    for (const name of ['authority_match', 'html_content_type', 'application_structure_match']) invariant(typeof route[name] === 'boolean');
    invariant(Array.isArray(route.hops) && route.hops.length <= 3);
    route.hops.forEach(hop => validateResponse(hop, fixture));
    if (route.hops.length) invariant(value.anonymous !== null && route.hops[0].request_path === route.path);
    for (let i = 1; i < route.hops.length; i++) {
      const previous = route.hops[i - 1]; invariant(previous.http_status_exact >= 300 && previous.http_status_exact < 400 && followAllowed(previous.location, fixture));
      invariant(route.hops[i].request_path === previous.location.path && !route.hops.slice(0, i).some(hop => hop.request_path === route.hops[i].request_path));
    }
    const last = route.hops.at(-1);
    if (route.result === 'PASS') invariant(last && last.http_status_exact >= 200 && last.http_status_exact < 300 && last.classification === 'APPLICATION_CONTENT_CANDIDATE' && route.final_path === last.request_path && route.authority_match && route.html_content_type && route.application_structure_match && route.error_code === null && route.classification === 'VERIFIED_APPLICATION_CONTENT');
    else invariant(route.final_path === null);
    if (route.result === 'IN_PROGRESS') invariant(route.error_code === null && route.classification === 'IN_PROGRESS');
    if (route.result === 'FAIL') {
      invariant(ERRORS.includes(route.error_code) && route.classification === route.error_code);
      if (last?.http_status_exact >= 300 && last.http_status_exact < 400 && !['PROBE_HTTP_TRANSPORT_REDIRECT', 'PROBE_HTTP_TRANSPORT_FAILURE', 'PROBE_HTTP_RESPONSE_INVALID'].includes(route.error_code)) invariant(redirectFailure(last, value, route) === route.error_code);
      if (route.error_code.startsWith('PROBE_HTTP_BODY_') || ['PROBE_HTTP_CONTENT_TYPE', 'PROBE_HTTP_FIXTURE_CONTENT_MISMATCH', 'PROBE_HTTP_SECRET_IN_CONTENT'].includes(route.error_code)) invariant(last && last.http_status_exact >= 200 && last.http_status_exact < 300);
    }
    if (index > 0) invariant(value.routes[index - 1].result === 'PASS');
  }
  if (value.result === 'PASS') invariant(value.routes.length >= 1 && value.anonymous !== null && value.anonymous.classification !== 'DEPLOYMENT_NOT_READY' && value.routes.every(route => route.result === 'PASS') && value.access === 'PASS' && value.error_code === null && value.classification === 'VERIFIED_APPLICATION_CONTENT');
  else if (value.result === 'FAIL') invariant(ERRORS.includes(value.error_code) && value.classification === value.error_code && value.access === (value.routes.some(route => route.hops.length) ? 'FAIL' : 'NOT_ATTEMPTED'));
  else invariant(value.error_code === null && value.access === 'NOT_CERTIFIED' && value.classification === 'IN_PROGRESS');
  return copy(value);
}
async function boundedText(response) {
  const reader = response.body?.getReader(); if (!reader) return '';
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8 * 1024 * 1024) { void reader.cancel().catch(() => {}); fail('PROBE_HTTP_BODY_SIZE'); } chunks.push(value); }
  return Buffer.concat(chunks).toString('utf8');
}

export function createProbeHttpSession({ target, tokenSource, transport = fetch, onEvidence }) {
  const fixture = validFixture(target); invariant(typeof tokenSource?.get === 'function' && typeof transport === 'function' && typeof onEvidence === 'function', 'PROBE_HTTP_OPTIONS');
  let closed = false, busy = false;
  const state = { schema_version: PROBE_HTTP_SCHEMA, operation: 'PROBE_IDENTITY', fixture, max_redirects: 2,
    anonymous: null, routes: [], result: 'NOT_CERTIFIED', access: 'NOT_CERTIFIED', classification: 'IN_PROGRESS', error_code: null, cross_origin_oidc_forward: false };
  const evidence = () => validateProbeHttpEvidence(state, target);
  const persist = async () => { const safe = evidence(); try { await onEvidence(safe); } catch { closed = true; fail('PROBE_HTTP_EVIDENCE_WRITE_FAILED'); } };
  async function reject(code, route) {
    closed = true; if (route) Object.assign(route, { result: 'FAIL', error_code: code, classification: code, final_path: null });
    Object.assign(state, { result: 'FAIL', access: state.routes.some(item => item.hops.length) ? 'FAIL' : 'NOT_ATTEMPTED', classification: code, error_code: code });
    await persist(); fail(code);
  }
  async function request(url, token, route, anonymous) {
    if (closed) fail(state.error_code ?? 'PROBE_HTTP_REQUEST_SCOPE');
    let response;
    try { response = await transport(url, { method: 'GET', redirect: 'manual', credentials: 'omit', headers: anonymous ? {} : { [TOKEN_HEADER]: token }, signal: AbortSignal.timeout(30000) }); }
    catch { return reject('PROBE_HTTP_TRANSPORT_FAILURE', route); }
    if (closed) fail(state.error_code ?? 'PROBE_HTTP_REQUEST_SCOPE');
    let record;
    try { record = sanitizeProbeHttpResponse(response, url, fixture.origin, [token]); } catch { return reject('PROBE_HTTP_RESPONSE_INVALID', route); }
    if (anonymous) state.anonymous = record; else route.hops.push(record);
    await persist();
    if (response.redirected === true || (response.url && response.url !== url)) return reject('PROBE_HTTP_TRANSPORT_REDIRECT', route);
    return response;
  }
  async function get(url) {
    if (closed || busy || state.routes.length >= 2 || typeof url !== 'string' || url !== fixture.origin + PROBE_HTTP_PATHS[state.routes.length]) return reject('PROBE_HTTP_REQUEST_SCOPE');
    busy = true;
    const route = { path: PROBE_HTTP_PATHS[state.routes.length], result: 'IN_PROGRESS', error_code: null, classification: 'IN_PROGRESS', final_path: null, authority_match: false, html_content_type: false, application_structure_match: false, hops: [] };
    state.routes.push(route); Object.assign(state, { result: 'NOT_CERTIFIED', access: 'NOT_CERTIFIED', classification: 'IN_PROGRESS', error_code: null });
    try {
      let token;
      // The caller's lease is created only after frozen OIDC validation. Obtain it before any HTTP.
      try { token = await tokenSource.get(); } catch { return await reject('PROBE_HTTP_TOKEN_UNAVAILABLE', route); }
      if (typeof token !== 'string' || !token.length || token.length > 20000 || /[\r\n\u0000]/.test(token)) return await reject('PROBE_HTTP_TOKEN_UNAVAILABLE', route);
      if (state.anonymous === null) {
        await request(url, token, route, true);
        if (state.anonymous.classification === 'DEPLOYMENT_NOT_READY') return await reject('BLOCKED_PREVIEW_READINESS_INCONSISTENCY', route);
      }
      let next = url;
      while (true) {
        const response = await request(next, token, route, false), record = route.hops.at(-1), status = record.http_status_exact;
        if (record.classification === 'VERCEL_PLATFORM_ERROR') return await reject('PROBE_HTTP_PLATFORM_ERROR', route);
        if (status >= 300 && status < 400) {
          const code = redirectFailure(record, state, route); if (code) return await reject(code, route);
          next = fixture.origin + record.location.path; continue;
        }
        if (status < 200 || status >= 300) return await reject('PROBE_HTTP_STATUS', route);
        let contentType; try { contentType = response.headers.get('content-type'); } catch { return await reject('PROBE_HTTP_RESPONSE_INVALID', route); }
        route.html_content_type = typeof contentType === 'string' && /^text\/html(?:\s*;|\s*$)/i.test(contentType);
        if (!route.html_content_type) return await reject('PROBE_HTTP_CONTENT_TYPE', route);
        let html; try { html = await boundedText(response); } catch (error) { return await reject(error.message === 'PROBE_HTTP_BODY_SIZE' ? 'PROBE_HTTP_BODY_SIZE' : 'PROBE_HTTP_BODY_READ_FAILURE', route); }
        if (html.includes(token)) return await reject('PROBE_HTTP_SECRET_IN_CONTENT', route);
        route.authority_match = html.includes(fixture.authority_run_id);
        route.application_structure_match = /id=["']sl-controls["']/.test(html) && /id=["']sl-authority["']/.test(html);
        if (!route.authority_match || !route.application_structure_match) return await reject('PROBE_HTTP_FIXTURE_CONTENT_MISMATCH', route);
        Object.assign(route, { result: 'PASS', classification: 'VERIFIED_APPLICATION_CONTENT', final_path: record.request_path });
        Object.assign(state, { result: 'PASS', access: 'PASS', classification: 'VERIFIED_APPLICATION_CONTENT', error_code: null });
        await persist(); return new Response(html, { status: response.status, headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
    } finally { busy = false; }
  }
  return Object.freeze({ get, evidence });
}
export async function runProbePreflight(options) {
  const session = createProbeHttpSession(options); await session.get(options.target.origin + PROBE_HTTP_PATHS[0]); return session.evidence();
}
