import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { firstNovember2026Report as report } from './first-november-2026.ts';
import { activeMarketReport, getAdjacentReports, marketReports } from './market-reports.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { NovemberReportSections } from '../../components/reports/NovemberReportSections.tsx';
import { assertContains, assertPdfContains, inspectPdf, substantiveNeedles } from '../../scripts/reports.mts';

const base = '665e062cb70fbcf3fd67317560bc33e1b9dc83fa';
const dir = `docs/reports/${report.id}`;
const original = fs.readFileSync(`${dir}/${report.id}-revisado-por-autor.md`, 'utf8');
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const deltaBytes = fs.readFileSync(`${dir}/editorial-delta.json`);
const delta = JSON.parse(deltaBytes.toString());
let revised = original;
for (const edit of delta.substitutions) {
  assert.equal(revised.split(edit.before).length - 1, edit.expectedOccurrences);
  revised = revised.replaceAll(edit.before, edit.after);
}
const sections = report.editorialSections!;
const model = buildReportExportModel(report);
const stem = `public/reports/${report.id}`;
const html = fs.readFileSync(`${stem}.html`, 'utf8');
const markdown = fs.readFileSync(`${stem}.md`, 'utf8');
const ics = fs.readFileSync(`${stem}-calendar.ics`, 'utf8');
const pdf = inspectPdf(`${stem}.pdf`);
const native = renderToStaticMarkup(React.createElement(NovemberReportSections, { report }));

test('authorized original and narrowly authorized Treasury delta have immutable identities', () => {
  assert.equal(digest(original), '285004f51d28c28d8189501efd45b6bf73b7a4b919e2ea305efaa6f309562884');
  assert.equal(digest(deltaBytes), '5d6336de5eff868ec26731d9f0264c566c454a36fb8eb27bc2b33629dff294bc');
  assert.equal(delta.substitutions.length, 3);
  assert.equal(delta.changeBasisPoints, -15);
  assert(revised.includes('**5,09 % al 4,94 %**'));
  assert(!revised.includes('4,98'));
});

test('all prose and headings remain in source order, with only documented structural and formula rendering', () => {
  const textOnly = (value: string) => value.replace(/^## \d\. /gm, '').replace(/^#{3,4} /gm, '').replace(/^---$/gm, '').replace(/^\|[-:| ]+\|$/gm, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const sourceBody = revised.slice(revised.indexOf('## 1. Contexto general'))
    .replace('\\[\nR=\\left(\\frac{P_{30/10}}{P_{16/10}}-1\\right)\\times100\n\\]', 'R = (P(30/10) / P(16/10) − 1) × 100');
  const modelBody = sections.flatMap(section => [section.title, ...section.blocks.flatMap(block => block.kind === 'table' ? [...block.headers, ...block.rows.flat()] : [block.text])]).join('\n');
  assert.equal(textOnly(modelBody), textOnly(sourceBody));
  assert.equal(sections.length, 7);
  assert.equal(sections.flatMap(section => section.blocks).filter(block => block.kind === 'table').length, 8);
});

test('native web and HTML/Markdown/PDF preserve every substantive paragraph and cell', () => {
  assert.equal((native.match(/data-native-report-section=/g) ?? []).length, 7);
  assert.equal((native.match(/<table/g) ?? []).length, 8);
  for (const section of model.sections) for (const needle of substantiveNeedles(section, model)) {
    assertContains(native, needle, 'native');
    assertContains(html, needle, 'HTML');
    assertContains(markdown, needle, 'Markdown');
    assertPdfContains(pdf, needle, 'PDF');
  }
  assert.deepEqual(pdf.blankPages, []);
  assert.equal(pdf.metadata.author, 'Luigui Herrera');
  assert.doesNotMatch(pdf.textFlowText, /\*\*|\]\(https?:/);
  for (const ticker of ['PLTR', 'HUMA', 'LFMD', 'HYMC']) {
    assert(native.includes(`href="https://earningsmoves.com/t/${ticker}/"`));
    assert(html.includes(`href="https://earningsmoves.com/t/${ticker}/"`));
  }
});

test('calendar preserves historical estimates, all-day semantics, evidence and UTF-8 folding', () => {
  assert.equal(model.events.length, 25);
  assert(!ics.replace(/\r\n/g, '').includes('\n'));
  for (const line of ics.split('\r\n')) assert(Buffer.byteLength(line) <= 75);
  const events = ics.replace(/\r\n[ \t]/g, '').split('BEGIN:VEVENT\r\n').slice(1);
  const uids = events.map(event => event.match(/^UID:(.+)\r$/m)![1]);
  assert.equal(new Set(uids).size, 25);
  for (const event of events) {
    const start = event.match(/DTSTART;VALUE=DATE:(\d{8})/)![1];
    const end = event.match(/DTEND;VALUE=DATE:(\d{8})/)![1];
    assert(end > start);
    assert(!event.includes('DTSTART:'));
  }
  const huma = events.find(event => event.includes('resultados-de-huma@'))!;
  assert(huma.includes('DTSTART;VALUE=DATE:20261111'));
  assert(huma.includes('Fecha prevista editorial no confirmada'));
  assert(huma.includes('Estimación de baja fiabilidad'));
  const fomc = events.find(event => event.includes('-reunion-del-fomc@'))!;
  assert(fomc.includes('DTEND;VALUE=DATE:20261210'));
  assert(report.calendar.find(event => event.ticker === 'CELH')?.sourceHref?.includes('celsiusholdingsinc.com'));
});

test('archive and adjacent navigation introduce November without altering historical downloads', () => {
  assert.equal(activeMarketReport.id, report.id);
  assert.equal(marketReports.length, 9);
  assert.equal(marketReports.filter(item => item.status === 'actual').length, 1);
  assert.equal(getAdjacentReports(report.id).previousReport?.id, 'segundo-informe-octubre-2026');
  assert.equal(getAdjacentReports(report.id).nextReport, null);
  assert.equal(getAdjacentReports('segundo-informe-octubre-2026').nextReport?.id, report.id);
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'public/reports'], { encoding: 'utf8' }).trim().split('\n').filter(file => /\.(html|md|pdf|ics)$/.test(file));
  assert.equal(files.length, 31);
  for (const file of files) assert.deepEqual(fs.readFileSync(file), execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 30 * 1024 * 1024 }), file);
});

test('proposed publication date is sealed; editorial and market cutoffs stay frozen', () => {
  assert.equal(report.publishedAt, '2026-11-03');
  assert.equal(report.editorialCutoffAt, '2026-11-01');
  assert.equal(report.automaticDataCutoffAt, '2026-10-30');
  assert.equal(report.modifiedAt, '2026-11-03');
  assert(!html.includes('Pendiente de publicación'));
  assert(!html.includes('noindex, nofollow'));
  assert(html.includes('<meta name="date" content="2026-11-03">'));
  assert.equal(model.canonicalUrl, 'https://www.luiguiherrera.com/informes/primer-informe-noviembre-2026');
});
