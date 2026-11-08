import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.REPORTS_PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.REPORTS_QA_URL ?? 'http://127.0.0.1:3186';
const output = process.env.REPORTS_QA_OUTPUT ?? '/private/tmp/ct-november-qa/browser';
const slug = 'primer-informe-noviembre-2026';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.REPORTS_BROWSER_EXECUTABLE ? { executablePath: process.env.REPORTS_BROWSER_EXECUTABLE } : {}) });
const result = { base, viewports: [], downloads: [], externalRequests: [], errors: [] };
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, locale: 'es-ES' });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== new URL(base).origin) {
        result.externalRequests.push(route.request().url()); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => result.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') result.errors.push(message.text()); });
    const prefix = `${viewport.width}`;
    const response = await page.goto(`${base}/informes/${slug}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.screenshot({ path: path.join(output, `${prefix}-hero.png`) });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('[data-native-report-section]').count(), 7);
    assert.equal(await page.locator('article table').count(), 8);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://www.luiguiherrera.com/informes/${slug}`);
    const robots = await page.locator('meta[name=robots]').evaluateAll(elements => elements.map(element => element.getAttribute('content') ?? ''));
    assert(robots.every(value => !value.includes('noindex')));
    const article = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert(article.join('').includes('"datePublished":"2026-11-03"'));
    const asset = page.locator('#noviembre-spy');
    await asset.locator('summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await asset.getAttribute('open'), '');
    await page.keyboard.press('Enter'); assert.equal(await asset.getAttribute('open'), null);
    await page.locator('nav[aria-label="Activos del informe"] a[href="#noviembre-stockpicking"]').click();
    await page.waitForFunction(() => document.getElementById('noviembre-stockpicking').open);
    await page.locator('#noviembre-stockpicking').screenshot({ path: path.join(output, `${prefix}-earnings.png`) });
    await page.locator('#lecturas-mercado-cierre').screenshot({ path: path.join(output, `${prefix}-market.png`) });
    const calendar = page.locator('summary', { hasText: 'Explorar el calendario de noviembre' });
    await calendar.click();
    await page.locator('#estacionalidad-calendario').screenshot({ path: path.join(output, `${prefix}-calendar.png`) });
    const calendarButtons = page.locator('#estacionalidad-calendario button');
    assert(await calendarButtons.count() > 0);
    await calendarButtons.first().focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    await page.locator('article details').evaluateAll(elements => elements.forEach(element => { element.open = true; }));
    const metrics = await page.evaluate(() => ({
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length,
      scrollTables: [...document.querySelectorAll('article [role=region]')].filter(region => region.scrollWidth > region.clientWidth).length,
      missingAnchors: [...document.querySelectorAll('article a[href^="#"]')].filter(link => !document.getElementById(decodeURIComponent(link.hash.slice(1)))).map(link => link.hash),
    }));
    assert(metrics.documentWidth <= metrics.width, 'Viewport overflow');
    assert.equal(metrics.brokenImages, 0);
    assert.deepEqual(metrics.missingAnchors, []);
    if (viewport.width === 390) {
      assert(metrics.scrollTables > 0);
      const region = page.locator('article [role=region]').first();
      await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      assert(await region.evaluate(element => element.scrollLeft) > 0);
    }
    await page.goto(`${base}/informes`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('main article').count(), 9);
    assert(await page.locator(`a[href="/informes/${slug}"]`).count() > 0);
    await page.screenshot({ path: path.join(output, `${prefix}-archive.png`), fullPage: true });
    await page.goto(`${base}/informes/segundo-informe-octubre-2026`, { waitUntil: 'networkidle' });
    assert(await page.locator(`a[href="/informes/${slug}"]`).count() > 0);
    await page.screenshot({ path: path.join(output, `${prefix}-october.png`) });
    await page.goto(`${base}/reports/${slug}.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('table').count(), 8);
    await page.screenshot({ path: path.join(output, `${prefix}-html-export.png`) });
    result.viewports.push({ viewport, ...metrics, keyboard: 'PASS', archive: 9, tables: 8 });
    await context.close();
  }
  const context = await browser.newContext();
  const manifest = JSON.parse(fs.readFileSync('public/reports/manifest.json', 'utf8'));
  for (const report of manifest.reports) for (const [format, artifact] of Object.entries(report.formats)) {
    const response = await context.request.get(`${base}${artifact.path}`);
    assert.equal(response.status(), 200, artifact.path);
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), artifact.sha256, artifact.path);
    if (['html', 'pdf'].includes(format)) assert(response.headers().link?.includes(report.canonicalUrl), artifact.path);
    else assert(response.headers()['x-robots-tag']?.includes('noindex'), artifact.path);
    result.downloads.push({ path: artifact.path, status: response.status(), sha256: artifact.sha256 });
  }
  const sitemap = await context.request.get(`${base}/sitemap.xml`);
  assert((await sitemap.text()).includes(`/informes/${slug}`));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.externalRequests, []);
  result.status = 'PASS';
  await context.close();
} finally {
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ status: result.status, viewports: result.viewports, downloads: result.downloads.length, errors: result.errors }));
