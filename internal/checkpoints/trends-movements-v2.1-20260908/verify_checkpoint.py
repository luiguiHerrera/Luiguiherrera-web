"""Offline checkpoint verification. Never acquire evidence, resolve new pairs or publish.

Default: inspect the self-contained archive without extraction. --replay creates a
new temporary directory, executes only the retained Wave 2C census and its tests,
then preserves that directory. --verify-sources reads/re-hashes existing R&D files.
No deletion is performed. Python >=3.9, standard library only.
"""
from pathlib import Path,PurePosixPath
import argparse,collections,gzip,hashlib,io,json,os,subprocess,sys,tarfile,tempfile
HERE=Path(__file__).resolve().parent

def canonical(x):return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':'))
def digest(b):return hashlib.sha256(b).hexdigest()
def hash_file(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def read(name):return json.loads((HERE/name).read_text())
def verify(replay=False,sources=False,workspace=False,files=True):
 checks=[]
 def check(ok,name):
  if not ok:raise AssertionError(name)
  checks.append(name)
 state=read('STATE.json');manifest=[json.loads(x) for x in gzip.decompress((HERE/'retained-manifest.jsonl.gz').read_bytes()).splitlines()]
 expected={r['path']:r for r in manifest if r.get('included_in_core')}
 core={}
 with tarfile.open(HERE/'reconstruction-core.tar.gz','r:gz') as tar:
  for m in tar.getmembers():
   q=PurePosixPath(m.name)
   check(m.isfile() and not q.is_absolute() and '..' not in q.parts and m.name not in core,'safe unique archive member: '+m.name)
   core[m.name]=tar.extractfile(m).read()
 check(set(core)==set(expected),'core membership complete')
 check(all(digest(b)==expected[p]['stored_sha256'] for p,b in core.items()),'all archived bytes match independently hashed inventory')
 def obj(p):return json.loads(core['internal/trends-movements/'+p])
 raw=gzip.decompress(core['internal/trends-movements/v2.1/corpus.jsonl.gz']);rows=[json.loads(x) for x in raw.splitlines()]
 check(len(rows)==8137 and digest(raw)==state['MOVEMENT_CORPUS_SHA256'],'frozen corpus count and uncompressed hash')
 check(len({r['security_id'] for r in rows})==3055,'corpus 3055 security identities')
 check(digest(canonical(obj('wave2a/target.json')).encode())==state['BOTH_PRESENT_TARGET_SHA256'],'target canonical hash')
 prior=obj('wave2a/both-present-results.json');counts=collections.Counter(r['movement_status'] for r in prior['global_results'])
 check(counts['INDETERMINATE']==7611 and sum(counts[s] for s in ['INCREASED','REDUCED','UNCHANGED'])==526,'global state independently recounted')
 check(state['GLOBAL_TOTAL_RESOLVED']==526 and state['GLOBAL_STILL_INDETERMINATE']==7611 and state['BOTH_PRESENT_RESOLVED']==517 and state['MOVEMENT_CORPUS_COUNT']==8137,'checkpoint counters agree with preserved state')
 check(prior['both_present_resolved']==517 and prior['target_count']==4162,'target state preserved')
 pilot=obj('wave1d/pilot-results.json');pc=obj('wave1d/corporate-event-coverage.json')
 check(pilot['fixed_comparisons']==501 and pilot['pilot_total_resolved']==487 and pilot['pilot_still_indeterminate']==14,'fixed pilot counts')
 check(len(pc)==66 and collections.Counter(x['state'] for x in pc)=={'VERIFIED_CLEAR_FOR_COMPARABILITY':64,'VERIFIED_BLOCK':2},'pilot all packets classified')
 check(pilot['false_positives_observed']==0 and pilot['statistical_zero_error_claim'] is False,'observed manual errors not statistical guarantee')
 check(obj('wave2b/manager-audit-gate-correction.json')['MANAGER_AUDIT_TARGET']=='19/19','population correction retained')
 certs={c['security_id']:c for c in obj('wave2a/corporate-event-coverage.json')};identity={c['security_id']:c for c in obj('wave2a/issuer-cik-bindings.json')}
 saved=read('CANDIDATES.json')['candidates'];full=obj('wave2c/qualified-security-candidates.json');byid={x['security_id']:x for x in full}
 check(len(saved)==16 and set(byid)=={x['security_id'] for x in saved},'exact sixteen candidate identities')
 for c in saved:
  sid=c['security_id'];row=byid[sid]
  check(c['cusip']==sid.split('|')[0] and c['historical_evidence_only'] and not c['public_exposure_allowed'],'candidate historical/class scope: '+sid)
  check(c['certificate_canonical_sha256']==digest(canonical(certs[sid]).encode()) and c['identity_record_canonical_sha256']==digest(canonical(identity[sid]).encode()),'certificate and identity hashes: '+sid)
  check(row['packet_state']=='VERIFIED_CLEAR_FOR_COMPARABILITY' and row['both_present_unresolved']==0 and sum(row[x] for x in ['reported_increased','reported_reduced','reported_unchanged'])==row['both_present_managers'],'complete candidate comparison: '+sid)
 check(all(x['PUBLIC_FEATURE_CANDIDATE']=='NO' for x in obj('wave2c/public-top8-results.json')),'public top8 zero eligible')
 check(obj('wave2c/trend-linked-results.json')['TREND_LINKED_CANDIDATE_COUNT']==1,'one editorial candidate')
 check(obj('wave2c/RESULT.json')['UNKNOWN_SECURITIES']==2984,'unknown includes 920 no-packet securities')
 snap=core['lib/trends/capital/generated/snapshot.json.gz']
 check(digest(snap)==state['SOURCE_SNAPSHOT_SHA256'],'frozen public snapshot bytes')
 check(json.loads(gzip.decompress(snap))['movement_publication']=='REVIEW_PENDING','snapshot public movement gate')
 check(state['MOVEMENT_R_AND_D_STATUS']=='DEFERRED_DATA_COVERAGE_LIMIT' and state['PUBLIC_PRODUCT_DECISION']=='NO_MOVEMENT_FEATURE','deferred product decision')
 check(state['TRENDS_MOVEMENTS_V2_1_STATUS']==state['MOVEMENT_R_AND_D_STATUS'] and state['MOVEMENT_PUBLICATION']=='REVIEW_PENDING','status and publication consistency')
 check(len(state['REOPEN_CONDITIONS']['conditions'])==5 and not state['REOPEN_CONDITIONS']['automatic_publication_gate'],'five reopen triggers never publication gates')
 check(state['ANTI_REPEAT_RULE']=='DO_NOT_RESUME_MASS_ISSUER_EVENT_RESEARCH','anti-repeat rule')
 check([state[k] for k in ['PUBLIC_DATA_CHANGED','PUBLIC_SNAPSHOT_CHANGED','MOVEMENT_UI_PRESENT','MOVEMENT_FIELDS_PUBLIC']]==['NO','NO','NO','NONE'],'public locks')
 storage=read('STORAGE_AUDIT.json')
 check(len(manifest)==storage['total_files'] and sum(r['stored_bytes'] for r in manifest)==storage['total_logical_bytes'],'storage accounting')
 check(digest((HERE/'retained-manifest.jsonl.gz').read_bytes())==storage['manifest_sha256'],'storage manifest container hash')
 check(all(r['provenance'] for r in manifest if r['root']==state['FROZEN_RESEARCH_WORKTREE'] and '/sources/' in r['path']),'canonical source files retain provenance')
 if sources:
  check(all(Path(r['root'],r['path']).is_file() and hash_file(Path(r['root'],r['path']))==r['stored_sha256'] for r in manifest),'all temporary R&D files remain unchanged')
 if workspace:
  baseline=read('WORKSPACE_BASELINE.json');root=Path(baseline['root'])
  check(all((root/f).is_file() and hash_file(root/f)==h for f,h in baseline['tracked'].items()),'all original tracked files including dirty package-lock unchanged')
  check(subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==baseline['head'],'original HEAD unchanged')
 if files:
  entries=read('FILES.json')['files']
  for e in entries:
   p=HERE/e['checkpoint_relative_path']
   if e['sha256'] is not None:check(p.is_file() and hash_file(p)==e['sha256'],'proposed artifact checksum: '+e['path'])
 replay_result=None
 if replay:
  dest=Path(tempfile.mkdtemp(prefix='trends-checkpoint-replay-'))
  for name,body in core.items():
   p=dest/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(body)
  # Deny network at Python's audit boundary, before any archived module imports.
  runner="import sys,runpy\ndef no_network(event,args):\n if event.startswith('socket.') or event.startswith('urllib.'):raise RuntimeError('CHECKPOINT_NETWORK_FORBIDDEN')\nsys.addaudithook(no_network)\nsys.path.insert(0,'scripts/movement_product_wave2c')\nrunpy.run_path('scripts/movement_product_wave2c/build2c.py',run_name='__main__')\n"
  env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'}
  result=subprocess.run([sys.executable,'-B','-c',runner],cwd=dest,env=env,capture_output=True,text=True)
  check(result.returncode==0,'offline Wave 2C replay: '+result.stderr[-500:])
  replay_hashes=obj('wave2c/offline-replay.json')['artifact_sha256']
  check(all(hash_file(dest/'internal/trends-movements/wave2c'/f)==h for f,h in replay_hashes.items()),'all ten replay outputs match original hashes')
  test_runner="import sys,unittest\ndef no_network(event,args):\n if event.startswith('socket.') or event.startswith('urllib.'):raise RuntimeError('CHECKPOINT_NETWORK_FORBIDDEN')\nsys.addaudithook(no_network)\ns=unittest.defaultTestLoader.discover('scripts/movement_product_wave2c',pattern='test_*.py')\nr=unittest.TextTestRunner(verbosity=1).run(s)\nsys.exit(not r.wasSuccessful())\n"
  test=subprocess.run([sys.executable,'-B','-c',test_runner],cwd=dest,env=env,capture_output=True,text=True)
  check(test.returncode==0,'retained product contract tests: '+test.stderr[-400:])
  check('Ran 27 tests' in test.stderr,'27 product tests executed')
  replay_result={'directory_preserved':str(dest),'artifact_hashes_matched':len(replay_hashes),'product_tests':27,'network_policy':'Python audit hook rejects socket.* and urllib.*','primary_revalidation_performed':False}
 return {'status':'PASS','check_count':len(checks),'core_members':len(core),'replay':replay_result,'source_files_verified':len(manifest) if sources else 0,'workspace_verified':workspace,'no_source_mutations':True,'checks':checks}

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--replay',action='store_true');p.add_argument('--verify-sources',action='store_true');p.add_argument('--verify-workspace',action='store_true');args=p.parse_args()
 try:
  r=verify(args.replay,args.verify_sources,args.verify_workspace)
  print(json.dumps({k:v for k,v in r.items() if k!='checks'},sort_keys=True,ensure_ascii=False))
 except Exception as e:
  print('CHECKPOINT VERIFICATION FAILED: '+str(e),file=sys.stderr);sys.exit(1)
