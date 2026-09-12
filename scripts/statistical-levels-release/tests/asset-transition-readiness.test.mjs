import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assetTransitionReadinessExpression, waitForAssetTransition } from '../scripts/qa/asset-transition-readiness.mjs';

const target = Object.freeze({ asset: 'GLD', pickerTitle: 'SPDR Gold Shares', frequency: 'weekly', window: '5Y' });
const expression = assetTransitionReadinessExpression(target);

// A dependency-free DOM contract fixture. The generated production-facing
// predicate executes unchanged in vm; real Chromium transitions are qualified
// separately. Layout visibility is modeled explicitly, not inferred from text.
class Element {
  constructor(tag, properties = {}, children = []) {
    Object.assign(this, { tag, children: [], parentElement: null, isConnected: true,
      hidden: false, className: '', id: '', title: '', value: '', text: '', attributes: {},
      style: { display: 'block', visibility: 'visible' }, rects: [{ width: 40, height: 20 }] }, properties);
    for (const child of children) this.append(child);
  }
  append(child) { child.parentElement = this; this.children.push(child); return child; }
  get tagName() { return this.tag.toUpperCase(); }
  get childElementCount() { return this.children.length; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  getClientRects() { return this.rects; }
  matches(selector) {
    const attribute = selector.match(/\[([\w-]+)="([^"]*)"\]$/);
    if (attribute && this.attributes[attribute[1]] !== attribute[2]) return false;
    const simple = attribute ? selector.slice(0, attribute.index) : selector;
    if (simple.startsWith('#')) return this.id === simple.slice(1);
    if (simple.startsWith('.')) return this.className.split(/\s+/).includes(simple.slice(1));
    return this.tag === simple;
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    const parts = selector.split(/\s+/), result = [];
    const visit = element => {
      if (element.matches(parts.at(-1))) {
        let ancestor = element.parentElement, index = parts.length - 2;
        while (ancestor && index >= 0) {
          if (ancestor.matches(parts[index])) index--;
          ancestor = ancestor.parentElement;
        }
        if (index < 0) result.push(element);
      }
      for (const child of element.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}
const element = (tag, properties, children) => new Element(tag, properties, children);
function fixture() {
  const document = element('document'), root = document.append(element('div', { className: 'sl-page' }));
  const picker = root.append(element('details', { id: 'sl-asset-picker' }));
  const summary = picker.append(element('summary'));
  const summaryTicker = summary.append(element('strong', { text: 'GLD' }));
  const summaryName = summary.append(element('span', { text: 'SPDR Gold Shares' }));
  const group = picker.append(element('div', { className: 'sl-picker-group' }));
  const selected = group.append(element('button', { title: target.pickerTitle, text: 'GLD', attributes: { 'aria-pressed': 'true' } }));
  group.append(element('button', { title: 'SPDR S&P 500 ETF', text: 'SPY', attributes: { 'aria-pressed': 'false' } }));
  const interpretation = root.append(element('section', { id: 'sl-interpretation' }));
  const context = interpretation.append(element('div', { className: 'sl-context' }));
  const identity = context.append(element('span', { text: 'GLD · SPDR Gold Shares' }));
  const selectionIdentity = context.append(element('span', { text: 'Semanal · 5A · Historial completado hasta 2026-09-04' }));
  const options = root.append(element('details', { id: 'sl-options' }));
  const frequency = options.append(element('label')).append(element('select', { value: 'weekly' }));
  const windowControl = options.append(element('label')).append(element('select', { value: '5Y' }));
  const panel = root.append(element('section', { id: 'sl-unusual' }));
  const regionContext = panel.append(element('div', { className: 'sl-section-heading' })).append(element('p', { text: 'Semanal · 5A' }));
  const list = panel.append(element('dl'));
  const metrics = ['arbitrary-percentile', 'arbitrary-z-score', 'arbitrary-sample'].map(text => list.append(element('div')).append(element('dd', { text })));
  document.documentElement = { lang: 'es' };
  const current = { tag: 3, child: null, sibling: null, return: null };
  current.stateNode = { current };
  const owner = { tag: 0, type: function StatisticalDataOwner() {}, memoizedProps: {
    asset: { ticker: 'GLD', frequencies: { weekly: { windows: { '5Y': {} } } } },
    selection: { asset: 'GLD', frequency: 'weekly', window: '5Y' }, locale: 'es'
  }, return: current, child: null, sibling: null };
  current.child = owner;
  const hosts = new Map();
  function attach(node, parent) {
    const props = { children: node.text, id: node.id }, fiber = { tag: 5, type: node.tag, stateNode: node,
      memoizedProps: props, return: parent, child: null, sibling: null };
    node.__reactFiber$fixture = fiber; node.__reactProps$fixture = props; hosts.set(node, fiber);
    let previous;
    for (const child of node.children) { const next = attach(child, fiber); if (previous) previous.sibling = next; else fiber.child = next; previous = next; }
    return fiber;
  }
  owner.child = attach(root, owner);
  return { current, owner, hosts, document, root, picker, summary, summaryTicker, summaryName, group, selected,
    interpretation, context, identity, selectionIdentity, options, frequency, windowControl,
    panel, regionContext, list, metrics, location: { search: '?asset=GLD&frequency=weekly&window=5Y&review=1' } };
}
function evaluate(state, script = expression) {
  return vm.runInNewContext(script, { document: state.document, location: state.location,
    URLSearchParams, getComputedStyle: node => node.style }, { timeout: 1000 });
}
function coherentIdentity(state, canonical, label, title) {
  state.location.search = `?asset=${canonical}&frequency=weekly&window=5Y&review=1`;
  state.selected.title = title; state.selected.text = label; state.summaryTicker.text = label;
  state.summaryName.text = title; state.identity.text = label + ' · ' + title;
  state.owner.memoizedProps.asset.ticker = canonical; state.owner.memoizedProps.selection.asset = canonical;
}

test('existing GLD URL, controls, identity and single visible region satisfy readiness', () => assert.equal(evaluate(fixture()), true));
test('readiness checks opaque committed host output; arbitrary correct output needs no fixture oracle', () => {
  const state = fixture();
  for (const [i, metric] of state.metrics.entries()) {
    metric.text = 'opaque-output-' + i;
    metric.__reactProps$fixture.children = metric.text;
  }
  assert.equal(evaluate(state), true);
  state.metrics[0].text = 'stale-output';
  assert.equal(evaluate(state), false);
});
test('ES and EN existing selection labels are supported without hardcoded display numbers', () => {
  const state = fixture(); state.owner.memoizedProps.locale = 'en'; state.document.documentElement.lang = 'en'; state.selectionIdentity.text = 'Weekly · 5Y · Completed history through 2026-09-04'; state.regionContext.text = 'Weekly · 5Y';
  assert.equal(evaluate(state), true);
});
test('visible metrics outside the mobile viewport do not require scrolling', () => {
  const state = fixture(); state.panel.rects = [{ top: 1200, bottom: 1500, width: 350, height: 300 }];
  assert.equal(evaluate(state), true);
});
for (const [name, mutate] of [
  ['previous asset query', s => { s.location.search = '?asset=SPY&frequency=weekly&window=5Y'; }],
  ['wrong frequency query', s => { s.location.search = '?asset=GLD&frequency=daily&window=5Y'; }],
  ['wrong window query', s => { s.location.search = '?asset=GLD&frequency=weekly&window=3Y'; }],
  ['missing query identity', s => { s.location.search = ''; }],
  ['conflicting symbol alias takes precedence in the product loader', s => { s.location.search += '&symbol=SPY'; }],
  ['empty symbol alias still conflicts with canonical navigation', s => { s.location.search += '&symbol='; }],
  ['duplicate asset query', s => { s.location.search += '&asset=GLD'; }],
  ['duplicate frequency query', s => { s.location.search += '&frequency=weekly'; }],
  ['duplicate window query', s => { s.location.search += '&window=5Y'; }],
  ['duplicate product root', s => { s.document.append(element('div', { className: 'sl-page' })); }],
  ['duplicate metric panel', s => { s.root.append(element('section', { id: 'sl-unusual' })); }],
  ['hidden stale duplicate metric panel', s => { s.root.append(element('section', { id: 'sl-unusual', hidden: true })); }],
  ['duplicate picker', s => { s.root.append(element('details', { id: 'sl-asset-picker' })); }],
  ['duplicate interpretation', s => { s.root.append(element('section', { id: 'sl-interpretation' })); }],
  ['metric panel outside product root', s => { s.panel.parentElement = s.document; }],
  ['hidden product root', s => { s.root.hidden = true; }],
  ['hidden metric panel', s => { s.panel.hidden = true; }],
  ['display-none metric panel', s => { s.panel.style.display = 'none'; }],
  ['visibility-hidden metric panel', s => { s.panel.style.visibility = 'hidden'; }],
  ['visibility-collapse metric panel', s => { s.panel.style.visibility = 'collapse'; }],
  ['metric panel without rendered rects', s => { s.panel.rects = []; }],
  ['disconnected metric panel', s => { s.panel.isConnected = false; }],
  ['hidden interpretation', s => { s.interpretation.hidden = true; }],
  ['hidden picker summary', s => { s.summary.hidden = true; }],
  ['no selected asset', s => { s.selected.attributes['aria-pressed'] = 'false'; }],
  ['multiple selected assets', s => { s.group.children[1].attributes['aria-pressed'] = 'true'; }],
  ['wrong selected title', s => { s.selected.title = 'SPDR S&P 500 ETF'; }],
  ['empty selected display ticker', s => { s.selected.text = ''; }],
  ['stale summary ticker', s => { s.summaryTicker.text = 'SPY'; }],
  ['stale interpretation ticker', s => { s.identity.text = 'SPY · SPDR S&P 500 ETF'; }],
  ['coherently wrong ticker cannot borrow the GLD title and URL', s => { s.selected.text = 'SPY'; s.summaryTicker.text = 'SPY'; s.identity.text = 'SPY · SPDR S&P 500 ETF'; }],
  ['extra interpretation context', s => { s.context.append(element('span', { text: 'stale context' })); }],
  ['stale frequency control', s => { s.frequency.value = 'daily'; }],
  ['stale window control', s => { s.windowControl.value = '3Y'; }],
  ['extra selection control', s => { s.options.append(element('label')).append(element('select')); }],
  ['mismatched metric region selection label', s => { s.regionContext.text = 'Diario · 3A'; }],
  ['empty metric region context', s => { s.regionContext.text = ''; }],
  ['missing metric value', s => { s.list.children.pop(); }],
  ['extra metric value', s => { s.list.append(element('dd')); }],
  ['hidden metric value', s => { s.metrics[1].hidden = true; }],
  ['disconnected metric value', s => { s.metrics[1].isConnected = false; }],
  ['hidden metric ancestor', s => { s.metrics[1].parentElement.style.display = 'none'; }]
]) test('readiness rejects ' + name, () => { const state = fixture(); mutate(state); assert.equal(evaluate(state), false); });

for (const [asset, label, title] of [['BTCUSD', 'BTC/USDT', 'Bitcoin spot'], ['ETHUSD', 'ETH/USDT', 'Ethereum spot'], ['FXI', 'FXI', 'iShares China Large-Cap ETF']]) {
  test('canonical identity supports existing displayed ticker for ' + asset, () => {
    const state = fixture(); coherentIdentity(state, asset, label, title);
    assert.equal(evaluate(state, assetTransitionReadinessExpression({ ...target, asset, pickerTitle: title })), true);
  });
}
test('an unusual catalog title is serialized as data, not executable code', () => {
  const state = fixture(), title = 'Fund "quote" \\ path; globalThis.injected = true; //';
  coherentIdentity(state, 'GLD', 'GLD', title);
  assert.equal(evaluate(state, assetTransitionReadinessExpression({ ...target, pickerTitle: title })), true);
});
for (const [name, value] of [
  ['null', null], ['undefined', undefined], ['empty object', {}], ['extra numeric oracle', { ...target, expected: ['15.8', '-1.10', '221'] }],
  ['missing title', { asset: 'GLD', frequency: 'weekly', window: '5Y' }], ['lowercase ticker', { ...target, asset: 'gld' }],
  ['display alias instead of canonical ticker', { ...target, asset: 'BTC/USDT' }], ['overlong ticker', { ...target, asset: 'G'.repeat(13) }],
  ['non-string ticker', { ...target, asset: 1 }], ['empty title', { ...target, pickerTitle: '' }],
  ['overlong title', { ...target, pickerTitle: 'x'.repeat(161) }], ['non-string title', { ...target, pickerTitle: 1 }],
  ['unsupported frequency', { ...target, frequency: 'hourly' }], ['unsupported window', { ...target, window: 'All' }]
]) test('target validation rejects ' + name, () => assert.throws(() => assetTransitionReadinessExpression(value), { message: 'ASSET_TRANSITION_TARGET_INVALID' }));

test('wait resolves immediately on strict boolean true and preserves generated expression', async () => {
  const calls = [];
  await waitForAssetTransition({ evaluate: async value => { calls.push(value); return true; } }, target);
  assert.deepEqual(calls, [expression]);
});
test('truthy and false values cannot resolve readiness before a later strict true', async () => {
  const replies = [false, undefined, null, 0, 1, 'true', [], {}, true]; let calls = 0;
  await waitForAssetTransition({ evaluate: async () => replies[calls++] }, target, { timeoutMs: 1000, pollMs: 1 });
  assert.equal(calls, replies.length);
});
test('old fixed boundary can remain stale while a subsequent semantic observation is ready', async () => {
  const state = fixture(); coherentIdentity(state, 'SPY', 'SPY', 'SPDR S&P 500 ETF');
  assert.equal(evaluate(state), false);
  let calls = 0;
  await waitForAssetTransition({ evaluate: async value => {
    calls++; if (calls === 3) coherentIdentity(state, 'GLD', 'GLD', 'SPDR Gold Shares');
    return evaluate(state, value);
  } }, target, { timeoutMs: 1000, pollMs: 1 });
  assert.equal(calls, 3);
});
test('never-ready render fails closed at a bounded timeout', async () => {
  let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: async () => { calls++; return false; } }, target,
    { timeoutMs: 5, pollMs: 1 }), { message: 'ASSET_TRANSITION_READINESS_TIMEOUT' });
  assert.ok(calls >= 1);
});
test('browser evaluation failure propagates unchanged without polling again', async () => {
  const failure = new Error('LOCAL_CDP_FAILURE'); let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: async () => { calls++; throw failure; } }, target), error => error === failure);
  assert.equal(calls, 1);
});
test('an unresolved browser evaluation cannot exceed the hard readiness deadline', async () => {
  let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: () => { calls++; return new Promise(() => {}); } }, target,
    { timeoutMs: 5, pollMs: 1 }), { message: 'ASSET_TRANSITION_READINESS_TIMEOUT' });
  assert.equal(calls, 1);
});
test('true returned after the hard deadline cannot certify readiness', async () => {
  let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: () => { calls++; return new Promise(resolve => setTimeout(() => resolve(true), 20)); } }, target,
    { timeoutMs: 5, pollMs: 1 }), { message: 'ASSET_TRANSITION_READINESS_TIMEOUT' });
  assert.equal(calls, 1);
});
for (const options of [
  { timeoutMs: 0 }, { timeoutMs: -1 }, { timeoutMs: Infinity }, { timeoutMs: NaN }, { timeoutMs: 10001 },
  { pollMs: 0 }, { pollMs: -1 }, { pollMs: Infinity }, { pollMs: NaN }, { timeoutMs: 5, pollMs: 6 }
]) test('invalid wait budget is rejected before browser access: ' + Object.entries(options).map(([key, value]) => key + '=' + String(value)).join(','), async () => {
  let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: async () => { calls++; return true; } }, target, options),
    { message: 'ASSET_TRANSITION_WAIT_INVALID' });
  assert.equal(calls, 0);
});
test('invalid target is rejected before browser access', async () => {
  let calls = 0;
  await assert.rejects(waitForAssetTransition({ evaluate: async () => { calls++; return true; } }, { ...target, asset: 'invalid' }),
    { message: 'ASSET_TRANSITION_TARGET_INVALID' });
  assert.equal(calls, 0);
});

const hash = value => createHash('sha256').update(value).digest('hex');
const waitCall = "await waitForAssetTransition(c,{asset:'GLD',pickerTitle:'SPDR Gold Shares',frequency:'weekly',window:'5Y'});";
test('ready identity with wrong numeric data still fails the unchanged independent metric assertion', async () => {
  const state = fixture(); assert.equal(evaluate(state), true);
  const source = readFileSync(new URL('../scripts/qa/qa-statistical-levels.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function metricCheck('), end = source.indexOf('\n}', start) + 2;
  const metricCheck = vm.runInNewContext('(' + source.slice(start, end) + ')', {
    assert,
    readJson: async () => ({ frequencies: { weekly: { windows: { '5Y': {
      available: true, sessions: 260, ma200ExtensionPercentile: 15.8, ma200ExtensionZScore: -1.1
    } } } } }),
    format: (value, digits = 2) => value === null ? 'n/d' : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  });
  await assert.rejects(metricCheck({ evaluate: async () => ['wrong-percentile', 'wrong-z-score', 'wrong-sample'] }, 'GLD', 'weekly', '5Y'),
    error => error.code === 'ERR_ASSERTION' && error.message.includes('GLD/weekly/5Y'));
});
for (const [name, relative, importSuffix, beforeHash, lineCount, gldLine, metricHash] of [
  ['frozen hosted QA', '../scripts/qa/qa-statistical-levels.mjs', " import { waitForAssetTransition } from './asset-transition-readiness.mjs';", 'b7f586dd1539b523a56b7065f776674094839cb46d85daa5e93652e3ba849794', 161, 135, 'de34435c1dd9c10e5b60db7840c32333194b10ad960fc1f5467dcf92d4f60343'],
  ['standalone QA', '../../qa-statistical-levels.mjs', " import { waitForAssetTransition } from './statistical-levels-release/scripts/qa/asset-transition-readiness.mjs';", '39e073bddfe012fc6f38135a10d4f6467e2582dd87435efb95363838a3846118', 205, 179, 'b4425fd263e11046e5c3e21db3d825b6bc3b155323b05a0767d78c24b88f17ea']
]) {
  test(name + ' differs from ba701 only by appended import and the post-GLD wait', () => {
    const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.equal(source.split(importSuffix).length, 2); assert.equal(source.split(waitCall).length, 2);
    assert.equal(source.split('\n').length, lineCount);
    assert.ok(source.split('\n')[gldLine - 1].includes(waitCall));
    assert.equal(hash(source.replace(importSuffix, '').replace(waitCall, 'await sleep(650);')), beforeHash);
  });
  test(name + ' retains original independent metricCheck bytes and assertion', () => {
    const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
    const start = source.indexOf('async function metricCheck('), end = source.indexOf('\n}', start) + 2;
    assert.ok(start > 0); assert.equal(hash(source.slice(start, end)), metricHash);
  });
}

// These adversarial fixtures keep controls unchanged while altering the actual
// committed owner or live output. The predicate receives only requested identity.
for (const [name, mutate] of [
  ['missing production fiber', s => { delete s.panel.__reactFiber$fixture; }],
  ['ambiguous fiber keys', s => { s.panel.__reactFiber$other = s.panel.__reactFiber$fixture; }],
  ['stale data owner with requested controls', s => { s.owner.memoizedProps.asset.ticker = 'SPY'; }],
  ['coherently stale owner tuple', s => { s.owner.memoizedProps.asset.ticker = 'SPY'; s.owner.memoizedProps.selection.asset = 'SPY'; }],
  ['stale owner frequency', s => { s.owner.memoizedProps.selection.frequency = 'daily'; }],
  ['stale owner window', s => { s.owner.memoizedProps.selection.window = '3Y'; }],
  ['wrong owner locale', s => { s.owner.memoizedProps.locale = 'en'; }],
  ['unsupported document language', s => { s.document.documentElement.lang = 'fr'; }],
  ['absent selected dataset', s => { delete s.owner.memoizedProps.asset.frequencies.weekly.windows['5Y']; }],
  ['panel absent from current tree', s => { s.owner.child = null; }],
  ['cyclic current branch', s => { s.current.sibling = s.current; }],
  ['unknown root tag', s => { s.current.tag = 99; }],
  ['wrong host type', s => { s.hosts.get(s.panel).type = 'aside'; }],
  ['detached host props', s => { s.metrics[0].__reactProps$fixture = { ...s.metrics[0].__reactProps$fixture }; }],
  ['missing host props', s => { delete s.metrics[0].__reactProps$fixture; }],
  ['text-only stale mutation', s => { s.metrics[0].text = 'previous-state'; }],
  ['nested forged metric element', s => { s.metrics[0].append(element('span', { text: '' })); }],
  ['unsupported committed child', s => { s.metrics[0].__reactProps$fixture.children = {}; }],
  ['nonfinite committed child', s => { s.metrics[0].__reactProps$fixture.children = NaN; }],
]) test('render witness rejects ' + name, () => { const state = fixture(); mutate(state); assert.equal(evaluate(state), false); });

test('identical visible outputs have distinguishable actual data owners', () => {
  const state = fixture(); const before = state.metrics.map(m => m.textContent);
  state.owner.memoizedProps.asset.ticker = 'SPY'; state.owner.memoizedProps.selection.asset = 'SPY';
  assert.equal(evaluate(state), false);
  state.owner.memoizedProps.asset.ticker = 'GLD'; state.owner.memoizedProps.selection.asset = 'GLD';
  assert.equal(evaluate(state), true);
  assert.deepEqual(state.metrics.map(m => m.textContent), before);
});
test('an alternate expando is resolved through the current downward tree', () => {
  const state = fixture();
  state.panel.__reactFiber$fixture = { return: { stateNode: state.current.stateNode } };
  assert.equal(evaluate(state), true);
});
test('false return ancestry cannot substitute a requested owner for the current owner', () => {
  const state = fixture(); const fakeOwner = { ...state.owner, memoizedProps: structuredClone(state.owner.memoizedProps) };
  state.owner.memoizedProps.asset.ticker = 'SPY'; state.owner.memoizedProps.selection.asset = 'SPY';
  state.hosts.get(state.panel).return = fakeOwner;
  assert.equal(evaluate(state), false);
});
test('already committed primitive array and number children match opaque DOM text', () => {
  const state = fixture(); state.metrics[1].text = 'prefixopaque'; state.metrics[1].__reactProps$fixture.children = ['prefix','opaque'];
  state.metrics[2].text = '42'; state.metrics[2].__reactProps$fixture.children = 42;
  assert.equal(evaluate(state), true);
});
test('a delayed panel is rejected until its actual committed owner and output complete', async () => {
  const state = fixture(); state.owner.memoizedProps.asset.ticker = 'SPY'; let calls = 0;
  await waitForAssetTransition({ evaluate: async value => { calls++; if (calls === 4) state.owner.memoizedProps.asset.ticker = 'GLD'; return evaluate(state, value); } }, target, { timeoutMs: 1000, pollMs: 1 });
  assert.equal(calls, 4);
});
test('old to intermediate to old cannot certify requested data ownership', () => {
  const state = fixture();
  for (const ticker of ['SPY','VOO','SPY']) { state.owner.memoizedProps.asset.ticker = ticker; state.owner.memoizedProps.selection.asset = ticker; assert.equal(evaluate(state), false); }
});
test('late B commit after C controls is rejected then a real C commit is accepted', () => {
  const state = fixture();
  for (const ticker of ['SPY','VOO']) { state.owner.memoizedProps.asset.ticker = ticker; state.owner.memoizedProps.selection.asset = ticker; assert.equal(evaluate(state), false); }
  state.owner.memoizedProps.asset.ticker = 'GLD'; state.owner.memoizedProps.selection.asset = 'GLD'; assert.equal(evaluate(state), true);
});

test('reordering current metric nodes cannot borrow their individual output witnesses', () => {
  const state = fixture(); const [a,b] = state.metrics; const pa=a.parentElement,pb=b.parentElement;
  pa.children[0]=b;pb.children[0]=a;a.parentElement=pb;b.parentElement=pa;
  assert.equal(evaluate(state), false);
});
test('a renamed panel cannot borrow another committed section identity', () => {
  const state = fixture(); state.hosts.get(state.panel).memoizedProps.id='sl-risk';
  assert.equal(evaluate(state), false);
});
