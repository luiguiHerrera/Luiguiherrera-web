import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createInterceptionObservability, validateInterceptionEvidence, INTERCEPTION_EVIDENCE_SCHEMA,
  INTERCEPTION_EVIDENCE_FILE, INTERCEPTION_CONTINUATION_CLASSES } from '../scripts/probe-interception-observability.mjs';

const origin = 'https://probe-fixture.vercel.app';
const secret = 'sensitive-unit-marker-never-in-evidence';
const base = (overrides = {}) => ({ failureStage: 'REQUEST_CONTINUATION', error: new Error(secret), pageId: 'page-1',
  pageLifecycle: 'ACTIVE', requestSequence: 1, origin, previous: null,
  event: { requestId: 'private-request-id', resourceType: 'Fetch', request: { url: origin + '/levels?token=' + secret,
    method: 'GET', headers: { Authorization: secret, Cookie: secret }, postData: secret } }, ...overrides });
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-interception-observability-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const observer = createInterceptionObservability(directory);
  return { directory, observer, saved: () => JSON.parse(fs.readFileSync(path.join(directory, INTERCEPTION_EVIDENCE_FILE), 'utf8')) };
}
test('initial sidecar exists before the first failure and retains owner-only mode', t => {
  const f = fixture(t);
  assert.deepEqual(f.saved(), { schema_version: INTERCEPTION_EVIDENCE_SCHEMA, records: [], capture_issues: [] });
  assert.equal(fs.statSync(path.join(f.directory, INTERCEPTION_EVIDENCE_FILE)).mode & 0o777, 0o600);
  assert.deepEqual(f.observer.flush(), f.saved());
});
for (const [stage, thrown, expected] of [
  ['REDIRECT_LOOKUP', secret, 'REDIRECT_LOOKUP_ERROR'],
  ['REQUEST_URL_PARSING', secret, 'URL_PARSE_ERROR'],
  ['TOKEN_ACQUISITION', secret, 'TOKEN_SOURCE_ERROR'],
  ['TOKEN_ACQUISITION', 'OIDC_LEASE_CLOSED', 'OIDC_LEASE_CLOSED'],
  ['TOKEN_ACQUISITION', 'OIDC_REFRESH_EXPIRED', 'OIDC_REFRESH_EXPIRED'],
  ['TOKEN_ACQUISITION', 'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED', 'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED'],
  ['HEADER_SCOPE_VALIDATION', 'CROSS_ORIGIN_REDIRECT', 'CROSS_ORIGIN_REDIRECT'],
  ['HEADER_SCOPE_VALIDATION', 'CREDENTIAL_DESTINATION', 'CREDENTIAL_DESTINATION'],
  ['HEADER_SCOPE_VALIDATION', 'QA_ORIGIN', 'QA_ORIGIN'],
  ['HEADER_SCOPE_VALIDATION', 'PREVIEW_ORIGIN', 'PREVIEW_ORIGIN'],
  ['HEADER_SCOPE_VALIDATION', secret, 'HEADER_SCOPE_REJECTION'],
  ['REQUEST_CONTINUATION', 'CROSS_ORIGIN_REDIRECT', 'CONTINUE_REQUEST_ERROR'],
]) {
  test('stage-safe cause: ' + stage + '/' + expected, t => {
    const f = fixture(t); f.observer.record(base({ failureStage: stage, error: new Error(thrown) }));
    assert.equal(f.saved().records[0].failure_stage, stage);
    assert.equal(f.saved().records[0].safe_error_code, expected);
    assert.deepEqual(validateInterceptionEvidence(f.saved()), f.saved());
    assert.equal(JSON.stringify(f.saved()).includes(secret), false);
  });
}
test('fallback preserves original cause and identity with distinct stage', t => {
  const f = fixture(t);
  f.observer.record(base({ pageLifecycle: 'CLOSING' }));
  f.observer.record(base({ failureStage: 'FAIL_REQUEST_FALLBACK', pageLifecycle: 'CLOSED' }));
  const evidence = f.observer.flush();
  assert.equal(evidence.records.length, 2);
  assert.deepEqual(evidence.records.map(x => x.safe_error_code), ['CONTINUE_REQUEST_ERROR', 'FAIL_REQUEST_ERROR']);
  assert.deepEqual(evidence.records.map(x => x.page_lifecycle), ['CLOSING', 'CLOSED']);
  assert.ok(evidence.records.every(x => x.page_id === 'page-1' && x.request_sequence === 1));
});
test('12 failures preserve multiplicity and per-page identity', t => {
  const f = fixture(t);
  for (let i = 1; i <= 12; i++) f.observer.record(base({ requestSequence: i }));
  const records = f.observer.flush().records;
  assert.equal(records.length, 12);
  assert.equal(new Set(records.map(x => x.page_id + ':' + x.request_sequence)).size, 12);
});
test('only path hash and origin classes persist; full query URL headers bodies and errors never persist', t => {
  const f = fixture(t);
  const value = base({ previous: 'https://unrelated.example/private?key=' + secret });
  value.event.redirectedRequestId = 'private-redirect';
  f.observer.record(value);
  const record = f.saved().records[0], bytes = JSON.stringify(f.saved());
  assert.equal(record.path_sha256, createHash('sha256').update('/levels').digest('hex'));
  assert.equal(record.destination_origin_class, 'EXACT_PREVIEW');
  assert.equal(record.redirected_from_origin_class, 'CROSS_ORIGIN');
  assert.equal(record.redirect_present, true); assert.equal(record.same_origin_target, true);
  for (const forbidden of [secret, origin, '/levels', 'https://unrelated.example', 'Authorization', 'Cookie', 'postData', 'private-request-id', 'private-redirect']) assert.ok(!bytes.includes(forbidden));
  assert.deepEqual(Object.keys(record).sort(), ['continuation_failure_class', 'destination_origin_class', 'failure_stage',
    'method', 'page_id', 'page_lifecycle', 'path_sha256', 'prefetch', 'redirect_present', 'redirected_from_origin_class',
    'request_sequence', 'resource_type', 'rsc', 'safe_error_code', 'same_origin_target']);
  assert.equal(Object.keys(record).length, 15);
});
test('unknown structural values and invalid URL cannot exfiltrate metadata', t => {
  const f = fixture(t), value = base();
  value.event.request.url = 'https://[invalid/' + secret;
  value.event.request.method = secret; value.event.resourceType = secret;
  value.pageId = secret; value.pageLifecycle = secret;
  f.observer.record(value);
  const evidence = f.observer.flush(), record = evidence.records[0];
  assert.equal(record.destination_origin_class, 'INVALID'); assert.equal(record.path_sha256, null);
  assert.equal(record.method, 'UNKNOWN'); assert.equal(record.resource_type, 'UNKNOWN');
  assert.equal(record.page_id, 'UNKNOWN'); assert.equal(record.page_lifecycle, 'UNKNOWN');
  assert.deepEqual(evidence.capture_issues, ['INPUT_METADATA_UNAVAILABLE']);
  assert.ok(!JSON.stringify(evidence).includes(secret));
});
test('getters toJSON and thrown error accessors are never invoked', t => {
  const f = fixture(t); let calls = 0;
  const bomb = () => { calls++; throw new Error(secret); };
  const error = Object.defineProperties({}, { code: { get: bomb }, message: { get: bomb }, stack: { get: bomb }, toJSON: { value: bomb } });
  const value = base({ error });
  Object.defineProperty(value.event.request, 'headers', { get: bomb });
  Object.defineProperty(value.event.request, 'postData', { get: bomb });
  Object.defineProperty(value.event.request, 'toJSON', { value: bomb });
  f.observer.record(value);
  assert.equal(f.saved().records[0].safe_error_code, 'CONTINUE_REQUEST_ERROR');
  assert.equal(calls, 0); assert.ok(!JSON.stringify(f.observer.flush()).includes(secret));
  const bad = Object.defineProperty({}, 'records', { get: bomb });
  assert.throws(() => validateInterceptionEvidence(bad), /^Error: INTERCEPTION_EVIDENCE_INVALID$/);
  assert.equal(calls, 0);
});
test('persistence failure never throws from record, never leaks filesystem error and survives later recovery', t => {
  const f = fixture(t), filename = path.join(f.directory, INTERCEPTION_EVIDENCE_FILE);
  fs.unlinkSync(filename); fs.mkdirSync(filename);
  assert.doesNotThrow(() => f.observer.record(base()));
  assert.throws(() => f.observer.flush(), /^Error: INTERCEPTION_EVIDENCE_WRITE_FAILED$/);
  fs.rmdirSync(filename);
  const evidence = f.observer.flush();
  assert.equal(evidence.records.length, 1); assert.deepEqual(evidence.capture_issues, ['PERSISTENCE_WRITE_FAILED']);
  assert.deepEqual(f.saved(), evidence); assert.ok(!JSON.stringify(evidence).includes(f.directory));
});
test('strict validation rejects unsafe fields, raw cause, stage mismatch, orphan fallback and duplicate identities', t => {
  const f = fixture(t); f.observer.record(base());
  for (const mutate of [
    value => { value.raw_error = secret; },
    value => { value.records[0].headers = { Authorization: secret }; },
    value => { value.records[0].safe_error_code = secret; },
    value => { value.records[0].safe_error_code = 'CROSS_ORIGIN_REDIRECT'; },
    value => { value.records[0].page_id = secret; },
    value => { value.records[0].path_sha256 = origin; },
    value => { value.records[0].same_origin_target = false; },
    value => { value.records[0].failure_stage = 'FAIL_REQUEST_FALLBACK'; value.records[0].safe_error_code = 'FAIL_REQUEST_ERROR'; },
    value => { value.records.push(structuredClone(value.records[0])); },
    value => { value.capture_issues.push(secret); },
  ]) {
    const evidence = structuredClone(f.saved()); mutate(evidence);
    assert.throws(() => validateInterceptionEvidence(evidence), /^Error: INTERCEPTION_EVIDENCE_INVALID$/);
  }
});
test('throwing reflective proxy is rejected with fixed safe code', () => {
  const value = new Proxy({}, { ownKeys() { throw new Error(secret); } });
  assert.throws(() => validateInterceptionEvidence(value), /^Error: INTERCEPTION_EVIDENCE_INVALID$/);
});


test('a redirect with unavailable lookup source is UNKNOWN, never reported as no redirect', t => {
  const f = fixture(t), value = base(); value.event.redirectedRequestId = 'private-redirect';
  f.observer.record(value);
  const record = f.observer.flush().records[0];
  assert.equal(record.redirect_present, true); assert.equal(record.redirected_from_origin_class, 'UNKNOWN');
});

// Continuation-failure discrimination. Markers are the exact strings real Chromium/CDP returns;
// classification is diagnostic only and never changes whether a request continues or fails.
for (const [stage, thrown, expected] of [
  ['REQUEST_CONTINUATION', 'Invalid InterceptionId.', 'REQUEST_NO_LONGER_INTERCEPTABLE'],
  ['FAIL_REQUEST_FALLBACK', 'Invalid InterceptionId.', 'REQUEST_NO_LONGER_INTERCEPTABLE'],
  ['REQUEST_CONTINUATION', 'Session with given id not found.', 'CDP_TARGET_OR_SESSION_CLOSED'],
  ['REQUEST_CONTINUATION', 'Protocol error (Fetch.continueRequest): Target closed', 'CDP_TARGET_OR_SESSION_CLOSED'],
  ['REQUEST_CONTINUATION', 'Target page, context or browser has been closed', 'CDP_TARGET_OR_SESSION_CLOSED'],
  ['REQUEST_CONTINUATION', 'Invalid header: authorization', 'CDP_INVALID_PARAMETERS'],
  ['REQUEST_CONTINUATION', 'something entirely unknown', 'CDP_PROTOCOL_OTHER'],
  ['REQUEST_CONTINUATION', secret, 'CDP_PROTOCOL_OTHER'],
]) {
  test('continuation class: ' + stage + '/' + expected, t => {
    const f = fixture(t);
    if (stage === 'FAIL_REQUEST_FALLBACK') f.observer.record(base({ error: new Error('primary') }));
    f.observer.record(base({ failureStage: stage, error: new Error(thrown) }));
    const record = f.saved().records.at(-1);
    assert.equal(record.continuation_failure_class, expected);
    assert.ok(INTERCEPTION_CONTINUATION_CLASSES.includes(record.continuation_failure_class));
    assert.equal(record.safe_error_code, stage === 'REQUEST_CONTINUATION' ? 'CONTINUE_REQUEST_ERROR' : 'FAIL_REQUEST_ERROR');
    assert.deepEqual(validateInterceptionEvidence(f.saved()), f.saved());
    assert.equal(JSON.stringify(f.saved()).includes(secret), false);
    assert.equal(JSON.stringify(f.saved()).includes('authorization'), false);
  });
}
test('non-continuation stages carry NOT_APPLICABLE and never a CDP class', t => {
  const f = fixture(t);
  const stages = ['REDIRECT_LOOKUP', 'REQUEST_URL_PARSING', 'TOKEN_ACQUISITION', 'HEADER_SCOPE_VALIDATION'];
  stages.forEach((stage, i) => f.observer.record(base({ failureStage: stage, requestSequence: i + 1,
    error: new Error('Invalid InterceptionId.') })));
  const records = f.observer.flush().records;
  assert.equal(records.length, 4);
  assert.ok(records.every(r => r.continuation_failure_class === 'NOT_APPLICABLE'));
});
test('rsc and prefetch booleans are derived without retaining any header value', t => {
  const f = fixture(t);
  let n = 0;
  const withHeaders = headers => base({ requestSequence: ++n, event: { requestId: 'private-request-id', resourceType: 'Fetch',
    request: { url: origin + '/en/debt?_rsc=' + secret, method: 'GET', headers, postData: secret } } });
  f.observer.record(withHeaders({ RSC: '1', 'Next-Router-Prefetch': '1', Authorization: secret, Cookie: secret }));
  f.observer.record(withHeaders({ rsc: '1', Purpose: 'prefetch', Authorization: secret }));
  f.observer.record(withHeaders({ Authorization: secret }));
  const records = f.observer.flush().records;
  assert.deepEqual(records.map(r => r.rsc), [true, true, false]);
  assert.deepEqual(records.map(r => r.prefetch), [true, true, false]);
  const bytes = JSON.stringify(f.saved());
  for (const forbidden of [secret, 'Authorization', 'Cookie', 'Next-Router-Prefetch', '/en/debt']) assert.ok(!bytes.includes(forbidden));
});
test('hostile header containers cannot throw, leak or invoke accessors', t => {
  const f = fixture(t); let calls = 0;
  const bomb = () => { calls++; throw new Error(secret); };
  const hostile = {}; Object.defineProperty(hostile, 'rsc', { get: bomb, enumerable: true });
  const proxy = new Proxy({}, { ownKeys() { throw new Error(secret); } });
  [hostile, proxy, null, 'not-an-object', 42].forEach((headers, i) => {
    f.observer.record(base({ requestSequence: i + 1, event: { requestId: 'x', resourceType: 'Fetch',
      request: { url: origin + '/levels', method: 'GET', headers } } }));
  });
  const records = f.observer.flush().records;
  assert.equal(records.length, 5);
  assert.ok(records.every(r => r.rsc === false && r.prefetch === false));
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(f.saved()).includes(secret), false);
});
test('strict validation rejects unknown or stage-mismatched continuation classes and non-boolean flags', t => {
  const f = fixture(t); f.observer.record(base());
  for (const mutate of [
    value => { value.records[0].continuation_failure_class = secret; },
    value => { value.records[0].continuation_failure_class = 'NOT_APPLICABLE'; },
    value => { delete value.records[0].continuation_failure_class; },
    value => { value.records[0].rsc = 'true'; },
    value => { value.records[0].prefetch = 1; },
    value => { delete value.records[0].rsc; },
  ]) {
    const evidence = structuredClone(f.saved()); mutate(evidence);
    assert.throws(() => validateInterceptionEvidence(evidence), /^Error: INTERCEPTION_EVIDENCE_INVALID$/);
  }
});
