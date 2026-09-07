// Run against a production server and a disposable Chromium CDP profile.
// node scripts/qa-investor-entry.mjs http://127.0.0.1:3107 9337 /tmp/investor-evidence
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { commonPricePaths } from '../lib/statistical-levels/defect-repairs.mjs';

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
let c;
try {
  const spy=await readJson('lib/statistical-levels/generated/assets/SPY.json');
  const season=await readJson('lib/statistical-levels/generated/seasonality/SPY.json');
  const manifest=await readJson('lib/statistical-levels/generated/manifest.json');
  const viewports=[['es','desktop-es',1440,900],['en','desktop-en',1440,900],['es','large-desktop',1600,900],['es','tablet',768,1024],['es','mobile-es',390,844],['en','mobile-en',390,844]];
  report.defects=[];
  for(const [locale,name,width,height] of viewports) {
    c=await createPage();await load(c,routes[locale],width,height);
    await open(c,'sl-drawdown-history');
    const scope=await c.evaluate('document.querySelector("#sl-drawdown-history").innerText');
    const selectedHistory=spy.frequencies.weekly.drawdownHistory.slice(-spy.frequencies.weekly.windows['5Y'].sessions);assert.ok(scope.includes(String(selectedHistory.length)));assert.ok(scope.includes(selectedHistory[0].date));assert.ok(scope.includes(selectedHistory.at(-1).date));
    assert.ok(!scope.includes(locale==='en'?'independently':'independientemente'));
    await audit(c,name+'/scope');
    await capture(c,name==='desktop-es'?'defect-001-drawdown.png':`defect-001-${name}.png`,'#sl-drawdown-history');
    await open(c,'sl-quant');
    const paths=await c.evaluate('[...document.querySelectorAll("#sl-asset-statistics figure svg path")].map(p=>p.getAttribute("d"))');
    const expected=commonPricePaths(spy.frequencies.weekly.compactSeries);assert.deepEqual(paths,[expected.ma200,expected.close]);
    await audit(c,name+'/common-scale');
    if(name==='desktop-es')await capture(c,'defect-002-normalization.png','#sl-asset-statistics');
    await open(c,'sl-return-aliases');
    const aliases=await c.evaluate('document.querySelector("#sl-return-aliases").innerText');
    for(const n of [4,12,52,126,252])assert.ok(aliases.includes(`${n} ${locale==='en'?'daily sessions':'sesiones diarias'}`));
    await audit(c,name+'/exact-aliases');
    if(name==='desktop-es')await capture(c,'defect-003-aliases.png','#sl-return-aliases');
    const seasonText=await c.evaluate('document.querySelector("#sl-seasonality").innerText');
    const month=season.windows['5Y'].monthly.general.find(cell=>cell.month===9);
    assert.ok(seasonText.includes(`N ${month.sampleSize}`));assert.ok(seasonText.includes('2026-08-31'));assert.ok(seasonText.includes('2026-08-28'));
    assert.ok(seasonText.includes(locale==='en'?'current week and month are excluded':'se excluyen la semana y el mes en curso'));
    await audit(c,name+'/completed-seasonality');
    if(name==='desktop-es')await capture(c,'defect-005-seasonality.png','#sl-seasonality');
    await open(c,'sl-assets');
    const cells=await c.evaluate('[...document.querySelectorAll("[data-correlation-pair]")].map(el=>({pair:el.dataset.correlationPair,text:el.innerText}))');
    const matrix=manifest.correlation.weekly['5Y'];
    for(const cell of cells){const [a,b]=cell.pair.split('/');assert.ok(cell.text.includes(`N ${matrix.matchedObservations[a][b]}`));assert.ok(cell.text.includes(matrix.values[a][b]===null?'n/d':matrix.values[a][b].toFixed(2)));}
    await audit(c,name+'/matched-correlation');
    await capture(c,name==='desktop-es'?'defect-006-correlation.png':`defect-006-${name}.png`,'#sl-correlation');
    // Capture the actual close-location component with null input on an isolated document.
    const styles=await c.evaluate('[...document.querySelectorAll("link[rel=stylesheet]")].map(el=>el.href)');
    const markup=await fs.readFile(path.join(out,`null-fixture-${locale}.html`),'utf8');
    const html=`<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}</head><body style="background:#f7f4ed;color:#123b3d"><main style="max-width:1296px;margin:auto;padding:24px"><p style="font:600 13px sans-serif;margin-bottom:12px">SL-DEF-004 · ${locale==='en'?'SYNTHETIC REGRESSION FIXTURE · two unavailable locations':'CASO SINTÉTICO DE REGRESIÓN · dos ubicaciones no disponibles'}</p>${markup}</main></body></html>`;
    const frame=(await c.send('Page.getFrameTree')).frameTree.frame.id;await c.send('Page.setDocumentContent',{frameId:frame,html});await sleep(300);await c.evaluate('document.fonts.ready');
    const nullState=await c.evaluate('({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),text:document.body.innerText})');
    assert.equal(nullState.overflow,0);assert.ok(nullState.text.includes('N 0'));assert.ok(nullState.text.includes(locale==='en'?'Unavailable (excluded): 2':'No disponibles (excluidas): 2'));assert.ok(!nullState.text.includes(locale==='en'?'Close in the middle zone':'Cierre en zona media'));
    for(const forbidden of locale==='en'?['Ubicación','Retorno','No disponibles','Mayor frecuencia']:['Close location','Opening location','Highest frequency','Unavailable (excluded)'])assert.ok(!nullState.text.includes(forbidden),name+'/'+forbidden);
    await capture(c,name==='desktop-es'?'defect-004-null-state.png':`defect-004-${name}.png`);
    const correlationFixture=await fs.readFile(path.join(out,`correlation-fixture-${locale}.html`),'utf8');
    const correlationDoc=html.replace(markup,correlationFixture).replaceAll('SL-DEF-004','SL-DEF-006').replace(locale==='en'?'two unavailable locations':'dos ubicaciones no disponibles',locale==='en'?'Shifted dates: 11 matching pairs; minimum 20':'Fechas desplazadas: 11 pares coincidentes; mínimo 20');
    await c.send('Page.setDocumentContent',{frameId:frame,html:correlationDoc});await sleep(200);
    assert.equal(await c.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)'),0);
    const pairText=await c.evaluate(`document.querySelector('[data-correlation-pair="A/B"]')?.innerText`);
    assert.ok(pairText.includes('N 11'));assert.ok(pairText.includes('n/d'));
    await capture(c,`defect-006-insufficient-${name}.png`);
    report.defects.push({name,locale,width,height,drawdown:'same selected window / N 260',normalization:'shared transform, exact paths',aliases:'5 exact counts',seasonality:'completedThrough and actual N verified',correlation:`${cells.length} cells: value and N verified`,nullState:'N 0, unavailable 2, no category or ranking',overflow:0,mixedLanguage:'NONE in repaired states'});
    for(const [kind,errors] of Object.entries(c.errors))assert.equal(errors.length,0,`${name}/${kind}: ${JSON.stringify(errors)}`);
    report.viewports.push({name,width,height,locale,errors:c.errors});await c.close();c=null;console.log('PASS',name,'all six repairs');
  }
  // Unavailable selected window keeps both chart and metric scope honest.
  c=await createPage();await load(c,routes.en+'?frequency=monthly&window=1Y',390,844);await open(c,'sl-drawdown-history');
  const unavailable=await c.evaluate('document.querySelector("#sl-drawdown-history").innerText');assert.ok(unavailable.includes('N 0'));assert.ok(unavailable.includes('Unavailable'));assert.ok(unavailable.includes('1Y'));await audit(c,'unavailable-window');
  for(const width of [1440,390]) {
    await load(c,routes.en+'?frequency=daily&window=Full',width,900);
    const start=Date.now();await open(c,'sl-drawdown-history');
    const n=await c.evaluate('Number(document.querySelector("#sl-drawdown-history [role=slider]").getAttribute("aria-valuemax")) + 1');
    assert.equal(n,spy.frequencies.daily.periods);await audit(c,`full-history-${width}`);
    report.defects.push({name:`full-history-${width}`,points:n,openMs:Date.now()-start,overflow:0});
  }
  report.PASS=true;report.OVERFLOW=0;report.CONSOLE=0;report.HYDRATION=0;report.MIXED_LANGUAGE='NONE';
} catch(error){report.PASS=false;report.failure=error.stack;process.exitCode=1;console.error(error);}
finally {if(c){report.errors.push(c.errors);await c.close();}await fs.writeFile(path.join(out,'defect-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,viewports:report.viewports.length,failure:report.failure}));}
