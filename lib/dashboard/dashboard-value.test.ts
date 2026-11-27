import { buildVixDashboardData } from './adapters/vix.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { participationReading, PARTICIPATION_READINGS } from './participation-reading.ts';
import { indicatorReference } from './indicator-history.ts';
import { flowMagnitudeReferences } from './flow-magnitude.ts';
import { buildRiskIndicatorReferences } from './risk-indicator-history.ts';
import { historicalSpyRisk, sectorAbsorptionRatio, SECTOR_RISK_SYMBOLS } from './historical-risk.ts';
import { parseRiskYahooChart, riskSessionDates, type RiskHistorySource } from './risk-history-source.ts';
import { sessionDates } from '../research/mcclellan-core.mjs';
import type { PriceParticipationInput } from './price-participation';
import type { PriceParticipationMonthSummary } from './price-participation-month';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';

function reading(spy:number,relative:number,positive:number,ramo:number,rasi:number,negative=11-positive) {
  const month={status:'available',comparisonDate:'2026-10-30',cutoffDate:'2026-11-25',spyReturnPct:spy,relativePp:relative,participation:{positive,negative,flat:11-positive-negative,covered:11,total:11}} as PriceParticipationMonthSummary;
  const input={breadth:{points:[{date:month.comparisonDate,oscillator:50,summation:100},{date:month.cutoffDate,oscillator:50+ramo,summation:100+rasi}]}} as PriceParticipationInput;
  return {month,input};
}
for(const [id,args] of Object.entries({broadAdvance:[2,1,8,1,0],concentratedAdvance:[2,-1,5,0,-1],divergentAdvance:[2,1,7,-1,-1],improvingDecline:[-2,1,5,1,1],broadDecline:[-2,-1,3,-1,0],deterioratingDecline:[-2,1,6,-1,-1],mixed:[0,1,7,1,-1]})) {
  test(`joint reading: ${id} and both translations`,()=>{
    const {month,input}=reading(...args as [number,number,number,number,number]);
    assert.equal(participationReading(month,input).id,id);
    assert.equal(PARTICIPATION_READINGS[id as keyof typeof PARTICIPATION_READINGS].length,2);
  });
}
test('positive RAMO/RASI levels can be deteriorating; signs never substitute temporal change',()=>{
  const {month,input}=reading(2,1,9,-1,-2);
  assert.equal(participationReading(month,input).id,'divergentAdvance');
});
test('mismatched monthly endpoints or a missing sector withhold joint conclusion',()=>{
  const {month,input}=reading(2,1,9,1,1);
  input.breadth!.points[0].date='2026-10-29';
  assert.equal(participationReading(month,input).id,'insufficient');
  assert.equal(participationReading({...month,status:'partial'},input).id,'insufficient');
});
test('empirical indicator percentile excludes future/current, includes ties and uses exact 20-session date',()=>{
  const calendar=riskSessionDates('2025-01-02','2026-11-25');
  const points=calendar.map((date,i)=>({date,value:i%2?5:10}));
  const cutoff=calendar.at(-1)!;
  const ref=indicatorReference(points,cutoff,calendar)!;
  assert.equal(ref.observations,points.length-1);
  assert.equal(ref.comparisonDate,calendar.at(-21));
  assert.equal(ref.delta20,0);
  assert.equal(ref.percentile,points.slice(0,-1).filter(p=>p.value<=points.at(-1)!.value).length/(points.length-1)*100);
  assert.deepEqual(indicatorReference([...points,{date:'2027-01-04',value:999}],cutoff,calendar),ref);
  const missing=indicatorReference(points.filter(p=>p.date!==calendar.at(-21)),cutoff,calendar)!;
  assert.equal(missing.delta20,null);
  assert.equal(missing.comparisonDate,null);
});
test('indicator percentiles need 252 previous values; five-year cap describes indicator output history',()=>{
  const dates=riskSessionDates('2020-01-01','2026-11-25');
  const points=dates.map((date,i)=>({date,value:i}));
  const short=indicatorReference(points.slice(-252),dates.at(-1)!,dates)!;
  assert.equal(short.percentile,null);
  assert.equal(short.observations,251);
  assert.ok(indicatorReference(points,dates.at(-1)!,dates)!.start!>='2021-11-25');
  assert.equal(indicatorReference([points[0],points[0]],points[0].date,dates),null);
});
function flow(id:CapitalFlowAssetPreview['id']='sp500',cutoff='2026-11-25'):CapitalFlowAssetPreview {
  const dates=sessionDates('2025-01-02',cutoff);
  return {id,cutoffDate:cutoff,points:dates.map((date,i)=>({date,flow:(i%3-1)*1e6,complete:true,funds:[]})),vehicles:['SPY'],metricBasis:'daily-sum',kind:'estimated',title:'',eyebrow:'',description:'',sources:[],notes:[]};
}
test('daily magnitude uses only previous current-month sessions once 20 are available',()=>{
  const model=flow('sp500','2026-10-30');
  const result=flowMagnitudeReferences(model).daily;
  assert.equal(result.mode,'same-month');
  assert.equal(result.observations,21);
  assert.ok(result.end!<model.cutoffDate!);
  assert.ok(result.start!.startsWith('2026-10'));
  assert.notEqual(result.mean,result.medianAbsolute);
});
test('short current month falls back to three preceding complete months without mixing current sessions',()=>{
  const model=flow(); const {daily}=flowMagnitudeReferences(model);
  assert.equal(daily.mode,'prior-three-months');
  assert.equal(daily.start,'2026-08-03');
  assert.equal(daily.end,'2026-10-30');
  assert.equal(daily.observations,sessionDates('2026-08-01','2026-10-31').length);
  const altered={...model,points:model.points.map(p=>p.date.startsWith('2026-11')&&p.date!==model.cutoffDate ? {...p,flow:1e12}:p)};
  assert.equal(flowMagnitudeReferences(altered).daily.mean,daily.mean);
});
test('nulls and incomplete closes are excluded; observed zero and ties remain valid',()=>{
  const model=flow();
  model.points=model.points.map(p=>p.date.startsWith('2026-08')?{...p,flow:null,complete:false}: {...p,flow:0});
  const r=flowMagnitudeReferences(model).daily;
  assert.equal(r.mean,0);assert.equal(r.medianAbsolute,0);assert.equal(r.percentile,100);
  assert.equal(r.observations,sessionDates('2026-09-01','2026-10-31').length);
  model.points.at(-1)!.flow=null;
  assert.equal(flowMagnitudeReferences(model).daily.percentile,null);
});
test('monthly reference uses first K sessions, no full months or daily averages, minimum 12 prior months',()=>{
  const model=flow();model.points=model.points.map(p=>({...p,flow:1e6}));
  const r=flowMagnitudeReferences(model).monthly;
  const k=sessionDates('2026-11-01','2026-11-25').length;
  assert.equal(r.sessions,k);assert.equal(r.current,k*1e6);assert.equal(r.mean,k*1e6);assert.equal(r.medianAbsolute,k*1e6);assert.equal(r.percentile,100);
  const short=flow('eth');short.points=short.points.slice(-60);
  assert.ok(flowMagnitudeReferences(short).monthly.observations<12);
  assert.equal(flowMagnitudeReferences(short).monthly.percentile,null);
  model.points=model.points.filter(p=>p.date!=='2026-11-03');
  assert.equal(flowMagnitudeReferences(model).monthly.current,null);
});
test('monthly reference excludes prior months too short for the current equivalent horizon',()=>{
  const model=flow('sp500','2026-10-30');
  const k=sessionDates('2026-10-01','2026-10-30').length;
  const r=flowMagnitudeReferences(model).monthly;
  const eligible=[...new Set(model.points.filter(p=>p.date<'2026-10-01').map(p=>p.date.slice(0,7)))].filter(month=>model.points.filter(p=>p.date.startsWith(month)).length>=k);
  assert.equal(r.observations,eligible.length);
});
test('BTC reference refuses unknown or changing ETF cohorts',()=>{
  const model=flow('btc'); assert.equal(flowMagnitudeReferences(model).daily.observations,0);
  model.comparisonUniverse=['SPY'];model.referenceUniverses=Object.fromEntries(model.points.map(p=>[p.date,['SPY']]));
  assert.ok(flowMagnitudeReferences(model).daily.percentile!==null);
  for(const p of model.points) if(p.date<'2026-11-01')model.referenceUniverses[p.date]=['OTHER'];
  assert.equal(flowMagnitudeReferences(model).daily.percentile,null);
});
test('GLD monthly reference uses endpoint share change times ending NAV, not sum of daily estimates',()=>{
  const model=flow('gold');model.metricBasis='ending-nav';model.vehicles=['GLD'];
  model.observations=model.points.map((p,i)=>({date:p.date,ticker:'GLD',shares:1000+i,nav:100+i}));
  const k=sessionDates('2026-11-01',model.cutoffDate!).length;
  const r=flowMagnitudeReferences(model).monthly;
  assert.equal(r.current,k*model.observations.at(-1)!.nav);
  assert.notEqual(r.current,k*1e6);
  delete model.observations;
  assert.equal(flowMagnitudeReferences(model).daily.percentile,null);
});
test('risk references exactly reproduce fixed original models at their historical cutoffs',()=>{
  const calendar=riskSessionDates('2020-01-01','2025-02-28');
  const prices=(seed:number)=>calendar.map((date,i)=>({date,close:100*Math.exp(i*.0001+.03*Math.sin(i/(seed+7))+.01*Math.cos(i/(seed+2)))}));
  const source={cutoffDate:calendar.at(-1)!,spy:prices(1),sectors:SECTOR_RISK_SYMBOLS.map((symbol,i)=>({symbol,prices:prices(i+2)}))} as RiskHistorySource;
  const refs=buildRiskIndicatorReferences(source,calendar);
  assert.equal(refs.var95!.current,historicalSpyRisk(source.spy,calendar,source.cutoffDate).var95);
  assert.equal(refs.absorption!.current,sectorAbsorptionRatio(source.sectors,calendar,source.cutoffDate).ratio);
  const prior=calendar.at(-21)!;
  assert.equal(refs.absorption!.delta20,refs.absorption!.current-sectorAbsorptionRatio(source.sectors,calendar,prior).ratio!);
  assert.equal(refs.var95!.percentile,null,'only a short output series remains after the 1260-return warm-up');
  assert.ok(refs.absorption!.observations>=252);
  const oldSource={...source,sectors:source.sectors.map(s=>({...s,prices:s.prices.slice(-501)})),spy:source.spy.slice(-1261)};
  assert.equal(buildRiskIndicatorReferences(oldSource,calendar).absorption!.observations,0);
});
test('extended source parser retains downloaded older adjusted prices without changing the current fixed-window contract',()=>{
  const dates=riskSessionDates('2020-01-01','2026-11-25');
  const payload={chart:{result:[{meta:{symbol:'SPY',currency:'USD',exchangeTimezoneName:'America/New_York',dataGranularity:'1d'},timestamp:dates.map(d=>Date.parse(d+'T14:30Z')/1000),indicators:{adjclose:[{adjclose:dates.map((_,i)=>100+i)}]}}]}};
  assert.equal(parseRiskYahooChart(payload,'SPY',dates.at(-1)!,1261).length,1261);
  assert.equal(parseRiskYahooChart(payload,'SPY',dates.at(-1)!,1261,true).length,dates.length);
});


test('VIX delta uses its own published closes, including extended-hours dates outside the NYSE calendar',()=>{
  const dates=[...riskSessionDates('2025-01-02','2026-11-25'),'2026-11-26'];
  const spot=buildVixDashboardData(dates.map((date,i)=>({date,value:10+i/100}))).spot;
  assert.equal(spot.historicalReference!.comparisonDate,dates.at(-21));
  assert.ok(Math.abs(spot.historicalReference!.delta20!-.2)<1e-12);
  assert.equal(spot.historicalReference!.observations,dates.length-1);
});
