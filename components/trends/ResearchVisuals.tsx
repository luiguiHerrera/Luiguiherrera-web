import type { CSSProperties, ReactNode } from "react";
import { getSource } from "@/lib/trends/research/data";
import { researchCopy } from "@/lib/trends/research/copy";
import { displayMeasure } from "@/lib/trends/research/format";
import type { Chain, Chart, Locale, Measure } from "@/lib/trends/research/types";
import s from "./research.module.css";

export function Sources({ ids = [], locale }: { ids?: (string | undefined)[]; locale: Locale }) {
  return <span className={s.sources}>{[...new Set(ids.filter(Boolean))].map(id => {
    const source = getSource(id!, locale);
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span key={id}>{researchCopy[locale].unavailable}: {id}</span>;
  })}</span>;
}
export function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return <div className={s.tableScroll} role="region" aria-label={caption} tabIndex={0}><table><caption>{caption}</caption><thead><tr>{headers.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function MeasureTable({ rows, locale, defaults = {}, caption }: { rows: Measure[]; locale: Locale; defaults?: Partial<Chart>; caption: string }) {
  const c = researchCopy[locale];
  return <DataTable caption={caption} headers={[c.indicator, c.measure, c.period, c.nature, c.source]} rows={rows.map(row => {
    const m = displayMeasure(row, locale, defaults);
    return [<>{row.label ?? row.period}{row.note && <small>{row.note}</small>}</>, <span key="value" className={s.numeric}>{m.value} {m.unit}</span>, row.period, <Nature key="nature" kind={row.kind} locale={locale} />, <Sources key="sources" ids={[row.source ?? defaults.source, ...(row.sources ?? defaults.sources ?? [])]} locale={locale} />];
  })} />;
}
function future(kind = "") { return /previsi|proyecci|objetivo|forecast|projection|target/i.test(kind); }
export function Nature({ kind, locale }: { kind?: string; locale: Locale }) { return <span className={s.nature} data-future={future(kind)}>{kind || (locale === "es" ? "Dato publicado" : "Published figure")}</span>; }

export function ResearchChart({ chart, locale }: { chart: Chart; locale: Locale }) {
  const c = researchCopy[locale];
  if (chart.series) return <figure className={s.chart}><figcaption><h3>{chart.title}</h3></figcaption><div className={s.smallMultiples}>{chart.series.map(series => <ResearchChart key={series.label} chart={{ type: "bar", title: series.label, ...series }} locale={locale} />)}</div>{chart.note && <p className={s.chartNote}>{chart.note}</p>}</figure>;
  const rows = chart.rows ?? chart.data?.map(r => ({ ...r, period: r.label })) ?? [];
  if (!rows.length) return null;
  const units = new Set(rows.map(r => r.display_unit ?? chart.display_unit ?? r.unit ?? chart.unit));
  const cards = chart.type === "kpi" || chart.type === "comparison_cards" || (chart.type === "timeline") || units.size > 1;
  const max = Math.max(...rows.map(r => Math.abs(r.value ?? 0)), 1);
  const divergent = rows.some(r => (r.value ?? 0) < 0);
  return <figure className={s.chart} data-chart-type={chart.type}>
    <figcaption className={s.chartHeading}><h3>{chart.title}</h3>{!cards && <span>{chart.display_unit ?? chart.unit}</span>}</figcaption>
    {cards ? <div className={s.measureCards}>{rows.map((row, i) => {
      const m = displayMeasure(row, locale, chart);
      return <div key={i} data-future={future(row.kind)}><span className={s.measurePeriod}>{row.period}</span><strong data-long={m.value.length > 11}>{m.value}</strong><span className={s.measureUnit}>{m.unit}</span><Nature kind={row.kind} locale={locale} /></div>;
    })}</div> : <div className={s.bars} role="img" aria-label={`${chart.title}. ${rows.map(r => { const m = displayMeasure(r, locale, chart); return `${r.period}: ${m.value} ${m.unit}`; }).join("; ")}`}>
      {rows.map((row, i) => { const m = displayMeasure(row, locale, chart); return <div className={s.barRow} key={i}>
        <span className={s.barLabel}>{row.period}</span>
        <div className={s.barTrack} data-divergent={divergent}><span className={s.bar} data-negative={(row.value ?? 0) < 0} data-future={future(row.kind)} style={{ width: `${Math.abs(row.value ?? 0) / max * (divergent ? 50 : 100)}%`, ...(divergent ? { left: `${(row.value ?? 0) < 0 ? 50 - Math.abs(row.value ?? 0) / max * 50 : 50}%` } : {}) }} /></div>
        <span className={s.barNumber}>{m.value}</span><Nature kind={row.kind} locale={locale} />
      </div>; })}
    </div>}
    {chart.note && <p className={s.chartNote}>{chart.note}</p>}
    <Sources ids={[chart.source, ...(chart.sources ?? []), ...(chart.source_ids ?? []), ...rows.flatMap(r => [r.source, ...(r.sources ?? [])])]} locale={locale} />
    <details className={s.dataDisclosure}><summary>{c.data}</summary><MeasureTable rows={rows} locale={locale} defaults={chart} caption={`${c.table}: ${chart.title}`} /></details>
  </figure>;
}

export function ValueChain({ chain, locale, id }: { chain: Chain; locale: Locale; id: string }) {
  const c = researchCopy[locale];
  const hasFunding = chain.edges.some(edge => edge.kind === "funding");
  // Longest source-to-node depth preserves actual graph relationships; no money is encoded.
  const depth = new Map(chain.nodes.map(n => [n.id, 0]));
  for (let i = 0; i < chain.nodes.length; i++) for (const edge of chain.edges) depth.set(edge.target, Math.max(depth.get(edge.target) ?? 0, (depth.get(edge.source) ?? 0) + 1));
  const levels = [...new Set(depth.values())].sort((a,b) => a-b);
  const positions = new Map<string, { x: number; y: number }>();
  levels.forEach((level, row) => {
    const nodes = chain.nodes.filter(n => depth.get(n.id) === level);
    nodes.forEach((node, col) => positions.set(node.id, { x: (col + .5) / nodes.length * 100, y: row * 142 + 54 }));
  });
  const height = levels.length * 142 - 24;
  return <figure className={s.chain}>
    <figcaption><h3>{c.sections[2]}</h3><p className={s.chartNote}>{c.conceptual}</p>{hasFunding&&<p className={s.chainKey}><span>{locale==="es"?"Relación operativa":"Operational relationship"}</span><span data-funding>{locale==="es"?"Financiación del acceso":"Access funding"}</span></p>}</figcaption>
    <div className={s.chainDiagram} style={{ "--chain-height": `${height}px` } as CSSProperties}>
      <svg aria-hidden="true" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"><defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="currentColor" /></marker></defs>{chain.edges.map((edge,i) => {
        const a = positions.get(edge.source)!, b = positions.get(edge.target)!;
        const skipsLayer = (depth.get(edge.target) ?? 0) - (depth.get(edge.source) ?? 0) > 1;
        const path = skipsLayer ? `M${a.x},${a.y+43} C94,${a.y+72} 94,${b.y} ${b.x+16},${b.y}` : `M${a.x},${a.y+43} C${a.x},${a.y+84} ${b.x},${b.y-84} ${b.x},${b.y-56}`;
        return <path key={i} d={path} fill="none" vectorEffect="non-scaling-stroke" stroke="currentColor" strokeWidth="1.2" strokeDasharray={edge.kind==="funding"?"4 4":undefined} markerEnd={`url(#${id}-arrow)`} />;
      })}</svg>
      {levels.map(level => <div className={s.chainLevel} key={level}>{chain.nodes.filter(n => depth.get(n.id) === level).map(node => <div className={s.chainNode} key={node.id}><strong>{node.label}</strong>{!!node.actors?.length && <span>{node.actors.join(" · ")}</span>}</div>)}</div>)}
    </div>
    <div className={s.chainMobile}>{chain.nodes.map(node => <div key={node.id}><strong>{node.label}</strong>{!!node.actors?.length && <span>{node.actors.join(" · ")}</span>}<small>{c.to}: {chain.edges.filter(e => e.source === node.id).map(e => `${chain.nodes.find(n => n.id === e.target)?.label}${e.label?` (${e.label})`:""}`).join(" · ") || "—"}</small></div>)}</div>
    <p className={s.chartNote}>{chain.note}</p>
    <details className={s.dataDisclosure}><summary>{c.relations}</summary><DataTable caption={c.table} headers={[c.from, c.to, ...(hasFunding?[c.direction]:[]), c.actors]} rows={chain.edges.map(edge => {
      const a = chain.nodes.find(n => n.id === edge.source)!, b = chain.nodes.find(n => n.id === edge.target)!;
      return [a.label, b.label, ...(hasFunding?[edge.label??(locale==="es"?"Relación operativa":"Operational relationship")]:[]), [a.actors?.join(", "), b.actors?.join(", ")].filter(Boolean).join(" / ") || "—"];
    })} /></details>
  </figure>;
}
