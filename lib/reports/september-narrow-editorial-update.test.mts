import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { marketReports, getMarketReportBySlug } from './market-reports.ts';
import { getHistoricalAutomaticReadings } from './historical-automatic-readings.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { earningsScheduleLabel, getReportCalendar } from './report-presentation.ts';
import { StockpickingEarnings } from '../../components/reports/StockpickingEarnings.tsx';

const id = 'primer-informe-septiembre-2026';
const report = getMarketReportBySlug(id)!;
const earnings = report.stockpicking!.earnings;
const odd = earnings.upcoming.find(item => item.ticker === 'ODD')!;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const treasury = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value=2026';

// These hashes were captured from the complete models at production eb1c4b,
// before editing. Exclude only the explicitly authorized fields, not whole sections.
test('narrow update preserves all unrelated report content from production eb1c4b', () => {
  const unchanged = structuredClone(report);
  Reflect.deleteProperty(unchanged, "modifiedAt");
  const upcoming = unchanged.stockpicking!.earnings;
  for (const key of ['upcoming', 'upcomingNote', 'upcomingTitle']) Reflect.deleteProperty(upcoming, key);
  for (const item of unchanged.watchlist) if (['ust10', 'ust30', 'funding', 'software'].includes(item.key)) {
    for (const key of ['href', 'linkLabel', 'source', 'asOf']) Reflect.deleteProperty(item, key);
    if (['funding', 'software'].includes(item.key)) {
      for (const key of ['whatLooksAt', 'whatWouldChange', 'currentReading', 'whyItMatters']) Reflect.deleteProperty(item, key);
    }
  }
  assert.equal(hash(unchanged), '7628a54d73e81c6ca179c923761224877d5cbc42d4d3821d62f28aa345565351');
  assert.equal(hash(getHistoricalAutomaticReadings(id)), '8c56f21abbc5063821b243686f43a99091f2a1337d2cbef0ab87f58cf3639243');
  const prior = marketReports.filter(item => item.id !== id).map(definition => ({ definition, resolved: buildReportExportModel(definition), automatic: getHistoricalAutomaticReadings(definition.id) }));
  assert.equal(hash(prior), '8943fbfcc2909f544cd2f6d13ec053936fdaeb5d9549656372c5494a9d4361fb');
});

test('modification date is separate from publication and frozen editorial/market cutoffs', () => {
  assert.equal(report.modifiedAt, '2026-09-07');
  assert.equal(report.publishedAt, '2026-09-06');
  assert.equal(report.editorialCutoffAt, '2026-09-06');
  assert.equal(report.automaticDataCutoffAt, '2026-09-04');
  assert.equal(buildReportExportModel(report).modifiedAt, '2026-09-07');
});

test('ODD official schedule distinguishes before-open results from the timed call', () => {
  assert.equal(earnings.upcoming.length, 1);
  assert.equal(odd.company, 'ODDITY Tech Ltd.');
  assert.equal(odd.reportDate, '2026-09-09');
  assert.equal(odd.session, 'before-open');
  assert.equal(odd.timeKind, 'earnings-call');
  assert.equal(odd.originalTime, '08:30');
  assert.equal(odd.originalTimeZone, 'ET');
  assert.equal(odd.startDateTimeUtc, '2026-09-09T12:30:00Z');
  assert.equal(odd.displayTime, '14:30 CEST');
  for (const [zone, expected] of [['America/New_York', '08:30'], ['Europe/Madrid', '14:30']]) {
    assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(odd.startDateTimeUtc!)), expected);
  }
  assert.equal(odd.dateConfirmationStatus, 'confirmed');
  assert.equal(odd.timeConfirmationStatus, 'confirmed');
  assert.equal(odd.dateTimeSourceHref, 'https://investors.oddity.com/news-releases/news-release-details/oddity-announce-second-quarter-2026-financial-results-september');
  assert.match(earningsScheduleLabel(odd), /antes de la apertura.*Call 08:30 ET.*14:30 CEST/);
});

test('ODD has no fabricated options observation in data or the rendered upcoming block', () => {
  for (const key of ['impliedMovePct', 'impliedMoveProvider', 'impliedMoveProviderHref', 'consultedAt', 'actualMovePct']) assert.equal(Object.hasOwn(odd, key), false, key);
  const html = renderToStaticMarkup(createElement(StockpickingEarnings, { ...earnings, themes: report.stockpicking!.themes }));
  const block = html.split('Próximo resultado')[1].split('Tema en consideración')[0];
  assert.match(block, /ODDITY Tech Ltd\./);
  assert.match(block, /ODDITY Investor Relations/);
  assert.doesNotMatch(block, /implícito|±|undefined|NaN|0,00/);
  assert.match(block, /08:30 ET/);
});

test('ODD enters the existing calendar and ICS convention exactly once, timed as a call', () => {
  const calendar = getReportCalendar(report);
  assert.deepEqual(calendar.filter(item => item.ticker !== 'ODD').map(item => item.id).sort(), report.calendar.map(item => item.id).sort());
  const event = calendar.filter(item => item.ticker === 'ODD');
  assert.equal(event.length, 1);
  assert.equal(event[0].event, 'ODDITY Tech Q2 2026 · call');
  assert.equal(event[0].startDateTimeUtc, odd.startDateTimeUtc);
  assert.match(event[0].whyItMatters, /antes de la apertura.*Call 08:30 ET.*14:30 CEST/);
  assert.equal(event[0].impliedMovePct, undefined);
  const ics = readFileSync(`public/reports/${id}-calendar.ics`, 'utf8').replace(/\r?\n /g, '');
  const blocks = ics.split('BEGIN:VEVENT').filter(block => block.includes('ODDITY'));
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /DTSTART:20260909T123000Z/);
  assert.match(blocks[0], /SUMMARY:Primer informe de septiembre: ODDITY Tech Q2 2026 · call/);
  assert.doesNotMatch(blocks[0], /implícito|undefined|NaN/);
});

test('Treasury controls point directly to the 2026 par curve; AI controls cite their own authorities', () => {
  const byKey = Object.fromEntries(report.watchlist.map(item => [item.key, item]));
  for (const key of ['ust10', 'ust30']) {
    assert.equal(byKey[key].href, treasury);
    assert.equal(byKey[key].linkLabel, 'Ver curva 10Y / 30Y');
  }
  assert.equal(byKey.funding.href, 'https://www.ecb.europa.eu/press/blog/date/2026/html/ecb.blog20260831~dac6a37e73.en.html');
  assert.equal(byKey.funding.linkLabel, 'Ver financiación de Big Tech');
  assert.match(byKey.funding.source!, /European Central Bank.*31\/08\/2026/);
  assert.match(byKey.funding.whatLooksAt!, /CAPEX.*flujo de caja.*spreads.*hyperscalers/);
  assert.equal(byKey.software.href, 'https://investor.servicenow.com/news/news-details/2026/ServiceNow-Reports-Second-Quarter-2026-Financial-Results/default.aspx');
  assert.equal(byKey.software.linkLabel, 'Ver ejemplo de monetización');
  assert.match(byKey.software.source!, /ServiceNow Investor Relations.*22\/07\/2026.*no recomendación/);
  assert.match(byKey.software.whatLooksAt!, /ACV\/RPO.*retención.*márgenes.*flujo de caja libre/);
  for (const key of ['funding', 'software']) assert.doesNotMatch(byKey[key].href!, /treasury|sec.gov/);
  for (const item of [odd.dateTimeSourceHref, treasury, byKey.funding.href!, byKey.software.href!]) {
    const url = new URL(item);assert.equal(url.protocol, 'https:');assert.doesNotMatch(url.href, /utm_|localhost|127\.0\.0\.1/);
  }
});

test('September HTML/Markdown/manifest carry the update and omit the old destinations', () => {
  for (const extension of ['html', 'md']) {
    const text = readFileSync(`public/reports/${id}.${extension}`, 'utf8');
    assert.match(text, /Próximo resultado/);
    assert.match(text, /ODDITY Tech Ltd\./);
    assert.match(text, /08:30 ET/);
    assert.match(text, /14:30 CEST/);
    assert.match(text, /Ver curva 10Y \/ 30Y/);
    assert.match(text, /Ver financiación de Big Tech/);
    assert.match(text, /Ver ejemplo de monetización/);
    assert.doesNotMatch(text, /resource-center-data-chart-center|https:\/\/www\.sec\.gov\/edgar\/search\//);
    const upcoming = text.split('Próximo resultado')[1].split(extension === 'html' ? 'Tema en consideración' : '##### Trazabilidad — resultados publicados')[0];
    assert.doesNotMatch(upcoming, /implícito|±|undefined|NaN/);
  }
  const manifest = JSON.parse(readFileSync('public/reports/manifest.json', 'utf8'));
  const entry = manifest.reports.find((item: { id: string }) => item.id === id);
  assert.equal(entry.modifiedAt, '2026-09-07');
  assert.equal(entry.publishedAt, '2026-09-06');
  assert.equal(entry.cutoffs.automaticData, '2026-09-04');
});
