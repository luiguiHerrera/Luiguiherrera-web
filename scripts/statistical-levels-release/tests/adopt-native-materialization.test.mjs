import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createAdoptRequestEvidence,materializeNativeEvent,auditAdoptRequestEvidence} from '../scripts/adopt-request-evidence.mjs';
import {account} from '../scripts/network-accounting.mjs';
const origin='https://independent.invalid',page='page-1';
const request=()=>({requestId:'r1',frameId:'f1',loaderId:'d1',documentURL:origin+'/',type:'Fetch',timestamp:1,
 request:{url:origin+'/asset',method:'GET',headers:{RSC:'1','Next-Router-Prefetch':'0'}},
 initiator:{type:'script',stack:{callFrames:[{scriptId:'s1',url:origin+'/app.js',lineNumber:1,columnNumber:0}]}}});
function setup(){const snapshots=[],c=createAdoptRequestEvidence(origin,e=>snapshots.push(structuredClone(e))),raw=[];c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
 const done=()=>{c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();const receipts=c.receipts(raw),result=account(raw,false,origin,receipts),evidence=c.evidence(raw,result,receipts);return {evidence,result,audit:auditAdoptRequestEvidence(evidence,raw,result,origin,[])};};return {c,raw,snapshots,done};}
function fail(value){throw value;}
const toxic=()=>({[Symbol.toPrimitive](){throw new Error('DEFERRED_COERCION');}});
const cases={
 'getter':e=>Object.defineProperty(e,'requestId',{get(){throw new Error('ID_GET');}}),
 'toString':e=>{e.request.url={toString(){throw new Error('URL_STRING');}};},
 'valueOf':e=>{e.timestamp={valueOf(){throw new Error('NUMBER_VALUE');}};},
 'Symbol.toPrimitive':e=>{e.type=toxic();},
 'toJSON':e=>{e.request.method={toJSON(){throw new Error('JSON');}};},
 'array accessor':e=>Object.defineProperty(e.initiator.stack.callFrames,0,{get(){throw new Error('INDEX');}}),
 'nested getter':e=>Object.defineProperty(e.initiator.stack.callFrames[0],'url',{get(){throw new Error('NESTED_URL');}}),
 'headers wrapper':e=>{e.request.headers=new class {get RSC(){throw new Error('HEADER');}};},
 'header value wrapper':e=>{e.request.headers.RSC=toxic();},
 'error object':e=>Object.defineProperty(e,'type',{get(){fail(Object.defineProperty({},'message',{get(){throw new Error('ERROR_MESSAGE');}}));}}),
 'container proxy':e=>{e.initiator=new Proxy({}, {get(){throw new Error('PROXY_READ');}});},
};
for(const [name,corrupt] of Object.entries(cases))test('protected materialization rejects '+name+' exactly once',()=>{
 const f=setup(),native=request();corrupt(native);let downstream=false;
 assert.doesNotThrow(()=>f.c.nativeIngress(page,'Network.requestWillBeSent',native,f.raw,()=>{downstream=true;}));
 assert.equal(downstream,false);assert.equal(f.snapshots[0].interpretation_status,'NOT_YET_INTERPRETED');
 f.c.nativeIngress(page,'Network.requestWillBeSent',native,f.raw,()=>assert.fail('duplicate must not reinterpret'));
 const v=f.done();assert.equal(v.result.ledger.length,1);assert.equal(v.result.unclassified_failures.length,1);assert.equal(v.audit.status,'FAIL');
 const b=v.result.ledger[0].event.ingress_failure;assert.equal(b.materialization_status,'FAILED');assert.equal(b.request_id,'UNKNOWN');assert.match(b.failure_record_id,/^materialization-failure-[a-f0-9]{64}$/);assert.ok(b.materialization_field.startsWith('$'));assert.ok(b.materialization_operation);
 assert.doesNotThrow(()=>JSON.stringify(v));assert.equal(v.evidence.journal.filter(e=>e.kind==='NATIVE_INGRESS'&&e.interpretation_status==='FAILED').length,1);
});
test('independent snapshot has no native references or executable descriptors, even nested',()=>{
 const native=request(),originals=new Set();function collect(x){if(x&&typeof x==='object'){originals.add(x);for(const d of Object.values(Object.getOwnPropertyDescriptors(x)))if('value'in d)collect(d.value);}}collect(native);
 const safe=materializeNativeEvent('Network.requestWillBeSent',native);let refs=0;
 function check(x){if(x&&typeof x==='object'){if(originals.has(x))refs++;assert.ok(Object.isFrozen(x));for(const d of Object.values(Object.getOwnPropertyDescriptors(x))){assert.ok('value'in d);assert.equal(typeof d.value==='function',false);check(d.value);}}else assert.ok(x===null||['string','number','boolean','undefined'].includes(typeof x));}check(safe);assert.equal(refs,0);
 for(const x of originals)for(const k of Object.keys(x)){if(k==='length')continue;Object.defineProperty(x,k,{get(){throw new Error('NATIVE_REACCESSED');},configurable:true});}
 assert.equal(safe.request.url,'https://independent.invalid/asset');assert.equal(safe.request.headers.RSC,'1');assert.equal(safe.initiator.stack.callFrames[0].scriptId,'s1');assert.doesNotThrow(()=>JSON.stringify(safe));
});
test('native iterator and toJSON hooks are never retained or used downstream',()=>{
 const e=request();Object.defineProperty(e.initiator.stack.callFrames,Symbol.iterator,{get(){throw new Error('ITERATOR');}});Object.defineProperty(e,'toJSON',{get(){throw new Error('SERIALIZE_NATIVE');}});
 const safe=materializeNativeEvent('Network.requestWillBeSent',e);assert.equal([...safe.initiator.stack.callFrames].length,1);assert.doesNotThrow(()=>JSON.stringify(safe));assert.equal(safe.toJSON,undefined);
});
test('safe materialization still permits the independent valid request/response/completion path',()=>{
 const f=setup(),e=request();e.request.headers={'Next-Router-Prefetch':'0'};f.c.request(page,e);f.c.response(page,{requestId:'r1',response:{status:200},timestamp:2});f.c.finished(page,{requestId:'r1',timestamp:3});const v=f.done();assert.equal(v.audit.status,'PASS');assert.equal(v.result.ledger.length,0);assert.equal(v.evidence.requests[0].terminal_state,'FINISHED');
});
for(const timing of ['before drain','during drain','before freeze'])test('materialization failure retained '+timing+' and later sibling cannot erase it',()=>{
 const f=setup();if(timing!=='before drain')f.c.listenerDrain(page);if(timing==='before freeze')f.c.sourceClosed(page);
 const e=request();e.request.headers.RSC=toxic();f.c.nativeIngress(page,'Network.requestWillBeSent',e,f.raw,()=>assert.fail());
 const sibling=request();sibling.requestId='sibling';sibling.request.headers={'Next-Router-Prefetch':'0'};f.c.request(page,sibling);f.c.finished(page,{requestId:'sibling',timestamp:3});
 if(timing==='before drain')f.c.listenerDrain(page);if(timing!=='before freeze')f.c.sourceClosed(page);f.c.freeze();const receipts=f.c.receipts(f.raw),result=account(f.raw,false,origin,receipts);assert.equal(result.unclassified_failures.length,1);assert.equal(result.ledger.length,1);
});
// Only transport is substituted; actual production listener and finish functions
// execute unchanged. Literal hostile payloads are independent of the converter.
async function harness(){const cdp=new EventEmitter();cdp.send=async()=>({result:{value:true}});const context={newPage:async()=>({url:()=>origin+'/'}),newCDPSession:async()=>cdp,close:async()=>cdp.emit('close')};
 globalThis.__SL_MATERIAL_TEST={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
 const harnessModuleUrl=new URL('../scripts/browser-harness-base.mjs',import.meta.url);const source=fs.readFileSync(harnessModuleUrl,'utf8').replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,harnessModuleUrl).href)).replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{chromium:globalThis.__SL_MATERIAL_TEST}');
 const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const out=fs.mkdtempSync(path.join(os.tmpdir(),'sl-materialization-')),h=await createReadOnlyHarness({origin},undefined,out,true),p=await h.createPage();
 return {cdp,out,finish:async()=>{await p.close();await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID/);return {evidence:JSON.parse(fs.readFileSync(path.join(out,'adopt-request-evidence.json'))),result:JSON.parse(fs.readFileSync(path.join(out,'network-accounting.json')))};}};
}
test('exact F24.14-1 stateful accessor no longer escapes to finish',async()=>{
 const f=await harness();f.cdp.emit('Network.requestWillBeSent',request());let reads=0;const e={requestId:'r1',type:'Fetch',timestamp:2,canceled:false};Object.defineProperty(e,'errorText',{get(){return ++reads<=2?'net::ERR_FAILED':toxic();}});
 f.cdp.emit('Network.loadingFailed',e);assert.equal(reads,1);const v=await f.finish();assert.equal(reads,1);assert.equal(v.result.required_application_request_failures,1);assert.equal(v.result.ledger.length,1);assert.equal(v.evidence.validation.status,'FAIL');
});
for(const type of ['Network.loadingFailed','Runtime.exceptionThrown','Log.entryAdded'])test('actual callback cannot retain deferred scalar from '+type,async()=>{
 const f=await harness();f.cdp.emit('Network.requestWillBeSent',request());const native=type==='Network.loadingFailed'?{requestId:'r1',errorText:toxic(),type:'Fetch'}:type==='Runtime.exceptionThrown'?{exceptionDetails:{exceptionId:1,url:toxic()}}:{entry:{level:'error',url:toxic()}};
 assert.doesNotThrow(()=>f.cdp.emit(type,native));f.cdp.emit(type,native);const v=await f.finish();assert.equal(v.result.unclassified_failures.length,1);assert.equal(v.result.ledger.length,1);assert.equal(v.result.ledger[0].event.ingress_failure.materialization_status,'FAILED');assert.equal(v.evidence.validation.status,'FAIL');
});
for(const corrupt of ['remove binding','wrong operation','wrong failure id','duplicate ledger'])test('materialization accounting corruption rejected: '+corrupt,()=>{
 const f=setup(),e=request();e.type=toxic();f.c.nativeIngress(page,'Network.requestWillBeSent',e,f.raw,()=>assert.fail());const v=f.done();
 if(corrupt==='remove binding')delete v.evidence.journal.find(e=>e.kind==='NATIVE_INGRESS').failure_evidence;
 if(corrupt==='wrong operation')v.evidence.journal.find(e=>e.kind==='NATIVE_INGRESS').materialization_operation='OTHER';
 if(corrupt==='wrong failure id')f.raw[0].ingress_failure.failure_record_id='bad';
 if(corrupt==='duplicate ledger')f.raw.push(structuredClone(f.raw[0]));
 const audit=auditAdoptRequestEvidence(v.evidence,f.raw,v.result,origin,[]);assert.equal(audit.status,'FAIL');
 const expected={'remove binding':'EVIDENCE_INVALID','wrong operation':'EVIDENCE_INVALID','wrong failure id':'EVIDENCE_INVALID','duplicate ledger':'RECEIPT_ACCOUNTING_MISMATCH'}[corrupt];
 assert.ok(audit.issues.includes(expected),JSON.stringify(audit));
});

for(const status of ['MATERIALIZING','FAILED','INVENTED'])test('positive evidence rejects corrupted materialization state '+status,()=>{
 const f=setup(),e=request();e.request.headers={'Next-Router-Prefetch':'0'};f.c.request(page,e);f.c.response(page,{requestId:'r1',response:{status:200},timestamp:2});f.c.finished(page,{requestId:'r1',timestamp:3});const v=f.done();assert.equal(v.audit.status,'PASS');
 v.evidence.journal.find(e=>e.kind==='NATIVE_INGRESS').materialization_status=status;
 const audit=auditAdoptRequestEvidence(v.evidence,[],v.result,origin,[]);assert.equal(audit.status,'FAIL');assert.ok(audit.issues.includes(status==='FAILED'?'MATERIALIZATION_STATE_MISMATCH':'MATERIALIZATION_INCOMPLETE'));
});

test('native script witness: durable capture precedes property reads, no deferred hash reaches classification',()=>{
 const snapshots=[],c=createAdoptRequestEvidence('https://www.luiguiherrera.com',v=>snapshots.push(structuredClone(v))),raw=[];
 c.listenerStart('page-1');c.pageLifecycle('page-1','ACTIVE');let reads=0;
 const native={get scriptId(){assert.equal(snapshots[0].interpretation_status,'NOT_YET_INTERPRETED');reads++;return 'code';},get hash(){throw new Error('hostile native getter');}};
 c.scriptParsed('page-1',native,raw);c.scriptParsed('page-1',native,raw);
 assert.equal(reads,1);assert.equal(raw.length,1);assert.equal(raw[0].kind,'native_script_proof_failure');
 assert.equal(snapshots.length,4);assert.equal(snapshots[1].materialization_status,'FAILED');assert.equal(snapshots[3].interpretation_status,'DUPLICATE');
 assert.equal(c.verifyIngress(snapshots).status,'PASS');
});
test('native script witness: hash coercion is rejected without invoking native conversion',()=>{
 const c=createAdoptRequestEvidence('https://www.luiguiherrera.com'),raw=[];c.listenerStart('page-1');let coerced=0;
 c.scriptParsed('page-1',{scriptId:'code',hash:{toString(){coerced++;return '0'.repeat(64);}}},raw);
 assert.equal(coerced,0);assert.equal(raw.length,1);
});
test('classification cannot read an unprotected native wrapper',()=>{
 const c=createAdoptRequestEvidence('https://www.luiguiherrera.com');let read=false;
 assert.throws(()=>c.classification('page-1',{get request(){read=true;throw Error();}}),/UNMATERIALIZED_CLASSIFICATION_INPUT/);assert.equal(read,false);
});

test('native script witness: durability loss and conflicting script identity remain retained failures',()=>{
 for(const mode of ['receive','settled','conflict']) {
  let writes=0;const snapshots=[],raw=[];
  const c=createAdoptRequestEvidence(origin,e=>{writes++;if(writes===(mode==='receive'?1:mode==='settled'?2:-1))throw Error('durability');snapshots.push(structuredClone(e));});
  c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
  const native={scriptId:'s',hash:'a'.repeat(64),length:12,startLine:0,startColumn:0,executionContextAuxData:{isDefault:true}};
  c.scriptParsed(page,native,raw);if(mode==='conflict')c.scriptParsed(page,{...native,hash:'b'.repeat(64)},raw);
  c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();
  const receipts=c.receipts(raw),result=account(raw,false,origin,receipts),e=c.evidence(raw,result,receipts);
  assert.equal(raw.length,1);assert.equal(result.unclassified_failures.length,1);assert.equal(auditAdoptRequestEvidence(e,raw,result,origin,[]).status,'FAIL');
  assert.equal(c.verifyIngress(snapshots).status,mode==='conflict'?'PASS':'FAIL');
 }
});
