import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {AsyncLocalStorage} from 'node:async_hooks';
import ts from 'typescript';
import {createDevelopmentSourceCache} from './development-source-cache.mjs';

// Exercise the actual pipeline and Next's cache branches. Provider validation
// has its own tests; these small inputs stand for already-validated models.
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const require = createRequire(import.meta.url);
const {unstable_cache} = require('next/cache.js');
const {workAsyncStorage} = require('next/dist/server/app-render/work-async-storage.external.js');
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
class SourceError extends Error {}

function compile(file, dependencies, environment = {}) {
  const loaded = {exports:{}};
  const code = ts.transpileModule(read(file), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
  }).outputText;
  new Function('require','module','exports','process',code)(dependencies,loaded,loaded.exports,{env:{NODE_ENV:'production',...environment}});
  return loaded.exports;
}

function harness(t) {
  let clock = 0, expected = '2026-11-24';
  const calls = [], cacheOptions = [], entries = new Map(), stores = [];
  const failures = new Map();
  const models = new Map(['sp500','gold','btc','eth','ewj'].map(id => [id, {
    id, vehicles:[id==='ewj'?'EWJ':id.toUpperCase()], cutoffDate:'2026-11-24',
    refreshMode:'automatic', retrievedAt:'2026-11-25T07:00:00.000Z',sourceHash:`${id}-original`,
    points:[{date:'2026-11-24',flow:25,complete:true,funds:[]}],comparisons:[],
  }]));
  const seed = JSON.parse(read('./ewj-etf-flows-published.json'));
  const original = {cache:globalThis.__incrementalCache,error:console.error,warn:console.warn};
  const cache = {
    generateSimpleCacheKey:async key=>key,
    get:async(key,context)=>{
      const entry=entries.get(key);
      return entry?{...entry,isStale:(clock-entry.lastModified)/1000>(context.revalidate||entry.value.revalidate)}:null;
    },
    set:async(key,value)=>{entries.set(key,{value:JSON.parse(JSON.stringify(value)),lastModified:clock});},
  };
  globalThis.__incrementalCache=cache;
  console.error=()=>{};console.warn=()=>{};
  async function provider(id) {
    calls.push(id);
    if(failures.has(id))throw failures.get(id);
    return models.get(id);
  }
  const dependencies = name => {
    if(name==='server-only')return {};
    if(name==='next/cache')return {unstable_cache:(callback,keys,options)=>{
      cacheOptions.push({keys,options});return unstable_cache(callback,keys,options);
    }};
    if(name==='./capital-flows-published.json')return JSON.parse(read('./capital-flows-published.json'));
    if(name==='./ewj-etf-flows-published.json')return seed;
    if(name.endsWith('capital-flows-source.mjs')&&!name.endsWith('eth-capital-flows-source.mjs'))return {
      CAPITAL_FLOW_IDS:['sp500','gold','btc'],CapitalFlowSourceError:SourceError,
      fetchCapitalFlowSource:provider,latestClosedFlowSession:()=>expected,
    };
    if(name.endsWith('eth-capital-flows-source.mjs'))return {expectedEthFlowSession:()=>expected};
    if(name.endsWith('get-eth-capital-flows'))return {getEthAutomaticModel:()=>provider('eth')};
    if(name.endsWith('get-ewj-capital-flows'))return {getEwjAutomaticModel:()=>provider('ewj')};
    if(name.endsWith('development-source-cache.mjs'))return {createDevelopmentSourceCache};
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const pipeline=compile('./get-published-capital-flows.ts',dependencies);
  async function request(callback=pipeline.getPublishedCapitalFlows) {
    const store={route:'/dashboard',incrementalCache:cache,isStaticGeneration:false,nextFetchId:1,pendingRevalidates:{}};
    stores.push(store);
    return {value:await workAsyncStorage.run(store,callback),settle:()=>Promise.all(Object.values(store.pendingRevalidates))};
  }
  const publication = () => [...entries.values()].find(entry=>JSON.parse(entry.value.data.body).id==='ewj')?.value.data.body;
  t.after(async()=>{
    await Promise.allSettled(stores.flatMap(store=>Object.values(store.pendingRevalidates)));
    globalThis.__incrementalCache=original.cache;console.error=original.error;console.warn=original.warn;
  });
  return {pipeline,request,models,failures,calls,cacheOptions,entries,seed,publication,
    age:()=>{clock+=86_401_000;},due:date=>{expected=date;}};
}

test('EWJ joins automatic coverage with its own daily persistent cache and existing invalidation tag',async t=>{
  const h=harness(t);
  assert.deepEqual(h.pipeline.PUBLISHED_CAPITAL_FLOW_IDS,['sp500','gold','btc','eth','ewj']);
  const entry=h.cacheOptions.find(({keys})=>keys.some(key=>key.includes('ewj')));
  assert.equal(entry.options.revalidate,86400);
  assert.deepEqual(entry.options.tags,[h.pipeline.CAPITAL_FLOWS_CACHE_TAG]);
  const first=await h.request();await first.settle();
  assert.equal(first.value.filter(model=>model.id==='ewj').length,1);
  assert.equal(first.value.find(model=>model.id==='ewj').refreshMode,'automatic');
  await h.request();assert.equal(h.calls.filter(id=>id==='ewj').length,1);
});

test('real Next cache retains EWJ date/hash/bytes after failure and admits a recovered publication',async t=>{
  const h=harness(t);
  const warm=await h.request();await warm.settle();
  const original=h.publication();
  h.age();h.due('2026-11-25');h.failures.set('ewj',new SourceError('EWJ provider offline'));
  const stale=await h.request();await stale.settle();
  const retained=stale.value.find(model=>model.id==='ewj');
  assert.equal(retained.cutoffDate,'2026-11-24');assert.equal(retained.refreshStatus,'delayed');
  assert.equal(retained.retrievedAt,'2026-11-25T07:00:00.000Z');assert.equal(retained.sourceHash,'ewj-original');
  assert.equal(h.publication(),original);
  h.failures.delete('ewj');
  h.models.set('ewj',{...h.models.get('ewj'),cutoffDate:'2026-11-25',sourceHash:'ewj-recovered',retrievedAt:'2026-11-26T07:00:00.000Z'});
  const recovering=await h.request();await recovering.settle();
  const recovered=await h.request();await recovered.settle();
  const fresh=recovered.value.find(model=>model.id==='ewj');
  assert.equal(fresh.cutoffDate,'2026-11-25');assert.equal(fresh.sourceHash,'ewj-recovered');assert.equal(fresh.refreshStatus,'current');
  assert.notEqual(h.publication(),original);
});

test('cold EWJ failure returns its own dated seed without caching it or blocking the other assets',async t=>{
  const h=harness(t);h.failures.set('ewj',new SourceError('EWJ source unavailable'));
  const result=await h.request();await result.settle();
  const ewj=result.value.find(model=>model.id==='ewj');
  assert.equal(result.value.length,5);
  assert.equal(ewj.cutoffDate,h.seed.cutoffDate);assert.equal(ewj.sourceHash,h.seed.sourceHash);assert.equal(ewj.retrievedAt,h.seed.retrievedAt);
  assert.deepEqual(ewj.points,h.seed.points);assert.equal(ewj.refreshMode,'automatic');assert.equal(ewj.refreshStatus,'unavailable');
  assert.equal(h.publication(),undefined);assert.equal(h.entries.size,4);
  assert.ok(result.value.filter(model=>model.id!=='ewj').every(model=>model.refreshStatus==='current'));
});

test('the public status API reports the same EWJ cache identity and its automatic mode',async t=>{
  const h=harness(t);
  const route=compile('../../app/api/dashboard/capital-flows/status/route.ts',()=>h.pipeline);
  const response=await h.request(route.GET);await response.settle();
  const body=await response.value.json();
  const ewj=body.assets.find(model=>model.asset==='ewj');
  const served=(await h.request()).value.find(model=>model.id==='ewj');
  assert.equal(response.value.status,200);assert.equal(body.assets.filter(model=>model.asset==='ewj').length,1);
  assert.equal(ewj.refreshMode,'automatic');assert.equal(ewj.cutoffDate,served.cutoffDate);
  assert.equal(ewj.sourceHash,served.sourceHash);assert.equal(ewj.retrievedAt,served.retrievedAt);assert.deepEqual(ewj.universe,['EWJ']);
  assert.equal(response.value.headers.get('cache-control'),'no-store');
});

test('the existing authenticated cron checks EWJ independently and revalidates both language routes',async t=>{
  const h=harness(t),tags=[],paths=[];
  const route=compile('../../app/api/cron/capital-flows/route.ts',name=>{
    if(name==='node:crypto')return require(name);
    if(name==='next/cache')return {revalidateTag:(...args)=>tags.push(args),revalidatePath:path=>paths.push(path)};
    return h.pipeline;
  },{CRON_SECRET:'synthetic-test-secret'});
  assert.equal((await route.GET(new Request('https://local.invalid/api/cron/capital-flows'))).status,401);
  assert.equal(h.calls.length,0);
  h.failures.set('ewj',new SourceError('EWJ unavailable'));
  const result=await h.request(()=>route.GET(new Request('https://local.invalid/api/cron/capital-flows',{headers:{authorization:'Bearer synthetic-test-secret'}})));
  await result.settle();
  const body=await result.value.json();
  assert.equal(result.value.status,503);
  assert.deepEqual(body.results.find(result=>result.asset==='ewj'),{asset:'ewj',validated:false,retainedPrevious:true});
  assert.ok(body.results.filter(result=>result.asset!=='ewj').every(result=>result.validated));
  assert.ok(tags.some(([tag,profile])=>tag===h.pipeline.CAPITAL_FLOWS_CACHE_TAG&&profile==='max'));
  assert.deepEqual(paths,['/dashboard','/en/dashboard']);
});
