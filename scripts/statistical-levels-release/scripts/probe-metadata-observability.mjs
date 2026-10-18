// PROBE-only public metadata transport. This journal contains enums and public identities,
// never response bodies, credentials, arbitrary headers, or exception messages.
import fs from 'node:fs';
import path from 'node:path';
import { P, canonical, need } from './release-core.mjs';

export const PROBE_METADATA_SCHEMA = 'statistical-levels.probe-metadata-evidence.v1';
const EVENT_SCHEMA = 'statistical-levels.probe-metadata-event.v1';
const BASE = 'https://api.github.com/repos/' + P.repository;
const LIMIT = 2_000_000;
const MAX_EVENTS = 512;
const STATES = new Map();
const RUN_FIELDS = ['repository.full_name', 'repository.id', 'repository.owner.id', 'repository.private',
  'head_repository.full_name', 'head_repository.id', 'head_repository.owner.id', 'head_repository.private',
  'id', 'run_attempt', 'name', 'head_sha', 'head_branch', 'path', 'event'];
const SPECS = [
  { pattern: /^\/actions\/runs\/[1-9][0-9]*$/, purpose: 'RUN_IDENTITY', fields: RUN_FIELDS },
  { pattern: /^\/git\/ref\/heads\/vercel-deployment$/, purpose: 'BRANCH_FRESHNESS', fields: ['object.sha'] },
  { pattern: /^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}\?per_page=1$/, purpose: 'ANCESTRY', fields: ['base_commit.sha', 'merge_base_commit.sha', 'behind_by', 'ahead_by', 'status'] },
  { pattern: /^\/deployments\?sha=[a-f0-9]{40}&per_page=100$/, purpose: 'FIXTURE_DEPLOYMENTS', fields: ['array', 'items.id'] },
  { pattern: /^\/deployments\/[1-9][0-9]*\/statuses\?per_page=100$/, purpose: 'FIXTURE_DEPLOYMENT_STATUSES', fields: ['array', 'items.id'] },
  { pattern: /^\/commits\/[a-f0-9]{40}\/statuses\?per_page=100$/, purpose: 'FIXTURE_COMMIT_STATUSES', fields: ['array', 'items.id'] }
];
const HTTP_CLASSES = ['HTTP_403', 'HTTP_404', 'HTTP_429', 'HTTP_5XX', 'HTTP_OTHER_NON_SUCCESS'];
const RESULTS = ['PENDING', 'JSON_PARSED', 'EXPECTED_FIELD_MISSING', 'MALFORMED_JSON', 'RESPONSE_TOO_LARGE',
  ...HTTP_CLASSES, 'TRANSPORT_DNS', 'TRANSPORT_TIMEOUT', 'TRANSPORT_REDIRECT', 'TRANSPORT_NETWORK', 'RESPONSE_READ_FAILURE'];
const CONTENT = ['NOT_OBSERVED', 'JSON', 'HTML', 'TEXT', 'OTHER', 'MISSING'];
const RATE = ['NOT_OBSERVED', 'HTTP_429', 'PRIMARY_LIMIT_EXHAUSTED', 'RETRY_AFTER_PRESENT', 'NOT_INDICATED', 'UNKNOWN'];
const REMAINING = ['NOT_OBSERVED', 'MISSING', 'ZERO', 'POSITIVE', 'UNRECOGNIZED'];
const RETRY_AFTER = ['NOT_OBSERVED', 'MISSING', 'BOUNDED_SECONDS', 'UNRECOGNIZED'];
const GATE_CODES = new Set([
  'PROBE_METADATA_RESOLUTION_FAILED', 'PROBE_GITHUB_PATH', 'PROBE_PUBLIC_METADATA_UNAVAILABLE', 'PROBE_METADATA_SIZE',
  'PUBLIC_REPOSITORY_IDENTITY', 'PUBLIC_RUN_IDENTITY', 'WORKFLOW_BRANCH_DRIFT', 'CANDIDATE_ANCESTRY_UNRESOLVED', 'CANDIDATE_UNRELATED',
  'DEPLOYMENT_METADATA_INCOMPLETE', 'GITHUB_DEPLOYMENT_ID', 'PROBE_DEPLOYMENT_METADATA_INCOMPLETE', 'PROBE_COMMIT_METADATA_INCOMPLETE',
  'PROBE_STATUS_SETS', 'PROBE_VERCEL_ID_BINDING', 'PROBE_DEPLOYMENT_STATUS_INCOMPLETE', 'PROBE_DEPLOYMENT_LINK',
  'PROBE_PREVIEW_LINKS', 'PROBE_PREVIEW_METADATA_AMBIGUOUS', 'PROBE_TIMESTAMP',
  'PROBE_FIXTURE_REGISTRY_FIELDS', 'PROBE_FIXTURE_REGISTRY_VALUES', 'PROBE_FIXTURE_REGISTRY_IDENTITY',
  'PROBE_FIXTURE_REGISTRY_PROJECT', 'PROBE_FIXTURE_REGISTRY_ENVIRONMENT', 'PROBE_FIXTURE_REGISTRY_ORIGIN',
  'PROBE_FIXTURE_REGISTRY_FILE', 'PROBE_FIXTURE_REGISTRY_HASH', 'PROBE_FIXTURE_REGISTRY_OPERATION',
  'PROBE_UNRESOLVED_TARGET', 'PROBE_UNREGISTERED_GIT_SHA', 'PROBE_UNREGISTERED_DEPLOYMENT', 'PROBE_UNREGISTERED_ORIGIN',
  'PROBE_INPUT_FIELDS', 'PROBE_INPUT_TYPE', 'PROBE_OPERATION_REQUIRED', 'PROBE_RELEASE_INPUT_FORBIDDEN', 'PROBE_FIXTURE_IDENTITY',
  'WORKFLOW_EXECUTION_SHA', 'CHECKOUT_WORKFLOW_DRIFT', 'SOURCE_MANIFEST_PATH', 'SOURCE_SYMLINK', 'SOURCE_BUNDLE_MISMATCH'
]);
const EVENT_KEYS = ['schema_version', 'sequence', 'kind', 'request_id', 'purpose', 'endpoint_path', 'query_names',
  'attempted', 'http_status', 'content_type', 'classification', 'expected_fields', 'missing_fields',
  'rate_limit', 'rate_limit_remaining', 'retry_after', 'error_code'];
const SUMMARY_KEYS = ['schema_version', 'provider', 'api_origin', 'request_count', 'completed_request_count', 'retry_count',
  'capture_status', 'journal_persistence', 'events', 'requests', 'gate_failures'];

function own(value, key) {
  try { const descriptor = value && Object.getOwnPropertyDescriptor(value, key); return descriptor && 'value' in descriptor ? descriptor.value : undefined; }
  catch { return undefined; }
}
function specFor(relative) {
  need(typeof relative === 'string' && relative.length < 512, 'PROBE_GITHUB_PATH');
  const spec = SPECS.find(item => item.pattern.test(relative));
  need(spec, 'PROBE_GITHUB_PATH');
  return spec;
}
function descriptor(spec, relative) {
  const url = new URL(BASE + relative);
  return { purpose: spec.purpose, endpoint_path: url.pathname, query_names: [...url.searchParams.keys()] };
}
function journalPath(env) {
  const temp = own(env, 'RUNNER_TEMP');
  return typeof temp === 'string' && path.isAbsolute(temp) && !temp.includes('\0') ?
    path.join(temp, 'statistical-levels-identity-probe', 'metadata-resolution.jsonl') : null;
}
function safeClone(value, depth = 0, count = { value: 0 }) {
  need(depth < 20 && ++count.value < 40_000, 'PROBE_METADATA_EVIDENCE_INVALID');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') { need(Number.isSafeInteger(value), 'PROBE_METADATA_EVIDENCE_INVALID'); return value; }
  if (typeof value === 'string') { need(value.length < 2048, 'PROBE_METADATA_EVIDENCE_INVALID'); return value; }
  need(value && typeof value === 'object', 'PROBE_METADATA_EVIDENCE_INVALID');
  const proto = Object.getPrototypeOf(value);
  need(proto === Object.prototype || proto === null || Array.isArray(value) && proto === Array.prototype, 'PROBE_METADATA_EVIDENCE_INVALID');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  need(Reflect.ownKeys(descriptors).every(key => typeof key === 'string' && key !== 'toJSON' && 'value' in descriptors[key]), 'PROBE_METADATA_EVIDENCE_INVALID');
  if (Array.isArray(value)) {
    need(value.length <= MAX_EVENTS && Object.keys(descriptors).length === value.length + 1, 'PROBE_METADATA_EVIDENCE_INVALID');
    return value.map((_, index) => safeClone(descriptors[index].value, depth + 1, count));
  }
  return Object.fromEntries(Object.entries(descriptors).map(([key, entry]) => [key, safeClone(entry.value, depth + 1, count)]));
}
function exact(value, keys) {
  need(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)), 'PROBE_METADATA_EVIDENCE_INVALID');
}
function same(left, right) { return canonical(left).equals(canonical(right)); }
function endpointSpec(event) {
  const prefix = '/repos/' + P.repository;
  need(typeof event.endpoint_path === 'string' && event.endpoint_path.startsWith(prefix), 'PROBE_METADATA_EVIDENCE_INVALID');
  const relative = event.endpoint_path.slice(prefix.length);
  const purpose = event.purpose;
  const spec = SPECS.find(item => item.purpose === purpose);
  need(spec, 'PROBE_METADATA_EVIDENCE_INVALID');
  // Reconstruct only fixed query values; the SHA query value is intentionally not retained.
  const query = purpose === 'FIXTURE_DEPLOYMENTS' ? '?sha=' + '0'.repeat(40) + '&per_page=100' :
    purpose === 'ANCESTRY' ? '?per_page=1' : purpose.endsWith('_STATUSES') ? '?per_page=100' : '';
  need(relative.length < 512 && spec.pattern.test(relative + query), 'PROBE_METADATA_EVIDENCE_INVALID');
  need(same(event.query_names, query ? [...new URL(BASE + relative + query).searchParams.keys()] : []), 'PROBE_METADATA_EVIDENCE_INVALID');
  return spec;
}
function validateEvent(event) {
  exact(event, EVENT_KEYS);
  need(event.schema_version === EVENT_SCHEMA && Number.isSafeInteger(event.sequence) && event.sequence > 0 &&
    ['START', 'FINISH', 'GATE_FAILURE'].includes(event.kind), 'PROBE_METADATA_EVIDENCE_INVALID');
  if (event.kind === 'GATE_FAILURE') {
    need(event.request_id === null && event.purpose === 'RESOLUTION_GATE' && event.endpoint_path === null &&
      same(event.query_names, []) && event.http_status === null && event.content_type === 'NOT_OBSERVED' &&
      event.classification === 'LOGICAL_GATE_FAILURE' && same(event.expected_fields, []) && same(event.missing_fields, []) &&
      event.rate_limit === 'NOT_OBSERVED' && event.rate_limit_remaining === 'NOT_OBSERVED' && event.retry_after === 'NOT_OBSERVED' &&
      GATE_CODES.has(event.error_code) && typeof event.attempted === 'boolean', 'PROBE_METADATA_EVIDENCE_INVALID');
    return;
  }
  const spec = endpointSpec(event);
  need(Number.isSafeInteger(event.request_id) && event.request_id > 0 && event.attempted === true &&
    CONTENT.includes(event.content_type) && RESULTS.includes(event.classification) && RATE.includes(event.rate_limit) &&
    REMAINING.includes(event.rate_limit_remaining) && RETRY_AFTER.includes(event.retry_after) &&
    same(event.expected_fields, spec.fields) && Array.isArray(event.missing_fields) &&
    same(event.missing_fields, spec.fields.filter(field => event.missing_fields.includes(field))) &&
    (event.http_status === null || Number.isInteger(event.http_status) && event.http_status >= 100 && event.http_status <= 599), 'PROBE_METADATA_EVIDENCE_INVALID');
  if (event.kind === 'START') {
    need(event.classification === 'PENDING' && event.http_status === null && event.content_type === 'NOT_OBSERVED' &&
      event.rate_limit === 'NOT_OBSERVED' && event.rate_limit_remaining === 'NOT_OBSERVED' && event.retry_after === 'NOT_OBSERVED' &&
      same(event.missing_fields, []) && event.error_code === null, 'PROBE_METADATA_EVIDENCE_INVALID');
    return;
  }
  const result = event.classification;
  need(result !== 'PENDING', 'PROBE_METADATA_EVIDENCE_INVALID');
  if (HTTP_CLASSES.includes(result)) {
    need(event.http_status !== null && !(event.http_status >= 200 && event.http_status < 300) &&
      result === httpClass(event.http_status) && event.error_code === 'PROBE_PUBLIC_METADATA_UNAVAILABLE', 'PROBE_METADATA_EVIDENCE_INVALID');
  } else if (['JSON_PARSED', 'EXPECTED_FIELD_MISSING', 'MALFORMED_JSON', 'RESPONSE_TOO_LARGE', 'RESPONSE_READ_FAILURE'].includes(result)) {
    need(event.http_status >= 200 && event.http_status < 300, 'PROBE_METADATA_EVIDENCE_INVALID');
    const expected = result === 'JSON_PARSED' ? null : result === 'EXPECTED_FIELD_MISSING' ? 'PROBE_METADATA_EXPECTED_FIELD_MISSING' :
      result === 'MALFORMED_JSON' ? 'PROBE_METADATA_MALFORMED_JSON' : result === 'RESPONSE_TOO_LARGE' ? 'PROBE_METADATA_SIZE' : 'PROBE_METADATA_RESPONSE_READ_FAILED';
    need(event.error_code === expected, 'PROBE_METADATA_EVIDENCE_INVALID');
  } else {
    need(event.http_status === null && event.error_code === result && event.content_type === 'NOT_OBSERVED' &&
      event.rate_limit === 'NOT_OBSERVED' && event.rate_limit_remaining === 'NOT_OBSERVED' && event.retry_after === 'NOT_OBSERVED', 'PROBE_METADATA_EVIDENCE_INVALID');
  }
  need((result === 'EXPECTED_FIELD_MISSING') === (event.missing_fields.length > 0), 'PROBE_METADATA_EVIDENCE_INVALID');
  if (event.http_status !== null) {
    need(event.content_type !== 'NOT_OBSERVED' && event.rate_limit_remaining !== 'NOT_OBSERVED' && event.retry_after !== 'NOT_OBSERVED' &&
      event.rate_limit === rateClass(event.http_status, event.rate_limit_remaining, event.retry_after), 'PROBE_METADATA_EVIDENCE_INVALID');
  }
}
function derive(events, persistence) {
  const requests = [], gateFailures = [];
  for (const [index, event] of events.entries()) {
    validateEvent(event);
    need(event.sequence === index + 1, 'PROBE_METADATA_EVIDENCE_INVALID');
    if (event.kind === 'START') {
      need(event.request_id === requests.length + 1, 'PROBE_METADATA_EVIDENCE_INVALID');
      requests.push({ ...event, finish_sequence: null });
    } else if (event.kind === 'FINISH') {
      const start = requests[event.request_id - 1];
      need(start && start.finish_sequence === null && start.sequence < event.sequence &&
        ['purpose', 'endpoint_path', 'query_names', 'expected_fields'].every(key => same(start[key], event[key])), 'PROBE_METADATA_EVIDENCE_INVALID');
      requests[event.request_id - 1] = { ...event, sequence: start.sequence, finish_sequence: event.sequence };
    } else {
      need(event.attempted === (requests.length > 0), 'PROBE_METADATA_EVIDENCE_INVALID');
      gateFailures.push(event);
    }
  }
  const completed = requests.filter(item => item.finish_sequence !== null).length;
  return { schema_version: PROBE_METADATA_SCHEMA, provider: 'GitHub', api_origin: 'https://api.github.com',
    request_count: requests.length, completed_request_count: completed, retry_count: 0,
    capture_status: completed === requests.length && persistence === 'PASS' ? 'COMPLETE' : 'PARTIAL',
    journal_persistence: persistence, events, requests, gate_failures: gateFailures };
}
export function validateProbeMetadataEvidence(value) {
  try {
    const safe = safeClone(value);
    exact(safe, SUMMARY_KEYS);
    need(Array.isArray(safe.events) && safe.events.length > 0 && safe.events.length <= MAX_EVENTS &&
      ['PASS', 'FAILED'].includes(safe.journal_persistence), 'PROBE_METADATA_EVIDENCE_INVALID');
    const expected = derive(safe.events, safe.journal_persistence);
    need(same(safe, expected), 'PROBE_METADATA_EVIDENCE_INVALID');
    return expected;
  } catch { throw new Error('PROBE_METADATA_EVIDENCE_INVALID'); }
}
function diskEvents(file) {
  const stat = fs.lstatSync(file);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.size <= LIMIT, 'PROBE_METADATA_EVIDENCE_INVALID');
  const text = fs.readFileSync(file, 'utf8');
  need(text.length <= LIMIT, 'PROBE_METADATA_EVIDENCE_INVALID');
  const records = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  need(records.length <= MAX_EVENTS, 'PROBE_METADATA_EVIDENCE_INVALID');
  return records;
}
function stateFor(file) {
  if (!file) return null;
  if (!STATES.has(file)) {
    const state = { events: [], persistence: 'PASS' };
    try { state.events = diskEvents(file); derive(state.events, 'PASS'); }
    catch (error) { if (own(error, 'code') !== 'ENOENT') state.persistence = 'FAILED'; }
    STATES.set(file, state);
  }
  return STATES.get(file);
}
function append(state, file, value) {
  if (!state) return;
  if (state.events.length >= MAX_EVENTS) { state.persistence = 'FAILED'; return; }
  const event = { schema_version: EVENT_SCHEMA, sequence: state.events.length + 1, ...value };
  state.events.push(event);
  try {
    validateEvent(event);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const directory = fs.lstatSync(path.dirname(file));
    need(directory.isDirectory() && !directory.isSymbolicLink(), 'PROBE_METADATA_JOURNAL');
    const fd = fs.openSync(file, fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, Buffer.concat([canonical(event), Buffer.from('\n')])); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  } catch { state.persistence = 'FAILED'; }
}
function header(response, name) {
  try { const value = response.headers.get(name); return typeof value === 'string' && value.length < 256 ? value : null; }
  catch { return null; }
}
function contentType(response) {
  const value = header(response, 'content-type');
  if (value === null) return 'MISSING';
  const mime = value.split(';', 1)[0].trim().toLowerCase();
  return mime === 'application/json' || /^application\/[-a-z0-9.]+\+json$/.test(mime) ? 'JSON' :
    mime === 'text/html' ? 'HTML' : mime.startsWith('text/') ? 'TEXT' : 'OTHER';
}
function rateClass(status, remaining, retry) {
  if (status === 429) return 'HTTP_429';
  if (status === 403 && remaining === 'ZERO') return 'PRIMARY_LIMIT_EXHAUSTED';
  if ((status === 403 || status >= 500) && retry === 'BOUNDED_SECONDS') return 'RETRY_AFTER_PRESENT';
  return status === 403 ? 'UNKNOWN' : 'NOT_INDICATED';
}
function rateFacts(response) {
  const remaining = header(response, 'x-ratelimit-remaining'), retry = header(response, 'retry-after');
  return { rate_limit_remaining: remaining === null ? 'MISSING' : remaining === '0' ? 'ZERO' :
    /^[1-9][0-9]{0,9}$/.test(remaining) ? 'POSITIVE' : 'UNRECOGNIZED',
  retry_after: retry === null ? 'MISSING' : /^\d{1,10}$/.test(retry) ? 'BOUNDED_SECONDS' : 'UNRECOGNIZED' };
}
function httpClass(status) {
  return [403, 404, 429].includes(status) ? 'HTTP_' + status : status >= 500 ? 'HTTP_5XX' : 'HTTP_OTHER_NON_SUCCESS';
}
function transportClass(error) {
  const code = own(error, 'code') ?? own(own(error, 'cause'), 'code');
  let name = own(error, 'name');
  try { if (!name) name = Object.getOwnPropertyDescriptor(DOMException.prototype, 'name').get.call(error); } catch { /* Not a native DOMException. */ }
  if (['ENOTFOUND', 'EAI_AGAIN', 'ENODATA'].includes(code)) return 'TRANSPORT_DNS';
  if (['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(code) ||
    ['AbortError', 'TimeoutError'].includes(name)) return 'TRANSPORT_TIMEOUT';
  if (['UND_ERR_REDIRECT', 'ERR_FR_REDIRECTION_FAILURE', 'ERR_HTTP_REDIRECT'].includes(code) ||
    ['unexpected redirect', 'redirect count exceeded'].includes(own(own(error, 'cause'), 'message'))) return 'TRANSPORT_REDIRECT';
  return 'TRANSPORT_NETWORK';
}
function missingFields(value, spec) {
  if (spec.fields[0] === 'array') {
    if (!Array.isArray(value)) return ['array'];
    return value.some(item => !item || !Number.isSafeInteger(item.id) || item.id <= 0) ? ['items.id'] : [];
  }
  return spec.fields.filter(field => {
    let current = value;
    for (const key of field.split('.')) {
      if (!current || typeof current !== 'object' || !Object.hasOwn(current, key) || current[key] === null) return true;
      current = current[key];
    }
    return false;
  });
}

export async function fetchProbeMetadata(relative, env = process.env) {
  const spec = specFor(relative), file = journalPath(env), state = stateFor(file);
  const row = { request_id: (state?.events.filter(item => item.kind === 'START').length ?? 0) + 1,
    ...descriptor(spec, relative), attempted: true, http_status: null, content_type: 'NOT_OBSERVED',
    classification: 'PENDING', expected_fields: spec.fields, missing_fields: [], rate_limit: 'NOT_OBSERVED',
    rate_limit_remaining: 'NOT_OBSERVED', retry_after: 'NOT_OBSERVED', error_code: null };
  append(state, file, { kind: 'START', ...row });
  let stage = 'TRANSPORT';
  try {
    const response = await fetch(BASE + relative, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    row.http_status = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
    row.content_type = contentType(response); Object.assign(row, rateFacts(response));
    row.rate_limit = rateClass(row.http_status, row.rate_limit_remaining, row.retry_after);
    stage = 'HTTP';
    if (!response.ok) {
      row.classification = httpClass(row.http_status); row.error_code = 'PROBE_PUBLIC_METADATA_UNAVAILABLE';
      throw new Error('PROBE_PUBLIC_METADATA_UNAVAILABLE');
    }
    stage = 'READ';
    const text = await response.text();
    if (text.length >= LIMIT) { row.classification = 'RESPONSE_TOO_LARGE'; row.error_code = 'PROBE_METADATA_SIZE'; throw new Error('PROBE_METADATA_SIZE'); }
    stage = 'PARSE';
    let value;
    try { value = JSON.parse(text); }
    catch (error) { row.classification = 'MALFORMED_JSON'; row.error_code = 'PROBE_METADATA_MALFORMED_JSON'; throw error; }
    stage = 'STRUCTURE';
    row.missing_fields = missingFields(value, spec);
    row.classification = row.missing_fields.length ? 'EXPECTED_FIELD_MISSING' : 'JSON_PARSED';
    // Structural observations do not duplicate or reorder the unchanged consumer gates.
    row.error_code = row.missing_fields.length ? 'PROBE_METADATA_EXPECTED_FIELD_MISSING' : null;
    append(state, file, { kind: 'FINISH', ...row });
    return value;
  } catch (error) {
    if (stage === 'TRANSPORT') { row.classification = transportClass(error); row.error_code = row.classification; }
    else if (stage === 'READ' && row.classification === 'PENDING') { row.classification = 'RESPONSE_READ_FAILURE'; row.error_code = 'PROBE_METADATA_RESPONSE_READ_FAILED'; }
    append(state, file, { kind: 'FINISH', ...row });
    throw error;
  }
}

// Called only by PROBE metadata validation catches. Unknown text is reduced to one static code.
export function recordProbeMetadataGateFailure(code, env = process.env) {
  try {
    const file = journalPath(env), state = stateFor(file);
    append(state, file, { kind: 'GATE_FAILURE', request_id: null, purpose: 'RESOLUTION_GATE', endpoint_path: null,
      query_names: [], attempted: Boolean(state?.events.some(item => item.kind === 'START')), http_status: null,
      content_type: 'NOT_OBSERVED', classification: 'LOGICAL_GATE_FAILURE', expected_fields: [], missing_fields: [],
      rate_limit: 'NOT_OBSERVED', rate_limit_remaining: 'NOT_OBSERVED', retry_after: 'NOT_OBSERVED',
      error_code: typeof code === 'string' && GATE_CODES.has(code) ? code : 'PROBE_METADATA_RESOLUTION_FAILED' });
  } catch { /* Observability must never replace the original failure. */ }
}

export function readProbeMetadataEvidence(env = process.env) {
  const file = journalPath(env);
  if (!file) return null;
  try {
    const memory = STATES.get(file);
    const events = memory ? memory.events : diskEvents(file);
    if (!events.length) return null;
    return validateProbeMetadataEvidence(derive(events, memory?.persistence ?? 'PASS'));
  } catch (error) {
    if (own(error, 'code') === 'ENOENT') return null;
    throw new Error('PROBE_METADATA_EVIDENCE_INVALID');
  }
}
