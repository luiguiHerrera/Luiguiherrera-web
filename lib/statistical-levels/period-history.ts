import type { FrequencyMetricSet, PeriodExplorerRow, PeriodHistoryRow } from './types';

const classifications = ['Extensión negativa extrema', 'Extensión negativa', 'Zona media', 'Extensión positiva', 'Extensión positiva extrema'] as const;
const openingRanges = ['Above previous range', 'Inside previous range', 'Below previous range'] as const;
const dayMs = 86_400_000;
const date = (epochDay: number) => new Date(epochDay * dayMs).toISOString().slice(0, 10);
const ratio = (value: number | null, scale: number) => value === null ? null : value / scale;

export function unpackPeriodHistoryRow(row: PeriodHistoryRow): PeriodExplorerRow {
  const periodEnd = date(row[1]);
  return {
    period: periodEnd, periodStart: date(row[1] - row[0]), periodEnd,
    open: ratio(row[2], 100), high: ratio(row[3], 100), low: ratio(row[4], 100), close: ratio(row[5], 100),
    change: ratio(row[6], 10_000), openGap: ratio(row[7], 10_000), range: ratio(row[8], 10_000), closeLocation: ratio(row[9], 1_000),
    classification: classifications[row[10]],
    openingRangeCategory: row[11] === null ? null : openingRanges[row[11]],
  };
}

export function explorerHistory(data: FrequencyMetricSet | undefined): PeriodExplorerRow[] {
  // Older snapshots remain usable until their existing hosted job regenerates.
  return data?.periodHistory?.map(unpackPeriodHistoryRow) ?? data?.recentPeriods ?? [];
}
