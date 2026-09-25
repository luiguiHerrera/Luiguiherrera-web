// Collector-owned identities. CDP request/frame/loader identifiers never leave memory.
import { randomUUID } from 'node:crypto';
import { canonical, sha } from './release-core.mjs';
import { requireReceiptData } from './probe-transition-receipts.mjs';
const need=x=>{if(!x)throw new Error('REQUEST_INSTANCE_INVALID');};
const exact=(v,keys)=>need(v&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(','));
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function destinationFingerprint(value,origin) {
  try {const u=new URL(value);if(u.origin!==origin||u.username||u.password||!['http:','https:'].includes(u.protocol))return null;
    // Next's _rsc cache-busting key is transport metadata; preserve every other query,
    // including duplicate-value ordering. URLSearchParams.sort is stable.
    u.searchParams.delete('_rsc');u.searchParams.sort();return sha(canonical({origin:u.origin,path:u.pathname,query:u.searchParams.toString()}));
  }catch{return null;}
}
export function startContextFingerprint(context) {
  return sha(canonical(Object.fromEntries(['suite_id','test_id','action_id'].map(k=>[k,typeof context?.[k]==='string'?context[k]:null]))));
}
export function validateRequestEvidence(v) {
  requireReceiptData(v);exact(v,['capture_id','request_instance_id','page_id','document_instance_id','network_request_ordinal','document_proven','destination_sha256','document_path_sha256','method','request_start_context_sha256','active_transition_id','active_transition_context_sha256','consumer']);
  need(/^capture-[a-f0-9-]{36}$/.test(v.capture_id)&&/^page-[1-9][0-9]{0,14}$/.test(v.page_id));
  need(/^document-[1-9][0-9]{0,14}$/.test(v.document_instance_id)&&Number.isSafeInteger(v.network_request_ordinal)&&v.network_request_ordinal>0);
  need(v.request_instance_id===v.capture_id+':'+v.page_id+':'+v.document_instance_id+':request-'+v.network_request_ordinal);
  need(typeof v.document_proven==='boolean'&&(v.destination_sha256===null||hash(v.destination_sha256))&&hash(v.document_path_sha256)&&hash(v.request_start_context_sha256));
  need(['GET','POST','PUT','DELETE','HEAD','OPTIONS','PATCH','OTHER'].includes(v.method));
  need(v.active_transition_id===null||/^transition-[1-9][0-9]{0,14}$/.test(v.active_transition_id));
  need(v.active_transition_context_sha256===null||hash(v.active_transition_context_sha256));need((v.active_transition_id===null)===(v.active_transition_context_sha256===null));
  const c=v.consumer;need(c&&typeof c==='object');
  if(c.kind==='unknown')exact(c,['kind']);
  else if(c.kind==='transition') {exact(c,['kind','target']);exact(c.target,['asset','frequency','window']);need(['SPY','GLD'].includes(c.target.asset)&&['weekly','daily'].includes(c.target.frequency)&&['5Y','3Y','Full'].includes(c.target.window));}
  else need(false);
  return JSON.parse(canonical(v));
}
export function bindRequest(p,events) {
  need(Array.isArray(events));const raw=events[p.event_index];need(raw&&Object.hasOwn(raw,'request_evidence'));
  const v=validateRequestEvidence(raw.request_evidence);need(v.document_proven&&v.destination_sha256!==null);
  need(p.request_instance_id===v.request_instance_id&&p.page_id===v.page_id);
  need(events.filter(e=>e.request_evidence?.request_instance_id===v.request_instance_id).length===1);
  return v;
}
export function createRequestInstanceCollector(origin) {
  const capture_id='capture-'+randomUUID(),pages=new Map();let ordinal=0,documentOrdinal=0;
  function page(id){if(!pages.has(id))pages.set(id,{documents:new Map()});return pages.get(id);}
  function document(p,frame,loader){const key=frame&&loader?frame+':'+loader:null;if(key&&p.documents.has(key))return p.documents.get(key);const id='document-'+(++documentOrdinal);if(key)p.documents.set(key,id);return id;}
  function frameNavigated(pageId,frame){document(page(pageId),frame.id,frame.loaderId);}
  function request(pageId,e,context,active_transition_id,transitionContext=context) {
    const p=page(pageId),document_instance_id=document(p,e.frameId,e.loaderId),network_request_ordinal=++ordinal;
    let doc;try{doc=new URL(e.documentURL);}catch{doc=null;}
    const v={capture_id,request_instance_id:capture_id+':'+pageId+':'+document_instance_id+':request-'+network_request_ordinal,page_id:pageId,document_instance_id,network_request_ordinal,
      document_proven:!!(e.frameId&&e.loaderId&&doc?.origin===origin&&!doc.username&&!doc.password),destination_sha256:destinationFingerprint(e.request.url,origin),document_path_sha256:sha(doc?.pathname??''),
      method:['GET','POST','PUT','DELETE','HEAD','OPTIONS','PATCH'].includes(e.request.method)?e.request.method:'OTHER',request_start_context_sha256:startContextFingerprint(context),active_transition_id:active_transition_id??null,active_transition_context_sha256:active_transition_id?startContextFingerprint(transitionContext):null,consumer:{kind:'unknown'}};
    const headers=Object.fromEntries(Object.entries(e.request.headers??{}).map(([k,v])=>[k.toLowerCase(),v]));
    if(v.active_transition_id&&headers.rsc==='1'&&headers['next-router-prefetch']!=='1'&&headers.purpose!=='prefetch') {
      try{const u=new URL(e.request.url),target=Object.fromEntries(['asset','frequency','window'].map(k=>[k,u.searchParams.get(k)]));
        if(v.destination_sha256&&['asset','frequency','window'].every(k=>u.searchParams.getAll(k).length===1)&&!u.searchParams.has('symbol')&&['SPY','GLD'].includes(target.asset)&&['weekly','daily'].includes(target.frequency)&&['5Y','3Y','Full'].includes(target.window))v.consumer={kind:'transition',target};}catch{}
    }
    // All binding authority is fixed at request start; no asynchronous consumer update.
    if(v.consumer.target)Object.freeze(v.consumer.target);
    Object.freeze(v.consumer);Object.freeze(v);return v;
  }
  return {request,frameNavigated};
}
