import type { Metadata } from "next";
import Link from "next/link";
import { AutomaticMarketReadings } from "@/components/reports/AutomaticMarketReadings";
import { buildIcsDataUri } from "@/lib/calendar/ics";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import { jpmSpxLevelsContext } from "@/lib/market/jpm-spx-levels";
import { activeMarketReport, getReportsByMonth } from "@/lib/reports/market-reports";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import type { MarketReport, MarketReportCalendarItem, MarketReportWatchItem } from "@/lib/reports/market-reports";

export const metadata: Metadata = {
  title: "Informes de mercado | Luigui Herrera",
  description: "Archivo de informes para lectura de mercado, flujos, riesgo y activos multi-mercado.",
};

export const revalidate = 86400;

const currentMonthKey = "2026-07";
const previousMonthKey = "2026-06";
const previousMonthLabel = "Junio 2026";

export default async function InformesPage() {
  const automaticData = await buildWeeklyReportData();
  const currentMonthReports = getReportsByMonth(currentMonthKey);
  const previousMonthReports = getReportsByMonth(previousMonthKey);
  const report = activeMarketReport;
  const watchStatuses = getWatchStatuses(automaticData);

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 md:px-5 md:py-14">
      <section className="grid gap-6 border-b border-line pb-8 lg:grid-cols-[1fr_0.42fr] lg:items-end">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase text-petrol">Informes de mercado</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
            Lectura de mercado, flujos y riesgo
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted md:text-lg">
            Archivo de informes para seguimiento de una cartera multi-activo: VOO, GLD, EWJ, FXI,
            BTC/ETH y selección de acciones.
          </p>
          <p className="mt-4 max-w-2xl border-l border-brass/50 pl-4 text-sm leading-6 text-muted">
            Documento educativo e informativo. No constituye asesoría financiera personalizada.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-5 py-3 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
            href={`#${report.id}`}
          >
            Leer informe actual
          </Link>
          <a
            className="inline-flex items-center justify-center rounded-[4px] border border-line bg-panel px-5 py-3 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol"
            download
            href={report.pdfHref}
          >
            Descargar PDF
          </a>
        </div>
      </section>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Archivo de informes</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Lecturas cargadas</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ReportMonthCard title="Mes vigente" label="Julio 2026" reports={currentMonthReports} />
          <ReportMonthCard title="Mes anterior" label={previousMonthLabel} reports={previousMonthReports} />
        </div>
      </section>

      <article id={report.id} className="scroll-mt-24 border-y border-line py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[0.34fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-petrol">{report.dateLabel}</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-ink md:text-4xl">{report.title}</h2>
            <p className="mt-4 text-base leading-7 text-muted">{report.subtitle}</p>
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
            </section>
          </div>
        </div>
      </article>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Qué pasó</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Contexto del movimiento</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {report.whatHappened.map((block) => (
            <article key={block.title} className="border border-line bg-panel p-5">
              <h3 className="text-lg font-semibold text-ink">{block.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{block.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-y border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Lectura por activo</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Qué pasó, qué esperamos y qué vigilar</h2>
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
                    <ReadingColumn title="La historia" body={asset.story} />
                    <ReadingColumn title="Qué cambió" body={asset.changed} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <ReadingColumn title="Qué esperamos" body={asset.expected} />
                      <ReadingColumn title="Qué vigilar" body={asset.watch} />
                      <ReadingColumn title="Lectura del informe" body={asset.reading} />
                    </div>
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

      <AutomaticMarketReadings data={automaticData} />

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Calendario y escenarios</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Eventos y rutas probables</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Puedes descargar estas fechas en formato iCalendar para revisarlas en tu calendario personal.
          </p>
          {report.calendarHref ? (
            <a
              className="mt-4 inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
              download
              href={report.calendarHref}
            >
              Descargar calendario (.ics)
            </a>
          ) : null}
        </div>
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report.calendar.map((item) => (
              <article key={`${item.dateLabel}-${item.event}`} className="border border-line bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase text-brass">{item.dateLabel}</p>
                <h3 className="mt-2 text-sm font-semibold leading-6 text-ink">{item.event}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.whyItMatters}</p>
                {item.dateStart ? (
                  <a
                    className="mt-3 inline-flex w-fit border-b border-petrol/30 text-xs font-semibold text-petrol transition hover:border-petrol"
                    download={`${report.id}-${calendarSlug(item.event)}.ics`}
                    href={calendarItemDataUri(report, item)}
                  >
                    Agregar al calendario
                  </a>
                ) : null}
              </article>
            ))}
          </div>
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
            <WatchControlItem key={item.key} item={item} status={watchStatuses[item.key]} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Nota final</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Marco de lectura</h2>
        </div>
        <div className="border border-line bg-panelSoft p-5">
          <p className="text-sm leading-7 text-muted">{report.sourcesNote}</p>
          <p className="mt-3 border-t border-line pt-3 text-sm leading-7 text-muted">{report.disclaimer}</p>
        </div>
      </section>
    </main>
  );
}

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
    summary: `${report.title}: ${item.event}`,
    description: `${item.dateLabel}. ${item.whyItMatters}`,
    startDate: item.dateStart ?? "",
    endDate: item.dateEnd,
  };
}

function calendarItemDataUri(report: MarketReport, item: MarketReportCalendarItem) {
  return buildIcsDataUri({
    name: `${report.title} · ${item.event}`,
    events: [calendarEvent(report, item)],
  });
}

function ReportMonthCard({
  label,
  reports,
  title,
}: {
  label: string;
  reports: MarketReport[];
  title: string;
}) {
  return (
    <section className="border border-line bg-panel p-5">
      <p className="text-xs font-semibold uppercase text-petrol">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-ink">{label}</h3>
      <div className="mt-4 grid gap-2">
        {reports.length ? (
          reports.map((report) => (
            <Link
              key={report.id}
              className="border border-line bg-paper px-4 py-3 text-sm font-semibold text-ink transition hover:border-petrol hover:text-petrol"
              href={`#${report.id}`}
            >
              {report.title}
            </Link>
          ))
        ) : (
          <p className="border border-line bg-paper px-4 py-3 text-sm leading-6 text-muted">
            No hay informes cargados del mes anterior.
          </p>
        )}
      </div>
    </section>
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

function WatchControlItem({
  item,
  status,
}: {
  item: MarketReportWatchItem;
  status?: { text: string; href?: string; referenceLabel?: string };
}) {
  const referenceHref = status?.href ?? item.reference?.href;
  const referenceLabel = status?.referenceLabel ?? item.reference?.label;
  const currentStatus = status?.text ?? fallbackWatchStatus(item.key);

  return (
    <details className="group border border-line bg-panel open:border-petrol/45">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:hidden">
        <span className="text-sm font-semibold text-ink">{item.name}</span>
        <span className="text-xs font-semibold uppercase text-brass">
          <span className="details-open-label">ABRIR</span>
          <span className="details-close-label">CERRAR</span>
        </span>
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-3">
        <div className="grid gap-3 text-sm leading-6 text-muted">
          <ReadingColumn title="Qué mira" body={item.whatLooksAt} />
          <ReadingColumn title="Por qué importa" body={item.whyItMatters} />
          <ReadingColumn
            title="Estado actual"
            body={currentStatus}
          />
          {referenceHref && referenceLabel ? (
            <Link
              className="w-fit border-b border-petrol/30 text-sm font-semibold text-petrol transition hover:border-petrol"
              href={referenceHref}
              target={referenceHref.startsWith("http") ? "_blank" : undefined}
              rel={referenceHref.startsWith("http") ? "noreferrer" : undefined}
            >
              {referenceLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function fallbackWatchStatus(key: string) {
  if (key === "bank-earnings") return "No hay lectura sectorial vigente cargada para este bloque.";
  if (key === "semis-earnings") return "No hay ETF específico de semiconductores integrado ni proxy tecnológico vigente cargado para este bloque.";
  return "No hay información vigente cargada para este bloque.";
}

function getWatchStatuses(data: WeeklyReportData): Record<string, { text: string; href?: string; referenceLabel?: string }> {
  const vixText = data.volatility.vix?.spot
    ? `VIX spot ${formatNumber(data.volatility.vix.spot.latestVix)}; momentum ${vixTrendLabel(data.volatility.vix.spot.vixTrend)}. Curva: ${data.volatility.termStructure?.classification ?? "pendiente"}.`
    : undefined;
  const techSector = data.sectors.data?.sectors.find((sector) => sector.etfTicker === "XLK");
  const techText = techSector
    ? `${techSector.sectorName}: retorno 5D ${formatSectorPercent(techSector.return1w)}, retorno 1M ${formatSectorPercent(techSector.return1m)}.`
    : undefined;
  const financialSector = data.sectors.data?.sectors.find((sector) => sector.etfTicker === "XLF");
  const financialText = financialSector
    ? `${financialSector.etfTicker} · ${financialSector.sectorName}: retorno 5D ${formatSectorPercent(financialSector.return1w)}, retorno 1M ${formatSectorPercent(financialSector.return1m)}.`
    : undefined;
  const statsByTicker = new Map(data.statisticalLevels.map((asset) => [asset.ticker, asset]));
  const usoLevel = statsByTicker.get("USO");
  const oilText = usoLevel
    ? `USO como proxy líquido de petróleo. No equivale al spot exacto ni a futuros individuales. Percentil ${formatStat(usoLevel.percentile, 1)}, z-score ${formatStat(usoLevel.zScore, 2)}, distancia a media larga ${formatDashboardPercent(usoLevel.distanceToLongAverage)}.`
    : undefined;
  const uupLevel = statsByTicker.get("UUP");
  const dollarText = uupLevel
    ? `UUP como proxy líquido del dólar. Retorno 1W ${formatDashboardPercent(uupLevel.returns["1W"])}; distancia a media larga ${formatDashboardPercent(uupLevel.distanceToLongAverage)}.`
    : "No hay fuente de dólar integrada en el snapshot vigente. Pendiente: UUP/DXY.";
  const semisSpecific = data.statisticalLevels.find((asset) => ["SMH", "SOXX"].includes(asset.ticker));
  const semisText = semisSpecific
    ? `${semisSpecific.ticker}: percentil ${formatStat(semisSpecific.percentile, 1)}, z-score ${formatStat(semisSpecific.zScore, 2)}, distancia a media larga ${formatDashboardPercent(semisSpecific.distanceToLongAverage)}.`
    : techSector
      ? `No hay ETF específico de semiconductores integrado; se usa tecnología como proxy parcial. XLK: retorno 5D ${formatSectorPercent(techSector.return1w)}, retorno 1M ${formatSectorPercent(techSector.return1m)}.`
      : undefined;
  const btcFlows = data.flows.btcEtfFlows?.flows;
  const btcText = btcFlows
    ? `${btcFlows.readingLabel}. Último día: ${formatUsdMillions(btcFlows.latestTotalNetFlow)}; 5D: ${formatUsdMillions(btcFlows.rolling5dNetFlow)}; racha: ${btcFlows.flowStreak.label}.`
    : undefined;
  const cryptoFlowsText = btcText ?? "Flujos BTC ETF pendientes de actualización.";
  const spyLevel = statsByTicker.get("SPY");
  const levelsText = spyLevel
    ? `SPY: percentil ${formatStat(spyLevel.percentile, 1)}, z-score ${formatStat(spyLevel.zScore, 2)}, distancia a media larga ${formatDashboardPercent(spyLevel.distanceToLongAverage)}.`
    : undefined;
  const seasonalityText = data.seasonality
    ? `Día ${data.seasonality.currentDay} del mes en la muestra de estacionalidad disponible. Referencia descriptiva, no predictiva.`
    : undefined;
  const rspLevel = statsByTicker.get("RSP");
  const iwmLevel = statsByTicker.get("IWM");
  const sectorStats = data.statisticalLevels.filter((asset) => asset.ticker.startsWith("XL"));
  const sectorsPositive = data.sectors.data?.sectors.filter((sector) => (sector.return1w ?? 0) > 0).length ?? null;
  const sectorsOverLongAverage = sectorStats.filter((asset) => (asset.distanceToLongAverage ?? -Infinity) > 0).length;
  const sectorTotal = data.sectors.data?.sectors.length ?? sectorStats.length;
  const equalWeightLabel = rspLevel && spyLevel
    ? relativeParticipationLabel(rspLevel.returns["1W"], spyLevel.returns["1W"])
    : "pendiente";
  const smallCapsLabel = iwmLevel && spyLevel
    ? smallCapsParticipationLabel(iwmLevel.returns["1W"], spyLevel.returns["1W"])
    : "pendiente";
  const sectorTone = sectorsPositive !== null && sectorTotal && sectorsPositive / sectorTotal >= 0.6
    ? "la lectura sectorial sigue amplia"
    : sectorsPositive !== null && sectorTotal
      ? "la lectura sectorial luce selectiva"
      : "la lectura sectorial queda pendiente";
  const leadershipTone = equalWeightLabel === "mejor" || smallCapsLabel === "liderando"
    ? "y la participación fuera de los líderes grandes mejora."
    : equalWeightLabel === "plano" || smallCapsLabel === "acompañando"
      ? "con participación fuera de los líderes grandes estable."
      : "aunque equal weight y small caps no lideran.";
  const breadthText = [
    `Hoy ${sectorTone}, ${leadershipTone}`,
    sectorsPositive !== null && sectorTotal ? `Sectores positivos: ${sectorsPositive} de ${sectorTotal}.` : "Sectores positivos: pendiente.",
    sectorStats.length ? `Sectores sobre media larga: ${sectorsOverLongAverage} de ${sectorStats.length}.` : "Sectores sobre media larga: pendiente.",
    `Equal weight vs S&P 500: ${equalWeightLabel}.`,
    `Small caps vs S&P 500: ${smallCapsLabel}.`,
  ].join(" ");
  const jpmSpxText = `${jpmSpxLevelsContext.statusText} ${jpmSpxLevelsContext.clarification}`;
  const optionsText = `${data.optionsProxy.statusText} ${data.optionsProxy.proxyClarification}`;

  return {
    ...(vixText
      ? {
          vix: {
            text: vixText,
            href: data.volatility.vix?.spot.sourceUrl,
            referenceLabel: "FRED VIXCLS",
          },
        }
      : {}),
    ...(techText ? { "tech-flows": { text: techText } } : {}),
    dollar: { text: dollarText, href: uupLevel ? "/niveles-estadisticos?asset=UUP" : undefined, referenceLabel: uupLevel ? "Niveles estadísticos" : undefined },
    ...(oilText ? { oil: { text: oilText, href: "/niveles-estadisticos?asset=USO", referenceLabel: "Niveles estadísticos" } } : {}),
    "btc-etf-flows": { text: cryptoFlowsText },
    ...(financialText ? { "bank-earnings": { text: financialText, href: "/dashboard", referenceLabel: "Dashboard" } } : {}),
    ...(semisText ? { "semis-earnings": { text: semisText, href: "/dashboard", referenceLabel: "Dashboard" } } : {}),
    breadth: { text: breadthText, href: "/dashboard", referenceLabel: "Ver detalle de amplitud en Dashboard" },
    levels: { text: levelsText ? `${levelsText} ${jpmSpxText}` : jpmSpxText, href: jpmSpxLevelsContext.sourceUrl, referenceLabel: jpmSpxLevelsContext.sourceLabel },
    options: { text: optionsText, href: data.optionsProxy.sourceUrl, referenceLabel: data.optionsProxy.sourceName },
    ...(seasonalityText
      ? { "july-seasonality": { text: seasonalityText, href: "/niveles-estadisticos", referenceLabel: "Niveles estadísticos" } }
      : {}),
  };
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "pendiente";
  return value.toFixed(digits);
}

function formatStat(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "n/d";
  return value.toFixed(digits);
}

function formatDashboardPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "pendiente";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function relativeParticipationLabel(value: number | null | undefined, benchmark: number | null | undefined) {
  if (value === null || value === undefined || benchmark === null || benchmark === undefined) return "pendiente";
  const spread = (value - benchmark) * 100;
  if (Math.abs(spread) < 0.1) return "plano";
  return spread > 0 ? "mejor" : "peor";
}

function smallCapsParticipationLabel(value: number | null | undefined, benchmark: number | null | undefined) {
  if (value === null || value === undefined || benchmark === null || benchmark === undefined) return "pendiente";
  const spread = (value - benchmark) * 100;
  if (Math.abs(spread) < 0.1) return "acompañando";
  return spread > 0 ? "liderando" : "rezagadas";
}

function formatSectorPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatUsdMillions(value: number | null | undefined) {
  if (value === null || value === undefined) return "pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} M USD`;
}

function vixTrendLabel(value: string | undefined) {
  if (value === "rising_fast") return "subiendo rápido";
  if (value === "rising") return "subiendo";
  if (value === "falling") return "bajando";
  return "estable";
}
