import assert from 'node:assert/strict';
import test from 'node:test';
import { analysisSeasonalityWindow } from './analysis-seasonality.ts';
import type { AssetStatRecord, DailySeasonalityData, DailySeasonalityWindowData, FrequencyMetricSet } from './types.ts';

function frequency(history: Array<{ date: string; close: number }>, lastDate = history.at(-1)?.date) {
  return { drawdownHistory: history, lastDate } as FrequencyMetricSet;
}
function fixture() {
  return {
    frequencies: {
      daily: frequency([{ date: '2025-12-31', close: 100 }, { date: '2026-01-01', close: 110 }, { date: '2026-01-02', close: 99 }, { date: '2026-01-03', close: 108.9 }, { date: '2026-01-04', close: 217.8 }]),
      weekly: frequency([{ date: '2025-12-26', close: 100 }, { date: '2026-01-02', close: 110 }, { date: '2026-01-09', close: 99 }, { date: '2026-01-16', close: 198 }]),
      monthly: frequency([{ date: '2025-11-28', close: 100 }, { date: '2025-12-31', close: 110 }, { date: '2026-01-30', close: 132 }, { date: '2026-02-27', close: 264 }]),
    },
  } as AssetStatRecord;
}

test('YTD uses close-to-close returns and retains the prior close outside January 1', () => {
  const selected = analysisSeasonalityWindow(null, fixture(), 'YTD', '2026-01-04')!;
  assert.deepEqual(selected.daily?.general, [
    { month: 1, day: 1, averageReturn: 0.1, medianReturn: 0.1, winRate: 1, sampleSize: 1 },
    { month: 1, day: 2, averageReturn: -0.1, medianReturn: -0.1, winRate: 0, sampleSize: 1 },
    { month: 1, day: 3, averageReturn: 0.1, medianReturn: 0.1, winRate: 1, sampleSize: 1 },
  ]);
  assert.equal(selected.daily?.general.some(cell => cell.day === 4), false); // Current UTC day is incomplete.
  assert.equal(selected.daily?.presidentialCycle.midterm.length, 3);
  assert.equal(selected.daily?.presidentialCycle.election.length, 0);
});

test('weekly and monthly samples exclude the current calendar period and future observations', () => {
  const asset = fixture();
  const january = analysisSeasonalityWindow(null, asset, 'YTD', '2026-01-13')!;
  assert.deepEqual(january.weekly?.general, [
    { month: 1, weekOfMonth: 1, averageReturn: 0.1, medianReturn: 0.1, winRate: 1, sampleSize: 1 },
    { month: 1, weekOfMonth: 2, averageReturn: -0.1, medianReturn: -0.1, winRate: 0, sampleSize: 1 },
  ]);
  assert.deepEqual(january.monthly?.general, []);
  const february = analysisSeasonalityWindow(null, asset, 'YTD', '2026-02-15')!;
  assert.deepEqual(february.monthly?.general, [
    { month: 1, averageReturn: 0.2, medianReturn: 0.2, winRate: 1, sampleSize: 1 },
  ]);
});

test('1Y limits the daily sample to 252 observations without losing the first selected return', () => {
  const history = Array.from({ length: 366 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 11, 31 + index)).toISOString().slice(0, 10),
    close: 100 * 1.01 ** index,
  }));
  const asset = fixture();
  asset.frequencies.daily = frequency(history);
  const selected = analysisSeasonalityWindow(null, asset, '1Y', '2027-01-01')!;
  assert.equal(selected.daily?.general.reduce((sum, cell) => sum + cell.sampleSize, 0), 252);
  assert.ok(selected.daily?.general.every(cell => cell.averageReturn === 0.01 && cell.medianReturn === 0.01 && cell.winRate === 1));
  assert.equal(selected.daily?.general[0].month, Number(history[114].date.slice(5, 7)));
  assert.equal(selected.daily?.general[0].day, Number(history[114].date.slice(8, 10)));
});

test('existing published horizons retain the exact recorded cells and never substitute 5Y for a short sample', () => {
  const five = { general: [{ month: 1, day: 1, averageReturn: 99 }], presidentialCycle: {} } as DailySeasonalityWindowData;
  const all = { general: [], presidentialCycle: {} } as unknown as DailySeasonalityWindowData;
  const data = { windows: { '3Y': all, '5Y': five, '10Y': all, Full: all, All: all } } as DailySeasonalityData;
  for (const window of ['3Y', '5Y', '10Y'] as const) assert.equal(analysisSeasonalityWindow(data, fixture(), window, '2026-01-04'), data.windows[window]);
  assert.equal(analysisSeasonalityWindow(data, fixture(), 'Full', '2026-01-04'), all);
  assert.equal(analysisSeasonalityWindow(data, undefined, '1Y', '2026-01-04'), undefined);
  assert.notEqual(analysisSeasonalityWindow(data, fixture(), '1Y', '2026-01-04'), five);
  assert.deepEqual(analysisSeasonalityWindow(data, fixture(), 'YTD', '2027-01-01')?.daily?.general, []);
});

test('invalid prices do not become zero returns or bridge over an invalid observation', () => {
  const asset = fixture();
  asset.frequencies.daily = frequency([
    { date: '2025-12-31', close: 100 }, { date: '2026-01-01', close: 0 },
    { date: '2026-01-02', close: 110 }, { date: '2026-01-03', close: 121 },
  ]);
  const selected = analysisSeasonalityWindow(null, asset, 'YTD', '2026-01-04')!;
  assert.deepEqual(selected.daily?.general, [
    { month: 1, day: 3, averageReturn: 0.1, medianReturn: 0.1, winRate: 1, sampleSize: 1 },
  ]);
});
