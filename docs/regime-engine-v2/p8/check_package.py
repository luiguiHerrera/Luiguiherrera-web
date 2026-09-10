"""Read-only final P8 gate verification; --write emits only its check summary."""
import collections,gzip,hashlib,json,subprocess,sys
from pathlib import Path
from reference_model import evaluate_raw,validate_parameters
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
def read(name):return json.loads((BASE/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 checks=[]
 def check(name,condition):
  checks.append({'id':name,'pass':bool(condition)})
  if not condition:raise AssertionError(name)
 manifest=read('artifact-manifest.json')
 check('P8_ARTIFACT_BYTES',all((BASE/name).is_file() and sha(BASE/name)==expected for name,expected in manifest['files'].items()))
 freeze=read('protocol-freeze.json'); protocol=read('selection-protocol.json')
 check('FROZEN_PROTOCOL',sha(BASE/'selection-protocol.json')==freeze['protocol_sha256'])
 check('FROZEN_RULE_TABLE',sha(BASE.parent/'decision-table.json')==freeze['unmodified_decision_table_sha256'])
 p=read('parameter-manifest.json'); prices=read('price-series-contract.json'); t=read('temporal-availability-contract.json'); m=read('feature-minimization.json')
 ids={f['feature_id'] for f in read('feature-registry-qualified.json')['features']}
 check('REGISTRY_59',len(ids)==59 and ids=={f['feature_id'] for f in json.loads((BASE.parent/'feature-registry.json').read_text())['features']})
 required={'feature_id','series_type','price_basis','adjustment_policy','return_definition','corporate_action_policy','source','source_field','compatibility_constraints','rationale','evidence'}
 check('PRICE_CONTRACT_59',len(prices['features'])==59 and {f['feature_id'] for f in prices['features']}==ids and all(required<=f.keys() and all(f[k] for k in required) for f in prices['features']))
 check('TEMPORAL_CONTRACT_59',len(t['features'])==59 and {f['feature_id'] for f in t['features']}==ids)
 counts=collections.Counter(f['historical_replay_class'] for f in t['features'])
 check('REPLAY_COUNTS',all(t['counts'][k]==counts[k] for k in ['R0','R1','R2','UNKNOWN']) and sum(t['counts'].values())==59)
 check('PIT_HONESTY',not t['PIT_ELIGIBLE_FEATURES'] and t['counts']['R0']==t['counts']['R1']==0)
 check('MINIMIZATION',sum(m['primary_role_counts'].values())==59 and sum(m['data_kind_counts'].values())==59 and m['core_concordance_units_maximum']==2 and m['primary_role_counts']['CORE_DECISION']==9)
 check('PARAMETERS_9_RESOLVED',len(p['parameters'])==9 and all(x['value'] is not None and x['status']=='RESOLVED' for x in p['parameters']) and p['parameters_unresolved']==0 and validate_parameters(p['scalar_thresholds']))
 check('PARAMETER_EVIDENCE_BYTES',all(sha(BASE/name)==expected for name,expected in p['evidence_sha256'].items()))
 check('CANDIDATE_BINDING',p['scalar_thresholds']==next(c['parameters'] for c in protocol['candidate_grid'] if c['id']==p['selected_candidate']))
 q=read('qualification-results.json')
 for fold in q['folds']:
  name=fold['fold']['id'];s=read(name+'-training-selection.json');v=read(name+'-validation.json');test=read(name+'-test.json')
  eligible=[c for c in s['candidates'] if c['qualified_train_r2']]
  winner=min(eligible,key=lambda c:(c['sensitivity']['worst_disagreement'],c['metrics']['turnover'],c['metrics']['flip_flop_per_adjacent_pair'],c['id']))['id']
  check(name+'_TRAIN_ONLY_SELECTION',winner==s['selected_id']==fold['selected_id'] and not fold['validation_failures_selected'] and not fold['test_failures_selected'])
  check(name+'_SEALS',sha(BASE/(name+'-training-selection.json'))==v['training_selection_sha256']==fold['training_selection_sha256'] and sha(BASE/(name+'-validation.json'))==test['validation_sha256']==fold['validation_sha256'])
  check(name+'_UNCHANGED_SELECTION',s['selected_id']==v['selected_id_unchanged']==test['selected_id_unchanged'])
 acq=read('acquisition.json')
 check('124_SOURCE_CAPTURES',acq['captured']==acq['requests']==124 and not acq['errors'])
 check('SOURCE_RAW_BYTES',all(hashlib.sha256(gzip.decompress((BASE/'evidence'/s['file']).read_bytes())).hexdigest()==s['raw_sha256'] for s in acq['sources']))
 raw=read('raw-check-results.json');rawbytes=gzip.decompress((BASE/'raw-fixtures.json.gz').read_bytes());fixtures=json.loads(rawbytes)['fixtures']
 check('RAW_FIXTURE_HASH',hashlib.sha256(rawbytes).hexdigest()==raw['fixtures_sha256'])
 check('RAW_464_REPLAY',len(fixtures)==raw['cases']==raw['passed']==464 and raw['failed']==0 and all(evaluate_raw(c['raw'],c['parameters'])==r['output'] and r['passed'] for c,r in zip(fixtures,raw['results'])))
 expected={'participation':{'FAVORABLE','MIXED','ADVERSE','UNAVAILABLE'},'leadership':{'FAVORABLE','MIXED','ADVERSE','UNAVAILABLE'},'volatility':{'BENIGN','WATCH','ADVERSE','STRESS','UNAVAILABLE'},'fragility':{'LOW','RISING','HIGH','UNAVAILABLE'},'equity':{'FAVORABLE','MIXED','ADVERSE','UNAVAILABLE'}}
 check('ALL_CANDIDATE_PILLAR_STATES',all(set(states[key])==values for states in raw['candidate_pillar_coverage'].values() for key,values in expected.items()))
 contract=read('contract-check-results.json')
 check('21_NATIVE_TEMPORAL_CHECKS',contract['status']=='PASS' and len(contract['checks'])==21 and all(c['pass'] for c in contract['checks']))
 historical=read('historical-audit.json')
 check('HISTORICAL_FEATURES_UNCHANGED',historical['feature_cache_exactly_unchanged'] and historical['decisions_verified']==1930 and all(sha(BASE/name)==expected for name,expected in historical['frozen_result_sha256'].items()))
 check('HISTORICAL_WITNESSES',set(historical['historical_witness_states'])==set(json.loads((BASE.parent/'decision-table.json').read_text())['regime_vocabulary']))
 preservation=read('preservation.json')
 allowed={'docs/regime-engine-v2/README.md','docs/regime-engine-v2/acceptance-contract.md','docs/regime-engine-v2/specification.md'}
 original=preservation['initial_files_sha256']
 changes=[name for name,value in original.items() if not (ROOT/name).exists() or sha(ROOT/name)!=value]
 check('ONLY_AUTHORIZED_DOC_UPDATES',set(changes)==allowed)
 check('V1_515_BYTES_UNCHANGED',all((ROOT/name).exists() and sha(ROOT/name)==expected for name,expected in preservation['v1_original_files_sha256'].items()))
 check('HEAD_UNCHANGED',subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==preservation['initial_head'])
 names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
 check('NO_NEW_PRODUCTION_FILES',all(name in original or name.startswith('docs/regime-engine-v2/') for name in names if name))
 compat=read('compatibility-checks.json')
 check('V1_EXISTING_TESTS_25',compat['v1_tests']['passed']==compat['v1_tests']['total']==25 and compat['v1_tests']['exit_code']==0)
 check('P7_CONCEPTUAL_16',compat['conceptual']['passed']==compat['conceptual']['total']==16 and compat['conceptual']['abstract_configurations']==320)
 gate=read('gate-result.json')
 check('BUILDER_GATE',all(value=='PASS' for value in gate['gates'].values()) and gate['BUILDER_READY']=='YES' and not gate['UNRESOLVED_BLOCKERS'])
 check('NO_PRODUCTION_CLAIM',gate['PRODUCTION_CUTOVER']=='NO' and gate['PRODUCTION_CODE_CHANGED']=='NO' and gate['BUILDER_EXECUTED']=='NO' and not p['production_validated'])
 result={'status':'PASS','checks_passed':len(checks),'checks_total':len(checks),'checks':checks,'gate':gate,'scope':'P8 research contract and preserved artifacts, not production-engine qualification'}
 if '--write' in sys.argv:(BASE/'package-check-results.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'status':result['status'],'checks_passed':len(checks),'BUILDER_READY':gate['BUILDER_READY'],'PRODUCTION_CUTOVER':'NO'},indent=2))
if __name__=='__main__':main()
