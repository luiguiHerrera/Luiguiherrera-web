"use client";

import { useId, useState } from "react";
import {
  DashboardModuleHeading,
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { capitalFlowTone, formatCapitalFlowDate } from "@/lib/dashboard/capital-flows-presentation";
import { FlowWindowMetrics } from "@/components/dashboard/FlowWindowMetrics";
import { DetailGrid } from "@/components/dashboard/DetailGrid";
import { GldHistoryPanel, GldSessionsTable } from "@/components/dashboard/GldHistoryPanel";
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
    { id: "1d", label: "1D", value: formatUsd(data.oneDayImpliedPressureUsd, locale), valueClassName: metricValueClass(data.oneDayImpliedPressureUsd), detail: `${formatPercent(data.oneDayShareChangePct, locale)} · ${isEnglish ? "shares" : "participaciones"}` },
    { id: "5d", label: "5D", value: formatUsd(data.fiveDayImpliedPressureUsd, locale), valueClassName: metricValueClass(data.fiveDayImpliedPressureUsd), detail: `${formatPercent(data.fiveDayShareChangePct, locale)} · ${isEnglish ? "shares" : "participaciones"}` },
    { id: "20d", label: "20D", value: formatUsd(data.twentyDayImpliedPressureUsd, locale), valueClassName: metricValueClass(data.twentyDayImpliedPressureUsd), detail: `${formatPercent(data.twentyDayShareChangePct, locale)} · ${isEnglish ? "shares" : "participaciones"}` },
  ];
  const number = (value: number | null) => value === null ? isEnglish ? "Pending" : "Dato pendiente" : new Intl.NumberFormat(isEnglish ? "en-US" : "es-ES").format(value);
  const usdLevel = (value: number | null) => value === null ? isEnglish ? "Pending" : "Dato pendiente" : new Intl.NumberFormat(isEnglish ? "en-US" : "es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  const secondaryMetrics: [string, string][] = [
    [isEnglish ? "Shares 1D" : "Participaciones 1D", formatShares(data.oneDayShareChange, locale)],
    [isEnglish ? "Shares 5D" : "Participaciones 5D", formatShares(data.fiveDayShareChange, locale)],
    [isEnglish ? "Shares 20D" : "Participaciones 20D", formatShares(data.twentyDayShareChange, locale)],
    ["NAV · USD", usdLevel(data.nav)],
    [isEnglish ? "Shares outstanding" : "Participaciones en circulación", number(data.sharesOutstanding)],
    [isEnglish ? "Net assets · USD" : "Activos netos · USD", usdLevel(data.totalNetAssets)],
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
          <DashboardModuleHeading headingLevel="h3">{isEnglish ? "GLD flows" : "Flujos de GLD"}</DashboardModuleHeading>
        </div>

      </div>

      <FlowWindowMetrics asset="gld" title={isEnglish ? "Approximate implied amount · USD" : "Importe implícito aproximado · USD"} metrics={primaryMetrics} />
      <div className="mt-4 grid gap-4 border-b border-line pb-4 sm:grid-cols-2" data-flow-observation>
        <div><p className="text-xs text-muted">{isEnglish ? "Observation" : "Observación"}</p><p className="mt-2 text-sm font-semibold text-ink" data-gld-reading>{pressureLabel(data, locale)}</p></div>
        <div><p className="text-xs text-muted">{isEnglish ? "Updated" : "Actualización"}</p><p className="mt-2 text-sm font-medium text-ink">{formatCapitalFlowDate(data.asOf, locale)}</p></div>
      </div>
      <GldHistoryPanel history={data.history} locale={locale} />

      <div className="mt-5 border-t border-line pt-5" data-gld-analysis>
          <div className="grid gap-6">
            <section data-flow-details>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{isEnglish ? "Proxy detail" : "Detalle del proxy"}</h4>
              <DetailGrid items={secondaryMetrics} />
            </section>
          </div>
      </div>

      <GldSessionsTable history={data.history} locale={locale} />

      <div data-context-toggle>
<DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={isEnglish ? "Hide context" : "Ocultar contexto"}
          collapsedLabel={isEnglish ? "Show context" : "Mostrar contexto"}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-gld-context>
            <section className="grid content-start gap-5 text-sm leading-6 text-muted lg:grid-cols-2" data-flow-interpretation>
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
