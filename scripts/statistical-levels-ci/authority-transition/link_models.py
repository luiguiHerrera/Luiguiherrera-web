"""Read-only source fixtures plus explicitly modeled service responses."""
from models import *
from pathlib import Path
import subprocess,json
from p4_cases import fixture
MODEL={'technical_model_sha':fixture()[1]}
WORKFLOW=git('show',MODEL['technical_model_sha']+':.github/workflows/statistical-levels-release.yml')
CI=git('show',MODEL['technical_model_sha']+':.github/workflows/ci.yml')
def link_grant():
 g=grant();g.update(execution_sha=MODEL['technical_model_sha'],ci_workflow_sha256=c.digest(CI),release_workflow_sha256=c.digest(WORKFLOW));return g
class LinkIO(ModelIO):
 def __init__(self):
  super().__init__();self.api={};self.reads=[];self.workflow_hash=c.digest(WORKFLOW);self.qa_calls=[]
 def gh(self,path):
  self.reads.append(path)
  if path not in self.api:raise c.Denied('MODELED_SERVER_EVIDENCE_MISSING')
  return copy.deepcopy(self.api[path])
 def raw_file(self,sha,name):
  assert sha==c.EDITORIAL_AUTHORIZATION['execution_sha'] and name==c.POLICY['workflow_path']
  return WORKFLOW
 def qa(self,request,phase):
  if request['operation']==c.TRANSITION:return c.ReadRuntime.qa(self,request,phase)
  return super().qa(request,phase)
def selection(direction,phase,head):
 return {'direction':direction,'phase':phase,'authorization_sha256':c.digest(c.encode(c.EDITORIAL_AUTHORIZATION)),'expected_head_sha256':head}
def prepare(io,direction='rebind',head=None):
 if head is None:head=c.resolve_effective_authority(marker(),io,allow_pending=True)['head_sha256']
 r={'operation':c.TRANSITION,**selection(direction,'prepare',head)}
 return r,c.release(r,io)
def produce(io,direction,head,*,runid=9001,check_id=13001):
 # Re-enter the same prepare operation after the separately modeled traffic change.
 req,response=prepare(io,direction,head)
 run={'id':str(runid),'attempt':'1','execution_sha':c.EDITORIAL_AUTHORIZATION['execution_sha']}
 observed=io.now();proof={'schema':'sl.transition-invocation-evidence.v1','request_sha256':c.digest(c.encode(req)),
  'response_sha256':c.digest(c.encode(response)),'response':response,
  'native':{'status_code':200,'executed_version':'$LATEST','request_id':'00000000-0000-0000-0000-000000000001'},
  'execution':{**run,'workflow_sha256':c.digest(WORKFLOW)},'started_at':iso(observed),'completed_at':iso(observed+dt.timedelta(milliseconds=100))}
 shared={'run_id':runid,'run_attempt':1,'head_sha':run['execution_sha'],'head_branch':c.POLICY['branch'],'status':'completed','conclusion':'success'}
 preparation={**shared,'id':14000,'name':'Statistical Levels extraordinary preparation','started_at':iso(observed-dt.timedelta(seconds=1)),'completed_at':iso(observed+dt.timedelta(seconds=1))}
 clock=observed+dt.timedelta(seconds=5)
 data={'selection':selection(direction,'certify',head),'proof':proof,'run':run,'workflow_hash':c.digest(WORKFLOW),'clock_ms':int(clock.timestamp()*1000),'check_id':check_id,
  'jobs':{'total_count':1,'jobs':[preparation]},'comparison':io.sources[response['qa_context']['target']['candidate_git_sha']]['comparison']}
 process=subprocess.run(['node',str(ROOT/'qa-producer-model.mjs')],input=json.dumps(data),text=True,capture_output=True,check=True)
 produced=json.loads(process.stdout);assert produced['remote_attempts']==0
 qa={**shared,'id':14001,'name':'Statistical Levels extraordinary '+direction+' QA','started_at':iso(clock-dt.timedelta(seconds=1)),'completed_at':iso(clock+dt.timedelta(seconds=4))}
 seal={**shared,'id':14002,'name':'statistical-levels-transition-'+direction+'-qa-sha256-'+produced['seal_sha256'],'started_at':iso(clock+dt.timedelta(seconds=5)),'completed_at':iso(clock+dt.timedelta(seconds=6))}
 metadata={'repository':repo_info(),'head_repository':repo_info(),'name':c.POLICY['workflow_name'],'id':runid,'path':c.POLICY['workflow_path'],'head_branch':c.POLICY['branch'],'head_sha':run['execution_sha'],'event':'workflow_dispatch','run_attempt':1}
 io.api['/check-runs/'+str(check_id)]=produced['check'];io.api['/actions/runs/'+str(runid)]=metadata
 io.api['/actions/runs/'+str(runid)+'/attempts/1/jobs?per_page=100']={'total_count':3,'jobs':[preparation,qa,seal]}
 io.clock=clock+dt.timedelta(seconds=7)
 r={'operation':c.TRANSITION,**selection(direction,'certify',head),'production_qa_attestation_id':str(check_id),'production_qa_attestation_hash':produced['envelope']['controller_payload_sha256']}
 io.qa_calls.append({'direction':direction,'run_id':runid,'check_id':check_id,'payload_sha256':r['production_qa_attestation_hash'],'intent_sha256':response['intent_sha256'],'calls':produced['calls']})
 return r,produced,data
