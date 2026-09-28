import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createAdoptRequestEvidence,auditAdoptRequestEvidence} from '../scripts/adopt-request-evidence.mjs';
import {account} from '../scripts/network-accounting.mjs';
import {canonical,sha} from '../scripts/release-core.mjs';
const origin='https://independent.invalid',page='page-1';
// Literal protocol witnesses; neither this fixture nor expected outcomes come from
// the converter. Deliberately throwing getters check the boundary while it runs.
function request(){return {requestId:'native-1',frameId:'f',loaderId:'d',documentURL:origin+'/',type:'Fetch',timestamp:1,
  request:{url:origin+'/asset',method:'GET',headers:{RSC:'1','Next-Router-Prefetch':'1'}},
  initiator:{type:'script',stack:{callFrames:[{scriptId:'script-1',url:origin+'/app.js'}]}}};}
function setup(){const snapshots=[],c=createAdoptRequestEvidence(origin,e=>snapshots.push(structuredClone(e))),raw=[];
 c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
 const close=()=>{c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();};
 const view=()=>{const receipts=c.receipts(raw),result=account(raw,false,origin,receipts),evidence=c.evidence(raw,result,receipts);return {evidence,result,audit:auditAdoptRequestEvidence(evidence,raw,result,origin,[])};};
 return {c,raw,snapshots,close,view};}
function getter(object,key,check){Object.defineProperty(object,key,{get(){check();throw Object.defineProperty({},'message',{get(){throw new Error('THROWN_VALUE_MUST_NOT_BE_INSPECTED');}});},configurable:true});}
const fields={
 'request ID':e=>[e,'requestId'], 'URL':e=>[e.request,'url'], 'method':e=>[e.request,'method'],
 'headers':e=>[e.request,'headers'],'resource type':e=>[e,'type'], 'initiator':e=>[e,'initiator'],
 'parent':e=>[e.initiator,'requestId'],'redirect':e=>[e,'redirectResponse'],
 'prefetch metadata':e=>[e.request.headers,'Next-Router-Prefetch'],'RSC metadata':e=>[e.request.headers,'RSC'],
 'timestamp':e=>[e,'timestamp'],'frame':e=>[e,'frameId'],'document':e=>[e,'documentURL'],
};
for(const [name,location] of Object.entries(fields))test('capture before throwing '+name+' getter (collector entry)',()=>{
 const f=setup(),e=request();let accessed=0;
 getter(...location(e),()=>{accessed++;assert.equal(f.snapshots.at(-1).kind,'NATIVE_INGRESS');assert.equal(f.snapshots.at(-1).interpretation_status,'NOT_YET_INTERPRETED');});
 assert.doesNotThrow(()=>f.c.request(page,e));assert.ok(accessed>0);f.close();const v=f.view();
 const envelopes=v.evidence.journal.filter(x=>x.kind==='NATIVE_INGRESS');assert.equal(envelopes.length,1);assert.equal(envelopes[0].interpretation_status,'FAILED');
 assert.equal(v.result.ledger.length,1);assert.equal(v.result.ledger[0].event.ingress_failure.request_id,'UNKNOWN');
 assert.equal(v.result.unclassified_failures.length,1);assert.equal(v.audit.status,'FAIL');assert.ok(v.audit.issues.includes('NATIVE_INTERPRETATION_FAILED'));
 assert.equal(envelopes[0].accounting_indices.length,1);
});
for(const url of ['./asset','http://['])test('former collector URL crash retained: '+url,()=>{
 const f=setup(),e=request();e.request.url=url;assert.doesNotThrow(()=>f.c.request(page,e));f.close();const v=f.view();
 assert.equal(v.result.ledger.length,1);assert.equal(v.audit.status,'FAIL');assert.equal(v.result.ledger[0].classification,'unclassified');
});
test('native failure is retained once across duplicate delivery, retry and successful sibling',()=>{
 const f=setup(),e=request();getter(e.request,'url',()=>{});f.c.request(page,e);f.c.request(page,e);
 for(const id of ['retry','sibling']){const ok=request();ok.requestId=id;ok.request.headers={'Next-Router-Prefetch':'0'};f.c.request(page,ok);f.c.finished(page,{requestId:id,timestamp:2});}
 f.close();const v=f.view();assert.equal(v.result.ledger.length,1);assert.equal(v.evidence.requests.length,2);
 assert.equal(v.evidence.journal.filter(e=>e.kind==='NATIVE_INGRESS'&&e.interpretation_status==='DUPLICATE').length,1);
 assert.equal(v.audit.status,'FAIL');
});
for(const timing of ['before drain','during drain','before freeze','after freeze'])test('failure remains accounted '+timing,()=>{
 const f=setup();if(timing!=='before drain'){f.c.pageLifecycle(page,'CLOSING');f.c.listenerDrain(page);}
 if(timing==='before freeze'||timing==='after freeze'){f.c.sourceClosed(page);f.c.pageLifecycle(page,'CLOSED');}
 if(timing==='after freeze')f.c.freeze();const e=request();getter(e,'requestId',()=>{});f.c.request(page,e);
 if(timing==='before drain')f.close();else if(timing==='during drain'){f.c.sourceClosed(page);f.c.pageLifecycle(page,'CLOSED');f.c.freeze();}else if(timing==='before freeze')f.c.freeze();
 const v=f.view();assert.equal(v.result.ledger.length,1);assert.equal(v.audit.status,'FAIL');
});
test('valid literal native request/response/finish preserves a positive accounting path',()=>{
 const f=setup(),e=request();e.request.headers={'Next-Router-Prefetch':'0'};f.c.request(page,e);
 f.c.response(page,{requestId:'native-1',response:{status:200},timestamp:2});f.c.finished(page,{requestId:'native-1',timestamp:3});f.close();
 const v=f.view();assert.equal(v.audit.status,'PASS');assert.equal(v.evidence.requests[0].terminal_state,'FINISHED');assert.equal(v.result.ledger.length,0);
 assert.equal(v.evidence.journal.filter(e=>e.kind==='NATIVE_INGRESS').length,3);
});
for(const corrupt of ['missing ledger','duplicate ledger','unobserved failure','wrong owner','drop envelope','wrong conversion owner','invent successful interpretation'])test('independent ingress corruption rejected: '+corrupt,()=>{
 const f=setup(),e=request();getter(e.request,'url',()=>{});f.c.request(page,e);f.close();const v=f.view(),j=v.evidence.journal.find(e=>e.kind==='NATIVE_INGRESS');
 if(corrupt==='missing ledger')f.raw.length=0;
 if(corrupt==='duplicate ledger')f.raw.push(structuredClone(f.raw[0]));
 if(corrupt==='unobserved failure')j.failure_evidence.event_id='native-ingress-'+'0'.repeat(64);
 if(corrupt==='wrong owner')j.page_id='page-99';
 if(corrupt==='drop envelope')v.evidence.journal=v.evidence.journal.filter(e=>e!==j);
 if(corrupt==='wrong conversion owner')j.conversion_sequences=[j.sequence];
 if(corrupt==='invent successful interpretation'){j.interpretation_status='INTERPRETED';delete j.failure_evidence;}
 const result=account(f.raw,false,origin,v.evidence.transition_receipts);v.evidence.ledger_sha256=sha(canonical(result.ledger));
 assert.equal(auditAdoptRequestEvidence(v.evidence,f.raw,result,origin,[]).status,'FAIL');
});
// Execute actual production-intended callbacks. Only the transport is replaced;
// malformed literals/throwing accessors must not require an authentic browser to
// test code that CDP itself normally supplies as JSON data.
async function harness(){const cdp=new EventEmitter();cdp.send=async()=>({result:{value:true}});
 const context={newPage:async()=>({url:()=>origin+'/'}),newCDPSession:async()=>cdp,close:async()=>cdp.emit('close')};
 globalThis.__SL_INGRESS_TEST={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
 const module=new URL('../scripts/browser-harness-base.mjs',import.meta.url);let source=fs.readFileSync(module,'utf8');
 source=source.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,module).href)).replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{chromium:globalThis.__SL_INGRESS_TEST}');
 const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'sl-native-ingress-')),h=await createReadOnlyHarness({origin},undefined,out,true),p=await h.createPage();
 const lines=()=>fs.readFileSync(path.join(out,'native-ingress.jsonl'),'utf8').trim().split('\n').map(x=>JSON.parse(x));
 const finish=async()=>{await p.close();await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID/);return {evidence:JSON.parse(fs.readFileSync(path.join(out,'adopt-request-evidence.json'))),result:JSON.parse(fs.readFileSync(path.join(out,'network-accounting.json')))};};
 return {cdp,out,lines,finish};}
const nativeCases={
 'request ID':()=>['Network.requestWillBeSent',request(),e=>[e,'requestId']],
 'request URL':()=>['Network.requestWillBeSent',request(),e=>[e.request,'url']],
 'headers':()=>['Network.requestWillBeSent',request(),e=>[e.request,'headers']],
 'method':()=>['Network.requestWillBeSent',request(),e=>[e.request,'method']],
 'RSC':()=>['Network.requestWillBeSent',request(),e=>[e.request.headers,'RSC']],
 'prefetch':()=>['Network.requestWillBeSent',request(),e=>[e.request.headers,'Next-Router-Prefetch']],
 'initiator':()=>['Network.requestWillBeSent',request(),e=>[e,'initiator']],
 'redirect':()=>['Network.requestWillBeSent',request(),e=>[e,'redirectResponse']],
 'resource type':()=>['Network.requestWillBeSent',request(),e=>[e,'type']],
 'response':()=>['Network.responseReceived',{requestId:'missing'},e=>[e,'response']],
 'lifecycle':()=>['Network.loadingFailed',{requestId:'missing'},e=>[e,'canceled']],
 'finish':()=>['Network.loadingFinished',{},e=>[e,'requestId']],
 'frame':()=>['Page.frameNavigated',{},e=>[e,'frame']],
 'console type':()=>['Runtime.consoleAPICalled',{},e=>[e,'type']],
 'source URL':()=>['Runtime.consoleAPICalled',{type:'error',stackTrace:{callFrames:[{}]}},e=>[e.stackTrace.callFrames[0],'url']],
 'exception details':()=>['Runtime.exceptionThrown',{},e=>[e,'exceptionDetails']],
 'log entry':()=>['Log.entryAdded',{},e=>[e,'entry']],
};
for(const [name,make]of Object.entries(nativeCases))test('actual native ingress persists BEFORE throwing '+name+' access',async()=>{
 const f=await harness(),[type,e,location]=make();let accessed=0;
 getter(...location(e),()=>{accessed++;const first=f.lines().at(-1);assert.equal(first.interpretation_status,'NOT_YET_INTERPRETED');assert.equal(first.native_event_type,type);assert.equal(first.native_event_received,true);});
 assert.doesNotThrow(()=>f.cdp.emit(type,e));assert.equal(accessed,1);
 assert.doesNotThrow(()=>f.cdp.emit(type,e));assert.equal(accessed,1,'repeat failed object has one logical accounting contribution');
 const v=await f.finish();assert.equal(v.result.ledger.length,1);assert.equal(v.result.unclassified_failures.length,1);
 assert.equal(v.evidence.validation.status,'FAIL');assert.equal(v.result.ledger[0].event.ingress_failure.request_id,'UNKNOWN');
 assert.equal(f.lines()[0].interpretation_status,'NOT_YET_INTERPRETED');assert.equal(f.lines()[1].interpretation_status,'FAILED');
});
for(const scenario of ['relative','malformed','missing headers','malformed initiator','relative missing ID','malformed missing ID'])test('exact F24.12 ingress literal: '+scenario,async()=>{
 const f=await harness(),e=request();if(scenario.startsWith('relative'))e.request.url='./asset';if(scenario.startsWith('malformed')&&scenario!=='malformed initiator')e.request.url='http://[';
 if(scenario==='missing headers')delete e.request.headers;if(scenario==='malformed initiator')e.initiator.stack.callFrames={};if(scenario.endsWith('missing ID'))delete e.requestId;
 assert.doesNotThrow(()=>f.cdp.emit('Network.requestWillBeSent',e));const v=await f.finish();assert.equal(v.result.ledger.length,1);assert.equal(v.evidence.validation.status,'FAIL');
 const row=v.result.ledger[0].event;assert.equal((row.ingress_failure??row.unresolved_evidence).request_id,'UNKNOWN');
});
test('irrelevant console message is observed without expanding failure scope',async()=>{
 const f=await harness();f.cdp.emit('Runtime.consoleAPICalled',{type:'log',args:[{value:'PRIVATE_DO_NOT_PERSIST'}]});const v=await f.finish();
 assert.equal(v.result.ledger.length,0);assert.equal(v.evidence.journal.find(e=>e.kind==='NATIVE_INGRESS').interpretation_status,'INTERPRETED');
 assert.ok(!fs.readFileSync(path.join(f.out,'native-ingress.jsonl'),'utf8').includes('PRIVATE_DO_NOT_PERSIST'));
});

test('unsafe interpreted metadata never poisons final evidence serialization',()=>{
 const f=setup(),e=request();e.type=Object.defineProperty({},'toJSON',{get(){throw new Error('DO_NOT_SERIALIZE_NATIVE');}});
 assert.doesNotThrow(()=>f.c.request(page,e));f.close();const v=f.view();
 assert.equal(v.result.ledger.length,1);assert.equal(v.evidence.requests.length,0);assert.equal(v.audit.status,'FAIL');
 assert.doesNotThrow(()=>JSON.stringify(v.evidence));
});
test('unknown native exception type cannot claim harmless irrelevance',async()=>{
 const f=await harness();f.cdp.emit('Runtime.consoleAPICalled',{type:'UNKNOWN'});const v=await f.finish();
 assert.equal(v.result.ledger.length,1);assert.equal(v.result.unclassified_failures.length,1);
});
for(const corruption of ['drop receive','drop settled','duplicate receive','replace ownership','omit failed envelope','alter conversion'])test('append-only ingress reconciles exact observations: '+corruption,async()=>{
 const {auditNativeIngressJournal}=await import('../scripts/adopt-request-evidence.mjs');const f=setup(),e=request();getter(e.request,'url',()=>{});f.c.request(page,e);f.close();const v=f.view();
 const rows=v.evidence.journal.filter(e=>e.kind==='NATIVE_INGRESS'),snapshots=structuredClone(f.snapshots);
 assert.equal(auditNativeIngressJournal(rows,snapshots).status,'PASS');
 if(corruption==='drop receive')snapshots.shift();
 if(corruption==='drop settled')snapshots.pop();
 if(corruption==='duplicate receive')snapshots.splice(1,0,snapshots[0]);
 if(corruption==='replace ownership')snapshots[0].page_id='page-2';
 if(corruption==='omit failed envelope')rows.length=0;
 if(corruption==='alter conversion')snapshots[1].conversion_sequences=[999];
 assert.equal(auditNativeIngressJournal(rows,snapshots).status,'FAIL');
});

for(const failureAt of [1,2])test('durability acknowledgement failure is explicit and blocks: '+failureAt,()=>{
 let calls=0;const c=createAdoptRequestEvidence(origin,()=>{if(++calls===failureAt)throw new Error('DISK_UNAVAILABLE');}),raw=[];
 c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');const e=request();let interpreted=false;
 c.nativeIngress(page,'Network.requestWillBeSent',e,raw,()=>{interpreted=true;c.request(page,e);});
 assert.equal(interpreted,failureAt===2);c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();
 const receipts=c.receipts(raw),result=account(raw,false,origin,receipts),evidence=c.evidence(raw,result,receipts);
 assert.equal(result.ledger.length,1);assert.equal(result.ledger[0].classification,'unclassified');
 assert.equal(auditAdoptRequestEvidence(evidence,raw,result,origin,[]).status,'FAIL');
});

test('initiator source getter failure cannot hide inside URL fallback',()=>{
 const f=setup(),e=request();let accessed=0;getter(e.initiator.stack.callFrames[0],'url',()=>accessed++);
 f.c.request(page,e);f.close();const v=f.view();assert.equal(accessed,1);assert.equal(v.result.ledger.length,1);assert.equal(v.audit.status,'FAIL');
});
test('URL is read once before subordinate parser fallback or identity derivation',()=>{
 const f=setup(),e=request();let reads=0;Object.defineProperty(e.request,'url',{get(){reads++;if(reads!==1)throw new Error('SECOND_ACCESS');return origin+'/asset';}});
 f.c.request(page,e);assert.equal(reads,1);f.c.finished(page,{requestId:e.requestId});f.close();const v=f.view();assert.equal(v.result.ledger.length,0);assert.equal(v.evidence.requests.length,1);
});
test('document URL coercion object cannot escape through URL fallback',()=>{
 const f=setup(),e=request();e.documentURL={toString(){throw new Error('COERCION');}};f.c.request(page,e);f.close();const v=f.view();
 assert.equal(v.result.ledger.length,1);assert.equal(v.audit.status,'FAIL');assert.equal(v.evidence.requests.length,0);
});
