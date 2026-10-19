import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
