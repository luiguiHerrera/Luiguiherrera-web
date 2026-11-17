// Actual local bytes, read-only sources. No browser, provider or network calls.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {verifyInputs} from '../../statistical-levels-release/scripts/preview-qa.mjs';
import {P,TRANSITION,sha} from '../../statistical-levels-release/scripts/release-core.mjs';
const manifest=JSON.parse(await fs.readFile(new URL('../../statistical-levels-release/source-inputs.json',import.meta.url)));
const repository=path.resolve(import.meta.dirname,'../../..');
// Immutable baseline fixture plus the frozen source inputs, portable across valid data successors.
const editorial=await fs.mkdtemp(path.join(os.tmpdir(),'sl-editorial-input-model-'));
after(()=>fs.rm(editorial,{recursive:true,force:true}));
for(const name of new Set([...Object.keys(manifest),...P.allowlist])){
 const bytes=P.allowlist.includes(name)?execFileSync('git',['show',P.baseline.production_git_sha+':'+name],{cwd:repository,maxBuffer:16*1024*1024}):await fs.readFile(path.join(repository,name));
 await fs.mkdir(path.dirname(path.join(editorial,name)),{recursive:true});await fs.writeFile(path.join(editorial,name),bytes,{flag:'wx'});
}
const expected={authority_run_id:P.baseline.authority_run_id,sealed_manifest_sha256:P.baseline.sealed_manifest_sha256};
const target={operation:TRANSITION,phase:'production',candidate_git_sha:'8c770af7059b33a2e841f5afa4b87344db4aa177',deployment_id:'dpl_OfflineEditorialFixture0001',...expected,origin:P.production_origin};
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};
test('rebind QA accepts frozen editorial inputs and exact 7 November Git snapshot',async()=>{
 assert.deepEqual(await verifyInputs(editorial,manifest,target),expected);
});
test('rollback QA accepts exact baseline Git blobs including authenticated historical source',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sl-rollback-input-model-'));
 try{
  const blob=name=>execFileSync('git',['--no-optional-locks','show',P.baseline.production_git_sha+':'+name],{cwd:repository,maxBuffer:16*1024*1024});
  const provenance=JSON.parse(blob('lib/statistical-levels/generated-provenance.json'));
  const names=new Set([...P.allowlist,...provenance.SOURCE_BUNDLE.map(x=>x.file),'docs/statistical-levels-capability-ledger.json']);
  for(const name of names){const bytes=blob(name);await fs.mkdir(path.dirname(path.join(directory,name)),{recursive:true});await fs.writeFile(path.join(directory,name),bytes,{flag:'wx'});}
  assert.deepEqual(await verifyInputs(directory,manifest,{...target,candidate_git_sha:P.baseline.production_git_sha,deployment_id:P.baseline.production_deployment_id}),expected);
  for(const name of P.allowlist)assert.equal(sha(await fs.readFile(path.join(directory,name))),sha(await fs.readFile(path.join(editorial,name))),name);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('rebind retains current source input hashes and exact authority identity',async()=>{
 const altered={...manifest,[Object.keys(manifest)[0]]:'0'.repeat(64)};
 await assert.rejects(verifyInputs(editorial,altered,target),{message:'QA_INPUT_HASH'});
 await assert.rejects(verifyInputs(editorial,manifest,{...target,authority_run_id:'20261114T145859578Z-0692c205-c4c8-4487-b6c0-47c629b82a60'}),{message:'TRANSITION_SNAPSHOT_IDENTITY'});
 await assert.rejects(verifyInputs(editorial,manifest,{...target,sealed_manifest_sha256:'0'.repeat(64)}),{message:'TRANSITION_SNAPSHOT_IDENTITY'});
});
