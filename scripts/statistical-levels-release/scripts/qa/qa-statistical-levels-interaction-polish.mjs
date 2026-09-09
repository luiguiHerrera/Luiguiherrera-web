// Frozen candidate QA adapted for the scoped release harness. No standalone network mode.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const [base, unusedPort, out] = process.argv.slice(2);
assert.ok(globalThis.__SL_RELEASE_QA__, 'SCOPED_HARNESS_REQUIRED');
await fs.mkdir(out, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createPage() { return globalThis.__SL_RELEASE_QA__.createPage(); }

const report = { PASS: false, viewports: [], cases: [], errors: [] };
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const asset = await read('lib/statistical-levels/generated/assets/SPY.json');
const season = await read('lib/statistical-levels/generated/seasonality/SPY.json');
const manifest = await read('lib/statistical-levels/generated/manifest.json');
const month = new Date(manifest.generatedAt+'T00:00:00Z').getUTCMonth()+1;
const dates = locale => new Intl.DateTimeFormat(locale==='en'?'en-US':'es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const percents = locale => new Intl.NumberFormat(locale==='en'?'en-US':'es-ES',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1});
const visible = selector => `!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`;
let c;
async function load(locale, width, height, query='') {
  await c.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:width<600});
  await c.send('Page.navigate',{url:base+(locale==='en'?'/en/statistical-levels':'/niveles-estadisticos')+query});
  for(let i=0;i<150;i++){if(await c.evaluate('document.readyState==="complete" && !!document.querySelector("#sl-interpretation")'))break;await sleep(100);}
  await c.evaluate('document.fonts.ready');await sleep(500);
  assert.ok(await c.evaluate('!!document.querySelector("#sl-interpretation")'));
}
async function open(id) {
  if(!await c.evaluate(`document.querySelector('#${id}').open`))await c.click(`#${id}>summary`);
  await sleep(100);
}
async function select(index,value) {
  await c.evaluate(`(()=>{const el=document.querySelectorAll('.sl-pattern-controls select')[${index}];el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await sleep(100);
}
async function shot(name, selector) {
  if(selector)await c.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-80)`);
  await sleep(120);
  const img=await c.send('Page.captureScreenshot',{format:'png'});
  await fs.writeFile(path.join(out,name),Buffer.from(img.data,'base64'));
}
async function audit(name) {
  const proof=await c.evaluate(`({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),nested:document.querySelectorAll('button button,button a,a button').length})`);
  assert.equal(proof.overflow,0,name);assert.deepEqual(proof.broken,[],name);assert.equal(proof.nested,0,name);
  report.cases.push({name,...proof});
}
async function inspect(index, series, values, locale, touch=false) {
  const box=await c.evaluate(`(()=>{const r=document.querySelector('.sl-drawdown-inspection').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const x=box.x+Math.max(.1,Math.min(box.width-.1,index/(series.length-1)*box.width));
  const y=box.y+box.height/2;
  if(touch){
    await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await sleep(100);
  await checkSelection(index,series,values,locale);
}
async function checkSelection(index, series, values, locale) {
  const actual=await c.evaluate(`(()=>{const s=document.querySelector('.sl-drawdown-inspection'),t=s.querySelector('[role=tooltip]'),b=s.getBoundingClientRect(),r=t?.getBoundingClientRect();return {date:s.dataset.selectedDate,value:Number(s.dataset.selectedDrawdown),dateText:t?.querySelector('span').textContent,valueText:t?.querySelector('strong').textContent,aria:s.getAttribute('aria-valuetext'),inside:!!r&&r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom,markers:s.querySelectorAll('.sl-drawdown-point').length,focusTargets:s.querySelectorAll('[tabindex]').length};})()`);
  assert.equal(actual.date,series[index].date);assert.equal(actual.value,values[index]);
  assert.equal(actual.dateText,dates(locale).format(new Date(series[index].date+'T00:00:00Z')));
  assert.equal(actual.valueText,percents(locale).format(values[index]));
  assert.ok(actual.aria.includes(actual.dateText)&&actual.aria.includes(actual.valueText));
  assert.ok(actual.inside,'tooltip clamped');assert.equal(actual.markers,1);assert.equal(actual.focusTargets,0);
}
function drawdowns(series){let peak=-Infinity;return series.map(p=>{peak=Math.max(peak,p.close);return peak>0?p.close/peak-1:0;});}
try {
  for(const [locale,width,height] of [['es',1440,900],['en',1440,900],['es',390,844],['en',390,844]]) {
    c=await createPage();await load(locale,width,height);
    const name=`${locale}-${width<600?'mobile':'desktop'}`;
    const weekly=season.windows['5Y'].weekly.general.filter(cell=>cell.month===month);
    const actual=await c.evaluate(`[...document.querySelectorAll('.sl-weeks article')].map(e=>({week:Number(e.dataset.week),value:e.querySelector('.sl-week-value').textContent,rate:e.querySelector('.sl-week-rate strong').textContent,n:e.querySelector('small').textContent,limited:e.dataset.limited,dir:e.querySelector('.sl-return-micro').dataset.direction,width:e.querySelector('.sl-win-micro>span').style.width,color:getComputedStyle(e.querySelector('.sl-return-fill')).backgroundColor,opacity:getComputedStyle(e.querySelector('.sl-return-fill')).opacity}))`);
    assert.equal(actual.length,5);
    for(const row of actual){const cell=weekly.find(cell=>cell.weekOfMonth===row.week),n=cell?.sampleSize??0;
      const expectedValue=n&&cell.averageReturn!==null?`${cell.averageReturn>0?'+':''}${(cell.averageReturn*100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}%`:'n/d';
      assert.equal(row.value,expectedValue);assert.equal(row.rate,n&&cell.winRate!==null?`${(cell.winRate*100).toFixed(0)}%`:'n/d');assert.ok(row.n.includes(`N ${n}`));assert.equal(row.limited,String(n<5));
      if(n){assert.equal(row.dir,cell.averageReturn<0?'negative':cell.averageReturn>0?'positive':'zero');assert.ok(Math.abs(parseFloat(row.width)-cell.winRate*100)<.0001);}
      assert.equal(row.color,'rgb(18, 59, 61)');assert.equal(row.opacity,n<5?'0.55':'1');
    }
    assert.ok(actual.some(row=>row.limited==='true'));
    await audit(name+'/weekly-values-and-visuals');await shot(`seasonality-${name}.png`,'#sl-seasonality');
    if(locale==='es')await shot(width<600?'seasonality-mobile.png':'seasonality-desktop.png','#sl-seasonality');
    await open('sl-drawdown-history');
    const help=await c.evaluate("document.querySelector('.sl-drawdown-help').innerText");
    const expectedHelp=width<600
      ? locale==='en'?'Tap the chart to inspect. Tap outside to close.':'Toca el gráfico para inspeccionar. Toca fuera para cerrar.'
      : locale==='en'?'Hover or tap to inspect. Keyboard: ← → move through observations; Home / End jump to the extremes; Esc closes.':'Pasa el cursor o toca para inspeccionar. Teclado: ← → recorren observaciones; Inicio / Fin van a los extremos; Esc cierra.';
    assert.equal(help,expectedHelp);
    if(width<600)assert.doesNotMatch(help,/Keyboard|Teclado|Home|Inicio|Esc/);
    await c.evaluate("document.querySelector('.sl-drawdown-inspection').scrollIntoView({block:'center',behavior:'instant'})");
    const series=asset.frequencies.weekly.drawdownHistory.slice(-asset.frequencies.weekly.windows['5Y'].sessions),values=drawdowns(series);
    const originalPaths=await c.evaluate("[...document.querySelectorAll('.sl-drawdown-inspection path')].map(p=>p.getAttribute('d'))");
    const mid=Math.floor(series.length/2),max=values.indexOf(Math.min(...values));
    await inspect(mid,series,values,locale,width<600);
    await shot(`drawdown-${name}.png`);
    if(locale==='es')await shot(width<600?'drawdown-mobile.png':'drawdown-hover.png');
    await inspect(max,series,values,locale,width<600);
    if(locale==='es'&&width>600)await shot('drawdown-max-hover.png');
    await inspect(0,series,values,locale,width<600);await inspect(series.length-1,series,values,locale,width<600);
    if(width<600){await sleep(300);await checkSelection(series.length-1,series,values,locale);
      await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:10,y:110}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(100);
      assert.equal(await c.evaluate(visible('.sl-drawdown-tooltip')),false,'outside tap dismisses');
    }
    await c.evaluate("document.querySelector('.sl-drawdown-inspection').focus()");
    await c.key('Home','Home',36);await checkSelection(0,series,values,locale);
    await c.key('ArrowRight','ArrowRight',39);await checkSelection(1,series,values,locale);
    await c.key('End','End',35);await checkSelection(series.length-1,series,values,locale);
    await c.key('ArrowLeft','ArrowLeft',37);await checkSelection(series.length-2,series,values,locale);
    await c.key('Escape','Escape',27);assert.equal(await c.evaluate(visible('.sl-drawdown-tooltip')),false);
    assert.deepEqual(await c.evaluate("[...document.querySelectorAll('.sl-drawdown-inspection path')].map(p=>p.getAttribute('d'))"),originalPaths);
    assert.equal(await c.evaluate("document.querySelectorAll('.sl-drawdown-inspection circle').length"),0);
    await audit(name+'/drawdown-pointer-touch-keyboard');
    await open('sl-quant');
    assert.equal(await c.evaluate("document.querySelector('#sl-calendar button[aria-expanded]').getAttribute('aria-expanded')"),'true');
    assert.equal(await c.evaluate("[...document.querySelectorAll('.sl-pattern-controls select')].filter(e=>e.getClientRects().length).length"),4);
    assert.equal(await c.evaluate("document.querySelectorAll('#sl-calendar [data-insight-metrics],#sl-calendar [data-insight-metric-value]').length"),0);
    const initialCells=season.windows['5Y'].weekly.general;
    const initialN=(initialCells.reduce((sum,cell)=>sum+cell.sampleSize,0)/initialCells.length).toFixed(0);
    assert.ok(await c.evaluate(visible('.sl-patterns-sample')));
    assert.ok((await c.evaluate("document.querySelector('.sl-patterns-sample').innerText")).includes(`${locale==='en'?'Average N':'N promedio'}: ${initialN}`));
    await shot(`patterns-expanded-${name}.png`,'#sl-calendar');if(locale==='es'&&width>600)await shot('patterns-expanded.png','#sl-calendar');
    await c.click('#sl-calendar button[aria-expanded]');
    assert.equal(await c.evaluate("[...document.querySelectorAll('.sl-pattern-controls select')].filter(e=>e.getClientRects().length).length"),0);
    let summary=await c.evaluate("document.querySelector('.sl-patterns-summary').innerText");assert.ok(summary.toLowerCase().includes(locale==='en'?'all cycles':'todos los ciclos'));assert.ok(summary.includes(locale==='en'?'completed UTC':'UTC completos'));
    await shot(`patterns-collapsed-${name}.png`,'#sl-calendar');if(locale==='es'&&width>600)await shot('patterns-collapsed.png','#sl-calendar');
    for(const [win,cycle,metric,selectedMonth] of [['All','midterm','medianReturn','3'],['3Y','post_election','sampleSize','11']]){
      await c.click('#sl-calendar button[aria-expanded]');
      for(const [i,value] of [win,cycle,metric,selectedMonth].entries())await select(i,value);
      const currentValues=await c.evaluate("[...document.querySelectorAll('.sl-pattern-controls select')].map(e=>({value:e.value,label:e.selectedOptions[0].textContent}))");
      assert.deepEqual(currentValues.map(v=>v.value),[win,cycle,metric,selectedMonth]);
      const nCells=(season.windows[win]??season.windows.Full).weekly.presidentialCycle[cycle];
      const expectedN=(nCells.reduce((sum,cell)=>sum+cell.sampleSize,0)/nCells.length).toFixed(0);
      assert.ok((await c.evaluate("document.querySelector('.sl-patterns-sample').innerText")).includes(`${locale==='en'?'Average N':'N promedio'}: ${expectedN}`));
      await c.click('#sl-calendar button[aria-expanded]');summary=await c.evaluate("document.querySelector('.sl-patterns-summary').innerText");
      for(const value of currentValues)assert.ok(summary.toLowerCase().includes(value.label.toLowerCase()),`${name}: ${value.label} in ${summary}`);
      assert.ok(summary.includes(`${locale==='en'?'Average N':'N promedio'}: ${expectedN}`));
      assert.equal(await c.evaluate("[...document.querySelectorAll('.sl-pattern-controls select')].filter(e=>e.getClientRects().length).length"),0);
      await shot(`patterns-updated-${win}-${name}.png`,'#sl-calendar');if(win==='All'&&locale==='es'&&width>600)await shot('patterns-updated-summary.png','#sl-calendar');
    }
    await c.click('#sl-calendar button[aria-expanded]');
    assert.ok(await c.evaluate(visible('.sl-pattern-controls select')));
    await audit(name+'/patterns-state-and-current-summary');
    for(const [kind,errors] of Object.entries(c.errors))assert.equal(errors.length,0,`${name}/${kind}: ${JSON.stringify(errors)}`);
    report.viewports.push({locale,width,height,seasonality:'PASS',drawdown:'PASS',patterns:'PASS',patternsDuplication:'ABSENT',averageN:'current and visible',responsiveHelp:'PASS',keyboard:'PASS including mobile viewport',errors:c.errors});
    await c.close();c=null;console.log('PASS',name);
  }
  c=await createPage();await load('en',1440,900,'?frequency=daily&window=Full');await open('sl-drawdown-history');
  const full=asset.frequencies.daily.drawdownHistory,fullValues=drawdowns(full);
  await c.evaluate("document.querySelector('.sl-drawdown-inspection').scrollIntoView({block:'center',behavior:'instant'})");
  await inspect(Math.floor(full.length/2),full,fullValues,'en');
  assert.equal(await c.evaluate("document.querySelectorAll('.sl-drawdown-inspection [tabindex]').length"),0);
  await audit('full-history-thousands-of-real-points');
  await load('en',390,844,'?frequency=monthly&window=1Y');await open('sl-drawdown-history');
  assert.equal(await c.evaluate("document.querySelector('.sl-drawdown-inspection')!==null"),false);
  await audit('unavailable-window-preserved');
  for(const [kind,errors] of Object.entries(c.errors))assert.equal(errors.length,0,kind);
  await c.close();c=null;report.PASS=true;
} catch(error){report.failure='PRODUCT_ASSERTION_FAILED';process.exitCode=1;console.error('PRODUCT_ASSERTION_FAILED');}
finally{if(c){report.errors.push(c.errors);await c.close();}await fs.writeFile(path.join(out,'interaction-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({PASS:report.PASS,viewports:report.viewports.length,failure:report.failure}));}
