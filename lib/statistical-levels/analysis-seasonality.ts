import { analysisStartDate, type AnalysisWindow } from './analysis-window.ts';
import { isCompletedPeriod } from './defect-repairs.mjs';
import type {
  AssetStatRecord, CalendarDaySeasonalityCell, CalendarMonthSeasonalityCell,
  CalendarWeekSeasonalityCell, DailySeasonalityData, DailySeasonalityWindowData,
  PresidentialCyclePhase, StatisticalFrequency,
} from './types.ts';

const phases: PresidentialCyclePhase[] = ['all', 'post_election', 'midterm', 'pre_election', 'election'];
type Observation = { month: number; day: number; weekOfMonth: number; phase: PresidentialCyclePhase; value: number };
type Cell = CalendarDaySeasonalityCell | CalendarWeekSeasonalityCell | CalendarMonthSeasonalityCell;

function rounded(value: number, digits: number) { return Number(value.toFixed(digits)); }
function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = (sorted.length - 1) / 2;
  return {
    averageReturn: rounded(values.reduce((sum, value) => sum + value, 0) / values.length, 6),
    medianReturn: rounded((sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2, 6),
    winRate: rounded(values.filter(value => value > 0).length / values.length, 4),
    sampleSize: values.length,
  };
}

function observations(asset: AssetStatRecord, frequency: StatisticalFrequency, window: AnalysisWindow, asOf: string): Observation[] {
  const data = asset.frequencies[frequency];
  const history = data.drawdownHistory;
  const start = analysisStartDate(data, frequency, window, asOf);
  const through = data.lastDate && data.lastDate < asOf ? data.lastDate : asOf;
  const result: Observation[] = [];
  // Compute each close-to-close return before trimming. The first selected
  // observation may legitimately use a prior close outside the selected window.
  for (let index = 1; index < history.length; index += 1) {
    const current = history[index], previous = history[index - 1];
    if ((start && current.date < start) || current.date > through || previous.date >= current.date) continue;
    if (!isCompletedPeriod(current.date, frequency, asOf)) continue;
    if (!(previous.close > 0) || !(current.close > 0) || !Number.isFinite(previous.close) || !Number.isFinite(current.close)) continue;
    const value = current.close / previous.close - 1;
    if (!Number.isFinite(value)) continue;
    const year = Number(current.date.slice(0, 4));
    const month = Number(current.date.slice(5, 7)), day = Number(current.date.slice(8, 10));
    const phase = (['election', 'post_election', 'midterm', 'pre_election'] as const)[year % 4];
    result.push({ month, day, weekOfMonth: Math.min(5, Math.floor((day - 1) / 7) + 1), phase, value });
  }
  return result;
}

function dimension<T extends Cell>(sample: Observation[], frequency: StatisticalFrequency) {
  function cells(rows: Observation[]): T[] {
    const buckets = new Map<string, { dimensions: { month: number; day?: number; weekOfMonth?: number }; values: number[] }>();
    for (const observation of rows) {
      const dimensions = frequency === 'daily' ? { month: observation.month, day: observation.day }
        : frequency === 'weekly' ? { month: observation.month, weekOfMonth: observation.weekOfMonth }
          : { month: observation.month };
      const key = JSON.stringify(dimensions);
      if (!buckets.has(key)) buckets.set(key, { dimensions, values: [] });
      buckets.get(key)!.values.push(observation.value);
    }
    return [...buckets.values()].map(({ dimensions, values }) => ({ ...dimensions, ...summarize(values) }) as T)
      .sort((a, b) => a.month - b.month || ('day' in a && 'day' in b ? a.day - b.day : 'weekOfMonth' in a && 'weekOfMonth' in b ? a.weekOfMonth - b.weekOfMonth : 0));
  }
  return {
    general: cells(sample),
    presidentialCycle: Object.fromEntries(phases.map(phase => [phase, cells(phase === 'all' ? sample : sample.filter(row => row.phase === phase))])) as Record<PresidentialCyclePhase, T[]>,
  };
}

/** Existing horizons retain the exact published statistics. Only the new short
 * horizons derive calendar samples from the snapshot's completed adjusted closes. */
export function analysisSeasonalityWindow(data: DailySeasonalityData | null, asset: AssetStatRecord | undefined, window: AnalysisWindow, asOf: string): DailySeasonalityWindowData | undefined {
  if (window !== '1Y' && window !== 'YTD') return window === 'Full' ? data?.windows.All ?? data?.windows.Full : data?.windows[window];
  if (!asset || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(`${asOf}T00:00:00Z`))) return undefined;
  const daily = dimension<CalendarDaySeasonalityCell>(observations(asset, 'daily', window, asOf), 'daily');
  const weekly = dimension<CalendarWeekSeasonalityCell>(observations(asset, 'weekly', window, asOf), 'weekly');
  const monthly = dimension<CalendarMonthSeasonalityCell>(observations(asset, 'monthly', window, asOf), 'monthly');
  return {
    general: daily.general, presidentialCycle: daily.presidentialCycle, daily, monthly,
    weekly: { ...weekly, methodology: 'Semanas agregadas por fecha de cierre semanal. Semana 1 = días 1-7 del mes; Semana 5 = días 29-31.' },
  };
}
