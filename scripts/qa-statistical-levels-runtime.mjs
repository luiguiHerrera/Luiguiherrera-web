// Product implementation checks. Network authority is the separately replayed
// native harness trace; readiness waits here do not prove an empty network.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from './statistical-levels-release/qa-dependencies/node_modules/playwright/index.mjs';
const origin=new URL(process.argv[2]).origin,out=process.argv[3];
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'LOCAL_IMPLEMENTATION_ONLY');
const browser=await chromium.launch({headless:true}),results=[];
const state=([asset,frequency,window])=>({asset,frequency,window});
const url=(route,s)=>origin+route+'?'+new URLSearchParams(s);
async function ready(page,s){await page.waitForFunction(s=>{const u=new URL(location.href);return Object.entries(s).every(([k,v])=>u.searchParams.get(k)===v)&&document.querySelector('#sl-options label:first-child select')?.value===s.frequency&&document.querySelector('#sl-options label:nth-child(2) select')?.value===s.window&&document.querySelector('#sl-interpretation')?.textContent.includes(s.asset);},s);}
async function options(page){if(!await page.locator('#sl-options').evaluate(e=>e.open))await page.locator('#sl-options > summary').click();}
async function asset(page,title){if(!await page.locator('#sl-asset-picker').evaluate(e=>e.open))await page.locator('#sl-asset-picker > summary').click();await page.locator('.sl-picker-group button[title="'+title+'"]').click();}
try{
for(const route of ['/niveles-estadisticos','/en/statistical-levels']){
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',()=>errors.push('EXCEPTION'));
 const s=state(['SPY','weekly','5Y']);await page.goto(url(route,s));await ready(page,s);
 await page.locator('[data-window="3Y"]').click();const t1=state(['SPY','weekly','3Y']);await ready(page,t1);await page.reload();await ready(page,t1);
 await page.goto(url(route,s));await ready(page,s);await asset(page,'SPDR Gold Shares');const t2=state(['GLD','weekly','5Y']);await ready(page,t2);await page.reload();await ready(page,t2);
 await options(page);await page.locator('#sl-options label:first-child select').selectOption('daily');const t3=state(['GLD','daily','5Y']);await ready(page,t3);await page.reload();await ready(page,t3);
 await options(page);await page.locator('#sl-options label:nth-child(2) select').selectOption('Full');const t4=state(['GLD','daily','Full']);await ready(page,t4);await page.reload();await ready(page,t4);
 await page.goto(url(route,s));await ready(page,s);await asset(page,'SPDR Gold Shares');await ready(page,t2);await options(page);await page.locator('#sl-options label:first-child select').selectOption('daily');await ready(page,t3);await page.locator('#sl-options label:nth-child(2) select').selectOption('Full');await ready(page,t4);
 const historyRequests=[];page.on('request',r=>historyRequests.push(new URL(r.url()).pathname));await page.goBack();await ready(page,t3);await page.goBack();await ready(page,t2);await page.goForward();await ready(page,t3);assert.deepEqual(historyRequests,[]);assert.deepEqual(errors,[]);
 await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block'}),np=await nojs.newPage();await np.goto(url(route,t4));assert.equal(await np.locator('#sl-options label:first-child select').inputValue(),'daily');assert.equal(await np.locator('#sl-options label:nth-child(2) select').inputValue(),'Full');assert.match(await np.locator('#sl-interpretation').textContent(),/GLD/);await nojs.close();
 results.push({route,reload:['T1','T2','T3','T4'],history:'PASS',history_requests:0,no_js:'PASS'});
}
// Local fixture responses exercise visible failure without changing Production.
for(const defect of ['HTTP_ERROR','WRONG_SNAPSHOT','WRONG_TICKER','WRONG_SCHEMA']){
 const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage();let issued=0;
 await p.route('**/api/statistical-levels/asset?*',async route=>{issued++;if(defect==='HTTP_ERROR')return route.fulfill({status:500,contentType:'application/json',body:'{}'});const response=await fetch(route.request().url(),{redirect:'error'}),body=await response.json();if(defect==='WRONG_SNAPSHOT')body.snapshot='0'.repeat(64);if(defect==='WRONG_TICKER')body.ticker='SPY';if(defect==='WRONG_SCHEMA')body.schema='invalid';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
 await p.goto(url('/niveles-estadisticos',state(['SPY','weekly','5Y'])));await asset(p,'SPDR Gold Shares');await p.locator('.sl-page > [role="alert"]').waitFor();assert.match(await p.locator('#sl-interpretation').textContent(),/SPY/);assert.equal(new URL(p.url()).searchParams.get('asset'),'SPY');assert.equal(issued,1);await context.close();results.push({defect,blocked:true,requests:issued});
}
// Evicted asset history entries load once; same-snapshot hits need no request.
{
 const c=await browser.newContext({serviceWorkers:'block'}),p=await c.newPage();await p.goto(url('/niveles-estadisticos',state(['SPY','weekly','5Y'])));
 for(const ticker of ['GLD','QQQ','TLT','IEF','SLV']){if(!await p.locator('#sl-asset-picker').evaluate(e=>e.open))await p.locator('#sl-asset-picker > summary').click();await p.locator('.sl-picker-group button').filter({hasText:new RegExp('^'+ticker+'$')}).click();await ready(p,state([ticker,'weekly','5Y']));}
 const starts=[];p.on('request',r=>starts.push(r));
 await p.evaluate(()=>history.go(-5));await ready(p,state(['SPY','weekly','5Y']));assert.equal(starts.length,1);assert.equal(new URL(starts[0].url()).pathname,'/api/statistical-levels/asset');assert.equal(new URL(starts[0].url()).searchParams.get('asset'),'SPY');
 starts.length=0;await p.goForward();await ready(p,state(['GLD','weekly','5Y']));assert.equal(starts.length,1);assert.equal(new URL(starts[0].url()).searchParams.get('asset'),'GLD');
 starts.length=0;await p.goBack();await ready(p,state(['SPY','weekly','5Y']));assert.equal(starts.length,0);await c.close();results.push({evicted_asset_history:'PASS',cold_history_requests:[1,1],cached_history_requests:0});
}
// MAJOR-01 permanent reproduction. Delay only actual successful response
// delivery; inspect React ownership read-only, never mutate the cache or payload.
function inspectOwner(){
 const root=document.querySelector('.sl-page');if(!root)return null;
 const key=Object.keys(root).find(k=>k.startsWith('__reactFiber$'));if(!key)return null;
 let n=root[key];while(n.return)n=n.return;const stack=[n.stateNode.current];
 while(stack.length){const f=stack.pop();if(!f)continue;
  if(f.memoizedProps?.initial&&f.memoizedProps?.snapshot){
   const current=f.memoizedState.memoizedState;let hook=f.memoizedState,cache;
   while(hook){if(hook.memoizedState?.current instanceof Map)cache=hook.memoizedState.current;hook=hook.next;}
   if(!cache)return null;
   return {selection:current.selection,asset:current.asset.ticker,cache:[...cache.keys()],snapshot:f.memoizedProps.snapshot.id};
  }
  if(f.child)stack.push(f.child);if(f.sibling)stack.push(f.sibling);
 }
 return null;
}
async function chooseTicker(page,ticker){if(!await page.locator('#sl-asset-picker').evaluate(e=>e.open))await page.locator('#sl-asset-picker > summary').click();await page.locator('.sl-picker-group button').filter({hasText:new RegExp('^'+ticker+'$')}).click();}
async function bounded(condition){const deadline=Date.now()+15000;while(!condition()){if(Date.now()>deadline)throw Error('STALE_RESPONSE_SETUP_TIMEOUT');await new Promise(r=>setTimeout(r,20));}}
for(const count of [4,5,12]){
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),pending=new Map(),events=[],errors=[];
 page.on('request',r=>events.push({event:'START',url:r.url(),headers:r.headers()}));page.on('requestfinished',r=>events.push({event:'FINISHED',url:r.url()}));page.on('requestfailed',r=>events.push({event:'FAILED',url:r.url()}));page.on('pageerror',()=>errors.push('EXCEPTION'));
 await page.goto(url('/niveles-estadisticos',state(['SPY','weekly','5Y'])));await ready(page,state(['SPY','weekly','5Y']));
 if(count===4){const start=events.length;await page.locator('[data-window="3Y"]').click();await ready(page,state(['SPY','weekly','3Y']));assert.equal(events.slice(start).filter(x=>x.event==='START').length,0);await page.locator('[data-window="5Y"]').click();await ready(page,state(['SPY','weekly','5Y']));}
 const stale=['GLD','QQQ','TLT','IEF','SLV','DIA','IWM','EEM','EFA','XLF','XLK','XLE'].slice(0,count);
 await page.route('**/api/statistical-levels/asset?*',async route=>{const ticker=new URL(route.request().url()).searchParams.get('asset');if(!stale.includes(ticker))return route.continue();const response=await route.fetch();assert.equal(response.status(),200);pending.set(ticker,()=>route.fulfill({response}));});
 for(const ticker of stale){await chooseTicker(page,ticker);await bounded(()=>pending.has(ticker));}
 await chooseTicker(page,'SPY');await ready(page,state(['SPY','weekly','5Y']));const historyBefore=page.url(),renderBefore=await page.locator('#sl-interpretation').innerText();
 for(const ticker of stale){await pending.get(ticker)();await bounded(()=>events.some(x=>x.event==='FINISHED'&&new URL(x.url).searchParams.get('asset')===ticker));}
 await page.waitForFunction(`(()=>{const s=(${inspectOwner.toString()})();return s&&s.asset==='SPY'&&s.cache.length===4&&!s.cache.includes(s.snapshot+':SPY')&&s.cache.includes(s.snapshot+':${stale.at(-1)}');})()`);
 assert.equal(page.url(),historyBefore);assert.equal(await page.locator('#sl-interpretation').innerText(),renderBefore);assert.deepEqual(errors,[]);assert.equal(events.filter(x=>x.event==='FAILED').length,0);
 const issued=events.filter(x=>x.event==='START'&&new URL(x.url).pathname==='/api/statistical-levels/asset');assert.equal(issued.length,count);
 const before=await page.evaluate(inspectOwner),start=events.length;
 await page.locator('[data-window="3Y"]').click();await ready(page,state(['SPY','weekly','3Y']));
 await options(page);await page.locator('#sl-options label:first-child select').selectOption('daily');await ready(page,state(['SPY','daily','3Y']));
 await page.locator('#sl-options label:nth-child(2) select').selectOption('Full');await ready(page,state(['SPY','daily','Full']));
 await page.goBack();await ready(page,state(['SPY','daily','3Y']));await page.goForward();await ready(page,state(['SPY','daily','Full']));
 assert.deepEqual(events.slice(start).filter(x=>x.event==='START'),[],'same-asset controls/history must not depend on cache residency');
 // At saturation, GLD was evicted as well: the normal T2 cold path remains one GET.
 let coldT2=null;
 if(count===12){await page.unroute('**/api/statistical-levels/asset?*');await page.locator('[data-window="5Y"]').click();await page.locator('#sl-options label:first-child select').selectOption('weekly');await ready(page,state(['SPY','weekly','5Y']));const offset=events.length;await chooseTicker(page,'GLD');await ready(page,state(['GLD','weekly','5Y']));const starts=events.slice(offset).filter(x=>x.event==='START');assert.equal(starts.length,1);assert.equal(new URL(starts[0].url).pathname,'/api/statistical-levels/asset');assert.equal(new URL(starts[0].url).searchParams.get('asset'),'GLD');assert.ok(!starts[0].headers.rsc&&!starts[0].headers['next-router-prefetch']);coldT2=1;}
 results.push({cache_saturation:count,original_major_01:count===4?'PASS':undefined,current_cache_entry_absent:!before.cache.includes(before.snapshot+':SPY'),T1_requests:0,T3_requests:0,T4_requests:0,RSC:0,prefetch:0,same_asset_history_requests:0,stale_finished:count,failed:0,retries:0,aborts:0,cold_T2_requests:coldT2});
 await context.close();
}
// Deliberately reverse two local response completions; every request finishes.
const c=await browser.newContext({serviceWorkers:'block'}),p=await c.newPage();let releaseFirst;const first=new Promise(r=>releaseFirst=r);const finished=[];
p.on('requestfinished',r=>{if(new URL(r.url()).pathname==='/api/statistical-levels/asset')finished.push(new URL(r.url()).searchParams.get('asset'));});
await p.route('**/api/statistical-levels/asset?*',async route=>{const response=await fetch(route.request().url(),{redirect:'error'}),body=await response.text();if(new URL(route.request().url()).searchParams.get('asset')==='GLD')await first;await route.fulfill({status:response.status,contentType:'application/json',body});});
await p.goto(url('/niveles-estadisticos',state(['SPY','weekly','5Y'])));await asset(p,'SPDR Gold Shares');await asset(p,'Invesco QQQ Trust');await ready(p,state(['QQQ','weekly','5Y']));releaseFirst();await p.waitForFunction(()=>document.querySelector('#sl-interpretation')?.textContent.includes('QQQ'));await p.waitForTimeout(100);assert.match(await p.locator('#sl-interpretation').textContent(),/QQQ/);assert.deepEqual(finished.sort(),['GLD','QQQ']);await c.close();results.push({concurrency:'PASS',terminal_requests:2});
await fs.writeFile(out,JSON.stringify({implementation_check:true,results,PASS:true},null,2)+'\n');console.log(JSON.stringify({PASS:true,cases:results.length}));
}finally{await browser.close();}
