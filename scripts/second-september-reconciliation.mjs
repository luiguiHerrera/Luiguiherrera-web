import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const base = 'lib/reports/snapshots/segundo-informe-septiembre-2026';
const read = name => JSON.parse(fs.readFileSync(`${base}/${name}`, 'utf8'));
const unzip = name => JSON.parse(gunzipSync(fs.readFileSync(`${base}/${name}`)));
const sha = value => createHash('sha256').update(value).digest('hex');
const near = (a, b) => assert(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText).toString('base64');

export async function buildSecondSeptemberReconciliation() {
  const code = unzip('reconciliation-code.json.gz');
  const mathUrl = moduleUrl(code.files['lib/dashboard/math.ts']);
  const risk = await import(moduleUrl(code.files['lib/dashboard/risk-models.ts'].replace('"./math.ts"', JSON.stringify(mathUrl))));
  const regime = await import(moduleUrl(code.files['lib/dashboard/regime-scoring.ts']));
  const first = JSON.parse(fs.readFileSync('lib/reports/snapshots/primer-informe-septiembre-2026/dashboard-evidence.json', 'utf8'));
  const second = read('dashboard-evidence.json');
  const assets = unzip('breadth-evidence.json.gz');
  const provenance = JSON.parse(assets.files['generated-provenance.json']);
  for (const [file, contents] of Object.entries(assets.files)) {
    if (file.startsWith('generated/')) assert.equal(sha(contents), provenance.snapshots.find(row => `generated/${row.FILE}` === file)?.SNAPSHOT_SHA256, file);
  }
  const asset = ticker => JSON.parse(assets.files[`generated/assets/${ticker}.json`]);
  const universe = ['XLK','XLF','XLV','XLE','XLY','XLP','XLI','XLB','XLU','XLRE','XLC'];
  const cuts = {};
  for (const [date, rotation, observedRisk] of [
    ['2026-09-04', first.sectorRotation, first.quantRisk],
    ['2026-09-18', second.modules[1], second.modules[2]],
  ]) {
    assert.deepEqual(rotation.sectors.map(row => row.etfTicker), universe);
    assert.equal(rotation.closeConvention, 'close');
    for (const sector of rotation.sectors) {
      assert.equal(sector.lastUpdated, date);
      assert.equal(sector.dailyReturns.length, 99);
      const prices = sector.detailSeries.find(series => series.period === '252d').points;
      assert.equal(prices.length, 100);
      for (let i = 1; i < prices.length; i++) near(prices[i] / prices[i - 1] - 1, sector.dailyReturns[i - 1]);
      near(100 * (prices.at(-1) / prices.at(-6) - 1), sector.return1w);
    }
    const radar = risk.buildQuantRiskData(rotation.sectors, rotation.metrics, rotation.lastUpdated);
    for (const field of ['garchVolForecast','ewmaVolAnnualized','averageCorrelation21d','averageCorrelation63d','fragilityScore','sectorDispersion1w']) near(radar[field], observedRisk[field]);
    near(Math.max(...rotation.sectors.map(s => s.return1w)) - Math.min(...rotation.sectors.map(s => s.return1w)), radar.sectorDispersion1w);
    const returns = {};
    for (const ticker of ['SPY','RSP','IWM','QQQ']) {
      const rows = asset(ticker).frequencies.daily.recentPeriods.filter(row => row.period <= date).sort((a,b) => a.period.localeCompare(b.period)).slice(-6);
      assert.equal(rows.length, 6);
      assert.equal(rows.at(-1).period, date);
      assert.equal(rows[0].period, date === '2026-09-04' ? '2026-08-28' : '2026-09-11');
      returns[ticker] = {sessions: rows.map(row => row.period), startClose: rows[0].close, endClose: rows.at(-1).close, returnPct: 100 * (rows.at(-1).close / rows[0].close - 1)};
    }
    const longAverage = universe.map(ticker => {
      const row = asset(ticker).compactSeries.find(point => point.date === date);
      assert(row && Number.isFinite(row.ma200));
      return {ticker, ...row, above: row.close > row.ma200};
    });
    cuts[date] = {
      radar: Object.fromEntries(['garchVolForecast','ewmaVolAnnualized','averageCorrelation21d','fragilityScore','fragilityLabel','sectorDispersion1w'].map(field => [field, radar[field]])),
      positiveSectors: rotation.sectors.filter(s => s.return1w > 0).length,
      negativeSectors: rotation.sectors.filter(s => s.return1w < 0).length,
      returns,
      breadth: Object.fromEntries(['RSP','IWM','QQQ'].map(ticker => [ticker, returns[ticker].returnPct - returns.SPY.returnPct])),
      longAverage,
      sectorsAboveMA200: longAverage.filter(row => row.above).length,
    };
  }
  const observed = regime.buildRegimeSummary({sectorRotation: second.modules[1], vix: second.modules[3], btcEtfFlows: second.modules[5]});
  for (const field of ['regimeScore','confidence','current','dataStatus']) assert.equal(observed[field], second.modules[0][field]);
  const btc = read('btc-source.json');
  assert.deepEqual(btc.rows.map(row => row.date), ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18']);
  const btc5d = Math.round(btc.rows.reduce((sum, row) => sum + row.total, 0) * 10) / 10;
  let streak = 0;
  for (const row of [...btc.rows].reverse()) { if (row.total <= 0) break; streak++; }
  return {
    schema: 'second-september.reconciliation.v1', baselineId: provenance.BASELINE_ID,
    sourceRevision: code.commit,
    codeHashes: Object.fromEntries(Object.entries(code.files).map(([file, contents]) => [file, sha(contents)])),
    exactV1At18Reproduced: false,
    v1Decision: 'Omitir régimen, score y confianza de la comparación. El replay reproduce la captura del 21/09, no prueba el estado del adaptador ni el despliegue al cierre del 18/09. No se cambia Bitbo por Farside dentro del motor.',
    observedV1: {retrievedAt: second.retrievedAt, score: observed.regimeScore, confidence: observed.confidence, status: observed.dataStatus,
      sectorDate: '2026-09-18', vixDate: '2026-09-17', btcDate: second.modules[5].flows.latestDate,
      btcSource: second.modules[5].flows.sourceName, btcCoverage: second.modules[5].flows.coverage, btcRows: second.modules[5].flows.rowsParsed},
    radarAuthority: 'Alpha Vantage TIME_SERIES_DAILY, cierre sin ajustar, 11 ETF, 100 precios / 99 retornos simples por corte. Replay exacto buildQuantRiskData de la revisión congelada; media equiponderada diaria, anualización 252, EWMA lambda 0,94, GARCH alpha 0,06 beta 0,90 y omega derivado de varianza muestral. Correlación media de 55 pares a 21 sesiones; dispersión = máximo menos mínimo de retorno 5D, en pp.',
    breadthAuthority: 'Statistical Levels / Yahoo: cierres diarios ajustados publicados a dos decimales del mismo baseline 19/09. Diferencia de retornos simples ETF menos SPY, en pp, cinco intervalos / seis cierres. MA200 publicada por esa misma autoridad sobre los mismos 11 ETF; no se usa Alpha Vantage para MA200.',
    breadthWindow: '5 sesiones terminadas en cada corte: 28/08–04/09 y 11/09–18/09. El primer informe conserva intacta su ventana original de cuatro intervalos.',
    btcAuthority: btc.url, btc5dUsdMillions: btc5d, btcInflowStreak: streak,
    spyBetweenCutoffsPct: 100 * (cuts['2026-09-18'].returns.SPY.endClose / cuts['2026-09-04'].returns.SPY.endClose - 1),
    cuts,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await buildSecondSeptemberReconciliation();
  if (process.argv.includes('--check')) assert.deepEqual(result, read('reconciliation.json'));
  else fs.writeFileSync(`${base}/reconciliation.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({exactV1At18Reproduced: result.exactV1At18Reproduced, observedV1: result.observedV1, btc5d: result.btc5dUsdMillions, cuts: Object.fromEntries(Object.entries(result.cuts).map(([date, value]) => [date, {radar:value.radar,breadth:value.breadth,MA200:value.sectorsAboveMA200}]))},null,2));
}
