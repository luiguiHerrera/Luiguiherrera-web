import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ReportEditorialBlock, ReportEditorialSection } from '../lib/reports/report-editorial-sections.ts';
import type { MarketReport, MarketReportCalendarItem } from '../lib/reports/market-reports.ts';

export const reportId = 'segundo-informe-noviembre-2026';
export const SOURCE_SHA256 = 'bd9790d0fe94f57ea75571333a5b32cfe0940db38972f7363386bb161680457e';
export const sourcePath = `docs/reports/${reportId}/${reportId}.md`;
const ids = ['contexto-general', 'lecturas-mercado-cierre', 'lectura-seguimiento', 'estacionalidad-calendario', 'rutas-probables', 'lista-control', 'fuentes-y-aviso'];
const eyebrows = ['Contexto general', 'Lecturas de mercado', 'Lectura por activo', 'Estacionalidad y calendario', 'Rutas probables', 'Lista de control', 'Fuentes y metodología'];
const cells = (line: string) => line.trim().slice(1, -1).split('|').map(cell => cell.trim());

function blocksFromMarkdown(source: string): ReportEditorialBlock[] {
  const lines = source.trim().split('\n');
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
  return blocks;
}

export function parseSecondNovemberSource(source: string): ReportEditorialSection[] {
  assert.equal(createHash('sha256').update(source).digest('hex'), SOURCE_SHA256, 'Second November source drift');
  assert.doesNotMatch(source, /ANEXO INTERNO|BORRADOR|NO PUBLICAR|Estado: tabla individual/i);
  const start = source.indexOf('## 1. Contexto general');
  const chunks = source.slice(start).split(/(?=^## \d\. )/m);
  assert.equal(chunks.length, 7);
  const sections = chunks.map((chunk, index) => {
    const [heading, ...body] = chunk.trim().split('\n');
    return { id: ids[index], title: heading.replace(/^## \d\. /, ''), eyebrow: eyebrows[index], blocks: blocksFromMarkdown(body.join('\n')) };
  });
  // Keep the author's introductory paragraphs in all four renderings, before 1.1.
  const introduction = source.slice(source.indexOf('## Resumen de lectura') + '## Resumen de lectura'.length, start);
  sections[0].blocks.unshift({ kind: 'heading', text: 'Resumen de lectura', level: 3 }, ...blocksFromMarkdown(introduction));
  assert.equal(sections.flatMap(section => section.blocks).filter(block => block.kind === 'table').length, 5);
  return sections;
}

const nvidia = 'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Sets-Conference-Call-for-Third-Quarter-Financial-Results/';
const fedNovember = 'https://www.federalreserve.gov/newsevents/2026-november.htm';
const nyse = 'https://www.nyse.com/trade/hours-calendars';
function timed(date: string, time: string, event: string, whyItMatters: string, category: MarketReportCalendarItem['category'], sourceLabel: string, sourceHref: string): MarketReportCalendarItem {
  const [hour, minute] = time.split(':').map(Number);
  const utc = new Date(`${date}T${time}:00-05:00`).toISOString();
  return { dateLabel: `${Number(date.slice(-2))} de noviembre`, dateStart: date, event, whyItMatters, category,
    timeStatus: 'confirmed', dateConfirmationStatus: 'confirmed', originalTime: time,
    originalTimeZone: 'America/New_York', startDateTimeUtc: utc,
    displayTimeCest: `${String(hour + 6).padStart(2, '0')}:${String(minute).padStart(2, '0')} CET (Madrid)`, sourceLabel, sourceHref };
}

export function createSecondNovemberReport(): MarketReport {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sections = parseSecondNovemberSource(source);
  const calendar: MarketReportCalendarItem[] = [
    timed('2026-11-17', '08:30', 'Precios de importación y exportación de EE. UU.', 'Inflación de importación correspondiente a octubre.', 'macro', 'BLS, calendario de noviembre', 'https://www.bls.gov/schedule/2026/11_sched_list.htm'),
    timed('2026-11-17', '16:20', 'NVIDIA: resultados del tercer trimestre fiscal 2027', 'Resultados previstos después del cierre regular; no incluidos en el corte de mercado de esta edición.', 'earnings', 'NVIDIA IR, comunicado del 28 de octubre', nvidia),
    timed('2026-11-17', '17:00', 'NVIDIA: conferencia de resultados', 'La hora corresponde a la conferencia; el comunicado está previsto a las 16:20 ET.', 'earnings', 'NVIDIA IR, comunicado del 28 de octubre', nvidia),
    timed('2026-11-18', '14:00', 'Minutas de la reunión del FOMC de octubre', 'Tono y equilibrio de riesgos de política monetaria.', 'central-bank', 'Reserva Federal, calendario de noviembre', fedNovember),
    timed('2026-11-25', '08:30', 'PIB 3T, beneficios corporativos y PCE de octubre', 'Segunda estimación del PIB y Personal Income and Outlays. Agenda BEA actualizada el 16 de noviembre y comprobada el 17.', 'macro', 'BEA, calendario de publicaciones', 'https://www.bea.gov/news/schedule/'),
    timed('2026-11-25', '14:00', 'Beige Book de la Reserva Federal', 'Condiciones regionales y financiación.', 'central-bank', 'Reserva Federal, calendario de noviembre', fedNovember),
    { dateLabel: '26 de noviembre', dateStart: '2026-11-26', event: 'Thanksgiving: NYSE cerrado', whyItMatters: 'Cierre del mercado bursátil; cripto continúa operando.', category: 'other', timeStatus: 'confirmed', originalTime: 'Sesión cerrada', originalTimeZone: 'America/New_York', dateConfirmationStatus: 'confirmed', sourceLabel: 'NYSE, calendario de negociación', sourceHref: nyse },
    timed('2026-11-27', '13:00', 'NYSE: cierre de la sesión regular abreviada', 'Liquidez reducida después de Thanksgiving; no es una sesión completa.', 'other', 'NYSE, calendario de negociación', nyse),
    { dateLabel: '8 y 9 de diciembre', dateStart: '2026-12-08', dateEnd: '2026-12-09', event: 'Reunión del FOMC', whyItMatters: 'Decisión del 9 de diciembre; no se anticipa el resultado.', category: 'central-bank', timeStatus: 'tba', dateConfirmationStatus: 'confirmed', sourceLabel: 'Reserva Federal, calendario del FOMC', sourceHref: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
  ];
  const assetHeadings = sections[2].blocks.filter(block => block.kind === 'heading' && block.level === 3);
  assert.equal(assetHeadings.length, 7);
  return {
    id: reportId, monthKey: '2026-11', monthLabel: 'Noviembre 2026', label: 'Segundo informe de noviembre de 2026',
    title: source.split('\n')[2].replace(/^\*\*|\*\*$/g, ''), subtitle: 'Segundo informe de noviembre de 2026',
    dateLabel: 'Mercado al 13 de noviembre · corte editorial del 15 de noviembre de 2026',
    // Release metadata prepared for this authorized publication date. This file does not deploy it.
    publishedAt: '2026-11-17', modifiedAt: '2026-11-17', publishedLabel: '17 de noviembre de 2026',
    editorialCutoffAt: '2026-11-15', automaticDataCutoffAt: '2026-11-13',
    summary: 'Beneficios sólidos, capital selectivo y condiciones financieras: lectura de SPY, GLD, FXI, EWJ, BTC y ETH al cierre del 13 de noviembre de 2026.',
    status: 'actual', calendarHref: `/reports/${reportId}-calendar.ics`, htmlHref: `/reports/${reportId}.html`, markdownHref: `/reports/${reportId}.md`, pdfHref: `/reports/${reportId}.pdf`,
    whatHappened: [], assetReadings: assetHeadings.map((block, index) => ({ asset: 'text' in block ? block.text.replace(/^3\.\d\. /, '') : '', id: ['spy', 'gld', 'fxi', 'ewj', 'btc', 'eth', 'stockpicking'][index], headline: '', badge: '', story: '', changed: '', expected: '' })),
    calendar, watchlist: [], sourcesNote: 'Precios al 13/11/2026; análisis al 15/11/2026; comprobación de calendario y edición web el 17/11/2026.',
    disclaimer: '- **Aviso:** contenido educativo, sin asesoramiento personalizado ni garantía de rendimiento.',
    presentation: { editorialLayout: 'november-2026', linksOpenNewTab: true, calendarStyle: 'monthly', year: 2026, month: 11, locale: 'es-ES', primaryTimeZone: 'America/New_York' },
    editorialSections: sections,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = createSecondNovemberReport();
  const target = 'lib/reports/second-november-2026.ts';
  const output = `// Generated from reviewed public Markdown; internal appendix excluded.\nimport type { MarketReport } from './market-reports.ts';\nexport const secondNovember2026Report: MarketReport = ${JSON.stringify(report, null, 2)};\n`;
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), output, 'Second November model drift');
  else fs.writeFileSync(target, output);
  console.log(`Second November ${SOURCE_SHA256}: 7 sections, 5 tables, ${report.calendar.length} calendar events; ${process.argv.includes('--check') ? 'verified' : 'generated'}.`);
}
