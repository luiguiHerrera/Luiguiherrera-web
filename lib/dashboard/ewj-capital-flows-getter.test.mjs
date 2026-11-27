import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {sessionDates} from '../research/mcclellan-core.mjs';
import {CapitalFlowSourceError,latestClosedFlowSession} from './capital-flows-source.mjs';
import * as source from './ewj-capital-flows-source.mjs';
import {createDurableFlowPublisher} from './durable-flow-publication.mjs';

function dataset(through) {
  const dates=sessionDates('2024-01-02',through).slice(-401);
  const daily=dates.slice(1).map((date,index)=>({d:date,navDate:dates[index],src:'history',house:'iShares',flow:(Date.parse(date)/86_400_000%7-3)*1000}));
  return {schemaVersion:3,ticker:'EWJ',seriesId:'S000004249',issuer:'iShares',coverage:'daily',asOf:through,
    cite:{publisher:'ETFIQ',page:source.EWJ_FLOW_PAGE,methodology:source.EWJ_FLOW_METHODOLOGY,
      as_of:through,class:'ETFIQ-computed',license:source.EWJ_FLOW_LICENSE},daily,heartbeats:[],splits:[]};
}
function feed(through,asOf) {
  const data=dataset(through);
  return {data,sourceHash:createHash('sha256').update(JSON.stringify(data)).digest('hex'),retrievedAt:asOf};
}

function getter(t,{asOf='2026-11-26T12:00:00Z',cutoff='2026-11-25'}={}) {
  const OriginalDate=Date;
  let now=asOf,providerCutoff=cutoff,record=null;
  const seed=source.buildEwjAutomaticModel(null,feed('2026-11-24','2026-11-26T07:00:00Z'),'2026-11-26T12:00:00Z');
  const initialSeed=JSON.stringify(seed),requests=[];
  class ClockDate extends OriginalDate {
    constructor(...args){super(...(args.length?args:[now]));}
    static now(){return OriginalDate.parse(now);}
  }
  globalThis.Date=ClockDate;
  const store={read:async()=>record&&structuredClone(record),
    write:async value=>{record={value:structuredClone(value),etag:'test'};},isConflict:()=>false};
  const code=ts.transpileModule(readFileSync(new URL('./get-ewj-capital-flows.ts',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  }).outputText;
  const loaded={exports:{}};
  const dependencies=name=>{
    if(name==='server-only')return {};
    if(name.endsWith('ewj-etf-flows-published.json'))return seed;
    if(name.endsWith('ewj-capital-flows-source.mjs'))return {...source,fetchEwjFundFeed:async()=>{
      requests.push({asOf:now,cutoff:providerCutoff});return feed(providerCutoff,now);
    }};
    if(name.endsWith('capital-flows-source.mjs'))return {CapitalFlowSourceError};
    if(name.endsWith('durable-flow-publication.mjs'))return {createDurableFlowPublisher};
    if(name.endsWith('private-flow-store'))return {privateFlowStore:()=>store};
    throw new Error(name);
  };
  new Function('require','module','exports',code)(dependencies,loaded,loaded.exports);
  t.after(()=>{globalThis.Date=OriginalDate;});
  return {...loaded.exports,seed,initialSeed,requests,archive:()=>record.value,
    update:(instant,through)=>{now=instant;providerCutoff=through;}};
}

test('the actual getter admits the latest US session on a US holiday without advancing its date',async t=>{
  const h=getter(t);
  const model=await h.getEwjAutomaticModel();
  assert.equal(model.cutoffDate,'2026-11-25');
  assert.equal(model.refreshMode,'automatic');
  assert.equal(model.retrievedAt,'2026-11-26T12:00:00Z');
  assert.equal(JSON.stringify(h.seed),h.initialSeed);
});

test('a dated valid delayed feed is retained without reporting source failure',async t=>{
  const h=getter(t,{cutoff:'2026-11-24'});
  const model=await h.getEwjAutomaticModel();
  assert.equal(model.cutoffDate,'2026-11-24');
  assert.equal(model.lastRefreshError,undefined);
  assert.equal(latestClosedFlowSession('2026-11-26T12:00:00Z'),'2026-11-25');
  assert.equal(h.archive().model.cutoffDate,'2026-11-24');
  assert.equal(JSON.stringify(h.seed),h.initialSeed);
});

test('a provider rollback preserves the newest private publication and reports the real failure',async t=>{
  const h=getter(t,{asOf:'2026-11-27T23:00:00Z',cutoff:'2026-11-27'});
  const recent=await h.getEwjAutomaticModel();
  assert.equal(recent.cutoffDate,'2026-11-27');
  h.update('2026-11-29T01:00:00Z','2026-11-25');
  const retained=await h.getEwjAutomaticModel();
  assert.equal(retained.cutoffDate,'2026-11-27');
  assert.equal(retained.sourceHash,recent.sourceHash);
  assert.match(retained.lastRefreshError,/cutoff moved backwards/);
  assert.deepEqual(h.archive().model,recent);
});
