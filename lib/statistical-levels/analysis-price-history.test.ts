import assert from 'node:assert/strict';
import test from 'node:test';
import { analysisExplorerHistory, analysisExplorerSummary, analysisPriceHistory } from './analysis-price-history.ts';
import type { FrequencyMetricSet, PeriodExplorerRow } from './types.ts';

function day(index: number) { return new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10); }
function frequencyData(count = 1000): FrequencyMetricSet {
  const history = Array.from({ length: count }, (_, index) => ({ date: day(index), close: 100 + index }));
  const recentPeriods = history.slice(1).map((point, index) => ({
    period: point.date, periodStart: point.date, periodEnd: point.date,
    open: point.close - 1, high: point.close + 1, low: point.close - 2, close: point.close,
    change: index % 3 === 0 ? 0 : index % 3 === 1 ? 0.1 : -0.1,
    openGap: 0, range: 0.03, closeLocation: 0.5,
    classification: index % 5 === 0 ? 'Extensión positiva extrema' : index % 5 === 1 ? 'Extensión negativa extrema' : 'Zona media',
    openingRangeCategory: null,
  } satisfies PeriodExplorerRow)).reverse();
  return {
    lastDate: history.at(-1)!.date, drawdownHistory: history,
    compactSeries: history.slice(-500).map(point => ({ ...point, ma200: 777.123456 })),
    recentPeriods,
  } as FrequencyMetricSet;
}

test('price charts display the chosen observation count and Full is not limited by compact history', () => {
  const data = frequencyData();
  const before = JSON.stringify(data);
  const one = analysisPriceHistory(data, 'daily', '1Y');
  const three = analysisPriceHistory(data, 'daily', '3Y');
  const full = analysisPriceHistory(data, 'daily', 'Full');
  assert.equal(one.length, 252);
  assert.equal(one[0].date, day(748));
  assert.equal(three.length, 756);
  assert.equal(three[0].date, day(244));
  assert.equal(full.length, 1000);
  assert.equal(full[0].date, day(0));
  assert.equal(JSON.stringify(data), before);
});

test('moving averages retain the preceding history at the visible edge and recorded values stay exact', () => {
  const data = frequencyData();
  const selected = analysisPriceHistory(data, 'daily', '3Y');
  // First visible index244 uses indices45..244; its MA must not warm up again.
  assert.equal(selected[0].ma200, 244.5);
  assert.equal(selected[255].date, day(499));
  assert.equal(selected[255].ma200, 499.5);
  assert.equal(selected[256].ma200, 777.123456);
  const full = analysisPriceHistory(data, 'daily', 'Full');
  assert.equal(full[198].ma200, null);
  assert.equal(full[199].ma200, 199.5);
  const weekly = analysisPriceHistory(data, 'weekly', '1Y');
  assert.equal(weekly.length, 52);
  assert.equal(weekly[0].ma200, 777.123456);
});

test('chart and explorer share boundaries; table summary changes with the selected history', () => {
  const data = frequencyData();
  const selected = analysisExplorerHistory(data, 'daily', '1Y');
  assert.equal(selected.length, 252);
  assert.equal(selected.at(-1)!.periodEnd, day(748));
  assert.equal(selected[0].periodEnd, day(999));
  const summary = analysisExplorerSummary(selected);
  assert.equal(summary.positiveRate, 1 / 3);
  assert.equal(summary.negativeRate, 1 / 3);
  assert.equal(summary.positiveExtreme, selected.filter(row => row.classification === 'Extensión positiva extrema').length);
  assert.equal(summary.negativeExtreme, selected.filter(row => row.classification === 'Extensión negativa extrema').length);
  assert.equal(analysisExplorerHistory(data, 'daily', 'Full').length, 999);
  // The earliest retained row keeps the prior-close return already recorded for it.
  assert.equal(selected.at(-1)!.change, data.recentPeriods.find(row => row.periodEnd === day(748))!.change);
});

test('YTD uses the observed year, keeps its first recorded return and excludes later observations', () => {
  const data = frequencyData(3);
  const dates = ['2025-12-31', '2026-01-02', '2026-01-03'];
  data.lastDate = dates[2];
  data.drawdownHistory = dates.map((date, index) => ({ date, close: 100 + index }));
  data.compactSeries = data.drawdownHistory.map(point => ({ ...point, ma200: 80 }));
  data.recentPeriods = dates.slice(1).map(date => ({ ...data.recentPeriods[0], period: date, periodStart: date, periodEnd: date, change: 0.25 })).reverse();
  assert.deepEqual(analysisPriceHistory(data, 'daily', 'YTD', '2026-01-02').map(point => point.date), ['2026-01-02']);
  const rows = analysisExplorerHistory(data, 'daily', 'YTD', '2026-01-02');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].change, 0.25);
  assert.equal(rows[0].periodEnd, '2026-01-02');
  assert.deepEqual(analysisPriceHistory(data, 'weekly', 'YTD', '2027-01-01'), []);
  assert.deepEqual(analysisExplorerHistory(data, 'weekly', 'YTD', '2027-01-01'), []);
});
