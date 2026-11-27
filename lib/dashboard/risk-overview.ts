import { riskReferenceText, referenceYears, type IndicatorReference } from './indicator-history';
import { dashboardText, type DashboardLocale } from "./dashboard-localization.ts";
import type { DashboardOverviewItem } from "./dashboard-overview.ts";
import { hasVixObservation } from "./vix-presentation.ts";
import type { QuantRiskData, VixSpotData, VixTermStructureData } from "./types.ts";

type RiskOverviewInput = {
  quantRisk: QuantRiskData | null | undefined;
  vixSpot: VixSpotData | null | undefined;
  vixTermStructure: VixTermStructureData | null | undefined;
};

function observationDate(value: string | null | undefined, locale: DashboardLocale) {
  let date = value?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  // The existing VX adapter stores es-CO display dates in lastUpdated, while
  // the other sources store ISO dates. Decode that existing source convention
  // before formatting either language; never borrow the spot's date.
  if (!date && value) {
    const months: Record<string, string> = {
      ene: "01", enero: "01", feb: "02", febrero: "02", mar: "03", marzo: "03",
      abr: "04", abril: "04", may: "05", mayo: "05", jun: "06", junio: "06",
      jul: "07", julio: "07", ago: "08", agosto: "08", sep: "09", sept: "09",
      septiembre: "09", setiembre: "09", oct: "10", octubre: "10", nov: "11", noviembre: "11", dic: "12", diciembre: "12",
    };
    const formatted = value.toLowerCase().match(/(?:^|\D)(\d{1,2})\s+(?:de\s*)?([a-z]+)\.?\s+(?:de\s*)?(\d{4})(?:\D|$)/);
    const month = formatted && months[formatted[2]];
    if (formatted && month) date = `${formatted[3]}-${month}-${formatted[1].padStart(2, "0")}`;
  }
  if (!date) return undefined;
  const instant = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== date) return undefined;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(instant);
}

/** Summary presentation only. Every model keeps its source, date and units. */
export function buildRiskOverview({ quantRisk, vixSpot, vixTermStructure }: RiskOverviewInput, locale: DashboardLocale = "es"): DashboardOverviewItem[] {
  const english = locale === "en";
  const unavailable = english ? "Unavailable" : "No disponible";
  const number = (value: number, digits: number) => new Intl.NumberFormat(english ? "en-US" : "es-ES", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(value).replace(/-/g, "−");
  const percent = (value: number, digits = 2) => `${number(value, digits)}%`;
  const sectorReady = quantRisk && !["unavailable", "demo", "fallback", "live_pending"].includes(quantRisk.dataStatus);
  const ewma = sectorReady && quantRisk.ewmaVolAnnualized !== null && Number.isFinite(quantRisk.ewmaVolAnnualized) && quantRisk.ewmaVolAnnualized >= 0
    ? quantRisk.ewmaVolAnnualized : null;
  const garch = sectorReady && quantRisk.modelStatus === "estimated" && quantRisk.garchVolForecast !== null && Number.isFinite(quantRisk.garchVolForecast) && quantRisk.garchVolForecast >= 0
    ? quantRisk.garchVolForecast : null;
  const spotAvailable = hasVixObservation(vixSpot);
  const curveAvailable = vixTermStructure && !["unavailable", "pending"].includes(vixTermStructure.sourceStatus);
  const spy = quantRisk?.historicalRisk?.spy;
  const var95 = spy?.status === "available" && spy.observations === 1260 && spy.var95 !== null && Number.isFinite(spy.var95) ? spy.var95 : null;
  const absorption = quantRisk?.historicalRisk?.absorption;
  const ratio = absorption?.status === "available" && absorption.observations === 500 && absorption.ratio !== null && Number.isFinite(absorption.ratio) && absorption.ratio >= 0 && absorption.ratio <= 1
    ? absorption.ratio : null;
  const sectorDate = observationDate(quantRisk?.lastUpdated, locale);

  const reference = (ref:IndicatorReference|null|undefined, scale=100, unit='pp', digits=1) => {
    const text=riskReferenceText(ref,locale,scale,unit,digits);
    return text && ref ? {text,period:ref.percentile===null ? referenceYears(ref.comparisonDate,ref.cutoff,ref.observations) : referenceYears(ref.start,ref.end,ref.observations)} : undefined;
  };
  return [
    {
      id: "vix", help:english ? "VIX expresses annualized S&P 500 implied volatility over roughly 30 days. Its change is stated in percentage points (pp) of that volatility, not as a return. The percentile ranks the level against previous closes; it is not a probability of a market decline. The reference shows years and n valid readings. Exact dates and calculations remain in View detail." : "El VIX expresa la volatilidad implícita anualizada del S&P 500 a unos 30 días. La variación se expresa en puntos porcentuales (pp) de esa volatilidad: no es una rentabilidad. El percentil compara el nivel con sus cierres anteriores; no es una probabilidad de caída. La referencia muestra los años y n de lecturas válidas. Las fechas exactas y el cálculo están en Ver detalle.", reference:spotAvailable ? reference(vixSpot.historicalReference,1,"pp") : undefined, label: english ? "VIX and structure" : "VIX y estructura",
      value: spotAvailable ? number(vixSpot.latestVix, 2) : unavailable,
      available: spotAvailable,
      detail: english ? `Index points${spotAvailable ? ` · ${dashboardText(locale, vixSpot.vixLevelLabel)}` : ""}` : `Puntos del índice${spotAvailable ? ` · ${vixSpot.vixLevelLabel}` : ""}`,
      date: spotAvailable ? observationDate(vixSpot.lastObservationDate, locale) : undefined,
      secondary: {
        label: english ? "VX futures structure" : "Estructura de futuros VX",
        help:english ? "Shape of the verified monthly VX futures settlement curve. Contango and backwardation describe prices across maturities; they do not predict SPY returns. The settlement date belongs to the curve and can differ from the spot VIX date." : "Forma de la curva de liquidaciones verificadas de los futuros mensuales VX. Contango y backwardation describen los precios entre vencimientos; no predicen la rentabilidad de SPY. Su fecha de liquidación es propia y puede diferir de la del VIX al contado.",
        value: curveAvailable ? dashboardText(locale, vixTermStructure.classification) : unavailable,
        available: Boolean(curveAvailable),
        date: curveAvailable ? observationDate(vixTermStructure.lastUpdated, locale) : undefined,
      },
    },
    {
      id: "ewma-garch", help:english ? "Annualized volatility of the equal-weight basket of 11 sector ETFs, with more weight on recent returns (λ = 0.94). It does not indicate market direction. A retained snapshot keeps its original date. No percentile is shown because a compatible retained history of the model outputs is unavailable." : "Volatilidad anualizada de la cesta equiponderada de los 11 ETF sectoriales, con más peso para los retornos recientes (λ = 0,94). No indica dirección del mercado. El corte conservado mantiene su fecha original. Se omite el percentil porque no existe una serie histórica retenida compatible.", label: english ? "EWMA · Sector basket" : "EWMA · Cesta sectorial",
      value: ewma === null ? unavailable : percent(ewma, 1),
      available: ewma !== null,
      detail: (english ? "Annualized volatility" : "Volatilidad anualizada") + (quantRisk?.refreshStatus === "retained" ? (english ? " · Retained snapshot" : " · Corte conservado") : ""),
      date: ewma === null ? undefined : sectorDate,
      secondary: {
        label: "GARCH(1,1)",
        help:english ? "Annualized volatility forecast for the same sector basket with fixed α = 0.06 and β = 0.90. It models conditional variance, not market direction. A retained snapshot keeps its date; no historical percentile is inferred from a different model or universe." : "Estimación de volatilidad anualizada para la misma cesta sectorial, con α = 0,06 y β = 0,90 fijos. Modela la varianza condicional, no la dirección del mercado. El corte conservado mantiene su fecha; no se infiere un percentil histórico de otro modelo o universo.",
        value: garch === null ? unavailable : percent(garch, 1),
        available: garch !== null,
        detail: (english ? "Annualized · Fixed parameters" : "Anualizada · Parámetros fijos") + (quantRisk?.refreshStatus === "retained" ? (english ? " · Retained snapshot" : " · Corte conservado") : ""),
        date: garch === null ? undefined : sectorDate,
      },
    },
    {
      id: "var95", help:english ? "SPY one-day loss threshold estimated from 1,260 historical returns: the 95th percentile of losses. The Percentile shown below instead compares the current VaR with its own past values; it is not a probability of a market decline. Δ20 is the difference in pp from 20 sessions earlier. View detail retains exact dates and the method." : "Umbral de pérdida diaria de SPY estimado con 1.260 retornos históricos: corresponde al percentil 95 de sus pérdidas. El Percentil mostrado debajo compara el valor actual de ese VaR con sus valores pasados; es otra referencia, no una probabilidad de caída. Δ20 es la diferencia en pp respecto de 20 sesiones antes. Ver detalle conserva las fechas exactas y el método.", reference:var95===null ? undefined : reference(quantRisk?.historicalRisk?.references?.var95,100,"pp",2), label: "VaR95",
      value: var95 === null ? unavailable : percent(var95 * 100),
      available: var95 !== null,
      detail: english ? "SPY · One-session loss · 1,260 returns" : "SPY · Pérdida a una sesión · 1.260 retornos",
      date: var95 === null ? undefined : observationDate(spy?.lastUpdated, locale),
    },
    {
      id: "absorption", help:english ? "Share of the joint variance of 11 sector ETFs explained by the first two principal components. A higher value indicates greater concentration of that variation. It uses 500 sessions with exponential weighting and a 250-session half-life. Δ20 is in pp. The percentile ranks the indicator against its own history, not a probability of a market decline." : "Fracción de la varianza conjunta de los 11 ETF sectoriales explicada por los dos primeros componentes principales. Un valor mayor indica mayor concentración de esa variación. Usa 500 sesiones y ponderación exponencial con semivida 250. Δ20 se expresa en pp. El percentil compara el indicador con su propio histórico, no mide una probabilidad de caída.", reference:ratio===null ? undefined : reference(quantRisk?.historicalRisk?.references?.absorption), label: english ? "Sector absorption ratio" : "Absorption ratio sectorial",
      value: ratio === null ? unavailable : percent(ratio * 100),
      available: ratio !== null,
      detail: english ? "Variance explained · 11 ETFs · 500 sessions · 2 components" : "Varianza explicada · 11 ETF · 500 sesiones · 2 componentes",
      date: ratio === null ? undefined : observationDate(absorption?.lastUpdated, locale),
    },
  ];
}


