"""One registered H1 experiment and observational P1; not a runtime module."""
import hashlib
import json
import importlib.util
from pathlib import Path

BASE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('groweer_analysis',BASE/'analyze-experiments.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)

def confirm(seq,session_indices,versions=None):
    versions=versions or ['C03']*len(seq)
    held=None;pending=None;out=[]
    for i,candidate in enumerate(seq):
        if i==0 or session_indices[i]!=session_indices[i-1]+1 or versions[i]!=versions[i-1]: held=None;pending=None
        if candidate is None: held=None;pending=None
        elif held is None or candidate=='STRESS' or candidate==held: held=candidate;pending=None
        elif candidate==pending: held=candidate;pending=None
        else: pending=candidate
        out.append(held)
    return out

def invariants():
    # Hand-specified paths distinguish timely stress from delayed non-stress and clearing.
    assert confirm(['RISK_ON_BROAD','TRANSITION','TRANSITION'],[1,2,3])==['RISK_ON_BROAD','RISK_ON_BROAD','TRANSITION']
    assert confirm(['RISK_ON_BROAD','STRESS','DEFENSIVE','DEFENSIVE'],[1,2,3,4])==['RISK_ON_BROAD','STRESS','STRESS','DEFENSIVE']
    assert confirm(['RISK_ON_BROAD','TRANSITION','RISK_ON_BROAD'],[1,2,3])==['RISK_ON_BROAD']*3
    assert confirm(['RISK_ON_BROAD',None,'TRANSITION'],[1,2,3])==['RISK_ON_BROAD',None,'TRANSITION']
    assert confirm(['RISK_ON_BROAD','TRANSITION','DEFENSIVE'],[1,2,4])==['RISK_ON_BROAD','RISK_ON_BROAD','DEFENSIVE']
    assert confirm(['RISK_ON_BROAD','TRANSITION'],[1,2],['v1','v2'])==['RISK_ON_BROAD','TRANSITION']
    # Flip-flop boundaries do not bridge absent sessions and observed endpoints are censored.
    assert a.metrics(['A',None,'A']+[None]*(len(a.ROWS)-3),[0,1,2])['adjacent_pairs']==0
    return 7

def main():
    inputs=['baseline-characterization.json','transition-forensics.json','stress-forensics.json','ablation.json']
    assert all((BASE/x).exists() for x in inputs)
    assert json.loads((BASE/'ablation.json').read_text())['status']=='PASS'
    assert a.metrics(a.CAN,a.indices())['flip_flops']['1']['count']>0
    gate={x:hashlib.sha256((BASE/x).read_bytes()).hexdigest() for x in inputs}
    seq=confirm(a.CAN,[r['sessionIndex'] for r in a.ROWS]);ids=a.indices()
    rr=a.runs(a.CAN,ids);events=[]
    for run in rr:
        entry=run['start'];matches=[i for i in range(entry,run['end']+1) if seq[i]==run['state']]
        events.append({'from':a.CAN[entry-1] if entry else None,'to':run['state'],'date':a.ROWS[entry]['date'],'canonical_episode_sessions':run['sessions'],'left_censored':run['left_censored'],'right_censored':run['right_censored'],
          'delay_within_episode':matches[0]-entry if matches else None,'episode_never_displayed':not matches,'held_state_at_canonical_entry':seq[entry]})
    transitions={x['date']:x for x in json.loads((BASE/'transition-forensics.json').read_text())['transitions']}
    holds=[{'date':r['date'],'canonical':r['regime'],'held':seq[i],'pillar_states':r['pillarStates'],'concordance':r['concordance'],'uncertainty':r['uncertainty'],'observed_transition':transitions.get(r['date'])} for i,r in enumerate(a.ROWS) if seq[i]!=r['regime']]
    stress=[e for e in events if e['to']=='STRESS' and not e['left_censored']]
    assert all(e['delay_within_episode']==0 for e in stress)
    out={**a.common(),'status':'PASS','id':'H1_CONFIRM_ONE_ADDITIONAL_OBSERVATION','variants':1,'construction_gate':{'baseline_forensics_ablation_complete_before_construction':True,'input_sha256':gate,'short_reversals_and_predicate_crossings_observed':True},
      'definition':a.PROTOCOL['hysteresis'],'verdict':'CHALLENGER_ONLY','reason':'Lower turnover cannot establish noise removal; H1 retains contradicted states and delays legitimate contractual non-stress changes. Independent adjudication and prospective delay costs are absent.',
      'periods':{p:a.comparison(seq,a.indices(p)) for p in a.PERIODS},'entry_events':events,'stress_entries':len(stress),'stress_entry_delays':a.summarize([e['delay_within_episode'] for e in stress]),
      'never_displayed_episodes':sum(e['episode_never_displayed'] for e in events),'all_held_contradiction_sessions':len(holds),'risk_on_held_during_transition_or_defensive':sum(seq[i] in ['RISK_ON_BROAD','RISK_ON_SELECTIVE'] and a.CAN[i] in ['TRANSITION','DEFENSIVE'] for i in ids),
      'held_stress_after_canonical_exit':sum(seq[i]=='STRESS' and a.CAN[i]!='STRESS' for i in ids),'contradiction_sessions':holds,'threshold_sensitivity':{},'unit_invariants_passed':invariants(),'missing_data_note':'All1930 baseline rows are complete; missing/gap/version handling tested with explicit counterexamples, not claimed historical frequency.'}
    for name,v in a.EXP['sensitivity'].items():
        changed=confirm([x['regime'] for x in v['outputs']],[r['sessionIndex'] for r in a.ROWS])
        out['threshold_sensitivity'][name]={'disagreement_vs_H1_C03':sum(x!=y for x,y in zip(changed,seq))/len(seq),'metrics':a.metrics(changed,ids)}
    a.save('hysteresis-challenger.json',out)
    persistence=[];keys=['regime','participation','leadership','volatility','fragility'];durations={k:0 for k in keys};previous={}
    for i,r in enumerate(a.ROWS):
        values={'regime':r['regime'],**r['pillarStates']}
        for k in keys: durations[k]=durations[k]+1 if previous.get(k)==values[k] and i and a.adjacent(i-1,i) else 1
        persistence.append({'date':r['date'],'regime':r['regime'],'observed_elapsed_sessions':dict(durations),'left_history_boundary_censored':{k:durations[k]==i+1 for k in keys},'current_pillars':r['pillarStates']})
        previous=values
    named=[]
    for pillar,bad,good in [('volatility',{'ADVERSE','STRESS'},{'BENIGN'}),('participation',{'ADVERSE'},{'FAVORABLE'}),('leadership',{'ADVERSE'},{'FAVORABLE'}),('fragility',{'HIGH'},{'LOW'})]:
        started=None
        for i,r in enumerate(a.ROWS):
            current=r['pillarStates'][pillar]
            if current in bad and started is None: started=i
            if current in good and started is not None:
                named.append({'pillar':pillar,'adverse_or_high_start':a.ROWS[started]['date'],'first_favorable_or_low_recovery':r['date'],'elapsed_sessions':i-started,'left_censored':started==0});started=None
        if started is not None: named.append({'pillar':pillar,'adverse_or_high_start':a.ROWS[started]['date'],'first_favorable_or_low_recovery':None,'elapsed_sessions':len(a.ROWS)-1-started,'observed_sessions':len(a.ROWS)-started,'right_censored':True})
    a.save('persistence-challenger.json',{**a.common(),'status':'PASS','id':'P1_OBSERVED_EVIDENCE_PERSISTENCE','verdict':'DIAGNOSTIC_ONLY','scope':'Batch diagnostic on this verified complete consecutive R2 sequence only; no prospective gap/version behavior asserted for P1.', 'rule':'Report elapsed observed sessions and named predicate recovery events only. No duration thresholds, ordinal subtraction, filtering or feedback to C03.',
      'rows':persistence,'named_deterioration_recovery_episodes':named,'comparison_with_H1':{'canonical_regime_changes':0,'hidden_canonical_transitions':0,'H1_held_contradiction_sessions':len(holds),'H1_risk_on_held_during_transition_or_defensive':out['risk_on_held_during_transition_or_defensive'],'interpretation':'P1 preserves each current evidence transition and describes its observed age. H1 sometimes retains a risk-on label after C03 moved to transition/defensive. Which presentation users understand better requires prospective adjudication; no UI was built.'}})
    print(json.dumps({'H1_turnover':out['periods']['ALL']['candidate']['turnover'],'never_displayed':out['never_displayed_episodes'],'holds':len(holds),'risk_on_holds':out['risk_on_held_during_transition_or_defensive'],'stress_delays':out['stress_entry_delays'],'invariants':out['unit_invariants_passed']}))

if __name__=='__main__': main()
