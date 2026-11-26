import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {sessionDates} from '../research/mcclellan-core.mjs';
import {CapitalFlowSourceError,latestClosedFlowSession} from './capital-flows-source.mjs';
import * as source from './ewj-capital-flows-source.mjs';

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
  let now=asOf,providerCutoff=cutoff;
  const seed=source.buildEwjAutomaticModel(null,feed('2026-11-24','2026-11-26T07:00:00Z'),'2026-11-26T12:00:00Z');
  const initialSeed=JSON.stringify(seed),records=new Map(),requests=[];
  class ClockDate extends OriginalDate {
    constructor(...args){super(...(args.length?args:[now]));}
    static now(){return OriginalDate.parse(now);}
  }
  globalThis.Date=ClockDate;
  function cache(callback,keys,options) {
    return async(...args)=>{
      const key=JSON.stringify([keys,args]),hit=records.get(key),time=ClockDate.now();
      if(hit&&(options.revalidate===false||time-hit.time<options.revalidate*1000))return hit.value;
      const value=await callback(...args);
      records.set(key,{keys,args,time,value});
      return value;
    };
  }
  const code=ts.transpileModule(readFileSync(new URL('./get-ewj-capital-flows.ts',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  }).outputText;
  const loaded={exports:{}};
  const dependencies=name=>{
    if(name==='server-only')return {};
    if(name==='next/cache')return {unstable_cache:cache};
    if(name.endsWith('ewj-etf-flows-published.json'))return seed;
    if(name.endsWith('ewj-capital-flows-source.mjs'))return {...source,fetchEwjFundFeed:async()=>{
      requests.push({asOf:now,cutoff:providerCutoff});return feed(providerCutoff,now);
    }};
    if(name.endsWith('capital-flows-source.mjs'))return {CapitalFlowSourceError,latestClosedFlowSession};
    throw new Error(name);
  };
  new Function('require','module','exports',code)(dependencies,loaded,loaded.exports);
  t.after(()=>{globalThis.Date=OriginalDate;});
  return {...loaded.exports,seed,initialSeed,records,requests,
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

test('the actual getter rejects a dated but delayed valid feed instead of caching it as a fresh model',async t=>{
  const h=getter(t,{cutoff:'2026-11-24'});
  await assert.rejects(h.getEwjAutomaticModel(),error=>error instanceof CapitalFlowSourceError&&/Latest closed EWJ/.test(error.message));
  assert.equal(JSON.stringify(h.seed),h.initialSeed);
  assert.equal(h.seed.cutoffDate,'2026-11-24');
});

test('a provider rollback after archive-feed expiry cannot replace a more recent outer publication',async t=>{
  const h=getter(t,{asOf:'2026-11-27T23:00:00Z',cutoff:'2026-11-27'});
  const recent=await h.getEwjAutomaticModel();
  assert.equal(recent.cutoffDate,'2026-11-27');
  const recentBytes=JSON.stringify(recent);
  // The dated archive clips the live feed to the prior day. After its separate
  // feed entry expires, a rolled-back response can still rebuild that older
  // archive successfully; it must never resolve as a replacement outer model.
  h.update('2026-11-29T01:00:00Z','2026-11-25');
  await assert.rejects(h.getEwjAutomaticModel(),error=>error instanceof CapitalFlowSourceError&&/Latest closed EWJ/.test(error.message));
  const priorArchive=[...h.records.values()].find(record=>record.keys[1]==='day'&&record.args[0]==='2026-11-27');
  assert.equal(priorArchive.value.cutoffDate,'2026-11-25');
  assert.equal(JSON.stringify(recent),recentBytes);
});
