import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { secondOctober2026Report as report } from './second-october-2026.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { assertContains, assertPdfContains, inspectPdf, substantiveNeedles } from '../../scripts/reports.mts';

const base = '3a7f8fd98599066774e2cf08124808a84910c8db';
const stem = `public/reports/${report.id}`;
const html = fs.readFileSync(`${stem}.html`, 'utf8');
const md = fs.readFileSync(`${stem}.md`, 'utf8');
const ics = fs.readFileSync(`${stem}-calendar.ics`, 'utf8');
const pdf = inspectPdf(`${stem}.pdf`);
const model = buildReportExportModel(report);

test('revised HTML, Markdown and generated PDF contain every editorial block and table cell', () => {
  for (const section of model.sections) for (const needle of substantiveNeedles(section, model)) {
    assertContains(html, needle, `HTML/${section.id}`);
    assertContains(md, needle, `Markdown/${section.id}`);
    assertPdfContains(pdf, needle, `PDF/${section.id}`);
  }
  assert.equal(pdf.blankPages.length, 0);
  assert.equal(pdf.metadata.author, 'Luigui Herrera');
  for (const date of ['2026-10-22', '2026-10-19', '2026-10-16']) assertPdfContains(pdf, date, 'PDF dates');
});

test('all public downloads exclude preparation dialogue, rejected labels and raw PDF markup', () => {
  const rejected = /tabla recibida|semanal recibida|otra infografía|material (?:aportado|de BofA recibido)|que revisamos|recibimos estudios|snapshot|regenerar|borrador|La lectura principal|Cómo lo leo|Mi conclusión:|me preocupa|\bCDI\b/i;
  for (const [format, text] of Object.entries({ html, md, ics, pdf: pdf.textFlowText })) assert.doesNotMatch(text.replace(/\s+/g, ' '), rejected, format);
  assert.doesNotMatch(pdf.textFlowText, /\*\*|\]\(https?:/);
  assert.throws(() => assertPdfContains(inspectPdf('docs/reports/segundo-informe-octubre-2026/approved.pdf'), 'Son resultados de periodos distintos, no dos estimaciones para la misma muestra.', 'Archived PDF cannot stand in for revised PDF'));
});

test('calendar wording and event dates remain byte-identical; archived downloads are untouched', () => {
  assert.equal(ics, execFileSync('git', ['show', `${base}:${stem}-calendar.ics`], { encoding: 'utf8' }));
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'public/reports'], { encoding: 'utf8' }).trim().split('\n');
  const historical = files.filter(file => /\.(?:html|md|pdf|ics)$/.test(file) && !file.includes(report.id));
  assert.equal(historical.length, 27);
  for (const file of historical) assert.deepEqual(fs.readFileSync(file), execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 20 * 1024 * 1024 }), file);
});
