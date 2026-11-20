"""One local catalog-test successor; all service responses are offline models."""
import ast,json,re,types,unittest
from models import a,c,OUT
from p4_cases import MemoryGit
import compat_cases
from compat_cases import history_module


class CatalogClosureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=MemoryGit();cls.root=cls.g.real.text('rev-parse','HEAD')
        assert a.bootstrap(cls.g,cls.root)==(cls.root,[])
        cls.files={p:cls.g.blob(cls.root,p) for p in a.CATALOG_FILES}
        assert cls.g.commit(a.CATALOG_PARENT,cls.files,a.CATALOG_IDENTITY,a.CATALOG_MESSAGE)==cls.root

    def mutant(self,files=None,parent=None,identity=None,message=None):
        return self.g.commit(parent or a.CATALOG_PARENT,files if files is not None else self.files,identity or a.CATALOG_IDENTITY,message or a.CATALOG_MESSAGE)

    def rejected(self,subject,code='.'):
        with self.assertRaisesRegex(ValueError,code):a.bootstrap(self.g,subject)

    def native(self,attempt=1):
        return compat_cases.CompatibilityTests.native_model(types.SimpleNamespace(root=self.root,g=self.g),attempt)

    def test_exact_parent_catalog_subjects_and_all_82_bytes(self):
        self.assertEqual(self.g.parents(self.root),[a.CATALOG_PARENT])
        self.assertEqual(a.catalog_payload(self.g,self.root),a.CATALOG_PAYLOAD_SHA256)
        for p in a.paths(self.g):self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.EXTRAORDINARY_BASELINE,p),p)
        for p in a.EXTRAORDINARY_EDITORIAL_PATHS:self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.EXTRAORDINARY_EDITORIAL['sha'],p),p)
        historical=json.loads(self.g.blob(a.EXTRAORDINARY_EDITORIAL['parent'],'public/reports/manifest.json'))
        current=json.loads(self.g.blob(self.root,'public/reports/manifest.json'))
        self.assertEqual(len(historical['reports']),9);self.assertEqual(len(current['reports']),10)
        self.assertEqual(current['reports'][-1]['id'],'segundo-informe-noviembre-2026')
        mapped=a.reconciled_report_hashes(self.g,self.root);prior=a.reconciled_report_hashes(self.g,a.CATALOG_PARENT)
        self.assertEqual(mapped,{**prior,a.CATALOG_TEST:a.digest(self.files[a.CATALOG_TEST])})

    def test_release_authority_dependencies_and_capture_guarantees_unchanged(self):
        names=[a.CI,a.LINEAGE_REGISTRY,'package.json','package-lock.json','scripts/statistical-levels-ci/policy-migration.json']
        names+=['scripts/statistical-levels-ci/authority-transition/'+p for p in ['controller.py','reference-controller.py']]
        names+=['scripts/statistical-levels-release/'+p for p in ['policy.json','source-inputs.json','scripts/preview-qa.mjs','scripts/release-core.mjs','scripts/runtime-io.mjs','scripts/cli.mjs','scripts/invoke.mjs','scripts/qa-runner.mjs','scripts/browser-harness.mjs']]
        for p in names:self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.CATALOG_PARENT,p),p)
        self.assertIsNone(c.EDITORIAL_AUTHORIZATION)
        p='scripts/statistical-levels-release/scripts/capture-full-product.mjs'
        old=b"  if (parents !== 'e66a44e90628154546d0190c69ba5030828d972a') return null;"
        new=b"  if (parents !== 'e66a44e90628154546d0190c69ba5030828d972a' && parents !== 'bb54caa5084dbc8ed0833ca9dcbbe3c3218db84e') return null;"
        self.assertEqual(self.files[p],self.g.blob(a.CATALOG_PARENT,p).replace(old,new,1))

    def test_each_closed_delta_path_missing_or_changed_is_rejected(self):
        for p in self.files:
            with self.subTest(missing=p):self.rejected(self.mutant({k:v for k,v in self.files.items() if k!=p}),'EXACT_DELTA')
            with self.subTest(changed=p):self.rejected(self.mutant({**self.files,p:self.files[p]+b'\n'}))
        self.rejected(self.mutant({**self.files,'public/reports/manifest.json':self.g.blob(self.root,'public/reports/manifest.json')+b'\n'}),'EXACT_DELTA')
        self.rejected(self.mutant({**self.files,'unapproved.txt':b'x'}),'EXACT_DELTA')

    def test_snapshot_date_and_every_route_mutation_is_rejected(self):
        for p in a.paths(self.g):
            with self.subTest(path=p):self.rejected(self.mutant({**self.files,p:self.g.blob(self.root,p)+b'\n'}),'EXACT_DELTA')
        value=self.g.blob(self.root,a.PROVENANCE).replace(b'20261107',b'20261114')
        self.assertNotEqual(value,self.g.blob(self.root,a.PROVENANCE))
        self.rejected(self.mutant({**self.files,a.PROVENANCE:value}),'EXACT_DELTA')

    def test_wrong_parent_header_second_technical_child_and_replay_rejected(self):
        for parent in [a.TECHNICAL_CAPTURE_PARENT,a.NEXT_SECURITY_PARENT,a.COMPAT_PARENT,self.root]:
            with self.subTest(parent=parent):self.rejected(self.mutant(parent=parent))
        self.rejected(self.mutant(message='not authorized'),'CATALOG_HEADER')
        self.rejected(self.mutant(identity=a.CATALOG_IDENTITY.replace('Codex','Other')),'CATALOG_HEADER')
        self.rejected(self.g.commit(self.root,{}),'EXACT_DELTA')
        self.rejected(self.g.commit(self.root,{a.CATALOG_TEST:self.files[a.CATALOG_TEST]+b'\n'}),'EXACT_DELTA')

    def test_ordinary_data_child_cannot_select_preserved_capture(self):
        child=self.g.commit(self.root,{p:self.g.blob(self.root,p)+b'\n' for p in a.paths(self.g)})
        self.assertEqual(a.bootstrap(self.g,child),(self.root,[child]))
        real=self.g
        class Head:
            def __getattr__(_,k):return getattr(real,k)
            def text(_,*args):return child if args==('rev-parse','HEAD') else real.text(*args)
        self.assertIsNone(a.technical_capture_identity(Head()))
        g,api,env,event=self.native();event['after']=child;env['GITHUB_SHA']=env['CI_EVENT_SHA']=env['GITHUB_WORKFLOW_SHA']=child
        with self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_exact_native_push_model_has_no_intermediate_qualification_or_authority(self):
        rows=[]
        for attempt in [1,2]:
            g,api,env,event=self.native(attempt);result=a.admit(g,api,env,event)
            self.assertEqual(result['mode'],'EXACT_CATALOG_CLOSURE_SUCCESSOR')
            self.assertEqual(result['details']['native_update'],{'before':a.COMPAT_PARENT,'after':self.root})
            self.assertEqual(result['details']['intermediate_hosted_ci'],'NOT_REQUIRED_NOT_REUSED')
            self.assertFalse(result['release_authority_issued'])
            self.assertEqual(api.reads,['','/actions/runs/99999999999','/git/ref/heads/'+a.BRANCH,'/git/ref/heads/'+a.BRANCH])
            rows.append({'scope':'OFFLINE_MODEL_NOT_HOSTED_QUALIFICATION','event':event,'admission':result})
        (OUT/'catalog-native-model.json').write_text(json.dumps(rows,indent=2)+'\n')

    def test_wrong_event_before_after_run_attempt_and_head_drift_rejected(self):
        for kind in ['before_V','before_U','after','forced','created','deleted','attempt','ref','workflow','run_sha','remote','second_head','event']:
            g,api,env,event=self.native()
            if kind=='before_V':event['before']=a.CATALOG_PARENT
            elif kind=='before_U':event['before']=a.TECHNICAL_CAPTURE_PARENT
            elif kind=='after':event['after']='0'*40
            elif kind in ['forced','created','deleted']:event[kind]=True
            elif kind=='attempt':env['GITHUB_RUN_ATTEMPT']='2'
            elif kind=='ref':event['ref']='refs/heads/main'
            elif kind=='workflow':env['GITHUB_WORKFLOW_SHA']='0'*40
            elif kind=='run_sha':api.rows['/actions/runs/99999999999']['head_sha']='0'*40
            elif kind=='remote':api.rows['/git/ref/heads/'+a.BRANCH]['object']['sha']='0'*40
            elif kind=='event':env['GITHUB_EVENT_NAME']='workflow_dispatch'
            else:
                original=api.get;reads=0
                def get(p):
                    nonlocal reads
                    value=original(p)
                    if p=='/git/ref/heads/'+a.BRANCH:
                        reads+=1
                        if reads==2:value['object']['sha']='0'*40
                    return value
                api.get=get
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_original_assertions_subjects_and_151_cases_remain_required(self):
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';prior=json.loads(self.g.blob(a.CATALOG_PARENT,p));now=json.loads(self.files[p])
        self.assertEqual(len(prior['python_tests'])+len(prior['node_tests']),151)
        for key in ['python_tests','node_tests','python_modules','node_files']:self.assertLessEqual(set(prior[key]),set(now[key]))
        from run import validate_python
        records=[{'id':n,'status':'PASS'} for n in now['python_tests']]
        for n in [n for n in now['python_tests'] if n.startswith('catalog_cases.')]:
            with self.assertRaisesRegex(ValueError,'INVENTORY'):validate_python([r for r in records if r['id']!=n],now['python_tests'])
            for state in ['FAIL','SKIP','ERROR','INCOMPLETE']:
                with self.assertRaisesRegex(ValueError,'NOT_FULL_PASS'):validate_python([{**r,'status':state} if r['id']==n else r for r in records],now['python_tests'])
        before=self.g.blob(a.CATALOG_PARENT,a.CATALOG_TEST).decode();after=self.files[a.CATALOG_TEST].decode()
        start=before.index('function verifyNovemberManifest(');end=before.index('function verifyEditorialProduction(')
        self.assertIn(before[start:end],after)
        start=before.index("test('composed execution preserves");self.assertIn(before[start:],after)
        self.assertEqual(history_module().OLD,'0004db585fb402c97d8470c31ea4e405f0905b7e')
        for name in a.EXTRAORDINARY_HISTORICAL_FIXTURES:
            gn='git' if name.endswith('/test_lineage_admission.py') else 'f.git'
            added=f'        if {gn}.parents(cls.root) == [a.CATALOG_PARENT]:\n            cls.root = a.CATALOG_PARENT\n'.encode()
            self.assertEqual(self.files[name].replace(added,b'',1),self.g.blob(a.CATALOG_PARENT,name))
        for name in ['capture_cases.py','compat_cases.py','next_security_cases.py']:
            p='scripts/statistical-levels-ci/authority-transition/'+name
            def bodies(ref):return {n.name:ast.dump(n) for n in ast.walk(ast.parse(self.g.blob(ref,p))) if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')}
            self.assertEqual(bodies(self.root),bodies(a.CATALOG_PARENT))

    def test_manifest_pins_freeze_and_historical_scope_are_exact(self):
        prefix='scripts/statistical-levels-release/';manifest=json.loads(self.files[prefix+'source-manifest.json'])
        self.assertEqual(len(manifest),111)
        for p,h in manifest.items():self.assertEqual(a.digest(self.g.blob(self.root,prefix+p)),h,p)
        sums={**manifest,'source-manifest.json':a.digest(self.files[prefix+'source-manifest.json'])}
        data=''.join(h+'  '+p+'\n' for p,h in sorted(sums.items())).encode();self.assertEqual(data,self.files[prefix+'SOURCE_SHA256SUMS'])
        wf=self.files['.github/workflows/statistical-levels-release.yml'];pins=re.findall(rb'EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})',wf)
        self.assertEqual(len(pins),10);self.assertEqual({p.decode() for p in pins},{a.digest(data)})
        freeze=json.loads(self.files[prefix+'workflow-freeze.json']);self.assertEqual(freeze['workflow_sha256'],a.digest(wf));self.assertEqual(freeze['source_sums_sha256'],a.digest(data))
        h=history_module();previous,old=h.reuse_scope(self.g,a.CATALOG_PARENT);current,changed=h.reuse_scope(self.g,self.root)
        affected={p for p in a.CATALOG_FILES if p.startswith(prefix)}
        self.assertEqual(current,previous-affected);self.assertEqual(set(changed),set(old)|affected)
        for p in changed:self.assertEqual(changed[p]['current_sha256'],a.digest(self.g.blob(self.root,p)))
