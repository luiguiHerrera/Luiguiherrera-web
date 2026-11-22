// Portable local file tests; no public target, grant, certificate or network.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const repo=path.resolve(import.meta.dirname,'../../..');
const git=(...args)=>execFileSync('git',['--no-optional-locks',...args],{cwd:repo,maxBuffer:32_000_000});
// Retain the actual sealed catalog subject; current AC capture has separate cases.
const head='ebd06d2f63682125cff9ed3a4434b335e57dbefe';
const inputs=JSON.parse(git('show',head+':scripts/statistical-levels-release/source-inputs.json'));
const temp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'sl-technical-capture-tests-')));
const clone=path.join(temp,'candidate');
execFileSync('git',['clone','--shared','--no-checkout',repo,clone],{stdio:'pipe'});
execFileSync('git',['checkout','--detach',head],{cwd:clone,stdio:'pipe'});
const {resolveCurrentAuthority,bindTechnicalCaptureContext}=await import(pathToFileURL(path.join(clone,'scripts/statistical-levels-release/scripts/capture-full-product.mjs')));
const {verifyInputs,verifySnapshotInputs}=await import(pathToFileURL(path.join(clone,'scripts/statistical-levels-release/scripts/preview-qa.mjs')));
const {P,PROMOTE,TRANSITION}=await import(pathToFileURL(path.join(clone,'scripts/statistical-levels-release/scripts/release-core.mjs')));
after(()=>fs.rm(temp,{recursive:true,force:true}));
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};
let authority;
test('technical capture accepts only actual sealed artifact facts without a release target',async()=>{
 authority=await resolveCurrentAuthority(clone);
 assert.equal(authority.authority_run_id,P.baseline.authority_run_id);
 assert.equal(authority.sealed_manifest_sha256,P.baseline.sealed_manifest_sha256);
 assert.equal(authority.technical_capture.sha,head);
 assert.equal(authority.technical_capture.snapshot_files,82);
 assert.equal(authority.technical_capture.scope,'ARTIFACT_ONLY_NOT_RELEASE_AUTHORIZATION');
 assert.equal(authority.technical_capture.release_authority_issued,false);
 assert.equal(Object.hasOwn(authority.technical_capture,'deployment_id'),false);
 assert.equal(Object.hasOwn(authority.technical_capture,'authorization'),false);
});
test('common snapshot integrity is independent of release and PROMOTE still rejects 7 November',async()=>{
 const facts=await verifySnapshotInputs(clone,inputs,{preserved:true});
 assert.deepEqual(facts,{authority_run_id:P.baseline.authority_run_id,sealed_manifest_sha256:P.baseline.sealed_manifest_sha256});
 await assert.rejects(verifyInputs(clone,inputs,{operation:PROMOTE}),{message:'FUTURE_AUTHORITY_REQUIRED'});
 await assert.rejects(verifyInputs(clone,inputs,{operation:TRANSITION}),{message:'ATTESTATION_CANDIDATE'});
 await assert.rejects(verifyInputs(clone,inputs,{operation:'TECHNICAL_CAPTURE'}),{message:'OPERATION_REQUIRED'});
});
test('technical capture binds native subject and local digest without exchanging their roles',()=>{
 assert.equal(bindTechnicalCaptureContext(authority,{role:'hosted',subject:head}),authority);
 assert.equal(bindTechnicalCaptureContext(authority,{role:'local',subject:authority.technical_capture.local_subject_sha256}),authority);
 for(const context of [{role:'hosted',subject:'0'.repeat(40)},{role:'hosted',subject:authority.technical_capture.local_subject_sha256},{role:'local',subject:head},{role:'local',subject:'0'.repeat(64)},{role:'unknown',subject:head}])assert.throws(()=>bindTechnicalCaptureContext(authority,context),/CAPTURE_TECHNICAL_SUBJECT/);
 assert.throws(()=>bindTechnicalCaptureContext({...authority,technical_capture:{...authority.technical_capture,release_authority_issued:true}},{role:'hosted',subject:head}),/CAPTURE_TECHNICAL_SCOPE/);
});
async function changed(name,transform,run){
 const file=path.join(clone,name),before=await fs.readFile(file);
 try{await fs.writeFile(file,transform(before));await run();}finally{await fs.writeFile(file,before);}
}
test('technical capture rejects an altered snapshot byte',async()=>{
 await changed('lib/statistical-levels/generated/assets/SPY.json',b=>Buffer.concat([b,Buffer.from('\n')]),()=>assert.rejects(resolveCurrentAuthority(clone),/TECHNICAL_CAPTURE_CHECKOUT_BYTES/));
});
test('technical capture rejects another date and provenance seal',async()=>{
 for(const [from,to] of [['20261107','20261114'],[P.baseline.sealed_manifest_sha256,'0'.repeat(64)]])await changed('lib/statistical-levels/generated-provenance.json',b=>Buffer.from(b.toString().replaceAll(from,to)),()=>assert.rejects(resolveCurrentAuthority(clone),/TECHNICAL_CAPTURE_CHECKOUT_BYTES/));
});
test('technical capture rejects dirty component and forged source-input manifest',async()=>{
 for(const name of ['components/layout/Header.tsx','scripts/statistical-levels-release/source-inputs.json'])await changed(name,b=>Buffer.concat([b,Buffer.from('\n')]),()=>assert.rejects(resolveCurrentAuthority(clone),/TECHNICAL_CAPTURE_CHECKOUT_BYTES/));
});
test('common verifier preserves input hashes and baseline provenance pin',async()=>{
 await assert.rejects(verifySnapshotInputs(clone,{...inputs,[Object.keys(inputs)[0]]:'0'.repeat(64)},{preserved:true}),{message:'QA_INPUT_HASH'});
 await changed('lib/statistical-levels/generated-provenance.json',b=>Buffer.concat([b,Buffer.from('\n')]),()=>assert.rejects(verifySnapshotInputs(clone,inputs,{preserved:true}),{message:'BASELINE_PROVENANCE_HASH'}));
});
test('technical capture rejects symlinked snapshot and source',async()=>{
 for(const name of ['lib/statistical-levels/generated/assets/SPY.json','components/layout/Header.tsx']){
  const file=path.join(clone,name),other=path.join(temp,'retained');await fs.rename(file,other);
  try{await fs.symlink(other,file);await assert.rejects(resolveCurrentAuthority(clone),/CAPTURE_AUTHORITY_SYMLINK/);}finally{await fs.unlink(file);await fs.rename(other,file);}
 }
});
test('caller flag and another lineage cannot enable the technical path',async()=>{
 const previous=process.env.SL_CAPTURE_EXTRAORDINARY;process.env.SL_CAPTURE_EXTRAORDINARY='true';
 try{
  for(const ref of ['e66a44e90628154546d0190c69ba5030828d972a','37363b10183a9505512ced3c21730c190ca0c736']){
   execFileSync('git',['checkout','--detach',ref],{cwd:clone,stdio:'pipe'});
   await assert.rejects(resolveCurrentAuthority(clone),/FUTURE_AUTHORITY_REQUIRED/);
  }
 }finally{execFileSync('git',['checkout','--detach',head],{cwd:clone,stdio:'pipe'});if(previous===undefined)delete process.env.SL_CAPTURE_EXTRAORDINARY;else process.env.SL_CAPTURE_EXTRAORDINARY=previous;}
});
test('historical capture context imports without requiring the new snapshot verifier export',async()=>{
 const name='scripts/statistical-levels-release/scripts/preview-qa.mjs';
 const original=git('show','0004db585fb402c97d8470c31ea4e405f0905b7e:'+name);
 assert.equal(original.toString().includes('export async function verifySnapshotInputs'),false);
 await changed(name,()=>original,async()=>{
  const program="import {pathToFileURL} from 'node:url';const {fullProductContext}=await import(pathToFileURL(process.argv[2]));const context=fullProductContext({SL_NEXT_LOCAL_ORIGIN:'http://127.0.0.1:31876',CI_EVIDENCE:process.argv[3],SL_LOCAL_QUALIFICATION_SUBJECT_SHA256:'a'.repeat(64),SL_FULL_PRODUCT_RUN_ID:'HISTORICAL_IMPORT_MODEL',SL_FULL_PRODUCT_RUN_ATTEMPT:'1'});console.log(JSON.stringify(context));";
  const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',program,'historical-import-model',path.join(clone,'scripts/statistical-levels-release/scripts/capture-full-product.mjs'),temp],{cwd:clone,env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']}).toString());
  assert.equal(result.role,'local');assert.equal(result.subject,'a'.repeat(64));
  assert.equal(Object.hasOwn(result,'authority'),false);
 });
});
test('product validation and secret protections remain byte-identical to U',async()=>{
 const name='scripts/statistical-levels-release/scripts/capture-full-product.mjs';const before=git('show','e66a44e90628154546d0190c69ba5030828d972a:'+name).toString(),after=await fs.readFile(path.join(repo,name),'utf8');
 for(const [start,end] of [['async function validateProduct(','export async function readFullProductEvidence('],['function safeEnvironment(','export async function captureFullProduct('],['    await runReadOnlyQA(','    phase = \'ARTIFACT_CLOSURE\';']])assert.equal(after.slice(after.indexOf(start),after.indexOf(end)),before.slice(before.indexOf(start),before.indexOf(end)));
});
