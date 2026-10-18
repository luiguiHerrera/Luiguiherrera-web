"""Runs the pre-registered P8 candidate protocol on retained R2 research data.

Selection is TRAIN-only and is written/sealed before validation/test are evaluated.
Research metrics do not become fields of a product regime or a hidden score.
"""
import collections
import copy
import datetime as dt
import hashlib
import json
import pathlib
import statistics
from historical_data import History
from reference_model import classify_features, validate_parameters, TABLE

BASE = pathlib.Path(__file__).resolve().parent
P = json.loads((BASE / 'selection-protocol.json').read_text())
FREEZE = json.loads((BASE / 'protocol-freeze.json').read_text())
assert hashlib.sha256((BASE / 'selection-protocol.json').read_bytes()).hexdigest() == FREEZE['protocol_sha256']


def save(name, data):
    (BASE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def subset(rows, dates):
    return [row for row in rows if dates[0] <= row['date'] <= dates[1]]


def outputs(rows, parameters):
    return [classify_features(row['features'], parameters, dimensions=False) for row in rows]


def metrics(rows, results):
    series = [row['regime'] for row in results]
    occupancy = dict.fromkeys(TABLE['regime_vocabulary'], 0)
    for value in series:
        if value is not None:
            occupancy[value] += 1
    runs = []
    for i, value in enumerate(series):
        if value is None:
            continue
        if i > 0 and series[i-1] == value:
            runs[-1]['sessions'] += 1
            runs[-1]['end'] = rows[i]['date']
            runs[-1]['end_index'] = i
        else:
            runs.append({'state': value, 'sessions': 1, 'start': rows[i]['date'], 'end': rows[i]['date'], 'start_index': i, 'end_index': i, 'left_censored': i == 0 or series[i-1] is None})
    for run in runs:
        j = run['end_index']
        run['right_censored'] = j == len(series)-1 or series[j+1] is None
    pairs = [(series[i-1], series[i]) for i in range(1, len(series)) if series[i-1] is not None and series[i] is not None]
    changes = sum(a != b for a, b in pairs)
    reversals = sum(a['state'] == c['state'] and b['sessions'] <= 2 and a['end_index']+1 == b['start_index'] and b['end_index']+1 == c['start_index'] for a, b, c in zip(runs, runs[1:], runs[2:]))
    complete = sum(value is not None for value in series)
    missing = len(series)-complete
    per_pillar = {key: dict(collections.Counter(row['pillar_states'][key] for row in results)) for key in ('participation','leadership','equity','volatility','fragility')}
    return {'decisions': len(rows), 'complete': complete, 'missing': missing,
            'occupancy': occupancy, 'occupancy_fraction_of_classifiable': {key: value/complete if complete else None for key, value in occupancy.items()},
            'max_single_regime_occupancy': max(occupancy.values())/complete if complete else None,
            'adjacent_eligible_pairs': len(pairs), 'transitions': changes, 'turnover': changes/len(pairs) if pairs else None,
            'flip_flop_count': reversals, 'flip_flop_per_adjacent_pair': reversals/len(pairs) if pairs else None,
            'median_run_sessions': statistics.median(run['sessions'] for run in runs) if runs else None,
            'runs': len(runs), 'censored_runs': sum(run['left_censored'] or run['right_censored'] for run in runs),
            'median_run_by_state': {state: statistics.median(run['sessions'] for run in runs if run['state']==state) if any(run['state']==state for run in runs) else None for state in occupancy},
            'historically_observed': [key for key, value in occupancy.items() if value],
            'historically_absent_not_raw_unreachable': [key for key, value in occupancy.items() if not value], 'pillar_occupancy': per_pillar}


def sensitivity(rows, candidate, reference):
    results = []
    for key, value in candidate.items():
        for direction in (-1, 1):
            altered = copy.deepcopy(candidate)
            altered[key] = value + direction if key.startswith('k_') else value*(1+.1*direction)
            if not validate_parameters(altered):
                continue
            changed = outputs(rows, altered)
            pairs = [(a['regime'], b['regime']) for a, b in zip(reference, changed) if a['regime'] is not None and b['regime'] is not None]
            results.append({'parameter': key, 'direction': direction, 'value': altered[key],
                            'comparison_decisions': len(pairs), 'changed_regime_count': sum(a != b for a, b in pairs),
                            'disagreement': sum(a != b for a, b in pairs)/len(pairs) if pairs else None})
    values = [row['disagreement'] for row in results if row['disagreement'] is not None]
    return {'median_disagreement': statistics.median(values) if values else None, 'worst_disagreement': max(values) if values else None, 'perturbations': results}


def qualification(m, s, phase):
    q = P['qualification_criteria']
    failures = []
    if m['complete'] < P['minimum_complete_decisions'][phase]:
        failures.append('INSUFFICIENT_COMPLETE_DECISIONS')
    for name, value, bound, minimum in [
        ('OCCUPANCY', m['max_single_regime_occupancy'], q['max_single_regime_occupancy'], False),
        ('PERSISTENCE', m['median_run_sessions'], q['median_run_sessions_minimum'], True),
        ('TURNOVER', m['turnover'], q['turnover_maximum'], False),
        ('FLIP_FLOP', m['flip_flop_per_adjacent_pair'], q['flip_flop_per_adjacent_pair_maximum'], False),
        ('SENSITIVITY_MEDIAN', s['median_disagreement'], q['sensitivity_median_disagreement_maximum'], False),
        ('SENSITIVITY_WORST', s['worst_disagreement'], q['sensitivity_worst_disagreement_maximum'], False),
    ]:
        if value is None or (value < bound if minimum else value > bound):
            failures.append(name)
    return failures


def yearly(rows, candidate):
    result = {}
    for year in sorted({row['date'][:4] for row in rows}):
        part = [row for row in rows if row['date'].startswith(year)]
        result[year] = metrics(part, outputs(part, candidate))
    return result


def main():
    if any(BASE.glob('F*-test.json')) or any(BASE.glob('F*-training-selection.json')):
        raise SystemExit('Sealed results already exist. Do not overwrite or retune. Reproduce in a separate copy without phase outputs.')
    history = History()
    features = history.features()
    save('source-data-audit.json', history.audit)
    save('historical-features-r2.json', {'replay_class': 'R2', 'source_manifest_sha256': hashlib.sha256((BASE/'acquisition.json').read_bytes()).hexdigest(), 'rows': features})
    report = {'scope': 'R2_RESEARCH_QUALIFICATION_NOT_STRICT_PIT_OOS', 'protocol_sha256': FREEZE['protocol_sha256'], 'folds': []}
    for fold in P['folds']:
        train = subset(features, fold['train'])
        candidates = []
        for candidate in P['candidate_grid']:
            predicted = outputs(train, candidate['parameters'])
            m = metrics(train, predicted)
            s = sensitivity(train, candidate['parameters'], predicted)
            failures = qualification(m, s, 'train')
            candidates.append({'id': candidate['id'], 'metrics': m, 'sensitivity': s, 'failures': failures, 'qualified_train_r2': not failures})
        eligible = [candidate for candidate in candidates if candidate['qualified_train_r2']]
        winner = min(eligible, key=lambda c: (c['sensitivity']['worst_disagreement'], c['metrics']['turnover'], c['metrics']['flip_flop_per_adjacent_pair'], c['id'])) if eligible else None
        selection = {'fold': fold, 'selected_id': winner['id'] if winner else None, 'selected_on': 'TRAIN_ONLY', 'candidates': candidates,
                     'protocol_sha256': FREEZE['protocol_sha256'], 'sealed_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                     'limitations': ['R2, not strict PIT OOS', 'Policy acceptance bands are preregistered research criteria, not statistical confidence limits']}
        save(f"{fold['id']}-training-selection.json", selection)
        selection_hash = hashlib.sha256((BASE/f"{fold['id']}-training-selection.json").read_bytes()).hexdigest()
        # No validation/test calculations appear above the training seal.
        validation = subset(features, fold['validation'])
        comparisons = []
        for candidate in P['candidate_grid']:
            prediction = outputs(validation, candidate['parameters'])
            m = metrics(validation, prediction)
            s = sensitivity(validation, candidate['parameters'], prediction)
            comparisons.append({'id': candidate['id'], 'metrics': m, 'sensitivity': s, 'failures': qualification(m, s, 'validation')})
        vresult = {'training_selection_sha256': selection_hash, 'selected_id_unchanged': selection['selected_id'], 'comparisons': comparisons, 'sealed_at': dt.datetime.now(dt.timezone.utc).isoformat()}
        save(f"{fold['id']}-validation.json", vresult)
        vhash = hashlib.sha256((BASE/f"{fold['id']}-validation.json").read_bytes()).hexdigest()
        final = {'status': 'NOT_RUN_NO_TRAINING_SELECTION', 'validation_sha256': vhash}
        if winner:
            parameters = next(candidate['parameters'] for candidate in P['candidate_grid'] if candidate['id'] == winner['id'])
            test = subset(features, fold['test'])
            predicted = outputs(test, parameters)
            m = metrics(test, predicted)
            s = sensitivity(test, parameters, predicted)
            diagnostics = {}
            for state in TABLE['regime_vocabulary']:
                rows = [row['features'] for row, output in zip(test, predicted) if output['regime'] == state]
                diagnostics[state] = {'n': len(rows), 'median_trailing_realized_vol_21': statistics.median(row['realized_vol_21'] for row in rows) if rows else None,
                                      'median_vix': statistics.median(row['vix'] for row in rows) if rows else None, 'role': 'POST_SELECTION_ENDOGENOUS_DIAGNOSTIC_NOT_OBJECTIVE'}
            final = {'status': 'EVALUATED_ONCE_AFTER_SEALS', 'validation_sha256': vhash, 'selected_id_unchanged': winner['id'], 'metrics': m, 'sensitivity': s,
                     'failures': qualification(m, s, 'test'), 'regime_differentiation': diagnostics, 'annual_stability': yearly(test, parameters)}
        save(f"{fold['id']}-test.json", final)
        report['folds'].append({'fold': fold, 'train_complete': candidates[0]['metrics']['complete'], 'selected_id': selection['selected_id'],
                               'eligible_candidates': [c['id'] for c in eligible], 'validation_failures_selected': next((row['failures'] for row in comparisons if row['id'] == selection['selected_id']), None),
                               'test_failures_selected': final.get('failures'), 'test_status': final['status'], 'training_selection_sha256': selection_hash, 'validation_sha256': vhash})
    save('qualification-results.json', report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
