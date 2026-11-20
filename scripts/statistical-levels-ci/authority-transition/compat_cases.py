"""Closed technical successor and OLD scope; synthetic service evidence only."""
import ast,copy,hashlib,importlib.util,json,sys,unittest
from unittest.mock import patch
from models import a,REPO
from p4_cases import MemoryGit
# The historical runner imports the same candidate admission module by its CLI name.
sys.modules.setdefault('admission',a)

def history_module():
    spec=importlib.util.spec_from_file_location('compat_history',REPO/'scripts/statistical-levels-ci/historical-tests.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

class CompatibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=MemoryGit();cls.head=cls.g.real.text('rev-parse','HEAD');cls.root,_=a.bootstrap(cls.g,cls.head)
        if cls.g.parents(cls.root)==[a.CATALOG_PARENT]:cls.root=a.CATALOG_PARENT
        if cls.g.parents(cls.root)==[a.TECHNICAL_CAPTURE_PARENT]:cls.root=a.TECHNICAL_CAPTURE_PARENT
        if cls.g.parents(cls.root)==[a.NEXT_SECURITY_PARENT]:cls.root=a.NEXT_SECURITY_PARENT
        cls.files={p:cls.g.blob(cls.root,p) for p in a.COMPAT_FILES}
        assert cls.g.commit(a.COMPAT_PARENT,cls.files,a.COMPAT_IDENTITY,a.COMPAT_MESSAGE)==cls.root
    def mutant(self,files=None,parent=None,identity=None,message=None):
        return self.g.commit(parent or a.COMPAT_PARENT,files if files is not None else self.files,identity or a.COMPAT_IDENTITY,message or a.COMPAT_MESSAGE)
    def rejected(self,subject,code='.'):
        with self.assertRaisesRegex(ValueError,code):a.bootstrap(self.g,subject)
    def test_exact_parent_payload_and_prior_lineage(self):
        self.assertEqual(a.bootstrap(self.g,self.root),(self.root,[]))
        self.assertEqual(a.bootstrap(self.g,a.COMPAT_PARENT),(a.COMPAT_PARENT,[]))
        self.assertEqual(self.g.parents(self.root),[a.COMPAT_PARENT])
    def test_all_82_bytes_and_authority_protocol_are_preserved(self):
        self.assertEqual(len(a.paths(self.g)),82)
        for p in a.paths(self.g):self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.EXTRAORDINARY_BASELINE,p),p)
        names=['package.json','package-lock.json',a.CI,a.LINEAGE_REGISTRY,'scripts/statistical-levels-ci/authority-transition/controller.py','scripts/statistical-levels-ci/authority-transition/reference-controller.py','scripts/statistical-levels-ci/policy-migration.json']
        names += ['scripts/statistical-levels-release/'+n for n in ['policy.json','source-inputs.json','scripts/release-core.mjs','scripts/runtime-io.mjs','scripts/probe-core.mjs','scripts/cli.mjs','scripts/invoke.mjs','scripts/browser-harness.mjs']]
        for p in names:self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.COMPAT_PARENT,p),p)
        self.assertIn(b'EDITORIAL_AUTHORIZATION = None',self.g.blob(self.root,names[4]))
        self.assertFalse(any('withdrawn-picomatch' in p or 'withdrawn-advisory' in p for p in self.g.tree(self.root)))
    def test_each_missing_closed_delta_file_is_rejected(self):
        for p in self.files:
            with self.subTest(path=p):self.rejected(self.mutant({n:b for n,b in self.files.items() if n!=p}),'EXACT_DELTA')
    def test_each_changed_closed_payload_is_rejected(self):
        for p in self.files:
            with self.subTest(path=p):self.rejected(self.mutant({**self.files,p:self.files[p]+b'\n'}))
    def test_unrelated_file_parent_header_and_mode_rejected(self):
        self.rejected(self.mutant({**self.files,'unreviewed.txt':b'no'}),'EXACT_DELTA')
        for p in [a.EXTRAORDINARY_EDITORIAL['sha'],a.EXTRAORDINARY_HISTORY_ROOT,self.root]:self.rejected(self.mutant(parent=p))
        self.rejected(self.mutant(message='changed'),'COMPAT_HEADER')
        self.rejected(self.mutant(identity=a.COMPAT_IDENTITY.replace('Codex','Other')),'COMPAT_HEADER')
        h=self.mutant(message='mode fixture');name=next(iter(self.files));self.g.nodes[h]['tree'][name]=('100755',self.g.nodes[h]['tree'][name][1]);self.rejected(h,'DELTA_MODE')
    def test_second_technical_child_and_noop_replay_rejected(self):
        self.rejected(self.g.commit(self.root,{}),'EXACT_DELTA')
        self.rejected(self.g.commit(self.root,{'scripts/statistical-levels-ci/historical-tests.py':self.files['scripts/statistical-levels-ci/historical-tests.py']+b'\n'}),'EXACT_DELTA')
    def test_ordinary_data_shape_and_no_later_technical_escape(self):
        child=self.g.commit(self.root,{p:self.g.blob(self.root,p)+b'\n' for p in a.paths(self.g)})
        self.assertEqual(a.bootstrap(self.g,child),(self.root,[child]))
        self.rejected(self.g.commit(child,{'public/llms.txt':b'new editorial'}),'EXACT_DELTA')
        for name in ['validate_data','parent_ci','bind_receipt','run_identity','current_ref','paths','delta','validate_daily_selection','producer_run']:
            def node(ref):return next(ast.dump(n) for n in ast.parse(self.g.blob(ref,'scripts/statistical-levels-ci/admission.py')) .body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name==name)
            self.assertEqual(node(self.root),node(a.COMPAT_PARENT),name)
    def test_five_historical_selectors_preserve_every_original_byte(self):
        for p in a.EXTRAORDINARY_HISTORICAL_FIXTURES:
            gn='git' if p.endswith('/test_lineage_admission.py') else 'f.git'
            addition=f'        if {gn}.parents(cls.root) == [a.COMPAT_PARENT]:\n            cls.root = a.COMPAT_PARENT\n'.encode()
            current=self.g.blob(self.root,p);self.assertEqual(current.count(addition),1)
            self.assertEqual(current.replace(addition,b'',1),self.g.blob(a.COMPAT_PARENT,p))
    def test_existing_78_cases_and_40_files_remain_mandatory(self):
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';old=json.loads(self.g.blob(a.COMPAT_PARENT,p));new=json.loads(self.g.blob(self.root,p))
        self.assertEqual(len(old['python_tests'])+len(old['node_tests']),78)
        for k in ['python_tests','node_tests','python_modules','node_files']:self.assertLessEqual(set(old[k]),set(new[k]))
        release=[p for p in self.g.tree(self.root) if p.startswith('scripts/statistical-levels-release/tests/') and p.endswith('.test.mjs') and not p.endswith(('/probe-fixture-registry.test.mjs','/g5-execution-preservation.test.mjs'))]
        self.assertEqual(len(release),40)
    def test_historical_QA_workflows_are_from_their_real_subject(self):
        import link_models
        self.assertEqual(link_models.MODEL['technical_model_sha'],a.COMPAT_PARENT)
        self.assertEqual(link_models.CI,self.g.blob(a.COMPAT_PARENT,a.CI))
        self.assertEqual(link_models.WORKFLOW,self.g.blob(a.COMPAT_PARENT,'.github/workflows/statistical-levels-release.yml'))
    def test_old_subject_exact_harness_exception_and_closed_repair_exclusions(self):
        h=history_module();reused,changed=h.reuse_scope(self.g,self.root)
        name='scripts/statistical-levels-release/scripts/browser-harness.mjs'
        self.assertNotIn(name,reused)
        self.assertEqual(changed[name],{'old_sha256':'2896a2c3f2886321eb47291a007fdf272ec95f4f4a593362d9a4a4ca6f04bf4c','current_sha256':'dc1d4bb7d45dc3a3daa253c5c0c4a74b1c764b110cfb4eb040ef38e6d3217589'})
        self.assertEqual(h.OLD,'0004db585fb402c97d8470c31ea4e405f0905b7e')
        old_reused,old_changed=h.reuse_scope(self.g,a.COMPAT_PARENT)
        affected={p for p in a.COMPAT_FILES if p.startswith('scripts/statistical-levels-release/')}
        self.assertEqual(reused,old_reused-affected);self.assertEqual(set(changed),set(old_changed)|affected)
    def test_old_scope_rejects_wrong_harness_blob_mode_bytes_and_other_paths(self):
        h=history_module();real=self.g.real;target=a.COMPAT_PARENT;name='scripts/statistical-levels-release/scripts/browser-harness.mjs'
        for kind in ['blob','mode','bytes','other']:
            class Altered:
                def __getattr__(_,attr):return getattr(real,attr)
                def __call__(_, *args):return real(*args)
                def tree(_,ref):
                    rows=dict(real.tree(ref))
                    if ref==target:
                        if kind=='blob':rows[name]=('100644','0'*40)
                        if kind=='mode':rows[name]=('100755',rows[name][1])
                        if kind=='other':rows['scripts/statistical-levels-release/scripts/qa-runner.mjs']=('100644','0'*40)
                    return rows
                def blob(_,ref,path):return real.blob(ref,path)+(b'\n' if ref==target and path==name and kind=='bytes' else b'')
            # Isolate the OLD predicate after admission, which has separate mutant coverage.
            with self.subTest(kind=kind),patch.object(h,'bootstrap',side_effect=lambda g,ref:(target,[]) if ref==target else a.bootstrap(g,ref)),self.assertRaisesRegex(ValueError,'LINEAGE_HARNESS_|LINEAGE_HISTORICAL_BYTES'):
                h.reuse_scope(Altered(),target)
    def test_closed_source_manifest_and_workflow_pins(self):
        import re
        prefix='scripts/statistical-levels-release/';manifest=json.loads(self.g.blob(self.root,prefix+'source-manifest.json'));self.assertEqual(len(manifest),111)
        for p,value in manifest.items():self.assertEqual(a.digest(self.g.blob(self.root,prefix+p)),value,p)
        wf=self.g.blob(self.root,'.github/workflows/statistical-levels-release.yml');pins=re.findall(rb'EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})',wf)
        self.assertEqual(len(pins),10);self.assertEqual(set(p.decode() for p in pins),{a.digest(self.g.blob(self.root,prefix+'SOURCE_SHA256SUMS'))})
    def native_model(self,attempt=1):
        repo={'id':a.REPO_ID,'full_name':a.REPO,'default_branch':a.BRANCH};head=self.root
        env={'GITHUB_REPOSITORY':a.REPO,'GITHUB_REPOSITORY_ID':str(a.REPO_ID),'GITHUB_REF':'refs/heads/'+a.BRANCH,'GITHUB_WORKFLOW_REF':a.REPO+'/'+a.CI+'@refs/heads/'+a.BRANCH,'GITHUB_WORKFLOW_SHA':head,'GITHUB_SHA':head,'CI_EVENT_SHA':head,'GITHUB_RUN_ID':'99999999999','GITHUB_RUN_ATTEMPT':str(attempt),'GITHUB_EVENT_NAME':'push'}
        event={'repository':repo,'before':a.COMPAT_PARENT,'after':head,'ref':env['GITHUB_REF'],'forced':False,'created':False,'deleted':False}
        class API:
            def __init__(self):self.reads=[];self.rows={'':repo,'/actions/runs/99999999999':{'repository':repo,'head_repository':repo,'id':99999999999,'run_attempt':attempt,'workflow_id':a.CI_ID,'path':a.CI,'head_sha':head,'head_branch':a.BRANCH,'event':'push'},'/git/ref/heads/'+a.BRANCH:{'object':{'sha':head,'type':'commit','url':'https://api.github.com/repos/'+a.REPO+'/git/commits/'+head}}}
            def get(self,p):self.reads.append(p);return copy.deepcopy(self.rows[p])
        class Native:
            def __getattr__(_,name):return getattr(self.g,name)
            def __call__(_, *args):return self.g(*args)
            def text(_, *args):
                if args==('rev-parse','HEAD'):return head
                if args[0]=='status':return ''
                return self.g.text(*args)
        return Native(),API(),env,event
    def test_native_admission_uses_exact_synthetic_run_and_both_head_reads(self):
        for attempt in [1,2]:
            g,api,env,event=self.native_model(attempt);result=a.admit(g,api,env,event)
            self.assertEqual(result['mode'],'EXACT_HISTORICAL_COMPATIBILITY_SUCCESSOR');self.assertEqual(result['admission'],'PASS')
            self.assertFalse(result['release_authority_issued']);self.assertEqual(result['details']['parent_hosted_ci'],'FAILED_NOT_REUSED')
            self.assertEqual(api.reads,['','/actions/runs/99999999999','/git/ref/heads/'+a.BRANCH,'/git/ref/heads/'+a.BRANCH])
    def test_native_identity_before_after_attempt_and_remote_mismatches_fail(self):
        for kind in ['before','after','forced','attempt','ref','workflow','remote','run_sha']:
            g,api,env,event=self.native_model()
            if kind in ['before','after']:event[kind]='0'*40
            elif kind=='forced':event[kind]=True
            elif kind=='attempt':env['GITHUB_RUN_ATTEMPT']='2'
            elif kind=='ref':env['GITHUB_REF']='refs/heads/other'
            elif kind=='workflow':env['GITHUB_WORKFLOW_SHA']='0'*40
            elif kind=='remote':api.rows['/git/ref/heads/'+a.BRANCH]['object']['sha']='0'*40
            else:api.rows['/actions/runs/99999999999']['head_sha']='0'*40
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.admit(g,api,env,event)
