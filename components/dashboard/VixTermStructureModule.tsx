"use client";

import { usePathname } from "next/navigation";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { VixTermStructureData, VixTermStructurePoint, VixTermStructureSourceStatus } from "@/lib/dashboard/types";

type VixTermStructureModuleProps = {
  data: VixTermStructureData;
};

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

function formatPointValue(value: number | null, locale: "es" | "en" = "es") {
  return value === null ? locale === "en" ? "Pending" : "Pendiente" : value.toFixed(2);
}

function formatSpread(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} pts`;
}

function formatSlope(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function classificationClass(classification: VixTermStructureData["classification"]) {
  const normalized = classification.toLowerCase();
  if (normalized.includes("backwardation")) return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (normalized.includes("contango")) return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (classification === "Plano") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a8a29e]/40 bg-[#a8a29e]/10 text-[#5f5a54]";
}

function curvePoints(points: VixTermStructurePoint[]) {
  const validPoints = points
    .map((point, index) => ({ point, index }))
    .filter((entry): entry is { point: VixTermStructurePoint & { value: number }; index: number } => entry.point.value !== null);
  if (!validPoints.length) return [];

  const values = validPoints.map(({ point }) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.18, 0.25);
  const domainMin = min - padding;
  const domainMax = max + padding;
  const range = Math.max(domainMax - domainMin, 0.01);
  const step = 92 / Math.max(points.length - 1, 1);

  return validPoints.map(({ point, index }) => ({
    point,
    x: 4 + index * step,
    y: 78 - ((point.value - domainMin) / range) * 58,
  }));
}

function TermStructureChart({ data, locale = "es" }: { data: VixTermStructureData; locale?: "es" | "en" }) {
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const plottedPoints = curvePoints(data.points);
  const curvePath = plottedPoints
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const hasCurve = plottedPoints.length >= 2;
  const lastPointLabel = data.points.at(-1)?.label;
  const curveRange = lastPointLabel === "VX1" ? "VX1" : `VX1–${lastPointLabel ?? "VX9"}`;

  return (
    <div className="min-w-0 border border-line bg-panelSoft p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Near curve" : "Curva cercana"}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{curveRange}</h3>
        </div>
        <span className={`border px-3 py-1.5 text-xs font-semibold ${classificationClass(data.classification)}`}>
          {t(data.classification)}
        </span>
      </div>

      <div className="relative mt-5 h-32 md:h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <line x1="4" x2="96" y1="78" y2="78" stroke="#d8d1c8" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="49" y2="49" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="20" y2="20" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          {hasCurve ? (
            <path d={curvePath} fill="none" stroke="#6f8f7b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>

        {plottedPoints.map(({ point, x, y }) => (
          <span
            key={point.label}
            title={`${point.label}: ${formatPointValue(point.value, locale)}`}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#47604f] bg-panel shadow-[0_0_0_3px_rgba(251,250,248,0.75)]"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-hidden="true"
          />
        ))}

        {!plottedPoints.length ? (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted">
            {locale === "en" ? "VIX structure pending a stable automated source." : "Estructura VIX pendiente de fuente automatizada estable."}
          </p>
        ) : null}
      </div>

      <div
        className="mt-1 grid text-center"
        style={{ gridTemplateColumns: `repeat(${Math.max(data.points.length, 1)}, minmax(0, 1fr))`, paddingInline: "4%" }}
      >
        {data.points.map((point) => (
          <span key={point.label} className="text-[10px] font-semibold tracking-[0.04em] text-muted md:text-xs">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TermStructureTable({ data, locale = "es" }: { data: VixTermStructureData; locale?: "es" | "en" }) {
  const pending = locale === "en" ? "Pending" : "Pendiente";

  return (
    <div className="min-w-0 border border-line bg-panel">
      <div className="border-b border-line bg-panelSoft px-4 py-3 md:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">
          {locale === "en" ? "Contract detail" : "Detalle por vencimiento"}
        </p>
      </div>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="border-b border-line bg-paper/55 text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold md:px-5">VX</th>
              <th scope="col" className="px-4 py-3 font-semibold">{locale === "en" ? "Contract" : "Contrato"}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Settlement</th>
              <th scope="col" className="px-4 py-3 font-semibold">{locale === "en" ? "Month" : "Mes"}</th>
              <th scope="col" className="px-4 py-3 font-semibold md:pr-5">{locale === "en" ? "Expiration" : "Vencimiento"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80">
            {data.points.map((point) => (
              <tr key={point.label} className="transition-colors hover:bg-panelSoft/70">
                <th scope="row" className="px-4 py-3 font-semibold text-ink md:px-5">{point.label}</th>
                <td className="px-4 py-3 font-medium text-muted">{point.symbol ?? pending}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatPointValue(point.value, locale)}</td>
                <td className="px-4 py-3 text-muted">{point.contract ?? pending}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-muted md:pr-5">{point.expirationDate ?? pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VixTermStructureModule({ data }: VixTermStructureModuleProps) {
  const locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const statusLabel = locale === "en" ? sourceStatusLabelsEn[data.sourceStatus] : sourceStatusLabels[data.sourceStatus];
  const metrics = [
    ["Spread VX2-VX1", formatSpread(data.m1m2Spread, locale)],
    [locale === "en" ? "Slope VX1-VX2" : "Pendiente VX1-VX2", formatSlope(data.m1m2SlopePct, locale)],
    ["Spread VX3-VX1", formatSpread(data.m1m3Spread, locale)],
    [locale === "en" ? "Slope VX1-VX3" : "Pendiente VX1-VX3", formatSlope(data.m1m3SlopePct, locale)],
  ];

  return (
    <ExpandableInsightCard
      eyebrow="VIX term structure"
      title="Contango / Backwardation"
      reading={t(data.interpretation)}
      status={statusLabel}
      metrics={[
        { label: locale === "en" ? "Classification" : "Clasificación", value: t(data.classification), tone: data.classification.toLowerCase().includes("backwardation") ? "danger" : data.classification.toLowerCase().includes("contango") ? "sage" : "brass" },
        { label: "Spread VX2-VX1", value: formatSpread(data.m1m2Spread, locale) },
        { label: locale === "en" ? "Slope VX1-VX2" : "Pendiente VX1-VX2", value: formatSlope(data.m1m2SlopePct, locale) },
        { label: "Spread VX3-VX1", value: formatSpread(data.m1m3Spread, locale) },
      ]}
    >
      <div className="grid min-w-0 gap-5">
        <TermStructureChart data={data} locale={locale} />

        <TermStructureTable data={data} locale={locale} />

        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">VIX term structure</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{locale === "en" ? "Curve reading" : "Lectura de la curva"}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            {locale === "en"
              ? "The VIX term structure compares near futures to observe whether immediate protection is priced above or below later expirations."
              : "La estructura temporal del VIX compara futuros cercanos para observar si la protección inmediata se valora por encima o por debajo de vencimientos posteriores."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`border px-3 py-1 text-sm font-semibold ${classificationClass(data.classification)}`}>
              {t(data.classification)}
            </span>
            <span className="border border-line bg-panel px-3 py-1 text-sm font-semibold text-muted">
              {statusLabel}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">{t(data.interpretation)}</p>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
            {locale === "en"
              ? "Contextual read for locating relative protection demand across near expirations."
              : "Lectura contextual para ubicar la demanda relativa de protección entre vencimientos cercanos."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-muted lg:grid-cols-2">
        <div className="border border-line bg-panelSoft p-3">
          <span className="block text-sm font-semibold text-ink">{locale === "en" ? "Reading limit" : "Qué NO significa"}</span>
          <p className="mt-2">{t(data.whatItDoesNotMean)}</p>
        </div>
        <div className="border border-line bg-panelSoft p-3">
          <span className="block text-sm font-semibold text-ink">{locale === "en" ? "Source note" : "Nota de fuente"}</span>
          <p className="mt-2">{t(data.reliabilityNote)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span>
          {data.sourceUrl ? (
            <a href={data.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {t(data.source)}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{t(data.source)}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
          <span className="mt-1 block text-ink">{data.lastUpdated ? t(data.lastUpdated) : locale === "en" ? "Pending" : "Pendiente"}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Status" : "Estado"}</span>
          <span className="mt-1 block text-ink">{statusLabel}</span>
        </div>
      </div>
    </ExpandableInsightCard>
  );
}
