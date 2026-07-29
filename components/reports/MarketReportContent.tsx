import Link from "next/link";
import { EditorialByline } from "@/components/editorial/EditorialByline";
import { AutomaticMarketReadings } from "@/components/reports/AutomaticMarketReadings";
import { ReportFigure } from "@/components/reports/ReportFigure";
import { buildIcsDataUri } from "@/lib/calendar/ics";
import { reportDisplayName, reportHref } from "@/lib/reports/market-reports";
import type { HistoricalAutomaticReadingsSnapshot } from "@/lib/reports/historical-automatic-readings";
import type { MarketReport, MarketReportCalendarItem, MarketReportWatchItem } from "@/lib/reports/market-reports";

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
  return {
    uid: `${report.id}-${calendarSlug(item.event)}@luigui-herrera`,
    summary: `${reportDisplayName(report)}: ${item.event}`,
    description: `${item.dateLabel}. ${item.whyItMatters}`,
    startDate: item.dateStart ?? "",
    endDate: item.dateEnd,
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
  const hasCalendarDates = report.calendar.some((item) => item.dateStart);
  const calendarSectionLabel = hasCalendarDates ? "Calendario y escenarios" : "Escenarios";
  const calendarSectionTitle = hasCalendarDates ? "Eventos y rutas probables" : "Rutas probables";

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

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Qué pasó</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Contexto por activo</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {report.whatHappened.map((block) => (
            <ContextByAssetCard key={block.title} block={block} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
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
                  </div>
                  <div className="border border-line bg-paper p-4">
                    <p className="text-xs font-semibold uppercase text-petrol">Secuencia de lectura</p>
                    <div className="mt-4 grid gap-3">
                      <TimelineStep number="1" title="Antes / contexto" body={asset.timeline.before} />
                      <TimelineStep number="2" title="Ahora / cambio" body={asset.timeline.now} />
                      <TimelineStep number="3" title="Próximas señales" body={asset.timeline.next} />
                    </div>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {automaticReadings ? (
        <AutomaticMarketReadings mode="historical" snapshot={automaticReadings} />
      ) : null}

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
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
          {report.calendar.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {report.calendar.map((item) => (
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
          <div className="grid gap-3 md:grid-cols-3">
            {report.scenarios.map((scenario) => (
              <article key={scenario.title} className="border border-line bg-panel p-5">
                <h3 className="text-lg font-semibold text-ink">{scenario.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{scenario.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Señales a vigilar</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Lista de control</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {report.watchlist.map((item) => (
            <WatchControlItem key={item.key} item={item} report={report} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
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

function TimelineStep({ body, number, title }: { body: string; number: string; title: string }) {
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

function WatchControlItem({ item, report }: { item: MarketReportWatchItem; report: MarketReport }) {
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
              rel={href.startsWith("http") ? "noreferrer" : undefined}
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
