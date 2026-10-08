// Probe-only phase boundaries. Shared release credential lifecycle remains unchanged.
import { need, canonical } from './release-core.mjs';
import { createProbeHttpSession, validateProbeHttpEvidence, PROBE_HTTP_PATHS } from './probe-http.mjs';
import { createProbeTokenBudget, validateProbeTokenBudgetEvidence } from './probe-token-budget.mjs';
import { createProbeQACache } from './probe-qa-http.mjs';

export function requireProbeCertificationHTTP(value, target) {
  const proof = validateProbeHttpEvidence(value, target);
  need(proof.anonymous_protection_baseline === 'PROTECTED' && proof.anonymous_baseline_complete === true &&
    proof.result === 'PASS' && proof.trusted_sources_access === 'PASS' && proof.trusted_sources_live_certified === true &&
    proof.routes.length === 1 && proof.routes[0].path === PROBE_HTTP_PATHS[0] && proof.routes[0].result === 'PASS',
  'PROBE_CERTIFICATION_HTTP_REQUIRED');
  return JSON.parse(canonical(proof));
}

export function requireProtectedProbeHTTP(value, target) {
  const proof = validateProbeHttpEvidence(value, target);
  need(proof.anonymous_protection_baseline === 'PROTECTED' && proof.anonymous_baseline_complete === true &&
    proof.result === 'PASS' && proof.trusted_sources_access === 'PASS' && proof.trusted_sources_live_certified === true &&
    proof.routes.length === 2 && proof.routes.every((route, index) => route.path === PROBE_HTTP_PATHS[index] && route.result === 'PASS'),
  'PROBE_PROTECTED_BASELINE_REQUIRED');
  return proof;
}

export function requireProbeQATokenBudget(value, origin) {
  const proof = validateProbeTokenBudgetEvidence(value, origin);
  need(proof.phase === 'POST_CERTIFICATION_QA' && proof.certification_recorded === true &&
    proof.trusted_sources_certified === true && proof.certification_token_accepted === true &&
    proof.vercel_certification_oidc_token_request_count === 1 && proof.outcome === 'CERTIFIED' &&
    proof.error_code === null && proof.trusted_sources_certified_before_qa_refresh === true &&
    (proof.vercel_post_certification_qa_refresh_count === 0 || proof.qa_refresh_token_accepted === true),
  'PROBE_TOKEN_BUDGET_REQUIRED');
  return proof;
}

export async function runProtectedProbeQA({ target, requestOIDCToken, onEvidence, runQA, transport,
  onTokenEvidence = async () => {}, onCertificationEvidence = async () => {} }) {
  need(typeof requestOIDCToken === 'function' && typeof onEvidence === 'function' && typeof runQA === 'function' &&
    typeof onTokenEvidence === 'function' && typeof onCertificationEvidence === 'function', 'PROBE_GATE_CALLBACKS');
  let session, certified = false, closed = false;
  const assertProtected = () => need(!closed && session.evidence().anonymous_protection_baseline === 'PROTECTED' &&
    session.evidence().anonymous_baseline_complete === true, 'PROBE_PROTECTED_BASELINE_REQUIRED');
  const budget = createProbeTokenBudget({ requestOIDCToken, assertProtected, origin: target.origin, onEvidence: onTokenEvidence });
  const tokenSource = {
    get: () => (certified ? budget.qaTokenSource : budget.certificationTokenSource).get(target.origin),
    clear: () => { closed = true; budget.clear(); }
  };
  session = createProbeHttpSession({ target, tokenSource, onEvidence, ...(transport ? { transport } : {}) });
  try {
    await onTokenEvidence(budget.evidence());
    await session.establishAnonymousBaseline();
    const responses = new Map();
    const first = target.origin + PROBE_HTTP_PATHS[0];
    responses.set(first, await session.get(first));
    // Persist the completed causal experiment before granting the separate QA renewal budget.
    await onCertificationEvidence(requireProbeCertificationHTTP(session.evidence(), target));
    await budget.markCertified();
    certified = true;
    for (const route of PROBE_HTTP_PATHS.slice(1)) responses.set(target.origin + route, await session.get(target.origin + route));
    requireProtectedProbeHTTP(session.evidence(), target);
    const protectedGet = await createProbeQACache({ origin: target.origin, certifiedResponses: responses,
      tokenSource: budget.qaTokenSource, assertCertified: () => {
        assertProtected(); need(certified, 'BLOCKED_QA_BEFORE_TRUST_CERTIFICATION');
      }, ...(transport ? { transport } : {}) });
    const result = await runQA({ tokenSource, protectedGet });
    requireProbeQATokenBudget(budget.evidence(), target.origin);
    return result;
  } catch (error) {
    const code = budget.evidence().error_code;
    if (code) throw new Error(code);
    throw error;
  } finally { tokenSource.clear(); }
}
