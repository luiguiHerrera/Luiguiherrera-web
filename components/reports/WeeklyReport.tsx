import { ReportSection } from "@/components/reports/ReportSection";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import type { DailySeasonalityCell, PresidentialCyclePhase } from "@/lib/statistical-levels/types";

type WeeklyReportProps = {
  data: WeeklyReportData;
};

const phaseLabels: Record<PresidentialCyclePhase, string> = {
  all: "Todos los años",
  post_election: "Año 1 · Post-elección",
  midterm: "Año 2 · Midterm",
  pre_election: "Año 3 · Pre-elección",
  election: "Año 4 · Elección",
};

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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

function vixTrendLabel(value: string | undefined) {
  if (value === "rising_fast") return "Subiendo rápido";
  if (value === "rising") return "Subiendo";
  if (value === "falling") return "Bajando";
  return "Estable";
}

function structureLabel(distanceToMa200: number | null | undefined) {
  if (distanceToMa200 === null || distanceToMa200 === undefined) return "Estructura pendiente";
  if (distanceToMa200 > 0.05) return "Sobre media larga";
  if (distanceToMa200 > 0) return "Apoyo cercano";
  if (distanceToMa200 > -0.05) return "Debajo, sin ruptura amplia";
  return "Debilidad frente a media larga";
}

function limitItems(items: string[]) {
  return items.slice(0, 3);
}

export function WeeklyReport({ data }: WeeklyReportProps) {
  const watchItems = limitItems([
    data.volatility.termStructure?.classification ? `Curva VIX: ${data.volatility.termStructure.classification}` : "",
    data.flows.btcEtfFlows?.flows.readingLabel ? `Flujos BTC ETF: ${data.flows.btcEtfFlows.flows.readingLabel}` : "",
    data.sectors.data?.metrics.interpretation ?? "",
  ].filter(Boolean));
  const radarPreview = data.crossSignalRadar.slice(0, 3);

  return (
    <div className="space-y-5 md:space-y-7">
      <section className="border border-petrol/35 bg-panel p-4 shadow-[0_10px_30px_rgba(31,35,40,0.035)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Informe semanal</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">Lectura de cierre</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink md:text-lg">
              {data.regimeSummary.interpretation}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Metric label="Fecha" value={data.generatedAt} />
            <Metric label="Semana" value={data.weekLabel} />
            <Metric label="Régimen" value={data.regimeSummary.current} />
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Score" value={`${data.regimeSummary.regimeScore}/100`} emphasis />
              <Metric label="Confianza" value={`${data.regimeSummary.confidence}%`} emphasis />
            </div>
          </div>
        </div>
      </section>

      <ReportSection eyebrow="01" title="Resumen ejecutivo">
        <div className="grid gap-3 lg:grid-cols-3">
          <SignalList title="Qué impulsó" items={limitItems(data.executiveSummary.helped.map((signal) => `${signal.label}: ${signal.detail}`))} />
          <SignalList title="Qué frenó" items={limitItems(data.executiveSummary.weighed.map((signal) => `${signal.label}: ${signal.detail}`))} />
          <SignalList title="Qué vigilar" items={watchItems} />
        </div>
      </ReportSection>

      <ReportSection eyebrow="02" title="Los 4 ETFs">
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
                <p><span className="font-semibold text-ink">{structureLabel(asset.distanceToMa200)}</span></p>
                <p>Media larga: <span className="font-semibold text-ink">{formatPercent(asset.distanceToMa200)}</span></p>
                <p>Distancia a máximos: <span className="font-semibold text-ink">{formatPercent(asset.distanceToAth)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="03" title="Sectores">
        <div className="grid gap-3 lg:grid-cols-[0.75fr_0.75fr_1fr]">
          <SignalList title="Líderes" items={limitItems(data.sectors.leaders.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`))} />
          <SignalList title="Rezagados" items={limitItems(data.sectors.laggards.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`))} />
          <EditorialNote
            title="Lectura de rotación"
            body={data.sectors.data?.metrics.interpretation ?? "Rotación sectorial pendiente."}
            footer={`Dispersión 1W: ${formatSectorPercent(data.sectors.data?.metrics.sectorDispersion1w)}`}
          />
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection eyebrow="04" title="Volatilidad">
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="VIX spot" value={formatNumber(data.volatility.vix?.spot.latestVix)} emphasis />
            <Metric label="Momentum VIX" value={vixTrendLabel(data.volatility.vix?.spot.vixTrend)} />
            <Metric label="Curva VIX" value={data.volatility.termStructure?.classification ?? "Pendiente"} />
            <Metric label="M1/M2" value={data.volatility.termStructure?.m1m2SlopePct === null || data.volatility.termStructure?.m1m2SlopePct === undefined ? "Pendiente" : `${data.volatility.termStructure.m1m2SlopePct.toFixed(1)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {data.volatility.termStructure?.interpretation ?? data.volatility.vix?.spot.vixCompositeSubtext ?? "Volatilidad pendiente de actualización."}
          </p>
        </ReportSection>

        <ReportSection eyebrow="05" title="Flujos">
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="BTC ETF último día" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.latestTotalNetFlow)} emphasis />
            <Metric label="BTC ETF 5D" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.rolling5dNetFlow)} />
            <Metric label="Racha" value={data.flows.btcEtfFlows?.flows.flowStreak.label ?? "Pendiente"} />
            <Metric label="Lectura" value={data.flows.btcEtfFlows?.flows.readingLabel ?? "Pendiente"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {data.flows.btcEtfFlows?.flows.readingSubtext ?? "Flujos BTC ETF pendientes de actualización."}
          </p>
        </ReportSection>
      </div>

      <ReportSection eyebrow="06" title="Niveles estadísticos">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.statisticalLevels.map((asset) => (
            <article key={asset.ticker} className="border border-line bg-panelSoft p-4">
              <p className="text-lg font-semibold text-ink">{asset.ticker}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
              <div className="mt-4 grid gap-2 text-sm text-muted">
                <p>Percentil <span className="font-semibold text-ink">{asset.percentile === null ? "n/d" : asset.percentile.toFixed(1)}</span></p>
                <p>Z-score <span className="font-semibold text-ink">{asset.zScore === null ? "n/d" : asset.zScore.toFixed(2)}</span></p>
                <p>Media larga <span className="font-semibold text-ink">{formatPercent(asset.distanceToLongAverage)}</span></p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="07" title="Estacionalidad">
        {data.seasonality ? (
          <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
            <EditorialNote
              title={`${monthNames[data.seasonality.month - 1]} · ${phaseLabels[data.seasonality.phase]}`}
              body="Se muestran solo rankings con muestra mínima de 5 observaciones. La lectura sirve para ubicar patrones históricos, no para sobredimensionar un día aislado."
              footer={data.seasonality.cycle.best.length < 3 || data.seasonality.cycle.weakest.length < 3 ? "Muestra acotada en ciclo presidencial: ampliar lectura con prudencia." : "Muestra suficiente para una lectura descriptiva compacta."}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SeasonalityList title="Mejores días históricos" cells={data.seasonality.allYears.best} />
              <SeasonalityList title="Días débiles históricos" cells={data.seasonality.allYears.weakest} />
              <SeasonalityList title="Mejores días del ciclo" cells={data.seasonality.cycle.best} />
              <SeasonalityList title="Días débiles del ciclo" cells={data.seasonality.cycle.weakest} />
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">Estacionalidad pendiente hasta regenerar datos.</p>
        )}
      </ReportSection>

      <ExpandableInsightCard
        eyebrow="08 · Radar"
        title="Lecturas cruzadas"
        reading="Resumen curado de tensiones que conviene mantener en pantalla sin convertir el informe en una tabla larga."
        status="Actualización manual"
        metrics={[
          { label: "Tickers revisados", value: String(data.crossSignalRadar.length) },
          { label: "Vista inicial", value: `${radarPreview.length} destacados` },
          { label: "Uso", value: "Contexto" },
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
                <th className="py-2.5 pr-4 font-semibold">Institucional</th>
                <th className="py-2.5 pr-4 font-semibold">Nota</th>
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

      <ReportSection eyebrow="09" title="Lectura final">
        <div className="grid gap-3 md:grid-cols-3">
          <EditorialNote title="Contexto" body="El régimen marca el tono de la semana y ayuda a ordenar volatilidad, rotación y flujos en una lectura común." />
          <EditorialNote title="Riesgo" body="La prioridad es cuidar el margen de error cuando varias lecturas empiezan a perder alineación." />
          <EditorialNote title="Proceso" body="Mantener proceso significa volver al mapa: régimen, niveles, flujo y estacionalidad antes de ampliar lectura." />
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

function SignalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
        {items.length ? items.map((item, index) => <p key={`${title}-${index}`} className="border-l border-brass/70 pl-3">{item}</p>) : <p>Sin lecturas destacadas en este bloque.</p>}
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

function SeasonalityList({ cells, title }: { cells: DailySeasonalityCell[]; title: string }) {
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
          <p className="text-muted">Muestra insuficiente para destacar días.</p>
        )}
      </div>
    </div>
  );
}
