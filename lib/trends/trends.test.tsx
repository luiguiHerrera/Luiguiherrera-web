import assert from 'node:assert/strict';
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {CapitalDisclosureTable} from '../../components/trends/CapitalDisclosureTable';
import {CapitalDisclosureSection} from '../../components/trends/CapitalDisclosureSection';
import {capitalCopy} from './capital/copy';
import {getPublicCapital} from './capital/public-capital';
import {assertPositionsOnlyHTML,type PublicCapitalView} from './capital/public-contract';
import type {CapitalDataset} from './capital/types';
const dataset = JSON.parse(gunzipSync(readFileSync(new URL('./capital/generated/snapshot.json.gz',import.meta.url))).toString()) as CapitalDataset;
const emptyViews:PublicCapitalView[]=[{id:'shared',rows:[]}];
// Existing automated capital views retain their independent positions-only contract.
// The package-based Trends research snapshot is verified in research/research.test.tsx.
for(const locale of ['es','en'] as const){
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
}
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
