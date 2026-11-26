import { analysisStartDate, type AnalysisWindow } from './analysis-window.ts';
import { explorerHistory } from './period-history.ts';
import type { CompactPricePoint, FrequencyMetricSet, PeriodExplorerRow, StatisticalFrequency } from './types.ts';

const longAveragePeriods = { daily: 200, weekly: 40, monthly: 12 } as const;

function completedCutoff(data: FrequencyMetricSet, asOf?: string | null) {
  const dates = [data.lastDate, asOf?.slice(0, 10)].filter((value): value is string => Boolean(value));
  return dates.length ? dates.sort()[0] : null;
}

/** Reconstruct the full price/MA path before cropping the visible period. */
export function analysisPriceHistory(data: FrequencyMetricSet, frequency: StatisticalFrequency, window: AnalysisWindow, asOf?: string | null): CompactPricePoint[] {
  const cutoff = completedCutoff(data, asOf);
  const history = (data.drawdownHistory ?? data.compactSeries).filter(point => !cutoff || point.date <= cutoff);
  const recorded = new Map(data.compactSeries.map(point => [point.date, point]));
  const length = longAveragePeriods[frequency];
  let total = 0;
  const complete = history.map((point, index) => {
    total += point.close;
    if (index >= length) total -= history[index - length].close;
    const stored = recorded.get(point.date);
    return { date: point.date, close: point.close, ma200: stored ? stored.ma200 : index + 1 >= length ? total / length : null };
  });
  const start = analysisStartDate(data, frequency, window, asOf);
  return complete.filter(point => !start || point.date >= start);
}

/** Each row retains its recorded prior-close return even at the window boundary. */
export function analysisExplorerHistory(data: FrequencyMetricSet | undefined, frequency: StatisticalFrequency, window: AnalysisWindow, asOf?: string | null): PeriodExplorerRow[] {
  if (!data) return [];
  const cutoff = completedCutoff(data, asOf);
  const start = analysisStartDate(data, frequency, window, asOf);
  return explorerHistory(data).filter(row => (!start || row.periodEnd >= start) && (!cutoff || row.periodEnd <= cutoff));
}

export function analysisExplorerSummary(rows: readonly PeriodExplorerRow[]) {
  return {
    positiveRate: rows.length ? rows.filter(row => (row.change ?? 0) > 0).length / rows.length : null,
    negativeRate: rows.length ? rows.filter(row => (row.change ?? 0) < 0).length / rows.length : null,
    positiveExtreme: rows.filter(row => row.classification === 'Extensión positiva extrema').length,
    negativeExtreme: rows.filter(row => row.classification === 'Extensión negativa extrema').length,
  };
}
