import Link from "next/link";
import {
  formatHomeCurvePointTitle,
  formatHomePreviewNumber,
  type HomePreviewLocale,
} from "@/lib/dashboard/home-preview-format";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import { buildOfrFsiSummary, type OfrFsiSnapshot } from "@/lib/dashboard/ofr-fsi";
import { ofrFsiCopy } from "@/lib/dashboard/ofr-fsi-copy";
import { formatFlowAmount } from "@/lib/dashboard/dashboard-overview";
import { metricAt } from "@/lib/dashboard/capital-flow-comparison.mjs";
import type { CapitalFlowAssetPreview } from "@/lib/dashboard/capital-flows-preview-types";
import { hasVixObservation } from "@/lib/dashboard/vix-presentation";
import type { VixDashboardData, VixTermStructureData, VixTermStructurePoint } from "@/lib/dashboard/types";

type Locale = HomePreviewLocale;

type HomeDashboardPreviewProps = {
  locale: Locale;
  financialEnvironment?: OfrFsiSnapshot | null;
  flows?: CapitalFlowAssetPreview[];
  vix: VixDashboardData | null;
  vixTermStructure: VixTermStructureData | null;
};

const copy = {
  es: {
    title: "Un inversionista entiende el contexto antes de decidir",
    summary: "Entorno financiero, riesgo y flujos en una lectura diaria.",
    cta: "Ver dashboard de mercado",
    credibility: [
      ["traceable", "Datos trazables", "Metodología y datos visibles."],
      ["open", "Fuentes abiertas", "Información pública y verificable."],
      ["educational", "Lectura educativa", "Entiende el contexto; no adivina el futuro."],
    ],
    eyebrow: "Dashboard de mercado",
    environment: "Entorno financiero",
    observed: "Estrés observado · OFR FSI",
    change: "Cambio · 20 sesiones",
    points: "puntos del índice",
    source: "OFR · Escala original",
    retained: "Corte conservado",
    delayed: "Datos retrasados",
    flows: "Flujos ETF · S&P 500",
    oneSession: "1 sesión",
    flowDescription: "Flujo neto estimado · Creaciones menos reembolsos.",
    volatility: "Volatilidad",
    termStructure: "Estructura temporal",
    curve: "Curva mensual VX",
    cutoff: "Corte",
    unavailable: "No disponible",
    volatilityDescriptions: {
      low: "La presión de volatilidad permanece contenida.",
      normal: "La volatilidad se mantiene en un rango normal.",
      watch: "La volatilidad requiere más atención.",
      elevated: "La presión de volatilidad está elevada.",
      stress: "La volatilidad refleja tensión de mercado.",
      extreme: "La volatilidad refleja tensión extrema.",
    },
    chartLabel: "Curva de settlements mensuales VX disponible actualmente",
  },
  en: {
    title: "An investor understands the context before deciding",
    summary: "Financial conditions, risk and flows in one daily read.",
    cta: "View market dashboard",
    credibility: [
      ["traceable", "Traceable data", "Visible data and methodology."],
      ["open", "Open sources", "Public, verifiable information."],
      ["educational", "Educational reading", "Understand context; do not predict the future."],
    ],
    eyebrow: "Market dashboard",
    environment: "Financial environment",
    observed: "Observed stress · OFR FSI",
    change: "Change · 20 sessions",
    points: "index points",
    source: "OFR · Original scale",
    retained: "Retained snapshot",
    delayed: "Delayed data",
    flows: "ETF flows · S&P 500",
    oneSession: "1 session",
    flowDescription: "Estimated net flow · Creations less redemptions.",
    volatility: "Volatility",
    termStructure: "Term structure",
    curve: "Monthly VX curve",
    cutoff: "Data through",
    unavailable: "Unavailable",
    volatilityDescriptions: {
      low: "Volatility pressure remains contained.",
      normal: "Volatility remains within a normal range.",
      watch: "Volatility requires closer attention.",
      elevated: "Volatility pressure is elevated.",
      stress: "Volatility reflects market stress.",
      extreme: "Volatility reflects extreme stress.",
    },
    chartLabel: "Currently available monthly VX settlement curve",
  },
} as const;

function localized(value: string | null | undefined, locale: Locale) {
  return locale === "en" ? translateDashboardText(value) : value ?? "";
}

function SourceDate({ value, locale }: { value: string | null | undefined; locale: Locale }) {
  const date = value?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(parsed);
  return <p className="mt-2 text-xs text-muted" data-home-source-date>{copy[locale].cutoff}: <time dateTime={date}>{label}</time></p>;
}

function CredibilityIcon({ kind }: { kind: string }) {
  if (kind === "traceable") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M5 18V9m7 9V5m7 13v-6M3 20h18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === "open") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4.5 12h15M12 4c2.2 2.3 3.3 5 3.3 8S14.2 17.7 12 20c-2.2-2.3-3.3-5-3.3-8S9.8 6.3 12 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 5.5h10.5A3.5 3.5 0 0 1 19 9v9.5H8.5A3.5 3.5 0 0 1 5 15V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 9h7M8.5 12h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function buildCurve(points: VixTermStructurePoint[]) {
  const available = points.filter((point): point is VixTermStructurePoint & { value: number } => point.value !== null);
  if (available.length === 0) return { path: "", points: [] };
  const min = Math.min(...available.map((point) => point.value));
  const max = Math.max(...available.map((point) => point.value));
  const range = Math.max(max - min, 0.5);
  const chartPoints = available.map((point, index) => ({
    ...point,
    x: available.length === 1 ? 50 : 7 + (index / (available.length - 1)) * 86,
    y: 40 - ((point.value - min) / range) * 26,
  }));
  return {
    path: chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" "),
    points: chartPoints,
  };
}

export function HomeDashboardPreview({
  locale,
  financialEnvironment,
  flows = [],
  vix,
  vixTermStructure,
}: HomeDashboardPreviewProps) {
  const t = copy[locale];
  const dashboardHref = locale === "en" ? "/en/dashboard" : "/dashboard";
  const financial = financialEnvironment && financialEnvironment.refreshStatus !== "unavailable"
    ? buildOfrFsiSummary(financialEnvironment.dataset) : null;
  const ofr = ofrFsiCopy[locale];
  const indexValue = financial?.latest?.fsi;
  const indexAvailable = typeof indexValue === "number" && Number.isFinite(indexValue);
  const delta = financial?.delta20;
  const deltaLabel = delta == null ? t.unavailable : new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
    minimumFractionDigits: 3, maximumFractionDigits: 3, signDisplay: "exceptZero",
  }).format(delta);
  const sp500 = flows.find(flow => flow.id === "sp500");
  const flowIndex = sp500?.points.findIndex(point => point.date === sp500.cutoffDate) ?? -1;
  const flowValue = sp500 && flowIndex >= 0 ? metricAt(sp500.points, 1, flowIndex) : null;
  const flowAvailable = flowValue != null && Number.isFinite(flowValue);
  const spot = hasVixObservation(vix?.spot) ? vix.spot : null;
  const volatilityDescription = spot ? t.volatilityDescriptions[spot.vixSeverity] ?? t.unavailable : t.unavailable;
  const curve = buildCurve(vixTermStructure?.points ?? []);
  const firstPoint = curve.points[0];
  const lastPoint = curve.points.at(-1);
  const curveState = vixTermStructure ? localized(vixTermStructure.classification, locale) : t.unavailable;

  return (
    <section className="border-b border-line bg-paper" aria-labelledby={locale === "en" ? "market-preview-title-en" : "market-preview-title-es"} data-home-dashboard-preview>
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 md:px-5 md:py-16 lg:grid-cols-[0.36fr_0.64fr] lg:items-center lg:gap-12">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{t.eyebrow}</p>
          <h2 id={locale === "en" ? "market-preview-title-en" : "market-preview-title-es"} className="mt-4 text-3xl font-semibold leading-[1.08] text-ink md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">{t.summary}</p>

          <div className="mt-7 grid gap-4" data-home-credibility>
            {t.credibility.map(([kind, title, description]) => (
              <div key={kind} className="grid grid-cols-[1.75rem_1fr] gap-3">
                <span className="mt-0.5 text-brass"><CredibilityIcon kind={kind} /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href={dashboardHref} className="mt-8 inline-flex min-h-11 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(11,52,54,0.14)] transition hover:bg-panel hover:text-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
            {t.cta} <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="technical-surface relative min-w-0 overflow-hidden rounded-[6px] border border-petrol/15 p-3 sm:p-5 md:p-7 lg:p-8" data-home-product-composition>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-paper/60" aria-hidden="true" />
          <div className="relative">
            <article className="ml-auto max-w-2xl rounded-[6px] border border-petrol/25 bg-white/90 p-5 shadow-[0_22px_52px_rgba(11,52,54,0.09)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_58px_rgba(11,52,54,0.12)] md:p-6 lg:ml-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{t.environment}</p>
                  <p className="mt-3 text-xs text-muted">{t.observed}</p>
                  <h3 className="mt-1 text-3xl font-semibold leading-tight tabular-nums text-ink md:text-4xl" data-home-ofr-value>
                    {indexAvailable ? formatHomePreviewNumber(indexValue, locale, 3) : t.unavailable}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t.change}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-ink" data-home-ofr-change>{deltaLabel}</p>
                  <p className="mt-1 text-xs text-muted">{t.points}</p>
                  {financial && delta != null ? <p className="mt-1 text-xs font-semibold text-petrol">{ofr.trend[financial.trend]}</p> : null}
                </div>
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-sm font-medium text-ink">{indexAvailable && financial ? ofr.average[financial.state] : t.unavailable}</p>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  {indexAvailable ? <SourceDate value={financial?.latest?.date} locale={locale} /> : null}
                  <p className="text-[11px] text-muted">{financialEnvironment?.refreshStatus === "retained" ? t.retained : t.source}</p>
                </div>
              </div>
            </article>

            <div className="relative z-10 mt-3 grid gap-3 md:grid-cols-2 lg:-mt-1 lg:mr-5">
              <article className="rounded-[6px] border border-line bg-white/95 p-4 shadow-[0_14px_34px_rgba(11,52,54,0.065)] transition duration-200 hover:-translate-y-0.5 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t.flows}</p>
                  <span className="shrink-0 text-[10px] font-semibold text-muted">{t.oneSession}</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold tabular-nums text-ink" data-home-sp500-flow>
                  {flowAvailable ? formatFlowAmount(flowValue, locale) : t.unavailable}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{sp500?.vehicles.join(" · ") || t.flowDescription}</p>
                {flowAvailable ? <SourceDate value={sp500?.cutoffDate} locale={locale} /> : null}
                {flowAvailable && sp500?.refreshStatus && sp500.refreshStatus !== "current" ? <p className="mt-1 text-xs text-muted">{sp500.refreshStatus === "delayed" ? t.delayed : t.retained}</p> : null}
              </article>

              <article className="rounded-[6px] border border-line bg-white/95 p-4 shadow-[0_14px_34px_rgba(11,52,54,0.065)] transition duration-200 hover:-translate-y-0.5 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t.volatility}</p>
                    <h3 className="mt-2 text-xl font-semibold tabular-nums text-ink">
                      {spot ? formatHomePreviewNumber(spot.latestVix, locale, 2) : t.unavailable}
                      <span className="ml-2 text-sm font-medium text-muted">VIX</span>
                    </h3>
                  </div>
                  <span className="rounded-[4px] border border-brass/30 bg-[#f7f0e2] px-2 py-1 text-[10px] font-semibold text-brass">
                    {spot ? localized(spot.vixCompositeLabel, locale) : t.unavailable}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{volatilityDescription}</p>
                {spot ? <SourceDate value={spot.lastObservationDate} locale={locale} /> : null}
              </article>
            </div>

            <article className="relative z-20 mt-3 rounded-[6px] border border-petrol/15 bg-panel/95 p-4 shadow-[0_16px_38px_rgba(11,52,54,0.07)] md:p-5 lg:mx-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t.termStructure}</p>
                  <h3 className="mt-1.5 text-sm font-semibold text-ink">{t.curve}</h3>
                </div>
                <span className="text-xs font-semibold text-petrol">{curveState}</span>
              </div>
              {curve.points.length ? <SourceDate value={vixTermStructure?.lastUpdated} locale={locale} /> : null}

              {curve.points.length ? (
                <>
                  <svg viewBox="0 0 100 48" className="mt-3 h-28 w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label={t.chartLabel}>
                    <line x1="7" x2="93" y1="40" y2="40" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    <path d={curve.path} fill="none" stroke="#0b3436" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    {curve.points.map((point) => (
                      <g key={point.label}>
                        <circle cx={point.x} cy={point.y} r="1.4" fill="#9a7a44">
                          <title>{formatHomeCurvePointTitle(point.label, point.value, locale)}</title>
                        </circle>
                      </g>
                    ))}
                  </svg>
                  <div className="mt-1 flex justify-between text-[10px] font-semibold text-muted">
                    <span>{firstPoint?.label} · {formatHomePreviewNumber(firstPoint?.value, locale, 2)}</span>
                    <span>{lastPoint?.label} · {formatHomePreviewNumber(lastPoint?.value, locale, 2)}</span>
                  </div>
                </>
              ) : (
                <div className="mt-4 flex h-24 items-center justify-center border-y border-line text-sm text-muted">{t.unavailable}</div>
              )}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
