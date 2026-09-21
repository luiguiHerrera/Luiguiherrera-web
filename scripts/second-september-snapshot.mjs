// Offline projection of persisted authority. No providers, live loaders or public writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { freezeGeneratedReportAsset, createReportStatisticalEngine } from './report-statistical-snapshot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'lib/reports/snapshots/segundo-informe-septiembre-2026');
const json = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function buildSecondSeptemberStatistics() {
  const evidence = JSON.parse(gunzipSync(fs.readFileSync(path.join(directory, 'authority-evidence.json.gz'))));
  const provenance = JSON.parse(evidence.files['generated-provenance.json']);
  assert.equal(provenance.BASELINE_ID, '20260919T123549852Z-dfaa8586-f547-42f9-99e3-03f6c1f118cb');
  for (const [name, bytes] of Object.entries(evidence.files)) {
    if (!name.startsWith('generated/')) continue;
    assert.equal(sha(bytes), provenance.snapshots.find(row => row.FILE === name.slice(10))?.SNAPSHOT_SHA256, name);
  }
  const history = json('historical-seasonality.json');
  const assets = {};
  for (const ticker of ['SPY', 'GLD', 'FXI', 'EWJ', 'BTCUSD', 'ETHUSD']) {
    const record = JSON.parse(evidence.files[`generated/assets/${ticker}.json`]);
    const season = JSON.parse(evidence.files[`generated/seasonality/${ticker}.json`]);
    assets[ticker] = freezeGeneratedReportAsset(record, season, history.assets[ticker], '2026-09-18');
  }
  const spy = JSON.parse(evidence.files['generated/seasonality/SPY.json']);
  const btc = JSON.parse(evidence.files['generated/assets/BTCUSD.json']);
  // Existing monthly builder over the authority's completed monthly return observations.
  const observations = btc.frequencies.monthly.recentPeriods
    .filter(row => row.period >= '2020-01-01' && row.period < '2026-01-01' && [9, 10].includes(Number(row.period.slice(5, 7))))
    .map(row => ({ date: row.period, year: Number(row.period.slice(0, 4)), month: Number(row.period.slice(5, 7)), returnValue: row.change }));
  assert.equal(observations.length, 12);
  const { buildMonthlySeasonalityCells } = createReportStatisticalEngine('2026-09-18');
  const btc2020 = structuredClone(buildMonthlySeasonalityCells(observations));
  return {
    asOf: '2026-09-18', baselineId: provenance.BASELINE_ID, authorityCommit: evidence.commit,
    assets,
    spyMidtermAutumn: spy.windows.All.monthly.presidentialCycle.midterm.filter(row => [9, 10, 11].includes(row.month)),
    btc2020: { years: [2020, 2021, 2022, 2023, 2024, 2025], observations, months: btc2020,
      methodology: 'Segunda lente independiente de Midterm: años 2020–2025, seis observaciones por mes. Retornos mensuales completos de la autoridad, publicados con cuatro decimales; medias aproximadas. Se reutiliza el agregador mensual existente. 2026 no entra en la muestra.',
      currentSeptemberReturn: Number(((assets.BTCUSD.levels.lastClose / btc.frequencies.monthly.recentPeriods.find(row => row.period === '2026-08-31').close - 1) * 100).toFixed(2)),
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = JSON.stringify(buildSecondSeptemberStatistics(), null, 2) + '\n';
  const destination = path.join(directory, 'statistical.json');
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(destination, 'utf8'), result);
  else fs.writeFileSync(destination, result);
  console.log('Second September statistical snapshot: exact 18/09 close, baseline hashes and pre-2026 samples verified.');
}
