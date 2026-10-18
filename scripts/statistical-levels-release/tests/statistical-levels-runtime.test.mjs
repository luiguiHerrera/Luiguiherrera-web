import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=new URL('../../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const m={exports:{}};
const display={exports:{}};
new Function('module','exports',ts.transpileModule(read('lib/statistical-levels/display.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(display,display.exports);
new Function('require','module','exports',ts.transpileModule(read('lib/statistical-levels/runtime-snapshot.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>{assert.equal(id,'./display');return display.exports;},m,m.exports);
const api=m.exports,manifest=JSON.parse(read('lib/statistical-levels/generated/manifest.json'));
const asset=t=>JSON.parse(read(`lib/statistical-levels/generated/assets/${t}.json`));
const seasonality=t=>JSON.parse(read(`lib/statistical-levels/generated/seasonality/${t}.json`));
const snapshot=await api.createRuntimeSnapshot(manifest,async t=>asset(t),async t=>seasonality(t));
const payload=t=>({schema:api.RUNTIME_SCHEMA,ticker:t,snapshot:snapshot.id,asset:asset(t),seasonality:seasonality(t)});

test('runtime snapshot commits all public payloads without exposing private provenance',()=>{
  assert.equal(Object.keys(snapshot.records).length,40);assert.match(snapshot.id,/^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(snapshot).sort(),['id','manifest_sha256','records','schema']);
  assert.doesNotMatch(JSON.stringify(snapshot),/RAW_ARCHIVE|bucket|seal|cookie|token/);
});
test('runtime accepts exact canonical asset and seasonality',async()=>{assert.equal((await api.validateRuntimeAsset(payload('GLD'),'GLD',snapshot)).asset.ticker,'GLD');});
for(const [name,mutate] of [
  ['schema',v=>v.schema='wrong'],['ticker',v=>v.ticker='SPY'],['snapshot',v=>v.snapshot='0'.repeat(64)],
  ['asset',v=>v.asset.ticker='SPY'],['seasonality',v=>v.seasonality.asset='SPY'],['extra payload key',v=>v.extra=1],
  ['canonical value changed',v=>v.asset.name+='changed'],
])test('runtime rejects '+name,async()=>{const v=payload('GLD');mutate(v);await assert.rejects(api.validateRuntimeAsset(v,'GLD',snapshot));});
for(const query of ['asset=GLD','asset=GLD&snapshot='+snapshot.id+'&extra=1','asset=GLD&asset=SPY&snapshot='+snapshot.id,'asset=GLD&snapshot=x','asset=../../secret&snapshot='+snapshot.id,'asset=UNKNOWN&snapshot='+snapshot.id,'asset=GLD&snapshot='+snapshot.id+'&snapshot='+snapshot.id])test('runtime query rejects '+query.split('&').map(x=>x.split('=')[0]).join(',')+' '+query.length,()=>assert.throws(()=>api.parseRuntimeAssetQuery(new URL('https://local.invalid/api/statistical-levels/asset?'+query),manifest)));
test('runtime query accepts canonical exact two keys',()=>assert.deepEqual(api.parseRuntimeAssetQuery(new URL('https://local.invalid/?asset=GLD&snapshot='+snapshot.id),manifest),{ticker:'GLD',snapshot:snapshot.id}));
test('runtime transport performs one same-origin GET and validates the actual response',async()=>{
  const oldFetch=globalThis.fetch,oldWindow=globalThis.window;const calls=[];
  globalThis.window={location:{origin:'https://local.invalid'}};
  globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json(payload('GLD'));};
  try{const result=await api.loadStatisticalLevelsRuntimeAsset('GLD',snapshot);assert.equal(calls.length,1);assert.equal(calls[0].url.origin,'https://local.invalid');assert.equal(calls[0].url.pathname,'/api/statistical-levels/asset');assert.deepEqual([...calls[0].url.searchParams],[['asset','GLD'],['snapshot',snapshot.id]]);assert.deepEqual(calls[0].options,{method:'GET',redirect:'error',credentials:'same-origin'});assert.equal(result.payload_identity,await api.runtimeDigest(payload('GLD')));assert.match(result.intent_identity,/^[a-f0-9-]{36}$/);}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
test('runtime failure never retries or supplies an abort signal',async()=>{
  const oldFetch=globalThis.fetch,oldWindow=globalThis.window;let count=0;
  globalThis.window={location:{origin:'https://local.invalid'}};globalThis.fetch=async(_u,o)=>{count++;assert(!('signal'in o));throw Error('transport');};
  try{await assert.rejects(api.loadStatisticalLevelsRuntimeAsset('GLD',snapshot));assert.equal(count,1);}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
test('runtime component preserves transport isolation and legacy model restrictions',()=>{
  const s=read('components/statistical-levels/StatLevelsLab.tsx');assert.doesNotMatch(s,/confidence|predict\(|fetch\(|window\.fetch|globalThis(?:\.fetch|\[['"]fetch)/i);
  assert.doesNotMatch(s,/router\.(push|replace|refresh)|AbortController/);assert.match(s,/window\.history\.pushState/);assert.match(s,/popstate/);
});

test('history restores the same aliases and defaults as initial SSR',()=>{
 assert.deepEqual(api.selectionFromRuntimeUrl(new URL('https://local.invalid/?symbol=BTC%2FUSDT&window=All&frequency=daily'),manifest),{asset:'BTCUSD',frequency:'daily',window:'Full'});
 assert.deepEqual(api.selectionFromRuntimeUrl(new URL('https://local.invalid/?asset=UNKNOWN&frequency=unknown&window=unknown'),manifest),{asset:manifest.defaultAsset,frequency:manifest.defaultFrequency,window:manifest.defaultWindow});
});

// Execute the actual TSX controller with a minimal hook/host adapter. Child
// presentation is checked separately in built-browser QA; no navigation logic
// is copied into this harness. Cache perturbations model eviction/empty state.
function controller(source=read('components/statistical-levels/StatLevelsLab.tsx')) {
 const hooks=[],effects=[],requests=[],history=[],listeners=new Map();let cursor=0,view;
 const previousWindow=globalThis.window;
 const host={location:{href:'https://local.invalid/niveles-estadisticos?asset=SPY&frequency=weekly&window=5Y'},history:{pushState(_state,_title,path){history.push(path);host.location.href=new URL(path,host.location.href).href;}},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 globalThis.window=host;
 const react={useState(value){const i=cursor++;if(!(i in hooks))hooks[i]=value;return [hooks[i],v=>{hooks[i]=v;}];},useRef(value){const i=cursor++;if(!(i in hooks))hooks[i]={current:value};return hooks[i];},useEffect(fn){cursor++;effects.push(fn);},useMemo:fn=>fn()};
 const runtime={...api,loadStatisticalLevelsRuntimeAsset(ticker,actualSnapshot){assert.equal(actualSnapshot,snapshot);let resolve;const promise=new Promise(r=>resolve=r);requests.push({ticker,resolve,finished:false});return promise;}};
 const mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>id==='react'?react:id==='react/jsx-runtime'?{jsx:(_type,props)=>props,jsxs:(_type,props)=>props}:id==='@/lib/statistical-levels/runtime-snapshot'?runtime:{},mod,mod.exports);
 const initial={asset:{ticker:'SPY'},seasonality:{asset:'SPY'},selection:{asset:'SPY',frequency:'weekly',window:'5Y'},manifest};
 function render(){cursor=0;view=mod.exports.StatLevelsLab({initial,snapshot,stale:false});for(const fn of effects.splice(0))fn();return view;}
 render();const cache=hooks.find(x=>x?.current instanceof Map).current;
 return {requests,history,cache,initial,render,get view(){return render();},navigate(next,push=true){render().navigate(next,push);return render();},async finish(index){const r=requests[index];assert.ok(r&&!r.finished);r.finished=true;r.resolve({asset:{ticker:r.ticker},seasonality:{asset:r.ticker},intent_identity:'intent-'+index});await Promise.resolve();await Promise.resolve();return render();},pop(selection){host.location.href='https://local.invalid/niveles-estadisticos?'+new URLSearchParams(selection);listeners.get('popstate')();return render();},dispose(){globalThis.window=previousWindow;}};
}
async function staleCompletions(h,count){
 const tickers=manifest.catalog.map(x=>x.ticker).filter(t=>t!=='SPY').slice(0,count);assert.equal(tickers.length,count);
 for(const asset of tickers)h.navigate({asset});h.navigate({asset:'SPY'});
 const historyBefore=[...h.history];
 for(let i=0;i<count;i++)await h.finish(i);
 assert.equal(h.cache.size,4);assert.ok(!h.cache.has(snapshot.id+':SPY'));assert.equal(h.view.asset.ticker,'SPY');assert.deepEqual(h.history,historyBefore);
}
function local(h,next){const before=h.requests.length,assetBefore=h.view.asset,seasonalityBefore=h.view.seasonality;const expected={...h.view.selection,...next};h.navigate(next);assert.equal(h.requests.length,before,'same-asset control reached transport');assert.equal(h.view.asset,assetBefore);assert.equal(h.view.seasonality,seasonalityBefore);assert.deepEqual(h.view.selection,expected);assert.equal(h.view.loadState,'ready');assert.deepEqual(Object.fromEntries(new URL(globalThis.window.location.href).searchParams),expected);}
const cacheCases=[
 ['SAME_ASSET_CACHE_PRESENT_WINDOW_CHANGE_ZERO_NETWORK',h=>local(h,{window:'3Y'})],
 ['SAME_ASSET_CACHE_MISSING_WINDOW_CHANGE_ZERO_NETWORK',h=>{h.cache.clear();local(h,{window:'3Y'});} ],
 ['SAME_ASSET_CACHE_PRESENT_FREQUENCY_CHANGE_ZERO_NETWORK',h=>local(h,{frequency:'daily'})],
 ['SAME_ASSET_CACHE_MISSING_FREQUENCY_CHANGE_ZERO_NETWORK',h=>{h.cache.clear();local(h,{frequency:'daily'});} ],
 ['SAME_ASSET_CACHE_MISSING_FULL_WINDOW_ZERO_NETWORK',h=>{h.cache.clear();local(h,{window:'Full'});} ],
 ['CURRENT_ASSET_EVICTED_THEN_T1_ZERO_NETWORK',async h=>{await staleCompletions(h,4);local(h,{window:'3Y'});} ],
 ['CURRENT_ASSET_EVICTED_THEN_T3_ZERO_NETWORK',async h=>{await staleCompletions(h,4);local(h,{frequency:'daily'});} ],
 ['CURRENT_ASSET_EVICTED_THEN_T4_ZERO_NETWORK',async h=>{await staleCompletions(h,4);local(h,{window:'Full'});} ],
 ['FOUR_STALE_RESPONSES_THEN_T1_ZERO_NETWORK',async h=>{await staleCompletions(h,4);local(h,{window:'3Y'});} ],
 ['CACHE_CAPACITY_PLUS_ONE_STALE_RESPONSES_ZERO_NETWORK',async h=>{await staleCompletions(h,5);local(h,{window:'3Y'});} ],
 ['CACHE_CAPACITY_PLUS_MANY_STALE_RESPONSES_ZERO_NETWORK',async h=>{await staleCompletions(h,12);local(h,{window:'3Y'});local(h,{frequency:'daily'});local(h,{window:'Full'});} ],
 ['STALE_RESPONSE_DOES_NOT_OVERWRITE_CURRENT_STATE',async h=>{await staleCompletions(h,6);assert.equal(h.view.asset,h.initial.asset);assert.equal(h.view.seasonality,h.initial.seasonality);} ],
 ['STALE_RESPONSE_DOES_NOT_CHANGE_HISTORY_STATE',async h=>{await staleCompletions(h,6);assert.equal(h.history.length,1);} ],
 ['STALE_RESPONSE_DOES_NOT_CHANGE_RENDERED_STATE',async h=>{await staleCompletions(h,6);assert.deepEqual(h.view.selection,h.initial.selection);} ],
 ['STALE_RESPONSE_DOES_NOT_TRIGGER_AUTOMATIC_RETRY',async h=>{await staleCompletions(h,6);assert.equal(h.requests.length,6);} ],
 ['STALE_RESPONSE_DOES_NOT_ABORT_OTHER_REQUEST',async h=>{await staleCompletions(h,6);assert.ok(h.requests.every(r=>r.finished));} ],
 ['DIFFERENT_ASSET_CACHE_MISS_T2_EXACTLY_ONE_GET',async h=>{h.navigate({asset:'GLD'});assert.equal(h.requests.length,1);assert.equal(h.requests[0].ticker,'GLD');await h.finish(0);assert.equal(h.view.asset.ticker,'GLD');assert.equal(h.view.runtimeCommit.intent_identity,'intent-0');} ],
 ['DIFFERENT_ASSET_VALID_CACHE_HIT_ZERO_GET_IF_CURRENT_CONTRACT_ALLOWS',async h=>{h.navigate({asset:'GLD'});await h.finish(0);h.navigate({asset:'SPY'});assert.equal(h.requests.length,1);assert.equal(h.view.asset.ticker,'SPY');} ],
 ['WRONG_SNAPSHOT_CACHE_ENTRY_NOT_USED',async h=>{h.cache.set('wrong:GLD',{asset:{ticker:'GLD'},seasonality:{asset:'GLD'}});h.navigate({asset:'GLD'});assert.equal(h.requests.length,1);assert.equal(h.view.asset.ticker,'SPY');await h.finish(0);assert.equal(h.view.asset.ticker,'GLD');} ],
 ['CURRENT_ASSET_STATE_SURVIVES_CACHE_CLEAR',h=>{h.cache.clear();local(h,{window:'3Y'});local(h,{frequency:'daily'});local(h,{window:'Full'});assert.equal(h.cache.size,0);} ],
];
for(const [name,exercise]of cacheCases)test('cache invariant '+name,async()=>{const h=controller();try{await exercise(h);}finally{h.dispose();}});
test('same-asset popstate uses committed payload with an empty cache',()=>{const h=controller();try{h.cache.clear();for(const next of [{asset:'SPY',frequency:'weekly',window:'3Y'},{asset:'SPY',frequency:'daily',window:'3Y'},{asset:'SPY',frequency:'daily',window:'Full'}]){h.pop(next);assert.deepEqual(h.view.selection,next);assert.equal(h.requests.length,0);assert.equal(h.history.length,0);}}finally{h.dispose();}});
test('local branch is structurally before cache access and exits before transport',()=>{
 const source=read('components/statistical-levels/StatLevelsLab.tsx'),ast=ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let navigate;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='navigate')navigate=n;ts.forEachChild(n,visit);}visit(ast);assert.ok(navigate);
 const statements=[...navigate.body.statements],branch=statements.find(n=>ts.isIfStatement(n)&&n.expression.getText(ast)==='selection.asset===currentRef.current.asset.ticker');assert.ok(branch);
 assert.ok(ts.isReturnStatement(branch.thenStatement.statements.at(-1)));assert.doesNotMatch(branch.getText(ast),/cache\.|loadStatisticalLevelsRuntimeAsset/);
 const index=statements.indexOf(branch);assert.ok(index<statements.findIndex(n=>n.getText(ast).includes('cache.current.get')));assert.ok(index<statements.findIndex(n=>n.getText(ast).includes('void loadStatisticalLevelsRuntimeAsset')));
});
test('cache-miss oracle rejects deletion of the local early-return branch',()=>{
 const source=read('components/statistical-levels/StatLevelsLab.tsx'),mutant=source.replace(/    if\(selection.asset===currentRef.current.asset.ticker\)\{[\s\S]*?\n    \}/,'');assert.notEqual(mutant,source);const h=controller(mutant);try{h.cache.clear();assert.throws(()=>local(h,{window:'3Y'}),/same-asset control reached transport/);}finally{h.dispose();}
});

// The repaired build is separately witnessed. Never infer architecture from
// successful traffic, receipt mode, or a URL; exact executable identity applies.
import {runtimeExecutables,runtimeExecutableMatches,runtimeFetchProven} from '../scripts/runtime-transition-receipts.mjs';
const repairedHash='aef45e0837c44391b35af6083b0fa20f0c970b9456eedcad22ca852302aed82d';
const repairedWitness=()=>({script:{code_sha256:repairedHash,script_sha256:'1'.repeat(64),length:128439,default_context:true,live_edit:false,start_line:0,start_column:0},complete:true,runtime_header_compatible:true,base:{rsc:'NO',prefetch:'NO'},frames:[1995,127437,100804,23054].map(column=>({script_sha256:'1'.repeat(64),line:0,column}))});
test('cache repair executable has exact separately witnessed native callsites',()=>{const w=runtimeExecutables.find(x=>x.sha256===repairedHash);assert.ok(w);assert.deepEqual([w.before_fetch,w.validated,w.commit],[1989,2218,127222]);assert.ok(runtimeExecutableMatches(repairedWitness().script));assert.ok(runtimeFetchProven(repairedWitness(),'Fetch'));});
for(const [name,mutate]of [
 ['unknown executable',w=>w.script.code_sha256='0'.repeat(64)],['wrong length',w=>w.script.length++],['live edit',w=>w.script.live_edit=true],['nondefault context',w=>w.script.default_context=false],['old navigation frame',w=>w.frames[1].column=127323],['different frame source',w=>w.frames[1].script_sha256='2'.repeat(64)],['incomplete stack',w=>w.complete=false],['RSC traffic',w=>w.base.rsc='YES'],['prefetch traffic',w=>w.base.prefetch='YES'],
])test('cache repair executable rejects '+name,()=>{const w=repairedWitness();mutate(w);assert.equal(runtimeFetchProven(w,'Fetch'),false);});
