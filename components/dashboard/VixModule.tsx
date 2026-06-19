"use client";

import { usePathname } from "next/navigation";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { VixDashboardData, VixHistoryPoint, VixSpotData } from "@/lib/dashboard/types";

type VixModuleProps = {
  data: VixDashboardData;
};

function formatNumber(value: number | null, decimals = 1, locale: "es" | "en" = "es") {
  return value === null ? locale === "en" ? "Temporarily unavailable" : "Dato no disponible temporalmente" : value.toFixed(decimals);
}

function formatChange(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Not enough history" : "Historial insuficiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pts`;
}

function trendLabel(trend: VixSpotData["vixTrend"], locale: "es" | "en" = "es") {
  if (trend === "rising_fast") return locale === "en" ? "Rising fast" : "Subiendo rápido";
  if (trend === "rising") return locale === "en" ? "Rising" : "Subiendo";
  if (trend === "falling") return locale === "en" ? "Falling" : "Bajando";
  return locale === "en" ? "Stable" : "Estable";
}

function severityClass(severity: VixSpotData["vixSeverity"]) {
  if (severity === "extreme" || severity === "stress" || severity === "elevated") return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (severity === "watch") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
}

function buildVixPath(history: VixHistoryPoint[]) {
  if (history.length < 2) return "";
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);

  return history
    .map((point, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 50 - ((point.value - min) / range) * 38;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function VixLineChart({ history, locale = "es" }: { history: VixHistoryPoint[]; locale?: "es" | "en" }) {
  const path = buildVixPath(history);
  const values = history.map((point) => point.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Recent evolution" : "Evolución reciente"}</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">{locale === "en" ? `Last ${history.length} sessions` : `Últimas ${history.length} sesiones`}</h3>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <span className="block">{locale === "en" ? "Max." : "Máx."} {formatNumber(max, 1, locale)}</span>
          <span className="block">{locale === "en" ? "Min." : "Mín."} {formatNumber(min, 1, locale)}</span>
        </div>
      </div>

      <svg viewBox="0 0 100 58" className="mt-5 h-52 w-full md:h-64" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="12" y2="12" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="50" y2="50" stroke="#e7e2dc" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {path ? <path d={path} fill="none" stroke="#6f8f7b" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>-{history.length} {locale === "en" ? "sessions" : "sesiones"}</span>
        <span>{locale === "en" ? "Latest close" : "Último cierre"}</span>
      </div>
    </div>
  );
}

export function VixModule({ data }: VixModuleProps) {
  const locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const spot = data.spot;
  const metrics = [
    [locale === "en" ? "1D change" : "Cambio 1D", formatChange(spot.change1d, locale)],
    [locale === "en" ? "5D change" : "Cambio 5D", formatChange(spot.change5d, locale)],
    [locale === "en" ? "21D change" : "Cambio 21D", formatChange(spot.change21d, locale)],
    [locale === "en" ? "Historical percentile" : "Percentil histórico", spot.vixPercentile === null ? t(spot.vixPercentileLabel) : `${t(spot.vixPercentileLabel)} · p${Math.round(spot.vixPercentile)}`],
    [locale === "en" ? "Trend" : "Tendencia", trendLabel(spot.vixTrend, locale)],
    [locale === "en" ? "Data status" : "Estado de datos", t(dataStatusLabels[spot.dataStatus])],
  ];

  return (
    <ExpandableInsightCard
      eyebrow="VIX"
      title={locale === "en" ? "Volatility pressure" : "Presión de volatilidad"}
      reading={t(spot.vixCompositeSubtext)}
      status={t(dataStatusLabels[spot.dataStatus])}
      metrics={[
        { label: locale === "en" ? "Current VIX" : "VIX actual", value: formatNumber(spot.latestVix, 1, locale), tone: spot.vixSeverity === "watch" ? "brass" : spot.vixSeverity === "normal" || spot.vixSeverity === "low" ? "sage" : "danger" },
        { label: locale === "en" ? "Classification" : "Clasificación", value: t(spot.vixCompositeLabel) },
        { label: "Momentum", value: trendLabel(spot.vixTrend, locale) },
        { label: locale === "en" ? "Percentile" : "Percentil", value: spot.vixPercentile === null ? t(spot.vixPercentileLabel) : `${t(spot.vixPercentileLabel)} · p${Math.round(spot.vixPercentile)}` },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
        <div className="border border-line bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{locale === "en" ? "Expanded read" : "Lectura ampliada"}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {t(spot.vixDescription)} {locale === "en" ? "The read combines absolute level, historical percentile and recent momentum." : "La lectura combina nivel absoluto, percentil histórico y momentum reciente."}
          </p>
          <div className="mt-5 grid gap-x-5 gap-y-4 border-y border-line py-4 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <VixLineChart history={spot.history} locale={locale} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 text-sm leading-6 text-muted lg:grid-cols-2">
          <p>
            <span className="font-semibold text-ink">{locale === "en" ? "Prudent interpretation" : "Interpretación prudente"}: </span>
            {t(spot.interpretation.how)}
          </p>
          <p>
            <span className="font-semibold text-ink">{locale === "en" ? "Reading limit" : "Qué NO significa"}: </span>
            {t(spot.interpretation.whatItDoesNotMean)}
          </p>
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span>
          {spot.sourceUrl ? (
            <a href={spot.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {t(spot.sourceName)}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{t(spot.sourceName)}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
          <span className="mt-1 block text-ink">{t(spot.lastUpdated)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Frequency" : "Frecuencia"}</span>
          <span className="mt-1 block text-ink">{t(spot.updateFrequency)}</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{t(spot.reliabilityNote)}</p>
    </ExpandableInsightCard>
  );
}
