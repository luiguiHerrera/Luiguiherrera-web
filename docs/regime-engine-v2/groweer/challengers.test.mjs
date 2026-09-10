/** Independent expected rules for isolated Groweer benchmarks, not a canonical oracle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { omissions, mechanical, reduced, benchmark } from './challengers.mjs';

const complete = () => ({ positive_5: 9, positive_21: 9, leadership_gap: 2, vix: 15, jump_1: 0, jump_5: 0, slope: 8, rho21: 0.2, rho63: 0.2, corr_spread: 0 });
const row = (changes = {}) => ({ features: complete(), pillarStates: { participation: 'FAVORABLE', leadership: 'FAVORABLE', equity: 'FAVORABLE', volatility: 'BENIGN', fragility: 'LOW' }, dependencyUnits: { equity_price_complex: 'FAVORABLE', implied_volatility_complex: 'FAVORABLE' }, regime: 'RISK_ON_BROAD', systemState: 'COMPLETE', sessionIndex: 100, ...changes });
const incomplete = result => { assert.equal(result.regime, null); assert.equal(result.systemState, 'INCOMPLETE'); };

test('FULL reduced has the registered broad favorable case', () => {
  const result = reduced(complete());
  assert.equal(result.regime, 'RISK_ON_BROAD');
  assert.equal(result.systemState, 'COMPLETE');
  assert.deepEqual(result.pillarStates, { participation: 'FAVORABLE', leadership: 'FAVORABLE', equity: 'FAVORABLE', volatility: 'BENIGN', fragility: 'LOW' });
});

for (const name of Object.keys(omissions)) test(`mechanical ${name}: absent required evidence remains INCOMPLETE`, () => {
  const f = complete(), before = structuredClone(f);
  incomplete(mechanical(f, name)); assert.deepEqual(f, before);
});

test('FULL rejects every active null/undefined/NaN/infinite field before a stress override', () => {
  for (const key of Object.keys(complete())) for (const missing of [null, undefined, NaN, Infinity, -Infinity]) {
    incomplete(reduced({ ...complete(), vix: 40, [key]: missing }));
  }
});

test('Reduced omissions relax only their explicitly named missing feature inputs', () => {
  for (const [name, removed] of Object.entries(omissions)) {
    const f = { ...complete(), ...Object.fromEntries(removed.map(k => [k, null])) };
    const result = reduced(f, name);
    assert.equal(result.systemState, 'COMPLETE', name);
    assert.equal(reduced(f).systemState, 'INCOMPLETE', `${name}: full model cannot inherit relaxed requirements`);
    for (const key of ['positive_5', 'positive_21', 'leadership_gap', 'vix', 'jump_1', 'jump_5', 'slope'].filter(k => !removed.includes(k))) incomplete(reduced({ ...f, [key]: null }, name));
  }
});

test('Reduced changes do not mutate features or omission definitions across A-B-A', () => {
  const a = complete(), beforeA = structuredClone(a), beforeOmissions = structuredClone(omissions), first = reduced(a);
  reduced({ ...complete(), vix: 40 }, 'leadership_gap');
  assert.deepEqual(reduced(a), first); assert.deepEqual(a, beforeA); assert.deepEqual(omissions, beforeOmissions);
});

test('Zero participation is valid adverse evidence rather than missing or favorable substitution', () => {
  const result = reduced({ ...complete(), positive_5: 0, positive_21: 0, leadership_gap: 0, vix: 20 });
  assert.equal(result.pillarStates.participation, 'ADVERSE'); assert.equal(result.regime, 'DEFENSIVE');
});

test('Omitted participation or leadership is explicitly OMITTED and selective becomes unreachable', () => {
  const p = reduced({ ...complete(), positive_5: null, positive_21: null }, 'participation');
  assert.equal(p.pillarStates.participation, 'OMITTED'); assert.equal(p.regime, 'RISK_ON_BROAD');
  const l = reduced({ ...complete(), positive_5: 5, positive_21: 5, leadership_gap: null }, 'leadership_gap');
  assert.equal(l.pillarStates.leadership, 'OMITTED'); assert.equal(l.regime, 'TRANSITION');
});

test('Single participation-horizon omission uses the retained horizon', () => {
  for (const [name, retained] of [['positive_5', 'positive_21'], ['positive_21', 'positive_5']]) {
    const r = reduced({ ...complete(), [name]: null, [retained]: 3, leadership_gap: 0, vix: 20 }, name);
    assert.equal(r.pillarStates.participation, 'ADVERSE'); assert.equal(r.regime, 'DEFENSIVE');
  }
});

test('Absolute stress is immediate at the frozen 35 boundary with all active evidence', () => {
  assert.equal(reduced({ ...complete(), vix: 35 }).regime, 'STRESS');
  assert.equal(reduced({ ...complete(), vix: 35 - 1e-7 }).pillarStates.volatility, 'ADVERSE');
});

test('Joint stress requires adverse level AND a jump AND inversion', () => {
  const joint = { ...complete(), vix: 25, jump_1: 10, slope: -5 };
  assert.equal(reduced(joint).regime, 'STRESS');
  assert.equal(reduced({ ...joint, jump_1: 0, jump_5: 20 }).regime, 'STRESS');
  for (const [key, value] of [['vix', 25 - 1e-7], ['jump_1', 10 - 1e-7], ['slope', -5 + 1e-7]]) assert.notEqual(reduced({ ...joint, [key]: value }).regime, 'STRESS');
});

test('Missing momentum stays unavailable even when absolute VIX stress is evident', () => {
  incomplete(reduced({ ...complete(), vix: 40, jump_1: null }));
  incomplete(reduced({ ...complete(), vix: 40, jump_5: null }));
});

test('Explicit momentum ablation removes joint stress while retaining absolute stress', () => {
  const f = { ...complete(), vix: 25, jump_1: null, jump_5: null, slope: -5 };
  assert.equal(reduced(f, 'volatility_momentum').pillarStates.volatility, 'ADVERSE');
  assert.equal(reduced({ ...f, vix: 35 }, 'volatility_momentum').regime, 'STRESS');
});

test('Single jump omission preserves the other joint-stress branch', () => {
  assert.equal(reduced({ ...complete(), vix: 25, slope: -5, jump_1: null, jump_5: 20 }, 'jump_1').regime, 'STRESS');
  assert.equal(reduced({ ...complete(), vix: 25, slope: -5, jump_1: 10, jump_5: null }, 'jump_5').regime, 'STRESS');
});

test('Removing volatility level cannot synthesize stress from momentum and inversion', () => {
  const r = reduced({ ...complete(), vix: null, jump_1: 100, jump_5: 200, slope: -50 }, 'vix_level');
  assert.equal(r.pillarStates.volatility, 'ADVERSE'); assert.notEqual(r.regime, 'STRESS');
});

test('Removing curve drops only curve-dependent stress, inversion and flatness branches', () => {
  const f = { ...complete(), vix: 25, jump_1: 10, slope: null };
  assert.equal(reduced(f, 'vx_slope').pillarStates.volatility, 'ADVERSE');
  assert.equal(reduced({ ...f, vix: 35 }, 'vx_slope').regime, 'STRESS');
  assert.equal(reduced({ ...f, vix: 15, jump_1: 0 }, 'vx_slope').pillarStates.volatility, 'BENIGN');
});

test('Correlation level ablation has RISING/LOW only; deterioration omission has HIGH/LOW only', () => {
  const level = reduced({ ...complete(), rho21: null, rho63: null, corr_spread: 0.1 }, 'correlation_level');
  assert.equal(level.pillarStates.fragility, 'RISING');
  incomplete(reduced({ ...complete(), rho21: null, rho63: null, corr_spread: null }, 'correlation_level'));
  const deterioration = reduced({ ...complete(), rho21: 0.65, rho63: null, corr_spread: null }, 'correlation_deterioration');
  assert.equal(deterioration.pillarStates.fragility, 'HIGH');
  assert.equal(reduced({ ...complete(), rho21: 0.4, rho63: null, corr_spread: null }, 'correlation_deterioration').pillarStates.fragility, 'LOW');
});

test('B1 uses only the declared volatility namespace and frozen absolute VIX thresholds', () => {
  const cases = [[15, 'CALM_VOL'], [20, 'WATCH_VOL'], [25, 'ADVERSE_VOL'], [35, 'STRESS_VOL']];
  for (const [vix, expected] of cases) assert.equal(benchmark(row({ features: { vix }, pillarStates: {} }), 'B1_VIX_ONLY'), expected);
  for (const missing of [null, undefined, NaN, Infinity]) assert.equal(benchmark(row({ features: { vix: missing } }), 'B1_VIX_ONLY'), null);
});

test('B2 refuses absent participation before absolute stress adjudication', () => {
  for (const participation of ['UNAVAILABLE', null, undefined]) assert.equal(benchmark(row({ features: { vix: 40 }, pillarStates: { participation } }), 'B2_VIX_BREADTH'), null);
});

test('B2 requires only volatility plus participation and cannot invent broad/selective leadership', () => {
  assert.equal(benchmark(row(), 'B2_VIX_BREADTH'), 'RISK_ON');
  assert.equal(benchmark(row({ features: { vix: 20 }, pillarStates: { participation: 'ADVERSE' } }), 'B2_VIX_BREADTH'), 'DEFENSIVE');
  assert.equal(benchmark(row({ features: { vix: 20 }, pillarStates: { participation: 'FAVORABLE' } }), 'B2_VIX_BREADTH'), 'TRANSITION');
  assert.equal(benchmark(row({ features: { vix: null } }), 'B2_VIX_BREADTH'), null);
});

test('B3 refuses a null required family even at STRESS', () => {
  for (const family of ['equity_price_complex', 'implied_volatility_complex']) {
    const r = row({ pillarStates: { volatility: 'STRESS' }, dependencyUnits: { equity_price_complex: 'FAVORABLE', implied_volatility_complex: 'ADVERSE', [family]: null } });
    assert.equal(benchmark(r, 'B3_FAMILY_VOTE'), null);
  }
});

test('B3 requires both named family descriptors and rejects vacuous or one-family votes', () => {
  for (const dependencyUnits of [{}, { equity_price_complex: 'FAVORABLE' }, { implied_volatility_complex: 'ADVERSE' }, { unrelated: 'ADVERSE' }]) {
    assert.equal(benchmark(row({ dependencyUnits }), 'B3_FAMILY_VOTE'), null);
    assert.equal(benchmark(row({ dependencyUnits, pillarStates: { volatility: 'STRESS' } }), 'B3_FAMILY_VOTE'), null);
  }
});

test('B3 two valid votes yield named outcomes with stress immediate', () => {
  assert.equal(benchmark(row(), 'B3_FAMILY_VOTE'), 'RISK_ON');
  assert.equal(benchmark(row({ dependencyUnits: { equity_price_complex: 'ADVERSE', implied_volatility_complex: 'ADVERSE' } }), 'B3_FAMILY_VOTE'), 'DEFENSIVE');
  for (const vote of ['MIXED', 'ADVERSE']) assert.equal(benchmark(row({ dependencyUnits: { equity_price_complex: 'FAVORABLE', implied_volatility_complex: vote } }), 'B3_FAMILY_VOTE'), 'TRANSITION');
  assert.equal(benchmark(row({ pillarStates: { volatility: 'STRESS' } }), 'B3_FAMILY_VOTE'), 'STRESS');
});

test('B4 has no initial state, bridges no gap, and does not use a same/future-index state', () => {
  const current = row();
  assert.equal(benchmark(current, 'B4_PREVIOUS'), null);
  for (const index of [98, 100, 101]) assert.equal(benchmark(current, 'B4_PREVIOUS', row({ sessionIndex: index })), null);
  assert.equal(benchmark(current, 'B4_PREVIOUS', row({ sessionIndex: 99, regime: 'DEFENSIVE' })), 'DEFENSIVE');
});

test('B4 actual previous INCOMPLETE has no carried regime; current evidence is not substituted', () => {
  assert.equal(benchmark(row(), 'B4_PREVIOUS', row({ sessionIndex: 99, regime: null, systemState: 'INCOMPLETE' })), null);
  assert.equal(benchmark(row({ regime: 'STRESS' }), 'B4_PREVIOUS', row({ sessionIndex: 99, regime: 'RISK_ON_BROAD' })), 'RISK_ON_BROAD');
});

test('B5 is the observed canonical state, including unavailable observations', () => {
  assert.equal(benchmark(row({ regime: 'DEFENSIVE' }), 'B5_C03'), 'DEFENSIVE');
  assert.equal(benchmark(row({ regime: null, systemState: 'INCOMPLETE' }), 'B5_C03'), null);
});

test('Unknown benchmark is an explicit harness error', () => {
  assert.throws(() => benchmark(row(), 'NOT_REGISTERED'), /Unknown benchmark/);
});
