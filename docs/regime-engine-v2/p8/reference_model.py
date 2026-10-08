"""Offline executable P8 specification. NOT an application/production engine.

Only inputs supplied by the research harness are read. No network, clock, UI,
application imports, caches, implicit source fallback or trade outputs.
"""
import datetime as dt
import itertools
import json
import math
import pathlib
import re
import numpy as np

BASE = pathlib.Path(__file__).resolve().parent
TABLE = json.loads((BASE.parent / 'decision-table.json').read_text())
GROUPS = {'growth': ['XLK', 'XLY', 'XLC'], 'cyclical': ['XLF', 'XLE', 'XLI', 'XLB'], 'defensive': ['XLV', 'XLP', 'XLU', 'XLRE']}
TICKERS = sum(GROUPS.values(), [])
PRICE_BASIS = 'SPLIT_DIVIDEND_ADJUSTED_CLOSE'
NUMERIC_TOLERANCE = 1e-10  # Equality of floating transforms at a mathematical boundary; no market dead band.


def ge(value, bound):
    return value > bound or math.isclose(value, bound, rel_tol=0, abs_tol=NUMERIC_TOLERANCE)


def le(value, bound):
    return value < bound or math.isclose(value, bound, rel_tol=0, abs_tol=NUMERIC_TOLERANCE)


def finite(value):
    return isinstance(value, (int, float, np.floating)) and not isinstance(value, bool) and math.isfinite(value)


def instant(value):
    if not isinstance(value, str):
        raise ValueError('Missing timestamp')
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp without timezone')
    return parsed.astimezone(dt.timezone.utc)


def valid_date(value):
    try:
        return isinstance(value, str) and dt.date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def admissible(record, packet, raw):
    if record.get('status', packet.get('status', 'AVAILABLE')) != 'AVAILABLE':
        return False
    date = record.get('observation_date', record.get('date'))
    if not valid_date(date) or date > raw['target_session']:
        return False
    if raw['mode'] == 'R2':
        return True  # Explicit observation-date reconstruction; never represents PIT eligibility.
    if raw['mode'] not in {'R0', 'R1', 'SYNTHETIC'}:
        return False
    available = record.get('available_at', packet.get('available_at'))
    certainty = record.get('availability_certainty', packet.get('availability_certainty', 'UNKNOWN'))
    end = record.get('observation_end_at', packet.get('observation_end_at'))
    try:
        return certainty in {'EXACT', 'CONSERVATIVE_BOUND'} and instant(available) <= instant(raw['as_of']) and instant(end) <= instant(raw['as_of'])
    except (ValueError, TypeError):
        return False


def window(packet, raw, count, field, expected_basis=None):
    if not packet or packet.get('status', 'AVAILABLE') != 'AVAILABLE':
        return None
    if expected_basis and (packet.get('price_basis') != expected_basis or packet.get('currency') != 'USD'):
        return None
    wanted = raw['expected_sessions'][-count:]
    if len(wanted) != count:
        return None
    rows = {}
    for row in packet.get('rows', []):
        if not admissible(row, packet, raw):
            continue
        date = row.get('observation_date', row.get('date'))
        if date not in wanted:
            continue
        if date in rows and rows[date] != row:
            return None
        rows[date] = row
    if set(rows) != set(wanted):
        return None
    values = []
    for date in wanted:
        row = rows[date]
        value = row.get(field)
        if not finite(value) or value <= 0:
            return None
        if expected_basis and row.get('price_basis', expected_basis) != expected_basis:
            return None
        values.append(value)
    return np.array(values, dtype=float)


def extract(raw):
    """Features from raw series with dates. Incomplete windows retain None."""
    f = {key: None for key in ['positive_5', 'positive_21', 'leadership_gap', 'rho21', 'rho63', 'corr_spread', 'vix', 'jump_1', 'jump_5', 'slope', 'realized_vol_21']}
    reasons = []
    if not valid_date(raw.get('target_session')) or not raw.get('expected_sessions') or raw['expected_sessions'][-1] != raw['target_session']:
        return f, ['INVALID_SESSION_CONTRACT']
    if raw['expected_sessions'] != sorted(set(raw['expected_sessions'])):
        return f, ['INVALID_SESSION_ORDER']
    panels = {}
    for size in (22, 64):
        values = [window(raw.get('equity', {}).get(ticker), raw, size, 'adjusted_close', PRICE_BASIS) for ticker in TICKERS]
        panels[size] = np.column_stack(values) if all(value is not None for value in values) else None
    if panels[22] is not None:
        x = panels[22]
        r5 = (x[-1] / x[-6] - 1) * 100
        r21 = (x[-1] / x[-22] - 1) * 100
        f['positive_5'] = int(np.sum(r5 > 0))
        f['positive_21'] = int(np.sum(r21 > 0))
        means = {group: float(np.mean([r21[TICKERS.index(ticker)] for ticker in members])) for group, members in GROUPS.items()}
        f['leadership_gap'] = max(means['growth'], means['cyclical']) - means['defensive']
        f['group_returns_21'] = means
        f['returns_5'] = dict(zip(TICKERS, map(float, r5)))
        f['returns_21'] = dict(zip(TICKERS, map(float, r21)))
    else:
        reasons.append('EQUITY_22_CLOSES_UNAVAILABLE')
    if panels[64] is not None:
        returns = panels[64][1:] / panels[64][:-1] - 1
        if np.all(np.var(returns[-21:], axis=0) > 0) and np.all(np.var(returns, axis=0) > 0):
            pairs = np.triu_indices(11, 1)
            f['rho21'] = float(np.corrcoef(returns[-21:].T)[pairs].mean())
            f['rho63'] = float(np.corrcoef(returns.T)[pairs].mean())
            f['corr_spread'] = f['rho21'] - f['rho63']
            f['realized_vol_21'] = float(np.std(returns[-21:].mean(axis=1), ddof=1) * np.sqrt(252) * 100)
        else:
            reasons.append('DEGENERATE_CORRELATION')
    else:
        reasons.append('EQUITY_64_CLOSES_UNAVAILABLE')
    v = window(raw.get('vix'), raw, 6, 'value')
    if v is not None and raw.get('vix', {}).get('series_type') == 'OFFICIAL_VIX_INDEX':
        f.update(vix=float(v[-1]), jump_1=float(100 * (v[-1] / v[-2] - 1)), jump_5=float(100 * (v[-1] / v[-6] - 1)))
    else:
        reasons.append('VIX_WINDOW_UNAVAILABLE')
    packet = raw.get('vx', {})
    if packet.get('series_type') == 'OFFICIAL_MONTHLY_VX_SETTLEMENT' and packet.get('observation_date') == raw['target_session'] and admissible(packet, packet, raw):
        contracts = sorted([row for row in packet.get('contracts', []) if re.fullmatch(r'VX/[FGHJKMNQUVXZ][0-9]', str(row.get('symbol'))) and valid_date(row.get('expiration_date')) and row['expiration_date'] > raw['target_session']], key=lambda row: row['expiration_date'])
        expirations = [row['expiration_date'] for row in contracts]
        expected = packet.get('expected_contracts', [])
        identity = lambda row: (row.get('symbol'), row.get('expiration_date'))
        catalog_matches = len(expected) >= 2 and list(map(identity, contracts[:2])) == list(map(identity, expected[:2]))
        if catalog_matches and len(contracts) >= 2 and len(set(expirations)) == len(expirations):
            first, second = contracts[:2]
            values = [first.get('settlement'), second.get('settlement')]
            if all(finite(value) and value > 0 for value in values):
                f['slope'] = 100 * (values[1] / values[0] - 1)
    if f['slope'] is None:
        reasons.append('VX_NEAR_CONTRACTS_UNAVAILABLE')
    return f, reasons


def participation(f, p):
    if f['positive_5'] is None or f['positive_21'] is None:
        return 'UNAVAILABLE'
    if min(f['positive_5'], f['positive_21']) >= p['k_broad']:
        return 'FAVORABLE'
    if max(f['positive_5'], f['positive_21']) <= p['k_weak']:
        return 'ADVERSE'
    return 'MIXED'


def leadership(f, p):
    gap = f['leadership_gap']
    if gap is None:
        return 'UNAVAILABLE'
    if ge(gap, p['leadership_gap']):
        return 'FAVORABLE'
    if le(gap, -p['leadership_gap']):
        return 'ADVERSE'
    return 'MIXED'


def equity(a, b):
    if 'UNAVAILABLE' in (a, b):
        return 'UNAVAILABLE'
    if a == b == 'FAVORABLE':
        return 'FAVORABLE'
    if 'ADVERSE' in (a, b) and 'FAVORABLE' not in (a, b):
        return 'ADVERSE'
    return 'MIXED'


def volatility(f, p):
    if any(f[key] is None for key in ('vix', 'jump_1', 'jump_5', 'slope')):
        return 'UNAVAILABLE'
    fast = ge(f['jump_1'], p['jump_1']) or ge(f['jump_5'], p['jump_5'])
    inverted = le(f['slope'], -p['curve_adverse'])
    if ge(f['vix'], p['v_stress']) or (ge(f['vix'], p['v_adverse']) and fast and inverted):
        return 'STRESS'
    if ge(f['vix'], p['v_adverse']) or inverted:
        return 'ADVERSE'
    if ge(f['vix'], p['v_watch']) or fast or le(f['slope'], p['curve_flat']):
        return 'WATCH'
    return 'BENIGN'


def fragility(f, p):
    if any(f[key] is None for key in ('rho21', 'rho63', 'corr_spread')):
        return 'UNAVAILABLE'
    if ge(f['rho21'], p['rho_high']):
        return 'HIGH'
    if ge(f['rho21'], p['rho_floor']) and ge(f['corr_spread'], p['delta_rising']):
        return 'RISING'
    return 'LOW'


def decide(states):
    values = dict(states, equity=equity(states['participation'], states['leadership']))
    for rule in TABLE['rules']:
        if all(any(values[key] == 'UNAVAILABLE' for key in allowed) if field == 'any_unavailable' else values[field] in allowed for field, allowed in rule['when'].items()):
            return {'regime': rule['regime'], 'reading_status': rule['reading_status'], 'rule_id': rule['id']}
    raise AssertionError('Uncovered frozen table')


def dimension_outputs(states):
    a = equity(states['participation'], states['leadership'])
    c = states['fragility']
    eq = None if a == 'UNAVAILABLE' or c == 'UNAVAILABLE' else 'MIXED' if a == 'FAVORABLE' and c == 'HIGH' else 'ADVERSE' if a == 'ADVERSE' or c == 'HIGH' else 'FAVORABLE' if a == 'FAVORABLE' and c == 'LOW' else 'MIXED'
    vol = {'BENIGN': 'FAVORABLE', 'WATCH': 'MIXED', 'ADVERSE': 'ADVERSE', 'STRESS': 'ADVERSE', 'UNAVAILABLE': None}[states['volatility']]
    concordance = None if None in (eq, vol) else 'MEDIUM' if 'MIXED' in (eq, vol) else 'HIGH' if eq == vol else 'LOW'
    alternatives = []
    for name, state in states.items():
        alternatives.append(['FAVORABLE', 'MIXED', 'ADVERSE'] if name in ('participation', 'leadership') and state == 'MIXED' else ['BENIGN', 'WATCH', 'ADVERSE'] if name == 'volatility' and state == 'WATCH' else ['LOW', 'RISING', 'HIGH'] if name == 'fragility' and state == 'RISING' else [state])
    regimes = set() if 'UNAVAILABLE' in states.values() else {decide(dict(zip(states, row)))['regime'] for row in itertools.product(*alternatives)}
    plausible = [state for state in TABLE['regime_vocabulary'] if state in regimes]
    ambiguity = None if not plausible else 'LOW' if len(plausible) == 1 else 'MEDIUM' if len(plausible) == 2 else 'HIGH'
    return {'concordance': concordance, 'uncertainty': ambiguity, 'plausible_regimes': plausible, 'family_descriptors': {'equity_price_complex': eq, 'implied_volatility_complex': vol}}


def classify_features(f, p, dimensions=True):
    states = {'participation': participation(f, p), 'leadership': leadership(f, p), 'volatility': volatility(f, p), 'fragility': fragility(f, p)}
    result = dict(decide(states), pillar_states=dict(states, equity=equity(states['participation'], states['leadership'])))
    if dimensions:
        result.update(dimension_outputs(states))
    return result


def evaluate_raw(raw, p):
    f, reasons = extract(raw)
    result = classify_features(f, p)
    result.update(features=f, missing_reasons=reasons, replay_class=raw['mode'], core_family_count=sum(value is not None for value in result['family_descriptors'].values()))
    return result


def validate_parameters(p):
    return (isinstance(p['k_weak'], int) and isinstance(p['k_broad'], int) and 0 <= p['k_weak'] < p['k_broad'] <= 11 and p['k_broad'] - p['k_weak'] >= 2 and p['leadership_gap'] > 0 and 0 < p['v_watch'] < p['v_adverse'] < p['v_stress'] and p['jump_1'] > 0 and p['jump_5'] > 0 and 0 <= p['curve_flat'] < p['curve_adverse'] and 0 <= p['rho_floor'] < p['rho_high'] < 1 and p['delta_rising'] > 0)
