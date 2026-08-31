"use client";

import { useId, useState } from "react";
import { DashboardDisclosureButton, DashboardStatus, dashboardModuleEyebrowClassName, dashboardModuleTitleClassName } from "@/components/dashboard/DashboardPrimitives";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";
import type { DataStatus, RegimeBias, RegimeSummary } from "@/lib/dashboard/types";

type RegimePillar = "sectorRotation" | "vix" | "btcFlows";

export type RegimeProvenanceItem = {
  pillar: RegimePillar;
  sourceName: string;
  sourceUrl?: string;
  lastUpdated: string;
  dataStatus: DataStatus;
};

type IntegratedRegimeModuleProps = {
  data: RegimeSummary;
  locale: "es" | "en";
  provenance: RegimeProvenanceItem[];
};

const biasLabels: Record<"es" | "en", Record<RegimeBias, string>> = {
  es: {
    favorable: "Favorable",
    neutral: "Neutral",
    cautious: "Cauteloso",
    stress: "Estrés",
    unavailable: "No disponible",
  },
  en: {
    favorable: "Favorable",
    neutral: "Neutral",
    cautious: "Cautious",
    stress: "Stress",
    unavailable: "Unavailable",
  },
};

function statusTone(status: DataStatus): "positive" | "warning" | "neutral" {
  if (status === "automated") return "positive";
  if (status === "delayed" || status === "live_pending") return "warning";
  return "neutral";
}

export function IntegratedRegimeModule({ data, locale, provenance }: IntegratedRegimeModuleProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const isEnglish = locale === "en";
  const t = (value: string | null | undefined) => isEnglish ? translateDashboardText(value) : value ?? "";
  const copy = isEnglish
    ? {
        eyebrow: "Integrated regime",
        title: "Composite market read",
        regime: "Regime",
        bias: "Bias",
        confidence: "Confidence",
        showContext: "Show context",
        hideContext: "Hide context",
        supports: "Supporting evidence",
        cautions: "Cautions and limitations",
        noSupports: "No dominant risk-support readings at this moment.",
        provenance: "Pillar provenance",
        methodology: "Methodology",
        notMeaning: "What it does not mean",
        updated: "Updated",
        pillarLabels: {
          sectorRotation: "Sector rotation",
          vix: "VIX",
          btcFlows: "BTC ETF flows",
        },
      }
    : {
        eyebrow: "Régimen integrado",
        title: "Lectura compuesta del mercado",
        regime: "Régimen",
        bias: "Sesgo",
        confidence: "Confianza",
        showContext: "Mostrar contexto",
        hideContext: "Ocultar contexto",
        supports: "Evidencias de soporte",
        cautions: "Cautelas y limitaciones",
        noSupports: "Sin lecturas dominantes a favor del riesgo en este momento.",
        provenance: "Procedencia por pilar",
        methodology: "Metodología",
        notMeaning: "Qué NO significa",
        updated: "Actualización",
        pillarLabels: {
          sectorRotation: "Rotación sectorial",
          vix: "VIX",
          btcFlows: "Flujos de ETFs de BTC",
        },
      };
  const regimeLabel = isEnglish ? translateRegimeLabel(data.current) : data.current;
  const metrics = [
    { label: copy.regime, value: regimeLabel, badge: true },
    { label: copy.bias, value: biasLabels[locale][data.bias] },
    { label: "Score", value: data.regimeScore === null ? (isEnglish ? "Unavailable" : "No disponible") : `${data.regimeScore}/100` },
    { label: copy.confidence, value: data.confidence === null ? (isEnglish ? "Unavailable" : "No disponible") : `${data.confidence}%` },
  ];

  return (
    <section className="border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6" data-regime-module>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{copy.eyebrow}</p>
        <DashboardStatus label={t(dataStatusLabels[data.dataStatus])} tone={statusTone(data.dataStatus)} />
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className={dashboardModuleTitleClassName}>{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{t(data.interpretation)}</p>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          collapsedLabel={copy.showContext}
          expandedLabel={copy.hideContext}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-regime-metrics>
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`min-w-0 px-3 py-3 sm:px-4 ${index === 0 ? "pl-0 sm:pl-0" : ""} ${index === 1 || index === 3 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line sm:border-t-0" : ""} ${index === 2 ? "sm:border-l sm:border-line" : ""}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{metric.label}</p>
            {metric.badge ? (
              <div className="mt-1.5" data-regime-badge><RegimeBadge label={metric.value} /></div>
            ) : (
              <p className="mt-1.5 break-words text-sm font-semibold tabular-nums text-ink sm:text-base">{metric.value}</p>
            )}
          </div>
        ))}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-4 border-t border-line pt-4" data-regime-context>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="bg-panelSoft/35 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">{copy.supports}</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
                {data.riskSupportSignals.length > 0 ? data.riskSupportSignals.map((signal, index) => (
                  <li key={`support-${signal.label}-${index}`} className="border-l border-sage/70 pl-3">
                    <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                  </li>
                )) : (
                  <li className="border-l border-line pl-3">{copy.noSupports}</li>
                )}
              </ul>
            </section>
            <section className="bg-panelSoft/35 px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">{copy.cautions}</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">
                {data.cautionSignals.map((signal, index) => (
                  <li key={`caution-${signal.label}-${index}`} className="border-l border-brass/70 pl-3">
                    <span className="font-semibold text-ink">{t(signal.label)}: </span>{t(signal.detail)}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-4 border-t border-line pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.provenance}</h3>
            <div className="mt-2 divide-y divide-line/70">
              {provenance.map((item) => (
                <div key={item.pillar} className="grid gap-2 py-3 text-sm leading-6 md:grid-cols-[9rem_minmax(0,1fr)_minmax(12rem,0.65fr)_auto] md:items-center">
                  <span className="font-semibold text-ink">{copy.pillarLabels[item.pillar]}</span>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} className="min-w-0 break-words text-muted underline-offset-4 hover:text-ink hover:underline" target="_blank" rel="noreferrer">
                      {t(item.sourceName)}
                    </a>
                  ) : (
                    <span className="min-w-0 break-words text-muted">{t(item.sourceName)}</span>
                  )}
                  <span className="text-muted"><span className="font-semibold text-ink">{copy.updated}: </span>{t(item.lastUpdated)}</span>
                  <DashboardStatus label={t(dataStatusLabels[item.dataStatus])} tone={statusTone(item.dataStatus)} />
                </div>
              ))}
            </div>
          </section>

          <div className="mt-4 grid gap-4 border-t border-line pt-4 text-sm leading-6 text-muted lg:grid-cols-2">
            <section className="border-l border-petrol/20 pl-3">
              <h3 className="font-semibold text-ink">{copy.methodology}</h3>
              <p className="mt-1.5">{t(data.dataQualityNote)}</p>
              <p className="mt-1.5">{t(data.reliabilityNote)}</p>
            </section>
            <section className="border-l border-brass/50 pl-3">
              <h3 className="font-semibold text-ink">{copy.notMeaning}</h3>
              <p className="mt-1.5">{t(data.whatItDoesNotMean)}</p>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
