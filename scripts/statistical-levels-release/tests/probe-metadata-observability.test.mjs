import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { P, canonical } from '../scripts/release-core.mjs';
import { fetchProbeMetadata, readProbeMetadataEvidence, validateProbeMetadataEvidence, recordProbeMetadataGateFailure } from '../scripts/probe-metadata-observability.mjs';

const SHA = '4'.repeat(40), OTHER = '5'.repeat(40);
const paths = ['/actions/runs/123', '/git/ref/heads/vercel-deployment', '/compare/' + SHA + '...' + OTHER + '?per_page=1',
  '/deployments?sha=' + SHA + '&per_page=100', '/deployments/123/statuses?per_page=100', '/commits/' + SHA + '/statuses?per_page=100'];
const repo = { full_name: P.repository, id: Number(P.repository_id), owner: { id: Number(P.repository_owner_id) }, private: false };
const values = [
  { repository: repo, head_repository: repo, id: 123, run_attempt: 1, name: P.workflow_name, head_sha: SHA,
    head_branch: P.branch, path: P.workflow_path, event: 'workflow_dispatch' },
  { object: { sha: SHA } },
  { base_commit: { sha: SHA }, merge_base_commit: { sha: SHA }, behind_by: 0, ahead_by: 1, status: 'ahead' },
  [{ id: 123 }], [{ id: 123 }], [{ id: 123 }]
];
const clone = value => JSON.parse(JSON.stringify(value));
function scope(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-metadata-test-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  return { env: { RUNNER_TEMP: temp }, file: path.join(temp, 'statistical-levels-identity-probe', 'metadata-resolution.jsonl') };
}
function respond(t, fn) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return fn(url, options, calls.length); });
  return calls;
}
const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
function requestRow(env, index = 0) { return readProbeMetadataEvidence(env).requests[index]; }
async function proof(t) {
  const s = scope(t); respond(t, () => response(values[1])); await fetchProbeMetadata(paths[1], s.env); return { ...s, proof: readProbeMetadataEvidence(s.env) };
}
function forgeRows(value, change) {
  change(value.events[1]);
  change(value.requests[0]);
}

for (let index = 0; index < paths.length; index++) test('public family ' + index + ' preserves exact GET origin, policy and returned body', async t => {
  const s = scope(t), calls = respond(t, () => response(values[index]));
  const actual = await fetchProbeMetadata(paths[index], s.env);
  assert.deepEqual(actual, values[index]); assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.github.com/repos/' + P.repository + paths[index]);
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.redirect, 'error');
  assert.deepEqual(calls[0].options.headers, { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  const evidence = readProbeMetadataEvidence(s.env);
  assert.equal(evidence.request_count, 1); assert.equal(evidence.retry_count, 0); assert.equal(evidence.capture_status, 'COMPLETE');
  assert.equal(requestRow(s.env).classification, 'JSON_PARSED');
  assert.deepEqual(validateProbeMetadataEvidence(evidence), evidence);
  assert.equal(fs.statSync(s.file).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.dirname(s.file)).mode & 0o777, 0o700);
  assert.ok(!fs.readFileSync(s.file, 'utf8').includes('?'));
});

for (const invalid of ['https://evil.invalid/a', '//evil.invalid', '/actions/runs/0', '/actions/runs/123?token=x',
  '/git/ref/heads/main', '/deployments?sha=' + SHA + '&per_page=99', '/deployments?sha=' + SHA + '&per_page=100&extra=x',
  '/commits/' + SHA.toUpperCase() + '/statuses?per_page=101', '/compare/' + SHA + '...' + OTHER + '?per_page=2'])
  test('invalid metadata endpoint is rejected before fetch: ' + invalid, async t => {
    const s = scope(t), calls = respond(t, () => { throw Error('must not call'); });
    await assert.rejects(fetchProbeMetadata(invalid, s.env), { message: 'PROBE_GITHUB_PATH' });
    assert.equal(calls.length, 0); assert.equal(readProbeMetadataEvidence(s.env), null);
  });

for (const [status, classification] of [[403, 'HTTP_403'], [404, 'HTTP_404'], [429, 'HTTP_429'], [500, 'HTTP_5XX'], [503, 'HTTP_5XX'], [302, 'HTTP_OTHER_NON_SUCCESS']])
  test('HTTP ' + status + ' preserves old failure and records exact status without retries', async t => {
    const s = scope(t), calls = respond(t, () => response({ private: 'body must not persist' }, status));
    await assert.rejects(fetchProbeMetadata(paths[1], s.env), { message: 'PROBE_PUBLIC_METADATA_UNAVAILABLE' });
    assert.equal(calls.length, 1); assert.equal(requestRow(s.env).http_status, status);
    assert.equal(requestRow(s.env).classification, classification);
    assert.equal(readProbeMetadataEvidence(s.env).retry_count, 0);
    assert.ok(!fs.readFileSync(s.file, 'utf8').includes('body must not persist'));
  });

for (const [status, headers, expected] of [[403, {}, 'UNKNOWN'], [403, { 'x-ratelimit-remaining': '0' }, 'PRIMARY_LIMIT_EXHAUSTED'],
  [403, { 'x-ratelimit-remaining': '1' }, 'UNKNOWN'], [403, { 'retry-after': '60' }, 'RETRY_AFTER_PRESENT'],
  [429, {}, 'HTTP_429'], [503, { 'retry-after': 'invalid private value' }, 'NOT_INDICATED'], [200, { 'x-ratelimit-remaining': '0' }, 'NOT_INDICATED']])
  test('rate classification uses bounded facts only ' + status + ' ' + expected, async t => {
    const s = scope(t); respond(t, () => response(values[1], status, headers));
    if (status === 200) await fetchProbeMetadata(paths[1], s.env); else await assert.rejects(fetchProbeMetadata(paths[1], s.env));
    assert.equal(requestRow(s.env).rate_limit, expected);
  });

for (const [error, expected] of [
  [new TypeError('fetch failed', { cause: Object.assign(new Error('do not retain DNS hostname'), { code: 'ENOTFOUND' }) }), 'TRANSPORT_DNS'],
  [Object.assign(new Error('private network text'), { code: 'ECONNRESET' }), 'TRANSPORT_NETWORK'],
  [new DOMException('private timeout text', 'TimeoutError'), 'TRANSPORT_TIMEOUT'],
  [new TypeError('fetch failed', { cause: new Error('unexpected redirect') }), 'TRANSPORT_REDIRECT']
]) test('transport exception preserved by identity, bounded diagnostic ' + expected, async t => {
  const s = scope(t), calls = respond(t, () => { throw error; });
  await assert.rejects(fetchProbeMetadata(paths[1], s.env), actual => actual === error);
  assert.equal(calls.length, 1); assert.equal(requestRow(s.env).classification, expected);
  assert.equal(requestRow(s.env).http_status, null); assert.ok(!fs.readFileSync(s.file, 'utf8').includes('private'));
});

test('non-JSON body retains SyntaxError outward with no body in durable diagnostics', async t => {
  const s = scope(t); respond(t, () => new Response('<html>private failure body</html>', { headers: { 'content-type': 'text/html' } }));
  await assert.rejects(fetchProbeMetadata(paths[1], s.env), SyntaxError);
  assert.equal(requestRow(s.env).classification, 'MALFORMED_JSON'); assert.equal(requestRow(s.env).content_type, 'HTML');
  assert.ok(!fs.readFileSync(s.file, 'utf8').includes('private failure body'));
});
test('response size retains strict original less-than-two-million bound', async t => {
  const s = scope(t); respond(t, () => new Response(' '.repeat(2_000_000)));
  await assert.rejects(fetchProbeMetadata(paths[1], s.env), { message: 'PROBE_METADATA_SIZE' });
  assert.equal(requestRow(s.env).classification, 'RESPONSE_TOO_LARGE');
});
test('body reader failure preserves exception identity and status', async t => {
  const s = scope(t), error = new Error('private reader error');
  respond(t, () => ({ status: 200, ok: true, headers: new Headers(), text: async () => { throw error; } }));
  await assert.rejects(fetchProbeMetadata(paths[1], s.env), actual => actual === error);
  assert.equal(requestRow(s.env).classification, 'RESPONSE_READ_FAILURE');
});

for (const [index, value, missing] of [[0, {}, 'repository.full_name'],
  [1, { object: {} }, 'object.sha'], [2, {}, 'base_commit.sha'],
  [3, {}, 'array'], [3, [{}], 'items.id'], [5, [{}], 'items.id']])
  test('missing mandatory fields remain observational, original consumer owns failure: ' + index + ' ' + missing, async t => {
    const s = scope(t); respond(t, () => response(value));
    assert.deepEqual(await fetchProbeMetadata(paths[index], s.env), value);
    const row = requestRow(s.env); assert.equal(row.classification, 'EXPECTED_FIELD_MISSING'); assert.ok(row.missing_fields.includes(missing));
    assert.equal(row.error_code, 'PROBE_METADATA_EXPECTED_FIELD_MISSING');
  });
test('status metadata that resolver may ignore is diagnostic-only, no new rejection', async t => {
  const s = scope(t); respond(t, () => response({ unneeded: true }));
  assert.deepEqual(await fetchProbeMetadata(paths[4], s.env), { unneeded: true });
  assert.equal(requestRow(s.env).classification, 'EXPECTED_FIELD_MISSING'); assert.equal(requestRow(s.env).error_code, 'PROBE_METADATA_EXPECTED_FIELD_MISSING');
});
test('optional fields and wrong semantic values remain responsibility of unchanged consumers', async t => {
  const s = scope(t), value = { object: { sha: 'wrong-semantic-value' }, unrelated: 'do not record' };
  respond(t, () => response(value)); assert.deepEqual(await fetchProbeMetadata(paths[1], s.env), value);
  assert.equal(requestRow(s.env).classification, 'JSON_PARSED');
});
test('array length semantics remain owned by existing consumer', async t => {
  const s = scope(t), value = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
  respond(t, () => response(value)); assert.deepEqual(await fetchProbeMetadata(paths[3], s.env), value);
});

test('concurrent requests retain deterministic start order and real completion order without retries', async t => {
  const s = scope(t); let release;
  const wait = new Promise(resolve => { release = resolve; });
  respond(t, async (url, options, index) => { if (index === 1) await wait; return response([{ id: index }]); });
  const first = fetchProbeMetadata(paths[3], s.env); await fetchProbeMetadata(paths[5], s.env); release(); await first;
  const value = readProbeMetadataEvidence(s.env);
  assert.deepEqual(value.events.map(row => [row.sequence, row.kind, row.request_id]), [[1, 'START', 1], [2, 'START', 2], [3, 'FINISH', 2], [4, 'FINISH', 1]]);
  assert.equal(value.capture_status, 'COMPLETE'); assert.equal(value.request_count, 2);
});
test('pending request records durable attempt before transport resolves and is PARTIAL', async t => {
  const s = scope(t); let release; const wait = new Promise(resolve => { release = resolve; });
  respond(t, async () => { await wait; return response(values[1]); });
  const pending = fetchProbeMetadata(paths[1], s.env);
  assert.equal(readProbeMetadataEvidence(s.env).capture_status, 'PARTIAL');
  assert.equal(readProbeMetadataEvidence(s.env).completed_request_count, 0);
  assert.equal(JSON.parse(fs.readFileSync(s.file, 'utf8').trim()).kind, 'START'); release(); await pending;
});
test('no absolute runner temp means no journal and unchanged public response', async t => {
  respond(t, () => response(values[1]));
  for (const env of [{}, { RUNNER_TEMP: 'relative-path' }, { RUNNER_TEMP: null }]) {
    assert.deepEqual(await fetchProbeMetadata(paths[1], env), values[1]); assert.equal(readProbeMetadataEvidence(env), null);
    assert.doesNotThrow(() => recordProbeMetadataGateFailure('PRIVATE_UNKNOWN_ERROR', env));
  }
});
test('IO failure cannot mask metadata success or original HTTP failure; evidence is PARTIAL', async t => {
  const s = scope(t); fs.writeFileSync(path.dirname(s.file), 'occupied');
  const calls = respond(t, (url, options, number) => response(values[1], number === 1 ? 200 : 404));
  assert.deepEqual(await fetchProbeMetadata(paths[1], s.env), values[1]);
  await assert.rejects(fetchProbeMetadata(paths[1], s.env), { message: 'PROBE_PUBLIC_METADATA_UNAVAILABLE' });
  assert.equal(calls.length, 2); const value = readProbeMetadataEvidence(s.env);
  assert.equal(value.journal_persistence, 'FAILED'); assert.equal(value.capture_status, 'PARTIAL');
});
test('journal final component symlink is not followed', async t => {
  const s = scope(t), destination = path.join(s.env.RUNNER_TEMP, 'untouched'); fs.writeFileSync(destination, 'sentinel');
  fs.mkdirSync(path.dirname(s.file)); fs.symlinkSync(destination, s.file);
  respond(t, () => response(values[1])); await fetchProbeMetadata(paths[1], s.env);
  assert.equal(fs.readFileSync(destination, 'utf8'), 'sentinel'); assert.equal(readProbeMetadataEvidence(s.env).capture_status, 'PARTIAL');
});
test('pre-transport registered fixture failure has explicit attempted false and safe error', t => {
  const s = scope(t); recordProbeMetadataGateFailure('PROBE_UNREGISTERED_GIT_SHA', s.env);
  const value = readProbeMetadataEvidence(s.env); assert.equal(value.request_count, 0);
  assert.equal(value.gate_failures[0].attempted, false); assert.equal(value.gate_failures[0].error_code, 'PROBE_UNREGISTERED_GIT_SHA');
});
test('post-transport logical failure records attempted true without reclassifying response', async t => {
  const s = await proof(t); recordProbeMetadataGateFailure('PROBE_PREVIEW_METADATA_AMBIGUOUS', s.env);
  const value = readProbeMetadataEvidence(s.env); assert.equal(value.gate_failures[0].attempted, true);
  assert.equal(value.requests[0].classification, 'JSON_PARSED');
});
test('frozen resolver timestamp error is retained exactly without generic degradation', t => {
  const s = scope(t); recordProbeMetadataGateFailure('PROBE_TIMESTAMP', s.env);
  assert.equal(readProbeMetadataEvidence(s.env).gate_failures[0].error_code, 'PROBE_TIMESTAMP');
});
test('arbitrary sensitive error/body/header strings never enter diagnostic journal', async t => {
  const s = scope(t), canary = ['opaque', 'Sensitive', '43210', 'Credential', 'xYz'].join('');
  respond(t, () => response({ ...values[1], token: canary }, 200, { 'set-cookie': 'a=' + canary,
    authorization: 'Bearer ' + canary, 'x-ratelimit-remaining': canary, 'retry-after': canary, 'content-type': canary }));
  await fetchProbeMetadata(paths[1], s.env); recordProbeMetadataGateFailure(canary, s.env);
  const text = fs.readFileSync(s.file, 'utf8'); assert.ok(!text.includes(canary)); assert.ok(!text.includes('Bearer'));
  assert.equal(readProbeMetadataEvidence(s.env).gate_failures[0].error_code, 'PROBE_METADATA_RESOLUTION_FAILED');
});
test('hostile relative/environment/error getters are never evaluated', async t => {
  let calls = 0; const hostile = { get toString() { calls++; throw Error('private'); } };
  await assert.rejects(fetchProbeMetadata(hostile, {}), { message: 'PROBE_GITHUB_PATH' });
  const env = { get RUNNER_TEMP() { calls++; throw Error('private'); } };
  respond(t, () => response(values[1])); await fetchProbeMetadata(paths[1], env); assert.equal(readProbeMetadataEvidence(env), null);
  assert.doesNotThrow(() => recordProbeMetadataGateFailure(hostile, env)); assert.equal(calls, 0);
});
test('hostile transport Error accessors do not hide original exception or leak values', async t => {
  const s = scope(t); let count = 0;
  const error = Object.defineProperties({}, { code: { get() { count++; throw Error('private'); } }, cause: { get() { count++; return 'private'; } } });
  respond(t, () => { throw error; }); await assert.rejects(fetchProbeMetadata(paths[1], s.env), actual => actual === error);
  assert.equal(count, 0); assert.equal(requestRow(s.env).classification, 'TRANSPORT_NETWORK');
});

for (const [name, mutate] of [
  ['extra fields', value => { value.token = 'must reject'; }],
  ['wrong provider', value => { value.provider = 'Other'; }],
  ['forged attempt count', value => { value.request_count++; }],
  ['retry claim', value => { value.retry_count = 1; }],
  ['unsafe endpoint', value => { forgeRows(value, row => { row.endpoint_path += '?token=private'; }); }],
  ['query value in query names', value => { forgeRows(value, row => { row.query_names = ['token=private']; }); }],
  ['status inconsistency', value => { forgeRows(value, row => { row.http_status = 403; }); }],
  ['unsafe field name', value => { forgeRows(value, row => { row.expected_fields.push('private value'); }); }],
  ['unsafe error code', value => { forgeRows(value, row => { row.error_code = 'private value'; }); }],
  ['invented rate classification', value => { forgeRows(value, row => { row.rate_limit = 'AUTHORIZED'; }); }],
  ['forged 429 rate evidence', value => { forgeRows(value, row => { row.rate_limit = 'HTTP_429'; }); }],
  ['rate classification without supporting safe header observations', value => { forgeRows(value, row => { row.rate_limit = 'PRIMARY_LIMIT_EXHAUSTED'; }); }],
  ['raw rate header value', value => { forgeRows(value, row => { row.rate_limit_remaining = 'private-value'; }); }],
  ['missing list inconsistent with PASS', value => { forgeRows(value, row => { row.missing_fields = ['object.sha']; }); }],
  ['rewritten sequence', value => { value.events[1].sequence = 1; }],
  ['finish before start', value => { value.events.reverse(); }],
  ['injected token in origin', value => { value.api_origin += '/private'; }]
]) test('strict artifact validator rejects ' + name, async t => {
  const s = await proof(t); const value = clone(s.proof); mutate(value);
  assert.throws(() => validateProbeMetadataEvidence(value), { message: 'PROBE_METADATA_EVIDENCE_INVALID' });
});
test('strict evidence validator does not execute getters/toJSON or hostile proxies', async t => {
  const s = await proof(t); let calls = 0;
  for (const value of [Object.defineProperty(clone(s.proof), 'provider', { get() { calls++; return 'GitHub'; } }),
    Object.assign(clone(s.proof), { toJSON() { calls++; return s.proof; } }),
    new Proxy({}, { ownKeys() { throw Error('private'); } })]) {
    assert.throws(() => validateProbeMetadataEvidence(value), { message: 'PROBE_METADATA_EVIDENCE_INVALID' });
  }
  assert.equal(calls, 0);
});
test('canonical key order does not alter evidence validation', async t => {
  const s = await proof(t); assert.deepEqual(validateProbeMetadataEvidence(JSON.parse(canonical(s.proof))), s.proof);
});
test('persisted sanitized journal is readable independently of the writer memory state', async t => {
  const s = await proof(t), other = scope(t); fs.mkdirSync(path.dirname(other.file)); fs.copyFileSync(s.file, other.file);
  assert.deepEqual(readProbeMetadataEvidence(other.env), s.proof);
});
test('malformed existing journal cannot enter artifact evidence', t => {
  const s = scope(t); fs.mkdirSync(path.dirname(s.file)); fs.writeFileSync(s.file, '{invalid');
  assert.throws(() => readProbeMetadataEvidence(s.env), { message: 'PROBE_METADATA_EVIDENCE_INVALID' });
});
