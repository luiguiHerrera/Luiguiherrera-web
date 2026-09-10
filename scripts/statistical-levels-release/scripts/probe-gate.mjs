// Probe-only ordering boundary. A token factory and browser QA are unreachable until anonymous protection is proven.
import { need, oidcLease } from './release-core.mjs';
import { createProbeHttpSession, validateProbeHttpEvidence, PROBE_HTTP_PATHS } from './probe-http.mjs';

export function requireProtectedProbeHTTP(value, target) {
  const proof = validateProbeHttpEvidence(value, target);
  need(proof.anonymous_protection_baseline === 'PROTECTED' && proof.anonymous_baseline_complete === true &&
    proof.result === 'PASS' && proof.trusted_sources_access === 'PASS' && proof.trusted_sources_live_certified === true &&
    proof.routes.length === 2 && proof.routes.every((route, index) => route.path === PROBE_HTTP_PATHS[index] && route.result === 'PASS'),
  'PROBE_PROTECTED_BASELINE_REQUIRED');
  return proof;
}

export async function runProtectedProbeQA({ target, requestOIDCToken, onEvidence, runQA, transport }) {
  need(typeof requestOIDCToken === 'function' && typeof onEvidence === 'function' && typeof runQA === 'function', 'PROBE_GATE_CALLBACKS');
  let session, lease, pending, closed = false;
  const assertProtected = () => need(!closed && session.evidence().anonymous_protection_baseline === 'PROTECTED' &&
    session.evidence().anonymous_baseline_complete === true, 'PROBE_PROTECTED_BASELINE_REQUIRED');
  const requestAfterBaseline = async () => { assertProtected(); return requestOIDCToken(); };
  const tokenSource = {
    get: async () => {
      assertProtected();
      pending ??= (async () => { lease = oidcLease(await requestAfterBaseline(), requestAfterBaseline); })();
      await pending; assertProtected(); return lease.get();
    },
    clear: () => { closed = true; lease?.clear(); }
  };
  session = createProbeHttpSession({ target, tokenSource, onEvidence, ...(transport ? { transport } : {}) });
  try {
    // This call completes and persists PROTECTED before requestOIDCToken can be reached.
    await session.establishAnonymousBaseline();
    const responses = new Map();
    for (const route of PROBE_HTTP_PATHS) responses.set(target.origin + route, await session.get(target.origin + route));
    requireProtectedProbeHTTP(session.evidence(), target);
    const protectedGet = async url => {
      assertProtected();
      need(responses.has(url), 'PROBE_QA_PREFLIGHT_SCOPE');
      const response = responses.get(url); responses.delete(url); return response;
    };
    // Browser creation, fixture rendering and QA imports happen only inside this callback.
    return await runQA({ tokenSource, protectedGet });
  } finally { tokenSource.clear(); }
}
