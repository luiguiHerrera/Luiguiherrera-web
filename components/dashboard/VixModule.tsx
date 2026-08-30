"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { dashboardModuleEyebrowClassName, dashboardModuleTitleClassName } from "@/components/dashboard/DashboardPrimitives";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { VixDashboardData, VixHistoryPoint, VixSpotData } from "@/lib/dashboard/types";

type VixModuleProps = { data: VixDashboardData };
type Locale = "es" | "en";

function formatNumber(value: number | null, locale: Locale, digits = 1) {
  return value === null ? locale === "en" ? "Unavailable" : "No disponible" : value.toFixed(digits);
}

function formatChange(value: number | null, locale: Locale) {
  if (value === null) return locale === "en" ? "Unavailable" : "No disponible";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function trendLabel(trend: VixSpotData["vixTrend"], locale: Locale, available = true) {
  if (!available) return locale === "en" ? "Unavailable" : "No disponible";
  if (trend === "rising_fast") return locale === "en" ? "Rising fast" : "Subiendo rápido";
  if (trend === "rising") return locale === "en" ? "Rising" : "Subiendo";
  if (trend === "falling") return locale === "en" ? "Falling" : "Bajando";
  return locale === "en" ? "Stable" : "Estable";
}

function formatSessionDate(value: string, locale: Locale) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function formatObservationUpdate(value: string | null, fallback: string, locale: Locale) {
  if (!value) return locale === "en" ? translateDashboardText(fallback) : fallback;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return locale === "en" ? translateDashboardText(fallback) : fallback;
  const formatted = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
  return locale === "en" ? `Latest available close: ${formatted}` : `Último cierre disponible: ${formatted}`;
}

function chartPoints(history: VixHistoryPoint[]) {
  if (history.length < 2) return [];
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 0.25);
  const domainMin = min - padding;
  const range = Math.max(max + padding - domainMin, 0.01);
  return history.map((point, index) => ({
    point,
    x: 4 + (index / (history.length - 1)) * 92,
    y: 82 - ((point.value - domainMin) / range) * 70,
  }));
}

function VixLineChart({ history, locale }: { history: VixHistoryPoint[]; locale: Locale }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = chartPoints(history);
  const path = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const active = activeIndex === null ? null : points[activeIndex];
  const values = history.map((point) => point.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const latest = history.at(-1) ?? null;
  const middle = history.length ? history[Math.floor((history.length - 1) / 2)] : null;

  return (
    <div className="min-w-0 bg-panelSoft px-3 py-4 sm:px-5 md:px-6 md:py-5" data-vix-spot-chart>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Recent evolution" : "Evolución reciente"}</p>
          <p className="mt-1.5 text-sm font-semibold text-ink">{locale === "en" ? `Last ${history.length} valid sessions` : `Últimas ${history.length} sesiones válidas`}</p>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <span className="block">{locale === "en" ? "Latest close" : "Último cierre"} <strong className="font-semibold tabular-nums text-ink">{formatNumber(latest?.value ?? null, locale)}</strong></span>
          <span className="block">{locale === "en" ? "Range" : "Rango"} {formatNumber(min, locale)}–{formatNumber(max, locale)}</span>
        </div>
      </div>

      {points.length ? (
        <>
          <div className="relative mt-3 h-44 sm:h-[204px] md:h-[232px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <line x1="4" x2="96" y1="82" y2="82" stroke="#d8d1c8" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
              <line x1="4" x2="96" y1="47" y2="47" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              <line x1="4" x2="96" y1="12" y2="12" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              <path d={path} fill="none" stroke="#6f8f7b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {points.map(({ point, x, y }, index) => (
              <button
                key={point.date}
                type="button"
                aria-label={`${formatSessionDate(point.date, locale)} · VIX ${point.value.toFixed(2)}`}
                className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#47604f] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${activeIndex === index ? "scale-125 bg-[#47604f]" : "bg-panel hover:scale-110"}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              />
            ))}
            {active ? (
              <div
                role="tooltip"
                className={`pointer-events-none absolute z-10 w-36 border border-line bg-panel px-3 py-2 text-xs shadow-lg ${active.x < 14 ? "left-0" : active.x > 86 ? "right-0" : "-translate-x-1/2"} ${active.y < 40 ? "top-[calc(var(--point-y)+1rem)]" : "bottom-[calc(100%-var(--point-y)+1rem)]"}`}
                style={{ ...(active.x >= 14 && active.x <= 86 ? { left: `${active.x}%` } : {}), "--point-y": `${active.y}%` } as CSSProperties}
              >
                <p className="font-semibold text-ink">{formatSessionDate(active.point.date, locale)}</p>
                <p className="mt-1 tabular-nums text-muted">VIX <strong className="text-ink">{active.point.value.toFixed(2)}</strong></p>
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted sm:text-xs">
            <span>{formatSessionDate(history[0].date, locale)}</span>
            <span>{middle ? formatSessionDate(middle.date, locale) : ""}</span>
            <span>{latest ? formatSessionDate(latest.date, locale) : ""}</span>
          </div>
        </>
      ) : (
        <p className="mt-8 flex h-36 items-center justify-center text-center text-sm text-muted">{locale === "en" ? "Recent history is temporarily unavailable." : "El historial reciente no está disponible temporalmente."}</p>
      )}
    </div>
  );
}

export function VixModule({ data }: VixModuleProps) {
  const locale: Locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const spot = data.spot;
  const available = spot.latestVix !== null;
  const status = spot.dataStatus === "automated"
    ? locale === "en" ? "Automated data" : "Datos automatizados"
    : available
      ? locale === "en" ? "Delayed data" : "Datos con retraso"
      : locale === "en" ? "Temporarily unavailable" : "Datos temporalmente no disponibles";
  const percentile = !available || spot.vixPercentile === null
    ? !available ? locale === "en" ? "Unavailable" : "No disponible" : t(spot.vixPercentileLabel)
    : `${t(spot.vixPercentileLabel)} · p${Math.round(spot.vixPercentile)}`;
  const metrics = [
    [locale === "en" ? "VIX · last close" : "VIX · último cierre", formatNumber(spot.latestVix, locale, 2)],
    [locale === "en" ? "Classification" : "Clasificación", available ? t(spot.vixCompositeLabel) : locale === "en" ? "Unavailable" : "No disponible"],
    ["Momentum", trendLabel(spot.vixTrend, locale, available)],
    [locale === "en" ? "Percentile" : "Percentil", percentile],
  ];
  const detailMetrics = [
    [locale === "en" ? "1D change" : "Cambio 1D", formatChange(spot.change1d, locale)],
    [locale === "en" ? "5D change" : "Cambio 5D", formatChange(spot.change5d, locale)],
    [locale === "en" ? "21D change" : "Cambio 21D", formatChange(spot.change21d, locale)],
    [locale === "en" ? "Trend" : "Tendencia", trendLabel(spot.vixTrend, locale, available)],
  ];

  return (
    <section className="border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6" data-vix-spot-module>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{locale === "en" ? "Current level" : "Nivel actual"}</p>
        <span className="inline-flex items-center gap-2 text-[11px] font-normal text-muted/80" data-vix-spot-status>
          <span className={`h-1 w-1 rounded-full ${spot.dataStatus === "automated" ? "bg-[#6f8f7b]/70" : "bg-brass/70"}`} aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className={dashboardModuleTitleClassName}>{locale === "en" ? "Volatility pressure" : "Presión de volatilidad"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{t(spot.vixCompositeSubtext)}</p>
        </div>
        <button
          type="button"
          aria-expanded={contextOpen}
          aria-controls={contextId}
          onClick={() => setContextOpen((open) => !open)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start bg-transparent px-1 py-1 text-xs font-medium text-muted/80 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          data-vix-spot-context-trigger
        >
          {contextOpen ? locale === "en" ? "Hide context" : "Ocultar contexto" : locale === "en" ? "Show context" : "Mostrar contexto"}
          <span aria-hidden="true">{contextOpen ? "↑" : "↓"}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-vix-spot-metrics>
        {metrics.map(([label, value], index) => (
          <div key={label} className={`px-3 py-3 sm:px-4 ${index === 0 ? "pl-0 sm:pl-0" : ""} ${index === 1 || index === 3 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line sm:border-t-0" : ""} ${index === 2 ? "sm:border-l sm:border-line" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{value}</p>
          </div>
        ))}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5" data-vix-spot-context>
          <div className="grid gap-5 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Analytical detail" : "Detalle analítico"}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{t(spot.vixDescription)} {available ? locale === "en" ? "The reading combines the absolute level, historical percentile, and recent momentum." : "La lectura combina nivel absoluto, percentil histórico y momentum reciente." : ""}</p>
              <div className="mt-4 grid grid-cols-2 border-y border-line">
                {detailMetrics.map(([label, value], index) => (
                  <div key={label} className={`px-3 py-3 ${index % 2 === 1 ? "border-l border-line" : "pl-0"} ${index >= 2 ? "border-t border-line" : ""}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <VixLineChart history={spot.history} locale={locale} />
          </div>

          <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted lg:grid-cols-2">
            <div className="bg-panelSoft/35 px-4 py-3"><h3 className="text-sm font-semibold text-ink">{locale === "en" ? "Prudent interpretation" : "Interpretación prudente"}</h3><p className="mt-1.5">{t(spot.interpretation.how)}</p></div>
            <div className="bg-panelSoft/35 px-4 py-3"><h3 className="text-sm font-semibold text-ink">{locale === "en" ? "What it does not mean" : "Qué NO significa"}</h3><p className="mt-1.5">{t(spot.interpretation.whatItDoesNotMean)}</p></div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-3 text-xs text-muted">
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span><a href={spot.sourceUrl} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{spot.sourceName}</a></div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span><span className="ml-2 font-medium text-ink">{formatObservationUpdate(spot.lastObservationDate, spot.lastUpdated, locale)}</span></div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Frequency" : "Frecuencia"}</span><span className="ml-2 font-medium text-ink">{t(spot.updateFrequency)}</span></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{t(spot.reliabilityNote)}</p>
        </div>
      ) : null}
    </section>
  );
}
