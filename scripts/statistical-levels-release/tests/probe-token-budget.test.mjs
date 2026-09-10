import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbeTokenBudget, validateProbeTokenBudgetEvidence, PROBE_TOKEN_BUDGET_SCHEMA, PROBE_TOKEN_BUDGET_ERRORS as E } from '../scripts/probe-token-budget.mjs';
const origin = 'https://luiguiherrera-budgetfixture-luigui-herrera-s-projects.vercel.app';
const epoch = 1800000000;
const token = (exp, number = 1) => 'unit.' + Buffer.from(JSON.stringify({ exp, nonce: 'memory-only-token-' + number })).toString('base64url') + '.signature' + number;
function harness(options = {}) {
  let time = epoch, calls = 0, guardCalls = 0, closedBaseline = false, budget;
  const journal = [], issued = [], order = [];
  budget = createProbeTokenBudget({ origin, clock: () => time,
    assertProtected: async () => { guardCalls++; if (closedBaseline || options.baseline === 'PUBLIC' || options.baseline === 'AMBIGUOUS') throw new Error('unrecorded-baseline-message'); return options.guardResult; },
    requestOIDCToken: async () => {
      calls++; order.push('request-' + calls);
      assert.equal(budget.evidence().vercel_total_oidc_token_request_count, calls);
      if (calls === 2) { assert.equal(budget.evidence().certification_recorded, true); assert.ok(journal.some(row => row.trusted_sources_certified)); }
      if (options.factoryError === calls) throw new Error(options.factoryErrorMessage ?? 'private-factory-error-do-not-persist');
      if (options.pending) await options.pending(calls);
      const value = options.tokens ? options.tokens[calls - 1] : token(time + (options.ttls?.[calls - 1] ?? 600), calls);
      issued.push(value); return value;
    },
    onEvidence: async proof => {
      journal.push(proof); order.push(proof.certification_recorded ? 'persist-certified' : 'persist');
      if (options.persist) await options.persist(proof, journal.length);
    }
  });
  return { budget, journal, order, issued, calls: () => calls, guards: () => guardCalls,
    advance: delta => { time += delta; }, baselineFails: () => { closedBaseline = true; } };
}
async function certification(h) { return h.budget.certificationTokenSource.get(origin); }
async function qa(h) { return h.budget.qaTokenSource.get(origin); }
function counts(h, initial, refresh) {
  const value = h.budget.evidence();
  assert.equal(value.vercel_certification_oidc_token_request_count, initial);
  assert.equal(value.vercel_certification_oidc_refresh_count, 0);
  assert.equal(value.vercel_post_certification_qa_refresh_count, refresh);
  assert.equal(value.vercel_total_oidc_token_request_count, initial + refresh);
  assert.equal(h.calls(), initial + refresh);
}
for (const baseline of ['PUBLIC', 'AMBIGUOUS']) test('1/2 ' + baseline + ' permanently leaves certification and QA endpoint request counts zero', async () => {
  const h = harness({ baseline }); await assert.rejects(certification(h), { message: E.PROTECTED });
  await assert.rejects(certification(h)); await assert.rejects(qa(h)); counts(h, 0, 0);
  assert.equal(h.budget.evidence().protected_baseline_confirmed, false);
});
for (const ttl of [31, 45, 60, 61, 600]) test('3/5/6/15 certification reuses identical token across two hops without proactive refresh: TTL' + ttl, async () => {
  const h = harness({ ttls: [ttl] }); const first = await certification(h);
  assert.equal(await certification(h), first); assert.equal(await certification(h), first); counts(h, 1, 0);
  assert.equal(h.budget.evidence().usable_ttl_seconds, 30);
});
for (const ttl of [30, 29, 0, -1]) test('4 fresh certificationTTL' + ttl + ' fails without retry or second certification acquisition', async () => {
  const h = harness({ ttls: [ttl] }); await assert.rejects(certification(h), { message: E.FRESH_TTL });
  await assert.rejects(certification(h)); await assert.rejects(qa(h)); counts(h, 1, 0);
});
test('certification expiry at usable30 boundary fails instead of renewing', async () => {
  const h = harness({ ttls: [45] }); await certification(h); h.advance(15);
  await assert.rejects(certification(h), { message: E.CERT_TTL }); counts(h, 1, 0);
});
for (const ttl of [31, 45, 60, 61, 600]) test('9 QA validTTL' + ttl + ' reuses certification token and keeps total at1', async () => {
  const h = harness({ ttls: [ttl] }); const first = await certification(h); await h.budget.markCertified();
  assert.equal(await qa(h), first); assert.equal(await qa(h), first); counts(h, 1, 0);
});
for (const remaining of [30, 29, 0, -1]) test('10 QA currentTTL' + remaining + ' allows exactly one post-certification renewal', async () => {
  const h = harness({ ttls: [600, 45] }); const first = await certification(h); await h.budget.markCertified(); h.advance(600 - remaining);
  const refreshed = await qa(h); assert.notEqual(refreshed, first); assert.equal(await qa(h), refreshed); counts(h, 1, 1);
  assert.equal(h.budget.evidence().trusted_sources_certified_before_qa_refresh, true);
});
test('11 a second QA refresh requirement is terminal and total requests never exceeds2', async () => {
  const h = harness({ ttls: [45, 45, 600] }); await certification(h); await h.budget.markCertified(); h.advance(15); await qa(h); h.advance(15);
  await assert.rejects(qa(h), { message: E.QA_BUDGET }); await assert.rejects(qa(h), { message: E.QA_BUDGET }); counts(h, 1, 1);
});
test('12 QA source cannot acquire or refresh before certification checkpoint', async () => {
  const h = harness(); await certification(h); await assert.rejects(qa(h), { message: E.QA_BEFORE_CERTIFICATION }); counts(h, 1, 0);
});
test('12 QA source before any certification token cannot issue a token', async () => {
  const h = harness(); await assert.rejects(qa(h), { message: E.QA_BEFORE_CERTIFICATION }); counts(h, 0, 0);
});
test('13 certification is persisted before optional QA renewal and phase transition is idempotent', async () => {
  const h = harness({ ttls: [45, 600] }); await certification(h); await h.budget.markCertified(); const writes = h.journal.length;
  await h.budget.markCertified(); assert.equal(h.journal.length, writes); h.advance(15); await qa(h);
  assert.ok(h.order.indexOf('persist-certified') < h.order.indexOf('request-2')); counts(h, 1, 1);
});
test('certification source cannot be reused after entering the QA phase', async () => {
  const h = harness(); await certification(h); await h.budget.markCertified(); await assert.rejects(certification(h), { message: E.PHASE }); counts(h, 1, 0);
});
test('markCertified cannot create a checkpoint before accepted certification token', async () => {
  const h = harness(); await assert.rejects(h.budget.markCertified(), { message: E.PHASE }); counts(h, 0, 0);
});
test('concurrent certification getters use one acquisition and the same token', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const h = harness({ pending: () => pending }); const values = Array.from({ length: 20 }, () => certification(h)); release();
  const tokens = await Promise.all(values); assert.ok(tokens.every(value => value === tokens[0])); counts(h, 1, 0);
});
test('concurrent QA getters near expiry share one renewal and the same replacement', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const h = harness({ ttls: [45, 45], pending: call => call === 2 ? pending : undefined }); await certification(h); await h.budget.markCertified(); h.advance(15);
  const values = Array.from({ length: 30 }, () => qa(h)); release(); const tokens = await Promise.all(values);
  assert.ok(tokens.every(value => value === tokens[0])); counts(h, 1, 1);
});
test('fresh QA replacement at30 fails without retry and retains exhausted refresh budget', async () => {
  const h = harness({ ttls: [45, 30, 600] }); await certification(h); await h.budget.markCertified(); h.advance(15);
  await assert.rejects(qa(h), { message: E.FRESH_TTL }); await assert.rejects(qa(h)); counts(h, 1, 1);
});
for (const call of [1, 2]) test('factory rejection on attempt' + call + ' is counted once, sanitized, and never retried', async () => {
  const h = harness({ ttls: [45], factoryError: call });
  if (call === 1) await assert.rejects(certification(h), { message: E.FACTORY });
  else { await certification(h); await h.budget.markCertified(); h.advance(15); await assert.rejects(qa(h), { message: E.FACTORY }); }
  await assert.rejects(certification(h)); await assert.rejects(qa(h)); counts(h, 1, call - 1);
  assert.doesNotMatch(JSON.stringify(h.journal), /private-factory-error/);
});
test('factory OIDC_TIME error stays bounded factory failure instead of misleading TTL-only classification', async () => {
  const h = harness({ factoryError: 1, factoryErrorMessage: 'OIDC_TIME' }); await assert.rejects(certification(h), { message: E.FACTORY }); counts(h, 1, 0);
});
test('persistence failure before certification factory leaves request counts zero', async () => {
  const h = harness({ persist: () => { throw new Error('private-persistence-error'); } }); await assert.rejects(certification(h), { message: E.PERSISTENCE }); counts(h, 0, 0);
});
test('failed certification checkpoint persistence never enables QA refresh', async () => {
  const h = harness({ persist: proof => { if (proof.trusted_sources_certified) throw new Error('private-persistence-error'); } });
  await certification(h); await assert.rejects(h.budget.markCertified(), { message: E.PERSISTENCE });
  assert.equal(h.budget.evidence().trusted_sources_certified, false); assert.equal(h.budget.evidence().certification_recorded, false);
  await assert.rejects(qa(h)); counts(h, 1, 0);
});
test('optional QA renewal requires successful persistence first', async () => {
  let block = false; const h = harness({ ttls: [45], persist: () => { if (block) throw new Error('not-visible'); } });
  await certification(h); await h.budget.markCertified(); h.advance(15); block = true;
  await assert.rejects(qa(h), { message: E.PERSISTENCE }); counts(h, 1, 0);
});
test('clear during pending acquisition prevents credential return and further requests', async () => {
  let release, entered; const pending = new Promise(resolve => { release = resolve; }); const called = new Promise(resolve => { entered = resolve; });
  const h = harness({ pending: () => { entered(); return pending; } }); const attempt = certification(h); await called; h.budget.clear(); release();
  await assert.rejects(attempt, { message: E.CLOSED }); await assert.rejects(certification(h), { message: E.CLOSED }); counts(h, 1, 0);
});
for (const source of ['certificationTokenSource', 'qaTokenSource']) test(source + '.clear permanently closes both phase sources without resetting budgets', async () => {
  const h = harness(); await certification(h); h.budget[source].clear(); await assert.rejects(certification(h), { message: E.CLOSED }); await assert.rejects(qa(h), { message: E.CLOSED }); counts(h, 1, 0);
});
for (const destination of ['https://different.vercel.app', 'https://www.luiguiherrera.com', origin + '/', origin + '?token=private-query', 'http://' + new URL(origin).hostname]) test('wrong destination fails before token issuance without recording arbitrary URL', async () => {
  const h = harness(); await assert.rejects(h.budget.certificationTokenSource.get(destination), { message: E.SCOPE }); counts(h, 0, 0);
  assert.ok(!JSON.stringify(h.journal).includes('private-query'));
});
test('protected gate is rechecked immediately before a renewal factory call', async () => {
  const h = harness({ ttls: [45] }); await certification(h); await h.budget.markCertified(); h.advance(15); h.baselineFails();
  await assert.rejects(qa(h), { message: E.PROTECTED }); counts(h, 1, 0);
});
for (const value of ['PUBLIC', 'AMBIGUOUS', false, {}]) test('assertProtected unexpected return cannot authorize acquisition', async () => {
  const h = harness({ guardResult: value }); await assert.rejects(certification(h), { message: E.PROTECTED }); counts(h, 0, 0);
});
for (const value of [null, 'not-a-jwt', 'a.b.c', token(epoch + 600).replace('unit.', 'unit.='), 'a.' + Buffer.from(JSON.stringify({ exp: '1800000600' })).toString('base64url') + '.b']) test('malformed token fails closed without retry or raw data in evidence', async () => {
  const h = harness({ tokens: [value] }); await assert.rejects(certification(h), { message: E.FORMAT }); await assert.rejects(certification(h)); counts(h, 1, 0);
});
test('strict evidence roundtrips canonical JSON without persisting any issued token', async () => {
  const h = harness({ ttls: [45, 600] }); await certification(h); await h.budget.markCertified(); h.advance(15); await qa(h);
  const sorted = Object.fromEntries(Object.entries(h.budget.evidence()).sort(([a], [b]) => a.localeCompare(b)));
  const serialized = JSON.stringify(sorted); assert.equal(validateProbeTokenBudgetEvidence(JSON.parse(serialized), origin).schema_version, PROBE_TOKEN_BUDGET_SCHEMA);
  for (const issued of h.issued) { assert.ok(!serialized.includes(issued)); assert.ok(!serialized.includes(issued.split('.')[1])); }
  assert.doesNotMatch(serialized, /memory-only-token|signature/);
});
test('strict evidence rejects unknown fields and forged phase or counter allowances', async () => {
  const h = harness(); await certification(h); const mutations = [v => { v.token = 'private-value'; }, v => { v.vercel_certification_oidc_token_request_count = 2; },
    v => { v.vercel_certification_oidc_refresh_count = 1; }, v => { v.vercel_post_certification_qa_refresh_count = 1; v.vercel_total_oidc_token_request_count = 2; },
    v => { v.max_vercel_oidc_token_requests = 3; }, v => { v.usable_ttl_seconds = 60; }, v => { v.qa_refresh_trigger_remaining_seconds = 60; },
    v => { v.certification_recorded = true; }, v => { v.phase = 'POST_CERTIFICATION_QA'; }, v => { v.audience = 'sts.amazonaws.com'; }];
  for (const mutate of mutations) { const forged = structuredClone(h.budget.evidence()); mutate(forged); assert.throws(() => validateProbeTokenBudgetEvidence(forged, origin)); }
});
test('strict evidence rejects getters, inherited or nonenumerable serializers without execution', async () => {
  const h = harness(); await certification(h); let invoked = false;
  for (const mutate of [v => Object.defineProperty(v, 'toJSON', { value() { invoked = true; return {}; } }),
    v => Object.defineProperty(v, 'origin', { enumerable: true, get() { invoked = true; return origin; } }),
    v => Object.setPrototypeOf(v, { toJSON() { invoked = true; return {}; } })]) {
    const forged = structuredClone(h.budget.evidence()); mutate(forged); assert.throws(() => validateProbeTokenBudgetEvidence(forged, origin));
  }
  assert.equal(invoked, false);
});
test('clear while certification checkpoint is persisting leaves a valid terminal failure, never a QA-enabled certificate', async () => {
  let release, entered; const pending = new Promise(resolve => { release = resolve; }); const called = new Promise(resolve => { entered = resolve; });
  const h = harness({ persist: async proof => { if (proof.trusted_sources_certified) { entered(); await pending; } } });
  await certification(h); const marking = h.budget.markCertified(); await called; h.budget.clear(); release();
  await assert.rejects(marking, { message: E.CLOSED }); const proof = h.budget.evidence();
  assert.equal(proof.outcome, 'FAIL'); assert.equal(proof.trusted_sources_certified, false); assert.equal(proof.certification_recorded, false);
  await assert.rejects(qa(h)); counts(h, 1, 0);
});
test('concurrent markCertified calls share one persisted transition', async () => {
  const h = harness(); await certification(h); const results = await Promise.all(Array.from({ length: 12 }, () => h.budget.markCertified()));
  assert.ok(results.every(result => result.certification_recorded));
  assert.equal(h.journal.filter(proof => proof.trusted_sources_certified && !proof.certification_recorded).length, 1);
  counts(h, 1, 0);
});
test('QA request during certificate persistence waits for completion before optional renewal', async () => {
  let release, entered; const pending = new Promise(resolve => { release = resolve; }); const called = new Promise(resolve => { entered = resolve; });
  let held = false;
  const h = harness({ ttls: [45, 600], persist: async proof => { if (proof.trusted_sources_certified && !held) { held = true; entered(); await pending; } } });
  await certification(h); h.advance(15); const marking = h.budget.markCertified(); await called; const getting = qa(h);
  assert.equal(h.calls(), 1); release(); await marking; await getting; counts(h, 1, 1);
});
