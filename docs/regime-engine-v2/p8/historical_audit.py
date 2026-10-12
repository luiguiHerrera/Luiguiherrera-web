"""Verify preserved raw features and supply post-selection research diagnostics.

Does not reselect parameters or rerun/overwrite any validation/test phase result.
"""
import copy
import hashlib
import json
import statistics
from pathlib import Path
from historical_data import History
from reference_model import classify_features, extract, evaluate_raw
from raw_checks import fixture

BASE=Path(__file__).resolve().parent


def main():
    history=History()
    cached=json.loads((BASE/'historical-features-r2.json').read_text())['rows']
    current=history.features()
    # Corrections made after sealed qualification: strict >0 breadth, mandatory
    # monthly identity catalog, native adjclose accessor. All prior features,
    # including every missing reason, must remain exactly equal.
    assert current==cached, 'Corrected raw extraction differs; sealed qualification must be invalidated, not silently replaced.'
    values=json.loads((BASE/'parameter-manifest.json').read_text())['scalar_thresholds']
    training=[r for r in cached if r['date']<='2023-12-31']
    outputs=[classify_features(r['features'],values) for r in training]
    witnesses={}
    for row,out in zip(training,outputs):
        state=out['regime']
        if state and state not in witnesses:
            index=history.calendar.index(row['date']); raw=history.frame(index)
            check=evaluate_raw(raw,values)
            assert check['regime']==state
            witnesses[state]={'observation_date':row['date'],'replay_class':'R2','raw':raw,'output':check}
    (BASE/'historical-witnesses.json').write_text(json.dumps({'scope':'First observed training example per state, after selection; never forced.','witnesses':witnesses,'technical_incomplete_observed':any(r['missing_reasons'] for r in cached)},indent=2)+'\n')
    omission={
        'eq_positive_5':lambda f:f.update(positive_5=f['positive_21']),
        'eq_positive_21':lambda f:f.update(positive_21=f['positive_5']),
        'eq_leadership_gap':lambda f:f.update(leadership_gap=0.),
        'vix_level':lambda f:f.update(vix=15.),
        'vix_momentum_1':lambda f:f.update(jump_1=0.),
        'vix_momentum_5':lambda f:f.update(jump_5=0.),
        'vx_slope_12':lambda f:f.update(slope=10.),
        'corr_mean_21':lambda f:f.update(rho21=0.),
        'corr_window_spread':lambda f:f.update(corr_spread=0.),
    }
    diagnostics=[]
    for fid,change in omission.items():
        counts={'regime_changed':0,'pillar_changed':0}
        for row,original in zip(training,outputs):
            f=copy.deepcopy(row['features']); change(f)
            altered=classify_features(f,values)
            counts['regime_changed']+=altered['regime']!=original['regime']
            counts['pillar_changed']+=altered['pillar_states']!=original['pillar_states']
        diagnostics.append({'feature_id':fid,'observations':len(training),**counts})
    distributions={key:{'min':min(xs),'p10':sorted(xs)[int(.1*(len(xs)-1))],'median':statistics.median(xs),'p90':sorted(xs)[int(.9*(len(xs)-1))],'max':max(xs)} for key in ['positive_5','positive_21','leadership_gap','vix','jump_1','jump_5','slope','rho21','rho63','corr_spread'] if (xs:=[r['features'][key] for r in training if r['features'][key] is not None])}
    source_comparisons={}
    for ticker,packet in history.equity.items():
        rows=packet['rows_by_date']; dates=sorted(rows); differences=[]
        for i,date in enumerate(dates):
            if i<21:continue
            a,b=rows[dates[i-21]],rows[date]
            if not all(a.get(k) and b.get(k) for k in ['adjusted_close','source_close']):continue
            adjusted=100*(b['adjusted_close']/a['adjusted_close']-1)
            unadjusted=100*(b['source_close']/a['source_close']-1)
            differences.append({'date':date,'adjusted_return_21':adjusted,'unadjusted_return_21':unadjusted,'difference_pp':adjusted-unadjusted})
        source_comparisons[ticker]={'compared_windows':len(differences),'largest_absolute_difference':max(differences,key=lambda x:abs(x['difference_pp']))}
    report={'feature_cache_exactly_unchanged':True,'decisions_verified':len(cached),'complete':sum(not r['missing_reasons'] for r in cached),
            'extractor_corrections':'Strict positive-return count uses >0, not 1e-10; mandatory expected VX monthly catalog; native adjclose accessor. No raw historical feature or classification input changed, so original seals remain intact.',
            'omission_scope':'Post-selection TRAIN-only feature omission diagnostics. Constants/duplicated horizons are deliberately reduced challengers, not raw market scenarios or alternative production parameters. No reselection.',
            'omission_interpretation':'A nonzero difference demonstrates rule-path use in this sample, not independent information or predictive value. corr_window_spread omission is the requested level-only versus level-plus-spread comparison.',
            'omission_diagnostics':diagnostics,'train_feature_distributions':distributions,'price_basis_comparisons':source_comparisons,
            'historical_witness_states':list(witnesses),'frozen_result_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(BASE.glob('F*-*.json'))}}
    (BASE/'historical-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['feature_cache_exactly_unchanged','decisions_verified','complete','omission_diagnostics','historical_witness_states']},indent=2))


if __name__=='__main__':main()
