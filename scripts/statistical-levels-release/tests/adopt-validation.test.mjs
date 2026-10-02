import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdoptRequestEvidence,auditAdoptRequestEvidence,requestCausalOwnership} from '../scripts/adopt-request-evidence.mjs';
import {drainNativeRequestLifecycle} from '../scripts/browser-harness-base.mjs';
import {listenerMarker,scriptFingerprint,classifyRequestSignals} from '../scripts/adopt-causal-bridge.mjs';
import {transitions} from '../scripts/probe-transition-receipts.mjs';
import {account} from '../scripts/network-accounting.mjs';
import {sha} from '../scripts/release-core.mjs';
const origin='https://fixture.invalid',page='page-1';
function close(c){c.pageLifecycle(page,'CLOSING');c.listenerDrain(page);c.sourceClosed(page);c.pageLifecycle(page,'CLOSED');c.freeze();}
function make({mode='abort',bridge=true,headers={RSC:'1','Next-Router-Prefetch':'0'},extra=false,ambient=false,retry=false,duplicate=false}={}){
 const c=createAdoptRequestEvidence(origin),raw=[];c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');c.observability.context(transitions.T1);c.start(page,'T1');
 let a;if(bridge){a=c.action(page,'CLICK','[data-window="3Y"]');c.registerAction({...a,script_sha256:scriptFingerprint(page,'explicit-action-script'),source_sha256:sha(listenerMarker),source_url_sha256:sha('https://sl-qa.invalid/action/'+a.action_instance_id)});c.beginAction(a.action_instance_id);}
 const req=(id,h= headers,script='explicit-action-script',parent)=>({requestId:id,frameId:'frame',loaderId:'document',documentURL:origin+'/niveles-estadisticos',type:'Fetch',request:{url:origin+'/niveles-estadisticos?asset=SPY&frequency=weekly&window=3Y',method:'GET',headers:h},initiator:{type:'script',...(parent?{requestId:parent}:{}),stack:{callFrames:[{scriptId:script,url:origin+'/app.js'}]}}});
 function start(e){return c.request(page,e);}
 function terminal(e,binding,kind='FAILED',error='net::ERR_ABORTED'){
  c.response(page,{requestId:e.requestId,response:{status:200}});
  if(kind==='FINISHED')c.finished(page,{requestId:e.requestId});
  else if(kind==='FAILED'){c.failure(page,{requestId:e.requestId,canceled:error==='net::ERR_ABORTED',errorText:error},raw.length);const f=classifyRequestSignals(e.request.headers);raw.push({request_evidence:binding,kind:'request_failure',url:e.request.url,type:e.type,rsc:f.rsc==='UNKNOWN'?'UNKNOWN':f.rsc==='YES',prefetch:f.prefetch==='UNKNOWN'?'UNKNOWN':f.prefetch==='YES',canceled:error==='net::ERR_ABORTED',error_code:error});}
 }
 const e=req('primary'),binding=start(e);terminal(e,binding,mode==='finished'?'FINISHED':mode==='pending'?'PENDING':'FAILED',mode==='timeout'?'net::ERR_TIMED_OUT':'net::ERR_ABORTED');
 if(retry){const next=req('retry',headers,'explicit-action-script','primary');const b=start(next);terminal(next,b);}
 if(duplicate){const next=req('second-primary');const b=start(next);terminal(next,b,'FINISHED');}
 if(extra){const e=req('prefetch',{RSC:'1','Next-Router-Prefetch':'1'},ambient?'background-prefetch':'explicit-action-script');const b=start(e);terminal(e,b,'FINISHED');}
 if(a)c.completeAction(a.action_instance_id,{dispatch_ack:true,event_seen:true,listener_calls:1});c.complete(page,'T1',true);close(c);
 const receipts=c.receipts(raw),result=account(raw,false,origin,c.admittedReceipts(receipts)),evidence=c.evidence(raw,result,receipts);
 return {c,raw,evidence,result,audit:()=>auditAdoptRequestEvidence(evidence,raw,result,origin,['T1'])};
}
function reindex(e){e.journal.forEach((x,i)=>x.sequence=i+1);for(const r of e.requests)r.event_sequences=e.journal.filter(x=>x.request_id===r.request_id).map(x=>x.sequence);}
test('G5 evidence repair: ambient non-causal prefetch retains association without false action obligation',()=>{
 const f=make({mode:'finished',extra:true,ambient:true}),r=f.evidence.requests[1];
 assert.equal(r.transition_id,f.evidence.transitions[0].transition_id);assert.equal(r.action_ancestry,'UNKNOWN');
 assert.equal(requestCausalOwnership(r,f.evidence.actions,f.evidence.requests),'AMBIENT_PREFETCH');
 assert.deepEqual(f.audit(),{status:'PASS',issues:[]});assert.equal(f.evidence.transition_accounting[0].request_ids.length,2);
 assert.equal(f.evidence.requests.filter(r=>r.causality_status==='PROVEN').length,1);
});
test('G5 evidence repair: genuinely causal prefetch still requires proven action coverage',()=>{
 const f=make({mode:'finished',extra:true}),r=f.evidence.requests[1];
 assert.equal(requestCausalOwnership(r,f.evidence.actions,f.evidence.requests),'PROVEN_ACTION');assert.equal(f.audit().status,'PASS');
 r.action_ancestry='UNKNOWN';assert.ok(f.audit().issues.includes('MISSING_CAUSAL_COVERAGE'));assert.equal(f.audit().status,'FAIL');
});
test('G5 evidence repair: partial ambient ancestry is unresolved and remains fail-closed',()=>{
 const f=make({mode:'finished',extra:true,ambient:true}),r=f.evidence.requests[1];r.initiator_scripts.complete=false;
 assert.equal(requestCausalOwnership(r,f.evidence.actions,f.evidence.requests),'UNRESOLVED');
 assert.ok(f.audit().issues.includes('MISSING_CAUSAL_COVERAGE'));assert.equal(f.audit().status,'FAIL');
});
test('G5 evidence repair: ambient child of action-bearing parent cannot evade causal coverage',()=>{
 const f=make({mode:'finished',extra:true,ambient:true}),r=structuredClone(f.evidence.requests[1]);
 r.causal_relation='CDP_INITIATOR_REQUEST';r.causal_parent=f.evidence.requests[0].request_id;
 assert.equal(requestCausalOwnership(r,f.evidence.actions,[f.evidence.requests[0],r]),'UNRESOLVED');
});
for(const terminal of ['FINISHED','FAILED'])test('G5 evidence repair: native '+terminal+' resolves bounded lifecycle drain',async()=>{
 const c=createAdoptRequestEvidence(origin);c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
 const binding=c.request(page,{requestId:'pending-prefetch',frameId:'f',loaderId:'l',documentURL:origin+'/',type:'Prefetch',request:{url:origin+'/prefetch',method:'GET',headers:{RSC:'1','Next-Router-Prefetch':'1'}},initiator:{type:'script',stack:{callFrames:[{scriptId:'background',url:origin+'/app.js'}]}}});
 assert.equal(c.pendingRequests(page).length,1);
 const timer=setTimeout(()=>{if(terminal==='FINISHED'){c.response(page,{requestId:'pending-prefetch',response:{status:200}});c.finished(page,{requestId:'pending-prefetch'});}else c.failure(page,{requestId:'pending-prefetch',canceled:true,errorText:'net::ERR_ABORTED'},0);},10);
 try {assert.deepEqual(await drainNativeRequestLifecycle(()=>c.pendingRequests(page),{timeoutMs:500,pollMs:5}),{terminal_coverage_complete:true,pending_request_ids:[]});}finally{clearTimeout(timer);}
 close(c);const raw=terminal==='FAILED'?[{kind:'request_failure',request_evidence:binding,url:origin+'/prefetch',type:'Prefetch',rsc:true,prefetch:true,canceled:true,error_code:'net::ERR_ABORTED'}]:[];
 const receipts=c.receipts(raw),result=account(raw,false,origin,c.admittedReceipts(receipts)),e=c.evidence(raw,result,receipts);
 assert.equal(e.requests[0].terminal_state,terminal);assert.ok(e.journal.some(x=>x.kind===terminal));
 assert.equal(auditAdoptRequestEvidence(e,raw,result,origin,[]).status,'PASS');
 if(terminal==='FAILED')assert.equal(result.required_application_request_failures,1);
});
test('G5 evidence repair: lifecycle deadline and source closure never synthesize a terminal',async()=>{
 const pending=['native-request'];const result=await drainNativeRequestLifecycle(()=>pending,{timeoutMs:10,pollMs:2});
 assert.deepEqual(result,{terminal_coverage_complete:false,pending_request_ids:['native-request']});assert.deepEqual(pending,['native-request']);
 const f=make({mode:'pending',headers:{RSC:'1','Next-Router-Prefetch':'1'}});
 assert.equal(f.evidence.requests[0].terminal_state,'PENDING');assert.ok(f.audit().issues.includes('UNRESOLVED_PENDING_REQUEST'));
});
test('G5 evidence repair: primary cardinality preserves exactly one and rejects zero or multiple candidates',()=>{
 assert.equal(make({mode:'finished'}).audit().status,'PASS');
 for(const f of [make({mode:'finished',bridge:false}),make({mode:'finished',duplicate:true})]){
  assert.equal(f.audit().status,'FAIL');assert.ok(f.audit().issues.includes('PRIMARY_REQUEST_CARDINALITY'));
 }
});
test('coverage: primary and prefetched child retained with one strict primary receipt',()=>{const f=make({extra:true});assert.equal(f.audit().status,'PASS');assert.equal(f.evidence.requests.length,2);assert.equal(f.evidence.transition_accounting[0].request_ids.length,2);assert.equal(f.result.ledger.length,1);assert.equal(f.result.required_application_request_failures,0);});
test('coverage: successful primary has positive action proof without fabricated abort receipt',()=>{const f=make({mode:'finished'});assert.equal(f.audit().status,'PASS');assert.equal(f.evidence.transition_receipts.records.length,0);});
for(const mode of ['finished','abort'])test('coverage: missing bridge blocks '+mode,()=>assert.equal(make({mode,bridge:false}).audit().status,'FAIL'));
test('coverage: no observed transitions cannot satisfy required hosted T1-T4',()=>{const f=make();assert.ok(auditAdoptRequestEvidence(f.evidence,f.raw,f.result,origin).issues.includes('EXPECTED_TRANSITIONS_MISSING'));});
const mutations={
 'altered observed resource type':f=>f.evidence.requests[0].metadata.type='Other',
 'missing browser protocol ID':f=>delete f.evidence.requests[0].protocol_request_sha256,
 'missing request':f=>f.evidence.requests.pop(),
 'wrong action ID':f=>f.evidence.requests[0].action_instance_id='action-00000000-0000-0000-0000-000000000000',
 'successful primary wrong target':f=>{f.evidence.requests[0].request_evidence.consumer.target.asset='GLD';},
 'wrong transition ID':f=>f.evidence.requests[0].transition_id='transition-999',
 'duplicate transition':f=>f.evidence.transitions.push(structuredClone(f.evidence.transitions[0])),
 'duplicate receipt':f=>f.evidence.transition_receipts.records.push(structuredClone(f.evidence.transition_receipts.records[0])),
 'duplicate accounting':f=>f.evidence.transition_accounting.push(structuredClone(f.evidence.transition_accounting[0])),
 'omitted accounting':f=>f.evidence.transition_accounting=[],
 'omitted failure':f=>f.raw=[],
 'wrong RSC':f=>f.evidence.requests[0].rsc_classification='NO',
 'wrong prefetch':f=>f.evidence.requests[0].prefetch_classification='YES',
 'completed vs aborted':f=>f.evidence.requests[0].terminal_state='FINISHED',
 'missing terminal':f=>f.evidence.journal=f.evidence.journal.filter(e=>e.kind!=='FAILED'),
 'duplicated terminal':f=>{f.evidence.journal.push({...f.evidence.journal.find(e=>e.kind==='FAILED')});reindex(f.evidence);},
 'compiled after event':f=>{const i=f.evidence.journal.findIndex(e=>e.kind==='ACTION_COMPILED');f.evidence.journal.push(...f.evidence.journal.splice(i,1));reindex(f.evidence);},
 'missing action start':f=>{f.evidence.journal=f.evidence.journal.filter(e=>e.kind!=='ACTION_START');reindex(f.evidence);},
 'closed page with ACTIVE event':f=>{const i=f.evidence.journal.findIndex(e=>e.kind==='REQUEST');f.evidence.journal.splice(i,0,{kind:'PAGE_LIFECYCLE',page_id:page,value:'CLOSED'});reindex(f.evidence);},
 'listener starts too late':f=>{const i=f.evidence.journal.findIndex(e=>e.kind==='LISTENER_START');f.evidence.journal.push(...f.evidence.journal.splice(i,1));reindex(f.evidence);},
 'listener stops early':f=>{const i=f.evidence.journal.findIndex(e=>e.kind==='LISTENER_STOP');f.evidence.journal.splice(1,0,...f.evidence.journal.splice(i,1));reindex(f.evidence);},
 'unconfirmed drain':f=>{f.evidence.journal=f.evidence.journal.filter(e=>e.kind!=='SOURCE_CLOSED');reindex(f.evidence);},
 'freeze missing':f=>{f.evidence.journal=f.evidence.journal.filter(e=>e.kind!=='ACCOUNTING_FREEZE');reindex(f.evidence);},
};
for(const [name,mutate]of Object.entries(mutations))test('adversarial: '+name,()=>{const f=make();assert.equal(f.audit().status,'PASS');mutate(f);assert.equal(auditAdoptRequestEvidence(f.evidence,f.raw,f.result,origin,['T1']).status,'FAIL');});
for(const mode of ['pending','timeout'])test('lifecycle retains '+mode,()=>{const f=make({mode});assert.equal(f.evidence.requests[0].terminal_state,mode==='pending'?'PENDING':'FAILED');if(mode==='pending')assert.ok(f.audit().issues.includes('UNRESOLVED_PENDING_REQUEST'));else assert.equal(f.result.required_application_request_failures,1);});
for(const h of [{},{RSC:'1'},{RSC:'1','Next-Router-Prefetch':'unknown'},{RSC:'1','Next-Router-Prefetch':'0',Purpose:'prefetch'}])test('prefetch absence or contradiction is UNKNOWN '+JSON.stringify(h),()=>{assert.equal(classifyRequestSignals(h).prefetch,'UNKNOWN');assert.equal(make({headers:h,mode:'finished'}).audit().status,'FAIL');});
for(const type of ['Fetch','XHR','Document','Other','Prefetch','Script'])test('pending prefetch blocks resource '+type,()=>{const f=make({mode:'pending',headers:{RSC:'1','Next-Router-Prefetch':'1'}});f.evidence.requests[0].metadata.type=type;assert.ok(f.audit().issues.includes('UNRESOLVED_PENDING_REQUEST'));});
function parentFixture(){const c=createAdoptRequestEvidence(origin);c.listenerStart(page);c.pageLifecycle(page,'ACTIVE');
 for(const [id,parent]of [['parent',null],['unrelated',null],['child','parent']]){c.request(page,{requestId:id,frameId:'frame',loaderId:'document',documentURL:origin+'/',type:'Fetch',request:{url:origin+'/'+id,method:'GET',headers:{'Next-Router-Prefetch':'0'}},initiator:{type:'script',...(parent?{requestId:parent}:{}),stack:{callFrames:[{scriptId:'framework',url:origin+'/app.js'}]}}});c.finished(page,{requestId:id});}
 close(c);const receipts=c.receipts([]),result=account([],false,origin,receipts),e=c.evidence([],result,receipts);return {e,result,audit:()=>auditAdoptRequestEvidence(e,[],result,origin,[])};}
test('parent exact browser identity accepts correct parent',()=>assert.equal(parentFixture().audit().status,'PASS'));
for(const [name,mutate]of Object.entries({
 'wrong parent':f=>f.e.requests[2].causal_parent=f.e.requests[1].request_id,
 'stale parent fingerprint':f=>f.e.requests[2].initiator.parent_protocol_sha256='f'.repeat(64),
 'cross action':f=>f.e.requests[0].action_instance_id='other-action',
 'duplicate protocol identity':f=>f.e.requests[1].protocol_request_sha256=f.e.requests[0].protocol_request_sha256,
 'cross document':f=>f.e.requests[0].request_evidence.document_instance_id='document-999',
}))test('parent rejects '+name,()=>{const f=parentFixture();mutate(f);assert.equal(f.audit().status,'FAIL');});
test('late event after freeze retained and rejected rather than lost',()=>{const f=make();f.c.failure(page,{requestId:'primary',errorText:'net::ERR_TIMED_OUT'},1);const e=f.c.evidence(f.raw,f.result,f.evidence.transition_receipts);assert.ok(e.capture_issues.includes('EVENT_AFTER_FREEZE'));assert.equal(e.journal.at(-1).error_code,'net::ERR_TIMED_OUT');assert.equal(auditAdoptRequestEvidence(e,f.raw,f.result,origin,['T1']).status,'FAIL');});
test('negative combined fixture: pending prefetch, wrong parent, late event and terminal contradiction fails',()=>{const f=make({mode:'pending',headers:{RSC:'1','Next-Router-Prefetch':'1'}});f.evidence.requests[0].causal_parent='unrelated';f.evidence.requests[0].terminal_state='FINISHED';f.evidence.journal.push({sequence:f.evidence.journal.length+1,kind:'FAILED',request_id:f.evidence.requests[0].request_id,page_id:page,page_lifecycle:'CLOSED',error_code:'net::ERR_TIMED_OUT',canceled:false});assert.equal(f.audit().status,'FAIL');});

// Independent Chromium fixture and harness-boundary regressions recovered from Step 24.2.
import fs from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url).pathname;
const browserEnabled=process.env.SL_CAUSAL_BROWSER_TEST==='1';
const {clickObserverSource}=await import(root+'scripts/adopt-causal-bridge.mjs');
const chromium=browserEnabled?(await import(root+'qa-dependencies/node_modules/playwright/index.mjs')).chromium:null;
const out=process.env.SL_CAUSAL_TEST_EVIDENCE??await fs.mkdtemp('/tmp/sl-five-findings-');
await fs.mkdir(out,{recursive:true});
test('real Chromium: click observer preserves native removal and duplicate-listener semantics',{skip:!browserEnabled},async()=>{
 const browser=await chromium.launch({headless:true});let native,wrapped;
 const exercise=`() => {
  const test=(duplicate)=>{const element=document.createElement('button');let calls=0;const callback=()=>calls++;
   element.addEventListener('click',callback,false);
   if(duplicate)element.addEventListener('click',callback,{get capture(){return false;}});
   else element.removeEventListener('click',callback,{get capture(){return false;}});
   element.click();return calls;};return {removed_listener_calls:test(false),duplicate_registration_calls:test(true)};
 }`;
 try {
  for(const instrumented of [false,true]){const context=await browser.newContext();if(instrumented)await context.addInitScript({content:clickObserverSource('adversarialBridge')});const page=await context.newPage();await page.goto('data:text/html,<button>fixture</button>');const value=await page.evaluate(`(${exercise})()`);if(instrumented)wrapped=value;else native=value;await context.close();}
  await fs.writeFile(out+'/chromium-listener-counterexample.json',JSON.stringify({native,wrapped},null,2));
  assert.deepEqual(native,{removed_listener_calls:0,duplicate_registration_calls:1});assert.deepEqual(wrapped,native);
 }finally{await browser.close();}
});
test('shared harness finish must reject observed T1 completion without tested-action bridge',async()=>{
 const origin='https://local-validation.invalid';const cdp=new EventEmitter();cdp.send=async()=>({result:{value:true}});
 const context={newPage:async()=>({url:()=>origin}),newCDPSession:async()=>cdp,close:async()=>{cdp.emit('close');}};
 globalThis.__SL_VALIDATION_CHROMIUM__={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
 const url=pathToFileURL(root+'scripts/browser-harness-base.mjs');let code=await fs.readFile(url,'utf8');
 code=code.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,url).href)).replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{ chromium: globalThis.__SL_VALIDATION_CHROMIUM__ }');
 const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const evidenceDir=out+'/missing-action-harness';await fs.mkdir(evidenceDir,{recursive:true});
 const h=await createReadOnlyHarness({origin},undefined,evidenceDir,true),p=await h.createPage();
 h.observability.context(transitions.T1);p.transitionStart('T1');
 cdp.emit('Network.requestWillBeSent',{requestId:'r1',frameId:'f1',loaderId:'l1',documentURL:origin+'/niveles-estadisticos',type:'Fetch',initiator:{type:'script',stack:{callFrames:[{scriptId:'unrelated',url:origin+'/app.js'}]}},request:{url:origin+'/niveles-estadisticos?asset=SPY&frequency=weekly&window=3Y',method:'GET',headers:{RSC:'1','Next-Router-Prefetch':'0'}}});
 cdp.emit('Network.responseReceived',{requestId:'r1',response:{status:200},type:'Fetch'});
 cdp.emit('Network.loadingFinished',{requestId:'r1'});await p.transitionComplete('T1');await p.close();
 await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID/);
});
test('independent real-browser positive path: one action, one request, one receipt, one accounted exemption, zero remaining failures',{skip:!browserEnabled},async()=>{
 const http=await import('node:http');const {once}=await import('node:events');
 const {createAdoptRequestEvidence,auditAdoptRequestEvidence}=await import(root+'scripts/adopt-request-evidence.mjs');
 const {installCausalBridge}=await import(root+'scripts/adopt-causal-bridge.mjs');const {account}=await import(root+'scripts/network-accounting.mjs');
 const html=`<button data-window="3Y">3Y</button><script>document.querySelector('button').addEventListener('click',()=>{const a=new AbortController();fetch('/niveles-estadisticos?asset=SPY&frequency=weekly&window=3Y',{headers:{RSC:'1','Next-Router-Prefetch':'0'},signal:a.signal}).then(()=>setTimeout(()=>a.abort(),100)).catch(()=>{});});</script>`;
 const sockets=new Set();const server=http.createServer((req,res)=>{if(req.headers.rsc==='1'){res.writeHead(200,{'Content-Type':'text/x-component'});res.write('incomplete fixture stream');}else{res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try {
  browser=await chromium.launch({headless:true});const context=await browser.newContext(),p=await context.newPage(),cdp=await context.newCDPSession(p);const c=createAdoptRequestEvidence(origin),raw=[],requests=new Map();c.listenerStart('page-1');c.pageLifecycle('page-1','ACTIVE');
  cdp.on('Page.frameNavigated',e=>c.frameNavigated('page-1',e));
  cdp.on('Network.requestWillBeSent',e=>{const b=c.request('page-1',e);requests.set(e.requestId,{binding:b,url:e.request.url,rsc:e.request.headers.RSC==='1',prefetch:false});});
  cdp.on('Network.responseReceived',e=>c.response('page-1',e));cdp.on('Network.loadingFinished',e=>c.finished('page-1',e));
  cdp.on('Network.loadingFailed',e=>{const r=requests.get(e.requestId);c.failure('page-1',e,raw.length);raw.push({request_evidence:r.binding,url:r.url,kind:'request_failure',type:e.type,rsc:r.rsc,prefetch:r.prefetch,canceled:e.canceled,error_code:e.errorText});});
  await Promise.all(['Page','Runtime','Network'].map(x=>cdp.send(x+'.enable')));const bridge=await installCausalBridge(cdp,'page-1',c.registerAction,c.completeAction,c.beginAction);
  await p.goto(origin+'/niveles-estadisticos');c.observability.context(transitions.T1);c.start('page-1','T1');const selector='[data-window="3Y"]',a=c.action('page-1','CLICK',selector);
  await bridge.click(a,selector,()=>p.locator(selector).click());const deadline=Date.now()+4000;while(raw.length<1&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));assert.equal(raw.length,1);c.complete('page-1','T1',true);c.pageLifecycle('page-1','CLOSING');c.listenerDrain('page-1');await context.close();c.sourceClosed('page-1');c.pageLifecycle('page-1','CLOSED');c.freeze();
  const receipts=c.receipts(raw),result=account(raw,false,origin,c.admittedReceipts(receipts)),e=c.evidence(raw,result,receipts),validation=auditAdoptRequestEvidence(e,raw,result,origin,['T1']);
  await fs.writeFile(out+'/independent-positive-browser.json',JSON.stringify({evidence:e,result,validation},null,2));
  assert.deepEqual(validation,{status:'PASS',issues:[]});assert.equal(e.requests.length,requests.size);assert.deepEqual(new Set(e.requests.map(r=>r.protocol_request_sha256)),new Set([...requests.keys()].map(id=>sha('page-1:'+id))));assert.equal(e.actions.length,1);assert.equal(e.requests.filter(r=>r.causality_status==='PROVEN').length,1);assert.equal(receipts.records.length,1);assert.equal(e.transition_accounting.length,1);assert.equal(result.ledger.length,1);assert.equal(result.raw_rsc_events[0].count,1);assert.equal(result.required_application_request_failures,0);
 }finally{await browser?.close();for(const s of sockets)s.destroy();await new Promise(r=>server.close(r));}
});

test('retry lineage: distinct retry identity retains explicit original parent and never gains fresh receipt',()=>{
 const f=make({retry:true});assert.equal(f.evidence.requests.length,2);assert.equal(f.evidence.requests[1].causal_parent,f.evidence.requests[0].request_id);assert.equal(f.evidence.requests[1].initiator.parent_protocol_sha256,f.evidence.requests[0].protocol_request_sha256);assert.equal(f.evidence.requests[1].causal_relation,'CDP_INITIATOR_REQUEST');assert.equal(f.result.required_application_request_failures,2);assert.equal(f.evidence.transition_receipts.records.length,0);assert.equal(f.audit().status,'FAIL');
});
test('UNKNOWN is retained in the sanitized raw ledger, never rewritten as NO',()=>{const f=make({headers:{RSC:'1'}});assert.equal(f.evidence.requests[0].prefetch_classification,'UNKNOWN');assert.equal(f.result.ledger[0].event.prefetch,'UNKNOWN');assert.equal(f.result.required_application_request_failures,1);assert.equal(f.audit().status,'FAIL');});
test('negative harness end-to-end: unresolved parent and pending prefetch plus post-close contradictory late events cannot escape artifact accounting',async()=>{
 const cdp=new EventEmitter();cdp.send=async()=>({result:{value:true}});
 const context={newPage:async()=>({url:()=>origin}),newCDPSession:async()=>cdp,close:async()=>{cdp.emit('close');setImmediate(()=>{cdp.emit('Network.loadingFailed',{requestId:'late',type:'Prefetch',canceled:true,errorText:'net::ERR_ABORTED'});cdp.emit('Network.loadingFinished',{requestId:'late'});});}};
 globalThis.__SL_LATE_VALIDATION_CHROMIUM__={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
 const url=pathToFileURL(root+'scripts/browser-harness-base.mjs');let code=await fs.readFile(url,'utf8');
 code=code.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,url).href)).replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{ chromium: globalThis.__SL_LATE_VALIDATION_CHROMIUM__ }');
 const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));const dir=await fs.mkdtemp(out+'/late-harness-');
 const h=await createReadOnlyHarness({origin},undefined,dir,true),p=await h.createPage();
 cdp.emit('Network.requestWillBeSent',{requestId:'late',type:'Prefetch',frameId:'f',loaderId:'l',documentURL:origin+'/',request:{url:origin+'/prefetch',method:'GET',headers:{RSC:'1','Sec-Purpose':'prefetch'}},initiator:{type:'script',requestId:'absent-parent'}});
 await p.close();await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID|ACCOUNTING_CHANGED_AFTER_FREEZE/);
 const e=JSON.parse(await fs.readFile(dir+'/adopt-request-evidence.json')),n=JSON.parse(await fs.readFile(dir+'/network-accounting.json'));
 assert.equal(e.validation.status,'FAIL');assert.equal(n.ledger.length,1);assert.equal(n.required_application_request_failures,1);assert.ok(e.journal.some(x=>x.kind==='FAILED'));assert.ok(e.journal.some(x=>x.kind==='FINISHED'));assert.ok(e.capture_issues.includes('EVENT_AFTER_FREEZE')||e.validation.issues.includes('REQUEST_LIFECYCLE_MISMATCH'));
});

test('classification records the positive non-prefetch basis and rejects a missing basis',()=>{const f=make();assert.equal(f.evidence.requests[0].classification_evidence.prefetch,'EXPLICIT_ROUTER_NON_PREFETCH');delete f.evidence.requests[0].classification_evidence;assert.equal(f.audit().status,'FAIL');});
test('browser Prefetch resource is positive evidence; contradiction with explicit non-prefetch blocks',()=>{assert.equal(classifyRequestSignals({},'Prefetch').prefetch,'YES');assert.equal(classifyRequestSignals({'Next-Router-Prefetch':'0'},'Prefetch').prefetch,'UNKNOWN');});

test('late application exception increments evidence revision and rejects freeze',()=>{const f=make();const before=f.c.revision();f.c.exception(page);assert.ok(f.c.revision()>before);const e=f.c.evidence(f.raw,f.result,f.evidence.transition_receipts);assert.ok(e.capture_issues.includes('EVENT_AFTER_FREEZE'));assert.equal(auditAdoptRequestEvidence(e,f.raw,f.result,origin,['T1']).status,'FAIL');});
