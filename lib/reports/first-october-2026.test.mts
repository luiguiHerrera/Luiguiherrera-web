import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { buildReportExportModel } from './report-export-model.ts';
import { firstOctober2026Report as report } from './first-october-2026.ts';
import { secondSeptember2026Report } from './second-september-2026.ts';
import { activeMarketReport, getAdjacentReports, getMarketReportBySlug, marketReports, reportMetadataTitle } from './market-reports.ts';
const snapshot = JSON.parse(fs.readFileSync('lib/reports/snapshots/primer-informe-octubre-2026/statistical.json', 'utf8'));

test('October is current; September content and generated adjacency remain intact', () => {
  assert.equal(report.id, 'primer-informe-octubre-2026');
  assert.equal(report.title, 'Primer informe de octubre de 2026');
  assert.equal(report.subtitle, 'El calendario ayuda; la amplitud debe confirmar');
  assert.equal(activeMarketReport, report);
  assert.equal(marketReports.filter(r => r.status === 'actual').length, 1);
  assert.deepEqual(getMarketReportBySlug(secondSeptember2026Report.id), { ...secondSeptember2026Report, status: 'archivado' });
  assert.equal(getAdjacentReports(report.id).previousReport?.id, secondSeptember2026Report.id);
  assert.equal(getAdjacentReports(secondSeptember2026Report.id).nextReport, report);
  assert.equal(getAdjacentReports(report.id).nextReport, null);
  assert.equal(reportMetadataTitle(report), 'Primer informe de octubre de 2026');
  assert.equal(report.publishedAt, '2026-10-05');
  assert.equal(report.automaticDataCutoffAt, '2026-10-02');
});

test('six primary assets, conditional financial distinctions and all six editorial tables survive', () => {
  assert.deepEqual(report.assetReadings.slice(0, 6).map(a => a.asset), ['S&P 500 · SPY', 'Oro · GLD', 'China · FXI', 'Japón · EWJ', 'Bitcoin · BTC', 'Ethereum · ETH']);
  assert(!report.assetReadings.some(a => a.asset.includes('QQQ')));
  assert.match(report.assetReadings[4].story, /acumulación selectiva.*algunos grandes tenedores/);
  assert.match(report.assetReadings[1].changed, /33 toneladas/);
  assert.match(report.assetReadings[5].changed, /no hereda automáticamente/);
  assert.match(report.assetReadings[1].story, /No lo tomo como soporte garantizado ni señal automática de compra/);
  const text = JSON.stringify(report);
  assert.match(text, /Small caps frente a large caps/);
  for (const ticker of ['NVDA','AVGO','TSM','AMAT','ANET','MSFT','AMZN','GOOGL','DDOG','NET','PLTR']) assert(text.includes(ticker));
  assert(!/filecite|sandbox:|turn[0-8]file|\/mnt\/data|file_|ChatGPT/.test(text));
  const tables = report.assetReadings.flatMap(a => a.quantitativePanels ?? []);
  for (const title of ['Rentabilidad semanal · 28 de septiembre–2 de octubre','Estacionalidad de octubre y Q4','Empresas y preguntas de seguimiento','S&P 500: referencias externas y sensibilidad','Lista de control']) assert(tables.some(t => t.title === title && t.rows.length));
  assert.equal(report.calendar.length, 9);
  assert.equal(report.calendar.find(e => e.event === 'Decisión del FOMC')?.startDateTimeUtc, '2026-10-28T18:00:00Z');
  assert.equal(report.calendar.find(e => e.event === 'PIB de Q3 y PCE')?.startDateTimeUtc, '2026-10-29T12:30:00Z');
});

test('frozen prices and distances use October 2 completed observations, including crypto', () => {
  assert.equal(snapshot.authorityCommit, '13c1771fea1d1bcb6bae41c6ba2fcdb76118f48c');
  assert.equal(snapshot.baselineId, '20261003T133327627Z-46174256-7f86-4b1b-8426-59aa0ed97105');
  const closes = { SPY: 769.64, GLD: 380.14, FXI: 33.19, EWJ: 98.92, BTCUSD: 84497.21, ETHUSD: 2668.15 };
  for (const [ticker, close] of Object.entries(closes)) {
    const asset = snapshot.assets[ticker];
    assert.equal(asset.asOf, '2026-10-02');
    assert.equal(asset.provenance.lastCompletedObservation.daily, '2026-10-02');
    assert.equal(asset.levels.lastClose, close);
    assert.equal(asset.periodStart, '2026-09-28');
    for (const [key, value] of Object.entries(asset.levels.levels)) assert.equal(asset.levels.distances[key], Number((close / Number(value) - 1).toFixed(4)));
  }
  const text = JSON.stringify(snapshot);
  assert(!text.includes('84923.15'));
  assert(!text.includes('2680.71'));
  assert(!text.includes('currentMark'));
  assert.equal(report.assetReadings.slice(0, 6).flatMap(a => a.quantitativePanels ?? []).filter(p => p.title === 'Niveles estadísticos').length, 6);
});

// The prose export reads statusLabel/asOf/source on the first row; every row
// follows the same established September checklist contract.
test('checklist satisfies the production prose exporter contract', () => {
  assert.equal(report.watchlist.length, 9);
  for (const row of report.watchlist) {
    for (const field of ['key', 'name', 'whatLooksAt', 'whyItMatters', 'currentReading', 'whatWouldChange', 'status', 'statusLabel', 'asOf', 'source'] as const) assert.equal(typeof row[field], 'string', `${row.key}.${field}`);
    assert.equal(row.status, 'watch');
    assert.equal(row.statusLabel, 'Seguimiento condicional');
    assert.equal(row.asOf, report.editorialCutoffAt);
    assert.match(row.source!, /2 de octubre de 2026/);
  }
});


test('editorial voice, comparison and independent weekly returns', () => {
  const text = JSON.stringify(report);
  assert(!/\bCDI\b|\bCBI\b|Club de Inversionistas|USD[\s/.-]*COP|Felipe Campos|el autor|el editor|material aportado|material recibido|publicación recibida|interpretación atribuida/i.test(text));
  assert(report.marketClose?.comparison.some(b => b.showHeading && b.title === 'Qué cambió desde el segundo informe de septiembre'));
  assert(!report.whatHappened.some(b => b.title === 'Qué cambió desde el segundo informe de septiembre'));
  assert(report.presentation?.sourceLinks?.some(s => s.href === 'https://www.luiguiherrera.com/informes/segundo-informe-septiembre-2026'));
  const prices = JSON.parse(fs.readFileSync('lib/reports/snapshots/primer-informe-octubre-2026/weekly-returns.json', 'utf8'));
  assert.equal(prices.start, '2026-09-25');
  assert.equal(prices.end, '2026-10-02');
  for (const [ticker, raw] of Object.entries(prices.returns)) {
    const row = raw as { start: number; end: number; returnPct: number };
    assert(row.start > 0 && row.end > 0);
    assert.equal(row.returnPct, (row.end / row.start - 1) * 100);
    assert(prices.urls[ticker].startsWith('https://query1.finance.yahoo.com/v8/finance/chart/'));
  }
});

test('three-field watchlist removes redundant content and supplies tracking for every card', () => {
  assert.equal(report.presentation?.watchlistStyle, 'three-fields');
  for (const item of report.watchlist) {
    assert.equal(item.whatLooksAt, '');
    assert(item.whyItMatters && item.currentReading && item.whatWouldChange);
    assert.notEqual(item.whyItMatters, item.name);
    assert(item.href && item.linkLabel);
    assert(item.href === '/dashboard' || item.href.startsWith('https://'));
  }
});


test('market close restores the historical section position without duplicating the comparison', () => {
  const close = report.marketClose!;
  assert.equal(close.title, 'Lecturas de mercado al cierre');
  assert.equal(close.subtitle, 'Estado del mercado al cierre del 2 de octubre de 2026.');
  assert.deepEqual(close.signals.map(s => s.title), ['Qué impulsa', 'Qué frena', 'Qué vigilo']);
  assert.deepEqual(close.quantitativePanels.map(p => p.title), ['Amplitud al corte', 'Condiciones de mercado', 'Rotación / sectores']);
  const sections = buildReportExportModel(report).sections;
  const ids = sections.map(s => s.id);
  assert.equal(ids.indexOf('market-close'), ids.indexOf('context-general') + 1);
  assert.equal(ids.indexOf('asset-follow-up'), ids.indexOf('market-close') + 1);
  assert(!JSON.stringify(report.whatHappened).includes(close.comparison[0].title));
  assert.equal(close.comparison.filter(b => b.title === 'Qué cambió desde el segundo informe de septiembre').length, 1);
  assert(!/currentMark|2026-10-03|VIX|GARCH|EWMA|fragilityScore|averageCorrelation/i.test(JSON.stringify(close)));
});

test('closing readings use reproducible same-window prices and a completed daily MA200 snapshot', () => {
  const data = JSON.parse(fs.readFileSync('lib/reports/snapshots/primer-informe-octubre-2026/market-close.json', 'utf8'));
  assert.equal(data.start, '2026-09-25'); assert.equal(data.end, '2026-10-02');
  for (const [ticker, raw] of Object.entries(data.returns)) {
    const row = raw as { start: number; end: number; returnPct: number };
    assert(row.start > 0 && row.end > 0);
    assert.equal(row.returnPct, (row.end / row.start - 1) * 100);
    assert(data.urls[ticker].includes('period1=1790294400&period2=1790985600'));
  }
  const daily = data.completedDaily;
  assert.equal(daily.sourceCommit, snapshot.authorityCommit);
  assert.equal(daily.baselineId, snapshot.baselineId);
  assert.equal(daily.lastCompletedObservation.daily, '2026-10-02');
  assert.equal(daily.close, snapshot.assets.SPY.levels.lastClose);
  assert.equal(daily.ma200, 717.04);
  assert.equal(daily.distanceMa200Pct, (daily.close / daily.ma200 - 1) * 100);
  assert(!JSON.stringify(data).includes('currentMark'));
  const panels = report.marketClose!.quantitativePanels;
  assert.equal(panels[0].rows[1][2], '−0,43 pp');
  assert.equal(panels[0].rows[2][2], '+0,06 pp');
  assert.equal(panels[0].rows[3][2], '+0,90 pp');
  assert.equal(panels[2].rows.length, 11);
  assert(panels[2].intro.startsWith('3 de 11'));
});
