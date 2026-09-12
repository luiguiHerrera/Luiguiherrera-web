import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { createProductQAObservability } from '../scripts/product-qa-observability.mjs';
const ts = createRequire(import.meta.url)('typescript');
const origin = 'https://luiguiherrera-harnessfixture-luigui-herrera-s-projects.vercel.app';
const fixtureTarget = { origin };
const sharedURL = new URL('../scripts/browser-harness-base.mjs', import.meta.url), probeURL = new URL('../scripts/probe-product-browser-harness.mjs', import.meta.url);
const pool = new Map(); globalThis.__SL_TEST_PLAYWRIGHT_FACTORIES__ = pool;
let nextId = 0;
function fakePlaywright({ out, closeError, browserCloseError } = {}) {
  const commands = [], contexts = [], launches = []; let httpCalls = 0;
  const chromium = { launch: async options => {
    launches.push({ ...options, env: { ...options.env, HOME: '<isolated-output>' } });
    return {
      newContext: async options => {
        commands.push(['browser.newContext', options]); let currentURL = origin + '/niveles-estadisticos';
        const cdp = new EventEmitter(); cdp.send = async (method, params = {}) => {
          commands.push([method, structuredClone(params)]);
          if (method === 'Page.navigate') currentURL = params.url;
          if (method === 'Runtime.evaluate') return { result: { value: params.expression === '2+2' ? 4 : { x: 10, y: 15 } } };
          return {};
        };
        const page = { url: () => currentURL };
        const context = { cdp, newPage: async () => { commands.push(['context.newPage']); return page; },
          newCDPSession: async value => { assert.equal(value, page); commands.push(['context.newCDPSession']); return cdp; },
          close: async () => { commands.push(['context.close']); if (closeError) throw closeError; } };
        contexts.push(context); return context;
      },
      close: async () => { commands.push(['browser.close']); if (browserCloseError) throw browserCloseError; }
    };
  } };
  return { chromium, commands, contexts, launches, out, get httpCalls() { return httpCalls; }, countHTTP() { httpCalls++; } };
}
async function importHarness(url, fake) {
  const id = 'factory-' + (++nextId); pool.set(id, fake);
  let source = await fs.readFile(url, 'utf8');
  source = source.replace("'./release-core.mjs'", JSON.stringify(new URL('../scripts/release-core.mjs', import.meta.url).href))
    .replace("'./network-accounting.mjs'", JSON.stringify(new URL('../scripts/network-accounting.mjs', import.meta.url).href))
    .replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')", `globalThis.__SL_TEST_PLAYWRIGHT_FACTORIES__.get(${JSON.stringify(id)})`);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
function emitRequest(cdp, id, url, headers = {}, type = 'Fetch') {
  cdp.emit('Network.requestWillBeSent', { requestId: id, type, request: { url, method: 'GET', headers } });
}
function emitEvents(cdp, afterFirst = () => {}) {
  emitRequest(cdp, 'rsc-prefetch', origin + '/niveles-estadisticos?review=do-not-keep', { RSC: '1', 'Next-Router-Prefetch': '1' });
  cdp.emit('Network.loadingFailed', { requestId: 'rsc-prefetch', canceled: true, errorText: 'net::ERR_ABORTED', type: 'Fetch' });
  afterFirst();
  emitRequest(cdp, 'rsc-required', origin + '/en/statistical-levels', { RSC: '1' });
  cdp.emit('Network.loadingFailed', { requestId: 'rsc-required', canceled: true, errorText: 'net::ERR_ABORTED', type: 'Fetch' });
  emitRequest(cdp, 'api', origin + '/api/fixture');
  cdp.emit('Network.responseReceived', { requestId: 'api', response: { url: origin + '/api/fixture', status: 500 }, type: 'Fetch' });
  emitRequest(cdp, 'platform', 'https://vercel.live/_next-live/feedback/fixture.js', {}, 'Script');
  cdp.emit('Network.loadingFailed', { requestId: 'platform', canceled: false, errorText: 'net::ERR_BLOCKED_BY_CLIENT', type: 'Script' });
  cdp.emit('Runtime.consoleAPICalled', { type: 'error', stackTrace: { callFrames: [{ url: origin + '/application.js' }] } });
  cdp.emit('Runtime.consoleAPICalled', { type: 'log', stackTrace: { callFrames: [{ url: origin + '/application.js' }] } });
  cdp.emit('Runtime.exceptionThrown', { exceptionDetails: { url: origin + '/application.js' } });
  cdp.emit('Log.entryAdded', { entry: { level: 'error', url: 'https://vercel.live/_next-live/feedback/fixture.js', source: 'network', text: 'synthetic platform diagnostic', networkRequestId: 'platform' } });
  cdp.emit('Log.entryAdded', { entry: { level: 'error', url: origin + '/application.js', source: 'javascript', text: 'synthetic application diagnostic' } });
  cdp.emit('Log.entryAdded', { entry: { level: 'warning', url: origin + '/application.js', source: 'javascript', text: 'not an existing captured error' } });
}
async function execute(out, probe, passed, boundary = false) {
  const fake = fakePlaywright({ out }), loadedHarness = await importHarness(probe ? probeURL : sharedURL, fake);
  let time = 0, tokens = 0, cleared = 0;
  const observer = probe ? createProductQAObservability({ out: path.join(out, 'observer'), origin, codeRoot: out, clock: () => ++time }) : undefined;
  observer?.context({ suite_id: 'fixture-suite', test_id: 'fixture-test', action_id: 'before-events', route: '/niveles-estadisticos' });
  const tokenSource = { get: async () => { tokens++; return 'synthetic-unit-oidc'; }, clear: () => { cleared++; } };
  const create = probe ? loadedHarness.createProbeProductHarness : loadedHarness.createReadOnlyHarness;
  const harness = await create(fixtureTarget, tokenSource, out, false, observer), page = await harness.createPage(), cdp = fake.contexts[0].cdp;
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 });
  await page.send('Page.navigate', { url: origin + '/en/statistical-levels' });
  assert.equal(await page.evaluate('2+2'), 4);
  await page.click('#sl-guide > summary'); await page.key('Enter', 'Enter', 13);
  emitEvents(cdp, () => { if (boundary && observer) observer.captureFailure(new assert.AssertionError({ actual: 0, expected: 1, message: 'first underlying fixture assertion' })); });
  cdp.emit('Fetch.requestPaused', { requestId: 'trusted', request: { url: origin + '/asset.js', headers: { authorization: 'discard-original' } } });
  cdp.emit('Fetch.requestPaused', { requestId: 'third-party', request: { url: 'https://third-party.example/asset.js', headers: { 'x-vercel-trusted-oidc-idp-token': 'must-remove' } } });
  await new Promise(resolve => setImmediate(resolve));
  await page.close(); const result = await harness.finish(passed);
  return { result, file: await fs.readFile(path.join(out, 'network-accounting.json'), 'utf8'), commands: fake.commands, launches: fake.launches, tokens, cleared, observer: observer?.evidence() };
}
for (const passed of [false, true]) test('shared/probe harness exact raw accounting and commands are identical with finalProductPassed=' + passed, async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-harness-differential-'));
  try {
    const shared = await execute(out, false, passed), probe = await execute(out, true, passed, !passed);
    assert.deepEqual(probe.commands, shared.commands, 'no additional browser/CDP requests or changed action parameters');
    assert.deepEqual(probe.launches, shared.launches); assert.equal(probe.tokens, shared.tokens); assert.equal(probe.cleared, shared.cleared);
    assert.deepEqual(probe.result, shared.result); assert.equal(probe.file, shared.file);
    assert.equal(probe.result.ledger.length, 8); assert.equal(probe.observer.phaseSummary.raw_event_count, 8);
    assert.equal(probe.observer.phaseSummary.classifier_alignment, 'PASS'); assert.deepEqual(probe.observer.phaseSummary.capture_issues, []);
    const raw = probe.observer.timeline.events.filter(event => event.event_kind === 'RAW_EVENT');
    assert.deepEqual(raw.map(event => event.current_classifier_label), shared.result.ledger.map(event => event.classification));
    assert.ok(!JSON.stringify(probe.observer).includes('do-not-keep'));
    assert.equal(probe.observer.firstFailure.first_product_failure_present, passed ? 'NO' : 'YES');
    if (!passed) { assert.equal(raw[0].temporal_classification, 'BEFORE_FIRST_FAILURE'); assert.ok(raw.slice(1).every(event => event.temporal_classification === 'AFTER_FIRST_FAILURE')); }
    const forwarded = probe.commands.filter(([name]) => name === 'Fetch.continueRequest');
    const third = forwarded.find(([, detail]) => detail.requestId === 'third-party');
    assert.ok(third); assert.ok(third[1].headers.every(header => header.name !== 'x-vercel-trusted-oidc-idp-token'));
  } finally { await fs.rm(out, { recursive: true, force: true }); }
});

for (const at of ['page', 'browser']) test('original ' + at + ' close error propagates while first assertion is already durably flushed', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-harness-close-'));
  try {
    const original = new Error('synthetic original close failure'), fake = fakePlaywright({ out, ...(at === 'page' ? { closeError: original } : { browserCloseError: original }) });
    const loadedHarness = await importHarness(probeURL, fake); const observer = createProductQAObservability({ out, origin, codeRoot: out });
    const first = new assert.AssertionError({ actual: 'wrong', expected: 'right', message: 'first assertion before close' });
    observer.context({ suite_id: 'suite', test_id: 'test', assertion_id: 'A', route: '/en/statistical-levels' });
    assert.equal(observer.captureFailure(first), first);
    const harness = await loadedHarness.createProbeProductHarness(fixtureTarget, { get: async () => 'synthetic-token', clear() {} }, out, false, observer);
    const page = await harness.createPage();
    await assert.rejects(at === 'page' ? page.close() : harness.finish(false), error => error === original);
    const persisted = JSON.parse(await fs.readFile(path.join(out, 'first-product-failure.json'), 'utf8'));
    assert.equal(persisted.failure.message, 'first assertion before close'); assert.equal(persisted.failure.assertion_id, 'A');
    assert.equal(observer.captureFailure(original), original); assert.deepEqual(observer.evidence().firstFailure, persisted);
    assert.ok(observer.evidence().timeline.events.some(event => event.event_kind === (at === 'page' ? 'PAGE_CLOSE_ABORTED' : 'BROWSER_CLOSE_ABORTED')));
    assert.deepEqual(observer.evidence().phaseSummary.capture_issues, []);
  } finally { await fs.rm(out, { recursive: true, force: true }); }
});

test('probe harness preserves exact raw events.push expressions and original timing literals', async () => {
  const parse = async url => { const text = await fs.readFile(url, 'utf8'); return ts.createSourceFile(url.pathname, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); };
  const shared = await parse(sharedURL), probe = await parse(probeURL);
  const expressions = (ast, name) => { const found = []; function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === name) found.push(ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Expression, node, ast)); ts.forEachChild(node, visit); } visit(ast); return found; };
  assert.deepEqual(expressions(probe, 'events.push'), expressions(shared, 'events.push'));
  assert.deepEqual(expressions(probe, 'account'), expressions(shared, 'account'));
  assert.deepEqual(expressions(probe, 'sleep'), expressions(shared, 'sleep'));
  assert.deepEqual(expressions(probe, 'setTimeout'), expressions(shared, 'setTimeout'));
  assert.deepEqual(expressions(probe, 'headersForRequest'), expressions(shared, 'headersForRequest'));
});
