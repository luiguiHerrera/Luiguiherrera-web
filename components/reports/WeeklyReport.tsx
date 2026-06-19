import { ReportSection } from "@/components/reports/ReportSection";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import type { DailySeasonalityCell, PresidentialCyclePhase } from "@/lib/statistical-levels/types";

type WeeklyReportProps = {
  data: WeeklyReportData;
  locale?: "es" | "en";
};

const phaseLabels: Record<PresidentialCyclePhase, string> = {
  all: "Todos los años",
  post_election: "Año 1 · Post-elección",
  midterm: "Año 2 · Midterm",
  pre_election: "Año 3 · Pre-elección",
  election: "Año 4 · Elección",
};

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const englishPhaseLabels: Record<PresidentialCyclePhase, string> = {
  all: "All years",
  post_election: "Year 1 · Post-election",
  midterm: "Year 2 · Midterm",
  pre_election: "Year 3 · Pre-election",
  election: "Year 4 · Election",
};
const englishMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatSectorPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "Pendiente";
  return value.toFixed(digits);
}

function formatUsdMillions(value: number | null | undefined) {
  if (value === null || value === undefined) return "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(0)} M USD`;
}

function vixTrendLabel(value: string | undefined, locale: "es" | "en") {
  if (locale === "en") {
    if (value === "rising_fast") return "Rising fast";
    if (value === "rising") return "Rising";
    if (value === "falling") return "Falling";
    return "Stable";
  }
  if (value === "rising_fast") return "Subiendo rápido";
  if (value === "rising") return "Subiendo";
  if (value === "falling") return "Bajando";
  return "Estable";
}

function structureLabel(distanceToMa200: number | null | undefined, locale: "es" | "en") {
  if (locale === "en") {
    if (distanceToMa200 === null || distanceToMa200 === undefined) return "Structure pending";
    if (distanceToMa200 > 0.05) return "Above long average";
    if (distanceToMa200 > 0) return "Near support";
    if (distanceToMa200 > -0.05) return "Below, without a wide break";
    return "Weak versus long average";
  }
  if (distanceToMa200 === null || distanceToMa200 === undefined) return "Estructura pendiente";
  if (distanceToMa200 > 0.05) return "Sobre media larga";
  if (distanceToMa200 > 0) return "Apoyo cercano";
  if (distanceToMa200 > -0.05) return "Debajo, sin ruptura amplia";
  return "Debilidad frente a media larga";
}

function limitItems(items: string[]) {
  return items.slice(0, 3);
}

export function WeeklyReport({ data, locale = "es" }: WeeklyReportProps) {
  const copy = locale === "en"
    ? {
        report: "Weekly Report",
        closeRead: "Closing read",
        date: "Date",
        week: "Week",
        regime: "Regime",
        confidence: "Confidence",
        executive: "Executive summary",
        helped: "What helped",
        weighed: "What weighed",
        watch: "What to watch",
        coreEtfs: "The 4 ETFs",
        longAverage: "Long average",
        distanceToHighs: "Distance to highs",
        sectors: "Sectors",
        leaders: "Leaders",
        laggards: "Laggards",
        rotationRead: "Rotation read",
        pendingRotation: "Sector rotation pending.",
        dispersion: "1W dispersion",
        volatility: "Volatility",
        vixMomentum: "VIX momentum",
        vixCurve: "VIX curve",
        pending: "Pending",
        pendingVol: "Volatility pending update.",
        flows: "Flows",
        latestBtc: "BTC ETF latest day",
        read: "Read",
        pendingFlows: "BTC ETF flows pending update.",
        levels: "Statistical levels",
        percentile: "Percentile",
        seasonality: "Seasonality",
        seasonalityBody: "Only rankings with at least 5 observations are shown. The read helps locate historical patterns without overstating a single day.",
        limitedCycle: "Limited presidential-cycle sample: expand the read with care.",
        enoughSample: "Enough sample for a compact descriptive read.",
        bestDays: "Best historical days",
        weakDays: "Weak historical days",
        cycleBestDays: "Best cycle days",
        cycleWeakDays: "Weak cycle days",
        seasonalityPending: "Seasonality pending until data is regenerated.",
        crossReadings: "Cross-readings",
        radarReading: "Curated summary of tensions worth keeping on screen without turning the report into a long table.",
        manualUpdate: "Manual update",
        reviewedTickers: "Reviewed tickers",
        initialView: "Initial view",
        highlights: "highlights",
        contextUse: "Context",
        institutional: "Institutional",
        note: "Note",
        finalRead: "Final read",
        context: "Context",
        risk: "Risk",
        process: "Process",
        contextBody: "The regime sets the weekly tone and helps organize volatility, rotation and flows into one read.",
        riskBody: "The priority is to protect margin for error when several readings start losing alignment.",
        processBody: "Maintaining process means returning to the map: regime, levels, flows and seasonality before expanding the read.",
        empty: "No highlighted readings in this block.",
        lowSample: "Not enough observations to highlight days.",
      }
    : {
        report: "Informe semanal",
        closeRead: "Lectura de cierre",
        date: "Fecha",
        week: "Semana",
        regime: "Régimen",
        confidence: "Confianza",
        executive: "Resumen ejecutivo",
        helped: "Qué impulsó",
        weighed: "Qué frenó",
        watch: "Qué vigilar",
        coreEtfs: "Los 4 ETFs",
        longAverage: "Media larga",
        distanceToHighs: "Distancia a máximos",
        sectors: "Sectores",
        leaders: "Líderes",
        laggards: "Rezagados",
        rotationRead: "Lectura de rotación",
        pendingRotation: "Rotación sectorial pendiente.",
        dispersion: "Dispersión 1W",
        volatility: "Volatilidad",
        vixMomentum: "Momentum VIX",
        vixCurve: "Curva VIX",
        pending: "Pendiente",
        pendingVol: "Volatilidad pendiente de actualización.",
        flows: "Flujos",
        latestBtc: "BTC ETF último día",
        read: "Lectura",
        pendingFlows: "Flujos BTC ETF pendientes de actualización.",
        levels: "Niveles estadísticos",
        percentile: "Percentil",
        seasonality: "Estacionalidad",
        seasonalityBody: "Se muestran solo rankings con muestra mínima de 5 observaciones. La lectura sirve para ubicar patrones históricos, no para sobredimensionar un día aislado.",
        limitedCycle: "Muestra acotada en ciclo presidencial: ampliar lectura con prudencia.",
        enoughSample: "Muestra suficiente para una lectura descriptiva compacta.",
        bestDays: "Mejores días históricos",
        weakDays: "Días débiles históricos",
        cycleBestDays: "Mejores días del ciclo",
        cycleWeakDays: "Días débiles del ciclo",
        seasonalityPending: "Estacionalidad pendiente hasta regenerar datos.",
        crossReadings: "Lecturas cruzadas",
        radarReading: "Resumen curado de tensiones que conviene mantener en pantalla sin convertir el informe en una tabla larga.",
        manualUpdate: "Actualización manual",
        reviewedTickers: "Tickers revisados",
        initialView: "Vista inicial",
        highlights: "destacados",
        contextUse: "Contexto",
        institutional: "Institucional",
        note: "Nota",
        finalRead: "Lectura final",
        context: "Contexto",
        risk: "Riesgo",
        process: "Proceso",
        contextBody: "El régimen marca el tono de la semana y ayuda a ordenar volatilidad, rotación y flujos en una lectura común.",
        riskBody: "La prioridad es cuidar el margen de error cuando varias lecturas empiezan a perder alineación.",
        processBody: "Mantener proceso significa volver al mapa: régimen, niveles, flujo y estacionalidad antes de ampliar lectura.",
        empty: "Sin lecturas destacadas en este bloque.",
        lowSample: "Muestra insuficiente para destacar días.",
      };
  const phases = locale === "en" ? englishPhaseLabels : phaseLabels;
  const months = locale === "en" ? englishMonthNames : monthNames;
  const watchItems = limitItems([
    data.volatility.termStructure?.classification ? `Curva VIX: ${data.volatility.termStructure.classification}` : "",
    data.flows.btcEtfFlows?.flows.readingLabel ? `Flujos BTC ETF: ${data.flows.btcEtfFlows.flows.readingLabel}` : "",
    data.sectors.data?.metrics.interpretation ?? "",
  ].filter(Boolean));
  const radarPreview = data.crossSignalRadar.slice(0, 3);

  return (
    <div className="space-y-5 md:space-y-7">
      <section className="border border-petrol/35 bg-panel p-4 shadow-[0_10px_30px_rgba(31,35,40,0.035)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{copy.report}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">{copy.closeRead}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink md:text-lg">
              {data.regimeSummary.interpretation}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Metric label={copy.date} value={data.generatedAt} />
            <Metric label={copy.week} value={data.weekLabel} />
            <Metric label={copy.regime} value={data.regimeSummary.current} />
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Score" value={`${data.regimeSummary.regimeScore}/100`} emphasis />
              <Metric label={copy.confidence} value={`${data.regimeSummary.confidence}%`} emphasis />
            </div>
          </div>
        </div>
      </section>

      <ReportSection eyebrow="01" title={copy.executive}>
        <div className="grid gap-3 lg:grid-cols-3">
          <SignalList title={copy.helped} items={limitItems(data.executiveSummary.helped.map((signal) => `${signal.label}: ${signal.detail}`))} emptyLabel={copy.empty} />
          <SignalList title={copy.weighed} items={limitItems(data.executiveSummary.weighed.map((signal) => `${signal.label}: ${signal.detail}`))} emptyLabel={copy.empty} />
          <SignalList title={copy.watch} items={watchItems} emptyLabel={copy.empty} />
        </div>
      </ReportSection>

      <ReportSection eyebrow="02" title={copy.coreEtfs}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.coreEtfs.map((asset) => (
            <article key={asset.ticker} className="border border-line bg-panelSoft p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-ink">{asset.ticker}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
                </div>
                <span className="text-right text-lg font-semibold text-ink">{formatPercent(asset.weeklyReturn)}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                <p><span className="font-semibold text-ink">{structureLabel(asset.distanceToMa200, locale)}</span></p>
                <p>{copy.longAverage}: <span className="font-semibold text-ink">{formatPercent(asset.distanceToMa200)}</span></p>
                <p>{copy.distanceToHighs}: <span className="font-semibold text-ink">{formatPercent(asset.distanceToAth)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="03" title={copy.sectors}>
        <div className="grid gap-3 lg:grid-cols-[0.75fr_0.75fr_1fr]">
          <SignalList title={copy.leaders} items={limitItems(data.sectors.leaders.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`))} emptyLabel={copy.empty} />
          <SignalList title={copy.laggards} items={limitItems(data.sectors.laggards.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`))} emptyLabel={copy.empty} />
          <EditorialNote
            title={copy.rotationRead}
            body={data.sectors.data?.metrics.interpretation ?? copy.pendingRotation}
            footer={`${copy.dispersion}: ${formatSectorPercent(data.sectors.data?.metrics.sectorDispersion1w)}`}
          />
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection eyebrow="04" title={copy.volatility}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="VIX spot" value={formatNumber(data.volatility.vix?.spot.latestVix)} emphasis />
            <Metric label={copy.vixMomentum} value={vixTrendLabel(data.volatility.vix?.spot.vixTrend, locale)} />
            <Metric label={copy.vixCurve} value={data.volatility.termStructure?.classification ?? copy.pending} />
            <Metric label="M1/M2" value={data.volatility.termStructure?.m1m2SlopePct === null || data.volatility.termStructure?.m1m2SlopePct === undefined ? copy.pending : `${data.volatility.termStructure.m1m2SlopePct.toFixed(1)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {data.volatility.termStructure?.interpretation ?? data.volatility.vix?.spot.vixCompositeSubtext ?? copy.pendingVol}
          </p>
        </ReportSection>

        <ReportSection eyebrow="05" title={copy.flows}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label={copy.latestBtc} value={formatUsdMillions(data.flows.btcEtfFlows?.flows.latestTotalNetFlow)} emphasis />
            <Metric label="BTC ETF 5D" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.rolling5dNetFlow)} />
            <Metric label="Streak" value={data.flows.btcEtfFlows?.flows.flowStreak.label ?? copy.pending} />
            <Metric label={copy.read} value={data.flows.btcEtfFlows?.flows.readingLabel ?? copy.pending} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {data.flows.btcEtfFlows?.flows.readingSubtext ?? copy.pendingFlows}
          </p>
        </ReportSection>
      </div>

      <ReportSection eyebrow="06" title={copy.levels}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.statisticalLevels.map((asset) => (
            <article key={asset.ticker} className="border border-line bg-panelSoft p-4">
              <p className="text-lg font-semibold text-ink">{asset.ticker}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
              <div className="mt-4 grid gap-2 text-sm text-muted">
                <p>{copy.percentile} <span className="font-semibold text-ink">{asset.percentile === null ? "n/d" : asset.percentile.toFixed(1)}</span></p>
                <p>Z-score <span className="font-semibold text-ink">{asset.zScore === null ? "n/d" : asset.zScore.toFixed(2)}</span></p>
                <p>{copy.longAverage} <span className="font-semibold text-ink">{formatPercent(asset.distanceToLongAverage)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="07" title={copy.seasonality}>
        {data.seasonality ? (
          <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
            <EditorialNote
              title={`${months[data.seasonality.month - 1]} · ${phases[data.seasonality.phase]}`}
              body={copy.seasonalityBody}
              footer={data.seasonality.cycle.best.length < 3 || data.seasonality.cycle.weakest.length < 3 ? copy.limitedCycle : copy.enoughSample}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SeasonalityList title={copy.bestDays} cells={data.seasonality.allYears.best} emptyLabel={copy.lowSample} />
              <SeasonalityList title={copy.weakDays} cells={data.seasonality.allYears.weakest} emptyLabel={copy.lowSample} />
              <SeasonalityList title={copy.cycleBestDays} cells={data.seasonality.cycle.best} emptyLabel={copy.lowSample} />
              <SeasonalityList title={copy.cycleWeakDays} cells={data.seasonality.cycle.weakest} emptyLabel={copy.lowSample} />
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">{copy.seasonalityPending}</p>
        )}
      </ReportSection>

      <ExpandableInsightCard
        eyebrow="08 · Radar"
        title={copy.crossReadings}
        reading={copy.radarReading}
        status={copy.manualUpdate}
        metrics={[
          { label: copy.reviewedTickers, value: String(data.crossSignalRadar.length) },
          { label: copy.initialView, value: `${radarPreview.length} ${copy.highlights}` },
          { label: "Use", value: copy.contextUse },
        ]}
        summaryExtra={
          <div className="grid gap-2 md:grid-cols-3">
            {radarPreview.map((row) => (
              <div key={row.ticker} className="border border-line bg-panelSoft p-3 text-sm leading-6 text-muted">
                <p className="font-semibold text-ink">{row.ticker}</p>
                <p className="mt-1">{row.note}</p>
              </div>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-semibold">Ticker</th>
                <th className="py-2.5 pr-4 font-semibold">Short interest</th>
                <th className="py-2.5 pr-4 font-semibold">{copy.institutional}</th>
                <th className="py-2.5 pr-4 font-semibold">{copy.note}</th>
              </tr>
            </thead>
            <tbody>
              {data.crossSignalRadar.map((row) => (
                <tr key={row.ticker} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.ticker}</td>
                  <td className="py-3 pr-4 text-muted">{row.shortInterest}</td>
                  <td className="py-3 pr-4 text-muted">{row.institutionalPresence}</td>
                  <td className="py-3 pr-4 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableInsightCard>

      <ReportSection eyebrow="09" title={copy.finalRead}>
        <div className="grid gap-3 md:grid-cols-3">
          <EditorialNote title={copy.context} body={copy.contextBody} />
          <EditorialNote title={copy.risk} body={copy.riskBody} />
          <EditorialNote title={copy.process} body={copy.processBody} />
        </div>
      </ReportSection>
    </div>
  );
}

function Metric({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={emphasis ? "mt-1 text-lg font-semibold leading-6 text-ink" : "mt-1 font-semibold leading-6 text-ink"}>{value}</p>
    </div>
  );
}

function SignalList({ emptyLabel, title, items }: { emptyLabel: string; title: string; items: string[] }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
        {items.length ? items.map((item, index) => <p key={`${title}-${index}`} className="border-l border-brass/70 pl-3">{item}</p>) : <p>{emptyLabel}</p>}
      </div>
    </div>
  );
}

function EditorialNote({ body, footer, title }: { body: string; footer?: string; title: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-2">{body}</p>
      {footer ? <p className="mt-3 border-t border-line pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{footer}</p> : null}
    </div>
  );
}

function SeasonalityList({ cells, emptyLabel, title }: { cells: DailySeasonalityCell[]; emptyLabel: string; title: string }) {
  const visibleCells = cells.filter((cell) => cell.sampleSize >= 5).slice(0, 3);

  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm">
        {visibleCells.length ? (
          visibleCells.map((cell) => (
            <div key={`${title}-${cell.month}-${cell.day}`} className="grid grid-cols-[2rem_1fr_3.5rem_3rem] items-center gap-2 border-b border-line/70 pb-2 last:border-b-0 last:pb-0">
              <span className="font-semibold text-ink">{cell.day}</span>
              <span className="text-muted">Win rate {cell.winRate === null ? "n/d" : `${(cell.winRate * 100).toFixed(0)}%`}</span>
              <span className="text-right font-semibold text-ink">{formatPercent(cell.averageReturn)}</span>
              <span className="text-right text-xs text-muted">N {cell.sampleSize}</span>
            </div>
          ))
        ) : (
          <p className="text-muted">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
