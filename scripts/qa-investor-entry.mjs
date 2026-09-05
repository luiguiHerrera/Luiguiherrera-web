// Run against a production server and a disposable Chromium CDP profile.
// node scripts/qa-investor-entry.mjs http://127.0.0.1:3107 9337 /tmp/investor-evidence
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const [base = 'http://127.0.0.1:3107', port = '9337', out = '/tmp/investor-entry-evidence'] = process.argv.slice(2);
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

const auditExpression = `(() => {
  const root = document.documentElement;
  const panels = [...document.querySelectorAll('[id^="investor-panel-"]')];
  const visible = panels.filter(el => !el.hidden);
  const active = [...document.querySelectorAll('[id^="investor-option-"][aria-expanded="true"]')];
  const faq = [...document.querySelectorAll('main details')].map(el=>({question:el.querySelector('summary').textContent,answer:el.querySelector('p').textContent}));
  const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].map(el=>JSON.parse(el.textContent)).flat().find(s=>s['@type']==='FAQPage');
  return {
    overflow: Math.max(0,root.scrollWidth-root.clientWidth),
    protruding: [...document.querySelectorAll('main *')].filter(el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return s.display!=='none' && r.width>0 && (r.left < -1 || r.right > innerWidth+1)}).map(el=>el.tagName+'.'+el.className),
    brokenAssets: [...document.images].filter(img=>!img.complete || !img.naturalWidth).map(img=>img.src),
    h1Count: document.querySelectorAll('h1').length,
    h1: document.querySelector('h1')?.textContent,
    lang: root.lang,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(el=>({lang:el.hreflang,href:el.href})),
    schema,faq,
    bridges: [...document.querySelectorAll("main article a")].map(el=>el.getAttribute("href")),
    selected: active.map(el=>el.id),
    selectedTop: active[0]?.getBoundingClientRect().top,
    selectedBottom: active[0]?.getBoundingClientRect().bottom,
    visiblePanels: visible.map(el=>el.id),
    destination: visible[0]?.querySelector('a')?.getAttribute('href'),
    recommendationHeading: visible[0]?.querySelector('h3')?.textContent,
    focus: document.activeElement?.id,
    footer: document.querySelector('footer')?.innerText,
    displayFont: getComputedStyle(document.querySelector('h1')).fontFamily,
    headerCta: [...document.querySelectorAll('body > header a')].at(-1)?.textContent,
    imageSrc: document.querySelector('main img')?.currentSrc,
  };
})()`;

async function capture(c, filename) {
  await c.evaluate('scrollTo({top:0,behavior:"instant"})');
  const metrics = await c.send('Page.getLayoutMetrics');
  const { data } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: metrics.cssContentSize.width, height: metrics.cssContentSize.height, scale: 1 } });
  await fs.writeFile(path.join(out, filename), Buffer.from(data, 'base64'));
}

const report = { base, generatedAt: new Date().toISOString(), scenarios: [], navigation: [], totals: {} };
const routes = { es: '/inversionista', en: '/en/investor' };
const ids = ['dashboard', 'levels', 'trends', 'research'];
const destinations = { es: ['/dashboard', '/niveles-estadisticos', '/tendencias', '/investigacion'], en: ['/en/dashboard', '/en/statistical-levels', '/en/trends', '/en/research'] };

try {
  for (const locale of ['es', 'en']) {
    for (const [label, width, height] of [['desktop',1440,1000], ['tablet',768,1024], ['tablet-wide',1024,900], ['review-772',772,908], ['mobile',390,844], ['mobile-small',320,740]]) {
      const name = `${locale}-${label}`;
      const c = await createPage();
      const item = { name, width, height, states: [], keyboard: {}, errors: c.errors };
      report.scenarios.push(item);
      await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: width === 320 ? 'reduce' : 'no-preference' }] });
      await c.send('Page.navigate', { url: base + routes[locale] });
      for (let n = 0; n < 100; n++) {
        if (await c.evaluate('document.readyState === "complete" && !!document.querySelector("#investor-option-dashboard")')) break;
        await sleep(100);
      }
      await c.evaluate('document.fonts.ready.then(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))))');
      await sleep(600);
      const initial = await c.evaluate(auditExpression);
      item.initial = initial;
      assert.equal(initial.lang, locale);
      assert.equal(initial.h1Count, 1);
      assert.equal(initial.canonical, 'https://www.luiguiherrera.com' + routes[locale]);
      for (const language of ['es', 'en']) assert.ok(initial.alternates.some(a=>a.lang===language && a.href==='https://www.luiguiherrera.com'+routes[language]));
      assert.ok(initial.alternates.some(a=>a.lang==='x-default' && a.href==='https://www.luiguiherrera.com/inversionista'));
      assert.deepEqual(initial.bridges, locale === 'es' ? ['/recursos','/fragilidad-de-portafolio','/empezar'] : ['/en/resources','/en/portfolio-fragility','/en/start']);
      assert.equal(initial.faq.length,4);
      assert.deepEqual(initial.schema.mainEntity.map(q=>({question:q.name,answer:q.acceptedAnswer.text})),initial.faq);
      if (['desktop', 'mobile', 'tablet', 'review-772'].includes(label)) await capture(c,`${name}.png`);
      await c.click('main header a');
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-dashboard');
      item.heroFocus = true;
      for (const [index,id] of ids.entries()) {
        await c.click(`#investor-option-${id}`);
        const audit = await c.evaluate(auditExpression);
        item.states.push(audit);
        assert.equal(audit.overflow,0,`${name}/${id}: overflow`);
        assert.deepEqual(audit.protruding,[],`${name}/${id}: element overflow`);
        assert.deepEqual(audit.brokenAssets,[]);
        assert.deepEqual(audit.selected,[`investor-option-${id}`]);
        assert.deepEqual(audit.visiblePanels,[`investor-panel-${id}`]);
        assert.equal(audit.destination,destinations[locale][index]);
        if (width < 768) {
          assert.ok(audit.selectedTop >= 65, `${name}/${id}: chosen option above sticky header`);
          assert.ok(audit.selectedBottom <= height, `${name}/${id}: chosen option below viewport`);
        }
        if (['desktop','mobile'].includes(label) && index > 0) await capture(c,`${name}-${id}.png`);
      }
      await c.click('#investor-option-dashboard');
      await c.key('ArrowDown','ArrowDown',40);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-levels');
      await c.key('End','End',35);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-research');
      await c.key('ArrowDown','ArrowDown',40);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-dashboard');
      await c.key('ArrowUp','ArrowUp',38);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-research');
      await c.key('Home','Home',36);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-dashboard');
      await c.key('Tab','Tab',9);
      assert.equal(await c.evaluate('document.activeElement.getAttribute("href")'),destinations[locale][0]);
      await c.key('Tab','Tab',9);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-levels');
      await c.key('Enter','Enter',13);
      assert.equal((await c.evaluate(auditExpression)).destination,destinations[locale][1]);
      await c.key('Tab','Tab',9);
      assert.equal(await c.evaluate('document.activeElement.getAttribute("href")'),destinations[locale][1]);
      await c.key('Tab','Tab',9);
      assert.equal(await c.evaluate('document.activeElement.id'),'investor-option-trends');
      await c.key(' ','Space',32);
      assert.equal((await c.evaluate(auditExpression)).destination,destinations[locale][2]);
      item.keyboard = { arrows:true, wrap:true, homeEnd:true, tabToRecommendation:true, enter:true, space:true };
      await c.click('main details summary');
      assert.equal(await c.evaluate('document.querySelector("main details").open'),true);
      await c.key('Enter','Enter',13);
      assert.equal(await c.evaluate('document.querySelector("main details").open'),false);
      item.faqPointerAndKeyboard = true;
      // Exercise each disclosure, including long text, at every viewport.
      for (let i=0;i<4;i++) {
        await c.click(`main details:nth-child(${i+1}) summary`);
        const audit=await c.evaluate(auditExpression);
        assert.equal(audit.overflow,0);
        assert.deepEqual(audit.protruding,[]);
      }
      if (label==='mobile') await capture(c,`${name}-faq.png`);
      if (width<1024) {
        await c.click('body > header button[aria-expanded]');
        item.mobileMenuOverflow = await c.evaluate('Math.max(0,document.documentElement.scrollWidth-innerWidth)');
        assert.equal(item.mobileMenuOverflow,0);
        await c.key('Escape','Escape',27);
      }
      for (const values of Object.values(c.errors)) assert.equal(values.length,0,`${name}: ${JSON.stringify(c.errors)}`);
      await c.close();
      console.log(`PASS ${name}: 4 recommendations, keyboard, FAQ, SEO, assets, overflow, console`);
    }
  }
  // All page destinations and the unchanged core routes must render successfully.
  for (const route of [...new Set([...Object.values(destinations).flat(), '/recursos', '/en/resources', '/fragilidad-de-portafolio', '/en/portfolio-fragility', '/', '/en', '/empezar', '/en/start', '/presupuesto', '/en/budget', '/deudas', '/en/debt'])]) {
    const response=await fetch(base+route);
    const html=await response.text();
    const result={ route,status:response.status,h1:html.includes('<h1'),redirected:response.redirected };
    report.navigation.push(result);
    assert.equal(result.status,200,route);
    assert.ok(result.h1,route);
    assert.equal(result.redirected,false,route);
  }
  report.totals={ scenarios:report.scenarios.length,recommendationStates:report.scenarios.length*4,overflow:0,hydrationErrors:0,consoleErrors:0,brokenAssets:0,passed:true };
} catch (error) {
  report.failure=error.stack;
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
  console.log(report.failure??JSON.stringify(report.totals));
}
