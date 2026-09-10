import '../../scripts/trends-test-register.mjs';
import assert from 'node:assert/strict';
import { after, mock, test } from 'node:test';
import { registerHooks } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../../', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const originalFetch = globalThis.fetch, OriginalDate = Date;
const environmentKeys = ['V2_SHADOW', 'V2_SHADOW_JOB_ENABLED', 'V2_SHADOW_DIR', 'V2_SHADOW_INPUT', 'FRED_API_KEY', 'ALPHA_VANTAGE_API_KEY'];
const originalEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
const calls = [], routeEvidence = [];
let v2Mode = 'THROW', v1Failure = null, requests = [];
const never = new Promise(() => {});
const forbidden = name => () => {
  calls.push(name);
  if (v2Mode === 'PENDING') return never;
  throw new Error(`PUBLIC_V2_EXECUTION_FORBIDDEN:${name}`);
};

// Only Next UI shims are substituted. The route functions, V1 aggregators,
// adapters, scorer and component tree execute from the application sources.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/image' || specifier === 'next/navigation') return { url: `public-isolation:${specifier}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'public-isolation:next/image') return { format: 'module', source: `import React from ${JSON.stringify(new URL('node_modules/react/index.js', root).href)}; export default function Image({src,alt}) { return React.createElement('img',{src,alt}); }`, shortCircuit: true };
    if (url === 'public-isolation:next/navigation') return { format: 'module', source: "export function usePathname(){return globalThis.__PUBLIC_ISOLATION_PATHNAME ?? '/';}", shortCircuit: true };
    return nextLoad(url, context);
  },
});

mock.module(new URL('../regime-engine-v2/operations/dashboard-shadow.ts', import.meta.url).href, {
  namedExports: { withDashboardShadow: forbidden('withDashboardShadow') },
});
mock.module(new URL('../regime-engine-v2/engine.ts', import.meta.url).href, {
  namedExports: { evaluateRegime: forbidden('evaluateRegime'), RegimeInputError: class extends Error {} },
});
mock.module(new URL('../regime-engine-v2/capture.ts', import.meta.url).href, {
  namedExports: { captureScope: forbidden('captureScope'), persistCapture: forbidden('persistCapture'), readCapture: forbidden('readCapture') },
});
mock.module(new URL('../regime-engine-v2/operations/snapshot.ts', import.meta.url).href, {
  namedExports: { createSnapshot: forbidden('createSnapshot'), persistSnapshot: forbidden('persistSnapshot'), readSnapshot: forbidden('readSnapshot'), replaySnapshot: forbidden('replaySnapshot') },
});
mock.module(new URL('../regime-engine-v2/normalize.ts', import.meta.url).href, {
  namedExports: Object.fromEntries(['normalizeYahoo', 'normalizeVixCsv', 'normalizeVxHistory', 'normalizeMonthlyCatalog', 'assembleVx', 'normalizeBtcTable', 'normalizeGldRows', 'parseNumericCell'].map(name => [name, forbidden(name)])),
});
mock.module(new URL('../regime-engine-v2/operations/source-input.ts', import.meta.url).href, {
  namedExports: {
    prepareSourceVintage: forbidden('prepareSourceVintage'), resolveSourceVintage: forbidden('resolveSourceVintage'), prepareSourceInput: forbidden('prepareSourceInput'),
    SOURCE_BUNDLE_VERSION: 'TEST_SENTINEL', SOURCE_PREPARATION_VERSION: 'TEST_SENTINEL',
  },
});

const sectorAdapter = await import('./adapters/sector-etfs.ts');
mock.module(new URL('./adapters/sector-etfs.ts', import.meta.url).href, {
  namedExports: { getSectorEtfsData: (...args) => v1Failure ? Promise.reject(v1Failure) : sectorAdapter.getSectorEtfsData(...args) },
});

globalThis.Date = class extends OriginalDate {
  constructor(...args) { super(...(args.length ? args : ['2026-09-04T22:00:00.000Z'])); }
  static now() { return OriginalDate.parse('2026-09-04T22:00:00.000Z'); }
};
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  requests.push({ url: url.origin + url.pathname, method: init.method ?? 'GET', cache: init.cache ?? null, next: init.next ?? null });
  return new Response('', { status: 404 });
};
delete process.env.FRED_API_KEY;
delete process.env.ALPHA_VANTAGE_API_KEY;
process.env.V2_SHADOW_DIR = '/public-must-not-consult-shadow-store';
process.env.V2_SHADOW_INPUT = '/public-must-not-consult-shadow-bundle.json';

const { getDashboardData } = await import('./get-dashboard-data.ts');
const { getHomeDashboardPreviewData } = await import('./get-home-dashboard-preview-data.ts');
const routes = [
  { path: '/dashboard', module: await import('../../app/(es)/dashboard/page.tsx') },
  { path: '/en/dashboard', module: await import('../../app/en/dashboard/page.tsx') },
  { path: '/', module: await import('../../app/(es)/page.tsx') },
  { path: '/en', module: await import('../../app/en/page.tsx') },
];
const config = (legacy, job) => { process.env.V2_SHADOW = legacy; process.env.V2_SHADOW_JOB_ENABLED = job; };
const requestIdentity = () => JSON.stringify([...requests].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
async function routeMarkup(route) {
  globalThis.__PUBLIC_ISOLATION_PATHNAME = route.path;
  let tree = await route.module.default();
  // Both Dashboard route entries return their actual shared async content.
  while (React.isValidElement(tree) && typeof tree.type === 'function' && tree.type.constructor.name === 'AsyncFunction') tree = await tree.type(tree.props);
  return renderToStaticMarkup(tree);
}

test('public aggregators restore the independently frozen V1 source bytes exactly', () => {
  const accepted = JSON.parse(readFileSync(new URL('docs/regime-engine-v2/maintainer/input-manifest.json', root), 'utf8'));
  for (const file of ['get-dashboard-data.ts', 'get-home-dashboard-preview-data.ts']) {
    const relative = `lib/dashboard/${file}`, source = readFileSync(new URL(relative, root), 'utf8');
    assert.equal(sha(source), accepted.all_input_files[relative]);
    assert.doesNotMatch(source, /withDashboardShadow|regime-engine-v2|V2_SHADOW/);
  }
});

for (const route of routes) test(`${route.path}: legacy/job flags cannot execute or delay V2, change HTML or V1 cache options`, async () => {
  config('OFF', 'OFF'); requests = [];
  const expectedMarkup = await routeMarkup(route), expectedRequests = requestIdentity();
  for (const [legacy, job] of [['OFF', 'ON'], ['ON', 'OFF'], ['ON', 'ON']]) {
    for (const mode of ['THROW', 'PENDING']) {
      config(legacy, job); v2Mode = mode; requests = [];
      let deadline;
      try {
        const actual = await Promise.race([
          routeMarkup(route),
          new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('PUBLIC_WAITED_FOR_NEVER_RESOLVING_V2')), 1000); }),
        ]);
        assert.equal(actual, expectedMarkup);
        assert.equal(requestIdentity(), expectedRequests);
        assert.deepEqual(calls, []);
      } finally { clearTimeout(deadline); }
    }
  }
  routeEvidence.push({ route: route.path, status: 'PASS', flagCombinations: 4, brokenAndNeverResolvingV2: true, V2Calls: 0, htmlSha256: sha(expectedMarkup), requestOptionsSha256: sha(expectedRequests) });
});

for (const [name, load] of [['Dashboard', getDashboardData], ['home', getHomeDashboardPreviewData]]) test(`${name}: V1 failure is propagated by identity even when legacy and job flags are ON`, async () => {
  config('ON', 'ON'); v1Failure = new Error(`ORIGINAL_${name}_V1_FAILURE`);
  try { await assert.rejects(load(), error => error === v1Failure); assert.deepEqual(calls, []); }
  finally { v1Failure = null; }
});

after(async () => {
  // Promise.all preserves V1's early rejection. Let its already-started mock
  // adapter branches settle before restoring the process fetch implementation.
  await new Promise(resolve => setImmediate(resolve));
  globalThis.fetch = originalFetch; globalThis.Date = OriginalDate;
  delete globalThis.__PUBLIC_ISOLATION_PATHNAME;
  for (const [key, value] of Object.entries(originalEnvironment)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  if (process.env.REGIME_R1_PUBLIC_AUDIT) {
    writeFileSync(process.env.REGIME_R1_PUBLIC_AUDIT, JSON.stringify({
      scope: 'Application route/SSR and actual V1 adapters with controlled HTTP404, fixed test clock and Next UI shims; not live acquisition or an HTTP server latency measurement.',
      source: fileURLToPath(import.meta.url), routes: routeEvidence, V2FunctionCalls: calls,
      noV2Execution: calls.length === 0, actualNetworkAcquisitions: 0,
      latencyProperty: 'Broken and never-resolving V2 sentinels are never called. There is no V2 promise to await; no claim of zero nanoseconds or a production SLA.',
    }, null, 2) + '\n');
  }
});
