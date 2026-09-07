import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { TrendsExplorer } from '../../components/trends/TrendsExplorer';
import { TrendRadar } from '../../components/trends/TrendRadar';
import { CapitalDisclosureTable } from '../../components/trends/CapitalDisclosureTable';
import { CapitalDisclosureSection } from '../../components/trends/CapitalDisclosureSection';
import { TrendDetailPage } from '../../components/trends/TrendDetailPage';
import { TrendsMethodologyPage } from '../../components/trends/TrendsMethodologyPage';
import { trendCatalog, filterTrends, trendPath, trendsMethodologyPath } from './catalog';
import { getRadarTrends, getTrendDetail } from './details';
import { trendsCopy } from './copy';
import { capitalCopy } from './capital/copy';
import { getPublicCapital } from './capital/public-capital';
import { assertPositionsOnlyHTML, type PublicCapitalView } from './capital/public-contract';
import { trendsMethodologyCopy } from './methodology-copy';
import type { CapitalDataset } from './capital/types';
import { getRouteMetadata, languageAlternates } from '../seo/site';
import { translatePathname } from '../i18n/routes';
const dataset = JSON.parse(gunzipSync(readFileSync(new URL('./capital/generated/snapshot.json.gz', import.meta.url))).toString()) as CapitalDataset;
const emptyViews: PublicCapitalView[] = [{ id: "shared", rows: [] }];
for (const locale of ['es', 'en'] as const) {
  test(`server rendering ${locale}: editorial content, real coverage and no repeated old sections`, async () => {
    const html = renderToStaticMarkup(await TrendsExplorer({ locale }));
    assert.ok(html.includes(trendsCopy[locale].hero.title));
    assert.ok(html.includes(trendsCopy[locale].current.title));
    assert.ok(html.includes(capitalCopy[locale].partial));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.equal((html.match(/<article\b/g) ?? []).length, 19);
    assert.ok(!html.includes('reading-card') && !html.includes('DataRoma') && !html.includes('47 gestores'));
    assert.ok(html.includes('CollectionPage') && html.includes('BreadcrumbList'));
    assert.ok(html.includes('13F · Q2 2026'));
    assert.ok(html.includes('43 / 44'));
    assert.ok(!html.includes('1,026'));
    assert.equal((html.match(/43 \/ 44/g) ?? []).length, 1);
    assertPositionsOnlyHTML(html);
    for (const tab of ['new', 'increased', 'reduced', 'exited', 'disagreement'] as const) assert.ok(!html.includes(capitalCopy[locale].tabs[tab]));
  });
  test(`${locale} radar categories and empty state`, () => {
    const trends = getRadarTrends(locale);
    assert.equal(trends.length, 15);
    for (const category of ['technology', 'resources', 'health', 'security', 'finance', 'consumption'] as const) assert.ok(filterTrends(trends, category).every((trend) => trend.category === category));
    assert.equal(filterTrends(trends, 'all').length, 15);
    const html = renderToStaticMarkup(<TrendRadar trends={[]} locale={locale} />);
    assert.ok(html.includes(trendsCopy[locale].radar.empty));
    assert.ok(html.includes('aria-pressed="true"'));
  });
  test(`${locale} capital has one complete view, five columns, a mobile list and honest unavailable states`, () => {
    const { views } = getPublicCapital(dataset);
    const html = renderToStaticMarkup(<CapitalDisclosureTable views={views} locale={locale} available />);
    assert.equal((html.match(/role="tab"/g) ?? []).length, 0);
    assert.equal((html.match(/<th scope="col"/g) ?? []).length, 5);
    assert.ok(html.includes(capitalCopy[locale].tabs.shared));
    assertPositionsOnlyHTML(html);
    assert.ok(html.includes('lg:hidden') && html.includes('hidden lg:block'));
    assert.ok(html.includes('/ 43'));
    assert.ok(!html.includes('↑ 0'));
    const empty = renderToStaticMarkup(<CapitalDisclosureTable views={emptyViews} locale={locale} available />);
    assert.ok(empty.includes(capitalCopy[locale].empty));
    const missing = renderToStaticMarkup(<CapitalDisclosureTable views={emptyViews} locale={locale} available={false} />);
    assert.ok(missing.includes(capitalCopy[locale].unavailable));
    const unavailable = renderToStaticMarkup(<CapitalDisclosureSection capital={getPublicCapital({ ...dataset, quality: 'unavailable', companies: [], coverage: { ...dataset.coverage, disclosed_filers: null, eligible_disclosed_managers: null, percent: null, comparable: null } })} locale={locale} />);
    assert.ok(unavailable.includes(capitalCopy[locale].unavailable) && !unavailable.includes('0%'));
  });
  test(`${locale} trend details and methodology render with all source links and stable routes`, async () => {
    for (const definition of trendCatalog) {
      const content = getTrendDetail(definition, locale);
      assert.ok(content.short && content.changing && content.evidenceNote.url && content.failure && content.capture);
      const route = trendPath(definition, locale);
      const metadata = getRouteMetadata(route);
      assert.ok(metadata.alternates?.canonical?.toString().endsWith(route));
      assert.equal(translatePathname(route, locale === 'es' ? 'en' : 'es'), trendPath(definition, locale === 'es' ? 'en' : 'es'));
      assert.ok(languageAlternates(route)?.['x-default']);
    }
    const html = renderToStaticMarkup(await TrendDetailPage({ definition: trendCatalog[0], locale }));
    assert.ok(html.includes('AI Index 2026') && html.includes('GOOGL') && html.includes('symbol=AIQ'));
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    const methodology = renderToStaticMarkup(await TrendsMethodologyPage({ locale }));
    assert.ok(methodology.includes('13F-NT') && methodology.includes(trendsMethodologyCopy[locale].movementPending) && methodology.includes('0001336528'));
    assert.ok(getRouteMetadata(trendsMethodologyPath(locale)).alternates?.canonical);
    assertPositionsOnlyHTML(html);
    assertPositionsOnlyHTML(methodology);
  });
}
test('ES and EN use identical phase/evidence/category/vehicle identifiers and numeric capital data', () => {
  assert.deepEqual(getRadarTrends('es').map(({ id, category, phase, evidence }) => ({ id, category, phase, evidence })), getRadarTrends('en').map(({ id, category, phase, evidence }) => ({ id, category, phase, evidence })));
  for (const definition of trendCatalog) assert.deepEqual(getTrendDetail(definition, 'es').observableVehicles.map(({ ticker, kind, statisticalLevelsSymbol }) => ({ ticker, kind, statisticalLevelsSymbol })), getTrendDetail(definition, 'en').observableVehicles.map(({ ticker, kind, statisticalLevelsSymbol }) => ({ ticker, kind, statisticalLevelsSymbol })));
});
test('internal reviewed movements cannot appear in the published shared view', () => {
  const goog = dataset.companies.find(row => row.ticker === 'GOOG')!;
  assert.equal(goog.increased, 1); assert.equal(goog.reduced, 1);
  const html = renderToStaticMarkup(<CapitalDisclosureTable views={getPublicCapital(dataset).views} locale="es" available />);
  assertPositionsOnlyHTML(html);
  assert.ok(!html.includes('↑') && !html.includes('↓') && !html.includes('1+'));
});
test('refresh failures retain the original as_of and explain the degraded state in both locales', () => {
  for(const locale of ['es','en'] as const) {
    const html=renderToStaticMarkup(<CapitalDisclosureSection capital={getPublicCapital({...dataset,freshness:'stale',refresh_failure:'2026-09-07T12:00:00Z'})} locale={locale} />);
    assert.ok(html.includes(capitalCopy[locale].refreshFailed));
    assert.ok(html.includes(dataset.as_of));
    assert.ok(!html.includes('datetime="2026-09-07T12:00:00Z"'));
  }
});
