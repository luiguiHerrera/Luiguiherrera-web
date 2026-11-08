import type { ReactNode } from 'react';
import type { MarketReport } from '@/lib/reports/market-reports';
import type { ReportEditorialBlock, ReportEditorialSection } from '@/lib/reports/report-editorial-sections';
import { ReportEditorialInline } from './ReportEditorialSections';
import { ReportAssetAnchors } from './ReportAssetAnchors';
import { ReportMonthlyCalendar } from './ReportMonthlyCalendar';
import { getReportCalendar } from '@/lib/reports/report-presentation';

function Detail({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return <details id={id} className="group min-w-0 scroll-mt-24 border border-line bg-panel open:border-petrol/45">
    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <span className="shrink-0 text-xs font-semibold uppercase text-brass"><span className="details-open-label">Abrir</span><span className="details-close-label">Cerrar</span></span>
    </summary>
    <div className="grid min-w-0 gap-5 border-t border-line p-4 md:p-5">{children}</div>
  </details>;
}

function Table({ block, caption }: { block: Extract<ReportEditorialBlock, { kind: 'table' }>; caption: string }) {
  return <div className="min-w-0 overflow-x-auto border border-line" role="region" aria-label={caption} tabIndex={0}>
    <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-panelSoft"><tr>{block.headers.map(header => <th key={header} scope="col" className="border-b border-line px-4 py-3 font-semibold text-petrol">{header}</th>)}</tr></thead>
      <tbody>{block.rows.map((row, index) => <tr key={index} style={{ backgroundColor: row.at(-1) === 'Rojo fuerte' ? '#fbe2de' : row.at(-1) === 'Rojo suave' ? '#fff2f0' : row.at(-1) === 'Verde suave' ? '#e6f1eb' : undefined }} className={index % 2 ? 'bg-panelSoft' : 'bg-panel'}>
        {row.map((cell, column) => column === 0
          ? <th key={column} scope="row" className="border-b border-line px-4 py-3 font-medium text-ink"><ReportEditorialInline text={cell} /></th>
          : <td key={column} className="border-b border-line px-4 py-3 tabular-nums text-muted"><ReportEditorialInline text={cell} /></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

function Blocks({ blocks, caption }: { blocks: ReportEditorialBlock[]; caption: string }) {
  return <>{blocks.map((block, index) => block.kind === 'table'
    ? <Table key={index} block={block} caption={caption} />
    : block.kind === 'heading'
      ? <h4 key={index} className="mt-3 text-lg font-semibold text-ink"><ReportEditorialInline text={block.text} /></h4>
      : <p key={index} className="break-words text-sm leading-7 text-muted md:text-base"><ReportEditorialInline text={block.text} /></p>)}</>;
}

function groups(section: ReportEditorialSection) {
  const result: Array<{ title?: string; blocks: ReportEditorialBlock[] }> = [];
  for (const block of section.blocks) {
    if (block.kind === 'heading' && block.level !== 4) result.push({ title: block.text, blocks: [] });
    else {
      if (!result.length) result.push({ blocks: [] });
      result.at(-1)!.blocks.push(block);
    }
  }
  return result;
}

export function NovemberReportSections({ report }: { report: MarketReport }) {
  const sections = report.editorialSections!;
  const assets = groups(sections[2]);
  return <>
    <ReportAssetAnchors />
    <p className="py-4 text-xs leading-6 text-muted"><strong>Informe anterior:</strong> segundo informe de octubre, con datos al 16 de octubre de 2026.</p>
    <nav aria-label="Secciones del informe" className="border-y border-line py-4"><ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-petrol">{sections.map(section => <li key={section.id}><a className="underline decoration-petrol/30 underline-offset-4" href={`#${section.id}`}>{section.eyebrow}</a></li>)}</ul></nav>
    {sections.map(section => <section key={section.id} id={section.id} data-native-report-section={section.id} className="grid min-w-0 scroll-mt-24 gap-6 border-b border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{section.title}</h2></div>
      <div className="grid min-w-0 gap-5">
        {section.id === 'lecturas-mercado-cierre' ? <aside className="border-l-2 border-brass bg-panelSoft px-5 py-4"><p className="text-xs font-semibold uppercase text-brass">Datos congelados</p><p className="mt-2 text-sm leading-6 text-ink">Mercado: 30 de octubre de 2026 · editorial: 1 de noviembre de 2026. Las observaciones de cada fuente conservan su fecha.</p></aside> : null}
        {section.id === 'lectura-seguimiento' ? <nav aria-label="Activos del informe" className="flex flex-wrap gap-2">{assets.map((group, index) => <a key={group.title} className="border border-line bg-panel px-3 py-2 text-xs font-semibold text-petrol hover:border-petrol" href={`#noviembre-${report.assetReadings[index].id}`}>{['SPY', 'GLD', 'FXI', 'EWJ', 'BTC', 'ETH', 'Stockpicking'][index]}</a>)}</nav> : null}
        {groups(section).map((group, index) => {
          const title = group.title ?? section.title;
          const content = <Blocks blocks={group.blocks} caption={title} />;
          if (group.title && ['lectura-seguimiento', 'fuentes-y-aviso', 'rutas-probables'].includes(section.id)) return <Detail key={index} title={title} id={section.id === 'lectura-seguimiento' ? `noviembre-${report.assetReadings[index].id}` : undefined}>{content}</Detail>;
          if (section.id === 'lista-control') return <div key={index} className="grid min-w-0 gap-5">{group.blocks.map((block, position) => block.kind === 'table'
            ? <Detail key={position} title="Indicadores y condiciones de seguimiento"><Table block={block} caption={section.title} /></Detail>
            : <Blocks key={position} blocks={[block]} caption={title} />)}</div>;
          return <div key={index} className="grid min-w-0 gap-5">{group.title ? <h3 className="mt-3 text-xl font-semibold text-ink">{group.title}</h3> : null}{content}</div>;
        })}
        {section.id === 'estacionalidad-calendario' ? <Detail title="Explorar el calendario de noviembre"><p className="text-xs leading-6 text-muted">Fechas previstas al corte editorial del 1 de noviembre. Los eventos sin confirmación primaria se identifican como estimados y no tienen una hora asignada.</p><ReportMonthlyCalendar report={report} events={getReportCalendar(report).filter(item => item.dateStart?.startsWith('2026-11'))} /></Detail> : null}
      </div>
    </section>)}
  </>;
}
