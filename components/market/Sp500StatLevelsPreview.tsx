import Link from "next/link";
import type { Sp500StatLevelsPreviewData } from "@/lib/market/sp500-stat-levels-preview";

type Locale = "es" | "en";

const copy = {
  es: {
    cta: "Abrir laboratorio",
    distance: "Distancia a media larga",
    label: "Proxy S&P 500 · SPY",
    latestClose: "Último cierre",
    limit: "Lectura estadística de contexto; no implica soporte, resistencia ni dirección futura.",
    monthlyRange: "Rango mensual",
    na: "N/D",
    percentile: "Percentil de extensión",
    subtitle: "Lectura rápida de ubicación: precio actual, rango estadístico y distancia frente a su propio historial.",
    title: "S&P 500 frente a sus niveles estadísticos",
    weeklyRange: "Rango por semana",
    zScore: "Z-score",
  },
  en: {
    cta: "Open lab",
    distance: "Distance to long average",
    label: "S&P 500 proxy · SPY",
    latestClose: "Latest close",
    limit: "Statistical context read; it does not imply support, resistance or future direction.",
    monthlyRange: "Monthly range",
    na: "N/A",
    percentile: "Extension percentile",
    subtitle: "Quick positioning read: current price, statistical range and distance versus its own history.",
    title: "S&P 500 versus its statistical levels",
    weeklyRange: "Weekly range",
    zScore: "Z-score",
  },
};

function formatPrice(value: number | null, locale: Locale) {
  if (value === null) return copy[locale].na;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number | null, locale: Locale) {
  if (value === null) return copy[locale].na;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null, locale: Locale) {
  if (value === null) return copy[locale].na;
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatPercentile(value: number | null, locale: Locale) {
  if (value === null) return copy[locale].na;
  return `${formatNumber(value, locale)}%`;
}

function formatRange(low: number | null, high: number | null, locale: Locale) {
  if (low === null || high === null) return copy[locale].na;
  return `${formatPrice(low, locale)} - ${formatPrice(high, locale)}`;
}

function sparklinePath(points: Sp500StatLevelsPreviewData["sparkline"]) {
  if (points.length < 2) return "";
  const values = points.map((point) => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 34 - ((point.close - min) / span) * 28;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function scalePosition(value: number | null, low: number | null, high: number | null) {
  if (value === null || low === null || high === null || high <= low) return null;
  return Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
}

export function Sp500StatLevelsPreview({ data, locale }: { data: Sp500StatLevelsPreviewData; locale: Locale }) {
  const text = copy[locale];
  const labHref = locale === "en" ? "/en/statistical-levels?asset=SPY&frequency=weekly" : "/niveles-estadisticos?asset=SPY&frequency=weekly";
  const path = sparklinePath(data.sparkline);
  const pricePosition = scalePosition(data.latestClose, data.weeklyScale.low, data.weeklyScale.high);

  const metrics = [
    { label: text.latestClose, value: formatPrice(data.latestClose, locale) },
    { label: text.percentile, value: formatPercentile(data.extensionPercentile, locale) },
    { label: text.zScore, value: formatNumber(data.zScore, locale) },
    { label: text.distance, value: formatPercent(data.distanceToLongAverage, locale) },
    { label: text.weeklyRange, value: formatRange(data.weeklyRange.low, data.weeklyRange.high, locale) },
    { label: text.monthlyRange, value: formatRange(data.monthlyRange.low, data.monthlyRange.high, locale) },
  ];

  return (
    <section className="mt-8 rounded-[6px] border border-line bg-white/80 shadow-[0_14px_38px_rgba(11,52,54,0.045)]">
      <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col border-b border-line p-5 md:p-7 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{text.label}</p>
          <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-ink md:text-4xl">{text.title}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">{text.subtitle}</p>
          <p className="mt-5 border-l border-petrol/25 pl-4 text-xs leading-5 text-muted">{text.limit}</p>
          <Link href={labHref} className="mt-7 w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
            {text.cta}
          </Link>
        </div>

        <div className="p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{data.ticker}</p>
              <p className="mt-2 text-4xl font-semibold text-ink">{formatPrice(data.latestClose, locale)}</p>
              {data.latestDate ? <p className="mt-1 text-xs text-muted">{data.latestDate}</p> : null}
            </div>
            <div className="min-w-[13rem] rounded-[4px] border border-line bg-paper p-3">
              <p className="text-xs text-muted">{text.percentile}</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{formatPercentile(data.extensionPercentile, locale)}</p>
            </div>
          </div>

          <div className="mt-6 h-16 border-y border-line/70 py-3">
            {path ? (
              <svg viewBox="0 0 100 40" className="h-full w-full" role="img" aria-label="SPY compact price path" preserveAspectRatio="none">
                <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-petrol" vectorEffect="non-scaling-stroke" />
              </svg>
            ) : (
              <div className="flex h-full items-center text-xs text-muted">{text.na}</div>
            )}
          </div>

          <div className="mt-5">
            <div className="relative h-2 rounded-full bg-panelSoft">
              <div className="absolute inset-0 rounded-full border border-line" />
              {pricePosition === null ? null : (
                <span className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-petrol" style={{ left: `${pricePosition}%` }} />
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>{formatPrice(data.weeklyScale.low, locale)}</span>
              <span>{formatPrice(data.weeklyScale.high, locale)}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[4px] border border-line bg-paper p-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{metric.label}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
