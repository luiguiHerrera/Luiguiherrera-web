// Offline Groweer research only. No production imports reference this module.
import { C03 } from '../../../lib/regime-engine-v2/contract.ts';
import { classifyCore, equityState } from '../../../lib/regime-engine-v2/core.ts';
import { ge, le } from '../../../lib/regime-engine-v2/math.ts';
export const omissions = {
  positive_5: ['positive_5'], positive_21: ['positive_21'], leadership_gap: ['leadership_gap'],
  vix_level: ['vix'], jump_1: ['jump_1'], jump_5: ['jump_5'], vx_slope: ['slope'],
  correlation_level: ['rho21'], correlation_deterioration: ['corr_spread'],
  participation: ['positive_5', 'positive_21'], volatility_momentum: ['jump_1', 'jump_5'],
};
export function mechanical(features, name) {
  return classifyCore({ ...features, ...Object.fromEntries(omissions[name].map(k => [k, null])) });
}
export function reduced(f, name = null, p = C03) {
  const removed = new Set(omissions[name] ?? []), active = k => !removed.has(k);
  const counts = ['positive_5', 'positive_21'].filter(active);
  const hasP = counts.length > 0, hasL = active('leadership_gap');
  const required = [...counts, ...['leadership_gap', 'vix', 'jump_1', 'jump_5', 'slope'].filter(active),
    ...(name === 'correlation_level' ? ['corr_spread'] : name === 'correlation_deterioration' ? ['rho21'] : ['rho21', 'rho63', 'corr_spread'])];
  if (required.some(k => !Number.isFinite(f[k]))) return { regime: null, pillarStates: null, systemState: 'INCOMPLETE' };
  const participation = !hasP ? 'OMITTED' : counts.every(k => f[k] >= p.k_broad) ? 'FAVORABLE' : counts.every(k => f[k] <= p.k_weak) ? 'ADVERSE' : 'MIXED';
  const leadership = !hasL ? 'OMITTED' : ge(f.leadership_gap, p.leadership_gap) ? 'FAVORABLE' : le(f.leadership_gap, -p.leadership_gap) ? 'ADVERSE' : 'MIXED';
  const equity = !hasP ? leadership : !hasL ? participation : equityState(participation, leadership);
  const fast = (active('jump_1') && ge(f.jump_1, p.jump_1)) || (active('jump_5') && ge(f.jump_5, p.jump_5));
  const inverted = active('slope') && le(f.slope, -p.curve_adverse);
  const level = key => active('vix') && ge(f.vix, p[key]);
  const volatility = level('v_stress') || (level('v_adverse') && fast && inverted) ? 'STRESS' : level('v_adverse') || inverted ? 'ADVERSE' : level('v_watch') || fast || (active('slope') && le(f.slope, p.curve_flat)) ? 'WATCH' : 'BENIGN';
  const fragility = name === 'correlation_level' ? (ge(f.corr_spread, p.delta_rising) ? 'RISING' : 'LOW') : ge(f.rho21, p.rho_high) ? 'HIGH' : name !== 'correlation_deterioration' && ge(f.rho21, p.rho_floor) && ge(f.corr_spread, p.delta_rising) ? 'RISING' : 'LOW';
  const retainedFavorable = (!hasP || participation === 'FAVORABLE') && (!hasL || leadership === 'FAVORABLE');
  const regime = volatility === 'STRESS' ? 'STRESS' : equity === 'ADVERSE' && ['WATCH','ADVERSE'].includes(volatility) ? 'DEFENSIVE' : volatility === 'ADVERSE' && fragility === 'HIGH' ? 'DEFENSIVE' : retainedFavorable && volatility === 'BENIGN' && fragility === 'LOW' ? 'RISK_ON_BROAD' : hasP && hasL && participation === 'MIXED' && leadership === 'FAVORABLE' && volatility === 'BENIGN' && fragility === 'LOW' ? 'RISK_ON_SELECTIVE' : 'TRANSITION';
  return { regime, pillarStates: { participation, leadership, equity, volatility, fragility }, systemState: 'COMPLETE' };
}
export function benchmark(row, id, previous = null, p = C03) {
  const f = row.features ?? {}, P = row.pillarStates?.participation;
  if (id === 'B4_PREVIOUS') return previous && row.sessionIndex === previous.sessionIndex + 1 ? previous.regime ?? null : null;
  if (id === 'B5_C03') return row.regime;
  if (id === 'B1_VIX_ONLY') return !Number.isFinite(f.vix) ? null : ge(f.vix,p.v_stress) ? 'STRESS_VOL' : ge(f.vix,p.v_adverse) ? 'ADVERSE_VOL' : ge(f.vix,p.v_watch) ? 'WATCH_VOL' : 'CALM_VOL';
  if (id === 'B2_VIX_BREADTH') return !Number.isFinite(f.vix) || !['FAVORABLE','MIXED','ADVERSE'].includes(P) ? null : ge(f.vix,p.v_stress) ? 'STRESS' : ge(f.vix,p.v_adverse) || (ge(f.vix,p.v_watch) && P === 'ADVERSE') ? 'DEFENSIVE' : !ge(f.vix,p.v_watch) && P === 'FAVORABLE' ? 'RISK_ON' : 'TRANSITION';
  if (id === 'B3_FAMILY_VOTE') {
    const votes = ['equity_price_complex','implied_volatility_complex'].map(k=>row.dependencyUnits?.[k]);
    return votes.some(x => !['FAVORABLE','MIXED','ADVERSE'].includes(x)) ? null : row.pillarStates?.volatility === 'STRESS' ? 'STRESS' : votes.every(x => x === 'ADVERSE') ? 'DEFENSIVE' : votes.every(x => x === 'FAVORABLE') ? 'RISK_ON' : 'TRANSITION';
  }
  throw Error(`Unknown benchmark ${id}`);
}
