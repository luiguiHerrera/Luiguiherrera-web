// External integration proof. The candidate and all committed tests/fixtures are read-only.
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { createRequire, registerHooks, syncBuiltinESMExports } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const options=Object.fromEntries(process.argv.slice(2).reduce((out,value,i,all)=>i%2?out:[...out,[value.replace(/^--/,''),all[i+1]]],[]));
const root=realpathSync(options.root), output=path.resolve(options.output);
const require=createRequire(path.join(root,'package.json'));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),ts=require('typescript');
const sha=value=>createHash('sha256').update(value).digest('hex');
const loadedSources=new Set(),forbiddenImports=[],calls=[],nativeNetworkAttempts=[],requests=[];
let mode='THROW',v1Failure=null;
const never=new Promise(()=>{});
globalThis.__PUBLIC_PROOF={cache:new Map(),cacheDefinitions:[],cacheEvents:[],pathname:'/',forbidden(name){calls.push(name);if(mode==='PENDING')return never;throw new Error('FORBIDDEN_PUBLIC_V2:'+name);}};
for(const moduleName of ['node:http','node:https']){
 const native=require(moduleName);
 for(const method of ['request','get'])native[method]=()=>{nativeNetworkAttempts.push(moduleName+'.'+method);throw new Error('EXTERNAL_NETWORK_FORBIDDEN');};
}
const net=require('node:net');net.Socket.prototype.connect=function(){nativeNetworkAttempts.push('Socket.connect');throw new Error('EXTERNAL_NETWORK_FORBIDDEN');};
syncBuiltinESMExports();
const OriginalDate=Date;
globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:['2026-09-10T09:00:00.000Z']));}static now(){return OriginalDate.parse('2026-09-10T09:00:00.000Z');}};
for(const key of ['FRED_API_KEY','ALPHA_VANTAGE_API_KEY'])delete process.env[key];
process.env.V2_SHADOW_DIR='/public-must-not-read-shadow';process.env.V2_SHADOW_INPUT='/public-must-not-read-bundle.json';
globalThis.fetch=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input.url??String(input));
 requests.push({url:url.origin+url.pathname,method:init.method??'GET',cache:init.cache??null,next:init.next??null});
 return new Response('',{status:404});
};
const reactiveURL='public-proof:react';
globalThis.__PUBLIC_REACT_FIXTURES={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react/jsx-dev-runtime':require('react/jsx-dev-runtime')};
const forbiddenExports={
 'engine.ts':['evaluateRegime'], 'normalize.ts':['normalizeYahoo','normalizeVixCsv','normalizeVxHistory','normalizeMonthlyCatalog','assembleVx','normalizeBtcTable','normalizeGldRows','parseNumericCell'],
 'operations/dashboard-shadow.ts':['withDashboardShadow','externalDirectory'],
 'operations/snapshot.ts':['createSnapshot','persistSnapshot','readSnapshot','replaySnapshot'],
 'operations/job-storage.ts':['createProductionJobStore','createLocalJobStore'],
 'operations/s3-storage.ts':['createS3JobStore','executeAwsCli'],
 'operations/shadow-job.ts':['runShadowObservation','observationIdentity','liveEligibility'],
 'operations/job-sources.ts':['acquireJobSources'],
 'operations/source-input.ts':['prepareSourceVintage','resolveSourceVintage','prepareSourceInput','prepareSourceVintageWithReviewedCalendars'],
};
function namedSentinels(names){return names.map(name=>`export const ${name}=(...args)=>globalThis.__PUBLIC_PROOF.forbidden(${JSON.stringify(name)});`).join('\n');}
registerHooks({
 resolve(specifier,context,next){
  if(Object.hasOwn(globalThis.__PUBLIC_REACT_FIXTURES,specifier))return{url:'public-proof:'+specifier,shortCircuit:true};
  if(['next/image','next/link','next/navigation','next/cache','next/cache.js','server-only'].includes(specifier))return{url:'public-proof:'+specifier,shortCircuit:true};
  if(context.parentURL?.includes('/node_modules/'))return next(specifier,context);
  if(specifier.startsWith('@/'))specifier=pathToFileURL(path.join(root,specifier.slice(2))).href;
  if(specifier.startsWith('.')&&context.parentURL)specifier=new URL(specifier,context.parentURL).href;
  if(specifier.startsWith('file:')){
   const filename=fileURLToPath(specifier);
   for(const suffix of ['','.ts','.tsx','.mjs','.json']){
    try{const data=readFileSync(filename+suffix);void data;return next(pathToFileURL(filename+suffix).href,context);}catch(error){if(error.code!=='ENOENT'&&error.code!=='EISDIR')throw error;}
   }
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.startsWith('public-proof:')&&Object.hasOwn(globalThis.__PUBLIC_REACT_FIXTURES,url.slice(13))){const name=url.slice(13),keys=Object.keys(globalThis.__PUBLIC_REACT_FIXTURES[name]).filter(key=>/^[A-Za-z_$][\w$]*$/.test(key)&&key!=='default');return{format:'module',source:`const value=globalThis.__PUBLIC_REACT_FIXTURES[${JSON.stringify(name)}];export default value;`+keys.map(key=>`export const ${key}=value.${key};`).join(''),shortCircuit:true};}
  if(url==='public-proof:server-only')return{format:'module',source:'export {};',shortCircuit:true};
  if(url==='public-proof:next/link')return{format:'module',source:`import React from ${JSON.stringify(reactiveURL)};export default function Link(props){return React.createElement('a',props);}`,shortCircuit:true};
  if(url==='public-proof:next/image')return{format:'module',source:`import React from ${JSON.stringify(reactiveURL)};export default function Image({src,alt}){return React.createElement('img',{src,alt});}`,shortCircuit:true};
  if(url==='public-proof:next/navigation')return{format:'module',source:'export function usePathname(){return globalThis.__PUBLIC_PROOF.pathname;}',shortCircuit:true};
  if(url==='public-proof:next/cache'||url==='public-proof:next/cache.js')return{format:'module',source:`export function unstable_cache(fn,keyParts=[],options={}){const key=JSON.stringify([keyParts,options]);const proof=globalThis.__PUBLIC_PROOF;proof.cacheDefinitions.push({keyParts,options});return async(...args)=>{const id=JSON.stringify([key,args]);if(proof.cache.has(id)){proof.cacheEvents.push({keyParts,hit:true});return proof.cache.get(id);}proof.cacheEvents.push({keyParts,hit:false});const pending=Promise.resolve().then(()=>fn(...args));proof.cache.set(id,pending);try{return await pending;}catch(error){proof.cache.delete(id);throw error;}};}`,shortCircuit:true};
  if(url.startsWith(pathToFileURL(root+path.sep).href)&&!url.includes('/node_modules/')){
   const relative=path.relative(root,fileURLToPath(url));loadedSources.add(relative);
   const v2=relative.startsWith('lib/regime-engine-v2/')?relative.slice('lib/regime-engine-v2/'.length):null;
   if(v2&&forbiddenExports[v2]){forbiddenImports.push(v2);return{format:'module',source:namedSentinels(forbiddenExports[v2])+`\nexport const SOURCE_BUNDLE_VERSION='SENTINEL';export const SOURCE_PREPARATION_VERSION='SENTINEL';export class RegimeInputError extends Error{};`,shortCircuit:true};}
   if(v2==='capture.ts')return{format:'module',source:namedSentinels(['captureScope','persistCapture','readCapture']),shortCircuit:true};
   if(url.endsWith('.module.css')){const source=readFileSync(new URL(url),'utf8'),classes=Object.fromEntries([...source.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m=>[m[1],m[1]]));return{format:'module',source:'export default '+JSON.stringify(classes)+';',shortCircuit:true};}
   if(url.endsWith('.json'))return{format:'module',source:'export default '+readFileSync(new URL(url),'utf8')+';',shortCircuit:true};
   if(url.endsWith('.tsx'))return{format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
  }
  return next(url,context);
 }
});
const sectorURL=pathToFileURL(path.join(root,'lib/dashboard/adapters/sector-etfs.ts')).href;
const sector=await import(sectorURL);
mock.module(sectorURL,{namedExports:{...sector,getSectorEtfsData:(...args)=>v1Failure?Promise.reject(v1Failure):sector.getSectorEtfsData(...args)}});
const dashboard=await import(pathToFileURL(path.join(root,'lib/dashboard/get-dashboard-data.ts')).href);
const home=await import(pathToFileURL(path.join(root,'lib/dashboard/get-home-dashboard-preview-data.ts')).href);
const routeSpecs=[['/dashboard','app/(es)/dashboard/page.tsx'],['/en/dashboard','app/en/dashboard/page.tsx'],['/','app/(es)/page.tsx'],['/en','app/en/page.tsx']];
const routes=[];for(const [route,file]of routeSpecs)routes.push({route,file,module:await import(pathToFileURL(path.join(root,file)).href)});
const setFlags=(legacy,job)=>{process.env.V2_SHADOW=legacy;process.env.V2_SHADOW_JOB_ENABLED=job;};
const canonicalRequests=()=>[...requests].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
async function within(work){let timer;try{return await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PUBLIC_WAITED_FOR_FORBIDDEN_PENDING_WORK')),1500);})]);}finally{clearTimeout(timer);}}
async function sample(route){
 globalThis.__PUBLIC_PROOF.cache.clear();requests.length=0;globalThis.__PUBLIC_PROOF.pathname=route.route;
 let tree=await within(()=>route.module.default());
 while(React.isValidElement(tree)&&typeof tree.type==='function'&&tree.type.constructor.name==='AsyncFunction')tree=await within(()=>tree.type(tree.props));
 return{html:renderToStaticMarkup(tree),requests:canonicalRequests()};
}
const checks=[],routeResults=[];
for(const route of routes){
 setFlags('OFF','OFF');mode='THROW';const baseline=await sample(route);
 const variants=[];
 for(const [legacy,job]of [['OFF','OFF'],['OFF','ON'],['ON','OFF'],['ON','ON']])for(const sentinel of ['THROW','PENDING']){
  setFlags(legacy,job);mode=sentinel;const current=await sample(route);
  assert.deepEqual(current,baseline,route.route+' flag/sentinel invariant');assert.deepEqual(calls,[]);assert.deepEqual(forbiddenImports,[]);
  variants.push({legacy,job,sentinel,status:'PASS'});
 }
 routeResults.push({route:route.route,file:route.file,html:baseline.html,htmlSha256:sha(baseline.html),requests:baseline.requests,requestSha256:sha(JSON.stringify(baseline.requests)),variants});
 checks.push({name:route.route+': actual SSR and fetch options invariant across flags and throwing/pending V2',status:'PASS'});
}
setFlags('ON','ON');mode='THROW';globalThis.__PUBLIC_PROOF.cache.clear();requests.length=0;
const dashboardValue=await dashboard.getDashboardData(),homeValue=await home.getHomeDashboardPreviewData();
assert.ok(Object.hasOwn(dashboardValue,'sectorModule'));assert.ok(Object.hasOwn(homeValue,'vixTermStructure'));assert.equal(Object.hasOwn(homeValue,'btcEtfFlows'),false);
checks.push({name:'actual evolved V1 aggregate outputs retain sectorModule and home VIX return contracts',status:'PASS'});
const beforeWarm=requests.length;const warm=await home.getHomeDashboardPreviewData();assert.deepEqual(warm,homeValue);assert.equal(requests.length,beforeWarm);
assert.ok(globalThis.__PUBLIC_PROOF.cacheDefinitions.some(d=>JSON.stringify(d.keyParts)==='["home-dashboard-preview-data-v1"]'&&d.options.revalidate===21600));
checks.push({name:'explicit Next cache shim preserves declared home key/TTL and avoids new requests on warm reads',status:'PASS'});
for(const [name,load]of [['dashboard',dashboard.getDashboardData],['home',home.getHomeDashboardPreviewData]]){
 globalThis.__PUBLIC_PROOF.cache.clear();v1Failure=new Error('ORIGINAL_V1_FAILURE_'+name);
 const expected=v1Failure;await assert.rejects(load(),error=>error===expected);v1Failure=null;
 checks.push({name:name+': original V1 exception identity propagates under both flags ON',status:'PASS'});
}
await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[]);assert.deepEqual(forbiddenImports,[]);assert.deepEqual(nativeNetworkAttempts,[]);
const observables=JSON.parse(JSON.stringify({routes:routeResults.map(({route,file,html,htmlSha256,requests,requestSha256})=>({route,file,html,htmlSha256,requests,requestSha256})),dashboardValue,homeValue,cacheDefinitions:globalThis.__PUBLIC_PROOF.cacheDefinitions},(_key,value)=>value===undefined?{__publicProofType:"undefined"}:value));
const record={schemaVersion:'regime-v2-public-integration-proof/1.0.0',root,status:'PASS',mode:options.baseline?'INTEGRATED_COMPARISON':'FRESH_REMOTE_BASELINE',checks,routeResults,observables,observablesSha256:sha(JSON.stringify(observables)),forbiddenImports,calls,nativeNetworkAttempts,actualNetworkRequests:0,controlledHttpStatus:404,fixedClock:'2026-09-10T09:00:00.000Z',sourceHashes:Object.fromEntries([...loadedSources].sort().map(p=>[p,sha(readFileSync(path.join(root,p)))])),limitations:['Actual application route functions, V1 adapters and scorer run against controlled unavailable HTTP responses; no live market output claim.','Next image/link/navigation/CSS are rendering shims. unstable_cache is an explicit per-process keyed promise cache preserving arguments and declared TTL metadata; it does not reproduce the deployed incremental-cache implementation or TTL expiry. React cache uses the installed real React implementation.','The approved passive pipeline-capture response tap may import capture function definitions; persist/read/capture functions are sentinels. No active V2 engine/normalizer/job/snapshot/S3 module import or call is permitted.','Undefined object properties are retained as explicit __publicProofType:undefined tags so persisted baseline comparison does not silently drop shape differences.','No production HTTP server or latency/SLA study; the bounded pending-sentinel check demonstrates absence of a dependency to await.']};
if(options.baseline){const baseline=JSON.parse(readFileSync(options.baseline,'utf8'));assert.deepEqual(observables,baseline.observables,'Integrated outputs, HTML, requests and cache declarations must equal fresh remote baseline exactly');record.baselineSha256=sha(readFileSync(options.baseline));record.integrationEquality='PASS';}
mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({status:record.status,mode:record.mode,routes:4,flagSentinelVariants:32,checks:checks.length,observablesSha256:record.observablesSha256,forbiddenImports:forbiddenImports.length,V2Calls:calls.length,actualNetworkRequests:0,output}));
