import { createRequestInstanceCollector } from './probe-request-instances.mjs';
// PROBE-only observability copy. Existing browser commands, raw capture and classifier are preserved.
import fs from 'node:fs/promises';
import path from 'node:path';
import { need, headersForRequest, protectedGet, publicProductionGet } from './release-core.mjs';
import { account, safeEvent } from './network-accounting.mjs';
import { createInterceptionObservability, interceptionFailureCategory } from './probe-interception-observability.mjs';


import { probeBrowserHeaders } from './probe-toolbar-policy.mjs';
import { createTransitionCapture, transitions } from './probe-transition-receipts.mjs';
import { assetTransitionReadinessExpression } from './qa/asset-transition-readiness.mjs';

export async function createProbeProductHarness(target, tokenSource, out, production, observability) {
  need(production ? tokenSource === undefined : typeof tokenSource?.get === 'function', 'QA_CREDENTIAL_MODE');
  need(!process.env.DEBUG && !process.env.PWDEBUG, 'DEBUG_MODE_FORBIDDEN');
  const { chromium } = await import('../qa-dependencies/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ headless: true,
    env: { PATH: process.env.PATH, HOME: out, LANG: 'en_US.UTF-8', TZ: 'UTC' } });
  const pages = new Set(), events = [], authFailures = [], transportFailures = [];
  const interception = createInterceptionObservability(out), pageLifecycles = new Map();
  const transitionCapture = createTransitionCapture(target.origin);
  const requestCollector=createRequestInstanceCollector(target.origin);
  let pageSequence = 0;
  async function createPage() {
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
    const page = await context.newPage(); pages.add(context);
    const cdp = await context.newCDPSession(page), requests = new Map(), paused = new Map();
    const pending = new Set();
    const pageId = 'page-' + (++pageSequence), requestMetadata = new Map();
    let viewport = null, lifecycle = 'ACTIVE', requestSequence = 0, activeTransition = null, transitionContext = null;
    pageLifecycles.set(context, value => { lifecycle = value; if(value!=='ACTIVE')transitionCapture.pageClosing(pageId); });
    const metadata = extra => ({ page_id: pageId, viewport, route: page.url(), lifecycle, ...extra });
    const observeLast = extra => observability?.recordEvent(events[events.length - 1], metadata(extra));
    observability?.lifecycle('PAGE_CREATED', metadata({}));
    // Gated separately by complete raw accounting; no event is thrown away.
    const errors = { console: [], exceptions: [], network: [], http: [] };
    if (!production) cdp.on('Fetch.requestPaused', event => {
      const sequence = ++requestSequence;
      const task = (async () => {
        let failureStage = 'REDIRECT_LOOKUP', previous;
        const recordFailure = error => interception.record({ failureStage, error, pageId,
          pageLifecycle: lifecycle, requestSequence: sequence, event, previous, origin: target.origin });
        try {
          previous = event.redirectedRequestId ? paused.get(event.redirectedRequestId) : null;
          paused.set(event.requestId, event.request.url);
          // Preserve argument evaluation order; stage markers add no waits or request decisions.
          const requestURL = event.request.url, requestHeaders = event.request.headers;
          failureStage = 'REQUEST_URL_PARSING';
          const destination = new URL(requestURL);
          failureStage = 'TOKEN_ACQUISITION';
          const token = destination.origin === target.origin ? await tokenSource.get() : undefined;
          failureStage = 'HEADER_SCOPE_VALIDATION';
          const headers = probeBrowserHeaders(headersForRequest(requestURL, requestHeaders, token, previous, target.origin), {url:requestURL,resourceType:event.resourceType,origin:target.origin,production});
          failureStage = 'REQUEST_CONTINUATION';
          // CDP documents overrides as applying only to THIS request, not redirects.
          await cdp.send('Fetch.continueRequest', { requestId: event.requestId,
            headers: Object.entries(headers).map(([name, value]) => ({ name, value: String(value) })) });
        } catch (error) {
          recordFailure(error);
          // Both gates are fail-closed before fallback; transport is never mislabeled as credential scope.
          const failureBucket = interceptionFailureCategory(failureStage) === 'INTERCEPTION_TRANSPORT_FAILURE' ? transportFailures : authFailures;
          failureBucket.push(failureBucket === transportFailures ? 'INTERCEPTION_TRANSPORT_FAILURE' : 'CREDENTIAL_SCOPE_OR_REDIRECT_REJECTED');
          failureStage = 'FAIL_REQUEST_FALLBACK';
          let fallback;
          try {
            fallback = cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' });
          } catch (fallbackError) {
            recordFailure(fallbackError);
            throw fallbackError; // Preserve the original synchronous-send failure propagation.
          }
          await fallback.catch(fallbackError => { recordFailure(fallbackError); });
        }
      })();
      pending.add(task); task.finally(() => pending.delete(task));
    });
    cdp.on('Page.frameNavigated', e => requestCollector.frameNavigated(pageId,e.frame));
    cdp.on('Network.requestWillBeSent', e => {
      const binding=requestCollector.request(pageId,e,observability?.requestStartContext?.(),activeTransition,transitionContext);
      transitionCapture.request(pageId,e.requestId,e,lifecycle,binding);
      const headers = Object.fromEntries(Object.entries(e.request.headers).map(([k, v]) => [k.toLowerCase(), v]));
      requests.set(e.requestId, { request_evidence:binding, url: e.request.url, type: e.type,
        rsc: headers.rsc === '1', prefetch: headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch' });
      requestMetadata.set(e.requestId, { request_id: pageId + ':' + e.requestId, method: e.request.method, request_start_context: observability?.requestStartContext?.() ?? null });
    });
    cdp.on('Network.loadingFailed', e => {
      transitionCapture.failure(pageId,e.requestId,e,events.length,lifecycle);
      events.push({ ...requests.get(e.requestId), kind: 'request_failure', canceled: e.canceled,
        error_code: e.errorText, type: e.type });
      observeLast({ ...requestMetadata.get(e.requestId), source_timestamp: e.timestamp, source_clock_domain: 'CDP_NETWORK_MONOTONIC_SECONDS' });
    });
    cdp.on('Network.responseReceived', e => {
      transitionCapture.response(pageId,e.requestId,e.response.status,lifecycle);
      if (e.response.status >= 400) {
        events.push({ ...(requests.has(e.requestId)?{request_evidence:requests.get(e.requestId).request_evidence}:{}), kind: 'request_failure', url: e.response.url, status: e.response.status, type: e.type });
        observeLast({ ...requestMetadata.get(e.requestId), source_timestamp: e.timestamp, source_clock_domain: 'CDP_NETWORK_MONOTONIC_SECONDS' });
      }
    });
    cdp.on('Runtime.consoleAPICalled', e => {
      if (!['error', 'assert'].includes(e.type)) return;
      transitionCapture.exception(pageId);
      const frame = e.stackTrace?.callFrames?.[0];
      events.push({ kind: 'console_error', url: frame?.url || page.url(), source: 'Runtime.consoleAPICalled' });
      observeLast({ console_level: e.type, console_source: 'Runtime.consoleAPICalled', source_timestamp: e.timestamp, source_clock_domain: 'CDP_RUNTIME_EPOCH_MILLISECONDS' });
    });
    cdp.on('Runtime.exceptionThrown', e => {
      transitionCapture.exception(pageId);
      const x = e.exceptionDetails;
      events.push({ kind: 'exception', url: x.url || x.stackTrace?.callFrames?.[0]?.url || page.url(), source: 'Runtime.exceptionThrown' });
      observeLast({ console_level: 'exception', console_source: 'Runtime.exceptionThrown', source_timestamp: e.timestamp, source_clock_domain: 'CDP_RUNTIME_EPOCH_MILLISECONDS' });
    });
    cdp.on('Log.entryAdded', e => {
      if (e.entry.level === 'error') {
        transitionCapture.exception(pageId);
        events.push({ kind: 'console_error', url: e.entry.url || page.url(), source: 'Log.entryAdded' });
        observeLast({ console_level: e.entry.level, console_source: e.entry.source,
          console_text: e.entry.text, source_timestamp: e.entry.timestamp, source_clock_domain: 'CDP_RUNTIME_EPOCH_MILLISECONDS', request_id: e.entry.networkRequestId ? pageId + ':' + e.entry.networkRequestId : null });
      }
    });
    await Promise.all(['Page', 'Runtime', 'Network', 'Log'].map(domain => cdp.send(domain + '.enable')));
    if (!production) await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    const send = (method, params = {}) => {
      if (method === 'Emulation.setDeviceMetricsOverride') viewport = { width: params.width, height: params.height, mobile: params.mobile };
      return cdp.send(method, params);
    };
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      need(!r.exceptionDetails, 'BROWSER_EVALUATION_FAILED'); return r.result.value;
    };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const click = async selector => {
      const box = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 }); await sleep(100);
    };
    const key = async (key, code = key, windowsVirtualKeyCode = 0) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode,
        ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode }); await sleep(100);
    };
    return { send, evaluate, click, key, errors,
      transitionStart: kind => { transitionContext=observability?.requestStartContext?.();activeTransition=transitionCapture.start(pageId,kind,observability?.requestStartContext?.(),lifecycle);return activeTransition; },
      transitionComplete: async kind => {
        const spec=transitions[kind];
        const readiness=spec ? await evaluate(assetTransitionReadinessExpression({...spec.target_state,pickerTitle:spec.target_state.asset==='SPY'?'SPDR S&P 500 ETF':'SPDR Gold Shares'})) : false;
        transitionCapture.complete(pageId,kind,{metric:true,readiness,productFailure:observability?.hasProductFailure?.()!==false},lifecycle);
        activeTransition=null;transitionContext=null;
      }, close: async () => {
      transitionCapture.pageClosing(pageId); lifecycle = 'CLOSING'; observability?.lifecycle('PAGE_CLOSE_START', metadata({}));
      // Flush all current requests before browser teardown; no blanket canceled filter.
      try {
        await Promise.all([...pending]); await context.close(); pages.delete(context); pageLifecycles.delete(context);
        lifecycle = 'CLOSED';
      } finally {
        observability?.lifecycle(lifecycle === 'CLOSED' ? 'PAGE_CLOSED' : 'PAGE_CLOSE_ABORTED', metadata({}));
        observability?.flush();
      }
    } };
  }
  return { createPage, observability, protectedGet: async url => production ? publicProductionGet(url) : protectedGet(url, await tokenSource.get(), target.origin),
    finish: async finalProductPassed => {
      observability?.lifecycle('BROWSER_CLOSE_START', {});
      let browserClosed = false;
      try {
        for (const context of pages) {
          // Metadata only: finish retains its original close order and pending-set behavior.
          pageLifecycles.get(context)?.('CLOSING');
          await context.close();
          pageLifecycles.get(context)?.('CLOSED');
        }
        await browser.close(); tokenSource?.clear();
        browserClosed = true;
      } finally {
        observability?.lifecycle(browserClosed ? 'BROWSER_CLOSED' : 'BROWSER_CLOSE_ABORTED', {});
        observability?.flush();
      }
      interception.flush();
      const transitionEvidence=transitionCapture.evidence(events.map(safeEvent));
      const result = account(events, finalProductPassed, target.origin, transitionEvidence);
      observability?.finish(result);
      await fs.writeFile(path.join(out, 'network-accounting.json'), JSON.stringify({ ...result, authFailures, transportFailures }, null, 2) + '\n');
      need(authFailures.length === 0, 'CREDENTIAL_SCOPE_FAILURE');
      need(transportFailures.length === 0, 'INTERCEPTION_TRANSPORT_FAILURE');
      return result;
    } };
}
