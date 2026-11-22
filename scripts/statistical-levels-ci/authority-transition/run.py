"""Mandatory supplemental coverage; never replaces the 145+23 / 40 inventories."""
import argparse,hashlib,importlib,io,json,os,re,socket,subprocess,sys,unittest
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]

def require(ok,code):
    if not ok:raise ValueError(code)

def validate_inventory(actual,expected):
    require(len(actual)==len(set(actual)) and sorted(actual)==sorted(expected),'TRANSITION_TEST_INVENTORY')

def validate_python(records,expected):
    validate_inventory([r['id'] for r in records],expected)
    require(all(set(r)=={'id','status'} and r['status']=='PASS' for r in records),'TRANSITION_PYTHON_NOT_FULL_PASS')

def validate_node(text,expected):
    require(text.startswith('TAP version 13\n') and len(re.findall(r'^TAP version 13$',text,re.M))==1,'TRANSITION_TAP_HEADER')
    plans=re.findall(r'^1\.\.(\d+)$',text,re.M)
    require(plans==[str(len(expected))],'TRANSITION_TAP_PLAN')
    rows=re.findall(r'^(ok|not ok) (\d+) - (.*)$',text,re.M)
    require([int(r[1]) for r in rows]==list(range(1,len(expected)+1)),'TRANSITION_TAP_SEQUENCE')
    require(all(r[0]=='ok' and not re.search(r' # (SKIP|TODO)',r[2]) for r in rows),'TRANSITION_NODE_NOT_FULL_PASS')
    validate_inventory([r[2] for r in rows],expected)
    for key,value in [('tests',len(expected)),('pass',len(expected)),('fail',0),('cancelled',0),('skipped',0),('todo',0)]:
        require(re.findall(r'^# '+key+r' (\d+)$',text,re.M)==[str(value)],'TRANSITION_NODE_COUNTS')

def validate_files(inventory):
    for name,digest in inventory['files'].items():
        require(not Path(name).is_absolute() and '..' not in Path(name).parts,'TRANSITION_COVERAGE_PATH')
        p=REPO/name
        require(p.is_file() and not p.is_symlink() and hashlib.sha256(p.read_bytes()).hexdigest()==digest,'TRANSITION_COVERAGE_BYTES:'+name)

class Result(unittest.TextTestResult):
    def __init__(self,*args,**kw):super().__init__(*args,**kw);self.records={}
    def startTest(self,t):super().startTest(t);self.records[t.id()]='INCOMPLETE'
    def addSuccess(self,t):super().addSuccess(t);self.records[t.id()]='PASS'
    def addFailure(self,t,e):super().addFailure(t,e);self.records[t.id()]='FAIL'
    def addError(self,t,e):super().addError(t,e);self.records[t.id()]='ERROR'
    def addSkip(self,t,r):super().addSkip(t,r);self.records[t.id()]='SKIP'
    def addExpectedFailure(self,t,e):super().addExpectedFailure(t,e);self.records[t.id()]='EXPECTED_FAILURE'
    def addUnexpectedSuccess(self,t):super().addUnexpectedSuccess(t);self.records[t.id()]='UNEXPECTED_SUCCESS'
    def addSubTest(self,t,sub,e):
        super().addSubTest(t,sub,e)
        if e:self.records[t.id()]='FAIL'

def flatten(suite):
    for case in suite:
        if isinstance(case,unittest.TestSuite):yield from flatten(case)
        else:yield case

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
    out=Path(args.out).resolve()
    require(REPO not in out.parents and out!=REPO,'TRANSITION_OUTPUT_INSIDE_CHECKOUT')
    out.mkdir(parents=True,exist_ok=False)
    os.environ['SL_TRANSITION_TEST_OUT']=str(out)
    inventory=json.loads((ROOT/'inventory.json').read_text());validate_files(inventory)
    require(inventory['schema']=='sl.authority-transition-tests.v1','TRANSITION_COVERAGE_SCHEMA')
    def forbidden(*a,**kw):raise AssertionError('NETWORK_FORBIDDEN')
    socket.create_connection=forbidden;socket.socket.connect=forbidden
    suite=unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromModule(importlib.import_module(name)) for name in inventory['python_modules'])
    validate_inventory([case.id() for case in flatten(suite)],inventory['python_tests'])
    # Model Git uses a separately loaded admission module. Release its exact
    # caches between classes rather than retaining every synthetic tree/blob.
    from models import a
    for cls in {type(case) for case in flatten(suite)}:
        for method in (a.Git.blob,a.Git.tree,a.Git.parents):cls.addClassCleanup(method.cache_clear)
    buffer=io.StringIO();result=unittest.TextTestRunner(stream=buffer,verbosity=2,resultclass=Result).run(suite)
    (out/'python.log').write_text(buffer.getvalue());print(buffer.getvalue(),end='')
    records=[{'id':name,'status':state} for name,state in result.records.items()]
    (out/'python.json').write_text(json.dumps(records,indent=2)+'\n')
    validate_python(records,inventory['python_tests'])
    require(result.wasSuccessful() and result.testsRun==len(inventory['python_tests']),'TRANSITION_PYTHON_RESULT')
    command=['node','--test','--test-concurrency=1','--test-reporter=tap',*[str(ROOT/name) for name in inventory['node_files']]]
    node=subprocess.run(command,cwd=REPO,capture_output=True,text=True,check=False)
    (out/'node.tap').write_text(node.stdout);(out/'node.stderr').write_text(node.stderr)
    require(node.returncode==0,'TRANSITION_NODE_EXIT')
    validate_node(node.stdout,inventory['node_tests']);validate_files(inventory)
    from p4_cases import fixture
    model=fixture()[1];head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    hosted=os.environ.get('GITHUB_ACTIONS')=='true'
    if hosted and os.environ.get('GITHUB_REF')=='refs/heads/vercel-deployment' and os.environ.get('GITHUB_EVENT_NAME')=='push':
        from models import a
        admitted_root,_=a.bootstrap(a.Git(REPO),head)
        if a.Git(REPO).parents(admitted_root)==[a.AC_PARENT]:admitted_root=a.bootstrap(a.Git(REPO),a.AC_BASE)[0]
        if a.Git(REPO).parents(admitted_root)==[a.CATALOG_PARENT]:admitted_root=a.CATALOG_PARENT
        if a.Git(REPO).parents(admitted_root)==[a.TECHNICAL_CAPTURE_PARENT]:admitted_root=a.TECHNICAL_CAPTURE_PARENT
        if a.Git(REPO).parents(admitted_root)==[a.NEXT_SECURITY_PARENT]:admitted_root=a.NEXT_SECURITY_PARENT
        if a.Git(REPO).parents(admitted_root)==[a.COMPAT_PARENT]:
            require(model==a.COMPAT_PARENT,'TRANSITION_HISTORICAL_ROOT')
        else:
            require(admitted_root==model,'TRANSITION_TESTED_ROOT')
        require(head==os.environ.get('GITHUB_SHA'),'TRANSITION_TESTED_SHA')
    summary={'schema':'sl.authority-transition-coverage.v1','scope':'HOSTED_TEST_EXECUTION_NOT_RELEASE_AUTHORIZATION' if hosted else 'LOCAL_TEST_EXECUTION_NOT_HOSTED_QUALIFICATION',
        'tested_model_sha':model,'checkout_head':head,'python_pass':len(records),'node_pass':len(inventory['node_tests']),'fail':0,'skip':0,
        'inventory_sha256':hashlib.sha256((ROOT/'inventory.json').read_bytes()).hexdigest(),'node_tap_sha256':hashlib.sha256(node.stdout.encode()).hexdigest(),
        'editorial_authorization':None,'release_authority_issued':False}
    (out/'coverage.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))

if __name__=='__main__':
    try:main()
    except Exception as error:print('MANDATORY_TRANSITION_COVERAGE_FAILED: '+str(error),file=sys.stderr);sys.exit(1)
