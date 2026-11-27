"use client";
import { riskReferenceText } from '@/lib/dashboard/indicator-history';


import { useId, useState } from "react";
import {
  DashboardDisclosureButton,
  DashboardModuleHeading,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { buildQuantRiskPresentation } from "@/lib/dashboard/quant-risk-presentation";
import type { QuantRiskData } from "@/lib/dashboard/types";

type QuantRiskPanelProps = {
  data: QuantRiskData;
  locale?: "es" | "en";
};

function primaryMetricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 sm:px-4",
    index === 0 ? "pl-0 sm:pl-0" : "border-t border-line sm:border-l sm:border-t-0",
  ].join(" ");
}

export function QuantRiskPanel({ data, locale = "es" }: QuantRiskPanelProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const presentation = buildQuantRiskPresentation(data, locale);
  const { copy } = presentation;

  return (
    <section
      className="min-w-0 border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6"
      data-quant-risk-module
      data-quant-data-status={data.dataStatus}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{copy.eyebrow}</p>
        <span data-quant-status><DashboardStatus label={presentation.status} tone={presentation.statusTone} /></span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <DashboardModuleHeading headingLevel="h3">{copy.title}</DashboardModuleHeading>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{copy.description}</p>
        </div>

      </div>

      <div className="mt-5 grid grid-cols-1 border-y border-line sm:grid-cols-3" data-quant-primary-metrics>
        {presentation.primaryMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className={primaryMetricCellClass(index)}
            data-quant-primary-metric={metric.id}
            data-available={metric.available ? "true" : "false"}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{metric.label}</p>
            <p className={`mt-1.5 break-words text-sm font-semibold tabular-nums sm:text-base ${metric.available ? "text-ink" : "text-muted"}`}>{metric.value}</p>
            {metric.note ? <p className="mt-1 text-[11px] font-medium text-brass">{metric.note}</p> : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-6 border-t border-line pt-5 sm:grid-cols-[1fr_0.65fr]" data-quant-analysis>
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.dispersion}</h4>
              <div className="mt-3 grid grid-cols-2 border-y border-line" data-quant-dispersion>
                {presentation.dispersion.map((metric, index) => (
                  <div key={metric.label} className={`min-w-0 px-3 py-3 ${index === 0 ? "pl-0" : "border-l border-line"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{metric.label}</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>
              <div className="border-l border-line pl-3 text-sm leading-6">
                <p className="font-semibold text-ink">{copy.modelState}</p>
                <p className="mt-1 text-muted" data-quant-model-state>{presentation.modelState}</p>
              </div>
      </div>

      <div data-context-toggle>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={copy.hideContext}
          collapsedLabel={copy.showContext}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-2" data-quant-context>
            <section className="border-l border-brass/50 pl-3">
              <h4 className="text-sm font-semibold text-ink">{copy.interpretation}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted">{presentation.interpretation}</p>
            </section>

            <section className="border-l border-petrol/20 pl-3">
              <h4 className="text-sm font-semibold text-ink">{copy.sourceMethodology}</h4>
              <dl className="mt-2 grid gap-2 text-xs leading-5 text-muted">
                <div>
                  <dt className="inline font-semibold text-ink">{copy.source}: </dt>
                  <dd className="inline">
                    {data.sourceUrl ? (
                      <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-ink hover:underline">{presentation.sourceName}</a>
                    ) : presentation.sourceName}
                  </dd>
                </div>
                <div><dt className="inline font-semibold text-ink">{copy.updated}: </dt><dd className="inline">{presentation.lastUpdated}</dd></div>
                <div><dt className="inline font-semibold text-ink">{copy.frequency}: </dt><dd className="inline">{presentation.updateFrequency}</dd></div>
                <div><dt className="inline font-semibold text-ink">{copy.model}: </dt><dd className="inline">{copy.modelScope}</dd></div>
              </dl>
            </section>
            <section className="lg:col-span-2" data-quant-historical-metrics>
              <h4 className="text-sm font-semibold text-ink">{copy.historicalMeasures}</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                {presentation.historicalMetrics.map((metric) => (
                  <div key={metric.id} data-quant-detail-metric={metric.id} data-available={metric.available ? "true" : "false"}>
                    <dt className="font-medium text-ink">{metric.label}</dt>
                    <dd className="mt-1 text-muted">
                      <p className="text-sm font-semibold tabular-nums text-ink sm:text-base">{metric.value}</p>
                      <p className="mt-1 text-xs leading-5">{metric.unit} · {metric.date}</p>
                      <p className="mt-1.5 text-sm leading-6">{metric.help}</p>
                      {(['var95','absorption'].includes(metric.id)) ? (()=>{const ref=data.historicalRisk?.references?.[metric.id as 'var95'|'absorption']; const text=riskReferenceText(ref,locale,100,"pp",metric.id==="var95"?2:1);return text && ref ? <><p className="mt-2 text-xs leading-5" data-risk-history-detail>{text}</p><p className="text-xs leading-5">{ref.start}–{ref.end} · n={ref.observations}{ref.comparisonDate ? ` · Δ20: ${ref.comparisonDate}–${ref.cutoff}` : ''}</p></> : null;})() : null}
                      {metric.reason ? <p className="mt-1.5 text-xs leading-5">{metric.reason}</p> : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted">{locale==='en' ? 'Historical context reruns the same indicator with the same universe and parameters at each past cutoff. Percentiles use at least 252 prior valid readings from up to five calendar years; the current observation is excluded and ties are included. Δ20 uses the exact exchange session 20 sessions earlier. Dates and n describe indicator outputs, after model warm-up. A percentile is not a probability of a market decline. Overlapping rolling windows are not independent observations.' : 'El contexto histórico recalcula el mismo indicador, universo y parámetros en cada corte pasado. El percentil exige al menos 252 lecturas previas válidas de hasta cinco años naturales; excluye la observación actual e incluye empates. Δ20 usa la sesión bursátil exacta de 20 sesiones antes. Las fechas y n describen valores del indicador, después del calentamiento del modelo. El percentil no es una probabilidad de caída. Las ventanas móviles solapadas no son observaciones independientes.'}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{locale==='en' ? 'EWMA and GARCH: no comparable historical series of the current model outputs is retained. No percentile or 20-session change is inferred from other models or from adjusted prices with a different warm-up. If the adjusted-price backup only covers the current fixed window, historical context is also withheld for VaR95 and absorption ratio.' : 'EWMA y GARCH: no se conserva una serie histórica comparable de los resultados actuales de estos modelos. No se infiere un percentil ni una variación de 20 sesiones a partir de otros modelos o de precios ajustados con un calentamiento diferente. Si el respaldo de precios ajustados solo cubre la ventana fija actual, también se omite el contexto histórico de VaR95 y absorption ratio.'}</p>
              {presentation.historicalRetained ? <p className="mt-3 text-xs leading-5 text-muted">{copy.retained}</p> : null}
            </section>
            <section className="border-l border-brass/50 pl-3" data-quant-spy-methodology>
              <h4 className="text-sm font-semibold text-ink">{copy.spyScope}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted">{copy.spyMethod}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{presentation.spyWindow}{presentation.spyDateRange ? ` · ${presentation.spyDateRange}` : ""}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.spyLimits}</p>
            </section>
            <section className="border-l border-petrol/20 pl-3" data-quant-absorption-methodology>
              <h4 className="text-sm font-semibold text-ink">{copy.absorptionScope}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted">{copy.absorptionMethod}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{presentation.absorptionWindow}{presentation.absorptionDateRange ? ` · ${presentation.absorptionDateRange}` : ""}</p>
              <p className="mt-3 text-xs leading-5 text-muted">{copy.absorptionLimits}</p>
              <a href="https://web.mit.edu/finlunch/Fall10/PCASystemicRisk.pdf" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-muted underline-offset-4 hover:text-ink hover:underline">Kritzman, Li, Page &amp; Rigobon · 2010</a>
            </section>
            <section className="lg:col-span-2 text-xs leading-5 text-muted" data-quant-history-source>
              <p><span className="font-semibold text-ink">{copy.source}: </span>{presentation.historicalSourceUrl ? <a href={presentation.historicalSourceUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-ink hover:underline">{presentation.historicalSource}</a> : presentation.historicalSource}</p>
              {presentation.historicalAdjustment ? <p className="mt-1"><span className="font-semibold text-ink">{copy.sourceAdjustment}: </span>{presentation.historicalAdjustment}</p> : null}
            </section>
            <section className="lg:col-span-2">
              <h4 className="text-sm font-semibold text-ink">{copy.modelReliability}</h4>
              <p className="mt-1.5 text-sm leading-6 text-muted">{copy.volatilityMethod}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{copy.readingDistinctions}</p>
              <a href="https://www.msci.com/research-and-insights/paper/1996-riskmetrics-technical-document" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-muted underline-offset-4 hover:text-ink hover:underline">RiskMetrics · 1996</a>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3" data-quant-readiness>
                {presentation.readiness.map((item) => <div key={item.id}><dt className="font-medium text-ink">{item.label}</dt><dd className="mt-1 text-muted">{item.value}</dd></div>)}
              </dl>
            </section>
        </div>
      ) : null}
    </section>
  );
}

