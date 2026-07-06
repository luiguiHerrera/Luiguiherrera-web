import { averageCorrelation, correlation, ewmaAnnualizedVolatility, garchOneOneForecast, mean } from "@/lib/dashboard/math";
import type { QuantRiskData, SectorEtfSnapshot, SectorRotationMetrics, VolatilityStatus } from "@/lib/dashboard/types";

function toPercent(value: number | null) {
  return value === null ? null : value * 100;
}

function classifyVolatility(volatility: number | null): VolatilityStatus {
  if (volatility === null) return "stress";
  if (volatility >= 0.28) return "stress";
  if (volatility >= 0.18) return "elevated";
  return "normal";
}

function averageDailyMarketReturn(sectors: SectorEtfSnapshot[]) {
  const minLength = Math.min(...sectors.map((sector) => sector.dailyReturns.length));
  if (!Number.isFinite(minLength) || minLength < 21) return [];

  return Array.from({ length: minLength }, (_, index) => {
    const values = sectors.map((sector) => sector.dailyReturns[sector.dailyReturns.length - minLength + index]);
    return mean(values) ?? 0;
  });
}

function defensiveGrowthCorrelation(sectors: SectorEtfSnapshot[], window: number) {
  const defensive = sectors.filter((sector) => sector.group === "defensive");
  const growth = sectors.filter((sector) => sector.group === "growth");
  const minLength = Math.min(
    ...defensive.map((sector) => sector.dailyReturns.length),
    ...growth.map((sector) => sector.dailyReturns.length),
  );

  if (!Number.isFinite(minLength) || minLength < window) return null;

  const defensiveSeries = Array.from({ length: minLength }, (_, index) => {
    const values = defensive.map((sector) => sector.dailyReturns[sector.dailyReturns.length - minLength + index]);
    return mean(values) ?? 0;
  });
  const growthSeries = Array.from({ length: minLength }, (_, index) => {
    const values = growth.map((sector) => sector.dailyReturns[sector.dailyReturns.length - minLength + index]);
    return mean(values) ?? 0;
  });

  return correlation(defensiveSeries.slice(-window), growthSeries.slice(-window));
}

function fragilityLabel(score: number) {
  if (score >= 67) return "Alta";
  if (score >= 34) return "Media";
  return "Baja";
}

export function buildQuantRiskData(sectors: SectorEtfSnapshot[], metrics: SectorRotationMetrics, lastUpdated: string): QuantRiskData {
  const marketReturns = averageDailyMarketReturn(sectors);
  const ewmaVol = ewmaAnnualizedVolatility(marketReturns);
  const priorEwmaVol = marketReturns.length > 42 ? ewmaAnnualizedVolatility(marketReturns.slice(0, -21)) : null;
  const garchVol = garchOneOneForecast(marketReturns);
  const averageCorr21 = averageCorrelation(sectors.map((sector) => sector.dailyReturns), 21);
  const averageCorr63 = averageCorrelation(sectors.map((sector) => sector.dailyReturns), 63);
  const defensiveGrowthCorr21 = defensiveGrowthCorrelation(sectors, 21);
  const garchStatus = classifyVolatility(garchVol ?? ewmaVol);
  const modelStatus = garchVol === null ? (ewmaVol === null ? "insufficient_data" : "fallback_ewma") : "estimated";

  let score = 0;
  if ((ewmaVol ?? 0) >= 0.18) score += 20;
  if ((garchVol ?? ewmaVol ?? 0) >= 0.18) score += 20;
  if ((averageCorr21 ?? 0) >= 0.65) score += 20;
  if (metrics.sectorDispersion1w >= 4 || metrics.sectorDispersion1m >= 8) score += 20;
  if (metrics.reading === "defensiva") score += 20;

  return {
    sourceName: "Cálculos propios sobre ETFs sectoriales vía proveedor de precios",
    sourceUrl: "https://www.alphavantage.co/documentation/",
    lastUpdated,
    updateFrequency: "Automática server-side con caché diaria; revisión periódica sugerida",
    dataStatus: "automated",
    reliabilityNote: "Los modelos cuantitativos son sensibles a ventanas, supuestos y calidad de datos. No predicen dirección de mercado.",
    ewmaVolAnnualized: toPercent(ewmaVol),
    ewmaVolChange: ewmaVol !== null && priorEwmaVol !== null ? (ewmaVol - priorEwmaVol) * 100 : null,
    ewmaStatus: classifyVolatility(ewmaVol),
    garchVolForecast: toPercent(garchVol ?? ewmaVol),
    garchStatus,
    modelStatus,
    averageCorrelation21d: averageCorr21,
    averageCorrelation63d: averageCorr63,
    defensiveGrowthCorrelation21d: defensiveGrowthCorr21,
    sectorDispersion1w: metrics.sectorDispersion1w,
    sectorDispersion1m: metrics.sectorDispersion1m,
    fragilityScore: Math.min(score, 100),
    fragilityLabel: fragilityLabel(score),
    fragilityInterpretation: `La lectura cuantitativa muestra fragilidad ${fragilityLabel(score).toLowerCase()}. Estos modelos estiman condiciones estadísticas de riesgo bajo supuestos históricos; no implican dirección futura del mercado.`,
  };
}
