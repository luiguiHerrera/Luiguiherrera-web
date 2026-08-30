"use client";

import { useId, useState } from "react";
import {
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
  dashboardModuleTitleClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { buildQuantRiskPresentation, type QuantRiskReadinessState } from "@/lib/dashboard/quant-risk-presentation";
import type { QuantRiskData } from "@/lib/dashboard/types";

type QuantRiskPanelProps = {
  data: QuantRiskData;
  locale?: "es" | "en";
};

function primaryMetricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 sm:px-4",
    index === 0 ? "pl-0 sm:pl-0" : "",
    index === 1 || index === 3 ? "border-l border-line" : "",
    index >= 2 ? "border-t border-line sm:border-t-0" : "",
    index === 2 ? "sm:border-l sm:border-line" : "",
  ].join(" ");
}

function readinessDotClass(state: QuantRiskReadinessState) {
  if (state === "available") return "bg-sage/80";
  if (state === "fallback") return "bg-brass/80";
  return "bg-muted/45";
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
          <h2 className={dashboardModuleTitleClassName}>{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{copy.description}</p>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={copy.hideContext}
          collapsedLabel={copy.showContext}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-quant-primary-metrics>
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

      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-quant-context>
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.dispersion}</h3>
              <div className="mt-3 grid grid-cols-2 border-y border-line" data-quant-dispersion>
                {presentation.dispersion.map((metric, index) => (
                  <div key={metric.label} className={`min-w-0 px-3 py-3 ${index === 0 ? "pl-0" : "border-l border-line"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{metric.label}</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{metric.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-l border-line pl-3 text-sm leading-6">
                <p className="font-semibold text-ink">{copy.modelState}</p>
                <p className="mt-1 text-muted" data-quant-model-state>{presentation.modelState}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.modelReliability}</h3>
              <div className="mt-2 divide-y divide-line/70" data-quant-readiness>
                {presentation.readiness.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-center justify-between gap-4 py-3 text-sm">
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="inline-flex min-w-0 items-center gap-2 text-right text-muted">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${readinessDotClass(item.state)}`} aria-hidden="true" />
                      <span className="break-words">{item.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 border-t border-line pt-5 lg:grid-cols-2">
            <section className="border-l border-brass/50 pl-3">
              <h3 className="text-sm font-semibold text-ink">{copy.interpretation}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">{presentation.interpretation}</p>
            </section>

            <section className="border-l border-petrol/20 pl-3">
              <h3 className="text-sm font-semibold text-ink">{copy.sourceMethodology}</h3>
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
          </div>
        </div>
      ) : null}
    </section>
  );
}
