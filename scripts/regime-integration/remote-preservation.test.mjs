// Explicit fresh-remote preservation controls. The old raw failures remain FAIL.
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { readFileSync } from 'node:fs';
import * as realFs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { getMarketReportBySlug } from '../../lib/reports/market-reports.ts';
import { buildReportExportModel } from '../../lib/reports/report-export-model.ts';
import { createEngine } from '../statistical-levels-offline.mjs';

const remote = process.env.REGIME_INTEGRATION_REMOTE_ROOT;
const remoteCommit = '7dae726917ded8f5828a8525d596b1ce02830196';
const digest = value => createHash('sha256').update(value).digest('hex');
function requireRemote() {
  assert.ok(remote, 'Explicit exact REMOTE_BASE checkout required');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: remote, encoding: 'utf8' }).trim(), remoteCommit);
}
function remoteBlob(file) {
  return execFileSync('git', ['show', `${remoteCommit}:${file}`], { cwd: remote, maxBuffer: 20 * 1024 * 1024 });
}

test('PREEXISTING_UNRELATED_PRESERVED: weekly rounding, exact remote SSR and numeric inputs remain unchanged', () => {
  requireRemote();
  for (const file of ['components/statistical-levels/CurrentMonthSeasonality.tsx', 'lib/statistical-levels/generated/seasonality/SPY.json', 'lib/statistical-levels/generated/manifest.json']) {
    assert.equal(digest(readFileSync(file)), digest(remoteBlob(file)), file);
  }
  const render = `
    import { readFileSync } from 'node:fs';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { CurrentMonthSeasonality } from './components/statistical-levels/CurrentMonthSeasonality.tsx';
    const data=JSON.parse(readFileSync('lib/statistical-levels/generated/seasonality/SPY.json'));
    const manifest=JSON.parse(readFileSync('lib/statistical-levels/generated/manifest.json'));
    process.stdout.write(JSON.stringify(Object.fromEntries(['es','en'].map(locale=>[locale,renderToStaticMarkup(createElement(CurrentMonthSeasonality,{data,asOf:manifest.generatedAt,locale}))]))));
  `;
  const args = ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--import', './scripts/trends-test-register.mjs', '--input-type=module', '-e', render];
  const before = JSON.parse(execFileSync(process.execPath, args, { cwd: remote, encoding: 'utf8', env: process.env }));
  const after = JSON.parse(execFileSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8', env: process.env }));
  assert.deepEqual(after, before);
  const data = JSON.parse(remoteBlob('lib/statistical-levels/generated/seasonality/SPY.json'));
  const cell = data.windows['5Y'].weekly.general.find(row => row.month === 9 && row.weekOfMonth === 5);
  assert.equal(cell.sampleSize, 2);
  assert.equal(cell.averageReturn, -0.01805);
  for (const locale of ['es', 'en']) {
    const article = after[locale].match(/<article[^>]*data-week="5"[\s\S]*?<\/article>/)[0];
    assert.ok(article.includes('-1.80%'));
    assert.ok(article.includes('N 2'));
    assert.ok(article.includes(locale === 'en' ? 'Limited sample' : 'Muestra limitada'));
  }
  // The known disagreement remains documented, not silently called a repair.
  assert.equal((cell.averageReturn * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '-1.81');
});

test('REMOTE_BASE current-mark admission changes in-memory production data without changing the frozen September report', async t => {
  requireRemote();
  const report = getMarketReportBySlug('primer-informe-septiembre-2026');
  const frozenModel = JSON.stringify(buildReportExportModel(report));
  const snapshotRoot = 'lib/reports/snapshots/primer-informe-septiembre-2026/';
  const reportStatistics = JSON.parse(readFileSync(snapshotRoot + 'statistical.json', 'utf8'));
  const generatedRoot = path.resolve('lib/statistical-levels/generated');
  const fixtures = new Map(['manifest.json', 'assets/BTCUSD.json', 'seasonality/BTCUSD.json'].map(file => {
    const relative = `lib/statistical-levels/generated/${file}`;
    assert.equal(digest(readFileSync(relative)), digest(remoteBlob(relative)), relative);
    return [path.join(generatedRoot, file), JSON.parse(readFileSync(relative, 'utf8'))];
  }));
  const originalRead = realFs.readFile;
  mock.module('node:fs/promises', { namedExports: {
    ...realFs, readFile: async (...args) => {
      const value = fixtures.get(String(args[0]));
      return value ? JSON.stringify(value) : originalRead(...args);
    },
  } });
  t.after(() => mock.restoreAll());
  const { getStatisticalLevelsPageData } = await import('../../lib/statistical-levels/get-statistical-levels-data.ts');
  const selection = { asset: 'BTCUSD', frequency: 'daily', window: '5Y' };
  const before = await getStatisticalLevelsPageData(selection);
  const accepted = JSON.parse(remoteBlob('lib/statistical-levels/generated/assets/BTCUSD.json'));
  assert.equal(before.asset.lastDate, accepted.lastDate);
  assert.equal(before.asset.lastClose, accepted.lastClose);
  assert.equal(reportStatistics.assets.BTCUSD.levels.lastClose, 79671.97);
  const date = '2026-09-10';
  assert.ok(date > accepted.lastDate, 'Control must advance the current remote mark');
  const asset = fixtures.get(path.join(generatedRoot, 'assets/BTCUSD.json'));
  Object.assign(asset, { lastDate: date, lastClose: 91234.56,
    currentMark: { value: 91234.56, date, timestamp: date + 'T23:59:59.000Z' } });
  asset.returns['1W'] = .123456;
  const summary = fixtures.get(path.join(generatedRoot, 'manifest.json')).summaries.find(row => row.ticker === 'BTCUSD');
  Object.assign(summary, { lastDate: date, lastClose: 91234.56 }); summary.returns['1W'] = .123456;
  const after = await getStatisticalLevelsPageData(selection);
  assert.equal(after.asset.lastDate, date);
  assert.equal(after.asset.lastClose, 91234.56);
  assert.equal(after.asset.currentMark?.value, 91234.56);
  assert.equal(after.asset.returns['1W'], .123456);
  assert.equal(after.manifest.summaries.find(row => row.ticker === 'BTCUSD')?.lastClose, 91234.56);
  assert.notDeepEqual(after.asset, before.asset); assert.deepEqual(after.selection, before.selection);
  const evidence = JSON.parse(gunzipSync(readFileSync(snapshotRoot + 'prices-evidence.json.gz')).toString());
  const rows = evidence.BTCUSD.rows;
  const live = createEngine(readFileSync('scripts/build-statistical-levels.mjs', 'utf8'), '2026-09-11T00:00:00Z');
  const definition = live.engine.universe.find(row => row.ticker === 'BTCUSD');
  const future = { ...rows.at(-1), date, periodStart: date, periodEnd: date, close: 91234.56, adjustedClose: 91234.56 };
  const current = live.engine.buildAssetRecord(definition, [...rows, future], 'Synthetic integration isolation control');
  assert.equal(current.lastDate, date); assert.equal(current.lastClose, 91234.56);
  assert.notEqual(current.returns['1W'], reportStatistics.assets.BTCUSD.reading.returns['1W']);
  assert.equal(JSON.stringify(buildReportExportModel(report)), frozenModel);
  assert.equal(report.automaticDataCutoffAt, '2026-09-04');
});
