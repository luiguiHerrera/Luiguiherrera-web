import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { secondSeptember2026Report as report, secondSeptember2026AutomaticReadings as snapshot } from './second-september-2026.ts';
import { activeMarketReport, marketReports, getMarketReportBySlug } from './market-reports.ts';
import { getHistoricalAutomaticReadings, firstSeptember2026AutomaticReadings } from './historical-automatic-readings.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { buildSecondSeptemberStatistics } from '../../scripts/second-september-snapshot.mjs';
import { buildSecondSeptemberReconciliation } from '../../scripts/second-september-reconciliation.mjs';
import { freezeGeneratedReportAsset } from '../../scripts/report-statistical-snapshot.mjs';
const base = 'lib/reports/snapshots/segundo-informe-septiembre-2026';
const json = (name: string) => JSON.parse(fs.readFileSync(`${base}/${name}`, 'utf8'));
const stats = json('statistical.json');
const evidence = JSON.parse(gunzipSync(fs.readFileSync(`${base}/authority-evidence.json.gz`)).toString());
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

test('approved edition is current, publicly registered and backed by its frozen snapshot', () => {
  assert.equal(report.status, 'actual');
  assert.equal(activeMarketReport.id, report.id);
  assert.equal(marketReports.filter(r => r.status === 'actual').length, 1);
  assert.equal(getMarketReportBySlug(report.id), report);
  assert.equal(getMarketReportBySlug('primer-informe-septiembre-2026')?.status, 'archivado');
  assert.equal(getHistoricalAutomaticReadings(report.id), snapshot);
  assert.equal(report.publishedAt, '2026-09-21');
  assert.equal(report.automaticDataCutoffAt, '2026-09-18');
  for (const extension of ['html', 'md', 'pdf']) assert(fs.existsSync(`public/reports/${report.id}.${extension}`));
  assert(fs.readFileSync('public/reports/manifest.json', 'utf8').includes(report.id));
  assert(fs.readFileSync('public/llms.txt', 'utf8').includes(report.id));
  assert.equal(buildReportExportModel(report).sections.find(s => s.kind === 'historical-snapshot')?.snapshot, snapshot);
  assert.equal(report.calendarHref, `/reports/${report.id}-calendar.ics`);
});

test('published export carries the entire immutable snapshot plus all 10 comparable metrics', () => {
  const model = buildReportExportModel(report, snapshot);
  const section = model.sections.find(s => s.kind === 'historical-snapshot');
  assert(section?.kind === 'historical-snapshot');
  assert.equal(section.snapshot, snapshot);
  assert.equal(snapshot.cutoffComparison?.rows.length, 10);
  assert.equal(snapshot.cutoffComparison?.fromDate, '2026-09-04');
  assert.equal(snapshot.cutoffComparison?.toDate, snapshot.dataDate);
  assert.equal(snapshot.vix?.asOf, '2026-09-17');
  assert.equal(snapshot.vixTermStructure?.points?.length, 8);
  assert(snapshot.gldFlowPressure && snapshot.btcEtfFlows && snapshot.quantRadar && snapshot.breadth);
  assert.throws(() => { snapshot.regime.score = 1; }, TypeError);
  assert.throws(() => { snapshot.cutoffComparison!.rows[0].after = 'changed'; }, TypeError);
});

test('all statistical projections reproduce offline, with exact Friday crypto closes and original levels', () => {
  assert.deepEqual(buildSecondSeptemberStatistics(), stats);
  const controls: Record<string, number[]> = {
    SPY: [761.69, 731.64, 746.28, 770.92, 782.47], GLD: [401.17, 378.65, 385.61, 398.23, 404.19],
    FXI: [34.32, 32.77, 33.78, 35.52, 36.41], EWJ: [97, 93.6, 95.54, 99.13, 100.94],
    BTCUSD: [80901.46, 64314.56, 71582.64, 82260.6, 88196.88], ETHUSD: [2611.35, 1911.61, 2232.44, 2691.48, 2919.69],
  };
  for (const [ticker, values] of Object.entries(controls)) {
    const asset = stats.assets[ticker], levels = asset.levels.levels;
    assert.deepEqual([asset.levels.lastClose, levels.WSLE, levels.WALE, levels.WAHE, levels.WSHE], values);
    assert.equal(asset.asOf, '2026-09-18');
    assert.equal(asset.periodStart, '2026-09-14');
    assert(asset.seasonality.years.every((year: number) => year < 2026 && year % 4 === 2));
    assert(asset.seasonality.years.length <= 10);
    for (const week of asset.seasonality.weeks) {
      const observations = asset.seasonality.observations.filter((r: {weekOfMonth: number}) => r.weekOfMonth === week.weekOfMonth);
      assert.equal(week.sampleSize, observations.length);
    }
    const record = JSON.parse(evidence.files[`generated/assets/${ticker}.json`]);
    const season = JSON.parse(evidence.files[`generated/seasonality/${ticker}.json`]);
    const project = (r: typeof record) => freezeGeneratedReportAsset(r, season, asset.seasonality, '2026-09-18');
    const before = project(record);
    record.lastClose = 99999999;
    record.currentMark.value = 99999999;
    record.frequencies.daily.recentPeriods.unshift({period:'2026-09-19',periodEnd:'2026-09-19',close:99999999});
    assert.deepEqual(project(record), before);
    record.frequencies.daily.recentPeriods = record.frequencies.daily.recentPeriods.filter((r: {period: string}) => r.period !== '2026-09-18');
    assert.throws(() => project(record), /missing exact close/);
  }
});

test('autumn Midterm controls and independent BTC 2020 sample retain actual N', () => {
  assert.deepEqual(stats.spyMidtermAutumn.map((r: {sampleSize:number}) => r.sampleSize), [8, 8, 8]);
  assert.deepEqual(stats.spyMidtermAutumn.map((r: {winRate:number}) => r.winRate), [.5, .875, .75]);
  assert.deepEqual(stats.btc2020.months.map((r: {sampleSize:number}) => r.sampleSize), [6, 6]);
  assert.equal(Math.round(stats.btc2020.months[0].averageReturn * 10000) / 100, -.19);
  assert.equal(Math.round(stats.btc2020.months[1].averageReturn * 10000) / 100, 18.13);
  for (const month of [9, 10]) {
    const rows = stats.btc2020.observations.filter((r: {month:number}) => r.month === month);
    assert.equal(rows.filter((r: {returnValue:number}) => r.returnValue > 0).length, month === 9 ? 3 : 5);
    assert(rows.every((r: {year:number}) => r.year >= 2020 && r.year <= 2025));
  }
  assert(stats.btc2020.currentSeptemberReturn > 0);
});

test('Farside sum is final and calendar uses verified future events', () => {
  const rows = json('btc-source.json').rows;
  assert(Math.abs(rows.reduce((sum: number, row: {total:number}) => sum + row.total, 0) - snapshot.btcEtfFlows!.rolling5dUsdMillions) < 1e-9);
  assert.equal(snapshot.btcEtfFlows!.rolling5dUsdMillions, 6.1);
  assert.doesNotMatch(snapshot.btcEtfFlows!.reading, /negativo|reconciliación/);
  assert.equal(snapshot.regime.score, null);
  assert.equal(snapshot.regime.confidence, null);
  const model = buildReportExportModel(report, snapshot);
  assert.equal(model.events.length, 3);
  assert(model.events.every(event => event.startDate >= report.publishedAt && event.startDateTimeUtc?.endsWith('T12:30:00Z')));
});

test('persisted evidence hashes are intact', () => {
  for (const [file, hash] of Object.entries(json('integrity.json').files)) assert.equal(sha(fs.readFileSync(`${base}/${file}`)), hash, file);
});

// Exercise the real shared React presentation, with TSX transformed only in tests.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'next/link') return next('next/link.js', context);
    if (specifier.startsWith('@/')) {
      for (const ext of ['.ts', '.tsx']) {
        const file = path.resolve(specifier.slice(2) + ext);
        if (fs.existsSync(file)) return next(pathToFileURL(file).href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.tsx')) return {format: 'module', shortCircuit: true, source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX}}).outputText};
    return next(url, context);
  },
});

test('shared web renderer adds comparison and retains all normal closing modules; old editions are compatible', async () => {
  const { HistoricalAutomaticMarketReadings } = await import('../../components/reports/HistoricalAutomaticMarketReadings.tsx');
  const html = renderToStaticMarkup(createElement(HistoricalAutomaticMarketReadings, {snapshot}));
  for (const row of snapshot.cutoffComparison!.rows) for (const text of [row.metric, row.before, row.after]) assert(html.includes(text), text);
  for (const text of ['Qué cambió desde el Primer Informe', 'Rotación sectorial', 'GLD', 'VIX', 'BTC']) assert(html.includes(text), text);
  const oldHtml = renderToStaticMarkup(createElement(HistoricalAutomaticMarketReadings, {snapshot: firstSeptember2026AutomaticReadings}));
  assert(!oldHtml.includes('Comparación entre cortes'));
  assert(oldHtml.includes('2026-09-04'));
});


test('frozen engine replays radar exactly and keeps later V1 observation separate from historical proof', async () => {
  const result = await buildSecondSeptemberReconciliation();
  assert.deepEqual(result, json('reconciliation.json'));
  assert.equal(result.exactV1At18Reproduced, false);
  assert.equal(result.observedV1.score, 70);
  assert.equal(result.observedV1.confidence, 74);
  assert.equal(result.observedV1.btcCoverage, 'partial');
  assert.equal(result.cuts['2026-09-18'].radar.garchVolForecast, snapshot.quantRadar!.garchVolForecast);
  assert.equal(snapshot.quantRadar!.garchVolForecast, 8.225730815490758);
  assert(snapshot.cutoffComparison!.rows.every(row => row.authority && row.methodology));
  assert(!snapshot.cutoffComparison!.rows.some(row => /Régimen|Score|Confianza/.test(row.metric)));
});

test('breadth uses identical five-session conventions and long-average universe at both cutoffs', () => {
  const audit = json('reconciliation.json');
  for (const date of ['2026-09-04', '2026-09-18']) {
    const cut = audit.cuts[date];
    assert.equal(cut.longAverage.length, 11);
    for (const ticker of ['RSP','IWM','QQQ']) {
      assert.deepEqual(cut.returns[ticker].sessions, cut.returns.SPY.sessions);
      assert.equal(cut.returns[ticker].sessions.length, 6);
      assert.equal(cut.breadth[ticker], cut.returns[ticker].returnPct - cut.returns.SPY.returnPct);
    }
  }
  assert.equal(snapshot.breadth!.rspVsSpy1wPp, audit.cuts['2026-09-18'].breadth.RSP);
  assert.equal(snapshot.breadth!.iwmVsSpy1wPp, audit.cuts['2026-09-18'].breadth.IWM);
  assert.equal(snapshot.breadth!.qqqVsSpy1wPp, audit.cuts['2026-09-18'].breadth.QQQ);
  assert.equal(snapshot.breadth!.sectorsOverLongAverage, 4);
  assert.equal(firstSeptember2026AutomaticReadings.breadth!.windowLabel, '31/08–04/09');
  assert.equal(sha(fs.readFileSync(`${base}/statistical.json`)), 'ce0b01acc94af35213f1edffd0df7fd1a8299f33dbba3f176d0207303558fe14');
});
