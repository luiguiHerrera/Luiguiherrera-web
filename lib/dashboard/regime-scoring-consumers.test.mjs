// Offline integration: reuse the accepted sector harness and its real consumers.
// All source inputs are synthetic; no historical FRED body is available here.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const harnessFile = path.join(root, 'lib/dashboard/sector-failure-handling.test.mjs');
const harnessSource = fs.readFileSync(harnessFile, 'utf8');
const boundary = harnessSource.indexOf("\ntest('A/D/F:");
assert.ok(boundary > 0, 'existing harness boundary');
function compile(source, filename, require) {
  const testModule = { exports: {} };
  const code = ts.transpileModule(source.replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(require, testModule, testModule.exports);
  return testModule.exports;
}
const { harness, elements, assertOffline } = compile(harnessSource.slice(0, boundary)
  + '\nexport { harness, elements }; export function assertOffline() { assert.equal(transportAttempts, 0); }', harnessFile, req);

function withMissingVix() {
  const h = harness({ mode: 'valid' });
  Object.assign(h.vix, h.load('lib/dashboard/adapters/vix.ts').buildVixDashboardData([]));
  return h;
}
function incomplete(summary) {
  assert.equal(summary.current, 'Incompleto');
  assert.equal(summary.bias, 'unavailable');
  assert.equal(summary.dataStatus, 'unavailable');
  assert.equal(summary.regimeScore, null);
  assert.equal(summary.confidence, null);
  assert.equal(JSON.stringify(summary.cautionSignals.map(s => s.label)), '["VIX"]');
}
function sectorsPresent(data) {
  assert.equal(data.dataStatus, 'automated');
  assert.equal(data.sectors.length, 11);
}

test('missing VIX: real Dashboard, home cache and weekly builder preserve independent modules', async () => {
  const h = withMissingVix();
  const dashboard = await h.render(h.load('lib/dashboard/get-dashboard-data.ts').getDashboardData);
  incomplete(dashboard.regimeSummary); sectorsPresent(dashboard.sectorRotation);
  assert.equal(dashboard.quantRisk.dataStatus, 'automated');
  assert.ok(Number.isFinite(dashboard.quantRisk.fragilityScore));
  assert.equal(dashboard.btcEtfFlows, h.btc); assert.equal(dashboard.vixTermStructure, h.term);
  const getHome = h.load('lib/dashboard/get-home-dashboard-preview-data.ts').getHomeDashboardPreviewData;
  const home = await h.render(getHome);
  incomplete(home.regimeSummary); sectorsPresent(home.sectorRotation);
  const calls = { ...h.calls };
  const cached = await h.render(getHome);
  incomplete(cached.regimeSummary); sectorsPresent(cached.sectorRotation);
  assert.deepEqual(h.calls, calls);
  const weekly = await h.render(h.load('lib/reports/build-weekly-report-data.ts').buildWeeklyReportData);
  incomplete(weekly.regimeSummary); sectorsPresent(weekly.sectors.data);
  assert.ok(weekly.sectors.leaders.length > 0); assert.ok(weekly.sectors.laggards.length > 0);
  assert.equal(weekly.volatility.vix.spot.latestVix, null);
  assert.equal(weekly.flows.btcEtfFlows, h.btc);
  assert.equal(h.calls.provider, 11); assertOffline();
});

test('missing VIX: real routes preserve sectors and the legacy Spanish weekly redirect', async () => {
  const h = withMissingVix();
  const dashboard = h.load('app/(es)/dashboard/page.tsx');
  for (const locale of ['es', 'en']) {
    const tree = await h.render(() => dashboard.DashboardContent({ locale }));
    incomplete(elements(tree, 'IntegratedRegimeModule')[0].props.data);
    assert.equal(elements(tree, 'SectorRotationUnavailable').length, 0);
    assert.equal(elements(tree, 'QuantRiskPanel')[0].props.data.dataStatus, 'automated');
    assert.equal(elements(tree, 'VixModule')[0].props.data.spot.dataStatus, 'unavailable');
  }
  const english = await h.render(h.load('app/en/dashboard/page.tsx').default);
  assert.equal(english.type, dashboard.DashboardContent); assert.equal(english.props.locale, 'en');
  for (const route of ['app/(es)/page.tsx', 'app/en/page.tsx']) {
    const tree = await h.render(h.load(route).default);
    const preview = elements(tree, 'HomeDashboardPreview')[0].props;
    incomplete(preview.regimeSummary); sectorsPresent(preview.sectorRotation);
    assert.equal(preview.vix.spot.latestVix, null);
  }
  for (const route of ['app/en/weekly-report/page.tsx']) {
    const tree = await h.render(h.load(route).default);
    const report = elements(tree, 'WeeklyReport')[0].props.data;
    incomplete(report.regimeSummary); sectorsPresent(report.sectors.data);
  }
  const legacyFile = path.join(root, 'app/(es)/informe-semanal/page.tsx');
  const legacy = compile(fs.readFileSync(legacyFile, 'utf8'), legacyFile, req);
  assert.throws(legacy.default, error => error.digest === 'NEXT_REDIRECT;replace;/informes;307;');
  assertOffline();
});

// Render the actual presentation components and their children as well as checking
// route props above. Only Next navigation/link bindings are replaced; no web server.
function presentationLoader(locale) {
  const modules = new Map();
  function load(filename) {
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (modules.has(filename)) return modules.get(filename);
    const localRequire = name => {
      if (name === 'next/navigation') return { usePathname: () => locale === 'en' ? '/en/dashboard' : '/dashboard' };
      if (name === 'next/link') return { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) };
      if (name.startsWith('@/')) return load(path.join(root, name.slice(2)));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      return req(name);
    };
    const exports = compile(fs.readFileSync(filename, 'utf8'), filename, localRequire);
    modules.set(filename, exports); return exports;
  }
  return relative => load(path.join(root, relative));
}

for (const locale of ['es', 'en']) {
  test(`missing VIX: actual regime, VIX, home and weekly components render offline in ${locale}`, async () => {
    const h = withMissingVix();
    const data = await h.render(h.load('lib/dashboard/get-dashboard-data.ts').getDashboardData);
    const weekly = await h.render(h.load('lib/reports/build-weekly-report-data.ts').buildWeeklyReportData);
    const load = presentationLoader(locale);
    const components = [
      ['components/dashboard/IntegratedRegimeModule.tsx', 'IntegratedRegimeModule', { data: data.regimeSummary, locale, provenance: [] }],
      ['components/dashboard/VixModule.tsx', 'VixModule', { data: data.vix }],
      ['components/home/HomeDashboardPreview.tsx', 'HomeDashboardPreview', { ...data, locale }],
      ['components/reports/WeeklyReport.tsx', 'WeeklyReport', { data: weekly, locale }],
    ];
    for (const [file, name, props] of components) {
      const html = renderToStaticMarkup(React.createElement(load(file)[name], props));
      assert.ok(html.length > 100, name);
      assert.doesNotMatch(html, /NaN|undefined|Fallback demo/, name);
      if (name !== 'VixModule') assert.ok(html.includes(locale === 'en' ? 'Incomplete' : 'Incompleto'), name);
      if (name === 'IntegratedRegimeModule') {
        assert.ok(html.includes(locale === 'en' ? 'VIX pillar missing or invalid.' : 'Pilar VIX ausente o inválido.'));
        assert.doesNotMatch(html, /\d+\/100|\d+%<\/p>/);
      }
    }
    assertOffline();
  });
}
