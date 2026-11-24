import assert from 'node:assert/strict';
import test from 'node:test';
import { flowOverviewItems, flowMonthCaption, formatFlowAmount } from './dashboard-overview.ts';
import { dashboardText } from './dashboard-localization.ts';
import { sessionDates } from '../research/mcclellan-core.mjs';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
const asOf = new Date('2026-11-24T10:00:00Z');
const dates = sessionDates('2026-10-01','2026-11-23');
function model(cutoffDate='2026-11-23'):CapitalFlowAssetPreview {
  return {id:'sp500',title:'',eyebrow:'',description:'',cutoffDate,metricBasis:'daily-sum',kind:'estimated',vehicles:['SPY'],sources:[],notes:[],points:dates.filter(date=>date<=cutoffDate).map(date=>({date,flow:date.startsWith('2026-11')?2e6:7e6,complete:true,funds:[]}))};
}
test('summary uses calendar month-to-date rather than the last 20 sessions',()=>{
  const source=model();
  assert.equal(flowOverviewItems([source],'en',asOf)[0].value,'+32.0 M USD');
  assert.equal(source.points.slice(-20).reduce((sum,row)=>sum+row.flow!,0),60e6);
  assert.equal(flowMonthCaption('en',asOf),'November 2026 · USD');
});
test('each fund retains its effective close while sharing the same calendar month',()=>{
  const first=model('2026-11-20'),second={...model(),id:'eth' as const};
  const result=flowOverviewItems([first,second],'en',asOf);
  assert.equal(result[0].value,'+30.0 M USD');assert.equal(result[1].value,'+32.0 M USD');
  assert.equal(result[0].date,'Nov 20, 2026');assert.equal(result[1].date,'Nov 23, 2026');
});
test('a missing, incomplete or null session never becomes a zero or a compressed window',()=>{
  for(const kind of ['absent','partial','null']) {
    const source=model();
    if(kind==='absent') source.points=source.points.filter(point=>point.date!=='2026-11-09');
    else source.points=source.points.map(point=>point.date==='2026-11-09'?{...point,flow:kind==='null'?null:point.flow,complete:kind!=='partial'}:point);
    assert.match(flowOverviewItems([source],'en',asOf)[0].value,/Not enough.*data/);
  }
});
test('a real zero month remains distinct from a source that has no current-month data',()=>{
  const zero=model();zero.points=zero.points.map(point=>({...point,flow:0}));
  assert.equal(flowOverviewItems([zero],'en',asOf)[0].value,'0.0 M USD');
  assert.match(flowOverviewItems([model('2026-10-30')],'en',asOf)[0].value,/Not enough.*data/);
});
test('GLD preserves endpoint shares × final NAV for the month instead of summing daily estimates',()=>{
  const source={...model(),id:'gold' as const,metricBasis:'ending-nav' as const};
  source.observations=dates.map((date,index)=>({date,shares:100e6+index*1e6,nav:date==='2026-11-23'?12:10}));
  source.points=source.points.map((point,index)=>({...point,flow:index===0?0:1e6*source.observations![index].nav}));
  assert.equal(source.points.filter(point=>point.date.startsWith('2026-11')).reduce((sum,point)=>sum+point.flow!,0),162e6);
  assert.equal(flowOverviewItems([source],'en',asOf)[0].value,'+192.0 M USD');
});
test('US exchange holidays are not counted as missing data',()=>{
  const source=model();source.cutoffDate='2026-07-06';source.points=sessionDates('2026-06-30','2026-07-06').map(date=>({date,flow:1e6,complete:true,funds:[]}));
  assert.equal(flowOverviewItems([source],'en',new Date('2026-07-07T10:00Z'))[0].value,'+3.0 M USD');
});
test('Madrid month rollover never reuses the prior month balance',()=>{
  const boundary=new Date('2026-11-30T23:30:00Z');
  assert.equal(flowMonthCaption('en',boundary),'December 2026 · USD');
  assert.match(flowOverviewItems([model()],'en',boundary)[0].value,/Not enough.*data/);
});
test('both locales retain amounts, missing states and fund identity',()=>{
  const source={...model(),id:'ewj' as const};
  const es=flowOverviewItems([source],'es',asOf)[0],en=flowOverviewItems([source],'en',asOf)[0];
  assert.equal(es.label,'Japón');assert.equal(en.label,'Japan');
  assert.equal(es.value,formatFlowAmount(32e6,'es'));assert.equal(en.value,formatFlowAmount(32e6,'en'));
  assert.equal(dashboardText('en','Al cierre: − / +'),'At the close: − / +');
  assert.match(dashboardText('en','Regla propia: cruce de signo del RAMO y 2 cierres consecutivos del nuevo lado de cero. El contexto del RASI matiza el cruce; no implica por sí solo un cambio del precio.'),/Our rule:.*2 consecutive closes.*price change/);
});
