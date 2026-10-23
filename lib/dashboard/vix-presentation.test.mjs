// Real HTML, synthetic source fixtures, and the accepted offline consumer harness.
// No source/provider request or web server is needed. Baseline is the direct parent.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript'), React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const base = '975a82fdd34068bd844ac3cda8a162e16e921f18';
function compile(source, filename, require) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(source.replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const harnessFile = path.join(root, 'lib/dashboard/sector-failure-handling.test.mjs');
const source = fs.readFileSync(harnessFile, 'utf8');
const boundary = source.indexOf("\ntest('A/D/F:");
assert(boundary > 0);
const { harness, assertOffline } = compile(source.slice(0, boundary)
  + '\nexport { harness }; export function assertOffline() { assert.equal(transportAttempts, 0); }', harnessFile, req);

// Reuse the presentation loader; only framework bindings and data entry points
// are injected. Every business component and child renders its real HTML.
const oldSources = new Map();
function presentation(locale, { before = false, contextOpen = false, mocks = {} } = {}) {
  const modules = new Map();
  function load(relative) {
    let filename = path.resolve(root, relative);
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    relative = path.relative(root, filename);
    if (modules.has(filename)) return modules.get(filename);
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name === 'react' && contextOpen && relative === 'components/dashboard/VixModule.tsx') {
        return { ...React, useState: initial => React.useState(initial === false ? true : initial) };
      }
      if (name === 'next/navigation') return { usePathname: () => locale === 'en' ? '/en/dashboard' : '/dashboard' };
      if (name === 'next/link') return { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) };
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return req(name);
    };
    if (before && !oldSources.has(relative)) oldSources.set(relative, execFileSync('git', ['show', `${base}:${relative}`], { cwd: root, encoding: 'utf8' }));
    const exports = compile(before ? oldSources.get(relative) : fs.readFileSync(filename, 'utf8'), filename, localRequire);
    modules.set(filename, exports); return exports;
  }
  return load;
}

const h = harness({ mode: 'valid' });
const buildVix = h.load('lib/dashboard/adapters/vix.ts').buildVixDashboardData;
const observations = values => values.map((value, i) => ({ date: new Date(Date.UTC(2025, 11, 1 + i)).toISOString().slice(0, 10), value }));
const normal = () => buildVix(observations([14, 14, 14, 14, 14, 14]));
const mutated = patch => { const v = normal(); Object.assign(v.spot, patch); return v; };
Object.assign(h.vix, normal());
const btcHtml = '<table><thead><tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>Total</th></tr></thead><tbody>'
  + Array.from({ length: 10 }, (_, i) => `<tr><td>Oct ${20 - i}, 2026</td><td>30</td><td>-5</td><td>25</td></tr>`).join('') + '</tbody></table>';
Object.assign(h.btc, await h.load('lib/dashboard/adapters/btc-etf-flows.ts').getBtcEtfFlowsData({
  now: Date.UTC(2026, 9, 21), fetchImpl: async () => new Response(btcHtml),
}));
Object.assign(h.term, {
  source: 'Synthetic curve fixture', classification: 'Fuerte contango',
  interpretation: 'Los contratos más largos cotizan por encima del vencimiento cercano.',
  whatItDoesNotMean: 'No predice la dirección.', reliabilityNote: 'Synthetic fixture only.',
  points: [17, 18, 19].map((value, i) => ({ label: `VX${i + 1}`, value, expirationDate: ['2026-11-18', '2026-12-16', '2027-01-20'][i], contract: `VX${i + 1}` })),
  m1m2Spread: 1, m1m2SlopePct: 100 / 17, m1m3Spread: 2, m1m3SlopePct: 200 / 17,
});
const dashboard = await h.render(h.load('lib/dashboard/get-dashboard-data.ts').getDashboardData);
dashboard.gldFlowPressure = null;
const weekly = await h.render(() => h.load('lib/reports/build-weekly-report-data.ts').buildWeeklyReportData(dashboard));
const regimeFor = vix => h.load('lib/dashboard/regime-scoring.ts').buildRegimeSummary({
  sectorRotation: dashboard.sectorRotation, btcEtfFlows: h.btc, vix,
});
const paths = {
  home: ['components/home/HomeDashboardPreview.tsx', 'HomeDashboardPreview'],
  dashboard: ['components/dashboard/VixModule.tsx', 'VixModule'],
  weekly: ['components/reports/WeeklyReport.tsx', 'WeeklyReport'],
};
function propsFor(surface, vix, locale, curve = h.term) {
  if (surface === 'dashboard') return { data: vix };
  if (surface === 'home') return { ...dashboard, vix, vixTermStructure: curve, regimeSummary: regimeFor(vix), locale };
  return { data: { ...weekly, regimeSummary: regimeFor(vix), volatility: { ...weekly.volatility, vix, termStructure: curve } }, locale };
}
function render(surface, vix, locale, options = {}, curve = h.term) {
  const [file, name] = paths[surface];
  return renderToStaticMarkup(React.createElement(presentation(locale, options)(file)[name], propsFor(surface, vix, locale, curve)));
}
function block(surface, html) {
  if (surface === 'home') return [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/g)].map(m => m[0]).find(s => />VIX<\/span>/.test(s));
  if (surface === 'weekly') return [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(m => m[0]).find(s => /VIX ·/.test(s));
  return html;
}
function metric(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<p[^>]*>${escaped}</p>\\s*<p[^>]*>(.*?)</p>`));
  assert(match, `Missing metric ${label}`); return match[1];
}
const unsupported = /Normal bajo|Low normal|Stable|Estable|normal range|rango normal|Presión de volatilidad contenida|Contained volatility pressure|NaN|Infinity|aria-label="[^\"]*VIX \d/;
const matrix = [];
for (const locale of ['es', 'en']) {
  const unavailable = locale === 'en' ? 'Unavailable' : 'No disponible';
  const absent = [
    ['unavailable defaults', () => buildVix([])],
    ['unavailable with stale metrics/copy', () => mutated({ dataStatus: 'unavailable' })],
    ['null', () => null],
    ['missing close', () => mutated({ latestVix: null })],
    ['NaN close', () => mutated({ latestVix: NaN })],
    ['infinite close', () => mutated({ latestVix: Infinity })],
    ['negative close', () => mutated({ latestVix: -1 })],
    ['missing observation date', () => mutated({ lastObservationDate: null })],
    ['invalid observation date', () => mutated({ lastObservationDate: '2026-02-30' })],
    ['demo state', () => mutated({ dataStatus: 'demo' })],
  ];
  for (const [name, make] of absent) test(`${locale}: ${name} has no unsupported VIX interpretation in real HTML`, () => {
    for (const surface of Object.keys(paths)) {
      const vix = make(), input = structuredClone(vix);
      const html = block(surface, render(surface, vix, locale, { contextOpen: true }));
      assert(html); assert.doesNotMatch(html, unsupported, surface);
      assert(html.includes(unavailable), surface);
      if (surface === 'dashboard') {
        for (const label of [locale === 'en' ? 'VIX · last close' : 'VIX · último cierre', locale === 'en' ? 'Classification' : 'Clasificación', 'Momentum', locale === 'en' ? 'Percentile' : 'Percentil']) assert.equal(metric(html, label), unavailable);
        assert.doesNotMatch(html, /p\d+|Último cierre disponible:|Latest available close:/);
      }
      if (surface === 'weekly') assert.equal(metric(html, locale === 'en' ? 'VIX momentum' : 'Momentum VIX'), unavailable);
      assert.deepEqual(structuredClone(vix), input, 'Presentation must not change provider data');
      matrix.push({ locale, case: name, surface, result: 'unavailable' });
    }
  });
  for (const trend of [undefined, null, 'unknown']) test(`${locale}: trend ${trend} does not default to stable`, () => {
    const vix = mutated({ vixTrend: trend });
    for (const surface of ['dashboard', 'weekly']) {
      const html = block(surface, render(surface, vix, locale, { contextOpen: true }));
      assert.equal(metric(html, surface === 'dashboard' ? 'Momentum' : locale === 'en' ? 'VIX momentum' : 'Momentum VIX'), unavailable);
      assert.doesNotMatch(html, /Stable|Estable/);
      matrix.push({ locale, case: `trend ${trend}`, surface, result: 'momentum unavailable' });
    }
  });
  test(`${locale}: explicit stable requires usable momentum comparisons`, () => {
    const vix = mutated({ previousVix: null, change1d: null, change5d: null });
    for (const surface of ['dashboard', 'weekly']) {
      const html = block(surface, render(surface, vix, locale, { contextOpen: true }));
      assert.equal(metric(html, surface === 'dashboard' ? 'Momentum' : locale === 'en' ? 'VIX momentum' : 'Momentum VIX'), unavailable);
    }
  });
  const valid = [
    ['normal stable', normal],
    ['normal stable with full percentile history', () => buildVix(observations(Array(252).fill(14)))],
    ['rising', () => buildVix(observations([14, 14.2, 14.4, 14.6, 14.8, 15]))],
    ['falling', () => buildVix(observations([18, 17, 16.5, 16, 15.5, 15]))],
    ['stress rising fast', () => buildVix(observations([20, 22, 24, 26, 28, 32]))],
    ['real delayed', () => mutated({ dataStatus: 'delayed' })],
  ];
  for (const [name, make] of valid) test(`${locale}: ${name} HTML is identical to authorized baseline`, () => {
    for (const surface of Object.keys(paths)) for (const contextOpen of [false, true]) {
      const vix = make();
      assert.equal(render(surface, vix, locale, { contextOpen }), render(surface, vix, locale, { before: true, contextOpen }), `${surface}/${contextOpen}`);
      matrix.push({ locale, case: name, surface, contextOpen, result: 'byte-identical' });
    }
  });
  test(`${locale}: reproduced baseline defects in home, weekly and Dashboard`, () => {
    const absentVix = buildVix([]);
    assert.match(block('home', render('home', absentVix, locale, { before: true })), /normal range|rango normal/);
    assert.match(block('weekly', render('weekly', absentVix, locale, { before: true })), /Stable|Estable/);
    assert.match(render('dashboard', mutated({ latestVix: NaN }), locale, { before: true }), /NaN/);
    assert.match(render('dashboard', mutated({ vixTrend: 'unknown' }), locale, { before: true }), /Stable|Estable/);
  });
  test(`${locale}: unavailable spot keeps the independent VX curve`, () => {
    const absentVix = buildVix([]);
    assert.match(render('home', absentVix, locale), /VX1/);
    assert.match(block('weekly', render('weekly', absentVix, locale)), /contango/i);
    const withoutCurve = block('weekly', render('weekly', mutated({ dataStatus: 'unavailable' }), locale, {}, null));
    assert.doesNotMatch(withoutCurve, unsupported);
    assert.match(withoutCurve, /pending update|pendiente de actualización/);
  });
  test(`${locale}: non-finite percentile and changes cannot print numeric interpretations`, () => {
    const html = render('dashboard', mutated({ vixPercentile: NaN, change1d: Infinity, change5d: NaN, change21d: Infinity }), locale, { contextOpen: true });
    assert.equal(metric(html, locale === 'en' ? 'Percentile' : 'Percentil'), unavailable);
    assert.equal(metric(html, 'Momentum'), unavailable);
    assert.doesNotMatch(html, /NaN|Infinity/);
  });
  test(`${locale}: real page consumers render real components and preserve independent modules`, async () => {
    const vix = buildVix([]), data = { ...dashboard, vix, regimeSummary: regimeFor(vix) };
    const home = await h.render(h.load('lib/dashboard/get-home-dashboard-preview-data.ts').getHomeDashboardPreviewData);
    const report = await h.render(() => h.load('lib/reports/build-weekly-report-data.ts').buildWeeklyReportData(data));
    const load = presentation(locale, { mocks: {
      '@/lib/dashboard/get-dashboard-data': { getDashboardData: async () => data },
      '@/lib/dashboard/get-home-dashboard-preview-data': { getHomeDashboardPreviewData: async () => ({ ...home, vix, regimeSummary: data.regimeSummary }) },
      '@/lib/reports/build-weekly-report-data': { buildWeeklyReportData: async () => report },
      '@/lib/seo/site': { getRouteMetadata: () => ({}) },
    } });
    const homeHtml = renderToStaticMarkup(await load(locale === 'en' ? 'app/en/page.tsx' : 'app/(es)/page.tsx').default());
    assert.doesNotMatch(block('home', homeHtml), unsupported);
    const page = load('app/(es)/dashboard/page.tsx');
    let tree = locale === 'en' ? await load('app/en/dashboard/page.tsx').default() : await page.default();
    tree = await tree.type(tree.props);
    const html = renderToStaticMarkup(tree);
    const spotBlock = html.match(/<section\b[^>]*data-vix-spot-module[^>]*>[\s\S]*?<\/section>/)?.[0];
    assert(spotBlock, 'Actual Dashboard page must render the real VIX block');
    assert.doesNotMatch(spotBlock, unsupported);
    assert.equal(metric(spotBlock, 'Momentum'), unavailable);
    assert.equal((html.match(/data-sector-row=/g) ?? []).length, 11);
    assert.match(html, /data-quant-risk-module/); assert.match(html, /data-btc-flow-module/);
    assert.match(html, /data-vix-module/);
    assert.match(html, /Incomplete|Incompleto/);
    assert.equal(data.regimeSummary.regimeScore, null); assert.equal(data.regimeSummary.confidence, null);
    if (locale === 'en') {
      const weeklyHtml = renderToStaticMarkup(await load('app/en/weekly-report/page.tsx').default());
      assert.doesNotMatch(block('weekly', weeklyHtml), /Stable|Estable/);
    }
    assertOffline();
  });
}
test('zero external transport attempts; optional matrix artifact', () => {
  assertOffline();
  if (process.env.VIX_PRESENTATION_EVIDENCE_DIR) {
    fs.writeFileSync(path.join(process.env.VIX_PRESENTATION_EVIDENCE_DIR, 'presentation-matrix.json'), JSON.stringify(matrix, null, 2));
  }
});
