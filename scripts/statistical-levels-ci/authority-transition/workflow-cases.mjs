import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import * as core from '../../statistical-levels-release/scripts/release-core.mjs';
import {normalizeReleaseInputs,runTransitionMode} from '../../statistical-levels-release/scripts/runtime-io.mjs';
import {selectProbeTarget} from '../../statistical-levels-release/scripts/probe-core.mjs';
const root=import.meta.dirname,candidate=path.resolve(root,'../../..'),out=process.env.SL_TRANSITION_TEST_OUT;
const legacy=JSON.parse(await fs.readFile(path.join(root,'legacy-selection.json')));
import {serviceCheck} from './service-check.mjs';
const fixture=JSON.parse(await fs.readFile(path.join(out,'link-fixture.json'),'utf8'));
const input=fixture.producer_input,produced=fixture.produced;
const now=input.clock_ms+7000;
const clone=x=>structuredClone(x);
let remoteAttempts=0;globalThis.fetch=()=>{remoteAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const context=()=>core.validateTransitionContext(input.proof,input.selection,input.run,input.workflow_hash,now);
const request=(check=produced.check,jobs=fixture.server_jobs,envelope=produced.envelope)=>core.transitionCertificationRequest(context(),input.selection,envelope,check,jobs,input.run,input.workflow_hash,now);
function normalizePins(text){return text.replaceAll(/EXPECTED_SOURCE_SUMS: [a-f0-9]{64}/g,'EXPECTED_SOURCE_SUMS: PIN');}
// Read-only service-shaped metadata: the two success publications differ by one second.
function previewMetadata() {
 const sha='ae09a44ffce5860f511c08061f9621934eadbe08', id='dpl_2yk8Jhk27AHAAvmDVfB3sVG9YJni';
 const origin='https://luiguiherrera-9gcvdyets-luigui-herrera-s-projects.vercel.app';
 const api='https://api.github.com/repos/'+core.P.repository;
 const creator={login:core.P.vercel_creator_login,id:core.P.vercel_creator_id};
 const before='2026-11-16T19:59:57Z',after='2026-11-16T19:59:58Z',parent=api+'/deployments/7834868950';
 return {target:{operation:core.PROMOTE,candidate_git_sha:sha,deployment_id:id},origin,
  deployments:[{id:7834868950,creator,sha,ref:sha,environment:'Preview',production_environment:false,url:parent,created_at:before,updated_at:after}],
  commits:[{id:59067546047,creator,context:'Vercel',state:'success',target_url:core.P.vercel_details_base_url+id.slice(4),url:api+'/statuses/'+sha,created_at:before,updated_at:before}],
  statuses:{'7834868950':[{id:22346706230,creator,state:'success',environment:'Preview',deployment_url:parent,url:parent+'/statuses/22346706230',environment_url:origin,target_url:origin,log_url:origin,created_at:after,updated_at:after}]}};
}
const resolveMetadata=d=>core.resolvePreview(d.deployments,d.statuses,d.commits,d.target);
test('ordinary Preview resolver accepts independently published success timestamps',()=>{
 const d=previewMetadata(),resolved=resolveMetadata(d);
 assert.notEqual(d.commits[0].updated_at,d.statuses['7834868950'][0].updated_at);
 assert.equal(resolved.origin,d.origin);assert.equal(resolved.deployment_id,d.target.deployment_id);
 assert.equal(resolved.candidate_git_sha,d.target.candidate_git_sha);assert.equal(resolved.status_id,22346706230);
});
test('ordinary Preview resolver imposes no cross-stream temporal ordering',()=>{
 for(const time of ['2026-11-16T19:59:56Z','2026-11-16T19:59:58Z','2026-11-16T20:00:00Z']){
  const d=previewMetadata();d.commits[0].created_at=d.commits[0].updated_at=time;
  assert.equal(resolveMetadata(d).origin,d.origin);
 }
});
test('ordinary Preview resolver rejects invalid or missing independent timestamps',()=>{
 for(const stream of ['commit','status'])for(const value of [undefined,null,1794850000,'UNKNOWN','2026-02-30T19:59:57Z','2026-11-16T19:59:57+00:00']){
  const d=previewMetadata(),record=stream==='commit'?d.commits[0]:d.statuses['7834868950'][0];record.updated_at=value;
  assert.throws(()=>resolveMetadata(d),/PREVIEW_TIMESTAMP/);
 }
});
test('ordinary Preview resolver rejects inconsistent creation and resource chronology',()=>{
 for(const stream of ['commit','status','deployment']){
  const d=previewMetadata(),record=stream==='commit'?d.commits[0]:stream==='status'?d.statuses['7834868950'][0]:d.deployments[0];
  record.created_at='2026-11-17T00:00:00Z';assert.throws(()=>resolveMetadata(d),/PREVIEW_TIMESTAMP/);
 }
 const d=previewMetadata();d.statuses['7834868950'][0].created_at='2026-11-16T19:59:56Z';
 assert.throws(()=>resolveMetadata(d),/PREVIEW_TIMESTAMP/);
});
test('ordinary Preview resolver rejects wrong SHA deployment ID and provenance',()=>{
 for(const change of [d=>d.deployments[0].sha='f'.repeat(40),d=>d.target.deployment_id='dpl_UnauthorizedPreview001',
  d=>d.commits[0].creator={login:'attacker',id:1},d=>d.deployments[0].creator={login:'attacker',id:1},
  d=>d.statuses['7834868950'][0].creator={login:'attacker',id:1}]){
  const d=previewMetadata();change(d);assert.throws(()=>resolveMetadata(d),/VERCEL_ID_BINDING|PREVIEW_METADATA_AMBIGUOUS/);
 }
});
test('ordinary Preview resolver rejects foreign origins URLs and non-Preview environments',()=>{
 for(const change of [d=>d.statuses['7834868950'][0].environment_url='https://attacker.example',
  d=>d.statuses['7834868950'][0].target_url='https://other.vercel.app',d=>d.statuses['7834868950'][0].log_url='https://other.vercel.app',
  d=>d.statuses['7834868950'][0].deployment_url+='9',d=>d.deployments[0].production_environment=true,
  d=>d.deployments[0].environment='Production',d=>d.statuses['7834868950'][0].environment='Production']){
  const d=previewMetadata();change(d);assert.throws(()=>resolveMetadata(d));
 }
});
test('ordinary Preview resolver never revives an earlier successful commit status',()=>{
 for(const state of ['pending','failure','error']){
  const d=previewMetadata();d.commits.push({...d.commits[0],id:d.commits[0].id+1,state});
  assert.throws(()=>resolveMetadata(d),/VERCEL_ID_BINDING/);
 }
 const d=previewMetadata();d.commits.push({...d.commits[0],id:d.commits[0].id+1,target_url:core.P.vercel_details_base_url+'OtherDeployment'});
 assert.throws(()=>resolveMetadata(d),/VERCEL_ID_BINDING/);
});
test('ordinary Preview resolver never revives an earlier successful deployment status',()=>{
 for(const state of ['inactive','failure','pending','error']){
  const d=previewMetadata(),s=d.statuses['7834868950'];s.push({...s[0],id:s[0].id+1,state});
  assert.throws(()=>resolveMetadata(d),/PREVIEW_METADATA_AMBIGUOUS/);
 }
});
test('ordinary Preview resolver rejects ambiguous and incomplete metadata',()=>{
 const d=previewMetadata(),next={...d.deployments[0],id:7834868951};d.deployments.push(next);
 d.statuses[String(next.id)]=[{...d.statuses['7834868950'][0],deployment_url:'https://api.github.com/repos/'+core.P.repository+'/deployments/'+next.id}];
 assert.throws(()=>resolveMetadata(d),/PREVIEW_METADATA_AMBIGUOUS/);
 const missing=previewMetadata();delete missing.statuses['7834868950'];assert.throws(()=>resolveMetadata(missing),/DEPLOYMENT_STATUS_INCOMPLETE/);
 const duplicate=previewMetadata();duplicate.commits.push({...duplicate.commits[0]});assert.throws(()=>resolveMetadata(duplicate),/DEPLOYMENT_METADATA_INCOMPLETE/);
});
test('workflow retains all ordinary jobs and isolates privileges for independent QA',async()=>{
 const old=execFileSync('git',['show','ae09a44ffce5860f511c08061f9621934eadbe08:'+core.P.workflow_path],{cwd:candidate,encoding:'utf8'});
 const current=await fs.readFile(path.join(candidate,core.P.workflow_path),'utf8');
 const jobs=text=>text.slice(text.indexOf('\njobs:\n'));
 assert.equal(normalizePins(jobs(current).split('\n  transition-prepare:')[0]).trimEnd(),normalizePins(jobs(old)).trimEnd());
 assert.equal(current.slice(current.indexOf('\npermissions:'),current.indexOf('\njobs:')),old.slice(old.indexOf('\npermissions:'),old.indexOf('\njobs:')));
 assert.equal((current.slice(0,current.indexOf('\npermissions:')).match(/^      [a-z_]+:$/gm)||[]).length,10);
 const block=name=>current.split('\n  '+name+':')[1].split(/\n  [a-z-]+:/)[0];
 assert.match(block('transition-qa'),/permissions:\n      contents: read\n      checks: write/);
 assert.doesNotMatch(block('transition-qa'),/id-token:|configure-aws/);
 for(const name of ['transition-prepare','transition-certify']){
  assert.match(block(name),/permissions:\n      contents: read\n      id-token: write/);assert.doesNotMatch(block(name),/checks: write/);
 }
 assert.match(block('seal-transition-qa'),/permissions: \{\}/);
 assert.match(block('transition-prepare'),/github.event_name == 'workflow_dispatch'/);
 assert.match(block('transition-qa'),/needs: transition-prepare/);
 assert.match(block('transition-certify'),/needs: \[transition-prepare, transition-qa, seal-transition-qa\]/);
 const extra=current.slice(current.indexOf('\n  transition-prepare:'));
 assert.doesNotMatch(extra,/vercel (?:deploy|promote|rollback)|cloudformation|iam:(?:Create|Update|Put|Attach|Delete|PassRole)|lambda:Update|--force/);
 assert.equal((extra.match(/role-to-assume:/g)||[]).length,2);
 assert.equal((extra.match(/arn:aws:iam::732159826922:role\/LuiguiHerreraStatisticalLevelsReleaseInvoker/g)||[]).length,2);
});
test('ADOPT PROMOTE and probe selection preserve original behavior with empty new default',()=>{
 const inputs=legacy.ordinary.map(x=>x.input);
 for(const {input:i,expected} of legacy.ordinary)assert.deepEqual(core.selectTarget(normalizeReleaseInputs({...i,transition_request:''})),expected);
 assert.throws(()=>normalizeReleaseInputs({...inputs[0],transition_request:'{}'}));
 const probe={operation:'PROBE_IDENTITY',probe_git_sha:'a'.repeat(40),probe_deployment_id:'dpl_OfflineProbeFixture001'};
 assert.deepEqual(selectProbeTarget({...probe,transition_request:''}),legacy.probe.expected);
 assert.throws(()=>selectProbeTarget({...probe,transition_request:'{}'}));
});
test('dispatch accepts only four bounded selectors and no target or authority inputs',()=>{
 const base={operation:core.TRANSITION,transition_request:JSON.stringify(input.selection)};
 assert.deepEqual(core.selectTransition(base),input.selection);
 for(const key of ['authority_run_id','candidate_git_sha','candidate_deployment_id','qa_attestation','post_rollback_authorization'])assert.throws(()=>core.selectTransition({...base,transition_request:JSON.stringify({...input.selection,[key]:'injected'})}));
 for(const key of ['candidate_git_sha','candidate_deployment_id','resume_production_deployment_id','probe_git_sha'])assert.throws(()=>core.selectTransition({...base,[key]:'injected'}));
 for(const phase of ['promote','abort','unlock','delete','adopt'])assert.throws(()=>core.selectTransition({...base,transition_request:JSON.stringify({...input.selection,phase})}));
});
test('server context and successful completed jobs build the exact controller request',()=>{
 assert.deepEqual(request(),fixture.certification_request);
 assert.equal(context().target.candidate_git_sha,input.proof.response.qa_context.authorization.source.sha);
 assert.equal(context().target.authority_run_id,core.P.baseline.authority_run_id);
});
test('wrong context, identity, intent and stale native response fail closed',()=>{
 for(const field of ['target','intent','grant','execution','native','responseHash']){
  const proof=clone(input.proof);
  if(field==='target')proof.response.qa_context.target.deployment_id='dpl_OfflineUnauthorized001';
  if(field==='intent')proof.response.qa_context.intent.previous_head_sha256='0'.repeat(64);
  if(field==='grant')proof.response.qa_context.authorization.source.sha='0'.repeat(40);
  if(field==='execution')proof.execution.execution_sha='0'.repeat(40);
  if(field==='native')proof.native.request_id='not-native';
  if(field!=='responseHash')proof.response_sha256=core.sha(core.canonical(proof.response));else proof.response_sha256='0'.repeat(64);
  assert.throws(()=>core.validateTransitionContext(proof,input.selection,input.run,input.workflow_hash,now),field);
 }
 assert.throws(()=>core.validateTransitionContext(input.proof,input.selection,input.run,input.workflow_hash,now+901000));
 assert.throws(()=>core.validateTransitionContext(input.proof,{...input.selection,direction:'rollback'},input.run,input.workflow_hash,now));
});
test('forged absent old or wrong-direction QA cannot become certification',()=>{
 for(const kind of ['app','summary','payload','direction','external','head','conclusion','old']){
  const check=clone(produced.check),envelope=clone(produced.envelope);
  if(kind==='app')check.app.slug='forged';
  if(kind==='summary')delete check.output.summary;
  if(kind==='payload')check.output.text='{}';
  if(kind==='direction'){const b=JSON.parse(check.output.summary);b.direction='rollback';check.output.summary=core.canonical(b).toString();}
  if(kind==='external')check.external_id='9999';
  if(kind==='head')check.head_sha='0'.repeat(40);
  if(kind==='conclusion')check.conclusion='failure';
  if(kind==='old')envelope.timestamp='2026-11-07T15:00:00Z';
  assert.throws(()=>request(check,fixture.server_jobs,envelope),kind);
 }
 assert.throws(()=>request(undefined,undefined,{}));
});
test('seal must be complete unique successful current and ordered after QA',()=>{
 for(const kind of ['count','missing','duplicate','skipped','digest','run','attempt','sha','order']){
  const data=clone(fixture.server_jobs),jobs=data.jobs;
  if(kind==='count')data.total_count++;
  if(kind==='missing'){jobs.pop();data.total_count--;}
  if(kind==='duplicate'){jobs.push(clone(jobs[1]));data.total_count++;}
  if(kind==='skipped')jobs[1].conclusion='skipped';
  if(kind==='digest')jobs[2].name=jobs[2].name.slice(0,-64)+'0'.repeat(64);
  if(kind==='run')jobs[2].run_id=9999;
  if(kind==='attempt')jobs[2].run_attempt=2;
  if(kind==='sha')jobs[2].head_sha='0'.repeat(40);
  if(kind==='order')jobs[2].started_at=jobs[1].started_at;
  assert.throws(()=>request(produced.check,data),kind);
 }
});
async function modeledQA(report,preexisting=false){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sl-workflow-qa-model-'));
 let qaCalls=0,writes=0,tick=0;
 try{
  if(preexisting)await fs.mkdir(path.join(temp,'statistical-levels-transition-qa'));
  const env={RUNNER_TEMP:temp,GITHUB_OUTPUT:path.join(temp,'outputs'),SL_TRANSITION_CONTEXT:JSON.stringify(input.proof)};
  await runTransitionMode('transition-qa',env,{
   assertWorkflow:async()=>({selection:input.selection,run:input.run,workflow_sha256:input.workflow_hash}),clock:()=>new Date(input.clock_ms+1000*tick++).toISOString(),
   github:async p=>p.includes('/jobs?')?input.jobs:input.comparison,
   runQA:async()=>{qaCalls++;return report;},githubWrite:async(_,body)=>{writes++;return serviceCheck(body,13001);}
  });
  return {qaCalls,writes};
 }catch(error){error.modelCounts={qaCalls,writes};throw error;}
 finally{await fs.rm(temp,{recursive:true,force:true});}
}
test('a fresh QA executes once and publishes a Check only after all product gates',async()=>{
 assert.deepEqual(await modeledQA(produced.envelope.product_report),{qaCalls:1,writes:1});
 const bad=clone(produced.envelope.product_report);bad.gates.NULL_STATES='FAIL';
 await assert.rejects(()=>modeledQA(bad),e=>e.message==='PRODUCT_GATE_FAILURE'&&e.modelCounts.qaCalls===1&&e.modelCounts.writes===0);
});
test('prior QA directory cannot be reused or cause another Check',async()=>{
 await assert.rejects(()=>modeledQA(produced.envelope.product_report,true),e=>e.code==='EEXIST'&&e.modelCounts.qaCalls===0&&e.modelCounts.writes===0);
});
test('timestamps require valid UTC calendar values',()=>{
 for(const value of ['2026-02-30T15:00:00Z','2026-11-17T25:00:00Z','2026-11-17T15:00:00+01:00','yesterday'])assert.throws(()=>core.transitionUTC(value));
});
async function invokeModel(phase,{badRequest=false,mode='success'}={}){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sl-invoker-model-'));
 try{
  const bin=path.join(temp,'bin');await fs.mkdir(bin);
  const req=phase==='prepare'?core.transitionPrepareRequest(input.selection):fixture.certification_request;
  await fs.writeFile(path.join(temp,'statistical-levels-release-request.json'),JSON.stringify(badRequest?{...req,authority_run_id:'injected'}:req));
  const response=phase==='prepare'?input.proof.response:fixture.controller_result;
  await fs.writeFile(path.join(temp,'response-model.json'),JSON.stringify(response));
  const program=path.join(temp,'fake-aws.mjs');
  await fs.writeFile(program,`import fs from 'node:fs';import path from 'node:path';const dir=process.env.MODEL_DIR;const args=process.argv.slice(2);fs.appendFileSync(path.join(dir,'calls.jsonl'),JSON.stringify(args)+'\\n');if(process.env.MODEL_MODE==='transport-failure')process.exit(1);fs.copyFileSync(path.join(dir,'response-model.json'),args.at(-1));const id='00000000-0000-0000-0000-000000000001';const log='START RequestId: '+id+' Version: $LATEST\\nEND RequestId: '+id+'\\nREPORT RequestId: '+id+'\\tDuration: 1 ms\\tBilled Duration: 1 ms\\n';process.stdout.write(JSON.stringify({StatusCode:200,ExecutedVersion:'$LATEST',...(process.env.MODEL_MODE==='missing-native'?{}:{LogResult:Buffer.from(log).toString('base64')})}));`);
  await fs.writeFile(path.join(bin,'aws'),'#!/bin/sh\nexec '+JSON.stringify(process.execPath)+' '+JSON.stringify(program)+' "$@"\n',{mode:0o700});
  const result=spawnSync(process.execPath,[path.join(candidate,'scripts/statistical-levels-release/scripts/invoke.mjs')],{cwd:candidate,encoding:'utf8',env:{PATH:bin,HOME:temp,RUNNER_TEMP:temp,GITHUB_OUTPUT:path.join(temp,'outputs'),GITHUB_RUN_ID:input.run.id,GITHUB_RUN_ATTEMPT:input.run.attempt,GITHUB_SHA:input.run.execution_sha,AWS_REGION:'eu-south-2',AWS_SESSION_TOKEN:'LOCAL_MODEL_NOT_A_CREDENTIAL',AWS_EC2_METADATA_DISABLED:'true',SL_RELEASE_STAGE:'transition-'+phase,MODEL_DIR:temp,MODEL_MODE:mode}});
  let calls=[];try{calls=(await fs.readFile(path.join(temp,'calls.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);}catch{}
  let proof=null;try{proof=JSON.parse(await fs.readFile(path.join(temp,'statistical-levels-transition-invocation.json'),'utf8'));}catch{}
  let legacy=false;try{await fs.access(path.join(temp,'statistical-levels-g5-invocation-receipt.json'));legacy=true;}catch{}
  return {status:result.status,stderr:result.stderr,calls,proof,legacy};
 }finally{await fs.rm(temp,{recursive:true,force:true});}
}
test('real invoker path prepares and certifies once using the same dedicated Lambda',async()=>{
 for(const phase of ['prepare','certify']){
  const result=await invokeModel(phase);assert.equal(result.status,0,result.stderr);assert.equal(result.calls.length,1);assert.equal(result.legacy,false);
  const args=result.calls[0];assert.equal(args[args.indexOf('--function-name')+1],core.P.lambda_arn);assert.equal(args[args.indexOf('--invocation-type')+1],'RequestResponse');assert.equal(args[args.indexOf('--log-type')+1],'Tail');
  assert.equal(result.proof.schema,'sl.transition-invocation-evidence.v1');assert.equal(result.proof.native.status_code,200);assert.equal(result.proof.response.provider_fetch,false);
 }
});
test('bad caller fields fail before invocation; missing native proof or ambiguous transport never retries',async()=>{
 const bad=await invokeModel('prepare',{badRequest:true});assert.equal(bad.status,1);assert.equal(bad.calls.length,0);assert.equal(bad.proof,null);
 for(const mode of ['missing-native','transport-failure']){const r=await invokeModel('prepare',{mode});assert.equal(r.status,1);assert.equal(r.calls.length,1);assert.equal(r.proof,null);assert.equal(r.legacy,false);}
});
test('test models never contact a remote service',()=>assert.equal(remoteAttempts,0));
