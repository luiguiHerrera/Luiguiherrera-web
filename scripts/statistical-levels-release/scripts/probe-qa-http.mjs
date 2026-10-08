// Post-certification product coverage only; this is not Trusted Sources HTTP evidence.
import { need, verifiedOrigin } from './release-core.mjs';

export const PROBE_QA_HTTP_PATHS = Object.freeze([
  '/niveles-estadisticos', '/en/statistical-levels', '/metodologia', '/en/methodology'
]);
const TOKEN_HEADER = 'x-vercel-trusted-oidc-idp-token';
const MAX_BODY_BYTES = 8 * 1024 * 1024;

async function boundedText(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      void reader.cancel().catch(() => {});
      throw new Error('PROBE_QA_HTTP_BODY_SIZE');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// No caller-provided route or URL reaches the transport. Only these two missing
// cache entries are fetched, and only while the existing QA token budget permits it.
export async function createProbeQACache({ origin, certifiedResponses, tokenSource, assertCertified, transport = fetch }) {
  need(typeof origin === 'string' && verifiedOrigin(origin) === origin, 'PROBE_QA_HTTP_ORIGIN');
  need(certifiedResponses instanceof Map && certifiedResponses.size === 2 &&
    PROBE_QA_HTTP_PATHS.slice(0, 2).every(route => certifiedResponses.has(origin + route)) &&
    typeof tokenSource?.get === 'function' && typeof assertCertified === 'function' && typeof transport === 'function',
  'PROBE_QA_HTTP_OPTIONS');
  const responses = new Map(certifiedResponses);
  await assertCertified();
  for (const route of PROBE_QA_HTTP_PATHS.slice(2)) {
    await assertCertified();
    const url = origin + route;
    const token = await tokenSource.get(origin);
    await assertCertified();
    need(typeof token === 'string' && token.length > 0 && token.length <= 20000 && !/[\r\n\u0000]/.test(token), 'PROBE_QA_HTTP_TOKEN_UNAVAILABLE');
    let response;
    try {
      response = await transport(url, { method: 'GET', redirect: 'manual', credentials: 'omit',
        headers: { [TOKEN_HEADER]: token }, signal: AbortSignal.timeout(30000) });
    } catch { throw new Error('PROBE_QA_HTTP_TRANSPORT_FAILURE'); }
    await assertCertified();
    need(Number.isInteger(response?.status) && response.status >= 200 && response.status <= 599 &&
      typeof response.text === 'function', 'PROBE_QA_HTTP_RESPONSE_INVALID');
    // Zero redirect hops: neither cross-origin nor alternative-path destinations
    // can receive OIDC, even if Location points back into the approved origin.
    need(response.redirected !== true && (!response.url || response.url === url), 'PROBE_QA_HTTP_TRANSPORT_REDIRECT');
    need(response.status < 300 || response.status >= 400, 'PROBE_QA_HTTP_REDIRECT');
    let html;
    try { html = await boundedText(response); }
    catch (error) { throw new Error(error.message === 'PROBE_QA_HTTP_BODY_SIZE' ? error.message : 'PROBE_QA_HTTP_BODY_READ_FAILURE'); }
    await assertCertified();
    need(!html.includes(token), 'PROBE_QA_HTTP_SECRET_IN_CONTENT');
    // Status/H1 remain the product suite's assertions, including non-200 failures.
    // Raw headers and redirects are not passed into QA or retained as evidence.
    responses.set(url, new Response([204, 205].includes(response.status) ? null : html, { status: response.status }));
  }
  return async function protectedGet(url) {
    await assertCertified();
    need(typeof url === 'string' && responses.has(url), 'PROBE_QA_PREFLIGHT_SCOPE');
    const response = responses.get(url); responses.delete(url); return response;
  };
}
