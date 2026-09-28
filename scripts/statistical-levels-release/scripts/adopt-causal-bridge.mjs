// Browser-owned script IDs join a harness-issued action to CDP request initiators.
// No URL matching, request header injection, fetch replacement or timing attribution.
import { randomUUID } from 'node:crypto';
import { sha, need } from './release-core.mjs';
export const actionControls = Object.freeze({
  T1:{type:'CLICK',selector:'[data-window="3Y"]'},
  T2:{type:'CLICK',selector:'.sl-picker-group button[title="SPDR Gold Shares"]'},
  T3:{type:'EVALUATE',selector:'#sl-options label:first-child select',value:'daily'},
  T4:{type:'EVALUATE',selector:'#sl-options label:nth-child(2) select',value:'Full'}
});
export const listenerMarker = `(function(callback, receiver, event) { return typeof callback === 'function' ? Reflect.apply(callback, receiver, [event]) : Reflect.apply(callback.handleEvent, callback, [event]); })`;
export function selectionExpression(kind) {
  const c=actionControls[kind];
  return `(() => { const el=document.querySelector(${JSON.stringify(c.selector)}); el.value=${JSON.stringify(c.value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`;
}
export const scriptFingerprint=(page,id)=>sha(page+':script:'+id);
export function initiatorScripts(page,initiator) {
  const scripts=[];let stack=initiator?.stack,depth=0;
  while(stack&&depth++<32) {
    for(const frame of stack.callFrames??[])if(typeof frame.scriptId==='string')scripts.push(scriptFingerprint(page,frame.scriptId));
    if(stack.parentId)return {scripts:[...new Set(scripts)],complete:false};
    stack=stack.parent;
  }
  return {scripts:[...new Set(scripts)],complete:!stack};
}
export function classifyRequestSignals(headers,resourceType) {
  if(!headers||typeof headers!=='object')return {rsc:'UNKNOWN',prefetch:'UNKNOWN'};
  const values=name=>Object.entries(headers).filter(([k])=>k.toLowerCase()===name).map(([,v])=>v);
  const r=values('rsc'),n=values('next-router-prefetch'),p=values('purpose'),s=values('sec-purpose');
  const contradiction=[r,n,p,s].some(v=>new Set(v).size>1);
  if(contradiction||(n[0]==='0'&&(p[0]==='prefetch'||s.some(v=>typeof v==='string'&&v.split(/[;, ]+/).includes('prefetch')))))return {rsc:'UNKNOWN',prefetch:'UNKNOWN'};
  const rsc=r.length===0?'NO':r[0]==='1'?'YES':r[0]==='0'?'NO':'UNKNOWN';
  const prefetch=n[0]==='1'||p[0]==='prefetch'||typeof s[0]==='string'&&s[0].split(/[;, ]+/).includes('prefetch')?'YES':
    n[0]==='0'&&!p.length&&!s.length?'NO':'UNKNOWN';
  return {rsc,prefetch:resourceType==='Prefetch'?(n[0]==='0'?'UNKNOWN':'YES'):prefetch};
}

// Persist positive classification basis, never headers or header values.
export function classificationEvidence(signals,resourceType) {
  return {rsc:signals.rsc==='YES'?'RSC_SIGNAL':signals.rsc==='NO'?'NON_RSC_SIGNAL':'UNKNOWN',
    prefetch:signals.prefetch==='NO'?'EXPLICIT_ROUTER_NON_PREFETCH':signals.prefetch==='YES'?(resourceType==='Prefetch'?'BROWSER_PREFETCH_TYPE':'EXPLICIT_PREFETCH_SIGNAL'):'UNKNOWN'};
}

// Only click listeners are instrumented. Native add/remove semantics, event object,
// arguments, receiver, result and exceptions are preserved; no event is generated.
export function clickObserverSource(key) {
  return `(() => {
    const add=EventTarget.prototype.addEventListener, remove=EventTarget.prototype.removeEventListener;
    const targets=new WeakMap(); let armed=null;
    // One native listener identity across capture/once/passive/signal option
    // forms. Native add/remove performs all option reads and deduplication.
    function wrapperFor(target,listener,create) {
      let listeners=targets.get(target);
      if(!listeners&&create)targets.set(target,listeners=new WeakMap());
      let wrapper=listeners?.get(listener);
      if(!wrapper&&create){wrapper=function(event){
        const a=armed;
        if(a&&event.isTrusted&&a.node.contains(event.target)&&(!a.event||a.event===event)) {
          a.event=event;a.calls++;return a.marker(listener,this,event);
        }
        return typeof listener==='function'?Reflect.apply(listener,this,[event]):Reflect.apply(listener.handleEvent,listener,[event]);
      };listeners.set(listener,wrapper);}
      return wrapper;
    }
    EventTarget.prototype.addEventListener=function(type,listener,options) {
      if(arguments.length<2)return Reflect.apply(add,this,arguments);
      const name=\`\${type}\`;
      if(name!=='click'||!listener||!['function','object'].includes(typeof listener))return Reflect.apply(add,this,[name,listener,options]);
      return Reflect.apply(add,this,[name,wrapperFor(this,listener,true),options]);
    };
    EventTarget.prototype.removeEventListener=function(type,listener,options) {
      if(arguments.length<2)return Reflect.apply(remove,this,arguments);
      const name=\`\${type}\`;
      const wrapper=name==='click'&&listener&&['function','object'].includes(typeof listener)?wrapperFor(this,listener,false):null;
      return Reflect.apply(remove,this,[name,wrapper??listener,options]);
    };
    Object.defineProperty(globalThis,${JSON.stringify(key)},{value:{
      arm(marker,selector){const node=document.querySelector(selector);if(!node||armed)return false;armed={marker,node,event:null,calls:0};return true;},
      disarm(){const result={event_seen:!!armed?.event,listener_calls:armed?.calls??0};armed=null;return result;}
    }});
  })()`;
}

export async function installCausalBridge(cdp,pageId,register,complete,begin) {
  const key='__sl_action_'+randomUUID().replaceAll('-','');
  await cdp.send('Debugger.enable');
  await cdp.send('Debugger.setAsyncCallStackDepth',{maxDepth:32});
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:clickObserverSource(key)});
  async function compile(action,expression) {
    const sourceURL='https://sl-qa.invalid/action/'+action.action_instance_id;
    const compiled=await cdp.send('Runtime.compileScript',{expression,sourceURL,persistScript:true});
    need(compiled.scriptId&&!compiled.exceptionDetails,'ACTION_BRIDGE_COMPILE_FAILED');
    const record={...action,page_id:pageId,script_sha256:scriptFingerprint(pageId,compiled.scriptId),source_sha256:sha(expression),source_url_sha256:sha(sourceURL)};
    register(record);return {scriptId:compiled.scriptId,record};
  }
  async function click(action,selector,dispatch) {
    need(actionControls[action.kind]?.type==='CLICK'&&selector===actionControls[action.kind].selector,'ACTION_CONTROL_MISMATCH');
    const {scriptId}=await compile(action,listenerMarker);
    const marker=await cdp.send('Runtime.runScript',{scriptId,returnByValue:false});
    need(marker.result?.objectId&&!marker.exceptionDetails,'ACTION_BRIDGE_MARKER_FAILED');
    const bridge=await cdp.send('Runtime.evaluate',{expression:`globalThis[${JSON.stringify(key)}]`,returnByValue:false});
    need(bridge.result?.objectId,'ACTION_BRIDGE_NOT_INSTALLED');
    const armed=await cdp.send('Runtime.callFunctionOn',{objectId:bridge.result.objectId,functionDeclaration:'function(marker,selector){return this.arm(marker,selector);}',arguments:[{objectId:marker.result.objectId},{value:selector}],returnByValue:true});
    need(armed.result?.value===true&&!armed.exceptionDetails,'ACTION_BRIDGE_ARM_FAILED');
    let dispatched=false;
    try {begin(action.action_instance_id);await dispatch();dispatched=true;}
    finally {
      const state=await cdp.send('Runtime.callFunctionOn',{objectId:bridge.result.objectId,functionDeclaration:'function(){return this.disarm();}',returnByValue:true});
      complete(action.action_instance_id,{dispatch_ack:dispatched,event_seen:state.result?.value?.event_seen===true,listener_calls:state.result?.value?.listener_calls??0});
      await cdp.send('Runtime.releaseObject',{objectId:marker.result.objectId});
      await cdp.send('Runtime.releaseObject',{objectId:bridge.result.objectId});
    }
  }
  async function evaluate(action,expression) {
    need(actionControls[action.kind]?.type==='EVALUATE'&&expression===selectionExpression(action.kind),'ACTION_CONTROL_MISMATCH');
    const {scriptId}=await compile(action,expression);
    begin(action.action_instance_id);
    const result=await cdp.send('Runtime.runScript',{scriptId,returnByValue:true,awaitPromise:true});
    complete(action.action_instance_id,{dispatch_ack:!result.exceptionDetails,event_seen:null,listener_calls:null});
    return result;
  }
  return {click,evaluate};
}
export function newAction(t) {
  return {action_instance_id:'action-'+randomUUID(),transition_id:t.transition_id,kind:t.kind,tested_action_id:t.context.action_id};
}
export function causalDecision(request,actions,requests) {
  const matches=actions.filter(a=>a.page_id===request.request_evidence.page_id&&request.initiator_scripts.scripts.includes(a.script_sha256));
  if(matches.length!==1||!request.initiator_scripts.complete)return {status:'UNKNOWN',action_instance_id:'UNKNOWN',action_ancestry:'UNKNOWN'};
  const a=matches[0],control=actionControls[a.kind];
  const expectedSource=control?.type==='CLICK'?listenerMarker:control?selectionExpression(a.kind):'';
  const siblings=requests.filter(r=>r.initiator_scripts.scripts.includes(a.script_sha256)&&r.prefetch_classification!=='YES');
  const ancestry=!!control&&a.source_sha256===sha(expectedSource)&&a.dispatch_ack===true&&
    (control.type==='EVALUATE'||a.event_seen===true&&a.listener_calls>0);
  const proven=ancestry&&
    request.transition_id===a.transition_id&&request.transition_type===a.kind&&request.metadata.method==='GET'&&
    request.rsc_classification==='YES'&&request.prefetch_classification==='NO'&&
    request.initiator.type==='script'&&request.causal_relation==='CDP_SCRIPT_INITIATOR'&&
    request.causal_parent==='script:'+request.initiator_scripts.scripts[0]&&
    request.initiator.parent_protocol_sha256==='UNKNOWN'&&siblings.length===1;
  return {status:proven?'PROVEN':'UNKNOWN',action_instance_id:a.action_instance_id,action_ancestry:ancestry?'PROVEN':'UNKNOWN'};
}
