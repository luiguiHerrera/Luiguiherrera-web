import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { createAdoptRequestEvidence,auditAdoptRequestEvidence } from '../scripts/adopt-request-evidence.mjs';
import { actionControls,listenerMarker,selectionExpression,scriptFingerprint,classifyRequestSignals,installCausalBridge,clickObserverSource } from '../scripts/adopt-causal-bridge.mjs';
import { transitions } from '../scripts/probe-transition-receipts.mjs';
import { account } from '../scripts/network-accounting.mjs';
import { sha,canonical } from '../scripts/release-core.mjs';
const origin='https://www.luiguiherrera.com',page='page-1';
function setup(kind='T1') {
 const c=createAdoptRequestEvidence(origin),raw=[];c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');c.observability.context(transitions[kind]);c.start(page,kind);
 const control=actionControls[kind],a=c.action(page,control.type,control.type==='CLICK'?control.selector:selectionExpression(kind));
 c.registerAction({...a,script_sha256:scriptFingerprint(page,'marker'),source_sha256:sha(control.type==='CLICK'?listenerMarker:selectionExpression(kind)),source_url_sha256:sha('https://sl-qa.invalid/action/'+a.action_instance_id)});c.beginAction(a.action_instance_id);
 function request({id='r',marker=true,headers={RSC:'1','Next-Router-Prefetch':'0'},redirect=false,incomplete=false,parent,sourceURL,stack}={}) {
   const url=origin+'/niveles-estadisticos?'+new URLSearchParams(transitions[kind].target_state);
   const event={requestId:id,type:'Fetch',frameId:'f',loaderId:'l',documentURL:origin+'/niveles-estadisticos',request:{url,method:'GET',headers},
     initiator:{type:'script',...(parent?{requestId:parent}:{}),stack:stack??{callFrames:[{scriptId:marker?'marker':'unrelated',url:sourceURL??origin+'/app.js',lineNumber:0,columnNumber:0}],...(incomplete?{parentId:{id:'unresolved'}}:{})}},...(redirect?{redirectResponse:{status:307}}:{})};
   const b=c.request(page,event);return {event,b};
 }
 function fail(r) {c.response(page,{requestId:r.event.requestId,response:{status:200}});c.failure(page,{requestId:r.event.requestId,canceled:true,errorText:'net::ERR_ABORTED'},raw.length);
   const f=classifyRequestSignals(r.event.request.headers);raw.push({request_evidence:r.b,kind:'request_failure',url:r.event.request.url,type:'Fetch',rsc:f.rsc==='YES',prefetch:f.prefetch==='YES',canceled:true,error_code:'net::ERR_ABORTED'});}
 function finish() {c.completeAction(a.action_instance_id,{dispatch_ack:true,event_seen:control.type==='CLICK'?true:null,listener_calls:control.type==='CLICK'?1:null});c.complete(page,kind,true);c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();
   const receipts=c.receipts(raw),result=account(raw,false,origin,c.admittedReceipts(receipts)),evidence=c.evidence(raw,result,receipts);return {receipts,result,evidence,audit:()=>auditAdoptRequestEvidence(evidence,raw,result,origin,[kind])};}
 return {c,raw,a,request,fail,finish};
}
for(const kind of ['T1','T2','T3','T4'])test('causal bridge: '+kind+' maps action → request → transition → receipt → one accounting entry',()=>{
 const f=setup(kind);f.fail(f.request());const v=f.finish();assert.deepEqual(v.audit(),{status:'PASS',issues:[]});
 assert.equal(v.evidence.actions.length,1);assert.equal(v.evidence.requests[0].action_instance_id,f.a.action_instance_id);assert.equal(v.evidence.requests[0].causality_status,'PROVEN');
 assert.equal(v.receipts.records.length,1);assert.equal(v.result.raw_rsc_events[0].count,1);assert.equal(v.result.required_application_request_failures,0);assert.equal(v.evidence.receipt_decisions[0].decision,'APPLIED');
 assert.deepEqual(v.evidence.transition_accounting[0].receipt_ids,[sha(canonical(v.receipts.records[0]))]);
});
for(const option of [{marker:false},{incomplete:true}])test('causal bridge: identical URL/context cannot replace explicit complete ancestry '+JSON.stringify(option),()=>{
 const f=setup();f.fail(f.request(option));const v=f.finish();assert.equal(v.receipts.records.length,1);assert.equal(v.result.required_application_request_failures,1);assert.ok(v.audit().issues.includes('MISSING_CAUSAL_PARENT'));
});
test('causal bridge: duplicate/retry ancestry cannot authorize two requests',()=>{
 const f=setup();f.fail(f.request());f.fail(f.request({id:'retry'}));const v=f.finish();assert.equal(v.result.required_application_request_failures,2);assert.equal(v.receipts.records.length,0);assert.ok(v.evidence.requests.every(r=>r.causality_status==='UNKNOWN'));
});
test('causal bridge: unrelated concurrent request remains unbound even with the same route',()=>{
 const f=setup();f.fail(f.request());f.fail(f.request({id:'unrelated',marker:false}));const v=f.finish();assert.equal(v.result.required_application_request_failures,2);assert.equal(v.evidence.requests[1].action_instance_id,'UNKNOWN');assert.equal(v.receipts.records.length,0);
});
test('causal bridge: redirect retains distinct hop and parent, never inherits receipt authority',()=>{
 const f=setup();f.request();f.fail(f.request({redirect:true}));const v=f.finish();assert.equal(v.evidence.requests[0].terminal_state,'REDIRECTED');assert.equal(v.evidence.requests[1].causal_parent,v.evidence.requests[0].request_id);assert.equal(v.evidence.requests[1].causality_status,'UNKNOWN');assert.equal(v.result.required_application_request_failures,1);
});
for(const [name,mutate]of Object.entries({
 'action marker source mismatch':v=>v.evidence.actions[0].source_sha256='0'.repeat(64),
 'action transition mismatch':v=>v.evidence.actions[0].transition_id='transition-999',
 'duplicate action':v=>v.evidence.actions.push(structuredClone(v.evidence.actions[0])),
 'missing dispatch acknowledgement':v=>v.evidence.actions[0].dispatch_ack=false,
 'missing trusted event':v=>v.evidence.actions[0].event_seen=false,
 'unrelated script parent':v=>v.evidence.requests[0].initiator_scripts.scripts=[scriptFingerprint(page,'unrelated')],
 'missing action bridge':v=>v.evidence.actions=[],
 'receipt counted twice':v=>v.evidence.transition_accounting[0].receipt_ids.push(v.evidence.transition_accounting[0].receipt_ids[0]),
 'unrecorded action dispatch':v=>v.evidence.journal=v.evidence.journal.filter(e=>e.kind!=='ACTION_DISPATCHED')
}))test('causal bridge: fail closed on '+name,()=>{const f=setup();f.fail(f.request());const v=f.finish();assert.equal(v.audit().status,'PASS');mutate(v);assert.equal(v.audit().status,'FAIL');});

test('prefetch causality: YES and NO from one action remain separate and no prefetch evidence is suppressed',()=>{
 const f=setup();f.fail(f.request());f.fail(f.request({id:'prefetch',headers:{RSC:'1','Next-Router-Prefetch':'1'}}));const v=f.finish();
 assert.equal(v.receipts.records.length,1);assert.equal(v.result.required_application_request_failures,1);assert.equal(v.result.ledger.length,2);
 assert.deepEqual(v.evidence.requests.map(r=>r.prefetch_classification),['NO','YES']);assert.deepEqual(v.evidence.requests.map(r=>r.consumer),['TESTED_ACTION','PREFETCH']);
 assert.equal(v.evidence.requests[1].action_ancestry,'PROVEN');assert.equal(v.evidence.requests[1].causality_status,'UNKNOWN');assert.equal(v.result.ledger[1].classification,'required_application_request_failure');assert.equal(v.audit().status,'PASS');
});
test('prefetch causality: unrelated speculative traffic has its own initiator, never the tested action',()=>{
 const f=setup();f.fail(f.request());f.fail(f.request({id:'speculative',marker:false,headers:{RSC:'1',Purpose:'prefetch'}}));const v=f.finish();assert.equal(v.evidence.requests[1].prefetch_classification,'YES');assert.equal(v.evidence.requests[1].action_ancestry,'UNKNOWN');assert.equal(v.evidence.requests[1].action_instance_id,'UNKNOWN');assert.equal(v.result.required_application_request_failures,1);
});
for(const headers of [undefined,{'Next-Router-Prefetch':'unexpected'},{Purpose:'unknown'},{RSC:'1',rsc:'0'}])test('prefetch causality: unavailable or contradictory headers remain UNKNOWN '+JSON.stringify(headers),()=>{
 const signals=classifyRequestSignals(headers);assert.equal(signals.prefetch,'UNKNOWN');
});
test('prefetch causality: explicit browser speculative prefetch is recognized separately from RSC',()=>{
 assert.deepEqual(classifyRequestSignals({'Sec-Purpose':'prefetch;prerender'}),{rsc:'NO',prefetch:'YES'});
 assert.deepEqual(classifyRequestSignals({}),{rsc:'NO',prefetch:'UNKNOWN'});
 assert.deepEqual(classifyRequestSignals({RSC:'1'}),{rsc:'YES',prefetch:'UNKNOWN'});
 assert.deepEqual(classifyRequestSignals({RSC:'1','Next-Router-Prefetch':'0'}),{rsc:'YES',prefetch:'NO'});
});
test('prefetch causality: UNKNOWN consumer cannot acquire a strict non-prefetch exemption',()=>{
 const f=setup();f.fail(f.request({headers:{RSC:'1','Next-Router-Prefetch':'unknown'}}));const v=f.finish();assert.equal(v.evidence.requests[0].prefetch_classification,'UNKNOWN');assert.equal(v.evidence.requests[0].consumer,'UNKNOWN');assert.equal(v.result.required_application_request_failures,1);assert.equal(v.audit().status,'FAIL');
});

// Real Chromium fixture: validates that the CDP correlation is produced by the
// browser, including async initiators, not just synthetic receipt construction.
const browserEnabled=process.env.SL_CAUSAL_BROWSER_TEST==='1';
for(const kind of ['T1','T3'])test('browser causal bridge: '+kind+' authentic initiator and prefetch separation',{skip:!browserEnabled},async()=>{
 const {chromium}=await import('../qa-dependencies/node_modules/playwright/index.mjs');
 const sockets=new Set();
 const html=`<!doctype html><button data-window="3Y">go</button><div id="sl-options"><label><select><option>weekly</option><option>daily</option></select></label></div><script>
 const request=(prefetch)=>{const c=new AbortController();return fetch('/niveles-estadisticos?${new URLSearchParams(transitions[kind].target_state)}',{headers:prefetch?{RSC:'1','Next-Router-Prefetch':'1'}:{RSC:'1','Next-Router-Prefetch':'0'},signal:c.signal}).then(()=>setTimeout(()=>c.abort(),30)).catch(()=>{});};
 const act=()=>Promise.resolve().then(()=>{request(false);request(true);});
 document.addEventListener('click',e=>{if(e.target.closest('button'))act();});
 document.addEventListener('change',act);
 </script>`;
 const server=http.createServer((req,res)=>{if(req.headers.rsc==='1'){res.writeHead(200,{'Content-Type':'text/x-component'});res.write('stream');}else{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});server.listen(0,'127.0.0.1');await once(server,'listening');
 const fixtureOrigin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true}),context=await browser.newContext(),p=await context.newPage(),cdp=await context.newCDPSession(p);
 const c=createAdoptRequestEvidence(fixtureOrigin),raw=[],meta=new Map();c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
 cdp.on('Page.frameNavigated',e=>c.frameNavigated(page,e));
 cdp.on('Network.requestWillBeSent',e=>{const b=c.request(page,e);meta.set(e.requestId,{e,b});});
 cdp.on('Network.responseReceived',e=>c.response(page,e));
 cdp.on('Network.loadingFinished',e=>c.finished(page,e));
 cdp.on('Network.loadingFailed',e=>{const r=meta.get(e.requestId);c.failure(page,e,raw.length);const f=classifyRequestSignals(r?.e.request.headers);raw.push({request_evidence:r.b,kind:'request_failure',url:r.e.request.url,type:e.type,rsc:f.rsc==='YES',prefetch:f.prefetch==='YES',canceled:e.canceled,error_code:e.errorText});});
 await Promise.all(['Page','Network','Runtime'].map(domain=>cdp.send(domain+'.enable')));
 const bridge=await installCausalBridge(cdp,page,c.registerAction,c.completeAction,c.beginAction);
 try {
   await p.goto(fixtureOrigin+'/niveles-estadisticos');c.observability.context(transitions[kind]);c.start(page,kind);
   const control=actionControls[kind],param=control.type==='CLICK'?control.selector:selectionExpression(kind),a=c.action(page,control.type,param);
   if(control.type==='CLICK')await bridge.click(a,param,async()=>{await p.locator(param).click();});else await bridge.evaluate(a,param);
   const end=Date.now()+4000;while(raw.length<2&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
   assert.equal(raw.length,2);c.complete(page,kind,true);c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);await context.close();c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();
   const receipts=c.receipts(raw),result=account(raw,false,fixtureOrigin,c.admittedReceipts(receipts)),evidence=c.evidence(raw,result,receipts);
   const out=process.env.SL_CAUSAL_TEST_EVIDENCE;if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,kind+'.json'),JSON.stringify({evidence,result,validation:auditAdoptRequestEvidence(evidence,raw,result,fixtureOrigin,[kind])},null,2));}
   assert.equal(receipts.records.length,1);assert.equal(result.required_application_request_failures,1);assert.equal(result.raw_rsc_events.length,1);
   const actionRequests=evidence.requests.filter(r=>r.action_instance_id===a.action_instance_id);assert.equal(actionRequests.length,2);assert.ok(actionRequests.every(r=>r.action_ancestry==='PROVEN'));
   assert.equal(auditAdoptRequestEvidence(evidence,raw,result,fixtureOrigin,[kind]).status,'PASS');
 } finally {await context.close();await browser.close();for(const s of sockets)s.destroy();await new Promise(resolve=>server.close(resolve));}
});

test('click observer preserves listener identity, removal, receiver, once and untrusted events',async()=>{
 const {runInNewContext}=await import('node:vm');let calls=0;const marker=()=>{throw Error('untrusted event must not enter marker');};
 const sandbox={EventTarget:class extends EventTarget{},document:{querySelector:()=>({contains:()=>true})},WeakMap,Map,Reflect,Object};
 runInNewContext(clickObserverSource('bridge'),sandbox);const element=new sandbox.EventTarget();
 function listener(e){assert.equal(this,element);assert.equal(e.type,'click');calls++;}
 element.addEventListener('click',listener,{once:true});sandbox.bridge.arm(marker,'button');element.dispatchEvent(new Event('click'));element.dispatchEvent(new Event('click'));assert.equal(calls,1);
 element.addEventListener('click',listener);element.removeEventListener('click',listener);element.dispatchEvent(new Event('click'));assert.equal(calls,1);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.bridge.disarm())),{event_seen:false,listener_calls:0});
});

test('click observer does not add capture-option getter reads',async()=>{
 const {runInNewContext}=await import('node:vm');let nativeReads=0,observedReads=0;
 const sandbox={EventTarget:class extends EventTarget{},document:{},WeakMap,Map,Reflect,Object};runInNewContext(clickObserverSource('bridge'),sandbox);
 const listener=()=>{};new EventTarget().addEventListener('click',listener,{get capture(){nativeReads++;return true;}});
 new sandbox.EventTarget().addEventListener('click',listener,{get capture(){observedReads++;return true;}});
 assert.equal(observedReads,nativeReads);
});

test('causal bridge: explicit unrelated or unresolved network parent cannot acquire action authority',()=>{
 for(const parent of ['unrelated','missing']) {
  const f=setup();
  if(parent==='unrelated'){f.request({id:parent,marker:false,headers:{}});f.c.finished(page,{requestId:parent});}
  f.fail(f.request({parent}));const v=f.finish();assert.equal(v.result.required_application_request_failures,1);assert.equal(v.evidence.receipt_decisions[0].decision,'BLOCKED_UNPROVEN_CAUSALITY');assert.equal(v.audit().status,'FAIL');
 }
});

test('causal bridge: a forged source URL cannot substitute for the browser-owned script ID',()=>{
 const f=setup();f.fail(f.request({marker:false,sourceURL:'https://sl-qa.invalid/action/'+f.a.action_instance_id}));const v=f.finish();assert.equal(v.result.required_application_request_failures,1);assert.equal(v.evidence.requests[0].action_instance_id,'UNKNOWN');assert.equal(v.audit().status,'FAIL');
});
test('prefetch causality: script parent is explicit even when tested-action ownership is UNKNOWN',()=>{
 const f=setup();f.fail(f.request({marker:false,headers:{RSC:'1','Next-Router-Prefetch':'1'}}));const v=f.finish(),r=v.evidence.requests[0];
 assert.equal(r.causal_relation,'CDP_SCRIPT_INITIATOR');assert.equal(r.causal_parent,'script:'+scriptFingerprint(page,'unrelated'));assert.equal(r.consumer,'PREFETCH');assert.equal(r.action_ancestry,'UNKNOWN');assert.equal(v.result.required_application_request_failures,1);assert.equal(v.receipts.records.length,0);
 r.causal_parent='script:'+scriptFingerprint(page,'marker');assert.equal(v.audit().status,'FAIL');
});

test('prefetch causality: browser Sec-Purpose prefetch cannot be counted as a second transition consumer',()=>{
 const f=setup();f.fail(f.request());f.fail(f.request({id:'browser-prefetch',headers:{RSC:'1','Sec-Purpose':'prefetch;prerender'}}));const v=f.finish();
 assert.equal(v.receipts.records.length,1);assert.equal(v.result.ledger.length,2);assert.equal(v.result.required_application_request_failures,1);assert.equal(v.evidence.requests[1].prefetch_classification,'YES');assert.equal(v.evidence.requests[1].consumer,'PREFETCH');assert.equal(v.evidence.requests[1].request_evidence.consumer.kind,'unknown');assert.equal(v.audit().status,'PASS');
});

// Literal independently authored CDP observations. Expected hashes/callsites are
// not emitted by the classifier under test. The real application test below
// separately requires the browser to produce the same native witness.
const navigationScript={scriptId:'next',hash:'0b743564483f80db5a365086eff276584467f2631408c2dc19ef1f3314f43125',length:159932,startLine:0,startColumn:0,isLiveEdit:false,executionContextAuxData:{isDefault:true}};
const navigationStack=()=>({callFrames:[{scriptId:'next',lineNumber:1,columnNumber:34882},{scriptId:'next',lineNumber:0,columnNumber:18680},{scriptId:'next',lineNumber:0,columnNumber:16645}],parent:{callFrames:[{scriptId:'marker',lineNumber:0,columnNumber:0}]}});
function navigationFixture({script={},stack=navigationStack(),headers={RSC:'1'},count=1,abort=true,parent,expectedPrefetch='NO'}={}) {
 const f=setup();f.c.scriptParsed(page,{...navigationScript,...script},f.raw);
 for(let i=0;i<count;i++) {
  const r=f.request({id:'native-'+i,headers,stack:structuredClone(stack),parent});
  if(abort){f.fail(r);f.raw.at(-1).prefetch=expectedPrefetch==='UNKNOWN'?'UNKNOWN':expectedPrefetch==='YES';}else{f.c.response(page,{requestId:r.event.requestId,response:{status:200}});f.c.finished(page,{requestId:r.event.requestId});}
 }
 return {...f,...f.finish()};
}
for(const abort of [false,true])test('native Next proof: exact independent completed primary '+(abort?'retained conditional abort':'success without receipt'),()=>{
 const f=navigationFixture({abort});assert.equal(f.audit().status,'PASS');const r=f.evidence.requests[0];
 assert.equal(r.prefetch_classification,'NO');assert.equal(r.classification_evidence.prefetch,'NATIVE_NEXT_NAVIGATION');assert.equal(r.request_role,'PRIMARY_APPLICATION');
 assert.equal(f.evidence.requests.filter(r=>r.causality_status==='PROVEN').length,1);assert.equal(f.result.ledger.length,abort?1:0);
 assert.equal(r.terminal_state,abort?'FAILED':'FINISHED');assert.equal(f.receipts.records.length,abort?1:0);assert.equal(f.result.required_application_request_failures,0);
});
for(const [name,options]of Object.entries({
 'different executable bytes':{expectedPrefetch:'UNKNOWN',script:{hash:'0'.repeat(64)}},
 'wrong native callsite':{expectedPrefetch:'UNKNOWN',stack:{...navigationStack(),callFrames:[{scriptId:'next',lineNumber:0,columnNumber:16644}]}},
 'full-prefetch createFetch without navigation':{expectedPrefetch:'UNKNOWN',stack:{...navigationStack(),callFrames:navigationStack().callFrames.slice(0,2)}},
 'unresolved async parent':{expectedPrefetch:'UNKNOWN',stack:{...navigationStack(),parentId:{id:'unknown'}}},
 'unrelated action':{stack:{callFrames:navigationStack().callFrames,parent:{callFrames:[{scriptId:'unrelated',lineNumber:0,columnNumber:0}]}}},
 'live-edited code':{expectedPrefetch:'UNKNOWN',script:{isLiveEdit:true}},
 'isolated context':{expectedPrefetch:'UNKNOWN',script:{executionContextAuxData:{isDefault:false}}},
 'explicit prefetch conflicts with navigation':{expectedPrefetch:'UNKNOWN',headers:{RSC:'1','Next-Router-Prefetch':'1'}},
 'unknown marker conflicts with navigation':{expectedPrefetch:'UNKNOWN',headers:{RSC:'1','Next-Router-Prefetch':'unknown'}},
 'zero primary':{count:0},'two same-URL primaries':{count:2},
 'four unproven candidates':{expectedPrefetch:'UNKNOWN',count:4,script:{hash:'0'.repeat(64)}},
 'unmapped parent':{parent:'missing'},
}))test('native Next proof fails closed: '+name,()=>{
 const f=navigationFixture(options);assert.equal(f.audit().status,'FAIL');assert.ok(f.evidence.requests.every(r=>r.causality_status==='UNKNOWN'));
 assert.equal(f.result.ledger.length,options.count??1);assert.equal(f.result.required_application_request_failures,options.count??1);
});
for(const [name,mutate]of Object.entries({
 'missing script observation':f=>f.evidence.journal=f.evidence.journal.filter(e=>e.kind!=='NATIVE_SCRIPT_INGRESS'),
 'cross-page script observation':f=>f.evidence.journal.find(e=>e.kind==='NATIVE_SCRIPT_INGRESS').page_id='page-99',
 'forged intent callsite':f=>f.evidence.requests[0].native_intent.frames[2].column++,
 'forged role':f=>f.evidence.requests[0].request_role='RSC_CHILD',
 'missing abort receipt':f=>{f.evidence.transition_receipts.records=[];},
 'success substituted for FAILED':f=>f.evidence.requests[0].terminal_state='FINISHED',
}))test('native Next independent replay rejects '+name,()=>{const f=navigationFixture();assert.equal(f.audit().status,'PASS');mutate(f);assert.equal(f.audit().status,'FAIL');});

test('native roles: proven RSC child stays distinct and cannot obtain a primary abort exemption',()=>{
 const f=setup();const root=f.request();f.c.response(page,{requestId:'r',response:{status:200}});f.c.finished(page,{requestId:'r'});
 f.fail(f.request({id:'child',parent:'r'}));const v=f.finish();
 assert.deepEqual(v.evidence.requests.map(r=>r.request_role),['PRIMARY_APPLICATION','RSC_CHILD']);
 assert.equal(v.evidence.requests.filter(r=>r.causality_status==='PROVEN').length,1);
 assert.equal(v.result.ledger.length,1);assert.equal(v.result.required_application_request_failures,1);assert.equal(v.receipts.records.length,0);
 assert.equal(root.b.request_instance_id,v.evidence.requests[1].causal_parent);assert.equal(v.audit().status,'PASS');
});

// Uses the unchanged application and frozen UI actions as an independent local
// producer. No classifier-generated headers, receipt fixtures or fetch patch.
// The caller supplies an already built locked application on loopback only.
test('locked Next application: T1–T4 native navigation proof and exact conditional accounting',{skip:!process.env.SL_NEXT_LOCAL_ORIGIN,timeout:600000},async()=>{
 const origin=process.env.SL_NEXT_LOCAL_ORIGIN;
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 const {createReadOnlyHarness}=await import('../scripts/browser-harness-base.mjs');
 const {renderFixtures}=await import('../scripts/render-fixtures.mjs');
 const {tmpdir}=await import('node:os');
 const out=process.env.SL_NEXT_LOCAL_EVIDENCE??await fs.mkdtemp(path.join(tmpdir(),'sl-native-next-'));
 await fs.mkdir(out,{recursive:true});await renderFixtures(process.cwd(),out);
 const harness=await createReadOnlyHarness({origin},undefined,out,true),argv=process.argv;
 globalThis.__SL_RELEASE_QA__={...harness,protectedGet:async url=>{assert.equal(new URL(url).origin,origin);return fetch(url,{redirect:'error'});}};
 process.argv=[process.execPath,'local-native-proof',origin,'0',out];let passed=false;
 try {
  await import('../scripts/qa/qa-statistical-levels.mjs');
  const report=JSON.parse(await fs.readFile(path.join(out,'browser-report.json'),'utf8'));
  assert.equal(report.PASS,true);passed=true;
 }finally{delete globalThis.__SL_RELEASE_QA__;process.argv=argv;await harness.finish(passed);}
 const evidence=JSON.parse(await fs.readFile(path.join(out,'adopt-request-evidence.json'),'utf8'));
 for(const kind of ['T1','T2','T3','T4']) {
  const primaries=evidence.requests.filter(r=>r.transition_type===kind&&r.causality_status==='PROVEN');assert.equal(primaries.length,1);
  assert.equal(primaries[0].classification_evidence.prefetch,'NATIVE_NEXT_NAVIGATION');assert.equal(primaries[0].request_role,'PRIMARY_APPLICATION');
 }
});

test('native action context survives a later ambient UI poll without rewriting that observation',()=>{
 const f=setup();f.c.observability.context({suite_id:'poll',test_id:'later',action_id:'later'});f.fail(f.request());const v=f.finish();
 assert.equal(v.audit().status,'PASS');const r=v.evidence.requests[0];assert.equal(r.request_context_binding.source,'NATIVE_ACTION_ANCESTRY');
 assert.notEqual(r.request_context_binding.observed_context_sha256,r.request_evidence.request_start_context_sha256);
 r.request_context_binding.action_instance_id='action-wrong';assert.equal(v.audit().status,'FAIL');
});
test('ambient context drift cannot grant an unrelated request action ownership',()=>{
 const f=setup();f.c.observability.context({suite_id:'poll',test_id:'later',action_id:'later'});f.fail(f.request({marker:false}));const v=f.finish();
 assert.equal(v.audit().status,'FAIL');assert.equal(v.evidence.requests[0].request_context_binding.source,'OBSERVED_CONTEXT');assert.equal(v.result.required_application_request_failures,1);
});

test('positive causal request set: successful primary and explicit finished RSC child both remain represented',()=>{
 const f=setup();f.request();f.request({id:'child',parent:'r'});
 for(const requestId of ['r','child']){f.c.response(page,{requestId,response:{status:200}});f.c.finished(page,{requestId});}
 const v=f.finish();assert.equal(v.audit().status,'PASS');assert.equal(v.result.required_application_request_failures,0);
 assert.deepEqual(v.evidence.requests.map(r=>r.request_role),['PRIMARY_APPLICATION','RSC_CHILD']);assert.equal(v.receipts.records.length,0);
 assert.equal(v.evidence.transition_accounting[0].request_ids.length,2);
});
