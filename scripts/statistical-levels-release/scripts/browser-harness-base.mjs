import fs from 'node:fs/promises';
import path from 'node:path';
import { need, headersForRequest, protectedGet, publicProductionGet } from './release-core.mjs';
import { account } from './network-accounting.mjs';

export async function createReadOnlyHarness(target, tokenSource, out, production) {
  need(production ? tokenSource === undefined : typeof tokenSource?.get === 'function', 'QA_CREDENTIAL_MODE');
  need(!process.env.DEBUG && !process.env.PWDEBUG, 'DEBUG_MODE_FORBIDDEN');
  const { chromium } = await import('../qa-dependencies/node_modules/playwright/index.mjs');
  const browser = await chromium.launch({ headless: true,
    env: { PATH: process.env.PATH, HOME: out, LANG: 'en_US.UTF-8', TZ: 'UTC' } });
  const pages = new Set(), events = [], authFailures = [];
  async function createPage() {
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US', timezoneId: 'UTC' });
    const page = await context.newPage(); pages.add(context);
    const cdp = await context.newCDPSession(page), requests = new Map(), paused = new Map();
    const pending = new Set();
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
    cdp.on('Network.requestWillBeSent', e => {
      const headers = Object.fromEntries(Object.entries(e.request.headers).map(([k, v]) => [k.toLowerCase(), v]));
      requests.set(e.requestId, { url: e.request.url, type: e.type,
        rsc: headers.rsc === '1', prefetch: headers['next-router-prefetch'] === '1' || headers.purpose === 'prefetch' });
    });
    cdp.on('Network.loadingFailed', e => events.push({ ...requests.get(e.requestId), kind: 'request_failure', canceled: e.canceled,
      error_code: e.errorText, type: e.type }));
    cdp.on('Network.responseReceived', e => {
      if (e.response.status >= 400) events.push({ kind: 'request_failure', url: e.response.url, status: e.response.status, type: e.type });
    });
    cdp.on('Runtime.consoleAPICalled', e => {
      if (!['error', 'assert'].includes(e.type)) return;
      const frame = e.stackTrace?.callFrames?.[0];
      events.push({ kind: 'console_error', url: frame?.url || page.url(), source: 'Runtime.consoleAPICalled' });
    });
    cdp.on('Runtime.exceptionThrown', e => {
      const x = e.exceptionDetails;
      events.push({ kind: 'exception', url: x.url || x.stackTrace?.callFrames?.[0]?.url || page.url(), source: 'Runtime.exceptionThrown' });
    });
    cdp.on('Log.entryAdded', e => {
      if (e.entry.level === 'error') events.push({ kind: 'console_error', url: e.entry.url || page.url(), source: 'Log.entryAdded' });
    });
    await Promise.all(['Page', 'Runtime', 'Network', 'Log'].map(domain => cdp.send(domain + '.enable')));
    if (!production) await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    const send = (method, params = {}) => cdp.send(method, params);
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
    return { send, evaluate, click, key, errors, close: async () => {
      // Flush all current requests before browser teardown; no blanket canceled filter.
      await Promise.all([...pending]); await context.close(); pages.delete(context);
    } };
  }
  return { createPage, protectedGet: async url => production ? publicProductionGet(url) : protectedGet(url, await tokenSource.get(), target.origin),
    finish: async finalProductPassed => {
      for (const context of pages) await context.close();
      await browser.close(); tokenSource?.clear();
      const result = account(events, finalProductPassed, target.origin);
      await fs.writeFile(path.join(out, 'network-accounting.json'), JSON.stringify({ ...result, authFailures }, null, 2) + '\n');
      need(authFailures.length === 0, 'CREDENTIAL_SCOPE_FAILURE');
      return result;
    } };
}
