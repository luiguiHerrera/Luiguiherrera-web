import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { renderToStaticMarkup } from 'react-dom/server';
import { CapitalDisclosureSection } from '../../../components/trends/CapitalDisclosureSection';
import { CapitalDisclosureTable } from '../../../components/trends/CapitalDisclosureTable';
import { getPublicCapital } from './public-capital';
import { aggregateCurrentPositions } from './positions';
import { securityKey, selectCapitalCompanies } from './normalize';
import { assertPublicCapitalPayload, assertPositionsOnlyHTML, PUBLIC_CAPITAL_FIELDS_ALLOWED, PUBLIC_CAPITAL_FIELDS_BLOCKED } from './public-contract';
import type { CapitalDataset } from './types';
import config from './config.json';

const dataset = JSON.parse(gunzipSync(readFileSync(new URL('./generated/snapshot.json.gz', import.meta.url))).toString()) as CapitalDataset;
const publicData = getPublicCapital(dataset);

test('positions-only aggregation reproduces every current long-share holder set without the comparison engine', () => {
  const current = aggregateCurrentPositions(dataset, config.security_mappings);
  const existing = selectCapitalCompanies(dataset.companies, 'shared');
  assert.equal(current.companies.length, existing.length);
  const byId = (rows: typeof current.companies) => [...rows].sort((a, b) => a.id.localeCompare(b.id)).map(row => [row.id, row.manager_ids, row.percent_disclosed, row.source_urls]);
  assert.deepEqual(byId(current.companies), byId(existing));
  assert.deepEqual(current.companies.slice(0, 8).map(row => row.id), existing.slice(0, 8).map(row => row.id));
  const isolated = new Proxy(dataset, { get(target, key, receiver) {
    if (['previous', 'movements', 'companies', 'issuers'].includes(String(key))) throw new Error(`Comparison dependency: ${String(key)}`);
    return Reflect.get(target, key, receiver);
  } });
  assert.deepEqual(getPublicCapital(isolated), publicData);
  assert.deepEqual(getPublicCapital({ ...dataset, previous: [], movements: [], companies: [], issuers: [] }), publicData);
});

test('issuer aggregation unions GOOG and GOOGL managers, with options and principal excluded', () => {
  const current = aggregateCurrentPositions(dataset, config.security_mappings);
  const alphabet = current.issuers.find(row => row.issuer === 'Alphabet')!;
  const classes = current.companies.filter(row => ['GOOG', 'GOOGL'].includes(row.ticker ?? ''));
  assert.equal(classes.length, 2);
  assert.deepEqual(alphabet.manager_ids, [...new Set(classes.flatMap(row => row.manager_ids))].sort());
  assert.ok(alphabet.managers < classes.reduce((sum, row) => sum + row.managers, 0));
  assert.ok(current.companies.every(row => row.id.endsWith('|LONG|SH')));
  const modified = structuredClone(dataset), quarter = modified.current.find(item => item.status === 'available')!;
  const position = quarter.positions.find(item => !item.put_call && item.share_type === 'SH')!;
  quarter.positions.push({ ...position, put_call: 'PUT', shares: 999999999 }, { ...position, put_call: 'CALL' }, { ...position, share_type: 'PRN' }, { ...position });
  assert.deepEqual(aggregateCurrentPositions(modified, config.security_mappings), current);
});

test('disclosed denominator 43 and expected coverage 43/44 remain separate', () => {
  assert.equal(publicData.universe_size, 44);
  assert.equal(publicData.coverage.disclosed_filers, 43);
  assert.equal(publicData.coverage.percent, 43 / 44 * 100);
  assert.ok(publicData.views[0].rows.every(row => row.eligible_disclosed_managers === 43 && row.percent_disclosed === row.manager_count / 43 * 100));
  assert.equal(publicData.views[0].rows[0].ticker_verified, 'GOOGL');
  assert.equal(publicData.views[0].rows[0].manager_count, 28);
});

test('First Eagle remains expected and unavailable; notices never become separate holdings', () => {
  const current = aggregateCurrentPositions(dataset, config.security_mappings);
  const eagle = dataset.universe.managers.find(manager => manager.display_name.includes('First Eagle'))!;
  assert.equal(eagle.filing_expected, true);
  const quarter = dataset.current.find(item => item.manager_id === eagle.manager_id)!;
  assert.equal(quarter.status, 'unavailable');
  assert.ok(quarter.issues.includes('ambiguous_additive_amendment'));
  const excludedIds = [eagle.manager_id, ...dataset.universe.managers.filter(manager => manager.status === 'NOTICE_ONLY').map(manager => manager.manager_id)];
  assert.ok(current.companies.every(row => row.manager_ids.every(id => !excludedIds.includes(id))));
  assert.ok(dataset.movements.filter(row => row.manager_id === eagle.manager_id).every(row => row.state === 'INDETERMINATE'));
  const modified = structuredClone(dataset), example = modified.current.find(item => item.status === 'available')!.positions;
  for (const item of modified.current.filter(item => excludedIds.includes(item.manager_id))) item.positions = example;
  assert.deepEqual(getPublicCapital(modified), publicData);
});

test('every published position has a verified ticker/class mapping and an actual current SEC filing', () => {
  for (const row of publicData.views[0].rows) {
    const mapping = config.security_mappings.find(item => item.ticker === row.ticker_verified)!;
    assert.equal(row.security_id, `${mapping.CUSIP}|LONG|SH`);
    assert.equal(row.security_class, mapping.security_class);
    assert.ok(row.filing_source.startsWith('https://www.sec.gov/Archives/edgar/'));
    const position = dataset.current.filter(quarter => quarter.status === 'available').flatMap(quarter => quarter.positions).find(holding => securityKey(holding) === row.security_id && holding.source_url === row.filing_source);
    assert.ok(position);
    assert.equal(position.quarter_end, publicData.quarter_end);
    assert.deepEqual(Object.keys(row).sort(), [...PUBLIC_CAPITAL_FIELDS_ALLOWED.position].sort());
  }
});

test('only an exact READY gate publishes movement views; the two reviewed internal cases grant no permission', () => {
  assert.equal(dataset.movements.filter(row => row.confidence === 'REVIEWED').length, 2);
  for (const gate of ['REVIEW_PENDING', undefined, null, 'ready', 'PARTIAL', 'BLOCKED']) {
    const payload = getPublicCapital({ ...dataset, movement_publication: gate } as CapitalDataset);
    assert.deepEqual(payload.views.map(view => view.id), ['shared']);
    assertPublicCapitalPayload(payload, gate);
    assertPositionsOnlyHTML(renderToStaticMarkup(<CapitalDisclosureSection capital={payload} locale="en" />));
  }
  // Synthetic permission exercises the future architecture; never written to data.
  const future = getPublicCapital({ ...dataset, movement_publication: 'READY' });
  assert.deepEqual(future.views.map(view => view.id), ['shared', 'new', 'increased', 'reduced', 'exited', 'disagreement']);
  assert.deepEqual(future.views[0], publicData.views[0]);
  assertPublicCapitalPayload(future, 'READY');
  assert.throws(() => assertPublicCapitalPayload(future, 'REVIEW_PENDING'));
  const html = renderToStaticMarkup(<CapitalDisclosureTable views={future.views} locale="en" available />);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 6);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
});

test('the public allowlist rejects every internal or blocked field, unknown fields and nested numeric leaks', () => {
  assertPublicCapitalPayload(publicData, dataset.movement_publication);
  for (const field of [...PUBLIC_CAPITAL_FIELDS_BLOCKED, 'unexpected_metric']) {
    const injected = structuredClone(publicData);
    Object.assign(injected.views[0].rows[0], { [field]: 123 });
    assert.throws(() => assertPublicCapitalPayload(injected, 'REVIEW_PENDING'), field);
    assert.throws(() => assertPublicCapitalPayload(Object.assign(structuredClone(publicData), { [field]: 123 }), 'REVIEW_PENDING'), field);
    const nested = structuredClone(publicData);
    Object.assign(nested.views[0].rows[0], { ticker_verified: { [field]: 'INCREASED' } });
    assert.throws(() => assertPublicCapitalPayload(nested, 'REVIEW_PENDING'), `Nested ${field}`);
  }
  const injected = structuredClone(publicData);
  injected.views[0].rows[0].theme_links = [123] as unknown as string[];
  assert.throws(() => assertPublicCapitalPayload(injected, 'REVIEW_PENDING'));
});

test('the HTML gate rejects blocked JSON fields in both SSR and escaped RSC serialization', () => {
  for (const field of PUBLIC_CAPITAL_FIELDS_BLOCKED) {
    const json = JSON.stringify({ [field]: 123 });
    for (const html of [`<script>${json}</script>`, `<script>self.__next_f.push(${JSON.stringify(json)})</script>`, json.replaceAll('"', '&quot;')]) assert.throws(() => assertPositionsOnlyHTML(html), field);
  }
  for (const state of ['NEW', 'INCREASED', 'REDUCED', 'EXITED', 'INDETERMINATE']) assert.throws(() => assertPositionsOnlyHTML(`<p>${state}</p>`));
  assert.throws(() => assertPositionsOnlyHTML('<button id="capital-tab-disagreement">Disagreement</button>'));
  assertPositionsOnlyHTML(renderToStaticMarkup(<CapitalDisclosureSection capital={publicData} locale="es" />));
});

test('inconsistent or unavailable coverage withholds all public rows without turning it into zero holdings', () => {
  for (const modified of [{ ...dataset, quality: 'unavailable' }, { ...dataset, coverage: { ...dataset.coverage, eligible_disclosed_managers: 44 } }]) {
    const payload = getPublicCapital(modified as CapitalDataset);
    assert.equal(payload.quality, 'unavailable');
    assert.equal(payload.coverage.disclosed_filers, null);
    assert.equal(payload.coverage.percent, null);
    assert.deepEqual(payload.views, [{ id: 'shared', rows: [] }]);
  }
});

test('ES and EN render identical securities, counts, denominators and percentages', () => {
  const numbers = (locale: 'es' | 'en') => {
    const html = renderToStaticMarkup(<CapitalDisclosureSection capital={publicData} locale={locale} />);
    assertPositionsOnlyHTML(html);
    assert.equal((html.match(/43 \/ 44/g) ?? []).length, 1);
    return [...html.matchAll(/<td[^>]*>([^<]+)<\/td>/g)].map(match => match[1].replace(',', '.'));
  };
  assert.deepEqual(numbers('es'), numbers('en'));
});
