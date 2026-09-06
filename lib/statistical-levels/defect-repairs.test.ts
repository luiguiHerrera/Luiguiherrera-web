import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { FrequencyMetricSet, WindowMetric } from './types.ts';
import * as helpers from './defect-repairs.mjs';
const { closeLocationBucket, commonPricePaths, datedCorrelation, canonicalPeriodDate, isCompletedPeriod, dailyReturnAliases } = helpers;
const source=fs.readFileSync('scripts/build-statistical-levels.mjs','utf8');
const context=vm.createContext({path,process,console,URLSearchParams,setTimeout,...helpers});
vm.runInContext(source.slice(source.indexOf('const outputPath'),source.indexOf('\nconst assets = [];'))+'\nglobalThis.engine={normalizeRow,seasonalityObservations,buildDailySeasonalityData,buildCorrelationSource,buildCorrelationData,buildAssetRecord,universe,drawdownSeries};',context);
const e=context.engine;
const date=(n:number)=>new Date(Date.UTC(2025,0,n)).toISOString().slice(0,10);
const points=(start:number,end:number,f=(i:number)=>i)=>Array.from({length:end-start+1},(_,i)=>({date:date(start+i),value:f(start+i)}));
const rows=(dates:string[])=>dates.map((d,i)=>e.normalizeRow({date:d,periodStart:d,periodEnd:d,open:100+i*10,high:110+i*10,low:90+i*10,close:100+i*10,adjustedClose:100+i*10,volume:1}));

test('SL-DEF-004: null/undefined/non-finite locations are unavailable; zero is a valid low',()=>{
  for(const value of [null,undefined,NaN,Infinity,-.1,1.1])assert.equal(closeLocationBucket(value),null);
  for(const [value,bucket] of [[0,0],[.1,0],[.33,0],[.5,1],[.67,2],[.9,2],[1,2]])assert.equal(closeLocationBucket(value),bucket);
  const input=[null,undefined,0,.5,.2,.9];const classified=input.map(closeLocationBucket);
  assert.deepEqual(classified,[null,null,0,1,0,2]);assert.equal(classified.filter(v=>v!==null).length,4);
});
test('SL-DEF-006: missing dates in either input are inner-joined with honest N',()=>{
  const a=points(1,30).filter(p=>p.date!==date(4)),b=points(1,30,i=>i*2).filter(p=>p.date!==date(7));
  assert.deepEqual(datedCorrelation(a,b),{value:1,n:28});
});
test('SL-DEF-006: leading/trailing ranges and same-length shifted dates do not align by position',()=>{
  assert.deepEqual(datedCorrelation(points(1,30),points(10,39,i=>i*3)),{value:1,n:21});
  assert.deepEqual(datedCorrelation(points(1,20),points(10,29)),{value:null,n:11});
  assert.deepEqual(datedCorrelation(points(1,20),points(40,59)),{value:null,n:0});
});
test('SL-DEF-006: unordered dates, null pairs, positive and inverse matched subsets',()=>{
  const a=points(1,30),b=points(1,30,i=>-i*2) as Array<{date:string;value:number|null}>;
  b[8].value=null;assert.deepEqual(datedCorrelation([...a].reverse(),[...b].reverse()),{value:-1,n:29});
  assert.deepEqual(datedCorrelation(a,points(1,30,i=>i*7)),{value:1,n:30});
  assert.deepEqual(datedCorrelation(points(1,30,()=>0),points(1,30)),{value:null,n:30});
});
test('SL-DEF-006: invalid/ambiguous dates cannot produce pairs, even on the diagonal',()=>{
  const a=[...points(1,20),{date:date(1),value:1},{date:'2025-02-30',value:2}];
  assert.deepEqual(datedCorrelation(a,a),{value:null,n:19});
  assert.equal(canonicalPeriodDate('2026-09-04','weekly'),canonicalPeriodDate('2026-09-06','weekly'));
  assert.equal(canonicalPeriodDate('2026-09-04','monthly'),'2026-09-01');
});
test('SL-DEF-005: beginning/intra-month exclude current aggregate and retain final completed month',()=>{
  const r=rows(['2026-06-30','2026-07-31','2026-08-31','2026-09-01','2026-09-15']);
  for(const asOf of ['2026-09-01','2026-09-16']){
    const observations=e.seasonalityObservations(r,'monthly',asOf);
    assert.deepEqual(Array.from(observations,(o:{date:string})=>o.date),['2026-07-31','2026-08-31']);
  }
  const data=e.buildDailySeasonalityData('TEST',r,'2026-09-16');
  for(const w of Object.values(data.windows) as Array<{monthly:{general:Array<{month:number}>}}> )for(const cell of w.monthly.general)assert.notEqual(cell.month,9);
});
test('SL-DEF-005: weekly UTC cycle transition and daily completion boundaries',()=>{
  assert.equal(isCompletedPeriod('2026-09-06','weekly','2026-09-06T23:59:59Z'),false);
  assert.equal(isCompletedPeriod('2026-09-06','weekly','2026-09-07T00:00:00Z'),true);
  assert.equal(isCompletedPeriod('2026-09-04','weekly','2026-09-05'),false);
  assert.equal(isCompletedPeriod('2026-08-28','weekly','2026-09-05'),true);
  assert.equal(isCompletedPeriod('2026-09-05','daily','2026-09-05T23:59:59Z'),false);
  assert.equal(isCompletedPeriod('2026-09-05','daily','2026-09-06'),true);
  assert.equal(isCompletedPeriod('2026-08-31','monthly','2026-09-01'),true);
});
test('SL-DEF-005: removing a live outlier changes N, mean, median and win rate from the same completed sample',()=>{
  const r=rows(['2024-12-31','2025-01-31','2025-12-31','2026-01-15']);r[3].adjustedClose=1;
  const data=e.buildDailySeasonalityData('TEST',r,'2026-01-16');
  const january=data.windows.All.monthly.general.find((c:{month:number})=>c.month===1);
  assert.equal(january.sampleSize,1);assert.equal(january.averageReturn,.1);assert.equal(january.medianReturn,.1);assert.equal(january.winRate,1);
});
test('SL-DEF-001: every asset/frequency/available window chart matches frozen drawdown metrics',()=>{
  for(const file of fs.readdirSync('lib/statistical-levels/generated/assets')) {
    const asset=JSON.parse(fs.readFileSync('lib/statistical-levels/generated/assets/'+file,'utf8'));
    for(const data of Object.values(asset.frequencies) as FrequencyMetricSet[])for(const metric of Object.values(data.windows) as WindowMetric[])if(metric.available) {
      const selected=data.drawdownHistory.slice(-metric.sessions);assert.equal(selected.length,metric.sessions);
      const dd=e.drawdownSeries(selected.map((p:{close:number})=>p.close));
      assert.equal(Number(dd.at(-1).toFixed(4)),metric.currentDrawdown);assert.equal(Number(Math.min(...dd).toFixed(4)),metric.maxDrawdown);
    }
  }
  assert.deepEqual(Array.from(e.drawdownSeries([100,80,90]).slice(-2)),[-.19999999999999996,-.09999999999999998]);
  assert.deepEqual(Array.from(e.drawdownSeries([80,90])),[0,0]);
});
test('SL-DEF-002: common transform preserves levels and gaps; missing MA starts a new path',()=>{
  const paths=commonPricePaths([{close:100,ma200:50},{close:200,ma200:100}]);
  assert.equal(paths.close,'M 0.00 28.00 L 100.00 4.00');assert.equal(paths.ma200,'M 0.00 40.00 L 100.00 28.00');
  const gaps=commonPricePaths([{close:100,ma200:null},{close:110,ma200:100},{close:120,ma200:null},{close:130,ma200:120}]);
  assert.equal((gaps.ma200.match(/M /g)??[]).length,2);assert.ok(!gaps.ma200.startsWith('L'));
});
test('SL-DEF-003: all daily legacy aliases are labeled with actual observed-session counts without changing values',()=>{
  assert.deepEqual(dailyReturnAliases.map(a=>[a.oldAlias,a.periods,a.alias]),[['1W',4,'4D'],['1M',12,'12D'],['3M',52,'52D'],['6M',126,'126D'],['1Y',252,'252D']]);
  const r=rows(Array.from({length:300},(_,i)=>date(i+1))),a=e.buildAssetRecord(e.universe[0],r,'fixture');
  for(const alias of dailyReturnAliases){assert.equal(a.returns[alias.oldAlias],Number((r.at(-1).adjustedClose/r.at(-1-alias.periods).adjustedClose-1).toFixed(4)));assert.match(alias.es,new RegExp(String(alias.periods)));assert.match(alias.en,new RegExp(String(alias.periods)));}
});
