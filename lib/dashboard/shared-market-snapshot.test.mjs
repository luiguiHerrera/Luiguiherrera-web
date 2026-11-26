import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {createRequire} from 'node:module';
import ts from 'typescript';
const realRequire=createRequire(import.meta.url);
function compile(file, require){const loaded={exports:{}};const source=readFileSync(new URL(file,import.meta.url),'utf8');const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','module','exports',js)(require,loaded,loaded.exports);return loaded.exports;}
test('Home and both dashboard consumers share one capture and the unchanged legacy calculation',async()=>{
 const calls={};const loaded=name=>{calls[name]=(calls[name]||0)+1;};const legacy={current:'Incompleto',regimeScore:null,confidence:null};
 const providers={
  getSectorEtfsData:async()=>{loaded('sector');return {module:{id:'sectors'},rotation:null,quantRisk:null};},
  getBtcEtfFlowsData:async()=>{loaded('legacyBtc');return {module:{id:'btc-flows'}};},
  getVixData:async()=>{loaded('vix');return {module:{id:'vix'}};},
  getVixTermStructureData:async()=>null,getGldFlowPressure:async()=>null,
  getMcClellanData:async()=>{loaded('breadth');return null;},
  getPublishedCapitalFlows:async()=>{loaded('newFlows');return [{id:'btc'},{id:'ewj'}];},
  getRadarRows:()=>[],
  buildRegimeSummary:()=>legacy,
 };
 let cached;
 const req=id=>{
  if(id==='react')return {cache:fn=>fn};
  if(id==='next/cache.js')return {unstable_cache:fn=>()=>cached??=(fn())};
  if(id==='node:crypto')return realRequire(id);
  if(id.includes('dashboard/')||id.startsWith('./'))return providers;
  throw new Error('Unexpected dependency '+id);
 };
 const dashboard=compile('./get-dashboard-data.ts',req);
 const home=compile('./get-home-dashboard-preview-data.ts',()=>dashboard);
 const [a,b,c]=await Promise.all([dashboard.getDashboardData(),dashboard.getDashboardData(),home.getHomeDashboardPreviewData()]);
 assert.equal(a,b);assert.equal(c.regimeSummary,a.regimeSummary);assert.equal(c.marketContext.id,a.marketContext.id);assert.equal(c.marketContext.capturedAt,a.marketContext.capturedAt);
 assert.deepEqual(calls,{sector:1,legacyBtc:1,vix:1,breadth:1,newFlows:1});assert.deepEqual(a.marketContext.flows.map(f=>f.id),['btc','ewj']);assert.equal(c.regimeSummary,legacy);
});

test('removing the sector index preserves every other published quantitative value',async()=>{
 const {execFileSync}=await import('node:child_process');const math=await import('./math.ts');
 const current=await import('./risk-models.ts');
 const source=execFileSync('git',['show','af4329a8ffdc02cc783421144a1d1b90862503e8:lib/dashboard/risk-models.ts'],{encoding:'utf8'});
 const loaded={exports:{}};const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',js)(()=>math,loaded,loaded.exports);
 for(const [amplitude,reading,dispersion] of [[0,'mixta',0],[.001,'growth',2],[.03,'defensiva',9],[.07,'cíclica',5]]){
  const sectors=Array.from({length:11},(_,i)=>({group:i<3?'defensive':i<7?'growth':'cyclical',dailyReturns:Array.from({length:100},(_,n)=>amplitude*Math.sin(n*.67+i*.03))}));
  const metrics={reading,sectorDispersion1w:dispersion,sectorDispersion1m:dispersion};
  const before=loaded.exports.buildQuantRiskData(sectors,metrics,'2026-11-24');const after=current.buildQuantRiskData(sectors,metrics,'2026-11-24');
  const {fragilityScore,fragilityLabel,fragilityInterpretation,...preserved}=before;
  assert.deepEqual(after,preserved);
  assert.equal('fragilityScore' in after,false);assert.equal('fragilityLabel' in after,false);assert.equal('fragilityInterpretation' in after,false);
  assert.equal(typeof fragilityScore,'number');assert.equal(typeof fragilityLabel,'string');assert.equal(typeof fragilityInterpretation,'string');
  const legacy={...before,fragilityComponents:[],fragilityUsesEwmaFallback:true};
  assert.deepEqual(current.withoutRetiredSectorIndex(legacy),after);
  assert.equal('fragilityScore' in legacy,true,'retiring cached fields must not mutate the retained source');
 }
});
