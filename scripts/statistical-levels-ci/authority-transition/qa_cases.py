"""Executed local controller/workflow linkage; no hosted qualification."""
import ast,copy,hashlib,json,socket,unittest
from pathlib import Path
from unittest.mock import patch
from link_models import *
ACCEPTED=load('accepted_controller','reference-controller.py')
RESULT={'scope':'LOCAL_FUNCTIONS_AND_MODELED_SERVICES_ONLY','remote_attempts':0,'cycles':[]}
def deny_network(*a,**kw):RESULT['remote_attempts']+=1;raise AssertionError('NETWORK_FORBIDDEN')
class LinkTests(unittest.TestCase):
 def setUp(self):
  self.grant=patch.object(c,'EDITORIAL_AUTHORIZATION',link_grant());self.grant.start();self.addCleanup(self.grant.stop);self.io=LinkIO()
 def ready(self,direction='rebind',runid=9001,check_id=13001):
  r,_=prepare(self.io,direction);self.io.active=EDPL if direction=='rebind' else B['production_deployment_id'];self.io.tick()
  return produce(self.io,direction,r['expected_head_sha256'],runid=runid,check_id=check_id)
 def reject(self,r,code):
  writes=list(self.io.s3.writes)
  with self.assertRaisesRegex(c.Denied,code):c.release(r,self.io)
  self.assertEqual(self.io.s3.writes,writes)
 def test_full_link_rebind_rollback_new_qa_and_no_implicit_republication(self):
  original=self.io.s3.data[c.baseline_key()]
  r,q,input_model=self.ready();out=c.release(r,self.io)
  self.assertEqual(out['state'],'TRANSITION_CERTIFIED')
  rb,qb,_=self.ready('rollback',9002,13002);outb=c.release(rb,self.io)
  self.assertEqual(outb['state'],'TRANSITION_CERTIFIED')
  self.assertEqual(self.io.s3.data[c.baseline_key()],original)
  self.assertNotEqual(r['production_qa_attestation_id'],rb['production_qa_attestation_id'])
  self.assertNotEqual(r['production_qa_attestation_hash'],rb['production_qa_attestation_hash'])
  self.assertNotEqual(self.io.qa_calls[0]['intent_sha256'],self.io.qa_calls[1]['intent_sha256'])
  for call in self.io.qa_calls:
   self.assertEqual(sum(x['kind']=='QA' for x in call['calls']),1)
   self.assertFalse(next(x for x in call['calls'] if x['kind']=='QA')['tokenSourcePresent'])
  daily=daily_fixture(self.io,parent=c.EDITORIAL_AUTHORIZATION['execution_sha'])
  self.reject(daily,'ROLLBACK_EDITORIAL_REAUTHORIZATION_REQUIRED');self.assertEqual(self.io.rebuilds,0)
  fixture={'scope':'LOCAL_SYNTHETIC_SERVICE_FIXTURE_NOT_A_GRANT','producer_input':input_model,'produced':q,'server_jobs':self.io.api['/actions/runs/9001/attempts/1/jobs?per_page=100'],'certification_request':r,'controller_result':out}
  (OUT/'link-fixture.json').write_text(json.dumps(fixture,indent=2)+'\n')
  RESULT['cycles'].append({'states':['BASELINE','REBIND_CERTIFIED','ROLLBACK_CERTIFIED','R_CHILD_PUBLICATION_DENIED'],'qa':self.io.qa_calls,'server_reads':self.io.reads,'original_marker_unchanged':True,'rollback_head':outb['authority_head_sha256']})
 def test_prepare_recovery_before_and_after_traffic_never_replaces_intent(self):
  r,a=prepare(self.io);writes=list(self.io.s3.writes);intent=self.io.s3.data[c.transition_keys(r['expected_head_sha256'])[0]]
  self.io.tick();_,b=prepare(self.io,head=r['expected_head_sha256'])
  self.assertEqual(a['intent_sha256'],b['intent_sha256']);self.assertEqual(self.io.s3.writes,writes)
  self.io.active=EDPL;self.io.tick();_,b=prepare(self.io,head=r['expected_head_sha256'])
  self.assertEqual(b['qa_context']['active_binding'],b['qa_context']['intent']['binding']);self.assertEqual(self.io.s3.writes,writes)
  self.assertEqual(self.io.s3.data[c.transition_keys(r['expected_head_sha256'])[0]],intent)
  cert,_,_=produce(self.io,'rebind',r['expected_head_sha256']);self.assertEqual(c.release(cert,self.io)['state'],'TRANSITION_CERTIFIED')
 def test_rollback_blocks_an_otherwise_p4_valid_data_child_of_R(self):
  from p4_cases import fixture
  git,root,_,_=fixture();self.assertEqual(root,c.EDITORIAL_AUTHORIZATION['execution_sha'])
  r,_,_=self.ready();c.release(r,self.io)
  rb,_,_=self.ready('rollback',9002,13002);c.release(rb,self.io)
  parent_tree={name:{'mode':mode,'type':'blob','sha':oid} for name,(mode,oid) in git.tree(root).items()}
  daily=daily_fixture(self.io,parent=root,parent_tree=parent_tree)
  source=self.io.sources.pop(daily['candidate_git_sha'])
  sha=git.commit(root,{name:source['blobs'][name] for name in c.POLICY['allowlist']})
  self.assertEqual(a.bootstrap(git,sha),(root,[sha]))
  self.assertEqual(a.validate_data(git,sha,root,self.io.metadata_objects)['files'],82)
  source.update(sha=sha,branch_sha=sha,comparison={'base_commit':{'sha':sha},'merge_base_commit':{'sha':sha},'behind_by':0,'ahead_by':0,'status':'identical'})
  self.io.sources[sha]=source;daily.update(candidate_git_sha=sha,workflow_execution_sha=sha)
  self.io.deployments[daily['candidate_deployment_id']]['meta']['githubCommitSha']=sha
  evidence,h=qa_evidence(daily,'preview',daily['candidate_deployment_id'],self.io.now(),True)
  self.io.evidence['preview']=evidence;daily.update(qa_attestation_hash=h,qa_attestation=c.encode(evidence['attestation']).decode())
  self.reject(daily,'ROLLBACK_EDITORIAL_REAUTHORIZATION_REQUIRED');self.assertEqual(self.io.rebuilds,0)
  RESULT['post_rollback_gate']={'data_candidate_model_sha':sha,'p4_admission':'PASS_LOCAL','data_identity':'VALID_82_FILE_SUCCESSOR','publication':'DENIED_REQUIRES_NEW_EDITORIAL_AUTHORIZATION'}
 def test_first_prepare_cannot_follow_unregistered_traffic_change(self):
  self.io.active=EDPL;head=c.digest(c.encode(marker()))
  self.reject({'operation':c.TRANSITION,**selection('rebind','prepare',head)},'TRANSITION_RECOVERY_PRODUCTION')
 def test_pending_unknown_production_is_not_recovery(self):
  r,_=prepare(self.io);third='dpl_OfflineUnauthorizedTarget1';self.io.deployments[third]=deployment(E,third);self.io.active=third
  self.reject(r,'TRANSITION_RECOVERY_PRODUCTION')
 def test_lost_prepare_response_resumes_same_persisted_intent(self):
  self.io.s3.fail='after';head=c.digest(c.encode(marker()));r={'operation':c.TRANSITION,**selection('rebind','prepare',head)}
  with self.assertRaises(c.Denied):c.release(r,self.io)
  before=dict(self.io.s3.data);count=len(self.io.s3.writes);self.io.tick()
  self.assertEqual(c.release(r,self.io)['state'],'TRANSITION_PREPARED_NOT_CERTIFIED');self.assertEqual(self.io.s3.data,before);self.assertEqual(len(self.io.s3.writes),count)
 def test_failed_qa_can_recover_only_with_new_run_and_new_qa(self):
  r,_,_=self.ready();before=dict(self.io.s3.data)
  self.io.api['/actions/runs/9001/attempts/1/jobs?per_page=100']['jobs'][1]['conclusion']='failure'
  self.reject(r,'TRANSITION_QA_JOB_IDENTITY');self.assertEqual(self.io.s3.data,before)
  new,_,_=produce(self.io,'rebind',r['expected_head_sha256'],runid=9003,check_id=13003)
  self.assertNotEqual(new['production_qa_attestation_hash'],r['production_qa_attestation_hash'])
  self.assertEqual(c.release(new,self.io)['state'],'TRANSITION_CERTIFIED')
  self.assertIn('/check-runs/13001',self.io.api)
 def test_expired_reservation_cannot_extend_or_replace_historical_grant(self):
  r,_=prepare(self.io);before=dict(self.io.s3.data);self.io.clock+=dt.timedelta(days=2)
  self.reject(r,'TRANSITION_WINDOW_CLOSED')
  c.EDITORIAL_AUTHORIZATION['rebind_window'][1]='2026-11-21T00:00:00Z'
  changed={**r,'authorization_sha256':c.digest(c.encode(c.EDITORIAL_AUTHORIZATION))}
  self.reject(changed,'TRANSITION_INTENT_BINDING');self.assertEqual(self.io.s3.data,before)
 def test_changed_ci_attempt_cannot_recover_reserved_transition(self):
  r,_=prepare(self.io);self.io.qualification['run']['run_attempt']=2
  self.reject(r,'TRANSITION_CI_IDENTITY')
 def test_incomplete_failed_skipped_or_wrong_ci_is_rejected_before_reservation(self):
  baseline=copy.deepcopy(self.io.qualification);head=c.digest(c.encode(marker()))
  for case in ['missing','failed','skipped','wrong_sha','wrong_attempt','wrong_hash','incomplete_jobs']:
   self.io.qualification=copy.deepcopy(baseline);q=self.io.qualification
   if case=='missing':q['jobs']['jobs'][0]['steps'].pop()
   elif case=='failed':q['run']['conclusion']='failure'
   elif case=='skipped':q['jobs']['jobs'][0]['steps'][1]['conclusion']='skipped'
   elif case=='wrong_sha':q['run']['head_sha']='0'*40
   elif case=='wrong_attempt':q['run']['run_attempt']=2
   elif case=='wrong_hash':q['workflow_sha256']='0'*64
   else:q['jobs']['total_count']=2
   with self.subTest(case=case):self.reject({'operation':c.TRANSITION,**selection('rebind','prepare',head)},'TRANSITION_CI_')
 def test_absent_or_forged_qa_is_rejected(self):
  r,_,_=self.ready();baseline=copy.deepcopy(self.io.api)
  for case in ['absent','app','external_run','summary_missing','payload','binding_direction','binding_intent','workflow_hash']:
   self.io.api=copy.deepcopy(baseline);check=self.io.api['/check-runs/13001']
   if case=='absent':del self.io.api['/check-runs/13001']
   elif case=='app':check['app']['slug']='forged-app'
   elif case=='external_run':check['external_id']='999999'
   elif case=='summary_missing':check['output'].pop('summary')
   elif case=='payload':check['output']['text']=check['output']['text'].replace(E,'0'*40)
   elif case=='workflow_hash':self.io.workflow_hash='0'*64
   else:
    binding=json.loads(check['output']['summary']);binding['direction' if case=='binding_direction' else 'intent_sha256']='rollback' if case=='binding_direction' else '0'*64;check['output']['summary']=c.encode(binding).decode()
   with self.subTest(case=case):self.reject(r,'MODELED_SERVER_EVIDENCE_MISSING|QA_|TRANSITION_')
   self.io.workflow_hash=c.digest(WORKFLOW)
 def test_independent_successful_digest_job_is_mandatory(self):
  r,_,_=self.ready();baseline=copy.deepcopy(self.io.api)
  for case in ['incomplete','no_qa','no_seal','skipped','failed','duplicate','wrong_digest','wrong_run','wrong_attempt','wrong_head','wrong_order']:
   self.io.api=copy.deepcopy(baseline);data=self.io.api['/actions/runs/9001/attempts/1/jobs?per_page=100'];jobs=data['jobs']
   if case=='incomplete':data['total_count']+=1
   elif case=='no_qa':jobs.pop(1);data['total_count']-=1
   elif case=='no_seal':jobs.pop();data['total_count']-=1
   elif case in ['skipped','failed']:jobs[1]['conclusion']='skipped' if case=='skipped' else 'failure'
   elif case=='duplicate':jobs.append(copy.deepcopy(jobs[1]));data['total_count']+=1
   elif case=='wrong_digest':jobs[2]['name']=jobs[2]['name'][:-64]+'0'*64
   elif case=='wrong_run':jobs[2]['run_id']=9009
   elif case=='wrong_attempt':jobs[2]['run_attempt']=2
   elif case=='wrong_head':jobs[2]['head_sha']='0'*40
   else:jobs[2]['started_at']=iso(NOW-dt.timedelta(seconds=1))
   with self.subTest(case=case):self.reject(r,'TRANSITION_QA_')
 def test_qa_before_intent_or_too_old_cannot_certify(self):
  r,_,_=self.ready();original=copy.deepcopy(self.io.api);check=self.io.api['/check-runs/13001'];b=json.loads(check['output']['summary']);b['qa_started_at_utc']=iso(NOW-dt.timedelta(seconds=1));check['output']['summary']=c.encode(b).decode()
  self.reject(r,'TRANSITION_QA_FRESHNESS')
  self.io.api=original;self.io.clock+=dt.timedelta(seconds=901);self.reject(r,'TRANSITION_QA_FRESHNESS')
 def test_rebind_qa_cannot_certify_rollback(self):
  r,_,_=self.ready();c.release(r,self.io);rb,_=prepare(self.io,'rollback');self.io.active=B['production_deployment_id'];self.io.tick()
  wrong={**rb,'phase':'certify','production_qa_attestation_id':r['production_qa_attestation_id'],'production_qa_attestation_hash':r['production_qa_attestation_hash']}
  self.reject(wrong,'QA_BINDING_MISMATCH')
 def test_deployment_not_qualified_or_identity_wrong_is_rejected(self):
  head=c.digest(c.encode(marker()));r={'operation':c.TRANSITION,**selection('rebind','prepare',head)}
  for case in ['building','preview','wrong_sha','wrong_project','wrong_tree','wrong_parent','wrong_snapshot']:
   self.io=LinkIO()
   if case=='building':self.io.deployments[EDPL]['readyState']='BUILDING'
   elif case=='preview':self.io.deployments[EDPL]['target']='preview'
   elif case=='wrong_sha':self.io.deployments[EDPL]['meta']['githubCommitSha']='0'*40
   elif case=='wrong_project':self.io.deployments[EDPL]['projectId']='other'
   elif case=='wrong_tree':self.io.sources[E]['tree_sha']='0'*40
   elif case=='wrong_parent':self.io.sources[E]['parents']=['0'*40]
   else:self.io.sources[E]['blobs']['lib/statistical-levels/generated-provenance.json']+=b'\n'
   with self.subTest(case=case):self.reject(r,'VERCEL_|TRANSITION_|EDITORIAL_')
 def test_invoker_cannot_supply_authority_or_postrollback_consent(self):
  r,_=prepare(self.io)
  for field in ['candidate_git_sha','candidate_deployment_id','authority_run_id','qa_attestation','post_rollback_authorization','grant']:
   with self.subTest(field=field):self.reject({**r,field:'arbitrary'},'TRANSITION_REQUEST_SCHEMA')
 def test_authorization_none_denies_before_clients(self):
  r={'operation':c.TRANSITION,**selection('rebind','prepare',c.digest(c.encode(marker())))}
  with patch.object(c,'EDITORIAL_AUTHORIZATION',None),patch.object(c,'AdoptionRuntime',side_effect=AssertionError('MUST_NOT_CONSTRUCT')) as runtime:
   self.assertEqual(c.handler(r,None)['code'],'TRANSITION_NOT_AUTHORIZED');runtime.assert_not_called()
 def test_lost_certification_response_only_allows_identical_terminal_readback(self):
  r,_,_=self.ready();self.io.s3.fail='after'
  with self.assertRaises(c.Denied):c.release(r,self.io)
  before=dict(self.io.s3.data)
  self.assertEqual(c.release(r,self.io)['state'],'ALREADY_CERTIFIED');self.assertEqual(self.io.s3.data,before)
  self.reject({**r,'production_qa_attestation_id':'99999'},'TRANSITION_STALE_REPLAY')
 def test_snapshot_82_actual_bytes_preserved(self):
  self.assertEqual(c.validate_preserved_editorial_snapshot(BASE_TREE,SL)['files'],82)
  for name,data in SL.items():
   changed=dict(SL);changed[name]=data+b'\n';tree=copy.deepcopy(BASE_TREE);tree[name]['sha']=blob(changed[name])
   with self.subTest(path=name),self.assertRaises(c.Denied):c.validate_preserved_editorial_snapshot(tree,changed)
 def test_ordinary_promote_behavior_and_existing_adopt_functions_preserved(self):
  results=[];stores=[]
  for module in [ACCEPTED,c]:
   io=ModelIO();request=daily_fixture(io);result,_=finish_daily(io,request,module);results.append(result);stores.append(io.s3.data)
  self.assertEqual(results[0],results[1]);self.assertEqual(stores[0],stores[1])
  nodes=lambda p:{n.name:ast.dump(n) for n in ast.parse(p.read_text()).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
  old,new=nodes(ROOT/'reference-controller.py'),nodes(ROOT/'controller.py')
  for name in ['request','validate_source','validate_authority','validate_execution','validate_qa','adopt_baseline','validate_lineage','release','promote','resolve_effective_authority','transition_authorization','conditional_once','HTTP','ReadHTTP']:
   self.assertEqual(old[name],new[name],name)
  oldclass=next(n for n in ast.parse((ROOT/'reference-controller.py').read_text()).body if isinstance(n,ast.ClassDef) and n.name=='ReadRuntime')
  newclass=next(n for n in ast.parse((ROOT/'controller.py').read_text()).body if isinstance(n,ast.ClassDef) and n.name=='ReadRuntime')
  for name in ['qa','source','marker_create','s3_get']:
   get=lambda tree:ast.dump(next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name))
   self.assertEqual(get(oldclass),get(newclass),name)

 def test_new_editorial_grant_rejects_old_or_arbitrary_parent_identity(self):
  for key,value in [('parent',H),('parent','f'*40),('sha','f0b53f6d83879c2323db8fcabf2f20f06d82fade'),('tree','f'*40)]:
   altered=copy.deepcopy(c.EDITORIAL_AUTHORIZATION);altered['source'][key]=value
   with self.subTest(key=key,value=value),patch.object(c,'EDITORIAL_AUTHORIZATION',altered),self.assertRaisesRegex(c.Denied,'TRANSITION_SOURCE_GRANT_IDENTITY'):
    c.transition_authorization()

 def test_ordinary_promote_rejects_qa_origin_not_owned_by_verified_deployment(self):
  io=ModelIO();r=daily_fixture(io)
  qa=io.evidence['preview']['attestation'];qa['origin']='https://luiguiherrera-other-fixture.vercel.app'
  r['qa_attestation_hash']=c.digest(c.encode(qa));r['qa_attestation']=c.encode(qa).decode()
  # The trusted QA job digest must match too: this isolates the deployment-origin guard.
  for job in io.evidence['preview']['jobs']['jobs']:
   if job['name'].startswith('statistical-levels-candidate-qa-sha256-'):
    job['name']='statistical-levels-candidate-qa-sha256-'+r['qa_attestation_hash']
  with self.assertRaisesRegex(c.Denied,'PREVIEW_ORIGIN_MISMATCH'):c.release(r,io)
  self.assertEqual(io.rebuilds,0)

 def test_new_mandatory_ci_step_is_required_from_server_before_reservation(self):
  baseline=copy.deepcopy(self.io.qualification);head=c.digest(c.encode(marker()))
  for state in ['missing','skipped','failure','in_progress']:
   self.io.qualification=copy.deepcopy(baseline);steps=self.io.qualification['jobs']['jobs'][0]['steps'];step=next(s for s in steps if s['name']=='Test extraordinary authority transition coverage')
   if state=='missing':steps.remove(step)
   elif state=='in_progress':step['status']=state
   else:step['conclusion']=state
   with self.subTest(state=state):self.reject({'operation':c.TRANSITION,**selection('rebind','prepare',head)},'TRANSITION_CI_COVERAGE')
