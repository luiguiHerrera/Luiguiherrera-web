import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createAdoptRequestEvidence, auditAdoptRequestEvidence, auditOuterJournalOwnership } from '../scripts/adopt-request-evidence.mjs';
import { transitions } from '../scripts/probe-transition-receipts.mjs';
import { listenerMarker,scriptFingerprint } from '../scripts/adopt-causal-bridge.mjs';
import { sha, canonical } from '../scripts/release-core.mjs';
import { account } from '../scripts/network-accounting.mjs';
const origin='https://www.luiguiherrera.com';
const request=(id='r',headers={RSC:'1','Next-Router-Prefetch':'0'},kind='T1')=>({requestId:id,frameId:'private-frame',loaderId:'private-loader',documentURL:origin+'/niveles-estadisticos',timestamp:1,type:'Fetch',
  initiator:{type:'script',stack:{callFrames:[{scriptId:'marker',url:origin+'/code.js?token=secret-canary',lineNumber:1,columnNumber:2}]}},
  request:{method:'GET',url:origin+'/niveles-estadisticos?'+new URLSearchParams(transitions[kind].target_state),headers}});
function fixture({transition=false,prefetch=false,pending=false,failed=false,bridge=true,ownershipWitness=false}={}) {
  const c=createAdoptRequestEvidence(origin),events=[];
  c.listenerStart('page-1');c.pageLifecycle('page-1','ACTIVE');
  if(transition){c.observability.context(transitions.T1);c.start('page-1','T1');}
  let a;if(transition&&bridge){a=c.action('page-1','CLICK','[data-window="3Y"]');c.registerAction({...a,script_sha256:scriptFingerprint('page-1','marker'),source_sha256:sha(listenerMarker),source_url_sha256:sha('https://sl-qa.invalid/action/'+a.action_instance_id)});c.beginAction(a.action_instance_id);}
  const e=request('r',prefetch?{RSC:'1','Next-Router-Prefetch':'1'}:{RSC:'1','Next-Router-Prefetch':'0'});
  if(ownershipWitness){
    for(const scriptId of ['marker','caller'])c.scriptParsed('page-1',{scriptId,hash:sha(scriptId),length:10,startLine:0,startColumn:0,isLiveEdit:false,executionContextAuxData:{isDefault:true}},events);
    e.initiator.stack.callFrames=[...Array.from({length:4},()=>({...e.initiator.stack.callFrames[0]})),{...e.initiator.stack.callFrames[0],scriptId:'caller'}];
  }
  const binding=c.request('page-1',e);
  c.response('page-1',{requestId:'r',response:{status:200},timestamp:2});
  if(failed) {
    c.failure('page-1',{requestId:'r',timestamp:3,canceled:true,errorText:'net::ERR_ABORTED'},events.length);
    events.push({request_evidence:binding,kind:'request_failure',url:e.request.url,type:e.type,rsc:true,prefetch,canceled:true,error_code:'net::ERR_ABORTED'});
  } else if(!pending)c.finished('page-1',{requestId:'r',timestamp:3});
  if(a)c.completeAction(a.action_instance_id,{dispatch_ack:true,event_seen:true,listener_calls:1});
  if(transition)c.complete('page-1','T1',true);
  c.pageLifecycle('page-1','CLOSING');c.listenerDrain('page-1');c.sourceClosed('page-1');c.pageLifecycle('page-1','CLOSED');c.freeze();
  const receipts=c.receipts(events),result=account(events,false,origin,c.admittedReceipts(receipts)),evidence=c.evidence(events,result,receipts);
  return {c,events,result,evidence,audit:()=>auditAdoptRequestEvidence(evidence,events,result,origin,transition?['T1']:[])};
}

test('completed request retains one identity, lifecycle and no invented transition or cause',()=>{
  const f=fixture();assert.deepEqual(f.audit(),{status:'PASS',issues:[]});
  const r=f.evidence.requests[0];assert.equal(r.terminal_state,'FINISHED');assert.equal(r.transition_id,'UNKNOWN');assert.equal(r.causal_parent,'script:'+scriptFingerprint('page-1','marker'));
  assert.ok(!JSON.stringify(f.evidence).includes('secret-canary'));assert.ok(!JSON.stringify(f.evidence).includes('private-loader'));
});
test('successful T1 with no abort is represented once without inventing an abort receipt',()=>{
  const f=fixture({transition:true});assert.equal(f.audit().status,'PASS');assert.equal(f.evidence.transition_accounting.length,1);
  assert.equal(f.evidence.transition_receipts.records.length,0);assert.equal(f.evidence.transition_accounting[0].state,'COMPLETED');
});
test('Step22 gap: strict T1 receipt is bound and accounted, but association cannot prove causal parent',()=>{
  const f=fixture({transition:true,failed:true,bridge:false});assert.equal(f.evidence.transition_receipts.records.length,1);
  assert.equal(f.result.ledger[0].classification,'required_application_request_failure');
  assert.equal(f.audit().status,'FAIL');assert.ok(f.audit().issues.includes('MISSING_CAUSAL_PARENT'));
  assert.equal(account(f.events,true,origin).required_application_request_failures,1);
});
test('prefetch abort never receives a transition receipt or failure exemption',()=>{
  const f=fixture({transition:true,prefetch:true,failed:true});assert.equal(f.result.required_application_request_failures,1);
  assert.equal(f.evidence.transition_receipts.records.length,0);assert.equal(f.evidence.requests[0].causality_status,'UNKNOWN');
});
test('pending remains non-terminal at close and blocks evidence approval',()=>{
  const f=fixture({pending:true});f.c.pageLifecycle('page-1','CLOSING');
  assert.equal(f.evidence.requests[0].terminal_state,'PENDING');assert.ok(f.audit().issues.includes('UNRESOLVED_PENDING_REQUEST'));
});
const mutations={
 'unmapped request':f=>f.evidence.requests.pop(),
 'unmapped transition':f=>f.evidence.transitions.pop(),
 'duplicate transition':f=>f.evidence.transitions.push(structuredClone(f.evidence.transitions[0])),
 'omitted transition accounting':f=>f.evidence.transition_accounting.pop(),
 'double counted transition':f=>f.evidence.transition_accounting.push(structuredClone(f.evidence.transition_accounting[0])),
 'request transition mismatch':f=>f.evidence.requests[0].transition_id='transition-42',
 'terminal mismatch':f=>f.evidence.requests[0].terminal_state='FAILED',
 'RSC contradiction':f=>f.evidence.requests[0].rsc=false,
 'prefetch contradiction':f=>f.evidence.requests[0].prefetch=true,
 'unknown is not false':f=>f.evidence.requests[0].prefetch='UNKNOWN',
 'unsupported causal claim':f=>f.evidence.requests[0].causality_status='FORGED',
 'missing required causal parent':f=>f.evidence.requests[0].causal_relation='CDP_INITIATOR_REQUEST',
 'missing lifecycle event':f=>f.evidence.journal.splice(3,1),
 'duplicate event':f=>f.evidence.journal.push(structuredClone(f.evidence.journal[0])),
 'completion omitted':f=>f.evidence.transitions[0].completion=null,
 'aggregate tampering':f=>f.result.required_application_request_failures=123,
 'request metadata mismatch':f=>f.evidence.requests[0].metadata.method='POST',
 'fake request parent':f=>{f.evidence.requests[0].causal_parent='does-not-exist';f.evidence.requests[0].causal_relation='CDP_INITIATOR_REQUEST';},
};
for(const [name,mutate]of Object.entries(mutations))test('fail closed: '+name,()=>{const f=fixture({transition:true});assert.equal(f.audit().status,'PASS');mutate(f);assert.equal(f.audit().status,'FAIL');});
for(const [name,mutate]of Object.entries({
 'duplicate receipt':f=>f.evidence.transition_receipts.records.push(structuredClone(f.evidence.transition_receipts.records[0])),
 'receipt absent from accounting':f=>f.evidence.transition_accounting[0].receipt_ids=[],
 'ledger classification mismatch':f=>f.result.ledger[0].classification='platform_non_application',
 'response mismatch':f=>f.evidence.journal.find(e=>e.kind==='RESPONSE').status=500,
 'missing ledger row':f=>f.result.ledger.pop(),
}))test('receipt parity: '+name,()=>{const f=fixture({transition:true,failed:true});mutate(f);assert.ok(f.audit().issues.some(x=>x!=='MISSING_CAUSAL_PARENT'));});

test('redirects preserve distinct hop identities and explicit parent; duplicate starts block',()=>{
  const c=createAdoptRequestEvidence(origin),a=request();c.listenerStart('page-1');c.pageLifecycle('page-1','ACTIVE');c.request('page-1',a);
  const b=request();b.redirectResponse={status:307};c.request('page-1',b);c.finished('page-1',{requestId:'r'});
  c.pageLifecycle('page-1','CLOSING');c.listenerDrain('page-1');c.sourceClosed('page-1');c.pageLifecycle('page-1','CLOSED');c.freeze();
  const receipts=c.receipts([]),result=account([],false,origin,receipts),e=c.evidence([],result,receipts);
  assert.equal(e.requests[0].terminal_state,'REDIRECTED');assert.equal(e.requests[1].causal_parent,e.requests[0].request_id);
  assert.notEqual(e.requests[0].request_id,e.requests[1].request_id);assert.equal(auditAdoptRequestEvidence(e,[],result,origin,[]).status,'PASS');
  c.request('page-1',request());assert.ok(c.evidence([],result,receipts).capture_issues.includes('DUPLICATE_REQUEST'));
});
test('explicit CDP initiator parent is retained without inventing a tested-action ancestor',()=>{
  const c=createAdoptRequestEvidence(origin);c.listenerStart('page-1');c.pageLifecycle('page-1','ACTIVE');c.request('page-1',request());c.finished('page-1',{requestId:'r'});
  const e=request('child');e.initiator.requestId='r';c.request('page-1',e);c.finished('page-1',{requestId:'child'});
  const receipts=c.receipts([]),result=account([],false,origin,receipts),v=c.evidence([],result,receipts);
  assert.equal(v.requests[1].causal_parent,v.requests[0].request_id);assert.equal(v.requests[1].causal_relation,'CDP_INITIATOR_REQUEST');assert.equal(v.requests[1].causality_status,'UNKNOWN');
});
test('timeout error is a recorded network failure; response alone is never completion',()=>{
  const f=fixture({pending:true});f.c.failure('page-1',{requestId:'r',errorText:'net::ERR_TIMED_OUT'},0);
  const v=f.c.evidence(f.events,f.result,f.evidence.transition_receipts);
  assert.equal(v.requests[0].terminal_state,'FAILED');assert.equal(v.journal.at(-1).error_code,'net::ERR_TIMED_OUT');
  assert.ok(auditAdoptRequestEvidence(v,f.events,f.result,origin,[]).issues.includes('REQUEST_ACCOUNTING_MISMATCH'));
});
test('unknown raw failure cannot disappear through absent identity',()=>{
  const f=fixture();f.c.failure('page-1',{requestId:'unseen',errorText:'net::ERR_FAILED'},0);
  const e=f.c.evidence([],f.result,f.evidence.transition_receipts);assert.ok(e.capture_issues.includes('UNMAPPED_REQUEST'));assert.equal(auditAdoptRequestEvidence(e,[],f.result,origin,[]).status,'FAIL');
});
test('getters in untrusted evidence are rejected without evaluation',()=>{
  const f=fixture();let calls=0;Object.defineProperty(f.evidence.requests[0],'terminal_state',{get(){calls++;return 'FINISHED';}});assert.equal(f.audit().status,'FAIL');assert.equal(calls,0);
});

async function fakeHarness(out,production) {
  const cdp=new EventEmitter();cdp.send=async()=>({result:{value:true}});
  const context={newPage:async()=>({url:()=>origin}),newCDPSession:async()=>cdp,close:async()=>{cdp.emit('close');}};
  globalThis.__SL_ADOPT_TEST_CHROMIUM__={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
  const url=new URL('../scripts/browser-harness-base.mjs',import.meta.url);
  let code=await fs.readFile(url,'utf8');
  code=code.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,url).href))
    .replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{ chromium: globalThis.__SL_ADOPT_TEST_CHROMIUM__ }');
  const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  return {h:await createReadOnlyHarness({origin},production?undefined:{get:async()=>'',clear(){}},out,production),cdp};
}
test('shared ADOPT wires existing hooks and durably retains failed causality and the raw ledger',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'sl-adopt-evidence-'));
  try {
    const {h,cdp}=await fakeHarness(out,true),p=await h.createPage();h.observability.context(transitions.T1);p.transitionStart('T1');
    cdp.emit('Network.requestWillBeSent',request());cdp.emit('Network.responseReceived',{requestId:'r',response:{status:200},timestamp:2});
    cdp.emit('Network.loadingFailed',{requestId:'r',timestamp:3,canceled:true,errorText:'net::ERR_ABORTED',type:'Fetch'});
    await p.transitionComplete('T1');await p.close();await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID/);
    const evidence=JSON.parse(await fs.readFile(path.join(out,'adopt-request-evidence.json'))),network=JSON.parse(await fs.readFile(path.join(out,'network-accounting.json')));
    assert.equal(evidence.validation.status,'FAIL');assert.ok(evidence.validation.issues.includes('MISSING_CAUSAL_PARENT'));assert.equal(network.ledger.length,1);assert.equal(network.transition_receipts.records.length,0);assert.equal(evidence.transition_receipts.records.length,1);assert.equal(network.required_application_request_failures,1);
  }finally{await fs.rm(out,{recursive:true,force:true});}
});
test('Preview retains original interface and receives no ADOPT hooks or evidence',async()=>{
  const out=await fs.mkdtemp(path.join(os.tmpdir(),'sl-preview-evidence-'));
  try{const {h}=await fakeHarness(out,false),p=await h.createPage();assert.equal(p.transitionStart,undefined);assert.equal(h.observability,undefined);await p.close();await h.finish(true);await assert.rejects(fs.stat(path.join(out,'adopt-request-evidence.json')),{code:'ENOENT'});}finally{await fs.rm(out,{recursive:true,force:true});}
});

test('durable evidence is narrowly allowlisted for ADOPT on success or failure',async()=>{
  const workflow=await fs.readFile(new URL('../../../.github/workflows/statistical-levels-release.yml',import.meta.url),'utf8');
  const step=workflow.split('      - name: Retain sanitized ADOPT request lifecycle evidence\n')[1].split('  seal-qa:')[0];
  assert.match(step,/always\(\) && inputs.operation == 'ADOPT_EXISTING_PRODUCTION_BASELINE'/);
  assert.match(step,/name: statistical-levels-adopt-request-evidence/);
  assert.match(step,/path: \|/);
  assertExactAdoptArtifacts([...step.matchAll(/\$\{\{ runner.temp \}\}\/statistical-levels-candidate-qa\/([^\s]+)/g)].map(m=>m[1]));
  assert.doesNotMatch(step,/\*|include-hidden-files: true|overwrite: true/);
});

function assertExactAdoptArtifacts(names){assert.deepEqual(names,['adopt-request-evidence.json','native-ingress.jsonl','native-lifecycle-diagnostics.json']);}

// Recompute the consistency digest so malformed claims fail semantic validation,
// rather than being masked by an unrelated stale request-identity digest.
function ownershipMutation(f,mutate){
 const r=f.evidence.requests[0];mutate(r.native_intent,r);
 const keys=['request_id','request_evidence','metadata','protocol_request_sha256','rsc_classification','prefetch_classification','classification_evidence','initiator_scripts','initiator','causal_parent','causal_relation','redirect_parent_id','transition_id','transition_type','native_intent',...(r.request_context_binding?['request_context_binding']:[])];
 f.evidence.journal.find(row=>row.kind==='REQUEST'&&row.request_id===r.request_id).request_identity_sha256=sha(canonical(Object.fromEntries(keys.map(key=>[key,r[key]]))));
}
function ownershipResult(f,status){
 assert.equal(auditOuterJournalOwnership(f.evidence).status,status);
 const full=f.audit();assert.equal(full.status,status);
 if(status==='FAIL'){assert.ok(full.issues.some(issue=>issue.startsWith('OWNERSHIP_')));assert.ok(!full.issues.includes('REQUEST_OBSERVATION_MISMATCH'));}
}
const ownershipCases=[
 ['no witness bundle absent',false,null,'PASS'],
 ['no witness shaped caller',false,w=>Object.assign(w,{caller:{sequence:999999,script:{script_sha256:sha('caller'),code_sha256:sha('code'),length:10,start_line:0,start_column:0,default_context:true,live_edit:false}},initiator_type:'script',action_owned:false}),'FAIL'],
 ['no witness malformed caller',false,w=>{w.caller=false;},'FAIL'],
 ['no witness malformed initiator_type',false,w=>{w.initiator_type={unadjudicated:true};},'FAIL'],
 ['no witness malformed action_owned',false,w=>{w.action_owned='NOT_A_BOOLEAN';},'FAIL'],
 ['witness malformed caller',true,w=>{w.caller=false;},'FAIL'],
 ['witness malformed initiator_type',true,w=>{w.initiator_type={unadjudicated:true};},'FAIL'],
 ['witness malformed action_owned',true,w=>{w.action_owned='NOT_A_BOOLEAN';},'FAIL'],
 ['unknown ownership field',true,w=>{w.unadjudicated=true;},'FAIL'],
 ['wrong types and valid-type orphan claims',false,null,'FAIL'],
 ['conflicting ownership binding',true,w=>{w.action_owned=!w.action_owned;},'FAIL'],
];
for(const [name,witness,mutate,status]of ownershipCases)test('G5 ownership fail-closed: '+name,()=>{
 if(name==='wrong types and valid-type orphan claims'){
  for(const claim of [{caller:null},{caller:0},{caller:''},{initiator_type:'script'},{action_owned:false},{caller:{sequence:1,script:{}},initiator_type:7,action_owned:'false'}]){
   const f=fixture();ownershipResult(f,'PASS');ownershipMutation(f,w=>Object.assign(w,claim));ownershipResult(f,'FAIL');
  }
 }else{const f=fixture({ownershipWitness:witness});ownershipResult(f,'PASS');if(mutate)ownershipMutation(f,mutate);ownershipResult(f,status);}
});
for(const name of ['current authenticated valid control','Major04 valid baseline','Major05 valid baseline'])test('G5 ownership fail-closed: '+name,async()=>{
 // The qualification captures fresh full-product evidence before release tests.
 // Outside qualification the collector fixture still exercises an authenticated bundle.
 if(!process.env.CI_EVIDENCE){ownershipResult(fixture({ownershipWitness:true}),'PASS');return;}
 const dir=path.join(process.env.CI_EVIDENCE,'full-product');
 const evidence=JSON.parse(await fs.readFile(path.join(dir,'adopt-request-evidence.json'),'utf8'));
 const result=JSON.parse(await fs.readFile(path.join(dir,'network-accounting.json'),'utf8'));delete result.authFailures;
 assert.equal(auditOuterJournalOwnership(evidence).status,'PASS');
 assert.equal(auditAdoptRequestEvidence(evidence,[],result,'http://127.0.0.1:3697').status,'PASS');
 if(name!=='current authenticated valid control'){
  const {validateRuntimeTransitionReceipt}=await import('../scripts/runtime-transition-receipts.mjs');
  const proof=evidence.transitions.find(t=>t.kind==='T2').runtime_proof;
  assert.equal(validateRuntimeTransitionReceipt(proof.receipt,proof.source,proof.census).status,'PASS');
 }
});
