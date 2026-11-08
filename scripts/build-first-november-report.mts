import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { ReportEditorialBlock, ReportEditorialSection } from '../lib/reports/report-editorial-sections.ts';
import type { MarketReport, MarketReportCalendarItem } from '../lib/reports/market-reports.ts';

export const SOURCE_SHA256 = '285004f51d28c28d8189501efd45b6bf73b7a4b919e2ea305efaa6f309562884';
export const reportId = 'primer-informe-noviembre-2026';
export const sourceDirectory = `docs/reports/${reportId}`;
export const sourcePath = `${sourceDirectory}/${reportId}-revisado-por-autor.md`;
export const latexFormula = '\\[\nR=\\left(\\frac{P_{30/10}}{P_{16/10}}-1\\right)\\times100\n\\]';
export const readableFormula = 'R = (P(30/10) / P(16/10) − 1) × 100';
const sectionIds = ['contexto-general', 'lecturas-mercado-cierre', 'lectura-seguimiento', 'estacionalidad-calendario', 'rutas-probables', 'lista-control', 'fuentes-y-aviso'];
const eyebrows = ['Contexto general', 'Lecturas de mercado', 'Lectura por activo', 'Estacionalidad y calendario', 'Rutas probables', 'Lista de control', 'Fuentes y metodología'];
const cells = (line: string) => line.trim().slice(1, -1).split('|').map(cell => cell.trim());
const plain = (text: string) => text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

// Only structural Markdown is interpreted. Every paragraph, list entry and table
// cell is retained, in source order. The single formula has a logged plain-text
// rendering; its original LaTeX remains in the immutable source.
export function parseAuthorizedSource(source: string): ReportEditorialSection[] {
  assert.equal(createHash('sha256').update(source).digest('hex'), SOURCE_SHA256, 'Unauthorized editorial source');
  const deltaBytes = fs.readFileSync(`${sourceDirectory}/editorial-delta.json`);
  assert.equal(createHash('sha256').update(deltaBytes).digest('hex'), '5d6336de5eff868ec26731d9f0264c566c454a36fb8eb27bc2b33629dff294bc', 'Unreviewed editorial delta');
  const delta = JSON.parse(deltaBytes.toString());
  assert.equal(delta.sourceSha256, SOURCE_SHA256);
  let revised = source;
  for (const change of delta.substitutions) {
    assert.equal(revised.split(change.before).length - 1, change.expectedOccurrences);
    revised = revised.replaceAll(change.before, change.after);
  }
  const content = revised.slice(revised.indexOf('## 1. Contexto general')).replace(latexFormula, readableFormula);
  const chunks = content.split(/(?=^## \d\. )/m);
  assert.equal(chunks.length, 7);
  return chunks.map((chunk, sectionIndex) => {
    const lines = chunk.trim().split('\n');
    const title = lines.shift()!.replace(/^## \d\. /, '');
    const blocks: ReportEditorialBlock[] = [];
    for (let i = 0; i < lines.length;) {
      const line = lines[i].trim();
      if (!line || line === '---') { i++; continue; }
      if (line.startsWith('|')) {
        const headers = cells(line);
        assert.match(lines[i + 1], /^\|[-:| ]+\|$/);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const row = cells(lines[i++]);
          assert.equal(row.length, headers.length);
          rows.push(row);
        }
        blocks.push({ kind: 'table', headers, rows });
      } else if (/^#{3,4} /.test(line)) {
        blocks.push({ kind: 'heading', text: line.replace(/^#+ /, ''), level: line.startsWith('#### ') ? 4 : 3 });
        i++;
      } else {
        const paragraph = [line]; i++;
        while (i < lines.length && lines[i].trim() && !/^(?:#{3,4} |\||---$|- )/.test(lines[i])) paragraph.push(lines[i++].trim());
        blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
      }
    }
    return { id: sectionIds[sectionIndex], title, eyebrow: eyebrows[sectionIndex], blocks };
  });
}

export function createNovemberReport(): MarketReport {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sections = parseAuthorizedSource(source);
  const publication = JSON.parse(fs.readFileSync(`${sourceDirectory}/publication.json`, 'utf8'));
  assert(publication.publishedAt === null || /^2026-11-\d{2}$/.test(publication.publishedAt));
  assert(/^\d{4}-\d{2}-\d{2}$/.test(publication.modifiedAt));
  if (publication.publishedAt) assert(publication.modifiedAt >= publication.publishedAt);
  const evidencePath = `${sourceDirectory}/calendar-evidence.json`;
  const evidence: Record<string, { date: string; sourceLabel: string; sourceHref: string; confirmed: boolean }> = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : {};
  const tables = sections.flatMap(section => section.blocks.filter(block => block.kind === 'table'));
  assert.equal(tables.length, 8);
  const calendar: MarketReportCalendarItem[] = tables[5].rows.map(([dateLabel, event, whyItMatters]) => ({
    dateLabel: plain(dateLabel), dateStart: `2026-11-${plain(dateLabel).match(/\d+/)![0].padStart(2, '0')}`,
    event, whyItMatters, category: /Japón/.test(event) ? 'central-bank' : 'macro',
    timeStatus: 'tba', dateConfirmationStatus: 'editorial-unconfirmed',
  }));
  for (const [dateLabel, tickerLink, implied, note] of tables[4].rows) {
    const ticker = plain(tickerLink);
    calendar.push({
      dateLabel, dateStart: `2026-11-${dateLabel.slice(0, 2)}`, ticker,
      event: `Resultados de ${ticker}`, category: 'earnings',
      whyItMatters: `Calendario al corte editorial del 01/11. ${dateLabel}. Implied move al corte: ${implied}. ${note}.`,
      timeStatus: 'tba', dateConfirmationStatus: 'editorial-unconfirmed',
      sourceLabel: 'Calendario y observación de opciones de la edición revisada', sourceHref: tickerLink.match(/\]\(([^)]+)\)/)![1],
    });
  }
  calendar.push(
    { dateLabel: '18 de noviembre', dateStart: '2026-11-18', event: 'Minutas del FOMC de octubre', whyItMatters: 'Comunicaciones de la Reserva Federal.', category: 'central-bank', timeStatus: 'tba', dateConfirmationStatus: 'editorial-unconfirmed' },
    { dateLabel: '8 y 9 de diciembre', dateStart: '2026-12-08', dateEnd: '2026-12-09', event: 'Reunión del FOMC', whyItMatters: 'Siguiente reunión ordinaria de decisión de tipos.', category: 'central-bank', timeStatus: 'tba', dateConfirmationStatus: 'editorial-unconfirmed' },
  );
  for (const event of calendar) {
    const check = evidence[event.ticker ?? event.event];
    if (check) {
      event.sourceLabel = check.sourceLabel;
      event.sourceHref = check.sourceHref;
      if (check.confirmed && check.date === event.dateStart) event.dateConfirmationStatus = 'confirmed';
    }
  }
  const assetHeadings = sections[2].blocks.filter(block => block.kind === 'heading' && block.level === 3);
  const title = source.split('\n')[2].replace(/^## /, '');
  return {
    id: reportId, monthKey: '2026-11', monthLabel: 'Noviembre 2026', label: 'Primer informe de noviembre de 2026',
    title, subtitle: 'Primer informe de noviembre de 2026',
    dateLabel: 'Mercado al 30 de octubre · corte editorial del 1 de noviembre de 2026',
    publishedAt: publication.publishedAt, modifiedAt: publication.modifiedAt,
    publishedLabel: publication.publishedAt ?? 'Pendiente de publicación',
    editorialCutoffAt: '2026-11-01', automaticDataCutoffAt: '2026-10-30',
    summary: 'Beneficios, rotación sectorial, rentabilidad de la IA y expectativas de resultados. Lectura al cierre del 30 de octubre de 2026.',
    status: 'actual',
    calendarHref: `/reports/${reportId}-calendar.ics`, htmlHref: `/reports/${reportId}.html`, markdownHref: `/reports/${reportId}.md`, pdfHref: `/reports/${reportId}.pdf`,
    whatHappened: [],
    assetReadings: assetHeadings.map((block, index) => ({ asset: 'text' in block ? block.text.replace(/^3\.\d\. /, '') : '', id: ['spy', 'gld', 'fxi', 'ewj', 'btc', 'eth', 'stockpicking'][index], headline: '', badge: '', story: '', changed: '', expected: '' })),
    calendar, watchlist: [],
    sourcesNote: 'Fuente editorial revisada por el autor. Precios congelados al 30/10/2026 y análisis al 01/11/2026.',
    disclaimer: sections[6].blocks.at(-1)!.kind === 'paragraph' ? (sections[6].blocks.at(-1) as { text: string }).text : '',
    presentation: { editorialLayout: 'november-2026', linksOpenNewTab: true, calendarStyle: 'monthly', year: 2026, month: 11, locale: 'es-ES', primaryTimeZone: 'America/New_York' },
    editorialSections: sections,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = createNovemberReport();
  const target = 'lib/reports/first-november-2026.ts';
  const output = `// Generated from the SHA-256-authorized Markdown. Run scripts/build-first-november-report.mts.\nimport type { MarketReport } from './market-reports.ts';\nexport const firstNovember2026Report: MarketReport = ${JSON.stringify(report, null, 2)};\n`;
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), output, 'November model drift');
  else fs.writeFileSync(target, output);
  console.log(`November source ${SOURCE_SHA256}: 7 sections, 8 tables, ${report.calendar.length} calendar entries; ${process.argv.includes('--check') ? 'verified' : 'generated'}.`);
}
