import type { ReactNode } from "react";
import type { MarketReport } from "@/lib/reports/market-reports";
import type { ReportEditorialBlock, ReportEditorialSection } from "@/lib/reports/report-editorial-sections";
import type { ReportQuantitativePanel } from "@/lib/reports/report-statistical-panels";
import weeklySnapshot from "@/public/reports/segundo-informe-noviembre-2026-weekly-levels.json";
import { ReportEditorialInline } from "./ReportEditorialSections";
import { ReportMonthlyCalendar } from "./ReportMonthlyCalendar";
import { ReportQuantitativePanels } from "./ReportQuantitativePanels";
import { ReportSourcePolicy } from "./ReportSourcePolicy";

type TableBlock = Extract<ReportEditorialBlock, { kind: "table" }>;
type Asset = keyof typeof weeklySnapshot.assets;
const assetOrder: Asset[] = ["SPY", "GLD", "FXI", "EWJ", "BTC", "ETH"];
const format = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numericReturn = (text: string) => Number(text.replace(/[%+\s]/g, "").replace("−", "-").replace(",", "."));

function Text({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-muted md:text-base"><ReportEditorialInline text={text} /></p>;
}

function Chapter({ section, children }: { section: ReportEditorialSection; children: ReactNode }) {
  return <section id={section.id} data-native-report-section={section.id} className="grid min-w-0 scroll-mt-24 gap-6 border-b border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{section.title}</h2></div>
    <div className="grid min-w-0 gap-5">{children}</div>
  </section>;
}

function Table({ block, caption }: { block: TableBlock; caption: string }) {
  return <div className="min-w-0 overflow-x-auto border border-line bg-white shadow-quiet" role="region" aria-label={caption} tabIndex={0}>
    <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-petrol/[0.06]"><tr>{block.headers.map(h => <th key={h} scope="col" className="border-b border-petrol/20 px-4 py-4 text-xs font-semibold uppercase tracking-wide text-petrol">{h}</th>)}</tr></thead>
      <tbody>{block.rows.map(row => <tr key={row[0]} className="border-b border-line last:border-b-0 hover:bg-panelSoft/40">{row.map((cell, i) => i === 0
        ? <th key={i} scope="row" className="px-4 py-4 font-semibold text-petrol">{cell}</th>
        : <td key={i} className={`px-4 py-4 tabular-nums ${i === row.length - 1 && cell.includes("%") ? `font-semibold ${numericReturn(cell) < 0 ? "text-danger" : "text-petrol"}` : "text-muted"}`}><ReportEditorialInline text={cell} /></td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function Blocks({ blocks, caption }: { blocks: ReportEditorialBlock[]; caption: string }) {
  return <>{blocks.map((b, i) => b.kind === "table" ? <Table key={i} block={b} caption={caption} /> : b.kind === "heading"
    ? b.level === 4 ? <h4 key={i} className="mt-2 border-l-2 border-brass pl-3 text-xs font-semibold uppercase tracking-wider text-brass">{b.text}</h4>
      : <h3 key={i} className="mt-4 text-xl font-semibold leading-tight text-petrol">{b.text}</h3>
    : <Text key={i} text={b.text} />)}</>;
}

function groups(section: ReportEditorialSection) {
  const result: Array<{ title?: string; blocks: ReportEditorialBlock[] }> = [];
  for (const b of section.blocks) {
    if (b.kind === "heading" && b.level !== 4) result.push({ title: b.text, blocks: [] });
    else { if (!result.length) result.push({ blocks: [] }); result.at(-1)!.blocks.push(b); }
  }
  return result;
}

function Rotation({ blocks }: { blocks: ReportEditorialBlock[] }) {
  const table = blocks.find((b): b is TableBlock => b.kind === "table")!;
  const sectors = table.rows.map(([label, value]) => {
    const match = label.match(/^(.*?) \(([^)]+)\)$/)!;
    return { name: match[1], ticker: match[2], label: value, value: numericReturn(value) };
  });
  const maximum = Math.max(...sectors.map(s => Math.abs(s.value)));
  return <section id="rotacion-noviembre" className="min-w-0 scroll-mt-24 border border-line bg-white p-4 shadow-quiet md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold text-ink md:text-2xl">Rotación sectorial</h3><span className="border border-brass/30 bg-panelSoft px-3 py-2 text-sm font-semibold text-petrol">{sectors.filter(s => s.value > 0).length} de {sectors.length} sectores en positivo</span></div>
    <p className="mt-3 text-sm text-muted">Retorno del 06/11 al 13/11 · once ETF sectoriales.</p>
    <figure className="mt-5">
      <ul className="grid gap-3 sm:grid-cols-2">{sectors.map(s => <li key={s.ticker} data-sector={s.ticker} className="border border-line bg-panelSoft/60 p-4 transition hover:border-petrol/35 hover:bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-petrol">{s.ticker} · {s.name}</span><strong className={`text-xl tabular-nums ${s.value < 0 ? "text-danger" : "text-petrol"}`}>{s.label}</strong></div>
        <div className="mt-4 h-1.5 bg-line/70" aria-hidden="true"><div className={`h-full ${s.value < 0 ? "bg-danger" : "bg-petrol"}`} style={{ width: `${Math.abs(s.value) / maximum * 100}%` }} /></div>
      </li>)}</ul>
      <figcaption className="mt-4 text-xs leading-6 text-muted">Las barras comparan la magnitud de las variaciones; el signo indica su dirección.</figcaption>
    </figure>
    <details className="mt-5 border border-line"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-petrol marker:text-brass">Ventana de cálculo y lectura de la semana</summary><div className="grid gap-4 border-t border-line p-4"><Blocks blocks={blocks.filter(b => b.kind !== "table")} caption="Rotación sectorial" /></div></details>
  </section>;
}

function WeeklyLevels({ ticker }: { ticker: Asset }) {
  const data = weeklySnapshot.assets[ticker];
  const keys = ["WSLE", "WALE", "WAHE", "WSHE"] as const;
  const marks = keys.map(label => ({ label, value: data.levels[label] }));
  const panel: ReportQuantitativePanel = {
    title: "Niveles estadísticos semanales",
    intro: `Apertura del 9 de noviembre: ${format.format(data.open)} USD · Referencia al cierre del 13: ${format.format(data.referenceClose)} USD.`,
    headers: ["Referencia", "Precio (USD)", "Distancia del cierre al nivel"],
    rows: keys.map(k => [k, format.format(data.levels[k]), `${data.referenceClose >= data.levels[k] ? "+" : "−"}${format.format(Math.abs(data.referenceClose / data.levels[k] - 1) * 100)} %`]),
    notes: [`${data.provider} · ${data.periods.toLocaleString("es-ES")} semanas completadas. La semana en curso queda fuera de la muestra.`, "Extensiones históricas desde la apertura semanal. No implican soporte, resistencia ni dirección futura."],
    range: { low: Math.min(data.referenceClose, ...marks.map(m => m.value)), high: Math.max(data.referenceClose, ...marks.map(m => m.value)), current: data.referenceClose, marks },
  };
  return <div className="mt-2 grid gap-3 border-t border-line pt-5" data-weekly-levels={ticker}>
    <ReportQuantitativePanels panels={[panel]} asset={ticker} />
    {data.referenceClose !== data.editorialClose ? <p className="border-l-2 border-brass pl-3 text-xs leading-6 text-muted">La serie de niveles utiliza Yahoo Finance. Su cierre diario difiere de la referencia del PDF ({format.format(data.editorialClose)} USD), que se conserva en la tabla editorial.</p> : null}
    <a className="w-fit text-xs font-semibold text-petrol underline decoration-petrol/30 underline-offset-4" href="/reports/segundo-informe-noviembre-2026-weekly-levels.json" download>Datos históricos de los niveles (.json)</a>
  </div>;
}

function Assets({ section, comparison }: { section: ReportEditorialSection; comparison: TableBlock }) {
  return <>
    <nav aria-label="Activos del informe" className="flex flex-wrap gap-2">{assetOrder.map(t => <a key={t} href={`#${t.toLowerCase()}`} className="border border-petrol/20 bg-white px-3 py-2 text-xs font-semibold text-petrol transition hover:bg-petrol hover:text-white">{t}</a>)}</nav>
    {groups(section).map((g, i) => {
      const ticker = assetOrder[i];
      const row = comparison.rows[i];
      const change = ticker ? row[3] : undefined;
      return <details key={g.title} id={ticker?.toLowerCase() ?? "stockpicking"} className="group min-w-0 scroll-mt-24 border border-line bg-white shadow-quiet open:border-petrol/40">
        <summary className="grid cursor-pointer list-none items-center gap-4 border-l-[3px] border-petrol px-4 py-5 marker:hidden sm:grid-cols-[3rem_minmax(0,1fr)_auto] md:px-5">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center bg-petrol text-xs font-semibold text-white">{ticker ?? "3.7"}</span>
          <div className="min-w-0"><h3 className="text-lg font-semibold leading-snug text-ink">{g.title}</h3>{ticker ? <p className="mt-2 text-xs text-muted">Cierre 13/11 · <span className="font-medium tabular-nums text-ink">{row[2]} USD</span> · <span className={`font-semibold tabular-nums ${numericReturn(change!) < 0 ? "text-danger" : "text-petrol"}`}>{change}</span> en la quincena</p> : null}</div>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase text-brass"><span className="details-open-label">Abrir +</span><span className="details-close-label">Cerrar −</span></span>
        </summary>
        <div className="grid min-w-0 gap-4 border-t border-line px-4 py-5 md:px-6"><Blocks blocks={g.blocks} caption={g.title ?? section.title} />{ticker ? <WeeklyLevels ticker={ticker} /> : null}</div>
      </details>;
    })}
  </>;
}

function Routes({ block }: { block: TableBlock }) {
  return <div className="grid gap-4" aria-label="Rutas condicionales por activo">{block.rows.map(([ticker, constructive, adverse]) => <article key={ticker} className="overflow-hidden border border-line bg-white shadow-quiet">
    <h3 className="border-b border-line bg-petrol/[0.04] px-5 py-3 text-sm font-semibold tracking-wide text-petrol">{ticker}</h3>
    <div className="grid md:grid-cols-2">
      <div className="border-l-[3px] border-sage bg-sage/[0.06] p-5"><h4 className="text-xs font-semibold uppercase tracking-wider text-petrol">{block.headers[1]}</h4><p className="mt-3 text-sm leading-7 text-ink">{constructive}</p></div>
      <div className="border-l-[3px] border-danger/60 bg-danger/[0.04] p-5"><h4 className="text-xs font-semibold uppercase tracking-wider text-danger">{block.headers[2]}</h4><p className="mt-3 text-sm leading-7 text-ink">{adverse}</p></div>
    </div>
  </article>)}</div>;
}

function Watchlist({ block }: { block: TableBlock }) {
  return <div className="grid gap-4 sm:grid-cols-2">{block.rows.map(([topic, signal, source], i) => <article key={topic} className="border border-line bg-white p-5 shadow-quiet">
    <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center border border-brass/25 bg-panelSoft text-[10px] font-semibold tabular-nums text-brass">{String(i + 1).padStart(2, "0")}</span><h3 className="font-semibold text-petrol">{topic}</h3></div>
    <dl className="mt-4 grid gap-4"><div><dt className="text-[10px] font-semibold uppercase tracking-wider text-brass">{block.headers[1]}</dt><dd className="mt-2 text-sm leading-6 text-ink">{signal}</dd></div><div className="border-t border-line pt-3"><dt className="text-[10px] font-semibold uppercase tracking-wider text-brass">{block.headers[2]}</dt><dd className="mt-2 text-xs leading-6 text-muted"><ReportEditorialInline text={source} /></dd></div></dl>
  </article>)}</div>;
}

function Sources({ section }: { section: ReportEditorialSection }) {
  return <div className="grid gap-3">{section.blocks.map((b, i) => b.kind === "paragraph" || b.kind === "source" ? <div key={i} className="border border-line bg-white px-5 py-4"><p className="text-sm leading-7 text-muted"><ReportEditorialInline text={b.text} /></p></div> : null)}</div>;
}

export function SecondNovemberReportSections({ report }: { report: MarketReport }) {
  const sections = report.editorialSections!;
  const market = sections.find(s => s.id === "lecturas-mercado-cierre")!;
  const comparison = market.blocks.find((b): b is TableBlock => b.kind === "table")!;
  const december = report.calendar.find(e => e.dateStart?.startsWith("2026-12"));
  return <ReportSourcePolicy newTab>
    <nav aria-label="Secciones del informe" className="border-b border-line py-4"><ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-petrol">{sections.map(s => <li key={s.id}><a href={`#${s.id}`} className="underline decoration-petrol/30 underline-offset-4">{s.eyebrow}</a></li>)}</ul></nav>
    {sections.map(section => <Chapter key={section.id} section={section}>
      {section.id === "lecturas-mercado-cierre" ? groups(section).map((g, i) => i === 1 ? <Rotation key={i} blocks={g.blocks} /> : <div key={i} className="grid min-w-0 gap-5"><h3 className="text-xl font-semibold text-petrol">{g.title}</h3><Blocks blocks={g.blocks} caption={g.title ?? section.title} /></div>)
        : section.id === "lectura-seguimiento" ? <Assets section={section} comparison={comparison} />
        : section.id === "calendario" ? <>
          <ReportMonthlyCalendar historical detailPlacement="below" events={report.calendar.filter(e => e.dateStart?.startsWith("2026-11"))} report={report} />
          {december ? <aside className="border-l-[3px] border-brass bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-brass">Después de noviembre</p><h3 className="mt-2 font-semibold text-petrol">{december.dateLabel} · {december.event}</h3><p className="mt-2 text-sm leading-6 text-muted">{december.whyItMatters}</p><a href={december.sourceHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-petrol underline underline-offset-4">{december.sourceLabel} ↗</a></aside> : null}
          <Blocks blocks={section.blocks.filter(b => b.kind !== "table")} caption={section.title} />
        </>
        : section.id === "rutas-probables" ? section.blocks.map((b, i) => b.kind === "table" ? <Routes key={i} block={b} /> : <Blocks key={i} blocks={[b]} caption={section.title} />)
        : section.id === "lista-control" ? section.blocks.map((b, i) => b.kind === "table" ? <Watchlist key={i} block={b} /> : <Blocks key={i} blocks={[b]} caption={section.title} />)
        : section.id === "fuentes-metodologia" ? <Sources section={section} />
        : <div className="grid gap-5 border border-line bg-white p-5 md:p-6"><Blocks blocks={section.blocks} caption={section.title} /></div>}
    </Chapter>)}
  </ReportSourcePolicy>;
}
