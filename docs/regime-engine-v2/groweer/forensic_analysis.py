"""Post-selection R2 characterization; writes only its three Groweer reports.

Reads accepted Sweeper outputs and P8 feature evidence. It never reclassifies
expected regimes or changes canonical code, parameters, inputs, or accepted files.
Run from any directory: python3 docs/regime-engine-v2/groweer/forensic_analysis.py
"""
import collections
import hashlib
import json
import math
import statistics
from pathlib import Path

BASE = Path(__file__).resolve().parent
P8 = BASE.parent / 'p8'
SWEEPER = BASE.parent / 'sweeper'
STATES = ['RISK_ON_BROAD', 'RISK_ON_SELECTIVE', 'TRANSITION', 'DEFENSIVE', 'STRESS']
PILLARS = ['participation', 'leadership', 'volatility', 'fragility']
CORE_FEATURES = ['positive_5', 'positive_21', 'leadership_gap', 'vix', 'jump_1', 'jump_5', 'slope', 'rho21', 'corr_spread']
CONTEXT_FEATURES = CORE_FEATURES + ['rho63', 'realized_vol_21']
EPSILON = 1e-10


def load(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, obj):
    (BASE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def summary(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x))
    if not xs:
        return {'n': 0, 'min': None, 'p10': None, 'median': None, 'mean': None, 'p90': None, 'max': None}
    def quantile(q):
        position = (len(xs) - 1) * q
        low = int(position)
        high = min(low + 1, len(xs) - 1)
        return xs[low] + (xs[high] - xs[low]) * (position - low)
    return {'n': len(xs), 'min': xs[0], 'p10': quantile(.1), 'median': statistics.median(xs), 'mean': statistics.mean(xs), 'p90': quantile(.9), 'max': xs[-1]}


def fraction(n, d):
    return n / d if d else None


def adjacent(a, b):
    return b['session_index'] == a['session_index'] + 1 and a['regime'] is not None and b['regime'] is not None


def runs_for(rows):
    runs = []
    for i, row in enumerate(rows):
        if row['regime'] is None:
            continue
        continues = i > 0 and adjacent(rows[i - 1], row) and rows[i - 1]['regime'] == row['regime']
        if continues:
            runs[-1]['sessions'] += 1
            runs[-1]['end'] = row['date']
            runs[-1]['end_index'] = i
        else:
            runs.append({'state': row['regime'], 'start': row['date'], 'end': row['date'], 'sessions': 1, 'start_index': i, 'end_index': i,
                         'left_censored': i == 0 or not adjacent(rows[i - 1], row)})
    for run in runs:
        j = run['end_index']
        run['right_censored'] = j == len(rows) - 1 or not adjacent(rows[j], rows[j + 1])
    return runs


def duration_summary(runs):
    uncensored = [r for r in runs if not r['left_censored'] and not r['right_censored']]
    return {'observed': summary([r['sessions'] for r in runs]), 'uncensored': summary([r['sessions'] for r in uncensored]),
            'left_censored_runs': sum(r['left_censored'] for r in runs), 'right_censored_runs': sum(r['right_censored'] for r in runs),
            'any_censored_runs': sum(r['left_censored'] or r['right_censored'] for r in runs),
            'observed_duration_distribution': dict(sorted(collections.Counter(r['sessions'] for r in runs).items())),
            'one_session_runs': sum(r['sessions'] == 1 for r in runs), 'two_session_runs': sum(r['sessions'] == 2 for r in runs),
            'one_session_uncensored_runs': sum(r['sessions'] == 1 for r in uncensored), 'two_session_uncensored_runs': sum(r['sessions'] == 2 for r in uncensored)}


def metrics(rows):
    pairs = [(a, b) for a, b in zip(rows, rows[1:]) if adjacent(a, b)]
    runs = runs_for(rows)
    matrix = {a: {b: 0 for b in STATES} for a in STATES}
    for a, b in pairs:
        matrix[a['regime']][b['regime']] += 1
    changes = sum(a['regime'] != b['regime'] for a, b in pairs)
    complete = sum(r['regime'] is not None for r in rows)
    occ = {s: sum(r['regime'] == s for r in rows) for s in STATES}
    flip = {}
    for k in [1, 2, 3, 5]:
        events = []
        for a, b, c in zip(runs, runs[1:], runs[2:]):
            if a['state'] == c['state'] and b['sessions'] <= k and a['end_index'] + 1 == b['start_index'] and b['end_index'] + 1 == c['start_index'] and adjacent(rows[a['end_index']], rows[b['start_index']]) and adjacent(rows[b['end_index']], rows[c['start_index']]):
                events.append({'date_returned': c['start'], 'from_and_returned_to': a['state'], 'middle_state': b['state'], 'middle_start': b['start'], 'middle_sessions': b['sessions']})
        flip[str(k)] = {'count': len(events), 'per_adjacent_eligible_pair': fraction(len(events), len(pairs)), 'events': events}
    pillar = {}
    for key in PILLARS + ['equity']:
        changed = sum(a['pillarStates'][key] != b['pillarStates'][key] for a, b in pairs)
        pillar[key] = {'occupancy': dict(sorted(collections.Counter(r['pillarStates'][key] for r in rows).items())),
                       'transitions': changed, 'per_adjacent_eligible_pair': fraction(changed, len(pairs)),
                       'note': 'Derived equity aggregate; not an extra independent vote.' if key == 'equity' else None}
    direct = [{'from': a, 'to': b, 'count': matrix[a][b]} for a in STATES for b in STATES if a != b and matrix[a][b]]
    severe_direct = [d for d in direct if (d['from'].startswith('RISK_ON') and d['to'] in ['DEFENSIVE', 'STRESS']) or (d['to'].startswith('RISK_ON') and d['from'] in ['DEFENSIVE', 'STRESS'])]
    return {'start': rows[0]['date'] if rows else None, 'end': rows[-1]['date'] if rows else None, 'sessions': len(rows), 'eligible_sessions': complete,
            'missing_sessions': len(rows) - complete, 'adjacent_eligible_pairs': len(pairs), 'transition_count': changes, 'turnover': fraction(changes, len(pairs)),
            'occupancy': occ, 'occupancy_fraction': {s: fraction(n, complete) for s, n in occ.items()},
            'duration': duration_summary(runs), 'duration_by_regime': {s: duration_summary([r for r in runs if r['state'] == s]) for s in STATES},
            'flip_flops': flip, 'transition_matrix_including_self': matrix, 'direct_regime_jumps': direct,
            'direct_risk_on_to_or_from_defensive_stress': severe_direct, 'pillar_transition_frequency': pillar,
            'trailing_risk_context_by_regime': {s: {f: summary([r['features'].get(f) for r in rows if r['regime'] == s]) for f in CONTEXT_FEATURES} for s in STATES},
            'runs': runs}


def specs(parameters):
    p = parameters
    return [
        ('participation.positive_5_broad', 'positive_5', '>=', p['k_broad'], 'sector_count', 'participation'),
        ('participation.positive_5_weak', 'positive_5', '<=', p['k_weak'], 'sector_count', 'participation'),
        ('participation.positive_21_broad', 'positive_21', '>=', p['k_broad'], 'sector_count', 'participation'),
        ('participation.positive_21_weak', 'positive_21', '<=', p['k_weak'], 'sector_count', 'participation'),
        ('leadership.favorable', 'leadership_gap', '>=', p['leadership_gap'], 'return_percentage_points', 'leadership'),
        ('leadership.adverse', 'leadership_gap', '<=', -p['leadership_gap'], 'return_percentage_points', 'leadership'),
        ('volatility.watch_level', 'vix', '>=', p['v_watch'], 'VIX_points', 'volatility'),
        ('volatility.adverse_level', 'vix', '>=', p['v_adverse'], 'VIX_points', 'volatility'),
        ('volatility.stress_level', 'vix', '>=', p['v_stress'], 'VIX_points', 'volatility'),
        ('volatility.jump_1', 'jump_1', '>=', p['jump_1'], 'relative_percent', 'volatility'),
        ('volatility.jump_5', 'jump_5', '>=', p['jump_5'], 'relative_percent', 'volatility'),
        ('volatility.curve_flat', 'slope', '<=', p['curve_flat'], 'percent_of_VX1', 'volatility'),
        ('volatility.curve_adverse', 'slope', '<=', -p['curve_adverse'], 'percent_of_VX1', 'volatility'),
        ('fragility.correlation_floor', 'rho21', '>=', p['rho_floor'], 'correlation', 'fragility'),
        ('fragility.correlation_high', 'rho21', '>=', p['rho_high'], 'correlation', 'fragility'),
        ('fragility.deterioration', 'corr_spread', '>=', p['delta_rising'], 'correlation_difference', 'fragility'),
    ]


def predicate(x, op, threshold):
    if x is None:
        return None
    if op == '>=':
        return x >= threshold or abs(x - threshold) <= EPSILON
    return x <= threshold or abs(x - threshold) <= EPSILON


def atomic(row, spec):
    fid, feature, op, threshold, unit, pillar = spec
    x = row['features'].get(feature)
    distance = None if x is None else x - threshold
    band = 1 if unit == 'sector_count' else abs(threshold) * .05
    return {'predicate_id': fid, 'feature': feature, 'operator': op, 'threshold': threshold, 'unit': unit, 'pillar': pillar,
            'value': x, 'signed_raw_distance': distance, 'satisfied': predicate(x, op, threshold),
            'near_threshold_descriptive': None if distance is None else abs(distance) <= band + EPSILON,
            'annotation_band': band}


def stress_evidence(row, parameters):
    if row is None:
        return None
    f = row['features']
    p = parameters
    values = {s[0]: atomic(row, s)['satisfied'] for s in specs(p)}
    momentum = values['volatility.jump_1'] or values['volatility.jump_5']
    joint = bool(values['volatility.adverse_level'] and momentum and values['volatility.curve_adverse'])
    level = bool(values['volatility.stress_level'])
    return {'date': row['date'], 'regime': row['regime'], 'pillar_states': row['pillarStates'],
            'vix_level': f['vix'], 'vix_change_1_relative_percent': f['jump_1'], 'vix_change_5_relative_percent': f['jump_5'],
            'vx_slope_percent_of_VX1': f['slope'], 'curve_adverse': values['volatility.curve_adverse'], 'curve_flat_or_adverse': values['volatility.curve_flat'],
            'absolute_stress_level': level, 'joint_stress_conjunction': joint, 'fast_volatility': bool(momentum),
            'positive_5': f['positive_5'], 'positive_21': f['positive_21'], 'leadership_gap_pp': f['leadership_gap'],
            'group_returns_21_percent': f['group_returns_21'], 'rho21': f['rho21'], 'rho63': f['rho63'], 'corr_spread': f['corr_spread'],
            'trailing_realized_vol_21_annualized_percent': f.get('realized_vol_21'), 'missing_reasons': row['missing_reasons']}


def transitions(rows, parameters):
    entries = []
    for previous, current in zip(rows, rows[1:]):
        if not adjacent(previous, current) or previous['regime'] == current['regime']:
            continue
        distances = []
        changes = []
        for spec in specs(parameters):
            a, b = atomic(previous, spec), atomic(current, spec)
            detail = {k: a[k] for k in ['predicate_id', 'feature', 'operator', 'threshold', 'unit', 'pillar', 'annotation_band']}
            detail.update(before_value=a['value'], after_value=b['value'], before_signed_distance=a['signed_raw_distance'], after_signed_distance=b['signed_raw_distance'],
                          before_satisfied=a['satisfied'], after_satisfied=b['satisfied'], predicate_changed=a['satisfied'] != b['satisfied'],
                          near_threshold_before=a['near_threshold_descriptive'], near_threshold_after=b['near_threshold_descriptive'])
            distances.append(detail)
            if detail['predicate_changed']:
                changes.append(detail)
        changed_pillars = [key for key in PILLARS if previous['pillarStates'][key] != current['pillarStates'][key]]
        changed_predicate_pillars = sorted(set(c['pillar'] for c in changes))
        missing_change = previous['missing_reasons'] != current['missing_reasons'] or any(previous['features'].get(k) is None for k in CORE_FEATURES) != any(current['features'].get(k) is None for k in CORE_FEATURES)
        categories = []
        if changes:
            categories.append('THRESHOLD_CROSS')
        if len(changed_pillars) > 1:
            categories.append('MULTI_PILLAR_CHANGE')
        if current['regime'] == 'STRESS':
            categories.append('VOLATILITY_SHOCK')
        if 'participation' in changed_predicate_pillars:
            categories.append('PARTICIPATION_CHANGE')
        if 'fragility' in changed_predicate_pillars:
            categories.append('CORRELATION_CHANGE')
        if missing_change:
            categories.append('MISSING_DATA')
        if previous['ruleId'] in ['R02', 'R03', 'R04', 'R05'] or current['ruleId'] in ['R02', 'R03', 'R04', 'R05']:
            categories.append('JOINT_RULE')
        near = [c['predicate_id'] for c in changes if c['near_threshold_before'] or c['near_threshold_after']]
        near_continuous = [c['predicate_id'] for c in changes if c['unit'] != 'sector_count' and (c['near_threshold_before'] or c['near_threshold_after'])]
        near_integer = [c['predicate_id'] for c in changes if c['unit'] == 'sector_count' and (c['near_threshold_before'] or c['near_threshold_after'])]
        shock = stress_evidence(current, parameters)
        descriptions = []
        if current['regime'] == 'STRESS':
            descriptions.append('OBSERVED_JOINT_VOLATILITY_SHOCK' if shock['joint_stress_conjunction'] else 'ABSOLUTE_VIX_STRESS_LEVEL')
        if near:
            descriptions.append('MARGINAL_PREDICATE_CROSSING_PRESENT')
        if changes and len(near) == len(changes):
            descriptions.append('ALL_CHANGED_PREDICATES_NEAR_THRESHOLD')
        if changes and not near:
            descriptions.append('CHANGED_PREDICATES_AWAY_FROM_ANNOTATION_BANDS')
        entries.append({'from': previous['regime'], 'to': current['regime'], 'date': current['date'], 'previous_date': previous['date'],
                        'from_rule': previous['ruleId'], 'to_rule': current['ruleId'], 'changed_pillars': changed_pillars,
                        'changed_derived_equity': previous['pillarStates']['equity'] != current['pillarStates']['equity'],
                        'pillar_states_before': previous['pillarStates'], 'pillar_states_after': current['pillarStates'],
                        'changed_raw_conditions': changes, 'distance_to_threshold': distances, 'missing_change': missing_change,
                        'missing_before': previous['missing_reasons'], 'missing_after': current['missing_reasons'], 'categories': categories,
                        'atomic_predicates_changed': len(changes), 'distinct_feature_inputs_with_predicate_change': sorted(set(c['feature'] for c in changes)),
                        'near_threshold_predicates': near, 'near_continuous_predicates': near_continuous, 'near_integer_predicates': near_integer,
                        'descriptions': descriptions, 'independent_dependency_units_with_predicate_change': sorted(set('implied_volatility_complex' if c['pillar'] == 'volatility' else 'equity_price_complex' for c in changes)),
                        'stress_entry_observed_joint_conjunction': current['regime'] == 'STRESS' and shock['joint_stress_conjunction'],
                        'causal_status': 'OBSERVED_CONTRIBUTORS_ONLY; no unique causal assignment or external truth label.'})
    return entries


def transition_summary(entries):
    n = len(entries)
    counts = {
        'single_atomic_condition': sum(e['atomic_predicates_changed'] == 1 for e in entries),
        'multiple_atomic_conditions': sum(e['atomic_predicates_changed'] > 1 for e in entries),
        'no_atomic_condition_changed': sum(e['atomic_predicates_changed'] == 0 for e in entries),
        'single_raw_feature': sum(len(e['distinct_feature_inputs_with_predicate_change']) == 1 for e in entries),
        'multiple_raw_features': sum(len(e['distinct_feature_inputs_with_predicate_change']) > 1 for e in entries),
        'single_changed_pillar': sum(len(e['changed_pillars']) == 1 for e in entries),
        'multiple_changed_pillars': sum(len(e['changed_pillars']) > 1 for e in entries),
        'any_near_threshold_predicate': sum(bool(e['near_threshold_predicates']) for e in entries),
        'all_changed_predicates_near_threshold': sum(bool(e['changed_raw_conditions']) and len(e['near_threshold_predicates']) == e['atomic_predicates_changed'] for e in entries),
        'near_continuous_predicate': sum(bool(e['near_continuous_predicates']) for e in entries),
        'near_integer_predicate': sum(bool(e['near_integer_predicates']) for e in entries),
        'observed_joint_volatility_shock_entry': sum(e['stress_entry_observed_joint_conjunction'] for e in entries),
        'absolute_level_only_stress_entry': sum(e['to'] == 'STRESS' and not e['stress_entry_observed_joint_conjunction'] for e in entries),
        'missing_change': sum(e['missing_change'] for e in entries),
    }
    return {'transitions': n, 'counts': counts, 'fractions_of_transitions': {k: fraction(v, n) for k, v in counts.items()},
            'categories': dict(sorted(collections.Counter(c for e in entries for c in e['categories']).items())),
            'changed_pillar_frequency': dict(sorted(collections.Counter(p for e in entries for p in e['changed_pillars']).items())),
            'changed_atomic_predicate_frequency': dict(sorted(collections.Counter(c['predicate_id'] for e in entries for c in e['changed_raw_conditions']).items())),
            'dependency_unit_patterns': dict(sorted(collections.Counter('|'.join(e['independent_dependency_units_with_predicate_change']) for e in entries).items()))}


def stress_report(rows, parameters):
    episodes = []
    for run in runs_for(rows):
        if run['state'] != 'STRESS':
            continue
        a, b = run['start_index'], run['end_index']
        before = rows[a - 1] if a > 0 and adjacent(rows[a - 1], rows[a]) else None
        after = rows[b + 1] if b + 1 < len(rows) and adjacent(rows[b], rows[b + 1]) else None
        during = [stress_evidence(r, parameters) for r in rows[a:b + 1]]
        if run['sessions'] == 1 and (run['left_censored'] or run['right_censored']):
            kind = 'INDETERMINATE'
            interpretation = 'The observed single session touches a censored edge; the true observed episode duration is not known within this subperiod.'
        elif run['sessions'] == 1 and (during[0]['joint_stress_conjunction'] or (during[0]['absolute_stress_level'] and during[0]['fast_volatility'])):
            kind = 'ONE_DAY_REAL_SHOCK'
            interpretation = 'A frozen fast-volatility threshold is observed alongside either the frozen joint stress conjunction or the absolute stress level. REAL refers to measured source movements; no claim of latent economic truth or prediction.'
        elif run['sessions'] == 1 and before is not None and after is not None and during[0]['absolute_stress_level'] and not during[0]['joint_stress_conjunction'] and not during[0]['fast_volatility'] and before['features']['vix'] < parameters['v_stress'] and after['features']['vix'] < parameters['v_stress']:
            kind = 'ONE_DAY_THRESHOLD_OSCILLATION'
            interpretation = 'Only the absolute stress-level branch is satisfied, with VIX below that level on the adjacent sessions. This identifies a threshold reversal, not noise or economic irrelevance.'
        elif run['sessions'] == 1:
            kind = 'INDETERMINATE'
            interpretation = 'Evidence cannot support either registered descriptive one-session pattern.'
        else:
            kind = 'MULTI_SESSION_STRESS'
            interpretation = 'Consecutive contractual stress observations; duration alone says nothing about correctness.'
        trigger_subtype = 'JOINT_STRESS_CONJUNCTION' if during[0]['joint_stress_conjunction'] else ('ABSOLUTE_STRESS_WITH_FAST_MOMENTUM' if during[0]['absolute_stress_level'] and during[0]['fast_volatility'] else 'ABSOLUTE_STRESS_LEVEL_WITHOUT_FAST_MOMENTUM')
        episodes.append({**run, 'preceding_regime': before['regime'] if before else None, 'following_regime': after['regime'] if after else None, 'entry_trigger_subtype': trigger_subtype,
                         'classification': kind, 'interpretation': interpretation, 'before': stress_evidence(before, parameters), 'during': during, 'after': stress_evidence(after, parameters),
                         'peak_vix': max(during, key=lambda r: r['vix_level'])['vix_level'], 'absolute_level_sessions': sum(r['absolute_stress_level'] for r in during),
                         'joint_conjunction_sessions': sum(r['joint_stress_conjunction'] for r in during),
                         'fully_normalized_after': after is not None and after['pillarStates']['volatility'] == 'BENIGN'})
    return {'stress_sessions': sum(e['sessions'] for e in episodes), 'episodes': len(episodes), 'duration': duration_summary(episodes),
            'classification_counts': dict(sorted(collections.Counter(e['classification'] for e in episodes).items())),
            'preceding_regime_counts': dict(sorted(collections.Counter(e['preceding_regime'] or 'UNOBSERVED' for e in episodes).items())),
            'following_regime_counts': dict(sorted(collections.Counter(e['following_regime'] or 'UNOBSERVED' for e in episodes).items())),
            'one_day_following_volatility_state': dict(sorted(collections.Counter(e['after']['pillar_states']['volatility'] if e['after'] else 'UNOBSERVED' for e in episodes if e['sessions'] == 1).items())),
            'episodes_detail': episodes}


def main():
    protocol = load(BASE / 'analysis-protocol.json')
    parameters = load(P8 / 'parameter-manifest.json')['scalar_thresholds']
    actual = load(SWEEPER / 'historical-r2-output.json')
    feature_doc = load(P8 / 'historical-features-r2.json')
    historical = feature_doc['rows']
    assert feature_doc['replay_class'] == 'R2'
    assert len(actual) == len(historical) == 1930
    assert [r['date'] for r in actual] == [r['date'] for r in historical]
    assert len(set(r['date'] for r in actual)) == len(actual)
    assert [r['date'] for r in actual] == sorted(r['date'] for r in actual)
    assert all(r['replayClass'] == 'R2' for r in actual)
    assert all(r['regime'] in STATES for r in actual)
    assert all(not r['missing_reasons'] for r in historical)
    rows = [{**a, 'features': h['features'], 'missing_reasons': h['missing_reasons'], 'session_index': i} for i, (a, h) in enumerate(zip(actual, historical))]
    sources = {str(p.relative_to(BASE.parent.parent.parent)): digest(p) for p in [SWEEPER / 'historical-r2-output.json', P8 / 'historical-features-r2.json', P8 / 'parameter-manifest.json', BASE / 'analysis-protocol.json']}
    common = {'analysis_version': 'groweer-forensics/1.0.0', 'replay_class': 'R2', 'point_in_time_oos_claim': False,
              'scope': 'Post-selection analysis of previously inspected R2 data; accepted Sweeper public API output joins frozen P8 numeric evidence by exact date.',
              'sources_sha256': sources, 'canonical_engine_modified': False, 'parameters_changed': False,
              'calendar': 'SPY observed session ordering inherited from the accepted complete 1930-row replay; adjacent eligible session indices only. Weekends/holidays are not missing sessions. A missing eligible row breaks pairs.',
              'duration_censoring': 'First/last observed runs and runs at missing/gap edges are censored. Observed durations are lower bounds for censored runs; uncensored summaries are also reported.',
              'risk_context_caveat': 'Trailing realized volatility and input-feature distributions describe contemporaneous context. They are endogenous and are neither future outcomes nor independent evidence of predictive utility.'}
    periods = {k: v for k, v in protocol['periods'].items() if k != 'annual'}
    periods.update({f'YEAR_{year}': [f'{year}-01-01', f'{year}-12-31'] for year in range(2019, 2027)})
    baseline_periods = {}
    transition_periods = {}
    stress_periods = {}
    for name, bounds in periods.items():
        part = [r for r in rows if bounds[0] <= r['date'] <= bounds[1]]
        baseline_periods[name] = metrics(part)
        transition_periods[name] = transition_summary(transitions(part, parameters))
        stress_periods[name] = stress_report(part, parameters)
    f3_old = load(P8 / 'F3-test.json')
    old_metrics = f3_old.get('metrics', {})
    actual_f3 = baseline_periods['F3_TEST']
    assert actual_f3['sessions'] == old_metrics['decisions']
    assert actual_f3['transition_count'] == old_metrics['transitions']
    assert actual_f3['turnover'] == old_metrics['turnover']
    assert actual_f3['duration']['observed']['median'] == old_metrics['median_run_sessions']
    assert actual_f3['flip_flops']['2']['count'] == old_metrics['flip_flop_count']
    assert actual_f3['flip_flops']['2']['per_adjacent_eligible_pair'] == old_metrics['flip_flop_per_adjacent_pair']
    assert actual_f3['duration_by_regime']['STRESS']['observed']['median'] == old_metrics['median_run_by_state']['STRESS']
    assert actual_f3['occupancy'] == old_metrics['occupancy']
    for m in baseline_periods.values():
        assert sum(m['occupancy'].values()) == m['eligible_sessions']
        assert sum(sum(r.values()) for r in m['transition_matrix_including_self'].values()) == m['adjacent_eligible_pairs']
        assert sum(m['transition_matrix_including_self'][a][b] for a in STATES for b in STATES if a != b) == m['transition_count']
        assert sum(r['sessions'] for r in m['runs']) == m['eligible_sessions']
        assert all(m['flip_flops'][str(a)]['count'] <= m['flip_flops'][str(b)]['count'] for a, b in [(1, 2), (2, 3), (3, 5)])
    hand_rows = [{'date': str(i), 'regime': value, 'session_index': i} for i, value in enumerate(['A', 'A', 'B', 'A', 'A'])]
    hand_runs = runs_for(hand_rows)
    assert [r['sessions'] for r in hand_runs] == [2, 1, 2]
    assert [(r['left_censored'], r['right_censored']) for r in hand_runs] == [(True, False), (False, False), (False, True)]
    gap_rows = [{'date': str(i), 'regime': value, 'session_index': i} for i, value in [(0, 'A'), (1, None), (2, 'A'), (4, 'A')]]
    assert [r['sessions'] for r in runs_for(gap_rows)] == [1, 1, 1]
    baseline = {**common, 'state_order_is_display_only': STATES, 'periods': baseline_periods,
                'headline_scope': 'ALL for Groweer baseline; F3_TEST is separately reported and reconciled to the original P8 headline.',
                'metric_definitions': protocol['metrics'], 'p8_F3_test_reconciliation': {'frozen_file_sha256': digest(P8 / 'F3-test.json'), 'frozen_metrics': old_metrics,
                  'groweer_turnover': baseline_periods['F3_TEST']['turnover'], 'groweer_median_duration': baseline_periods['F3_TEST']['duration']['observed']['median'],
                  'groweer_flip_flop_k2': baseline_periods['F3_TEST']['flip_flops']['2']['per_adjacent_eligible_pair'],
                  'groweer_stress_median_duration': baseline_periods['F3_TEST']['duration_by_regime']['STRESS']['observed']['median']},
                'interpretation': [
                    'A short run or quick reversal is a descriptive instability measure, not evidence that the observation was noisy.',
                    'Broad/selective labels encode participation and leadership. Similar trailing realized volatility is not a failed discrimination test of that intended distinction.',
                    'Pillar transition counts include changes on days when the final regime remains unchanged; they measure a different object from regime turnover.',
                    'Every ordered regime pair is treated nominally. Direct risk-on/defensive/stress jumps are counted without inventing ordinal distances.',
                ]}
    all_transitions = transitions(rows, parameters)
    assert len(all_transitions) == baseline_periods['ALL']['transition_count']
    assert all(e['atomic_predicates_changed'] for e in all_transitions), 'Unexplained transition: atomic contract map incomplete.'
    transition_doc = {**common, 'classification_rules': protocol['transition_forensics'], 'atomic_threshold_count': len(specs(parameters)),
                      'signed_distance_definition': 'raw value minus threshold in the named native unit. The operator is stored separately; negative signed distance does not universally mean adverse.',
                      'marginality_definition': protocol['metrics']['marginal'],
                      'marginality_limitation': 'Endpoint proximity annotation is not an attribution of noise. Marginal flags overlap shocks, multiple-condition changes and joint rules; fractions must not be added. Integer bands make adjacent count crossings mechanically common.',
                      'joint_rule_definition': 'At least one side uses R02/R03/R04/R05, rules that combine named pillars; does not establish that all jointly required predicates changed on the transition.',
                      'changed_pillars_excludes_derived_equity': True,
                      'unit_dependency_note': 'Participation, leadership and fragility all map to the same equity_price_complex unit. Volatility and curve map to implied_volatility_complex. Changed pillars are not independent votes.',
                      'periods': transition_periods, 'transitions': all_transitions,
                      'external_noise_vs_legitimate_truth': 'INDETERMINATE; descriptive observed evidence changes are measurable, but no independent contemporaneous truth labels exist.'}
    stress_doc = {**common, 'stress_definition': 'VIX >= 35 OR (VIX >= 25 AND (jump_1 >= 10 OR jump_5 >= 20) AND VX slope <= -5), C03 tolerance 1e-10.',
                  'one_day_classification_definitions': {
                      'ONE_DAY_REAL_SHOCK': 'Observed fast momentum plus either the frozen joint stress conjunction or absolute VIX stress level. The entry trigger subtype distinguishes them. The name describes measured source movements; economic truth is not proven.',
                      'ONE_DAY_THRESHOLD_OSCILLATION': 'One-session absolute-level-only stress without fast momentum, with VIX below 35 on both adjacent observations; not classified as false alarm or noise.',
                      'INDETERMINATE': 'Neither pattern is supportable from available adjacent observations.',
                  }, 'periods': stress_periods,
                  'classification_refinement_note': 'Post-inspection descriptive clarification: an absolute-level-only rule path does not imply a small movement. The 2021-01-27 observation has VIX 37.21 and a 61.64% daily increase without the inverted-curve conjunction; it is explicitly retained as an observed absolute-level/momentum shock. This clarification changes no canonical condition, challenger rule or objective.',
                  'interpretation': ['A return from STRESS to DEFENSIVE is reduced contractual stress, not necessarily a normalized market.', 'Immediate stress entry remains a canonical requirement; a one-session event can be a legitimate observation.', 'Duration and observed input predicates do not identify whether a latent economic regime changed.']}
    save('baseline-characterization.json', baseline)
    save('transition-forensics.json', transition_doc)
    save('stress-forensics.json', stress_doc)
    print(json.dumps({'ALL': {k: baseline_periods['ALL'][k] for k in ['sessions', 'transition_count', 'turnover']},
                      'ALL_median_duration': baseline_periods['ALL']['duration']['observed']['median'], 'ALL_flip_flop_k2': baseline_periods['ALL']['flip_flops']['2']['per_adjacent_eligible_pair'],
                      'ALL_stress_median_duration': baseline_periods['ALL']['duration_by_regime']['STRESS']['observed']['median'],
                      'F3_TEST': {k: baseline['p8_F3_test_reconciliation'][k] for k in baseline['p8_F3_test_reconciliation'] if k.startswith('groweer')},
                      'transition_attribution': transition_periods['ALL'], 'stress': {k: stress_periods['ALL'][k] for k in ['stress_sessions', 'episodes', 'classification_counts', 'one_day_following_volatility_state']}}, indent=2))


if __name__ == '__main__':
    main()
