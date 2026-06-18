import { BtcEtfFlowsModule } from "@/components/dashboard/BtcEtfFlowsModule";
import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { FedWatchModule } from "@/components/dashboard/FedWatchModule";
import { QuantRiskPanel } from "@/components/dashboard/QuantRiskPanel";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { SectorRotationChart } from "@/components/dashboard/SectorRotationChart";
import { VixModule } from "@/components/dashboard/VixModule";
import { VixTermStructureModule } from "@/components/dashboard/VixTermStructureModule";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
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
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <SectionHeader
          eyebrow="Lectura de régimen"
          title="Market Regime Dashboard"
          subtitle="No elegimos activos ni momentos de ejecución. Te ayudamos a ordenar volatilidad, rotación y flujos."
        />
        <DisclaimerBox>
          Esta lectura no anticipa el mercado. Resume datos públicos para entender el contexto.
        </DisclaimerBox>
      </div>

      <div className="mt-6 md:mt-8">
        <ExpandableInsightCard
          eyebrow="Régimen integrado"
          title="Lectura compuesta del mercado"
          reading={regimeSummary.interpretation}
          status={dataStatusLabels[regimeSummary.dataStatus]}
          metrics={[
            { label: "Régimen actual", value: regimeSummary.current, tone: "sage" },
            { label: "Sesgo", value: riskBiasLabels[regimeSummary.bias] },
            { label: "Score", value: `${regimeSummary.regimeScore}/100`, tone: regimeSummary.bias === "stress" || regimeSummary.bias === "cautious" ? "brass" : "sage" },
            { label: "Confianza", value: `${regimeSummary.confidence}%` },
          ]}
        >
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
        </ExpandableInsightCard>
      </div>

      <div className="mt-6 space-y-4 md:mt-8 md:space-y-6">
        {fedWatch ? <FedWatchModule data={fedWatch} /> : null}
        {sectorRotation ? <SectorRotationChart data={sectorRotation} /> : null}
        {quantRisk ? <QuantRiskPanel data={quantRisk} /> : null}
        {vix ? <VixModule data={vix} /> : null}
        {vixTermStructure ? <VixTermStructureModule data={vixTermStructure} /> : null}
        {btcEtfFlows ? <BtcEtfFlowsModule data={btcEtfFlows} /> : null}
        {remainingModules.map((module) => <DashboardModule key={module.id} {...module} />)}
      </div>

      <div className="mt-6">
        <ExpandableInsightCard
          eyebrow="Radar"
          title="Lecturas cruzadas"
          reading="Cruza short interest, presencia institucional y notas prudentes para ordenar posibles tensiones de seguimiento."
          status="Actualización manual"
          metrics={[
            { label: "Tickers revisados", value: String(crossSignalRadar.length) },
            { label: "Modo", value: "Curado" },
            { label: "Uso", value: "Investigación" },
          ]}
        >
        <p className="mt-4 border border-line bg-panelSoft px-3 py-2 text-xs leading-5 text-muted">
          Modo de actualización: manual/curado hasta activar fuentes automatizadas estables.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-medium">Ticker</th>
                <th className="py-2.5 pr-4 font-medium">Short interest reportado</th>
                <th className="py-2.5 pr-4 font-medium">Presencia institucional / 13F</th>
                <th className="py-2.5 pr-4 font-medium">Fecha short interest</th>
                <th className="py-2.5 pr-4 font-medium">Fecha 13F o última revisión</th>
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
                  <td className="py-3 pr-4">
                    <span className="border border-line bg-panelSoft px-2 py-1 text-xs font-semibold text-muted">
                      Actualización manual
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
          Fuentes conceptuales: short interest reportado, formularios 13F y reportes institucionales con retraso. La cobertura puede ser incompleta y las fechas pueden diferir entre proveedores.
        </p>
        </ExpandableInsightCard>
      </div>

      <div className="mt-6">
        <DisclaimerBox>
          Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.
        </DisclaimerBox>
      </div>
    </div>
  );
}
