import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {historicalPinnedBytes,historicalProbeRegion,exactWorkflowJob,historicalWorkflowPrefix,assertHistoricalWorkflow,withoutReceiptClass} from '../../statistical-levels-release/tests/semantic-closure-compat.mjs';
import {selectProbeTarget} from '../../statistical-levels-release/scripts/probe-core.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const prefix='scripts/statistical-levels-release/';
const old='8ce104066fe968026d24e0f006744f88e338585a',r='aec5be3b7207d1023effea78785291df815965b9';
const read=p=>fs.readFileSync(new URL('../../../'+p,import.meta.url));
const git=(ref,p)=>execFileSync('git',['--no-optional-locks','show',ref+':'+p],{cwd:root});
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['release-core.mjs','runtime-io.mjs','cli.mjs','invoke.mjs','browser-harness.mjs'];
const wfPath='.github/workflows/statistical-levels-release.yml',workflow=read(wfPath).toString();
test('compat exact historical pins keep DX bytes and bind each current R file',()=>{
 for(const name of files){const current=read(prefix+'scripts/'+name);assert.deepEqual(current,git(r,prefix+'scripts/'+name));assert.deepEqual(historicalPinnedBytes(name,current),git(old,prefix+'scripts/'+name));}
 assert.equal(sha(withoutReceiptClass(historicalPinnedBytes('release-core.mjs',read(prefix+'scripts/release-core.mjs')))),'a742b751bd6365b024ba4c84f605e4fd0584316dfd107114372d2bdda2427757');
});
test('compat every changed pinned implementation is rejected before projection',()=>{
 for(const name of files){const bytes=read(prefix+'scripts/'+name);for(const changed of [Buffer.concat([bytes,Buffer.from('\n')]),bytes.subarray(1),git(old,prefix+'scripts/'+name)])assert.throws(()=>historicalPinnedBytes(name,changed),/CURRENT_HISTORICAL_CONTRACT/);}
});
test('compat ordinary unprojected pins still compare their actual bytes',()=>{
 const source=read(prefix+'policy.json');assert.equal(historicalPinnedBytes('policy.json',source),source);
 assert.equal(sha(source),'d9cf2b483bfea536ca6afdf160ed534e42a96bf175f5b7dd658b0d020b6d40f2');
 assert.notEqual(sha(historicalPinnedBytes('policy.json',Buffer.concat([source,Buffer.from('\n')]))),sha(source));
});
const declaration=read(prefix+'scripts/probe-core.mjs').toString().match(/const releaseInputs = \[[\s\S]*?\];/)[0];
test('compat PROBE declaration keeps the original pin and exact additional field',()=>{
 assert.equal(sha(historicalProbeRegion('releaseInputs',declaration)),'04cda7c53aed718af18d69bdc768fb42329d4eccc5263520196b0aa6a1453a5f');
 assert.ok(declaration.startsWith("const releaseInputs = ['transition_request', "));
});
test('compat PROBE cannot remove any field or add an unapproved declaration',()=>{
 for(const field of ['transition_request','candidate_git_sha','candidate_deployment_id','expected_previous_production_sha','expected_previous_production_deployment','previous_publication_date'])assert.throws(()=>historicalProbeRegion('releaseInputs',declaration.replace("'"+field+"'","'other'")),/PROBE_CORE_SECURITY:releaseInputs/);
 for(const source of [declaration+'\n',declaration.replace('const','let'),declaration.replace('];',", 'extra'];")])assert.throws(()=>historicalProbeRegion('releaseInputs',source),/PROBE_CORE_SECURITY:releaseInputs/);
});
test('compat all six nonempty release inputs remain forbidden for PROBE',()=>{
 const base={operation:'PROBE_IDENTITY',probe_git_sha:'a'.repeat(40),probe_deployment_id:'dpl_CompatibilityFixture001'};
 assert.equal(selectProbeTarget({...base,transition_request:''}).operation,'PROBE_IDENTITY');
 for(const field of ['transition_request','candidate_git_sha','candidate_deployment_id','expected_previous_production_sha','expected_previous_production_deployment','previous_publication_date'])assert.throws(()=>selectProbeTarget({...base,[field]:'untrusted'}),/PROBE_RELEASE_INPUT_FORBIDDEN/);
 assert.throws(()=>selectProbeTarget({...base,operation:'EXTRAORDINARY_EDITORIAL_AUTHORITY_TRANSITION'}),/PROBE_OPERATION_REQUIRED/);
});
test('compat PROBE job is bounded and every ordinary and extraordinary job is retained',()=>{
 const actual=exactWorkflowJob(workflow,'identity-probe');assert.doesNotMatch(actual,/invoke\.mjs|environment:|contents: write|secrets:/);
 assert.match(workflow.split('  identity-probe:\n')[1],/invoke\.mjs/);
 const names=source=>[...source.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)].map(m=>m[1]);assert.deepEqual(names(workflow),names(git(r,wfPath).toString()));
 for(const name of names(workflow))assert.ok(exactWorkflowJob(workflow,name).startsWith('  '+name+':\n'));
});
test('compat missing duplicated or foreign workflow jobs are rejected',()=>{
 for(const name of [...workflow.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)].map(m=>m[1])){
  const block=exactWorkflowJob(workflow,name);assert.throws(()=>assertHistoricalWorkflow(workflow.replace(block,'')),/HISTORICAL_WORKFLOW_/);
 }
 for(const source of [workflow+'\n  identity-probe:\n',workflow+'\n  unknown-job:\n'])assert.throws(()=>assertHistoricalWorkflow(source),/HISTORICAL_WORKFLOW_JOB_INVENTORY/);
 assert.throws(()=>exactWorkflowJob(workflow,'unknown-job'),/HISTORICAL_WORKFLOW_MISSING_JOB/);
});
test('compat PROBE invocation or expanded job privileges cannot hide in the selector',()=>{
 const old=exactWorkflowJob(workflow,'identity-probe');
 for(const text of ['invoke.mjs','environment: production','contents: write','secrets: inherit']){
  const source=workflow.replace(old,old+'    '+text+'\n');assert.throws(()=>exactWorkflowJob(source,'identity-probe'),/HISTORICAL_WORKFLOW_DELTA/);
 }
});
test('compat workflow retains the original historical prefix and validates all current bytes',()=>{
 assert.equal(sha(historicalWorkflowPrefix(workflow)),'add625df91a3a04f452939b720f769aff69d85839ffc1d3e310a646a7b28b352');
 assert.throws(()=>historicalWorkflowPrefix(workflow.replace('contents: read','contents: write')),/HISTORICAL_WORKFLOW_DELTA/);
 assert.throws(()=>historicalWorkflowPrefix(workflow.replace('cancel-in-progress: false','cancel-in-progress: true')),/HISTORICAL_WORKFLOW_DELTA/);
});
test('compat wrong source pins or independent workflow edits are rejected',()=>{
 assert.throws(()=>assertHistoricalWorkflow(workflow.replace(/EXPECTED_SOURCE_SUMS: [a-f0-9]{64}/,'EXPECTED_SOURCE_SUMS: '+'0'.repeat(64))),/HISTORICAL_WORKFLOW_PINS/);
 assert.throws(()=>assertHistoricalWorkflow(workflow+'\n'),/HISTORICAL_WORKFLOW_DELTA/);
});
