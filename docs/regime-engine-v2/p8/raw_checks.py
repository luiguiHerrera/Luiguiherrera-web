"""Deterministic source-series witnesses. Runs only inside the research package."""
import copy
import datetime as dt
import gzip
import hashlib
import json
import math
import pathlib
import numpy as np
from reference_model import TICKERS, PRICE_BASIS, evaluate_raw, validate_parameters
from historical_data import adjusted_value

BASE = pathlib.Path(__file__).resolve().parent
GRID = json.loads((BASE/'selection-protocol.json').read_text())['candidate_grid']
EPS = 1e-7


def innovations(n, rho):
    # Orthogonal, centered columns with sample variance one. The covariance
    # matrix is constructed from real return series and is necessarily PSD.
    z = np.cos(np.pi * (np.arange(n)[:, None]+.5) * np.arange(1, 13)[None, :] / n)
    z *= math.sqrt(2*(n-1)/n)
    return .00005 * (math.sqrt(rho)*z[:, :1] + math.sqrt(1-rho)*z[:, 1:])


def fixture(style='broad', rho_old=.1, rho_new=.1, count=None, gap=None):
    days = [dt.date(2025, 1, 1)+dt.timedelta(days=i) for i in range(120)]
    sessions = [day.isoformat() for day in days if day.weekday() < 5][:64]
    means = np.array({'broad': [.002]*3+[.0015]*4+[.0002]*4,
                      'selective': [.002]*3+[.0008]*2+[-.001]*6,
                      'transition': [-.001]*11,
                      'defensive': [-.002]*3+[-.0018]*4+[-.0002]*4}[style])
    if count is not None:
        means = np.array([.002]*count+[-.002]*(11-count))
    noise = np.vstack([innovations(42, rho_old), innovations(21, rho_new)])
    if gap is not None:
        # Solve raw daily drifts for a requested 21-session compounded gap.
        targets = [2+gap]*7+[2]*4
        for j, target in enumerate(targets):
            lo, hi = -.1, .1
            for _ in range(80):
                mu = (lo+hi)/2
                value = (np.prod(1+noise[-21:, j]+mu)-1)*100
                if value < target:
                    lo = mu
                else:
                    hi = mu
            means[j] = (lo+hi)/2
    returns = noise+means
    prices = np.vstack([np.full(11, 100.), 100*np.cumprod(1+returns, axis=0)])
    target = sessions[-1]
    common = {'status': 'AVAILABLE', 'source_published_at': None,
              'available_at': target+'T21:30:00Z', 'captured_at': target+'T21:30:00Z',
              'observation_end_at': target+'T21:00:00Z', 'availability_certainty': 'CONSERVATIVE_BOUND'}
    equity = {ticker: dict(common, price_basis=PRICE_BASIS, currency='USD',
                           rows=[{'date': day, 'adjusted_close': float(prices[i,j])} for i,day in enumerate(sessions)])
              for j,ticker in enumerate(TICKERS)}
    contracts = [{'symbol': 'VX/J5', 'expiration_date': '2025-04-16', 'settlement': 20.},
                 {'symbol': 'VX/K5', 'expiration_date': '2025-05-21', 'settlement': 22.},
                 {'symbol': 'VX/M5', 'expiration_date': '2025-06-18', 'settlement': 23.}]
    return {'mode': 'SYNTHETIC', 'calendar_id': 'SYNTHETIC_WEEKDAY_SESSIONS_NOT_EXCHANGE_CALENDAR',
            'target_session': target, 'as_of': target+'T22:00:00Z', 'expected_sessions': sessions,
            'equity': equity,
            'vix': dict(common, series_type='OFFICIAL_VIX_INDEX', rows=[{'date': day, 'value': 15.} for day in sessions[-6:]]),
            'vx': dict(common, observation_date=target, series_type='OFFICIAL_MONTHLY_VX_SETTLEMENT', contracts=contracts,
                       expected_contracts=[{k:r[k] for k in ('symbol','expiration_date')} for r in contracts]),
            'satellites': {}}


def vlevel(raw, value):
    for row in raw['vix']['rows']:
        row['value'] = value


def slope(raw, value):
    raw['vx']['contracts'][1]['settlement'] = 20*(1+value/100)


def main():
    cases = []
    results = []
    def check(name, category, raw, p, expected, field='regime'):
        output = evaluate_raw(raw, p)
        actual = output['pillar_states'][field] if field in output['pillar_states'] else output.get(field)
        passed = actual == expected
        index = len(cases)
        cases.append({'id': name, 'category': category, 'parameters': p, 'raw': raw, 'expected_field': field, 'expected': expected})
        results.append({'id': name, 'category': category, 'fixture_index': index, 'passed': passed,
                        'expected': expected, 'actual': actual, 'output': output})
        return output

    for candidate in GRID:
        p, cid = candidate['parameters'], candidate['id']
        assert validate_parameters(p)
        for style, regime in [('broad','RISK_ON_BROAD'),('selective','RISK_ON_SELECTIVE'),('transition','TRANSITION'),('defensive','DEFENSIVE')]:
            raw = fixture(style, .9 if style=='defensive' else .1, .9 if style=='defensive' else .1)
            if style=='defensive':
                vlevel(raw, 28)
            check(cid+'-'+style, 'REGIME', raw, p, regime)
        raw = fixture(); vlevel(raw, 40)
        check(cid+'-stress','REGIME',raw,p,'STRESS')
        raw = fixture(); raw['equity']['XLK']['rows'][-1]['adjusted_close'] = None
        check(cid+'-incomplete','REGIME',raw,p,'INCOMPLETE','reading_status')
        for key in ('k_weak','k_broad'):
            for direction in (-1,0,1):
                n = p[key]+direction
                state = 'ADVERSE' if n<=p['k_weak'] else 'FAVORABLE' if n>=p['k_broad'] else 'MIXED'
                check(f'{cid}-{key}-{direction}', 'BOUNDARY', fixture(count=n),p,state,'participation')
        for sign in (-1,1):
            for direction in (-1,0,1):
                gap = sign*p['leadership_gap']+direction*EPS
                state = ('ADVERSE' if direction<=0 else 'MIXED') if sign<0 else ('MIXED' if direction<0 else 'FAVORABLE')
                check(f'{cid}-leadership-{sign}-{direction}','BOUNDARY',fixture(gap=gap),p,state,'leadership')
        for key, lower, upper in [('v_watch','BENIGN','WATCH'),('v_adverse','WATCH','ADVERSE'),('v_stress','ADVERSE','STRESS')]:
            for direction in (-1,0,1):
                raw=fixture(); vlevel(raw,p[key]+direction*EPS)
                check(f'{cid}-{key}-{direction}','BOUNDARY',raw,p,lower if direction<0 else upper,'volatility')
        for key, index in [('jump_1',-2),('jump_5',-6)]:
            for direction in (-1,0,1):
                raw=fixture(); raw['vix']['rows'][index]['value']=15/(1+(p[key]+direction*EPS)/100)
                check(f'{cid}-{key}-{direction}','BOUNDARY',raw,p,'BENIGN' if direction<0 else 'WATCH','volatility')
        for key in ('curve_flat','curve_adverse'):
            for direction in (-1,0,1):
                raw=fixture(); bound=p[key] if key=='curve_flat' else -p[key]; slope(raw,bound+direction*EPS)
                state = ('WATCH' if direction<=0 else 'BENIGN') if key=='curve_flat' else ('ADVERSE' if direction<=0 else 'WATCH')
                check(f'{cid}-{key}-{direction}','BOUNDARY',raw,p,state,'volatility')
        for direction in (-1,0,1):
            rho=p['rho_high']+direction*EPS
            check(f'{cid}-rho_high-{direction}','BOUNDARY',fixture(rho_old=rho,rho_new=rho),p,'LOW' if direction<0 else 'HIGH','fragility')
            rho=p['rho_floor']+direction*EPS
            check(f'{cid}-rho_floor-{direction}','BOUNDARY',fixture(rho_old=0,rho_new=rho),p,'LOW' if direction<0 else 'RISING','fragility')
            # Same variance and centered blocks give rho63=(41*rho_old+20*rho_new)/61.
            delta=p['delta_rising']+direction*EPS
            old=.6-delta*61/41
            check(f'{cid}-delta_rising-{direction}','BOUNDARY',fixture(rho_old=old,rho_new=.6),p,'LOW' if direction<0 else 'RISING','fragility')
        raw=fixture(); vlevel(raw,p['v_adverse']); slope(raw,-p['curve_adverse']); raw['vix']['rows'][-2]['value']=p['v_adverse']/(1+p['jump_1']/100)
        check(cid+'-joint-shock','JOINT',raw,p,'STRESS','volatility')
        for name in ['missing_price','zero_price','nonfinite_price','missing_date','wrong_basis','wrong_currency','mixed_basis',
                     'demo','fallback','stale','future_available','unknown_available','missing_vix','missing_vx1','removed_vx1',
                     'duplicate_conflict','degenerate','bad_calendar','missing_catalog','vx_wrong_field']:
            raw=fixture(); packet=raw['equity']['XLK']; last=packet['rows'][-1]
            if name=='missing_price': last['adjusted_close']=None
            if name=='zero_price': last['adjusted_close']=0
            if name=='nonfinite_price': last['adjusted_close']='NaN'
            if name=='missing_date': packet['rows'].pop(-3)
            if name=='wrong_basis': packet['price_basis']='UNADJUSTED_CLOSE'
            if name=='wrong_currency': packet['currency']='EUR'
            if name=='mixed_basis': last['price_basis']='UNADJUSTED_CLOSE'
            if name in ['demo','fallback','stale']: packet['status']=name.upper()
            if name=='future_available': packet['available_at']='2026-01-01T00:00:00Z'
            if name=='unknown_available': packet['availability_certainty']='UNKNOWN'
            if name=='missing_vix': raw['vix']['rows'].pop()
            if name=='missing_vx1': raw['vx']['contracts'][0]['settlement']=None
            if name=='removed_vx1': raw['vx']['contracts'].pop(0)
            if name=='duplicate_conflict': packet['rows'].append(dict(last,adjusted_close=123))
            if name=='degenerate':
                for row in packet['rows']: row['adjusted_close']=100
            if name=='bad_calendar': raw['expected_sessions'].append(raw['target_session'])
            if name=='missing_catalog': raw['vx'].pop('expected_contracts')
            if name=='vx_wrong_field':
                row=raw['vx']['contracts'][0]; row['close']=row.pop('settlement')
            check(cid+'-'+name,'MISSING',raw,p,'INCOMPLETE','reading_status')
        raw=fixture(); packet=raw['equity']['XLK']; packet['rows'].append(copy.deepcopy(packet['rows'][-1]))
        check(cid+'-duplicate-identical','DEPENDENCY',raw,p,2,'core_family_count')
        raw=fixture(); raw['derived_evidence']=[{'family':'equity_price_complex','state':'FAVORABLE','alias':str(i)} for i in range(100)]
        out=check(cid+'-duplicate-family','DEPENDENCY',raw,p,2,'core_family_count')
        assert out==evaluate_raw(fixture(),p)
        for extreme in (-1,0,1,None):
            raw=fixture()
            raw['satellites']={'btc':{'unit':'USD_MILLIONS','daily_total':None if extreme is None else extreme*1e9},
                               'gld':{'shares':None if extreme is None else [1e8,1e8+extreme*9e7], 'nav_usd':300}}
            out=check(cid+'-satellite-'+str(extreme),'SATELLITE',raw,p,'RISK_ON_BROAD')
            assert out==evaluate_raw(fixture(),p)
        raw=fixture('defensive',.9,.9); vlevel(raw,28)
        base=evaluate_raw(raw,p); raw['satellites']={'btc':{'daily_total':1e12},'gld':{'shares':[1,1e12]}}
        out=check(cid+'-satellite-defensive','SATELLITE',raw,p,'DEFENSIVE'); assert out==base

    # Native Yahoo corporate-action fixture: quoted split/dividend discontinuities
    # are not used as return prices; missing adjclose is never repaired by close.
    native={'indicators':{'quote':[{'close':[100.,50.,49.]}], 'adjclose':[{'adjclose':[49.,49.,49.]}]}}
    corporate=[]
    for i in range(3): corporate.append(adjusted_value(native,i))
    assert corporate==[49.,49.,49.]
    missing=copy.deepcopy(native); missing['indicators'].pop('adjclose')
    assert adjusted_value(missing,0) is None
    # Zero remains an observation, while absent prices remain null features.
    raw=fixture(); p=GRID[3]['parameters']
    for packet in raw['equity'].values():
        for row in packet['rows']: row['adjusted_close']=100.
    out=check('observed-zero-returns','ZERO_VS_MISSING',raw,p,'ADVERSE','participation')
    assert out['features']['positive_5']==0 and out['features']['positive_21']==0 and out['pillar_states']['fragility']=='UNAVAILABLE'
    # Snapshot known later: the same raw version fails historical R0 and passes
    # explicit R2. It may become R0 eligible after actual conservative capture.
    raw=fixture(); raw['mode']='R0'; raw['equity']['XLK']['available_at']='2026-09-08T14:00:00Z'
    check('later-capture-not-past-R0','TEMPORAL',raw,p,'INCOMPLETE','reading_status')
    raw=copy.deepcopy(raw); raw['mode']='R2'
    check('later-capture-explicit-R2','TEMPORAL',raw,p,'RISK_ON_BROAD')
    raw=copy.deepcopy(raw); raw['mode']='R0'; raw['as_of']='2026-09-08T15:00:00Z'
    # Eligibility of old vintage, not a fresh September reading; target remains April.
    check('later-asof-historical-target-known','TEMPORAL',raw,p,'RISK_ON_BROAD')
    for label,clock,expected in [('before','21:29:59','INCOMPLETE'),('equal','21:30:00','COMPLETE'),('after','21:30:01','COMPLETE')]:
        raw=fixture(); raw['mode']='R0'; raw['as_of']=raw['target_session']+'T'+clock+'Z'
        check('availability-boundary-'+label,'TEMPORAL',raw,p,expected,'reading_status')
    for label,value in [('NaN',float('nan')),('Infinity',float('inf')),('negative',-1.),('boolean',True)]:
        raw=fixture(); raw['equity']['XLK']['rows'][-1]['adjusted_close']=value
        assert evaluate_raw(raw,p)['reading_status']=='INCOMPLETE',label
    raw=fixture()
    for packet in raw['equity'].values(): packet['rows'].reverse()
    raw['vix']['rows'].reverse(); raw['vx']['contracts'].reverse()
    out=check('raw-order-invariance','DEPENDENCY',raw,p,'RISK_ON_BROAD')
    assert out==evaluate_raw(fixture(),p)
    payload=json.dumps({'fixtures':cases},separators=(',',':'),allow_nan=False).encode()
    (BASE/'raw-fixtures.json.gz').write_bytes(gzip.compress(payload,mtime=0))
    coverage={cid:{key:sorted({r['output']['pillar_states'][key] for r in results if r['id'].startswith(cid+'-')}) for key in ['participation','leadership','volatility','fragility','equity']} for cid in [c['id'] for c in GRID]}
    report={'scope':'RAW_DATED_SERIES_TO_FEATURES_TO_PILLARS_TO_FROZEN_REGIME',
            'fixtures_sha256':hashlib.sha256(payload).hexdigest(), 'cases':len(results),
            'passed':sum(r['passed'] for r in results),'failed':sum(not r['passed'] for r in results),
            'categories':{key:sum(r['category']==key for r in results) for key in sorted({r['category'] for r in results})},
            'candidate_pillar_coverage':coverage, 'non_json_numeric_missing_values':{'status':'PASS','cases':['float NaN','float Infinity','negative price','boolean price']},
            'native_corporate_actions':{'status':'PASS','adjusted_values':corporate,'missing_adjclose_no_fallback':True},
            'float_boundary_epsilon':EPS,'results':results}
    (BASE/'raw-check-results.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
    print(json.dumps({key:report[key] for key in ['cases','passed','failed','categories']},indent=2))
    for row in results:
        if not row['passed']: print(row['id'],row['expected'],row['actual'],row['output']['features'])
    assert report['failed']==0


if __name__=='__main__': main()
