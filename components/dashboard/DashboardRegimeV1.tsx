import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { QuantAnnotation } from "@/components/ui/QuantAnnotation";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";
import type { RegimeBias, RegimeSummary } from "@/lib/dashboard/types";

const riskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cauteloso",
  stress: "Estrés",
  unavailable: "No disponible",
};
const englishRiskBiasLabels: Record<RegimeBias, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  cautious: "Cautious",
  stress: "Stress",
  unavailable: "Unavailable",
};

/** Private V1 comparison surface; unavailable/null formatting follows the remote V1 contract. */
export function DashboardRegimeV1({ regimeSummary, locale }: { regimeSummary: RegimeSummary; locale: "es" | "en" }) {
  const biasLabels = locale === "en" ? englishRiskBiasLabels : riskBiasLabels;
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const unavailable = locale === "en" ? "Unavailable" : "No disponible";
  const scoreValue = regimeSummary.regimeScore === null ? unavailable : `${regimeSummary.regimeScore}/100`;
  const confidenceValue = regimeSummary.confidence === null ? unavailable : `${regimeSummary.confidence}%`;
  const copy = locale === "en"
    ? {
        eyebrow: "Regime read",
        title: "Market Regime Dashboard",
        subtitle: "This dashboard organizes volatility, sector rotation and flows into a compact market context view.",
        disclaimer: "Educational market-context reading. It summarizes public data and does not provide execution instructions.",
        integrated: "Integrated regime",
        composite: "Composite market read",
        currentRegime: "Current regime",
        bias: "Bias",
        confidence: "Confidence",
        status: "Status",
        updated: "Updated",
        activeSources: "Active sources",
        supports: "Risk supports",
        cautions: "Caution readings",
        noSupports: "No dominant risk-support readings at this moment.",
        finalDisclaimer: "This panel organizes public market readings. It does not forecast prices, recommend trades or replace personalized analysis.",
        capitalFlows: "Capital flows",
        capitalFlowsTitle: "Flow map",
        capitalFlowsSubtitle: "A comparative view of inflows, outflows, and flow pressure across different assets.",
      }
    : {
        eyebrow: "Lectura de régimen",
        title: "Dashboard de régimen de mercado",
        subtitle: "Ordena volatilidad, rotación sectorial, amplitud, VIX, BTC ETF flows y presión de flujos en GLD en una lectura común.",
        disclaimer: "Esta lectura no anticipa el mercado. Resume datos de fuentes abiertas para entender el contexto.",
        integrated: "Régimen integrado",
        composite: "Lectura compuesta del mercado",
        currentRegime: "Régimen actual",
        bias: "Sesgo",
        confidence: "Confianza",
        status: "Estado",
        updated: "Actualización",
        activeSources: "Fuentes activas",
        supports: "Soportes de riesgo",
        cautions: "Lecturas de cautela",
        noSupports: "Sin lecturas dominantes a favor del riesgo en este momento.",
        finalDisclaimer: "Este panel organiza lecturas públicas de mercado. No anticipa precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.",
        capitalFlows: "Flujos de capital",
        capitalFlowsTitle: "Mapa de flujos",
        capitalFlowsSubtitle: "Lectura comparada de entradas, salidas y presión de flujos en distintos activos.",
      };

  return (
    <>
      <InstitutionalHero
        chips={locale === "en" ? ["Regime", "Score", "Confidence", "Drivers"] : ["Régimen", "Score", "Confianza", "Drivers"]}
        description={copy.subtitle}
        eyebrow={copy.eyebrow}
        note={copy.disclaimer}
        title={copy.title}
        variant="executive"
      />

      <div className="relative mt-6 md:mt-8">
        <QuantAnnotation variant="underline" className="absolute left-4 top-8 z-10 h-2.5 w-24 text-brass/35 md:left-5 md:top-9" />
        <ExpandableInsightCard
          className="executive-panel technical-surface border-petrol/40 shadow-[0_24px_64px_rgba(11,52,54,0.13)]"
          eyebrow={copy.integrated}
          title={copy.composite}
          reading={t(regimeSummary.interpretation)}
          status={t(dataStatusLabels[regimeSummary.dataStatus])}
          metrics={[
            { label: copy.currentRegime, value: locale === "en" ? translateRegimeLabel(regimeSummary.current) : regimeSummary.current, tone: "sage" },
            { label: copy.bias, value: biasLabels[regimeSummary.bias] },
            { label: "Score", value: scoreValue, tone: regimeSummary.bias === "stress" || regimeSummary.bias === "cautious" ? "brass" : "sage" },
            { label: copy.confidence, value: confidenceValue },
          ]}
        >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="border border-sage/30 bg-[#eef5f1] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{copy.currentRegime}</p>
            <div className="mt-3"><RegimeBadge label={locale === "en" ? translateRegimeLabel(regimeSummary.current) : regimeSummary.current} /></div>
          </div>
          <MetricCard label={copy.bias} value={biasLabels[regimeSummary.bias]} emphasis />
          <MetricCard label="Score" value={scoreValue} emphasis />
          <MetricCard label={copy.confidence} value={confidenceValue} emphasis />
        </div>

        <div className="mt-3 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted lg:grid-cols-[1.35fr_0.7fr_0.7fr_0.95fr]">
          <p>{t(regimeSummary.interpretation)}</p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.status}</span>
            <span className="font-semibold text-ink">{t(dataStatusLabels[regimeSummary.dataStatus])}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.updated}</span>
            <span className="font-semibold text-ink">{t(regimeSummary.lastUpdated)}</span>
          </p>
          <p>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.activeSources}</span>
            <span className="font-semibold text-ink">{t(regimeSummary.sourceName)}</span>
          </p>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="border border-brass/30 bg-[#f8f2e7] p-4">
            <h3 className="text-sm font-semibold text-ink">{copy.supports}</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.riskSupportSignals.length > 0 ? (
                regimeSummary.riskSupportSignals.map((signal, index) => (
                  <li key={`support-${signal.label}-${index}`} className="border-l border-sage/70 pl-3">
                    <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                  </li>
                ))
              ) : (
                <li className="border-l border-line pl-3">
                  {copy.noSupports}
                </li>
              )}
            </ul>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <h3 className="text-sm font-semibold text-ink">{copy.cautions}</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              {regimeSummary.cautionSignals.map((signal, index) => (
                <li key={`caution-${signal.label}-${index}`} className="border-l border-brass/70 pl-3">
                  <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
          <p>{t(regimeSummary.dataQualityNote)}</p>
          <p className="mt-2">{t(regimeSummary.reliabilityNote)}</p>
          <p className="mt-2">{t(regimeSummary.whatItDoesNotMean)}</p>
        </div>
        </ExpandableInsightCard>
      </div>

    </>
  );
}
