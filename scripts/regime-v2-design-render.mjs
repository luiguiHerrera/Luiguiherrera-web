/** Offline Designer SSR/reference verification. No browser or network timing claims. */
import './trends-test-register.mjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'docs/regime-engine-v2/designer');
const fixedCut = '2026-09-04T22:00:00.000Z';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const read = relative => readFileSync(path.join(root, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const write = (name, value) => writeFileSync(path.join(destination, name), JSON.stringify(value, null, 2) + '\n');
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/navigation') return { url: 'regime-designer-test:next/navigation', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'regime-designer-test:next/navigation') return {
      format: 'module', source: "export function usePathname() { return globalThis.__REGIME_DESIGN_PATHNAME ?? '/dashboard'; }", shortCircuit: true,
    };
    if (url.endsWith('regime-v2.module.css')) {
      const css = read('components/dashboard/regime-v2.module.css');
      const classes = Object.fromEntries([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(match => [match[1], `v2-${match[1]}`]));
      return { format: 'module', source: `export default ${JSON.stringify(classes)};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

/** Execute all actual V1 adapters/scoring with controlled unavailable HTTP providers. */
export async function generateV1Reference() {
  const priorFetch = globalThis.fetch, priorDate = globalThis.Date;
  const variables = ['V2_SHADOW', 'ALPHA_VANTAGE_API_KEY', 'FRED_API_KEY'];
  const environment = Object.fromEntries(variables.map(key => [key, process.env[key]]));
  let controlledFetches = 0;
  globalThis.Date = class extends priorDate {
    constructor(...args) { super(...(args.length ? args : [fixedCut])); }
    static now() { return priorDate.parse(fixedCut); }
  };
  globalThis.fetch = async () => { controlledFetches++; return new Response('', { status: 404 }); };
  process.env.V2_SHADOW = 'OFF';
  delete process.env.ALPHA_VANTAGE_API_KEY; delete process.env.FRED_API_KEY;
  try {
    const { getDashboardData } = await import('../lib/dashboard/get-dashboard-data.ts');
    const actual = await getDashboardData();
    return {
      regimeSummary: actual.regimeSummary,
      provenance: {
        kind: 'DESIGN_TEST_V1_REFERENCE', source: 'actual getDashboardData() and unchanged V1 adapters/scorer',
        mode: 'CONTROLLED_UNAVAILABLE_HTTP_PROVIDERS', fixedClock: fixedCut, live: false,
        httpResponse: 404, controlledFetches, actualNetworkFetches: 0, shadow: 'OFF',
        configuredApiKeys: false, apiKeysChangedOnlyWithinThisProcess: true,
        dataLimitations: 'Existing repository data and actual V1 unavailable-provider fallback rules; this is a reproducible comparison reference, not a live reading.',
        regimeSummarySha256: sha256(JSON.stringify(actual.regimeSummary)),
        sourceHashes: Object.fromEntries([
          'lib/dashboard/get-dashboard-data.ts', 'lib/dashboard/regime-scoring.ts',
          'lib/dashboard/adapters/sector-etfs.ts', 'lib/dashboard/adapters/btc-etf-flows.ts',
          'lib/dashboard/adapters/vix.ts', 'lib/dashboard/adapters/vix-term-structure.ts',
          'lib/dashboard/adapters/gld-flow-pressure.ts',
        ].map(relative => [relative, sha256(read(relative))])),
      },
    };
  } finally {
    globalThis.fetch = priorFetch; globalThis.Date = priorDate;
    for (const [key, value] of Object.entries(environment)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

const removedImportNames = ['RegimeBadge', 'ExpandableInsightCard', 'MetricCard', 'InstitutionalHero', 'QuantAnnotation', 'dataStatusLabels', 'translateDashboardText, translateRegimeLabel', 'RegimeBias'];
export function acceptedV1Parts() {
  const original = read('docs/regime-engine-v2/designer/v1-original-page.tsx.txt');
  const manifest = json('docs/regime-engine-v2/designer/input-manifest.json');
  assert.equal(sha256(original), manifest.all_input_files['app/(es)/dashboard/page.tsx']);
  const labels = original.slice(original.indexOf('const riskBiasLabels:'), original.indexOf('function MarketBreadthPanel'));
  const bodyStart = original.indexOf('export async function DashboardContent');
  const helpersStart = original.indexOf('  const biasLabels =', bodyStart);
  const helpersEnd = original.indexOf('\n\n  return (', helpersStart);
  const helpers = original.slice(helpersStart, helpersEnd);
  const jsxStart = original.indexOf('      <InstitutionalHero', helpersEnd);
  const jsxEnd = original.indexOf('\n      <ReadingCard', jsxStart);
  const jsx = original.slice(jsxStart, jsxEnd);
  assert.ok(labels && helpers && jsx);
  const imports = original.split('\n').filter(line => removedImportNames.some(name => line.startsWith(`import { ${name} }`) || line.startsWith(`import type { ${name} }`))).join('\n');
  return { original, labels, helpers, jsx, imports };
}

/** Independent reconstruction of the only permitted public-page refactor. */
export function verifyPublicExtraction() {
  const { original, labels, helpers, jsx } = acceptedV1Parts();
  let expected = original.split('\n').filter(line => !removedImportNames.some(name => line.startsWith(`import { ${name} }`) || line.startsWith(`import type { ${name} }`))).join('\n');
  expected = 'import { DashboardRegimeV1 } from "@/components/dashboard/DashboardRegimeV1";\n' + expected;
  expected = expected.replace(labels, '');
  expected = expected.replace(helpers.split('\n').slice(0, 2).join('\n') + '\n', '');
  expected = expected.replace(jsx, '      <DashboardRegimeV1 regimeSummary={regimeSummary} locale={locale} />\n');
  const currentPage = read('app/(es)/dashboard/page.tsx');
  assert.equal(currentPage, expected, 'Public page must equal only the literal V1 extraction transformation');
  const component = read('components/dashboard/DashboardRegimeV1.tsx');
  assert.ok(component.includes(labels), 'V1 bias labels must remain byte-identical');
  assert.ok(component.includes(helpers), 'V1 copy and locale transforms must remain byte-identical');
  assert.ok(component.includes(jsx), 'V1 JSX must remain byte-identical');
  return { originalSha256: sha256(original), pageSha256: sha256(currentPage), extractedComponentSha256: sha256(component), unchangedOutsideTopExtraction: true };
}

export async function originalV1Component() {
  const { labels, helpers, jsx, imports } = acceptedV1Parts();
  const source = `${imports}\n${labels}\nexport function OriginalV1({regimeSummary,locale}) {\n${helpers}\nreturn <>\n${jsx}\n</>;\n}`;
  let compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  compiled = compiled.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(path.join(root, 'node_modules/react/jsx-runtime.js')).href));
  return (await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))).OriginalV1;
}

export async function beforeFormatterReuseV2Component() {
  let source = read('docs/regime-engine-v2/designer/RegimeV2Surface.before-formatter-reuse.tsx.txt');
  source = source.replace('"./RegimeV2Disclosure"', JSON.stringify(pathToFileURL(path.join(root, 'components/dashboard/RegimeV2Disclosure.tsx')).href));
  source = source.replace('"./regime-v2.module.css"', JSON.stringify(pathToFileURL(path.join(root, 'components/dashboard/regime-v2.module.css')).href));
  let compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  compiled = compiled.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(path.join(root, 'node_modules/react/jsx-runtime.js')).href));
  return (await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))).RegimeV2Surface;
}

export function renderWithLocale(component, props, locale) {
  globalThis.__REGIME_DESIGN_PATHNAME = locale === 'en' ? '/en/dashboard' : '/dashboard';
  return renderToStaticMarkup(React.createElement(component, props));
}

function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { samples: values.length, minMs: sorted[0], medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))], maxMs: sorted.at(-1) };
}
function time(action, iterations) {
  const values = [];
  for (let index = 0; index < iterations; index++) { const start = performance.now(); action(); values.push(performance.now() - start); }
  return distribution(values);
}
function trackedSources() {
  return Object.fromEntries(['components/dashboard/DashboardRegimeV1.tsx', 'components/dashboard/RegimeV2Surface.tsx', 'components/dashboard/RegimeV2Disclosure.tsx', 'components/dashboard/regime-v2.module.css', 'lib/dashboard/regime-v2-presentation.ts'].map(relative => [relative, sha256(read(relative))]));
}

async function coldRender(kind) {
  const reference = json('docs/regime-engine-v2/designer/v1-reference.json');
  const fixture = json('docs/regime-engine-v2/designer/fixtures/selective-partial.json');
  const start = performance.now(), memoryBeforeModule = process.memoryUsage();
  let markup, presentationMs = 0;
  if (kind === 'v1') {
    const { DashboardRegimeV1 } = await import('../components/dashboard/DashboardRegimeV1.tsx');
    const renderStart = performance.now();
    markup = renderWithLocale(DashboardRegimeV1, { regimeSummary: reference.regimeSummary, locale: 'es' }, 'es');
    return { kind, moduleAndFirstRenderMs: performance.now() - start, firstRenderMs: performance.now() - renderStart, htmlBytes: Buffer.byteLength(markup), memoryBeforeModule, memoryAfterRender: process.memoryUsage() };
  }
  const { RegimeV2Surface } = await import('../components/dashboard/RegimeV2Surface.tsx');
  const { buildRegimeV2View } = await import('../lib/dashboard/regime-v2-presentation.ts');
  const presentationStart = performance.now(), view = buildRegimeV2View(fixture.output, 'es'); presentationMs = performance.now() - presentationStart;
  const renderStart = performance.now(); markup = renderWithLocale(RegimeV2Surface, { view }, 'es');
  return { kind, modulePresentationAndFirstRenderMs: performance.now() - start, presentationMs, firstRenderMs: performance.now() - renderStart, htmlBytes: Buffer.byteLength(markup), memoryBeforeModule, memoryAfterRender: process.memoryUsage() };
}

async function benchmark() {
  const hashesBefore = trackedSources(), initialMemory = process.memoryUsage();
  const { DashboardRegimeV1 } = await import('../components/dashboard/DashboardRegimeV1.tsx');
  const { RegimeV2Surface } = await import('../components/dashboard/RegimeV2Surface.tsx');
  const { buildRegimeV2View } = await import('../lib/dashboard/regime-v2-presentation.ts');
  if (globalThis.gc) globalThis.gc();
  const importedMemory = process.memoryUsage();
  const reference = json('docs/regime-engine-v2/designer/v1-reference.json');
  const matrix = json('docs/regime-engine-v2/designer/fixture-matrix.json');
  const rows = [];
  for (const locale of ['es', 'en']) {
    const v1Action = () => renderWithLocale(DashboardRegimeV1, { regimeSummary: reference.regimeSummary, locale }, locale);
    for (let index = 0; index < 30; index++) v1Action();
    const v1 = time(v1Action, 250), v1HtmlBytes = Buffer.byteLength(v1Action());
    for (const { id } of matrix.rows) {
      const fixture = json(`docs/regime-engine-v2/designer/fixtures/${id}.json`), view = buildRegimeV2View(fixture.output, locale);
      const action = () => renderWithLocale(RegimeV2Surface, { view }, locale);
      for (let index = 0; index < 20; index++) action();
      const render = time(action, 120), presentation = time(() => buildRegimeV2View(fixture.output, locale), 120);
      rows.push({ locale, id, v1, v2: render, presentation, medianRenderDeltaMs: render.medianMs - v1.medianMs,
        medianRenderRatio: render.medianMs / v1.medianMs, v1HtmlBytes, v2HtmlBytes: Buffer.byteLength(action()),
        fixtureOutputBytes: Buffer.byteLength(JSON.stringify(fixture.output)), serverViewBytes: Buffer.byteLength(JSON.stringify(view)) });
    }
  }
  const cold = [];
  for (let pair = 0; pair < 5; pair++) for (const kind of ['v1', 'v2']) {
    const started = performance.now();
    const child = spawnSync(process.execPath, ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', fileURLToPath(import.meta.url), '--cold', kind], { cwd: root, encoding: 'utf8', maxBuffer: 1_000_000 });
    assert.equal(child.status, 0, child.stderr); cold.push({ pair, processMs: performance.now() - started, ...JSON.parse(child.stdout) });
  }
  const steadyFixture = json('docs/regime-engine-v2/designer/fixtures/selective-partial.json');
  const view = buildRegimeV2View(steadyFixture.output, 'es');
  for (let index = 0; index < 200; index++) renderWithLocale(RegimeV2Surface, { view }, 'es');
  if (globalThis.gc) globalThis.gc();
  const before = process.memoryUsage();
  for (let index = 0; index < 1000; index++) renderWithLocale(RegimeV2Surface, { view }, 'es');
  if (globalThis.gc) globalThis.gc();
  const after = process.memoryUsage();
  const hashesAfter = trackedSources(); assert.deepEqual(hashesAfter, hashesBefore, 'Source changed during benchmark; rerun against final source');
  const source = read('components/dashboard/RegimeV2Surface.tsx');
  assert.doesNotMatch(source, /["']use client["']/);
  const report = {
    schemaVersion: 'regime-v2-designer-performance/1.0.0', status: 'PASS', scope: 'LOCAL_REACT_19_SERVER_RENDER',
    node: process.version, react: React.version, noSlaDefined: true,
    protocol: 'Actual extracted V1 top area versus full V2 candidate (including native disclosure content). 30 V1 / 20 V2 warmups, 250 V1 / 120 V2 measured renders per locale/state; presentation measured separately. Five fresh process pairs. No engine execution or network inside render timing.',
    limitations: ['SSR timing excludes browser layout, paint, navigation and Next build/response overhead.', 'V1 and V2 represent different data scenarios; compare component work, not market readings.', 'Cold process duration includes Node and the local TypeScript test loader; first-render figures isolate render calls.', 'CSS module classes use a deterministic local identity adapter; measured standalone HTML bytes omit Next RSC envelopes and production CSS hashes.', 'Finite warmed memory observation is not a proof against all leaks.'],
    sourcesUnchangedDuringMeasurement: true, sourceHashes: hashesAfter,
    rows, cold,
    memory: { gcAvailable: Boolean(globalThis.gc), initialBeforeImports: initialMemory, afterImports: importedMemory, before, after, heapUsedDeltaBytes: after.heapUsed - before.heapUsed, rssDeltaBytes: after.rss - before.rss, fullHarnessRssDeltaBytes: after.rss - importedMemory.rss, renders: 1000 },
    clientBoundary: { v2SurfaceServerComponent: true, dedicatedV2ClientEntrypoints: 1, normalizedInputsShippedToClient: false, fixtureGeneratorImportedIntoRender: false,
      clientEntry: 'components/dashboard/RegimeV2Disclosure.tsx', clientSourceBytes: Buffer.byteLength(read('components/dashboard/RegimeV2Disclosure.tsx')),
      clientDataProps: ['children: pre-rendered server content', 'className: CSS class'], completeViewPassedAsClientProp: false,
      disclosureMechanism: 'Native details/summary plus a small client navigation wrapper that reveals ancestor disclosures and moves keyboard focus for evidence anchors. No engine, fixture input or presentation computation crosses the client boundary.', verificationScope: 'Source inspection plus SSR; Next build route and browser asset checks recorded by root verification.' },
    verdictBasis: 'No new runtime dependency, render loop, animation or dashboard-wide client boundary. Measured absolute timing, response markup growth and finite memory observation are reported without a fabricated latency SLA.',
  };
  write('performance.json', report);
  console.log(JSON.stringify({ status: 'PASS', scope: report.scope, scenarios: rows.length,
    selectiveES: rows.find(row => row.id === 'selective-partial' && row.locale === 'es'), memory: report.memory }));
}

async function main() {
  if (process.argv.includes('--cold')) { console.log(JSON.stringify(await coldRender(process.argv[process.argv.indexOf('--cold') + 1]))); return; }
  if (process.argv.includes('--reference')) {
    const reference = await generateV1Reference(); write('v1-reference.json', reference);
    console.log(JSON.stringify({ status: 'PASS', scope: 'AUTHENTIC_V1_CONTROLLED_HTTP404_REFERENCE', regime: reference.regimeSummary.current, source: reference.provenance })); return;
  }
  if (process.argv.includes('--v1-proof')) {
    const reference = json('docs/regime-engine-v2/designer/v1-reference.json');
    const extraction = verifyPublicExtraction(), OriginalV1 = await originalV1Component();
    const { DashboardRegimeV1 } = await import('../components/dashboard/DashboardRegimeV1.tsx');
    const locales = ['es', 'en'].map(locale => {
      const props = { regimeSummary: reference.regimeSummary, locale };
      const original = renderWithLocale(OriginalV1, props, locale), current = renderWithLocale(DashboardRegimeV1, props, locale);
      assert.equal(current, original);
      return { locale, status: 'PASS', originalMarkupSha256: sha256(original), currentMarkupSha256: sha256(current), markupBytes: Buffer.byteLength(current), exactMarkupMatch: true };
    });
    const report = { status: 'PASS', scope: 'V1_LITERAL_EXTRACTION_AND_ACTUAL_REACT_SSR', extraction, locales,
      referenceSha256: sha256(read('docs/regime-engine-v2/designer/v1-reference.json')),
      publicV2Import: false, publicV2FlagBranch: false,
      originalAuthority: 'Frozen Maintainer public Dashboard page, hash verified against Designer input-manifest before extraction.',
      limitations: 'SSR markup and byte-level code preservation; browser layout, header/footer and route checks are recorded separately by Designer visual QA.' };
    write('v1-render-proof.json', report); console.log(JSON.stringify(report)); return;
  }
  if (!existsSync(path.join(destination, 'v1-reference.json'))) throw new Error('Generate --reference first');
  await benchmark();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
