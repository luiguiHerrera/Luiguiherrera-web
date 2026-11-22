"""Closed AC source transition; service responses are offline models only."""
import ast
import json
import types
import unittest
from models import a
from p4_cases import MemoryGit
import compat_cases


class QuantitativeReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.g = MemoryGit()
        cls.root = cls.g.real.text('rev-parse', 'HEAD')
        cls.files = {p:cls.g.blob(cls.root, p) for p in a.AC_FILES}
        headers=cls.g('cat-file','commit',cls.root).decode().split('\n\n',1)[0].splitlines()
        cls.identity=headers[2][7:]
        assert cls.g.commit(a.AC_PARENT, cls.files, cls.identity, a.AC_MESSAGE) == cls.root

    def mutant(self, files=None, parent=None, identity=None, message=None):
        return self.g.commit(parent or a.AC_PARENT, files if files is not None else self.files,
                             identity or self.identity, message or a.AC_MESSAGE)

    def rejected(self, subject, code='.'):
        with self.assertRaisesRegex(ValueError, code):a.bootstrap(self.g, subject)

    def native(self):
        g, api, env, event = compat_cases.CompatibilityTests.native_model(types.SimpleNamespace(root=self.root, g=self.g))
        event['before'] = a.AC_BASE
        return g, api, env, event

    def test_exact_approved_chain_and_qualification_payload(self):
        self.assertEqual(a.bootstrap(self.g, self.root), (self.root, []))
        self.assertEqual(a.ac_payload(self.g, self.root), a.AC_PAYLOAD_SHA256)
        self.assertEqual(self.g.parents(a.AC_PARENT), [a.AC_SOURCE])
        self.assertEqual(self.g.parents(a.AC_SOURCE), [a.AC_BASE])
        previous=a.reconciled_report_hashes(self.g,a.AC_BASE)
        expected={**previous,**{n:a.digest(self.g.blob(a.AC_SOURCE,n)) for n in ['lib/statistical-levels/contracts.test.ts','lib/statistical-levels/interpretation.ts','lib/statistical-levels/types.ts']}}
        self.assertEqual(a.reconciled_report_hashes(self.g,self.root),expected)

    def test_every_missing_or_changed_qualification_file_is_rejected(self):
        for p in self.files:
            with self.subTest(missing=p):self.rejected(self.mutant({k:v for k,v in self.files.items() if k != p}), 'EXACT_DELTA')
            with self.subTest(changed=p):self.rejected(self.mutant({**self.files, p:self.files[p]+b'\n'}))

    def test_unrelated_files_and_each_snapshot_mutation_are_rejected(self):
        self.rejected(self.mutant({**self.files, 'unapproved.txt':b'x'}), 'EXACT_DELTA')
        for p in a.paths(self.g):
            with self.subTest(path=p):self.rejected(self.mutant({**self.files, p:self.g.blob(self.root,p)+b'\n'}), 'EXACT_DELTA')

    def test_wrong_parent_header_noop_and_second_source_child_are_rejected(self):
        for parent in [a.AC_BASE, a.AC_SOURCE, self.root]:
            with self.subTest(parent=parent):self.rejected(self.mutant(parent=parent))
        self.rejected(self.mutant(message='another release'), 'AC_HEADER')
        self.rejected(self.mutant(identity='Other <other@example.invalid> '+' '.join(self.identity.rsplit(' ',2)[1:])), 'AC_HEADER')
        self.rejected(self.g.commit(self.root, {}), 'EXACT_DELTA')
        self.rejected(self.g.commit(self.root, {'package.json':self.g.blob(self.root,'package.json')+b'\n'}), 'EXACT_DELTA')

    def test_existing_metrics_and_all_recent_samples_are_preserved(self):
        for p in a.paths(self.g)-{a.PROVENANCE}:
            if '/assets/' not in p:
                self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.AC_BASE,p));continue
            old,new=(json.loads(self.g.blob(ref,p)) for ref in [a.AC_BASE,self.root])
            for data in new['frequencies'].values():
                self.assertEqual(len(data.pop('periodHistory')),max(0,data['periods']-1))
            self.assertEqual(new,old,p)

    def test_production_baseline_and_ordinary_security_guards_are_preserved(self):
        prefix='scripts/statistical-levels-release/'
        old,new=(json.loads(self.g.blob(ref,prefix+'policy.json')) for ref in [a.AC_PARENT,self.root])
        baseline=dict(new['baseline'])
        self.assertEqual(baseline.pop('source_bundle'),old['source_bundle'])
        self.assertEqual(baseline.pop('ledger_hash'),old['ledger_hash'])
        self.assertEqual(baseline,old['baseline'])
        for name in ['validate_data','parent_ci','bind_receipt','run_identity','current_ref','paths','delta','validate_daily_selection','producer_run']:
            def code(ref):return next(ast.dump(n) for n in ast.parse(self.g.blob(ref,'scripts/statistical-levels-ci/admission.py')).body if isinstance(n,ast.FunctionDef) and n.name==name)
            self.assertEqual(code(self.root),code(a.AC_PARENT),name)
        for p in [a.PRODUCER,prefix+'scripts/runtime-io.mjs',prefix+'probe-source-inputs.json']:
            self.assertEqual(self.g.blob(self.root,p),self.g.blob(a.AC_PARENT,p),p)

    def test_live_route_coverage_preserves_all_other_release_core_bytes(self):
        path='scripts/statistical-levels-release/scripts/release-core.mjs'
        original=self.g.blob(a.AC_PARENT,path).decode()
        current=self.g.blob(self.root,path).decode()
        before="canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels']))"
        after="(canonical(report.routes).equals(canonical(['/niveles-estadisticos', '/en/statistical-levels'])) || canonical(report.routes).equals(canonical(['/analisiscuantitativo', '/en/quantitative-analysis'])))"
        self.assertEqual(current.count(after),1)
        self.assertEqual(current.replace(after,before),original)

    def test_exact_native_push_requires_new_ci_and_issues_no_authority(self):
        g,api,env,event=self.native();result=a.admit(g,api,env,event)
        self.assertEqual(result['mode'],'EXACT_AC_SOURCE_RELEASE')
        self.assertEqual(result['details']['native_update'],{'before':a.AC_BASE,'after':self.root})
        self.assertFalse(result['details']['archive_replay_is_native_producer_receipt'])
        self.assertTrue(result['details']['authority_transition_required'])
        self.assertFalse(result['release_authority_issued'])

    def test_native_identity_and_wrong_before_after_are_rejected(self):
        for kind in ['before','after','forced','attempt','workflow','remote','source_branch']:
            g,api,env,event=self.native()
            if kind in ['before','after']:event[kind]='0'*40
            elif kind=='forced':event['forced']=True
            elif kind=='attempt':env['GITHUB_RUN_ATTEMPT']='2'
            elif kind=='workflow':env['GITHUB_WORKFLOW_SHA']='0'*40
            elif kind=='source_branch':env['GITHUB_REF']='refs/heads/codex/ac-release-integration-20261122'
            else:api.rows['/git/ref/heads/'+a.BRANCH]['object']['sha']='0'*40
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.admit(g,api,env,event)

    def test_future_data_keeps_exact_82_paths_and_exact_parent_ci(self):
        data={p:self.g.blob(self.root,p)+b'\n' for p in a.paths(self.g)}
        child=self.g.commit(self.root,data)
        self.assertEqual(a.bootstrap(self.g,child),(self.root,[child]))
        self.rejected(self.g.commit(self.root,{k:v for k,v in data.items() if k!=a.PROVENANCE}),'EXACT_DELTA')
        class API:
            def get(_,path):return {'total_count':0,'workflow_runs':[]}
        with self.assertRaisesRegex(ValueError,'PARENT_CI_AMBIGUOUS_OR_ABSENT'):a.parent_ci(API(),self.root)

    def test_historical_coverage_is_additive_and_keeps_its_real_subject(self):
        p='scripts/statistical-levels-ci/authority-transition/inventory.json'
        old,new=(json.loads(self.g.blob(ref,p)) for ref in [a.AC_PARENT,self.root])
        for key in ['python_tests','node_tests','python_modules','node_files']:
            self.assertLessEqual(set(old[key]),set(new[key]))
        h=compat_cases.history_module();reused,changed=h.reuse_scope(self.g,self.root)
        previous,prior=h.reuse_scope(self.g,a.AC_BASE)
        affected={p for p in a.AC_FILES if p.startswith('scripts/statistical-levels-release/')}|{'package.json','package-lock.json'}
        self.assertEqual(reused,previous-affected)
        self.assertEqual(set(changed),set(prior)|affected)
        self.assertEqual(h.OLD,a.OLD)
