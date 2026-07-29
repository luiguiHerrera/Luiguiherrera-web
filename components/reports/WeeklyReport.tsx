import { ReportSection } from "@/components/reports/ReportSection";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";
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

function formatPercent(value: number | null | undefined, digits = 1, locale: "es" | "en" = "es") {
  if (value === null || value === undefined) return locale === "en" ? "Pending" : "Pendiente";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatSectorPercent(value: number | null | undefined, locale: "es" | "en" = "es") {
  if (value === null || value === undefined) return locale === "en" ? "Pending" : "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined, digits = 1, locale: "es" | "en" = "es") {
  if (value === null || value === undefined) return locale === "en" ? "Pending" : "Pendiente";
  return value.toFixed(digits);
}

function formatUsdMillions(value: number | null | undefined, locale: "es" | "en" = "es") {
  if (value === null || value === undefined) return locale === "en" ? "Pending" : "Pendiente";
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

function formatWeekLabel(value: string, locale: "es" | "en") {
  return locale === "en" ? translateDashboardText(value) : value;
}

export function WeeklyReport({ data, locale = "es" }: WeeklyReportProps) {
  const copy = locale === "en"
    ? {
        report: "Weekly Report",
        liveData: "Live content",
        closeRead: "Closing read",
        generationDate: "Generated",
        dataDate: "Data through",
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
        percentileLocation: "Relative position versus its own history.",
        insufficientSample: "Not enough sample",
        seasonality: "Seasonality",
        seasonalityBody: "Only rankings with at least 5 observations are shown. The read helps locate historical patterns without overstating a single day.",
        seasonalityPathBody: "Historical cumulative path for the selected period. It does not predict the next move.",
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
        report: "Lectura automática",
        liveData: "Contenido vivo",
        closeRead: "Lectura de cierre",
        generationDate: "Generado",
        dataDate: "Datos con corte a",
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
        percentileLocation: "Ubicación relativa frente a su propia historia.",
        insufficientSample: "Sin muestra suficiente",
        seasonality: "Estacionalidad",
        seasonalityBody: "Se muestran solo rankings con muestra mínima de 5 observaciones. La lectura sirve para ubicar patrones históricos, no para sobredimensionar un día aislado.",
        seasonalityPathBody: "Trayectoria histórica acumulada del periodo seleccionado. No predice el siguiente movimiento.",
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
        contextBody: "El régimen marca el tono del periodo y ayuda a ordenar volatilidad, rotación y flujos en una lectura común.",
        riskBody: "La prioridad es cuidar el margen de error cuando varias lecturas empiezan a perder alineación.",
        processBody: "Mantener proceso significa volver al mapa: régimen, niveles, flujo y estacionalidad antes de ampliar lectura.",
        empty: "Sin lecturas destacadas en este bloque.",
        lowSample: "Muestra insuficiente para destacar días.",
      };
  const phases = locale === "en" ? englishPhaseLabels : phaseLabels;
  const months = locale === "en" ? englishMonthNames : monthNames;
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const watchItems = limitItems([
    data.volatility.termStructure?.classification ? `${locale === "en" ? "VIX curve" : "Curva VIX"}: ${t(data.volatility.termStructure.classification)}` : "",
    data.flows.btcEtfFlows?.flows.readingLabel ? `${locale === "en" ? "BTC ETF flows" : "Flujos BTC ETF"}: ${t(data.flows.btcEtfFlows.flows.readingLabel)}` : "",
    t(data.sectors.data?.metrics.interpretation),
  ].filter(Boolean));
  const radarPreview = data.crossSignalRadar.slice(0, 3);

  return (
    <div className="space-y-5 md:space-y-7">
      <section className="border border-petrol/35 bg-panel p-4 shadow-[0_10px_30px_rgba(31,35,40,0.035)] md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{copy.report}</p>
          <span className="border border-petrol/30 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase text-petrol">
            {copy.liveData}
          </span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">{copy.closeRead}</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink md:text-lg">
              {t(data.regimeSummary.interpretation)}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Metric label={copy.generationDate} value={data.generatedAt} />
            <Metric label={copy.dataDate} value={data.dataThrough} />
            <Metric label={copy.week} value={formatWeekLabel(data.weekLabel, locale)} />
            <Metric label={copy.regime} value={locale === "en" ? translateRegimeLabel(data.regimeSummary.current) : data.regimeSummary.current} />
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Score" value={`${data.regimeSummary.regimeScore}/100`} emphasis />
              <Metric label={copy.confidence} value={`${data.regimeSummary.confidence}%`} emphasis />
            </div>
          </div>
        </div>
      </section>

      <ReportSection eyebrow="01" title={copy.executive}>
        <div className="grid gap-3 lg:grid-cols-3">
          <SignalList title={copy.helped} items={limitItems(data.executiveSummary.helped.map((signal) => `${t(signal.label)}: ${t(signal.detail)}`))} emptyLabel={copy.empty} />
          <SignalList title={copy.weighed} items={limitItems(data.executiveSummary.weighed.map((signal) => `${t(signal.label)}: ${t(signal.detail)}`))} emptyLabel={copy.empty} />
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
                <span className="text-right text-lg font-semibold text-ink">{formatPercent(asset.weeklyReturn, 1, locale)}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                <p><span className="font-semibold text-ink">{structureLabel(asset.distanceToMa200, locale)}</span></p>
                <p>{copy.longAverage}: <span className="font-semibold text-ink">{formatPercent(asset.distanceToMa200, 1, locale)}</span></p>
                <p>{copy.distanceToHighs}: <span className="font-semibold text-ink">{formatPercent(asset.distanceToAth, 1, locale)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="03" title={copy.sectors}>
        <div className="grid gap-3 lg:grid-cols-[0.75fr_0.75fr_1fr]">
          <SignalList title={copy.leaders} items={limitItems(data.sectors.leaders.map((sector) => `${sector.etfTicker} · ${t(sector.sectorName)}: ${formatSectorPercent(sector.return1w, locale)}`))} emptyLabel={copy.empty} />
          <SignalList title={copy.laggards} items={limitItems(data.sectors.laggards.map((sector) => `${sector.etfTicker} · ${t(sector.sectorName)}: ${formatSectorPercent(sector.return1w, locale)}`))} emptyLabel={copy.empty} />
          <EditorialNote
            title={copy.rotationRead}
            body={t(data.sectors.data?.metrics.interpretation) || copy.pendingRotation}
            footer={`${copy.dispersion}: ${formatSectorPercent(data.sectors.data?.metrics.sectorDispersion1w, locale)}`}
          />
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection eyebrow="04" title={copy.volatility}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="VIX spot" value={formatNumber(data.volatility.vix?.spot.latestVix, 1, locale)} emphasis />
            <Metric label={copy.vixMomentum} value={vixTrendLabel(data.volatility.vix?.spot.vixTrend, locale)} />
            <Metric label={copy.vixCurve} value={t(data.volatility.termStructure?.classification) || copy.pending} />
            <Metric label="M1/M2" value={data.volatility.termStructure?.m1m2SlopePct === null || data.volatility.termStructure?.m1m2SlopePct === undefined ? copy.pending : `${data.volatility.termStructure.m1m2SlopePct.toFixed(1)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {t(data.volatility.termStructure?.interpretation) || t(data.volatility.vix?.spot.vixCompositeSubtext) || copy.pendingVol}
          </p>
        </ReportSection>

        <ReportSection eyebrow="05" title={copy.flows}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label={copy.latestBtc} value={formatUsdMillions(data.flows.btcEtfFlows?.flows.latestTotalNetFlow, locale)} emphasis />
            <Metric label="BTC ETF 5D" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.rolling5dNetFlow, locale)} />
            <Metric label="Streak" value={t(data.flows.btcEtfFlows?.flows.flowStreak.label) || copy.pending} />
            <Metric label={copy.read} value={t(data.flows.btcEtfFlows?.flows.readingLabel) || copy.pending} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {t(data.flows.btcEtfFlows?.flows.readingSubtext) || copy.pendingFlows}
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
                <p>{copy.longAverage} <span className="font-semibold text-ink">{formatPercent(asset.distanceToLongAverage, 1, locale)}</span></p>
              </div>
              <StatisticalPercentileBar
                emptyLabel={copy.insufficientSample}
                label={copy.percentileLocation}
                percentile={asset.percentile}
              />
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
            <div className="grid gap-3">
              <SeasonalityPathChart
                currentDay={data.seasonality.currentDay}
                emptyLabel={copy.lowSample}
                locale={locale}
                points={data.seasonality.path}
                subtitle={copy.seasonalityPathBody}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <SeasonalityList title={copy.bestDays} cells={data.seasonality.allYears.best} emptyLabel={copy.lowSample} locale={locale} />
                <SeasonalityList title={copy.weakDays} cells={data.seasonality.allYears.weakest} emptyLabel={copy.lowSample} locale={locale} />
                <SeasonalityList title={copy.cycleBestDays} cells={data.seasonality.cycle.best} emptyLabel={copy.lowSample} locale={locale} />
                <SeasonalityList title={copy.cycleWeakDays} cells={data.seasonality.cycle.weakest} emptyLabel={copy.lowSample} locale={locale} />
              </div>
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
                <p className="mt-1">{t(row.note)}</p>
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
                  <td className="py-3 pr-4 text-muted">{t(row.shortInterest)}</td>
                  <td className="py-3 pr-4 text-muted">{t(row.institutionalPresence)}</td>
                  <td className="py-3 pr-4 text-muted">{t(row.note)}</td>
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

function StatisticalPercentileBar({ emptyLabel, label, percentile }: { emptyLabel: string; label: string; percentile: number | null }) {
  const clamped = percentile === null ? null : Math.min(100, Math.max(0, percentile));
  const indicatorLeft = clamped === null ? "50%" : `${clamped}%`;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="leading-5 text-muted">{label}</p>
        <span className="shrink-0 font-semibold text-ink">{clamped === null ? "n/d" : `${clamped.toFixed(1)}`}</span>
      </div>
      {clamped === null ? (
        <p className="mt-3 border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-3">
          <div className="relative h-2.5 overflow-hidden rounded-full border border-line bg-paper">
            <div className="absolute inset-y-0 left-0 w-[30%] bg-risk/10" />
            <div className="absolute inset-y-0 left-[30%] w-[40%] bg-brass/10" />
            <div className="absolute inset-y-0 right-0 w-[30%] bg-petrol/10" />
            <span
              className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-petrol shadow-[0_0_0_3px_rgba(11,52,54,0.12)]"
              style={{ left: indicatorLeft }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SeasonalityPathChart({
  currentDay,
  emptyLabel,
  locale,
  points,
  subtitle,
}: {
  currentDay: number;
  emptyLabel: string;
  locale: "es" | "en";
  points: Array<{ day: number; cumulativeReturn: number }>;
  subtitle: string;
}) {
  const visiblePoints = points.filter((point) => Number.isFinite(point.day) && Number.isFinite(point.cumulativeReturn));
  const chartPoints = visiblePoints.length >= 2 ? visiblePoints : [];
  const width = 340;
  const height = 170;
  const padding = { bottom: 28, left: 42, right: 14, top: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxDay = Math.max(31, ...chartPoints.map((point) => point.day), currentDay);
  const values = chartPoints.map((point) => point.cumulativeReturn);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const yRange = maxValue - minValue || 0.01;
  const xFor = (day: number) => padding.left + (Math.min(maxDay, Math.max(0, day)) / maxDay) * innerWidth;
  const yFor = (value: number) => padding.top + (1 - (value - minValue) / yRange) * innerHeight;
  const path = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(point.day).toFixed(2)} ${yFor(point.cumulativeReturn).toFixed(2)}`).join(" ");
  const zeroY = yFor(0);
  const currentX = xFor(currentDay);
  const yTicks = [minValue, (minValue + maxValue) / 2, maxValue];
  const formatAxisPercent = (value: number) => `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{locale === "en" ? "Cumulative seasonal path" : "Trayectoria estacional acumulada"}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
      {chartPoints.length < 2 ? (
        <p className="mt-4 border border-line bg-panel px-3 py-2 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[4px] border border-line bg-white">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={locale === "en" ? "Cumulative seasonality chart" : "Gráfico de estacionalidad acumulada"} className="h-auto w-full">
            <rect width={width} height={height} fill="#fffdf8" />
            {yTicks.map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#D8D2C8" strokeOpacity="0.7" />
                  <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#69706D">{formatAxisPercent(tick)}</text>
                </g>
              );
            })}
            {[0, Math.round(maxDay / 2), maxDay].map((day) => {
              const x = xFor(day);
              return (
                <g key={day}>
                  <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="#D8D2C8" strokeOpacity="0.45" />
                  <text x={x} y={height - 9} textAnchor="middle" fontSize="10" fill="#69706D">{day}</text>
                </g>
              );
            })}
            <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke="#9A7A44" strokeOpacity="0.45" strokeDasharray="4 4" />
            <line x1={currentX} x2={currentX} y1={padding.top} y2={height - padding.bottom} stroke="#69706D" strokeOpacity="0.8" strokeWidth="1.5" />
            <path d={path} fill="none" stroke="#0B3436" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xFor(0)} cy={yFor(0)} r="3" fill="#0B3436" />
            <text x={currentX + 5} y={padding.top + 11} fontSize="10" fill="#69706D">{locale === "en" ? "Today" : "Hoy"}</text>
          </svg>
        </div>
      )}
    </div>
  );
}

function SeasonalityList({ cells, emptyLabel, locale = "es", title }: { cells: DailySeasonalityCell[]; emptyLabel: string; locale?: "es" | "en"; title: string }) {
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
              <span className="text-right font-semibold text-ink">{formatPercent(cell.averageReturn, 1, locale)}</span>
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
