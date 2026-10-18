// Architecture-specific completion evidence. This module never grants a network-failure exception.
import {canonical,sha,need} from './release-core.mjs';
export const runtimeReceiptSchema='statistical-levels.runtime-transition-evidence.v2';
export const runtimeSpecs=Object.freeze({
 T1:Object.freeze({mode:'LOCAL_STATE_ZERO_NETWORK',from:{asset:'SPY',frequency:'weekly',window:'5Y'},target:{asset:'SPY',frequency:'weekly',window:'3Y'}}),
 T2:Object.freeze({mode:'EXPLICIT_ASSET_JSON',from:{asset:'SPY',frequency:'weekly',window:'5Y'},target:{asset:'GLD',frequency:'weekly',window:'5Y'}}),
 T3:Object.freeze({mode:'LOCAL_STATE_ZERO_NETWORK',from:{asset:'GLD',frequency:'weekly',window:'5Y'},target:{asset:'GLD',frequency:'daily',window:'5Y'}}),
 T4:Object.freeze({mode:'LOCAL_STATE_ZERO_NETWORK',from:{asset:'GLD',frequency:'daily',window:'5Y'},target:{asset:'GLD',frequency:'daily',window:'Full'}}),
});
const equal=(a,b)=>canonical(a).equals(canonical(b));
const exact=(v,keys)=>need(v&&typeof v==='object'&&!Array.isArray(v)&&equal(Object.keys(v).sort(),[...keys].sort()),'RUNTIME_RECEIPT_FIELDS');
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const id=v=>typeof v==='string'&&(/^(?:capture|action)-[a-f0-9-]{36}$/.test(v)||/^(?:page|document|transition)-[1-9][0-9]*$/.test(v)||/^capture-[a-f0-9-]{36}:page-[1-9][0-9]*:document-[1-9][0-9]*:request-[1-9][0-9]*$/.test(v)||/^[a-z][a-z0-9-]*:[a-f0-9-]{36}$/.test(v));
// This identity is minted only by the trusted observer after native consumption
// readback. Hashing makes the retained context replayable, not self-authorizing:
// admission also requires native request/action binding in the enclosing audit.
export function runtimeConsumerIdentity(context){return sha(canonical({schema:'statistical-levels.runtime-consumer.v1',...context}));}
export function classifyRuntimeConsumers(events){
 const consumers=events.filter(e=>e.kind==='PAYLOAD_CONSUMED');
 if(consumers.length===1)return 'EXACT_SINGLE';
 if(consumers.length===0)return 'AMBIGUOUS_CONSUMER';
 const first=consumers[0];
 if(consumers.every(e=>equal(e,first)))return 'DUPLICATE_OBSERVATION';
 if(consumers.some(e=>e.consumer_identity!==first.consumer_identity||e.event_identity!==first.event_identity))return 'CONFLICTING_CONSUMER';
 return 'AMBIGUOUS_CONSUMER';
}
// No deduplication. Even a repeated immutable event is a second material record.
function requireSingleConsumer(events){
 need(Array.isArray(events),'CONSUMER_CARDINALITY_INVALID');
 const consumers=events.filter(e=>e.kind==='PAYLOAD_CONSUMED');
 need(consumers.length===1,'CONSUMER_CARDINALITY_INVALID');return consumers[0];
}
// The v2 network event identity is the retained SHA-256 `identity`, scoped by
// capture/page/document/request. Sequence is a separate immutable reference.
// Repeated representations (even byte-identical ones) are rejected, never
// deduplicated. Terminals inherit intent/action/snapshot/ticker ONLY through
// their unique NETWORK_START and the bound request; extra fields cannot widen
// that ownership. The existing failure/pending summaries are request-ID arrays:
// compare their exact raw projection, then block every failure under Option A.
export function reconstructRuntimeNetworkEvidence(r,source){
 const events=source.events;
 need(Array.isArray(events)&&events.every((e,i)=>e.sequence===i+1),'NETWORK_SEQUENCE_INVALID');
 const starts=events.filter(e=>e.kind==='NETWORK_START');
 const terminals=events.filter(e=>e.kind==='NETWORK_FINISHED'||e.kind==='NETWORK_FAILED');
 const failures=terminals.filter(e=>e.kind==='NETWORK_FAILED');
 const pending=starts.filter(n=>!terminals.some(t=>t.request_instance_id===n.request_instance_id));
 need(Array.isArray(source.failures)&&equal([...source.failures].sort(),failures.map(e=>e.request_instance_id).sort()),'NETWORK_FAILURE_SUMMARY_MISMATCH');
 need(Array.isArray(source.pending)&&equal([...source.pending].sort(),pending.map(e=>e.request_instance_id).sort()),'NETWORK_PENDING_SUMMARY_MISMATCH');
 need(new Set(starts.map(e=>e.request_instance_id)).size===starts.length,'NETWORK_START_CARDINALITY_INVALID');
 need(new Set([...starts,...terminals].map(e=>e.identity)).size===starts.length+terminals.length,'NETWORK_EVENT_IDENTITY_DUPLICATE');
 need(r.requests.length===starts.length,'NETWORK_REQUEST_COVERAGE_INVALID');
 for(const n of starts){
  exact(n,['sequence','kind','request_instance_id','intent_identity','identity','method','destination','timestamp']);
  need(hash(n.identity)&&hash(n.destination)&&Number.isFinite(n.timestamp),'NETWORK_START_IDENTITY_INVALID');
  const claims=r.requests.filter(q=>q.request_instance_id===n.request_instance_id);
  need(claims.length===1,'NETWORK_REQUEST_IDENTITY_INVALID');const q=claims[0];
  need(q.request_instance_id.startsWith(r.capture_id+':'+r.page_identity+':'+r.document_identity+':request-')&&n.intent_identity===q.intent_identity&&n.method===q.method,'NETWORK_START_BINDING_INVALID');
  for(const key of ['action_instance_id','transition_id','page_identity','document_identity','snapshot_identity'])need(q[key]===r[key],'NETWORK_REQUEST_CONTEXT_INVALID');
  need(q.ticker===runtimeSpecs[r.kind].target.asset&&equal(q.query,[['asset',q.ticker],['snapshot',r.snapshot_identity]]),'NETWORK_REQUEST_TARGET_INVALID');
  const issued=events.filter(e=>e.kind==='FETCH_ISSUED');
  need(issued.length===1&&issued[0].intent_identity===n.intent_identity&&issued[0].sequence>r.observation.action_dispatch_sequence&&issued[0].sequence<n.sequence,'NETWORK_START_SEQUENCE_INVALID');
 }
 for(const e of terminals){
  exact(e,['sequence','kind','request_instance_id','identity']);
  need(hash(e.identity),'NETWORK_TERMINAL_IDENTITY_INVALID');
  const matches=starts.filter(n=>n.request_instance_id===e.request_instance_id);
  need(matches.length===1,'NETWORK_UNRESOLVED_TERMINAL');
  need(e.sequence>matches[0].sequence&&e.sequence<r.observation.completion_sequence,'NETWORK_TERMINAL_SEQUENCE_INVALID');
 }
 const states=starts.map(n=>{
  const set=terminals.filter(e=>e.request_instance_id===n.request_instance_id),finished=set.filter(e=>e.kind==='NETWORK_FINISHED'),failed=set.filter(e=>e.kind==='NETWORK_FAILED');
  const classification=finished.length&&failed.length?'CONTRADICTORY_TERMINAL_EVIDENCE':set.length>1?'AMBIGUOUS_TERMINAL_EVIDENCE':finished.length?'EXACT_FINISHED':failed.length?'EXACT_FAILED':'NO_TERMINAL';
  need(set.length===1,'NETWORK_TERMINAL_CARDINALITY_INVALID');
  const q=r.requests.find(q=>q.request_instance_id===n.request_instance_id);
  need(q.terminal===(finished.length?'FINISHED':'FAILED')&&q.response_terminal_identity===set[0].identity,'NETWORK_TERMINAL_CLAIM_MISMATCH');
  need(classification==='EXACT_FINISHED','NETWORK_FAILURE_BLOCKED');
  need(set[0].sequence<q.consumer.validation_sequence&&set[0].sequence<r.commit.state_sequence,'NETWORK_TERMINAL_CONSUMPTION_ORDER');
  return {request_instance_id:n.request_instance_id,classification,finished:finished.length,failed:failed.length};
 });
 need(pending.length===0&&failures.length===0,'NETWORK_INCOMPLETE');
 return {states,pending:pending.length,failures:failures.length,unresolved:0};
}
// No acceptance until the live observer has an independently replayable closed source.
// Callers provide immutable capture evidence; receipt mode is selected ONLY by the fixed specification.
// The observer allocates one closed source per begin/complete action. Its entire
// listener-to-freeze record is the observation boundary, including drain traffic.
// Receipt sequence claims cannot shrink it. There are no outside-boundary rows
// in this source; unrelated application lifetime traffic lives in other sources.
export const runtimeRawEventInventory=Object.freeze({
 LISTENER_START:'GATE_RELEVANT',TRANSITION_START:'GATE_RELEVANT',ACTION_DISPATCH:'GATE_RELEVANT',
 FETCH_ISSUED:'GATE_RELEVANT',NETWORK_START:'GATE_RELEVANT',NETWORK_FINISHED:'GATE_RELEVANT',NETWORK_FAILED:'GATE_RELEVANT',
 PAYLOAD_VALIDATED:'GATE_RELEVANT',HISTORY_COMMIT:'GATE_RELEVANT',PAYLOAD_CONSUMED:'GATE_RELEVANT',STATE_COMMIT:'GATE_RELEVANT',
 RENDER_COMMIT:'GATE_RELEVANT',TRANSITION_COMPLETE:'GATE_RELEVANT',LISTENER_DRAIN:'GATE_RELEVANT',SOURCE_CLOSED:'GATE_RELEVANT',FREEZE:'GATE_RELEVANT',
});
export function reconstructRuntimeRawCensus(r,source){
 const events=source.events,q=r.requests?.[0],t2=r.kind==='T2';
 need(Array.isArray(events),'RAW_CENSUS_INVALID');
 const expected=['LISTENER_START','TRANSITION_START','ACTION_DISPATCH',...(t2?['FETCH_ISSUED','NETWORK_START','NETWORK_FINISHED','PAYLOAD_VALIDATED']:[]),'HISTORY_COMMIT',...(t2?['PAYLOAD_CONSUMED']:[]),'STATE_COMMIT','RENDER_COMMIT','TRANSITION_COMPLETE','LISTENER_DRAIN','SOURCE_CLOSED','FREEZE'];
 const fields={LISTENER_START:[],LISTENER_DRAIN:[],SOURCE_CLOSED:[],FREEZE:[],
 TRANSITION_START:['transition_id','action_instance_id'],TRANSITION_COMPLETE:['transition_id','action_instance_id'],ACTION_DISPATCH:['transition_id','action_instance_id'],
 FETCH_ISSUED:['intent_identity','code_sha256','line','column'],NETWORK_START:['request_instance_id','intent_identity','identity','method','destination','timestamp'],NETWORK_FINISHED:['request_instance_id','identity'],NETWORK_FAILED:['request_instance_id','identity'],
 PAYLOAD_VALIDATED:['intent_identity','object_identity','payload_identity','observer','code_sha256','line','column','request_instance_id'],
 PAYLOAD_CONSUMED:['event_identity','consumer_identity','context','request_instance_id','intent_identity','object_identity','payload_identity','observer'],
 HISTORY_COMMIT:['transition_id','action_instance_id','identity','target','code_sha256','line','column',...(t2||events.some(e=>e.kind==='HISTORY_COMMIT'&&Object.hasOwn(e,'state_commit_identity'))?['state_commit_identity']:[])],
 STATE_COMMIT:['transition_id','action_instance_id','identity','target',...(t2?['consumer_identity','request_instance_id']:[])],
 RENDER_COMMIT:['transition_id','action_instance_id','identity','state_commit_identity','target']};
 const rows=events.map((e,i)=>{
  let owned=e.sequence===i+1&&e.kind===expected[i]&&Object.hasOwn(fields,e.kind);
  if(owned)owned=equal(Object.keys(e).sort(),['sequence','kind',...fields[e.kind]].sort());
  for(const key of ['transition_id','action_instance_id'])if(Object.hasOwn(e,key))owned=owned&&e[key]===r[key];
  for(const key of ['intent_identity','request_instance_id','payload_identity'])if(Object.hasOwn(e,key))owned=owned&&!!q&&e[key]===q[key];
  if(e.kind==='PAYLOAD_CONSUMED')owned=owned&&equal(e.context,q?.consumer?.context);
  return {event_identity:sha(canonical({capture_id:source.capture_id,page_identity:source.page_identity,document_identity:source.document_identity,event:e})),event_type:e.kind,sequence:e.sequence,capture_id:source.capture_id,page_identity:source.page_identity,document_identity:source.document_identity,action_instance_id:e.action_instance_id??e.context?.action_instance_id??null,transition_id:e.transition_id??e.context?.transition_id??null,intent_identity:e.intent_identity??null,request_instance_id:e.request_instance_id??null,snapshot_identity:e.context?.snapshot_identity??null,ticker:e.context?.ticker??null,classification:owned?'OWNED_BY_GOVERNED_TRANSITION':'BLOCKING_FOREIGN_OR_AMBIGUOUS_EVENT',ownership:owned?'EXACT_ARCHITECTURE_BINDING':'UNRESOLVED',gate_relevance:runtimeRawEventInventory[e.kind]??'UNKNOWN'};
 });
 const blocking=rows.filter(e=>e.classification==='BLOCKING_FOREIGN_OR_AMBIGUOUS_EVENT').length;
 const accounting={raw_event_total:rows.length,owned_event_count:rows.length-blocking,explicit_non_gate_event_count:0,blocking_event_count:blocking,unaccounted_event_count:0,rows};
 need(rows.length===expected.length&&blocking===0,'RAW_EVENT_CLOSURE_BLOCKED');
 need(source.closed===true&&source.lost_events===0&&source.exceptions.length===0&&source.failures.length===0&&source.pending.length===0,'RAW_EVENT_OPTION_A_BLOCKED');
 need(r.observation.start_sequence===2&&r.observation.action_dispatch_sequence===3&&r.observation.completion_sequence===expected.length-3,'RAW_BOUNDARY_CLAIM_INVALID');
 return {...accounting,census_digest:sha(canonical(accounting))};
}

export function validateRuntimeTransitionReceipt(r,source,census){
 try{
  if(r?.kind==='T2')requireSingleConsumer(source?.events);
  exact(r,['schema','kind','mode','capture_id','transition_id','action_instance_id','page_identity','document_identity','snapshot_identity','from_state','target_state','observation','requests','commit','product','contradictions']);
  need(r.schema===runtimeReceiptSchema,'RUNTIME_SCHEMA');const spec=runtimeSpecs[r.kind];need(spec&&r.mode===spec.mode,'RUNTIME_MODE');
  for(const k of ['capture_id','transition_id','action_instance_id','page_identity','document_identity'])need(id(r[k]),'RUNTIME_IDENTITY');
  need(hash(r.snapshot_identity)&&equal(r.from_state,spec.from)&&equal(r.target_state,spec.target),'RUNTIME_STATE');
  exact(source,['capture_id','page_identity','document_identity','architecture_identity','observer_identity','closed','events','exceptions','failures','pending','lost_events']);
  need(source.capture_id===r.capture_id&&source.page_identity===r.page_identity&&source.document_identity===r.document_identity,'RUNTIME_SOURCE_IDENTITY');
  const executable=runtimeExecutables.find(w=>w.sha256===source.architecture_identity);
  need(!!executable&&source.observer_identity===sha(ownerFunction)&&source.closed===true&&source.lost_events===0,'RUNTIME_SOURCE_INCOMPLETE');
  reconcileRuntimeNetworkCensus(census,source.events.filter(e=>e.kind==='NETWORK_START'));
  const kinds=new Set(['LISTENER_START','TRANSITION_START','ACTION_DISPATCH','FETCH_ISSUED','NETWORK_START','NETWORK_FINISHED','NETWORK_FAILED','PAYLOAD_VALIDATED','HISTORY_COMMIT','PAYLOAD_CONSUMED','STATE_COMMIT','RENDER_COMMIT','TRANSITION_COMPLETE','LISTENER_DRAIN','SOURCE_CLOSED','FREEZE']);
  need(source.events.every(e=>kinds.has(e.kind)),'RUNTIME_UNSUPPORTED_EVENT');
  need(Array.isArray(source.events)&&source.events.every((e,i)=>e.sequence===i+1),'RUNTIME_EVENT_ORDER');
  need(source.events[0]?.kind==='LISTENER_START'&&source.events.at(-3)?.kind==='LISTENER_DRAIN'&&source.events.at(-2)?.kind==='SOURCE_CLOSED'&&source.events.at(-1)?.kind==='FREEZE','RUNTIME_CLOSE_ORDER');
  reconstructRuntimeNetworkEvidence(r,source);
  const raw_accounting=reconstructRuntimeRawCensus(r,source);
  need(source.exceptions.length===0&&source.failures.length===0&&source.pending.length===0,'RUNTIME_GLOBAL_BLOCKER');
  exact(r.observation,['start_sequence','completion_sequence','action_dispatch_sequence','network_start_sequences']);
  const at=n=>source.events[n-1];const o=r.observation;
  const start=at(o.start_sequence),end=at(o.completion_sequence),dispatch=at(o.action_dispatch_sequence);
  need(start?.kind==='TRANSITION_START'&&end?.kind==='TRANSITION_COMPLETE'&&dispatch?.kind==='ACTION_DISPATCH','RUNTIME_BOUNDARY');
  for(const e of [start,end,dispatch])need(e.transition_id===r.transition_id&&e.action_instance_id===r.action_instance_id,'RUNTIME_ACTION');
  need(o.start_sequence<o.action_dispatch_sequence&&o.action_dispatch_sequence<o.completion_sequence&&o.completion_sequence<source.events.length-2,'RUNTIME_BOUNDARY_ORDER');
  const starts=source.events.filter(e=>e.kind==='NETWORK_START'&&e.sequence>o.start_sequence&&e.sequence<o.completion_sequence);
  need(starts.length===source.events.filter(e=>e.kind==='NETWORK_START').length&&equal(o.network_start_sequences,starts.map(e=>e.sequence))&&Array.isArray(r.requests)&&r.requests.length===starts.length,'RUNTIME_NETWORK_COVERAGE');
  need(new Set(r.requests.map(q=>q.request_instance_id)).size===r.requests.length,'RUNTIME_DUPLICATE_REQUEST');
  exact(r.product,['readiness','metrics','rendered_state_identity','rendered_target','exception','failure']);
  need(r.product.readiness===true&&r.product.metrics===true&&r.product.exception===false&&r.product.failure===false&&hash(r.product.rendered_state_identity)&&equal(r.product.rendered_target,spec.target),'RUNTIME_PRODUCT');
  need(Array.isArray(r.contradictions)&&r.contradictions.length===0,'RUNTIME_CONTRADICTION');
  exact(r.commit,['state_commit_identity','history_state_identity','state_target','url_target','native_history','state_sequence','history_sequence','render_sequence']);
  const c=r.commit;need(hash(c.state_commit_identity)&&hash(c.history_state_identity)&&equal(c.state_target,spec.target)&&equal(c.url_target,spec.target)&&c.native_history===true,'RUNTIME_COMMIT');
  for(const [key,kind,identity]of [['state_sequence','STATE_COMMIT','state_commit_identity'],['history_sequence','HISTORY_COMMIT','history_state_identity'],['render_sequence','RENDER_COMMIT','rendered_state_identity']]){
   need(source.events.filter(e=>e.kind===kind).length===1,'RUNTIME_TERMINAL_CARDINALITY_INVALID');
   const e=at(c[key]);need(e?.kind===kind&&e.transition_id===r.transition_id&&e.action_instance_id===r.action_instance_id&&e.identity===(identity==='rendered_state_identity'?r.product[identity]:c[identity])&&equal(e.target,spec.target)&&e.sequence>o.action_dispatch_sequence&&e.sequence<o.completion_sequence,'RUNTIME_COMMIT_EVENT');
  }
  need(at(c.history_sequence).code_sha256===executable.sha256&&at(c.history_sequence).line===0&&at(c.history_sequence).column===executable.commit,'RUNTIME_HISTORY_WITNESS');
  if(spec.mode==='LOCAL_STATE_ZERO_NETWORK')need(starts.length===0&&!source.events.some(e=>['FETCH_ISSUED','PAYLOAD_VALIDATED','PAYLOAD_CONSUMED'].includes(e.kind)),'LOCAL_STATE_NETWORK');
  else{
   need(starts.length===1,'T2_CARDINALITY');const q=r.requests[0];
   const issued=source.events.filter(e=>e.kind==='FETCH_ISSUED');need(issued.length===1&&issued[0].intent_identity===q.intent_identity&&issued[0].code_sha256===executable.sha256&&issued[0].line===0&&issued[0].column===executable.before_fetch,'T2_PRODUCER_WITNESS');
   exact(q,['request_instance_id','transition_id','action_instance_id','page_identity','document_identity','intent_identity','method','same_origin','endpoint','query','rsc','prefetch','terminal','status','redirect','retry_count','intentional_abort','ticker','snapshot_identity','payload_identity','response_terminal_identity','schema_valid','asset_valid','seasonality_valid','consumer','state_commit_identity']);
   for(const key of ['request_instance_id','intent_identity'])need(id(q[key]),'T2_IDENTITY');
   for(const key of ['transition_id','action_instance_id','page_identity','document_identity','snapshot_identity'])need(q[key]===r[key],'T2_CROSS_IDENTITY');
   need(q.method==='GET'&&q.same_origin===true&&q.endpoint==='/api/statistical-levels/asset'&&equal(q.query,[['asset',spec.target.asset],['snapshot',r.snapshot_identity]]),'T2_REQUEST_CONTRACT');
   need(q.rsc==='NO'&&q.prefetch==='NO'&&q.terminal==='FINISHED'&&Number.isInteger(q.status)&&q.status>=200&&q.status<300&&q.redirect===false&&q.retry_count===0&&q.intentional_abort===false,'T2_LIFECYCLE');
   need(q.ticker===spec.target.asset&&q.schema_valid===true&&q.asset_valid===true&&q.seasonality_valid===true&&hash(q.payload_identity)&&hash(q.response_terminal_identity),'T2_PAYLOAD');
   exact(q.consumer,['identity','context','current_intent','validation_sequence','consumption_sequence']);
   const consumer=q.consumer,consumption=requireSingleConsumer(source.events);
   const context={capture_id:r.capture_id,page_identity:r.page_identity,document_identity:r.document_identity,transition_id:r.transition_id,action_instance_id:r.action_instance_id,intent_identity:q.intent_identity,request_instance_id:q.request_instance_id,payload_identity:q.payload_identity,snapshot_identity:r.snapshot_identity,ticker:q.ticker,phase:'STATE_COMMIT',state_commit_identity:c.state_commit_identity,target_state:spec.target,event_identity:consumption.event_identity};
   need(typeof context.event_identity==='string'&&/^consumer:[a-f0-9-]{36}$/.test(context.event_identity),'CONSUMER_EVENT_IDENTITY_INVALID');
   need(equal(consumption.context,context)&&equal(consumer.context,context)&&consumer.identity===runtimeConsumerIdentity(context)&&consumption.consumer_identity===consumer.identity,'CONSUMER_BINDING_INVALID');
   need(consumer.current_intent===true&&q.state_commit_identity===c.state_commit_identity,'T2_CONSUMPTION');
   need(at(consumer.consumption_sequence)===consumption,'CONSUMER_SEQUENCE_INVALID');
   need(at(c.state_sequence).consumer_identity===consumer.identity&&at(c.state_sequence).request_instance_id===q.request_instance_id,'CONSUMER_STATE_BINDING_INVALID');
   for(const sequence of [c.history_sequence,c.render_sequence])need(at(sequence).state_commit_identity===c.state_commit_identity,'RUNTIME_TERMINAL_STATE_BINDING');
   need(starts[0].request_instance_id===q.request_instance_id&&starts[0].intent_identity===q.intent_identity,'T2_NATIVE_BINDING');
   // Reconstruction above already proved the complete terminal union is exact.
   const terminal=source.events.filter(e=>(e.kind==='NETWORK_FINISHED'||e.kind==='NETWORK_FAILED')&&e.request_instance_id===q.request_instance_id);
   need(terminal.length===1&&terminal[0].identity===q.response_terminal_identity&&terminal[0].sequence>starts[0].sequence,'T2_TERMINAL_BINDING');
   const validations=source.events.filter(e=>e.kind==='PAYLOAD_VALIDATED');
   need(validations.length===1,'T2_VALIDATION_CARDINALITY_INVALID');const validation=validations[0];
   need(at(consumer.validation_sequence)===validation,'T2_VALIDATION_SEQUENCE_INVALID');
   for(const e of [validation,consumption])need(e&&e.request_instance_id===q.request_instance_id&&e.intent_identity===q.intent_identity&&e.payload_identity===q.payload_identity&&e.observer==='DEBUGGER_EXACT_QUALIFIED_CALLSITE','T2_OBSERVER_BINDING');
   need(validation.code_sha256===executable.sha256&&validation.line===0&&validation.column===executable.validated,'T2_VALIDATION_WITNESS');
   need(validation.kind==='PAYLOAD_VALIDATED'&&consumption.kind==='PAYLOAD_CONSUMED'&&validation.sequence>terminal[0].sequence&&consumption.sequence>validation.sequence&&consumption.sequence<=c.state_sequence,'T2_CONSUMPTION_ORDER');
  }
  return {status:'PASS',receipt_sha256:sha(canonical(r)),raw_accounting};
 }catch(error){return {status:'FAIL',issue:/^[A-Z0-9_]+$/.test(error.message)?error.message:'RUNTIME_RECEIPT_INVALID'};}
}

// Exact executable observed from the candidate built with the locked package inputs.
// Qualification must independently review this witness; no automatic enrollment.
export const runtimeExecutable=Object.freeze({sha256:'9b0319f717dec0176dd5f81a79aae34561d58426ce488f11082cbea7685db0db',length:132843,fetch:1976,before_fetch:1970,validated:2199,commit:101087,frames:Object.freeze([1976,101188,103383,23152]),intent:'t',url:'a',payload:'l',alive:'m'});
export const runtimeExecutables=Object.freeze([runtimeExecutable,Object.freeze({sha256:'e56404a5cb4ead2cf7c8970b12ae82572b09e594e3adbd2946daec486d02800c',length:128325,fetch:1995,before_fetch:1989,validated:2218,commit:127222,frames:Object.freeze([1995,127323,100804,23054]),intent:'a',url:'t',payload:'m',alive:'p'}),
 // Cache-invariant repair: native source bytes, exact breakpoints and four call
 // frames independently checked against the locked production build. Validator
 // semantics are unchanged; old witnesses remain for historical receipt replay.
 Object.freeze({sha256:'aef45e0837c44391b35af6083b0fa20f0c970b9456eedcad22ca852302aed82d',length:128439,fetch:1995,before_fetch:1989,validated:2218,commit:127222,frames:Object.freeze([1995,127437,100804,23054]),intent:'a',url:'t',payload:'m',alive:'p'})]);
export function runtimeExecutableMatches(s){return !!s&&runtimeExecutables.some(w=>s.code_sha256===w.sha256&&s.length===w.length)&&s.default_context===true&&s.live_edit===false&&s.start_line===0&&s.start_column===0;}
export function runtimeFetchProven(w,type){const executable=runtimeExecutables.find(e=>e.sha256===w?.script?.code_sha256);return type==='Fetch'&&runtimeExecutableMatches(w?.script)&&w.complete===true&&w.runtime_header_compatible===true&&w.base?.rsc==='NO'&&w.base.prefetch!=='YES'&&Array.isArray(w.frames)&&w.frames.length>=4&&executable.frames.every((column,i)=>w.frames[i].script_sha256===w.script.script_sha256&&w.frames[i].line===0&&w.frames[i].column===column);}

// A native trace is an independent request-start census. dataLossOccurred must
// explicitly be false; an empty CDP request list by itself never proves zero.
export function reconcileRuntimeNetworkCensus(trace,network){
 exact(trace,['started','ended','requests','completion']);
 exact(trace.completion,['dataLossOccurred']);
 need(trace?.completion?.dataLossOccurred===false&&trace.started===true&&trace.ended===true,'RUNTIME_TRACE_INCOMPLETE');
 need(Array.isArray(trace.requests)&&Array.isArray(network),'RUNTIME_TRACE_SCHEMA');
 need(new Set(trace.requests.map(x=>x.identity)).size===trace.requests.length&&new Set(network.map(x=>x.identity)).size===network.length,'RUNTIME_TRACE_DUPLICATE');
 need(trace.requests.length===network.length,'RUNTIME_TRACE_COVERAGE');
 for(const t of trace.requests){
  // Trace rows carry transport identity only. Page/action/intent ownership is
  // reconstructed from the listener source and native request, never an extra
  // trace claim. Unknown ownership fields must not survive this projection.
  exact(t,['identity','method','destination','timestamp']);
  need(hash(t.identity)&&hash(t.destination)&&typeof t.method==='string'&&Number.isFinite(t.timestamp),'RUNTIME_TRACE_SCHEMA');
  const n=network.find(x=>x.identity===t.identity);need(n&&n.method===t.method&&n.destination===t.destination&&Math.round(n.timestamp*1e6)===t.timestamp,'RUNTIME_TRACE_BINDING');
 }
 return true;
}

// Kept separate from application state. The debugger object handles below are
// transient and never serialized. Runtime readback compares object identity,
// rather than accepting an application-reported consumption flag.
const ownerFunction=`function(){const root=document.querySelector('.sl-page');if(!root)throw Error('OWNER_ROOT');const keys=Object.keys(root).filter(k=>k.startsWith('__reactFiber$'));if(keys.length!==1)throw Error('OWNER_KEY');let f=root[keys[0]],climb=new Set();while(f.return){if(climb.has(f))throw Error('OWNER_CYCLE');climb.add(f);f=f.return;}const current=f.stateNode.current,stack=[current],seen=new Set(),owners=[];let snapshot;while(stack.length){const n=stack.pop();if(!n||seen.has(n)||seen.size>=20000)throw Error('OWNER_GRAPH');seen.add(n);if(n.tag===0&&n.memoizedProps?.snapshot&&n.memoizedProps?.initial)snapshot=n.memoizedProps.snapshot;if(n.tag===0&&n.memoizedProps?.asset&&n.memoizedProps?.selection)owners.push(n);if(n.sibling)stack.push(n.sibling);if(n.child)stack.push(n.child);}if(owners.length!==1||!snapshot||current.stateNode.current!==current)throw Error('OWNER_AMBIGUOUS');return {props:owners[0].memoizedProps,snapshot};}`;
export async function createRuntimeObserver(browser,cdp,origin,pageId,randomIdentity){
 const opaque=kind=>kind+':'+randomIdentity();
 const scripts=new Map(),breaks=new Map(),requests=new Map(),records=[],failures=[];
 let executable=null,qualified=null,ready=Promise.resolve(),active=null,lastBinding=null,traceSession=null,traceResolve=null;
 const knownScript=s=>s&&runtimeExecutables.some(w=>s.hash===w.sha256&&s.length===w.length)&&s.startLine===0&&s.startColumn===0&&s.executionContextAuxData?.isDefault===true&&s.isLiveEdit!==true;
 const evaluate=async expression=>{const v=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});need(!v.exceptionDetails,'RUNTIME_READBACK');return v.result.value;};
 const emit=(kind,detail={})=>{if(!active)throw Error('RUNTIME_NO_ACTION');const e={sequence:active.source.events.length+1,kind,...detail};active.source.events.push(e);return e;};
 const reject=code=>{failures.push(code);if(active)active.receipt.contradictions.push(code);};
 async function script(s){
  if(!s)return;scripts.set(s.scriptId,s);
  if(!knownScript(s))return;
  if(qualified&&qualified.scriptId!==s.scriptId){reject('RUNTIME_EXECUTABLE_DUPLICATE');return;}
  executable=runtimeExecutables.find(w=>s.hash===w.sha256);qualified=s;
  ready=(async()=>{
   const actual=await cdp.send('Debugger.getScriptSource',{scriptId:s.scriptId});need(sha(actual.scriptSource)===executable.sha256,'RUNTIME_EXECUTABLE_BYTES');
   for(const [kind,columnNumber]of [['fetch',executable.before_fetch],['validated',executable.validated],['commit',executable.commit]]){
    const b=await cdp.send('Debugger.setBreakpoint',{location:{scriptId:s.scriptId,lineNumber:0,columnNumber}});
    need(b.actualLocation.scriptId===s.scriptId&&b.actualLocation.lineNumber===0&&b.actualLocation.columnNumber===columnNumber,'RUNTIME_BREAKPOINT_EXACT');breaks.set(b.breakpointId,kind);
   }
  })().catch(()=>reject('RUNTIME_OBSERVER_INSTALL'));
  await ready;
 }
 cdp.on('Debugger.paused',event=>{void(async()=>{
  const kind=event.hitBreakpoints?.length===1?breaks.get(event.hitBreakpoints[0]):null;
  if(!kind)return; // Other debugger agents retain ownership of their pauses.
  try{
   if(!active)return;
   const f=event.callFrames[0];need(f.location.scriptId===qualified.scriptId&&f.location.lineNumber===0&&f.location.columnNumber===executable[kind==='fetch'?'before_fetch':kind],'RUNTIME_PAUSE_IDENTITY');
   const value=async(expression,byValue=true)=>{const x=await cdp.send('Debugger.evaluateOnCallFrame',{callFrameId:f.callFrameId,expression,returnByValue:byValue});need(!x.exceptionDetails,'RUNTIME_PAUSE_READ');return byValue?x.result.value:x.result.objectId;};
   if(kind==='fetch'){
    need(active.receipt.kind==='T2'&&!active.intent,'RUNTIME_FETCH_CARDINALITY');
    const v=await value(`({ticker:e,snapshot:s.id,intent:${executable.intent},path:${executable.url}.pathname,origin:${executable.url}.origin,query:[...${executable.url}.searchParams]})`);
    need(v.ticker==='GLD'&&v.snapshot===active.receipt.snapshot_identity&&v.path==='/api/statistical-levels/asset'&&v.origin===origin&&equal(v.query,[['asset','GLD'],['snapshot',v.snapshot]]),'RUNTIME_FETCH_INPUT');
    active.appIntent=v.intent;active.intent=opaque('intent');active.query=v.query;
    emit('FETCH_ISSUED',{intent_identity:active.intent,code_sha256:executable.sha256,line:0,column:f.location.columnNumber});
   }else if(kind==='validated'){
    need(active.receipt.kind==='T2'&&active.intent&&!active.payload,'RUNTIME_VALIDATION_CARDINALITY');
    const v=await value(`({ticker:e,snapshot:s.id,intent:${executable.intent},parsed:r===i,status:n.status,redirected:n.redirected,path:new URL(n.url).pathname,origin:new URL(n.url).origin,content_type:n.headers.get("content-type"),payload_identity:${executable.payload}})`);
    need(v.intent===active.appIntent&&v.parsed===true&&v.ticker==='GLD'&&v.snapshot===active.receipt.snapshot_identity&&v.status>=200&&v.status<300&&!v.redirected&&v.origin===origin&&v.path==='/api/statistical-levels/asset'&&v.content_type?.split(';')[0]==='application/json'&&hash(v.payload_identity),'RUNTIME_VALIDATED_RESPONSE');
    active.payload=await value('r',false);active.objectIdentity=sha(opaque('object'));active.payloadIdentity=v.payload_identity;
    active.validation=emit('PAYLOAD_VALIDATED',{intent_identity:active.intent,object_identity:active.objectIdentity,payload_identity:v.payload_identity,observer:'DEBUGGER_EXACT_QUALIFIED_CALLSITE',code_sha256:executable.sha256,line:0,column:f.location.columnNumber});
   }else{
    need(!active.prepared,'RUNTIME_COMMIT_CARDINALITY');
    const v=await value(`({from:d.current.selection,target:n,current:i===c.current,alive:${executable.alive}.current,native_history:a===true,url:[...new URL(location.href).searchParams].filter(([k])=>["asset","frequency","window"].includes(k)),ticker:e.asset.ticker})`);
    need(equal(v.from,active.receipt.from_state)&&equal(v.target,active.receipt.target_state)&&v.current===true&&v.alive===true&&v.native_history===true&&v.ticker===v.target.asset&&equal(v.url,[['asset',v.target.asset],['frequency',v.target.frequency],['window',v.target.window]]),'RUNTIME_COMMIT_TARGET');
    active.prepared=await value('t',false);
    active.stateIdentity=sha(canonical({action:active.receipt.action_instance_id,state:opaque('state'),target:active.receipt.target_state}));
    active.historyIdentity=sha(canonical({action:active.receipt.action_instance_id,target:v.target,code:executable.sha256}));
    active.history=emit('HISTORY_COMMIT',{transition_id:active.receipt.transition_id,action_instance_id:active.receipt.action_instance_id,identity:active.historyIdentity,state_commit_identity:active.stateIdentity,target:v.target,code_sha256:executable.sha256,line:0,column:f.location.columnNumber});
   }
  }catch{reject('RUNTIME_NATIVE_OBSERVER_FAILURE');}
  finally{await cdp.send('Debugger.resume').catch(()=>reject('RUNTIME_RESUME_FAILURE'));}
 })()});
 function request(e,binding){
  if(binding?.document_proven)lastBinding=binding;
  const record={native:e.requestId,frameId:e.frameId,loaderId:e.loaderId,binding,timestamp:e.timestamp,method:e.request.method,destination:sha(e.request.url),identity:sha(pageId+':'+e.requestId),terminal:'PENDING',status:null};requests.set(e.requestId,record);
  if(!active)return;
  active.network.push(record);
  const start=emit('NETWORK_START',{request_instance_id:binding.request_instance_id,intent_identity:active.intent??'UNKNOWN',identity:record.identity,method:record.method,destination:record.destination,timestamp:record.timestamp});record.start=start;
  if(active.receipt.kind==='T2'){
   const frames=e.initiator?.stack?.callFrames??[];
   record.producer=frames.length>=4&&executable.frames.every((column,i)=>frames[i].scriptId===qualified.scriptId&&frames[i].lineNumber===0&&frames[i].columnNumber===column)&&!e.initiator.stack.parentId;
  }
 }
 function response(e){const r=requests.get(e.requestId);if(r)r.status=e.response.status;}
 function terminal(e,kind){const r=requests.get(e.requestId);if(!r){if(active)reject('RUNTIME_UNRESOLVED_REQUEST');return;}if(r.terminal!=='PENDING'){if(active)reject('RUNTIME_DUPLICATE_TERMINAL');return;}r.terminal=kind;if(active&&active.network.includes(r))r.finished=emit(kind==='FINISHED'?'NETWORK_FINISHED':'NETWORK_FAILED',{request_instance_id:r.binding.request_instance_id,identity:sha(canonical({request:r.binding.request_instance_id,kind,status:r.status,timestamp:e.timestamp}))});}
 async function begin(kind,transitionId,actionId){
  if(!qualified)return false;await ready;const frame=(await cdp.send('Page.getFrameTree')).frameTree?.frame;lastBinding=[...requests.values()].findLast(q=>q.frameId===frame?.id&&q.loaderId===frame?.loaderId)?.binding;need(failures.length===0&&!active&&runtimeSpecs[kind]&&lastBinding?.document_proven,'RUNTIME_BEGIN');
  const owned=await evaluate('(()=>{const {props,snapshot}=('+ownerFunction+')();return {selection:props.selection,snapshot};})()');
  // Serialize public commitments and selection only; payload objects remain remote.
  // The read below replaces the potentially large first value immediately.
  const selected=owned.selection,snapshot=owned.snapshot;
  need(equal(selected,runtimeSpecs[kind].from)&&snapshot.schema==='statistical-levels.runtime-snapshot.v1'&&snapshot.id===sha(canonical({schema:snapshot.schema,manifest_sha256:snapshot.manifest_sha256,records:snapshot.records})),'RUNTIME_INITIAL_STATE');
  const source={capture_id:lastBinding.capture_id,page_identity:pageId,document_identity:lastBinding.document_instance_id,architecture_identity:executable.sha256,observer_identity:sha(ownerFunction),closed:false,events:[],exceptions:[],failures:[],pending:[],lost_events:0};
  const receipt={schema:runtimeReceiptSchema,kind,mode:runtimeSpecs[kind].mode,capture_id:source.capture_id,transition_id:transitionId,action_instance_id:actionId,page_identity:pageId,document_identity:source.document_identity,snapshot_identity:snapshot.id,from_state:selected,target_state:runtimeSpecs[kind].target,observation:null,requests:[],commit:null,product:null,contradictions:[]};
  active={receipt,source,snapshot,network:[],trace:{started:false,ended:false,requests:[],completion:null}};
  emit('LISTENER_START');active.start=emit('TRANSITION_START',{transition_id:transitionId,action_instance_id:actionId});
  if(!traceSession){
   traceSession=await browser.newBrowserCDPSession();
   traceSession.on('Tracing.dataCollected',event=>{try{need(active&&Array.isArray(event.value),'RUNTIME_TRACE_CONTEXT');for(const row of event.value)if(row.name==='ResourceSendRequest'){
    const d=row.args?.data;need(d&&typeof d.requestId==='string'&&typeof d.url==='string'&&Number.isFinite(row.ts),'RUNTIME_TRACE_RECORD');active.trace.requests.push({identity:sha(pageId+':'+d.requestId),destination:sha(d.url),method:d.requestMethod,timestamp:row.ts});
   }}catch{reject('RUNTIME_TRACE_INGRESS');}});
   traceSession.on('Tracing.tracingComplete',value=>{if(!active){reject('RUNTIME_TRACE_ORPHAN');return;}active.trace.completion={dataLossOccurred:value.dataLossOccurred};traceResolve?.();});
  }
  await traceSession.send('Tracing.start',{categories:'devtools.timeline',transferMode:'ReportEvents',options:'record-until-full'});active.trace.started=true;
  active.dispatch=emit('ACTION_DISPATCH',{transition_id:transitionId,action_instance_id:actionId});return true;
 }
 async function complete(kind,readiness){
  if(!qualified)return null;need(active&&active.receipt.kind===kind,'RUNTIME_COMPLETE');const a=active,r=a.receipt;
  try{
   need(readiness===true&&a.prepared&&a.history&&r.contradictions.length===0,'RUNTIME_READINESS');
   const compared=await cdp.send('Runtime.callFunctionOn',{objectId:a.prepared,functionDeclaration:`function(){const {props,snapshot}=(${ownerFunction})();return {same:props.asset===this.asset&&props.seasonality===this.seasonality&&props.selection===this.selection,target:props.selection,snapshot:snapshot.id};}`,returnByValue:true});
   need(!compared.exceptionDetails&&compared.result.value.same===true&&equal(compared.result.value.target,r.target_state)&&compared.result.value.snapshot===r.snapshot_identity,'RUNTIME_CURRENT_STATE_IDENTITY');
   const stateIdentity=a.stateIdentity;need(hash(stateIdentity),'RUNTIME_STATE_IDENTITY');
   if(kind==='T2'){
    need(a.network.length===1&&a.payload&&a.validation&&a.network[0].producer===true,'RUNTIME_T2_PRODUCER');const q=a.network[0];
    const intended=new URL('/api/statistical-levels/asset',origin);intended.searchParams.set('asset','GLD');intended.searchParams.set('snapshot',r.snapshot_identity);
    need(q.destination===sha(intended.href)&&q.method==='GET','RUNTIME_NETWORK_DESTINATION');
    need(q.terminal==='FINISHED'&&q.finished&&q.status>=200&&q.status<300&&q.binding.page_id===pageId&&q.binding.document_instance_id===r.document_identity,'RUNTIME_T2_TERMINAL');
    const parsed=await cdp.send('Network.getResponseBody',{requestId:q.native});const body=JSON.parse(parsed.base64Encoded?Buffer.from(parsed.body,'base64').toString('utf8'):parsed.body);
    const expected=a.snapshot.records.GLD;
    need(equal(Object.keys(body).sort(),['asset','schema','seasonality','snapshot','ticker'])&&body.schema==='statistical-levels.runtime-asset.v1'&&body.ticker==='GLD'&&body.asset.ticker==='GLD'&&body.seasonality.asset==='GLD'&&body.snapshot===r.snapshot_identity&&sha(canonical(body.asset))===expected.asset&&sha(canonical(body.seasonality))===expected.seasonality&&sha(canonical(body))===a.payloadIdentity,'RUNTIME_INDEPENDENT_PAYLOAD');
    const same=await cdp.send('Runtime.callFunctionOn',{objectId:a.payload,functionDeclaration:`function(){const {props}=(${ownerFunction})();return props.asset===this.asset&&props.seasonality===this.seasonality&&props.runtimeCommit?.asset===this.asset&&props.runtimeCommit?.seasonality===this.seasonality;}`,returnByValue:true});
    need(!same.exceptionDetails&&same.result.value===true,'RUNTIME_POSITIVE_CONSUMPTION');a.validation.request_instance_id=q.binding.request_instance_id;
    const context=Object.freeze({capture_id:r.capture_id,page_identity:pageId,document_identity:r.document_identity,transition_id:r.transition_id,action_instance_id:r.action_instance_id,intent_identity:a.intent,request_instance_id:q.binding.request_instance_id,payload_identity:a.payloadIdentity,snapshot_identity:r.snapshot_identity,ticker:'GLD',phase:'STATE_COMMIT',state_commit_identity:stateIdentity,target_state:r.target_state,event_identity:opaque('consumer')});
    a.consumerIdentity=runtimeConsumerIdentity(context);
    const consumption=emit('PAYLOAD_CONSUMED',{event_identity:context.event_identity,consumer_identity:a.consumerIdentity,context,request_instance_id:q.binding.request_instance_id,intent_identity:a.intent,object_identity:a.objectIdentity,payload_identity:a.payloadIdentity,observer:'DEBUGGER_EXACT_QUALIFIED_CALLSITE'});
    r.requests=[{request_instance_id:q.binding.request_instance_id,transition_id:r.transition_id,action_instance_id:r.action_instance_id,page_identity:pageId,document_identity:r.document_identity,intent_identity:a.intent,method:q.method,same_origin:true,endpoint:'/api/statistical-levels/asset',query:a.query,rsc:'NO',prefetch:'NO',terminal:q.terminal,status:q.status,redirect:false,retry_count:0,intentional_abort:false,ticker:'GLD',snapshot_identity:r.snapshot_identity,payload_identity:a.payloadIdentity,response_terminal_identity:q.finished.identity,schema_valid:true,asset_valid:true,seasonality_valid:true,consumer:{identity:a.consumerIdentity,context,current_intent:true,validation_sequence:a.validation.sequence,consumption_sequence:consumption.sequence},state_commit_identity:stateIdentity}];
   }
   const state=emit('STATE_COMMIT',{transition_id:r.transition_id,action_instance_id:r.action_instance_id,identity:stateIdentity,target:r.target_state,...(kind==='T2'?{consumer_identity:a.consumerIdentity,request_instance_id:a.network[0].binding.request_instance_id}:{})});
   const renderIdentity=sha(canonical({action:r.action_instance_id,target:r.target_state,readiness:true}));const render=emit('RENDER_COMMIT',{transition_id:r.transition_id,action_instance_id:r.action_instance_id,identity:renderIdentity,state_commit_identity:stateIdentity,target:r.target_state});
   r.commit={state_commit_identity:stateIdentity,history_state_identity:a.historyIdentity,state_target:r.target_state,url_target:r.target_state,native_history:true,state_sequence:state.sequence,history_sequence:a.history.sequence,render_sequence:render.sequence};
   r.product={readiness:true,metrics:true,rendered_state_identity:renderIdentity,rendered_target:r.target_state,exception:false,failure:false};
   const end=emit('TRANSITION_COMPLETE',{transition_id:r.transition_id,action_instance_id:r.action_instance_id});r.observation={start_sequence:a.start.sequence,completion_sequence:end.sequence,action_dispatch_sequence:a.dispatch.sequence,network_start_sequences:a.network.map(x=>x.start.sequence)};
   emit('LISTENER_DRAIN');let timer;const closed=new Promise(resolve=>traceResolve=resolve);await traceSession.send('Tracing.end');a.trace.ended=true;
   try{await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('RUNTIME_TRACE_TIMEOUT')),10000);})]);}finally{clearTimeout(timer);traceResolve=null;}
   reconcileRuntimeNetworkCensus(a.trace,a.network);emit('SOURCE_CLOSED');a.source.closed=true;emit('FREEZE');
   a.source.failures=a.network.filter(q=>q.terminal==='FAILED'||q.status>=400).map(q=>q.binding.request_instance_id);a.source.pending=a.network.filter(q=>q.terminal==='PENDING').map(q=>q.binding.request_instance_id);
   const record={receipt:r,source:a.source,census:a.trace};records.push(record);return record;
  }catch(error){reject(/^[A-Z0-9_]+$/.test(error.message)?error.message:'RUNTIME_OBSERVER_FAILURE');records.push({receipt:r,source:a.source,census:a.trace});throw Error('RUNTIME_OBSERVER_INCOMPLETE');}
  finally{if(a.trace.started&&!a.trace.ended)await traceSession.send('Tracing.end').catch(()=>{});for(const objectId of [a.prepared,a.payload].filter(Boolean))await cdp.send('Runtime.releaseObject',{objectId}).catch(()=>{});active=null;}
 }
 return {script,unsupported:()=>reject('UNSUPPORTED_NETWORK_TRANSPORT'),navigate:()=>{if(active)reject('RUNTIME_DOCUMENT_CHANGED');qualified=null;},request,response,terminal,begin,complete,supported:()=>qualified!==null,records:()=>structuredClone(records),failures:()=>[...failures],exception:()=>{if(active)active.source.exceptions.push('APPLICATION_EXCEPTION');}};
}
