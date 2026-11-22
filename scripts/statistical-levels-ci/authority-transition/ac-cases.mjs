// Current AC inputs are separate from historical baseline capture models.
import test from 'node:test';
import {qaRoutesForTarget,qaScriptRoutes,isRegisteredQARouteCoverage} from '../../statistical-levels-release/scripts/qa-routes.mjs';
import {historicalPolicyBytes,beforeAcRoutePaths} from '../../statistical-levels-release/tests/semantic-closure-compat.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {P,PROMOTE} from '../../statistical-levels-release/scripts/release-core.mjs';
import {resolveCurrentAuthority,fullProductContext} from '../../statistical-levels-release/scripts/capture-full-product.mjs';
import {verifyInputs} from '../../statistical-levels-release/scripts/preview-qa.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'scripts/statistical-levels-release/source-inputs.json')));
const provenance=JSON.parse(await fs.readFile(path.join(root,'lib/statistical-levels/generated-provenance.json')));
test('AC future capture validates its actual source and all snapshots without issuing authority',async()=>{
 const authority=await resolveCurrentAuthority(root);
 assert.equal(authority.authority_run_id,provenance.BASELINE_ID);
 assert.equal(authority.sealed_manifest_sha256,provenance.CONFIG.RAW_ARCHIVE_SEAL_SHA256);
 assert.equal(Object.hasOwn(authority,'technical_capture'),false);
 assert.equal(Object.hasOwn(authority,'release_authority_issued'),false);
 assert.equal(Object.hasOwn(authority,'deployment_id'),false);
});
test('AC material inventory includes both canonical routes and the complete history decoder',()=>{
 assert.equal(Object.keys(manifest).length,86);
 for(const p of ['app/(es)/analisiscuantitativo/page.tsx','app/en/quantitative-analysis/page.tsx','lib/statistical-levels/period-history.ts'])assert.ok(Object.hasOwn(manifest,p));
 for(const p of ['app/(es)/niveles-estadisticos/page.tsx','app/en/statistical-levels/page.tsx'])assert.equal(Object.hasOwn(manifest,p),false);
});
test('AC future input validation rejects forged component hashes',async()=>{
 await assert.rejects(verifyInputs(root,{...manifest,'components/statistical-levels/StatLevelsLab.tsx':'0'.repeat(64)},{operation:PROMOTE}),{message:'QA_INPUT_HASH'});
});
test('AC future policy retains independent immutable production source and ledger pins',()=>{
 const previous=JSON.parse(execFileSync('git',['show','fd007159235c306b714789d60786a5733ab7d8f4:scripts/statistical-levels-release/policy.json'],{cwd:root}));
 const baseline={...P.baseline};delete baseline.source_bundle;delete baseline.ledger_hash;
 assert.deepEqual(baseline,previous.baseline);
 assert.deepEqual(P.baseline.source_bundle,previous.source_bundle);
 assert.equal(P.baseline.ledger_hash,previous.ledger_hash);
 assert.deepEqual(P.source_bundle,provenance.SOURCE_BUNDLE);
 assert.notDeepEqual(P.source_bundle,P.baseline.source_bundle);
});

test('AC policy projection rejects altered permissions and baseline identity',async()=>{
 const actual=await fs.readFile(path.join(root,'scripts/statistical-levels-release/policy.json'));
 assert.ok(historicalPolicyBytes(actual));
 for(const change of [p=>p.baseline.production_git_sha='0'.repeat(40),p=>p.release_role_arn='other-role',p=>p.source_bundle[0].SHA256='0'.repeat(64),p=>p.ledger_hash='0'.repeat(64)]){const p=JSON.parse(actual);change(p);assert.throws(()=>historicalPolicyBytes(Buffer.from(JSON.stringify(p,null,2)+'\n')));}
});

test('AC source branch capture retains real hosted identity and grants no native admission',()=>{
 const ref='refs/heads/codex/ac-source-qualification-20261122';
 const env={CI_EVIDENCE:'/tmp/ac-context-model',SL_NEXT_LOCAL_ORIGIN:'http://127.0.0.1:31876',GITHUB_SHA:'a'.repeat(40),CI_EVENT_SHA:'a'.repeat(40),GITHUB_REF:ref,GITHUB_EVENT_NAME:'push',GITHUB_REPOSITORY:'luiguiHerrera/Luiguiherrera-web',GITHUB_WORKFLOW_REF:'luiguiHerrera/Luiguiherrera-web/.github/workflows/ci.yml@'+ref,GITHUB_RUN_ID:'9999999',GITHUB_RUN_ATTEMPT:'1'};
 const context=fullProductContext(env);assert.equal(context.role,'hosted');assert.equal(context.subject,env.GITHUB_SHA);assert.equal(context.qualification_scope,'SOURCE_PRODUCT_TESTS_NOT_NATIVE_ADMISSION');assert.equal(context.release_authority_issued,false);
 for(const [key,value] of [['GITHUB_REPOSITORY','other/repository'],['GITHUB_WORKFLOW_REF','other/workflow'],['GITHUB_REF','refs/heads/other'],['GITHUB_EVENT_NAME','workflow_dispatch'],['CI_EVENT_SHA','b'.repeat(40)]])assert.throws(()=>fullProductContext({...env,[key]:value}));
});

test('AC routes use canonical pages while immutable baseline and Probe retain legacy pages',()=>{
 const current=[{file:'generator',SHA256:'new'}],historical=[{file:'generator',SHA256:'old'}];
 assert.deepEqual(qaRoutesForTarget({authority_run_id:'new'},current,historical,'old'),['/analisiscuantitativo','/en/quantitative-analysis']);
 assert.deepEqual(qaRoutesForTarget({authority_run_id:'old'},current,historical,'old'),['/niveles-estadisticos','/en/statistical-levels']);
 assert.deepEqual(qaRoutesForTarget({operation:'PROBE_IDENTITY'},current,current,'new'),['/niveles-estadisticos','/en/statistical-levels']);
 assert.deepEqual(qaRoutesForTarget({authority_run_id:'new'},current,current,'new'),['/analisiscuantitativo','/en/quantitative-analysis']);
});
test('AC route coverage rejects mixed languages missing pages and foreign paths',()=>{
 for(const routes of [['/analisiscuantitativo','/en/quantitative-analysis'],['/niveles-estadisticos','/en/statistical-levels']])assert.equal(isRegisteredQARouteCoverage(routes),true);
 for(const routes of [[],['/analisiscuantitativo'],['/analisiscuantitativo','/en/statistical-levels'],['/other','/en/quantitative-analysis'],{es:'/analisiscuantitativo',en:'/en/quantitative-analysis'}])assert.equal(isRegisteredQARouteCoverage(routes),false);
});
test('AC script route context is explicit bounded and removable without changing the harness',()=>{
 const original=globalThis.__SL_QA_SCRIPT_ROUTES__;
 try{
  delete globalThis.__SL_QA_SCRIPT_ROUTES__;assert.equal(qaScriptRoutes().es,'/niveles-estadisticos');
  globalThis.__SL_QA_SCRIPT_ROUTES__={es:'/analisiscuantitativo',en:'/en/quantitative-analysis'};assert.equal(qaScriptRoutes().en,'/en/quantitative-analysis');
  for(const bad of [{es:'/analisiscuantitativo',en:'/en/statistical-levels'},{es:'https://foreign.example',en:'/en/quantitative-analysis'},{es:'/analisiscuantitativo',en:'/en/quantitative-analysis',authority:true}]){globalThis.__SL_QA_SCRIPT_ROUTES__=bad;assert.throws(()=>qaScriptRoutes(),/QA_ROUTE_CONTEXT/);}
 }finally{if(original===undefined)delete globalThis.__SL_QA_SCRIPT_ROUTES__;else globalThis.__SL_QA_SCRIPT_ROUTES__=original;}
});

test('AC browser feedback is bound to its own fixed workflow and cannot select native admission',()=>{
 const ref='refs/heads/codex/ac-browser-qualification-20261122',workflow='luiguiHerrera/Luiguiherrera-web/.github/workflows/ac-browser-qualification.yml@'+ref;
 const env={CI_EVIDENCE:'/tmp/ac-browser-model',SL_NEXT_LOCAL_ORIGIN:'http://127.0.0.1:31876',GITHUB_SHA:'a'.repeat(40),CI_EVENT_SHA:'a'.repeat(40),GITHUB_REF:ref,GITHUB_EVENT_NAME:'push',GITHUB_REPOSITORY:'luiguiHerrera/Luiguiherrera-web',GITHUB_WORKFLOW_REF:workflow,GITHUB_RUN_ID:'9999999',GITHUB_RUN_ATTEMPT:'1'};
 const context=fullProductContext(env);assert.equal(context.release_authority_issued,false);assert.equal(context.qualification_scope,'SOURCE_PRODUCT_TESTS_NOT_NATIVE_ADMISSION');
 assert.throws(()=>fullProductContext({...env,GITHUB_WORKFLOW_REF:workflow.replace('ac-browser-qualification.yml','ci.yml')}));
});

import {createHash} from 'node:crypto';
import {matchActionControl,selectionExpression,actionSourceContract,listenerMarker} from '../../statistical-levels-release/scripts/adopt-causal-bridge.mjs';
import {createAdoptRequestEvidence} from '../../statistical-levels-release/scripts/adopt-request-evidence.mjs';
import {runtimeExecutableMatches,runtimeFetchProven} from '../../statistical-levels-release/scripts/runtime-transition-receipts.mjs';
const acDigest=value=>createHash('sha256').update(value).digest('hex');
test('AC action controls preserve exact legacy selectors and bind only the approved new controls',()=>{
 for(const kind of ['T3','T4'])assert.ok(matchActionControl(kind,'EVALUATE',selectionExpression(kind)));
 assert.ok(matchActionControl('T3','EVALUATE',selectionExpression('T3',true)));
 assert.ok(matchActionControl('T4','CLICK','[data-window="Full"]'));
 for(const [kind,type,value]of [['T3','CLICK','#sl-frequency select'],['T3','EVALUATE',selectionExpression('T3',true)+' '],['T4','CLICK','button'],['T4','CLICK','[data-window="10Y"]'],['UNKNOWN','CLICK','[data-window="Full"]'],['constructor','CLICK','[data-window="Full"]']])assert.equal(matchActionControl(kind,type,value),null);
});
test('AC action source identity rejects altered or mismatched compiled sources',()=>{
 for(const [kind,source,type]of [['T3',selectionExpression('T3'),'EVALUATE'],['T3',selectionExpression('T3',true),'EVALUATE'],['T4',selectionExpression('T4'),'EVALUATE'],['T4',listenerMarker,'CLICK']]){
  assert.equal(actionSourceContract({kind,source_sha256:acDigest(source)}).control.type,type);
  assert.equal(actionSourceContract({kind,source_sha256:acDigest(source+' ')}),null);
 }
 assert.equal(actionSourceContract({kind:'T3',source_sha256:acDigest(listenerMarker)}),null);assert.equal(actionSourceContract({kind:'constructor',source_sha256:acDigest(listenerMarker)}),null);
});
test('AC T3 and T4 retain native transition contexts and accept exactly one real control action',()=>{
 for(const [kind,line,actionId,type,parameter]of [['T3',136,'sl-main:L136:C36:select','EVALUATE',selectionExpression('T3',true)],['T4',137,'sl-main:L137:C9:select','CLICK','[data-window="Full"]']]){
  const capture=createAdoptRequestEvidence('http://127.0.0.1:31876');capture.listenerStart('page-1');capture.pageLifecycle('page-1','ACTIVE');
  capture.observability.context({suite_id:'sl-main',test_id:'sl-main:L'+line,action_id:actionId});
  assert.match(capture.start('page-1',kind),/^transition-/);
  const action=capture.action('page-1',type,parameter);assert.equal(action.kind,kind);assert.equal(action.tested_action_id,actionId);
  assert.equal(capture.action('page-1',type,parameter),null);
 }
});
test('AC runtime requires the exact immutable Next16.4.6 executable and all four native frames',()=>{
 const hash='49962c6499298c06762f7b00bc1cece34b8e2eacc44dae58d677be9df9847809';
 const script={code_sha256:hash,length:135210,default_context:true,live_edit:false,start_line:0,start_column:0,script_sha256:'a'.repeat(64)};
 assert.equal(runtimeExecutableMatches(script),true);
 for(const change of [{code_sha256:'0'.repeat(64)},{length:135211},{live_edit:true},{default_context:false},{start_line:1},{start_column:1}])assert.equal(runtimeExecutableMatches({...script,...change}),false);
 const witness={script,complete:true,runtime_header_compatible:true,base:{rsc:'NO',prefetch:'NO'},frames:[1995,134208,107564,20819].map(column=>({script_sha256:script.script_sha256,line:0,column}))};
 assert.equal(runtimeFetchProven(witness,'Fetch'),true);
 for(let i=0;i<4;i++){const changed=structuredClone(witness);changed.frames[i].column++;assert.equal(runtimeFetchProven(changed,'Fetch'),false);}
 assert.equal(runtimeFetchProven({...witness,complete:false},'Fetch'),false);assert.equal(runtimeFetchProven(witness,'XHR'),false);
});

test('AC historical subjects require exact current source hashes and replay to the immutable original Git blobs',async()=>{
 const prefix='scripts/statistical-levels-release/scripts/';
 for(const name of ['release-core.mjs','qa-runner.mjs','browser-harness-base.mjs','product-qa-observability.mjs','qa/qa-statistical-levels.mjs','qa/qa-statistical-levels-defects.mjs','qa/qa-statistical-levels-interaction-polish.mjs','qa/asset-transition-readiness.mjs','adopt-causal-bridge.mjs','adopt-request-evidence.mjs','runtime-transition-receipts.mjs']){
  const current=await fs.readFile(path.join(root,prefix+name)),previous=execFileSync('git',['show','fd007159235c306b714789d60786a5733ab7d8f4:'+prefix+name],{cwd:root});
  assert.deepEqual(beforeAcRoutePaths(name,current),previous);assert.deepEqual(beforeAcRoutePaths(prefix+name,current),previous);
  assert.deepEqual(beforeAcRoutePaths(name,previous),previous);assert.throws(()=>beforeAcRoutePaths(name,Buffer.concat([current,Buffer.from('\n// unregistered mutation\n')])));
 }
});
