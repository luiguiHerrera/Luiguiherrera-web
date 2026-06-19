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
  const validPoints = points.filter((point): point is VixTermStructurePoint & { value: number } => point.value !== null);
  if (!validPoints.length) return [];

  const values = validPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.18, 0.25);
  const domainMin = min - padding;
  const domainMax = max + padding;
  const range = Math.max(domainMax - domainMin, 0.01);
  const step = 76 / Math.max(validPoints.length - 1, 1);

  return validPoints.map((point, index) => ({
    point,
    x: 12 + index * step,
    y: 42 - ((point.value - domainMin) / range) * 28,
  }));
}

function TermStructureChart({ data, locale = "es" }: { data: VixTermStructureData; locale?: "es" | "en" }) {
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const plottedPoints = curvePoints(data.points);
  const curvePath = plottedPoints
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const hasCurve = plottedPoints.length >= 2;

  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Near curve" : "Curva cercana"}</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">VX1 / VX2 / VX3</h3>
        </div>
        <span className={`border px-3 py-1 text-xs font-semibold ${classificationClass(data.classification)}`}>
          {t(data.classification)}
        </span>
      </div>

      <svg viewBox="0 0 100 58" className="mt-4 h-36 w-full" aria-hidden="true">
        <line x1="7" x2="95" y1="42" y2="42" stroke="#d8d1c8" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="7" x2="95" y1="28" y2="28" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        {hasCurve ? (
          <>
            <path d={curvePath} fill="none" stroke="#6f8f7b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {plottedPoints.map(({ point, x, y }) => (
              <g key={point.label}>
                <circle cx={x} cy={y} r="2.4" fill="#fbfaf8" stroke="#47604f" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
                <text x={x} y={Math.max(8, y - 5)} textAnchor="middle" className="fill-ink text-[4.2px] font-semibold">
                  {formatPointValue(point.value, locale)}
                </text>
                <text x={x} y="53" textAnchor="middle" className="fill-muted text-[3.6px] font-semibold">
                  {point.label}
                </text>
              </g>
            ))}
          </>
        ) : (
          <text x="50" y="31" textAnchor="middle" className="fill-muted text-[4px]">
            {locale === "en" ? "VIX structure pending a stable automated source." : "Estructura VIX pendiente de fuente automatizada estable."}
          </text>
        )}
      </svg>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {data.points.map((point) => (
          <div key={point.label} className="border border-line bg-panel px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">{point.label}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{point.symbol ?? (locale === "en" ? "Pending" : "Pendiente")}</p>
            </div>
            <p className="mt-1 font-semibold text-ink">{formatPointValue(point.value, locale)}</p>
            <p className="mt-1 text-xs text-muted">
              {point.contract ?? (locale === "en" ? "Contract pending" : "Contrato pendiente")}
              {point.expirationDate ? ` · ${point.expirationDate}` : ""}
            </p>
          </div>
        ))}
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
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">VIX term structure</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Contango / Backwardation</h2>
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

        <TermStructureChart data={data} locale={locale} />
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
              {data.source}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{data.source}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
          <span className="mt-1 block text-ink">{data.lastUpdated ?? (locale === "en" ? "Pending" : "Pendiente")}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Status" : "Estado"}</span>
          <span className="mt-1 block text-ink">{statusLabel}</span>
        </div>
      </div>
    </ExpandableInsightCard>
  );
}
