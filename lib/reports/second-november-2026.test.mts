import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { secondNovember2026Report as report } from './second-november-2026.ts';
import { activeMarketReport, getAdjacentReports, marketReports } from './market-reports.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { NovemberReportSections } from '../../components/reports/NovemberReportSections.tsx';
import { createSecondNovemberReport, sourcePath } from '../../scripts/build-second-november-report.mts';
import { assertContains, assertPdfContains, inspectPdf, substantiveNeedles } from '../../scripts/reports.mts';

const model = buildReportExportModel(report);
const stem = `public/reports/${report.id}`;
const html = fs.readFileSync(`${stem}.html`, 'utf8');
const markdown = fs.readFileSync(`${stem}.md`, 'utf8');
const ics = fs.readFileSync(`${stem}-calendar.ics`, 'utf8');
const pdf = inspectPdf(`${stem}.pdf`);
const native = renderToStaticMarkup(React.createElement(NovemberReportSections, { report }));

test('reviewed source produces seven sections, six assets and stockpicking without internal material', () => {
  assert.deepEqual(report, createSecondNovemberReport());
  assert.equal(report.editorialSections!.length, 7);
  assert.deepEqual(report.assetReadings.map(asset => asset.id), ['spy', 'gld', 'fxi', 'ewj', 'btc', 'eth', 'stockpicking']);
  assert.equal((native.match(/data-native-report-section=/g) ?? []).length, 7);
  assert.equal((native.match(/<table/g) ?? []).length, 5);
  for (const text of [fs.readFileSync(sourcePath, 'utf8'), native, html, markdown, pdf.textFlowText]) {
    assert.doesNotMatch(text, /ANEXO INTERNO|BORRADOR|NO PUBLICAR|7 reacciones positivas|3 subidas por encima|4,98 %|98\.300 millones|pendientes? de (?:cálculo|snapshot|validación)/i);
  }
});

test('every substantive paragraph, heading and table cell survives native web and all downloads', () => {
  for (const section of model.sections) for (const needle of substantiveNeedles(section, model)) {
    assertContains(native, needle, 'native');
    assertContains(html, needle, 'HTML');
    assertContains(markdown, needle, 'Markdown');
    assertPdfContains(pdf, needle, 'PDF');
  }
  assert.deepEqual(pdf.blankPages, []);
  assert.equal(pdf.metadata.author, 'Luigui Herrera');
  assert.doesNotMatch(pdf.textFlowText, /\*\*|\]\(https?:/);
  assert(native.includes('13 de noviembre de 2026 · editorial: 15 de noviembre de 2026'));
});

test('price returns and relative ETH/BTC are arithmetic on the declared closes', () => {
  const prices = [[755.72,754.37,-.18],[355.78,355.45,-.09],[33.08,33.48,1.21],[92.91,91.76,-1.24],[77320.10,68286.30,-11.68],[2245.58,1929.61,-14.07]];
  for (const [before,after,expected] of prices) assert.equal(Number(((after / before - 1) * 100).toFixed(2)), expected);
  assert.equal(Number((((1929.61/68286.30)/(2245.58/77320.10)-1)*100).toFixed(2)), -2.70);
  assert.equal(Math.round((5.15-4.94)*100), 21);
});

test('calendar distinguishes release and call, uses confirmed UTC times and exclusive all-day ends', () => {
  assert.equal(model.events.length, 9);
  assert.equal(new Set(model.events.map(event => event.uid)).size, 9);
  assert.equal(model.events.find(event => event.summary.includes('resultados del tercer'))?.startDateTimeUtc, '2026-11-17T21:20:00.000Z');
  assert.equal(model.events.find(event => event.summary.includes('conferencia'))?.startDateTimeUtc, '2026-11-17T22:00:00.000Z');
  assert.equal(model.events.find(event => event.summary.includes('Reunión del FOMC'))?.endDate, '2026-12-10');
  assert.equal(model.events.find(event => event.summary.includes('Thanksgiving'))?.endDate, '2026-11-27');
  assert(!ics.replace(/\r\n/g, '').includes('\n'));
  for (const line of ics.split('\r\n')) assert(Buffer.byteLength(line) <= 75);
  assert(report.calendar.every(event => event.dateConfirmationStatus === 'confirmed' && event.impliedMovePct === undefined));
});

test('catalogue archives first November and preserves every previously published download byte', () => {
  assert.equal(activeMarketReport.id, report.id);
  assert.equal(marketReports.length, 10);
  assert.equal(marketReports.filter(item => item.status === 'actual').length, 1);
  assert.equal(getAdjacentReports(report.id).previousReport?.id, 'primer-informe-noviembre-2026');
  assert.equal(getAdjacentReports(report.id).nextReport, null);
  const base = '8ce104066fe968026d24e0f006744f88e338585a';
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'public/reports'], { encoding: 'utf8' }).trim().split('\n').filter(file => /\.(html|md|pdf|ics)$/.test(file));
  assert.equal(files.length, 35);
  for (const file of files) assert.deepEqual(fs.readFileSync(file), execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 32 * 1024 * 1024 }), file);
});
