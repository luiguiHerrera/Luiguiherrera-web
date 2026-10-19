import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ADOPT, P, canonical, sha } from '../scripts/release-core.mjs';
import { adoptInvocationReceipt, nativeInvocationIdentity } from '../scripts/adopt-invocation-receipt.mjs';
const id='30c5fac0-20c7-4d3f-a779-172612e4f58c',other='40c5fac0-20c7-4d3f-a779-172612e4f58c';
const text=(requestId=id)=>`START RequestId: ${requestId} Version: $LATEST\nsecret must never persist\nEND RequestId: ${requestId}\nREPORT RequestId: ${requestId}\tDuration: 10.00 ms\tBilled Duration: 10 ms\tMemory Size: 1024 MB\tMax Memory Used: 100 MB\n`;
const metadata=(log=text())=>({StatusCode:200,ExecutedVersion:'$LATEST',LogResult:Buffer.from(log).toString('base64')});
function fixture(){
 const q={candidate_git_sha:P.baseline.production_git_sha,deployment_id:P.baseline.production_deployment_id,authority_run_id:P.baseline.authority_run_id,
 sealed_manifest_sha256:P.baseline.sealed_manifest_sha256,project_id:P.project,test_version:P.test_version,phase:'production',result:'PASS',snapshot_count:81,
 provenance_coverage:100,capability_ids:P.capabilities,timestamp:'2026-10-19T01:00:00.000Z',defects:Object.fromEntries(Array.from({length:6},(_,i)=>['SL_DEF_00'+(i+1),'PASS'])),
 interactions:'PASS',expected_values:'PASS',routes:['/niveles-estadisticos','/en/statistical-levels'],viewports:[[1440,900],[390,844]],application_console_errors:0,
 hydration_errors:0,required_application_request_failures:0,broken_assets:0,overflow:0,raw_platform_events:[],raw_rsc_events:[],unclassified_failures:[],
 origin:P.production_origin,public_authority_run_id:P.baseline.authority_run_id};
 const request={operation:ADOPT,candidate_git_sha:q.candidate_git_sha,candidate_deployment_id:q.deployment_id,authority_run_id:q.authority_run_id,sealed_manifest_sha256:q.sealed_manifest_sha256,
 qa_attestation_id:'1234',qa_attestation_hash:sha(canonical(q)),workflow_run_id:'123456789',workflow_execution_sha:'a'.repeat(40),qa_attestation:canonical(q).toString()};
 return {request,response:{state:'BASELINE_ADOPTED',marker_sha256:'b'.repeat(64),vercel_write:false,provider_fetch:false},metadata:metadata(),
 environment:{GITHUB_REPOSITORY:P.repository,GITHUB_REF:'refs/heads/'+P.branch,GITHUB_RUN_ID:request.workflow_run_id,GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:request.workflow_execution_sha},
 workflowSha256:'c'.repeat(64),startedAt:'2026-10-19T01:00:01.000Z',completedAt:'2026-10-19T01:00:02.000Z'};
}
test('G6 invocation: exact native terminal plus validated ADOPT retains only allowlisted fields',()=>{
 const f=fixture(),r=adoptInvocationReceipt(f);assert.equal(r.execution.request_id,id);assert.equal(r.response.state,'BASELINE_ADOPTED');
 const encoded=JSON.stringify(r);for(const forbidden of ['secret must never persist','LogResult','qa_attestation"','AWS_SESSION_TOKEN','oidc_token'])assert.equal(encoded.includes(forbidden),false);
 assert.deepEqual(Object.keys(r).sort(),['execution','operation','qa','response','schema_version','target']);
 assert.equal(adoptInvocationReceipt({...f,response:{...f.response,state:'ALREADY_ADOPTED'}}).response.state,'ALREADY_ADOPTED');
});
test('G6 invocation: truncated START allowed only with exact END and REPORT',()=>assert.equal(nativeInvocationIdentity(metadata(text().split('\n').slice(1).join('\n'))).request_id,id));
const badLogs={missing_report:`END RequestId: ${id}\n`,missing_end:text().replace(`END RequestId: ${id}\n`,''),
 duplicate_report:text()+text().split('\n').find(x=>x.startsWith('REPORT')),wrong_end:text().replace(`END RequestId: ${id}`,`END RequestId: ${other}`),
 wrong_start:text().replace(`START RequestId: ${id}`,`START RequestId: ${other}`),wrong_version:text().replace('Version: $LATEST','Version: 7'),
 malformed_uuid:text().replaceAll(id,'not-a-uuid'),failed_status:text().replace('Billed Duration:','Status: error\tBilled Duration:'),
 unstructured_fake:`application says REPORT RequestId: ${id}\n`};
for(const [name,log]of Object.entries(badLogs))test('G6 invocation rejects '+name,()=>assert.throws(()=>nativeInvocationIdentity(metadata(log))));
for(const [name,change]of Object.entries({http_failure:m=>m.StatusCode=202,function_error:m=>m.FunctionError='Unhandled',invalid_version:m=>m.ExecutedVersion='alias',missing_logs:m=>delete m.LogResult,invalid_base64:m=>m.LogResult='!!!!',oversized_log:m=>m.LogResult=Buffer.alloc(4097).toString('base64')}))test('G6 invocation rejects '+name,()=>{const m=metadata();change(m);assert.throws(()=>nativeInvocationIdentity(m));});
for(const [name,change]of Object.entries({wrong_run:f=>f.environment.GITHUB_RUN_ID='99',wrong_attempt:f=>f.environment.GITHUB_RUN_ATTEMPT='0',wrong_execution:f=>f.environment.GITHUB_SHA='d'.repeat(40),wrong_repository:f=>f.environment.GITHUB_REPOSITORY='other/repo',wrong_branch:f=>f.environment.GITHUB_REF='refs/heads/main',backwards_time:f=>f.completedAt='2026-10-18T01:00:00.000Z',promotion:f=>f.request.operation='PROMOTE',application_failure:f=>{const q=JSON.parse(f.request.qa_attestation);q.required_application_request_failures=117;f.request.qa_attestation=canonical(q).toString();f.request.qa_attestation_hash=sha(canonical(q));},extra_request_token:f=>f.request.oidc_token='never persist'}))test('G6 invocation rejects '+name,()=>{const f=fixture();change(f);assert.throws(()=>adoptInvocationReceipt(f));});
test('G6 invocation source preserves single invocation, no retry and exclusive sanitized receipt write',()=>{
 const source=fs.readFileSync(new URL('../scripts/invoke.mjs',import.meta.url),'utf8');
 assert.equal((source.match(/execFileSync\('aws'/g)||[]).length,1);assert.match(source,/AWS_MAX_ATTEMPTS: '1'/);assert.match(source,/flag: 'wx'/);
 assert.match(source,/request\.operation === ADOPT \? \['--log-type', 'Tail'\] : \[\]/);assert.doesNotMatch(source,/'sts'|get-caller-identity|JSON\.stringify\(metadata\)/);
});

// Exercise the actual CLI adapter in a credential-free isolated process. The only
// executable named aws is this fixture; every attempted command is recorded.
const SECRET = 'CANARY_TOKEN_DO_NOT_PERSIST_6cb308';
const root = fileURLToPath(new URL('../../../', import.meta.url));
function invocationCase(change = () => {}) {
  const f = fixture(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-invoke-failure-'));
  const spec = { metadata: f.metadata, response: JSON.stringify(f.response), exitCode: 0 };
  const env = { PATH: dir, RUNNER_TEMP: dir, AWS_REGION: 'eu-south-2', AWS_SESSION_TOKEN: SECRET,
    GITHUB_OUTPUT: path.join(dir, 'step-output'),
    ...f.environment, FAKE_AWS_SPEC: path.join(dir, 'fixture.json'), FAKE_AWS_CALLS: path.join(dir, 'calls.jsonl') };
  change({ f, spec, env, dir });
  fs.writeFileSync(path.join(dir, 'statistical-levels-release-request.json'), JSON.stringify(f.request));
  fs.writeFileSync(env.FAKE_AWS_SPEC, JSON.stringify(spec));
  fs.writeFileSync(path.join(dir, 'aws'), `#!${process.execPath}\n` + String.raw`
const fs=require('node:fs');const spec=JSON.parse(fs.readFileSync(process.env.FAKE_AWS_SPEC));
fs.appendFileSync(process.env.FAKE_AWS_CALLS,JSON.stringify({args:process.argv.slice(2),attempts:process.env.AWS_MAX_ATTEMPTS})+'\n');
if(!spec.missingResponse)fs.writeFileSync(process.argv.at(-1),spec.response);
process.stdout.write(spec.metadataText===undefined?JSON.stringify(spec.metadata):spec.metadataText);
process.stderr.write(spec.stderr||'');process.exitCode=spec.exitCode;
`, { mode: 0o700 });
  const result = spawnSync(process.execPath, ['scripts/statistical-levels-release/scripts/invoke.mjs'], {
    cwd: root, env, encoding: 'utf8', timeout: 15000,
  });
  const get = name => { try { return fs.readFileSync(path.join(dir,name),'utf8'); } catch { return null; } };
  const diagText=get('statistical-levels-controller-failure.json'),receiptText=get('statistical-levels-g5-invocation-receipt.json');
  const calls=(get('calls.jsonl')||'').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));
  const stepOutput=get('step-output')||'',eligible=stepOutput==='controller_failure_diagnostic_ready=true\n';
  const diagnostic=eligible&&diagText?JSON.parse(diagText):null,receipt=receiptText&&JSON.parse(receiptText);
  const mode=diagText?(fs.statSync(path.join(dir,'statistical-levels-controller-failure.json')).mode&0o777):null;
  // Only generated scratch fixture files are removed, never source/evidence.
  fs.rmSync(dir,{recursive:true,force:true});
  assert.equal(result.signal,null);assert.ok(calls.length<=1);
  if(calls.length){assert.equal(calls[0].attempts,'1');assert.deepEqual(calls[0].args.slice(0,4),['lambda','invoke','--function-name',P.lambda_arn]);
    assert.ok(calls[0].args.includes('RequestResponse'));assert.ok(calls[0].args.includes('Tail'));}
  for(const output of [result.stdout,result.stderr,stepOutput,eligible?(diagText||''):'',receiptText||'']){
    assert.equal(output.includes(SECRET),false);assert.equal(output.includes('secret must never persist'),false);
    assert.equal(output.includes('LogResult'),false);assert.equal(output.includes('AWS_SESSION_TOKEN'),false);
  }
  if(eligible){assert.ok(Buffer.byteLength(diagText)<4096);assert.equal(mode,0o600);assert.equal(diagnostic.acceptance,'FAIL');assert.equal(diagnostic.retry_permitted,false);}
  return {result,diagnostic,receipt,calls,spec,stepOutput,eligible,retainedFile:diagText};
}
const failureCases = {
  transport: { mutate:({spec})=>{spec.exitCode=1;spec.stderr=SECRET;}, stage:'AWS_TRANSPORT' },
  invalid_metadata: { mutate:({spec})=>spec.metadataText=SECRET, stage:'AWS_METADATA_PARSE' },
  null_metadata: { mutate:({spec})=>spec.metadata=null, stage:'AWS_INVOCATION_STATUS' },
  invocation_status: { mutate:({spec})=>spec.metadata.StatusCode=202, stage:'AWS_INVOCATION_STATUS' },
  function_error: { mutate:({spec})=>spec.metadata.FunctionError='Unhandled', stage:'AWS_INVOCATION_STATUS' },
  untrusted_function_error: { mutate:({spec})=>spec.metadata.FunctionError=SECRET, stage:'AWS_INVOCATION_STATUS' },
  missing_response: { mutate:({spec})=>spec.missingResponse=true, stage:'RESPONSE_READ' },
  invalid_response: { mutate:({spec})=>spec.response=SECRET, stage:'RESPONSE_PARSE' },
  null_response: { mutate:({spec})=>spec.response='null', stage:'CONTROLLER_RESULT' },
  denied: { mutate:({spec})=>spec.response=JSON.stringify({state:'DENIED',code:'QA_RUN_MISMATCH',provider_fetch:false}), stage:'CONTROLLER_RESULT' },
  unknown_denial: { mutate:({spec})=>spec.response=JSON.stringify({state:'DENIED',code:SECRET,provider_fetch:false}), stage:'CONTROLLER_RESULT' },
  malformed_denial: { mutate:({spec})=>spec.response=JSON.stringify({state:'DENIED',code:'QA_RUN_MISMATCH',provider_fetch:false,secret:SECRET}), stage:'CONTROLLER_RESULT' },
  untrusted_state: { mutate:({spec})=>spec.response=JSON.stringify({state:SECRET,provider_fetch:false}), stage:'CONTROLLER_RESULT' },
  concurrent_main: { mutate:({spec})=>spec.response=JSON.stringify({state:'BLOCKED_CONCURRENT_MAIN_ACTIVITY',provider_fetch:false}), stage:'CONTROLLER_RESULT' },
  provider_fetch: { mutate:({f,spec})=>spec.response=JSON.stringify({...f.response,provider_fetch:true}), stage:'CONTROLLER_RESULT' },
  extra_success_field: { mutate:({f,spec})=>spec.response=JSON.stringify({...f.response,secret:SECRET}), stage:'CONTROLLER_RESULT' },
  receipt_binding: { mutate:({env})=>env.GITHUB_RUN_ID='99', stage:'INVOCATION_RECEIPT' },
  receipt_persistence: { mutate:({dir})=>fs.mkdirSync(path.join(dir,'statistical-levels-g5-invocation-receipt.json')), stage:'RECEIPT_PERSISTENCE' },
  missing_native: { mutate:({spec})=>delete spec.metadata.LogResult, stage:'INVOCATION_RECEIPT' },
  native_version: { mutate:({spec})=>spec.metadata.ExecutedVersion=SECRET, stage:'INVOCATION_RECEIPT' },
  empty_function_error: { mutate:({spec})=>spec.metadata.FunctionError='', stage:'INVOCATION_RECEIPT' },
};
for(const [name,c] of Object.entries(failureCases))test('G5 failure evidence: '+name,()=>{
 const v=invocationCase(c.mutate);assert.equal(v.result.status,1);assert.equal(v.receipt,null);
 assert.equal(v.calls.length,1);assert.equal(v.diagnostic.stage,c.stage);assert.equal(v.diagnostic.invocation_attempted,true);
 assert.equal(v.diagnostic.execution.function_arn,P.lambda_arn);
 if(name==='denied'){assert.equal(v.diagnostic.controller.code,'QA_RUN_MISMATCH');assert.equal(v.diagnostic.native.request_id,id);}
 if(name==='unknown_denial')assert.equal(v.diagnostic.controller.code,'UNRECOGNIZED');
 if(name==='malformed_denial')assert.equal(v.diagnostic.controller.code,null);
 if(name==='function_error')assert.equal(v.diagnostic.aws.function_error,'Unhandled');
 if(name==='untrusted_function_error')assert.equal(v.diagnostic.aws.function_error,'UNRECOGNIZED');
 if(name==='receipt_binding'){assert.equal(v.diagnostic.code,'RECEIPT_EXECUTION_BINDING');assert.equal(v.diagnostic.native.request_id,id);}
 if(name==='missing_native'){assert.equal(v.diagnostic.code,'INVOCATION_NATIVE_LOG_UNAVAILABLE');assert.equal(v.diagnostic.native.request_id,null);}
});
for(const [name,log] of Object.entries(badLogs))test('G5 failure evidence: native '+name,()=>{
 const v=invocationCase(({spec})=>spec.metadata=metadata(log));assert.equal(v.result.status,1);
 assert.equal(v.receipt,null);assert.equal(v.diagnostic.stage,'INVOCATION_RECEIPT');assert.equal(v.diagnostic.native.request_id,null);
});
for(const state of ['BASELINE_ADOPTED','ALREADY_ADOPTED'])test('G5 failure evidence: success '+state,()=>{
 const v=invocationCase(({f,spec})=>spec.response=JSON.stringify({...f.response,state}));
 assert.equal(v.result.status,0,v.result.stderr);assert.equal(v.diagnostic,null);assert.equal(v.receipt.response.state,state);
 assert.equal(v.receipt.execution.request_id,id);assert.equal(v.calls.length,1);
});
test('G5 failure evidence: invalid request never invokes',()=>{
 const v=invocationCase(({f})=>f.request.extra=SECRET);assert.equal(v.result.status,1);assert.equal(v.calls.length,0);
 assert.equal(v.diagnostic.stage,'REQUEST_VALIDATION');assert.equal(v.diagnostic.invocation_attempted,false);
});
test('G5 failure evidence: capture failure never retries invocation or creates receipt',()=>{
 const v=invocationCase(({spec,dir})=>{spec.exitCode=1;fs.mkdirSync(path.join(dir,'statistical-levels-controller-failure.json'));});
 assert.equal(v.result.status,1);assert.equal(v.calls.length,1);assert.equal(v.receipt,null);assert.equal(v.diagnostic,null);
 assert.ok(v.result.stderr.includes('CONTROLLER_FAILURE_DIAGNOSTIC_UNAVAILABLE_NO_RETRY'));
 assert.equal(v.eligible,false);assert.equal(v.stepOutput,'');
});
test('G5 failure evidence: preexisting file never becomes upload eligible',()=>{
 const v=invocationCase(({spec,dir})=>{spec.exitCode=1;fs.writeFileSync(path.join(dir,'statistical-levels-controller-failure.json'),SECRET);});
 assert.equal(v.result.status,1);assert.equal(v.calls.length,1);assert.equal(v.receipt,null);assert.equal(v.diagnostic,null);
 assert.equal(v.retainedFile,SECRET);assert.equal(v.eligible,false);assert.equal(v.stepOutput,'');
 assert.ok(v.result.stderr.includes('CONTROLLER_FAILURE_DIAGNOSTIC_UNAVAILABLE_NO_RETRY'));
});
test('G5 failure evidence: unavailable output channel cannot authorize upload',()=>{
 const v=invocationCase(({spec,env,dir})=>{spec.exitCode=1;env.GITHUB_OUTPUT=dir;});
 assert.equal(v.result.status,1);assert.equal(v.calls.length,1);assert.equal(v.receipt,null);assert.equal(v.eligible,false);
 assert.equal(JSON.parse(v.retainedFile).acceptance,'FAIL');assert.equal(v.stepOutput,'');
 assert.ok(v.result.stderr.includes('CONTROLLER_FAILURE_DIAGNOSTIC_UNAVAILABLE_NO_RETRY'));
});
test('G5 failure evidence: exact failure-only artifact and no marker mutation',()=>{
 const w=fs.readFileSync(path.join(root,'.github/workflows/statistical-levels-release.yml'),'utf8');
 const block=w.split('      - name: Retain bounded controller failure diagnostics; never a G5 receipt\n')[1].split('      - name:')[0];
 assert.match(block,/if: failure\(\) && steps\.controller\.outcome == 'failure' && steps\.controller\.outputs\.controller_failure_diagnostic_ready == 'true'\n/);
 assert.match(block,/path: \$\{\{ runner\.temp \}\}\/statistical-levels-controller-failure\.json\n/);
 assert.doesNotMatch(block,/\*|response\.json|request\.json|continue-on-error|always\(\)/);
 assert.match(block,/if-no-files-found: error/);assert.match(block,/overwrite: false/);
 const source=fs.readFileSync(path.join(root,'scripts/statistical-levels-release/scripts/invoke.mjs'),'utf8');
 assert.doesNotMatch(source,/PutObject|put-object|marker_create|s3api|console\.(?:log|error)|error\.stack|error\.stderr/);
});
