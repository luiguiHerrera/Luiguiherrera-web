import { earningsScheduleLabel, formatEvidenceConsultedAt, formatImpliedMove } from "@/lib/reports/report-presentation";
import type { MarketReportEarningsItem, MarketReportStockpickingTheme } from "@/lib/reports/market-reports";

function exceeded(item: MarketReportEarningsItem) { return Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct; }

function EvidenceLinks({ item }: { item: MarketReportEarningsItem }) {
  return <div className="grid gap-1 border-l border-brass/35 pl-3 text-xs leading-5 text-muted md:col-span-4">
    <p><span className="font-semibold text-ink">Movimiento implícito:</span> <a className="font-semibold text-petrol" href={item.impliedMoveProviderHref} target="_blank" rel="noopener noreferrer">{item.impliedMoveProvider} — {item.ticker} ↗</a> · consulta {formatEvidenceConsultedAt(item.consultedAt)}</p>
    <p><span className="font-semibold text-ink">Fecha y hora:</span> <a className="font-semibold text-petrol" href={item.dateTimeSourceHref} target="_blank" rel="noopener noreferrer">{item.dateTimeSourceLabel} ↗</a> · {earningsScheduleLabel(item)}</p>
    {item.actualMoveSourceHref && item.actualMoveSourceLabel
      ? <p><span className="font-semibold text-ink">Movimiento ocurrido:</span> <a className="font-semibold text-petrol" href={item.actualMoveSourceHref} target="_blank" rel="noopener noreferrer">{item.actualMoveSourceLabel} ↗</a>{item.actualMoveMethodology ? ` · ${item.actualMoveMethodology}` : ""}</p>
      : <p><span className="font-semibold text-ink">Movimiento ocurrido:</span> pendiente de publicación.</p>}
  </div>;
}

export function StockpickingSummary({ published, upcoming }: { published: MarketReportEarningsItem[]; upcoming: MarketReportEarningsItem[] }) {
  return <div className="flex flex-wrap gap-1.5 md:justify-end" aria-label="Resumen de resultados">
    {[`${published.length} publicados`, `${published.filter(exceeded).length} excedieron el rango`, `${upcoming.length} próximos`].map((label) => <span key={label} className="border border-line bg-white px-2 py-1 text-[11px] font-semibold text-petrol">{label}</span>)}
  </div>;
}

export function StockpickingEarnings({ published, upcoming, methodology, publishedNote, upcomingNote, themes }: { published: MarketReportEarningsItem[]; upcoming: MarketReportEarningsItem[]; methodology: string; publishedNote?: string; upcomingNote?: string; themes?: MarketReportStockpickingTheme[] }) {
  return <section className="grid gap-5 pt-2" aria-label="Resultados de Stockpicking">
    <div><p className="text-xs font-semibold uppercase text-brass">Qué pasó</p><p className="mt-2 text-sm leading-6 text-muted">{publishedNote ?? `Se publicaron ${published.length} resultados; ${published.filter(exceeded).length} excedieron la magnitud implícita. VRT, COIN y RDDT fueron las reacciones negativas más fuertes.`}</p>
      <div className="mt-3 md:border-x md:border-b md:border-line md:px-3"><div className="hidden grid-cols-[1.15fr_0.65fr_0.65fr_0.8fr] gap-2 bg-panelSoft py-2 text-xs font-semibold uppercase text-muted md:grid"><span>Compañía</span><span>Movimiento implícito esperado</span><span>Ocurrido</span><span>Lectura</span></div>{published.map((item) => <div key={item.ticker} className="grid gap-2 border-t border-line py-3 text-sm md:grid-cols-[1.15fr_0.65fr_0.65fr_0.8fr] md:items-center"><div><strong className="text-ink">{item.company}</strong> <span className="text-petrol">({item.ticker})</span><p className="text-xs text-muted">{item.reportDate}</p></div><div><span className="md:hidden">Movimiento implícito esperado: </span><strong>{formatImpliedMove(item)}</strong></div><div><span className="md:hidden">Movimiento ocurrido: </span><strong>{item.actualMovePct?.toFixed(1).replace(".", ",")} %</strong></div><span className={`w-fit border px-2 py-1 text-xs font-semibold ${exceeded(item) ? "border-brass/50 text-brass" : "border-sage/60 text-petrol"}`}>{exceeded(item) ? "Excedió el rango" : "Dentro del rango"}</span><EvidenceLinks item={item} /></div>)}</div>
    </div>
    <div><p className="text-xs font-semibold uppercase text-brass">Qué esperamos</p><p className="mt-2 text-sm leading-6 text-muted">{upcomingNote ?? "Nueve ventanas ordenadas cronológicamente; sin una hora confirmada, el evento permanece como día completo."}</p>
      <div className="mt-3 md:border-x md:border-b md:border-line md:px-3"><div className="hidden grid-cols-[1.1fr_0.58fr_0.86fr_0.8fr] gap-2 bg-panelSoft py-2 text-xs font-semibold uppercase text-muted md:grid"><span>Compañía</span><span>Movimiento implícito</span><span>Hora / estado</span><span>Fecha y hora</span></div>{upcoming.map((item) => <div key={item.ticker} className="grid gap-2 border-t border-line py-3 text-sm md:grid-cols-[1.1fr_0.58fr_0.86fr_0.8fr] md:items-center"><div><strong className="text-ink">{item.company}</strong> <span className="text-petrol">({item.ticker})</span><p className="text-xs text-muted">{item.reportDate}</p></div><div><span className="md:hidden">Movimiento implícito esperado: </span><strong>{formatImpliedMove(item)}</strong></div><span className="text-muted">{earningsScheduleLabel(item)}</span><a className="w-fit border-b border-petrol/35 font-semibold text-petrol" href={item.dateTimeSourceHref} target="_blank" rel="noopener noreferrer">Fuente de fecha y hora ↗</a><EvidenceLinks item={item} /></div>)}</div>
    </div>
    {themes?.length ? <div className="grid gap-3">{themes.map((theme) => <article key={theme.title} className="border border-brass/35 bg-panelSoft p-4">
      <p className="text-xs font-semibold uppercase text-brass">{theme.label}</p>
      <h4 className="mt-2 text-base font-semibold leading-6 text-ink">{theme.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">{theme.body}</p>
      {theme.examples?.length ? <div className="mt-3 flex flex-wrap gap-1.5" aria-label={`Compañías citadas en ${theme.title}`}>{theme.examples.map((example) => <span key={example.ticker} className="border border-line bg-white px-2 py-1 text-[11px] font-semibold text-petrol">{example.company} ({example.ticker})</span>)}</div> : null}
      {theme.note ? <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">{theme.note}</p> : null}
    </article>)}</div> : null}
    <p className="border-l border-brass/50 pl-3 text-xs leading-5 text-muted">{methodology} Cada fila enlaza su página por ticker, la fecha de consulta y las fuentes utilizadas para fecha, hora y reacción.</p>
  </section>;
}
