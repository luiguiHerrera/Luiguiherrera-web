// Synthetic protocol evidence only. These tests never invoke AWS or publish.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {P,PROMOTE,ADOPT,selectTarget,validateTarget,attest,canonical,productGates,requestFor,
  certificationRequest,productionTarget,promotionStage,controllerOutcome,publicationReceipt,
  validateDailyCI,publicProductionGet,publishedCheck} from '../scripts/release-core.mjs';
import {dispatchCertifiedDaily,githubWrite} from '../scripts/runtime-io.mjs';
const clone=x=>structuredClone(x);
const run={id:'5002',attempt:'1',execution_sha:'c'.repeat(40)}, hash='a'.repeat(64);
function fixture() {
  const target={...selectTarget({operation:PROMOTE,candidate_git_sha:'b'.repeat(40),candidate_deployment_id:'dpl_PreviewFixture123456',
    expected_previous_production_sha:P.baseline.production_git_sha,expected_previous_production_deployment:P.baseline.production_deployment_id,
    previous_publication_date:P.baseline.publication_date_utc}),origin:'https://luiguiherrera-fixture-luigui-herrera-s-projects.vercel.app',
    authority_run_id:'20261114T151440111Z-d8323eec-c4a2-4134-96d4-8fc55beea68e',sealed_manifest_sha256:'d'.repeat(64)};
  const now=Date.now(),iso=ms=>new Date(ms).toISOString();
  const report={result:'PASS',gates:Object.fromEntries(productGates.map(k=>[k,'PASS'])),snapshot_count:81,provenance_coverage:100,
    capability_ids:[...P.capabilities],routes:['/niveles-estadisticos','/en/statistical-levels'],viewports:[[1440,900],[390,844]],
    application_console_errors:0,required_application_request_failures:0,broken_assets:0,hydration_errors:0,overflow:0,
    raw_platform_events:[],raw_rsc_events:[],unclassified_failures:[],expected_values:'PASS'};
  const envelope=attest(report,run,target,hash,iso(now-5000));
  const common={run_id:5002,run_attempt:1,head_sha:run.execution_sha,head_branch:P.branch,workflow_name:P.workflow_name,status:'completed',conclusion:'success'};
  const jobs={total_count:2,jobs:[{...common,id:1,name:P.qa_job_name,started_at:iso(now-10000),completed_at:iso(now-4000)},
    {...common,id:2,name:P.qa_marker_prefix+envelope.controller_payload_sha256,started_at:iso(now-3000),completed_at:iso(now-2000)}]};
  const preview=requestFor(envelope,jobs,run,hash,target);
  const observed={state:'PROMOTED_NOT_CERTIFIED',production_deployment_id:'dpl_ProductionFixture123',ready_at_ms:now-1500,provider_fetch:false};
  const production=attest(report,run,productionTarget(target,target,observed),hash,iso(now-1000));
  const check={id:9001,app:{slug:'github-actions'},name:'statistical-levels-production-qa',head_sha:run.execution_sha,
    external_id:run.id,status:'completed',conclusion:'success',completed_at:iso(now),output:{text:canonical(production.controller_payload).toString()}};
  return {target,preview,production,check,observed,report};
}
test('closure: real QA protocol binds the exact new Production and emits certificate request',()=>{
  const f=fixture();validateTarget(f.target);
  const r=certificationRequest(f.preview,f.production,f.check,run,hash,f.observed);
  assert.equal(r.production_qa_attestation_hash,f.production.controller_payload_sha256);
  assert.equal(r.candidate_deployment_id,f.preview.candidate_deployment_id);
  assert.equal(JSON.parse(r.qa_attestation).phase,'preview');
});
for (const [name,mutate] of [
  ['failed Check',f=>f.check.conclusion='failure'],['foreign App',f=>f.check.app.slug='other'],
  ['foreign run',f=>f.check.external_id='9999'],['foreign execution SHA',f=>f.check.head_sha='9'.repeat(40)],
  ['forged Check bytes',f=>f.check.output.text='{}'],['QA before READY',f=>f.observed.ready_at_ms=Date.now()+1000],
  ['wrong deployment',f=>f.observed.production_deployment_id='dpl_ForeignDeployment123'],
  ['failed product evidence',f=>f.production.product_report.gates.SL_DEF_001='FAIL'],
  ['missing capability',f=>f.production.product_report.capability_ids.pop()],
  ['pending build',f=>f.observed.state='PRODUCTION_BUILD_PENDING'],
]) test('closure rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>certificationRequest(f.preview,f.production,f.check,run,hash,f.observed));});
test('closure: uncertified, ambiguous and failed outcomes never become publication success',()=>{
  for (const state of ['PROMOTED_NOT_CERTIFIED','PRODUCTION_BUILD_PENDING','PROMOTION_OUTCOME_UNKNOWN','PRODUCTION_CERTIFIED_MARKER_UNCONFIRMED','DENIED'])
    assert.equal(controllerOutcome(PROMOTE,{state,production_deployment_id:'dpl_FixtureProduction123',provider_fetch:false}).exitCode,1);
  assert.throws(()=>promotionStage({state:'PROMOTION_OUTCOME_UNKNOWN',provider_fetch:false}));
});
test('closure: PUBLISHED receipt requires the certification request and server marker hash',()=>{
  const f=fixture(),r=certificationRequest(f.preview,f.production,f.check,run,hash,f.observed);
  const response={state:'PUBLISHED',production_deployment_id:f.observed.production_deployment_id,marker_sha256:'e'.repeat(64),provider_fetch:false};
  assert.equal(publicationReceipt(r,response,run,hash).state,'PUBLISHED');
  assert.throws(()=>publicationReceipt(f.preview,response,run,hash));
  assert.throws(()=>publicationReceipt(r,{...response,marker_sha256:''},run,hash));
});
test('closure: public Production QA sends no credential or bypass header',async()=>{
  await publicProductionGet(P.production_origin+'/niveles-estadisticos',async(url,options)=>{
    assert.deepEqual(options.headers,{});assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return {status:200};
  });
  assert.throws(()=>selectTarget({operation:ADOPT,resume_production_deployment_id:'dpl_FixtureProduction123'}));
});
test('closure: disabled daily release refuses before any network request',async()=>{
  let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('UNEXPECTED_NETWORK');};
  try { await assert.rejects(dispatchCertifiedDaily({}),/DAILY_PUBLICATION_DISABLED/);assert.equal(calls,0); }
  finally {globalThis.fetch=old;}
});
test('closure: ambiguous GitHub writes are never retried',async()=>{
  let calls=0;const old=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('TRANSPORT_FAILURE');};
  try {await assert.rejects(githubWrite('/check-runs',{}, {GH_TOKEN:'synthetic-local-only'}));assert.equal(calls,1);}
  finally {globalThis.fetch=old;}
});
test('closure: daily CI excludes no-op and missing required coverage',()=>{
  const repo={full_name:P.repository,id:Number(P.repository_id),owner:{id:Number(P.repository_owner_id)},private:false};
  const ci={repository:repo,head_repository:repo,workflow_id:336203586,path:'.github/workflows/ci.yml',head_sha:run.execution_sha,
    head_branch:P.branch,event:'workflow_run',status:'completed',conclusion:'success'};
  const names=['Bind qualification to event SHA and governed metadata-repair successor lineage','Test bounded CI admission and producer readback',
    'Authenticate fresh native capture handoff','Run existing release, native proof, policy and security tests',
    'Reject missing or skipped mandatory coverage and candidate drift','Revalidate exact branch and emit bounded qualification evidence'];
  const jobs={total_count:1,jobs:[{name:'validate',status:'completed',conclusion:'success',steps:names.map(name=>({name,status:'completed',conclusion:'success'}))}]};
  validateDailyCI(ci,jobs,run.execution_sha);
  for (const mutate of [x=>x.jobs[0].conclusion='skipped',x=>x.jobs[0].steps.pop(),x=>x.jobs[0].steps[0].conclusion='failure']) {
    const bad=clone(jobs);mutate(bad);assert.throws(()=>validateDailyCI(ci,bad,run.execution_sha));
  }
});
test('closure: activation proof requires an actual successful controlled release receipt',()=>{
  const f=fixture(),r=certificationRequest(f.preview,f.production,f.check,run,hash,f.observed);
  const receipt=publicationReceipt(r,{state:'PUBLISHED',production_deployment_id:f.observed.production_deployment_id,marker_sha256:'e'.repeat(64),provider_fetch:false},run,hash);
  const repo={full_name:P.repository,id:Number(P.repository_id),owner:{id:Number(P.repository_owner_id)},private:false};
  const metadata={id:5002,run_attempt:1,head_sha:run.execution_sha,head_branch:P.branch,name:P.workflow_name,path:P.workflow_path,
    event:'workflow_dispatch',repository:repo,head_repository:repo,status:'completed',conclusion:'success'};
  const check={...f.check,name:'statistical-levels-published',output:{text:canonical(receipt).toString()}};
  const jobs={total_count:1,jobs:[{name:'statistical-levels-published-sha256-'+receipt.marker_sha256,run_id:5002,run_attempt:1,head_sha:run.execution_sha,status:'completed',conclusion:'success'}]};
  assert.equal(publishedCheck(check,metadata,hash,jobs).marker_sha256,receipt.marker_sha256);
  assert.throws(()=>publishedCheck(check,{...metadata,conclusion:'failure'},hash,jobs));
  assert.throws(()=>publishedCheck({...check,output:{text:canonical({...receipt,state:'PROMOTED_NOT_CERTIFIED'}).toString()}},metadata,hash,jobs));
});
test('closure: workflow requires terminal publication and keeps daily activation gated',async()=>{
  const yaml=await fs.readFile(new URL('../../../.github/workflows/statistical-levels-release.yml',import.meta.url),'utf8');
  assert.match(yaml,/publication-result:[\s\S]*if: always\(\) && inputs.operation/);
  assert.match(yaml,/\$STATE" == PUBLISHED/);
  assert.match(yaml,/vars.SL_DAILY_PUBLICATION == 'APPROVED_AFTER_FIRST_PUBLISHED'/);
  assert.match(yaml,/vars.SL_FIRST_PUBLISHED_CHECK_ID != ''/);
  assert.doesNotMatch(yaml,/continue-on-error:\s*true/);
});

// The entire daily selector runs against local, synthetic HTTP responses. A
// recorded POST is only a mock; neither a dispatch nor credential leaves here.
for (const scenario of ['valid','failed CI','failed certificate run','stale event','Preview not ready','ref moved'])
test('closure daily selector: '+scenario,async()=>{
  const repoRoot=new URL('../../../',import.meta.url);
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim();
  const workflow=execFileSync('git',['show',head+':'+P.workflow_path],{cwd:repoRoot});
  const frozen=JSON.parse(await fs.readFile(new URL('../workflow-freeze.json',import.meta.url),'utf8'));
  const previous='b'.repeat(40),publicationRun='10002',ciRun='10003',dpl='dpl_DailyPreviewFixture123';
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'sl-daily-selector-test-'));
  const eventPath=path.join(directory,'event.json');
  const event={action:'completed',workflow_run:{id:Number(ciRun),workflow_id:336203586,head_sha:scenario==='stale event'?'f'.repeat(40):head}};
  await fs.writeFile(eventPath,JSON.stringify(event));
  const repo={full_name:P.repository,id:Number(P.repository_id),owner:{id:Number(P.repository_owner_id)},private:false};
  const common={repository:repo,head_repository:repo,head_branch:P.branch,status:'completed',conclusion:'success',run_attempt:1};
  const ci={...common,id:Number(ciRun),head_sha:head,event:'workflow_run',workflow_id:336203586,path:'.github/workflows/ci.yml'};
  if(scenario==='failed CI')ci.conclusion='failure';
  const pub={...common,id:Number(publicationRun),head_sha:previous,event:'workflow_dispatch',path:P.workflow_path,name:P.workflow_name};
  if(scenario==='failed certificate run')pub.conclusion='failure';
  const receipt={schema:'statistical-levels.published-receipt.v1',state:'PUBLISHED',id:publicationRun,attempt:'1',execution_sha:previous,
    workflow_sha256:frozen.workflow_sha256,candidate_git_sha:previous,production_deployment_id:'dpl_PreviousPublished123',
    marker_sha256:'e'.repeat(64),production_qa_attestation_hash:'d'.repeat(64),production_qa_attestation_id:'9000',publication_date:'2026-11-14'};
  const check={id:9001,app:{slug:'github-actions'},name:'statistical-levels-published',status:'completed',conclusion:'success',
    head_sha:previous,external_id:publicationRun,output:{text:canonical(receipt).toString()}};
  const names=['Bind qualification to event SHA and governed metadata-repair successor lineage','Test bounded CI admission and producer readback',
    'Authenticate fresh native capture handoff','Run existing release, native proof, policy and security tests',
    'Reject missing or skipped mandatory coverage and candidate drift','Revalidate exact branch and emit bounded qualification evidence'];
  const actor={login:P.vercel_creator_login,id:P.vercel_creator_id};
  const origin='https://luiguiherrera-fixture-luigui-herrera-s-projects.vercel.app';
  const status={id:44,creator:actor,state:scenario==='Preview not ready'?'pending':'success',context:'Vercel',
    target_url:P.vercel_details_base_url+dpl.slice(4),updated_at:'2026-11-15T10:00:00Z'};
  const responses={
    ['/actions/runs/'+ciRun]:ci,
    ['/actions/runs/'+ciRun+'/attempts/1/jobs?per_page=100']:{total_count:1,jobs:[{name:'validate',status:'completed',conclusion:'success',steps:names.map(name=>({name,status:'completed',conclusion:'success'}))}]},
    '/check-runs/9001':check,['/actions/runs/'+publicationRun]:pub,
    ['/actions/runs/'+publicationRun+'/attempts/1/jobs?per_page=100']:{total_count:1,jobs:[{name:'statistical-levels-published-sha256-'+receipt.marker_sha256,run_id:Number(publicationRun),run_attempt:1,head_sha:previous,status:'completed',conclusion:'success'}]},
    ['/compare/'+previous+'...'+head+'?per_page=1']:{base_commit:{sha:previous},merge_base_commit:{sha:previous},status:'ahead',behind_by:0,ahead_by:1},
    ['/commits/'+head]:{sha:head,parents:[{sha:previous}]},
    ['/commits/'+previous+'/check-runs?check_name=statistical-levels-published&per_page=100']:{total_count:1,check_runs:[check]},
    ['/commits/'+head+'/statuses?per_page=100']:[status],
    ['/deployments?sha='+head+'&per_page=100']:[{id:321,creator:actor,sha:head,environment:'Preview',production_environment:false}],
    '/deployments/321/statuses?per_page=100':[{id:55,creator:actor,state:'success',environment:'Preview',updated_at:status.updated_at,
      deployment_url:'https://api.github.com/repos/'+P.repository+'/deployments/321',environment_url:origin,target_url:origin,log_url:origin}],
    ['/git/ref/heads/'+P.branch]:{object:{sha:scenario==='ref moved'?'f'.repeat(40):head}}
  };
  const posts=[],old=globalThis.fetch;
  globalThis.fetch=async(url,options={})=>{
    if(String(url).startsWith('https://raw.githubusercontent.com/'))return {ok:true,arrayBuffer:async()=>workflow};
    const suffix=String(url).split('https://api.github.com/repos/'+P.repository)[1];
    if(options.method==='POST') {posts.push({suffix,body:JSON.parse(options.body.toString())});return {status:204};}
    assert.ok(Object.hasOwn(responses,suffix),'unexpected local route '+suffix);
    return {ok:true,text:async()=>JSON.stringify(responses[suffix])};
  };
  try {
    const env={SL_DAILY_PUBLICATION:'APPROVED_AFTER_FIRST_PUBLISHED',SL_FIRST_PUBLISHED_CHECK_ID:'9001',GITHUB_EVENT_NAME:'workflow_run',
      GITHUB_REF:'refs/heads/'+P.branch,GITHUB_REPOSITORY:P.repository,GITHUB_SHA:head,GITHUB_EVENT_PATH:eventPath,GH_TOKEN:'local-model-token'};
    if(scenario==='valid') {
      await dispatchCertifiedDaily(env);assert.equal(posts.length,1);assert.equal(posts[0].suffix,'/actions/workflows/353998515/dispatches');
      assert.equal(posts[0].body.inputs.candidate_git_sha,head);assert.equal(posts[0].body.inputs.candidate_deployment_id,dpl);
      assert.equal(posts[0].body.inputs.expected_previous_production_sha,previous);
    } else {await assert.rejects(dispatchCertifiedDaily(env));assert.equal(posts.length,0);}
  } finally {globalThis.fetch=old;await fs.rm(directory,{recursive:true,force:true});}
});
