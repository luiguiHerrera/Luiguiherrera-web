import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateV1Reference, verifyPublicExtraction, originalV1Component, beforeFormatterReuseV2Component, renderWithLocale } from '../../scripts/regime-v2-design-render.mjs';
const reference = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/designer/v1-reference.json', import.meta.url), 'utf8'));

test('Designer public page contains only the exact accepted V1 top-area extraction', () => {
  assert.equal(verifyPublicExtraction().unchangedOutsideTopExtraction, true);
});
test('V1 preview reference is reproduced by actual adapters and scoring with unavailable providers', async () => {
  const generated = await generateV1Reference();
  const originalV1 = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/maintainer/input-manifest.json', import.meta.url), 'utf8'));
  const aggregator = 'lib/dashboard/get-dashboard-data.ts';
  // Public isolation restores the exact pre-Maintainer V1 aggregator. Keep the
  // frozen reading/copy oracle; only this independently frozen source identity changes.
  const sourceHash = originalV1.all_input_files[aggregator];
  assert.equal(generated.provenance.sourceHashes[aggregator], sourceHash);
  assert.deepEqual(generated, {
    ...reference,
    provenance: {
      ...reference.provenance,
      sourceHashes: { ...reference.provenance.sourceHashes, [aggregator]: sourceHash },
    },
  });
  assert.equal(generated.provenance.actualNetworkFetches, 0);
  assert.equal(generated.provenance.live, false);
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
  const { buildRegimeV2View } = await import('./regime-v2-presentation.ts');
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
  const { buildRegimeV2View } = await import('./regime-v2-presentation.ts');
  const matrix = JSON.parse(readFileSync(new URL('../../docs/regime-engine-v2/designer/fixture-matrix.json', import.meta.url), 'utf8'));
  for (const { id } of matrix.rows) {
    const fixture = JSON.parse(readFileSync(new URL(`../../docs/regime-engine-v2/designer/fixtures/${id}.json`, import.meta.url), 'utf8'));
    const view = buildRegimeV2View(fixture.output, locale);
    assert.equal(renderWithLocale(RegimeV2Surface, { view }, locale), renderWithLocale(BeforeFormatterReuseV2, { view }, locale), id);
  }
});
