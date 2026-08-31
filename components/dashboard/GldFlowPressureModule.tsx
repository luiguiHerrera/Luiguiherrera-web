"use client";

import { useId, useState } from "react";
import {
  DashboardModuleHeading,
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { capitalFlowTone, formatCapitalFlowDate } from "@/lib/dashboard/capital-flows-presentation";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { GldFlowPressure } from "@/lib/dashboard/types";

type Locale = "es" | "en";

function formatPercent(value: number | null, locale: Locale) {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatShares(value: number | null, locale: Locale) {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatUsd(value: number | null, locale: Locale) {
  if (value === null) return locale === "en" ? "Pending" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  const divisor = abs >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
  const suffix = divisor === 1_000_000_000 ? "B USD" : "M USD";
  return `${sign}${(value / divisor).toFixed(1)} ${suffix}`;
}

function metricValueClass(value: number | null) {
  const tone = capitalFlowTone(value);
  if (tone === "positive") return "text-[#47604f]";
  if (tone === "negative") return "text-[#7b3f3f]";
  if (tone === "unavailable") return "text-muted";
  return "text-ink";
}

function pressureLabel(data: GldFlowPressure, locale: Locale) {
  if (locale === "es") return data.pressureLabel;
  if (data.pressureState === "inflow") return "Probable net creation";
  if (data.pressureState === "outflow") return "Probable net redemption";
  if (data.pressureState === "neutral") return "Neutral pressure";
  return "Pending data";
}

function pressureInterpretation(data: GldFlowPressure, locale: Locale) {
  if (data.pressureState === "inflow") {
    return locale === "en"
      ? "Shares outstanding increased over the five-session window, a pattern consistent with probable net creation pressure."
      : "Las participaciones en circulación aumentaron en la ventana de cinco sesiones, un patrón compatible con presión de creación neta probable.";
  }
  if (data.pressureState === "outflow") {
    return locale === "en"
      ? "Shares outstanding decreased over the five-session window, a pattern consistent with probable net redemption pressure."
      : "Las participaciones en circulación disminuyeron en la ventana de cinco sesiones, un patrón compatible con presión de reembolso neto probable.";
  }
  if (data.pressureState === "neutral") {
    return locale === "en"
      ? "Changes in shares outstanding are limited or mixed, so the proxy does not indicate clear directional pressure."
      : "Los cambios en las participaciones en circulación son limitados o mixtos, por lo que el proxy no muestra una presión direccional clara.";
  }
  return locale === "en"
    ? "The source does not currently provide enough history to estimate flow pressure."
    : "La fuente no ofrece actualmente historial suficiente para estimar la presión de flujos.";
}

export function GldFlowPressureModule({ data, locale = "es" }: { data: GldFlowPressure; locale?: Locale }) {
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const isEnglish = locale === "en";
  const t = (value: string) => isEnglish ? translateDashboardText(value) : value;
  const status = data.dataStatus === "delayed"
    ? isEnglish ? "Delayed data" : "Datos con retraso"
    : data.dataStatus === "available"
      ? isEnglish ? "Data available" : "Datos disponibles"
      : isEnglish ? "Pending data" : "Dato pendiente";
  const statusTone = data.dataStatus === "available" ? "positive" : data.dataStatus === "delayed" ? "warning" : "neutral";
  const primaryMetrics = [
    { label: "1D", value: formatPercent(data.oneDayShareChangePct, locale), raw: data.oneDayShareChangePct },
    { label: "5D", value: formatPercent(data.fiveDayShareChangePct, locale), raw: data.fiveDayShareChangePct },
    { label: "20D", value: formatPercent(data.twentyDayShareChangePct, locale), raw: data.twentyDayShareChangePct },
  ];
  const secondaryMetrics = [
    [isEnglish ? "Shares 1D" : "Participaciones 1D", formatShares(data.oneDayShareChange, locale)],
    [isEnglish ? "Shares 5D" : "Participaciones 5D", formatShares(data.fiveDayShareChange, locale)],
    [isEnglish ? "Shares 20D" : "Participaciones 20D", formatShares(data.twentyDayShareChange, locale)],
    [isEnglish ? "Approx. implied amount 5D" : "Importe implícito aprox. 5D", formatUsd(data.fiveDayImpliedPressureUsd, locale)],
  ];

  return (
    <section
      className="min-w-0 border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6"
      data-gld-flow-module
      data-gld-data-status={data.dataStatus}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{isEnglish ? "Gold · GLD" : "Oro · GLD"}</p>
        <span data-gld-status><DashboardStatus label={status} tone={statusTone} /></span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <DashboardModuleHeading headingLevel="h3">{isEnglish ? "Flow-pressure proxy" : "Proxy de presión de flujos"}</DashboardModuleHeading>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">
            {isEnglish
              ? "Estimates creation or redemption pressure from changes in GLD shares outstanding."
              : "Estima la presión de creación o reembolso a partir de cambios en las participaciones en circulación de GLD."}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink" data-gld-reading>{pressureLabel(data, locale)}</p>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={isEnglish ? "Hide context" : "Ocultar contexto"}
          collapsedLabel={isEnglish ? "Show context" : "Mostrar contexto"}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 border-y border-line" data-gld-primary-metrics>
        {primaryMetrics.map((metric, index) => (
          <div key={metric.label} className={`min-w-0 px-3 py-3 sm:px-4 ${index === 0 ? "pl-0 sm:pl-0" : "border-l border-line"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{metric.label}</p>
            <p className={`mt-1.5 break-words text-sm font-semibold tabular-nums sm:text-base ${metricValueClass(metric.raw)}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-gld-context>
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{isEnglish ? "Proxy detail" : "Detalle del proxy"}</h4>
              <div className="mt-3 grid grid-cols-2 border-y border-line" data-gld-secondary-metrics>
                {secondaryMetrics.map(([label, value], index) => (
                  <div key={label} className={`min-w-0 px-3 py-3 ${index % 2 === 0 ? "pl-0" : "border-l border-line"} ${index >= 2 ? "border-t border-line" : ""}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
                    <p className="mt-1.5 break-words text-sm font-semibold tabular-nums text-ink">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid content-start gap-4 text-sm leading-6 text-muted">
              <div className="border-l border-brass/50 pl-3">
                <h4 className="font-semibold text-ink">{isEnglish ? "Prudent interpretation" : "Interpretación prudente"}</h4>
                <p className="mt-1.5">{pressureInterpretation(data, locale)}</p>
              </div>
              <div className="border-l border-petrol/20 pl-3">
                <h4 className="font-semibold text-ink">{isEnglish ? "Proxy limitation" : "Limitación del proxy"}</h4>
                <p className="mt-1.5">{t(data.reliabilityNote)}</p>
                <p className="mt-2">
                  {isEnglish
                    ? "This is an inferred signal from changes in shares outstanding, not a direct observation of investor intent."
                    : "Es una señal inferida a partir de cambios en las participaciones en circulación, no una observación directa de la intención del inversor."}
                </p>
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-3 border-t border-line pt-4 text-xs leading-5 text-muted sm:grid-cols-2 lg:grid-cols-[0.8fr_0.7fr_0.8fr_1.5fr]" data-gld-source-metadata>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{isEnglish ? "Source" : "Fuente"}</span>
              <a href={data.sourceUrl} className="mt-1 block font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{data.source}</a>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{isEnglish ? "Updated" : "Actualización"}</span>
              <span className="mt-1 block font-medium text-ink">{formatCapitalFlowDate(data.asOf, locale)}</span>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{isEnglish ? "Frequency" : "Frecuencia"}</span>
              <span className="mt-1 block font-medium text-ink">{isEnglish ? "Daily, subject to source availability" : "Diaria, según disponibilidad de la fuente"}</span>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{isEnglish ? "Methodology" : "Metodología"}</span>
              <p className="mt-1">{t(data.sourceNote)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
