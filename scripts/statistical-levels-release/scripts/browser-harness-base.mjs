import fs from 'node:fs/promises';
import {writeFileSync, appendFileSync, readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha, need, headersForRequest, protectedGet, publicProductionGet } from './release-core.mjs';
import { account, irrelevantNativeLevels } from './network-accounting.mjs';
import { createAdoptRequestEvidence, auditAdoptRequestEvidence } from './adopt-request-evidence.mjs';
import { installCausalBridge } from './adopt-causal-bridge.mjs';
import { transitions } from './probe-transition-receipts.mjs';
import { assetTransitionReadinessExpression } from './qa/asset-transition-readiness.mjs';
import { createRuntimeObserver } from './runtime-transition-receipts.mjs';

// Wait only for genuine native loadingFinished/loadingFailed observations.
// The deadline bounds capture, never manufactures a terminal state. Listeners
// stay attached throughout this wait and subsequent context/session closure.
export async function drainNativeRequestLifecycle(pendingRequestIds,{timeoutMs=5000,pollMs=25}={}) {
  const start=performance.now(),deadline=start+timeoutMs;
  let ids=pendingRequestIds();
  const initial=[...ids];
  while(ids.length&&performance.now()<deadline) {
    await new Promise(resolve=>setTimeout(resolve,Math.min(pollMs,Math.max(0,deadline-performance.now()))));
    ids=pendingRequestIds();
  }
  return {terminal_coverage_complete:ids.length===0,pending_request_ids:ids,diagnostics:{clock:"PERFORMANCE_MONOTONIC_MS",start_timestamp:start,deadline_timestamp:deadline,end_timestamp:performance.now(),exit_reason:ids.length===0?"EMPTY_PENDING_SET":"DEADLINE",pending_ids_at_start:initial,pending_ids_at_end:[...ids]}};
}

export async function createReadOnlyHarness(target, tokenSource, out, production) {
  need(production ? tokenSource === undefined : typeof tokenSource?.get === 'function', 'QA_CREDENTIAL_MODE');
  need(!process.env.DEBUG && !process.env.PWDEBUG, 'DEBUG_MODE_FORBIDDEN');
  const { chromium } = await import('../qa-dependencies/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ headless: true,
    env: { PATH: process.env.PATH, HOME: out, LANG: 'en_US.UTF-8', TZ: 'UTC' } });
  const pages = new Set(), events = [], authFailures = [];
  const adopt = production ? createAdoptRequestEvidence(target.origin, envelope => {
    appendFileSync(path.join(out,'native-ingress.jsonl'),JSON.stringify(envelope)+'\n',{encoding:'utf8',flush:true});
  }) : null;
  const lifecycle={schema:"statistical-levels.native-lifecycle-diagnostics.v1",clock:"PERFORMANCE_MONOTONIC_MS",pages:[],browser_close_timestamp:null,browser_closed_timestamp:null};
  const pageStates = new Map(), closePages = new Map(); let pageSequence = 0;
  async function createPage() {
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
    const page = await context.newPage(); pages.add(context);
    const cdp = await context.newCDPSession(page), requests = new Map(), paused = new Map();
    const pending = new Set();
    const pageId = 'page-' + (++pageSequence); pageStates.set(context, pageId);
    const diagnostic={page_id:pageId,drain:null,requests:[],page_close_timestamp:null,page_closed_timestamp:null,source_close_timestamp:null};if(adopt)lifecycle.pages.push(diagnostic);
    const diagnosticRequests=new Map();
    function observeLifecycle(type,e){
      if(!adopt||typeof e.requestId!=='string')return;
      const id=sha(pageId+':'+e.requestId);let row=diagnosticRequests.get(id);
      if(!row){row={request_id:id,request_start_timestamp:null,response_timestamp:null,loading_finished_timestamp:null,loading_failed_timestamp:null,native_terminal_callback_timestamp:null};diagnosticRequests.set(id,row);diagnostic.requests.push(row);}
      const key={'Network.requestWillBeSent':'request_start_timestamp','Network.responseReceived':'response_timestamp','Network.loadingFinished':'loading_finished_timestamp','Network.loadingFailed':'loading_failed_timestamp'}[type];
      if(key)row[key]=performance.now();
      if(type==='Network.loadingFinished'||type==='Network.loadingFailed')row.native_terminal_callback_timestamp=performance.now();
    }
    const runtime = adopt ? await createRuntimeObserver(browser,cdp,target.origin,pageId,randomUUID) : null;
    let runtimeKind=null,runtimeTransition=null;
    // Unsupported transport starts are retained as UNKNOWN, never silently zero.
    for(const type of ['Network.webSocketCreated','Network.webTransportCreated','Network.directTCPSocketCreated','Network.directUDPSocketCreated'])cdp.on(type,()=>{runtime?.unsupported();events.push({kind:'unsupported_runtime_transport',rsc:'UNKNOWN',prefetch:'UNKNOWN'});});
    // Registration constants identify the native event without reading its payload.
    const onNative=(type,interpret)=>cdp.on(type,native=>adopt
      ? adopt.nativeIngress(pageId,type,native,events,safe=>{observeLifecycle(type,safe);return interpret(safe);}) : interpret(native));
    if (adopt) {
      cdp.on('Debugger.scriptParsed', native => {const observed=adopt.scriptParsed(pageId,native,events);void runtime.script(observed);});
      onNative('Page.frameNavigated', e => {adopt.frameNavigated(pageId, e);runtime.navigate();});
      onNative('Network.loadingFinished', e => {if(!retainUnresolved('FINISHED',e)){adopt.finished(pageId,e);runtime.terminal(e,'FINISHED');}});
    }
    // Gated separately by complete raw accounting; no event is thrown away.
    const errors = { console: [], exceptions: [], network: [], http: [] };
    if (!production) cdp.on('Fetch.requestPaused', event => {
      const task = (async () => {
        try {
          const previous = event.redirectedRequestId ? paused.get(event.redirectedRequestId) : null;
          paused.set(event.requestId, event.request.url);
          const headers = headersForRequest(event.request.url, event.request.headers, new URL(event.request.url).origin === target.origin ? await tokenSource.get() : undefined, previous, target.origin);
          // CDP documents overrides as applying only to THIS request, not redirects.
          await cdp.send('Fetch.continueRequest', { requestId: event.requestId,
            headers: Object.entries(headers).map(([name, value]) => ({ name, value: String(value) })) });
        } catch {
          authFailures.push('CREDENTIAL_SCOPE_OR_REDIRECT_REJECTED');
          await cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        }
      })();
      pending.add(task); task.finally(() => pending.delete(task));
    });
    onNative('Network.requestWillBeSent', e => {
      if(retainUnresolved('REQUEST',e))return;
      const headers = Object.fromEntries(Object.entries(e.request.headers).map(([k, v]) => [k.toLowerCase(), v]));
      const signals = adopt ? adopt.classification(pageId,e) : null;
      const binding=adopt?.request(pageId,e);runtime?.request(e,binding);
      if(binding){const row=diagnosticRequests.get(sha(pageId+':'+e.requestId));if(row)row.request_id=binding.request_instance_id;}
      requests.set(e.requestId, { ...(adopt ? { request_evidence: binding } : {}), url: e.request.url, type: e.type,
        rsc: signals?.rsc === 'UNKNOWN' ? 'UNKNOWN' : signals ? signals.rsc === 'YES' : headers.rsc === '1', prefetch: signals?.prefetch === 'UNKNOWN' ? 'UNKNOWN' : signals ? signals.prefetch === 'YES' : headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch' });
    });
    onNative('Network.loadingFailed', e => {
      if(retainUnresolved('FAILED',e))return;
      if(adopt?.failure(pageId,e,events.length)===false)return;
      runtime?.terminal(e,'FAILED');
      events.push({ ...requests.get(e.requestId), kind: 'request_failure', canceled: e.canceled,
      error_code: e.errorText, type: e.type });
    });
    onNative('Network.responseReceived', e => {
      if(retainUnresolved('RESPONSE',e))return;
      if(adopt?.response(pageId,e,e.response.status>=400?events.length:undefined)===false)return;
      runtime?.response(e);
      if (e.response.status >= 400) events.push({ kind: 'request_failure', url: e.response.url, status: e.response.status, type: e.type });
      if (adopt && e.response.status >= 400 && requests.has(e.requestId)) {
        const raw = events.at(-1), request = requests.get(e.requestId);
        Object.assign(raw, { request_evidence: request.request_evidence, rsc: request.rsc, prefetch: request.prefetch });
      }
    });
    // Conversion and journal/ledger insertion run synchronously in one callback.
    // The source-close acknowledgement cannot overtake an accepted conversion.
    function retainUnresolved(kind,native) {
      const unresolved=adopt?.unresolvedNative(pageId,kind,native,events.length);
      if(unresolved?.event)events.push(unresolved.event);
      return !!unresolved;
    }
    function recordException(native,raw) {
      runtime?.exception();
      // page.url() fallback is also evaluated inside ingress; never retain a lazy
      // browser return value in the raw accounting ledger.
      if(adopt)need(raw.url==null||typeof raw.url==='string','NATIVE_SOURCE_TYPE_INVALID');
      const identity=adopt?.exception(pageId,native,raw);
      if(identity===null)return;
      events.push({...raw,...(identity?{failure_evidence:identity}:{})});
    }
    onNative('Runtime.consoleAPICalled', e => {
      const level=e.type;
      if (!['error', 'assert'].includes(level)) {
        if(adopt){need(irrelevantNativeLevels['Runtime.consoleAPICalled'].includes(level),'NATIVE_LEVEL_UNKNOWN');return {irrelevant_native_level:level};}
        return;
      }
      const frame = e.stackTrace?.callFrames?.[0];
      recordException(e,{ kind: 'console_error', url: frame?.url || page.url(), source: 'Runtime.consoleAPICalled' });
    });
    onNative('Runtime.exceptionThrown', e => {
      const x = e.exceptionDetails;
      recordException(e,{ kind: 'exception', url: x.url || x.stackTrace?.callFrames?.[0]?.url || page.url(), source: 'Runtime.exceptionThrown' });
    });
    onNative('Log.entryAdded', e => {
      const level=e.entry.level;
      if (level === 'error') recordException(e,{ kind: 'console_error', url: e.entry.url || page.url(), source: 'Log.entryAdded' });
      else if(adopt){need(irrelevantNativeLevels['Log.entryAdded'].includes(level),'NATIVE_LEVEL_UNKNOWN');return {irrelevant_native_level:level};}
    });
    let resolveClosed;const sourceClosed = new Promise(resolve => {resolveClosed=resolve;});
    if(adopt) {
      cdp.on('close',()=>{diagnostic.source_close_timestamp=performance.now();adopt.sourceClosed(pageId);resolveClosed();});
      adopt.listenerStart(pageId);adopt.pageLifecycle(pageId,'ACTIVE');
    }
    await Promise.all(['Page', 'Runtime', 'Network', 'Log'].map(domain => cdp.send(domain + '.enable')));
    if (!production) await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    const causalBridge = adopt ? await installCausalBridge(cdp, pageId, adopt.registerAction, adopt.completeAction, async id=>{if(runtimeKind)await runtime.begin(runtimeKind,runtimeTransition,id);adopt.beginAction(id);}) : null;
    const send = (method, params = {}) => cdp.send(method, params);
    const evaluate = async expression => {
      const action = adopt?.action(pageId, 'EVALUATE', expression);
      const r = action ? await causalBridge.evaluate(action, expression) : await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      need(!r.exceptionDetails, 'BROWSER_EVALUATION_FAILED'); return r.result.value;
    };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const click = async selector => {
      const box = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      const action = adopt?.action(pageId, 'CLICK', selector);
      const dispatch = async () => {
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 }); await sleep(100);
      };
      if (action) await causalBridge.click(action, selector, dispatch); else await dispatch();
    };
    const key = async (key, code = key, windowsVirtualKeyCode = 0) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode,
        ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode }); await sleep(100);
    };
    const closePage=async()=>{
      adopt?.pageLifecycle(pageId,'CLOSING');adopt?.listenerDrain(pageId);
      await Promise.all([...pending]);
      if(adopt){const drained=await drainNativeRequestLifecycle(()=>adopt.pendingRequests(pageId));diagnostic.drain=drained.diagnostics;}
      // Still-pending requests remain PENDING in the durable collector; native
      // cancellation delivered during close is retained by the same listeners.
      if(adopt)diagnostic.page_close_timestamp=performance.now();
      await context.close();
      if(adopt)diagnostic.page_closed_timestamp=performance.now();
      if(adopt){
        // CDP close is ordered after the session's delivered protocol events.
        // A missing acknowledgement is an error, never a successful drain.
        let timer;
        try{await Promise.race([sourceClosed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('CDP_DRAIN_UNCONFIRMED')),5000);})]);}
        finally{clearTimeout(timer);}
      }
      adopt?.pageLifecycle(pageId,'CLOSED');pages.delete(context);pageStates.delete(context);
    };
    closePages.set(context,closePage);
    return { send, evaluate, click, key, errors, ...(adopt ? {
      transitionStart: kind => {runtimeKind=kind;runtimeTransition=adopt.start(pageId,kind);return runtimeTransition;},
      transitionComplete: async kind => {
        const spec = transitions[kind];
        const readiness = spec ? await evaluate(assetTransitionReadinessExpression({ ...spec.target_state, pickerTitle: spec.target_state.asset === 'SPY' ? 'SPDR S&P 500 ETF' : 'SPDR Gold Shares' })) : false;
        let proof;
        try{proof=runtime.supported()?await runtime.complete(kind,readiness):null;}
        catch{adopt.complete(pageId,kind,false,runtime.records().at(-1));runtimeKind=null;runtimeTransition=null;throw Error('RUNTIME_OBSERVER_INCOMPLETE');}
        adopt.complete(pageId, kind, readiness,proof);runtimeKind=null;runtimeTransition=null;
      }
    } : {}), close: closePage };
  }
  return { createPage, ...(adopt ? { observability: adopt.observability } : {}), protectedGet: async url => production ? publicProductionGet(url) : protectedGet(url, await tokenSource.get(), target.origin),
    finish: async finalProductPassed => {
      if (!adopt) {
        for (const context of pages) await context.close();
        await browser.close(); tokenSource?.clear();
        const result = account(events, finalProductPassed, target.origin);
        await fs.writeFile(path.join(out, 'network-accounting.json'), JSON.stringify({ ...result, authFailures }, null, 2) + '\n');
        need(authFailures.length === 0, 'CREDENTIAL_SCOPE_FAILURE');
        return result;
      }
      let closeError;
      try {
        for (const context of pages) {
          await closePages.get(context)();
        }
        lifecycle.browser_close_timestamp=performance.now();
        await browser.close();
        lifecycle.browser_closed_timestamp=performance.now();
      } catch (error) { closeError = error; } finally { tokenSource?.clear(); }
      // All accepted native callbacks convert synchronously. After the closed
      // source acknowledgements, drain the already queued JavaScript turn before
      // freezing. This is an event-loop barrier, not a network-idleness timeout.
      await new Promise(resolve=>setImmediate(resolve));
      const ingressPath=path.join(out,'native-ingress.jsonl');
      try {
        const snapshots=existsSync(ingressPath)?readFileSync(ingressPath,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
        adopt.verifyIngress(snapshots);
      }catch {adopt.verifyIngress(null);}
      for(const p of lifecycle.pages)for(const row of p.requests){row.request_present_at_drain_start=p.drain?.pending_ids_at_start.includes(row.request_id)??null;row.request_present_at_drain_end=p.drain?.pending_ids_at_end.includes(row.request_id)??null;}
      writeFileSync(path.join(out,"native-lifecycle-diagnostics.json"),JSON.stringify(lifecycle,null,2)+"\n");
      adopt.freeze();
      const receipts = adopt.receipts(events);
      // Retain the full unmodified failure ledger even when receipt validation fails.
      let receiptError, result;
      try {
        account(events, finalProductPassed, target.origin, receipts); // Validate, retain, never silently discard.
        result = account(events, finalProductPassed, target.origin, adopt.admittedReceipts(receipts));
      }
      catch (error) { receiptError = error; result = account(events, finalProductPassed, target.origin); }
      const evidence=adopt.evidence(events,result,receipts);
      const validation=auditAdoptRequestEvidence(evidence,events,result,target.origin);
      // No await between snapshot, both durable writes and the gate: a listener
      // callback cannot be accepted between accounting and artifact publication.
      writeFileSync(path.join(out,'adopt-request-evidence.json'),JSON.stringify({...evidence,validation},null,2)+'\n');
      writeFileSync(path.join(out,'network-accounting.json'),JSON.stringify({...result,authFailures},null,2)+'\n');
      if (closeError) throw closeError;
      if (receiptError) throw receiptError;
      need(!validation || validation.status === 'PASS', 'ADOPT_REQUEST_EVIDENCE_INVALID');
      need(authFailures.length === 0, 'CREDENTIAL_SCOPE_FAILURE');
      return result;
    } };
}
