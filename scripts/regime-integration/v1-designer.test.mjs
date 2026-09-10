// Integration scope: two fresh-remote bindings plus the six unchanged private SSR assertions.
import './v1-render-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { originalV1Component, beforeFormatterReuseV2Component, renderWithLocale } from '../regime-v2-design-render.mjs';
import { publicProof } from './v1-public-proof.mjs';
const reference = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/designer/v1-reference.json', import.meta.url), 'utf8'));

test('integration Designer public binding preserves the exact fresh-remote page and its actual SSR', () => {
  const {baseline,integrated}=publicProof();
  const file='app/(es)/dashboard/page.tsx';
  assert.equal(integrated.sourceHashes[file],baseline.sourceHashes[file]);
  for(const route of ['/dashboard','/en/dashboard'])assert.equal(integrated.routeResults.find(row=>row.route===route).html,baseline.routeResults.find(row=>row.route===route).html);
});
test('integration Designer V1 reference is produced by the actual fresh-remote adapters and scorer', () => {
  const {baseline,integrated}=publicProof();
  assert.deepEqual(integrated.observables.dashboardValue,baseline.observables.dashboardValue);
  assert.equal(integrated.sourceHashes['lib/dashboard/regime-scoring.ts'],baseline.sourceHashes['lib/dashboard/regime-scoring.ts']);
  assert.equal(integrated.actualNetworkRequests,0);
  assert.equal(integrated.controlledHttpStatus,404);
});

for (const locale of ['es', 'en']) test(`V1 ${locale} extracted SSR markup equals accepted original literal JSX exactly`, async () => {
  const OriginalV1 = await originalV1Component();
  const { DashboardRegimeV1 } = await import('../../components/dashboard/DashboardRegimeV1.tsx');
  const props = { regimeSummary: reference.regimeSummary, locale };
  const before = renderWithLocale(OriginalV1, props, locale), after = renderWithLocale(DashboardRegimeV1, props, locale);
  assert.equal(after, before);
  assert.ok(after.includes('Score'));
  assert.ok(after.includes(locale === 'es' ? 'Ampliar contexto' : 'Expand context'));
});

for (const locale of ['es', 'en']) test(`Every V2 ${locale} fixture has resolved evidence anchors and progressive disclosure in actual SSR`, async () => {
  const { RegimeV2Surface } = await import('../../components/dashboard/RegimeV2Surface.tsx');
  const { buildRegimeV2View } = await import('../../lib/dashboard/regime-v2-presentation.ts');
  const matrix = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/designer/fixture-matrix.json', import.meta.url), 'utf8'));
  for (const row of matrix.rows) {
    const fixture = JSON.parse(readFileSync(new URL(`../../docs/regime-engine-v2/designer/fixtures/${row.id}.json`, import.meta.url), 'utf8'));
    const view = buildRegimeV2View(fixture.output, locale), html = renderWithLocale(RegimeV2Surface, { view }, locale);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${row.id} duplicate DOM IDs`);
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `${row.id}: unresolved ${match[1]}`);
    const hero = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
    assert.ok(hero.includes(view.title));
    assert.doesNotMatch(hero, /\bScore\b|\bConfidence\b|Confianza|\bBullishness\b/);
    assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
    assert.ok(html.includes('id="v2-evidence"'));
    assert.ok(html.includes('id="v2-methodology"'));
    assert.doesNotMatch(html, /<details\b[^>]*\bopen(?:=|\s|>)/);
    if (fixture.output.systemState === 'INCOMPLETE') {
      assert.ok(hero.includes(view.labels.technical));
      assert.ok(hero.includes(view.labels.pending));
      assert.doesNotMatch(hero, /data-claim-group=/);
      assert.doesNotMatch(hero, /data-state="(?:STRESS|TRANSITION)"/);
    }
  }
});

for (const locale of ['es', 'en']) test(`Bounded formatter reuse preserves exact V2 ${locale} SSR markup across every fixture`, async () => {
  const BeforeFormatterReuseV2 = await beforeFormatterReuseV2Component();
  const { RegimeV2Surface } = await import('../../components/dashboard/RegimeV2Surface.tsx');
  const { buildRegimeV2View } = await import('../../lib/dashboard/regime-v2-presentation.ts');
  const matrix = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/designer/fixture-matrix.json', import.meta.url), 'utf8'));
  for (const { id } of matrix.rows) {
    const fixture = JSON.parse(readFileSync(new URL(`../../docs/regime-engine-v2/designer/fixtures/${id}.json`, import.meta.url), 'utf8'));
    const view = buildRegimeV2View(fixture.output, locale);
    assert.equal(renderWithLocale(RegimeV2Surface, { view }, locale), renderWithLocale(BeforeFormatterReuseV2, { view }, locale), id);
  }
});
