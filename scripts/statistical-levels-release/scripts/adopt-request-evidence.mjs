// ADOPT companion to the existing request identities and strict T1–T4 receipts.
// No request headers, cookies, query values, bodies, raw CDP IDs or stacks persist.
import { createRequestInstanceCollector, validateRequestEvidence, startContextFingerprint } from './probe-request-instances.mjs';
import { createTransitionCapture, transitions, requireReceiptData } from './probe-transition-receipts.mjs';
import { actionControls, selectionExpression, newAction, initiatorScripts, classifyRequestSignals, classificationEvidence, causalDecision, scriptFingerprint, nativeIntentSignals, nativeNavigationProven, requestRole } from './adopt-causal-bridge.mjs';
import { account, safeEvent, sourceURLObservation, validateFailureEvidence, networkEventTypes, unresolvedNetworkEvidence, nativeIngressTypes, ingressFailureEvidence, irrelevantNativeLevels } from './network-accounting.mjs';
import { canonical, sha } from './release-core.mjs';
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
function intentEvidence(signals,type,witness) {
  const e=classificationEvidence(signals,type);
  if(signals.prefetch==='NO'&&nativeNavigationProven(witness)&&witness.header_compatible)e.prefetch='NATIVE_NEXT_NAVIGATION';
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
    const witness={base,header_compatible:compatible,frames,complete,script_sequence:script?.sequence??null,script:script?.script??null};
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
  function complete(p,kind,readiness) {
    capture.complete(p,kind,{metric:true,readiness,productFailure},lifecycle(p));
    const t=active.get(p);
    if(!t||t.kind!==kind)issues.push('UNMAPPED_TRANSITION');
    else t.completion={readiness:readiness===true,metric:true,product_failure:productFailure};
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
  return {listenerStart,listenerDrain,sourceClosed,freeze,revision:()=>sequence,observability,nativeIngress,verifyIngress,unresolvedNative,scriptParsed,
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
export function auditAdoptRequestEvidence(evidence,events,result,origin,expectedKinds=Object.keys(transitions)) {
  const issues=[];const check=(ok,code)=>{if(!ok)issues.push(code);};
  const unresolvedIdentityAccounting=[];
  try {
    requireReceiptData(evidence);requireReceiptData(events);requireReceiptData(result);
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
        if(r.transition_id!==unknown)check(r.action_ancestry==='PROVEN'&&actions.get(r.action_instance_id)?.transition_id===r.transition_id,'MISSING_CAUSAL_COVERAGE');
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
      check(primary.length===1,'PRIMARY_REQUEST_CARDINALITY');
      for(const r of primary){const b=r.request_evidence;check(b.document_proven&&b.consumer.kind==='transition'&&equal(b.consumer.target,spec.target_state)&&b.request_start_context_sha256===startContextFingerprint(spec)&&b.active_transition_context_sha256===startContextFingerprint(spec)&&r.metadata.origin===origin&&r.metadata.path_sha256===sha(spec.route),'PRIMARY_IDENTITY_MISMATCH');}
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
