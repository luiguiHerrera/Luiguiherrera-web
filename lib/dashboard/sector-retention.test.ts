import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createSectorPublicationReader,sectorSnapshotHash} from './sector-retention.ts';
import type {SectorPublication} from './sector-retention.ts';
import {buildSectorResult,buildUnavailableSectorResult,SECTOR_ETFS} from './adapters/sector-data-core.ts';
import {requireCompleteSectorSnapshot,SectorDataUnavailableError} from './adapters/sector-etfs.ts';
import {buildQuantRiskPresentation} from './quant-risk-presentation.ts';
import {buildRiskOverview} from './risk-overview.ts';
import type {SectorEtfsResult} from './adapters/sector-data-core.ts';

const recovery=JSON.parse(readFileSync(new URL('./sector-risk-published.json',import.meta.url),'utf8'));
const seed={...buildUnavailableSectorResult('No original rankings recovered'),quantRisk:recovery.quantRisk} as SectorEtfsResult;
const day=86_400_000,initial=Date.parse('2026-11-27T09:00:00Z');
function complete(cutoff='2026-11-25',now=initial){
 const end=Date.parse(cutoff+'T12:00:00Z');
 const histories=SECTOR_ETFS.map((etf,i)=>({...etf,closeConvention:'close' as const,latestDate:cutoff,
   prices:Array.from({length:100},(_,n)=>({date:new Date(end-(99-n)*day).toISOString().slice(0,10),close:100+i+0.1*n+Math.sin(n*.3+i)*2}))}));
 return buildSectorResult(histories,now);
}
function harness(){
 let clock=initial,record:{value:SectorPublication;etag:string}|null=null,version=0,writes=0,offline=false;
 class Conflict extends Error{}class StorageFailure extends Error{}
 const values=new Map<string,unknown>();
 const store={read:async()=>{if(offline)throw new StorageFailure();return structuredClone(record);},
   write:async(value:SectorPublication,etag?:string)=>{
     if(offline)throw new StorageFailure();
     if(record?record.etag!==etag:etag!==undefined)throw new Conflict();
     record={value:structuredClone(value),etag:String(++version)};writes++;return record.etag;
   },isConflict:(e:unknown)=>e instanceof Conflict,isUnavailable:(e:unknown)=>e instanceof StorageFailure};
 const cache={get:async(key:string)=>values.get(key),set:async(key:string,value:unknown)=>{values.set(key,structuredClone(value));}};
 const reader=(load:()=>Promise<SectorEtfsResult>,backup:SectorEtfsResult|null=seed)=>createSectorPublicationReader({store,cache,seed:backup,load,
   validate:requireCompleteSectorSnapshot,isSourceError:e=>e instanceof SectorDataUnavailableError,now:()=>clock});
 return {reader,record:()=>structuredClone(record!),writes:()=>writes,advance:(ms=day+1)=>{clock+=ms;},
   cold:()=>values.clear(),offline:()=>{offline=true;},corrupt:()=>{record!.value.snapshot.rotation!.sectors.pop();}};
}
test('the recovered published output identifies eleven governed ETFs and keeps its original date and metrics',()=>{
 assert.deepEqual([...recovery.provenance.universe].sort(),SECTOR_ETFS.map(x=>x.symbol).sort());
 assert.equal(recovery.cutoffDate,'2026-11-25');assert.equal(seed.quantRisk.ewmaVolAnnualized,18.438774625801035);
 assert.equal(seed.quantRisk.garchVolForecast,17.490960941838164);
 assert.equal(seed.rotation,null,'a model result must not fabricate individual histories or rankings');
});
test('quota failure retains every validated metric and date across cold instances and both locales',async()=>{
 const h=harness();const expected=complete();let calls=0;
 const get=h.reader(async()=>{calls++;return expected;});await get();const original=h.record().value;
 h.advance();h.cold();
 const failed=h.reader(async()=>{calls++;return buildUnavailableSectorResult('Alpha Vantage XLK provider response');});
 const retained=await failed();assert.equal(calls,2);
 assert.equal(retained.quantRisk.refreshStatus,'retained');assert.equal(retained.quantRisk.dataStatus,'delayed');
 assert.equal(retained.quantRisk.lastUpdated,expected.quantRisk.lastUpdated);
 for(const key of ['ewmaVolAnnualized','garchVolForecast','averageCorrelation21d','averageCorrelation63d','sectorDispersion1w','sectorDispersion1m'] as const)
   assert.equal(retained.quantRisk[key],expected.quantRisk[key]);
 assert.equal(h.record().value.snapshotHash,original.snapshotHash);assert.deepEqual(h.record().value.snapshot,original.snapshot);
 h.cold();const cold=await h.reader(async()=>assert.fail('daily failure must not query again'))();
 assert.deepEqual(cold,retained);
 for(const locale of ['es','en'] as const){
   const p=buildQuantRiskPresentation(cold.quantRisk,locale);assert.ok(p.primaryMetrics.every(m=>m.available));
   assert.match(p.status,/conservado|retained/);assert.match(p.interpretation,/Actualización pendiente|Update pending/);
   const overview=buildRiskOverview({quantRisk:cold.quantRisk,vixSpot:null,vixTermStructure:null},locale);
   assert.equal(overview.find(x=>x.id==='ewma-garch')?.available,true);
   assert.match(overview.find(x=>x.id==='ewma-garch')!.detail!,/Corte conservado|Retained snapshot/);
 }
});
test('incomplete coverage, null models and backwards dates never replace a complete publication',async()=>{
 const h=harness();const original=complete();await h.reader(async()=>original)();
 const broken=structuredClone(original);broken.rotation!.sectors.pop();
 h.advance();await h.reader(async()=>broken)();assert.deepEqual(h.record().value.snapshot,original);
 const invalid=structuredClone(original);invalid.quantRisk.garchVolForecast=null;
 h.advance();await h.reader(async()=>invalid)();assert.deepEqual(h.record().value.snapshot,original);
 h.advance();await h.reader(async()=>complete('2026-11-24',initial+3*day))();assert.deepEqual(h.record().value.snapshot,original);
});
test('a dated complete result remains visible after seven days and a recovered source replaces it',async()=>{
 const h=harness();const original=complete();await h.reader(async()=>original)();
 h.advance(9*day);const kept=await h.reader(async()=>buildUnavailableSectorResult('Provider quota'))();
 assert.equal(kept.quantRisk.ewmaVolAnnualized,original.quantRisk.ewmaVolAnnualized);
 assert.equal(kept.quantRisk.refreshStatus,'retained');assert.equal(kept.rotation!.sectors.length,11);
 h.advance();const fresh=complete('2026-12-04',initial+10*day);
 const recovered=await h.reader(async()=>fresh)();assert.equal(recovered.quantRisk.refreshStatus,'current');
 assert.equal(recovered.quantRisk.lastRefreshError,undefined);assert.equal(h.record().value.snapshotHash,sectorSnapshotHash(fresh));
});
test('the initial published model survives a quota response without inventing sector rankings',async()=>{
 const h=harness();const value=await h.reader(async()=>buildUnavailableSectorResult('Provider quota'))();
 assert.equal(value.quantRisk.ewmaVolAnnualized,seed.quantRisk.ewmaVolAnnualized);
 assert.equal(value.quantRisk.refreshStatus,'retained');assert.equal(value.rotation,null);
 assert.equal(h.record().value.kind,'published-risk');
});
test('only the absence of every valid backup yields unavailable; storage failure preserves a known backup',async()=>{
 const empty=harness();empty.offline();
 const unavailable=await empty.reader(async()=>assert.fail('no unreadable archive overwrite'),null)();
 assert.equal(unavailable.quantRisk.dataStatus,'unavailable');
 const h=harness();h.offline();const kept=await h.reader(async()=>assert.fail('no overwrite while storage is unreadable'))();
 assert.equal(kept.quantRisk.refreshStatus,'retained');assert.equal(kept.quantRisk.garchVolForecast,seed.quantRisk.garchVolForecast);
});
test('a daily file reservation coalesces independent instances before any provider request',async()=>{
 const h=harness();let finish!:(value:SectorEtfsResult)=>void,calls=0;
 const slow=h.reader(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 const first=slow();await new Promise(resolve=>setImmediate(resolve));h.cold();
 const second=await h.reader(async()=>{calls++;return complete();})();
 assert.equal(second.quantRisk.refreshStatus,'retained');assert.equal(calls,1);
 finish(complete());assert.equal((await first).quantRisk.refreshStatus,'current');
});
test('programming failures propagate, and a corrupt complete archive is never overwritten',async()=>{
 const h=harness();const failure=new TypeError('Programming bug');await assert.rejects(h.reader(async()=>{throw failure;})(),e=>e===failure);
 const other=harness();await other.reader(async()=>complete())();other.advance();other.cold();other.corrupt();
 const writes=other.writes();const value=await other.reader(async()=>assert.fail('corrupt archive must not be replaced'))();
 assert.equal(value.quantRisk.refreshStatus,'retained');assert.equal(other.writes(),writes);
});
