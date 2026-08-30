"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { dashboardModuleEyebrowClassName, dashboardModuleTitleClassName } from "@/components/dashboard/DashboardPrimitives";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { VixTermStructureData, VixTermStructurePoint, VixTermStructureSourceStatus } from "@/lib/dashboard/types";

type VixTermStructureModuleProps = {
  data: VixTermStructureData;
};

type Locale = "es" | "en";

const sourceStatusLabels: Record<VixTermStructureSourceStatus, string> = {
  automated: "Datos automatizados",
  manual_fallback: "Fallback manual",
  pending: "Fuente pendiente",
  unavailable: "No disponible",
};

const sourceStatusLabelsEn: Record<VixTermStructureSourceStatus, string> = {
  automated: "Automated data",
  manual_fallback: "Manual fallback",
  pending: "Source pending",
  unavailable: "Unavailable",
};

function formatPointValue(value: number | null, locale: Locale = "es") {
  return value === null ? locale === "en" ? "Pending" : "Pendiente" : value.toFixed(2);
}

function formatSpread(value: number | null, locale: Locale = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} pts`;
}

function formatSlope(value: number | null, locale: Locale = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function classificationClass(classification: VixTermStructureData["classification"]) {
  const normalized = classification.toLowerCase();
  if (normalized.includes("backwardation")) return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (normalized.includes("contango")) return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (classification === "Plano") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a8a29e]/40 bg-[#a8a29e]/10 text-[#5f5a54]";
}

function parseExpirationDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatFullExpiration(value: string | null, locale: Locale) {
  const date = parseExpirationDate(value);
  if (!date) return value ?? (locale === "en" ? "Pending" : "Pendiente");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatContractMonth(value: string | null, expirationDate: string | null, locale: Locale) {
  if (locale === "es") return value ?? "Pendiente";
  const date = parseExpirationDate(expirationDate);
  if (!date) return value ? translateDashboardText(value) : "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatAxisExpiration(point: VixTermStructurePoint, previousPoint: VixTermStructurePoint | undefined, locale: Locale) {
  const date = parseExpirationDate(point.expirationDate);
  if (!date) return point.label;
  const previousDate = parseExpirationDate(previousPoint?.expirationDate ?? null);
  const crossesYear = previousDate !== null && previousDate.getUTCFullYear() !== date.getUTCFullYear();
  const base = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  return crossesYear ? `${base} ’${String(date.getUTCFullYear()).slice(-2)}` : base;
}

const spanishMonthIndexes: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sept: 8, oct: 9, nov: 10, dic: 11 };

function formatLastUpdated(value: string | null, locale: Locale) {
  if (!value) return locale === "en" ? "Pending" : "Pendiente";
  if (locale === "es") return value;
  const match = value.match(/^Último settlement disponible: (\d{1,2}) de ([a-z]+) de (\d{4})$/i);
  if (!match) return translateDashboardText(value);
  const monthIndex = spanishMonthIndexes[match[2].toLowerCase()];
  if (monthIndex === undefined) return translateDashboardText(value);
  const date = new Date(Date.UTC(Number(match[3]), monthIndex, Number(match[1])));
  return "Latest available settlement: " + new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatInterpretation(value: string, locale: Locale) {
  if (locale === "en") return translateDashboardText(value);
  return value.replace(
    "Los contratos más largos cotizan por encima del vencimiento cercano.",
    "Los vencimientos más lejanos cotizan por encima del contrato cercano.",
  );
}
function curvePoints(points: VixTermStructurePoint[]) {
  const validPoints = points
    .map((point, index) => ({ point, index }))
    .filter((entry): entry is { point: VixTermStructurePoint & { value: number }; index: number } => entry.point.value !== null);
  if (!validPoints.length) return [];

  const values = validPoints.map(({ point }) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.16, 0.35);
  const domainMin = min - padding;
  const range = Math.max(max + padding - domainMin, 0.01);
  const step = 92 / Math.max(points.length - 1, 1);

  return validPoints.map(({ point, index }) => ({
    point,
    x: 4 + index * step,
    y: 82 - ((point.value - domainMin) / range) * 70,
  }));
}

function TermStructureChart({
  data,
  locale,
  activePointLabel,
  onActivePointChange,
}: {
  data: VixTermStructureData;
  locale: Locale;
  activePointLabel: VixTermStructurePoint["label"] | null;
  onActivePointChange: (label: VixTermStructurePoint["label"] | null) => void;
}) {
  const plottedPoints = curvePoints(data.points);
  const curvePath = plottedPoints
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const activePoint = plottedPoints.find(({ point }) => point.label === activePointLabel);

  return (
    <div className="min-w-0 bg-panelSoft px-3 py-4 sm:px-5 md:px-6 md:py-5" data-vix-chart>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">
        {locale === "en" ? "Near curve" : "Curva cercana"}
      </p>

      <div className="relative mt-3 h-44 sm:h-[204px] md:h-[232px]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <line x1="4" x2="96" y1="82" y2="82" stroke="#d8d1c8" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="47" y2="47" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="12" y2="12" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          {plottedPoints.length >= 2 ? (
            <path d={curvePath} fill="none" stroke="#6f8f7b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>

        {plottedPoints.map(({ point, x, y }) => {
          const isActive = point.label === activePointLabel;
          return (
            <button
              key={point.label}
              type="button"
              aria-label={`${point.label}, ${point.symbol ?? (locale === "en" ? "contract pending" : "contrato pendiente")}, ${formatFullExpiration(point.expirationDate, locale)}, settlement ${formatPointValue(point.value, locale)}`}
              className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#47604f] outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${isActive ? "scale-125 bg-[#47604f] shadow-[0_0_0_4px_rgba(111,143,123,0.18)]" : "bg-panel shadow-[0_0_0_3px_rgba(251,250,248,0.78)] hover:scale-110"}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onMouseEnter={() => onActivePointChange(point.label)}
              onMouseLeave={() => onActivePointChange(null)}
              onFocus={() => onActivePointChange(point.label)}
              onBlur={() => onActivePointChange(null)}
              onClick={() => onActivePointChange(point.label)}
              data-vix-point={point.label}
            />
          );
        })}

        {activePoint ? (
          <div
            role="tooltip"
            className={`pointer-events-none absolute z-10 w-44 border border-line bg-panel px-3 py-2 text-left shadow-lg ${activePoint.x <= 12 ? "left-0" : activePoint.x >= 88 ? "right-0" : "-translate-x-1/2"} ${activePoint.y < 42 ? "top-[calc(var(--point-y)+1.15rem)]" : "bottom-[calc(100%-var(--point-y)+1.15rem)]"}`}
            style={{
              ...(activePoint.x > 12 && activePoint.x < 88 ? { left: `${activePoint.x}%` } : {}),
              "--point-y": `${activePoint.y}%`,
            } as CSSProperties}
            data-vix-tooltip
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brass">
              {formatFullExpiration(activePoint.point.expirationDate, locale)}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {activePoint.point.label} · {activePoint.point.symbol ?? (locale === "en" ? "Contract pending" : "Contrato pendiente")}
            </p>
            <p className="mt-1 text-xs tabular-nums text-muted">
              Settlement <span className="font-semibold text-ink">{formatPointValue(activePoint.point.value, locale)}</span>
            </p>
          </div>
        ) : null}

        {!plottedPoints.length ? (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted">
            {locale === "en" ? "VIX structure pending a stable automated source." : "Estructura VIX pendiente de fuente automatizada estable."}
          </p>
        ) : null}
      </div>

      <div
        className="mt-1 grid text-center"
        style={{ gridTemplateColumns: `repeat(${Math.max(data.points.length, 1)}, minmax(0, 1fr))`, paddingInline: "4%" }}
        data-vix-axis
      >
        {data.points.map((point, index) => (
          <span
            key={point.label}
            className={`${index % 2 === 1 && index !== data.points.length - 1 ? "invisible sm:visible" : "visible"} min-w-0 text-[9px] font-semibold tracking-[-0.02em] text-muted sm:text-[10px] md:text-[11px]`}
          >
            {formatAxisExpiration(point, data.points[index - 1], locale)}
          </span>
        ))}
      </div>
    </div>
  );
}

function TermStructureTable({
  data,
  locale,
  activePointLabel,
  onActivePointChange,
}: {
  data: VixTermStructureData;
  locale: Locale;
  activePointLabel: VixTermStructurePoint["label"] | null;
  onActivePointChange: (label: VixTermStructurePoint["label"] | null) => void;
}) {
  const pending = locale === "en" ? "Pending" : "Pendiente";

  return (
    <div className="w-full max-w-full overflow-x-auto" data-vix-table>
      <table className="w-full min-w-[680px] border-collapse text-left text-sm md:min-w-0">
        <thead className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-muted">
          <tr>
            <th scope="col" className="px-3 py-3 font-semibold md:px-4">VX</th>
            <th scope="col" className="px-3 py-3 font-semibold md:px-4">{locale === "en" ? "Contract" : "Contrato"}</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold md:px-4">Settlement</th>
            <th scope="col" className="px-3 py-3 font-semibold md:px-4">{locale === "en" ? "Month" : "Mes"}</th>
            <th scope="col" className="px-3 py-3 font-semibold md:px-4">{locale === "en" ? "Expiration" : "Vencimiento"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {data.points.map((point) => {
            const isActive = point.label === activePointLabel;
            return (
              <tr
                key={point.label}
                tabIndex={0}
                className={`outline-none transition-colors hover:bg-panelSoft focus-visible:bg-panelSoft ${isActive ? "bg-panelSoft" : ""}`}
                onMouseEnter={() => onActivePointChange(point.label)}
                onMouseLeave={() => onActivePointChange(null)}
                onFocus={() => onActivePointChange(point.label)}
                onBlur={() => onActivePointChange(null)}
                data-vix-row={point.label}
              >
                <th scope="row" className="px-3 py-3 font-semibold text-ink md:px-4">{point.label}</th>
                <td className="px-3 py-3 font-medium text-muted md:px-4">{point.symbol ?? pending}</td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink md:px-4">{formatPointValue(point.value, locale)}</td>
                <td className="px-3 py-3 text-muted md:px-4">{formatContractMonth(point.contract, point.expirationDate, locale)}</td>
                <td className="px-3 py-3 font-medium tabular-nums text-muted md:px-4">{formatFullExpiration(point.expirationDate, locale)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function VixTermStructureModule({ data }: VixTermStructureModuleProps) {
  const locale: Locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const statusLabel = locale === "en" ? sourceStatusLabelsEn[data.sourceStatus] : sourceStatusLabels[data.sourceStatus];
  const [activePointLabel, setActivePointLabel] = useState<VixTermStructurePoint["label"] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const detailId = useId();
  const contextId = useId();
  const metrics = [
    ["Spread VX2−VX1", formatSpread(data.m1m2Spread, locale)],
    [locale === "en" ? "Slope VX1→VX2" : "Pendiente VX1→VX2", formatSlope(data.m1m2SlopePct, locale)],
    ["Spread VX3−VX1", formatSpread(data.m1m3Spread, locale)],
    [locale === "en" ? "Slope VX1→VX3" : "Pendiente VX1→VX3", formatSlope(data.m1m3SlopePct, locale)],
  ];

  return (
    <section className="border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6" data-vix-module>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{locale === "en" ? "Term structure" : "Estructura temporal"}</p>
        <span className="inline-flex items-center gap-2 text-[11px] font-normal text-muted/80" data-vix-status>
          <span className="h-1 w-1 rounded-full bg-[#6f8f7b]/70" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={dashboardModuleTitleClassName}>Contango / Backwardation</h2>
            <span className={`border px-2.5 py-1 text-xs font-semibold ${classificationClass(data.classification)}`} data-vix-regime>
              {t(data.classification)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{formatInterpretation(data.interpretation, locale)}</p>
        </div>

        <button
          type="button"
          aria-expanded={contextOpen}
          aria-controls={contextId}
          onClick={() => setContextOpen((open) => !open)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start bg-transparent px-1 py-1 text-xs font-medium text-muted/80 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          data-vix-context-trigger
        >
          {contextOpen
            ? locale === "en" ? "Hide context" : "Ocultar contexto"
            : locale === "en" ? "Show context" : "Mostrar contexto"}
          <span aria-hidden="true">{contextOpen ? "↑" : "↓"}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-vix-metrics>
        {metrics.map(([label, value], index) => (
          <div
            key={label}
            className={`px-3 py-3 sm:px-4 ${index === 0 ? "pl-0 sm:pl-0" : ""} ${index === 1 || index === 3 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line sm:border-t-0" : ""} ${index === 2 ? "sm:border-l sm:border-line" : ""}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <TermStructureChart data={data} locale={locale} activePointLabel={activePointLabel} onActivePointChange={setActivePointLabel} />
      </div>

      <div className="mt-4 border-t border-line">
        <button
          type="button"
          aria-expanded={detailOpen}
          aria-controls={detailId}
          onClick={() => setDetailOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          data-vix-detail-trigger
        >
          <span>
            {locale === "en" ? "Contract detail" : "Detalle por vencimiento"}
            <span className="ml-2 font-normal text-muted">· {data.points.length} {locale === "en" ? "contracts" : "contratos"}</span>
          </span>
          <span aria-hidden="true" className="text-muted">{detailOpen ? "↑" : "↓"}</span>
        </button>

        {detailOpen ? (
          <div id={detailId} className="border-t border-line">
            <TermStructureTable data={data} locale={locale} activePointLabel={activePointLabel} onActivePointChange={setActivePointLabel} />
          </div>
        ) : null}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-3 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted lg:grid-cols-2" data-vix-context>
          <div className="bg-panelSoft/35 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">{locale === "en" ? "What it does not mean" : "Qué NO significa"}</h3>
            <p className="mt-1.5">{t(data.whatItDoesNotMean)}</p>
          </div>
          <div className="bg-panelSoft/35 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">{locale === "en" ? "Source and methodology" : "Fuente y metodología"}</h3>
            <p className="mt-1.5">{t(data.reliabilityNote)}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-3 text-xs lg:col-span-2">
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span>
              {data.sourceUrl ? (
                <a href={data.sourceUrl} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  {t(data.source)}
                </a>
              ) : (
                <span className="ml-2 font-medium text-ink">{t(data.source)}</span>
              )}
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
              <span className="ml-2 font-medium text-ink">{formatLastUpdated(data.lastUpdated, locale)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
