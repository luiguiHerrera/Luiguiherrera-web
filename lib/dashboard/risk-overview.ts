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

  return [
    {
      id: "vix", label: english ? "VIX and structure" : "VIX y estructura",
      value: spotAvailable ? number(vixSpot.latestVix, 2) : unavailable,
      available: spotAvailable,
      detail: english ? `Index points${spotAvailable ? ` · ${dashboardText(locale, vixSpot.vixLevelLabel)}` : ""}` : `Puntos del índice${spotAvailable ? ` · ${vixSpot.vixLevelLabel}` : ""}`,
      date: spotAvailable ? observationDate(vixSpot.lastObservationDate, locale) : undefined,
      secondary: {
        label: english ? "VX futures structure" : "Estructura de futuros VX",
        value: curveAvailable ? dashboardText(locale, vixTermStructure.classification) : unavailable,
        available: Boolean(curveAvailable),
        date: curveAvailable ? observationDate(vixTermStructure.lastUpdated, locale) : undefined,
      },
    },
    {
      id: "ewma-garch", label: english ? "EWMA · Sector basket" : "EWMA · Cesta sectorial",
      value: ewma === null ? unavailable : percent(ewma, 1),
      available: ewma !== null,
      detail: english ? "Annualized volatility" : "Volatilidad anualizada",
      date: ewma === null ? undefined : sectorDate,
      secondary: {
        label: "GARCH(1,1)",
        value: garch === null ? unavailable : percent(garch, 1),
        available: garch !== null,
        detail: english ? "Annualized · Fixed parameters" : "Anualizada · Parámetros fijos",
        date: garch === null ? undefined : sectorDate,
      },
    },
    {
      id: "var95", label: "VaR95",
      value: var95 === null ? unavailable : percent(var95 * 100),
      available: var95 !== null,
      detail: english ? "SPY · One-session loss · 1,260 returns" : "SPY · Pérdida a una sesión · 1.260 retornos",
      date: var95 === null ? undefined : observationDate(spy?.lastUpdated, locale),
    },
    {
      id: "absorption", label: english ? "Sector absorption ratio" : "Absorption ratio sectorial",
      value: ratio === null ? unavailable : percent(ratio * 100),
      available: ratio !== null,
      detail: english ? "Variance explained · 11 ETFs · 500 sessions · 2 components" : "Varianza explicada · 11 ETF · 500 sesiones · 2 componentes",
      date: ratio === null ? undefined : observationDate(absorption?.lastUpdated, locale),
    },
  ];
}
