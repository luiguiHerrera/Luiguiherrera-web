import fs from 'node:fs/promises';
import {writeFileSync, appendFileSync, readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import { need, headersForRequest, protectedGet, publicProductionGet } from './release-core.mjs';
import { account, irrelevantNativeLevels } from './network-accounting.mjs';
import { createAdoptRequestEvidence, auditAdoptRequestEvidence } from './adopt-request-evidence.mjs';
import { installCausalBridge } from './adopt-causal-bridge.mjs';
import { transitions } from './probe-transition-receipts.mjs';
import { assetTransitionReadinessExpression } from './qa/asset-transition-readiness.mjs';

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
  const pageStates = new Map(), closePages = new Map(); let pageSequence = 0;
  async function createPage() {
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
    const page = await context.newPage(); pages.add(context);
    const cdp = await context.newCDPSession(page), requests = new Map(), paused = new Map();
    const pending = new Set();
    const pageId = 'page-' + (++pageSequence); pageStates.set(context, pageId);
    // Registration constants identify the native event without reading its payload.
    const onNative=(type,interpret)=>cdp.on(type,native=>adopt
      ? adopt.nativeIngress(pageId,type,native,events,safe=>interpret(safe)) : interpret(native));
    if (adopt) {
      cdp.on('Debugger.scriptParsed', native => adopt.scriptParsed(pageId,native,events));
      onNative('Page.frameNavigated', e => adopt.frameNavigated(pageId, e));
      onNative('Network.loadingFinished', e => {if(!retainUnresolved('FINISHED',e))adopt.finished(pageId,e);});
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
      requests.set(e.requestId, { ...(adopt ? { request_evidence: adopt.request(pageId, e) } : {}), url: e.request.url, type: e.type,
        rsc: signals?.rsc === 'UNKNOWN' ? 'UNKNOWN' : signals ? signals.rsc === 'YES' : headers.rsc === '1', prefetch: signals?.prefetch === 'UNKNOWN' ? 'UNKNOWN' : signals ? signals.prefetch === 'YES' : headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch' });
    });
    onNative('Network.loadingFailed', e => {
      if(retainUnresolved('FAILED',e))return;
      if(adopt?.failure(pageId,e,events.length)===false)return;
      events.push({ ...requests.get(e.requestId), kind: 'request_failure', canceled: e.canceled,
      error_code: e.errorText, type: e.type });
    });
    onNative('Network.responseReceived', e => {
      if(retainUnresolved('RESPONSE',e))return;
      if(adopt?.response(pageId,e,e.response.status>=400?events.length:undefined)===false)return;
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
      cdp.on('close',()=>{adopt.sourceClosed(pageId);resolveClosed();});
      adopt.listenerStart(pageId);adopt.pageLifecycle(pageId,'ACTIVE');
    }
    await Promise.all(['Page', 'Runtime', 'Network', 'Log'].map(domain => cdp.send(domain + '.enable')));
    if (!production) await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    const causalBridge = adopt ? await installCausalBridge(cdp, pageId, adopt.registerAction, adopt.completeAction, adopt.beginAction) : null;
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
      await Promise.all([...pending]);await context.close();
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
      transitionStart: kind => adopt.start(pageId, kind),
      transitionComplete: async kind => {
        const spec = transitions[kind];
        const readiness = spec ? await evaluate(assetTransitionReadinessExpression({ ...spec.target_state, pickerTitle: spec.target_state.asset === 'SPY' ? 'SPDR S&P 500 ETF' : 'SPDR Gold Shares' })) : false;
        adopt.complete(pageId, kind, readiness);
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
        await browser.close();
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
