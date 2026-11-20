"""Closed capture successor. Service responses below are offline test models."""
import ast,copy,json,re,types,unittest
from models import a,c,REPO,OUT
from p4_cases import MemoryGit
import compat_cases
from compat_cases import history_module


class TechnicalCaptureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=MemoryGit();cls.head=cls.g.real.text('rev-parse','HEAD');cls.root,_=a.bootstrap(cls.g,cls.head)
        if cls.g.parents(cls.root)==[a.CATALOG_PARENT]:cls.root=a.CATALOG_PARENT
        cls.files={p:cls.g.blob(cls.root,p) for p in a.TECHNICAL_CAPTURE_FILES}
        assert cls.g.commit(a.TECHNICAL_CAPTURE_PARENT,cls.files,a.TECHNICAL_CAPTURE_IDENTITY,a.TECHNICAL_CAPTURE_MESSAGE)==cls.root

    def mutant(self,files=None,parent=None,identity=None,message=None):
        return self.g.commit(parent or a.TECHNICAL_CAPTURE_PARENT,files if files is not None else self.files,identity or a.TECHNICAL_CAPTURE_IDENTITY,message or a.TECHNICAL_CAPTURE_MESSAGE)

    def rejected(self,ref,code='.'):
        with self.assertRaisesRegex(ValueError,code):a.bootstrap(self.g,ref)

    def native(self,attempt=1):
        return compat_cases.CompatibilityTests.native_model(types.SimpleNamespace(root=self.root,g=self.g),attempt)

    def test_exact_chain_and_82_baseline_bytes(self):
        self.assertEqual(a.bootstrap(self.g,self.root),(self.root,[]))
        self.assertEqual(self.g.parents(self.root),[a.TECHNICAL_CAPTURE_PARENT])
        self.assertEqual(self.g.text('rev-parse',a.TECHNICAL_CAPTURE_PARENT+'^{tree}'),a.TECHNICAL_CAPTURE_PARENT_TREE)
        self.assertEqual(a.technical_capture_payload(self.g,self.root),a.TECHNICAL_CAPTURE_PAYLOAD_SHA256)
        self.assertEqual(len(a.paths(self.g)),82)
        for p in a.paths(self.g):self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.EXTRAORDINARY_BASELINE,p),p)

    def test_controller_dependencies_policy_and_workflow_commands_unchanged(self):
        names=[a.CI,a.LINEAGE_REGISTRY,'package.json','package-lock.json','scripts/statistical-levels-ci/policy-migration.json']
        names+=['scripts/statistical-levels-ci/authority-transition/'+p for p in ['controller.py','reference-controller.py']]
        names+=['scripts/statistical-levels-release/'+p for p in ['policy.json','source-inputs.json','scripts/release-core.mjs','scripts/runtime-io.mjs','scripts/cli.mjs','scripts/invoke.mjs','scripts/qa-runner.mjs','scripts/browser-harness.mjs','scripts/browser-harness-base.mjs','scripts/verify-braces-patch-attestation.cjs']]
        for p in names:self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.TECHNICAL_CAPTURE_PARENT,p),p)
        self.assertIsNone(c.EDITORIAL_AUTHORIZATION)

    def test_every_missing_delta_and_changed_payload_rejected(self):
        for p in self.files:
            with self.subTest(missing=p):self.rejected(self.mutant({k:v for k,v in self.files.items() if k!=p}),'EXACT_DELTA')
            with self.subTest(altered=p):self.rejected(self.mutant({**self.files,p:self.files[p]+b'\n'}))

    def test_wrong_parent_header_tree_and_unrelated_file_rejected(self):
        for parent in [a.COMPAT_PARENT,a.NEXT_SECURITY_PARENT,a.EXTRAORDINARY_EDITORIAL['sha'],self.root]:
            with self.subTest(parent=parent):self.rejected(self.mutant(parent=parent))
        self.rejected(self.mutant(message='other'),'TECHNICAL_CAPTURE_HEADER')
        self.rejected(self.mutant(identity=a.TECHNICAL_CAPTURE_IDENTITY.replace('Codex','Other')),'TECHNICAL_CAPTURE_HEADER')
        self.rejected(self.mutant({**self.files,'unapproved.txt':b'x'}),'EXACT_DELTA')
        real=self.g
        class WrongTree:
            def __getattr__(_,k):return getattr(real,k)
            def __call__(_,*args):return real(*args)
            def text(_,*args):return '0'*40 if args==('rev-parse',a.TECHNICAL_CAPTURE_PARENT+'^{tree}') else real.text(*args)
        with self.assertRaisesRegex(ValueError,'TECHNICAL_CAPTURE_PARENT_TREE'):a.validate_technical_capture(WrongTree(),self.root)

    def test_each_snapshot_route_and_date_change_rejected(self):
        for p in sorted(a.paths(self.g)):
            with self.subTest(path=p):self.rejected(self.mutant({**self.files,p:self.g.blob(self.root,p)+b'\n'}),'EXACT_DELTA')
        data=self.g.blob(self.root,a.PROVENANCE).replace(b'20261107',b'20261114')
        self.assertNotEqual(data,self.g.blob(self.root,a.PROVENANCE))
        self.rejected(self.mutant({**self.files,a.PROVENANCE:data}),'EXACT_DELTA')

    def test_payload_and_inventory_tampering_cannot_self_authorize(self):
        p='scripts/statistical-levels-ci/admission.py'
        self.rejected(self.mutant({**self.files,p:re.sub(a.TECHNICAL_CAPTURE_PIN,lambda m:m[1]+b'1'*64+m[3],self.files[p])}))
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';i=json.loads(self.files[p]);i['files']['scripts/statistical-levels-ci/admission.py']='1'*64
        self.rejected(self.mutant({**self.files,p:(json.dumps(i,indent=2)+'\n').encode()}),'TECHNICAL_CAPTURE_TEST_BYTES')

    def test_ordinary_data_successor_cannot_select_extraordinary_capture(self):
        child=self.g.commit(self.root,{p:self.g.blob(self.root,p)+b'\n' for p in a.paths(self.g)})
        self.assertEqual(a.bootstrap(self.g,child),(self.root,[child]))
        real=self.g
        for subject in [child,a.TECHNICAL_CAPTURE_PARENT,a.COMPAT_PARENT,a.EXTRAORDINARY_EDITORIAL['sha']]:
            class Head:
                def __getattr__(_,k):return getattr(real,k)
                def text(_,*args):return subject if args==('rev-parse','HEAD') else real.text(*args)
            with self.subTest(subject=subject):self.assertIsNone(a.technical_capture_identity(Head()))
        g,api,env,event=self.native();event['after']=child;env['GITHUB_SHA']=env['CI_EVENT_SHA']=env['GITHUB_WORKFLOW_SHA']=child
        # A modeled data child is not admitted on the one-time technical push.
        with self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_second_technical_child_and_noop_replay_rejected(self):
        self.rejected(self.g.commit(self.root,{}),'EXACT_DELTA')
        p='scripts/statistical-levels-release/scripts/capture-full-product.mjs'
        self.rejected(self.g.commit(self.root,{p:self.files[p]+b'\n'}),'EXACT_DELTA')

    def test_native_single_push_from_remote_root_and_attempts(self):
        evidence=[]
        for attempt in [1,2]:
            g,api,env,event=self.native(attempt);result=a.admit(g,api,env,event)
            self.assertEqual(result['mode'],'EXACT_TECHNICAL_CAPTURE_SUCCESSOR')
            self.assertEqual(result['details']['native_update'],{'before':a.COMPAT_PARENT,'after':self.root})
            self.assertFalse(result['release_authority_issued']);self.assertEqual(result['details']['intermediate_hosted_ci'],'NOT_REQUIRED_NOT_REUSED')
            self.assertEqual(api.reads,['','/actions/runs/99999999999','/git/ref/heads/'+a.BRANCH,'/git/ref/heads/'+a.BRANCH])
            evidence.append({'scope':'OFFLINE_SERVICE_MODEL_NOT_HOSTED_QUALIFICATION','event':event,'admission':result})
        (OUT/'capture-native-model.json').write_text(json.dumps(evidence,indent=2)+'\n')

    def test_native_before_intermediate_or_wrong_event_run_attempt_rejected(self):
        for kind in ['before_U','before_T','after','forced','created','deleted','attempt','ref','workflow','remote','run_sha','event','dirty']:
            g,api,env,event=self.native()
            if kind=='before_U':event['before']=a.TECHNICAL_CAPTURE_PARENT
            elif kind=='before_T':event['before']=a.NEXT_SECURITY_PARENT
            elif kind=='after':event['after']='0'*40
            elif kind in ['forced','created','deleted']:event[kind]=True
            elif kind=='attempt':env['GITHUB_RUN_ATTEMPT']='2'
            elif kind=='ref':event['ref']='refs/heads/main'
            elif kind=='workflow':env['GITHUB_WORKFLOW_SHA']='0'*40
            elif kind=='remote':api.rows['/git/ref/heads/'+a.BRANCH]['object']['sha']='0'*40
            elif kind=='run_sha':api.rows['/actions/runs/99999999999']['head_sha']='0'*40
            elif kind=='event':env['GITHUB_EVENT_NAME']='workflow_dispatch'
            else:
                original=g.text;g.text=lambda *args:' M package.json' if args[0]=='status' else original(*args)
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_native_second_head_read_and_attempt_cannot_drift(self):
        g,api,env,event=self.native();original=api.get;reads=0
        def get(p):
            nonlocal reads
            value=original(p)
            if p=='/git/ref/heads/'+a.BRANCH:
                reads+=1
                if reads==2:value['object']['sha']='0'*40
            return value
        api.get=get
        with self.assertRaises(ValueError):a.admit(g,api,env,event)
        self.assertEqual(reads,2)

    def test_126_existing_cases_and_new_coverage_are_mandatory(self):
        from run import validate_python,validate_inventory
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';old=json.loads(self.g.blob(a.TECHNICAL_CAPTURE_PARENT,p));new=json.loads(self.files[p])
        self.assertEqual(len(old['python_tests'])+len(old['node_tests']),126)
        for key in ['python_tests','node_tests','python_modules','node_files']:self.assertLessEqual(set(old[key]),set(new[key]))
        expected=sorted('capture_cases.TechnicalCaptureTests.'+n for n in dir(type(self)) if n.startswith('test_'))
        self.assertEqual(sorted(n for n in new['python_tests'] if n.startswith('capture_cases.')),expected)
        records=[{'id':n,'status':'PASS'} for n in new['python_tests']]
        for n in expected:
            with self.assertRaisesRegex(ValueError,'INVENTORY'):validate_python([r for r in records if r['id']!=n],new['python_tests'])
            for state in ['FAIL','SKIP','ERROR','INCOMPLETE']:
                with self.assertRaisesRegex(ValueError,'NOT_FULL_PASS'):validate_python([{**r,'status':state} if r['id']==n else r for r in records],new['python_tests'])
        required=set(new['node_tests'])-set(old['node_tests']);self.assertTrue(required)
        for n in required:
            with self.assertRaisesRegex(ValueError,'INVENTORY'):validate_inventory([x for x in new['node_tests'] if x!=n],new['node_tests'])

    def test_historical_subjects_assertions_and_old_bytes_preserved(self):
        for p in a.EXTRAORDINARY_HISTORICAL_FIXTURES:
            gn='git' if p.endswith('/test_lineage_admission.py') else 'f.git'
            addition=f'        if {gn}.parents(cls.root) == [a.TECHNICAL_CAPTURE_PARENT]:\n            cls.root = a.TECHNICAL_CAPTURE_PARENT\n'.encode()
            self.assertEqual(self.files[p].replace(addition,b'',1),self.g.blob(a.TECHNICAL_CAPTURE_PARENT,p))
        for p in ['compat_cases.py','next_security_cases.py']:
            path='scripts/statistical-levels-ci/authority-transition/'+p
            def bodies(ref):return {n.name:ast.dump(n) for n in ast.walk(ast.parse(self.g.blob(ref,path))) if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')}
            self.assertEqual(bodies(self.root),bodies(a.TECHNICAL_CAPTURE_PARENT))
        h=history_module();before,old=h.reuse_scope(self.g,a.TECHNICAL_CAPTURE_PARENT);after,changed=h.reuse_scope(self.g,self.root)
        affected={p for p in a.TECHNICAL_CAPTURE_FILES if p.startswith('scripts/statistical-levels-release/')}
        self.assertEqual(after,before-affected);self.assertEqual(set(changed),set(old)|affected)
        for p in changed:self.assertEqual(changed[p]['current_sha256'],a.digest(self.g.blob(self.root,p)))

    def test_manifests_pins_and_freeze_bind_capture_bytes(self):
        prefix='scripts/statistical-levels-release/';manifest=json.loads(self.files[prefix+'source-manifest.json'])
        self.assertEqual(len(manifest),111)
        for p,h in manifest.items():self.assertEqual(a.digest(self.g.blob(self.root,prefix+p)),h,p)
        sums={**manifest,'source-manifest.json':a.digest(self.files[prefix+'source-manifest.json'])}
        text=''.join(h+'  '+p+'\n' for p,h in sorted(sums.items())).encode();self.assertEqual(text,self.files[prefix+'SOURCE_SHA256SUMS'])
        wf=self.files['.github/workflows/statistical-levels-release.yml'];pins=re.findall(rb'EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})',wf)
        self.assertEqual(len(pins),10);self.assertEqual({x.decode() for x in pins},{a.digest(text)})
        freeze=json.loads(self.files[prefix+'workflow-freeze.json']);self.assertEqual(freeze['workflow_sha256'],a.digest(wf));self.assertEqual(freeze['source_sums_sha256'],a.digest(text))
