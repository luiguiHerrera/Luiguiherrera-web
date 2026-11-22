"""Offline fixtures only. All fabricated IDs/evidence stay in the local test model.

No AWS clients, network, Git writes, production certificates or data files.
"""
import copy
import datetime as dt
import hashlib
import importlib.util
import io as bytesio
import json
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
PRODUCT = REPO
OUT = Path(__import__('os').environ['SL_TRANSITION_TEST_OUT'])
def load(name, file):
    spec=importlib.util.spec_from_file_location(name,ROOT/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
c=load('candidate_controller','controller.py')
a=load('candidate_admission',ROOT.parent/'admission.py')
H='ae09a44ffce5860f511c08061f9621934eadbe08'
import types
old_a=types.ModuleType('previous_admission')
exec(compile(subprocess.check_output(['git','show',H+':scripts/statistical-levels-ci/admission.py'],cwd=REPO),'<historical-admission>','exec'),old_a.__dict__)
def git(*args):return subprocess.check_output(['git','--no-optional-locks',*args],cwd=REPO)
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def tree(ref):
    rows={}
    for line in git('ls-tree','-r','-z',ref).split(b'\0'):
        if line:
            header,name=line.split(b'\t');mode,kind,sha=header.decode().split();rows[name.decode()]={'mode':mode,'type':kind,'sha':sha}
    return rows
B=c.POLICY['baseline'];X=B['production_git_sha'];H='ae09a44ffce5860f511c08061f9621934eadbe08'
IDENTITY={**a.EXTRAORDINARY_EDITORIAL,'committer':a.EXTRAORDINARY_EDITORIAL['author']};E=IDENTITY['sha']
EP=IDENTITY['parent']
E_TREE=IDENTITY['tree'];X_TREE=git('rev-parse',X+'^{tree}').decode().strip()
EDPL='dpl_OfflineEditorialFixture0001';R_SHA='c'*40
SL={n:git('show',X+':'+n) for n in c.POLICY['allowlist']}
BASE_TREE=tree(X);CURRENT_TREE=tree(EP)
# The historical editorial commit keeps its own redirect configuration. AC has a different, independently pinned source subject.
E_BLOBS={**SL,**{n:git('show',E+':'+n) for n in a.EXTRAORDINARY_EDITORIAL_PATHS}}
E_ENTRIES={**CURRENT_TREE,**{n:{'mode':'100644','type':'blob','sha':blob(b)} for n,b in E_BLOBS.items()}}
NOW=dt.datetime(2026,11,17,15,0,0,tzinfo=dt.timezone.utc)
def iso(t):return t.isoformat().replace('+00:00','Z')
def marker():
    m={k:B[k] for k in ['publication_date_utc','authority_run_id','sealed_manifest_sha256','production_git_sha','production_deployment_id','main_sha_observed','provenance_sha256']}
    m.update(schema_version='statistical-levels.publication-baseline.v1',adoption_mode='existing-production-baseline',controller_version=c.POLICY['controller_version'],production_certified_at_utc='2026-11-08T00:00:00Z',workflow_execution_sha='1'*40,workflow_sha256='2'*64,production_qa_attestation_hash='3'*64)
    return m
def grant():
    identity=c.validate_preserved_editorial_snapshot(BASE_TREE,SL)
    return {'schema':'sl.editorial-authorization.v1','baseline_marker_sha256':c.digest(c.encode(marker())),
            'source':{'sha':E,'parent':EP,'tree':E_TREE},'baseline_tree':X_TREE,'deployment':EDPL,'execution_sha':R_SHA,
            'ci_run_id':'8100','ci_attempt':1,'ci_workflow_sha256':'4'*64,'release_workflow_sha256':'5'*64,
            'snapshot_manifest_sha256':identity['snapshot_manifest_sha256'],
            'rebind_window':['2026-11-17T14:00:00Z','2026-11-17T16:00:00Z'],
            'rollback_window':['2026-11-17T14:00:00Z','2026-11-18T16:00:00Z']}
def repo_info():
    return {'full_name':c.POLICY['repository'],'private':False,'id':int(c.POLICY['repository_id']),'owner':{'id':int(c.POLICY['repository_owner_id'])}}
STEPS=['Bind qualification to event SHA and governed metadata-repair successor lineage','Test bounded CI admission and producer readback','Authenticate fresh native capture handoff','Run existing release, native proof, policy and security tests','Reject missing or skipped mandatory coverage and candidate drift','Revalidate exact branch and emit bounded qualification evidence', 'Test extraordinary authority transition coverage']
def ci():
    run={'repository':repo_info(),'head_repository':repo_info(),'id':8100,'run_attempt':1,'workflow_id':336203586,'name':'CI','path':'.github/workflows/ci.yml','head_sha':R_SHA,'head_branch':c.POLICY['branch'],'event':'push','status':'completed','conclusion':'success'}
    job={'name':'validate','status':'completed','conclusion':'success','run_id':8100,'run_attempt':1,'head_sha':R_SHA,'steps':[{'name':n,'status':'completed','conclusion':'success'} for n in STEPS]}
    if c.EDITORIAL_AUTHORIZATION is not None:
        run['head_sha']=job['head_sha']=c.EDITORIAL_AUTHORIZATION['execution_sha']
    return {'run':run,'jobs':{'total_count':1,'jobs':[job]},'workflow_sha256':c.EDITORIAL_AUTHORIZATION['ci_workflow_sha256'] if c.EDITORIAL_AUTHORIZATION else '4'*64}
def source(sha):
    base={'repository':c.POLICY['repository'],'sha':sha,'branch':c.POLICY['branch'],'branch_sha':R_SHA,'main_sha':B['main_sha_observed'],
          'blobs':dict(SL),'comparison':{'base_commit':{'sha':sha},'merge_base_commit':{'sha':sha},'behind_by':0,'ahead_by':1,'status':'ahead'}}
    if c.EDITORIAL_AUTHORIZATION is not None:base['branch_sha']=c.EDITORIAL_AUTHORIZATION['execution_sha']
    if sha==E:base.update(parents=[EP],tree_sha=E_TREE,tree=copy.deepcopy(E_ENTRIES),parent_tree=CURRENT_TREE)
    elif sha==X:base.update(parents=[git('show','-s','--format=%P',X).decode().strip()],tree_sha=X_TREE,tree=copy.deepcopy(BASE_TREE),parent_tree={})
    else:raise AssertionError('unregistered local source')
    return base
def deployment(sha,dpl,target='production'):
    return {'id':dpl,'projectId':c.POLICY['project'],'readyState':'READY','target':target,
            'meta':{'githubCommitSha':sha,'githubRepo':'Luiguiherrera-web','githubOrg':'luiguiHerrera','githubCommitRef':c.POLICY['branch']},
            'url':'luiguiherrera-offline-fixture.vercel.app','ready':int((NOW-dt.timedelta(days=1)).timestamp()*1000),
            'alias':['luiguiherrera.com','www.luiguiherrera.com']}
def qa_evidence(r,phase,dpl,now,inline=False):
    execution=r['workflow_execution_sha'];runid=8200
    q={'candidate_git_sha':r['candidate_git_sha'],'deployment_id':dpl,'authority_run_id':r['authority_run_id'],
       'sealed_manifest_sha256':r['sealed_manifest_sha256'],'project_id':c.POLICY['project'],'test_version':c.POLICY['test_version'],
       'phase':phase,'result':'PASS','snapshot_count':81,'provenance_coverage':100,'capability_ids':c.POLICY['capabilities'],
       'timestamp':iso(now-dt.timedelta(seconds=1)),'defects':{f'SL_DEF_{i:03}':'PASS' for i in range(1,7)},
       'interactions':'PASS','expected_values':'PASS','routes':['/niveles-estadisticos','/en/statistical-levels'],
       'viewports':[[1440,900],[390,844]],'application_console_errors':0,'hydration_errors':0,'required_application_request_failures':0,
       'broken_assets':0,'overflow':0,'raw_platform_events':[],'raw_rsc_events':[],'unclassified_failures':[],
       'origin':c.POLICY['production_origin'] if phase=='production' else 'https://luiguiherrera-offline-fixture.vercel.app',
       'public_authority_run_id':r['authority_run_id'] if phase=='production' else None}
    h=c.digest(c.encode(q))
    run={'repository':repo_info(),'head_repository':repo_info(),'name':c.POLICY['workflow_name'],'id':runid,'path':c.POLICY['workflow_path'],'head_branch':c.POLICY['branch'],'head_sha':execution,'event':'workflow_dispatch','run_attempt':1}
    check={'id':8300,'app':{'slug':'github-actions'},'name':'statistical-levels-production-qa','head_sha':execution,'external_id':str(runid),'conclusion':'success','status':'completed','completed_at':iso(now)}
    wf=c.EDITORIAL_AUTHORIZATION['release_workflow_sha256'] if c.EDITORIAL_AUTHORIZATION else '5'*64
    evidence={'run':run,'attestation':q,'workflow_hash':wf,'approved_workflow_hash':wf,'check':check}
    if inline:
        shared={'run_id':runid,'run_attempt':1,'head_sha':execution,'head_branch':c.POLICY['branch'],'status':'completed','conclusion':'success'}
        evidence['jobs']={'total_count':2,'jobs':[{**shared,'id':8400,'name':'Statistical Levels candidate QA','completed_at':iso(now-dt.timedelta(milliseconds=500))},
            {**shared,'id':8500,'name':'statistical-levels-candidate-qa-sha256-'+h,'started_at':iso(now-dt.timedelta(milliseconds=400)),'completed_at':iso(now)}]}
    return evidence,h
class StoreError(Exception):
    def __init__(self,code):self.response={'Error':{'Code':code}}
class MemoryS3:
    def __init__(self):
        self.data={c.baseline_key():c.encode(marker())};self.writes=[];self.attempts=[];self.fail=None;self.before_put=None
    def list_objects_v2(self,**kw):return {'Contents':[{'Key':k} for k in sorted(self.data) if k.startswith(kw['Prefix'])][:kw['MaxKeys']]}
    def get_object(self,**kw):
        b=self.data[kw['Key']]
        return {'Body':bytesio.BytesIO(b),'VersionId':'v1','ServerSideEncryption':'AES256','ChecksumSHA256':c.base64.b64encode(bytes.fromhex(c.digest(b))).decode(),'ObjectLockMode':'GOVERNANCE','ObjectLockRetainUntilDate':NOW+dt.timedelta(days=2500)}
    def put_object(self,**kw):
        self.attempts.append(kw['Key'])
        if self.before_put:
            fn=self.before_put;self.before_put=None;fn(kw)
        if kw.get('IfNoneMatch')!='*':raise StoreError('AccessDenied')
        if kw['Key'] in self.data:raise StoreError('PreconditionFailed')
        if self.fail=='before':self.fail=None;raise StoreError('Unavailable')
        self.data[kw['Key']]=kw['Body'];self.writes.append(kw['Key'])
        if self.fail=='after':self.fail=None;raise StoreError('Unavailable')
        return {'VersionId':'v1'}
    def delete_object(self,**kw):raise StoreError('AccessDenied')
class ModelIO(c.ReadRuntime):
    def __init__(self):
        self.s3=MemoryS3();self.state_bucket='offline-only';self.account='000000000000';self.clock=NOW;self._token=None
        self.sources={E:source(E),X:source(X)};self.deployments={B['production_deployment_id']:deployment(X,B['production_deployment_id']),EDPL:deployment(E,EDPL)}
        self.active=B['production_deployment_id'];self.main=B['main_sha_observed'];self.qualification=ci();self.evidence={};self.rebuilds=0;self.public_ok=True
    def now(self):return self.clock
    def tick(self,n=5):self.clock+=dt.timedelta(seconds=n)
    def source(self,r):return self.sources[r['candidate_git_sha']]
    def transition_qualification(self,g):return self.qualification
    def secret(self):return 'LOCAL_TEST_VALUE_NOT_A_CREDENTIAL'
    def main_sha(self):return self.main
    def deployment(self,dpl):return self.deployments[dpl]
    def production(self):return self.deployments[self.active]
    def project(self):return {'id':c.POLICY['project'],'accountId':c.POLICY['team'],'link':{'productionBranch':c.POLICY['production_branch']}}
    def public_authority(self,run):c.need(self.public_ok,'PUBLIC_AUTHORITY_MISMATCH')
    def qa(self,r,phase):return self.evidence[phase]
    def authority(self,r,p):return self.archive
    def rebuild(self,dpl):
        self.rebuilds+=1;target='dpl_OfflineOrdinaryProduction001';self.deployments[target]=deployment(self.deployments[dpl]['meta']['githubCommitSha'],target);self.active=target;return self.deployments[target]
def transition_event(io,direction='rebind',phase='prepare',head=None):
    if head is None:head=c.resolve_effective_authority(marker(),io,allow_pending=True)['head_sha256']
    r={'operation':c.TRANSITION,'direction':direction,'phase':phase,'authorization_sha256':c.digest(c.encode(c.EDITORIAL_AUTHORIZATION)),'expected_head_sha256':head}
    if phase=='certify':
        target=c.transition_binding(c.EDITORIAL_AUTHORIZATION,1 if direction=='rebind' else 2)
        req={'candidate_git_sha':target['sha'],'authority_run_id':B['authority_run_id'],'sealed_manifest_sha256':B['sealed_manifest_sha256'],'workflow_execution_sha':c.EDITORIAL_AUTHORIZATION['execution_sha']}
        ev,h=qa_evidence(req,'production',target['deployment'],io.now());io.evidence['production']=ev
        r.update(production_qa_attestation_id='8300',production_qa_attestation_hash=h)
    return r
def complete_transition(io,direction='rebind'):
    pre=transition_event(io,direction);before=pre['expected_head_sha256'];p=c.release(pre,io)
    assert p['state']=='TRANSITION_PREPARED_NOT_CERTIFIED'
    io.active=EDPL if direction=='rebind' else B['production_deployment_id'];io.tick()
    cert=transition_event(io,direction,'certify',before);result=c.release(cert,io)
    assert result['state']=='TRANSITION_CERTIFIED'
    return pre,cert,result

def daily_fixture(io,parent=X,parent_tree=None):
    """Synthetic future data in memory, checked by all real controller validators."""
    authority='20261118T150000000Z-00000000-0000-0000-0000-000000000001';cutoff='2026-11-18T15:00:00Z'
    sha='d'*40;dpl='dpl_OfflineOrdinaryPreview001'
    p=json.loads(SL['lib/statistical-levels/generated-provenance.json']);config=p['CONFIG']
    raw={};records=[]
    for name in sorted(n for n in c.POLICY['allowlist'] if '/assets/' in n):
        ticker=Path(name).stem;key='raw/'+ticker+'.json';data=c.encode({'offline_fixture':ticker});raw[key]=data
        records.append({'ASSET':ticker,'SOURCE_FILE':key,'SHA256':c.digest(data),'BYTES':len(data),'ROW_COUNT':1,'RAW_TIMESTAMP_COUNT':1,'FIRST_DATE':'2026-11-18','LAST_DATE':'2026-11-18'})
    raw['RESERVATION']=c.encode({'RUN_ID':authority,'PROTOCOL':'statistical-levels.raw-archive.v1'})
    raw['raw-manifest.json']=c.encode({'BASELINE_ID':authority,'PROVIDER':'Yahoo','records':records,'SNAPSHOT_CUTOFF':cutoff})
    bindings=lambda:{n:{'VERSION_ID':'model-v1','BYTES':len(b),'SHA256':c.digest(b),'RETENTION':{'Mode':'GOVERNANCE','RetainUntilDate':'2032-01-01T00:00:00Z'}} for n,b in raw.items()}
    raw['provenance-manifest.json']=c.encode({'RUN_ID':authority,'PROVIDER':'Yahoo','SNAPSHOT_CUTOFF':cutoff,'GENERATOR_COMMIT':parent,'IDENTITY':'GITHUB_OIDC','ARCHIVE_BUCKET':a.BUCKET,'ARCHIVE_REGION':a.REGION,'ARCHIVE_PREFIX':'statistical-levels/raw-authority/'+authority+'/', 'OBJECTS':bindings()})
    raw['SHA256SUMS']=''.join(c.digest(raw[n])+'  '+n+'\n' for n in sorted(n for n in raw if n.startswith('raw/') or n=='raw-manifest.json')).encode()
    seal={'RUN_ID':authority,'PROTOCOL':'statistical-levels.raw-archive.v1','SNAPSHOT_CUTOFF':cutoff,'OBJECTS':bindings()}
    seal_bytes=c.encode(seal);sealhash=c.digest(seal_bytes)
    config.update(BASELINE_ID=authority,GENERATOR_COMMIT=parent,SNAPSHOT_CUTOFF=cutoff,GENERATED_AT=cutoff,RAW_ARCHIVE_RELATIVE_PATH='statistical-levels/raw-authority/'+authority+'/',RAW_ARCHIVE_SEAL_SHA256=sealhash,RAW_ARCHIVE_SEAL_VERSION='model-v1',RAW_MANIFEST_SHA256=c.digest(raw['raw-manifest.json']),RAW_ARCHIVE_MANIFEST_SHA256=c.digest(raw['SHA256SUMS']))
    for key in ['BASELINE_ID','GENERATOR_COMMIT','RAW_MANIFEST_SHA256','RAW_ARCHIVE_MANIFEST_SHA256','RAW_ARCHIVE_RELATIVE_PATH','RAW_ARCHIVE_ACCESS_CLASS','GENERATED_AT']:p[key]=config[key]
    p['CONFIG_SHA256']=c.digest(c.js_json(config))
    data={n:b+b'\n' for n,b in SL.items()};manifest=json.loads(data['lib/statistical-levels/generated/manifest.json']);manifest['baseline']['id']=authority;data['lib/statistical-levels/generated/manifest.json']=c.encode(manifest)
    recs={r['ASSET']:r for r in records}
    for snap in p['snapshots']:
        for field in ['GENERATOR_COMMIT','GENERATOR_SHA256','CONFIG_SHA256','GENERATED_AT']:snap[field]=p[field]
        snap['SNAPSHOT_SHA256']=c.digest(data['lib/statistical-levels/generated/'+snap['FILE']])
        for inp in snap['INPUTS']:
            rec=recs[inp['ASSET']];inp.update(RAW_SHA256=rec['SHA256'],RAW_ROW_COUNT=1,RAW_SOURCE_ID=authority+'/'+rec['SOURCE_FILE'],SNAPSHOT_CUTOFF=cutoff,RAW_FIRST_DATE=rec['FIRST_DATE'],RAW_LAST_DATE=rec['LAST_DATE'],CURRENT_MARK_TIMESTAMP=cutoff,COMPLETED_DAILY_ROW_COUNT=1)
    data['lib/statistical-levels/generated-provenance.json']=c.js_json(p)
    for item in c.POLICY['source_bundle']:data[item['file']]=git('show',X+':'+item['file'])
    ledger='docs/statistical-levels-capability-ledger.json';data[ledger]=git('show',X+':'+ledger)
    before=BASE_TREE if parent_tree is None else parent_tree
    after={**before,**{n:{'mode':'100644','type':'blob','sha':blob(b)} for n,b in data.items()}}
    io.sources[sha]={'repository':c.POLICY['repository'],'sha':sha,'branch':c.POLICY['branch'],'branch_sha':sha,'main_sha':B['main_sha_observed'],'parents':[parent],'tree':after,'parent_tree':before,'blobs':data,'comparison':{'base_commit':{'sha':sha},'merge_base_commit':{'sha':sha},'behind_by':0,'ahead_by':0,'status':'identical'}}
    io.archive={'seal_bytes':seal_bytes,'seal_version':'model-v1','objects':{n:{'bytes':b,'version':'model-v1'} for n,b in raw.items()}}
    io.metadata_objects={n:{'utf8':b.decode(),'sha256':c.digest(b),'bytes':len(b),'version':'model-v1'} for n,b in {**{n:raw[n] for n in a.META-{'SEALED'}},'SEALED':seal_bytes}.items()}
    io.deployments[dpl]=deployment(sha,dpl,None);io.clock=dt.datetime(2026,11,18,15,5,tzinfo=dt.timezone.utc)
    r={'operation':c.OP,'candidate_git_sha':sha,'candidate_deployment_id':dpl,'authority_run_id':authority,'sealed_manifest_sha256':sealhash,'workflow_execution_sha':sha,'workflow_run_id':'8200','expected_previous_production_sha':X,'expected_previous_production_deployment':B['production_deployment_id'],'previous_publication_date':'2026-11-07'}
    ev,h=qa_evidence(r,'preview',dpl,io.now(),True);io.evidence['preview']=ev
    r.update(qa_attestation_id='8500',qa_attestation_hash=h,qa_attestation=c.encode(ev['attestation']).decode())
    return r
def finish_daily(io,r,module=c):
    first=module.release(r,io);assert first['state']=='PROMOTED_NOT_CERTIFIED',first
    io.tick();evidence,h=qa_evidence(r,'production',first['production_deployment_id'],io.now());io.evidence['production']=evidence
    final={**r,'production_qa_attestation_id':'8300','production_qa_attestation_hash':h}
    result=module.release(final,io);assert result['state']=='PUBLISHED',result
    return result,final
