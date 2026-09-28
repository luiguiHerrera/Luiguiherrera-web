import { validateRequestEvidence } from './probe-request-instances.mjs';
import { validateTransitionReceipts, transitionClass, requireReceiptData } from './probe-transition-receipts.mjs';
import { canonical, sha, need } from './release-core.mjs';

export const networkEventTypes = Object.freeze({REQUEST:'Network.requestWillBeSent',RESPONSE:'Network.responseReceived',FAILED:'Network.loadingFailed',FINISHED:'Network.loadingFinished',REDIRECTED:'Network.requestWillBeSent'});
// Callback names are trusted registration constants, never read from native input.
export const nativeIngressTypes = Object.freeze([
  'Network.requestWillBeSent','Network.responseReceived','Network.loadingFailed','Network.loadingFinished',
  'Page.frameNavigated','Runtime.consoleAPICalled','Runtime.exceptionThrown','Log.entryAdded',
]);
export const irrelevantNativeLevels = Object.freeze({
  'Runtime.consoleAPICalled':['log','debug','info','warning','dir','dirxml','table','trace','clear','startGroup','startGroupCollapsed','endGroup','profile','profileEnd','count','timeEnd'],
  'Log.entryAdded':['verbose','info','warning'],
});
export function ingressFailureEvidence(envelope) {
  if(envelope.materialization_status==='FAILED')need(
    typeof envelope.materialization_field==='string'&&/^\$(?:\.[a-zA-Z][a-zA-Z0-9]*|\.\[header\]|\[\])*$/.test(envelope.materialization_field)&&
    ['VALIDATE_TYPE','READ_LENGTH','READ_PROPERTY','ENUMERATE_SCHEMA','VALIDATE_CONTAINER'].includes(envelope.materialization_operation),'MATERIALIZATION_FAILURE_INVALID');
  need(Number.isSafeInteger(envelope.sequence)&&envelope.sequence>0&&
    /^page-[1-9][0-9]*$/.test(envelope.page_id)&&nativeIngressTypes.includes(envelope.native_event_type),'INGRESS_IDENTITY_INVALID');
  return {event_id:'native-ingress-'+sha(envelope.page_id+':'+envelope.sequence),
    native_event_type:envelope.native_event_type,page_id:envelope.page_id,journal_sequence:envelope.sequence,
    request_id:'UNKNOWN',parent_id:'UNKNOWN',rsc:'UNKNOWN',prefetch:'UNKNOWN',
    lifecycle:'UNKNOWN',interpretation_status:'FAILED',failure_code:'NATIVE_INTERPRETATION_FAILED',
    reconciliation_status:'FAIL_CLOSED',gate_effect:'BLOCK',
    ...(envelope.materialization_status==='FAILED'?{
      materialization_status:'FAILED',materialization_field:envelope.materialization_field,
      materialization_operation:envelope.materialization_operation,
      failure_record_id:'materialization-failure-'+sha(envelope.page_id+':'+envelope.sequence)
    }: {})};
}
function validateIngressFailure(value) {
  requireReceiptData(value);
  const expected=ingressFailureEvidence({...value,sequence:value?.journal_sequence});
  need(canonical(value).equals(canonical(expected)),'INGRESS_IDENTITY_INVALID');return expected;
}
// An observation ID is not a request identity. Preserve only sanitized, independently
// known semantics; an unresolved request never receives a fabricated binding.
export function unresolvedNetworkEvidence(event) {
  need(Object.hasOwn(networkEventTypes,event.kind)&&Number.isSafeInteger(event.sequence)&&event.sequence>0,'UNRESOLVED_EVENT_INVALID');
  const page=/^page-[1-9][0-9]*$/.test(event.page_id??'')?event.page_id:'UNKNOWN';
  const tri=v=>[true,false,'UNKNOWN'].includes(v)?v:'UNKNOWN';
  return {event_id:'network-event-'+sha(page+':'+event.sequence),event_type:event.kind,native_event_type:networkEventTypes[event.kind],
    journal_sequence:event.sequence,page_id:page,request_id:'UNKNOWN',identity_resolution_status:'UNRESOLVED',
    reconciliation_status:'FAIL_CLOSED',gate_effect:'BLOCK',
    observed_state:{REQUEST:'PENDING',RESPONSE:'NON_TERMINAL',FAILED:'FAILED',FINISHED:'FINISHED',REDIRECTED:'REDIRECTED'}[event.kind],
    rsc:tri(event.rsc),prefetch:tri(event.prefetch),canceled:tri(event.canceled),
    status:Number.isInteger(event.status)?event.status:'UNKNOWN',redirect_status:Number.isInteger(event.redirect_status)?event.redirect_status:'UNKNOWN',
    error_code:/^net::ERR_[A-Z_]+$/.test(event.error_code??'')?event.error_code:'UNKNOWN',
    resource_type:['Document','Stylesheet','Image','Media','Font','Script','TextTrack','XHR','Fetch','Prefetch','EventSource','WebSocket','Manifest','SignedExchange','Ping','CSPViolationReport','Preflight','Other'].includes(event.resource_type)?event.resource_type:'UNKNOWN'};
}
function validateUnresolvedNetworkEvidence(v) {
  requireReceiptData(v);
  need(v&&typeof v==='object'&&!Array.isArray(v),'UNRESOLVED_EVENT_INVALID');
  const expected=unresolvedNetworkEvidence({...v,kind:v.event_type,sequence:v.journal_sequence});
  need(canonical(v).equals(canonical(expected)),'UNRESOLVED_EVENT_INVALID');return expected;
}

// Only observation identity and sanitized ownership; never exception text or payloads.
export function validateFailureEvidence(value) {
  need(value && typeof value==='object' && !Array.isArray(value),'FAILURE_IDENTITY_INVALID');
  const keys=['failure_id','native_event_id','native_event_type','identity_basis','page_id','observed_transition_id','related_request_id','parent_protocol_sha256'];
  const descriptors=Object.getOwnPropertyDescriptors(value);
  need(Object.keys(descriptors).length===keys.length && keys.every(k=>Object.hasOwn(descriptors[k]??{},'value') && typeof descriptors[k].value==='string'),'FAILURE_IDENTITY_INVALID');
  const v=Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
  need(/^failure-[a-f0-9]{64}$/.test(v.failure_id)&&/^[a-f0-9]{64}$/.test(v.native_event_id)&&/^page-[1-9][0-9]*$/.test(v.page_id),'FAILURE_IDENTITY_INVALID');
  need(['Runtime.consoleAPICalled','Runtime.exceptionThrown','Log.entryAdded'].includes(v.native_event_type)&&['PROTOCOL_ID','CAPTURE_ORDINAL'].includes(v.identity_basis),'FAILURE_IDENTITY_INVALID');
  need(v.observed_transition_id==='UNKNOWN'||/^transition-[1-9][0-9]*$/.test(v.observed_transition_id),'FAILURE_IDENTITY_INVALID');
  need(v.related_request_id==='UNKNOWN'||/^capture-[a-f0-9-]+:page-[1-9][0-9]*:document-[1-9][0-9]*:request-[1-9][0-9]*$/.test(v.related_request_id),'FAILURE_IDENTITY_INVALID');
  need(v.parent_protocol_sha256==='UNKNOWN'||/^[a-f0-9]{64}$/.test(v.parent_protocol_sha256),'FAILURE_IDENTITY_INVALID');
  return v;
}

// Capture source identity without parsing or coercing an untrusted source label.
// A script's relative sourceURL is not proof of a document-relative resource.
export function sourceURLObservation(value) {
  const string=typeof value==='string';
  return {raw_sha256:string?sha(value):'UNKNOWN',raw_type:string?'STRING':value==null?'MISSING':'INVALID_TYPE',
    raw_shape:!string?'UNKNOWN':!value?'EMPTY':/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)?'ABSOLUTE':'RELATIVE'};
}
function sourceLocation(value) {
  if(value==null||value==='')return {url:null};
  const observed=sourceURLObservation(value);
  try {if(typeof value!=='string')throw new TypeError();return {url:new URL(value)};}
  catch {return {url:null,source_url_evidence:{...observed,base_identity:'UNKNOWN',
    normalization_status:observed.raw_shape==='RELATIVE'?'UNRESOLVED':'FAILED',
    normalization_failure:observed.raw_shape==='RELATIVE'?'MISSING_AUTHORITATIVE_BASE':'INVALID_URL'}};}
}

// No headers, cookies, bodies, tokens, full request objects or stacks are stored.
export function safeEvent(event) {
  const ingress=Object.hasOwn(event,'ingress_failure')?validateIngressFailure(event.ingress_failure):undefined;
  if(ingress)need(event.kind==='native_interpretation_failure'&&!Object.hasOwn(event,'request_evidence')&&!Object.hasOwn(event,'failure_evidence')&&!Object.hasOwn(event,'unresolved_evidence'),'INGRESS_IDENTITY_INVALID');
  const {url,source_url_evidence}=sourceLocation(event.url);
  const requestEvidence = Object.hasOwn(event,'request_evidence') ? validateRequestEvidence(Object.getOwnPropertyDescriptor(event,'request_evidence')?.value) : undefined;
  const unresolved = Object.hasOwn(event,'unresolved_evidence') ? validateUnresolvedNetworkEvidence(event.unresolved_evidence) : undefined;
  if(unresolved)need(event.kind==='unresolved_network_event'&&!requestEvidence&&!Object.hasOwn(event,'failure_evidence'),'UNRESOLVED_EVENT_INVALID');
  return { ...(ingress?{ingress_failure:ingress}:{}), ...(source_url_evidence?{source_url_evidence}:{}), ...(unresolved?{unresolved_evidence:unresolved}:{}), ...(requestEvidence ? {request_evidence:requestEvidence} : {}), ...(Object.hasOwn(event,'failure_evidence') ? {failure_evidence:validateFailureEvidence(Object.getOwnPropertyDescriptor(event,'failure_evidence')?.value)} : {}), kind: event.kind, origin: url?.origin ?? '', path: url?.origin === 'https://vercel.live' && url.pathname.startsWith('/_next-live/feedback/') ? '/_next-live/feedback/' : url ? sha(url.pathname) : '',
    type: event.type ?? '', status: event.status ?? 0, canceled: event.canceled === true,
    rsc: event.rsc === 'UNKNOWN' ? 'UNKNOWN' : event.rsc === true, prefetch: event.prefetch === 'UNKNOWN' ? 'UNKNOWN' : event.prefetch === true,
    error_code: /^net::ERR_[A-Z_]+$/.test(event.error_code ?? '') ? event.error_code : '', source: ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.source) ? event.source : '',
    ...(ingress?{rsc:'UNKNOWN',prefetch:'UNKNOWN'}:{}),
    ...(unresolved?{rsc:unresolved.rsc,prefetch:unresolved.prefetch,canceled:unresolved.canceled,status:unresolved.status,error_code:unresolved.error_code,type:unresolved.resource_type}:{}) };
}
export function classifyEvent(event) {
  const safe = safeEvent(event);
  if(safe.ingress_failure||safe.unresolved_evidence||safe.source_url_evidence)return {event:safe,classification:'unclassified'};
  // Proven platform source, never a generic substring or all third-party failures.
  if (safe.origin === 'https://vercel.live' && safe.path.startsWith('/_next-live/feedback/') &&
      ['request_failure', 'console_error', 'exception'].includes(safe.kind))
    return { event: safe, classification: 'platform_non_application' };
  if (safe.kind === 'request_failure') return { event: safe, classification: 'required_application_request_failure' };
  if (safe.kind === 'console_error') return { event: safe, classification: 'application_console_error' };
  if (safe.kind === 'exception') return { event: safe, classification: 'hydration_or_application_exception' };
  return { event: safe, classification: 'unclassified' };
}
export function account(events, finalProductPassed, origin, transitionEvidence) {
  void finalProductPassed; // Legacy signature only: global product success is not classification authority.
  const transition_receipts = transitionEvidence === undefined ? null : validateTransitionReceipts(transitionEvidence,events.map(safeEvent),origin);
  const completed = new Set(transition_receipts?.records.filter(p=>safeEvent(events[p.event_index]).origin===origin).map(p=>p.event_index)??[]);
  const ledger = events.map((e,index) => completed.has(index) ? {event:safeEvent(e),classification:transitionClass} : classifyEvent(e));
  function group(type) {
    const counts = new Map();
    for (const item of ledger.filter(e => e.classification === type)) {
      const hash = sha(canonical(item.event)); counts.set(hash, (counts.get(hash) ?? 0) + 1);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([sha256, count]) => ({ sha256, count, classification: type }));
  }
  return { raw_platform_events: group('platform_non_application'), raw_rsc_events: group(transitionClass),
    application_console_errors: ledger.filter(e => e.classification === 'application_console_error').length,
    required_application_request_failures: ledger.filter(e => e.classification === 'required_application_request_failure').length,
    hydration_errors: ledger.filter(e => e.classification === 'hydration_or_application_exception').length,
    unclassified_failures: ledger.filter(e => e.classification === 'unclassified').map(e => sha(canonical(e.event))), ledger, ...(transition_receipts ? {transition_receipts} : {}) };
}
