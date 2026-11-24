import type { ReactNode } from "react";
import type { EnglishNovemberReport as MarketReport } from "@/lib/reports/second-november-2026.en";
import type { EnglishEditorialBlock as ReportEditorialBlock, EnglishEditorialSection as ReportEditorialSection } from "@/lib/reports/second-november-2026.en";
import type { ReportQuantitativePanel } from "@/lib/reports/report-statistical-panels";
import weeklySnapshot from "@/public/reports/segundo-informe-noviembre-2026-weekly-levels.json";
import { EnglishReportInline as ReportEditorialInline } from "./EnglishReportInline";
import { EnglishReportMonthlyCalendar } from "./EnglishReportMonthlyCalendar";
import { EnglishReportQuantitativePanels } from "./EnglishReportQuantitativePanels";
import { ReportSourcePolicy } from "./ReportSourcePolicy";
import styles from "./report-premium.module.css";

type TableBlock = Extract<ReportEditorialBlock, { kind: "table" }>;
type Asset = keyof typeof weeklySnapshot.assets;
const assetOrder: Asset[] = ["SPY", "GLD", "FXI", "EWJ", "BTC", "ETH"];
const format = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numericReturn = (text: string) => Number(text.replace(/[%+\s]/g, "").replace("−", "-"));

function Text({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-muted md:text-base"><ReportEditorialInline text={text} /></p>;
}

function Chapter({ section, children }: { section: ReportEditorialSection; children: ReactNode }) {
  return <section id={section.id} data-native-report-section={section.id} className={styles.chapter}>
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold text-ink md:text-2xl">Sector rotation</h3><span className="border border-brass/30 bg-panelSoft px-3 py-2 text-sm font-semibold text-petrol">{sectors.filter(s => s.value > 0).length} of {sectors.length} sectors positive</span></div>
    <p className="mt-3 text-sm text-muted">Return from Nov 6 to Nov 13 · eleven sector ETFs.</p>
    <figure className="mt-5">
      <ul className={styles.sectorGrid}>{sectors.map(s => <li key={s.ticker} data-sector={s.ticker} className="border border-line bg-panelSoft/60 p-4 transition hover:border-petrol/35 hover:bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold text-petrol">{s.ticker} · {s.name}</span><strong className={`text-xl tabular-nums ${s.value < 0 ? "text-danger" : "text-petrol"}`}>{s.label}</strong></div>
        <div className="mt-4 h-1.5 bg-line/70" aria-hidden="true"><div className={`h-full ${s.value < 0 ? "bg-danger" : "bg-petrol"}`} style={{ width: `${Math.abs(s.value) / maximum * 100}%` }} /></div>
      </li>)}</ul>
      <figcaption className="mt-4 text-xs leading-6 text-muted">Bars compare the magnitude of the changes; the sign indicates their direction.</figcaption>
    </figure>
    <details className="mt-5 border border-line"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-petrol marker:text-brass">Calculation window and weekly reading</summary><div className="grid gap-4 border-t border-line p-4"><Blocks blocks={blocks.filter(b => b.kind !== "table")} caption="Sector rotation" /></div></details>
  </section>;
}

function WeeklyLevels({ ticker }: { ticker: Asset }) {
  const data = weeklySnapshot.assets[ticker];
  const keys = ["WSLE", "WALE", "WAHE", "WSHE"] as const;
  const marks = keys.map(label => ({ label, value: data.levels[label] }));
  const panel: ReportQuantitativePanel = {
    title: "Weekly statistical levels",
    intro: `November 9 opening: ${format.format(data.open)} USD · Reference at the November 13 close: ${format.format(data.referenceClose)} USD.`,
    headers: ["Reference", "Price (USD)", "Distance from close to level"],
    rows: keys.map(k => [k, format.format(data.levels[k]), `${data.referenceClose >= data.levels[k] ? "+" : "−"}${format.format(Math.abs(data.referenceClose / data.levels[k] - 1) * 100)} %`]),
    notes: [`${data.provider} · ${data.periods.toLocaleString("en-US")} completed weeks. The current week is excluded from the sample.`, "Historical extensions from the weekly opening. They imply neither support, resistance nor future direction."],
    range: { low: Math.min(data.referenceClose, ...marks.map(m => m.value)), high: Math.max(data.referenceClose, ...marks.map(m => m.value)), current: data.referenceClose, marks },
  };
  return <div className="mt-2 grid gap-3 border-t border-line pt-5" data-weekly-levels={ticker}>
    <EnglishReportQuantitativePanels panels={[panel]} asset={ticker} />
    {data.referenceClose !== data.editorialClose ? <p className="border-l-2 border-brass pl-3 text-xs leading-6 text-muted">The levels series uses Yahoo Finance. Its daily close differs from the PDF reference ({format.format(data.editorialClose)} USD), which is preserved in the editorial table.</p> : null}
    <a className="w-fit text-xs font-semibold text-petrol underline decoration-petrol/30 underline-offset-4" href="/reports/segundo-informe-noviembre-2026-weekly-levels.json" download>Historical levels data (.json)</a>
  </div>;
}

function Assets({ section, comparison }: { section: ReportEditorialSection; comparison: TableBlock }) {
  return <>
    <nav aria-label="Report assets" className="flex flex-wrap gap-2">{assetOrder.map(t => <a key={t} href={`#${t.toLowerCase()}`} className="border border-petrol/20 bg-white px-3 py-2 text-xs font-semibold text-petrol transition hover:bg-petrol hover:text-white">{t}</a>)}</nav>
    {groups(section).map((g, i) => {
      const ticker = assetOrder[i];
      const row = comparison.rows[i];
      const change = ticker ? row[3] : undefined;
      return <details key={g.title} open={i === 0} id={ticker?.toLowerCase() ?? "stockpicking"} className={`group min-w-0 scroll-mt-24 border border-line bg-white shadow-quiet open:border-petrol/40 ${styles.asset}`}>
        <summary className="grid cursor-pointer list-none items-center gap-4 border-l-[3px] border-petrol px-4 py-5 marker:hidden sm:grid-cols-[3rem_minmax(0,1fr)_auto] md:px-5">
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center bg-petrol text-xs font-semibold text-white">{ticker ?? "SP"}</span>
          <div className="min-w-0"><h3 className="text-lg font-semibold leading-snug text-ink">{g.title}</h3>{ticker ? <p className="mt-2 text-xs text-muted">Nov 13 close · <span className="font-medium tabular-nums text-ink">{row[2]} USD</span> · <span className={`font-semibold tabular-nums ${numericReturn(change!) < 0 ? "text-danger" : "text-petrol"}`}>{change}</span> over the fortnight</p> : null}</div>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase text-brass"><span className="details-open-label">Open +</span><span className="details-close-label">Close −</span></span>
        </summary>
        <div className={styles.assetBody}><div className={styles.assetNarrative}><Blocks blocks={g.blocks} caption={g.title ?? section.title} /></div>{ticker ? <WeeklyLevels ticker={ticker} /> : null}</div>
      </details>;
    })}
  </>;
}

function Routes({ block }: { block: TableBlock }) {
  return <div className="grid gap-4" aria-label="Conditional paths by asset">{block.rows.map(([ticker, constructive, adverse]) => <details key={ticker} className={`overflow-hidden border border-line bg-white shadow-quiet ${styles.route}`}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 marker:hidden"><h3 className="font-semibold tracking-wide text-petrol">{ticker}</h3><span className={styles.routeToggle} aria-hidden="true" /></summary>
    <div className="grid md:grid-cols-2">
      <div className="border-l-[3px] border-sage bg-sage/[0.06] p-5"><h4 className="text-xs font-semibold uppercase tracking-wider text-petrol">{block.headers[1]}</h4><p className="mt-3 text-sm leading-7 text-ink">{constructive}</p></div>
      <div className="border-l-[3px] border-danger/60 bg-danger/[0.04] p-5"><h4 className="text-xs font-semibold uppercase tracking-wider text-danger">{block.headers[2]}</h4><p className="mt-3 text-sm leading-7 text-ink">{adverse}</p></div>
    </div>
  </details>)}</div>;
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

function ClosingStrip({ comparison }: { comparison: TableBlock }) {
  return <section className={styles.closingStrip} aria-label="Readings at the November 13, 2026 close">
    <div className={styles.closingHeading}><h2>Readings at the close</h2><span>Nov 13, 2026 · USD · change since Oct 30</span></div>
    <dl>{comparison.rows.map(([ticker, , price, change]) => <div key={ticker}><dt>{ticker.replace("/USD", "")}</dt><dd>{price}<span>{change}</span></dd></div>)}</dl>
  </section>;
}

function Context({ section }: { section: ReportEditorialSection }) {
  const readings = groups(section);
  return <><div className={styles.contextLead}><Blocks blocks={readings[0].blocks} caption={section.title} /></div><div className={styles.contextGrid}>{readings.slice(1).map(group => <section key={group.title}><h3>{group.title}</h3><div className="grid gap-4"><Blocks blocks={group.blocks} caption={group.title ?? section.title} /></div></section>)}</div></>;
}

export function EnglishSecondNovemberReportSections({ report }: { report: MarketReport }) {
  const sections = report.editorialSections!;
  const market = sections.find(s => s.id === "lecturas-mercado-cierre")!;
  const comparison = market.blocks.find((b): b is TableBlock => b.kind === "table")!;
  const december = report.calendar.find(e => e.dateStart?.startsWith("2026-12"));
  return <ReportSourcePolicy newTab>
    <ClosingStrip comparison={comparison} />
    {sections.map(section => <Chapter key={section.id} section={section}>
      {section.id === "contexto-general" ? <Context section={section} />
        : section.id === "lecturas-mercado-cierre" ? <div className={styles.marketGrid}>{groups(section).map((g, i) => i === 1 ? <Rotation key={i} blocks={g.blocks} /> : <div key={i} className={styles.comparison}><h3 className="text-xl font-semibold text-petrol">{g.title}</h3><Blocks blocks={g.blocks} caption={g.title ?? section.title} /></div>)}</div>
        : section.id === "lectura-seguimiento" ? <Assets section={section} comparison={comparison} />
        : section.id === "calendario" ? <>
          <EnglishReportMonthlyCalendar historical detailPlacement="below" events={report.calendar.filter(e => e.dateStart?.startsWith("2026-11"))} report={report} />
          {december ? <aside className="border-l-[3px] border-brass bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-brass">After November</p><h3 className="mt-2 font-semibold text-petrol">{december.dateLabel} · {december.event}</h3><p className="mt-2 text-sm leading-6 text-muted">{december.whyItMatters}</p><a href={december.sourceHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-petrol underline underline-offset-4">{december.sourceLabel} ↗</a></aside> : null}
          <Blocks blocks={section.blocks.filter(b => b.kind !== "table")} caption={section.title} />
        </>
        : section.id === "rutas-probables" ? section.blocks.map((b, i) => b.kind === "table" ? <Routes key={i} block={b} /> : <Blocks key={i} blocks={[b]} caption={section.title} />)
        : section.id === "lista-control" ? section.blocks.map((b, i) => b.kind === "table" ? <Watchlist key={i} block={b} /> : <Blocks key={i} blocks={[b]} caption={section.title} />)
        : section.id === "fuentes-metodologia" ? <Sources section={section} />
        : <div className="grid gap-5 border border-line bg-white p-5 md:p-6"><Blocks blocks={section.blocks} caption={section.title} /></div>}
    </Chapter>)}
  </ReportSourcePolicy>;
}
