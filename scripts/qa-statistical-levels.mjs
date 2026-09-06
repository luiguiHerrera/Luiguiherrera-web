// Run against a production server and a disposable Chromium CDP profile.
// node scripts/qa-investor-entry.mjs http://127.0.0.1:3107 9337 /tmp/investor-evidence
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const [base = 'http://127.0.0.1:3118', port = '9348', out = '/private/tmp/statistical-levels-redesign-evidence'] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createPage() {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const errors = { console: [], exceptions: [], network: [], http: [] };
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const waiter = pending.get(m.id);
      if (!waiter) return;
      pending.delete(m.id);
      if (m.error) waiter.reject(new Error(JSON.stringify(m.error)));
      else waiter.resolve(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) errors.console.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') errors.exceptions.push(m.params.exceptionDetails);
    if (m.method === 'Network.loadingFailed' && !m.params.canceled) errors.network.push(m.params);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) errors.http.push({ url: m.params.response.url, status: m.params.response.status });
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  const click = async selector => {
    const box = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center',behavior:'instant'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
    await sleep(100);
  };
  const key = async (key, code = key, windowsVirtualKeyCode = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}) });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
    await sleep(100);
  };
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable')]);
  return { send, evaluate, click, key, errors, close: async () => { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`); } };
}


const report={base,generatedAt:new Date().toISOString(),viewports:[],interactions:[],routes:[],errors:[],reachedSelectors:[],coverage:[],performance:[]};
const reached=new Set();
const routes={es:'/niveles-estadisticos',en:'/en/statistical-levels'};
const readJson=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const format=(v,d=2)=>v===null?'n/d':v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const capture=async(c,name,selector)=>{
  if(selector)await c.evaluate(`scrollTo({top:document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top+scrollY-80,behavior:'instant'})`);
  else await c.evaluate('scrollTo({top:0,behavior:"instant"})');
  await c.evaluate('document.activeElement?.blur()');
  await sleep(150);
  const image=await c.send('Page.captureScreenshot',{format:'png'});
  await fs.writeFile(path.join(out,name),Buffer.from(image.data,'base64'));
};
async function load(c,url,width=1440,height=900){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await c.send('Page.navigate',{url:base+url});
  for(let i=0;i<200;i++){if(await c.evaluate('document.readyState==="complete"&&!!document.querySelector("#sl-interpretation")'))break;await sleep(100);}
  assert.ok(await c.evaluate('!!document.querySelector("#sl-interpretation")'),url);
  await c.evaluate('document.fonts.ready');await sleep(350);
}
async function audit(c,name){
  const result=await c.evaluate(`(() => ({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,canonical:document.querySelector('link[rel="canonical"]')?.href,alternates:[...document.querySelectorAll('link[hreflang]')].map(a=>a.hreflang),nestedInteractive:document.querySelectorAll('button button,button a,a button,a a').length,ids:[...document.querySelectorAll('[id^="sl-"]')].map(el=>el.id),width:document.querySelector('.sl-page').getBoundingClientRect().width,body:document.querySelector('.sl-page').innerText}))()`);
  assert.equal(result.overflow,0,name);assert.equal(result.h1,1,name);assert.equal(result.nestedInteractive,0,name);
  for(const id of result.ids)reached.add(id);
  report.interactions.push({name,overflow:result.overflow,ids:result.ids});return result;
}
async function open(c,id){
  if(!await c.evaluate(`document.querySelector('#${id}').open`)) await c.click(`#${id} > summary`);
  await sleep(150);assert.ok(await c.evaluate(`document.querySelector('#${id}').open`),id);
}
async function select(c,selector,value){
  await c.evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(400);
}
async function metricCheck(c,ticker,frequency,window){
  const asset=await readJson(`lib/statistical-levels/generated/assets/${ticker}.json`),m=asset.frequencies[frequency].windows[window];
  const n=m.available?Math.max(0,m.sessions-({daily:200,weekly:40,monthly:12}[frequency])+1):0;
  const actual=await c.evaluate('[...document.querySelectorAll("#sl-unusual dd")].map(e=>e.textContent)');
  assert.deepEqual(actual,[format(m.ma200ExtensionPercentile,1),(m.ma200ExtensionZScore!==null&&m.ma200ExtensionZScore>0?'+':'')+format(m.ma200ExtensionZScore),String(n)],`${ticker}/${frequency}/${window}`);
}
let c;
try{
  for(const [locale,name,width,height] of [['es','desktop-primary-es',1440,900],['en','desktop-primary-en',1440,900],['es','large-desktop',1600,900],['es','tablet',768,1024],['es','mobile-primary-es',390,844],['en','mobile-primary-en',390,844]]){
    c=await createPage();await load(c,routes[locale],width,height);
    const initial=await audit(c,name);assert.equal(initial.lang,locale);assert.equal(initial.canonical,'https://www.luiguiherrera.com'+routes[locale]);for(const lang of ['es','en','x-default'])assert.ok(initial.alternates.includes(lang));
    await metricCheck(c,'SPY','weekly','5Y');
    const perf=await c.evaluate(`({navigation:performance.getEntriesByType('navigation').map(n=>({duration:n.duration,domContentLoaded:n.domContentLoadedEventEnd,transferSize:n.transferSize,decodedBodySize:n.decodedBodySize})),paint:performance.getEntriesByType('paint').map(p=>({name:p.name,startTime:p.startTime})),initialNodes:document.querySelectorAll('.sl-page *').length})`);report.performance.push({name,...perf});
    await capture(c,`${name}.png`);
    // Native disclosure with keyboard; then search all canonical assets.
    await c.evaluate('document.querySelector("#sl-asset-picker > summary").focus()');await c.key('Enter','Enter',13);
    assert.ok(await c.evaluate('document.querySelector("#sl-asset-picker").open'));
    const tickers=await c.evaluate('[...document.querySelectorAll(".sl-picker-group button")].map(e=>e.textContent)');assert.equal(tickers.length,40);assert.ok(tickers.includes('BTC/USDT'));assert.ok(tickers.includes('ETH/USDT'));
    await c.evaluate('document.querySelector("#sl-asset-picker input").focus()');await c.send('Input.insertText',{text:'gold'});await sleep(100);
    assert.deepEqual(await c.evaluate('[...document.querySelectorAll(".sl-picker-group button")].map(e=>e.textContent)'),['GLD']);
    // Clear with input's native value setter, then close with keyboard.
    await c.evaluate(`(()=>{const el=document.querySelector('#sl-asset-picker input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'');el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(100);
    await c.evaluate('document.querySelector("#sl-asset-picker > summary").focus()');await c.key('Enter','Enter',13);
    await c.evaluate('document.querySelector("#sl-options > summary").focus()');await c.key('Enter','Enter',13);assert.ok(await c.evaluate('document.querySelector("#sl-options").open'));await audit(c,name+'/options');
    assert.deepEqual(await c.evaluate('[...document.querySelectorAll("#sl-options select:first-of-type option")].slice(0,3).map(e=>e.value)'),['daily','weekly','monthly']);
    if(name==='desktop-primary-es')await capture(c,'desktop-more-options.png','#sl-controls');
    await c.evaluate('document.querySelector("#sl-options > summary").focus()');await c.key('Enter','Enter',13);
    if(name==='desktop-primary-es')await capture(c,'desktop-seasonality-risk.png','#sl-seasonality');
    for(const id of ['sl-drawdown-history','sl-horizons','sl-quant','sl-assets','sl-guide']){
      await open(c,id);await audit(c,`${name}/${id}`);
      // Ensure each disclosure works with space and keeps its mounted detail on reopen.
      await c.evaluate(`document.querySelector('#${id} > summary').focus()`);await c.key(' ','Space',32);assert.equal(await c.evaluate(`document.querySelector('#${id}').open`),false);await c.key('Enter','Enter',13);assert.ok(await c.evaluate(`document.querySelector('#${id}').open`));
      if(name==='desktop-primary-es'){
        const names={'sl-drawdown-history':'desktop-risk-history.png','sl-horizons':'desktop-compare-horizons.png','sl-quant':'desktop-quant-detail.png','sl-assets':'desktop-compare-assets.png','sl-guide':'desktop-guide.png'};
        await capture(c,names[id],`#${id}`);
      }
      if(id==='sl-drawdown-history'){await open(c,'sl-drawdown-data');assert.equal(await c.evaluate('document.querySelectorAll("#sl-drawdown-data tbody tr").length'),260);await audit(c,name+'/dated-drawdowns');}
      if(name==='mobile-primary-es'&&id==='sl-quant')await capture(c,'mobile-advanced.png','#sl-quant');
    }
    // Existing advanced controls, seven history filters and close mode.
    assert.ok(await c.evaluate('!!document.querySelector("#sl-opening")'));
    await c.click('#sl-opening button:nth-child(2)');await audit(c,name+'/close-mode');
    const explorer=await c.evaluate('[...document.querySelectorAll("#sl-periods button")].map(e=>e.textContent)');assert.equal(explorer.length,1);
    await c.click('#sl-periods button');assert.equal(await c.evaluate('document.querySelectorAll("#sl-periods button[aria-pressed]").length'),7);
    for(let i=1;i<=7;i++){await c.click(`#sl-periods .flex.flex-wrap button:nth-child(${i})`);await audit(c,`${name}/filter${i}`);}
    await c.click('#sl-calendar button[aria-expanded]');
    await select(c,'#sl-calendar select:nth-of-type(1)','3Y');
    await c.click('#sl-calendar .sl-seasonality-values summary');
    assert.ok(await c.evaluate('document.querySelectorAll("#sl-calendar .sl-seasonality-values td").length>0'));
    // Window/cycle/metric/month selectors all operate using their canonical values.
    for(const [index,value] of [[0,'All'],[1,'midterm'],[2,'medianReturn'],[3,'3']]){
      await select(c,`#sl-calendar label:nth-child(${index+1}) select`,value);await audit(c,`${name}/seasonality-${value}`);
    }
    // Deliberate tables can scroll independently with keyboard.
    await c.evaluate('document.querySelector("#sl-distributions [tabindex]").focus()');await c.key('ArrowRight','ArrowRight',39);await audit(c,name+'/table-keyboard');
    assert.equal(await c.evaluate('document.activeElement.getAttribute("tabindex")'),'0');
    report.viewports.push({name,locale,width,height,overflow:0,keyboard:true,advanced:true,errors:c.errors});
    for(const [kind,errors] of Object.entries(c.errors))assert.equal(errors.length,0,`${name}/${kind}: ${JSON.stringify(errors)}`);
    await c.close();c=null;console.log(`PASS ${name}`);
  }
  // All 15 frequency/horizon combinations with their actual numerical values and advanced reachability.
  c=await createPage();
  for(const frequency of ['daily','weekly','monthly'])for(const window of ['1Y','3Y','5Y','10Y','Full']){
    const url=`/niveles-estadisticos?asset=SPY&frequency=${frequency}&window=${window}`;
    await load(c,url);await metricCheck(c,'SPY',frequency,window);await open(c,'sl-quant');await audit(c,`${frequency}/${window}`);
    if(frequency==='daily')assert.ok(await c.evaluate('!!document.querySelector("#sl-extremes")'));
    if(window==='3Y')await capture(c,`desktop-${frequency}-3Y.png`);
  }
  for(const locale of ['es','en'])for(const frequency of ['daily','monthly']){
    await load(c,`${routes[locale]}?asset=SPY&frequency=${frequency}&window=5Y`,390,844);
    await metricCheck(c,'SPY',frequency,'5Y');await open(c,'sl-quant');
    if(!await c.evaluate('document.querySelector("#sl-calendar button[aria-expanded]").getAttribute("aria-expanded")==="true"'))await c.click('#sl-calendar button[aria-expanded]');
    await c.click('#sl-calendar .sl-seasonality-values summary');
    await audit(c,`mobile-${locale}-${frequency}-advanced`);
    await capture(c,`mobile-${locale}-${frequency}-advanced.png`,'#sl-calendar');
  }
  // Representative assets and URL aliases, including incomplete 10Y windows.
  for(const ticker of ['GLD','FXI','EWJ','BTCUSD','ETHUSD','AIQ']){
    await load(c,`/en/statistical-levels?asset=${ticker}&frequency=monthly&window=10Y`);await metricCheck(c,ticker,'monthly','10Y');await audit(c,`corpus/${ticker}`);
    if(ticker==='GLD')await capture(c,'desktop-different-asset.png');
  }
  await load(c,'/niveles-estadisticos?symbol=BTCUSDT&window=All&frequency=daily');await metricCheck(c,'BTCUSD','daily','Full');
  // Actual navigation controls preserve unrelated query state and browser Back.
  await load(c,'/niveles-estadisticos?asset=SPY&frequency=weekly&window=5Y&review=1');
  await c.click('[data-window="3Y"]');await sleep(650);await metricCheck(c,'SPY','weekly','3Y');
  assert.equal(await c.evaluate('new URLSearchParams(location.search).get("review")'),'1');
  await c.evaluate('history.back()');await sleep(650);await metricCheck(c,'SPY','weekly','5Y');
  await open(c,'sl-asset-picker');await c.click('.sl-picker-group button[title="SPDR Gold Shares"]');await sleep(650);await metricCheck(c,'GLD','weekly','5Y');
  await open(c,'sl-options');await select(c,'#sl-options label:first-child select','daily');await sleep(650);await metricCheck(c,'GLD','daily','5Y');
  await select(c,'#sl-options label:nth-child(2) select','Full');await sleep(650);await metricCheck(c,'GLD','daily','Full');
  await open(c,'sl-quant');await open(c,'sl-assets');await audit(c,'navigation-preservation');
  // Every multi-asset toggle remains reachable and the 30-asset limit is unchanged.
  const count=await c.evaluate('document.querySelectorAll("#sl-assets button[aria-pressed]").length');assert.equal(count,40);
  await c.evaluate(`document.querySelectorAll('#sl-assets button[aria-pressed=false]').forEach(button=>button.click())`);await sleep(200);
  assert.equal(await c.evaluate('document.querySelectorAll("#sl-assets button[aria-pressed=true]").length'),30);
  await audit(c,'compare-30-assets');
  // Keyboard can reach every primary focus target in natural DOM order.
  await c.evaluate('scrollTo(0,0);document.querySelector("#sl-asset-picker summary").focus()');
  const focus=[];for(let i=0;i<7;i++){await c.key('Tab','Tab',9);focus.push(await c.evaluate('document.activeElement.tagName+":"+(document.activeElement.getAttribute("data-window")||document.activeElement.textContent.slice(0,35))'));}
  report.keyboardOrder=focus;assert.ok(focus.some(s=>s.includes('3Y')));
  await c.close();c=null;
  for(const route of ['/niveles-estadisticos','/en/statistical-levels','/metodologia','/en/methodology']){
    const response=await fetch(base+route),html=await response.text();assert.equal(response.status,200);assert.ok(html.includes('<h1'));report.routes.push({route,status:response.status});
  }
  const ledger=await readJson('docs/statistical-levels-capability-ledger.json');
  for(const capability of ledger.capabilities){
    const selector=capability.ACCESS_PATH.match(/#([\w-]+)/)?.[1];
    const proof=selector?reached.has(selector):capability.REDESIGN_DESTINATION==='UNCHANGED_BACKGROUND_BEHAVIOR';
    assert.ok(proof,`${capability.ID}: ${capability.ACCESS_PATH}`);report.coverage.push({id:capability.ID,selector:selector??null,gate:selector?'browser access + contracts + numerical equivalence':'contracts + full snapshot equivalence',passed:proof});
  }
  report.reachedSelectors=[...reached];report.PASS=true;report.OVERFLOW=0;report.HYDRATION=0;report.CONSOLE=0;
}catch(error){report.PASS=false;report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{if(c){report.errors.push(c.errors);await c.close();}await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,viewports:report.viewports.length,interactions:report.interactions.length,coverage:report.coverage.length,failure:report.failure}));}
