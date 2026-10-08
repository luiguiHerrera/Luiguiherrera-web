// PROBE_IDENTITY only. Tokens remain in memory; journal entries contain fixed metadata and counters.
import { P, verifiedOrigin } from './release-core.mjs';

export const PROBE_TOKEN_BUDGET_SCHEMA = 'statistical-levels.probe-token-budget.v1';
export const PROBE_TOKEN_BUDGET_ERRORS = Object.freeze({
  OPTIONS: 'PROBE_TOKEN_BUDGET_OPTIONS', EVIDENCE: 'PROBE_TOKEN_BUDGET_EVIDENCE_INVALID',
  PERSISTENCE: 'PROBE_TOKEN_BUDGET_EVIDENCE_WRITE_FAILED', SCOPE: 'PROBE_TOKEN_BUDGET_ORIGIN_MISMATCH',
  PROTECTED: 'PROBE_PROTECTED_BASELINE_REQUIRED', CLOSED: 'PROBE_TOKEN_BUDGET_CLOSED',
  PHASE: 'PROBE_TOKEN_BUDGET_PHASE', FACTORY: 'PROBE_OIDC_TOKEN_REQUEST_FAILED', FORMAT: 'PROBE_OIDC_TOKEN_FORMAT',
  CLOCK: 'PROBE_TOKEN_BUDGET_CLOCK', FRESH_TTL: 'BLOCKED_FRESH_OIDC_TOKEN_TTL_INSUFFICIENT',
  CERT_TTL: 'BLOCKED_CERTIFICATION_OIDC_TOKEN_TTL_INSUFFICIENT',
  QA_BEFORE_CERTIFICATION: 'BLOCKED_QA_BEFORE_TRUST_CERTIFICATION',
  QA_BUDGET: 'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED', CERT_BUDGET: 'BLOCKED_CERTIFICATION_OIDC_TOKEN_BUDGET_EXCEEDED'
});
const E = PROBE_TOKEN_BUDGET_ERRORS;
const FIELDS = ['schema_version', 'operation', 'origin', 'audience', 'phase', 'closed', 'outcome', 'error_code',
  'protected_baseline_confirmed', 'certification_token_accepted', 'qa_refresh_token_accepted', 'certification_recorded',
  'trusted_sources_certified', 'vercel_certification_oidc_token_request_count', 'vercel_certification_oidc_refresh_count',
  'vercel_post_certification_qa_refresh_count', 'vercel_total_oidc_token_request_count', 'max_vercel_oidc_token_requests',
  'post_certification_qa_oidc_refresh_max', 'usable_ttl_seconds', 'qa_refresh_trigger_remaining_seconds',
  'trusted_sources_certified_before_qa_refresh'];
const fail = code => { throw new Error(code); };
const need = (condition, code = E.EVIDENCE) => { if (!condition) fail(code); };
function safeOrigin(value, code = E.EVIDENCE) {
  try { need(typeof value === 'string' && verifiedOrigin(value) === value, code); } catch { fail(code); }
  return value;
}
function safeRecord(value) {
  need(value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && !('toJSON' in value));
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  need(names.length === FIELDS.length && names.every(name => typeof name === 'string' && FIELDS.includes(name)));
  const copy = Object.create(null);
  for (const name of FIELDS) {
    const property = descriptors[name]; need(property?.enumerable && Object.hasOwn(property, 'value'));
    need(property.value === null || ['boolean', 'number', 'string'].includes(typeof property.value));
    copy[name] = property.value;
  }
  return copy;
}
export function validateProbeTokenBudgetEvidence(value, origin) {
  const v = safeRecord(value); safeOrigin(v.origin);
  if (origin !== undefined) need(v.origin === safeOrigin(origin), E.SCOPE);
  need(v.schema_version === PROBE_TOKEN_BUDGET_SCHEMA && v.operation === 'PROBE_IDENTITY' && v.audience === P.vercel_audience);
  need(['CERTIFICATION', 'POST_CERTIFICATION_QA'].includes(v.phase) && ['PENDING', 'CERTIFIED', 'FAIL'].includes(v.outcome));
  for (const key of ['closed', 'protected_baseline_confirmed', 'certification_token_accepted', 'qa_refresh_token_accepted', 'certification_recorded', 'trusted_sources_certified', 'trusted_sources_certified_before_qa_refresh']) need(typeof v[key] === 'boolean');
  for (const key of ['vercel_certification_oidc_token_request_count', 'vercel_post_certification_qa_refresh_count']) need(Number.isInteger(v[key]) && v[key] >= 0 && v[key] <= 1);
  need(v.vercel_certification_oidc_refresh_count === 0 && v.max_vercel_oidc_token_requests === 2 && v.post_certification_qa_oidc_refresh_max === 1);
  need(v.usable_ttl_seconds === 30 && v.qa_refresh_trigger_remaining_seconds === 30);
  need(v.vercel_total_oidc_token_request_count === v.vercel_certification_oidc_token_request_count + v.vercel_post_certification_qa_refresh_count);
  if (v.vercel_total_oidc_token_request_count > 0) need(v.protected_baseline_confirmed);
  if (v.certification_token_accepted) need(v.vercel_certification_oidc_token_request_count === 1);
  if (v.qa_refresh_token_accepted) need(v.vercel_post_certification_qa_refresh_count === 1);
  if (v.trusted_sources_certified) need(v.protected_baseline_confirmed && v.certification_token_accepted);
  if (v.certification_recorded) need(v.trusted_sources_certified && v.phase === 'POST_CERTIFICATION_QA');
  need(v.trusted_sources_certified_before_qa_refresh === v.certification_recorded);
  if (v.phase === 'POST_CERTIFICATION_QA') need(v.certification_recorded && v.trusted_sources_certified);
  if (v.vercel_post_certification_qa_refresh_count > 0) need(v.phase === 'POST_CERTIFICATION_QA' && v.certification_recorded && v.vercel_certification_oidc_token_request_count === 1);
  if (v.outcome === 'CERTIFIED') need(v.trusted_sources_certified && v.error_code === null);
  else if (v.outcome === 'PENDING') need(!v.trusted_sources_certified && !v.certification_recorded && v.phase === 'CERTIFICATION' && v.error_code === null);
  else need(v.closed && Object.values(E).includes(v.error_code));
  if (v.error_code !== null) need(v.outcome === 'FAIL');
  if (v.error_code === E.QA_BUDGET) need(v.vercel_post_certification_qa_refresh_count === 1 && v.certification_recorded);
  if ([E.FRESH_TTL, E.FACTORY, E.FORMAT].includes(v.error_code)) need(v.vercel_total_oidc_token_request_count > 0);
  return v;
}

export function createProbeTokenBudget({ requestOIDCToken, assertProtected, onEvidence, origin, clock = () => Math.floor(Date.now() / 1000) }) {
  safeOrigin(origin, E.OPTIONS);
  need([requestOIDCToken, assertProtected, onEvidence, clock].every(fn => typeof fn === 'function'), E.OPTIONS);
  const state = { schema_version: PROBE_TOKEN_BUDGET_SCHEMA, operation: 'PROBE_IDENTITY', origin, audience: P.vercel_audience,
    phase: 'CERTIFICATION', closed: false, outcome: 'PENDING', error_code: null, protected_baseline_confirmed: false,
    certification_token_accepted: false, qa_refresh_token_accepted: false, certification_recorded: false, trusted_sources_certified: false,
    vercel_certification_oidc_token_request_count: 0, vercel_certification_oidc_refresh_count: 0,
    vercel_post_certification_qa_refresh_count: 0, vercel_total_oidc_token_request_count: 0,
    max_vercel_oidc_token_requests: 2, post_certification_qa_oidc_refresh_max: 1, usable_ttl_seconds: 30,
    qa_refresh_trigger_remaining_seconds: 30, trusted_sources_certified_before_qa_refresh: false };
  let token, expiry, certificationPending, qaPending, markPending;
  const evidence = () => validateProbeTokenBudgetEvidence(state, origin);
  const clear = () => { state.closed = true; token = undefined; expiry = undefined; };
  function terminal(code) { clear(); state.outcome = 'FAIL'; state.error_code = code; }
  function open() { if (state.closed) fail(state.error_code ?? E.CLOSED); }
  async function persist() {
    const safe = evidence();
    try { await onEvidence(safe); } catch { terminal(E.PERSISTENCE); fail(E.PERSISTENCE); }
    open();
  }
  async function stop(code) {
    if (state.closed) fail(state.error_code ?? E.CLOSED);
    terminal(code);
    try { await onEvidence(evidence()); } catch { terminal(E.PERSISTENCE); fail(E.PERSISTENCE); }
    fail(code);
  }
  async function guard(destination) {
    open();
    if (destination !== origin) return stop(E.SCOPE);
    let result;
    try { result = await assertProtected(); } catch { return stop(E.PROTECTED); }
    open(); if (result !== undefined && result !== true) return stop(E.PROTECTED);
    state.protected_baseline_confirmed = true;
  }
  async function now() {
    let value; try { value = clock(); } catch { return stop(E.CLOCK); }
    if (!Number.isInteger(value) || value < 0) return stop(E.CLOCK);
    return value;
  }
  async function readExpiry(value) {
    try {
      if (typeof value !== 'string' || value.length > 20000) throw new Error();
      const parts = value.split('.');
      if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
      const body = Buffer.from(parts[1], 'base64url');
      if (body.toString('base64url') !== parts[1]) throw new Error();
      const claims = JSON.parse(body.toString('utf8'));
      if (!claims || typeof claims !== 'object' || Array.isArray(claims) || !Number.isInteger(claims.exp)) throw new Error();
      return claims.exp;
    } catch { return stop(E.FORMAT); }
  }
  async function acquire(kind, destination) {
    await guard(destination);
    const certification = kind === 'certification';
    if (certification ? state.phase !== 'CERTIFICATION' : !state.certification_recorded || state.phase !== 'POST_CERTIFICATION_QA') return stop(certification ? E.PHASE : E.QA_BEFORE_CERTIFICATION);
    const count = certification ? 'vercel_certification_oidc_token_request_count' : 'vercel_post_certification_qa_refresh_count';
    if (state[count] >= 1) return stop(certification ? E.CERT_BUDGET : E.QA_BUDGET);
    // The protection/certification checkpoint must be durably acknowledged before any factory call.
    await persist(); await guard(destination);
    if (certification ? state.phase !== 'CERTIFICATION' : !state.certification_recorded || state.phase !== 'POST_CERTIFICATION_QA') return stop(E.PHASE);
    if (!certification) { const at = await now(); if (expiry > at + 30) { open(); return token; } }
    state[count]++; state.vercel_total_oidc_token_request_count++;
    let fresh;
    try { fresh = await requestOIDCToken(); } catch { return stop(E.FACTORY); }
    open();
    const freshExpiry = await readExpiry(fresh);
    if (freshExpiry <= await now() + 30) return stop(E.FRESH_TTL);
    token = fresh; expiry = freshExpiry;
    if (certification) state.certification_token_accepted = true; else state.qa_refresh_token_accepted = true;
    await persist(); open();
    // Persistence can consume usable TTL; never return an expired token or retry its acquisition.
    if (expiry <= await now() + 30) return stop(E.FRESH_TTL);
    return token;
  }
  async function certificationGet(destination = origin) {
    open(); if (destination !== origin) return stop(E.SCOPE);
    if (state.phase !== 'CERTIFICATION' || state.trusted_sources_certified || markPending) return stop(E.PHASE);
    if (certificationPending) return certificationPending;
    if (state.certification_token_accepted) {
      await guard(destination);
      if (state.phase !== 'CERTIFICATION' || state.trusted_sources_certified) return stop(E.PHASE);
      if (expiry <= await now() + 30) return stop(E.CERT_TTL);
      open(); return token;
    }
    certificationPending = acquire('certification', destination).finally(() => { certificationPending = undefined; });
    return certificationPending;
  }
  async function qaGet(destination = origin) {
    open(); if (destination !== origin) return stop(E.SCOPE);
    if (markPending) await markPending;
    if (!state.certification_recorded || state.phase !== 'POST_CERTIFICATION_QA') return stop(E.QA_BEFORE_CERTIFICATION);
    await guard(destination);
    if (qaPending) return qaPending;
    const at = await now();
    if (qaPending) return qaPending;
    if (expiry > at + 30) { open(); return token; }
    qaPending ??= acquire('qa', destination).finally(() => { qaPending = undefined; });
    return qaPending;
  }
  async function markCertified() {
    open(); if (markPending) return markPending;
    if (state.certification_recorded && state.phase === 'POST_CERTIFICATION_QA') return evidence();
    if (certificationPending || !state.certification_token_accepted || state.phase !== 'CERTIFICATION') return stop(E.PHASE);
    markPending = (async () => {
      await guard(origin); state.trusted_sources_certified = true; state.outcome = 'CERTIFIED';
      try {
        await persist();
        state.certification_recorded = true; state.trusted_sources_certified_before_qa_refresh = true; state.phase = 'POST_CERTIFICATION_QA';
        await persist(); return evidence();
      } catch {
        state.trusted_sources_certified = false; state.certification_recorded = false;
        state.trusted_sources_certified_before_qa_refresh = false; state.phase = 'CERTIFICATION';
        if (state.outcome !== 'FAIL') terminal(state.error_code ?? E.CLOSED);
        fail(state.error_code ?? E.CLOSED);
      }
    })().finally(() => { markPending = undefined; });
    return markPending;
  }
  return Object.freeze({ certificationTokenSource: Object.freeze({ get: certificationGet, clear }),
    qaTokenSource: Object.freeze({ get: qaGet, clear }), markCertified, evidence, clear });
}
