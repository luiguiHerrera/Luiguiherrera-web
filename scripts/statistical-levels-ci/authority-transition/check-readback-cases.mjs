import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {serviceCheck} from './service-check.mjs';
import {validateTransitionCheckReadback,runTransitionMode,transitionCheckTimestamp} from '../../statistical-levels-release/scripts/runtime-io.mjs';
const body={name:'statistical-levels-production-qa',head_sha:'a'.repeat(40),external_id:'9001',status:'completed',conclusion:'success',completed_at:'2026-11-17T15:00:03Z',output:{title:'Extraordinary QA',summary:'canonical-binding',text:'canonical-payload'}};
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};
const reject=value=>assert.throws(()=>validateTransitionCheckReadback(value,body),{message:'TRANSITION_CHECK_READBACK'});
test('full representative service Check retains exact binding with annotation metadata',()=>{
 assert.equal(validateTransitionCheckReadback(serviceCheck(body),body).id,13001);
});
test('every binding field rejects absence alteration and wrong type',()=>{
 for(const key of ['name','head_sha','external_id','status','conclusion','completed_at']){
  for(const value of [undefined,'changed',123,null,{},[]]){const c=serviceCheck(body);if(value===undefined)delete c[key];else c[key]=value;reject(c);}
 }
 for(const key of ['title','summary','text'])for(const value of [undefined,'changed',123,null,{},[]]){
  const c=serviceCheck(body);if(value===undefined)delete c.output[key];else c.output[key]=value;reject(c);
 }
 for(const value of [undefined,null,{},[],{slug:'forged'},{slug:123}])reject({...serviceCheck(body),app:value});
 for(const value of [undefined,null,{},[]])reject({...serviceCheck(body),output:value});
 for(const value of [undefined,0,-1,'13001',1.5,Number.MAX_SAFE_INTEGER+1])reject({...serviceCheck(body),id:value});
});
test('only known nonbinding metadata may extend Check output',()=>{
 const c=serviceCheck(body);delete c.output.annotations_count;delete c.output.annotations_url;
 validateTransitionCheckReadback(c,body);
 for(const [key,value] of [['annotations_count',-1],['annotations_count','0'],['annotations_url','https://wrong.invalid/'],['annotations_url',null],['authority','invented']]){
  const c=serviceCheck(body);c.output[key]=value;reject(c);
 }
 reject({...serviceCheck(body),authority:'invented'});
});
test('producer accepts service metadata and rejects actual corruption after Check creation',async()=>{
 const f=JSON.parse(await fs.readFile(path.join(process.env.SL_TRANSITION_TEST_OUT,'link-fixture.json'))),i=f.producer_input;
 for(const corrupt of [false,true]){
  let writes=0,outputs=0,tick=0;const original={mkdir:fs.mkdir,writeFile:fs.writeFile,appendFile:fs.appendFile};
  fs.mkdir=async()=>{};fs.writeFile=async()=>{outputs++};fs.appendFile=async()=>{outputs++};
  try{
   const run=()=>runTransitionMode('transition-qa',{RUNNER_TEMP:process.env.SL_TRANSITION_TEST_OUT,GITHUB_OUTPUT:'unused-memory-output',SL_TRANSITION_CONTEXT:JSON.stringify(i.proof)},{
    assertWorkflow:async()=>({selection:i.selection,run:i.run,workflow_sha256:i.workflow_hash}),clock:()=>new Date(i.clock_ms+1000*tick++).toISOString(),
    github:async p=>p.includes('/jobs?')?i.jobs:i.comparison,runQA:async()=>f.produced.envelope.product_report,
    githubWrite:async(_,b)=>{writes++;const c=serviceCheck(b);if(corrupt)c.output.text+='changed';return c;}
   });
   if(corrupt){await assert.rejects(run,{message:'TRANSITION_CHECK_READBACK'});assert.equal(outputs,0);}else{await run();assert.equal(outputs,3);}
   assert.equal(writes,1);
  }finally{Object.assign(fs,original);}
 }
});
test('Check timestamp observes a whole UTC second without postdating or lowering QA time',async()=>{
 const times=['2026-11-17T15:00:00.125Z','2026-11-17T15:00:01.001Z'];const waits=[];
 assert.equal(await transitionCheckTimestamp('2026-11-17T15:00:00.120Z',()=>times.shift(),async ms=>waits.push(ms)),'2026-11-17T15:00:01Z');
 assert.deepEqual(waits,[875]);
 await assert.rejects(()=>transitionCheckTimestamp('2026-11-17T15:00:00.120Z',()=> '2026-11-17T15:00:00.125Z',async()=>{}),{message:'TRANSITION_CHECK_CLOCK'});
});
