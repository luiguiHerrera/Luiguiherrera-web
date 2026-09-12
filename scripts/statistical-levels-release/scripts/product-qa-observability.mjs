// Passive, probe-only evidence. This module never classifies application effects.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { safeEvent } from './network-accounting.mjs';

export const productQAObservabilityFiles = Object.freeze([
  'first-product-failure.json', 'product-qa-event-timeline.json', 'product-qa-phase-summary.json',
]);
const SCHEMAS = ['statistical-levels.first-product-failure.v1', 'statistical-levels.product-qa-event-timeline.v1', 'statistical-levels.product-qa-phase-summary.v1'];
const LABELS = ['rsc_non_application', 'platform_non_application', 'required_application_request_failure', 'application_console_error', 'hydration_or_application_exception', 'unclassified'];
const CONTEXT_KEYS = ['suite_id', 'test_id', 'test_name', 'assertion_id', 'action_id', 'viewport', 'route', 'source_file', 'source_line', 'source_column'];
const COUNTERS = ['raw_rsc_cancellations', 'current_classifier_required_failures', 'vercel_platform_events', 'current_classifier_application_console_errors', 'unknown_network_events', 'unknown_console_events'];
const LIFECYCLES = ['PAGE_CREATED', 'PAGE_CLOSE_START', 'PAGE_CLOSED', 'PAGE_CLOSE_ABORTED', 'BROWSER_CLOSE_START', 'BROWSER_CLOSED', 'BROWSER_CLOSE_ABORTED'];
const sha = value => createHash('sha256').update(value).digest('hex');
const nativeStackGetter = Object.getOwnPropertyDescriptor(new Error(), 'stack')?.get;
const nativePrepareStackTrace = Error.prepareStackTrace;
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const clone = value => JSON.parse(canonical(value));
const own = (value, key) => {
  if (!value || !['object', 'function'].includes(typeof value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
};
function property(value, key) {
  for (let count = 0; value && count < 8; count++, value = Object.getPrototypeOf(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor) return Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  }
  return undefined;
}
const positiveInt = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const redacted = value => `[REDACTED_SHA256:${sha(String(value))}]`;
const SENSITIVE_KEY = /(?:authorization|cookie|password|credential|secret|token|private.?key|session.?key|access.?key)/i;
const SECRET_TEXT = /(?:eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:gh[pousr]_|github_pat_|vcp_|vercel_)[A-Za-z0-9_]{16,}|(?:AKIA|ASIA)[A-Z0-9]{16}|-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----|\bBearer\s+[^\s"',;]+)/g;
function originClass(value, origin) {
  if (value === origin) return 'EXACT_PREVIEW';
  if (value === 'https://vercel.live') return 'VERCEL_PLATFORM';
  return value ? 'OTHER_ORIGIN' : 'UNKNOWN';
}
function safeURL(value, origin) {
  try {
    const url = new URL(value, origin);
    const known = ['/niveles-estadisticos', '/en/statistical-levels', '/metodologia', '/en/methodology'];
    const pathname = known.includes(url.pathname) ? url.pathname : `sha256:${sha(url.pathname)}`;
    return { origin_class: originClass(url.origin, origin), path: pathname,
      query_key_names: [...new Set([...url.searchParams.keys()].map(key => /^[a-zA-Z_][a-zA-Z0-9_-]{0,39}$/.test(key) && !SENSITIVE_KEY.test(key) ? key : `sha256:${sha(key)}`))].sort() };
  } catch { return { origin_class: 'UNKNOWN', path: null, query_key_names: [] }; }
}
function sanitizeText(value, origin) {
  if (typeof value !== 'string') return null;
  if (value.length > 32768) return redacted(value);
  let result = value.replace(SECRET_TEXT, redacted);
  result = result.replace(/\b(?:authorization|cookie|set-cookie|ACTIONS_ID_TOKEN_REQUEST_TOKEN|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)\s*[:=]\s*[^\r\n]+/gi, redacted);
  result = result.replace(/\b(?:[A-Za-z_]*(?:token|password|credential|secret|access_key|private_key)[A-Za-z_]*)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi, redacted);
  result = result.replace(/https?:\/\/[^\s<>"'\])}]+/g, match => {
    const safe = safeURL(match, origin);
    return `[URL:${safe.origin_class}:${safe.path}:query_keys=${safe.query_key_names.join(',')}]`;
  });
  result = result.replace(/(^|[\s"'=(])(\/[A-Za-z0-9_./%~-]*\?[^\s<>"'\])}]+)/g, (_, prefix, match) => {
    const safe = safeURL(match, origin);
    return `${prefix}[URL:${safe.origin_class}:${safe.path}:query_keys=${safe.query_key_names.join(',')}]`;
  });
  // Opaque high-entropy values may be credentials even without a vendor prefix.
  result = result.replace(/(?<![A-Za-z0-9_:])(?=[A-Za-z0-9_+\/-]{20,}={0,2}(?![A-Za-z0-9_+\/-]))(?=[A-Za-z0-9_+\/-]*[A-Z])(?=[A-Za-z0-9_+\/-]*[a-z])(?=[A-Za-z0-9_+\/-]*[0-9])[A-Za-z0-9_+\/-]{20,}={0,2}/g, redacted);
  return result.replace(/\u001b\[[0-9;]*m/g, '');
}
export function sanitizeProductQAValue(value, origin, depth = 0, seen = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? sanitizeText(value, origin) : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : { value_type: 'NONFINITE_NUMBER', value: String(value) };
  if (value === undefined) return { value_type: 'UNDEFINED' };
  if (typeof value === 'bigint') return { value_type: 'BIGINT', value: value.toString() };
  if (!value || typeof value !== 'object') return { value_type: 'UNSERIALIZABLE' };
  if (depth >= 8 || seen.has(value)) return { value_type: 'DEPTH_OR_CYCLE' };
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    if (value.length > 1000) return { value_type: 'ARRAY_TOO_LARGE', length: value.length };
    return Array.from({ length: value.length }, (_, index) => descriptors[index] && Object.hasOwn(descriptors[index], 'value') ? sanitizeProductQAValue(descriptors[index].value, origin, depth + 1, new Set(seen)) : { value_type: 'ACCESSOR_OR_HOLE' });
  }
  const entries = Object.entries(descriptors).filter(([, descriptor]) => descriptor.enumerable);
  if (entries.length > 1000) return { value_type: 'OBJECT_TOO_LARGE', length: entries.length };
  return Object.fromEntries(entries.map(([key, descriptor]) => {
    const safeKey = ['toJSON', '__proto__', 'constructor'].includes(key) ? `[REDACTED_KEY_SHA256:${sha(key)}]` : sanitizeText(key, origin);
    if (SENSITIVE_KEY.test(key)) return [safeKey, '[REDACTED_SENSITIVE_FIELD]'];
    return [safeKey, Object.hasOwn(descriptor, 'value') ? sanitizeProductQAValue(descriptor.value, origin, depth + 1, new Set(seen)) : { value_type: 'ACCESSOR_NOT_READ' }];
  }));
}
function sourceFile(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll('\\', '/');
  const match = normalized.match(/(?:^|\/)(scripts\/statistical-levels-release\/(?:scripts|tests)\/[A-Za-z0-9_./-]+\.(?:mjs|js|ts))/);
  return match && !match[1].split('/').includes('..') ? match[1] : null;
}
function safeViewport(value, origin) {
  if (typeof value === 'string') return { id: sanitizeText(value, origin), width: null, height: null, locale: null, mobile: null };
  if (!value || typeof value !== 'object') return null;
  return { id: sanitizeText(own(value, 'id'), origin), width: positiveInt(own(value, 'width')), height: positiveInt(own(value, 'height')),
    locale: ['es', 'en'].includes(own(value, 'locale')) ? own(value, 'locale') : null, mobile: typeof own(value, 'mobile') === 'boolean' ? own(value, 'mobile') : null };
}
function safeContext(value, current, origin) {
  const result = { ...current };
  for (const key of CONTEXT_KEYS) {
    const descriptor = value && Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) continue;
    const item = descriptor.value;
    result[key] = key === 'viewport' ? safeViewport(item, origin) : key === 'route' ? item === null ? null : safeURL(item, origin) : key === 'source_file' ? sourceFile(item) : ['source_line', 'source_column'].includes(key) ? positiveInt(item) : sanitizeText(item, origin);
  }
  return result;
}
function safeMetadata(value, origin) {
  const route = own(value, 'route');
  const id = key => {
    const item = own(value, key);
    return typeof item === 'string' ? /^[pP][0-9]{1,12}$/.test(item) ? item : `sha256:${sha(item)}` : null;
  };
  return { page_id: id('page_id'), request_id: id('request_id'),
    method: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE'].includes(own(value, 'method')) ? own(value, 'method') : null,
    viewport: safeViewport(own(value, 'viewport'), origin), route: typeof route === 'string' ? safeURL(route, origin) : null,
    console_level: ['error', 'warning', 'info', 'verbose', 'assert'].includes(own(value, 'console_level')) ? own(value, 'console_level') : null,
    console_source: ['xml', 'javascript', 'network', 'storage', 'appcache', 'rendering', 'security', 'deprecation', 'worker', 'violation', 'intervention', 'recommendation', 'other'].includes(own(value, 'console_source')) ? own(value, 'console_source') : 'UNKNOWN',
    console_text: sanitizeText(own(value, 'console_text'), origin),
    lifecycle: ['ACTIVE', 'CLOSING', 'CLOSED'].includes(own(value, 'lifecycle')) ? own(value, 'lifecycle') : 'UNKNOWN',
    source_timestamp: typeof own(value, 'source_timestamp') === 'number' && Number.isFinite(own(value, 'source_timestamp')) && own(value, 'source_timestamp') >= 0 ? own(value, 'source_timestamp') : null,
    source_clock_domain: ['CDP_NETWORK_MONOTONIC_SECONDS', 'CDP_RUNTIME_EPOCH_MILLISECONDS'].includes(own(value, 'source_clock_domain')) ? own(value, 'source_clock_domain') : 'UNKNOWN',
    request_start_context: own(value, 'request_start_context') ? safeContext(own(value, 'request_start_context'), Object.fromEntries(CONTEXT_KEYS.map(k => [k, null])), origin) : null };
}
function stackLocation(error) {
  let stack = property(error, 'stack');
  const descriptor = Object.getOwnPropertyDescriptor(error, 'stack');
  // Node 22 keeps even an assigned stack behind its shared native getter.
  // Never call an arbitrary accessor or a replaced stack formatter.
  if (stack === undefined && types.isNativeError(error) && nativeStackGetter && descriptor?.get === nativeStackGetter &&
      Error.prepareStackTrace === nativePrepareStackTrace && typeof property(error, 'name') === 'string' && typeof property(error, 'message') === 'string') stack = nativeStackGetter.call(error);
  if (typeof stack !== 'string') return null;
  for (const line of stack.split('\n').slice(1, 40)) {
    const match = line.match(/((?:file:\/\/)?[^()\s]+):(\d+):(\d+)\)?$/);
    if (!match) continue;
    const file = sourceFile(match[1]);
    if (file) return { source_file: file, source_line: Number(match[2]), source_column: Number(match[3]), provenance: 'ORIGINAL_ERROR_STACK' };
  }
  return null;
}
function underlying(error) {
  const seen = new Set(); let current = error, selected = error, selectedDepth = 0, foundAssertion = false;
  for (let depth = 0; current && typeof current === 'object' && depth < 16 && !seen.has(current); depth++) {
    seen.add(current);
    if (property(current, 'name') === 'AssertionError' || property(current, 'code') === 'ERR_ASSERTION') { selected = current; selectedDepth = depth; foundAssertion = true; }
    else if (!foundAssertion) { selected = current; selectedDepth = depth; }
    current = own(current, 'cause');
  }
  return { error: selected, depth: selectedDepth };
}
function counters(events, boundary) {
  const result = Object.fromEntries(COUNTERS.map(key => [key, { before_first_failure: 0, at_first_failure: 0, after_first_failure: 0 }]));
  for (const entry of events) {
    if (entry.event_kind !== 'RAW_EVENT') continue;
    const e = entry.raw_event;
    const side = boundary !== null && entry.sequence > boundary ? 'after_first_failure' : entry.sequence === boundary ? 'at_first_failure' : 'before_first_failure';
    const keys = [];
    if (e.kind === 'request_failure' && e.rsc && e.canceled) keys.push('raw_rsc_cancellations');
    if (entry.current_classifier_label === 'required_application_request_failure') keys.push('current_classifier_required_failures');
    if (e.origin === 'https://vercel.live' && e.path === '/_next-live/feedback/') keys.push('vercel_platform_events');
    if (entry.current_classifier_label === 'application_console_error') keys.push('current_classifier_application_console_errors');
    if (e.kind === 'request_failure') keys.push('unknown_network_events');
    if (e.kind === 'console_error') keys.push('unknown_console_events');
    for (const key of keys) result[key][side]++;
  }
  return result;
}

export function createProductQAObservability({ out, origin, codeRoot, clock = () => performance.now() }) {
  const started = clock(); let sequence = 0, lastMs = 0, current = Object.fromEntries(CONTEXT_KEYS.map(key => [key, null]));
  let first = null, productStart = null, alignment = 'PENDING', persistence = 'PENDING', persistenceFailures = 0;
  const events = [], rawDigests = [], viewports = [], issues = new Set();
  let activeViewport = null;
  const now = () => { const value = clock() - started; lastMs = Math.max(lastMs, Number.isFinite(value) ? value : lastMs); return lastMs; };
  function add(kind, metadata = null, raw = null) {
    const entry = { event_id: `pqa-${String(++sequence).padStart(8, '0')}`, sequence, relative_ms: now(), event_kind: kind,
      context: clone(current), raw_event: raw, safe_metadata: metadata, current_classifier_label: null,
      founder_adjudicated_semantic_effect: 'UNKNOWN' };
    events.push(entry); return entry;
  }
  function evidence() {
    const boundary = first?.sequence ?? null;
    const timeline = events.map(entry => ({ ...clone(entry), relative_ms_from_product_qa_start: productStart === null ? null : entry.relative_ms - productStart.relative_ms,
      temporal_classification: boundary === entry.sequence ? 'AT_FIRST_FAILURE' : boundary !== null && entry.sequence > boundary ? 'AFTER_FIRST_FAILURE' : 'BEFORE_FIRST_FAILURE' }));
    const stages = viewports.map(entry => ({ ...clone(entry), first_failure_occurred_during_viewport: boundary !== null && boundary >= entry.start_sequence && (entry.end_sequence === null || boundary <= entry.end_sequence) ? 'YES' : 'NO' }));
    return {
      firstFailure: { schema_version: SCHEMAS[0], first_product_failure_present: first ? 'YES' : 'NO', first_failure_event_sequence_boundary: boundary, failure: first ? { ...clone(first), relative_ms_from_product_qa_start: productStart === null ? null : first.relative_ms - productStart.relative_ms } : null },
      timeline: { schema_version: SCHEMAS[1], origin, first_failure_event_sequence_boundary: boundary, events: timeline },
      phaseSummary: { schema_version: SCHEMAS[2], first_failure_event_sequence_boundary: boundary, event_count: timeline.length,
        raw_event_count: rawDigests.length, classifier_alignment: alignment, classifier_semantics_changed: false,
        relative_ms_clock_basis: 'OBSERVER_START_MONOTONIC', product_qa_start_sequence: productStart?.sequence ?? null, product_qa_start_relative_ms: productStart?.relative_ms ?? null,
        temporal_order_basis: 'LOCAL_CAPTURE_SEQUENCE_NOT_PROOF_OF_BROWSER_OCCURRENCE_OR_CAUSALITY',
        temporal_classification_is_causality: false, semantic_effect: 'UNKNOWN', counters: counters(timeline, boundary), viewports: stages,
        capture_issues: [...issues].sort(), persistence_status: persistence, persistence_failure_count: persistenceFailures,
        declared_source_root_class: codeRoot ? 'ISOLATED_FIXTURE_ROOT' : 'UNKNOWN' },
    };
  }
  function flush() {
    try {
      persistence = 'PASS';
      const bundle = evidence();
      fs.mkdirSync(out, { recursive: true, mode: 0o700 });
      for (const [index, value] of Object.values(bundle).entries()) {
        const filename = path.join(out, productQAObservabilityFiles[index]);
        const temporary = filename + '.partial';
        const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW, 0o600);
        try { fs.writeFileSync(fd, canonical(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        fs.renameSync(temporary, filename);
      }
      return true;
    } catch { persistence = 'FAIL'; persistenceFailures++; issues.add('OBSERVABILITY_PERSISTENCE_FAILED'); return false; }
  }
  const guarded = (code, action, fallback) => { try { return action(); } catch { issues.add(code); return fallback; } };
  const api = {
    productStart() { return guarded('OBSERVABILITY_PRODUCT_START_FAILED', () => {
      if (productStart) return productStart.event_id;
      if (first) { issues.add('OBSERVABILITY_PRODUCT_START_AFTER_FAILURE'); return null; }
      productStart = add('PRODUCT_QA_START'); return productStart.event_id;
    }, null); },
    context(value = {}) { return guarded('OBSERVABILITY_CONTEXT_FAILED', () => { current = safeContext(value, current, origin); add('CONTEXT'); return clone(current); }, null); },
    viewportStart(viewport, detail = {}) { return guarded('OBSERVABILITY_VIEWPORT_FAILED', () => {
      const next = safeViewport(viewport, origin);
      current = safeContext({ viewport, ...(own(detail, 'route') !== undefined ? { route: own(detail, 'route') } : {}) }, current, origin);
      if (activeViewport && activeViewport.end_sequence === null) { activeViewport.end_sequence = sequence; activeViewport.result = 'OPEN_AT_NEXT_START'; }
      const event = add('VIEWPORT_START');
      activeViewport = { viewport_id: next?.id ?? `viewport-${viewports.length + 1}`, viewport: next, route: clone(current.route),
        result_scope: sanitizeText(own(detail, 'result_scope'), origin) ?? 'SUBSTAGE', start_sequence: event.sequence,
        end_sequence: null, result: 'OPEN', product_assertions_completed: false };
      viewports.push(activeViewport); return event.event_id;
    }, null); },
    viewportEnd(viewport, result, detail = {}) { return guarded('OBSERVABILITY_VIEWPORT_FAILED', () => {
      const requested = safeViewport(viewport, origin)?.id;
      const stage = requested ? [...viewports].reverse().find(item => item.viewport_id === requested && item.end_sequence === null) : activeViewport;
      if (!stage || stage.end_sequence !== null) return null;
      const event = add('VIEWPORT_END');
      stage.end_sequence = event.sequence; stage.result = ['PASS', 'FAIL', 'ABORTED'].includes(result) ? result : 'UNKNOWN';
      stage.product_assertions_completed = own(detail, 'product_assertions_completed') === true;
      if (own(detail, 'result_scope') !== undefined) stage.result_scope = sanitizeText(own(detail, 'result_scope'), origin);
      return event.event_id;
    }, null); },
    lifecycle(kind, metadata = {}) { return guarded('OBSERVABILITY_LIFECYCLE_FAILED', () => {
      if (!LIFECYCLES.includes(kind)) throw new Error('LIFECYCLE_KIND');
      return add(kind, safeMetadata(metadata, origin)).event_id;
    }, null); },
    recordEvent(rawEvent, metadata = {}) { return guarded('OBSERVABILITY_RAW_EVENT_FAILED', () => {
      // Use the unchanged raw sanitizer; do not execute the semantic classifier early.
      const safe = safeEvent(rawEvent), digest = sha(canonical(safe));
      if (![origin, 'https://vercel.live', '', 'null'].includes(safe.origin)) safe.origin = 'sha256:' + sha(safe.origin);
      const event = add('RAW_EVENT', safeMetadata(metadata, origin), clone(safe));
      rawDigests.push(digest); return event.event_id;
    }, null); },
    captureFailure(error) {
      guarded('OBSERVABILITY_FAILURE_CAPTURE_FAILED', () => {
        const entry = add(first ? 'LATER_FAILURE' : 'FIRST_FAILURE');
        if (!first) {
          // Reserve the boundary before touching any potentially hostile error object.
          first = { sequence: entry.sequence, relative_ms: entry.relative_ms, ...clone(current),
            expected: { value_type: 'UNAVAILABLE' }, actual: { value_type: 'UNAVAILABLE' },
            message: 'ORIGINAL_ERROR_DETAILS_UNAVAILABLE', error_class: 'UNKNOWN', stack_location: null, underlying_cause_depth: 0 };
          const cause = underlying(error), item = cause.error;
          first.underlying_cause_depth = cause.depth;
          for (const [key, read] of Object.entries({
            expected: () => sanitizeProductQAValue(property(item, 'expected'), origin), actual: () => sanitizeProductQAValue(property(item, 'actual'), origin),
            message: () => sanitizeText(property(item, 'message'), origin) ?? sanitizeProductQAValue(item, origin),
            error_class: () => sanitizeText(property(item, 'name'), origin) ?? typeof item, stack_location: () => stackLocation(item),
          })) guarded('OBSERVABILITY_FAILURE_CAPTURE_FAILED', () => { first[key] = read(); }, null);
        }
      }, null);
      flush(); return error;
    },
    finish(existingAccounting) { return guarded('OBSERVABILITY_ACCOUNTING_FAILED', () => {
      const ledger = own(existingAccounting, 'ledger');
      const raw = events.filter(event => event.event_kind === 'RAW_EVENT');
      const matches = Array.isArray(ledger) && ledger.length === raw.length && ledger.every((entry, index) =>
        LABELS.includes(own(entry, 'classification')) && sha(canonical(own(entry, 'event'))) === rawDigests[index]);
      alignment = matches ? 'PASS' : 'FAIL';
      if (matches) ledger.forEach((entry, index) => { raw[index].current_classifier_label = entry.classification; });
      else issues.add('OBSERVABILITY_CLASSIFIER_ALIGNMENT_FAILED');
      flush(); return evidence();
    }, null); },
    flush,
    evidence,
  };
  return api;
}

function requireSafeData(value, depth = 0) {
  if (depth > 32) throw new Error('OBSERVABILITY_EVIDENCE_DEPTH');
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error('OBSERVABILITY_EVIDENCE_TYPE');
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (key === 'length' && Array.isArray(value)) continue;
    if (!Object.hasOwn(descriptor, 'value') || key === 'toJSON' || key === '__proto__') throw new Error('OBSERVABILITY_EVIDENCE_ACCESSOR');
    requireSafeData(descriptor.value, depth + 1);
  }
}
function need(condition) { if (!condition) throw new Error('OBSERVABILITY_EVIDENCE_INVALID'); }
function keys(value, names) { need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join('\n') === [...names].sort().join('\n')); }
const hashPattern = /^[a-f0-9]{64}$/;
function validateRoute(value) {
  if (value === null) return;
  keys(value, ['origin_class', 'path', 'query_key_names']);
  need(['EXACT_PREVIEW', 'VERCEL_PLATFORM', 'OTHER_ORIGIN', 'UNKNOWN'].includes(value.origin_class));
  need(value.path === null || ['/niveles-estadisticos', '/en/statistical-levels', '/metodologia', '/en/methodology'].includes(value.path) || /^sha256:[a-f0-9]{64}$/.test(value.path));
  need(Array.isArray(value.query_key_names) && value.query_key_names.every(key => typeof key === 'string' && (/^sha256:[a-f0-9]{64}$/.test(key) || (/^[a-zA-Z_][a-zA-Z0-9_-]{0,39}$/.test(key) && !SENSITIVE_KEY.test(key)))));
  need(canonical(value.query_key_names) === canonical([...new Set(value.query_key_names)].sort()));
}
function validateViewport(value) {
  if (value === null) return;
  keys(value, ['id', 'width', 'height', 'locale', 'mobile']);
  need(value.id === null || typeof value.id === 'string');
  need(['width', 'height'].every(key => value[key] === null || positiveInt(value[key]) === value[key]));
  need([null, 'es', 'en'].includes(value.locale) && [null, true, false].includes(value.mobile));
}
function validateContext(value) {
  keys(value, CONTEXT_KEYS);
  validateViewport(value.viewport); validateRoute(value.route);
  need(value.source_file === null || sourceFile(value.source_file) === value.source_file);
  need(['source_line', 'source_column'].every(key => value[key] === null || positiveInt(value[key]) === value[key]));
  need(['suite_id', 'test_id', 'test_name', 'assertion_id', 'action_id'].every(key => value[key] === null || typeof value[key] === 'string'));
}
function validateMetadata(value) {
  if (value === null) return;
  keys(value, ['page_id', 'request_id', 'method', 'viewport', 'route', 'console_level', 'console_source', 'console_text', 'lifecycle', 'source_timestamp', 'source_clock_domain', 'request_start_context']);
  need(['page_id', 'request_id'].every(key => value[key] === null || /^(?:[pP][0-9]{1,12}|sha256:[a-f0-9]{64})$/.test(value[key])));
  need([null, 'GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE'].includes(value.method));
  validateViewport(value.viewport); validateRoute(value.route);
  need([null, 'error', 'warning', 'info', 'verbose', 'assert'].includes(value.console_level));
  need(['xml', 'javascript', 'network', 'storage', 'appcache', 'rendering', 'security', 'deprecation', 'worker', 'violation', 'intervention', 'recommendation', 'other', 'UNKNOWN'].includes(value.console_source));
  need(value.console_text === null || typeof value.console_text === 'string');
  need(['ACTIVE', 'CLOSING', 'CLOSED', 'UNKNOWN'].includes(value.lifecycle));
  need(value.source_timestamp === null || (typeof value.source_timestamp === 'number' && Number.isFinite(value.source_timestamp) && value.source_timestamp >= 0));
  need(['CDP_NETWORK_MONOTONIC_SECONDS', 'CDP_RUNTIME_EPOCH_MILLISECONDS', 'UNKNOWN'].includes(value.source_clock_domain));
  if (value.request_start_context !== null) validateContext(value.request_start_context);
}
function normalizedLedgerEvent(value, origin) {
  const event = clone(value);
  if (![origin, 'https://vercel.live', '', 'null'].includes(event.origin) && !/^sha256:[a-f0-9]{64}$/.test(event.origin)) event.origin = 'sha256:' + sha(event.origin);
  return event;
}
export function validateProductQAObservabilityEvidence(input, origin, existingAccounting) {
  requireSafeData(input); keys(input, ['firstFailure', 'timeline', 'phaseSummary']);
  const { firstFailure: first, timeline, phaseSummary: summary } = input;
  keys(first, ['schema_version', 'first_product_failure_present', 'first_failure_event_sequence_boundary', 'failure']);
  keys(timeline, ['schema_version', 'origin', 'first_failure_event_sequence_boundary', 'events']);
  keys(summary, ['schema_version', 'first_failure_event_sequence_boundary', 'event_count', 'raw_event_count', 'classifier_alignment', 'classifier_semantics_changed', 'relative_ms_clock_basis', 'product_qa_start_sequence', 'product_qa_start_relative_ms', 'temporal_order_basis', 'temporal_classification_is_causality', 'semantic_effect', 'counters', 'viewports', 'capture_issues', 'persistence_status', 'persistence_failure_count', 'declared_source_root_class']);
  need(first.schema_version === SCHEMAS[0] && timeline.schema_version === SCHEMAS[1] && summary.schema_version === SCHEMAS[2]);
  need(typeof timeline.origin === 'string' && new URL(timeline.origin).origin === timeline.origin && (!origin || timeline.origin === origin));
  const boundary = first.first_failure_event_sequence_boundary;
  need(boundary === timeline.first_failure_event_sequence_boundary && boundary === summary.first_failure_event_sequence_boundary);
  need((first.first_product_failure_present === 'NO' && boundary === null && first.failure === null) || (first.first_product_failure_present === 'YES' && positiveInt(boundary) === boundary && first.failure?.sequence === boundary));
  need(Array.isArray(timeline.events) && timeline.events.length <= 100000 && summary.event_count === timeline.events.length);
  let previousMs = 0, rawCount = 0;
  for (const [index, event] of timeline.events.entries()) {
    keys(event, ['event_id', 'sequence', 'relative_ms', 'relative_ms_from_product_qa_start', 'event_kind', 'context', 'raw_event', 'safe_metadata', 'current_classifier_label', 'founder_adjudicated_semantic_effect', 'temporal_classification']);
    need(event.sequence === index + 1 && event.event_id === `pqa-${String(event.sequence).padStart(8, '0')}` && Number.isFinite(event.relative_ms) && event.relative_ms >= previousMs);
    previousMs = event.relative_ms;
    need(event.founder_adjudicated_semantic_effect === 'UNKNOWN');
    need(event.temporal_classification === (boundary === event.sequence ? 'AT_FIRST_FAILURE' : boundary !== null && event.sequence > boundary ? 'AFTER_FIRST_FAILURE' : 'BEFORE_FIRST_FAILURE'));
    validateContext(event.context); validateMetadata(event.safe_metadata);
    need(['CONTEXT', 'PRODUCT_QA_START', 'VIEWPORT_START', 'VIEWPORT_END', 'RAW_EVENT', 'FIRST_FAILURE', 'LATER_FAILURE', ...LIFECYCLES].includes(event.event_kind));
    if (event.event_kind === 'LATER_FAILURE') need(boundary !== null && event.sequence > boundary);
    need(event.relative_ms_from_product_qa_start === (summary.product_qa_start_relative_ms === null ? null : event.relative_ms - summary.product_qa_start_relative_ms));
    if (event.event_kind === 'RAW_EVENT') {
      rawCount++; need(event.raw_event !== null && (event.current_classifier_label === null || LABELS.includes(event.current_classifier_label)));
      keys(event.raw_event, ['kind', 'origin', 'path', 'type', 'status', 'canceled', 'rsc', 'prefetch', 'error_code', 'source']);
      const raw = event.raw_event;
      need(['request_failure', 'console_error', 'exception', 'unknown', 'unclassified'].includes(raw.kind));
      need([timeline.origin, 'https://vercel.live', '', 'null'].includes(raw.origin) || /^sha256:[a-f0-9]{64}$/.test(raw.origin));
      need(raw.path === '' || hashPattern.test(raw.path) || (raw.origin === 'https://vercel.live' && raw.path === '/_next-live/feedback/'));
      need(Number.isInteger(raw.status) && raw.status >= 0 && raw.status <= 599);
      need(['canceled', 'rsc', 'prefetch'].every(key => typeof raw[key] === 'boolean'));
      need(typeof raw.type === 'string' && raw.type.length <= 40 && /^[a-zA-Z]*$/.test(raw.type));
      need(typeof raw.error_code === 'string' && /^(?:|net::ERR_[A-Z_]{1,80})$/.test(raw.error_code));
      need(['', 'Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(raw.source));
    } else need(event.raw_event === null && event.current_classifier_label === null);
  }
  need(summary.raw_event_count === rawCount && summary.classifier_semantics_changed === false && summary.temporal_classification_is_causality === false && summary.semantic_effect === 'UNKNOWN');
  need(['PENDING', 'PASS', 'FAIL'].includes(summary.classifier_alignment) && ['PENDING', 'PASS', 'FAIL'].includes(summary.persistence_status));
  need(Number.isSafeInteger(summary.persistence_failure_count) && summary.persistence_failure_count >= 0 && Array.isArray(summary.capture_issues));
  need(summary.capture_issues.every(code => ['OBSERVABILITY_PERSISTENCE_FAILED', 'OBSERVABILITY_CONTEXT_FAILED', 'OBSERVABILITY_PRODUCT_START_FAILED', 'OBSERVABILITY_PRODUCT_START_AFTER_FAILURE', 'OBSERVABILITY_VIEWPORT_FAILED', 'OBSERVABILITY_LIFECYCLE_FAILED', 'OBSERVABILITY_RAW_EVENT_FAILED', 'OBSERVABILITY_FAILURE_CAPTURE_FAILED', 'OBSERVABILITY_ACCOUNTING_FAILED', 'OBSERVABILITY_CLASSIFIER_ALIGNMENT_FAILED'].includes(code)));
  need(['ISOLATED_FIXTURE_ROOT', 'UNKNOWN'].includes(summary.declared_source_root_class));
  if (summary.classifier_alignment === 'PASS') need(timeline.events.filter(event => event.event_kind === 'RAW_EVENT').every(event => LABELS.includes(event.current_classifier_label)));
  else need(timeline.events.every(event => event.current_classifier_label === null));
  need(canonical(summary.counters) === canonical(counters(timeline.events, boundary)));
  need(timeline.events.filter(event => event.event_kind === 'FIRST_FAILURE').length === (first.failure ? 1 : 0));
  need(summary.relative_ms_clock_basis === 'OBSERVER_START_MONOTONIC');
  need(summary.temporal_order_basis === 'LOCAL_CAPTURE_SEQUENCE_NOT_PROOF_OF_BROWSER_OCCURRENCE_OR_CAUSALITY');
  const productStarts = timeline.events.filter(event => event.event_kind === 'PRODUCT_QA_START');
  need(productStarts.length === (summary.product_qa_start_sequence === null ? 0 : 1));
  if (productStarts.length) need(productStarts[0].sequence === summary.product_qa_start_sequence && productStarts[0].relative_ms === summary.product_qa_start_relative_ms && (boundary === null || productStarts[0].sequence < boundary));
  else need(summary.product_qa_start_relative_ms === null);
  if (first.failure) {
    keys(first.failure, ['sequence', 'relative_ms', 'relative_ms_from_product_qa_start', ...CONTEXT_KEYS, 'expected', 'actual', 'message', 'error_class', 'stack_location', 'underlying_cause_depth']);
    const entry = timeline.events[boundary - 1];
    need(entry?.event_kind === 'FIRST_FAILURE' && first.failure.relative_ms === entry.relative_ms);
    need(first.failure.relative_ms_from_product_qa_start === entry.relative_ms_from_product_qa_start);
    for (const key of CONTEXT_KEYS) need(canonical(first.failure[key]) === canonical(entry.context[key]));
    need(Number.isInteger(first.failure.underlying_cause_depth) && first.failure.underlying_cause_depth >= 0 && first.failure.underlying_cause_depth < 16);
    need(typeof first.failure.error_class === 'string');
    if (first.failure.stack_location !== null) {
      keys(first.failure.stack_location, ['source_file', 'source_line', 'source_column', 'provenance']);
      const location = first.failure.stack_location;
      need(sourceFile(location.source_file) === location.source_file && positiveInt(location.source_line) && positiveInt(location.source_column) && location.provenance === 'ORIGINAL_ERROR_STACK');
    }
  }
  need(Array.isArray(summary.viewports));
  const viewportStarts = timeline.events.filter(event => event.event_kind === 'VIEWPORT_START');
  need(viewportStarts.length === summary.viewports.length);
  const referencedEnds = [];
  for (const [index, viewport] of summary.viewports.entries()) {
    keys(viewport, ['viewport_id', 'viewport', 'route', 'result_scope', 'start_sequence', 'end_sequence', 'result', 'product_assertions_completed', 'first_failure_occurred_during_viewport']);
    const start = viewportStarts[index];
    need(start.sequence === viewport.start_sequence);
    need(canonical(viewport.viewport) === canonical(start.context.viewport) && canonical(viewport.route) === canonical(start.context.route));
    need(viewport.viewport_id === (start.context.viewport?.id ?? `viewport-${index + 1}`));
    need(viewport.end_sequence === null || (positiveInt(viewport.end_sequence) && viewport.end_sequence >= viewport.start_sequence && viewport.end_sequence <= timeline.events.length));
    need(['OPEN', 'OPEN_AT_NEXT_START', 'PASS', 'FAIL', 'ABORTED', 'UNKNOWN'].includes(viewport.result) && typeof viewport.product_assertions_completed === 'boolean');
    if (viewport.result === 'OPEN') need(viewport.end_sequence === null && index === summary.viewports.length - 1);
    else if (viewport.result === 'OPEN_AT_NEXT_START') need(viewportStarts[index + 1]?.sequence === viewport.end_sequence + 1);
    else {
      need(timeline.events[viewport.end_sequence - 1]?.event_kind === 'VIEWPORT_END');
      referencedEnds.push(viewport.end_sequence);
    }
    validateViewport(viewport.viewport); validateRoute(viewport.route);
    need(typeof viewport.viewport_id === 'string' && (viewport.result_scope === null || typeof viewport.result_scope === 'string'));
    need(viewport.first_failure_occurred_during_viewport === (boundary !== null && boundary >= viewport.start_sequence && (viewport.end_sequence === null || boundary <= viewport.end_sequence) ? 'YES' : 'NO'));
  }
  need(canonical(referencedEnds) === canonical(timeline.events.filter(event => event.event_kind === 'VIEWPORT_END').map(event => event.sequence)));
  // Capture sanitizer must be idempotent; any credential/query-bearing free text is rejected.
  const inspectStrings = value => {
    if (typeof value === 'string') {
      SECRET_TEXT.lastIndex = 0; need(!SECRET_TEXT.test(value)); SECRET_TEXT.lastIndex = 0;
      need(!/\b(?:Bearer\s+|(?:authorization|cookie|set-cookie|ACTIONS_ID_TOKEN_REQUEST_TOKEN|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)\s*[:=])/i.test(value));
      if (/https?:\/\//.test(value)) need(value === timeline.origin || value === 'https://vercel.live');
      else need(sanitizeText(value, timeline.origin) === value);
    } else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => { inspectStrings(key); inspectStrings(item); });
  };
  inspectStrings(input);
  if (first.failure) {
    for (const key of ['expected', 'actual', 'message']) need(canonical(first.failure[key]) === canonical(sanitizeProductQAValue(first.failure[key], timeline.origin)));
  }
  for (const event of timeline.events) {
    for (const key of ['suite_id', 'test_id', 'test_name', 'assertion_id', 'action_id']) need(event.context[key] === sanitizeText(event.context[key], timeline.origin));
    if (event.safe_metadata) need(event.safe_metadata.console_text === sanitizeText(event.safe_metadata.console_text, timeline.origin));
  }
  if (existingAccounting === null) need(summary.classifier_alignment !== 'PASS');
  else if (existingAccounting !== undefined) {
    requireSafeData(existingAccounting);
    need(Array.isArray(existingAccounting.ledger) && summary.classifier_alignment === 'PASS');
    const raw = timeline.events.filter(event => event.event_kind === 'RAW_EVENT');
    need(raw.length === existingAccounting.ledger.length);
    existingAccounting.ledger.forEach((item, index) => need(raw[index].current_classifier_label === item.classification && canonical(raw[index].raw_event) === canonical(normalizedLedgerEvent(item.event, timeline.origin))));
  }
  return clone(input);
}
