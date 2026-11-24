import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createDevelopmentSourceCache} from './development-source-cache.mjs';

class SourceError extends Error {}
const isSourceError = error => error instanceof SourceError;

test('a delayed publication returns the saved valid source with its original date and values', async () => {
  const saved = Object.freeze({cutoffDate:'2026-11-20',value:74.8});
  let clock = 0, attempts = 0, reads = 0;
  const get = createDevelopmentSourceCache({
    load:async () => {attempts++;throw new SourceError('Latest closed session not published');},
    readPrevious:async () => {reads++;return saved;},isSourceError,now:() => clock,
  });
  assert.equal(await get('mcclellan'),saved);
  assert.equal(await get('mcclellan'),saved);
  assert.equal(attempts,1);
  clock = 60_000;
  assert.equal(await get('mcclellan'),saved);
  assert.equal(attempts,2);
  assert.equal(reads,1);
  assert.deepEqual(saved,{cutoffDate:'2026-11-20',value:74.8});
});

test('a later successful retry advances the value and a subsequent failed refresh retains it', async () => {
  const old = {cutoffDate:'2026-11-20'}, latest = {cutoffDate:'2026-11-23'};
  let clock = 0, available = false;
  const get = createDevelopmentSourceCache({
    load:async () => {if(!available)throw new SourceError('pending');return latest;},
    readPrevious:async () => old,isSourceError,now:() => clock,
  });
  assert.equal(await get('btc'),old);
  clock = 60_000; available = true;
  assert.equal(await get('btc'),latest);
  clock += 3_600_000; available = false;
  assert.equal(await get('btc'),latest);
});

test('concurrent callers share the same request while independent assets remain independent', async () => {
  const calls = [];
  let finish;
  const first = new Promise(resolve => {finish=resolve;});
  const get = createDevelopmentSourceCache({
    load:key => {calls.push(key);return key==='gold'?first:Promise.resolve({asset:key});},
    readPrevious:async () => {throw new SourceError('empty');},isSourceError,
  });
  const a=get('gold'), b=get('gold');
  assert.equal(a,b);
  assert.deepEqual(await get('eth'),{asset:'eth'});
  finish({asset:'gold'});
  assert.deepEqual(await a,{asset:'gold'});
  assert.deepEqual(calls,['gold','eth']);
});

test('cold-cache source failures remain explicit and do not fabricate a saved value', async () => {
  const get=createDevelopmentSourceCache({
    load:async () => {throw new SourceError('pending');},
    readPrevious:async () => {throw new SourceError('no validated cut');},isSourceError,
  });
  await assert.rejects(get('btc'),/no validated cut/);
});

test('programming errors and framework control flow are never converted to provider delays', async () => {
  for(const error of [new TypeError('bug'),Object.assign(new Error('redirect'),{digest:'NEXT_REDIRECT'})]){
    let reads=0;
    const get=createDevelopmentSourceCache({
      load:async () => {throw error;},readPrevious:async () => {reads++;return {};},isSourceError,
    });
    await assert.rejects(get('eth'),value => value===error);
    assert.equal(reads,0);
  }
});

const require=createRequire(import.meta.url),ts=require('typescript');
function getterHarness(file,environment){
  const cacheOptions=[],calls=[];
  const saved={id:'sp500',cutoffDate:'2026-11-20'};
  const source={snapshot:{},commit:'a'.repeat(40),blob:'b'.repeat(40)};
  const loaded={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const req=name=>{
    if(name==='server-only')return {};
    if(name==='next/cache'||name==='next/cache.js')return {unstable_cache:(_callback,keys,options)=>{
      cacheOptions.push(options);
      return async()=>{calls.push('cache');return keys[0].includes('mcclellan')?source:saved;};
    }};
    if(name.endsWith('development-source-cache.mjs'))return {createDevelopmentSourceCache};
    if(name.endsWith('capital-flows-published.json'))return {default:[saved]};
    if(name.endsWith('eth-capital-flows-source.mjs'))return {expectedEthFlowSession:()=> '2026-11-23'};
    if(name.endsWith('capital-flows-source.mjs'))return {
      CAPITAL_FLOW_IDS:['sp500'],CapitalFlowSourceError:SourceError,
      latestClosedFlowSession:()=> '2026-11-23',
      fetchCapitalFlowSource:async()=>{calls.push('source');throw new SourceError('Latest closed session not published');},
    };
    if(name.endsWith('get-eth-capital-flows'))return {getEthAutomaticModel:async()=>saved};
    if(name.endsWith('mcclellan-source.mjs'))return {
      McClellanSourceError:SourceError,
      fetchMcClellanSource:async()=>{calls.push('source');throw new SourceError('Latest closed session not yet available from source');},
      buildMcClellanData:()=>({cutoffDate:'2026-11-20',stale:true}),
    };
    throw new Error(name);
  };
  new Function('require','module','exports','process',code)(req,loaded,loaded.exports,{env:{NODE_ENV:environment}});
  return {...loaded.exports,cacheOptions,calls,saved,source};
}

test('development getters catch both reported delays in the request and only read retained Next cache', async()=>{
  const flows=getterHarness('./get-published-capital-flows.ts','development');
  const models=await flows.getPublishedCapitalFlows();
  assert.equal(models[0].cutoffDate,'2026-11-20');
  assert.equal(models[0].refreshStatus,'delayed');
  assert.deepEqual(flows.calls,['source','cache']);
  assert.ok(flows.cacheOptions.every(options=>options.revalidate===false));
  const mc=getterHarness('./get-mcclellan-data.ts','development');
  assert.deepEqual(await mc.getMcClellanData(),{cutoffDate:'2026-11-20',stale:true});
  assert.deepEqual(mc.calls,['source','cache']);
  assert.ok(mc.cacheOptions.every(options=>options.revalidate===false));
});

test('production getters keep the existing hourly persistent cache and do not run development refreshes',async()=>{
  const flows=getterHarness('./get-published-capital-flows.ts','production');
  assert.equal(await flows.getCachedCapitalFlow('sp500'),flows.saved);
  assert.deepEqual(flows.calls,['cache']);
  assert.ok(flows.cacheOptions.every(options=>options.revalidate===3600));
  const mc=getterHarness('./get-mcclellan-data.ts','production');
  assert.equal(await mc.getCachedMcClellanSource(),mc.source);
  assert.deepEqual(mc.calls,['cache']);
  assert.ok(mc.cacheOptions.every(options=>options.revalidate===3600));
});
