// PROBE only: safe interception diagnostics never decide whether a request continues or fails.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PROBE_TOKEN_BUDGET_ERRORS } from './probe-token-budget.mjs';

export const INTERCEPTION_EVIDENCE_SCHEMA = 'statistical-levels.probe-interception-failures.v1';
export const INTERCEPTION_EVIDENCE_FILE = 'interception-failures.json';
const STAGES = ['REDIRECT_LOOKUP', 'REQUEST_URL_PARSING', 'TOKEN_ACQUISITION', 'HEADER_SCOPE_VALIDATION',
  'REQUEST_CONTINUATION', 'FAIL_REQUEST_FALLBACK', 'UNKNOWN'];
const LIFECYCLES = ['ACTIVE', 'CLOSING', 'CLOSED', 'CONTEXT_CLOSING', 'BROWSER_CLOSING', 'UNKNOWN'];
const ORIGIN_CLASSES = ['EXACT_PREVIEW', 'CROSS_ORIGIN', 'NON_HTTP', 'INVALID', 'NONE', 'UNKNOWN'];
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH', 'UNKNOWN'];
const TYPES = ['Document', 'Stylesheet', 'Image', 'Media', 'Font', 'Script', 'TextTrack', 'XHR', 'Fetch',
  'Prefetch', 'EventSource', 'WebSocket', 'Manifest', 'SignedExchange', 'Ping', 'CSPViolationReport', 'Preflight', 'Other', 'UNKNOWN'];
const ISSUES = ['INPUT_METADATA_UNAVAILABLE', 'PERSISTENCE_WRITE_FAILED'];
const HEADER_CODES = ['CROSS_ORIGIN_REDIRECT', 'CREDENTIAL_DESTINATION', 'QA_ORIGIN', 'PREVIEW_ORIGIN'];
const TOKEN_CODES = [...Object.values(PROBE_TOKEN_BUDGET_ERRORS), 'OIDC_LEASE_CLOSED', 'OIDC_REFRESH_EXPIRED', 'OIDC_TOKEN_FORMAT'];
const CODES = {
  REDIRECT_LOOKUP: ['REDIRECT_LOOKUP_ERROR'], REQUEST_URL_PARSING: ['URL_PARSE_ERROR'],
  TOKEN_ACQUISITION: [...TOKEN_CODES, 'TOKEN_SOURCE_ERROR'],
  HEADER_SCOPE_VALIDATION: [...HEADER_CODES, 'HEADER_SCOPE_REJECTION'],
  REQUEST_CONTINUATION: ['CONTINUE_REQUEST_ERROR'], FAIL_REQUEST_FALLBACK: ['FAIL_REQUEST_ERROR'], UNKNOWN: ['INTERCEPTION_UNKNOWN_ERROR'],
};
const FIELDS = ['failure_stage', 'safe_error_code', 'page_id', 'page_lifecycle', 'request_sequence', 'resource_type',
  'method', 'destination_origin_class', 'redirected_from_origin_class', 'same_origin_target', 'redirect_present', 'path_sha256'];
const valid = condition => { if (!condition) throw new Error('INTERCEPTION_EVIDENCE_INVALID'); };
// Inspect only own data descriptors. Never invoke getters, toJSON, coercions or a thrown object's stack.
function own(value, key) {
  try { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined; }
  catch { return undefined; }
}
function exactData(value, keys) {
  valid(value !== null && typeof value === 'object' && !Array.isArray(value));
  let actual;
  try { actual = Reflect.ownKeys(value); } catch { valid(false); }
  valid(actual.length === keys.length && actual.every(key => typeof key === 'string' && keys.includes(key)));
  const copy = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    valid(descriptor && Object.hasOwn(descriptor, 'value'));
    copy[key] = descriptor.value;
  }
  return copy;
}
function dataArray(value, maximum) {
  valid(Array.isArray(value));
  const length = own(value, 'length');
  valid(Number.isSafeInteger(length) && length >= 0 && length <= maximum);
  valid(Reflect.ownKeys(value).length === length + 1);
  const result = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    valid(descriptor && Object.hasOwn(descriptor, 'value')); result.push(descriptor.value);
  }
  return result;
}
const member = (values, value, fallback) => typeof value === 'string' && values.includes(value) ? value : fallback;
function parsedURL(value) {
  if (typeof value !== 'string' || value.length > 65536) return null;
  try { return new URL(value); } catch { return null; }
}
function originClass(value, origin, absent = false) {
  if (absent) return 'NONE';
  if (typeof value !== 'string') return 'UNKNOWN';
  const parsed = parsedURL(value);
  if (!parsed) return 'INVALID';
  if (!['https:', 'http:'].includes(parsed.protocol)) return 'NON_HTTP';
  return typeof origin === 'string' && parsed.origin === origin ? 'EXACT_PREVIEW' : 'CROSS_ORIGIN';
}
function safeCode(stage, error) {
  const allowlist = stage === 'HEADER_SCOPE_VALIDATION' ? HEADER_CODES : stage === 'TOKEN_ACQUISITION' ? TOKEN_CODES : [];
  for (const key of ['code', 'message']) {
    const value = own(error, key);
    if (typeof value === 'string' && allowlist.includes(value)) return value;
  }
  return CODES[stage].at(-1);
}
function safeRecord(input) {
  const stage = member(STAGES, own(input, 'failureStage'), 'UNKNOWN');
  const event = own(input, 'event'), request = own(event, 'request');
  const url = own(request, 'url'), origin = own(input, 'origin'), previous = own(input, 'previous');
  const parsed = parsedURL(url);
  const sequence = own(input, 'requestSequence'), pageId = own(input, 'pageId');
  const redirectId = own(event, 'redirectedRequestId');
  const redirectPresent = typeof redirectId === 'string' && redirectId.length > 0;
  return {
    failure_stage: stage, safe_error_code: safeCode(stage, own(input, 'error')),
    page_id: typeof pageId === 'string' && /^page-[1-9][0-9]{0,14}$/.test(pageId) ? pageId : 'UNKNOWN',
    page_lifecycle: member(LIFECYCLES, own(input, 'pageLifecycle'), 'UNKNOWN'),
    request_sequence: Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null,
    resource_type: member(TYPES, own(event, 'resourceType'), 'UNKNOWN'),
    method: member(METHODS, own(request, 'method'), 'UNKNOWN'),
    destination_origin_class: originClass(url, origin),
    redirected_from_origin_class: previous === null || previous === undefined ? (redirectPresent ? 'UNKNOWN' : 'NONE') : originClass(previous, origin),
    same_origin_target: parsed && typeof origin === 'string' ? parsed.origin === origin : null,
    redirect_present: redirectPresent,
    path_sha256: parsed ? createHash('sha256').update(parsed.pathname).digest('hex') : null,
  };
}
function validatedEvidence(input) {
  const value = exactData(input, ['schema_version', 'records', 'capture_issues']);
  valid(value.schema_version === INTERCEPTION_EVIDENCE_SCHEMA);
  const records = dataArray(value.records, 100000).map(inputRecord => {
    const record = exactData(inputRecord, FIELDS);
    valid(STAGES.includes(record.failure_stage) && CODES[record.failure_stage].includes(record.safe_error_code));
    valid(typeof record.page_id === 'string' && (record.page_id === 'UNKNOWN' || /^page-[1-9][0-9]{0,14}$/.test(record.page_id)));
    valid(LIFECYCLES.includes(record.page_lifecycle));
    valid(record.request_sequence === null || (Number.isSafeInteger(record.request_sequence) && record.request_sequence > 0));
    valid(TYPES.includes(record.resource_type) && METHODS.includes(record.method));
    valid(ORIGIN_CLASSES.includes(record.destination_origin_class) && ORIGIN_CLASSES.includes(record.redirected_from_origin_class));
    valid(record.same_origin_target === null || typeof record.same_origin_target === 'boolean');
    valid(typeof record.redirect_present === 'boolean');
    valid(record.path_sha256 === null || (typeof record.path_sha256 === 'string' && /^[a-f0-9]{64}$/.test(record.path_sha256)));
    valid(record.destination_origin_class !== 'EXACT_PREVIEW' || record.same_origin_target === true);
    valid(record.destination_origin_class !== 'CROSS_ORIGIN' || record.same_origin_target === false);
    return record;
  });
  const identities = new Map();
  for (const record of records) {
    if (record.page_id === 'UNKNOWN' || record.request_sequence === null) continue;
    const key = record.page_id + ':' + record.request_sequence;
    if (record.failure_stage === 'FAIL_REQUEST_FALLBACK') {
      valid(identities.get(key) === 'PRIMARY'); identities.set(key, 'FALLBACK');
    } else { valid(!identities.has(key)); identities.set(key, 'PRIMARY'); }
  }
  const issues = dataArray(value.capture_issues, ISSUES.length);
  valid(issues.every(item => typeof item === 'string' && ISSUES.includes(item)) && new Set(issues).size === issues.length);
  if (records.some(record => record.failure_stage === 'UNKNOWN' || record.page_id === 'UNKNOWN' || record.request_sequence === null)) valid(issues.includes('INPUT_METADATA_UNAVAILABLE'));
  return { schema_version: INTERCEPTION_EVIDENCE_SCHEMA, records, capture_issues: [...issues] };
}
export function validateInterceptionEvidence(input) {
  try { return validatedEvidence(input); } catch { throw new Error('INTERCEPTION_EVIDENCE_INVALID'); }
}
export function createInterceptionObservability(out) {
  const file = path.join(out, INTERCEPTION_EVIDENCE_FILE), records = [], issues = new Set();
  const snapshot = () => ({ schema_version: INTERCEPTION_EVIDENCE_SCHEMA, records: records.map(record => ({ ...record })), capture_issues: [...issues] });
  function persist() {
    try { fs.writeFileSync(file, JSON.stringify(snapshot(), null, 2) + '\n', { mode: 0o600 }); return true; }
    catch { issues.add('PERSISTENCE_WRITE_FAILED'); return false; }
  }
  persist();
  return {
    record(input) {
      const record = safeRecord(input);
      if (record.failure_stage === 'UNKNOWN' || record.page_id === 'UNKNOWN' || record.request_sequence === null) issues.add('INPUT_METADATA_UNAVAILABLE');
      records.push(record); persist();
    },
    flush() {
      if (!persist()) throw new Error('INTERCEPTION_EVIDENCE_WRITE_FAILED');
      return validateInterceptionEvidence(snapshot());
    },
  };
}
