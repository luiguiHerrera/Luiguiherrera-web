import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createEngine } from '../../scripts/statistical-levels-offline.mjs';
import { explorerHistory, unpackPeriodHistoryRow } from './period-history.ts';

const source = readFileSync('scripts/build-statistical-levels.mjs', 'utf8');
const { engine, networkAttempts } = createEngine(source, '2026-11-01T00:00:00Z');
const plain = value => JSON.parse(JSON.stringify(value));
const endDay = Date.parse('2020-01-10') / 86_400_000;

test('compact history preserves prices, precision, nulls and every classification', () => {
  const labels = ['Extensión negativa extrema', 'Extensión negativa', 'Zona media', 'Extensión positiva', 'Extensión positiva extrema'];
  for (let code = 0; code < labels.length; code++) {
    const row = unpackPeriodHistoryRow([4, endDay, 10001, 10312, 9845, 10121, 123, -1, 474, 0, code, null]);
    assert.equal(row.period, '2020-01-10');
    assert.equal(row.periodStart, '2020-01-06');
    assert.equal(row.open, 100.01);
    assert.equal(row.change, 0.0123);
    assert.equal(row.closeLocation, 0);
    assert.equal(row.classification, labels[code]);
    assert.equal(row.openingRangeCategory, null);
  }
  for (const [code, label] of ['Above previous range', 'Inside previous range', 'Below previous range'].entries()) {
    const row = unpackPeriodHistoryRow([0, endDay, null, null, null, null, null, null, null, null, 2, code]);
    assert.equal(row.openingRangeCategory, label);
    assert.equal(row.change, null);
  }
});

test('old snapshots retain their sample; an empty full history never borrows recent rows', () => {
  const recentPeriods = [{ period: '2026-01-01' }];
  assert.equal(explorerHistory({ recentPeriods }), recentPeriods);
  assert.deepEqual(explorerHistory(undefined), []);
  assert.deepEqual(explorerHistory({ periodHistory: [], recentPeriods }), []);
});

test('generator exports all eligible completed rows and keeps the original recent 80 unchanged', () => {
  const rows = Array.from({ length: 2200 }, (_, index) => {
    const date = new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10);
    const close = 100 + index * 0.03 + Math.sin(index / 7) * 5;
    return engine.normalizeRow({ date, periodStart: date, periodEnd: date, open: close - 0.1, high: close + 1, low: close - 1, close, adjustedClose: close, volume: 1 });
  });
  const asset = engine.buildAssetRecord(engine.universe[0], rows, 'fixture');
  for (const [frequency, data] of Object.entries(asset.frequencies)) {
    const decoded = explorerHistory(data);
    assert.equal(decoded.length, data.periods - 1);
    assert.equal(data.recentPeriods.length, Math.min(80, decoded.length));
    assert.deepEqual(plain(decoded.slice(0, 80)), plain(data.recentPeriods));
    assert.ok(decoded.every((row, index) => !index || row.periodEnd < decoded[index - 1].periodEnd));
    assert.ok(decoded.every(row => row.periodEnd <= data.lastDate));
    assert.equal(decoded.at(-1).periodStart, engine.aggregateCompletedRows(rows, frequency)[1].periodStart);
  }
  assert.equal(networkAttempts(), 0);
});

test('unavailable assets export empty history at every frequency', () => {
  const asset = engine.buildAssetRecord(engine.universe[0], [], 'fixture');
  for (const data of Object.values(asset.frequencies)) assert.deepEqual(plain(data.periodHistory), []);
});

test('all 40 generated histories preserve recent samples and fit the asset response limit', () => {
  const manifest = JSON.parse(readFileSync('lib/statistical-levels/generated/manifest.json'));
  for (const { ticker } of manifest.catalog) {
    const asset = JSON.parse(readFileSync(`lib/statistical-levels/generated/assets/${ticker}.json`));
    for (const [frequency, data] of Object.entries(asset.frequencies)) {
      assert.ok(Array.isArray(data.periodHistory), `${ticker}/${frequency}: complete history missing`);
      const history = explorerHistory(data);
      assert.deepEqual(history.slice(0, 80), data.recentPeriods, `${ticker}/${frequency}: recent sample changed`);
      assert.equal(history.length, Math.max(0, data.periods - 1));
    }
    const seasonality = JSON.parse(readFileSync(`lib/statistical-levels/generated/seasonality/${ticker}.json`));
    const payload = { schema: 'statistical-levels.runtime-asset.v1', ticker, snapshot: '0'.repeat(64), asset, seasonality };
    assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 4_500_000, `${ticker}: response exceeds 4.5 MB`);
  }
});
