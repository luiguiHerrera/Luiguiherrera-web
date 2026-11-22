"""The native inventory repair changes only its exact reviewed CI files."""
import json
import types
import unittest
from models import a
from p4_cases import MemoryGit
import compat_cases


class NativeInventoryRepairTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g=MemoryGit()
        cls.head=cls.g.real.text('rev-parse','HEAD')
        cls.files={p:cls.g.blob(cls.head,p) for p in a.AC_CI_FILES}
        headers=cls.g('cat-file','commit',cls.head).decode().split('\n\n',1)[0].splitlines()
        cls.identity=headers[2][7:]
        assert cls.g.commit(a.AC_CI_PARENT,cls.files,cls.identity,a.AC_CI_MESSAGE)==cls.head

    def mutant(self,files=None,parent=None,message=None):
        return self.g.commit(parent or a.AC_CI_PARENT,files if files is not None else self.files,self.identity,message or a.AC_CI_MESSAGE)

    def native(self):
        g,api,env,event=compat_cases.CompatibilityTests.native_model(types.SimpleNamespace(root=self.head,g=self.g))
        event['before']=a.AC_CI_PARENT
        return g,api,env,event

    def test_exact_repair_retains_the_approved_root_and_all_data(self):
        self.assertEqual(a.bootstrap(self.g,self.head),(a.AC_CI_PARENT,[]))
        for p in a.paths(self.g):self.assertEqual(self.g.blob(self.head,p),self.g.blob(a.AC_CI_PARENT,p))
        old=json.loads(self.g.blob(a.AC_CI_PARENT,'scripts/statistical-levels-ci/authority-transition/inventory.json'))
        new=json.loads(self.files['scripts/statistical-levels-ci/authority-transition/inventory.json'])
        for key in ['python_modules','python_tests','node_files','node_tests']:
            self.assertLessEqual(set(old[key]),set(new[key]))

    def test_every_missing_or_mutated_repair_file_is_rejected(self):
        for p in self.files:
            with self.subTest(missing=p),self.assertRaises(ValueError):a.bootstrap(self.g,self.mutant({k:v for k,v in self.files.items() if k!=p}))
            with self.subTest(mutated=p),self.assertRaises(ValueError):a.bootstrap(self.g,self.mutant({**self.files,p:self.files[p]+b'\n'}))

    def test_unrelated_code_data_wrong_parent_and_second_repair_are_rejected(self):
        for p in ['package.json',a.PROVENANCE,'scripts/statistical-levels-release/source-inputs.json']:
            with self.subTest(path=p),self.assertRaises(ValueError):a.bootstrap(self.g,self.mutant({**self.files,p:self.g.blob(self.head,p)+b'\n'}))
        for parent in [a.AC_PARENT,self.head]:
            with self.subTest(parent=parent),self.assertRaises(ValueError):a.bootstrap(self.g,self.mutant(parent=parent))
        with self.assertRaises(ValueError):a.bootstrap(self.g,self.mutant(message='other repair'))

    def test_native_push_binds_the_actual_previous_head_and_never_reuses_failure(self):
        g,api,env,event=self.native();result=a.admit(g,api,env,event)
        self.assertEqual(result['mode'],'EXACT_AC_CI_INVENTORY_REPAIR')
        self.assertEqual(result['details']['native_update'],{'before':a.AC_CI_PARENT,'after':self.head})
        self.assertFalse(result['details']['ci_inventory_repair']['failed_run_reused'])
        self.assertFalse(result['release_authority_issued'])
        for wrong in [a.AC_BASE,'0'*40]:
            g,api,env,event=self.native();event['before']=wrong
            with self.assertRaisesRegex(ValueError,'BOOTSTRAP_EVENT'):a.admit(g,api,env,event)

    def test_future_data_still_requires_all_82_paths_and_exact_parent_ci(self):
        child=self.g.commit(self.head,{p:self.g.blob(self.head,p)+b'\n' for p in a.paths(self.g)})
        self.assertEqual(a.bootstrap(self.g,child),(a.AC_CI_PARENT,[child]))
        with self.assertRaisesRegex(ValueError,'EXACT_DELTA'):a.bootstrap(self.g,self.g.commit(self.head,{a.PROVENANCE:self.g.blob(self.head,a.PROVENANCE)+b'\n'}))
        class API:
            def get(_,path):return {'total_count':0,'workflow_runs':[]}
        with self.assertRaisesRegex(ValueError,'PARENT_CI_AMBIGUOUS_OR_ABSENT'):a.parent_ci(API(),self.head)

    def test_native_input_inventory_comes_from_the_immutable_approved_root(self):
        approved=json.loads(self.g.blob(a.AC_CI_PARENT,'scripts/statistical-levels-release/source-inputs.json'))
        self.assertEqual(len(approved),86)
        self.assertIn('app/(es)/analisiscuantitativo/page.tsx',approved)
        self.assertIn('app/en/quantitative-analysis/page.tsx',approved)
        self.assertNotIn('app/(es)/niveles-estadisticos/page.tsx',approved)
        for p,value in approved.items():self.assertEqual(a.digest(self.g.blob(self.head,p)),value)

    def test_actual_native_workflow_inventory_accepts_approved_files_and_rejects_drift(self):
        import hashlib
        import re
        import textwrap
        workflow=self.files['.github/workflows/ci.yml'].decode()
        start=workflow.index("              input_path='scripts/statistical-levels-release/source-inputs.json'")
        end=workflow.index("              probe_path=base/'probe-source-inputs.json'",start)
        code=compile(textwrap.dedent(workflow[start:end]),'<actual-native-input-inventory>','exec')
        def check(mutate=None,bound_root=a.AC_CI_PARENT):
            calls=0
            def parse(data):
                nonlocal calls
                calls+=1
                value=a.unique_json(data)
                if calls==1 and mutate:mutate(value)
                return value
            exec(code,{'root':self.g.real.root,'git':self.g,'unique_json':parse,'bounded':{'root_sha':bound_root},'hashlib':hashlib,'re':re})
        check()
        for mutate in [lambda x:x.pop(next(iter(x))),lambda x:x.update({'unreviewed.ts':'0'*64}),lambda x:x.update({'app/(es)/niveles-estadisticos/page.tsx':x.pop('app/(es)/analisiscuantitativo/page.tsx')}),lambda x:x.update({next(iter(x)):'0'*64})]:
            with self.assertRaises(AssertionError):check(mutate)
        with self.assertRaisesRegex(AssertionError,'CURRENT_INPUT_INVENTORY'):check(bound_root='0'*40)
