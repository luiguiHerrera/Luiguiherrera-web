import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createDurableFlowPublisher} from './durable-flow-publication.mjs';
import {mergeEthFlowHistory,buildEthAutomaticModel} from './eth-capital-flows-source.mjs';
import {ETH_FLOW_FUNDS} from './eth-etf-flows-preview.mjs';
const seed=JSON.parse(readFileSync(new URL('./eth-flow-history-seed.json',import.meta.url)));
const recovered=JSON.parse(readFileSync(new URL('./eth-flow-recovered-closes.json',import.meta.url)));
const bootstrap={...seed,points:[...seed.points,...recovered.points]};
const day=(date,value)=>({date,totalUsdM:value,funds:ETH_FLOW_FUNDS.map((ticker,i)=>({ticker,netFlowUsdM:i?0:value}))});
const feed=days=>({symbol:'ETH',windowDays:30,days});
function storage(){
 let record=null,version=0,writes=0;
 class Conflict extends Error{}
 return {read:async()=>structuredClone(record),write:async(value,etag)=>{
   if(record?etag!==record.etag:etag!==undefined)throw new Conflict();
   record={value:structuredClone(value),etag:String(++version)};writes++;
 },isConflict:e=>e instanceof Conflict,record:()=>structuredClone(record),writes:()=>writes};
}
function publisher(store,fetchSource,clock=()=>Date.parse('2026-11-24T12:00:00Z'),build){
 return createDurableFlowPublisher({id:'eth',store,seed:bootstrap,retainAll:true,fetchSource,now:clock,
   build:build??((history,source,asOf)=>{
     const merged=mergeEthFlowHistory(history,source,asOf);
     return {history:merged,model:buildEthAutomaticModel(merged,source,asOf)};
   })});
}
test('recovered aggregate retains the original response hash and never fills the missing 23 October',()=>{
 assert.deepEqual(recovered.points.map(p=>[p.date,p.flow]),[['2026-10-26',-88_600_000],['2026-10-27',-60_200_000]]);
 assert.equal(recovered.provenance.capturedFeedSha256,'c1b67f7d520ee3a9fffd86c0612470eef851a1c7dac8a74f0a799d5fca476643');
 assert.equal(bootstrap.points.find(p=>p.date==='2026-10-23').complete,false);
});
test('a cold instance and a rolling provider window preserve every retained complete close',async()=>{
 const store=storage();let time=Date.parse('2026-11-24T12:00:00Z');
 const first=publisher(store,async()=>feed([day('2026-11-19',4),day('2026-11-20',5)]),()=>time);
 await first();const before=store.record();
 time+=86_400_000;
 const cold=publisher(store,async()=>feed([day('2026-11-20',5),day('2026-11-23',6)]),()=>time);
 const model=await cold();
 const history=store.record().value.history;
 for(const point of before.value.history.points.filter(p=>p.complete))assert.deepEqual(history.points.find(p=>p.date===point.date),point);
 assert.equal(model.points.find(p=>p.date==='2026-10-27').flow,-60_200_000);
 assert.equal(history.points.find(p=>p.date==='2026-11-19').flow,4e6);
 assert.equal(history.points.find(p=>p.date==='2026-10-23').flow,null);
});
test('complete provider revisions are recorded; incomplete revisions preserve the validated value',async()=>{
 const store=storage();let live=feed([day('2026-11-20',5)]);
 const get=publisher(store,async()=>live);await get();
 live=feed([day('2026-11-20',6)]);await get(true);
 assert.deepEqual(store.record().value.revisions.map(r=>[r.date,r.previous,r.revised]),[['2026-11-20',5e6,6e6]]);
 const partial=day('2026-11-20',0);partial.funds[0].netFlowUsdM=null;
 live=feed([partial]);const model=await get(true);
 assert.equal(model.points.at(-1).flow,6e6);
 assert.equal(store.record().value.revisions.length,1);
});
test('failure or a candidate losing a complete date cannot replace the durable history',async()=>{
 const store=storage();await publisher(store,async()=>feed([day('2026-11-20',5)]))();
 const before=store.record().value;
 const offline=publisher(store,async()=>{throw new Error('Provider offline');});
 const retained=await offline(true);assert.equal(retained.cutoffDate,before.model.cutoffDate);
 assert.match(retained.lastRefreshError,/Provider offline/);assert.deepEqual(store.record().value.history,before.history);
 const broken=publisher(store,async()=>({}),undefined,()=>({history:{points:before.history.points.filter(p=>p.date!=='2026-10-27')},model:before.model}));
 assert.match((await broken(true)).lastRefreshError,/Complete flow observation lost: 2026-10-27/);
 assert.deepEqual(store.record().value.history,before.history);
});
test('two independent instances finishing out of order use conditional writes and retain the newer close',async()=>{
 const store=storage();let release;
 const slow=publisher(store,()=>new Promise(resolve=>{release=resolve;}));
 const pending=slow();await new Promise(resolve=>setImmediate(resolve));
 const fast=publisher(store,async()=>feed([day('2026-11-20',5),day('2026-11-23',6)]));
 await fast();release(feed([day('2026-11-20',5)]));await pending;
 assert.equal(store.record().value.model.cutoffDate,'2026-11-23');
 assert.equal(store.record().value.history.points.find(p=>p.date==='2026-11-23').flow,6e6);
 assert.equal(store.writes(),1);
});
test('an unreadable private archive fails closed without writing a reconstructed replacement',async()=>{
 const store={read:async()=>{throw new Error('Storage unavailable');},write:async()=>assert.fail('must not overwrite'),isConflict:()=>false};
 await assert.rejects(publisher(store,async()=>feed([day('2026-11-20',5)]))(),/Storage unavailable/);
});
test('hourly checks reuse durable publication after all process caches have been cleared',async()=>{
 const store=storage();const model=await publisher(store,async()=>feed([day('2026-11-20',5)]))();
 const cold=publisher(store,async()=>assert.fail('provider must not be queried inside interval'));
 assert.deepEqual(await cold(),model);assert.equal(store.writes(),1);
});

test('an older concurrent download cannot undo a newer complete revision on the same date',async()=>{
 const store=storage();let release;
 const instant=Date.parse('2026-11-24T12:00:00Z');
 const old=publisher(store,()=>new Promise(resolve=>{release=resolve;}),()=>instant);
 const pending=old();await new Promise(resolve=>setImmediate(resolve));
 const fresh=publisher(store,async()=>feed([day('2026-11-20',6)]),()=>instant+1);
 await fresh();release(feed([day('2026-11-20',5)]));
 assert.equal((await pending).points.at(-1).flow,6e6);
 assert.equal(store.record().value.history.points.at(-1).flow,6e6);
 assert.equal(store.writes(),1);
});
