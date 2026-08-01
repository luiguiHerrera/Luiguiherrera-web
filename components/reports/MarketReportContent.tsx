import Link from "next/link";
import { EditorialByline } from "@/components/editorial/EditorialByline";
import { AutomaticMarketReadings } from "@/components/reports/AutomaticMarketReadings";
import { ReportFigure } from "@/components/reports/ReportFigure";
import { ReportMonthlyCalendar } from "@/components/reports/ReportMonthlyCalendar";
import { StockpickingEarnings, StockpickingSummary } from "@/components/reports/StockpickingEarnings";
import { buildIcsDataUri } from "@/lib/calendar/ics";
import { reportDisplayName, reportHref } from "@/lib/reports/market-reports";
import type { HistoricalAutomaticReadingsSnapshot } from "@/lib/reports/historical-automatic-readings";
import type { MarketReport, MarketReportCalendarItem, MarketReportWatchItem } from "@/lib/reports/market-reports";
import { getReportCalendar } from "@/lib/reports/report-presentation";

type MarketReportContentProps = {
  automaticReadings: HistoricalAutomaticReadingsSnapshot | null;
  nextReport?: MarketReport | null;
  previousReport?: MarketReport | null;
  report: MarketReport;
};

function calendarSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function calendarEvent(report: MarketReport, item: MarketReportCalendarItem) {
  const time = item.timeStatus === "tba"
    ? `Hora por confirmar (${item.originalTimeZone ?? "zona horaria por confirmar"})`
    : [
        item.originalTime && item.originalTimeZone ? `${item.originalTime} ${item.originalTimeZone}` : null,
        item.displayTimeCest,
      ].filter(Boolean).join(" / ");
  const assets = item.affectedAssets?.length ? ` Activos o factores: ${item.affectedAssets.join(", ")}.` : "";
  const source = item.sourceLabel ? ` Fuente: ${item.sourceLabel}.` : "";
  return {
    uid: `${report.id}-${calendarSlug(item.event)}@luigui-herrera`,
    summary: `${reportDisplayName(report)}: ${item.event}`,
    description: `${item.dateLabel}. ${time}. ${item.whyItMatters}${assets}${source}`,
    startDate: item.dateStart ?? "",
    endDate: item.dateEnd,
    startDateTimeUtc: item.startDateTimeUtc,
  };
}

function calendarItemDataUri(report: MarketReport, item: MarketReportCalendarItem) {
  return buildIcsDataUri({
    name: `${reportDisplayName(report)} · ${item.event}`,
    events: [calendarEvent(report, item)],
  });
}

export function MarketReportContent({
  automaticReadings,
  nextReport,
  previousReport,
  report,
}: MarketReportContentProps) {
  const calendar = getReportCalendar(report);
  const hasCalendarDates = calendar.some((item) => item.dateStart);
  const calendarSectionLabel = hasCalendarDates ? "Calendario y escenarios" : "Escenarios";
  const calendarSectionTitle = hasCalendarDates ? "Eventos y rutas probables" : "Rutas probables";
  const contextTitle = report.presentation?.contextTitle ?? "Contexto por activo";
  const enhancedTimeline = report.presentation?.timelineStyle === "progression";
  const enhancedCalendar = report.presentation?.calendarStyle === "monthly";
  const enhancedWatchlist = report.presentation?.watchlistStyle === "dashboard";
  const watchlistGroups = [
    ["market-structure", "Estructura de mercado"],
    ["rates-credit", "Tasas y crédito"],
    ["technology-ai", "Tecnología e IA"],
    ["fx-commodities", "Divisas y materias primas"],
  ] as const;

  return (
    <article id={report.id} className="scroll-mt-24">
      <Link
        className="inline-flex min-h-10 items-center border-b border-petrol/30 text-sm font-semibold text-petrol transition hover:border-petrol"
        href="/informes"
      >
        ← Volver al archivo de informes
      </Link>

      <section className="mt-6 grid gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-petrol">{reportDisplayName(report)}</p>
            <span className="border border-brass/40 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase text-brass">
              {report.status === "actual" ? "Informe actual" : "Archivado"}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink md:text-5xl">{report.title}</h1>
          <EditorialByline
            automaticDataCutoffAt={report.automaticDataCutoffAt}
            editorialCutoffAt={report.editorialCutoffAt}
            locale="es"
            modifiedAt={report.modifiedAt}
            publishedAt={report.publishedAt}
          />
          <p className="mt-4 text-base leading-7 text-muted">{report.subtitle}</p>
          <ReportExportLinks report={report} />
        </div>
        <div className="grid gap-6">
          <section>
            <p className="text-xs font-semibold uppercase text-brass">Tesis principal</p>
            <p className="mt-3 text-base leading-8 text-muted">{report.thesis}</p>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase text-petrol">Resumen ejecutivo</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.executiveSummary.map((item) => (
                <article key={item.title} className="border border-line bg-panel p-4">
                  <p className="text-sm font-semibold uppercase text-petrol">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
                </article>
              ))}
            </div>
            {report.transversalFactor ? (
              <article className="mt-3 border border-brass/35 bg-panelSoft p-4">
                {report.transversalFactor.label ? (
                  <p className="text-xs font-semibold uppercase text-brass">{report.transversalFactor.label}</p>
                ) : null}
                <h3 className="mt-2 text-sm font-semibold uppercase text-petrol">{report.transversalFactor.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{report.transversalFactor.text}</p>
              </article>
            ) : null}
          </section>
        </div>
      </section>

      <section id={report.presentation?.contextTitle ? "contexto-general" : "contexto-por-activo"} className="grid scroll-mt-24 gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Qué pasó</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{contextTitle}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {report.whatHappened.map((block) => (
            <ContextByAssetCard key={block.title} block={block} />
          ))}
        </div>
      </section>

      {automaticReadings ? (
        <AutomaticMarketReadings mode="historical" snapshot={automaticReadings} />
      ) : null}

      <section id="lectura-seguimiento" className="grid scroll-mt-24 gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Qué esperamos</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Lectura de seguimiento por activo</h2>
        </div>
        <div className="grid gap-4">
          {report.assetReadings.map((asset) => (
            <details key={asset.asset} className="group border border-line bg-panel open:border-petrol/45 open:shadow-[0_16px_36px_rgba(31,35,40,0.06)]">
              <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 marker:hidden md:grid-cols-[0.24fr_1fr_auto_auto] md:items-center">
                <h3 className="text-lg font-semibold text-ink">{asset.asset}</h3>
                <p className="text-sm leading-6 text-muted">{asset.headline}</p>
                <span className="w-fit border border-brass/40 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase text-brass">
                  {asset.badge}
                </span>
                <span className="w-fit text-xs font-semibold uppercase text-brass">
                  <span className="details-open-label">ABRIR</span>
                  <span className="details-close-label">CERRAR</span>
                </span>
                {asset.detailsModule === "earnings" && report.stockpicking ? <div className="md:col-span-4"><StockpickingSummary published={report.stockpicking.earnings.published} upcoming={report.stockpicking.earnings.upcoming} /></div> : null}
              </summary>
              <div className="border-t border-line px-5 pb-5 pt-4">
                <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
                  <div className="grid gap-4">
                    <ReadingColumn title="Qué pasó" body={asset.story} />
                    <ReadingColumn title="Qué cambió" body={asset.changed} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <ReadingColumn title="Qué esperamos" body={asset.expected} />
                      <ReadingColumn title="Qué vigilar" body={asset.watch} />
                      <ReadingColumn title="Lectura del informe" body={asset.reading} />
                    </div>
                    {asset.figures?.length ? (
                      <div className="grid gap-4 pt-1">
                        {asset.figures.map((figure) => (
                          <ReportFigure key={figure.src} {...figure} />
                        ))}
                      </div>
                    ) : null}
                    {asset.detailsModule === "earnings" && report.stockpicking ? <StockpickingEarnings {...report.stockpicking.earnings} /> : null}
                  </div>
                  <div className={`border border-line bg-paper p-4 ${enhancedTimeline ? "lg:col-span-2" : ""}`}>
                    <p className="text-xs font-semibold uppercase text-petrol">Secuencia de lectura</p>
                    {enhancedTimeline ? (
                      <ol className="report-reading-flow mt-4 grid gap-4 md:grid-cols-3" aria-label={`Secuencia de lectura para ${asset.asset}`}>
                        <TimelineStep enhanced number="1" title="Antes — Contexto" body={asset.timeline.before} />
                        <TimelineStep enhanced number="2" title="Ahora — Qué cambió" body={asset.timeline.now} />
                        <TimelineStep enhanced number="3" title="Después — Qué vigilamos" body={asset.timeline.next} />
                      </ol>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        <TimelineStep number="1" title="Antes / contexto" body={asset.timeline.before} />
                        <TimelineStep number="2" title="Ahora / cambio" body={asset.timeline.now} />
                        <TimelineStep number="3" title="Próximas señales" body={asset.timeline.next} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section id="calendario-y-escenarios" className="grid scroll-mt-24 gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">{calendarSectionLabel}</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{calendarSectionTitle}</h2>
          {report.calendarHref ? (
            <>
              <p className="mt-3 text-sm leading-6 text-muted">
                Puedes descargar estas fechas en formato iCalendar para revisarlas en tu calendario personal.
              </p>
              <a
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
                download
                href={report.calendarHref}
              >
                Descargar calendario (.ics)
              </a>
            </>
          ) : null}
        </div>
        <div className="grid gap-5">
          {calendar.length && enhancedCalendar ? (
            <ReportMonthlyCalendar events={calendar} report={report} />
          ) : calendar.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {calendar.map((item) => (
                <article key={`${item.dateLabel}-${item.event}`} className="border border-line bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase text-brass">{item.dateLabel}</p>
                  <h3 className="mt-2 text-sm font-semibold leading-6 text-ink">{item.event}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.whyItMatters}</p>
                  {item.dateStart ? (
                    <a
                      className="mt-3 inline-flex min-h-8 w-fit items-center border-b border-petrol/30 text-xs font-semibold text-petrol transition hover:border-petrol"
                      download={`${report.id}-${calendarSlug(item.event)}.ics`}
                      href={calendarItemDataUri(report, item)}
                    >
                      Agregar al calendario
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          {!report.probableRoutes ? <div className="grid gap-3 md:grid-cols-3">
            {report.scenarios.map((scenario) => (
              <article key={scenario.title} className="border border-line bg-panel p-5">
                <h3 className="text-lg font-semibold text-ink">{scenario.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{scenario.body}</p>
              </article>
            ))}
          </div> : null}
        </div>
      </section>

      {report.probableRoutes ? (
        <section id="rutas-probables" className="grid scroll-mt-24 gap-6 border-t border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
          <div><p className="text-xs font-semibold uppercase text-petrol">Escenarios condicionales</p><h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">{report.probableRoutes.title}</h2><p className="mt-3 text-sm leading-6 text-muted">{report.probableRoutes.note}</p></div>
          <div className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-3">{report.probableRoutes.engines.map((item) => <article key={item.title} className="border-l-2 border-petrol bg-panel p-4"><p className="text-xs font-semibold uppercase text-petrol">Motor</p><h3 className="mt-2 font-semibold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.body}</p></article>)}</div>
            <div className="grid gap-3 md:grid-cols-3">{report.probableRoutes.scenarios.map((item) => <article key={item.title} className="border border-line bg-panelSoft p-4"><h3 className="font-semibold text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.body}</p></article>)}</div>
          </div>
        </section>
      ) : null}

      <section id="senales-a-vigilar" className="grid scroll-mt-24 gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Señales a vigilar</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Lista de control</h2>
        </div>
        {enhancedWatchlist ? (
          <div className="grid gap-6">
            {watchlistGroups.map(([category, label]) => {
              const items = report.watchlist.filter((item) => item.category === category);
              if (!items.length) return null;
              return (
                <section key={category} aria-labelledby={`watch-${category}`}>
                  <div className="flex items-center gap-3 border-b border-line pb-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden="true" />
                    <h3 id={`watch-${category}`} className="text-sm font-semibold uppercase tracking-[0.12em] text-petrol">{label}</h3>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {items.map((item) => <WatchControlItem compact key={item.key} item={item} report={report} />)}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {report.watchlist.map((item) => (
              <WatchControlItem key={item.key} item={item} report={report} />
            ))}
          </div>
        )}
      </section>

      <section id="fuentes-y-aviso" className="grid scroll-mt-24 gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Fuentes y aviso educativo</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Marco de lectura</h2>
        </div>
        <div className="border border-line bg-panelSoft p-5">
          <p className="text-sm leading-7 text-muted">{report.sourcesNote}</p>
          <p className="mt-3 border-t border-line pt-3 text-sm leading-7 text-muted">{report.disclaimer}</p>
        </div>
      </section>

      <ReportNavigation nextReport={nextReport} previousReport={previousReport} />
    </article>
  );
}

function ReportExportLinks({ report }: { report: MarketReport }) {
  const links = [
    report.pdfHref ? { href: report.pdfHref, label: "PDF", download: true } : null,
    report.htmlHref ? { href: report.htmlHref, label: "HTML", download: false } : null,
    report.markdownHref ? { href: report.markdownHref, label: "Markdown", download: true } : null,
    report.calendarHref ? { href: report.calendarHref, label: "Calendario (.ics)", download: true } : null,
  ].filter((item): item is { href: string; label: string; download: boolean } => item !== null);

  if (!links.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.href}
          className="inline-flex min-h-9 w-fit items-center justify-center rounded-[4px] border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink transition hover:border-petrol hover:text-petrol"
          download={link.download || undefined}
          href={link.href}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function ReadingColumn({ body, title }: { body: string; title: string }) {
  return (
    <div className="border-l border-brass/50 pl-3">
      <p className="text-xs font-semibold uppercase text-brass">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function TimelineStep({ body, enhanced = false, number, title }: { body: string; enhanced?: boolean; number: string; title: string }) {
  if (enhanced) {
    return (
      <li className="report-reading-flow__step relative grid grid-cols-[2.5rem_1fr] gap-3 md:grid-cols-1 md:gap-2">
        <span className="report-reading-flow__node relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-brass/55 bg-panel text-sm font-semibold text-brass">
          {number}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
        </div>
      </li>
    );
  }
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="flex h-8 w-8 items-center justify-center border border-brass/45 bg-white text-xs font-semibold text-brass">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
    </div>
  );
}

function ContextByAssetCard({ block }: { block: MarketReport["whatHappened"][number] }) {
  return (
    <details className="group border border-line bg-panel open:border-petrol/45 open:shadow-[0_16px_36px_rgba(31,35,40,0.06)]">
      <summary className="grid min-h-24 cursor-pointer list-none gap-3 px-5 py-4 marker:hidden focus-visible:ring-2 focus-visible:ring-petrol/25 focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <h3 className="text-lg font-semibold text-ink">{block.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{block.summary}</p>
        </div>
        <span className="w-fit text-xs font-semibold uppercase text-brass">
          <span className="details-open-label">ABRIR</span>
          <span className="details-close-label">CERRAR</span>
        </span>
      </summary>
      <div className="border-t border-line px-5 pb-5 pt-4">
        <p className="text-sm leading-7 text-muted">{block.body}</p>
      </div>
    </details>
  );
}

function WatchControlItem({ compact = false, item, report }: { compact?: boolean; item: MarketReportWatchItem; report: MarketReport }) {
  const href = item.href ?? item.reference?.href;
  const linkLabel = item.linkLabel ?? item.reference?.label;
  const statusLabel = item.statusLabel ?? "Seguimiento";
  const currentReading =
    item.currentReading ??
    "Lectura editorial de seguimiento basada en el contexto del informe. Conviene revisarla junto con la tesis principal y las demás señales antes de sacar conclusiones.";
  const whatWouldChange =
    item.whatWouldChange ??
    "La lectura cambiaría si el comportamiento observado se sostiene varias semanas o contradice la tesis principal del informe.";
  const asOf = item.asOf ?? report.publishedAt;
  const source = item.source ?? report.sourcesNote;

  if (compact) {
    const external = Boolean(href?.startsWith("http"));
    const statusClass = item.status === "stressed"
      ? "border-danger/35 bg-danger/10 text-danger"
      : item.status === "improving"
        ? "border-sage/55 bg-sage/10 text-petrol"
        : item.status === "tba"
          ? "border-brass/45 bg-brass/10 text-brass"
          : "border-petrol/30 bg-petrol/10 text-petrol";
    return (
      <article className="flex h-full flex-col border border-line bg-panel p-4 transition hover:border-petrol/45">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h4 className="text-base font-semibold leading-6 text-ink">{item.name}</h4>
          <span className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusClass}`}>{statusLabel}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{currentReading}</p>
        <div className="mt-3 border-l-2 border-brass/45 pl-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brass">Qué cambiaría la lectura</p>
          <p className="mt-1 text-sm leading-6 text-ink">{whatWouldChange}</p>
        </div>
        <div className="mt-auto pt-4">
          {href && linkLabel ? (
            <Link
              className="inline-flex min-h-10 w-full items-center justify-between gap-2 border border-petrol bg-petrol px-3 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              aria-label={`${linkLabel}${external ? ", abre en una pestaña nueva" : ""}`}
            >
              {linkLabel}<span aria-hidden="true">{external ? "↗" : "→"}</span>
            </Link>
          ) : (
            <p className="border border-line bg-panelSoft px-3 py-2 text-xs leading-5 text-muted">Seguimiento institucional no disponible públicamente.</p>
          )}
          <details className="group mt-3 border-t border-line pt-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold text-petrol marker:hidden">
              <span>Ver contexto completo</span>
              <span className="text-xs uppercase text-brass"><span className="details-open-label">Abrir</span><span className="details-close-label">Cerrar</span></span>
            </summary>
            <div className="grid gap-3 pt-3">
              <ReadingColumn title="Qué mira" body={item.whatLooksAt} />
              <ReadingColumn title="Por qué importa" body={item.whyItMatters} />
              <div className="border-t border-line pt-3 text-xs leading-5 text-muted">
                <p><span className="font-semibold uppercase text-brass">Corte:</span> {asOf}</p>
                <p className="mt-1"><span className="font-semibold uppercase text-brass">Fuente:</span> {source}</p>
              </div>
            </div>
          </details>
        </div>
      </article>
    );
  }

  return (
    <details className="group border border-line bg-panel open:border-petrol/45">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 marker:hidden md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="text-sm font-semibold text-ink">{item.name}</span>
          <p className="mt-1 text-xs font-semibold uppercase text-brass">{statusLabel}</p>
        </div>
        <span className="w-fit text-xs font-semibold uppercase text-brass">
          <span className="details-open-label">ABRIR</span>
          <span className="details-close-label">CERRAR</span>
        </span>
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-3">
        <div className="grid gap-4 text-sm leading-6 text-muted md:grid-cols-2">
          <ReadingColumn title="Qué mira" body={item.whatLooksAt} />
          <ReadingColumn title="Por qué importa" body={item.whyItMatters} />
          <ReadingColumn title="Lectura al publicar" body={currentReading} />
          <ReadingColumn title="Qué cambiaría" body={whatWouldChange} />
        </div>
        <div className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
          <p>
            <span className="font-semibold uppercase text-brass">Fecha:</span> {asOf}
          </p>
          <p className="mt-1">
            <span className="font-semibold uppercase text-brass">Fuente:</span> {source}
          </p>
          {href && linkLabel ? (
            <Link
              className="mt-3 inline-flex min-h-8 w-fit items-center border-b border-petrol/30 text-sm font-semibold text-petrol transition hover:border-petrol"
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function ReportNavigation({
  nextReport,
  previousReport,
}: {
  nextReport?: MarketReport | null;
  previousReport?: MarketReport | null;
}) {
  if (!previousReport && !nextReport) return null;

  return (
    <nav className="grid gap-3 border-t border-line pt-6 md:grid-cols-2" aria-label="Navegación entre informes">
      {previousReport ? (
        <Link
          className="border border-line bg-panel p-4 text-sm transition hover:border-petrol"
          href={reportHref(previousReport)}
        >
          <span className="text-xs font-semibold uppercase text-brass">Informe anterior</span>
          <span className="mt-2 block font-semibold text-ink">{reportDisplayName(previousReport)}</span>
          <span className="mt-1 block text-muted">{previousReport.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {nextReport ? (
        <Link
          className="border border-line bg-panel p-4 text-sm transition hover:border-petrol md:text-right"
          href={reportHref(nextReport)}
        >
          <span className="text-xs font-semibold uppercase text-brass">Informe siguiente</span>
          <span className="mt-2 block font-semibold text-ink">{reportDisplayName(nextReport)}</span>
          <span className="mt-1 block text-muted">{nextReport.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
