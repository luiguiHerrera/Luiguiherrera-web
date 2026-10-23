// Offline regression harness: real consumers and Next cache code, synthetic sources only.
// Reuses the VM loader / in-memory IncrementalCache approach from the CT verifier.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';

let transportAttempts = 0;
const denyTransport = () => { transportAttempts++; throw new Error('OFFLINE TRANSPORT DENIED'); };
globalThis.fetch = denyTransport;
http.request = http.get = https.request = https.get = denyTransport;
net.connect = net.createConnection = net.Socket.prototype.connect = tls.connect = denyTransport;
dns.lookup = dns.resolve = dns.resolve4 = dns.resolve6 = denyTransport;
dns.promises.lookup = dns.promises.resolve = dns.promises.resolve4 = dns.promises.resolve6 = denyTransport;
syncBuiltinESMExports();
globalThis.AsyncLocalStorage = AsyncLocalStorage;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const { unstable_cache } = req('next/cache.js');
const { workAsyncStorage } = req('next/dist/server/app-render/work-async-storage.external.js');
const day = 86_400_000;
const start = Date.UTC(2026, 9, 21);
const sectorPath = 'lib/dashboard/adapters/sector-etfs.ts';
const homePath = 'lib/dashboard/get-home-dashboard-preview-data.ts';
const dashboardPath = 'lib/dashboard/get-dashboard-data.ts';
const weeklyPath = 'lib/reports/build-weekly-report-data.ts';

function harness({ mode = 'reject', sourceError, otherError, independentInputs = false } = {}) {
  let clock = start;
  const calls = { provider: 0, btc: 0, vix: 0, term: 0, gld: 0, options: 0 };
  const sleeps = [], entries = new Map(), writes = [], modules = new Map();
  const cache = {
    generateSimpleCacheKey: async key => createHash('sha256').update(key).digest('hex'),
    get: async key => {
      const entry = entries.get(key);
      return entry ? { value: entry.value, isStale: clock - entry.time >= entry.value.revalidate * 1000 } : null;
    },
    set: async (key, value) => {
      entries.set(key, { value: structuredClone(value), time: clock });
      writes.push(structuredClone(value));
    },
  };
  const vix = { spot: { latestVix: 14, dataStatus: 'automated', lastUpdated: '2026-10-20',
    vixCompositeLabel: 'Normal bajo', vixSeverity: 'normal', vixTrend: 'falling' }, module: { id: 'vix' } };
  const btc = { flows: { dataStatus: 'automated', sourceRole: 'primary', rowsParsed: 20,
    latestDate: '2026-10-20', readingSeverity: 'neutral', flowStreak: { direction: 'none', count: 0 } }, module: { id: 'btc-flows' } };
  const term = { sourceStatus: 'automated', lastUpdated: '2026-10-20', points: [] };
  const counted = (name, value) => async () => {
    const operation = ++calls[name];
    if (otherError && name === 'vix') throw otherError;
    return independentInputs ? { ...value, operation } : value;
  };
  const mocks = {
    '@/lib/dashboard/adapters/btc-etf-flows': { getBtcEtfFlowsData: counted('btc', btc) },
    '@/lib/dashboard/adapters/vix': { getVixData: counted('vix', vix) },
    '@/lib/dashboard/adapters/vix-term-structure': { getVixTermStructureData: counted('term', term) },
    '@/lib/dashboard/adapters/gld-flow-pressure': { getGldFlowPressure: counted('gld', { source: 'offline' }) },
    '@/lib/dashboard/adapters/radar': { getRadarRows: () => [] },
    '@/lib/market/options-proxies': { getOptionsProxyData: counted('options', { source: 'offline' }) },
    '@/lib/statistical-levels/get-statistical-levels-data': {
      getStatisticalLevelsManifest: async () => ({ generatedAt: '2026-10-20', source: 'offline', summaries: [] }),
      getStatisticalLevelsAsset: async ticker => ({ ticker, name: ticker, returns: { '1W': 0 },
        windows: { Full: { currentDrawdown: 0 } }, distanceToMovingAverages: { ma20: 0, ma50: 0, ma200: 0 } }),
      getStatisticalLevelsAssetSeasonality: async () => null,
    },
    '@/lib/seo/site': { getRouteMetadata: () => ({}) },
    '@/lib/dashboard/market-breadth': { buildMarketBreadthValues: () => ({}) },
  };
  function payload(symbol) {
    return { 'Meta Data': { '2. Symbol': symbol }, 'Time Series (Daily)': Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [new Date(Date.UTC(2026, 9, 20 - i)).toISOString().slice(0, 10), { '4. close': String(200 - i * .4) }])) };
  }
  const fixtureFetch = async url => {
    calls.provider++;
    if (sourceError) throw sourceError;
    return new Response(JSON.stringify(mode === 'valid' ? payload(new URL(url).searchParams.get('symbol')) : { Information: 'offline rate-limit fixture' }));
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const marker = name => Object.assign(() => null, { displayName: name });
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    assert(filename.startsWith(root + path.sep));
    const loadedModule = { exports: {} }; modules.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = name => {
      if (name === 'next/cache.js') return { unstable_cache };
      if (name === 'react' || name === 'react/jsx-runtime') return req(name);
      if (name === 'next/link' || name === 'next/image') return { __esModule: true, default: marker(name) };
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/components/')) return new Proxy({}, { get: (_, key) => marker(String(key)) });
      let target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (!path.extname(target)) target += fs.existsSync(target + '.ts') ? '.ts' : '.tsx';
      return load(path.relative(root, target));
    };
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: localRequire,
      Date: ClockDate, Error, TypeError, RangeError, SyntaxError, DOMException, URL, Response, AbortSignal,
      console, fetch: fixtureFetch, process: { env: { ALPHA_VANTAGE_API_KEY: 'offline-fixture' } },
      setTimeout: (fn, ms) => { sleeps.push(ms); fn(); },
    }, { filename });
    return loadedModule.exports;
  }
  async function render(fn) {
    const store = { route: '/offline', incrementalCache: cache, isStaticGeneration: true,
      nextFetchId: 1, pendingRevalidates: {} };
    return workAsyncStorage.run(store, async () => {
      try { return await fn(); }
      finally { await Promise.all(Object.values(store.pendingRevalidates)); }
    });
  }
  return { load, render, calls, writes, entries, sleeps, vix, btc, term,
    setTime: value => { clock = value; }, rejectSource: () => { mode = 'reject'; },
    body: entry => JSON.parse(entry.value.data.body),
  };
}

function incomplete(summary) {
  assert.equal(summary.current, 'Incompleto'); assert.equal(summary.dataStatus, 'unavailable');
  assert.equal(summary.regimeScore, null); assert.equal(summary.confidence, null);
}
function unavailable(result) {
  assert.equal(result.rotation, null); assert.equal(result.module.dataStatus, 'unavailable');
  assert.equal(result.quantRisk.dataStatus, 'unavailable'); assert.equal(result.quantRisk.fragilityScore, null);
  assert.equal(result.module.observedData.length, 0);
}
function elements(tree, name, found = []) {
  if (Array.isArray(tree)) { tree.forEach(child => elements(child, name, found)); return found; }
  if (!tree || typeof tree !== 'object') return found;
  if (tree.type?.displayName === name) found.push(tree);
  elements(tree.props?.children, name, found); return found;
}

test('A/D/F: real Dashboard, home and weekly consumers resolve cold sector failure, preserving other inputs', async () => {
  const h = harness();
  const dashboard = await h.render(h.load(dashboardPath).getDashboardData);
  assert.equal(dashboard.sectorRotation, null); incomplete(dashboard.regimeSummary);
  assert.equal(dashboard.quantRisk.fragilityScore, null); assert.equal(dashboard.vix, h.vix); assert.equal(dashboard.btcEtfFlows, h.btc);
  const home = await h.render(h.load(homePath).getHomeDashboardPreviewData);
  assert.equal(home.sectorRotation, null); incomplete(home.regimeSummary);
  assert.equal(home.vix, h.vix); assert.equal(home.vixTermStructure, h.term);
  const weekly = await h.render(h.load(weeklyPath).buildWeeklyReportData);
  incomplete(weekly.regimeSummary); assert.equal(weekly.sectors.data, null);
  assert.equal(weekly.sectors.leaders.length, 0); assert.equal(weekly.sectors.laggards.length, 0);
  assert.equal(weekly.volatility.vix, h.vix); assert.equal(weekly.flows.btcEtfFlows, h.btc);
  assert.deepEqual(h.calls, { provider: 1, btc: 3, vix: 3, term: 3, gld: 2, options: 1 });
  assert.equal(h.writes.length, 0); assert.equal(h.entries.size, 0);
});

test('A: real route functions select unavailable presentation in both languages and weekly report', async () => {
  const h = harness();
  const page = h.load('app/(es)/dashboard/page.tsx');
  for (const locale of ['es', 'en']) {
    const tree = await h.render(() => page.DashboardContent({ locale }));
    assert.equal(elements(tree, 'SectorRotationUnavailable').length, 1);
    incomplete(elements(tree, 'IntegratedRegimeModule')[0].props.data);
    assert.equal(elements(tree, 'QuantRiskPanel')[0].props.data.fragilityScore, null);
  }
  const english = await h.render(h.load('app/en/dashboard/page.tsx').default);
  assert.equal(english.type, page.DashboardContent); assert.equal(english.props.locale, 'en');
  for (const route of ['app/(es)/page.tsx', 'app/en/page.tsx']) {
    const tree = await h.render(h.load(route).default);
    const preview = elements(tree, 'HomeDashboardPreview')[0].props;
    incomplete(preview.regimeSummary); assert.equal(preview.sectorRotation, null); assert.equal(preview.vix, h.vix);
  }
  const tree = await h.render(h.load('app/en/weekly-report/page.tsx').default);
  incomplete(elements(tree, 'WeeklyReport')[0].props.data.regimeSummary);
  assert.equal(h.calls.provider, 1); assert.equal(h.writes.length, 0);
});

test('B: actual sector and home cache callbacks retain valid aggregates after failed stale revalidation', async () => {
  for (const route of ['sector', 'home']) {
    const h = harness({ mode: 'valid' });
    const getter = route === 'sector' ? h.load(sectorPath).getStrictSectorEtfsData : h.load(homePath).getHomeDashboardPreviewData;
    const first = await h.render(getter); assert.equal(h.calls.provider, 11);
    assert.deepEqual(h.sleeps, Array(10).fill(1200));
    const bodies = [...h.entries.values()].map(entry => entry.value.data.body); const writes = h.writes.length;
    h.rejectSource(); h.setTime(start + day + 1);
    const second = await h.render(getter);
    assert.equal(JSON.stringify(second), JSON.stringify(first)); assert.equal(h.writes.length, writes);
    assert.deepEqual([...h.entries.values()].map(entry => entry.value.data.body), bodies);
    assert.equal(h.calls.provider, 12);
  }
});

test('C: incomplete, duplicate, unavailable and expired cached sector values never leave the tolerant reader as valid', async () => {
  const mutations = [r => r.rotation.sectors.pop(), r => { r.rotation.sectors[1].etfTicker = r.rotation.sectors[0].etfTicker; },
    r => { r.rotation.sectors = {}; }, r => { r.rotation.sectors[0] = null; }, r => { delete r.module; },
    r => { r.rotation.dataStatus = 'unavailable'; }, r => { r.quantRisk.dataStatus = 'unavailable'; },
    r => { r.rotation.sectors.forEach(s => { s.lastUpdated = '2026-10-01'; }); }];
  for (const mutate of mutations) {
    const h = harness({ mode: 'valid' }); const sector = h.load(sectorPath);
    const result = await h.render(sector.getStrictSectorEtfsData); mutate(result);
    unavailable(await h.render(sector.getSectorEtfsData));
    await assert.rejects(() => h.render(sector.getStrictSectorEtfsData), sector.SectorDataUnavailableError);
    assert.equal(h.calls.provider, 11);
  }
});

test('C/F: expired home cache read preserves usable inputs and dates without another load or cache write', async () => {
  const h = harness({ mode: 'valid' }); const getter = h.load(homePath).getHomeDashboardPreviewData;
  await h.render(getter);
  const entry = [...h.entries.values()].find(e => 'btcEtfFlows' in h.body(e));
  const snapshot = h.body(entry); snapshot.sectorRotation.sectors.forEach(s => { s.lastUpdated = '2026-10-01'; });
  entry.value.data.body = JSON.stringify(snapshot);
  const calls = { ...h.calls }, writes = h.writes.length;
  const result = await h.render(getter);
  assert.equal(result.sectorRotation, null); incomplete(result.regimeSummary);
  assert.equal(result.vix.spot.latestVix, 14); assert.equal(result.vix.spot.lastUpdated, '2026-10-20');
  assert.equal(result.vixTermStructure.lastUpdated, '2026-10-20');
  assert.deepEqual(h.calls, calls); assert.equal(h.writes.length, writes);
});

test('E: repeated cold failures share the retained rejection until the existing 24-hour expiry', async () => {
  const h = harness(); const getter = h.load(sectorPath).getSectorEtfsData;
  (await h.render(() => Promise.all(Array.from({ length: 20 }, () => getter())))).forEach(unavailable);
  assert.equal(h.calls.provider, 1);
  h.setTime(start + day - 1); unavailable(await h.render(getter)); assert.equal(h.calls.provider, 1);
  h.setTime(start + day); unavailable(await h.render(getter)); assert.equal(h.calls.provider, 2);
  assert.equal(h.writes.length, 0);
});

test('F: simultaneous home failures carry only their own operation inputs, with no second provider pass', async () => {
  const h = harness({ independentInputs: true }); const getter = h.load(homePath).getHomeDashboardPreviewData;
  const results = await h.render(() => Promise.all([getter(), getter()]));
  assert.deepEqual(results.map(r => r.vix.operation), [1, 2]);
  for (const result of results) { incomplete(result.regimeSummary); assert.equal(result.vix.operation, result.vixTermStructure.operation); }
  assert.equal(h.calls.provider, 1); assert.equal(h.calls.vix, 2); assert.equal(h.calls.btc, 2); assert.equal(h.calls.term, 2);
  assert.equal(h.writes.length, 0);
});

test('G: programming errors and Next control signals propagate through all real data consumers', async () => {
  for (const error of [new Error('programming bug'), new TypeError('bad argument'),
    Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT;replace;/offline;307;' }),
    Object.assign(new Error('dynamic'), { name: 'TimeoutError', digest: 'DYNAMIC_SERVER_USAGE' })]) {
    for (const [file, name] of [[sectorPath, 'getSectorEtfsData'], [homePath, 'getHomeDashboardPreviewData'],
      [dashboardPath, 'getDashboardData'], [weeklyPath, 'buildWeeklyReportData']]) {
      const h = harness({ sourceError: error });
      await assert.rejects(() => h.render(h.load(file)[name]), e => e === error); assert.equal(h.writes.length, 0);
    }
  }
});

test('G: another module error is not hidden by an expected sector failure', async () => {
  const error = new TypeError('VIX programming error'); const h = harness({ otherError: error });
  await assert.rejects(() => h.render(h.load(homePath).getHomeDashboardPreviewData), e => e === error);
  assert.equal(h.writes.length, 0);
});

test('A/G: recognized transport and source validation failures are controlled, unknown errors are not', async () => {
  const transport = new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
  const h = harness({ sourceError: transport }); unavailable(await h.render(h.load(sectorPath).getSectorEtfsData));
  const sector = h.load(sectorPath);
  for (const body of ['not JSON', 'null', '{"Time Series (Daily)":{"2026-99-99":{"4. close":"2"}}}']) {
    unavailable(await sector.getSectorEtfsData({ apiKey: 'offline-fixture', now: start,
      fetcher: async () => new Response(body), sleep: async () => {} }));
  }
  const valid = harness({ mode: 'valid' }); valid.setTime(start + 8 * day);
  unavailable(await valid.render(valid.load(sectorPath).getSectorEtfsData));
});

test('offline harness made zero real transport attempts', () => { assert.equal(transportAttempts, 0); });
