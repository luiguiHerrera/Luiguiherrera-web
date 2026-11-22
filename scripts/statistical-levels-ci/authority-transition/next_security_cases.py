"""One exact Next security successor; all service evidence is an offline model."""
import ast,copy,json,re,types,unittest
from unittest.mock import patch
from models import a,c,REPO,OUT
from p4_cases import MemoryGit
import compat_cases
from compat_cases import history_module


class NextSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=MemoryGit();cls.head=cls.g.real.text('rev-parse','HEAD');cls.root,_=a.bootstrap(cls.g,cls.head)
        if cls.g.parents(cls.root)==[a.AC_PARENT]:cls.root=a.bootstrap(cls.g,a.AC_BASE)[0]
        if cls.g.parents(cls.root)==[a.CATALOG_PARENT]:cls.root=a.CATALOG_PARENT
        if cls.g.parents(cls.root)==[a.TECHNICAL_CAPTURE_PARENT]:cls.root=a.TECHNICAL_CAPTURE_PARENT
        cls.files={p:cls.g.blob(cls.root,p) for p in a.NEXT_SECURITY_FILES}
        assert cls.g.commit(a.NEXT_SECURITY_PARENT,cls.files,a.NEXT_SECURITY_IDENTITY,a.NEXT_SECURITY_MESSAGE)==cls.root

    def mutant(self,files=None,parent=None,identity=None,message=None):
        return self.g.commit(parent or a.NEXT_SECURITY_PARENT,files if files is not None else self.files,identity or a.NEXT_SECURITY_IDENTITY,message or a.NEXT_SECURITY_MESSAGE)

    def rejected(self,ref,code='.'):
        with self.assertRaisesRegex(ValueError,code):a.bootstrap(self.g,ref)

    def native(self,attempt=1):
        return compat_cases.CompatibilityTests.native_model(types.SimpleNamespace(root=self.root,g=self.g),attempt)

    def test_exact_chain_headers_trees_and_sealed_payload(self):
        self.assertEqual(self.g.parents(self.root),[a.NEXT_SECURITY_PARENT])
        self.assertEqual(self.g.parents(a.NEXT_SECURITY_PARENT),[a.COMPAT_PARENT])
        self.assertEqual(self.g.text('rev-parse',a.NEXT_SECURITY_PARENT+'^{tree}'),a.NEXT_SECURITY_PARENT_TREE)
        self.assertEqual(self.g.text('rev-parse',a.COMPAT_PARENT+'^{tree}'),a.COMPAT_PARENT_TREE)
        for ref in [a.COMPAT_PARENT,a.NEXT_SECURITY_PARENT,self.root]:self.assertEqual(a.bootstrap(self.g,ref),(ref,[]))
        self.assertEqual(a.next_security_payload(self.g,self.root),a.NEXT_SECURITY_PAYLOAD_SHA256)

    def test_exact_next_patch_changes_no_other_dependencies(self):
        before=json.loads(self.g.blob(a.NEXT_SECURITY_PARENT,'package.json'));after=json.loads(self.files['package.json'])
        before['dependencies']['next']='16.4.5';self.assertEqual(before,after)
        before=json.loads(self.g.blob(a.NEXT_SECURITY_PARENT,'package-lock.json'));after=json.loads(self.files['package-lock.json'])
        self.assertEqual(set(before['packages']),set(after['packages']))
        affected={'','node_modules/next','node_modules/@next/env'}|{p for p in before['packages'] if p.startswith('node_modules/@next/swc-')}
        self.assertEqual(len(affected),11)
        self.assertEqual({p for p in before['packages'] if before['packages'][p]!=after['packages'][p]},affected)
        for name,value in a.NEXT_SECURITY_DEPENDENCIES.items():self.assertEqual(a.digest(self.files[name]),value)
        for name in affected-{''}:self.assertEqual(after['packages'][name]['version'],'16.4.5')

    def test_snapshot_controller_authority_and_ordinary_contracts_unchanged(self):
        for p in a.paths(self.g):self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.EXTRAORDINARY_BASELINE,p),p)
        self.assertEqual(len(a.paths(self.g)),82);self.assertIsNone(c.EDITORIAL_AUTHORIZATION)
        paths=['scripts/statistical-levels-ci/authority-transition/controller.py','scripts/statistical-levels-ci/authority-transition/reference-controller.py',a.LINEAGE_REGISTRY,'scripts/statistical-levels-ci/policy-migration.json','scripts/statistical-levels-release/policy.json','scripts/statistical-levels-release/scripts/release-core.mjs','scripts/statistical-levels-release/scripts/runtime-io.mjs','scripts/statistical-levels-release/scripts/preview-qa.mjs','scripts/statistical-levels-release/scripts/browser-harness.mjs','scripts/statistical-levels-release/scripts/verify-braces-patch-attestation.cjs','next.config.ts']
        for p in paths:self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.NEXT_SECURITY_PARENT,p),p)
        self.assertFalse(any('withdrawn-picomatch' in p or 'withdrawn-advisory' in p for p in self.g.tree(self.root)))

    def test_every_missing_delta_path_rejected(self):
        for p in self.files:
            with self.subTest(path=p):self.rejected(self.mutant({k:v for k,v in self.files.items() if k!=p}),'EXACT_DELTA')

    def test_every_changed_payload_rejected(self):
        for p in self.files:
            with self.subTest(path=p):self.rejected(self.mutant({**self.files,p:self.files[p]+b'\n'}))

    def test_wrong_parent_metadata_mode_and_extra_path_rejected(self):
        for parent in [a.COMPAT_PARENT,a.EXTRAORDINARY_EDITORIAL['sha'],a.EXTRAORDINARY_HISTORY_ROOT,self.root]:
            with self.subTest(parent=parent):self.rejected(self.mutant(parent=parent))
        self.rejected(self.mutant(message='different'),'NEXT_SECURITY_HEADER')
        self.rejected(self.mutant(identity=a.NEXT_SECURITY_IDENTITY.replace('Codex','Other')),'NEXT_SECURITY_HEADER')
        self.rejected(self.mutant({**self.files,'unapproved.txt':b'x'}),'EXACT_DELTA')
        ref=self.mutant(message='wrong mode');p='package.json';self.g.nodes[ref]['tree'][p]=('100755',self.g.nodes[ref]['tree'][p][1]);self.rejected(ref,'DELTA_MODE')

    def test_fixed_parent_tree_and_chain_cannot_be_substituted(self):
        real=self.g
        class Altered:
            def __getattr__(_,key):return getattr(real,key)
            def __call__(_,*args):return real(*args)
            def text(_,*args):return '0'*40 if args==('rev-parse',a.NEXT_SECURITY_PARENT+'^{tree}') else real.text(*args)
        with self.assertRaisesRegex(ValueError,'NEXT_SECURITY_PARENT_TREE'):a.validate_next_security(Altered(),self.root)

    def test_self_pin_and_inventory_pin_cannot_authorize_altered_bytes(self):
        p='scripts/statistical-levels-ci/admission.py'
        changed=re.sub(a.NEXT_SECURITY_PIN,lambda m:m[1]+b'1'*64+m[3],self.files[p]);self.rejected(self.mutant({**self.files,p:changed}))
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';value=json.loads(self.files[p]);value['files']['scripts/statistical-levels-ci/admission.py']='1'*64
        self.rejected(self.mutant({**self.files,p:(json.dumps(value,indent=2)+'\n').encode()}),'NEXT_SECURITY_TEST_BYTES')

    def test_wrong_next_version_or_unrelated_dependency_rejected(self):
        for old,new in [(b'16.4.5',b'16.4.6'),(b'19.0.0',b'19.0.1')]:
            for p in ['package.json','package-lock.json']:
                with self.subTest(path=p,version=new):self.rejected(self.mutant({**self.files,p:self.files[p].replace(old,new)}),'NEXT_SECURITY_DEPENDENCY')

    def test_input_manifest_only_replaces_two_exact_hashes(self):
        p='scripts/statistical-levels-release/source-inputs.json';old=json.loads(self.g.blob(a.NEXT_SECURITY_PARENT,p));current=json.loads(self.files[p])
        self.assertEqual(current,{**old,**a.NEXT_SECURITY_DEPENDENCIES});self.assertEqual(len(current),78)
        current['next.config.ts']='0'*64
        self.rejected(self.mutant({**self.files,p:(json.dumps(current,indent=2)+'\n').encode()}),'NEXT_SECURITY_INPUT_SCOPE')

    def test_historical_selectors_preserve_cases_assertions_and_subjects(self):
        for p in a.EXTRAORDINARY_HISTORICAL_FIXTURES:
            gn='git' if p.endswith('/test_lineage_admission.py') else 'f.git'
            addition=f'        if {gn}.parents(cls.root) == [a.NEXT_SECURITY_PARENT]:\n            cls.root = a.NEXT_SECURITY_PARENT\n'.encode()
            current=self.files[p];self.assertEqual(current.count(addition),1)
            self.assertEqual(current.replace(addition,b'',1),self.g.blob(a.NEXT_SECURITY_PARENT,p))
        for p in ['scripts/statistical-levels-ci/authority-transition/compat_cases.py','scripts/statistical-levels-ci/authority-transition/p4_cases.py']:
            def tests(ref):return {n.name:ast.dump(n) for n in ast.walk(ast.parse(self.g.blob(ref,p))) if isinstance(n,ast.FunctionDef) and n.name.startswith('test_')}
            before,after=tests(a.NEXT_SECURITY_PARENT),tests(self.root)
            if p.endswith('/p4_cases.py'):
                # Only the actual-checkout test unwraps the exact new root before
                # its existing assertions; every other historical body is exact.
                name='test_actual_checkout_data_matches_baseline_or_admitted_data_successor'
                original=self.g.blob(a.NEXT_SECURITY_PARENT,p);current=self.g.blob(self.root,p)
                addition=b'            if actual.parents(admitted)==[a.NEXT_SECURITY_PARENT]:admitted=a.NEXT_SECURITY_PARENT\n'
                current=current.replace(addition,b'',1)
                node=lambda data:next(ast.dump(n) for n in ast.walk(ast.parse(data)) if isinstance(n,ast.FunctionDef) and n.name==name)
                self.assertEqual(node(current),node(original));before.pop(name);after.pop(name)
            self.assertEqual(before,after)

    def test_old_scope_preserves_old_and_accounts_for_new_bytes(self):
        h=history_module();previous,old=h.reuse_scope(self.g,a.NEXT_SECURITY_PARENT);reused,changed=h.reuse_scope(self.g,self.root)
        affected={p for p in a.NEXT_SECURITY_FILES if p.startswith('scripts/statistical-levels-release/')}|{'package.json','package-lock.json'}
        self.assertEqual(reused,previous-affected);self.assertEqual(set(changed),set(old)|affected)
        self.assertEqual(h.OLD,'0004db585fb402c97d8470c31ea4e405f0905b7e')
        for p in affected:self.assertEqual(changed[p]['current_sha256'],a.digest(self.g.blob(self.root,p)))

    def test_second_security_child_replay_noop_and_editorial_escape_rejected(self):
        for files in [{},self.files,{'package.json':self.files['package.json']+b'\n'},{'public/llms.txt':b'new editorial'}]:
            with self.subTest(paths=list(files)):self.rejected(self.g.commit(self.root,files),'EXACT_DELTA')

    def test_ordinary_data_shape_and_security_guards_preserved(self):
        child=self.g.commit(self.root,{p:self.g.blob(self.root,p)+b'\n' for p in a.paths(self.g)})
        self.assertEqual(a.bootstrap(self.g,child),(self.root,[child]))
        self.rejected(self.g.commit(child,{'package.json':self.files['package.json']+b'\n'}),'EXACT_DELTA')
        for name in ['validate_data','parent_ci','bind_receipt','run_identity','current_ref','paths','delta','validate_daily_selection','producer_run','validate_compatibility','compatibility_payload']:
            def code(ref):return next(ast.dump(n) for n in ast.parse(self.g.blob(ref,'scripts/statistical-levels-ci/admission.py')).body if isinstance(n,ast.FunctionDef) and n.name==name)
            self.assertEqual(code(self.root),code(a.NEXT_SECURITY_PARENT),name)

    def test_future_data_cannot_use_missing_parent_qualification(self):
        class API:
            def get(_,path):
                self.assertIn('head_sha='+self.root,path);return {'total_count':0,'workflow_runs':[]}
        with self.assertRaisesRegex(ValueError,'PARENT_CI_AMBIGUOUS_OR_ABSENT'):a.parent_ci(API(),self.root)

    def test_native_single_push_spans_exact_chain_without_intermediate_ci(self):
        evidence=[]
        for attempt in [1,2]:
            g,api,env,event=self.native(attempt);result=a.admit(g,api,env,event)
            self.assertEqual(event['before'],a.COMPAT_PARENT);self.assertNotEqual(event['before'],self.g.parents(self.root)[0])
            self.assertEqual(result['mode'],'EXACT_NEXT_SECURITY_SUCCESSOR');self.assertEqual(result['admission'],'PASS')
            self.assertEqual(result['details']['technical_parent'],a.NEXT_SECURITY_PARENT)
            self.assertEqual(result['details']['technical_parent_hosted_ci'],'NOT_REQUIRED_NOT_REUSED')
            self.assertEqual(result['details']['native_update'],{'before':a.COMPAT_PARENT,'after':self.root})
            self.assertFalse(result['release_authority_issued']);self.assertFalse(result['details']['technical_successor_reusable'])
            self.assertEqual(api.reads,['','/actions/runs/99999999999','/git/ref/heads/'+a.BRANCH,'/git/ref/heads/'+a.BRANCH])
            evidence.append({'scope':'SYNTHETIC_SERVICE_MODEL_NOT_HOSTED_EVIDENCE','event':event,'environment':env,'api_reads':api.reads,'admission':result})
        (OUT/'next-security-native-model.json').write_text(json.dumps(evidence,indent=2)+'\n')

    def test_native_before_parent_instead_of_remote_root_is_rejected(self):
        g,api,env,event=self.native();event['before']=a.NEXT_SECURITY_PARENT
        with self.assertRaisesRegex(ValueError,'BOOTSTRAP_EVENT'):a.admit(g,api,env,event)

    def test_native_event_run_attempt_workflow_and_branch_mutations_rejected(self):
        for kind in ['before','after','forced','created','deleted','attempt','ref','workflow','remote','run_sha','event','dirty']:
            g,api,env,event=self.native()
            if kind in ['before','after']:event[kind]='0'*40
            elif kind in ['forced','created','deleted']:event[kind]=True
            elif kind=='attempt':env['GITHUB_RUN_ATTEMPT']='2'
            elif kind=='ref':event['ref']='refs/heads/other'
            elif kind=='workflow':env['GITHUB_WORKFLOW_SHA']='0'*40
            elif kind=='remote':api.rows['/git/ref/heads/'+a.BRANCH]['object']['sha']='0'*40
            elif kind=='run_sha':api.rows['/actions/runs/99999999999']['head_sha']='0'*40
            elif kind=='event':env['GITHUB_EVENT_NAME']='workflow_dispatch'
            else:
                real=g.text;g.text=lambda *args:' M package.json' if args[0]=='status' else real(*args)
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_native_second_head_read_detects_drift(self):
        g,api,env,event=self.native();real=api.get;count=0
        def get(path):
            nonlocal count
            value=real(path)
            if path=='/git/ref/heads/'+a.BRANCH:
                count+=1
                if count==2:value['object']['sha']='0'*40
            return value
        api.get=get
        with self.assertRaises(ValueError):a.admit(g,api,env,event)
        self.assertEqual(count,2)

    def test_coverage_is_additive_required_and_fails_for_missing_failed_skipped_new_case(self):
        from run import validate_inventory,validate_python
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';old=json.loads(self.g.blob(a.NEXT_SECURITY_PARENT,p));new=json.loads(self.files[p])
        self.assertEqual(len(old['python_tests'])+len(old['node_tests']),104)
        for key in ['python_tests','node_tests','python_modules','node_files']:self.assertLessEqual(set(old[key]),set(new[key]))
        required=sorted(x for x in new['python_tests'] if x.startswith('next_security_cases.'))
        declared=sorted('next_security_cases.NextSecurityTests.'+x for x in dir(type(self)) if x.startswith('test_'))
        self.assertEqual(required,declared);self.assertIn('next_security_cases',new['python_modules'])
        self.assertIn('scripts/statistical-levels-ci/authority-transition/next_security_cases.py',new['files'])
        records=[{'id':name,'status':'PASS'} for name in new['python_tests']]
        for target in required:
            with self.subTest(missing=target),self.assertRaisesRegex(ValueError,'INVENTORY'):validate_python([r for r in records if r['id']!=target],new['python_tests'])
            for status in ['FAIL','SKIP','INCOMPLETE','ERROR']:
                changed=[{**r,'status':status} if r['id']==target else r for r in records]
                with self.subTest(case=target,status=status),self.assertRaisesRegex(ValueError,'NOT_FULL_PASS'):validate_python(changed,new['python_tests'])
        self.assertEqual(self.g.blob(self.root,a.CI),self.g.blob(a.NEXT_SECURITY_PARENT,a.CI))
        self.assertIn(a.EXTRAORDINARY_CI_TEST_STEP,self.g.blob(self.root,a.CI))
        release=[p for p in self.g.tree(self.root) if p.startswith('scripts/statistical-levels-release/tests/') and p.endswith('.test.mjs') and not p.endswith(('/probe-fixture-registry.test.mjs','/g5-execution-preservation.test.mjs'))]
        self.assertEqual(len(release),40)

    def test_new_coverage_omission_or_workflow_change_cannot_be_sealed(self):
        p='scripts/statistical-levels-ci/authority-transition/inventory.json';new=json.loads(self.files[p]);new['python_tests']=[x for x in new['python_tests'] if not x.startswith('next_security_cases.')];new['python_modules'].remove('next_security_cases')
        self.rejected(self.mutant({**self.files,p:(json.dumps(new,indent=2)+'\n').encode()}))
        self.rejected(self.mutant({**self.files,a.CI:self.g.blob(self.root,a.CI).replace(a.EXTRAORDINARY_CI_TEST_STEP,b'')}),'EXACT_DELTA')

    def test_manifests_pins_and_freeze_match_actual_final_sources(self):
        prefix='scripts/statistical-levels-release/';manifest=json.loads(self.files[prefix+'source-manifest.json']);self.assertEqual(len(manifest),111)
        for p,value in manifest.items():self.assertEqual(a.digest(self.g.blob(self.root,prefix+p)),value,p)
        sums={**manifest,'source-manifest.json':a.digest(self.files[prefix+'source-manifest.json'])};self.assertEqual(len(sums),112)
        canonical=''.join(value+'  '+p+'\n' for p,value in sorted(sums.items())).encode();self.assertEqual(canonical,self.files[prefix+'SOURCE_SHA256SUMS'])
        wf=self.files['.github/workflows/statistical-levels-release.yml'];pins=re.findall(rb'EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})',wf)
        self.assertEqual(len(pins),10);self.assertEqual(set(p.decode() for p in pins),{a.digest(canonical)})
        frozen=json.loads(self.files[prefix+'workflow-freeze.json']);self.assertEqual(frozen['workflow_sha256'],a.digest(wf));self.assertEqual(frozen['source_sums_sha256'],a.digest(canonical))
