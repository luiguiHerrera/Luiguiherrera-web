import { bindRequest, startContextFingerprint } from './probe-request-instances.mjs';
// Probe-only transition authority. No raw URLs, headers, CDP IDs, values or stacks leave this module.
import { types } from 'node:util';
import { canonical, sha } from './release-core.mjs';
export const transitionSchema = 'statistical-levels.probe-transition-receipts.v2';
export const transitionClass = 'rsc_transition_completed_non_application';
const state = (asset, frequency, window) => Object.freeze({ asset, frequency, window });
export const transitions = Object.freeze(Object.fromEntries([
  ['T1',132,'sl-main:L132:C9:c-click',state('SPY','weekly','5Y'),state('SPY','weekly','3Y')],
  ['T2',135,'sl-main:L135:C41:c-click',state('SPY','weekly','5Y'),state('GLD','weekly','5Y')],
  ['T3',136,'sl-main:L136:C36:select',state('GLD','weekly','5Y'),state('GLD','daily','5Y')],
  ['T4',137,'sl-main:L137:C9:select',state('GLD','daily','5Y'),state('GLD','daily','Full')],
].map(([kind,line,action_id,from_state,target_state]) => [kind,Object.freeze({kind,suite_id:'sl-main',test_id:`sl-main:L${line}`,action_id,from_state,target_state,route:'/niveles-estadisticos'})])));
const need = value => { if (!value) throw new Error('TRANSITION_RECEIPT_INVALID'); };
export function requireReceiptData(value, depth=0) {
  need(depth < 24);
  if (value===null || ['string','boolean','number'].includes(typeof value)) { need(typeof value!=='number'||Number.isFinite(value));return; }
  need(value && typeof value==='object' && !types.isProxy(value));
  need(Array.isArray(value)||[Object.prototype,null].includes(Object.getPrototypeOf(value)));
  for (const key of Reflect.ownKeys(value)) { need(typeof key==='string');const d=Object.getOwnPropertyDescriptor(value,key);need(Object.hasOwn(d,'value'));if(key!=='length')requireReceiptData(d.value,depth+1); }
  if(Array.isArray(value)) need(Reflect.ownKeys(value).length===value.length+1 && Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean));
}
const equal=(a,b)=>canonical(a).equals(canonical(b));
const exact=(v,keys)=>need(v&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(','));
const proofKeys=['request_start_context_sha256','request_instance_id','transition_id','page_id','kind','suite_id','test_id','action_id','from_state','target_state','route','request_sequence','request_count','event_index','raw_event_sha256','request_target','same_origin','method','rsc','prefetch','start_sequence','response_sequence','abort_sequence','completion_sequence','response_status','canceled','error_code','page_active','readiness_pass','metric_pass','application_exception','product_failure','conflicting_identity'];
export function validateTransitionReceipts(input, safeEvents, origin) {
  requireReceiptData(input);exact(input,['schema_version','records','capture_issues']);need(input.schema_version===transitionSchema&&Array.isArray(input.records)&&input.records.length<=10000);
  need(Array.isArray(input.capture_issues)&&input.capture_issues.every(v=>['TRANSITION_CAPTURE_INVALID','TRANSITION_OVERLAP','TRANSITION_COMPLETION_INVALID'].includes(v)));
  need(input.capture_issues.length===0);
  if(safeEvents){requireReceiptData(safeEvents);need(Array.isArray(safeEvents)&&safeEvents.length<=100000);}
  const ids=new Set(),requests=new Set(),indices=new Set();
  for(const p of input.records) {
    exact(p,proofKeys);const spec=transitions[p.kind];need(spec);
    const binding=bindRequest(p,safeEvents);need(binding.active_transition_id===p.transition_id&&binding.network_request_ordinal===p.request_sequence&&binding.method===p.method&&binding.document_path_sha256===sha(p.route)&&binding.request_start_context_sha256===p.request_start_context_sha256&&binding.active_transition_context_sha256===startContextFingerprint(spec)&&binding.consumer.kind==='transition'&&equal(binding.consumer.target,p.request_target));
    for(const k of ['kind','suite_id','test_id','action_id','from_state','target_state','route'])need(equal(p[k],spec[k]));
    need(/^transition-[1-9][0-9]{0,14}$/.test(p.transition_id)&&/^page-[1-9][0-9]{0,14}$/.test(p.page_id));
    need(Number.isSafeInteger(p.request_sequence)&&p.request_sequence>0&&p.request_count===1);
    need(Number.isSafeInteger(p.event_index)&&p.event_index>=0&&/^[a-f0-9]{64}$/.test(p.raw_event_sha256));
    need(!ids.has(p.transition_id)&&!requests.has(p.page_id+':'+p.request_sequence)&&!indices.has(p.event_index));
    ids.add(p.transition_id);requests.add(p.page_id+':'+p.request_sequence);indices.add(p.event_index);
    need(equal(p.request_target,p.target_state)&&p.same_origin===true&&p.method==='GET'&&p.rsc===true&&p.prefetch===false);
    need([p.start_sequence,p.response_sequence,p.abort_sequence,p.completion_sequence].every(v=>Number.isSafeInteger(v)&&v>0));
    need(p.start_sequence<p.response_sequence&&p.response_sequence<p.abort_sequence&&p.start_sequence<p.completion_sequence);
    need(Number.isInteger(p.response_status)&&p.response_status>=200&&p.response_status<300&&p.canceled===true&&p.error_code==='net::ERR_ABORTED');
    need(p.page_active===true&&p.readiness_pass===true&&p.metric_pass===true&&p.application_exception===false&&p.product_failure===false&&p.conflicting_identity===false);
    if(safeEvents) { const event=safeEvents[p.event_index];need(event&&sha(canonical(event))===p.raw_event_sha256&&(!origin||event.origin===origin));need(event.kind==='request_failure'&&event.status<400&&event.rsc===true&&event.prefetch===false&&event.canceled===true&&event.error_code==='net::ERR_ABORTED'&&event.path===sha(p.route)&&['XHR','Fetch'].includes(event.type)); }
  }
  return JSON.parse(canonical(input));
}
export function createTransitionCapture(origin) {
  let sequence=0,ordinal=0;const active=new Map(),all=[],requests=new Map(),issues=[];
  const tick=()=>++sequence;
  function start(pageId,kind,context,lifecycle) {
    try {
      const spec=transitions[kind];need(spec&&lifecycle==='ACTIVE');
      need(context?.suite_id===spec.suite_id&&context?.test_id===spec.test_id&&context?.action_id===spec.action_id);
      if(active.has(pageId)){issues.push('TRANSITION_OVERLAP');active.get(pageId).conflicting=true;}
      const t={...spec,transition_id:'transition-'+(++ordinal),page_id:pageId,requests:[],started:tick(),completion:null,exception:false,conflicting:false,page_active:true};
      all.push(t);active.set(pageId,t);return t.transition_id;
    }catch{issues.push('TRANSITION_CAPTURE_INVALID');return null;}
  }
  function request(pageId,requestId,event,lifecycle,binding) {
    const t=active.get(pageId);if(!t)return;
    const h=Object.fromEntries(Object.entries(event.request.headers).map(([k,v])=>[k.toLowerCase(),v]));
    const rsc=h.rsc==='1',prefetch=h['next-router-prefetch']==='1'||h.purpose==='prefetch';
    if(!rsc||prefetch)return;
    let request_target=null,same_origin=false,route=null;
    try{const u=new URL(event.request.url);same_origin=u.origin===origin&&!u.username&&!u.password;route=u.pathname;
      if(['asset','frequency','window'].every(k=>u.searchParams.getAll(k).length===1)&&!u.searchParams.has('symbol'))request_target=Object.fromEntries(['asset','frequency','window'].map(k=>[k,u.searchParams.get(k)]));}catch{}
    const key=pageId+':'+requestId;
    if(requests.has(key)){t.conflicting=true;requests.get(key).t.conflicting=true;}
    const r={t,request_start_context_sha256:binding?.request_start_context_sha256,request_instance_id:binding?.request_instance_id,request_sequence:binding?.network_request_ordinal,request_target,same_origin,route,method:event.request.method,rsc,prefetch,start_sequence:tick(),page_active:lifecycle==='ACTIVE',type:event.type};
    t.requests.push(r);requests.set(key,r);
  }
  function response(pageId,id,status,lifecycle){const r=requests.get(pageId+':'+id);if(r){r.response_status=status;r.response_sequence=tick();r.page_active&&=lifecycle==='ACTIVE';}}
  function failure(pageId,id,event,index,lifecycle){const r=requests.get(pageId+':'+id);if(r){r.abort_sequence=tick();r.canceled=event.canceled===true;r.error_code=event.errorText==='net::ERR_ABORTED'?event.errorText:'OTHER';r.event_index=index;r.page_active&&=lifecycle==='ACTIVE';}}
  function complete(pageId,kind,{metric,readiness,productFailure=false},lifecycle) {
    const t=active.get(pageId);
    if(!t||t.kind!==kind){issues.push('TRANSITION_COMPLETION_INVALID');return;}
    t.completion={sequence:tick(),metric,readiness,productFailure};t.page_active&&=lifecycle==='ACTIVE';active.delete(pageId);
  }
  function pageClosing(pageId){const t=active.get(pageId);if(t)t.page_active=false;}
  function exception(pageId){for(const t of all)if(t.page_id===pageId&&!t.completion)t.exception=true;}
  function evidence(safeEvents) {
    const records=[];
    for(const t of all){if(t.requests.length!==1||!t.completion)continue;const r=t.requests[0];if(r.event_index===undefined||r.route!==t.route)continue;
      const p={...Object.fromEntries(['kind','suite_id','test_id','action_id','from_state','target_state','route','transition_id','page_id'].map(k=>[k,t[k]])),request_start_context_sha256:r.request_start_context_sha256,request_instance_id:r.request_instance_id,request_sequence:r.request_sequence,request_count:t.requests.length,event_index:r.event_index,raw_event_sha256:sha(canonical(safeEvents[r.event_index])),request_target:r.request_target,same_origin:r.same_origin,method:r.method,rsc:r.rsc,prefetch:r.prefetch,start_sequence:r.start_sequence,response_sequence:r.response_sequence??0,abort_sequence:r.abort_sequence,completion_sequence:t.completion.sequence,response_status:r.response_status??0,canceled:r.canceled,error_code:r.error_code,page_active:t.page_active&&r.page_active,readiness_pass:t.completion.readiness===true,metric_pass:t.completion.metric===true,application_exception:t.exception,product_failure:t.completion.productFailure!==false,conflicting_identity:t.conflicting};
      try{validateTransitionReceipts({schema_version:transitionSchema,records:[p],capture_issues:[]},safeEvents);records.push(p);}catch{/* Raw failure stays blocking. */}
    }
    return {schema_version:transitionSchema,records,capture_issues:[...new Set(issues)]};
  }
  return {start,request,response,failure,complete,pageClosing,exception,evidence};
}
