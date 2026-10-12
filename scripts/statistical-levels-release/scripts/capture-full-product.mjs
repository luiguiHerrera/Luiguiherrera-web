import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { P, PROMOTE, canonical, sha, need } from './release-core.mjs';
import { runReadOnlyQA } from './qa-runner.mjs';
import { verifyInputs } from './preview-qa.mjs';
import { createReadOnlyHarness } from './browser-harness-base.mjs';
import { auditAdoptRequestEvidence, auditOuterJournalOwnership } from './adopt-request-evidence.mjs';
import { validateRuntimeTransitionReceipt } from './runtime-transition-receipts.mjs';


const candidateRoot = fileURLToPath(new URL('../../../', import.meta.url));
function strictJson(bytes) {
  const text = bytes.toString('utf8'), value = JSON.parse(text);
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g) || [];
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '{') stack.push(new Set());
    else if (token === '[') stack.push(null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token.startsWith('"') && tokens[i + 1] === ':') {
      const key = JSON.parse(token), keys = stack.at(-1);
      need(keys && !keys.has(key), 'CAPTURE_AUTHORITY_DUPLICATE_KEY'); keys.add(key);
    }
  }
  return value;
}
export async function resolveCurrentAuthority(codeRoot = candidateRoot) {
  const root = path.resolve(codeRoot);
  need(await fs.realpath(root) === root, 'CAPTURE_AUTHORITY_ROOT_SYMLINK');
  async function read(file) {
    need(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\') &&
      file.split('/').every(x => x && x !== '.' && x !== '..'), 'CAPTURE_AUTHORITY_PATH');
    let full = root; const parts = file.split('/');
    for (let i = 0; i < parts.length; i++) {
      full = path.join(full, parts[i]); const st = await fs.lstat(full);
      need(!st.isSymbolicLink() && (i === parts.length - 1 ? st.isFile() : st.isDirectory()), 'CAPTURE_AUTHORITY_SYMLINK');
    }
    return fs.readFile(full);
  }
  const inputs = strictJson(await read('scripts/statistical-levels-release/source-inputs.json'));
  need(inputs && !Array.isArray(inputs) && Object.keys(inputs).length === 78, 'CAPTURE_AUTHORITY_INPUTS');
  for (const file of Object.keys(inputs)) await read(file);
  const provenanceBytes = await read('lib/statistical-levels/generated-provenance.json');
  const provenance = strictJson(provenanceBytes);
  need(typeof provenance.BASELINE_ID === 'string' && /^\d{8}T\d{9}Z-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(provenance.BASELINE_ID), 'CAPTURE_AUTHORITY_ID_INVALID');
  need(provenance.CONFIG?.BASELINE_ID === provenance.BASELINE_ID, 'CAPTURE_AUTHORITY_CONFLICT');
  for (const file of P.allowlist.filter(x => x.startsWith('lib/statistical-levels/generated/'))) strictJson(await read(file));
  const authority = await verifyInputs(root, inputs, {operation:PROMOTE});
  need(authority.authority_run_id === provenance.BASELINE_ID && /^[a-f0-9]{64}$/.test(authority.sealed_manifest_sha256), 'CAPTURE_AUTHORITY_CONFLICT');
  return {...authority, provenance_sha256:sha(provenanceBytes)};
}
function safeError(error) {
  if (!error) return null;
  const clean = value => String(value ?? '').replace(/(?:Bearer\s+\S+|(?:token|secret|password|credential|authorization)\s*[:=]\s*[^\s,;]+)/gi, '[REDACTED]').slice(0, 16000);
  return {name:clean(error.name || 'Error'), class:clean(error.constructor?.name || 'Error'),
    message:clean(error.message), stack:clean(error.stack), source:clean(error.stack?.split('\n')[1] || '')};
}
export function captureFailureDiagnostic(error, context = null, phase = 'CLI') {
  return {result:'FULL_PRODUCT_CAPTURE_FAILED', phase:error.failurePhase || phase,
    primary_exception:safeError(error.primaryException || error), cleanup_exception:safeError(error.cleanupException),
    subject_sha:context?.subject ?? null, run_id:context?.run_id ?? null, run_attempt:context?.run_attempt ?? null,
    origin:context?.origin ?? null, evidence_directory:context?.out ?? null, exit_code:1};
}

const schema = 'statistical-levels.full-product-capture.v1';
const artifacts = [
  "adopt-request-evidence.json",
  "browser-report.json",
  "correlation-fixture-en.html",
  "correlation-fixture-es.html",
  "defect-001-desktop-en.png",
  "defect-001-drawdown.png",
  "defect-001-large-desktop.png",
  "defect-001-mobile-en.png",
  "defect-001-mobile-es.png",
  "defect-001-tablet.png",
  "defect-002-normalization.png",
  "defect-003-aliases.png",
  "defect-004-desktop-en.png",
  "defect-004-large-desktop.png",
  "defect-004-mobile-en.png",
  "defect-004-mobile-es.png",
  "defect-004-null-state.png",
  "defect-004-tablet.png",
  "defect-005-seasonality.png",
  "defect-006-correlation.png",
  "defect-006-desktop-en.png",
  "defect-006-insufficient-desktop-en.png",
  "defect-006-insufficient-desktop-es.png",
  "defect-006-insufficient-large-desktop.png",
  "defect-006-insufficient-mobile-en.png",
  "defect-006-insufficient-mobile-es.png",
  "defect-006-insufficient-tablet.png",
  "defect-006-large-desktop.png",
  "defect-006-mobile-en.png",
  "defect-006-mobile-es.png",
  "defect-006-tablet.png",
  "defect-browser-report.json",
  "desktop-compare-assets.png",
  "desktop-compare-horizons.png",
  "desktop-daily-3Y.png",
  "desktop-different-asset.png",
  "desktop-guide.png",
  "desktop-monthly-3Y.png",
  "desktop-more-options.png",
  "desktop-primary-en.png",
  "desktop-primary-es.png",
  "desktop-quant-detail.png",
  "desktop-risk-history.png",
  "desktop-seasonality-risk.png",
  "desktop-weekly-3Y.png",
  "drawdown-en-desktop.png",
  "drawdown-en-mobile.png",
  "drawdown-es-desktop.png",
  "drawdown-es-mobile.png",
  "drawdown-hover.png",
  "drawdown-max-hover.png",
  "drawdown-mobile.png",
  "interaction-browser-report.json",
  "large-desktop.png",
  "mobile-advanced.png",
  "mobile-en-daily-advanced.png",
  "mobile-en-monthly-advanced.png",
  "mobile-es-daily-advanced.png",
  "mobile-es-monthly-advanced.png",
  "mobile-primary-en.png",
  "mobile-primary-es.png",
  "native-ingress.jsonl",
  "native-lifecycle-diagnostics.json",
  "network-accounting.json",
  "null-fixture-en.html",
  "null-fixture-es.html",
  "patterns-collapsed-en-desktop.png",
  "patterns-collapsed-en-mobile.png",
  "patterns-collapsed-es-desktop.png",
  "patterns-collapsed-es-mobile.png",
  "patterns-collapsed.png",
  "patterns-expanded-en-desktop.png",
  "patterns-expanded-en-mobile.png",
  "patterns-expanded-es-desktop.png",
  "patterns-expanded-es-mobile.png",
  "patterns-expanded.png",
  "patterns-updated-3Y-en-desktop.png",
  "patterns-updated-3Y-en-mobile.png",
  "patterns-updated-3Y-es-desktop.png",
  "patterns-updated-3Y-es-mobile.png",
  "patterns-updated-All-en-desktop.png",
  "patterns-updated-All-en-mobile.png",
  "patterns-updated-All-es-desktop.png",
  "patterns-updated-All-es-mobile.png",
  "patterns-updated-summary.png",
  "result.json",
  "seasonality-desktop.png",
  "seasonality-en-desktop.png",
  "seasonality-en-mobile.png",
  "seasonality-es-desktop.png",
  "seasonality-es-mobile.png",
  "seasonality-mobile.png",
  "tablet.png"
];
export function fullProductContext(env = process.env) {
  const origin = env.SL_NEXT_LOCAL_ORIGIN;
  let url;
  try { url = new URL(origin); } catch { throw Error('CAPTURE_ORIGIN_INVALID'); }
  need(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname) &&
    url.origin === origin && !url.username && !url.password && Number(url.port) >= 1024, 'CAPTURE_ORIGIN_INVALID');
  need(typeof env.CI_EVIDENCE === 'string' && path.isAbsolute(env.CI_EVIDENCE) &&
    path.resolve(env.CI_EVIDENCE) === env.CI_EVIDENCE, 'CAPTURE_DIRECTORY_INVALID');
  const out = path.join(env.CI_EVIDENCE, 'full-product');
  const local = env.SL_LOCAL_QUALIFICATION_SUBJECT_SHA256;
  const role = local ? 'local' : 'hosted';
  let subject, run_id, run_attempt;
  if (local) {
    need(/^[a-f0-9]{64}$/.test(local) && !['GITHUB_SHA','CI_EVENT_SHA','GITHUB_EVENT_NAME','GITHUB_REF','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'].some(k => env[k]), 'CAPTURE_LOCAL_CONTEXT_INVALID');
    subject = local; run_id = env.SL_FULL_PRODUCT_RUN_ID; run_attempt = env.SL_FULL_PRODUCT_RUN_ATTEMPT;
    need(typeof run_id === 'string' && /^[A-Z0-9_-]{8,96}$/.test(run_id), 'CAPTURE_RUN_INVALID');
  } else {
    subject = env.GITHUB_SHA; run_id = env.GITHUB_RUN_ID; run_attempt = env.GITHUB_RUN_ATTEMPT;
    need(typeof subject === 'string' && /^[a-f0-9]{40}$/.test(subject) && subject === env.CI_EVENT_SHA &&
      env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/vercel-deployment', 'CAPTURE_HOSTED_CONTEXT_INVALID');
    need(typeof run_id === 'string' && /^[1-9][0-9]*$/.test(run_id), 'CAPTURE_RUN_INVALID');
  }
  need(typeof run_attempt === 'string' && /^[1-9][0-9]*$/.test(run_attempt), 'CAPTURE_ATTEMPT_INVALID');
  return { role, subject, run_id, run_attempt, origin, out };
}
async function directory(p) {
  const stat = await fs.lstat(p);
  need(stat.isDirectory() && !stat.isSymbolicLink() && await fs.realpath(p) === p, 'CAPTURE_DIRECTORY_INVALID');
}
async function json(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function hashes(out) {
  const names = await fs.readdir(out);
  const expected = [...artifacts, 'product-report.json'].sort();
  need(JSON.stringify(names.filter(n => n !== 'capture-binding.json').sort()) === JSON.stringify(expected), 'CAPTURE_INVENTORY_INVALID');
  const result = {};
  for (const name of expected) {
    const file = path.join(out, name), stat = await fs.lstat(file);
    need(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0, 'CAPTURE_ARTIFACT_INVALID');
    result[name] = sha(await fs.readFile(file));
  }
  return result;
}
async function validateProduct(out, context) {
  const evidence = await json(path.join(out, 'adopt-request-evidence.json'));
  const raw = await json(path.join(out, 'network-accounting.json'));
  need(Array.isArray(raw.authFailures) && raw.authFailures.length === 0, 'CAPTURE_ACCOUNTING_INVALID');
  const accounting = { ...raw }; delete accounting.authFailures;
  need(evidence.validation?.status === 'PASS' && evidence.validation.issues?.length === 0 &&
    evidence.capture_issues?.length === 0, 'CAPTURE_EVIDENCE_INVALID');
  need(auditOuterJournalOwnership(evidence).status === 'PASS' &&
    auditAdoptRequestEvidence(evidence, [], accounting, context.origin).status === 'PASS', 'CAPTURE_AUDIT_INVALID');
  need(JSON.stringify(evidence.transitions.map(t => t.kind)) === JSON.stringify(['T1','T2','T3','T4']), 'CAPTURE_TRANSITIONS_INVALID');
  for (const t of evidence.transitions) {
    const p = t.runtime_proof;
    need(p && validateRuntimeTransitionReceipt(p.receipt, p.source, p.census).status === 'PASS', 'CAPTURE_RUNTIME_PROOF_INVALID');
    need(p.receipt.requests.length === (t.kind === 'T2' ? 1 : 0), 'CAPTURE_RUNTIME_NETWORK_INVALID');
  }
  if (context.role === 'hosted') {
    need(evidence.execution_source_sha === context.subject && evidence.hosted_run_id === context.run_id &&
      evidence.hosted_run_attempt === context.run_attempt, 'CAPTURE_NATIVE_CONTEXT_INVALID');
  } else {
    need(evidence.execution_source_sha === 'UNKNOWN' && evidence.hosted_run_id === 'UNKNOWN' &&
      evidence.hosted_run_attempt === 'UNKNOWN', 'CAPTURE_LOCAL_HOSTED_CONFLICT');
  }
  for (const report of ['browser-report.json','defect-browser-report.json','interaction-browser-report.json']) {
    need((await json(path.join(out, report))).PASS === true, 'CAPTURE_PRODUCT_FAILED');
  }
  const lifecycle = await json(path.join(out, 'native-lifecycle-diagnostics.json'));
  need(Number.isFinite(lifecycle.browser_closed_timestamp) && lifecycle.pages.length > 0 &&
    lifecycle.pages.every(p => Number.isFinite(p.source_close_timestamp)), 'CAPTURE_LIFECYCLE_INCOMPLETE');
  const ingress = (await fs.readFile(path.join(out, 'native-ingress.jsonl'), 'utf8')).trim().split('\n');
  need(ingress.length > 0 && ingress.every(line => JSON.parse(line)), 'CAPTURE_INGRESS_INCOMPLETE');
  need((await json(path.join(out, 'product-report.json'))).result === 'PASS', 'CAPTURE_PRODUCT_FAILED');
  need((await json(path.join(out, 'result.json'))).productPassed === true, 'CAPTURE_INCOMPLETE');
  return { evidence, accounting, origin: context.origin };
}
export async function readFullProductEvidence(env = process.env) {
  const context = fullProductContext(env);
  await directory(env.CI_EVIDENCE); await directory(context.out);
  const binding = await json(path.join(context.out, 'capture-binding.json'));
  need(binding.schema === schema && binding.complete === true &&
    /^[a-f0-9-]{36}$/.test(binding.capture_id) &&
    canonical(binding.context).equals(canonical(context)), 'CAPTURE_CONTEXT_MISMATCH');
  need(canonical(binding.authority).equals(canonical(await resolveCurrentAuthority())), 'CAPTURE_AUTHORITY_BINDING_MISMATCH');
  need(binding.entrypoint_sha256 === sha(await fs.readFile(fileURLToPath(import.meta.url))) &&
    Number.isFinite(binding.started_at) && Number.isFinite(binding.completed_at) && binding.completed_at >= binding.started_at,
    'CAPTURE_COMPLETION_INVALID');
  need(canonical(binding.artifacts).equals(canonical(await hashes(context.out))), 'CAPTURE_ARTIFACT_HASH_MISMATCH');
  return validateProduct(context.out, context);
}
function safeEnvironment(env) {
  need(!Object.entries(env).some(([k,v]) => v && /^(?:DEBUG|PWDEBUG|GITHUB_TOKEN|GH_TOKEN|AWS_.*|VERCEL_.*|SL_.*(?:SECRET|TOKEN|CREDENTIAL).*)$/.test(k)), 'CAPTURE_UNSAFE_ENVIRONMENT');
}
export async function captureFullProduct({ origin, out }, env = process.env) {
  let context, owned = false, phase = 'CONTEXT_VALIDATION';
  try {
  safeEnvironment(env);
  context = fullProductContext(env);
  need(origin === context.origin && out === context.out, 'CAPTURE_ARGUMENT_BINDING');
  await directory(env.CI_EVIDENCE);
  await fs.mkdir(out, { mode: 0o700 }); // Exclusive: never delete/reuse a previous capture.
  owned = true;
  phase = 'AUTHORITY_VALIDATION';
  const authority = await resolveCurrentAuthority();
  const started_at = Date.now(), capture_id = randomUUID();
  const codeRoot = fileURLToPath(new URL('../../../', import.meta.url));
  phase = 'BROWSER_MODULE_IMPORT';
  const { chromium } = await import('../qa-dependencies/node_modules/playwright/index.mjs');
  const originalLaunch = chromium.launch;
  let forbiddenNetwork = false;
  chromium.launch = async function (...args) {
    const browser = await originalLaunch.apply(this, args);
    const originalContext = browser.newContext.bind(browser);
    browser.newContext = async (...options) => {
      const context = await originalContext(...options);
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || !['GET','HEAD'].includes(route.request().method())) {
          forbiddenNetwork = true; await route.abort('blockedbyclient'); return;
        }
        await route.continue();
      });
      return context;
    };
    return browser;
  };
  try {
    phase = 'RUN_READ_ONLY_QA';
    await runReadOnlyQA({ target: { origin, authority_run_id: authority.authority_run_id }, tokenSource: undefined, out, codeRoot }, async (target, token, destination) => {
      const harness = await createReadOnlyHarness(target, token, destination, true);
      harness.protectedGet = async url => {
        need(new URL(url).origin === origin, 'CAPTURE_ORIGIN_INVALID');
        const response = await fetch(url, { method: 'GET', redirect: 'error', credentials: 'omit' });
        need(response.status === 200, 'CAPTURE_HTTP_FAILED'); return response;
      };
      return harness;
    });
    phase = 'ARTIFACT_CLOSURE';
    need(!forbiddenNetwork && !process.exitCode, 'CAPTURE_FORBIDDEN_NETWORK');
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify({local_qualification:context.role === 'local',productPassed:true,accounting_error:null})+'\n', {flag:'wx'});
    await validateProduct(out, context);
    const binding = {schema, capture_id, context, authority, started_at, completed_at:Date.now(), complete:true,
      entrypoint_sha256:sha(await fs.readFile(fileURLToPath(import.meta.url))), artifacts:await hashes(out)};
    await fs.writeFile(path.join(out, 'capture-binding.json'), canonical(binding), {flag:'wx',mode:0o600});
    await readFullProductEvidence(env);
    return { result:'PASS', artifact_count:Object.keys(binding.artifacts).length, context };
  } finally { chromium.launch = originalLaunch; }
  } catch (error) {
    const diagnostic = captureFailureDiagnostic(error, context, phase);
    if (owned) {
      try { await fs.writeFile(path.join(context.out, 'capture-failure.json'), JSON.stringify(diagnostic, null, 2)+'\n', {flag:'wx',mode:0o600}); }
      catch (retentionError) { diagnostic.retention_exception = safeError(retentionError); }
    }
    error.captureDiagnostic = diagnostic; throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { origin:{type:'string'}, out:{type:'string'}, verify:{type:'boolean'} }, strict:true });
    const result = values.verify ? await readFullProductEvidence() : await captureFullProduct(values);
    console.log(JSON.stringify({result:'PASS', verified:!!values.verify, ...(values.verify ? {} : result)}));
  } catch (error) { console.error('FULL_PRODUCT_CAPTURE_FAILED'); console.error(JSON.stringify(error.captureDiagnostic || captureFailureDiagnostic(error))); process.exitCode = 1; }
}
