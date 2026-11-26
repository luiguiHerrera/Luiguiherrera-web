import type { FrequencyMetricSet, StatisticalFrequency, StatisticalWindow, WindowMetric } from './types.ts';

// UI selection is intentionally separate from the immutable generated schema.
// Existing windows retain their recorded values; YTD is derived from the same
// completed adjusted closes without altering the hosted snapshot or its hashes.
export type AnalysisWindow = StatisticalWindow | 'YTD';

export function analysisWindows(windows: readonly StatisticalWindow[]): AnalysisWindow[] {
  return ['YTD', ...windows];
}

const periodsPerYear: Record<StatisticalFrequency, number> = { daily: 252, weekly: 52, monthly: 12 };
const configuration = {
  daily: { minimum: 252, longMa: 200, annualization: Math.sqrt(252), chartLimit: 500 },
  weekly: { minimum: 104, longMa: 40, annualization: Math.sqrt(52), chartLimit: 520 },
  monthly: { minimum: 36, longMa: 12, annualization: Math.sqrt(12), chartLimit: 240 },
};

function recordedDate(value: string | null | undefined): string | null {
  const date = value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? date : null;
}

function observationDate(data: FrequencyMetricSet | undefined, asOf?: string | null) {
  return recordedDate(asOf) ?? recordedDate(data?.lastDate);
}

function completedHistory(data: FrequencyMetricSet | undefined, asOf?: string | null) {
  const observed = observationDate(data, asOf);
  const completed = recordedDate(data?.lastDate);
  const through = observed && completed ? (observed < completed ? observed : completed) : observed ?? completed;
  // The publication already excludes incomplete periods. Never use a later
  // observation merely because it happens to be present in an input series.
  return (data?.drawdownHistory ?? []).filter(point =>
    recordedDate(point.date) !== null && Number.isFinite(point.close) && point.close > 0 && (!through || point.date <= through),
  );
}

/** Start of the selected price observations, or no lower bound for Full. */
export function analysisStartDate(data: FrequencyMetricSet | undefined, frequency: StatisticalFrequency, window: AnalysisWindow, asOf?: string | null): string | null {
  if (window === 'Full') return null;
  if (window === 'YTD') {
    const observed = observationDate(data, asOf);
    return observed ? `${observed.slice(0, 4)}-01-01` : null;
  }
  const count = periodsPerYear[frequency] * Number.parseInt(window, 10);
  return completedHistory(data, asOf).slice(-count)[0]?.date ?? null;
}

function mean(values: readonly number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
function standardDeviation(values: readonly number[]) {
  const average = mean(values);
  return average === null || values.length < 2 ? null
    : Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}
function rounded(value: number | null | undefined, digits = 4): number | null {
  return value === null || value === undefined || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}
function rank(values: readonly number[], value: number | null) {
  return value === null || !values.length ? null : values.filter(item => item <= value).length / values.length * 100;
}
function zScore(values: readonly number[], value: number | null) {
  const average = mean(values), deviation = standardDeviation(values);
  return value === null || average === null || deviation === null || deviation === 0 ? null : (value - average) / deviation;
}
function extensionLabel(value: number | null): WindowMetric['extensionLabel'] {
  if (value === null) return 'Zona media';
  return value <= -2 ? 'Extensión negativa extrema' : value <= -1 ? 'Extensión negativa'
    : value < 1 ? 'Zona media' : value < 2 ? 'Extensión positiva' : 'Extensión positiva extrema';
}
function percentileLabel(value: number | null): WindowMetric['extensionPercentileLabel'] {
  if (value === null) return 'Zona media';
  return value <= 10 ? 'Zona históricamente baja' : value <= 30 ? 'Zona baja'
    : value < 70 ? 'Zona media' : value < 90 ? 'Zona alta' : 'Zona históricamente alta';
}
function unavailable(sessions: number): WindowMetric {
  return {
    available: false, sessions,
    annualizedVolatility63d: null, annualizedVolatility252d: null, annualizedVolatilityWindow: null,
    currentDrawdown: null, maxDrawdown: null, pricePercentile: null,
    return1mPercentile: null, return1mZScore: null,
    ma200Extension: null, ma200ExtensionZScore: null, ma200ExtensionPercentile: null,
    drawdownPercentile: null, volatilityPercentile: null,
    extensionLabel: 'Zona media', extensionPercentileLabel: 'Zona media', windowReturns: [],
  };
}

/** Existing generator formula and availability gates, applied only to YTD. */
export function getAnalysisMetric(data: FrequencyMetricSet, frequency: StatisticalFrequency, window: AnalysisWindow, asOf?: string | null): WindowMetric {
  if (window !== 'YTD') return data.windows[window];
  const start = analysisStartDate(data, frequency, window, asOf);
  const closes = start ? completedHistory(data, asOf).filter(point => point.date >= start).map(point => point.close) : [];
  const config = configuration[frequency];
  if (closes.length < config.minimum) return unavailable(closes.length);

  const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
  let peak = -Infinity;
  const drawdowns = closes.map(close => { peak = Math.max(peak, close); return close / peak - 1; });
  const extensions: number[] = [];
  for (let index = config.longMa - 1; index < closes.length; index += 1) {
    const average = mean(closes.slice(index - config.longMa + 1, index + 1));
    if (average) extensions.push(closes[index] / average - 1);
  }
  const currentExtension = extensions.at(-1) ?? null;
  const currentReturn = returns.at(-1) ?? null;
  const volatilityWindow = Math.min(52, Math.max(12, Math.floor(config.minimum / 4)));
  const volatility = (values: readonly number[]) => {
    const deviation = standardDeviation(values);
    return deviation === null ? null : deviation * config.annualization;
  };
  const volatilityHistory: number[] = [];
  for (let index = volatilityWindow; index <= returns.length; index += 1) {
    const value = volatility(returns.slice(index - volatilityWindow, index));
    if (value !== null) volatilityHistory.push(value);
  }
  const currentVolatility = volatility(returns.slice(-volatilityWindow));
  const extensionZ = zScore(extensions, currentExtension);
  const extensionPercentile = rank(extensions, currentExtension);
  const currentDrawdown = drawdowns.at(-1) ?? null;
  return {
    available: true, sessions: closes.length,
    annualizedVolatility63d: rounded(currentVolatility),
    annualizedVolatility252d: rounded(volatility(returns)),
    annualizedVolatilityWindow: rounded(volatility(returns)),
    currentDrawdown: rounded(currentDrawdown), maxDrawdown: rounded(Math.min(...drawdowns)),
    pricePercentile: rounded(rank(closes, closes.at(-1) ?? null), 1),
    return1mPercentile: rounded(rank(returns, currentReturn), 1),
    return1mZScore: rounded(zScore(returns, currentReturn), 2),
    ma200Extension: rounded(currentExtension), ma200ExtensionZScore: rounded(extensionZ, 2),
    ma200ExtensionPercentile: rounded(extensionPercentile, 1),
    drawdownPercentile: rounded(rank(drawdowns, currentDrawdown), 1),
    volatilityPercentile: rounded(rank(volatilityHistory, currentVolatility), 1),
    extensionLabel: extensionLabel(extensionZ), extensionPercentileLabel: percentileLabel(extensionPercentile),
    windowReturns: returns.slice(-config.chartLimit).map(value => rounded(value, 6)!),
  };
}
