import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { readFileSync } from 'node:fs';
import * as realFs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { getMarketReportBySlug } from './market-reports.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { createEngine } from '../../scripts/statistical-levels-offline.mjs';

test('current production Statistical Levels admits later values without moving the complete September report', async (t) => {
  const report = getMarketReportBySlug('primer-informe-septiembre-2026')!;
  const frozenModel = JSON.stringify(buildReportExportModel(report));
  const snapshotRoot = 'lib/reports/snapshots/primer-informe-septiembre-2026/';
  const reportStatistics = JSON.parse(readFileSync(snapshotRoot + 'statistical.json', 'utf8'));
  const generatedRoot = path.resolve('lib/statistical-levels/generated');
  const fixtures = new Map(['manifest.json', 'assets/BTCUSD.json', 'seasonality/BTCUSD.json'].map(file => [
    path.join(generatedRoot, file), JSON.parse(readFileSync(path.join(generatedRoot, file), 'utf8')),
  ]));
  const originalReadFile = realFs.readFile;
  // Only the file-input boundary is replaced. The real production page loader,
  // selection logic and complete historical report resolver remain unchanged.
  mock.module('node:fs/promises', { namedExports: {
    ...realFs,
    readFile: async (...args: Parameters<typeof originalReadFile>) => {
      const fixture = fixtures.get(String(args[0]));
      return fixture ? JSON.stringify(fixture) : originalReadFile(...args);
    },
  } });
  t.after(() => mock.restoreAll());
  const { getStatisticalLevelsPageData } = await import('../statistical-levels/get-statistical-levels-data.ts');
  const selection = { asset: 'BTCUSD', frequency: 'daily', window: '5Y' };
  const before = await getStatisticalLevelsPageData(selection);
  assert.equal(before.asset.lastDate, '2026-09-06');
  assert.equal(before.asset.lastClose, 79744.99);
  assert.equal(reportStatistics.assets.BTCUSD.levels.lastClose, 79671.97);

  const asset = fixtures.get(path.join(generatedRoot, 'assets/BTCUSD.json'));
  asset.lastDate = '2026-09-08';
  asset.lastClose = 91234.56;
  asset.currentMark = { value: 91234.56, date: '2026-09-08', timestamp: '2026-09-08T23:59:59.000Z' };
  asset.returns['1W'] = 0.123456;
  const manifest = fixtures.get(path.join(generatedRoot, 'manifest.json'));
  const summary = manifest.summaries.find((row: { ticker: string }) => row.ticker === 'BTCUSD');
  Object.assign(summary, { lastDate: asset.lastDate, lastClose: asset.lastClose });
  summary.returns['1W'] = asset.returns['1W'];
  const after = await getStatisticalLevelsPageData(selection);
  assert.equal(after.asset.lastDate, '2026-09-08');
  assert.equal(after.asset.lastClose, 91234.56);
  assert.equal(after.asset.currentMark?.value, 91234.56);
  assert.equal(after.asset.returns['1W'], 0.123456);
  assert.equal(after.manifest.summaries.find(row => row.ticker === 'BTCUSD')?.lastClose, 91234.56);
  assert.notDeepEqual(after.asset, before.asset);
  assert.deepEqual(after.selection, before.selection);

  // Advance the unchanged live formula engine as well, using synthetic inputs
  // only in memory. No source, baseline, provenance or generated file is written.
  const evidence = JSON.parse(gunzipSync(readFileSync(snapshotRoot + 'prices-evidence.json.gz')).toString());
  const rows = evidence.BTCUSD.rows;
  const live = createEngine(readFileSync('scripts/build-statistical-levels.mjs', 'utf8'), '2026-09-09T00:00:00Z');
  const definition = live.engine.universe.find((row: { ticker: string }) => row.ticker === 'BTCUSD');
  const future = { ...rows.at(-1), date: '2026-09-08', periodStart: '2026-09-08', periodEnd: '2026-09-08', close: 91234.56, adjustedClose: 91234.56 };
  const current = live.engine.buildAssetRecord(definition, [...rows, future], 'Synthetic isolation canary');
  assert.equal(current.lastDate, '2026-09-08');
  assert.equal(current.lastClose, 91234.56);
  assert.notEqual(current.returns['1W'], reportStatistics.assets.BTCUSD.reading.returns['1W']);
  assert.equal(JSON.stringify(buildReportExportModel(report)), frozenModel);
  assert.equal(report.automaticDataCutoffAt, '2026-09-04');
});
