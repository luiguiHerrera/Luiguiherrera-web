import {createRequestInstanceCollector} from '../scripts/probe-request-instances.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createTransitionCapture,transitions,transitionSchema,validateTransitionReceipts,transitionClass} from '../scripts/probe-transition-receipts.mjs';
import {account,safeEvent} from '../scripts/network-accounting.mjs';
const origin='https://luiguiherrera-receiptfixture-luigui-herrera-s-projects.vercel.app';
export function receiptFixture(kind='T1',changes={}) {
 const c=createTransitionCapture(origin),spec=transitions[kind],url=origin+spec.route+'?'+new URLSearchParams(spec.target_state),request={requestId:'request',frameId:'memory-frame',loaderId:'memory-loader',documentURL:origin+spec.route,request:{url,method:'GET',headers:{RSC:'1'}},type:'Fetch'};
 const raw={kind:'request_failure',url,type:'Fetch',rsc:true,prefetch:false,canceled:true,error_code:'net::ERR_ABORTED'};
 if(changes.request)changes.request(request);if(changes.raw)changes.raw(raw);
 if(changes.before)c.request('page-1','request',request,'ACTIVE',raw.request_evidence);
 const id=c.start('page-1',kind,changes.context??spec,'ACTIVE');
 const binding=createRequestInstanceCollector(origin).request('page-1',request,changes.context??spec,id);raw.request_evidence=binding;
 if(!changes.before&&!changes.after)c.request('page-1','request',request,'ACTIVE',raw.request_evidence);
 if(changes.two)c.request('page-1','request-2',request,'ACTIVE',binding);
 if(changes.duplicate)c.request('page-1','request',request,'ACTIVE',raw.request_evidence);
 if(changes.overlap)c.start('page-1','T2',transitions.T2,'ACTIVE');
 if(changes.exception)c.exception('page-1');
 if(!changes.abortFirst)c.response('page-1','request',changes.status??200,'ACTIVE');
 c.failure('page-1','request',{canceled:raw.canceled,errorText:raw.error_code},0,changes.lifecycle??'ACTIVE');
 if(changes.abortFirst)c.response('page-1','request',200,'ACTIVE');
 c.complete('page-1',kind,{metric:changes.metric??true,readiness:changes.readiness??true,productFailure:changes.productFailure??false},changes.lifecycle??'ACTIVE');
 if(changes.after)c.request('page-1','request',request,'ACTIVE',raw.request_evidence);
 return {c,raw,evidence:c.evidence([safeEvent(raw)])};
}
for(const kind of Object.keys(transitions))test('A '+kind+' exact local receipt exempts only its bound raw event without global product pass',()=>{
 const {raw,evidence}=receiptFixture(kind);assert.equal(evidence.records.length,1);const result=account([raw],false,origin,evidence);assert.equal(result.required_application_request_failures,0);assert.equal(result.ledger[0].classification,transitionClass);
 assert.equal(account([raw],true,origin).required_application_request_failures,1);
});
const negatives={
 'B wrong target':{request:r=>r.request.url=r.request.url.replace('window=3Y','window=Full')},
 'C metric failure':{metric:false},'C first product failure':{productFailure:true},'D readiness failure':{readiness:false},'E starts before':{before:true},'F starts after':{after:true},
 'G two candidate requests':{two:true},'H duplicate request identity':{duplicate:true},'H overlapping transitions':{overlap:true},
 'I non-2xx':{status:500},'J abort before response':{abortFirst:true},'K other error':{raw:r=>r.error_code='net::ERR_FAILED'},'K not canceled':{raw:r=>r.canceled=false},
 'L closing':{lifecycle:'CLOSING'},'L closed':{lifecycle:'CLOSED'},'M application exception':{exception:true},'N missing action':{context:{}},
 'O cross-origin':{request:r=>r.request.url=r.request.url.replace(origin,'https://other.example')},'P non-RSC':{request:r=>r.request.headers={}},
 'Q prefetch mismatch':{request:r=>r.request.headers['Next-Router-Prefetch']='1',raw:r=>r.prefetch=true},'non-GET':{request:r=>r.request.method='POST'},
};
for(const [name,changes]of Object.entries(negatives))test(name+' cannot authorize application PASS',()=>{
 const {raw,evidence}=receiptFixture('T1',changes);assert.equal(evidence.records.length,0);
 if(evidence.capture_issues.length)assert.throws(()=>account([raw],true,origin,evidence),/TRANSITION_RECEIPT_INVALID|REQUEST_INSTANCE_INVALID/);
 else assert.equal(account([raw],true,origin,evidence).required_application_request_failures,1);
});
for(const mutate of [e=>e.records[0].target_state={...e.records[0].target_state,window:'Full'},e=>e.records[0].event_index=1,e=>e.records.push({...e.records[0],transition_id:'transition-2'}),e=>e.records[0].response_sequence=e.records[0].abort_sequence,e=>e.extra=true,e=>e.records[0].extra=true])test('R malformed or ambiguous proof fails closed',()=>{
 const {raw,evidence}=receiptFixture();mutate(evidence);assert.throws(()=>validateTransitionReceipts(evidence,[safeEvent(raw)]),/TRANSITION_RECEIPT_INVALID|REQUEST_INSTANCE_INVALID/);
});
test('R getters are never evaluated',()=>{const {raw,evidence}=receiptFixture();let calls=0;Object.defineProperty(evidence.records[0],'metric_pass',{get(){calls++;return true;}});assert.throws(()=>account([raw],true,origin,evidence));assert.equal(calls,0);});
test('a required consumer with prefetch headers always remains an application failure',()=>{const raw={kind:'request_failure',url:origin+'/required',type:'XHR',rsc:true,prefetch:true,canceled:true,error_code:'net::ERR_ABORTED'};for(const passed of [false,true])assert.equal(account([raw],passed,origin,{schema_version:transitionSchema,records:[],capture_issues:[]}).required_application_request_failures,1);});
