import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';

const origin = 'https://luiguiherrera-interceptionfixture-luigui-herrera-s-projects.vercel.app';
const sources = { original: new URL('../scripts/browser-harness-base.mjs', import.meta.url),
  candidate: new URL('../scripts/probe-product-browser-harness.mjs', import.meta.url) };
const pool = new Map(); globalThis.__SL_INTERCEPTION_TEST_FACTORIES__ = pool;
let factorySequence = 0;
const turn = () => new Promise(resolve => setImmediate(resolve));
const request = (id, url = origin + '/asset.js', extra = {}) => ({ requestId: id, resourceType: 'Script',
  request: { url, method: 'GET', headers: {} }, ...extra });

function transport({ continueError, fallbackError, lateRequests = 0, closeError = false } = {}) {
  const commands = [], contexts = [];
  const chromium = { launch: async () => ({
    newContext: async () => {
      const cdp = new EventEmitter();
      const context = { closing: false, cdp, newPage: async () => ({ url: () => origin + '/niveles-estadisticos' }),
        newCDPSession: async () => cdp,
        close: async () => {
          commands.push(['context.close']); context.closing = true;
          for (let i = 0; i < lateRequests; i++) cdp.emit('Fetch.requestPaused', request('late-' + i));
          await turn();
          if (closeError) throw new Error('synthetic context close failure');
        } };
      cdp.send = async (method, params = {}) => {
        commands.push([method, structuredClone(params)]);
        if (method === 'Fetch.continueRequest' && (continueError || context.closing)) throw new Error(continueError || 'synthetic target session closed');
        if (method === 'Fetch.failRequest' && fallbackError) throw new Error(fallbackError);
        return {};
      };
      contexts.push(context); return context;
    }, close: async () => { commands.push(['browser.close']); }
  }) };
  return { chromium, commands, contexts };
}

async function load(which, fake) {
  const id = 'test-' + (++factorySequence); pool.set(id, fake);
  let source = await fs.readFile(sources[which], 'utf8');
  for (const name of ['release-core', 'network-accounting', 'probe-interception-observability']) {
    source = source.replace("'./" + name + ".mjs'", JSON.stringify(new URL('../scripts/' + name + '.mjs', import.meta.url).href));
  }
  source = source.replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')", `globalThis.__SL_INTERCEPTION_TEST_FACTORIES__.get(${JSON.stringify(id)})`);
  source=source.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,relative)=>JSON.stringify(new URL(relative,new URL('../scripts/probe-product-browser-harness.mjs',import.meta.url)).href));
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

async function exercise(which, { target = origin, token = 'synthetic-token', tokenError, events = [], ...options } = {}, inspect) {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-interception-harness-'));
  try {
    const fake = transport(options), loaded = await load(which, fake);
    let acquisitions = 0, cleared = 0;
    const tokenSource = { get: async () => { acquisitions++; if (tokenError) throw tokenError; return token; }, clear: () => { cleared++; } };
    const create = which === 'original' ? loaded.createReadOnlyHarness : loaded.createProbeProductHarness;
    const harness = await create({ origin: target }, tokenSource, out, false), page = await harness.createPage();
    for (const event of events) { fake.contexts[0].cdp.emit('Fetch.requestPaused', event); await turn(); }
    if (inspect) await inspect({ out, fake, page, harness });
    let closeFailure = null, failure = null;
    try { await page.close(); } catch (error) { closeFailure = error.message; }
    try { await harness.finish(true); } catch (error) { failure = error.message; }
    let accounting = null, observation = null;
    try { accounting = JSON.parse(await fs.readFile(path.join(out, 'network-accounting.json'), 'utf8')); } catch { /* expected when close itself fails */ }
    if (which === 'candidate') observation = JSON.parse(await fs.readFile(path.join(out, 'interception-failures.json'), 'utf8'));
    return { commands: fake.commands, accounting, observation, failure, closeFailure, acquisitions, cleared };
  } finally { await fs.rm(out, { recursive: true, force: true }); }
}

function assertSeparatedAccounting(candidate, original, transportCount = 0) {
  const { transportFailures, authFailures, transition_receipts, ...raw } = candidate;
  assert.equal(transition_receipts.records.length,0);
  const { authFailures: oldAuth, ...oldRaw } = original;
  assert.deepEqual(raw, oldRaw);
  assert.deepEqual(transportFailures, Array(transportCount).fill('INTERCEPTION_TRANSPORT_FAILURE'));
  assert.deepEqual(authFailures, Array(oldAuth.length - transportCount).fill('CREDENTIAL_SCOPE_OR_REDIRECT_REJECTED'));
}

const cases = [
  { id: 'A_CROSS_ORIGIN', events: [request('parent'), request('redirect', 'https://outside.example/asset.js', { redirectedRequestId: 'parent' })], stage: 'HEADER_SCOPE_VALIDATION', code: 'CROSS_ORIGIN_REDIRECT' },
  { id: 'B_CREDENTIAL_DESTINATION', events: [request('userinfo', origin.replace('https://', 'https://user:private@'))], stage: 'HEADER_SCOPE_VALIDATION', code: 'CREDENTIAL_DESTINATION' },
  { id: 'C_TOKEN_SOURCE', events: [request('token')], tokenError: new Error('synthetic unknown token source rejection'), stage: 'TOKEN_ACQUISITION', code: 'TOKEN_SOURCE_ERROR' },
  { id: 'D_CONTINUE_REQUEST', events: [request('continue')], continueError: 'synthetic CDP failure', stage: 'REQUEST_CONTINUATION', code: 'CONTINUE_REQUEST_ERROR' },
  { id: 'URL_PARSING', events: [request('invalid', 'not a valid URL')], stage: 'REQUEST_URL_PARSING', code: 'URL_PARSE_ERROR' },
  { id: 'QA_ORIGIN', target: origin + '/invalid-target', events: [request('bad-target')], stage: 'HEADER_SCOPE_VALIDATION', code: 'QA_ORIGIN' },
];
for (const fixture of cases) test(fixture.id + ': safe cause survives and browser policy matches unchanged original', async () => {
  const original = await exercise('original', fixture), candidate = await exercise('candidate', fixture);
  assert.equal(candidate.failure, fixture.stage === 'REQUEST_CONTINUATION' ? 'INTERCEPTION_TRANSPORT_FAILURE' : 'CREDENTIAL_SCOPE_FAILURE');
  assert.deepEqual(candidate.commands, original.commands);
  assertSeparatedAccounting(candidate.accounting, original.accounting, fixture.stage === 'REQUEST_CONTINUATION' ? 1 : 0);
  assert.equal(candidate.acquisitions, original.acquisitions); assert.equal(candidate.cleared, original.cleared);
  const records = candidate.observation.records;
  assert.equal(records.length, 1); assert.equal(records[0].failure_stage, fixture.stage);
  assert.equal(records[0].safe_error_code, fixture.code); assert.equal(records[0].page_id, 'page-1');
  assert.equal(records[0].page_lifecycle, 'ACTIVE'); assert.deepEqual(candidate.observation.capture_issues, []);
});

test('successful target, external, redirect and credential scrubbing retain exact commands and zero gate count', async () => {
  const fixture = { events: [request('target', origin + '/ok', { request: { url: origin + '/ok', method: 'GET', headers: { Authorization: 'strip', 'x-vercel-protection-bypass': 'strip' } } }),
    request('redirect', origin + '/other', { redirectedRequestId: 'target' }), request('external', 'https://outside.example/file.js'),
    request('inward', origin + '/inward', { redirectedRequestId: 'external' })] };
  const original = await exercise('original', fixture), candidate = await exercise('candidate', fixture);
  assert.deepEqual(candidate.commands, original.commands); assertSeparatedAccounting(candidate.accounting, original.accounting);
  assert.equal(candidate.failure, null); assert.equal(candidate.acquisitions, original.acquisitions);
  assert.deepEqual(candidate.observation.records, []);
});

test('E_TEARDOWN: continue error records closing lifecycle without changing the late request race', async () => {
  const original = await exercise('original', { lateRequests: 1 }), candidate = await exercise('candidate', { lateRequests: 1 });
  assert.deepEqual(candidate.commands, original.commands); assertSeparatedAccounting(candidate.accounting, original.accounting, 1);
  assert.equal(candidate.failure, 'INTERCEPTION_TRANSPORT_FAILURE');
  assert.equal(candidate.observation.records[0].failure_stage, 'REQUEST_CONTINUATION');
  assert.equal(candidate.observation.records[0].page_lifecycle, 'CLOSING');
});

test('F_FAIL_REQUEST_FALLBACK: secondary failure retains original and does not alter authFailures multiplicity', async () => {
  const fixture = { continueError: 'synthetic target closed', fallbackError: 'synthetic interception missing', events: [request('f')] };
  const original = await exercise('original', fixture), candidate = await exercise('candidate', fixture);
  assert.deepEqual(candidate.commands, original.commands); assertSeparatedAccounting(candidate.accounting, original.accounting, 1);
  assert.equal(candidate.accounting.authFailures.length, 0); assert.equal(candidate.accounting.transportFailures.length, 1); assert.equal(candidate.failure, 'INTERCEPTION_TRANSPORT_FAILURE');
  assert.deepEqual(candidate.observation.records.map(r => r.failure_stage), ['REQUEST_CONTINUATION', 'FAIL_REQUEST_FALLBACK']);
  assert.deepEqual(candidate.observation.records.map(r => r.safe_error_code), ['CONTINUE_REQUEST_ERROR', 'FAIL_REQUEST_ERROR']);
  assert.equal(candidate.observation.records[0].request_sequence, candidate.observation.records[1].request_sequence);
});

test('G_MULTIPLE_FAILURES: twelve late requests retain twelve individual identities and all gate entries', async () => {
  const candidate = await exercise('candidate', { lateRequests: 12 });
  assert.equal(candidate.failure, 'INTERCEPTION_TRANSPORT_FAILURE'); assert.equal(candidate.accounting.authFailures.length, 0); assert.equal(candidate.accounting.transportFailures.length, 12);
  assert.equal(candidate.observation.records.length, 12);
  assert.equal(new Set(candidate.observation.records.map(r => r.page_id + ':' + r.request_sequence)).size, 12);
  assert.ok(candidate.observation.records.every(r => r.page_lifecycle === 'CLOSING'));
});

test('H_SECRET_SAFETY: token, headers, body, sensitive URL and arbitrary exception messages are absent from persisted evidence', async () => {
  const marker = 'synthetic-sensitive-marker-DO-NOT-EMIT';
  const candidate = await exercise('candidate', { token: marker, continueError: 'CROSS_ORIGIN_REDIRECT ' + marker,
    fallbackError: marker, events: [request('private-id-' + marker, origin + '/private-' + marker + '?token=' + marker, {
      request: { url: origin + '/private-' + marker + '?token=' + marker + '#fragment', method: 'GET', headers: { Authorization: marker, Cookie: marker }, postData: marker }
    })] }, async ({ out }) => {
    const text = await fs.readFile(path.join(out, 'interception-failures.json'), 'utf8');
    assert.ok(!text.includes(marker)); assert.ok(!text.includes(origin)); assert.ok(!text.includes('Authorization'));
  });
  assert.ok(!JSON.stringify(candidate.observation).includes(marker));
  assert.ok(!JSON.stringify(candidate.accounting).includes(marker));
  assert.equal(candidate.observation.records[0].safe_error_code, 'CONTINUE_REQUEST_ERROR');
  assert.match(candidate.observation.records[0].path_sha256, /^[a-f0-9]{64}$/);
});

test('interception cause is already persisted when context close aborts before network accounting is written', async () => {
  const candidate = await exercise('candidate', { closeError: true, tokenError: new Error('synthetic token unavailable'), events: [request('before-abort')] });
  assert.equal(candidate.closeFailure, 'synthetic context close failure'); assert.equal(candidate.accounting, null);
  assert.equal(candidate.observation.records.length, 1); assert.equal(candidate.observation.records[0].failure_stage, 'TOKEN_ACQUISITION');
});

test('finish closes remaining contexts without adding a pending drain, while marking their closing lifecycle', async () => {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'sl-interception-finish-'));
  try {
    const fake = transport({ lateRequests: 1 }), loaded = await load('candidate', fake);
    const harness = await loaded.createProbeProductHarness({ origin }, { get: async () => 'synthetic-token', clear() {} }, out, false);
    await harness.createPage();
    await assert.rejects(harness.finish(true), /INTERCEPTION_TRANSPORT_FAILURE/);
    const observed = JSON.parse(await fs.readFile(path.join(out, 'interception-failures.json'), 'utf8'));
    assert.equal(observed.records.length, 1); assert.equal(observed.records[0].page_lifecycle, 'CLOSING');
    assert.deepEqual(fake.commands.filter(([m]) => m.endsWith('.close')).map(([m]) => m), ['context.close', 'browser.close']);
  } finally { await fs.rm(out, { recursive: true, force: true }); }
});

test('REQUEST_NO_LONGER_INTERCEPTABLE is a blocking transport failure with no prefetch lifecycle exemption', async () => {
  const fixture = { continueError: 'Protocol error (Fetch.continueRequest): Invalid InterceptionId.', fallbackError: 'Protocol error (Fetch.failRequest): Invalid InterceptionId.', events: [request('canceled', origin + '/niveles-estadisticos', { resourceType: 'Fetch', networkId: 'memory-network', request: { url: origin + '/niveles-estadisticos', method: 'GET', headers: { RSC: '1', 'Next-Router-Prefetch': '1' } } })] };
  const candidate = await exercise('candidate', fixture);
  assert.equal(candidate.failure, 'INTERCEPTION_TRANSPORT_FAILURE');
  assert.deepEqual(candidate.accounting.authFailures, []);
  assert.deepEqual(candidate.accounting.transportFailures, ['INTERCEPTION_TRANSPORT_FAILURE']);
  assert.equal(candidate.observation.records.length, 2);
  assert.ok(candidate.observation.records.every(r => r.continuation_failure_class === 'REQUEST_NO_LONGER_INTERCEPTABLE'));
});
