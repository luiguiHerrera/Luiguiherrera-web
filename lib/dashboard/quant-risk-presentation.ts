import { translateDashboardText } from "./translate-dashboard-copy.ts";
import type { DataStatus, QuantRiskData } from "./types.ts";

export type QuantRiskLocale = "es" | "en";
export type QuantRiskReadinessState = "available" | "fallback" | "insufficient";

const copy = {
  es: {
    eyebrow: "Riesgo cuantitativo",
    title: "Condiciones estadísticas",
    description: "Estos modelos aportan contexto estadístico sobre el riesgo bajo supuestos históricos; no predicen por sí solos el comportamiento del mercado.",
    showContext: "Mostrar contexto",
    hideContext: "Ocultar contexto",
    fragility: "Fragilidad",
    ewma: "Volatilidad EWMA",
    garch: "Volatilidad GARCH",
    correlation: "Correlación promedio",
    insufficient: "Datos insuficientes",
    available: "Disponible",
    estimated: "Estimado",
    fallback: "Fallback EWMA",
    dispersion: "Dispersión sectorial",
    modelState: "Estado del modelo",
    modelReliability: "Modelo y fiabilidad",
    interpretation: "Interpretación prudente",
    sourceMethodology: "Fuente y metodología",
    source: "Fuente",
    updated: "Actualización",
    frequency: "Frecuencia",
    model: "Modelo",
    modelScope: "Cálculos propios sobre retornos diarios de ETFs sectoriales.",
    demoInterpretation: "Los modelos no disponen de historial automático suficiente. Las métricas dependientes del modelo permanecen como datos insuficientes y la dispersión visible procede del escenario demo.",
  },
  en: {
    eyebrow: "Quantitative risk",
    title: "Statistical conditions",
    description: "These models provide statistical context for risk under historical assumptions; they do not predict market behavior on their own.",
    showContext: "Show context",
    hideContext: "Hide context",
    fragility: "Fragility",
    ewma: "EWMA volatility",
    garch: "GARCH volatility",
    correlation: "Average correlation",
    insufficient: "Not enough data",
    available: "Available",
    estimated: "Estimated",
    fallback: "EWMA fallback",
    dispersion: "Sector dispersion",
    modelState: "Model state",
    modelReliability: "Model and reliability",
    interpretation: "Prudent interpretation",
    sourceMethodology: "Source and methodology",
    source: "Source",
    updated: "Updated",
    frequency: "Frequency",
    model: "Model",
    modelScope: "Own calculations using daily returns from sector ETFs.",
    demoInterpretation: "The models do not have enough automated history. Model-dependent metrics remain unavailable, and the visible dispersion comes from the demo scenario.",
  },
} as const;

const statusLabels: Record<QuantRiskLocale, Record<DataStatus, string>> = {
  es: {
    demo: "Datos demo",
    manual: "Datos manuales",
    live_pending: "Pendiente de automatización",
    automated: "Datos automatizados",
    fallback: "Fallback demo",
    delayed: "Actualización pendiente",
    unavailable: "Datos temporalmente no disponibles",
  },
  en: {
    demo: "Demo data",
    manual: "Manual data",
    live_pending: "Automation pending",
    automated: "Automated data",
    fallback: "Demo fallback",
    delayed: "Update pending",
    unavailable: "Data temporarily unavailable",
  },
};

function formatPercent(value: number | null, locale: QuantRiskLocale) {
  if (value === null) return copy[locale].insufficient;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCorrelation(value: number | null, locale: QuantRiskLocale) {
  return value === null ? copy[locale].insufficient : value.toFixed(2);
}

function translateDynamic(value: string, locale: QuantRiskLocale) {
  return locale === "en" ? translateDashboardText(value) : value;
}

export function buildQuantRiskPresentation(data: QuantRiskData, locale: QuantRiskLocale) {
  const labels = copy[locale];
  const fragilityAvailable = data.modelStatus !== "insufficient_data";
  const fragilityLabel = locale === "en"
    ? ({ Baja: "Low", Media: "Medium", Alta: "High" } as const)[data.fragilityLabel]
    : data.fragilityLabel;
  const garchState: QuantRiskReadinessState = data.garchVolForecast === null || data.modelStatus === "insufficient_data"
    ? "insufficient"
    : data.modelStatus === "fallback_ewma" ? "fallback" : "available";
  const readinessLabel = (state: QuantRiskReadinessState) => {
    if (state === "fallback") return labels.fallback;
    if (state === "insufficient") return labels.insufficient;
    return labels.available;
  };
  const modelState = data.modelStatus === "estimated"
    ? labels.estimated
    : data.modelStatus === "fallback_ewma" ? labels.fallback : labels.insufficient;

  return {
    copy: labels,
    status: statusLabels[locale][data.dataStatus],
    statusTone: data.dataStatus === "automated" ? "positive" as const : data.dataStatus === "demo" || data.dataStatus === "fallback" ? "warning" as const : "neutral" as const,
    primaryMetrics: [
      {
        id: "fragility",
        label: labels.fragility,
        value: fragilityAvailable ? `${data.fragilityScore}/100 · ${fragilityLabel}` : labels.insufficient,
        available: fragilityAvailable,
      },
      {
        id: "ewma",
        label: labels.ewma,
        value: formatPercent(data.ewmaVolAnnualized, locale),
        available: data.ewmaVolAnnualized !== null,
      },
      {
        id: "garch",
        label: labels.garch,
        value: formatPercent(data.garchVolForecast, locale),
        available: data.garchVolForecast !== null && data.modelStatus !== "insufficient_data",
        note: garchState === "fallback" ? labels.fallback : null,
      },
      {
        id: "correlation",
        label: labels.correlation,
        value: formatCorrelation(data.averageCorrelation21d, locale),
        available: data.averageCorrelation21d !== null,
      },
    ],
    dispersion: [
      { label: "1W", value: formatPercent(data.sectorDispersion1w, locale) },
      { label: "1M", value: formatPercent(data.sectorDispersion1m, locale) },
    ],
    modelState,
    readiness: [
      { id: "ewma", label: "EWMA", state: data.ewmaVolAnnualized === null ? "insufficient" as const : "available" as const },
      { id: "garch", label: "GARCH", state: garchState },
      { id: "correlation", label: labels.correlation, state: data.averageCorrelation21d === null ? "insufficient" as const : "available" as const },
    ].map((item) => ({ ...item, value: readinessLabel(item.state) })),
    interpretation: data.dataStatus === "demo" || data.dataStatus === "fallback"
      ? labels.demoInterpretation
      : translateDynamic(data.reliabilityNote, locale),
    sourceName: translateDynamic(data.sourceName, locale),
    lastUpdated: translateDynamic(data.lastUpdated, locale),
    updateFrequency: translateDynamic(data.updateFrequency, locale),
  };
}
