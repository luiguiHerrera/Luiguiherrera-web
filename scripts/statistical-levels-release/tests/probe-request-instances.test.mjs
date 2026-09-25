import test from 'node:test';import assert from 'node:assert/strict';
import {createRequestInstanceCollector,destinationFingerprint} from '../scripts/probe-request-instances.mjs';
import {createTransitionCapture,transitions,validateTransitionReceipts} from '../scripts/probe-transition-receipts.mjs';
import {safeEvent,account} from '../scripts/network-accounting.mjs';
import {sanitizeProbeAccounting} from '../scripts/probe-evidence.mjs';
import {canonical,sha} from '../scripts/release-core.mjs';
const origin='https://luiguiherrera-replay-luigui-herrera-s-projects.vercel.app';
function fixture(){
 const collector=createRequestInstanceCollector(origin),capture=createTransitionCapture(origin),raw=[];
 function start(kind='T1',active=null,loader='loader',context=transitions[kind]){const spec=transitions[kind],e={requestId:'memory-'+raw.length,frameId:'frame',loaderId:loader,documentURL:origin+spec.route,type:'Fetch',request:{url:origin+spec.route+'?'+new URLSearchParams(spec.target_state),method:'GET',headers:{RSC:'1'}}};const binding=collector.request('page-1',e,context,active),r={request_evidence:binding,kind:'request_failure',url:e.request.url,type:'Fetch',rsc:true,prefetch:false,canceled:true,error_code:'net::ERR_ABORTED'};raw.push(r);return {e,r};}
 for(const kind of ['T1','T2']){const id=capture.start('page-1',kind,transitions[kind],'ACTIVE'),{e,r}=start(kind,id);capture.request('page-1',e.requestId,e,'ACTIVE',r.request_evidence);capture.response('page-1',e.requestId,200,'ACTIVE');capture.failure('page-1',e.requestId,{canceled:true,errorText:'net::ERR_ABORTED'},raw.length-1,'ACTIVE');capture.complete('page-1',kind,{metric:true,readiness:true},'ACTIVE');}
 const evidence=capture.evidence(raw.map(safeEvent));return {raw,evidence,start};
}
function reject(f,records,raw=f.raw){const e={...f.evidence,records};assert.throws(()=>validateTransitionReceipts(e,raw.map(safeEvent),origin));assert.throws(()=>account(raw,true,origin,e));}
for(const id of ['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10'])test(id+' transition binding replay REJECT',()=>{
 const f=fixture(),p=structuredClone(f.evidence.records[0]);assert.equal(f.evidence.records.length,2);const required=f.start().r,b=required.request_evidence;
 if(id==='R1'){const raw=[required,...f.raw.slice(1)];reject(f,[p],raw);}
 if(id==='R2')reject(f,[{...p,event_index:2,request_instance_id:b.request_instance_id,request_sequence:b.network_request_ordinal,raw_event_sha256:sha(canonical(safeEvent(required)))}]);
 if(id==='R3')reject(f,[{...p,event_index:2,request_sequence:b.network_request_ordinal,raw_event_sha256:sha(canonical(safeEvent(required)))}]);
 if(id==='R4')reject(f,[p],[f.raw[0],structuredClone(f.raw[0])]);
 if(id==='R5')reject(f,[p,structuredClone(p)]);
 if(id==='R6'){const r=f.start('T1',p.transition_id,'other-document').r;assert.notEqual(r.request_evidence.document_instance_id,f.raw[0].request_evidence.document_instance_id);reject(f,[{...p,event_index:3,request_sequence:r.request_evidence.network_request_ordinal,raw_event_sha256:sha(canonical(safeEvent(r)))}]);}
 if(id==='R7'){const g=fixture();assert.notEqual(g.raw[0].request_evidence.capture_id,f.raw[0].request_evidence.capture_id);reject(f,[{...p,raw_event_sha256:sha(canonical(safeEvent(g.raw[0])))}],g.raw);}
 if(id==='R8')reject(f,[{...p,transition_id:'transition-99',request_sequence:99}]);
 if(id==='R9'){const q=f.evidence.records[1];reject(f,[{...p,event_index:1,request_instance_id:q.request_instance_id,request_sequence:q.request_sequence,raw_event_sha256:q.raw_event_sha256}]);}
 if(id==='R10')reject(f,[p,{...p,transition_id:'transition-99'}]);
});
test('same generic destination distinct independently bound authority',()=>{const f=fixture(),a=safeEvent(f.raw[0]),b=safeEvent(f.start().r);assert.notEqual(a.request_evidence.request_instance_id,b.request_evidence.request_instance_id);assert.notEqual(sha(canonical(a)),sha(canonical(b)));delete a.request_evidence;delete b.request_evidence;assert.deepEqual(a,b);});
test('request binding immutable including consumer; raw protocol IDs and query not persisted',()=>{const f=fixture(),v=f.raw[0].request_evidence;for(const mutate of [()=>v.request_instance_id='forged',()=>v.consumer.kind='unknown',()=>v.consumer.target.asset='GLD'])assert.throws(mutate);for(const text of ['memory-0','"frame"','"loader"','asset=SPY'])assert.equal(JSON.stringify(safeEvent(f.raw[0])).includes(text),false);});
for(const field of ['consumer','request_instance_id','destination_sha256'])test('getter safe '+field,()=>{const f=fixture(),raw=structuredClone(f.raw[0]);let calls=0;Object.defineProperty(raw.request_evidence,field,{get(){calls++;return null}});assert.throws(()=>safeEvent(raw));assert.equal(calls,0);});
test('present invalid binding rejects without receipt',()=>{const f=fixture(),a=account(f.raw,true,origin);a.ledger[0].event.request_evidence.extra=true;assert.throws(()=>sanitizeProbeAccounting(a,origin));});
test('missing raw identity cannot be invented by receipt',()=>{const f=fixture(),raw=structuredClone(f.raw);delete raw[0].request_evidence;reject(f,[{...f.evidence.records[0],raw_event_sha256:sha(canonical(safeEvent(raw[0])))}],raw);});
test('raw start context and active transition context cannot be supplied by receipt',()=>{const f=fixture(),p={...f.evidence.records[0],request_start_context_sha256:'f'.repeat(64)};reject(f,[p]);});
test('removed navigation and route ping evidence cannot revive an exemption',()=>{const f=fixture();for(const kind of ['navigation','route_ping']){const raw=structuredClone(f.raw[0]);raw.request_evidence.consumer={kind};assert.throws(()=>safeEvent(raw));}for(const field of ['navigation_receipts','route_ping_receipts']){const a=account(f.raw,true,origin);a[field]={records:[]};assert.throws(()=>sanitizeProbeAccounting(a,origin));}});
test('destination privacy hash preserves meaningful query distinctions',()=>{const fp=s=>destinationFingerprint(origin+s,origin);assert.equal(fp('/a?b=2&a=1'),fp('/a?a=1&b=2'));assert.equal(fp('/a?_rsc=one'),fp('/a?_rsc=two'));assert.notEqual(fp('/a?mode=full'),fp('/a?mode=brief'));assert.notEqual(fp('/a?a=1&a=2'),fp('/a?a=2&a=1'));assert.equal(destinationFingerprint('https://other.example/a',origin),null);});
