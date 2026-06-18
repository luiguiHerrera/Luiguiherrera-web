import { ReportSection } from "@/components/reports/ReportSection";
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

export function WeeklyReport({ data }: WeeklyReportProps) {
  return (
    <div className="space-y-6">
      <section className="border border-petrol/40 bg-panel p-5 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Informe semanal</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-ink md:text-5xl">Informe de cierre</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted">
              Página reproducible con datos del dashboard y del laboratorio estadístico. Enfocada en contexto, régimen, riesgo y niveles relevantes.
            </p>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-1">
            <Metric label="Fecha" value={data.generatedAt} />
            <Metric label="Semana" value={data.weekLabel} />
            <Metric label="Régimen" value={data.regimeSummary.current} />
          </div>
        </div>
      </section>

      <ReportSection eyebrow="01" title="Resumen ejecutivo">
        <div className="grid gap-4 lg:grid-cols-3">
          <SignalList title="Qué impulsó" items={data.executiveSummary.helped.map((signal) => `${signal.label}: ${signal.detail}`)} />
          <SignalList title="Qué frenó" items={data.executiveSummary.weighed.map((signal) => `${signal.label}: ${signal.detail}`)} />
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-sm font-semibold text-ink">Lectura de riesgo</p>
            <p className="mt-3 text-sm leading-6 text-muted">{data.executiveSummary.riskReading}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Score" value={`${data.regimeSummary.regimeScore}/100`} />
              <Metric label="Confianza" value={`${data.regimeSummary.confidence}%`} />
            </div>
          </div>
        </div>
      </ReportSection>

      <ReportSection eyebrow="02" title="Los 4 ETFs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-semibold">ETF</th>
                <th className="py-2.5 pr-4 font-semibold">Rendimiento semanal</th>
                <th className="py-2.5 pr-4 font-semibold">Distancia a ATH</th>
                <th className="py-2.5 pr-4 font-semibold">Dist. MA20</th>
                <th className="py-2.5 pr-4 font-semibold">Dist. MA50</th>
                <th className="py-2.5 pr-4 font-semibold">Dist. MA200</th>
              </tr>
            </thead>
            <tbody>
              {data.coreEtfs.map((asset) => (
                <tr key={asset.ticker} className="border-b border-line/70">
                  <td className="py-3 pr-4"><span className="font-semibold text-ink">{asset.ticker}</span><span className="ml-2 text-xs text-muted">{asset.name}</span></td>
                  <td className="py-3 pr-4 text-muted">{formatPercent(asset.weeklyReturn)}</td>
                  <td className="py-3 pr-4 text-muted">{formatPercent(asset.distanceToAth)}</td>
                  <td className="py-3 pr-4 text-muted">{formatPercent(asset.distanceToMa20)}</td>
                  <td className="py-3 pr-4 text-muted">{formatPercent(asset.distanceToMa50)}</td>
                  <td className="py-3 pr-4 text-muted">{formatPercent(asset.distanceToMa200)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection eyebrow="03" title="Sectores">
        <div className="grid gap-4 lg:grid-cols-3">
          <SignalList title="Líderes 1W" items={data.sectors.leaders.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`)} />
          <SignalList title="Débiles 1W" items={data.sectors.laggards.map((sector) => `${sector.etfTicker} · ${sector.sectorName}: ${formatSectorPercent(sector.return1w)}`)} />
          <div className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-ink">Rotación sectorial</p>
            <p className="mt-2">{data.sectors.data?.metrics.interpretation ?? "Rotación sectorial pendiente."}</p>
            <p className="mt-3">Dispersión 1W: <span className="font-semibold text-ink">{formatSectorPercent(data.sectors.data?.metrics.sectorDispersion1w)}</span></p>
          </div>
        </div>
      </ReportSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportSection eyebrow="04" title="Volatilidad">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <Metric label="VIX spot" value={formatNumber(data.volatility.vix?.spot.latestVix)} />
            <Metric label="Lectura VIX" value={data.volatility.vix?.spot.vixCompositeLabel ?? "Pendiente"} />
            <Metric label="Curva" value={data.volatility.termStructure?.classification ?? "Pendiente"} />
            <Metric label="M1/M2" value={data.volatility.termStructure?.m1m2SlopePct === null || data.volatility.termStructure?.m1m2SlopePct === undefined ? "Pendiente" : `${data.volatility.termStructure.m1m2SlopePct.toFixed(1)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">{data.volatility.termStructure?.interpretation ?? data.volatility.vix?.spot.vixCompositeSubtext ?? "Volatilidad pendiente de actualización."}</p>
        </ReportSection>

        <ReportSection eyebrow="05" title="Flujos">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <Metric label="BTC ETF último día" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.latestTotalNetFlow)} />
            <Metric label="BTC ETF 5D" value={formatUsdMillions(data.flows.btcEtfFlows?.flows.rolling5dNetFlow)} />
            <Metric label="Lectura BTC ETF" value={data.flows.btcEtfFlows?.flows.readingLabel ?? "Pendiente"} />
            <Metric label="Flujos ETF generales" value={data.flows.generalEtfFlowsStatus} />
          </div>
        </ReportSection>
      </div>

      <ReportSection eyebrow="06" title="Niveles estadísticos">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.statisticalLevels.map((asset) => (
            <div key={asset.ticker} className="border border-line bg-panelSoft p-4">
              <p className="font-semibold text-ink">{asset.ticker}</p>
              <p className="mt-1 text-xs text-muted">{asset.name}</p>
              <div className="mt-3 grid gap-2 text-sm text-muted">
                <p>z-score <span className="font-semibold text-ink">{asset.zScore === null ? "n/d" : asset.zScore.toFixed(2)}</span></p>
                <p>Percentil <span className="font-semibold text-ink">{asset.percentile === null ? "n/d" : asset.percentile.toFixed(1)}</span></p>
                <p>Media larga <span className="font-semibold text-ink">{formatPercent(asset.distanceToLongAverage)}</span></p>
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection eyebrow="07" title="Estacionalidad">
        {data.seasonality ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SeasonalityList title={`${monthNames[data.seasonality.month - 1]} · mejores días históricos`} cells={data.seasonality.allYears.best} />
            <SeasonalityList title={`${phaseLabels[data.seasonality.phase]} · mejores días`} cells={data.seasonality.cycle.best} />
            <SeasonalityList title={`${monthNames[data.seasonality.month - 1]} · días débiles históricos`} cells={data.seasonality.allYears.weakest} />
            <SeasonalityList title={`${phaseLabels[data.seasonality.phase]} · días débiles`} cells={data.seasonality.cycle.weakest} />
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">Estacionalidad pendiente hasta regenerar datos.</p>
        )}
      </ReportSection>

      <ReportSection eyebrow="08" title="Radar de lecturas cruzadas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
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
      </ReportSection>

      <ReportSection eyebrow="09" title="Cierre y roadmap">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-ink">Lectura final educativa</p>
            <p className="mt-2">
              El informe organiza régimen, volatilidad, rotación, flujos y estadística descriptiva. Sirve como contexto semanal para investigación y control de riesgo.
            </p>
            <p className="mt-2">
              Los datos históricos describen comportamiento pasado y se leen junto con el precio actual, liquidez, horizonte y tolerancia al riesgo.
            </p>
          </div>
          <SignalList title="Pendiente por fuente clara" items={data.roadmapItems} />
        </div>
      </ReportSection>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
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

function SeasonalityList({ cells, title }: { cells: DailySeasonalityCell[]; title: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 text-sm">
        {cells.map((cell) => (
          <div key={`${title}-${cell.month}-${cell.day}`} className="grid grid-cols-[2.5rem_1fr_3.5rem_3rem] items-center gap-3 border-b border-line/70 pb-2 last:border-b-0 last:pb-0">
            <span className="font-semibold text-ink">{cell.day}</span>
            <span className="text-muted">Win rate {cell.winRate === null ? "n/d" : `${(cell.winRate * 100).toFixed(0)}%`}</span>
            <span className="text-right font-semibold text-ink">{formatPercent(cell.averageReturn)}</span>
            <span className="text-right text-xs text-muted">N {cell.sampleSize}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
