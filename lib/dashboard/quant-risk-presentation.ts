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
    ewma: "EWMA · Cesta sectorial",
    garch: "GARCH(1,1) · Cesta sectorial",
    annualized: "Volatilidad anualizada",
    fixedParameters: "Parámetros fijos",
    historicalMeasures: "Pérdidas históricas y concentración sectorial",
    es: "ES95 histórico · SPY · 1 sesión",
    esHelp: "Pérdida media del 5% de sesiones más adversas de la ventana histórica utilizada",
    var: "VaR95 histórico · SPY · 1 sesión",
    varHelp: "Umbral de pérdida correspondiente al percentil 95 de la distribución histórica",
    absorption: "Absorption ratio sectorial",
    absorptionHelp: "Proporción de la variación conjunta de los sectores concentrada en los dos primeros componentes principales",
    lossUnit: "Pérdida a una sesión",
    varianceUnit: "Varianza explicada",
    dataThrough: "Datos hasta",
    noDate: "Sin una ventana válida disponible",
    spyScope: "SPY · exposición larga sin apalancamiento · USD · 95% · 1 sesión",
    spyMethod: "Simulación histórica simple sobre 1.260 retornos diarios (1.261 cierres ajustados por splits y distribuciones). r[t] = P[t] / P[t−1] − 1; L[t] = −r[t]. ES95: media de las 63 mayores pérdidas. VaR95: cuantil empírico de rango más próximo (nearest rank), posición 1.197 de 1.260 pérdidas ordenadas de menor a mayor. Ventana declarada de esta aplicación, aproximadamente cinco años de sesiones.",
    spyLimits: "Son porcentajes de pérdida histórica a una sesión, sin anualizar. No representan una pérdida máxima, una probabilidad de caída ni una previsión condicionada a la volatilidad actual. Las pérdidas negativas, si las hubiera, se conservan como resultado matemático.",
    absorptionScope: "11 ETF sectoriales · 2 componentes · 500 sesiones",
    absorptionMethod: "Retornos diarios ajustados y alineados por fecha. Covarianza con ponderación exponencial, semivida de 250 sesiones y centrado con la media ponderada. PCA sobre covarianzas: AR = (λ₁ + λ₂) / Σλ. Universo y parámetros fijos; no se sustituyen covarianzas por correlaciones ni se reducen los 11 ETF.",
    absorptionLimits: "Un valor mayor indica más concentración de la variación en esos componentes. No es una probabilidad ni una señal automática de caída. Aplicación sectorial de Kritzman, Li, Page y Rigobon; no es una serie oficial ni una réplica exacta del universo del artículo.",
    volatilityMethod: "Cesta equiponderada de los 11 ETF sectoriales, con rebalanceo diario implícito. EWMA: λ = 0,94. GARCH(1,1): α = 0,06 y β = 0,90 fijos; ω = 0,04 × varianza muestral. No se estiman parámetros por máxima verosimilitud. Ambas volatilidades se anualizan con √252; no son volatilidades de SPY.",
    readingDistinctions: "VIX y su curva VX describen volatilidad implícita y precios de futuros por vencimiento. EWMA/GARCH describen volatilidad de la cesta sectorial; ES/VaR, pérdidas históricas de SPY; absorption ratio, concentración de la variación sectorial. EWMA, GARCH y ES no son tres confirmaciones independientes.",
    retained: "Se conserva el último resultado válido con su fecha original.",
    observationWindow: "Ventana de retornos",
    sourceAdjustment: "Ajuste de precios",
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
    modelScope: "11 ETF: XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV y XLY. Retornos diarios de cierres sin ajustar de Alpha Vantage, con la ventana disponible del proveedor compacto; correlación promedio a 21 sesiones. ES/VaR y absorption ratio utilizan el histórico ajustado identificado por separado.",
    demoInterpretation: "Los modelos no disponen de historial automático suficiente. Las métricas dependientes del modelo permanecen como datos insuficientes y la dispersión visible procede del escenario demo.",
    unavailableInterpretation: "El histórico sectorial completo no está disponible para EWMA y GARCH. Las pérdidas históricas de SPY y la concentración sectorial se muestran por separado, con sus propios datos y fechas.",
  },
  en: {
    eyebrow: "Quantitative risk",
    title: "Statistical conditions",
    description: "These models provide statistical context for risk under historical assumptions; they do not predict market behavior on their own.",
    showContext: "Show context",
    hideContext: "Hide context",
    ewma: "EWMA · Sector basket",
    garch: "GARCH(1,1) · Sector basket",
    annualized: "Annualized volatility",
    fixedParameters: "Fixed parameters",
    historicalMeasures: "Historical losses and sector concentration",
    es: "Historical ES95 · SPY · 1 session",
    esHelp: "Average loss in the worst 5% of sessions in the historical window used",
    var: "Historical VaR95 · SPY · 1 session",
    varHelp: "Loss threshold at the 95th percentile of the historical distribution",
    absorption: "Sector absorption ratio",
    absorptionHelp: "Share of joint sector variation concentrated in the first two principal components",
    lossUnit: "One-session loss",
    varianceUnit: "Variance explained",
    dataThrough: "Data through",
    noDate: "No valid window available",
    spyScope: "SPY · unlevered long exposure · USD · 95% · 1 session",
    spyMethod: "Simple historical simulation using 1,260 daily returns (1,261 closes adjusted for splits and distributions). r[t] = P[t] / P[t−1] − 1; L[t] = −r[t]. ES95: mean of the 63 largest losses. VaR95: nearest-rank empirical quantile, rank 1,197 of 1,260 losses sorted from lowest to highest. This application uses a declared window of approximately five trading years.",
    spyLimits: "These are one-session historical loss percentages, without annualization. They are not a maximum loss, a probability of decline or a forecast conditioned on current volatility. Negative losses, if any, are preserved as a mathematical result.",
    absorptionScope: "11 sector ETFs · 2 components · 500 sessions",
    absorptionMethod: "Adjusted daily returns aligned by date. Exponentially weighted covariance with a 250-session half-life and centering using the corresponding weighted mean. Covariance PCA: AR = (λ₁ + λ₂) / Σλ. Universe and parameters remain fixed; covariances are not replaced with correlations and all 11 ETFs are required.",
    absorptionLimits: "A higher value indicates more variation concentrated in those components. It is not a probability or an automatic signal of a decline. A sector application of Kritzman, Li, Page and Rigobon; not an official series or an exact replication of the paper’s universe.",
    volatilityMethod: "Equally weighted basket of the 11 sector ETFs with implicit daily rebalancing. EWMA: λ = 0.94. GARCH(1,1): fixed α = 0.06 and β = 0.90; ω = 0.04 × sample variance. Parameters are not estimated by maximum likelihood. Both volatilities are annualized using √252; they are not SPY volatilities.",
    readingDistinctions: "VIX and its VX curve describe implied volatility and futures prices by expiry. EWMA/GARCH describe sector-basket volatility; ES/VaR describe SPY historical losses; the absorption ratio describes concentration of sector variation. EWMA, GARCH and ES are not three independent confirmations.",
    retained: "The last valid result is retained with its original date.",
    observationWindow: "Return window",
    sourceAdjustment: "Price adjustment",
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
    modelScope: "11 ETFs: XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV and XLY. Alpha Vantage unadjusted daily close returns over the available compact-provider window; average correlation over 21 sessions. ES/VaR and the absorption ratio use the adjusted history identified separately.",
    demoInterpretation: "The models do not have enough automated history. Model-dependent metrics remain unavailable, and the visible dispersion comes from the demo scenario.",
    unavailableInterpretation: "Complete sector history is unavailable for EWMA and GARCH. SPY historical losses and sector concentration are shown separately, with their own data and dates.",
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
  if (value === null || !Number.isFinite(value)) return copy[locale].insufficient;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCorrelation(value: number | null, locale: QuantRiskLocale) {
  return value === null || !Number.isFinite(value) ? copy[locale].insufficient : value.toFixed(2);
}

function translateDynamic(value: string, locale: QuantRiskLocale) {
  if (locale === "en" && value === "Cálculos propios sobre ETFs sectoriales vía Alpha Vantage") return "Own calculations on sector ETFs via Alpha Vantage";
  return locale === "en" ? translateDashboardText(value) : value;
}

function historicalSourceName(value: string | undefined, locale: QuantRiskLocale) {
  if (!value) return locale === "en" ? "Adjusted-price history pending" : "Histórico de precios ajustados pendiente";
  if (/^Yahoo Finance\b/i.test(value) && /Análisis Cuantitativo|Quantitative Analysis/i.test(value)) return locale === "en" ? "Yahoo Finance · Quantitative Analysis adjusted history" : "Yahoo Finance · histórico ajustado de Análisis Cuantitativo";
  if (/^Yahoo Finance\b/i.test(value)) return locale === "en" ? "Yahoo Finance · adjusted daily closes" : "Yahoo Finance · cierres diarios ajustados";
  return translateDynamic(value, locale);
}

function historicalAdjustment(value: string | undefined, locale: QuantRiskLocale) {
  if (!value) return null;
  if (/split/i.test(value) && /distribution|dividend|distribuciones|distribuci[oó]n/i.test(value)) {
    const field = /adjclose/i.test(value) ? "Yahoo Finance adjclose · " : "";
    return field + (locale === "en" ? "Adjusted for splits and distributions" : "Ajustado por splits y distribuciones");
  }
  return translateDynamic(value, locale);
}

/** Translate data-quality states without exposing provider errors or transport details. */
function historicalRiskReason(reason: string | null | undefined, locale: QuantRiskLocale) {
  if (!reason) return null;
  const english = locale === "en";
  let match = reason.match(/^([A-Z]+) adjusted closes: (\d+)\/(\d+); missing session (\d{4}-\d{2}-\d{2})$/);
  if (match) return english
    ? `${match[1]}: ${match[2]} of ${match[3]} adjusted closes; missing trading session ${match[4]}.`
    : `${match[1]}: ${match[2]} de ${match[3]} cierres ajustados; falta la sesión ${match[4]}.`;
  match = reason.match(/^(?:([A-Z]+): )?(Invalid|Duplicate) adjusted close on (.+)$/);
  if (match) return english
    ? `${match[1] ? `${match[1]}: ` : ""}${match[2] === "Duplicate" ? "Duplicate" : "Invalid"} adjusted close on ${match[3]}.`
    : `${match[1] ? `${match[1]}: ` : ""}Cierre ajustado ${match[2] === "Duplicate" ? "duplicado" : "no válido"} en ${match[3]}.`;
  match = reason.match(/^Trading-session calendar does not include (.+)$/);
  if (match) return english
    ? `The trading-session calendar does not include ${match[1]}.`
    : `El calendario de sesiones no incluye ${match[1]}.`;
  match = reason.match(/^Trading-session calendar: (\d+)\/(\d+) closes$/);
  if (match) return english
    ? `The trading-session calendar contains ${match[1]} of the ${match[2]} required close dates.`
    : `El calendario de sesiones contiene ${match[1]} de las ${match[2]} fechas de cierre necesarias.`;
  if (reason === "Invalid calculation date") return english ? "The calculation date is invalid." : "La fecha de cálculo no es válida.";
  if (reason === "Invalid or duplicate trading-session dates") return english ? "The trading-session calendar contains invalid or duplicate dates." : "El calendario de sesiones contiene fechas no válidas o duplicadas.";
  if (reason === "SPY adjusted-close history is empty") return english ? "SPY adjusted-close history is missing." : "Falta el histórico de cierres ajustados de SPY.";
  if (reason === "Sector adjusted-close history is empty") return english ? "Sector adjusted-close history is missing." : "Falta el histórico de cierres ajustados de los sectores.";
  if (reason === "SPY return distribution is invalid") return english ? "The historical SPY return distribution is invalid." : "La distribución histórica de retornos de SPY no es válida.";
  if (reason === "Absorption ratio requires all 11 fixed sector ETFs, without duplicate symbols") return english
    ? "All 11 fixed sector ETFs are required, with no missing or duplicate symbols."
    : "Se necesitan los 11 ETF sectoriales fijos, sin símbolos ausentes ni duplicados.";
  if (reason === "Sector covariance has no positive variance or is numerically invalid") return english
    ? "The sector covariance has zero total variance or cannot be calculated reliably."
    : "La covarianza sectorial tiene varianza total nula o no puede calcularse de forma válida.";
  if (/adjust.*(?:unverified|not verified)|(?:unverified|not verified).*adjust/i.test(reason)) return english
    ? "The source adjustment for splits and distributions has not been verified."
    : "No se ha verificado el ajuste de la fuente por splits y distribuciones.";
  return english ? "The required adjusted daily history could not be validated." : "No se ha podido validar el histórico diario ajustado requerido.";
}

export function buildQuantRiskPresentation(data: QuantRiskData, locale: QuantRiskLocale) {
  const labels = copy[locale];
  const garchAvailable = data.modelStatus === "estimated" && data.garchVolForecast !== null && Number.isFinite(data.garchVolForecast) && data.garchVolForecast >= 0;
  const garchState: QuantRiskReadinessState = garchAvailable ? "available" : "insufficient";
  const readinessLabel = (state: QuantRiskReadinessState) => {
    if (state === "fallback") return labels.fallback;
    if (state === "insufficient") return labels.insufficient;
    return labels.available;
  };
  const modelState = garchAvailable ? labels.fixedParameters : labels.insufficient;
  const historical = data.historicalRisk;
  const formatMetric = (value: number | null | undefined, decimals = 2) => value == null || !Number.isFinite(value)
    ? labels.insufficient
    : `${new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value * 100)}%`;
  const dateLabel = (date: string | null | undefined) => date
    ? `${labels.dataThrough} ${date}`
    : labels.noDate;
  const spy = historical?.spy;
  const absorption = historical?.absorption;
  const spyAvailable = spy?.status === "available";
  const absorptionAvailable = absorption?.status === "available";
  const partialAvailability = (spyAvailable || absorptionAvailable) && ["unavailable", "demo", "fallback", "live_pending"].includes(data.dataStatus);
  const spyWindow = locale === "en"
    ? `${spy?.observations ?? 0} / 1,260 daily returns · 1,261 adjusted closes required`
    : `${spy?.observations ?? 0} / 1.260 retornos diarios · se requieren 1.261 cierres ajustados`;
  const absorptionWindow = locale === "en"
    ? `${absorption?.observations ?? 0} / 500 common daily returns · all 11 ETFs required`
    : `${absorption?.observations ?? 0} / 500 retornos diarios comunes · se requieren los 11 ETF`;


  return {
    copy: labels,
    status: partialAvailability ? (locale === "en" ? "Partially available" : "Disponibilidad parcial") : statusLabels[locale][data.dataStatus],
    statusTone: data.dataStatus === "automated" ? "positive" as const : data.dataStatus === "demo" || data.dataStatus === "fallback" ? "warning" as const : "neutral" as const,
    primaryMetrics: [
      {
        id: "ewma",
        label: labels.ewma,
        value: formatPercent(data.ewmaVolAnnualized, locale),
        available: data.ewmaVolAnnualized !== null && Number.isFinite(data.ewmaVolAnnualized),
        note: labels.annualized,
      },
      {
        id: "garch",
        label: labels.garch,
        value: formatPercent(garchAvailable ? data.garchVolForecast : null, locale),
        available: garchAvailable,
        note: `${labels.annualized} · ${labels.fixedParameters}`,
      },
      {
        id: "correlation",
        label: labels.correlation,
        value: formatCorrelation(data.averageCorrelation21d, locale),
        available: data.averageCorrelation21d !== null && Number.isFinite(data.averageCorrelation21d),
      },
    ],
    historicalMetrics: [
      { id: "es95", label: labels.es, value: formatMetric(spyAvailable ? spy?.es95 : null), help: labels.esHelp, unit: labels.lossUnit, date: dateLabel(spy?.lastUpdated), reason: spyAvailable ? null : historicalRiskReason(spy?.reason, locale), available: spyAvailable && spy?.es95 != null && Number.isFinite(spy.es95) },
      { id: "var95", label: labels.var, value: formatMetric(spyAvailable ? spy?.var95 : null), help: labels.varHelp, unit: labels.lossUnit, date: dateLabel(spy?.lastUpdated), reason: spyAvailable ? null : historicalRiskReason(spy?.reason, locale), available: spyAvailable && spy?.var95 != null && Number.isFinite(spy.var95) },
      { id: "absorption", label: labels.absorption, value: formatMetric(absorptionAvailable ? absorption?.ratio : null), help: labels.absorptionHelp, unit: labels.varianceUnit, date: dateLabel(absorption?.lastUpdated), reason: absorptionAvailable ? null : historicalRiskReason(absorption?.reason, locale), available: absorptionAvailable && absorption?.ratio != null && Number.isFinite(absorption.ratio) },
    ],
    historicalSource: historicalSourceName(historical?.sourceName, locale),
    historicalSourceUrl: historical?.sourceUrl ?? null,
    historicalAdjustment: historicalAdjustment(historical?.adjustment, locale),
    historicalRetained: historical?.updateStatus === "retained",
    spyWindow,
    absorptionWindow,
    spyDateRange: spy?.firstReturnDate && spy.lastUpdated ? `${spy.firstReturnDate} – ${spy.lastUpdated}` : null,
    absorptionDateRange: absorption?.firstReturnDate && absorption.lastUpdated ? `${absorption.firstReturnDate} – ${absorption.lastUpdated}` : null,
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
      : data.dataStatus === "unavailable" ? labels.unavailableInterpretation : translateDynamic(data.reliabilityNote, locale),
    sourceName: translateDynamic(data.sourceName, locale),
    lastUpdated: translateDynamic(data.lastUpdated, locale),
    updateFrequency: translateDynamic(data.updateFrequency, locale),
  };
}
