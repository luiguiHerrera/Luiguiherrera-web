"use client";

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
            <section className="lg:col-span-2">
              <h4 className="text-sm font-semibold text-ink">{copy.modelReliability}</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3" data-quant-readiness>
                {presentation.readiness.map((item) => <div key={item.id}><dt className="font-medium text-ink">{item.label}</dt><dd className="mt-1 text-muted">{item.value}</dd></div>)}
              </dl>
            </section>
        </div>
      ) : null}
    </section>
  );
}
