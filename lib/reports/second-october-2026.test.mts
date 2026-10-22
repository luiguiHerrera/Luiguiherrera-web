import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { secondOctober2026Report as report } from './second-october-2026.ts';
import { firstOctober2026Report } from './first-october-2026.ts';
import { activeMarketReport, getMarketReportBySlug, getAdjacentReports, marketReports } from './market-reports.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { getHistoricalAutomaticReadings } from './historical-automatic-readings.ts';
const sourcePath='docs/reports/segundo-informe-octubre-2026/approved.md';
const source=fs.readFileSync(sourcePath,'utf8');
const baseSource = execFileSync('git', ['show', '3a7f8fd98599066774e2cf08124808a84910c8db:lib/reports/second-october-2026.ts'], { encoding: 'utf8' });
const base = JSON.parse(baseSource.slice(baseSource.indexOf('= {') + 2, baseSource.lastIndexOf(';')));
const revision = JSON.parse(fs.readFileSync('docs/reports/segundo-informe-octubre-2026/public-voice-revision.json', 'utf8'));
const halloween = 'Entre 1993 y 2025, la ventana entre finales de octubre y principios de noviembre registró 24 años positivos y 9 negativos, una tasa de acierto del 72,7 % y una rentabilidad media simple del +1,67 %. En la muestra de 1993–2022, el porcentaje de años positivos fue del 76,7 % —23 de 30—. Son resultados de periodos distintos, no dos estimaciones para la misma muestra. [A8]';

test('approved originals stay archived byte-for-byte; every public source edit is recorded', () => {
 assert.equal(createHash('sha256').update(source).digest('hex'), '378efba156f633aa54bef5f4a8fafebab0635072d446e2cbc6db0ba21b0d4ab4');
 for (const original of revision.originals) assert.equal(createHash('sha256').update(fs.readFileSync(original.path)).digest('hex'), original.sha256);
 const expected = structuredClone(base);
 for (const change of revision.changes) {
  let target = expected;
  for (const key of change.path.slice(0, -1)) target = target[key];
  const key = change.path.at(-1);
  assert.equal(target[key], change.before, `Original passage at ${change.path.join('.')}`);
  target[key] = change.after;
 }
 assert.deepEqual(expected.approvedPdf, revision.archivedPdf);
 delete expected.approvedPdf;
 assert.deepEqual(report, expected, 'No unrecorded editorial, analytical or metadata changes');
});

test('figures, citations, tables, calendar, follow-up and author positions are preserved', () => {
 for (const change of revision.changes) {
  const references = (text: string) => text.match(/\[(?:[AM]\d+)[^\]]*\]/g) ?? [];
  assert.deepEqual(references(change.after), references(change.before), `References: ${change.path.join('.')}`);
  if (change.path[0] === 'sourcesNote' || change.before.startsWith('Revisé la tabla recibida')) continue;
  const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)*/g) ?? [];
  assert.deepEqual(numbers(change.after), numbers(change.before), `Figures: ${change.path.join('.')}`);
 }
 for (const key of ['calendar', 'watchlist', 'presentation', 'title', 'subtitle', 'summary', 'dateLabel']) assert.deepEqual(report[key as keyof typeof report], base[key]);
 const tables = (r: typeof report) => r.editorialSections!.flatMap(section => section.blocks.filter(block => block.kind === 'table'));
 assert.deepEqual(tables(report), tables(base));
 const paragraphs = report.editorialSections!.flatMap(section => section.blocks).filter(block => block.kind === 'paragraph').map(block => block.text.replace(/\*\*/g, ''));
 assert(paragraphs.includes(halloween));
 for (const phrase of ['mantengo la lectura constructiva', 'No doy esa hipótesis por confirmada ni por invalidada', 'Los cálculos se basan en rendimientos redondeados.', 'Los precios, dividendos, costes, fechas exactas y la selección de la ventana no cuentan con una verificación independiente.', 'Las reproducciones y los extractos citados no acreditan la verificación independiente de los documentos originales.']) assert(paragraphs.some(text => text.includes(phrase)), phrase);
});

test('public editorial source contains no preparation dialogue or rejected labels', () => {
 const publicText = JSON.stringify(report);
 assert.doesNotMatch(publicText, /tabla recibida|semanal recibida|otra infografía|material (?:aportado|de BofA recibido)|que revisamos|recibimos estudios|como me indicaste|lo que me compartiste|snapshot|regenerar|borrador|La lectura principal|Cómo lo leo|Mi conclusión:|me preocupa|\bCDI\b|\bdashboard\b/i);
 assert.equal((publicText.match(/me ocupa/g) ?? []).length, 1);
 assert.equal(report.approvedPdf, undefined, 'Public PDF must be generated from revised content, not copied from archived original');
});
test('one current report; first October historical content stays unchanged',()=>{
 assert.equal(activeMarketReport.id,report.id);
 assert.equal(marketReports.filter(r=>r.status==='actual').length,1);
 assert.deepEqual(getMarketReportBySlug(firstOctober2026Report.id),{...firstOctober2026Report,status:'archivado'});
 assert.equal(getAdjacentReports(report.id).previousReport?.id,firstOctober2026Report.id);
 assert.equal(getAdjacentReports(report.id).nextReport,null);
});
test('native report has seven supported sections, four tables and no fabricated SL state',()=>{
 assert.equal(report.editorialSections!.length,7);
 assert.equal(report.editorialSections!.flatMap(s=>s.blocks).filter(b=>b.kind==='table').length,4);
 assert.equal(getHistoricalAutomaticReadings(report.id),null);
 assert(report.assetReadings.every(asset=>!asset.quantitativePanels?.length));
 assert.equal(report.marketClose,undefined);
 assert(report.editorialSections!.flatMap(s=>s.blocks).some(b=>'text' in b && b.text.includes('no incorpora')));
 const component=fs.readFileSync('components/reports/ReportEditorialSections.tsx','utf8');
 for(const token of ['ReportSection','ReportQuantitativePanels','ReportParagraph'])assert(component.includes(token));
 assert(!/<iframe|<object|<embed|dangerouslySetInnerHTML/.test(component));
 const shared=fs.readFileSync('components/reports/MarketReportContent.tsx','utf8');
 assert(shared.includes('<ReportEditorialSections sections={report.editorialSections} />'));
 assert(!shared.includes('approved.html'));
});
test('publication date is distinct from unchanged editorial and market cutoffs',()=>{
 assert.equal(report.publishedAt,'2026-10-22');
 assert.equal(report.modifiedAt,'2026-10-22');
 assert.equal(report.publishedLabel,'22 de octubre de 2026');
 assert.equal(report.editorialCutoffAt,'2026-10-19');
 assert.equal(report.automaticDataCutoffAt,'2026-10-16');
 const model=buildReportExportModel(report);
 assert.equal(model.canonicalUrl,'https://www.luiguiherrera.com/informes/segundo-informe-octubre-2026');
 assert.equal(model.sections.length,7);
 assert.equal(model.events.length,5);
 assert(model.sections.every(s=>s.kind==='editorial'));
 assert.equal(model.approvedPdf,undefined);
});
