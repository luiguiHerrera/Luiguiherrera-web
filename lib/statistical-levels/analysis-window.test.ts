import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { analysisStartDate, analysisWindows, getAnalysisMetric } from './analysis-window.ts';
import type { FrequencyMetricSet, StatisticalWindow, WindowMetric } from './types.ts';

const day = 86_400_000;
const date = (year: number, index: number) => new Date(Date.UTC(year, 0, 1) + index * day).toISOString().slice(0, 10);
const history = (year: number, count: number, close = (index: number) => 100 + index) =>
  Array.from({ length: count }, (_, index) => ({ date: date(year, index), close: close(index) }));
const storedWindow = { available: false, sessions: 123 } as WindowMetric;
function data(points: Array<{ date: string; close: number }>): FrequencyMetricSet {
  return {
    drawdownHistory: points, lastDate: points.at(-1)?.date ?? null,
    windows: Object.fromEntries(['1Y', '3Y', '5Y', '10Y', 'Full'].map(window => [window, storedWindow])),
  } as FrequencyMetricSet;
}

// Compare derived metrics with the actual existing generator, including its
// precision and minimum-sample gates, rather than a second test-only formula.
const source = fs.readFileSync('scripts/build-statistical-levels.mjs', 'utf8');
const context = vm.createContext({ path, process, console, URLSearchParams, setTimeout });
vm.runInContext(source.slice(source.indexOf('const outputPath'), source.indexOf('\nconst assets = [];'))
  + '\nglobalThis.windowEngine={buildWindowMetric,frequencyConfig};', context);
const engine = context.windowEngine;
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

test('UI windows add YTD without changing the immutable publication windows', () => {
  const windows: StatisticalWindow[] = ['1Y', '3Y', '5Y', '10Y', 'Full'];
  assert.deepEqual(analysisWindows(windows), ['YTD', '1Y', '3Y', '5Y', '10Y', 'Full']);
  assert.deepEqual(windows, ['1Y', '3Y', '5Y', '10Y', 'Full']);
});

test('existing selections return the exact stored metric object without recalculation', () => {
  const input = data(history(2025, 500));
  for (const window of ['1Y', '3Y', '5Y', '10Y', 'Full'] as const)
    assert.strictEqual(getAnalysisMetric(input, 'daily', window, '2026-01-05'), storedWindow);
});

test('ordinary horizons retain the published fixed observation counts and Full is unbounded', () => {
  const input = data(history(2020, 3000));
  for (const [frequency, count] of [['daily', 252], ['weekly', 52], ['monthly', 12]] as const) {
    assert.equal(analysisStartDate(input, frequency, '1Y'), input.drawdownHistory.at(-count)?.date);
    assert.equal(analysisStartDate(input, frequency, '3Y'), input.drawdownHistory.at(-count * 3)?.date);
    assert.equal(analysisStartDate(input, frequency, '10Y'), input.drawdownHistory.at(-count * 10)?.date);
  }
  assert.equal(analysisStartDate(input, 'daily', 'Full'), null);
  assert.equal(analysisStartDate(data(history(2026, 3)), 'daily', '3Y'), '2026-01-01');
  assert.equal(analysisStartDate(data([]), 'daily', '1Y'), null);
});

test('YTD starts January 1 of the observed year across frequency and calendar transitions', () => {
  const input = data([{ date: '2025-12-26', close: 100 }]);
  for (const frequency of ['daily', 'weekly', 'monthly'] as const) {
    assert.equal(analysisStartDate(input, frequency, 'YTD', '2026-01-02T21:00:00Z'), '2026-01-01');
    const metric = getAnalysisMetric(input, frequency, 'YTD', '2026-01-02');
    assert.equal(metric.sessions, 0);
    assert.equal(metric.available, false);
    assert.equal(metric.currentDrawdown, null);
    assert.deepEqual(metric.windowReturns, []);
  }
  assert.equal(analysisStartDate(input, 'weekly', 'YTD'), '2025-01-01');
  assert.equal(analysisStartDate(data([]), 'daily', 'YTD', '2026-01-02'), '2026-01-01');
  assert.equal(analysisStartDate(data([]), 'daily', 'YTD'), null);
});

test('YTD keeps current sample counts but does not relax statistical availability gates', () => {
  for (const [frequency, count] of [['daily', 251], ['weekly', 52], ['monthly', 12]] as const) {
    const metric = getAnalysisMetric(data(history(2026, count)), frequency, 'YTD', date(2026, count - 1));
    assert.equal(metric.sessions, count);
    assert.equal(metric.available, false);
    assert.equal(metric.ma200ExtensionPercentile, null);
    assert.equal(metric.annualizedVolatilityWindow, null);
  }
});

test('available YTD metrics match the existing generator for variable and flat histories', () => {
  for (const close of [(index: number) => 100 + Math.sin(index / 4) * 10 + index / 10, () => 100]) {
    const input = data(history(2025, 700, close));
    const asOf = '2026-11-30';
    const closes = input.drawdownHistory.filter(point => point.date >= '2026-01-01' && point.date <= asOf).map(point => point.close);
    const actual = getAnalysisMetric(input, 'daily', 'YTD', asOf);
    const expected = engine.buildWindowMetric(closes, null, engine.frequencyConfig.daily);
    assert.equal(actual.available, true);
    assert.deepEqual(actual, plain(expected));
  }
});

test('YTD excludes later observations and never borrows a prior-year close for returns or drawdown', () => {
  const input = data([
    { date: '2025-12-31', close: 10000 },
    ...history(2026, 300, index => 100 + index),
    { date: '2026-12-31', close: 1 },
  ]);
  const asOf = date(2026, 251);
  const metric = getAnalysisMetric(input, 'daily', 'YTD', asOf);
  assert.equal(metric.sessions, 252);
  assert.equal(metric.currentDrawdown, 0);
  assert.equal(metric.maxDrawdown, 0);
  assert.equal(metric.windowReturns.length, 251);
  assert.equal(metric.windowReturns[0], 0.01);
  assert.equal(analysisStartDate(input, 'daily', '1Y', asOf), '2026-01-01');
});

test('the last completed date bounds YTD even when a later point exists in the payload', () => {
  const input = data(history(2026, 300));
  input.lastDate = date(2026, 9);
  assert.equal(getAnalysisMetric(input, 'daily', 'YTD', '2026-12-31').sessions, 10);
  assert.equal(analysisStartDate(input, 'daily', '1Y', '2026-12-31'), '2026-01-01');
});
