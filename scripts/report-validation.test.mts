import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertContains, assertHtmlSectionContains, assertPdfContains, inspectPdf, findPdfPython, substantiveNeedles } from './reports.mts';
import { buildAllReportExportModels } from '../lib/reports/report-export-model.ts';

const models = buildAllReportExportModels();
const october = models.find(model => model.id === 'primer-informe-octubre-2026')!;
const html = fs.readFileSync(`public/reports/${october.id}.html`, 'utf8');
const validateText = (text: string, model = october, sections = model.sections) => {
  for (const section of sections) for (const needle of substantiveNeedles(section, model)) {
    if (section.kind === 'sources' && text.startsWith('<!doctype html>')) {
      assertHtmlSectionContains(text, section.id, needle, `${model.id}/${section.id}`);
    } else assertContains(text, needle, `${model.id}/${section.id}`);
  }
};

const checklistSections = october.sections.filter(section => section.kind === 'watchlist' || section.kind === 'asset-readings');

test('HTML inline emphasis keeps punctuation and full text without merging block boundaries', () => {
  const html = '<p>Mejoró <strong>20,47 pp</strong> y <em>9,34 pp</em>.</p>';
  const phrase = 'Mejoró 20,47 pp y 9,34 pp.';
  assertContains(html, phrase, 'inline emphasis');
  assert.throws(() => assertContains(html.replace('20,47', ''), phrase, 'missing metric'), /falta/);
  assert.throws(() => assertContains('<p>20</p><p>47</p>', '2047', 'block boundary'), /falta/);
});

test('PDF Unicode line-wrap hyphens preserve complete ordered words without hiding omissions', () => {
  const phrase = 'La amplitud aporta una señal relevante, pero no alcanza';
  for (const hyphen of ['\u2010', '\u00ad']) {
    const text = `La amplitud aporta una señal relevan${hyphen}\nte, pero no alcanza`;
    assertPdfContains({ text, contentOrderText: '' }, phrase, 'wrapped word');
    assertPdfContains({ text: '', contentOrderText: text }, phrase, 'content-order wrapped word');
    assert.throws(() => assertPdfContains({ text: text.replace('te,', 't,'), contentOrderText: '' }, phrase, 'missing letter'), /falta/);
    assert.throws(() => assertPdfContains({ text: text.replace('aporta ', ''), contentOrderText: '' }, phrase, 'missing word'), /falta/);
  }
  assert.throws(() => assertPdfContains({ text: 'riesgo-\npaís', contentOrderText: '' }, 'riesgopaís', 'hard hyphen'), /falta/);
  assert.throws(() => assertPdfContains({ text: 'relevan\u2010te', contentOrderText: '' }, 'relevante', 'no wrap'), /falta/);
  assertPdfContains({ text: 'WSLE/WALE/WAHE/\nWSHE', contentOrderText: '' }, 'WSLE/WALE/WAHE/WSHE', 'wrapped slash');
  assertPdfContains({ text: 'precio /\nnivel', contentOrderText: '' }, 'precio / nivel', 'spaced division');
  assert.throws(() => assertPdfContains({ text: 'WSLE/WALE/\nWSHE', contentOrderText: '' }, 'WSLE/WALE/WAHE/WSHE', 'missing band'), /falta/);
});

test('PDF table text flow preserves kerning and wrapped cells without combining extractor fragments', () => {
  const pdf = inspectPdf('docs/reports/segundo-informe-octubre-2026/approved.pdf');
  const phrase = 'Resultados de Netflix, Tesla, Meta, IBM, GM y otras compañías';
  assertContains(pdf.textFlowText, phrase, 'table text flow');
  assertPdfContains(pdf, phrase, 'complete table cell');
  assert.throws(() => assertPdfContains({ text: 'Resultados de Netflix,', contentOrderText: 'Tesla, Meta, IBM,', textFlowText: 'GM y otras compañías' }, phrase, 'separate fragments'), /falta/);
  assert.throws(() => assertPdfContains({ text: '', contentOrderText: '', textFlowText: pdf.textFlowText.replace('Tesla,', '') }, phrase, 'missing company'), /falta/);
});

test('TEST_WATCHLIST_STRUCTURED_POSITIVE', () => {
  validateText(html, october, checklistSections);
  validateText(fs.readFileSync(`public/reports/${october.id}.md`, 'utf8'), october, checklistSections);
  assert(html.includes('<th>Qué daría confirmación</th>'));
  assert(html.includes('<td>Mejora persistente de RSP/SPY, IWM/SPY y sectores</td>'));
  assert(!html.includes('Confirmación: Mejora persistente'));
});

test('TEST_WATCHLIST_MISSING_VALUE_NEGATIVE', () => {
  for (const missing of ['Qué daría confirmación', 'Mejora persistente de RSP/SPY, IWM/SPY y sectores',
    'Recuperación persistente de rezagados mejora la lectura.']) {
    assert.throws(() => validateText(html.replaceAll(missing, ''), october, checklistSections), error => error instanceof Error && error.message.includes(missing));
  }
});

test('TEST_SEPTEMBER_HISTORICAL', () => {
  for (const model of models.filter(model => model.id.includes('septiembre-2026'))) {
    for (const ext of ['html', 'md']) validateText(fs.readFileSync(`public/reports/${model.id}.${ext}`, 'utf8'), model);
    const pdf = inspectPdf(`public/reports/${model.id}.pdf`);
    for (const section of model.sections) for (const needle of substantiveNeedles(section, model)) {
      assertPdfContains(pdf, needle, model.id);
    }
  }
});

test('TEST_PDF_REORDERED_TOKENS_POSITIVE', () => {
  const phrase = 'Octubre, midterm + MA200 ascendente';
  const pdf = inspectPdf(`public/reports/${october.id}.pdf`);
  assert.throws(() => assertContains(pdf.text, phrase, 'geometric'), /falta/);
  assertPdfContains(pdf, phrase, 'content order');
});

test('TEST_PDF_MISSING_TOKEN_NEGATIVE', () => {
  const phrase = 'Octubre, midterm + MA200 ascendente';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-validator-'));
  try {
    const fixture = path.join(dir, 'missing.pdf');
    // A real PDF with the actual cell content minus its final word, not a mocked
    // extractor response. Both independent extractors must reject it.
    const result = spawnSync(findPdfPython(), ['-c',
      'import sys; from reportlab.pdfgen import canvas; c=canvas.Canvas(sys.argv[1]); c.drawString(40,700,"Octubre, midterm + MA200"); c.drawString(300,700,"-0.54 % 62.5 % 8"); c.save()', fixture], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.throws(() => assertPdfContains(inspectPdf(fixture), phrase, 'missing word'), /falta/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const sources = october.sections.find(section => section.kind === 'sources')!;
const validateSources = (text: string) => {
  for (const needle of substantiveNeedles(sources, october)) assertHtmlSectionContains(text, sources.id, needle, 'sources');
};

test('A3_CORRECT_ATTRIBUTIONS_POSITIVE: approved grouped attribution survives HTML entity encoding', () => {
  validateSources(html);
  assert(html.includes('Q4 después de Q2 &gt;10 %'));
});

test('A3_WRONG_PROVIDER_NEGATIVE', () => {
  for (const provider of ['Carson', 'FactSet', 'YCharts']) {
    assert.throws(() => validateSources(html.replace('A3. Carson/FactSet/YCharts',
      'A3. Carson/FactSet/YCharts'.replace(provider, 'Otro proveedor'))), /A3\. Carson/);
  }
});

test('A3_MISSING_SUBTOPIC_NEGATIVE', () => {
  for (const topic of ['Q4 general', 'ciclo de cuatro años', 'Q4 después de Q2 &gt;10 %']) {
    assert.throws(() => validateSources(html.replace(topic, '')), /A3\. Carson/);
  }
});

test('A3_OUTSIDE_SECTION_NEGATIVE', () => {
  const match = html.match(/<li>A3\. Carson[^<]+<\/li>/)!;
  assert(match);
  assert.throws(() => validateSources(match[0] + html.replace(match[0], '')), /A3\. Carson/);
});


test('editorial watchlist validates all three fields and rejects missing readings or tracking', () => {
  const sections = october.sections.filter(section => section.kind === 'watchlist');
  validateText(html, october, sections);
  const section = sections[0];
  assert.equal(section.kind, 'watchlist');
  if (section.kind !== 'watchlist') throw new Error('Missing checklist');
  for (const label of ['Qué quiero ver', 'Cómo lo leo hoy', 'Qué me haría cambiar']) {
    assert.throws(() => validateText(html.replaceAll(label, ''), october, sections));
  }
  for (const item of section.items) {
    for (const value of [item.whyItMatters, item.currentReading!, item.whatWouldChange!, item.linkLabel!]) {
      assert.throws(() => validateText(html.replaceAll(value, ''), october, sections));
    }
  }
});


test('closing readings survive all exports and reject a missing metric or comparison', () => {
  const section = october.sections.find(s => s.kind === 'market-close')!;
  assert(section);
  for (const ext of ['html', 'md']) {
    const text = fs.readFileSync(`public/reports/${october.id}.${ext}`, 'utf8');
    validateText(text, october, [section]);
    // Source links split the heading in both exports. Remove its actual heading
    // block, including the link, rather than attempting a plain-text replacement.
    const headingPattern = ext === 'html'
      ? /<h3>Qué cambió desde el [\s\S]*?<\/h3>/g
      : /^### Qué cambió desde el [^\r\n]+$/gm;
    const headings = text.match(headingPattern) ?? [];
    assert.equal(headings.length, 1, `${ext}: expected one comparison heading`);
    for (const missing of [headings[0], 'RSP · igual peso', '717,04 USD']) {
      const mutated = text.replaceAll(missing, '');
      assert.notEqual(mutated, text, `${ext}: negative fixture must change`);
      assert.equal(mutated.includes(missing), false, `${ext}: target must be absent`);
      assert.throws(() => validateText(mutated, october, [section]));
    }
  }
  const pdf = inspectPdf(`public/reports/${october.id}.pdf`);
  for (const needle of substantiveNeedles(section, october)) assertPdfContains(pdf, needle, 'market-close');
});
