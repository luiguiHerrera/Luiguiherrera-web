import Link from "next/link";
import {
  formatHomeCurvePointTitle,
  formatHomePreviewNumber,
  type HomePreviewLocale,
} from "@/lib/dashboard/home-preview-format";
import { translateBiasLabel, translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";
import type { RegimeSummary, SectorRotationData, VixDashboardData, VixTermStructureData, VixTermStructurePoint } from "@/lib/dashboard/types";

type Locale = HomePreviewLocale;

type HomeDashboardPreviewProps = {
  locale: Locale;
  regimeSummary: RegimeSummary;
  sectorRotation: SectorRotationData | null;
  vix: VixDashboardData | null;
  vixTermStructure: VixTermStructureData | null;
};

const copy = {
  es: {
    title: "Un inversionista entiende el contexto antes de decidir",
    summary: "Régimen, riesgo y flujos en una lectura diaria.",
    cta: "Ver dashboard de mercado",
    credibility: [
      ["traceable", "Datos trazables", "Metodología y datos visibles."],
      ["open", "Fuentes abiertas", "Información pública y verificable."],
      ["educational", "Lectura educativa", "Entiende el contexto; no adivina el futuro."],
    ],
    integrated: "Régimen integrado",
    bias: "Sesgo",
    score: "Score",
    confidence: "Confianza",
    caution: "Cautela",
    constructive: "Constructivo",
    rotation: "Rotación",
    volatility: "Volatilidad",
    termStructure: "Estructura temporal",
    curve: "Curva mensual VX",
    unavailable: "No disponible",
    rotationDescriptions: {
      defensiva: "Los sectores defensivos lideran la lectura relativa.",
      growth: "El liderazgo se concentra en sectores de crecimiento.",
      cíclica: "Los sectores cíclicos lideran la lectura relativa.",
      mixta: "El liderazgo sectorial permanece mixto.",
    },
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
    summary: "Regime, risk and flows in one daily read.",
    cta: "View market dashboard",
    credibility: [
      ["traceable", "Traceable data", "Visible data and methodology."],
      ["open", "Open sources", "Public, verifiable information."],
      ["educational", "Educational reading", "Understand context; do not predict the future."],
    ],
    integrated: "Integrated regime",
    bias: "Bias",
    score: "Score",
    confidence: "Confidence",
    caution: "Caution",
    constructive: "Constructive",
    rotation: "Rotation",
    volatility: "Volatility",
    termStructure: "Term structure",
    curve: "Monthly VX curve",
    unavailable: "Unavailable",
    rotationDescriptions: {
      defensiva: "Defensive sectors lead the relative reading.",
      growth: "Leadership is concentrated in growth sectors.",
      cíclica: "Cyclical sectors lead the relative reading.",
      mixta: "Sector leadership remains mixed.",
    },
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

function rotationLabel(data: SectorRotationData | null, locale: Locale) {
  if (!data) return copy[locale].unavailable;
  const labels = locale === "en"
    ? { defensiva: "Defensive", growth: "Growth", cíclica: "Cyclical", mixta: "Mixed" }
    : { defensiva: "Defensiva", growth: "Growth", cíclica: "Cíclica", mixta: "Mixta" };
  return labels[data.metrics.reading];
}

export function HomeDashboardPreview({
  locale,
  regimeSummary,
  sectorRotation,
  vix,
  vixTermStructure,
}: HomeDashboardPreviewProps) {
  const t = copy[locale];
  const dashboardHref = locale === "en" ? "/en/dashboard" : "/dashboard";
  const scoreWidth = regimeSummary.regimeScore === null ? "0%" : `${Math.max(0, Math.min(regimeSummary.regimeScore, 100))}%`;
  const regimeLabel = locale === "en" ? translateRegimeLabel(regimeSummary.current) : regimeSummary.current;
  const biasLabel = locale === "en" ? translateBiasLabel(regimeSummary.bias) : {
    favorable: "Favorable",
    neutral: "Neutral",
    cautious: "Cauteloso",
    stress: "Estrés",
    unavailable: "No disponible",
  }[regimeSummary.bias];
  const rotationReading = sectorRotation?.metrics.reading;
  const rotationDescription = rotationReading ? t.rotationDescriptions[rotationReading] : t.unavailable;
  const spot = vix?.spot;
  const volatilityDescription = spot ? t.volatilityDescriptions[spot.vixSeverity] : t.unavailable;
  const curve = buildCurve(vixTermStructure?.points ?? []);
  const firstPoint = curve.points[0];
  const lastPoint = curve.points.at(-1);
  const curveState = vixTermStructure ? localized(vixTermStructure.classification, locale) : t.unavailable;

  return (
    <section className="border-b border-line bg-paper" aria-labelledby={locale === "en" ? "market-preview-title-en" : "market-preview-title-es"} data-home-dashboard-preview>
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 md:px-5 md:py-16 lg:grid-cols-[0.36fr_0.64fr] lg:items-center lg:gap-12">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Market Regime Dashboard</p>
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
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{t.integrated}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{regimeLabel}</h3>
                  <p className="mt-2 text-sm text-muted">{t.bias}: <span className="font-semibold text-ink">{biasLabel}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-5 text-right">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t.score}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{regimeSummary.regimeScore ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t.confidence}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{regimeSummary.confidence === null ? "—" : `${regimeSummary.confidence}%`}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full border border-line bg-panelSoft">
                <div className="h-full bg-petrol" style={{ width: scoreWidth }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                <span>{t.caution}</span>
                <span>{t.constructive}</span>
              </div>
            </article>

            <div className="relative z-10 mt-3 grid gap-3 md:grid-cols-2 lg:-mt-1 lg:mr-5">
              <article className="rounded-[6px] border border-line bg-white/95 p-4 shadow-[0_14px_34px_rgba(11,52,54,0.065)] transition duration-200 hover:-translate-y-0.5 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t.rotation}</p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{rotationLabel(sectorRotation, locale)}</h3>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sage shadow-[0_0_0_4px_rgba(111,143,130,0.12)]" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{rotationDescription}</p>
              </article>

              <article className="rounded-[6px] border border-line bg-white/95 p-4 shadow-[0_14px_34px_rgba(11,52,54,0.065)] transition duration-200 hover:-translate-y-0.5 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{t.volatility}</p>
                    <h3 className="mt-2 text-xl font-semibold tabular-nums text-ink">
                      {spot?.latestVix === null || spot?.latestVix === undefined ? "—" : formatHomePreviewNumber(spot.latestVix, locale)}
                      <span className="ml-2 text-sm font-medium text-muted">VIX</span>
                    </h3>
                  </div>
                  <span className="rounded-[4px] border border-brass/30 bg-[#f7f0e2] px-2 py-1 text-[10px] font-semibold text-brass">
                    {spot ? localized(spot.vixCompositeLabel, locale) : t.unavailable}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{volatilityDescription}</p>
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
