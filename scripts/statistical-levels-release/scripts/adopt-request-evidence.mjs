// ADOPT companion to the existing request identities and strict T1–T4 receipts.
// No request headers, cookies, query values, bodies, raw CDP IDs or stacks persist.
import { createRequestInstanceCollector, validateRequestEvidence, startContextFingerprint, destinationFingerprint } from './probe-request-instances.mjs';
import { createTransitionCapture, transitions, requireReceiptData } from './probe-transition-receipts.mjs';
import { actionControls, listenerMarker, selectionExpression, newAction, initiatorScripts, classifyRequestSignals, classificationEvidence, causalDecision, scriptFingerprint, nativeIntentSignals, nativeNavigationProven, nativeFrameworkPrefetchProven, requestRole } from './adopt-causal-bridge.mjs';
import { account, safeEvent, sourceURLObservation, validateFailureEvidence, networkEventTypes, unresolvedNetworkEvidence, nativeIngressTypes, ingressFailureEvidence, irrelevantNativeLevels } from './network-accounting.mjs';
import { canonical, sha } from './release-core.mjs';
import { runtimeFetchProven, runtimeExecutableMatches, validateRuntimeTransitionReceipt } from './runtime-transition-receipts.mjs';
const equal = (a,b) => canonical(a).equals(canonical(b));
const clone = x => JSON.parse(canonical(x));
const unknown = 'UNKNOWN';
const terminalKinds = ['FINISHED','FAILED','REDIRECTED'];
// Closed replay vocabulary: an unsupported observation must never disappear
// through the lifecycle-specific filters below, even when all IDs reconcile.
const journalKinds = new Set([
  'LISTENER_START','LISTENER_DRAIN','SOURCE_CLOSED','ACCOUNTING_FREEZE','LISTENER_STOP',
  'PAGE_LIFECYCLE','TRANSITION_START','TRANSITION_COMPLETE',
  'ACTION_COMPILED','ACTION_START','ACTION_DISPATCHED',
  'REQUEST','RESPONSE','FAILED','FINISHED','REDIRECTED',
  'APPLICATION_EXCEPTION','EXCEPTION_DUPLICATE','NATIVE_DUPLICATE','NATIVE_INGRESS','NATIVE_SCRIPT_INGRESS',
]);
const requestIdentity=r=>Object.fromEntries(['request_id','request_evidence','metadata','protocol_request_sha256','rsc_classification','prefetch_classification','classification_evidence','initiator_scripts','initiator','causal_parent','causal_relation','redirect_parent_id','transition_id','transition_type',...(r.native_intent?['native_intent']:[]),...(r.request_context_binding?['request_context_binding']:[])].map(k=>[k,r[k]]));
// Closed outer-journal contracts. Optional claims are assertions, never authority.
// All unlisted fields (including ownership aliases and nested metadata) are forbidden.
const contract=(required,optional=[])=>Object.freeze({required:Object.freeze(['sequence','kind',...required]),optional:Object.freeze(optional)});
const ingressFields=['page_id','native_event_type','native_event_received','identity_status','interpretation_status','conversion_sequences','accounting_indices','event_id'];
const ingressOptional=['materialization_status','materialization_field','materialization_operation','original_sequence'];
const networkFields=['request_id','page_id','page_lifecycle','timestamp'];
const networkOptional=['native_ingress_id','transition_id','action_instance_id'];
const unresolvedFields=['identity_reason','rsc','prefetch','resource_type','status','redirect_status','canceled','error_code','unresolved_evidence','accounting_index'];
export const outerJournalOwnershipContracts=Object.freeze({
 LISTENER_START:contract(['page_id']),LISTENER_DRAIN:contract(['page_id']),SOURCE_CLOSED:contract(['page_id']),LISTENER_STOP:contract(['page_id']),
 ACCOUNTING_FREEZE:contract([]),PAGE_LIFECYCLE:contract(['page_id','value']),
 TRANSITION_START:contract(['transition_id','page_id','transition_type'],['action_instance_id']),
 TRANSITION_COMPLETE:contract(['transition_id','page_id','transition_type'],['action_instance_id']),
 ACTION_COMPILED:contract(['action_instance_id','transition_id','page_id','script_sha256'],['tested_action_id']),
 ACTION_START:contract(['action_instance_id','transition_id','page_id'],['tested_action_id']),
 ACTION_DISPATCHED:contract(['action_instance_id','dispatch_ack','event_seen','listener_calls'],['page_id','transition_id','tested_action_id']),
 REQUEST:contract([...networkFields,'request_identity_sha256','rsc','prefetch','classification_evidence','transition_id'],['native_ingress_id','action_instance_id']),
 // Older independently captured journals omitted this transport annotation.
 // Absence remains valid; a present, resolved type must agree with the request.
 RESPONSE:contract([...networkFields,'status'],[...networkOptional,'resource_type']),
 FAILED:contract([...networkFields,'canceled','error_code'],[...networkOptional,'resource_type']),
 FINISHED:contract(networkFields,networkOptional),
 REDIRECTED:contract([...networkFields,'status'],networkOptional),
 APPLICATION_EXCEPTION:contract(['page_id','page_lifecycle','failure_evidence','source_observation','safe_event'],['native_ingress_id','transition_id']),
 EXCEPTION_DUPLICATE:contract(['page_id','page_lifecycle','failure_id','native_event_id','native_event_type','original_sequence','source_observation','safe_event'],['native_ingress_id','transition_id']),
 NATIVE_DUPLICATE:contract(['page_id','page_lifecycle','original_sequence'],['native_ingress_id','related_request_id','native_event_type','timestamp','status','resource_type','canceled','error_code','unresolved_event_id','identity_basis','unresolved_evidence','transition_id','action_instance_id']),
 NATIVE_INGRESS:contract(ingressFields,[...ingressOptional,'irrelevant_native_level','failure_evidence']),
 NATIVE_SCRIPT_INGRESS:contract(ingressFields,[...ingressOptional,'script']),
});

// Optional caller claims are one bundle. Presence requires independent proof;
// falsy claims cannot turn a malformed bundle into an absent witness.
function validateOwnershipBundle(w,request,evidence,check) {
 const keys=['caller','initiator_type','action_owned'];
 if(!keys.some(key=>Object.hasOwn(w,key)))return;
 const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const exact=(value,names)=>object(value)&&Object.keys(value).length===names.length&&names.every(key=>Object.hasOwn(value,key));
 const complete=keys.every(key=>Object.hasOwn(w,key));
 check(complete,'OWNERSHIP_BUNDLE_INCOMPLETE');
 const callerValid=exact(w.caller,['sequence','script'])&&Number.isSafeInteger(w.caller.sequence)&&w.caller.sequence>0&&
  exact(w.caller.script,['script_sha256','code_sha256','length','start_line','start_column','default_context','live_edit']);
 check(callerValid,'OWNERSHIP_CALLER_INVALID');
 check(typeof w.initiator_type==='string'&&['parser','script','preload','preflight','other','UNKNOWN'].includes(w.initiator_type),'OWNERSHIP_INITIATOR_TYPE_INVALID');
 check(typeof w.action_owned==='boolean','OWNERSHIP_ACTION_OWNED_INVALID');
 if(!complete||!callerValid)return;
 const caller=evidence.journal.find(row=>row.sequence===w.caller.sequence);
 const resolved=caller?.kind==='NATIVE_SCRIPT_INGRESS'&&caller.interpretation_status==='INTERPRETED'&&
  caller.sequence<request.event_sequences[0]&&caller.page_id===request.request_evidence.page_id;
 check(resolved,'OWNERSHIP_REFERENCE_UNRESOLVED');
 check(resolved&&equal(caller.script,w.caller.script),'OWNERSHIP_CLAIM_CONTRADICTION');
 check(w.frames[4]?.script_sha256===w.caller.script.script_sha256&&w.frames[4]?.script_sha256!==w.frames[0]?.script_sha256,'OWNERSHIP_CALLER_ANCESTRY_MISMATCH');
 check(w.initiator_type===request.initiator.type,'OWNERSHIP_CLAIM_CONTRADICTION');
 check(w.action_owned===evidence.actions.some(action=>action.page_id===request.request_evidence.page_id&&request.initiator_scripts.scripts.includes(action.script_sha256)),'OWNERSHIP_CLAIM_CONTRADICTION');
}

// Replay the complete raw journal without receipt ownership, normalized tuples,
// or caller consistency flags. Return issues only; never sanitize evidence.
export function auditOuterJournalOwnership(evidence){
 const issues=[],check=(ok,code)=>{if(!ok)issues.push(code);};
 const fields=(v,required,optional=[])=>{
  const valid=v&&typeof v==='object'&&!Array.isArray(v);
  check(valid&&required.every(k=>Object.hasOwn(v,k)),'OWNERSHIP_REQUIRED_FIELD_MISSING');
  if(valid)check(Object.keys(v).every(k=>required.includes(k)||optional.includes(k)),'OWNERSHIP_UNKNOWN_FIELD');
 };
 try{
  requireReceiptData(evidence);
  const index=(rows,key)=>{const out=new Map();for(const row of rows){check(!out.has(row[key]),'OWNERSHIP_AMBIGUOUS_REFERENCE');out.set(row[key],row);}return out;};
  const actions=index(evidence.actions,'action_instance_id'),transitionsById=index(evidence.transitions,'transition_id'),requests=index(evidence.requests,'request_id'),journal=index(evidence.journal,'sequence');
  const ingresses=index(evidence.journal.filter(e=>['NATIVE_INGRESS','NATIVE_SCRIPT_INGRESS'].includes(e.kind)),'event_id');
  const listeners=new Set(),active=new Map();
  const agree=(value,canonicalValue)=>check(canonicalValue!==undefined&&equal(value,canonicalValue),'OWNERSHIP_CLAIM_CONTRADICTION');
  const actionTuple=a=>{
   check(!!a,'OWNERSHIP_REFERENCE_UNRESOLVED');if(!a)return {};
   fields(a,['action_instance_id','transition_id','kind','tested_action_id','page_id','script_sha256','source_sha256','source_url_sha256','dispatch_ack','event_seen','listener_calls']);
   const control=actionControls[a.kind];
   agree(a.source_sha256,control?sha(control.type==='CLICK'?listenerMarker:selectionExpression(a.kind)):undefined);
   const t=transitionsById.get(a.transition_id);check(!!t,'OWNERSHIP_REFERENCE_UNRESOLVED');
   if(t){agree(a.page_id,t.page_id);agree(a.action_instance_id,t.action_instance_id);agree(a.kind,t.kind);agree(a.tested_action_id,transitions[t.kind]?.action_id);}
   return {page_id:t?.page_id,transition_id:t?.transition_id,action_instance_id:t?.action_instance_id,tested_action_id:transitions[t?.kind]?.action_id,script_sha256:a.script_sha256};
  };
  const requestTuple=r=>{
   check(!!r,'OWNERSHIP_REFERENCE_UNRESOLVED');if(!r)return {};
   fields(r,['request_id','request_evidence','metadata','protocol_request_sha256','rsc','prefetch','classification_evidence','rsc_classification','prefetch_classification','initiator_scripts','initiator','causal_parent','causal_relation','redirect_parent_id','transition_id','transition_type','causality_status','terminal_state','event_sequences','accounting_indices','action_instance_id','action_ancestry','consumer'],['native_intent','request_context_binding','request_role']);
   fields(r.metadata,['origin','path_sha256','query_keys','method','type']);
   fields(r.classification_evidence,['rsc','prefetch']);fields(r.initiator_scripts,['complete','scripts']);
   fields(r.initiator,['type','frames','parent_protocol_sha256']);
   for(const frame of r.initiator.frames)fields(frame,['script_sha256','line','column']);
   if(r.request_context_binding)fields(r.request_context_binding,['source','action_instance_id','observed_context_sha256']);
   if(r.native_intent){
    fields(r.native_intent,['base','header_compatible','frames','complete','script_sequence','script'],['runtime_header_compatible','caller','initiator_type','action_owned']);
    fields(r.native_intent.base,['rsc','prefetch']);
    for(const frame of r.native_intent.frames)fields(frame,['script_sha256','line','column']);
    if(r.native_intent.script)fields(r.native_intent.script,['script_sha256','code_sha256','length','start_line','start_column','default_context','live_edit']);
   }
   const b=validateRequestEvidence(r.request_evidence),decision=causalDecision(r,evidence.actions,evidence.requests);
   if(r.request_context_binding){const cb=r.request_context_binding;
    if(cb.source==='NATIVE_ACTION_ANCESTRY')agree(cb.action_instance_id,decision.action_instance_id);
    else {agree(cb.source,'OBSERVED_CONTEXT');agree(cb.action_instance_id,unknown);}
   }
   if(r.native_intent){const w=r.native_intent;
    if(w.script===null)agree(w.script_sequence,null);
    else {const observed=journal.get(w.script_sequence);check(observed?.kind==='NATIVE_SCRIPT_INGRESS'&&observed.sequence<r.event_sequences[0]&&observed.interpretation_status==='INTERPRETED','OWNERSHIP_REFERENCE_UNRESOLVED');agree(observed?.page_id,b.page_id);agree(w.script,observed?.script);}
   }
   if(r.native_intent)validateOwnershipBundle(r.native_intent,r,evidence,check);
   agree(r.request_id,b.request_instance_id);agree(r.transition_id,b.active_transition_id??unknown);agree(r.action_instance_id,decision.action_instance_id);
   const tuple={request_id:b.request_instance_id,page_id:b.page_id,transition_id:b.active_transition_id??unknown,action_instance_id:decision.action_instance_id};
   if(tuple.transition_id!==unknown){const t=transitionsById.get(tuple.transition_id);check(!!t,'OWNERSHIP_REFERENCE_UNRESOLVED');if(t){agree(tuple.page_id,t.page_id);agree(r.transition_type,t.kind);}}
   if(tuple.action_instance_id!==unknown){const a=actionTuple(actions.get(tuple.action_instance_id));agree(tuple.page_id,a.page_id);agree(tuple.transition_id,a.transition_id);}
   return tuple;
  };
  for(const t of transitionsById.values()){
   fields(t,['transition_id','page_id','kind','context','action_instance_id','completion'],['runtime_proof']);fields(t.context,['suite_id','test_id','action_id']);
   if(t.completion)fields(t.completion,['readiness','metric','product_failure']);
   if(t.runtime_proof)fields(t.runtime_proof,['receipt','source','census']);
  }
  for(const a of actions.values())actionTuple(a);
  for(const r of requests.values())requestTuple(r);
  for(const [i,e]of evidence.journal.entries()){
   agree(e.sequence,i+1);
   const c=outerJournalOwnershipContracts[e.kind];check(!!c,'OWNERSHIP_UNKNOWN_EVENT');if(!c)continue;
   // Unresolved native observations have a distinct emitted schema, and always
   // block. They cannot borrow optional fields from the resolved contracts.
   const unresolved=Object.hasOwn(networkEventTypes,e.kind)&&e.request_id===unknown;
   if(unresolved)fields(e,[...networkFields,...unresolvedFields],['native_ingress_id']);
   else fields(e,c.required,c.optional);
   let tuple={};
   if(e.kind==='LISTENER_START'){check(/^page-[1-9][0-9]*$/.test(e.page_id)&&!listeners.has(e.page_id),'OWNERSHIP_SOURCE_INVALID');listeners.add(e.page_id);}
   if(e.kind!=='ACCOUNTING_FREEZE'&&e.kind!=='ACTION_DISPATCHED')check(listeners.has(e.page_id),'OWNERSHIP_SOURCE_UNRESOLVED');
   if(e.kind.startsWith('ACTION_'))tuple=actionTuple(actions.get(e.action_instance_id));
   else if(e.kind.startsWith('TRANSITION_')){
    const t=transitionsById.get(e.transition_id);check(!!t,'OWNERSHIP_REFERENCE_UNRESOLVED');
    tuple={page_id:t?.page_id,transition_id:t?.transition_id,action_instance_id:t?.action_instance_id,transition_type:t?.kind};
    if(t?.action_instance_id!==unknown){const a=actionTuple(actions.get(t?.action_instance_id));agree(t?.page_id,a.page_id);agree(t?.transition_id,a.transition_id);}
   }else if(Object.hasOwn(networkEventTypes,e.kind)&&e.request_id!==unknown){
    const request=requests.get(e.request_id);tuple=requestTuple(request);
    if(e.resource_type!==undefined&&e.resource_type!==unknown)agree(e.resource_type,request?.metadata.type);
    if(e.kind==='REQUEST')for(const k of ['request_identity_sha256','rsc','prefetch','classification_evidence','transition_id'])check(Object.hasOwn(e,k),'OWNERSHIP_REQUIRED_FIELD_MISSING');
    // Resolved observations must not smuggle an unresolved binding or identity.
    for(const k of unresolvedFields.filter(k=>!['rsc','prefetch','resource_type','status','canceled','error_code'].includes(k)))check(!Object.hasOwn(e,k),'OWNERSHIP_CONFLICTING_REFERENCE');
   }else if(Object.hasOwn(networkEventTypes,e.kind)){
    check(false,'OWNERSHIP_REFERENCE_UNRESOLVED');
    if(e.unresolved_evidence)agree(e.unresolved_evidence,unresolvedNetworkEvidence(e));
   }else if(e.kind==='NATIVE_DUPLICATE'){
    const original=journal.get(e.original_sequence);check(original&&original.sequence<e.sequence,'OWNERSHIP_REFERENCE_UNRESOLVED');
    tuple=original?.request_id&&original.request_id!==unknown?requestTuple(requests.get(original.request_id)):{page_id:original?.page_id};
    if(e.related_request_id!==undefined)agree(e.related_request_id,tuple.request_id);
    if(e.native_event_type!==undefined)agree(e.native_event_type,original?.kind);
    for(const k of ['timestamp','status','resource_type','canceled','error_code'])if(Object.hasOwn(e,k))agree(e[k],original?.[k]);
    if(!e.unresolved_evidence)check(e.related_request_id!==undefined&&e.native_event_type!==undefined&&e.timestamp!==undefined,'OWNERSHIP_REQUIRED_FIELD_MISSING');
    if(e.unresolved_evidence){fields(e,['sequence','kind','page_id','page_lifecycle','original_sequence','unresolved_event_id','identity_basis','unresolved_evidence'],['native_ingress_id']);agree(e.identity_basis,'SAME_NATIVE_OBJECT');}
    else for(const k of ['identity_basis','unresolved_event_id'])check(!Object.hasOwn(e,k),'OWNERSHIP_CONFLICTING_REFERENCE');
    if(e.unresolved_evidence){agree(e.unresolved_evidence,original?.unresolved_evidence);agree(e.unresolved_event_id,original?.unresolved_evidence?.event_id);}
   }else if(e.kind==='APPLICATION_EXCEPTION'||e.kind==='EXCEPTION_DUPLICATE'){
    const original=e.kind==='APPLICATION_EXCEPTION'?e:journal.get(e.original_sequence);
    check(original?.kind==='APPLICATION_EXCEPTION','OWNERSHIP_REFERENCE_UNRESOLVED');
    const f=validateFailureEvidence(original?.failure_evidence);
    tuple={page_id:original?.page_id,transition_id:e.kind==='APPLICATION_EXCEPTION'?(active.get(e.page_id)??unknown):f.observed_transition_id};
    if(e.kind==='APPLICATION_EXCEPTION'){
     agree(f.page_id,tuple.page_id);agree(f.observed_transition_id,tuple.transition_id);
     if(f.related_request_id!==unknown){const r=requests.get(f.related_request_id),q=requestTuple(r);agree(f.page_id,q.page_id);agree(f.parent_protocol_sha256,r?.protocol_request_sha256);check(r?.event_sequences[0]<e.sequence,'OWNERSHIP_REFERENCE_UNRESOLVED');}
    }else {check(original.sequence<e.sequence,'OWNERSHIP_REFERENCE_UNRESOLVED');agree(e.failure_id,f.failure_id);agree(e.native_event_id,f.native_event_id);agree(e.native_event_type,f.native_event_type);}
    fields(e.source_observation,['raw_sha256','raw_type','raw_shape']);
    fields(e.safe_event,['kind','origin','path','type','rsc','prefetch','canceled','error_code','status','source'],['failure_evidence','source_url_evidence']);
    if(e.safe_event?.failure_evidence)agree(e.safe_event.failure_evidence,f);
    if(e.safe_event?.source_url_evidence)fields(e.safe_event.source_url_evidence,['raw_sha256','raw_type','raw_shape','base_identity','normalization_status','normalization_failure']);
   }else tuple={page_id:e.page_id};
   for(const k of ['page_id','transition_id','action_instance_id','tested_action_id','request_id','transition_type','script_sha256'])if(Object.hasOwn(e,k))agree(e[k],tuple[k]);
   if(e.native_ingress_id!==undefined){
    const ingress=ingresses.get(e.native_ingress_id);check(ingress?.kind==='NATIVE_INGRESS'&&ingress.sequence<e.sequence&&ingress.conversion_sequences.includes(e.sequence),'OWNERSHIP_REFERENCE_UNRESOLVED');agree(tuple.page_id,ingress?.page_id);
   }
   if(e.kind==='NATIVE_INGRESS'||e.kind==='NATIVE_SCRIPT_INGRESS'){
    agree(e.event_id,(e.kind==='NATIVE_INGRESS'?'native-ingress-':'native-script-')+sha(e.page_id+':'+e.sequence));
    if(e.original_sequence!==undefined){const original=journal.get(e.original_sequence);check(original&&original.sequence<e.sequence&&original.kind===e.kind,'OWNERSHIP_REFERENCE_UNRESOLVED');agree(e.page_id,original?.page_id);agree(e.native_event_type,original?.native_event_type);}
    for(const s of e.conversion_sequences){const converted=journal.get(s);check(converted&&s>e.sequence&&converted.native_ingress_id===e.event_id,'OWNERSHIP_CONFLICTING_REFERENCE');agree(e.page_id,converted?.page_id);}
    if(e.script)fields(e.script,['script_sha256','code_sha256','length','start_line','start_column','default_context','live_edit']);
    if(e.failure_evidence)agree(e.failure_evidence,ingressFailureEvidence(e));
   }
   if(e.classification_evidence)fields(e.classification_evidence,['rsc','prefetch']);
   if(e.kind==='TRANSITION_START')active.set(e.page_id,e.transition_id);
   if(e.kind==='TRANSITION_COMPLETE')active.delete(e.page_id);
  }
 }catch{issues.push('OWNERSHIP_EVIDENCE_INVALID');}
 return {status:issues.length?'FAIL':'PASS',issues:[...new Set(issues)]};
}
// transition_id records ambient association at request start. It alone cannot
// establish action ownership. Only positively classified prefetch with complete
// native ancestry, including every request parent, can prove ambient-only scope.
// Missing, cyclic, partial or action-bearing ancestry keeps the coverage gate.
export function requestCausalOwnership(request,actions,requests) {
  const c=causalDecision(request,actions,requests);
  if(c.action_ancestry==='PROVEN')return 'PROVEN_ACTION';
  if(request.prefetch_classification!=='YES')return 'UNRESOLVED';
  const seen=new Set();let r=request;
  while(r) {
    if(seen.has(r.request_id)||!r.initiator_scripts.complete||!r.initiator_scripts.scripts.length||
      actions.some(a=>a.page_id===r.request_evidence.page_id&&r.initiator_scripts.scripts.includes(a.script_sha256)))return 'UNRESOLVED';
    seen.add(r.request_id);
    if(r.causal_relation==='CDP_SCRIPT_INITIATOR')return r.initiator.type==='script'&&
      r.causal_parent==='script:'+r.initiator_scripts.scripts[0]?'AMBIENT_PREFETCH':'UNRESOLVED';
    if(!['CDP_INITIATOR_REQUEST','REDIRECT'].includes(r.causal_relation))return 'UNRESOLVED';
    r=requests.find(p=>p.request_id===r.causal_parent);
  }
  return 'UNRESOLVED';
}
function intentEvidence(signals,type,witness) {
  const e=classificationEvidence(signals,type);
  if(signals.prefetch==='NO'&&nativeNavigationProven(witness)&&witness.header_compatible)e.prefetch='NATIVE_NEXT_NAVIGATION';
  if(signals.prefetch==='NO'&&runtimeFetchProven(witness,type))e.prefetch='EXACT_EXPLICIT_ASSET_FETCH';
  if(signals.prefetch==='YES'&&nativeFrameworkPrefetchProven(witness,type))e.prefetch='EXACT_FRAMEWORK_PREFETCH_CALLER_CHAIN';
  return e;
}
function initiator(value) {
  const frames=[];let s=value?.stack;
  // Only hashed code locations, never code, function names or URL query values.
  for(let depth=0;s&&depth<8;depth++,s=s.parent) for(const f of s.callFrames??[]) {
    const source=f.url; // Access exceptions must not be swallowed by URL fallback.
    if(source!=null&&typeof source!=='string')throw new Error('NATIVE_SOURCE_TYPE_INVALID');
    let location;try {const u=new URL(source);location=u.origin+u.pathname;}catch{location=unknown;}
    frames.push({script_sha256:sha(location),line:f.lineNumber??null,column:f.columnNumber??null});
  }
  return {type:['parser','script','preload','preflight','other'].includes(value?.type)?value.type:unknown,frames};
}

// Closed protocol projection: no bodies, console arguments, exception objects or
// native wrappers survive. Each used property is read once under ingress protection.
// Scalars are accepted by exact type, never by invoking native coercion hooks.
const nativeSchemas = (() => {
  const frame={scriptId:'string',url:'string',lineNumber:'number',columnNumber:'number'};
  const stack={callFrames:[frame],parentId:{id:'string',debuggerId:'string'}};stack.parent=stack;
  const response={status:'number',url:'string'};
  const common={requestId:'string',type:'string',timestamp:'number'};
  return {
    'Debugger.scriptParsed':{scriptId:'string',hash:'string',length:'number',startLine:'number',startColumn:'number',isLiveEdit:'boolean',executionContextAuxData:{isDefault:'boolean'}},
    'Network.requestWillBeSent':{...common,frameId:'string',loaderId:'string',documentURL:'string',
      request:{url:'string',method:'string',headers:'headers'},redirectResponse:response,
      initiator:{type:'string',requestId:'string',stack}},
    'Network.responseReceived':{...common,response},
    'Network.loadingFailed':{...common,canceled:'boolean',errorText:'string'},
    'Network.loadingFinished':common,
    'Page.frameNavigated':{frame:{id:'string',loaderId:'string'}},
    'Runtime.consoleAPICalled':{type:'string',stackTrace:stack},
    'Runtime.exceptionThrown':{exceptionDetails:{exceptionId:'number',url:'string',stackTrace:stack}},
    'Log.entryAdded':{entry:{level:'string',url:'string',networkRequestId:'string'}},
  };
})();
// The brand is unforgeable outside this module. All reachable data is newly
// allocated, recursively frozen and primitive; native object shape is not proof.
const safeNativeEvents=new WeakSet();
export function materializeNativeEvent(type,native,operation=()=>{}) {
  const seen=new WeakSet();
  const visit=(value,schema,field,depth=0)=>{
    operation(field,'VALIDATE_TYPE');
    if(depth>64)throw new Error('NATIVE_DEPTH_LIMIT');
    if(value===undefined||value===null)return value;
    if(typeof schema==='string'&&schema!=='headers') {
      if(typeof value!==schema||(schema==='number'&&!Number.isFinite(value)))throw new Error('NATIVE_SCALAR_TYPE_INVALID');
      return value;
    }
    if(typeof value!=='object'||seen.has(value))throw new Error('NATIVE_CONTAINER_INVALID');
    seen.add(value);
    let output;
    if(Array.isArray(schema)) {
      if(!Array.isArray(value))throw new Error('NATIVE_ARRAY_INVALID');
      operation(field,'READ_LENGTH');const length=value.length;
      if(!Number.isSafeInteger(length)||length<0||length>100000)throw new Error('NATIVE_ARRAY_LIMIT');
      output=[];
      for(let i=0;i<length;i++){operation(field+'[]','READ_PROPERTY');output.push(visit(value[i],schema[0],field+'[]',depth+1));}
    } else {
      output=Object.create(null);
      operation(field,'ENUMERATE_SCHEMA');
      // Only header names are data-derived. They never enter persisted operation
      // labels. Values are primitive strings, not a native Headers object.
      const keys=schema==='headers'?Object.keys(value):Object.keys(schema);
      if(schema==='headers') {
        operation(field,'VALIDATE_CONTAINER');const proto=Object.getPrototypeOf(value);
        if(proto!==Object.prototype&&proto!==null)throw new Error('NATIVE_HEADERS_INVALID');
      }
      for(const key of keys) {
        const child=field+(schema==='headers'?'.[header]':'.'+key);
        operation(child,'READ_PROPERTY');const item=value[key];
        const result=visit(item,schema==='headers'?'string':schema[key],child,depth+1);
        if(result!==undefined)Object.defineProperty(output,key,{value:result,enumerable:true});
      }
    }
    seen.delete(value);return Object.freeze(output);
  };
  if(!Object.hasOwn(nativeSchemas,type))throw new Error('UNSUPPORTED_NATIVE_INGRESS');
  const result=visit(native,nativeSchemas[type],'$');
  if(!result||typeof result!=='object')throw new Error('NATIVE_EVENT_INVALID');
  safeNativeEvents.add(result);return result;
}

export function createAdoptRequestEvidence(origin, persistIngress = () => {}) {
  const collector=createRequestInstanceCollector(origin),capture=createTransitionCapture(origin);
  const requests=[],registry=[],journal=[],issues=[],actions=[],issued=new Map(),current=new Map(),active=new Map(),pages=new Map();
  let sequence=0,context={},productFailure=false,frozen=false;const listeners=new Map(), exceptionIdentities=new Map(), exceptionObjects=new WeakMap();
  const unresolvedObjects=new WeakMap(), ingressObjects=new WeakMap(), nativeIdentities=new WeakMap(), safeIdentities=new WeakMap(), deferredFailures=[];
  const observationIdentity=native=>safeIdentities.get(native)??native;
  let activeIngress=null;
  const scriptObjects=new WeakMap();

  // Independent native script ingress uses the same synchronous append-only
  // sink, but does not expand the frozen shared network/accounting vocabulary.
  // A conversion failure is a retained unclassified ledger occurrence.
  function scriptParsed(p,native,events) {
    let observed;
    const e=record('NATIVE_SCRIPT_INGRESS',{page_id:p,native_event_type:'Debugger.scriptParsed',native_event_received:true,
      identity_status:unknown,interpretation_status:'NOT_YET_INTERPRETED',conversion_sequences:[],accounting_indices:[]});
    e.event_id='native-script-'+sha(p+':'+e.sequence);
    const fail=()=>{e.interpretation_status='FAILED';issues.push('NATIVE_SCRIPT_PROOF_FAILED');productFailure=true;
      if(!e.accounting_indices.length){e.accounting_indices=[events.length];events.push({kind:'native_script_proof_failure'});}};
    try {
      persistIngress(clone(e));
      if(!['ACTIVE','DRAINING'].includes(listeners.get(p)))throw new Error('SCRIPT_LISTENER_NOT_ACTIVE');
      if(native&&(typeof native==='object'||typeof native==='function')) {
        const prior=scriptObjects.get(native)?.get(p);
        if(prior?.interpretation_status==='FAILED'){e.interpretation_status='DUPLICATE';e.original_sequence=prior.sequence;return;}
        if(!scriptObjects.has(native))scriptObjects.set(native,new Map());scriptObjects.get(native).set(p,e);
      }
      e.materialization_status='MATERIALIZING';
      const s=materializeNativeEvent('Debugger.scriptParsed',native);
      observed=s;
      e.materialization_status='MATERIALIZED';
      if(typeof s.scriptId!=='string'||!s.scriptId||typeof s.hash!=='string'||!/^[a-f0-9]{64}$/.test(s.hash))throw new Error('SCRIPT_IDENTITY_INVALID');
      e.script={script_sha256:scriptFingerprint(p,s.scriptId),code_sha256:s.hash,length:s.length??null,
        start_line:s.startLine??null,start_column:s.startColumn??null,default_context:s.executionContextAuxData?.isDefault===true,
        live_edit:s.isLiveEdit===true};
      const prior=journal.filter(x=>x!==e&&x.kind==='NATIVE_SCRIPT_INGRESS'&&x.page_id===p&&x.script?.script_sha256===e.script.script_sha256);
      if(prior.some(x=>!equal(x.script,e.script)))throw new Error('SCRIPT_IDENTITY_CONFLICT');
      e.interpretation_status='INTERPRETED';
    }catch{if(e.materialization_status==='MATERIALIZING')e.materialization_status='FAILED';fail();}
    finally{try{persistIngress(clone(e));}catch{fail();issues.push('INGRESS_DURABILITY_FAILED');}}
    return e.interpretation_status==='INTERPRETED'?observed:undefined;
  }
  function intent(p,native) {
    // Only an inert projection may be used, including when called by the harness.
    const e=safeNativeEvents.has(native)?native:materializeNativeEvent('Network.requestWillBeSent',native);
    const base=classifyRequestSignals(e.request.headers,e.type),frames=[];let stack=e.initiator?.stack,complete=true,depth=0;
    while(stack&&depth++<32){for(const f of stack.callFrames??[])frames.push({script_sha256:scriptFingerprint(p,f.scriptId),line:f.lineNumber??null,column:f.columnNumber??null});if(stack.parentId)complete=false;stack=stack.parent;}
    if(stack)complete=false;
    const script=journal.findLast(x=>x.kind==='NATIVE_SCRIPT_INGRESS'&&x.page_id===p&&x.interpretation_status==='INTERPRETED'&&x.script?.script_sha256===frames[0]?.script_sha256);
    const headers=Object.entries(e.request.headers??{}).map(([k,v])=>[k.toLowerCase(),v]);
    const compatible=base.rsc==='YES'&&e.type==='Fetch'&&headers.every(([k,v])=>
      k==='next-router-prefetch'?v==='0':!['purpose','sec-purpose'].includes(k));
    const runtime_header_compatible=headers.every(([k])=>!['rsc','next-router-prefetch','purpose','sec-purpose'].includes(k));
    const caller=journal.findLast(x=>x.kind==='NATIVE_SCRIPT_INGRESS'&&x.page_id===p&&x.interpretation_status==='INTERPRETED'&&x.script?.script_sha256===frames[4]?.script_sha256);
    const witness={base,header_compatible:compatible,runtime_header_compatible,frames,complete,script_sequence:script?.sequence??null,script:script?.script??null,...(caller&&frames[4]?.script_sha256!==frames[0]?.script_sha256?{caller:{sequence:caller.sequence,script:caller.script},initiator_type:e.initiator?.type??null,action_owned:actions.some(a=>a.page_id===p&&frames.some(f=>f.script_sha256===a.script_sha256))}:{})};
    return {signals:nativeIntentSignals(base,e.type,witness),witness};
  }

  const record=(kind,detail={})=>{requireReceiptData(detail);if(frozen&&kind!=='LISTENER_STOP')issues.push('EVENT_AFTER_FREEZE');const e={sequence:++sequence,kind,...detail,...(activeIngress&&kind!=='NATIVE_INGRESS'?{native_ingress_id:activeIngress.event_id}:{})};journal.push(e);return e;};
  // No native access, enumeration, coercion or serialization before record().
  // Raw objects are identity-only WeakMap keys; never persisted. The journal and
  // append-only sink contain only collector-owned, sanitized data.
  function nativeIngress(p,type,native,events,interpret) {
    const envelope=record('NATIVE_INGRESS',{page_id:p,native_event_type:type,native_event_received:true,
      identity_status:unknown,interpretation_status:'NOT_YET_INTERPRETED',conversion_sequences:[],accounting_indices:[]});
    envelope.event_id='native-ingress-'+sha(p+':'+envelope.sequence);
    const previousIngress=activeIngress;activeIngress=envelope;
    const ledgerStart=events.length;
    const retainFailure=()=>{
      envelope.interpretation_status='FAILED';
      if(!envelope.failure_evidence){
        envelope.failure_evidence=ingressFailureEvidence(envelope);
        events.push({kind:'native_interpretation_failure',ingress_failure:clone(envelope.failure_evidence)});
      }
      issues.push('NATIVE_INTERPRETATION_FAILED');productFailure=true;
    };
    try {
      persistIngress(clone(envelope)); // Synchronous durability acknowledgement before native access.
      if(!nativeIngressTypes.includes(type))throw new Error('UNSUPPORTED_NATIVE_INGRESS');
      if(!['ACTIVE','DRAINING'].includes(listeners.get(p)))issues.push('NATIVE_LISTENER_NOT_ACTIVE');
      const object=native!==null&&(typeof native==='object'||typeof native==='function');
      const prior=object?ingressObjects.get(native)?.get(p+':'+type):undefined;
      if(prior?.interpretation_status==='FAILED') {
        envelope.interpretation_status='DUPLICATE';envelope.original_sequence=prior.sequence;
        return false;
      }
      if(object) {
        if(!ingressObjects.has(native))ingressObjects.set(native,new Map());
        ingressObjects.get(native).set(p+':'+type,envelope);
      }
      envelope.materialization_status='MATERIALIZING';
      const safe=materializeNativeEvent(type,native,(field,operation)=>{
        envelope.materialization_field=field;envelope.materialization_operation=operation;
      });
      // Identity-only native keys stay at ingress. Downstream deduplication uses
      // an inert collector-owned token, never a request or causal identity.
      if(object){if(!nativeIdentities.has(native))nativeIdentities.set(native,Object.freeze({}));safeIdentities.set(safe,nativeIdentities.get(native));}
      envelope.materialization_status='MATERIALIZED';
      delete envelope.materialization_field;delete envelope.materialization_operation;
      const result=interpret(safe);
      // Native callbacks must stay synchronous; async work cannot overtake freeze.
      if(result&&typeof result.then==='function')throw new Error('ASYNC_NATIVE_CONVERSION');
      if(result?.irrelevant_native_level)envelope.irrelevant_native_level=result.irrelevant_native_level;
      envelope.interpretation_status='INTERPRETED';
      return result;
    } catch {
      if(envelope.materialization_status==='MATERIALIZING')envelope.materialization_status='FAILED';
      // Never read the thrown value: even its message/name may have hostile getters.
      retainFailure();
      return undefined;
    } finally {
      envelope.conversion_sequences=journal.filter(e=>e.native_ingress_id===envelope.event_id).map(e=>e.sequence);
      envelope.accounting_indices=Array.from({length:events.length-ledgerStart},(_,i)=>ledgerStart+i);
      try {persistIngress(clone(envelope));}catch {
        retainFailure();issues.push('INGRESS_DURABILITY_FAILED');
        envelope.accounting_indices=Array.from({length:events.length-ledgerStart},(_,i)=>ledgerStart+i);
      }
      activeIngress=previousIngress;
    }
  }
  const protectedNative=(type,fn)=>(p,native,...args)=>activeIngress
    ? fn(p,safeNativeEvents.has(native)?native:materializeNativeEvent(type,native),...args)
    : nativeIngress(p,type,native,deferredFailures,safe=>fn(p,safe,...args));
  function flushDeferred(events) {
    // Collector-only callers have no listener-owned ledger. Flush the exact failure
    // objects before accounting; do not manufacture request identities.
    for(const event of deferredFailures)if(!events.includes(event))events.push(event);
    for(const e of journal)if(e.kind==='NATIVE_INGRESS'&&deferredFailures.some(v=>v.ingress_failure.event_id===e.event_id)) {
      e.accounting_indices=events.flatMap((v,i)=>v.ingress_failure?.event_id===e.event_id?[i]:[]);
    }
  }
  function verifyIngress(snapshots) {
    const validation=auditNativeIngressJournal(journal.filter(e=>['NATIVE_INGRESS','NATIVE_SCRIPT_INGRESS'].includes(e.kind)),snapshots);
    issues.push(...validation.issues);return validation;
  }
  const observability={context(v={}){context=Object.fromEntries(['suite_id','test_id','action_id'].map(k=>[k,typeof v[k]==='string'?v[k]:null]));},
    captureFailure(error){productFailure=true;return error;},viewportStart(){},viewportEnd(){}};
  const lifecycle=p=>pages.get(p)??unknown;
  function listenerStart(p){if(listeners.has(p))issues.push('DUPLICATE_LISTENER');listeners.set(p,'ACTIVE');record('LISTENER_START',{page_id:p});}
  function listenerDrain(p){if(listeners.get(p)!=='ACTIVE')issues.push('LISTENER_ORDER_INVALID');listeners.set(p,'DRAINING');record('LISTENER_DRAIN',{page_id:p});}
  function sourceClosed(p){if(listeners.get(p)!=='DRAINING')issues.push('LISTENER_ORDER_INVALID');listeners.set(p,'CLOSED');record('SOURCE_CLOSED',{page_id:p});}
  function freeze(){if(frozen||[...listeners.values()].some(v=>v!=='CLOSED'))issues.push('PREMATURE_FREEZE');record('ACCOUNTING_FREEZE');frozen=true;for(const p of listeners.keys()){listeners.set(p,'STOPPED');record('LISTENER_STOP',{page_id:p});}}
  const key=(p,id)=>p+':'+id;
  function unresolvedNative(p,kind,native,index) {
    if(!Object.hasOwn(networkEventTypes,kind))throw new Error('UNSUPPORTED_NETWORK_EVENT');
    const prior=unresolvedObjects.get(observationIdentity(native));
    const id=native.requestId,validId=typeof id==='string'&&id.trim().length>0;
    if(!prior&&validId&&(kind==='REQUEST'||current.has(key(p,id))))return null;
    const signals=classifyRequestSignals(native.request?.headers,native.type);
    const detail={request_id:unknown,page_id:p,page_lifecycle:lifecycle(p),
      identity_reason:validId?'UNMAPPED_NATIVE_REQUEST_ID':'MISSING_NATIVE_REQUEST_ID',
      rsc:signals.rsc==='UNKNOWN'?unknown:signals.rsc==='YES',
      prefetch:native.type==='Prefetch'&&!native.request?.headers?true:signals.prefetch==='UNKNOWN'?unknown:signals.prefetch==='YES',
      timestamp:Number.isFinite(native.timestamp)?native.timestamp:null,
      resource_type:native.type??unknown,status:native.response?.status??unknown,redirect_status:native.redirectResponse?.status??unknown,
      canceled:typeof native.canceled==='boolean'?native.canceled:unknown,error_code:/^net::ERR_[A-Z_]+$/.test(native.errorText??'')?native.errorText:unknown};
    if(prior&&prior.kind===kind&&equal({...prior.detail,page_lifecycle:lifecycle(p)},detail)) {
      record('NATIVE_DUPLICATE',{page_id:p,page_lifecycle:lifecycle(p),original_sequence:prior.sequence,
        unresolved_event_id:prior.binding.event_id,identity_basis:'SAME_NATIVE_OBJECT',unresolved_evidence:clone(prior.binding)});
      return {event:null};
    }
    if(prior)issues.push('CONTRADICTORY_UNRESOLVED_DELIVERY');
    const event=record(kind,detail),binding=unresolvedNetworkEvidence(event);
    event.unresolved_evidence=binding;event.accounting_index=index;
    unresolvedObjects.set(observationIdentity(native),{kind,detail,sequence:event.sequence,binding});
    return {event:{kind:'unresolved_network_event',unresolved_evidence:clone(binding)}};
  }
  function lookup(p,id){const r=current.get(key(p,id));if(!r)issues.push('UNMAPPED_REQUEST');return r;}
  function network(p,id,kind,detail={}) {
    const r=lookup(p,id);const e=record(kind,{request_id:r?.request_id??unknown,page_id:p,page_lifecycle:lifecycle(p),...detail});
    if(!r)return;
    // Deduplicate only an identical protocol observation with an explicit timestamp.
    // A second event without such identity remains distinct and fails closed.
    const prior=journal.slice(0,-1).findLast(x=>x.request_id===r.request_id&&x.kind===kind);
    if(Number.isFinite(detail.timestamp)&&prior?.timestamp===detail.timestamp&&
      Object.entries(detail).every(([k,v])=>equal(prior[k],v))) {
      delete e.request_id;e.kind='NATIVE_DUPLICATE';e.related_request_id=r.request_id;e.original_sequence=prior.sequence;e.native_event_type=kind;
      return false;
    }
    if(r.terminal_state!=='PENDING')issues.push('TERMINAL_STATE_MISMATCH');
    r.event_sequences.push(e.sequence);
    if(terminalKinds.includes(kind))r.terminal_state=kind;
    return r;
  }
  function request(p,native) {
    // Read used scalar protocol fields once inside ingress. Lower-level URL
    // fallbacks may classify absent/invalid strings, but must never swallow a
    // native getter/coercion failure or observe a different URL on a later read.
    const source=native.request;
    const e={requestId:native.requestId,frameId:native.frameId,loaderId:native.loaderId,
      documentURL:native.documentURL,type:native.type,timestamp:native.timestamp,
      redirectResponse:native.redirectResponse,initiator:native.initiator,
      request:{url:source.url,method:source.method,headers:source.headers}};
    for(const value of [e.requestId,e.frameId,e.loaderId,e.documentURL,e.type,e.request.url,e.request.method])
      if(value!=null&&typeof value!=='string')throw new Error('NATIVE_SCALAR_TYPE_INVALID');
    const previous=current.get(key(p,e.requestId));
    if(previous) {
      if(e.redirectResponse)network(p,e.requestId,'REDIRECTED',{status:e.redirectResponse.status,timestamp:e.timestamp??null});
      else issues.push('DUPLICATE_REQUEST');
    } else if(e.redirectResponse) issues.push('UNMAPPED_REDIRECT');
    const {signals,witness}=intent(p,native);
    if(!['ACTIVE','DRAINING'].includes(listeners.get(p)))issues.push('UNOBSERVED_REQUEST');
    const t=active.get(p),ancestry=initiatorScripts(p,e.initiator);
    const owners=actions.filter(a=>a.page_id===p&&a.transition_id===t?.transition_id&&ancestry.complete&&ancestry.scripts.includes(a.script_sha256)&&
      journal.some(x=>x.kind==='ACTION_START'&&x.action_instance_id===a.action_instance_id));
    // A native async initiator retains its original action even if a later UI
    // poll changes ambient observability context. Bind at request start, never
    // rewrite after completion; retain the distinct ambient observation too.
    const owner=owners.length===1?owners[0]:null;
    const requestContext=owner?t.context:context;
    const contextBinding={source:owner?'NATIVE_ACTION_ANCESTRY':'OBSERVED_CONTEXT',action_instance_id:owner?.action_instance_id??unknown,observed_context_sha256:startContextFingerprint(context)};
    const binding=collector.request(p,e,requestContext,t?.transition_id,t?.context,signals.rsc==='YES'&&signals.prefetch==='NO');
    const f=Object.fromEntries(Object.entries(signals).map(([k,v])=>[k,v==='YES'?true:v==='NO'?false:unknown])),u=new URL(e.request.url);
    // Known prefetch is fully recorded below and remains blocking on failure;
    // it cannot become a candidate for a non-prefetch transition receipt.
    if(signals.prefetch!=='YES')capture.request(p,e.requestId,e,lifecycle(p),binding);
    const parent=e.redirectResponse?previous: e.initiator?.requestId?current.get(key(p,e.initiator.requestId)):null;
    const scriptParent=!e.redirectResponse&&!e.initiator?.requestId&&e.initiator?.type==='script'&&ancestry.scripts.length?'script:'+ancestry.scripts[0]:unknown;
    const r={request_id:binding.request_instance_id,request_evidence:binding,
      metadata:{origin:u.origin,path_sha256:u.origin==='https://vercel.live'&&u.pathname.startsWith('/_next-live/feedback/')? '/_next-live/feedback/':sha(u.pathname),query_keys:[...new Set(u.searchParams.keys())].sort(),method:binding.method,type:e.type??unknown},
      protocol_request_sha256:sha(key(p,e.requestId)),
      ...f,native_intent:witness,request_context_binding:contextBinding,classification_evidence:intentEvidence(signals,e.type,witness),rsc_classification:signals.rsc,prefetch_classification:signals.prefetch,initiator_scripts:ancestry,initiator:{...initiator(e.initiator),parent_protocol_sha256:e.initiator?.requestId?sha(key(p,e.initiator.requestId)):unknown},causal_parent:parent?.request_id??scriptParent,
      causal_relation:e.redirectResponse?'REDIRECT':e.initiator?.requestId?'CDP_INITIATOR_REQUEST':scriptParent!==unknown?'CDP_SCRIPT_INITIATOR':unknown,
      redirect_parent_id:e.redirectResponse?previous?.request_id??unknown:unknown,
      // Active context and exact destination are association evidence, not a causal claim.
      transition_id:t?.transition_id??unknown,transition_type:t?.kind??unknown,causality_status:unknown,
      terminal_state:'PENDING',event_sequences:[],accounting_indices:[]};
    requireReceiptData(r); // Do not let an interpreted native value poison durable serialization.
    requests.push(r);current.set(key(p,e.requestId),r);
    const start=record('REQUEST',{request_identity_sha256:sha(canonical(requestIdentity(r))),request_id:r.request_id,page_id:p,page_lifecycle:lifecycle(p),timestamp:e.timestamp??null,
      rsc:f.rsc,prefetch:f.prefetch,classification_evidence:intentEvidence(signals,e.type,witness),transition_id:r.transition_id});r.event_sequences.push(start.sequence);
    return binding;
  }
  function response(p,e,index) {
    const r=network(p,e.requestId,'RESPONSE',{status:e.response.status,resource_type:e.type??unknown,timestamp:e.timestamp??null});
    if(r===false)return false;
    capture.response(p,e.requestId,e.response.status,lifecycle(p));
    if(r&&index!==undefined)r.accounting_indices.push(index);return true;
  }
  function failure(p,e,index) {
    const r=network(p,e.requestId,'FAILED',{resource_type:e.type??unknown,canceled:e.canceled===true,error_code:/^net::ERR_[A-Z_]+$/.test(e.errorText??'')?e.errorText:unknown,timestamp:e.timestamp??null});
    if(r===false)return false;
    capture.failure(p,e.requestId,e,index,lifecycle(p));
    if(r)r.accounting_indices.push(index);return true;
  }
  function start(p,kind) {
    const id=capture.start(p,kind,context,lifecycle(p));
    const t={transition_id:id??unknown,page_id:p,kind,context:clone(context),action_instance_id:unknown,completion:null};
    if(active.has(p))issues.push('DUPLICATE_TRANSITION');
    registry.push(t);active.set(p,t);record('TRANSITION_START',{transition_id:t.transition_id,page_id:p,transition_type:kind});return id;
  }
  function complete(p,kind,readiness,runtimeProof) {
    capture.complete(p,kind,{metric:true,readiness,productFailure},lifecycle(p));
    const t=active.get(p);
    if(!t||t.kind!==kind)issues.push('UNMAPPED_TRANSITION');
    else {t.completion={readiness:readiness===true,metric:true,product_failure:productFailure};if(runtimeProof)t.runtime_proof=clone(runtimeProof);}
    record('TRANSITION_COMPLETE',{transition_id:t?.transition_id??unknown,page_id:p,transition_type:kind});active.delete(p);
  }
  function pageLifecycle(p,value) {
    pages.set(p,value);if(value!=='ACTIVE')capture.pageClosing(p);
    record('PAGE_LIFECYCLE',{page_id:p,value});
  }
  function action(p,type,parameter) {
    const t=active.get(p),control=actionControls[t?.kind];
    if(!t||!control||control.type!==type||t.action_instance_id!==unknown)return null;
    if(parameter!==(type==='CLICK'?control.selector:selectionExpression(t.kind)))return null;
    const a={...newAction(t),page_id:p};t.action_instance_id=a.action_instance_id;issued.set(a.action_instance_id,a);return clone(a);
  }
  function registerAction(a) {
    const seed=issued.get(a.action_instance_id);
    if(!seed||!Object.entries(seed).every(([k,v])=>a[k]===v)||actions.some(x=>x.action_instance_id===a.action_instance_id||x.script_sha256===a.script_sha256)) {issues.push('ACTION_BRIDGE_INVALID');return;}
    actions.push({...a,dispatch_ack:false,event_seen:null,listener_calls:null});
    record('ACTION_COMPILED',{action_instance_id:a.action_instance_id,transition_id:a.transition_id,page_id:a.page_id,script_sha256:a.script_sha256});
  }
  function beginAction(id){const a=actions.find(x=>x.action_instance_id===id);if(!a||journal.some(e=>e.kind==='ACTION_START'&&e.action_instance_id===id))issues.push('ACTION_BRIDGE_INVALID');record('ACTION_START',{action_instance_id:id,page_id:a?.page_id??unknown,transition_id:a?.transition_id??unknown});}
  function completeAction(id,completion) {
    const a=actions.find(x=>x.action_instance_id===id);
    if(!a||a.dispatch_ack!==false||journal.some(e=>e.kind==='ACTION_DISPATCHED'&&e.action_instance_id===id)){issues.push('ACTION_BRIDGE_INVALID');return;}
    Object.assign(a,completion);record('ACTION_DISPATCHED',{action_instance_id:id,...completion});
  }
  function requestEvidence() {
    const rows=clone(requests);
    for(const r of rows) {
      const c=causalDecision(r,actions,rows);r.causality_status=c.status;r.action_instance_id=c.action_instance_id;
      r.action_ancestry=c.action_ancestry;
      r.request_role=requestRole(r,actions,rows);
      r.consumer=r.prefetch_classification==='YES'?'PREFETCH':r.prefetch_classification==='UNKNOWN'?'UNKNOWN':c.status==='PROVEN'?'TESTED_ACTION':'UNKNOWN';
    }
    return rows;
  }
  function admittedReceipts(receipts) {
    const rows=requestEvidence();return {...receipts,records:receipts.records.filter(p=>rows.find(r=>r.request_id===p.request_instance_id)?.causality_status==='PROVEN')};
  }
  function evidence(events,result,receipts) {
    const rows=requestEvidence();
    const entries=registry.map(t=>({transition_id:t.transition_id,
      request_ids:requests.filter(r=>r.transition_id===t.transition_id).map(r=>r.request_id),
      receipt_ids:receipts.records.filter(p=>p.transition_id===t.transition_id).map(p=>sha(canonical(p))),
      state:t.completion?'COMPLETED':'PENDING'}));
    return {schema_version:'statistical-levels.adopt-request-evidence.v2',
      execution_source_sha:/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA??'')?process.env.GITHUB_SHA:unknown,
      hosted_run_id:/^\d+$/.test(process.env.GITHUB_RUN_ID??'')?process.env.GITHUB_RUN_ID:unknown,
      hosted_run_attempt:/^\d+$/.test(process.env.GITHUB_RUN_ATTEMPT??'')?process.env.GITHUB_RUN_ATTEMPT:unknown,
      requests:rows,actions:clone(actions),transitions:clone(registry),journal:clone(journal),transition_accounting:entries,
      transition_receipts:receipts,
      receipt_decisions:receipts.records.map(p=>({receipt_id:sha(canonical(p)),event_index:p.event_index,decision:rows.find(r=>r.request_id===p.request_instance_id)?.causality_status==='PROVEN'?'APPLIED':'BLOCKED_UNPROVEN_CAUSALITY'})),
      ledger_sha256:sha(canonical(result.ledger)),capture_issues:[...issues]};
  }
  function exception(p,native={},raw={kind:'exception',source:'Runtime.exceptionThrown',url:origin}) {
    const source=raw.source, suppliedId=source==='Runtime.exceptionThrown'?native?.exceptionDetails?.exceptionId:undefined;
    const protocolId=Number.isSafeInteger(suppliedId)&&suppliedId>=0?suppliedId:undefined;
    if(suppliedId!==undefined&&protocolId===undefined)issues.push('NATIVE_EXCEPTION_ID_INVALID');
    const priorObject=typeof native==='object'&&native!==null?exceptionObjects.get(observationIdentity(native)):undefined;
    const nativeId=protocolId!==undefined?sha(p+':'+source+':'+protocolId):priorObject??sha(p+':'+source+':observation:'+(sequence+1));
    const prior=exceptionIdentities.get(nativeId),source_observation=sourceURLObservation(raw.url);
    if(prior) {
      const duplicate=record('EXCEPTION_DUPLICATE',{page_id:p,page_lifecycle:lifecycle(p),failure_id:prior.failure_evidence.failure_id,native_event_id:nativeId,native_event_type:source,original_sequence:prior.sequence,source_observation});
      duplicate.safe_event=safeEvent(raw);
      if(!equal(prior.safe_event,duplicate.safe_event)||!equal(prior.source_observation,source_observation))issues.push('CONTRADICTORY_NATIVE_EXCEPTION');
      return null;
    }
    const parent=native?.entry?.networkRequestId,request=parent?current.get(key(p,parent)):null;
    const binding={failure_id:'failure-'+sha(p+':'+nativeId),native_event_id:nativeId,native_event_type:source,
      identity_basis:protocolId!==undefined?'PROTOCOL_ID':'CAPTURE_ORDINAL',page_id:p,
      observed_transition_id:active.get(p)?.transition_id??unknown,related_request_id:request?.request_id??unknown,
      parent_protocol_sha256:parent?sha(key(p,parent)):unknown};
    if(parent&&!request)issues.push('UNMAPPED_EXCEPTION_REQUEST');
    capture.exception(p);
    // Establish authoritative identity, source fingerprint and ownership BEFORE
    // source URL parsing. Parsing is total: unresolved locations remain evidence.
    const event=record('APPLICATION_EXCEPTION',{page_id:p,page_lifecycle:lifecycle(p),failure_evidence:binding,source_observation});
    exceptionIdentities.set(nativeId,event);if(native&&typeof native==='object')exceptionObjects.set(observationIdentity(native),nativeId);
    event.safe_event=safeEvent(raw);
    return clone(binding);
  }
  return {listenerStart,listenerDrain,sourceClosed,freeze,revision:()=>sequence,
    pendingRequests:p=>requests.filter(r=>r.request_evidence.page_id===p&&r.terminal_state==='PENDING').map(r=>r.request_id),
    observability,nativeIngress,verifyIngress,unresolvedNative,scriptParsed,
    classification:(p,e)=>{if(!safeNativeEvents.has(e))throw new Error('UNMATERIALIZED_CLASSIFICATION_INPUT');return intent(p,e).signals;},
    request:protectedNative('Network.requestWillBeSent',request),
    response:protectedNative('Network.responseReceived',response),failure:protectedNative('Network.loadingFailed',failure),
    start,complete,pageLifecycle,action,registerAction,beginAction,completeAction,admittedReceipts,
    frameNavigated:protectedNative('Page.frameNavigated',(p,e)=>collector.frameNavigated(p,e.frame)),
    finished:protectedNative('Network.loadingFinished',(p,e)=>network(p,e.requestId,'FINISHED',{timestamp:e.timestamp??null})),
    exception,
    receipts:events=>{flushDeferred(events);return capture.evidence(events.map(safeEvent));},evidence};
}

// The append-only ingress witness is a second view of the SAME observations,
// not additional event accounting. Require receive + settled snapshots exactly.
export function auditNativeIngressJournal(envelopes,snapshots) {
  try {
    requireReceiptData(envelopes);requireReceiptData(snapshots);
    if(snapshots.length!==2*envelopes.length)throw new Error();
    for(let i=0;i<envelopes.length;i++) {
      const e=envelopes[i],received=snapshots[2*i],settled=snapshots[2*i+1];
      const initial={sequence:e.sequence,kind:e.kind,page_id:e.page_id,native_event_type:e.native_event_type,
        native_event_received:true,identity_status:unknown,interpretation_status:'NOT_YET_INTERPRETED',
        conversion_sequences:[],accounting_indices:[],event_id:e.event_id};
      if(!equal(received,initial)||!equal(settled,e))throw new Error();
    }
    return {status:'PASS',issues:[]};
  }catch{return {status:'FAIL',issues:['INGRESS_DURABILITY_RECONCILIATION_FAILED']};}
}

// Independently replayable: never repairs or normalizes evidence supplied to it.
// Deliberately reconstruct from all retained material events, independently of
// receipt validation or claimed counts. No filtering by a claimed consumer ID.
// Independently enumerate the entire observer-owned source, never selected IDs
// or receipt counts. This implementation does not call receipt reconstruction.
export function auditRuntimeRawCensus(proof,transition){
 const issues=[],check=(v,c)=>{if(!v)issues.push(c);};let raw_accounting;
 try{
  const {receipt:r,source}=proof,events=source.events,t2=transition.kind==='T2';
  // Independent exact reconstruction of the native transport census. Never
  // call the receipt census validator or accept a normalized ownership summary.
  const trace=proof.census,network=events.filter(e=>e.kind==='NETWORK_START');
  check(equal(Object.keys(trace).sort(),['completion','ended','requests','started']),'AUDIT_TRACE_FIELDS_INVALID');
  check(equal(trace.completion,{dataLossOccurred:false})&&trace.started===true&&trace.ended===true,'AUDIT_TRACE_INCOMPLETE');
  const projected=network.map(n=>({identity:n.identity,method:n.method,destination:n.destination,timestamp:Math.round(n.timestamp*1e6)}));
  check(new Set(trace.requests.map(t=>t.identity)).size===trace.requests.length&&trace.requests.length===projected.length,'AUDIT_TRACE_CARDINALITY_INVALID');
  for(const t of trace.requests){const owners=projected.filter(n=>n.identity===t.identity);check(owners.length===1&&equal(t,owners[0]),'AUDIT_TRACE_OWNERSHIP_CONTRADICTION');}
  const layout=t2?'LISTENER_START TRANSITION_START ACTION_DISPATCH FETCH_ISSUED NETWORK_START NETWORK_FINISHED PAYLOAD_VALIDATED HISTORY_COMMIT PAYLOAD_CONSUMED STATE_COMMIT RENDER_COMMIT TRANSITION_COMPLETE LISTENER_DRAIN SOURCE_CLOSED FREEZE':'LISTENER_START TRANSITION_START ACTION_DISPATCH HISTORY_COMMIT STATE_COMMIT RENDER_COMMIT TRANSITION_COMPLETE LISTENER_DRAIN SOURCE_CLOSED FREEZE';
  const order=layout.split(' '),sets=new Map();for(const e of events){if(!sets.has(e.kind))sets.set(e.kind,[]);sets.get(e.kind).push(e);}
  const q=r.requests?.[0];
  const allowed={LISTENER_START:'',LISTENER_DRAIN:'',SOURCE_CLOSED:'',FREEZE:'',TRANSITION_START:'action_instance_id transition_id',TRANSITION_COMPLETE:'action_instance_id transition_id',ACTION_DISPATCH:'action_instance_id transition_id',FETCH_ISSUED:'code_sha256 column intent_identity line',NETWORK_START:'destination identity intent_identity method request_instance_id timestamp',NETWORK_FINISHED:'identity request_instance_id',NETWORK_FAILED:'identity request_instance_id',PAYLOAD_VALIDATED:'code_sha256 column intent_identity line object_identity observer payload_identity request_instance_id',PAYLOAD_CONSUMED:'consumer_identity context event_identity intent_identity object_identity observer payload_identity request_instance_id',HISTORY_COMMIT:'action_instance_id code_sha256 column identity line target transition_id'+(t2||(sets.get('HISTORY_COMMIT')??[]).some(e=>Object.hasOwn(e,'state_commit_identity'))?' state_commit_identity':''),STATE_COMMIT:'action_instance_id identity target transition_id'+(t2?' consumer_identity request_instance_id':''),RENDER_COMMIT:'action_instance_id identity state_commit_identity target transition_id'};
  const rows=[];
  for(let i=0;i<events.length;i++){
   const e=events[i];let owned=e.sequence===i+1&&e.kind===order[i]&&Object.hasOwn(allowed,e.kind);
   if(owned)owned=equal(Object.keys(e).sort(),['kind','sequence',...allowed[e.kind].split(' ').filter(Boolean)].sort());
   if(Object.hasOwn(e,'action_instance_id'))owned=owned&&e.action_instance_id===transition.action_instance_id;
   if(Object.hasOwn(e,'transition_id'))owned=owned&&e.transition_id===transition.transition_id;
   if(Object.hasOwn(e,'intent_identity'))owned=owned&&!!q&&e.intent_identity===q.intent_identity;
   if(Object.hasOwn(e,'request_instance_id'))owned=owned&&!!q&&e.request_instance_id===q.request_instance_id;
   if(Object.hasOwn(e,'payload_identity'))owned=owned&&!!q&&e.payload_identity===q.payload_identity;
   if(e.kind==='PAYLOAD_CONSUMED')owned=owned&&equal(e.context,q?.consumer?.context);
   rows.push({event_identity:sha(canonical({capture_id:source.capture_id,page_identity:source.page_identity,document_identity:source.document_identity,event:e})),event_type:e.kind,sequence:e.sequence,capture_id:source.capture_id,page_identity:source.page_identity,document_identity:source.document_identity,action_instance_id:e.action_instance_id??e.context?.action_instance_id??null,transition_id:e.transition_id??e.context?.transition_id??null,intent_identity:e.intent_identity??null,request_instance_id:e.request_instance_id??null,snapshot_identity:e.context?.snapshot_identity??null,ticker:e.context?.ticker??null,classification:owned?'OWNED_BY_GOVERNED_TRANSITION':'BLOCKING_FOREIGN_OR_AMBIGUOUS_EVENT',ownership:owned?'EXACT_ARCHITECTURE_BINDING':'UNRESOLVED',gate_relevance:Object.hasOwn(allowed,e.kind)?'GATE_RELEVANT':'UNKNOWN'});
  }
  const blocked=rows.reduce((n,e)=>n+(e.classification==='BLOCKING_FOREIGN_OR_AMBIGUOUS_EVENT'?1:0),0);
  raw_accounting={raw_event_total:rows.length,owned_event_count:rows.length-blocked,explicit_non_gate_event_count:0,blocking_event_count:blocked,unaccounted_event_count:0,rows};
  raw_accounting.census_digest=sha(canonical(raw_accounting));
  check(events.length===order.length&&blocked===0,'AUDIT_RAW_EVENT_CLOSURE_BLOCKED');
  check(sets.get('ACTION_DISPATCH')?.length===1,'AUDIT_ACTION_DISPATCH_CARDINALITY_INVALID');
  check(source.closed===true&&source.lost_events===0&&source.exceptions.length===0&&source.failures.length===0&&source.pending.length===0,'AUDIT_RAW_OPTION_A_BLOCKED');
  check(r.observation.start_sequence===2&&r.observation.action_dispatch_sequence===3&&r.observation.completion_sequence===order.length-3,'AUDIT_RAW_BOUNDARY_INVALID');
  check(r.transition_id===transition.transition_id&&r.action_instance_id===transition.action_instance_id&&r.page_identity===transition.page_id&&r.kind===transition.kind,'AUDIT_RAW_OWNER_INVALID');
 }catch{issues.push('AUDIT_RAW_CENSUS_INVALID');}
 return {status:issues.length?'FAIL':'PASS',issues:[...new Set(issues)],raw_accounting};
}

export function auditRuntimeConsumerEvidence(proof,request,transition){
 const issues=[],check=(v,c)=>{if(!v)issues.push(c);};
 try{
  const events=proof.source.events,receipt=proof.receipt;
  const consumers=events.filter(e=>e.kind==='PAYLOAD_CONSUMED');
  const states=events.filter(e=>e.kind==='STATE_COMMIT');
  const renders=events.filter(e=>e.kind==='RENDER_COMMIT');
  const histories=events.filter(e=>e.kind==='HISTORY_COMMIT');
  check(consumers.length===1,'AUDIT_CONSUMER_CARDINALITY_INVALID');
  check(states.length===1,'AUDIT_STATE_COMMIT_CARDINALITY_INVALID');
  check(renders.length===1&&histories.length===1,'AUDIT_TERMINAL_CARDINALITY_INVALID');
  check(receipt.requests.length===1,'AUDIT_T2_REQUEST_CARDINALITY_INVALID');
  if(consumers.length===1&&states.length===1&&renders.length===1&&histories.length===1&&receipt.requests.length===1){
   const event=consumers[0],state=states[0],render=renders[0],history=histories[0],q=receipt.requests[0],c=q.consumer;
   check(!Object.hasOwn(receipt,'consumer_count')&&!Object.hasOwn(q,'consumer_count')&&!Object.hasOwn(c,'consumer_count'),'AUDIT_CONSUMER_COUNT_CLAIM_UNSUPPORTED');
   const context={capture_id:request.request_evidence.capture_id,page_identity:transition.page_id,document_identity:request.request_evidence.document_instance_id,transition_id:transition.transition_id,action_instance_id:transition.action_instance_id,intent_identity:q.intent_identity,request_instance_id:request.request_id,payload_identity:q.payload_identity,snapshot_identity:receipt.snapshot_identity,ticker:transitions.T2.target_state.asset,phase:'STATE_COMMIT',state_commit_identity:state.identity,target_state:transitions.T2.target_state,event_identity:event.event_identity};
   const identity=sha(canonical({schema:'statistical-levels.runtime-consumer.v1',...context}));
   check(/^consumer:[a-f0-9-]{36}$/.test(event.event_identity),'AUDIT_CONSUMER_EVENT_IDENTITY_INVALID');
   check(equal(event.context,context)&&equal(c.context,context)&&event.consumer_identity===identity&&c.identity===identity,'AUDIT_CONSUMER_BINDING_INVALID');
   check(event.request_instance_id===request.request_id&&event.intent_identity===q.intent_identity&&event.payload_identity===q.payload_identity,'AUDIT_CONSUMER_REQUEST_BINDING_INVALID');
   check(state.consumer_identity===identity&&state.request_instance_id===request.request_id&&state.identity===q.state_commit_identity&&state.identity===receipt.commit.state_commit_identity,'AUDIT_CONSUMER_STATE_BINDING_INVALID');
   check(history.state_commit_identity===state.identity&&render.state_commit_identity===state.identity,'AUDIT_TERMINAL_STATE_BINDING_INVALID');
   for(const terminal of [state,render,history])check(terminal.transition_id===transition.transition_id&&terminal.action_instance_id===transition.action_instance_id&&equal(terminal.target,transitions.T2.target_state),'AUDIT_TERMINAL_TARGET_INVALID');
   check(c.consumption_sequence===event.sequence&&receipt.commit.state_sequence===state.sequence&&receipt.commit.render_sequence===render.sequence&&receipt.commit.history_sequence===history.sequence,'AUDIT_CONSUMER_SEQUENCE_INVALID');
   check(c.current_intent===true&&event.sequence<state.sequence&&state.sequence<render.sequence,'AUDIT_CONSUMER_ORDER_INVALID');
  }
 }catch{issues.push('AUDIT_CONSUMER_EVIDENCE_INVALID');}
 return {status:issues.length?'FAIL':'PASS',issues:[...new Set(issues)]};
}

// Independent implementation: do not call the receipt network reconstruction
// or rely on validator PASS. Retain the entire terminal union before binding it
// to native request ownership. Unknown/orphan events block; they are not adopted.
export function auditRuntimeNetworkEvidence(proof,requests,transition){
 const issues=[],check=(v,c)=>{if(!v)issues.push(c);};
 try{
  const {source,receipt:r}=proof,events=source.events;
  check(events.every((e,i)=>e.sequence===i+1),'AUDIT_NETWORK_SEQUENCE_INVALID');
  const starts=[],terminals=[],failed=[];
  for(const e of events){
   if(e.kind==='NETWORK_START')starts.push(e);
   if(e.kind==='NETWORK_FINISHED'||e.kind==='NETWORK_FAILED')terminals.push(e);
   if(e.kind==='NETWORK_FAILED')failed.push(e);
  }
  const pending=starts.filter(n=>terminals.every(t=>t.request_instance_id!==n.request_instance_id));
  check(Array.isArray(source.failures)&&equal([...source.failures].sort(),failed.map(e=>e.request_instance_id).sort()),'AUDIT_NETWORK_FAILURE_SUMMARY_MISMATCH');
  check(Array.isArray(source.pending)&&equal([...source.pending].sort(),pending.map(e=>e.request_instance_id).sort()),'AUDIT_NETWORK_PENDING_SUMMARY_MISMATCH');
  check(new Set(starts.map(e=>e.request_instance_id)).size===starts.length,'AUDIT_NETWORK_START_CARDINALITY_INVALID');
  check(new Set([...starts,...terminals].map(e=>e.identity)).size===starts.length+terminals.length,'AUDIT_NETWORK_EVENT_IDENTITY_DUPLICATE');
  const count=transition.kind==='T2'?1:0;
  check(starts.length===count&&requests.length===count&&r.requests.length===count,'AUDIT_NETWORK_REQUEST_COVERAGE_INVALID');
  for(const terminal of terminals){
   check(equal(Object.keys(terminal).sort(),['identity','kind','request_instance_id','sequence']),'AUDIT_NETWORK_TERMINAL_FIELDS_INVALID');
   check(/^[a-f0-9]{64}$/.test(terminal.identity),'AUDIT_NETWORK_TERMINAL_IDENTITY_INVALID');
   const owners=starts.filter(n=>n.request_instance_id===terminal.request_instance_id);
   check(owners.length===1,'AUDIT_NETWORK_UNRESOLVED_TERMINAL');
   check(owners.length===1&&terminal.sequence>owners[0].sequence&&terminal.sequence<r.observation.completion_sequence,'AUDIT_NETWORK_TERMINAL_SEQUENCE_INVALID');
  }
  for(const n of starts){
   const native=requests.filter(q=>q.request_id===n.request_instance_id),claims=r.requests.filter(q=>q.request_instance_id===n.request_instance_id);
   check(native.length===1&&claims.length===1,'AUDIT_NETWORK_REQUEST_IDENTITY_INVALID');
   if(native.length!==1||claims.length!==1)continue;
   const request=native[0],q=claims[0],b=request.request_evidence;
   check(equal(Object.keys(n).sort(),['destination','identity','intent_identity','kind','method','request_instance_id','sequence','timestamp']),'AUDIT_NETWORK_START_FIELDS_INVALID');
   check(n.identity===request.protocol_request_sha256&&n.method===b.method&&n.intent_identity===q.intent_identity,'AUDIT_NETWORK_START_BINDING_INVALID');
   check(b.document_proven&&b.request_instance_id===request.request_id&&b.capture_id===r.capture_id&&b.page_id===transition.page_id&&b.document_instance_id===r.document_identity&&source.capture_id===b.capture_id&&source.page_identity===b.page_id&&source.document_identity===b.document_instance_id,'AUDIT_NETWORK_NATIVE_CONTEXT_INVALID');
   check(request.action_instance_id===transition.action_instance_id&&request.transition_id===transition.transition_id&&q.action_instance_id===transition.action_instance_id&&q.transition_id===transition.transition_id&&q.page_identity===b.page_id&&q.document_identity===b.document_instance_id,'AUDIT_NETWORK_ACTION_INVALID');
   const url=new URL('/api/statistical-levels/asset',request.metadata.origin);url.searchParams.set('asset',transitions.T2.target_state.asset);url.searchParams.set('snapshot',r.snapshot_identity);
   check(q.snapshot_identity===r.snapshot_identity&&q.ticker===transitions.T2.target_state.asset&&equal(q.query,[['asset',q.ticker],['snapshot',r.snapshot_identity]])&&n.destination===sha(url.href)&&b.destination_sha256===destinationFingerprint(url.href,request.metadata.origin),'AUDIT_NETWORK_TARGET_INVALID');
   const issued=events.filter(e=>e.kind==='FETCH_ISSUED');
   check(issued.length===1&&issued[0].intent_identity===n.intent_identity&&issued[0].sequence>r.observation.action_dispatch_sequence&&issued[0].sequence<n.sequence,'AUDIT_NETWORK_START_SEQUENCE_INVALID');
   const set=terminals.filter(e=>e.request_instance_id===n.request_instance_id);
   const finished=set.filter(e=>e.kind==='NETWORK_FINISHED'),failures=set.filter(e=>e.kind==='NETWORK_FAILED');
   check(set.length===1,'AUDIT_NETWORK_TERMINAL_CARDINALITY_INVALID');
   check(finished.length===1&&failures.length===0,'AUDIT_NETWORK_EXACT_SUCCESS_REQUIRED');
   check(set.length===1&&q.terminal===(set[0].kind==='NETWORK_FINISHED'?'FINISHED':'FAILED')&&q.response_terminal_identity===set[0].identity&&request.terminal_state===q.terminal,'AUDIT_NETWORK_TERMINAL_CLAIM_MISMATCH');
   check(set.length===1&&set[0].sequence<q.consumer.validation_sequence&&set[0].sequence<r.commit.state_sequence,'AUDIT_NETWORK_TERMINAL_CONSUMPTION_ORDER');
  }
  check(pending.length===0&&failed.length===0,'AUDIT_NETWORK_INCOMPLETE');
 }catch{issues.push('AUDIT_NETWORK_EVIDENCE_INVALID');}
 return {status:issues.length?'FAIL':'PASS',issues:[...new Set(issues)]};
}

export function auditAdoptRequestEvidence(evidence,events,result,origin,expectedKinds=Object.keys(transitions)) {
  const issues=[];const check=(ok,code)=>{if(!ok)issues.push(code);};
  const unresolvedIdentityAccounting=[];
  try {
    requireReceiptData(evidence);requireReceiptData(events);requireReceiptData(result);
    for(const issue of auditOuterJournalOwnership(evidence).issues)check(false,issue);
    check(evidence.schema_version==='statistical-levels.adopt-request-evidence.v2','SCHEMA_MISMATCH');
    check(evidence.capture_issues.length===0,'CAPTURE_FAILURE');
    const scriptRows=evidence.journal.filter(e=>e.kind==='NATIVE_SCRIPT_INGRESS'),scriptFailures=new Set();
    for(const e of scriptRows) {
      check(e.event_id==='native-script-'+sha(e.page_id+':'+e.sequence)&&e.native_event_type==='Debugger.scriptParsed'&&e.native_event_received===true,'SCRIPT_INGRESS_IDENTITY_MISMATCH');
      check(equal(e.conversion_sequences,[]),'SCRIPT_CONVERSION_MISMATCH');
      if(e.interpretation_status==='FAILED') {
        issues.push('NATIVE_SCRIPT_PROOF_FAILED');
        check(e.accounting_indices.length===1,'SCRIPT_FAILURE_ACCOUNTING_MISMATCH');
        for(const i of e.accounting_indices){check(!scriptFailures.has(i)&&result.ledger[i]?.event.kind==='native_script_proof_failure'&&result.ledger[i]?.classification==='unclassified','SCRIPT_FAILURE_ACCOUNTING_MISMATCH');scriptFailures.add(i);}
      }else if(e.interpretation_status==='DUPLICATE') {
        const prior=scriptRows.find(x=>x.sequence===e.original_sequence);
        check(prior?.interpretation_status==='FAILED'&&prior.page_id===e.page_id&&prior.sequence<e.sequence&&e.accounting_indices.length===0&&!e.script,'SCRIPT_DUPLICATE_MISMATCH');
      }else {
        check(e.interpretation_status==='INTERPRETED'&&e.materialization_status==='MATERIALIZED'&&e.accounting_indices.length===0,'SCRIPT_INTERPRETATION_INCOMPLETE');
        check(/^[a-f0-9]{64}$/.test(e.script?.script_sha256)&&/^[a-f0-9]{64}$/.test(e.script?.code_sha256),'SCRIPT_IDENTITY_INVALID');
        check(scriptRows.filter(x=>x.sequence<e.sequence&&x.page_id===e.page_id&&x.script?.script_sha256===e.script?.script_sha256).every(x=>equal(x.script,e.script)),'SCRIPT_IDENTITY_CONFLICT');
      }
    }
    result.ledger.forEach((r,i)=>{if(r.event.kind==='native_script_proof_failure')check(scriptFailures.has(i),'UNOBSERVED_SCRIPT_FAILURE');});
    const requestIds=new Set(evidence.requests.map(r=>r.request_id));
    for(const event of evidence.journal)if(Object.hasOwn(networkEventTypes,event.kind)&&
      !(typeof event.request_id==='string'&&event.request_id.trim().length>0&&event.request_id!==unknown&&requestIds.has(event.request_id))) {
      const binding=unresolvedNetworkEvidence(event);
      const indices=result.ledger.flatMap((row,i)=>row.event.unresolved_evidence?.event_id===binding.event_id?[i]:[]);
      unresolvedIdentityAccounting.push({...binding,ledger_indices:indices,
        accounting_status:indices.length===1?'EXACTLY_ONCE':indices.length===0?'MISSING':'DUPLICATE'});
      issues.push('UNRESOLVED_REQUEST_IDENTITY');
      check(event.request_id===unknown&&equal(event.unresolved_evidence??null,binding),'UNRESOLVED_IDENTITY_EVIDENCE_MISMATCH');
      check(indices.length===1&&event.accounting_index===indices[0],'UNRESOLVED_ACCOUNTING_MISMATCH');
      for(const i of indices)check(result.ledger[i].classification==='unclassified'&&
        equal(result.ledger[i].event,safeEvent({kind:'unresolved_network_event',unresolved_evidence:binding})),'UNRESOLVED_ACCOUNTING_MISMATCH');
    }
    for(const row of result.ledger)if(row.event.kind==='unresolved_network_event'||row.event.unresolved_evidence)
      check(unresolvedIdentityAccounting.some(e=>e.event_id===row.event.unresolved_evidence?.event_id),'UNOBSERVED_UNRESOLVED_EVENT');
    const ingressRows=evidence.journal.filter(e=>e.kind==='NATIVE_INGRESS');
    const ingressIds=new Set();
    for(const e of ingressRows) {
      check(!ingressIds.has(e.event_id),'DUPLICATE_INGRESS');ingressIds.add(e.event_id);
      check(e.event_id==='native-ingress-'+sha(e.page_id+':'+e.sequence)&&e.native_event_received===true&&nativeIngressTypes.includes(e.native_event_type),'INGRESS_IDENTITY_MISMATCH');
      check(['INTERPRETED','FAILED','DUPLICATE'].includes(e.interpretation_status),'INGRESS_INTERPRETATION_INCOMPLETE');
      // Older witnesses predate materialization metadata. When present it must
      // reconcile with interpretation; incomplete materialization cannot pass.
      if(e.materialization_status!==undefined) {
        check(['MATERIALIZED','FAILED'].includes(e.materialization_status),'MATERIALIZATION_INCOMPLETE');
        check(e.materialization_status!=='FAILED'||e.interpretation_status==='FAILED','MATERIALIZATION_STATE_MISMATCH');
        check(e.materialization_status!=='MATERIALIZED'||(!e.materialization_field&&!e.materialization_operation),'MATERIALIZATION_STATE_MISMATCH');
      }
      check(Array.isArray(e.conversion_sequences)&&Array.isArray(e.accounting_indices),'INGRESS_RECONCILIATION_MISSING');
      const next=evidence.journal.find(x=>x.sequence>e.sequence&&(x.kind==='NATIVE_INGRESS'||['LISTENER_DRAIN','SOURCE_CLOSED','ACCOUNTING_FREEZE'].includes(x.kind)));
      check(equal(e.conversion_sequences,evidence.journal.filter(x=>x.native_ingress_id===e.event_id).map(x=>x.sequence)),'INGRESS_CONVERSION_MISMATCH');
      check(new Set(e.conversion_sequences).size===e.conversion_sequences.length&&e.conversion_sequences.every(s=>s>e.sequence&&(!next||s<next.sequence)&&evidence.journal.some(x=>x.sequence===s)),'INGRESS_CONVERSION_MISMATCH');
      check(new Set(e.accounting_indices).size===e.accounting_indices.length&&e.accounting_indices.every(i=>Number.isSafeInteger(i)&&i>=0&&i<result.ledger.length),'INGRESS_ACCOUNTING_MISMATCH');
      const indices=result.ledger.flatMap((row,i)=>row.event.ingress_failure?.event_id===e.event_id?[i]:[]);
      if(e.interpretation_status==='FAILED') {
        issues.push('NATIVE_INTERPRETATION_FAILED');
        const binding=ingressFailureEvidence(e);
        check(equal(e.failure_evidence,binding)&&indices.length===1&&e.accounting_indices.includes(indices[0]),'INGRESS_FAILURE_ACCOUNTING_MISMATCH');
        for(const i of indices)check(result.ledger[i].classification==='unclassified'&&equal(result.ledger[i].event,safeEvent({kind:'native_interpretation_failure',ingress_failure:binding})),'INGRESS_FAILURE_ACCOUNTING_MISMATCH');
      } else check(indices.length===0&&!e.failure_evidence,'UNOBSERVED_INGRESS_FAILURE');
      if(e.interpretation_status==='INTERPRETED') {
        const kinds=e.conversion_sequences.map(s=>evidence.journal.find(x=>x.sequence===s)?.kind);
        const required={'Network.requestWillBeSent':'REQUEST','Network.responseReceived':'RESPONSE','Network.loadingFailed':'FAILED','Network.loadingFinished':'FINISHED','Runtime.exceptionThrown':'APPLICATION_EXCEPTION'}[e.native_event_type];
        if(required)check(kinds.includes(required)||kinds.includes('NATIVE_DUPLICATE')||kinds.includes('EXCEPTION_DUPLICATE'),'INGRESS_CONVERSION_MISSING');
        if(Object.hasOwn(irrelevantNativeLevels,e.native_event_type))check(kinds.includes('APPLICATION_EXCEPTION')||kinds.includes('EXCEPTION_DUPLICATE')||
          (kinds.length===0&&e.accounting_indices.length===0&&irrelevantNativeLevels[e.native_event_type].includes(e.irrelevant_native_level)),'INGRESS_RELEVANCE_UNPROVEN');
      }
      if(e.interpretation_status==='DUPLICATE') {
        const original=ingressRows.find(x=>x.sequence===e.original_sequence);
        check(original&&original.sequence<e.sequence&&original.page_id===e.page_id&&original.native_event_type===e.native_event_type&&original.interpretation_status!=='DUPLICATE'&&e.conversion_sequences.length===0&&e.accounting_indices.length===0,'INGRESS_DUPLICATE_MISMATCH');
      }
    }
    for(const event of evidence.journal)if(event.native_ingress_id)check(ingressRows.some(e=>e.event_id===event.native_ingress_id&&e.conversion_sequences.includes(event.sequence)),'UNOBSERVED_NATIVE_INGRESS');
    for(const row of result.ledger)if(row.event.ingress_failure)check(ingressRows.some(e=>e.event_id===row.event.ingress_failure.event_id&&e.interpretation_status==='FAILED'),'UNOBSERVED_INGRESS_FAILURE');
    const decisions=evidence.requests.map(r=>[r.request_id,causalDecision(r,evidence.actions,evidence.requests)]);
    const proven=new Set(decisions.filter(([,c])=>c.status==='PROVEN').map(([id])=>id));
    const recomputed=account(events,false,origin,{...evidence.transition_receipts,records:evidence.transition_receipts.records.filter(p=>proven.has(p.request_instance_id))});
    // Still validate every proposed receipt using the unchanged strict validator.
    account(events,false,origin,evidence.transition_receipts);
    check(equal(evidence.receipt_decisions,evidence.transition_receipts.records.map(p=>({receipt_id:sha(canonical(p)),event_index:p.event_index,decision:proven.has(p.request_instance_id)?'APPLIED':'BLOCKED_UNPROVEN_CAUSALITY'}))),'RECEIPT_ACCOUNTING_MISMATCH');
    check(equal(recomputed,result),'RECEIPT_ACCOUNTING_MISMATCH');
    check(evidence.ledger_sha256===sha(canonical(result.ledger)),'LEDGER_MISMATCH');
    const unique=(xs,key,code)=>{const map=new Map();for(const x of xs){check(!map.has(x[key]),code);map.set(x[key],x);}return map;};
    const actions=unique(evidence.actions,'action_instance_id','DUPLICATE_ACTION');
    unique(evidence.actions,'script_sha256','DUPLICATE_ACTION_SCRIPT');
    const rs=unique(evidence.requests,'request_id','DUPLICATE_REQUEST');
    const ts=unique(evidence.transitions,'transition_id','DUPLICATE_TRANSITION');
    check(equal([...ts.values()].map(t=>t.kind).sort(),[...expectedKinds].sort()),'EXPECTED_TRANSITIONS_MISSING');
    const es=unique(evidence.journal,'sequence','DUPLICATE_EVENT');
    const as=unique(evidence.transition_accounting,'transition_id','DUPLICATE_TRANSITION_ACCOUNTING');
    check(evidence.journal.every((e,i)=>e.sequence===i+1),'EVENT_ORDER_MISMATCH');
    const pageState=new Map(),listenerState=new Map(),activeTransition=new Map(),compiledActions=new Map(),startedActions=new Map();
    const protocolLast=new Map(),observedFailures=new Map();let freezeSequence=null;
    for(const e of evidence.journal) {
      check(journalKinds.has(e.kind),'UNSUPPORTED_JOURNAL_EVENT');
      const ls=listenerState.get(e.page_id);
      if(freezeSequence!==null)check(e.kind==='LISTENER_STOP','EVENT_AFTER_FREEZE');
      if(e.kind==='LISTENER_START'){check(!ls,'DUPLICATE_LISTENER');listenerState.set(e.page_id,'ACTIVE');}
      else if(e.kind==='LISTENER_DRAIN'){check(ls==='ACTIVE'&&pageState.get(e.page_id)==='CLOSING','LISTENER_ORDER_INVALID');listenerState.set(e.page_id,'DRAINING');}
      else if(e.kind==='SOURCE_CLOSED'){check(ls==='DRAINING'&&pageState.get(e.page_id)==='CLOSING','LISTENER_ORDER_INVALID');listenerState.set(e.page_id,'CLOSED');}
      else if(e.kind==='ACCOUNTING_FREEZE'){check(freezeSequence===null&&[...listenerState.values()].every(x=>x==='CLOSED')&&[...pageState.values()].every(x=>x==='CLOSED'),'PREMATURE_FREEZE');freezeSequence=e.sequence;}
      else if(e.kind==='LISTENER_STOP'){check(freezeSequence!==null&&ls==='CLOSED','PREMATURE_LISTENER_STOP');listenerState.set(e.page_id,'STOPPED');}
      else if(e.kind==='PAGE_LIFECYCLE') {
        const prev=pageState.get(e.page_id);
        check(e.value==='ACTIVE'?!prev:e.value==='CLOSING'?prev==='ACTIVE':e.value==='CLOSED'&&prev==='CLOSING','PAGE_LIFECYCLE_MISMATCH');
        check(['ACTIVE','DRAINING','CLOSED'].includes(ls),'LISTENER_ORDER_INVALID');pageState.set(e.page_id,e.value);
      } else if(e.kind==='TRANSITION_START') {
        check(ls==='ACTIVE'&&pageState.get(e.page_id)==='ACTIVE'&&!activeTransition.has(e.page_id),'TRANSITION_LIFECYCLE_MISMATCH');activeTransition.set(e.page_id,e.transition_id);
      } else if(e.kind==='TRANSITION_COMPLETE') {
        check(activeTransition.get(e.page_id)===e.transition_id&&pageState.get(e.page_id)==='ACTIVE','TRANSITION_LIFECYCLE_MISMATCH');activeTransition.delete(e.page_id);
      } else if(e.kind==='ACTION_COMPILED') {
        check(ls==='ACTIVE'&&pageState.get(e.page_id)==='ACTIVE'&&activeTransition.get(e.page_id)===e.transition_id&&!compiledActions.has(e.action_instance_id),'ACTION_LIFECYCLE_MISMATCH');compiledActions.set(e.action_instance_id,e);
      } else if(e.kind==='ACTION_START') {
        const a=compiledActions.get(e.action_instance_id);check(a&&a.sequence<e.sequence&&!startedActions.has(e.action_instance_id)&&a.page_id===e.page_id&&activeTransition.get(e.page_id)===e.transition_id&&ls==='ACTIVE','ACTION_LIFECYCLE_MISMATCH');startedActions.set(e.action_instance_id,e);
      } else if(e.kind==='ACTION_DISPATCHED') {
        const a=actions.get(e.action_instance_id),compiled=compiledActions.get(e.action_instance_id);
        check(compiled&&startedActions.has(e.action_instance_id)&&startedActions.get(e.action_instance_id).sequence<e.sequence&&compiled.sequence<e.sequence&&activeTransition.get(a?.page_id)===a?.transition_id&&listenerState.get(a?.page_id)==='ACTIVE','ACTION_LIFECYCLE_MISMATCH');
      }
      if(['NATIVE_INGRESS','NATIVE_SCRIPT_INGRESS'].includes(e.kind))check(['ACTIVE','DRAINING'].includes(ls),'NATIVE_LISTENER_ORDER_INVALID');
      if(e.kind==='APPLICATION_EXCEPTION') {
        check(['ACTIVE','DRAINING'].includes(ls)&&pageState.get(e.page_id)===e.page_lifecycle,'REQUEST_LIFECYCLE_MISMATCH');
        const f=validateFailureEvidence(e.failure_evidence);
        check(e.source_observation&&['STRING','MISSING','INVALID_TYPE'].includes(e.source_observation.raw_type)&&
          ['ABSOLUTE','RELATIVE','EMPTY','UNKNOWN'].includes(e.source_observation.raw_shape)&&
          (e.source_observation.raw_sha256===unknown||/^[a-f0-9]{64}$/.test(e.source_observation.raw_sha256)),'SOURCE_OBSERVATION_MISSING');
        if(e.safe_event.source_url_evidence) {
          const u=e.safe_event.source_url_evidence;
          check(equal(e.source_observation,{raw_sha256:u.raw_sha256,raw_type:u.raw_type,raw_shape:u.raw_shape}),'SOURCE_OBSERVATION_MISMATCH');
          issues.push('SOURCE_URL_UNRESOLVED');
        }
        check(!observedFailures.has(f.failure_id),'DUPLICATE_FAILURE_ID');observedFailures.set(f.failure_id,e);
        check(f.page_id===e.page_id&&f.observed_transition_id===(activeTransition.get(e.page_id)??unknown),'EXCEPTION_OWNERSHIP_MISMATCH');
        check(f.identity_basis!=='CAPTURE_ORDINAL'||f.native_event_id===sha(f.page_id+':'+f.native_event_type+':observation:'+e.sequence),'NATIVE_EXCEPTION_MISMATCH');
        check(f.failure_id==='failure-'+sha(f.page_id+':'+f.native_event_id)&&f.native_event_type===e.safe_event.source,'NATIVE_EXCEPTION_MISMATCH');
        check(e.safe_event.kind===(f.native_event_type==='Runtime.exceptionThrown'?'exception':'console_error'),'NATIVE_EXCEPTION_MISMATCH');
        if(f.related_request_id!==unknown){const r=rs.get(f.related_request_id);check(r&&r.request_evidence.page_id===f.page_id&&r.protocol_request_sha256===f.parent_protocol_sha256&&r.event_sequences[0]<e.sequence&&protocolLast.get(f.parent_protocol_sha256)?.request_id===f.related_request_id,'EXCEPTION_OWNERSHIP_MISMATCH');}
        else check(f.parent_protocol_sha256===unknown,'EXCEPTION_OWNERSHIP_MISMATCH');
      }
      if(e.kind==='EXCEPTION_DUPLICATE') {
        const original=observedFailures.get(e.failure_id);
        if(original?.source_observation||e.source_observation)check(equal(original?.source_observation,e.source_observation),'SOURCE_OBSERVATION_MISMATCH');
        check(original&&original.sequence===e.original_sequence&&original.page_id===e.page_id&&original.failure_evidence.native_event_id===e.native_event_id&&original.failure_evidence.native_event_type===e.native_event_type&&equal(original.safe_event,e.safe_event),'DUPLICATE_FAILURE_ID');
        check(['ACTIVE','DRAINING'].includes(ls)&&pageState.get(e.page_id)===e.page_lifecycle,'REQUEST_LIFECYCLE_MISMATCH');
      }
      if(e.kind==='NATIVE_DUPLICATE') {
        const original=es.get(e.original_sequence);
        if(e.unresolved_event_id) {
          check(original&&original.sequence<e.sequence&&original.page_id===e.page_id&&original.request_id===unknown&&
            e.identity_basis==='SAME_NATIVE_OBJECT'&&original.unresolved_evidence?.event_id===e.unresolved_event_id&&
            equal(original.unresolved_evidence,e.unresolved_evidence),'NATIVE_DUPLICATE_MISMATCH');
        } else {
        check(original&&original.sequence<e.sequence&&original.request_id===e.related_request_id&&original.page_id===e.page_id&&original.kind===e.native_event_type&&Number.isFinite(e.timestamp)&&e.timestamp===original.timestamp,'NATIVE_DUPLICATE_MISMATCH');
        for(const k of ['status','resource_type','canceled','error_code'])if(Object.hasOwn(original,k))check(equal(original[k],e[k]),'NATIVE_DUPLICATE_MISMATCH');
        }
        check(['ACTIVE','DRAINING'].includes(ls)&&pageState.get(e.page_id)===e.page_lifecycle,'REQUEST_LIFECYCLE_MISMATCH');
      }
      if(Object.hasOwn(networkEventTypes,e.kind)||e.request_id) {
        const r=rs.get(e.request_id);
        check(['ACTIVE','DRAINING'].includes(ls)&&pageState.get(e.page_id)===e.page_lifecycle&&e.page_lifecycle!=='CLOSED','REQUEST_LIFECYCLE_MISMATCH');
        check(r?.request_evidence.page_id===e.page_id,'REQUEST_PAGE_MISMATCH');
        if(e.kind==='REQUEST'&&r) {
          check((activeTransition.get(e.page_id)??unknown)===r.transition_id,'REQUEST_TRANSITION_MISMATCH');
          const previous=protocolLast.get(r.protocol_request_sha256);
          check(!previous||r.causal_relation==='REDIRECT'&&r.causal_parent===previous.request_id,'DUPLICATE_PROTOCOL_ID');protocolLast.set(r.protocol_request_sha256,r);
          if(r.action_instance_id!==unknown){const a=startedActions.get(r.action_instance_id);check(a&&a.sequence<e.sequence&&a.transition_id===r.transition_id,'ACTION_LIFECYCLE_MISMATCH');}
        }
      }
    }
    check(freezeSequence!==null&&listenerState.size>0&&[...listenerState.values()].every(x=>x==='STOPPED'),'LISTENER_COVERAGE_INCOMPLETE');
    for(const r of rs.values()) {
      check(/^[a-f0-9]{64}$/.test(r.protocol_request_sha256),'PROTOCOL_ID_MISSING');
      check(typeof r.initiator_scripts.complete==='boolean'&&r.initiator_scripts.scripts.every(x=>/^[a-f0-9]{64}$/.test(x))&&new Set(r.initiator_scripts.scripts).size===r.initiator_scripts.scripts.length,'INITIATOR_ID_INVALID');
      const b=validateRequestEvidence(r.request_evidence);check(r.request_id===b.request_instance_id,'REQUEST_ID_MISMATCH');
      const history=evidence.journal.filter(e=>e.request_id===r.request_id);
      check(equal(r.event_sequences,history.map(e=>e.sequence)),'REQUEST_LIFECYCLE_MISMATCH');
      check(history.filter(e=>e.kind==='REQUEST').length===1&&history[0]?.kind==='REQUEST','UNMAPPED_REQUEST');
      check(history[0]?.request_identity_sha256===sha(canonical(requestIdentity(r))),'REQUEST_OBSERVATION_MISMATCH');
      check(b.page_id===history[0]?.page_id,'REQUEST_PAGE_MISMATCH');
      if(r.terminal_state==='PENDING'&&(r.metadata.origin===origin||r.transition_id!==unknown||r.prefetch_classification!=='NO'))issues.push('UNRESOLVED_PENDING_REQUEST');
      const responses=history.filter(e=>e.kind==='RESPONSE');
      check(new Set(responses.map(e=>e.status)).size<=1,'CONTRADICTORY_RESPONSE');
      const terminal=history.filter(e=>terminalKinds.includes(e.kind));
      check(terminal.length<=1&&r.terminal_state===(terminal[0]?.kind??'PENDING'),'TERMINAL_STATE_MISMATCH');
      check(!terminal.length||history.at(-1)===terminal[0],'EVENT_AFTER_TERMINAL');
      check(['UNKNOWN',true,false].includes(r.rsc)&&r.rsc===history[0]?.rsc,'RSC_CONTRADICTION');
      check(['UNKNOWN',true,false].includes(r.prefetch)&&r.prefetch===history[0]?.prefetch,'PREFETCH_CONTRADICTION');
      const w=r.native_intent;
      if(w) {
        const script=scriptRows.find(x=>x.sequence===w.script_sequence);
        check(w.script===null?w.script_sequence===null:script?.page_id===r.request_evidence.page_id&&script.sequence<history[0]?.sequence&&script.interpretation_status==='INTERPRETED'&&equal(script.script,w.script),'NATIVE_INTENT_SCRIPT_MISMATCH');
        check(equal([...new Set(w.frames.map(f=>f.script_sha256))],r.initiator_scripts.scripts)&&w.complete===r.initiator_scripts.complete,'NATIVE_INTENT_ANCESTRY_MISMATCH');
        validateOwnershipBundle(w,r,evidence,check);
        const signals=nativeIntentSignals(w.base,r.metadata.type,w);
        check(equal(signals,{rsc:r.rsc_classification,prefetch:r.prefetch_classification}),'NATIVE_INTENT_CLASSIFICATION_MISMATCH');
      }
      check(equal(r.classification_evidence,history[0]?.classification_evidence)&&equal(r.classification_evidence,intentEvidence({rsc:r.rsc_classification,prefetch:r.prefetch_classification},r.metadata.type,w)),'CLASSIFICATION_EVIDENCE_MISMATCH');
      check(r.metadata.method===b.method,'REQUEST_METADATA_MISMATCH');
      check(r.transition_id===(b.active_transition_id??unknown)&&r.transition_id===history[0]?.transition_id,'REQUEST_TRANSITION_MISMATCH');
      if(r.transition_id!==unknown)check(ts.has(r.transition_id)&&ts.get(r.transition_id).kind===r.transition_type&&ts.get(r.transition_id).page_id===b.page_id,'UNMAPPED_TRANSITION');
      if(r.causal_relation==='CDP_SCRIPT_INITIATOR') {
        check(r.initiator.type==='script'&&r.initiator.parent_protocol_sha256===unknown&&r.initiator_scripts.scripts.length>0&&r.causal_parent==='script:'+r.initiator_scripts.scripts[0],'CAUSAL_PARENT_MISMATCH');
      } else if(r.causal_parent!==unknown) {
        const parent=rs.get(r.causal_parent);
        check(parent&&parent.event_sequences[0]<r.event_sequences[0]&&parent.request_evidence.page_id===b.page_id&&parent.request_evidence.document_instance_id===b.document_instance_id,'CAUSAL_PARENT_MISMATCH');
        if(r.causal_relation==='CDP_INITIATOR_REQUEST') {
          check(parent?.protocol_request_sha256===r.initiator.parent_protocol_sha256,'CAUSAL_PARENT_MISMATCH');
          const prior=evidence.requests.filter(x=>x.protocol_request_sha256===r.initiator.parent_protocol_sha256&&x.event_sequences[0]<r.event_sequences[0]);
          check(prior.at(-1)?.request_id===r.causal_parent,'STALE_CAUSAL_PARENT');
          check(parent?.action_instance_id===r.action_instance_id,'CROSS_ACTION_PARENT');
        } else if(r.causal_relation==='REDIRECT') {
          check(parent?.protocol_request_sha256===r.protocol_request_sha256&&parent?.terminal_state==='REDIRECTED'&&r.redirect_parent_id===parent?.request_id,'REDIRECT_PARENT_MISMATCH');
        }
        check(['REDIRECT','CDP_INITIATOR_REQUEST'].includes(r.causal_relation),'CAUSAL_RELATION_MISMATCH');
      } else check(r.causal_relation===unknown,'MISSING_CAUSAL_PARENT');
      const relevant=r.metadata.origin===origin&&(r.transition_id!==unknown||r.rsc_classification==='YES'||r.prefetch_classification==='YES'||['Fetch','XHR','Prefetch'].includes(r.metadata.type));
      if(relevant) {
        check(r.prefetch_classification!=='UNKNOWN'&&r.rsc_classification!=='UNKNOWN','UNKNOWN_REQUEST_CLASSIFICATION');
        check(r.causal_parent!==unknown,'UNMAPPED_CAUSAL_REQUEST');
        if(r.transition_id!==unknown&&requestCausalOwnership(r,evidence.actions,evidence.requests)!=='AMBIENT_PREFETCH')
          check(r.action_ancestry==='PROVEN'&&actions.get(r.action_instance_id)?.transition_id===r.transition_id,'MISSING_CAUSAL_COVERAGE');
      }
      const c=causalDecision(r,evidence.actions,evidence.requests);
      if(r.request_context_binding) {
        const cb=r.request_context_binding,a=actions.get(cb.action_instance_id);
        check(/^[a-f0-9]{64}$/.test(cb.observed_context_sha256),'REQUEST_CONTEXT_BINDING_INVALID');
        if(cb.source==='NATIVE_ACTION_ANCESTRY')check(c.action_instance_id===cb.action_instance_id&&c.action_ancestry==='PROVEN'&&a?.transition_id===r.transition_id&&
          evidence.journal.some(e=>e.kind==='ACTION_START'&&e.action_instance_id===cb.action_instance_id&&e.sequence<history[0]?.sequence)&&
          b.request_start_context_sha256===startContextFingerprint(ts.get(r.transition_id)?.context),'REQUEST_CONTEXT_BINDING_INVALID');
        else check(cb.source==='OBSERVED_CONTEXT'&&cb.action_instance_id===unknown&&b.request_start_context_sha256===cb.observed_context_sha256,'REQUEST_CONTEXT_BINDING_INVALID');
      }
      if(r.request_role!==undefined)check(r.request_role===requestRole(r,evidence.actions,evidence.requests),'REQUEST_ROLE_MISMATCH');
      check(r.causality_status===c.status&&r.action_instance_id===c.action_instance_id&&r.action_ancestry===c.action_ancestry,'UNSUPPORTED_CAUSAL_CLAIM');
      check(r.rsc_classification===(r.rsc===true?'YES':r.rsc===false?'NO':'UNKNOWN'),'RSC_CONTRADICTION');
      check(r.prefetch_classification===(r.prefetch===true?'YES':r.prefetch===false?'NO':'UNKNOWN'),'PREFETCH_CONTRADICTION');
      check(b.consumer.kind!=='transition'||r.rsc_classification==='YES'&&r.prefetch_classification==='NO','CONSUMER_MISMATCH');
      check(r.consumer===(r.prefetch_classification==='YES'?'PREFETCH':r.prefetch_classification==='UNKNOWN'?'UNKNOWN':c.status==='PROVEN'?'TESTED_ACTION':'UNKNOWN'),'CONSUMER_MISMATCH');
      const indices=result.ledger.flatMap((row,i)=>row.event.request_evidence?.request_instance_id===r.request_id?[i]:[]);
      check(equal(indices,r.accounting_indices),'REQUEST_ACCOUNTING_MISMATCH');
      for(const i of indices) {
        const row=result.ledger[i];check(equal(row.event.request_evidence,b),'REQUEST_ACCOUNTING_MISMATCH');
        check(row.event.rsc===r.rsc,'RSC_CONTRADICTION');check(row.event.prefetch===r.prefetch,'PREFETCH_CONTRADICTION');
        check(row.event.origin===r.metadata.origin&&row.event.path===r.metadata.path_sha256,'REQUEST_METADATA_MISMATCH');
      }
      const failures=history.filter(e=>e.kind==='FAILED'||e.kind==='RESPONSE'&&e.status>=400);
      check(failures.length===indices.length,'REQUEST_ACCOUNTING_MISMATCH');
      failures.forEach((failure,j)=>{
        const raw=result.ledger[indices[j]]?.event;
        if(failure.kind==='RESPONSE')check(raw?.status===failure.status,'RESPONSE_ACCOUNTING_MISMATCH');
        else check(raw?.canceled===failure.canceled&&raw?.error_code===failure.error_code,'TERMINAL_ACCOUNTING_MISMATCH');
        if(failure.resource_type&&failure.resource_type!==unknown)check(raw?.type===failure.resource_type,'NATIVE_TYPE_MISMATCH');
      });
    }
    const accountedFailures=new Set();
    for(const [eventIndex,row] of result.ledger.entries())if(['console_error','exception'].includes(row.event.kind)) {
      const f=validateFailureEvidence(row.event.failure_evidence),observed=observedFailures.get(f.failure_id);
      check(observed&&!accountedFailures.has(f.failure_id),'EXCEPTION_ACCOUNTING_MISMATCH');accountedFailures.add(f.failure_id);
      check(observed&&equal(observed.source_observation,sourceURLObservation(events[eventIndex]?.url)),'SOURCE_OBSERVATION_MISMATCH');
      check(observed&&equal(observed.failure_evidence,f)&&equal({...observed.safe_event,failure_evidence:f},row.event),'EXCEPTION_ACCOUNTING_MISMATCH');
    }
    check(accountedFailures.size===observedFailures.size&&[...observedFailures.keys()].every(id=>accountedFailures.has(id)),'EXCEPTION_ACCOUNTING_MISMATCH');
    for(const event of es.values())if(Object.hasOwn(networkEventTypes,event.kind)||event.request_id)check(rs.has(event.request_id),'UNMAPPED_REQUEST');
    for(const row of result.ledger)if(row.event.kind==='request_failure')check(rs.has(row.event.request_evidence?.request_instance_id),'UNMAPPED_REQUEST');
    for(const t of ts.values()) {
      const spec=transitions[t.kind];check(spec&&t.context.suite_id===spec.suite_id&&t.context.test_id===spec.test_id&&t.context.action_id===spec.action_id,'TRANSITION_CONTEXT_MISMATCH');
      const starts=evidence.journal.filter(e=>e.kind==='TRANSITION_START'&&e.transition_id===t.transition_id);
      const ends=evidence.journal.filter(e=>e.kind==='TRANSITION_COMPLETE'&&e.transition_id===t.transition_id);
      check(starts.length===1,'DUPLICATE_TRANSITION');
      check(starts[0]?.page_id===t.page_id&&starts[0]?.transition_type===t.kind,'TRANSITION_CONTEXT_MISMATCH');
      if(!t.completion)issues.push('UNRESOLVED_PENDING_TRANSITION');
      check(actions.has(t.action_instance_id),'MISSING_CAUSAL_COVERAGE');
      const primary=evidence.requests.filter(r=>r.transition_id===t.transition_id&&r.causality_status==='PROVEN');
      // A receipt cannot choose its own architecture. Native executable evidence
      // preceding the action selects the exact reviewed mode; missing proof blocks.
      const runtimeMode=scriptRows.some(e=>e.page_id===t.page_id&&e.sequence<starts[0]?.sequence&&e.interpretation_status==='INTERPRETED'&&runtimeExecutableMatches(e.script));
      if(runtimeMode){
        const proof=t.runtime_proof,rr=proof?.receipt;
        const rawAudit=auditRuntimeRawCensus(proof,t);
        for(const issue of rawAudit.issues)check(false,issue);
        const receiptValidation=validateRuntimeTransitionReceipt(rr,proof?.source,proof?.census);
        check(rawAudit.status==='PASS'&&receiptValidation.status==='PASS'&&equal(rawAudit.raw_accounting,receiptValidation.raw_accounting),'RUNTIME_RAW_CENSUS_PARITY');
        const networkAudit=auditRuntimeNetworkEvidence(proof,evidence.requests.filter(r=>r.transition_id===t.transition_id),t);
        for(const issue of networkAudit.issues)check(false,issue);
        if(t.kind==='T2'){
          const rawRequests=evidence.requests.filter(r=>r.transition_id===t.transition_id);
          check(rawRequests.length===1,'AUDIT_T2_REQUEST_CARDINALITY_INVALID');
          const consumerAudit=auditRuntimeConsumerEvidence(proof,rawRequests[0],t);
          for(const issue of consumerAudit.issues)check(false,issue);
        }
        check(!!proof&&validateRuntimeTransitionReceipt(rr,proof.source,proof.census).status==='PASS','RUNTIME_TRANSITION_UNPROVEN');
        check(rr?.transition_id===t.transition_id&&rr?.action_instance_id===t.action_instance_id&&rr?.page_identity===t.page_id&&rr?.kind===t.kind,'RUNTIME_TRANSITION_IDENTITY');
        const owned=evidence.requests.filter(r=>r.transition_id===t.transition_id);
        check(owned.length===(t.kind==='T2'?1:0)&&primary.length===(t.kind==='T2'?1:0),'RUNTIME_REQUEST_CARDINALITY');
        if(t.kind==='T2'&&owned.length===1&&rr){
          const r=owned[0],b=r.request_evidence,q=rr.requests?.[0];
          const url=new URL('/api/statistical-levels/asset',origin);url.searchParams.set('asset','GLD');url.searchParams.set('snapshot',rr.snapshot_identity);
          check(runtimeFetchProven(r.native_intent,r.metadata.type)&&b.document_proven&&b.capture_id===rr.capture_id&&b.document_instance_id===rr.document_identity&&b.destination_sha256===destinationFingerprint(url.href,origin)&&r.metadata.origin===origin&&r.metadata.path_sha256===sha(url.pathname)&&r.metadata.method==='GET'&&r.terminal_state==='FINISHED'&&r.action_instance_id===rr.action_instance_id&&q?.request_instance_id===r.request_id,'RUNTIME_EXPLICIT_REQUEST_BINDING');
          const n=proof.source.events.filter(e=>e.kind==='NETWORK_START');
          check(n.length===1&&n[0].identity===r.protocol_request_sha256&&n[0].destination===sha(url.href)&&n[0].request_instance_id===r.request_id,'RUNTIME_NATIVE_CENSUS_BINDING');
        }
      }else{
        check(!t.runtime_proof,'UNSUPPORTED_RUNTIME_RECEIPT');
        check(primary.length===1,'PRIMARY_REQUEST_CARDINALITY');
        for(const r of primary){const b=r.request_evidence;check(b.document_proven&&b.consumer.kind==='transition'&&equal(b.consumer.target,spec.target_state)&&b.request_start_context_sha256===startContextFingerprint(spec)&&b.active_transition_context_sha256===startContextFingerprint(spec)&&r.metadata.origin===origin&&r.metadata.path_sha256===sha(spec.route),'PRIMARY_IDENTITY_MISMATCH');}
      }
      for(const r of primary)if(r.terminal_state==='FAILED')check(evidence.transition_receipts.records.filter(p=>p.request_instance_id===r.request_id&&p.transition_id===t.transition_id).length===1,'MISSING_TERMINAL_RECEIPT');
      for(const r of primary)if(r.terminal_state==='FINISHED')check(evidence.journal.some(e=>e.request_id===r.request_id&&e.kind==='RESPONSE'&&e.status>=200&&e.status<300),'PRIMARY_RESPONSE_UNPROVEN');
      check(t.completion?.readiness===true&&t.completion.metric===true&&!t.completion.product_failure,'TRANSITION_COMPLETION_INVALID');
      if(ends.length)check(ends[0].sequence>starts[0]?.sequence&&ends[0].page_id===t.page_id&&ends[0].transition_type===t.kind,'TERMINAL_STATE_MISMATCH');
      check(ends.length===(t.completion?1:0),'TERMINAL_STATE_MISMATCH');
      const expected={transition_id:t.transition_id,request_ids:evidence.requests.filter(r=>r.transition_id===t.transition_id).map(r=>r.request_id),
        receipt_ids:evidence.transition_receipts.records.filter(p=>p.transition_id===t.transition_id).map(p=>sha(canonical(p))),state:t.completion?'COMPLETED':'PENDING'};
      check(as.has(t.transition_id)&&equal(as.get(t.transition_id),expected),'TRANSITION_ACCOUNTING_MISMATCH');
    }
    for(const e of evidence.journal)if(e.kind.startsWith('TRANSITION_'))check(ts.has(e.transition_id),'UNMAPPED_TRANSITION');
    for(const a of as.values())check(ts.has(a.transition_id),'UNMAPPED_TRANSITION');
    for(const a of actions.values()) {
      const t=ts.get(a.transition_id),spec=transitions[a.kind];
      check(t&&t.page_id===a.page_id&&t.kind===a.kind&&t.action_instance_id===a.action_instance_id&&a.tested_action_id===spec?.action_id,'ACTION_TRANSITION_MISMATCH');
      check(/^action-[a-f0-9-]{36}$/.test(a.action_instance_id)&&/^[a-f0-9]{64}$/.test(a.script_sha256),'ACTION_ID_INVALID');
      check(a.source_url_sha256===sha('https://sl-qa.invalid/action/'+a.action_instance_id),'ACTION_SCRIPT_MISMATCH');
      const compiled=evidence.journal.filter(e=>e.kind==='ACTION_COMPILED'&&e.action_instance_id===a.action_instance_id);
      check(evidence.journal.filter(e=>e.kind==='ACTION_START'&&e.action_instance_id===a.action_instance_id).length===1,'ACTION_START_MISSING');
      const dispatched=evidence.journal.filter(e=>e.kind==='ACTION_DISPATCHED'&&e.action_instance_id===a.action_instance_id);
      check(compiled.length===1&&compiled[0].script_sha256===a.script_sha256&&compiled[0].transition_id===a.transition_id&&compiled[0].page_id===a.page_id,'ACTION_SCRIPT_MISMATCH');
      check(dispatched.length===1&&dispatched[0].dispatch_ack===a.dispatch_ack&&dispatched[0].event_seen===a.event_seen&&dispatched[0].listener_calls===a.listener_calls,'ACTION_DISPATCH_MISMATCH');
    }
    for(const t of ts.values())if(t.action_instance_id!==unknown)check(actions.has(t.action_instance_id),'MISSING_CAUSAL_PARENT');
    for(const e of evidence.journal)if(e.kind.startsWith('ACTION_'))check(actions.has(e.action_instance_id),'UNMAPPED_ACTION');
    for(const p of evidence.transition_receipts.records) {
      const r=rs.get(p.request_instance_id),t=ts.get(p.transition_id);
      check(r&&t&&r.transition_id===p.transition_id,'REQUEST_TRANSITION_MISMATCH');
      check(r?.terminal_state==='FAILED','TERMINAL_STATE_MISMATCH');
      const history=evidence.journal.filter(e=>e.request_id===p.request_instance_id);
      const response=history.findLast(e=>e.kind==='RESPONSE'),failure=history.find(e=>e.kind==='FAILED');
      check(response&&failure&&response.sequence<failure.sequence&&response.status===p.response_status&&failure.canceled===p.canceled&&failure.error_code===p.error_code,'RECEIPT_LIFECYCLE_MISMATCH');
      check(history.every(e=>e.page_lifecycle==='ACTIVE'),'RECEIPT_LIFECYCLE_MISMATCH');
      const start=history.find(e=>e.kind==='REQUEST'),end=evidence.journal.find(e=>e.kind==='TRANSITION_COMPLETE'&&e.transition_id===p.transition_id);
      const pairs=[[p.start_sequence,start?.sequence],[p.response_sequence,response?.sequence],[p.abort_sequence,failure?.sequence],[p.completion_sequence,end?.sequence]];
      check(pairs.every(([a,b])=>Number.isSafeInteger(a)&&Number.isSafeInteger(b))&&pairs.every(([a,b])=>pairs.every(([c,d])=>Math.sign(a-c)===Math.sign(b-d))),'RECEIPT_ORDER_MISMATCH');
      const transitionStart=evidence.journal.find(e=>e.kind==='TRANSITION_START'&&e.transition_id===p.transition_id);
      check(p.application_exception===[...observedFailures.values()].some(e=>e.page_id===p.page_id&&e.sequence>transitionStart?.sequence&&e.sequence<end?.sequence),'RECEIPT_EXCEPTION_MISMATCH');
      check(t?.completion?.readiness===true&&t.completion.metric===true&&!t.completion.product_failure,'RECEIPT_COMPLETION_MISMATCH');
      // Existing strict receipt is necessary; timing/URL association alone is insufficient.
      check(r?.causality_status==='PROVEN','MISSING_CAUSAL_PARENT');
    }
  } catch {issues.push('EVIDENCE_INVALID');}
  return {status:issues.length?'FAIL':'PASS',issues:[...new Set(issues)],
    ...(unresolvedIdentityAccounting.length?{unresolved_identity_accounting:unresolvedIdentityAccounting}:{})};
}
