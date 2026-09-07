import assert from 'node:assert/strict';
import { trendCatalog, trendPath, trendsPath, trendsMethodologyPath } from '../lib/trends/catalog.ts';
import { SITE_URL } from '../lib/seo/site.ts';
import { assertPositionsOnlyHTML } from '../lib/trends/capital/public-contract.ts';
const base = process.env.TRENDS_TEST_URL ?? 'http://127.0.0.1:3010';
if (!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname)) throw new Error('This validator targets local previews only.');
let count = 0;
for (const locale of ['es','en'] as const) {
  for (const route of [trendsPath(locale), trendsMethodologyPath(locale), ...trendCatalog.map((trend) => trendPath(trend, locale))]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assertPositionsOnlyHTML(html);
    assert.ok(html.includes(`<html lang="${locale}"`), route);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, route);
    assert.ok(html.includes(`rel="canonical" href="${SITE_URL}${route}"`), route);
    assert.ok(html.includes('hrefLang="es"') && html.includes('hrefLang="en"'), route);
    assert.ok(html.includes('application/ld+json') && html.includes('BreadcrumbList'), route);
    assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;404') && !html.includes('Internal Server Error'), route);
    for (const [, href] of html.matchAll(/href="(#[^"\s]+)"/g)) assert.ok(html.includes(`id="${href.slice(1)}"`), `${route}: missing ${href}`);
    count++;
  }
}
for (const route of ['/tendencias/no-such-trend','/en/trends/no-such-trend']) assert.equal((await fetch(base + route)).status, 404, route);
console.log(JSON.stringify({ state: 'PASS', routes: count, missing_routes: '404', locales: ['es','en'], canonical: 'PASS', hreflang: 'PASS', structured_data: 'PASS', headings: 'PASS', anchors: 'PASS', positions_only_html_and_rsc: 'PASS' }));
