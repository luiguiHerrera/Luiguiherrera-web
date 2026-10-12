// Probe-only, hydrated application authority. No observed page text enters evidence.
import { validateProbeTarget } from './probe-core.mjs';

export const PROBE_BROWSER_AUTHORITY_SCHEMA = 'statistical-levels.probe-browser-authority.v1';
export const PROBE_BROWSER_AUTHORITY_PATHS = Object.freeze(['/niveles-estadisticos', '/en/statistical-levels']);
const FIXTURE_KEYS = ['origin', 'candidate_git_sha', 'deployment_id', 'authority_run_id', 'sealed_manifest_sha256'];
const ROUTE_KEYS = ['path', 'open_guide_action', 'route_identity_exact_match', 'guide_open', 'sl_authority_dom_present', 'authority_field_structured', 'browser_authority_run_id_exact_match', 'result', 'error_code'];
const ERRORS = ['BROWSER_AUTHORITY_NAVIGATION', 'BROWSER_AUTHORITY_GUIDE', 'BROWSER_AUTHORITY_DOM', 'BROWSER_AUTHORITY_FIELD', 'BROWSER_AUTHORITY_MISMATCH', 'BROWSER_AUTHORITY_EVALUATION', 'BROWSER_AUTHORITY_PERSISTENCE'];
const booleans = ['route_identity_exact_match', 'guide_open', 'sl_authority_dom_present', 'authority_field_structured', 'browser_authority_run_id_exact_match'];
const fail = code => { throw new Error(code); };
const invariant = (value, code = 'BROWSER_AUTHORITY_EVIDENCE_INVALID') => { if (!value) fail(code); };
function copy(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') { invariant(Number.isFinite(value)); return value; }
  invariant(value && typeof value === 'object');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  invariant((array ? prototype === Array.prototype : prototype === null || prototype === Object.prototype) && !('toJSON' in value));
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  invariant(names.every(name => typeof name === 'string'));
  const result = array ? [] : Object.create(null);
  for (const name of names) {
    if (array && name === 'length') continue;
    const property = descriptors[name];
    invariant(property.enumerable && Object.hasOwn(property, 'value'));
    if (array) invariant(/^(?:0|[1-9][0-9]*)$/.test(name));
    result[name] = copy(property.value);
  }
  if (array) invariant(result.length === value.length && names.length === value.length + 1);
  return result;
}
function keys(value, expected) {
  invariant(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key)));
}
function fixtureFor(target) {
  const safe = copy(target);
  try { validateProbeTarget(safe); } catch { fail('BROWSER_AUTHORITY_TARGET'); }
  return Object.fromEntries(FIXTURE_KEYS.map(key => [key, safe[key]]));
}
function routePassed(route) {
  return route.open_guide_action === 'CLICKED' && booleans.every(key => route[key]);
}
export function validateProbeBrowserAuthorityEvidence(value, target) {
  value = copy(value);
  keys(value, ['schema_version', 'fixture', 'result', 'error_code', 'routes']);
  invariant(value.schema_version === PROBE_BROWSER_AUTHORITY_SCHEMA);
  keys(value.fixture, FIXTURE_KEYS);
  const fixture = fixtureFor({ operation: 'PROBE_IDENTITY', phase: 'preview', ...value.fixture });
  invariant(FIXTURE_KEYS.every(key => fixture[key] === value.fixture[key]));
  if (target) { const expected = fixtureFor(target); invariant(FIXTURE_KEYS.every(key => expected[key] === fixture[key])); }
  invariant(['NOT_RUN', 'FAIL', 'PASS'].includes(value.result));
  invariant(value.error_code === null || ERRORS.includes(value.error_code));
  invariant(Array.isArray(value.routes) && value.routes.length === PROBE_BROWSER_AUTHORITY_PATHS.length);
  let unfinished = false;
  for (const [index, route] of value.routes.entries()) {
    keys(route, ROUTE_KEYS);
    invariant(route.path === PROBE_BROWSER_AUTHORITY_PATHS[index]);
    invariant(['NOT_ATTEMPTED', 'CLICKED'].includes(route.open_guide_action));
    invariant(booleans.every(key => typeof route[key] === 'boolean'));
    invariant(['NOT_RUN', 'FAIL', 'PASS'].includes(route.result));
    invariant(route.error_code === null || ERRORS.includes(route.error_code));
    if (unfinished) invariant(route.result === 'NOT_RUN' && route.open_guide_action === 'NOT_ATTEMPTED' && booleans.every(key => !route[key]));
    if (route.result !== 'PASS') unfinished = true;
    invariant(!route.guide_open || route.open_guide_action === 'CLICKED');
    invariant(!route.sl_authority_dom_present || route.guide_open);
    invariant(!route.authority_field_structured || route.sl_authority_dom_present);
    invariant(!route.browser_authority_run_id_exact_match || route.authority_field_structured);
    if (route.result === 'PASS') invariant(routePassed(route) && route.error_code === null);
    else if (route.result === 'FAIL') invariant(ERRORS.includes(route.error_code));
    else invariant(route.error_code === null);
  }
  if (value.result === 'PASS') invariant(value.error_code === null && value.routes.every(route => route.result === 'PASS'));
  else if (value.result === 'FAIL') invariant(ERRORS.includes(value.error_code) && (value.error_code === 'BROWSER_AUTHORITY_PERSISTENCE' || value.routes.some(route => route.result === 'FAIL' && route.error_code === value.error_code)));
  else invariant(value.error_code === null && value.routes.every(route => route.result !== 'FAIL') && !value.routes.every(route => route.result === 'PASS'));
  return value;
}
export function requireProbeBrowserAuthority(value, target) {
  const safe = validateProbeBrowserAuthorityEvidence(value, target);
  invariant(safe.result === 'PASS', 'BROWSER_AUTHORITY_NOT_PASS');
  return safe;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// Only known booleans leave the page. In particular, mismatched DOM text and URLs do not.
function inspectExpression(fixture, route, inspectAuthority) {
  return `(() => {
    const routeMatch = location.origin === ${JSON.stringify(fixture.origin)} && location.pathname === ${JSON.stringify(route)} && location.search === '' && location.hash === '';
    const guides = document.querySelectorAll('#sl-guide'), guide = guides.length === 1 ? guides[0] : null;
    const summary = guide?.querySelectorAll(':scope > summary');
    const guideValid = !!guide && guide.tagName === 'DETAILS' && summary.length === 1;
    const authorities = document.querySelectorAll('#sl-authority');
    const authority = authorities.length === 1 ? authorities[0] : null;
    const present = !!authority && authority.tagName === 'DIV' && authority.classList.contains('sl-provenance') && guideValid && guide.contains(authority);
    const details = present ? authority.querySelectorAll(':scope > details') : [];
    const fields = details.length === 1 ? details[0].querySelectorAll(':scope > p.break-all') : [];
    const field = fields[0];
    const structured = fields.length === 2 && field.parentElement === details[0] && field.childNodes.length === 1 && field.firstChild.nodeType === Node.TEXT_NODE;
    return {ready:document.readyState === 'complete', initial_blank:location.href === 'about:blank', route_match:routeMatch, guide_valid:guideValid, guide_open:guideValid && guide.open,
      present:${inspectAuthority} && !!present, structured:${inspectAuthority} && !!structured,
      exact:${inspectAuthority} && !!structured && field.textContent === ${JSON.stringify(fixture.authority_run_id)}};
  })()`;
}

export async function runProbeBrowserAuthority({ target, harness, onEvidence }) {
  const fixture = fixtureFor(target);
  invariant(harness && typeof harness.createPage === 'function' && typeof onEvidence === 'function', 'BROWSER_AUTHORITY_TARGET');
  const evidence = { schema_version: PROBE_BROWSER_AUTHORITY_SCHEMA, fixture, result: 'NOT_RUN', error_code: null,
    routes: PROBE_BROWSER_AUTHORITY_PATHS.map(route => ({ path: route, open_guide_action: 'NOT_ATTEMPTED',
      route_identity_exact_match: false, guide_open: false, sl_authority_dom_present: false,
      authority_field_structured: false, browser_authority_run_id_exact_match: false, result: 'NOT_RUN', error_code: null })) };
  const persist = async () => {
    const safe = validateProbeBrowserAuthorityEvidence(evidence, target);
    try { await onEvidence(safe); } catch { fail('BROWSER_AUTHORITY_PERSISTENCE'); }
  };
  let active, page;
  try {
    await persist();
    for (const route of evidence.routes) {
      active = route; page = await harness.createPage();
      await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await page.send('Page.navigate', { url: fixture.origin + route.path });
      let state;
      for (let attempt = 0; attempt < 200; attempt++) {
        state = await page.evaluate(inspectExpression(fixture, route.path, false));
        if (state.ready && !state.initial_blank) break;
        await sleep(100);
      }
      invariant(state?.ready && state.route_match, 'BROWSER_AUTHORITY_NAVIGATION');
      route.route_identity_exact_match = true;
      invariant(state.guide_valid && !state.guide_open, 'BROWSER_AUTHORITY_GUIDE');
      // The existing harness issues real CDP mouse events to the native summary.
      await page.click('#sl-guide > summary'); route.open_guide_action = 'CLICKED';
      for (let attempt = 0; attempt < 100; attempt++) {
        state = await page.evaluate(inspectExpression(fixture, route.path, true));
        if (!state.route_match || (state.guide_open && state.present)) break;
        await sleep(25);
      }
      route.route_identity_exact_match = state.route_match === true;
      route.guide_open = state.guide_open === true;
      route.sl_authority_dom_present = route.guide_open && state.present === true;
      route.authority_field_structured = route.sl_authority_dom_present && state.structured === true;
      route.browser_authority_run_id_exact_match = route.authority_field_structured && state.exact === true;
      invariant(route.route_identity_exact_match, 'BROWSER_AUTHORITY_NAVIGATION');
      invariant(route.guide_open, 'BROWSER_AUTHORITY_GUIDE');
      invariant(route.sl_authority_dom_present, 'BROWSER_AUTHORITY_DOM');
      invariant(route.authority_field_structured, 'BROWSER_AUTHORITY_FIELD');
      invariant(route.browser_authority_run_id_exact_match, 'BROWSER_AUTHORITY_MISMATCH');
      route.result = 'PASS';
      // The second route completes the independent browser authority certificate.
      if (evidence.routes.every(item => item.result === 'PASS')) evidence.result = 'PASS';
      await persist(); await page.close(); page = null;
    }
    return requireProbeBrowserAuthority(evidence, target);
  } catch (error) {
    const code = ERRORS.includes(error?.message) ? error.message : 'BROWSER_AUTHORITY_EVALUATION';
    evidence.result = 'FAIL'; evidence.error_code = code;
    if (active) { active.result = 'FAIL'; active.error_code = code; }
    try { await persist(); } catch { fail('BROWSER_AUTHORITY_PERSISTENCE'); }
    fail(code);
  } finally {
    if (page) { try { await page.close(); } catch { /* The owning product runner still finishes all browser accounting. */ } }
  }
}
