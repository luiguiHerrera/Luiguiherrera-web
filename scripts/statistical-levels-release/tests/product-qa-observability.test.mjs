import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createProductQAObservability, productQAObservabilityFiles, sanitizeProductQAValue, validateProductQAObservabilityEvidence } from '../scripts/product-qa-observability.mjs';
import { account } from '../scripts/network-accounting.mjs';

const origin = 'https://luiguiherrera-fixture-luigui-herrera-s-projects.vercel.app';
const source = 'scripts/statistical-levels-release/scripts/qa/qa-statistical-levels.mjs';
function setup(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-observation-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  let ms = 100;
  const observer = createProductQAObservability({ out, origin, codeRoot: out, clock: () => ms });
  return { observer, out, advance: value => { ms += value; } };
}
function failure(message = 'expected visible controls') {
  const error = new assert.AssertionError({ message, actual: ['observed', null], expected: ['required', 3], operator: 'deepStrictEqual' });
  error.stack = `AssertionError: ${message}\n    at check (/private/tmp/isolated/${source}:52:10)`;
  return error;
}
const rsc = (suffix = '') => ({ kind: 'request_failure', url: origin + '/niveles-estadisticos' + suffix, type: 'Fetch', canceled: true, rsc: true, prefetch: true, error_code: 'net::ERR_ABORTED' });
const platform = () => ({ kind: 'request_failure', url: 'https://vercel.live/_next-live/feedback/feedback.js', type: 'Script' });
const consoleEvent = () => ({ kind: 'console_error', url: origin + '/niveles-estadisticos', source: 'Log.entryAdded' });
const copy = value => JSON.parse(JSON.stringify(value));

test('exact first assertion is flushed synchronously and original error is returned', t => {
  const { observer, out } = setup(t), error = failure();
  observer.context({ suite_id: 'main', test_id: 'controls', test_name: 'visible controls', assertion_id: 'controls-visible', action_id: 'verify', source_file: source, source_line: 52 });
  assert.equal(observer.captureFailure(error), error);
  const saved = JSON.parse(fs.readFileSync(path.join(out, productQAObservabilityFiles[0])));
  assert.equal(saved.first_product_failure_present, 'YES');
  assert.equal(saved.failure.message, error.message);
  assert.deepEqual(saved.failure.expected, error.expected);
  assert.deepEqual(saved.failure.actual, error.actual);
  assert.equal(saved.failure.source_line, 52);
  assert.deepEqual(saved.failure.stack_location, { source_file: source, source_line: 52, source_column: 10, provenance: 'ORIGINAL_ERROR_STACK' });
  for (const file of productQAObservabilityFiles) assert.equal(fs.statSync(path.join(out, file)).mode & 0o777, 0o600);
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('generic wrapper cannot replace an already captured assertion', t => {
  const { observer, out } = setup(t); observer.captureFailure(failure('first A'));
  const before = fs.readFileSync(path.join(out, productQAObservabilityFiles[0]));
  observer.captureFailure(new Error('PRODUCT_SUITE_FAILED'));
  assert.deepEqual(fs.readFileSync(path.join(out, productQAObservabilityFiles[0])), before);
  assert.equal(observer.evidence().timeline.events.at(-1).event_kind, 'LATER_FAILURE');
});
test('nested cause retains underlying AssertionError', t => {
  const { observer } = setup(t), original = failure('nested A');
  const wrapper = new Error('PRODUCT_SUITE_FAILED', { cause: new Error('middle', { cause: original }) });
  observer.captureFailure(wrapper);
  assert.equal(observer.evidence().firstFailure.failure.error_class, 'AssertionError');
  assert.equal(observer.evidence().firstFailure.failure.message, original.message);
  assert.equal(observer.evidence().firstFailure.failure.underlying_cause_depth, 2);
});
test('multiple assertions leave the first boundary immutable', t => {
  const { observer } = setup(t); observer.captureFailure(failure('A'));
  const before = observer.evidence().firstFailure;
  observer.captureFailure(failure('B')); observer.captureFailure(failure('C'));
  assert.deepEqual(observer.evidence().firstFailure, before);
});
test('before/after raw RSC timeline retains UNKNOWN and exact classifier labels', t => {
  const { observer } = setup(t); const raw = [rsc(), rsc('?asset=SPY')];
  observer.recordEvent(raw[0]); observer.captureFailure(failure()); observer.recordEvent(raw[1]);
  const accounting = account(raw, false, origin); observer.finish(accounting);
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin, accounting);
  assert.deepEqual(bundle.timeline.events.map(x => x.temporal_classification), ['BEFORE_FIRST_FAILURE', 'AT_FIRST_FAILURE', 'AFTER_FIRST_FAILURE']);
  assert.ok(bundle.timeline.events.every(x => x.founder_adjudicated_semantic_effect === 'UNKNOWN'));
  assert.deepEqual(bundle.phaseSummary.counters.raw_rsc_cancellations, { before_first_failure: 1, at_first_failure: 0, after_first_failure: 1 });
  assert.deepEqual(bundle.phaseSummary.counters.current_classifier_required_failures, { before_first_failure: 1, at_first_failure: 0, after_first_failure: 1 });
});
test('later platform cleanup does not replace failure', t => {
  const { observer } = setup(t), error = failure('before cleanup'); observer.captureFailure(error); observer.lifecycle('PAGE_CLOSE_START'); observer.recordEvent(platform()); observer.lifecycle('PAGE_CLOSED');
  const bundle = observer.finish(account([platform()], false, origin));
  assert.equal(bundle.firstFailure.failure.message, error.message);
  assert.equal(bundle.phaseSummary.counters.vercel_platform_events.after_first_failure, 1);
});
for (const locale of ['es', 'en']) test(`route and locale remain exact for ${locale} failure`, t => {
  const { observer } = setup(t); const route = locale === 'es' ? '/niveles-estadisticos' : '/en/statistical-levels';
  observer.viewportStart({ id: locale, width: 390, height: 844, locale }, { route });
  observer.context({ test_id: 'locale', action_id: 'verify-locale' }); observer.captureFailure(failure());
  const { firstFailure } = observer.evidence();
  assert.equal(firstFailure.failure.route.path, route); assert.equal(firstFailure.failure.viewport.locale, locale);
});
test('viewport substage PASS is chronologically separate from later suite failure', t => {
  const { observer } = setup(t);
  observer.viewportEnd(null, 'PASS');
  observer.viewportStart({ id: 'desktop-es', width: 1440, height: 900, locale: 'es' }, { route: '/niveles-estadisticos', result_scope: 'PRIMARY_VIEWPORT' });
  observer.viewportEnd(null, 'PASS', { product_assertions_completed: true });
  observer.context({ viewport: null, test_id: 'later-suite-test' }); observer.captureFailure(failure());
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin);
  const stage = bundle.phaseSummary.viewports[0];
  assert.equal(stage.result, 'PASS'); assert.equal(stage.first_failure_occurred_during_viewport, 'NO');
  assert.ok(stage.end_sequence < bundle.firstFailure.first_failure_event_sequence_boundary);
  assert.deepEqual(bundle.phaseSummary.capture_issues, []);
});
test('no failure is explicitly NO after product capture starts', t => {
  const { observer } = setup(t); observer.context({ suite_id: 'main' }); observer.finish(account([], true, origin));
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin, account([], true, origin));
  assert.equal(bundle.firstFailure.first_product_failure_present, 'NO'); assert.equal(bundle.firstFailure.failure, null);
});
test('raw counts and current classifier unchanged for passing and failing synthetic input', t => {
  for (const passed of [false, true]) {
    const { observer } = setup(t), raw = [rsc(), consoleEvent(), platform(), { ...rsc(), prefetch: false }];
    raw.forEach(event => observer.recordEvent(event)); const accounting = account(raw, passed, origin); const before = copy(accounting);
    const bundle = observer.finish(accounting);
    assert.deepEqual(accounting, before); assert.equal(bundle.phaseSummary.raw_event_count, raw.length);
    assert.deepEqual(bundle.timeline.events.map(event => event.current_classifier_label), accounting.ledger.map(event => event.classification));
    assert.equal(bundle.phaseSummary.counters.raw_rsc_cancellations.before_first_failure, 2);
    validateProductQAObservabilityEvidence(bundle, origin, accounting);
  }
});
test('every sequence and relative time is monotonic even under regressing test clock', t => {
  const { observer, advance } = setup(t);
  observer.context({ suite_id: 'main' }); advance(3); observer.recordEvent(rsc()); advance(-20); observer.captureFailure(failure()); advance(30); observer.recordEvent(platform());
  const events = observer.evidence().timeline.events;
  assert.deepEqual(events.map(x => x.sequence), [1, 2, 3, 4]);
  assert.deepEqual(events.map(x => x.relative_ms), [0, 3, 3, 13]);
});
test('all events partition exactly before/at/after and duplicates stay distinct', t => {
  const { observer } = setup(t); observer.recordEvent(rsc()); observer.recordEvent(rsc()); observer.captureFailure(failure()); observer.recordEvent(rsc());
  const events = observer.evidence().timeline.events;
  assert.equal(new Set(events.map(x => x.event_id)).size, 4);
  assert.equal(events.filter(x => x.temporal_classification === 'BEFORE_FIRST_FAILURE').length, 2);
  assert.equal(events.filter(x => x.temporal_classification === 'AT_FIRST_FAILURE').length, 1);
  assert.equal(events.filter(x => x.temporal_classification === 'AFTER_FIRST_FAILURE').length, 1);
});
test('persistence failure never masks original exception and later flush can recover', t => {
  const { observer, out } = setup(t), original = failure();
  fs.writeFileSync(path.join(out, productQAObservabilityFiles[0] + '.partial'), 'blocked');
  fs.unlinkSync(path.join(out, productQAObservabilityFiles[0] + '.partial'));
  fs.mkdirSync(path.join(out, productQAObservabilityFiles[0] + '.partial'));
  assert.equal(observer.captureFailure(original), original);
  assert.equal(observer.evidence().phaseSummary.persistence_status, 'FAIL');
  fs.rmdirSync(path.join(out, productQAObservabilityFiles[0] + '.partial'));
  assert.equal(observer.flush(), true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, productQAObservabilityFiles[0]))).failure.message, original.message);
  assert.equal(observer.evidence().phaseSummary.persistence_failure_count, 1);
});
test('original failure propagates unchanged across cleanup', t => {
  const { observer, out } = setup(t), original = failure();
  assert.throws(() => { try { throw original; } catch (error) { observer.captureFailure(error); throw error; } finally { observer.lifecycle('BROWSER_CLOSED'); observer.flush(); } }, error => error === original);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, productQAObservabilityFiles[0]))).failure.message, original.message);
});
test('JWT credentials cookies and signed query values never reach evidence', t => {
  const { observer, out } = setup(t);
  const jwt = ['eyJ' + 'A'.repeat(20), 'B'.repeat(30), 'C'.repeat(30)].join('.');
  const error = failure(`Authorization: Bearer ${jwt}\nCookie: sid=secret\nURL ${origin}/niveles-estadisticos?signature=never-persist`);
  error.actual = { authToken: jwt, harmless: 42, value: origin + '/path?secret=never-persist' };
  observer.context({ route: origin + '/niveles-estadisticos?asset=SPY&signature=never-persist' });
  observer.captureFailure(error);
  const text = productQAObservabilityFiles.map(file => fs.readFileSync(path.join(out, file), 'utf8')).join('');
  for (const secret of [jwt, 'sid=secret', 'never-persist']) assert.ok(!text.includes(secret));
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('safe nested values remain exact including repeated object references', () => {
  const child = { text: 'visible', n: 4 }; const value = [child, child, null, false, { metrics: [2.5, 'n/d'] }];
  assert.deepEqual(sanitizeProductQAValue(value, origin), JSON.parse(JSON.stringify(value)));
});
test('accessors and toJSON are never evaluated during failure capture', t => {
  const { observer } = setup(t); let reads = 0;
  const value = { toJSON() { reads++; return 'private'; } }; Object.defineProperty(value, 'hostile', { enumerable: true, get() { reads++; throw new Error('hostile'); } });
  const error = failure(); error.actual = value; observer.captureFailure(error);
  assert.equal(reads, 0); validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('cause getter and cyclic causes cannot hang or execute', t => {
  const { observer } = setup(t); let reads = 0; const error = failure();
  Object.defineProperty(error, 'cause', { get() { reads++; return error; } }); observer.captureFailure(error);
  assert.equal(reads, 0); assert.equal(observer.evidence().firstFailure.failure.message, error.message);
});
test('unknown origins and request IDs are hashed without query values', t => {
  const { observer } = setup(t), event = { ...rsc(), url: 'https://unrelated.example/private?opaque=secret-value' };
  observer.recordEvent(event, { page_id: 'p1', request_id: 'opaque-request-id', method: 'GET', route: event.url, lifecycle: 'CLOSING' });
  const accounting = account([event], false, origin); const bundle = observer.finish(accounting);
  assert.ok(!JSON.stringify(bundle).includes('unrelated.example')); assert.ok(!JSON.stringify(bundle).includes('secret-value'));
  validateProductQAObservabilityEvidence(bundle, origin, accounting);
});
test('accounting misalignment is visible without changing current accounting', t => {
  const { observer } = setup(t); observer.recordEvent(rsc()); const accounting = account([platform()], false, origin), before = copy(accounting);
  const bundle = observer.finish(accounting);
  assert.equal(bundle.phaseSummary.classifier_alignment, 'FAIL'); assert.deepEqual(accounting, before);
  assert.equal(bundle.timeline.events[0].current_classifier_label, null);
});
test('passive lifecycle events preserve raw count', t => {
  const { observer } = setup(t); observer.lifecycle('PAGE_CREATED', { page_id: 'p1' }); observer.recordEvent(rsc()); observer.lifecycle('PAGE_CLOSE_START'); observer.lifecycle('PAGE_CLOSED'); observer.lifecycle('BROWSER_CLOSED');
  const bundle = observer.finish(account([rsc()], false, origin)); assert.equal(bundle.phaseSummary.event_count, 5); assert.equal(bundle.phaseSummary.raw_event_count, 1);
});
for (const [name, mutate] of [
  ['forged failure boundary', value => { value.firstFailure.first_failure_event_sequence_boundary = 99; }],
  ['forged event order', value => { value.timeline.events[0].sequence = 9; }],
  ['invented semantic label', value => { value.timeline.events[0].founder_adjudicated_semantic_effect = 'BENIGN'; }],
  ['forged counter', value => { value.phaseSummary.counters.raw_rsc_cancellations.before_first_failure = 999; }],
  ['credential value', value => { value.firstFailure.failure.actual = { password: 'not-permitted' }; }],
  ['extra event header', value => { value.timeline.events[0].raw_event.headers = {}; }],
]) test(`validator rejects ${name}`, t => {
  const { observer } = setup(t); observer.recordEvent(rsc()); observer.captureFailure(failure()); observer.finish(account([rsc()], false, origin));
  const value = copy(observer.evidence()); mutate(value); assert.throws(() => validateProductQAObservabilityEvidence(value, origin));
});
test('validator rejects getters before evaluating them', t => {
  const { observer } = setup(t); const value = observer.evidence(); let reads = 0;
  Object.defineProperty(value, 'timeline', { enumerable: true, get() { reads++; return {}; } });
  assert.throws(() => validateProductQAObservabilityEvidence(value, origin)); assert.equal(reads, 0);
});
test('top-level AssertionError keeps priority over a generic nested cause', t => {
  const { observer } = setup(t), error = failure('original assertion'); error.cause = new Error('generic child');
  observer.captureFailure(error); assert.equal(observer.evidence().firstFailure.failure.message, error.message);
  assert.equal(observer.evidence().firstFailure.failure.underlying_cause_depth, 0);
});
test('hostile error proxy reserves first boundary before any extraction and survives wrapper', t => {
  const { observer, out } = setup(t); const hostile = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('hostile descriptor'); } });
  assert.equal(observer.captureFailure(hostile), hostile);
  const before = JSON.parse(fs.readFileSync(path.join(out, productQAObservabilityFiles[0])));
  observer.captureFailure(new Error('PRODUCT_SUITE_FAILED'));
  assert.deepEqual(observer.evidence().firstFailure, before);
  assert.equal(before.first_product_failure_present, 'YES');
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('failure expected-value proxy cannot discard available original assertion details', t => {
  const { observer } = setup(t), error = failure('retained message');
  error.expected = new Proxy({}, { ownKeys() { throw new Error('hostile keys'); } });
  observer.captureFailure(error);
  assert.equal(observer.evidence().firstFailure.failure.message, error.message);
  assert.deepEqual(observer.evidence().firstFailure.failure.expected, { value_type: 'UNAVAILABLE' });
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('short opaque credential and relative query values are sanitized and rejected if forged', t => {
  const { observer, out } = setup(t); const opaque = 'Abc123Xyz'.repeat(3) + '12345';
  const error = failure(`opaque ${opaque} path /niveles-estadisticos?custom=never-keep token=small-secret`);
  error.actual = opaque; observer.captureFailure(error);
  const text = productQAObservabilityFiles.map(file => fs.readFileSync(path.join(out, file), 'utf8')).join('');
  for (const value of [opaque, 'never-keep', 'small-secret']) assert.ok(!text.includes(value));
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
  for (const field of ['message', 'expected']) {
    const bundle = observer.evidence(); bundle.firstFailure.failure[field] = opaque;
    assert.throws(() => validateProductQAObservabilityEvidence(bundle, origin));
  }
});
test('product start gives negative pre-product times and exact relative product times', t => {
  const { observer, advance } = setup(t); observer.recordEvent(rsc()); advance(4); observer.productStart(); advance(7); observer.captureFailure(failure());
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin);
  assert.deepEqual(bundle.timeline.events.map(event => event.relative_ms_from_product_qa_start), [-4, 0, 7]);
  assert.equal(bundle.firstFailure.failure.relative_ms_from_product_qa_start, 7);
  const prior = bundle.phaseSummary.product_qa_start_sequence; observer.productStart(); assert.equal(observer.evidence().phaseSummary.product_qa_start_sequence, prior);
});
test('raw RSC cancellation count is independent of current error-code classifier', t => {
  const { observer } = setup(t); const event = { ...rsc(), error_code: 'net::ERR_FAILED' };
  observer.recordEvent(event); const accounting = account([event], true, origin); const bundle = observer.finish(accounting);
  assert.equal(bundle.phaseSummary.counters.raw_rsc_cancellations.before_first_failure, 1);
  assert.equal(bundle.timeline.events[0].current_classifier_label, 'required_application_request_failure');
  validateProductQAObservabilityEvidence(bundle, origin, accounting);
});
test('aborted page and browser cleanup are retained without raw event inflation', t => {
  const { observer } = setup(t); observer.captureFailure(failure()); observer.lifecycle('PAGE_CLOSE_ABORTED'); observer.lifecycle('BROWSER_CLOSE_ABORTED');
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin, null);
  assert.equal(bundle.phaseSummary.raw_event_count, 0); assert.deepEqual(bundle.phaseSummary.capture_issues, []);
  assert.deepEqual(bundle.timeline.events.slice(-2).map(event => event.event_kind), ['PAGE_CLOSE_ABORTED', 'BROWSER_CLOSE_ABORTED']);
});
test('late productStart cannot alter any captured first-failure field', t => {
  const { observer, advance } = setup(t); observer.captureFailure(failure()); const first = observer.evidence().firstFailure;
  advance(10); assert.equal(observer.productStart(), null); observer.flush();
  assert.deepEqual(observer.evidence().firstFailure, first);
  assert.ok(observer.evidence().phaseSummary.capture_issues.includes('OBSERVABILITY_PRODUCT_START_AFTER_FAILURE'));
  validateProductQAObservabilityEvidence(observer.evidence(), origin);
});
test('validator rejects LATER_FAILURE before the immutable first boundary', t => {
  const { observer } = setup(t); observer.context({ suite_id: 'main' }); observer.captureFailure(failure());
  const bundle = observer.evidence(); bundle.timeline.events[0].event_kind = 'LATER_FAILURE';
  assert.throws(() => validateProductQAObservabilityEvidence(bundle, origin));
});
test('validator rejects product start after first failure even with coherent relative fields', t => {
  const { observer } = setup(t); observer.context({ suite_id: 'main' }); observer.captureFailure(failure()); observer.context({ action_id: 'later' });
  const bundle = observer.evidence(); bundle.timeline.events[2].event_kind = 'PRODUCT_QA_START';
  bundle.phaseSummary.product_qa_start_sequence = 3; bundle.phaseSummary.product_qa_start_relative_ms = 0;
  for (const event of bundle.timeline.events) event.relative_ms_from_product_qa_start = 0;
  bundle.firstFailure.failure.relative_ms_from_product_qa_start = 0;
  assert.throws(() => validateProductQAObservabilityEvidence(bundle, origin));
});
for (const [name, mutate] of [
  ['different locale/geometry', bundle => { bundle.phaseSummary.viewports[0].viewport = { id: 'en', width: 390, height: 844, locale: 'en', mobile: true }; }],
  ['different route', bundle => { bundle.phaseSummary.viewports[0].route.path = '/en/statistical-levels'; }],
  ['different viewport ID', bundle => { bundle.phaseSummary.viewports[0].viewport_id = 'forged'; }],
  ['wrong endpoint event', bundle => { bundle.phaseSummary.viewports[0].end_sequence = 3; }],
  ['missing viewport summary', bundle => { bundle.phaseSummary.viewports = []; }],
]) test(`validator binds viewport summary to timeline: ${name}`, t => {
  const { observer } = setup(t); observer.viewportStart({ id: 'es', width: 1440, height: 900, locale: 'es' }, { route: '/niveles-estadisticos' });
  observer.viewportEnd(null, 'PASS', { product_assertions_completed: true }); observer.context({ action_id: 'after-viewport' });
  const bundle = observer.evidence(); mutate(bundle);
  assert.throws(() => validateProductQAObservabilityEvidence(bundle, origin));
});
test('implicit OPEN_AT_NEXT_START endpoint and empty viewport ID fallback remain valid', t => {
  const { observer } = setup(t); observer.viewportStart(null, { route: '/niveles-estadisticos' }); observer.context({ action_id: 'next-navigation' });
  observer.viewportStart({ id: 'en', width: 390, height: 844, locale: 'en' }, { route: '/en/statistical-levels' });
  const bundle = validateProductQAObservabilityEvidence(observer.evidence(), origin);
  assert.equal(bundle.phaseSummary.viewports[0].result, 'OPEN_AT_NEXT_START');
  assert.equal(bundle.phaseSummary.viewports[0].viewport_id, 'viewport-1');
});
