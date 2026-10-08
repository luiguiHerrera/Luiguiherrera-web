import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { P } from '../scripts/release-core.mjs';
import { runProbeBrowserAuthority, validateProbeBrowserAuthorityEvidence, requireProbeBrowserAuthority } from '../scripts/probe-browser-authority.mjs';

const target = { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40),
  deployment_id: 'dpl_BrowserAuthorityFixture123', origin: 'https://luiguiherrera-browserfixture-luigui-herrera-s-projects.vercel.app',
  authority_run_id: P.baseline.authority_run_id, sealed_manifest_sha256: P.baseline.sealed_manifest_sha256 };
const clone = value => JSON.parse(JSON.stringify(value));

// This unit adapter exercises the actual browser expression with a bounded DOM model.
// Separate offline Chromium evidence executes it against the real hydrated fixture.
function harnessFor(options = {}) {
  const counts = { pages: 0, clicks: 0, closes: 0, navigations: [] };
  return { counts, createPage: async () => {
    counts.pages++;
    let mounted = false, evaluations = 0;
    const location = new URL(target.origin);
    const field = { childNodes: [{ nodeType: 3 }], firstChild: { nodeType: 3 }, textContent: options.text ?? target.authority_run_id };
    const details = { querySelectorAll: selector => { assert.equal(selector, ':scope > p.break-all'); return options.fieldCount === 1 ? [field] : [field, {}]; } };
    field.parentElement = details;
    if (options.nodeType) { field.childNodes = [{ nodeType: options.nodeType }]; field.firstChild = field.childNodes[0]; }
    if (options.extraNode) field.childNodes.push({ nodeType: 8 });
    if (options.nested) field.parentElement = {};
    const authority = { tagName: options.tagName ?? 'DIV', classList: { contains: name => name === 'sl-provenance' },
      querySelectorAll: selector => { assert.equal(selector, ':scope > details'); return options.detailsCount === 2 ? [details, details] : [details]; } };
    const guide = { tagName: 'DETAILS', open: false, contains: item => !options.outsideGuide && item === authority,
      querySelectorAll: selector => { assert.equal(selector, ':scope > summary'); return options.noSummary ? [] : [{}]; } };
    const document = { readyState: 'complete', querySelectorAll: selector => {
      if (selector === '#sl-guide') return options.duplicateGuide ? [guide, guide] : [guide];
      if (selector === '#sl-authority') return mounted ? options.duplicateAuthority ? [authority, authority] : [authority] : [];
      assert.fail('unexpected selector');
    } };
    return {
      send: async (method, params) => {
        if (method === 'Page.navigate') { location.href = params.url; if (options.wrongPath) location.pathname = '/wrong'; if (options.wrongOrigin) location.hostname = 'other.example'; counts.navigations.push(params.url); }
      },
      evaluate: async expression => {
        if (options.evaluationError) throw new Error('sensitive upstream text');
        evaluations++;
        return vm.runInNewContext(expression, { document, location: options.transientBlank && evaluations === 1 ? new URL('about:blank') : location, Node: { TEXT_NODE: 3 } });
      },
      click: async selector => { assert.equal(selector, '#sl-guide > summary'); counts.clicks++; guide.open = true; mounted = true; },
      close: async () => { counts.closes++; }
    };
  } };
}
async function run(options = {}) {
  const harness = harnessFor(options), journal = [];
  let result, error;
  try { result = await runProbeBrowserAuthority({ target, harness, onEvidence: async value => { journal.push(clone(value)); if (options.persistenceFailure) throw new Error('sensitive persistence text'); } }); }
  catch (caught) { error = caught.message; }
  return { result, error, journal, counts: harness.counts };
}

test('browser authority exact structured text requires real summary action on both exact routes', async () => {
  const result = await run(); assert.equal(result.error, undefined); assert.equal(result.result.result, 'PASS');
  assert.deepEqual(result.counts, { pages: 2, clicks: 2, closes: 2, navigations: [target.origin + '/niveles-estadisticos', target.origin + '/en/statistical-levels'] });
  assert.equal(result.journal[0].result, 'NOT_RUN'); assert.equal(result.journal[0].routes[0].sl_authority_dom_present, false);
  assert.equal(result.journal[1].routes[0].result, 'PASS'); assert.equal(result.journal[1].routes[1].result, 'NOT_RUN');
  assert.equal(requireProbeBrowserAuthority(result.journal.at(-1), target).result, 'PASS');
});
for (const [name, options, error] of [
  ['wrong authority', { text: '20260908T125656658Z-00000000-0000-0000-0000-000000000000' }, 'BROWSER_AUTHORITY_MISMATCH'],
  ['longer authority containing expected id', { text: target.authority_run_id + '-longer' }, 'BROWSER_AUTHORITY_MISMATCH'],
  ['prefixed authority containing expected id', { text: 'prefix-' + target.authority_run_id }, 'BROWSER_AUTHORITY_MISMATCH'],
  ['authority whitespace is not exact', { text: ' ' + target.authority_run_id }, 'BROWSER_AUTHORITY_MISMATCH'],
  ['authority comment is not a text field', { nodeType: 8 }, 'BROWSER_AUTHORITY_FIELD'],
  ['authority script or nested element is not a text field', { nodeType: 1 }, 'BROWSER_AUTHORITY_FIELD'],
  ['mixed comment and authority text is not source structure', { extraNode: true }, 'BROWSER_AUTHORITY_FIELD'],
  ['non-direct authority field', { nested: true }, 'BROWSER_AUTHORITY_FIELD'],
  ['incomplete structured authority fields', { fieldCount: 1 }, 'BROWSER_AUTHORITY_FIELD'],
  ['duplicate authority details', { detailsCount: 2 }, 'BROWSER_AUTHORITY_FIELD'],
  ['duplicate guide', { duplicateGuide: true }, 'BROWSER_AUTHORITY_GUIDE'],
  ['missing real summary', { noSummary: true }, 'BROWSER_AUTHORITY_GUIDE'],
  ['wrong route with matching authority', { wrongPath: true }, 'BROWSER_AUTHORITY_NAVIGATION'],
  ['wrong origin with matching authority', { wrongOrigin: true }, 'BROWSER_AUTHORITY_NAVIGATION'],
  ['raw evaluation exception', { evaluationError: true }, 'BROWSER_AUTHORITY_EVALUATION']
]) test(name + ' fails closed and persists only sanitized diagnosis', async () => {
  const result = await run(options); assert.equal(result.error, error);
  const evidence = result.journal.at(-1); assert.equal(evidence.result, 'FAIL'); assert.equal(evidence.error_code, error);
  assert.equal(evidence.routes[1].result, 'NOT_RUN'); assert.equal(result.counts.pages, 1); assert.equal(result.counts.closes, 1);
  assert.throws(() => requireProbeBrowserAuthority(evidence, target), /BROWSER_AUTHORITY_NOT_PASS/);
  assert.ok(!JSON.stringify(evidence).includes('sensitive'));
  if (options.text && options.text !== target.authority_run_id) assert.ok(!JSON.stringify(evidence).includes(options.text));
});
test('browser authority evidence persistence failure prevents any browser work', async () => {
  const result = await run({ persistenceFailure: true }); assert.equal(result.error, 'BROWSER_AUTHORITY_PERSISTENCE');
  assert.equal(result.counts.pages, 0); assert.equal(result.journal.at(-1).result, 'FAIL');
});
test('browser authority sidecar canonical JSON roundtrip preserves exact target binding', async () => {
  const { result } = await run();
  const ordered = Object.fromEntries(Object.entries(clone(result)).sort(([a], [b]) => a.localeCompare(b)));
  assert.equal(validateProbeBrowserAuthorityEvidence(ordered, target).result, 'PASS');
  for (const key of ['origin', 'candidate_git_sha', 'deployment_id', 'authority_run_id', 'sealed_manifest_sha256']) {
    const forged = clone(result); forged.fixture[key] += 'x'; assert.throws(() => validateProbeBrowserAuthorityEvidence(forged, target));
  }
});
test('browser authority validator rejects every missing positive route condition', async () => {
  const { result } = await run();
  for (const key of ['route_identity_exact_match', 'guide_open', 'sl_authority_dom_present', 'authority_field_structured', 'browser_authority_run_id_exact_match']) {
    const forged = clone(result); forged.routes[0][key] = false; assert.throws(() => validateProbeBrowserAuthorityEvidence(forged, target), /BROWSER_AUTHORITY_EVIDENCE_INVALID/);
  }
  for (const mutate of [value => { value.routes.pop(); }, value => { value.routes.reverse(); }, value => { value.routes[0].open_guide_action = 'NOT_ATTEMPTED'; }, value => { value.routes[0].path = '/'; }, value => { value.routes[1].result = 'NOT_RUN'; }]) {
    const forged = clone(result); mutate(forged); assert.throws(() => requireProbeBrowserAuthority(forged, target));
  }
});
test('browser authority evidence rejects raw extra fields, accessors and toJSON without executing them', async () => {
  const { result } = await run(); let calls = 0;
  const extra = clone(result); extra.routes[0].observed_text = 'must-not-persist'; assert.throws(() => validateProbeBrowserAuthorityEvidence(extra, target));
  for (const property of [
    { get: () => { calls++; return result.result; }, enumerable: true },
    { value: () => { calls++; return result; }, enumerable: false }
  ]) {
    const forged = clone(result); Object.defineProperty(forged, property.get ? 'result' : 'toJSON', property);
    assert.throws(() => validateProbeBrowserAuthorityEvidence(forged, target));
  }
  assert.equal(calls, 0);
});
test('probe product runner removes weak authority substring and retains full product suites and accounting', async () => {
  const script = await fs.readFile(new URL('../scripts/probe-product-qa.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('await runProbeBrowserAuthority(')); assert.ok(!script.includes('html.includes(target.authority_run_id)'));
  for (const scriptName of ['qa-statistical-levels.mjs', 'qa-statistical-levels-defects.mjs', 'qa-statistical-levels-interaction-polish.mjs']) assert.ok(script.includes(scriptName));
  assert.ok(script.indexOf('await runProbeBrowserAuthority(') < script.indexOf('for (const [script, report]'));
  assert.ok(script.includes('accounting = await harness.finish(productPassed); tokenSource?.clear();'));
  const probe = await fs.readFile(new URL('../scripts/probe-qa.mjs', import.meta.url), 'utf8');
  assert.ok(probe.includes("from './probe-product-qa.mjs'")); assert.ok(!probe.includes("from './qa-runner.mjs'"));
});

test('transient about blank after CDP navigation waits for the exact route', async () => {
  const result = await run({ transientBlank: true }); assert.equal(result.error, undefined); assert.equal(result.result.result, 'PASS');
});
