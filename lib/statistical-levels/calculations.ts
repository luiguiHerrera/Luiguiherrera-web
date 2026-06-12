import type { ExtensionLabel, PercentileLabel, StatisticalWindow } from "@/lib/statistical-levels/types";

export const statisticalWindows: Record<StatisticalWindow, number | null> = {
  "1Y": 252,
  "3Y": 756,
  "5Y": 1260,
  "10Y": 2520,
  Full: null,
};

export function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: number[]) {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function percentileRank(values: number[], value: number) {
  const clean = values.filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(value)) return null;
  const belowOrEqual = clean.filter((item) => item <= value).length;
  return (belowOrEqual / clean.length) * 100;
}

export function zScore(values: number[], value: number) {
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  return (value - avg) / sd;
}

export function extensionLabelFromZScore(value: number | null): ExtensionLabel {
  if (value === null) return "Zona media";
  if (value <= -2) return "Extensión negativa extrema";
  if (value <= -1) return "Extensión negativa";
  if (value < 1) return "Zona media";
  if (value < 2) return "Extensión positiva";
  return "Extensión positiva extrema";
}

export function percentileLabel(value: number | null): PercentileLabel {
  if (value === null) return "Zona media";
  if (value <= 10) return "Zona históricamente baja";
  if (value <= 30) return "Zona baja";
  if (value < 70) return "Zona media";
  if (value < 90) return "Zona alta";
  return "Zona históricamente alta";
}

export function rollingReturn(closes: number[], sessions: number, index = closes.length - 1) {
  const start = index - sessions;
  if (start < 0 || !closes[index] || !closes[start]) return null;
  return closes[index] / closes[start] - 1;
}

export function dailyReturns(closes: number[]) {
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index - 1] > 0 && closes[index] > 0) returns.push(closes[index] / closes[index - 1] - 1);
  }
  return returns;
}

export function annualizedVolatility(returns: number[]) {
  const sd = standardDeviation(returns);
  return sd === null ? null : sd * Math.sqrt(252);
}

export function movingAverage(values: number[], window: number, index = values.length - 1) {
  const start = index - window + 1;
  if (start < 0) return null;
  return mean(values.slice(start, index + 1));
}

export function drawdownSeries(closes: number[]) {
  let peak = -Infinity;
  return closes.map((close) => {
    peak = Math.max(peak, close);
    return peak > 0 ? close / peak - 1 : 0;
  });
}

export function maxDrawdown(closes: number[]) {
  const drawdowns = drawdownSeries(closes);
  return drawdowns.length ? Math.min(...drawdowns) : null;
}

export function correlation(first: number[], second: number[]) {
  const length = Math.min(first.length, second.length);
  if (length < 20) return null;
  const x = first.slice(first.length - length);
  const y = second.slice(second.length - length);
  const xMean = mean(x);
  const yMean = mean(y);
  if (xMean === null || yMean === null) return null;
  const numerator = x.reduce((sum, value, index) => sum + (value - xMean) * (y[index] - yMean), 0);
  const xDenominator = Math.sqrt(x.reduce((sum, value) => sum + (value - xMean) ** 2, 0));
  const yDenominator = Math.sqrt(y.reduce((sum, value) => sum + (value - yMean) ** 2, 0));
  if (!xDenominator || !yDenominator) return null;
  return numerator / (xDenominator * yDenominator);
}
