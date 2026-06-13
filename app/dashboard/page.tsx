import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { FedWatchModule } from "@/components/dashboard/FedWatchModule";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { SectorRotationChart } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { dataStatusLabels } from "@/lib/dashboard/status";
import type { RegimeBias } from "@/lib/dashboard/types";

export const revalidate = 86400;

const riskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cauteloso",
  stress: "Estrés",
};

export default async function DashboardPage() {
  const { btcEtfFlows, crossSignalRadar, dashboardModules, fedWatch, quantRisk, regimeSummary, sectorRotation, vix, vixTermStructure } = await getDashboardData();
  const remainingModules = dashboardModules.filter((module) => module.id !== "rates" && module.id !== "sectors" && module.id !== "vix" && module.id !== "btc-flows");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <SectionHeader
          eyebrow="Lectura de régimen"
          title="Market Regime Dashboard"
          subtitle="No elige activos ni momentos de ejecución. Te ayuda a ordenar volatilidad, rotación y flujos."
        />
        <DisclaimerBox>
          Esta lectura no anticipa el mercado. Resume datos públicos para entender el contexto.
        </DisclaimerBox>
      </div>

      <section className="mt-8 border border-petrol/40 bg-panel p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Régimen actual</p>
            <div className="mt-3"><RegimeBadge label={regimeSummary.current} /></div>
          </div>
          <MetricCard label="Sesgo" value={riskBiasLabels[regimeSummary.bias]} emphasis />
          <MetricCard label="Score" value={`${regimeSummary.regimeScore}/100`} emphasis />
          <MetricCard label="Confianza" value={`${regimeSummary.confidence}%`} emphasis />
        </div>

        <div className="mt-3 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted lg:grid-cols-[1.35fr_0.7fr_0.7fr_0.95fr]">
          <p>{regimeSummary.interpretation}</p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estado</span>
            <span className="font-semibold text-ink">{dataStatusLabels[regimeSummary.dataStatus]}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
            <span className="font-semibold text-ink">{regimeSummary.lastUpdated}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuentes activas</span>
            <span className="font-semibold text-ink">{regimeSummary.sourceName}</span>
          </p>
        </div>

        <p className="mt-3 border border-line bg-panelSoft px-3 py-2 text-xs leading-5 text-muted">
          FedWatch permanece pendiente y no aporta peso al score mientras su estado sea live_pending.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="border border-line bg-panelSoft p-4">
            <h3 className="text-sm font-semibold text-ink">Soportes de riesgo</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.riskSupportSignals.length > 0 ? (
                regimeSummary.riskSupportSignals.map((signal, index) => (
                  <li key={`support-${signal.label}-${index}`} className="border-l border-sage/70 pl-3">
                    <span className="font-semibold text-ink">{signal.label}: </span>{signal.detail}
                  </li>
                ))
              ) : (
                <li className="border-l border-line pl-3">
                  Sin lecturas dominantes a favor del riesgo en este momento.
                </li>
              )}
            </ul>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <h3 className="text-sm font-semibold text-ink">Lecturas de cautela</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.cautionSignals.map((signal, index) => (
                <li key={`caution-${signal.label}-${index}`} className="border-l border-brass/70 pl-3">
                  <span className="font-semibold text-ink">{signal.label}: </span>{signal.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          <p>{regimeSummary.dataQualityNote}</p>
          <p className="mt-2">{regimeSummary.reliabilityNote}</p>
          <p className="mt-2">{regimeSummary.whatItDoesNotMean}</p>
        </div>
      </section>

      <div className="mt-8 space-y-6">
        {fedWatch ? <FedWatchModule data={fedWatch} /> : null}
        {sectorRotation ? <SectorRotationChart data={sectorRotation} /> : null}
        {quantRisk ? <QuantRiskPanel data={quantRisk} /> : null}
        {vix ? <VixModule data={vix} /> : null}
        {vixTermStructure ? <VixTermStructureModule data={vixTermStructure} /> : null}
        {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
        {remainingModules.map((module) => <DashboardModule key={module.id} {...module} />)}
      </div>

      <section className="mt-6 border border-line bg-panel p-6">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-ink">Radar de lecturas cruzadas</h2>
          <p className="mt-3 leading-7 text-muted">
            Esta tabla no muestra ideas accionables. Muestra casos donde hay lecturas públicas en tensión: short interest reportado como escepticismo o presión bajista, y presencia en 13F/superinvestors como interés institucional reportado con retraso. Son puntos de partida para investigación, no instrucciones de ejecución.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-medium">Ticker</th>
                <th className="py-2.5 pr-4 font-medium">Short interest</th>
                <th className="py-2.5 pr-4 font-medium">Presencia institucional</th>
                <th className="py-2.5 pr-4 font-medium">Fecha short interest</th>
                <th className="py-2.5 pr-4 font-medium">Fecha 13F</th>
                <th className="py-2.5 pr-4 font-medium">Estado</th>
                <th className="py-2.5 pr-4 font-medium">Nota prudente</th>
              </tr>
            </thead>
            <tbody>
              {crossSignalRadar.map((row) => (
                <tr key={row.ticker} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">{row.ticker}</td>
                  <td className="py-3 pr-4 text-muted">{row.shortInterest}</td>
                  <td className="py-3 pr-4 text-muted">{row.institutionalPresence}</td>
                  <td className="py-3 pr-4 text-muted">{row.shortInterestDate}</td>
                  <td className="py-3 pr-4 text-muted">{row.form13FDate}</td>
                  <td className="py-3 pr-4 text-muted">{dataStatusLabels[row.dataStatus]}</td>
                  <td className="py-3 pr-4 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
          Fuente conceptual: short interest reportado y formularios 13F. Los datos tienen retrasos, cobertura incompleta y metodología variable.
        </p>
      </section>

      <div className="mt-6">
        <DisclaimerBox>
          Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.
        </DisclaimerBox>
      </div>
    </div>
  );
}
