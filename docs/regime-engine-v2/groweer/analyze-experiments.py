"""Summarize registered offline variants. No source fetches or canonical edits."""
import collections
import gzip
import hashlib
import json
import statistics
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROWS = json.loads(gzip.decompress((BASE / 'analysis-input.json.gz').read_bytes()))['rows']
EXP = json.loads(gzip.decompress((BASE / 'experiment-outputs.json.gz').read_bytes()))
CAN = [r['regime'] for r in ROWS]
STATES = ['RISK_ON_BROAD','RISK_ON_SELECTIVE','TRANSITION','DEFENSIVE','STRESS']
PROTOCOL = json.loads((BASE / 'analysis-protocol.json').read_text())
PERIODS = {k:v for k,v in PROTOCOL['periods'].items() if k != 'annual'}
PERIODS.update({str(y):[f'{y}-01-01',f'{y}-12-31'] for y in range(2019,2027)})

def save(name, obj):
    (BASE/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n')

def fraction(n,d): return n/d if d else None
def summarize(xs):
    xs=sorted(x for x in xs if x is not None)
    return {'n':len(xs),'min':min(xs) if xs else None,'median':statistics.median(xs) if xs else None,'mean':statistics.mean(xs) if xs else None,'max':max(xs) if xs else None}
def indices(period='ALL'): return [i for i,r in enumerate(ROWS) if PERIODS[period][0]<=r['date']<=PERIODS[period][1]]
def adjacent(i,j): return ROWS[j]['sessionIndex']==ROWS[i]['sessionIndex']+1
def runs(seq, ids):
    out=[]
    for pos,i in enumerate(ids):
        if seq[i] is None: continue
        before=pos>0 and adjacent(ids[pos-1],i) and seq[ids[pos-1]] is not None
        if before and seq[ids[pos-1]]==seq[i]: out[-1]['end']=i;out[-1]['sessions']+=1
        else: out.append({'state':seq[i],'start':i,'end':i,'sessions':1,'left_censored':not before})
    positions={i:p for p,i in enumerate(ids)}
    for run in out:
        pos=positions[run['end']]
        run['right_censored']=pos==len(ids)-1 or not adjacent(run['end'],ids[pos+1]) or seq[ids[pos+1]] is None
    return out
def metrics(seq, ids):
    pair=[(i,j) for i,j in zip(ids,ids[1:]) if adjacent(i,j) and seq[i] is not None and seq[j] is not None]
    rr=runs(seq,ids); labels=sorted(set(STATES+[seq[i] for i in ids if seq[i] is not None]))
    matrix={a:{b:0 for b in labels} for a in labels}
    for i,j in pair: matrix[seq[i]][seq[j]]+=1
    changes=sum(seq[i]!=seq[j] for i,j in pair)
    flips={}
    for k in [1,2,3,5]:
        n=sum(a['state']==c['state'] and b['sessions']<=k and adjacent(a['end'],b['start']) and adjacent(b['end'],c['start']) for a,b,c in zip(rr,rr[1:],rr[2:]))
        flips[str(k)]={'count':n,'per_adjacent_pair':fraction(n,len(pair))}
    return {'sessions':len(ids),'eligible_sessions':sum(seq[i] is not None for i in ids),'adjacent_pairs':len(pair),'changes':changes,'turnover':fraction(changes,len(pair)),
      'occupancy':dict(collections.Counter(seq[i] if seq[i] is not None else 'INCOMPLETE' for i in ids)),
      'duration':summarize([r['sessions'] for r in rr]),'uncensored_duration':summarize([r['sessions'] for r in rr if not r['left_censored'] and not r['right_censored']]),
      'censored_runs':sum(r['left_censored'] or r['right_censored'] for r in rr),'duration_distribution':dict(sorted(collections.Counter(r['sessions'] for r in rr).items())),
      'stress_duration':summarize([r['sessions'] for r in rr if r['state']=='STRESS']),'flip_flops':flips,'transition_matrix':matrix}
def delta(a,b):
    return {'turnover':a['turnover']-b['turnover'] if a['turnover'] is not None and b['turnover'] is not None else None,
      'median_duration':a['duration']['median']-b['duration']['median'] if a['duration']['median'] is not None and b['duration']['median'] is not None else None,
      'occupancy':{s:a['occupancy'].get(s,0)-b['occupancy'].get(s,0) for s in sorted(set(a['occupancy'])|set(b['occupancy']))},
      'transition_matrix':{s:{t:a['transition_matrix'].get(s,{}).get(t,0)-b['transition_matrix'].get(s,{}).get(t,0) for t in sorted(set(a['transition_matrix'])|set(b['transition_matrix']))} for s in sorted(set(a['transition_matrix'])|set(b['transition_matrix']))}}
def periods(seq): return {p:metrics(seq,indices(p)) for p in PERIODS}
def comparison(seq,ids,coarsened=False):
    canonical=[coarse(x) for x in CAN] if coarsened else CAN
    seq=[coarse(x) for x in seq] if coarsened else seq
    same=[i for i in ids if canonical[i] is not None and seq[i] is not None]
    a,b=metrics(seq,same),metrics(canonical,same)
    return {'paired_sessions':len(same),'unpaired_sessions':len(ids)-len(same),'candidate':a,'canonical_same_dates':b,'deltas':delta(a,b),
      'regimes_changed':sum(seq[i]!=canonical[i] for i in same),'regime_disagreement':fraction(sum(seq[i]!=canonical[i] for i in same),len(same)),
      'stress_state_not_retained':sum(canonical[i]=='STRESS' and seq[i]!='STRESS' for i in same),'stress_state_added':sum(canonical[i]!='STRESS' and seq[i]=='STRESS' for i in same)}
def risk(seq,ids):
    return {s:{k:summarize([ROWS[i]['features'][k] for i in ids if seq[i]==s]) for k in ['realized_vol_21','positive_5','positive_21','leadership_gap','vix','slope','rho21','corr_spread']} for s in sorted(set(seq[i] for i in ids if seq[i] is not None))}
def coarse(s): return {'RISK_ON_BROAD':'RISK_ON','RISK_ON_SELECTIVE':'RISK_ON','CALM_VOL':'RISK_ON','WATCH_VOL':'TRANSITION','ADVERSE_VOL':'DEFENSIVE','STRESS_VOL':'STRESS'}.get(s,s)
def common(): return {'version':'groweer-analysis/1.0.0','replay_class':'R2','point_in_time_oos_claim':False,'canonical_engine_modified':False,'protocol_sha256':hashlib.sha256((BASE/'analysis-protocol.json').read_bytes()).hexdigest(),'caveat':'Post-selection descriptions on already inspected data. Agreement with C03 is not independent correctness or predictive utility.'}

def main():
    ids=indices()
    b=metrics(CAN,ids)
    assert b['changes']==481 and b['duration']['median']==2 and b['flip_flops']['2']['count']==215
    assert metrics(CAN,indices('F3_TEST'))['changes']==139
    ab={**common(),'status':'PASS','full':periods(CAN),'mechanical':{},'reduced':{},'interpretation':'Mechanical missingness tests contract completeness only. Reduced challengers change condition semantics explicitly and quantify lost structure; a changed output is not proof of value.'}
    for name,outputs in EXP['mechanical'].items():
        seq=[r['regime'] for r in outputs]
        ab['mechanical'][name]={'incomplete_sessions':sum(x is None for x in seq),'regimes_changed':sum(x!=y for x,y in zip(seq,CAN)),'pillar_states_changed':{k:sum(o['pillarStates'][k]!=r['pillarStates'][k] for o,r in zip(outputs,ROWS)) for k in ROWS[0]['pillarStates']},'metrics':metrics(seq,ids),'utility_inference':'NONE: required input removed from unchanged contract'}
    for name,outputs in EXP['reduced'].items():
        seq=[r['regime'] for r in outputs]
        ab['reduced'][name]={'id':'R_MINUS_'+name.upper(),'minimum_contract':'analysis-protocol.json: ablation.reduced_rules; omitted condition is removed, no missing observation imputed',
          'periods':{p:comparison(seq,indices(p)) for p in PERIODS},'pillar_states_changed':{k:sum(o['pillarStates'][k]!=r['pillarStates'][k] for o,r in zip(outputs,ROWS)) for k in ROWS[0]['pillarStates']},
          'observed_reachable_states':sorted(set(seq)),'stress_note':'STRESS disagreement is relative to C03 contractual observations, not independently labelled crises.'}
    save('ablation.json',ab)
    sens={**common(),'status':'PASS','method':PROTOCOL['sensitivity'],'variants':{}}
    for name,v in EXP['sensitivity'].items():
        seq=[r['regime'] for r in v['outputs']]
        sens['variants'][name]={k:v[k] for k in ['threshold','canonical','value']}
        sens['variants'][name]['periods']={p:comparison(seq,indices(p)) for p in PERIODS}
    save('threshold-sensitivity.json',sens)
    bm={**common(),'status':'PASS','completion_meaning':'All six requested benchmarks investigated; B0 explicitly NOT_EVALUABLE on a common historical temporal ledger. PASS does not assert a completed 1930-row V1 comparison or superiority.',
      'temporal_ledger':'All B1-B5 observations derive from the exact accepted C03 R2 raw sources, target session, asOf and public inputHash in analysis-input.json.gz; eligibility is intersected per pair, no gap filling. B0 is excluded from comparable metrics.',
      'B0_V1':json.loads((BASE/'v1-benchmark-inventory.json').read_text()),'benchmarks':{},
      'risk_context_caveat':'All listed risk context is contemporaneous/trailing and largely derived from classifier inputs. It describes semantics, not out-of-sample discrimination.'}
    descriptions={
      'B1_VIX_ONLY':('1 observed VIX series; 3 thresholds','Stable volatility labels omit equity breadth, leadership, fragility and futures curve. Cannot express broad versus selective structure.'),
      'B2_VIX_BREADTH':('VIX plus 11 sector series; 3 VIX and 2 breadth thresholds','Coarse equity/volatility reference; omits leadership, fragility, curve and momentum.'),
      'B3_FAMILY_VOTE':('All canonical data and pillar thresholds plus 4-rule family adjudication','Simpler final adjudication does not reduce data/feature maintenance; loses broad/selective distinction.'),
      'B4_PREVIOUS':('Canonical engine plus one state of memory; no threshold','One-session lag retains all acquisition costs and delays new stress. Same-state persistence is not free correctness.'),
      'B5_C03':('Frozen 2 lineage units, 4 subpillars, 13 thresholds and 7 precedence rules','Explicit equity structure and stress conjunction; no evidence that lower turnover alone is better.')}
    for name,seq in EXP['benchmark'].items():
        pair=[i for i in ids if seq[i] is not None]
        structural=[i for i in pair if CAN[i] in ['RISK_ON_BROAD','RISK_ON_SELECTIVE']]
        bm['benchmarks'][name]={'definition':PROTOCOL['benchmarks'][name], 'native_periods':periods(seq),'paired_periods':{p:comparison(seq,indices(p),coarsened=name in ['B1_VIX_ONLY','B2_VIX_BREADTH','B3_FAMILY_VOTE']) for p in PERIODS},'paired_namespace':'Coarse RISK_ON/TRANSITION/DEFENSIVE/STRESS for B1-B3; native C03 for B4-B5',
          'coarse_agreement':{'sessions':len(pair),'count':sum(coarse(seq[i])==coarse(CAN[i]) for i in pair),'fraction':fraction(sum(coarse(seq[i])==coarse(CAN[i]) for i in pair),len(pair)), 'mapping':'BROAD/SELECTIVE -> RISK_ON; CALM/WATCH/ADVERSE/STRESS_VOL mapped to RISK_ON/TRANSITION/DEFENSIVE/STRESS for description only'},
          'broad_selective_context_sessions':len(structural),'broad_selective_distinction_supported':name in ['B4_PREVIOUS','B5_C03'],
          'complexity':descriptions[name][0],'information_tradeoff':descriptions[name][1], 'risk_context':risk(seq,pair),
          'threshold_sensitivity':{v:{'changed':sum(x!=y for x,y in zip(vals[name],seq)),'disagreement':fraction(sum(x!=y for x,y in zip(vals[name],seq)),len(seq))} for v,vals in EXP['benchmarkSensitivity'].items()} if name in ['B1_VIX_ONLY','B2_VIX_BREADTH','B3_FAMILY_VOTE'] else 'B5 see threshold-sensitivity.json; B4 inherits previous-day C03 sensitivity and no own threshold.'}
    save('benchmarks.json',bm)
    dimensions={**common(),'concordance':{},'uncertainty':{},'cross_tab':{},'data_quality':{'verdict':'PASS','report':'data-quality-audit.json','default_replay_profile':dict(collections.Counter(r['dataQuality'] for r in ROWS))}}
    for key in ['concordance','uncertainty']:
        seq=[r[key] for r in ROWS]
        report={'periods':periods(seq),'category_context':{},'verdict':'PENDING_REVIEW'}
        for category in sorted(set(seq)):
            eligible=[i for i in ids[1:] if seq[i]==category and adjacent(i-1,i)]
            opposite=[i for i in ids if seq[i]==category and set(ROWS[i]['dependencyUnits'].values())=={'FAVORABLE','ADVERSE'}]
            report['category_context'][category]={'sessions':sum(s==category for s in seq),'arriving_regime_change_sessions':sum(CAN[i]!=CAN[i-1] for i in eligible),'arriving_change_fraction':fraction(sum(CAN[i]!=CAN[i-1] for i in eligible),len(eligible)),'opposed_family_sessions':len(opposite),'regime_occupancy':dict(collections.Counter(CAN[i] for i in ids if seq[i]==category)),'plausible_regime_count':dict(collections.Counter(len(ROWS[i]['plausibleRegimes']) for i in ids if seq[i]==category))}
        dimensions[key]=report
    for c in ['HIGH','MEDIUM','LOW']:
        dimensions['cross_tab'][c]={u:sum(r['concordance']==c and r['uncertainty']==u for r in ROWS) for u in ['LOW','MEDIUM','HIGH']}
    inverse={'HIGH':'LOW','MEDIUM':'MEDIUM','LOW':'HIGH'}
    dimensions['inverse_copy_test']={'inverse_matches':sum(inverse[r['concordance']]==r['uncertainty'] for r in ROWS),'sessions':len(ROWS),'counterexamples':[{k:r[k] for k in ['date','regime','concordance','uncertainty','pillarStates','dependencyUnits','plausibleRegimes']} for r in ROWS if inverse[r['concordance']]!=r['uncertainty']][:10],'note':'Failure of exact inverse identity demonstrates distinct state information; not proof of user utility.'}
    save('dimension-value.json',dimensions)
    red={**common(),'status':'PENDING_REVIEW','pairs':{},'classification_policy':'STRONG/MODERATE require identifiable non-redundant structure and consistent semantic role. WEAK denotes little direct adjudication contribution. No categorical claim of economic utility follows from disagreement. INDETERMINATE when independent utility cannot be measured.'}
    for label,a,b in [('participation_vs_leadership','participation','leadership'),('volatility_level_vs_momentum','vix_level','volatility_momentum'),('correlation_level_vs_deterioration','correlation_level','correlation_deterioration')]:
        aa='leadership_gap' if a=='leadership' else a; bb='leadership_gap' if b=='leadership' else b
        da={i for i in ids if EXP['reduced'][aa][i]['regime']!=CAN[i]};db={i for i in ids if EXP['reduced'][bb][i]['regime']!=CAN[i]}
        red['pairs'][label]={'a':a,'b':b,'a_changed':len(da),'b_changed':len(db),'both_changed':len(da&db),'a_only':len(da-db),'b_only':len(db-da),'classification':'INDETERMINATE','reason':'Disjoint effects measure conditional contribution, not independent evidence or validated decision value.'}
    red['participation_leadership_cross_tab']={a:{b:sum(r['pillarStates']['participation']==a and r['pillarStates']['leadership']==b for r in ROWS) for b in ['FAVORABLE','MIXED','ADVERSE']} for a in ['FAVORABLE','MIXED','ADVERSE']}
    red['conditional_volatility_triggers']={'fast_without_vix_watch':sum(r['features']['vix']<20 and (r['features']['jump_1']>=10 or r['features']['jump_5']>=20) for r in ROWS),'high_level_without_fast':sum(r['features']['vix']>=25 and r['features']['jump_1']<10 and r['features']['jump_5']<20 for r in ROWS)}
    red['correlation_condition_cross_tab']={level:{spread:sum((r['features']['rho21']>=.65)==(level=='HIGH') and (r['features']['corr_spread']>=.1)==(spread=='RISING_DELTA') for r in ROWS) for spread in ['RISING_DELTA','OTHER']} for level in ['HIGH','BELOW_HIGH']}
    save('redundancy-analysis.json',red)
    print(json.dumps({'ablation':{k:v['periods']['ALL']['regimes_changed'] for k,v in ab['reduced'].items()},'benchmarks':{k:v['native_periods']['ALL']['turnover'] for k,v in bm['benchmarks'].items()},'sensitivity':{k:v['periods']['ALL']['regimes_changed'] for k,v in sens['variants'].items()},'dimensions':dimensions['cross_tab']}))

if __name__=='__main__': main()
