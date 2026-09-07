import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { marketReports, activeMarketReport, getMarketReportBySlug } from './market-reports.ts';
import { firstSeptember2026AutomaticReadings, getHistoricalAutomaticReadings } from './historical-automatic-readings.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { buildReportAssetSnapshot, createReportStatisticalEngine } from '../../scripts/report-statistical-snapshot.mjs';
import { buildRegimeSummary } from '../dashboard/regime-scoring.ts';
const id='primer-informe-septiembre-2026';
const base='lib/reports/snapshots/'+id;
const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const stats=json(base+'/statistical.json');
const { universe } = createReportStatisticalEngine('2026-09-04');
const evidence=JSON.parse(gunzipSync(readFileSync(base+'/prices-evidence.json.gz')).toString());
const report=getMarketReportBySlug(id)!;

// Exercise the actual live orchestrator used by /dashboard with post-publication provider data.
// Only test providers are mocked; report lookup/export and scoring are production code.
test('critical canary: report remains 04/09 and its values while the real Dashboard loader advances to 08/09', async()=>{
  let live=json(base+'/dashboard-evidence.json');
  const before=JSON.stringify(buildReportExportModel(report));
  const modules=[
    ['sector-etfs',{getSectorEtfsData:async()=>({module:live.dashboardModules[0],rotation:live.sectorRotation,quantRisk:live.quantRisk})}],
    ['vix',{getVixData:async()=>live.vix}],
    ['btc-etf-flows',{getBtcEtfFlowsData:async()=>live.btcEtfFlows}],
    ['vix-term-structure',{getVixTermStructureData:async()=>live.vixTermStructure}],
    ['gld-flow-pressure',{getGldFlowPressure:async()=>live.gldFlowPressure}],
  ] as const;
  for(const [name,namedExports] of modules) mock.module(`../dashboard/adapters/${name}.ts`,{namedExports});
  const {getDashboardData}=await import('../dashboard/get-dashboard-data.ts');
  assert.equal((await getDashboardData()).gldFlowPressure?.asOf,'2026-09-04');
  live=structuredClone(live);
  live.gldFlowPressure.asOf='2026-09-08';
  live.gldFlowPressure.fiveDayShareChangePct=0.08;
  live.vix.spot.latestVix=31;
  live.vix.spot.lastUpdated='Último cierre disponible: 08 de sept de 2026';
  live.vix.spot.history.push({date:'2026-09-08',value:31});
  live.sectorRotation.lastUpdated='Automático con fuente pública: 2026-09-08';
  live.sectorRotation.sectors.forEach((s:{lastUpdated:string})=>s.lastUpdated='2026-09-08');
  live.sectorRotation.sectors[0].return1w=12.34;
  live.vixTermStructure.lastUpdated='Último settlement disponible: 08 de sept de 2026';
  live.vixTermStructure.points[0].value=32;
  live.btcEtfFlows.flows.latestDate='2026-09-08';
  live.btcEtfFlows.flows.latestTotalNetFlow=-1234;
  const after=await getDashboardData();
  assert.equal(after.gldFlowPressure?.asOf,'2026-09-08');
  assert.equal(after.gldFlowPressure?.fiveDayShareChangePct,0.08);
  assert.equal(after.vix?.spot.latestVix,31);
  assert.equal(after.sectorRotation?.sectors[0].return1w,12.34);
  assert.equal(after.vixTermStructure?.lastUpdated,'Último settlement disponible: 08 de sept de 2026');
  assert.equal(after.vixTermStructure?.points[0].value,32);
  assert.equal(after.btcEtfFlows?.flows.latestDate,'2026-09-08');
  assert.equal(after.btcEtfFlows?.flows.latestTotalNetFlow,-1234);
  assert.equal(getHistoricalAutomaticReadings(id)?.dataDate,'2026-09-04');
  assert.equal(getHistoricalAutomaticReadings(id)?.vix?.level,14.32);
  assert.equal(JSON.stringify(buildReportExportModel(report)),before);
  const route=readFileSync('app/(es)/informes/[slug]/page.tsx','utf8');
  assert(route.includes('getHistoricalAutomaticReadings(report.id)'));
  assert(!/buildWeeklyReportData|getDashboardData/.test(route));
  assert(readFileSync('app/(es)/dashboard/page.tsx','utf8').includes('getDashboardData()'));
  mock.restoreAll();
});

test('the frozen automatic snapshot rejects accidental in-process writes',()=>{
  assert.throws(()=>{firstSeptember2026AutomaticReadings.regime.score=0},TypeError);
  assert.throws(()=>{firstSeptember2026AutomaticReadings.sectors.leaders.push({ticker:'FAKE',name:'fake',return1w:999})},TypeError);
});

test('September presentation corrects rotation wording without changing the frozen model or other signals',()=>{
  const captured=json(base+'/automatic.json');
  const snapshot=getHistoricalAutomaticReadings(id)!;
  const wording='Rotación: El liderazgo fue selectivo. Energía y Tecnología encabezaron la semana, pero Utilities también estuvo entre los líderes. No hubo una rotación uniforme hacia growth/cíclicos ni un rezago general de los defensivos.';
  assert.equal(snapshot.regime.support[0],wording);
  assert.deepEqual({...snapshot.regime,support:captured.regime.support},captured.regime);
  assert.deepEqual(snapshot.regime.support.slice(1),captured.regime.support.slice(1));
  assert.deepEqual(snapshot.weeklyReview,json(base+'/weekly-review.json'));
  for(const key of ['sectors','vix','vixTermStructure','quantRadar','btcEtfFlows','gldFlowPressure'] as const){
    assert.deepEqual(snapshot[key],captured[key]);
  }
  const exported=JSON.stringify(buildReportExportModel(report));
  assert(exported.includes(wording));
  assert(!exported.includes(captured.regime.support[0]));
  // The shared Dashboard model must still produce its original captured signal.
  const liveModel=buildRegimeSummary(json(base+'/dashboard-evidence.json'));
  assert(JSON.stringify(liveModel).includes('Sectores growth/cíclicos lideran y defensivos quedan rezagados.'));
});

test('snapshot integrity and automated readings agree with the saved provider evidence',()=>{
  for (const [file, hash] of Object.entries(json(base+'/integrity.json').files)) {
    assert.equal(createHash('sha256').update(readFileSync(base+'/'+file)).digest('hex'), hash, file);
  }
  const providers = json(base+'/dashboard-evidence.json');
  const snapshot = firstSeptember2026AutomaticReadings;
  const regime = buildRegimeSummary(providers);
  assert.equal(snapshot.regime.score, regime.regimeScore);
  assert.equal(snapshot.regime.confidence, regime.confidence);
  assert.equal(snapshot.regime.label, regime.current);
  assert.equal(snapshot.vix?.level, providers.vix.spot.latestVix);
  assert.equal(snapshot.vix?.asOf, providers.vix.spot.history.at(-1).date);
  assert(providers.vix.spot.history.every((row:{date:string})=>row.date<='2026-09-04'));
  assert.equal(snapshot.quantRadar?.fragilityScore, providers.quantRisk.fragilityScore);
  assert.equal(snapshot.quantRadar?.ewmaVolAnnualized, providers.quantRisk.ewmaVolAnnualized);
  assert.equal(snapshot.quantRadar?.garchVolForecast, providers.quantRisk.garchVolForecast);
  assert.equal(snapshot.gldFlowPressure?.sharesChange5dPct, providers.gldFlowPressure.fiveDayShareChangePct*100);
  assert.equal(snapshot.vixTermStructure?.vx2MinusVx1, providers.vixTermStructure.m1m2Spread);
  const rows = json(base+'/btc-source.json').rows.slice(-5) as string[][];
  assert.deepEqual(rows.map(row=>row[0]), ['31 Aug 2026','01 Sep 2026','02 Sep 2026','03 Sep 2026','04 Sep 2026']);
  const total = (row:string[])=>Number(row.at(-1)!.replace('(', '-').replace(')', ''));
  assert(Math.abs(rows.reduce((sum,row)=>sum+total(row),0)-snapshot.btcEtfFlows!.rolling5dUsdMillions)<0.001);
  assert.equal(total(rows.at(-1)!),snapshot.btcEtfFlows?.lastDayUsdMillions);
});

for(const [ticker,n] of Object.entries({SPY:8,GLD:5,FXI:5,EWJ:7,BTCUSD:2,ETHUSD:2})){
  test(`${ticker}: levels and Midterm seasonality reproduce from frozen evidence and exclude future observations`,()=>{
    const asset=universe.find((a:{ticker:string})=>a.ticker===ticker);
    const rows=evidence[ticker].rows;
    const actual=buildReportAssetSnapshot(asset,rows,'2026-09-04','Yahoo Finance historical chart');
    assert.deepEqual(actual,stats.assets[ticker]);
    const future={...rows.at(-1),date:'2026-09-08',periodStart:'2026-09-08',periodEnd:'2026-09-08',close:999999,adjustedClose:999999};
    assert.deepEqual(buildReportAssetSnapshot(asset,[...rows,future],'2026-09-04','Yahoo Finance historical chart'),actual);
    assert.equal(actual.asOf,'2026-09-04');
    assert.equal(actual.periodStart,'2026-08-31');
    assert.equal(actual.levels.lastClose,Number(rows.at(-1).adjustedClose.toFixed(2)));
    assert(actual.levels.available && actual.levels.periods>52);
    assert(actual.levels.levels.WSLE<actual.levels.levels.WALE && actual.levels.levels.WALE<actual.levels.levels.WAHE && actual.levels.levels.WAHE<actual.levels.levels.WSHE);
    assert.equal(actual.seasonality.window,'All');
    assert.equal(actual.seasonality.month,9);
    assert.equal(actual.seasonality.sampleSize,n);
    assert(actual.seasonality.years.every((year:number)=>year%4===2 && year<2026));
    assert(actual.seasonality.years.length<=10);
    for(const week of actual.seasonality.weeks){
      const observations=actual.seasonality.observations.filter((o:{weekOfMonth:number})=>o.weekOfMonth===week.weekOfMonth);
      assert.equal(week.sampleSize,observations.length);
      const winRate=observations.filter((o:{returnValue:number})=>o.returnValue>0).length/observations.length;
      assert(Math.abs(winRate-week.winRate)<0.000051);
      assert.equal(new Set(observations.map((o:{year:number})=>o.year)).size,observations.length);
    }
    assert.throws(()=>buildReportAssetSnapshot(asset,rows.filter((r:{date:string})=>r.date!=='2026-09-04'),'2026-09-04','test'),/missing exact close/);
  });
}

test('canonical content, asset order, future confirmed calendar and historical implied moves',()=>{
  assert.equal(activeMarketReport.id,id);
  assert.equal(marketReports.filter(r=>r.status==='actual').length,1);
  assert.equal(report.editorialCutoffAt,'2026-09-06');
  assert.equal(report.automaticDataCutoffAt,'2026-09-04');
  assert.equal(report.whatHappened.length,6);
  assert(!report.thesis && !report.executiveSummary);
  assert.deepEqual(report.assetReadings.map(a=>a.asset),['S&P 500','Oro','China','Japón','Bitcoin','Ethereum','DXY','Stockpicking']);
  assert.deepEqual(buildReportExportModel(report).sections.map(s=>s.title),['Contexto general','Lecturas de mercado al cierre','Lectura por activo','Calendario de eventos','Rutas probables','Lista de control','Fuentes y aviso educativo']);
  for(const asset of report.assetReadings.slice(0,6)){
    assert(!asset.watch && !asset.reading && !asset.timeline);
    assert.deepEqual(asset.quantitativePanels?.map(p=>p.title),['Niveles estadísticos','Estacionalidad de septiembre']);
  }
  for(const e of report.calendar){
    assert(e.dateStart!>'2026-09-06');
    assert.equal(e.dateConfirmationStatus,'confirmed');
    assert(e.sourceHref?.startsWith('https://'));
    assert(e.timeStatus==='confirmed'? Boolean(e.startDateTimeUtc):!e.startDateTimeUtc);
  }
  assert.equal(report.calendar.find(e=>e.event==='China · CPI y PPI de agosto')?.startDateTimeUtc,'2026-09-09T01:30:00Z');
  assert.equal(report.calendar.find(e=>e.event==='China · actividad y ventas minoristas de agosto')?.displayTimeCest,'04:00 CEST');
  const old=getMarketReportBySlug('segundo-informe-agosto-2026')!;
  for(const row of report.stockpicking!.earnings.published){
    const previous=old.stockpicking!.earnings.upcoming.find(r=>r.ticker===row.ticker)!;
    assert.equal(row.impliedMovePct,previous.impliedMovePct);
    assert.equal(row.consultedAt,previous.consultedAt);
    const reaction=stats.earnings[row.ticker];
    assert.equal(row.actualMovePct,(reaction.after/reaction.before-1)*100);
  }
});

test('all previously published artifacts remain byte-identical to the base commit',()=>{
  const baseCommit='80e5cc26d29d68d71ff55022f6897bd3e08640bf';
  for(const old of marketReports.filter(r=>r.id!==id)){
    for(const ext of ['pdf','html','md',...(old.calendarHref ? ['ics'] : [])]){
      const file=ext==='ics' ? `public${old.calendarHref}` : `public/reports/${old.id}.${ext}`;
      const original=execFileSync('git',['show',`${baseCommit}:${file}`],{maxBuffer:20*1024*1024});
      assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),createHash('sha256').update(original).digest('hex'),file);
    }
  }
});

test('September implied moves use the unchanged August publication as historical authority, not a new options observation',()=>{
  const august=getMarketReportBySlug('segundo-informe-agosto-2026')!;
  const markdown=readFileSync('public/reports/segundo-informe-agosto-2026.md','utf8');
  const html=readFileSync('public/reports/segundo-informe-agosto-2026.html');
  // Pin the published authority, including its percentages, approximate dollar moves and consultation date.
  assert.equal(createHash('sha256').update(markdown).digest('hex'),'5a267530dcb66c963c6a383a50d3635a1e94ce6037853cd2dde608c05feb56a6');
  assert.equal(createHash('sha256').update(html).digest('hex'),'383edb037d4e697e7083754ad5f01f3275cdd896ea105a0de578d567ccd23886');
  for(const [ticker,pct,dollars,realized] of [['FUTU',7.04,'7,42',3.03],['NVDA',6.18,'13,94',8.74]] as const){
    const original=august.stockpicking!.earnings.upcoming.find(row=>row.ticker===ticker)!;
    const current=report.stockpicking!.earnings.published.find(row=>row.ticker===ticker)!;
    assert.equal(original.impliedMovePct,pct);
    assert.equal(current.impliedMovePct,original.impliedMovePct);
    assert.equal(current.consultedAt,original.consultedAt);
    assert.equal(current.consultedAt,'2026-08-16');
    assert.equal(current.impliedMoveProviderHref,'/reports/segundo-informe-agosto-2026.html');
    assert.match(current.impliedMoveProvider,/Segundo informe de agosto.*snapshot congelado.*observación original: Unusual Whales/);
    assert(markdown.includes(`aproximadamente ±${dollars} dólares`));
    assert(markdown.includes(`| ${original.reportDate} | ${original.company} (${ticker}) | ±${pct.toFixed(2).replace('.',',')} % |`));
    const reaction=stats.earnings[ticker];
    assert.equal(current.actualMovePct,(reaction.after/reaction.before-1)*100);
    assert.equal(Number(current.actualMovePct!.toFixed(2)),realized);
    assert.match(current.actualMoveMethodology!,/Cierre regular.*cierre regular.*Sin after-hours/);
  }
  assert.match(report.stockpicking!.earnings.methodology,/movimiento implícito registrado en el informe anterior/);
  assert.match(report.stockpicking!.earnings.methodology,/No es una nueva observación ni una verificación de opciones en septiembre/);
});
