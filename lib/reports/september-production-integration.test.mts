import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createEngine } from '../../scripts/statistical-levels-offline.mjs';
import { buildReportAssetSnapshot, createReportStatisticalEngine } from '../../scripts/report-statistical-snapshot.mjs';

const base = 'lib/reports/snapshots/primer-informe-septiembre-2026/';
const evidence = JSON.parse(gunzipSync(readFileSync(base + 'prices-evidence.json.gz')).toString());
const saved = JSON.parse(readFileSync(base + 'statistical.json', 'utf8'));
const production = '80e5cc26d29d68d71ff55022f6897bd3e08640bf';
const source = readFileSync('scripts/build-statistical-levels.mjs', 'utf8');
const reportEngine = createReportStatisticalEngine('2026-09-04');

test('integration preserves the production generator, completed-history policy and provenance byte for byte', () => {
  for (const file of [
    'scripts/build-statistical-levels.mjs', 'scripts/statistical-levels-offline.mjs',
    'lib/statistical-levels/baseline-policy.mjs', 'lib/statistical-levels/defect-repairs.mjs',
    'lib/statistical-levels/baseline-config.json', 'lib/statistical-levels/generated-provenance.json',
    'lib/dashboard/get-dashboard-data.ts', 'lib/dashboard/regime-scoring.ts',
  ]) assert.deepEqual(readFileSync(file), execFileSync('git', ['show', `${production}:${file}`]), file);
});

test('report mark admission cannot alter production completed-week admission or its clock', () => {
  const live = createEngine(source, '2026-09-06T16:32:25Z');
  const rows = evidence.BTCUSD.rows;
  const before = JSON.stringify(live.engine.aggregateCompletedRows(rows, 'weekly'));
  assert.equal(live.engine.aggregateCompletedRows(rows, 'weekly').at(-1).periodEnd, '2026-08-30');
  assert.equal(reportEngine.aggregateRows(rows, 'weekly').at(-1).periodEnd, '2026-09-04');
  createReportStatisticalEngine('2026-09-08');
  assert.equal(JSON.stringify(live.engine.aggregateCompletedRows(rows, 'weekly')), before);
});

test('all six assets exclude an extreme current week from level estimation while retaining its cutoff price', () => {
  for (const ticker of ['SPY', 'GLD', 'FXI', 'EWJ', 'BTCUSD', 'ETHUSD']) {
    const asset = reportEngine.universe.find((a: { ticker: string }) => a.ticker === ticker);
    const rows = structuredClone(evidence[ticker].rows);
    for (const row of rows.filter((r: { date: string }) => r.date >= '2026-08-31')) {
      row.high = row.adjustedHigh = 999999;
      row.low = row.adjustedLow = 0.01;
    }
    rows.at(-1).close = rows.at(-1).adjustedClose = 12345;
    const actual = buildReportAssetSnapshot(asset, rows, '2026-09-04', 'Yahoo Finance historical chart');
    assert.equal(actual.levels.lastClose, 12345, ticker);
    assert.equal(actual.levels.currentOpen, saved.assets[ticker].levels.currentOpen, ticker);
    assert.equal(actual.levels.periods, saved.assets[ticker].levels.periods, ticker);
    assert.deepEqual(actual.levels.levels, saved.assets[ticker].levels.levels, ticker);
    assert.notDeepEqual(actual.levels.distances, saved.assets[ticker].levels.distances, ticker);
    assert.deepEqual(actual.seasonality, saved.assets[ticker].seasonality, ticker);
  }
});

test('Saturday and Sunday UTC crypto observations after September 4 never enter the report', () => {
  for (const ticker of ['BTCUSD', 'ETHUSD']) {
    const asset = reportEngine.universe.find((a: { ticker: string }) => a.ticker === ticker);
    const rows = structuredClone(evidence[ticker].rows);
    for (const date of ['2026-09-05', '2026-09-06']) rows.push({ ...rows.at(-1), date, periodStart: date, periodEnd: date, adjustedClose: 999999 });
    assert.deepEqual(buildReportAssetSnapshot(asset, rows, '2026-09-04', 'Yahoo Finance historical chart'), saved.assets[ticker]);
  }
});
