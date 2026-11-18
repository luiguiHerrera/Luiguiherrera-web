"""Exact publication transition; local Git and explicitly synthetic API evidence."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT
from test_lineage_admission import identity_env, rebind_files, make_lineage_daily, lineage_metadata, november


class PublicationClosureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='sl-publication-closure-test-')
        f = cls.f = Fixture.__new__(Fixture)
        # Mutating Git operations use a private object directory and index. Even
        # this isolated source checkout's refs, index and worktree stay unchanged.
        import subprocess
        f.repo = Path(cls.tmp.name) / 'repo.git'
        subprocess.run(['git','clone','--bare','--shared',str(ROOT),str(f.repo)],check=True,capture_output=True)
        f.git = a.Git(f.repo)
        f.env = identity_env({**os.environ,'GIT_INDEX_FILE':str(Path(cls.tmp.name)/'index')},a.PUBLICATION_CLOSURE_IDENTITY)
        cls.root, _ = a.bootstrap(f.git,a.Git(ROOT).text('rev-parse','HEAD'))
        if f.git.parents(cls.root) == [a.COMPAT_PARENT]:
            cls.root = a.COMPAT_PARENT
        if f.git.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:
            cls.root = a.EXTRAORDINARY_HISTORY_ROOT
        if f.git.parents(cls.root) == [a.MEMORY_CI_BASE]:
            cls.root = a.MEMORY_CI_BASE  # Keep the real historical test subject.
        if f.git.parents(cls.root) == [a.RUNTIME_CI_BASE]:
            cls.root = a.RUNTIME_CI_BASE
        if f.git.parents(cls.root) == [a.PUBLICATION_CI_REPAIR_BASE]:
            cls.root = a.PUBLICATION_CI_REPAIR_BASE
        a.need(f.git.parents(cls.root) == [a.PUBLICATION_CLOSURE_BASE], 'CLOSURE_TEST_SUBJECT')
        cls.content = {p:f.git.blob(cls.root,p) for p in a.PUBLICATION_CLOSURE_FILES}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def child(self, files=None, parent=None, message=None, env=None, modes=None, seal=False):
        files = dict(self.content if files is None else files)
        if seal:
            blank = re.sub(a.PUBLICATION_CLOSURE_PIN,lambda m:m[1]+b'0'*64+m[2],files[a.CI])
            rows=[{'path':p,'mode':'100644','sha256':a.digest(blank if p==a.CI else files[p])} for p in sorted(a.PUBLICATION_CLOSURE_FILES)]
            pin=a.digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())
            files[a.CI]=re.sub(a.PUBLICATION_CLOSURE_PIN,lambda m:m[1]+pin.encode()+m[2],blank)
        return self.f.commit(parent or a.PUBLICATION_CLOSURE_BASE,files,message or a.PUBLICATION_CLOSURE_MESSAGE,env,modes)

    def test_exact_transition_preserves_82_paths_policy_and_historical_registry(self):
        g=self.f.git; before,after=g.tree(a.PUBLICATION_CLOSURE_BASE),g.tree(self.root)
        self.assertEqual({p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)},a.PUBLICATION_CLOSURE_FILES)
        self.assertEqual(a.bootstrap(g,self.root),(self.root,[]))
        for p in a.paths(g)|{a.LINEAGE_REGISTRY,'scripts/statistical-levels-release/policy.json'}:
            self.assertEqual(before[p],after[p],p)

    def test_parent_header_and_merge_cannot_be_substituted(self):
        for kwargs in [{'parent':a.PUBLICATION_RECOVERY_ROOT},{'message':'other'},
                       {'env':{**self.f.env,'GIT_AUTHOR_NAME':'Other'}}]:
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):a.bootstrap(self.f.git,self.child(**kwargs))
        tree=self.f.git.text('rev-parse',self.root+'^{tree}')
        merge=self.f.command(['commit-tree',tree,'-p',a.PUBLICATION_CLOSURE_BASE,'-p',a.PUBLICATION_RECOVERY_ROOT],b'not authorized\n').decode().strip()
        with self.assertRaisesRegex(ValueError,'LINEAGE_ORDERED_SINGLE_PARENT'):a.bootstrap(self.f.git,merge)

    def test_payload_covers_each_changed_file(self):
        for p in a.PUBLICATION_CLOSURE_FILES:
            with self.subTest(path=p),self.assertRaisesRegex(ValueError,'PUBLICATION_PAYLOAD|PUBLICATION_CI_SCOPE'):
                a.bootstrap(self.f.git,self.child(files={**self.content,p:self.content[p]+b'\n'}))

    def test_closed_delta_and_modes(self):
        for p in a.PUBLICATION_CLOSURE_FILES:
            files={**self.content,p:self.f.git.blob(a.PUBLICATION_CLOSURE_BASE,p) if p in self.f.git.tree(a.PUBLICATION_CLOSURE_BASE) else None}
            with self.subTest(missing=p),self.assertRaises(ValueError):a.bootstrap(self.f.git,self.child(files=files))
        with self.assertRaisesRegex(ValueError,'DELTA_MODE'):
            a.bootstrap(self.f.git,self.child(modes={a.CI:'100755'}))
        with self.assertRaisesRegex(ValueError,'EXACT_DELTA'):
            a.bootstrap(self.f.git,self.child(files={**self.content,a.PROVENANCE:self.f.git.blob(self.root,a.PROVENANCE)+b'\n'}))

    def test_reseal_cannot_weaken_ci_or_enable_a_new_workflow_shape(self):
        for old,new in [(b'timeout-minutes: 40',b'timeout-minutes: 41'),(b'contents: read',b'contents: write'),(b'node --test ',b'echo ' )]:
            with self.subTest(change=old),self.assertRaisesRegex(ValueError,'PUBLICATION_CI_SCOPE'):
                a.bootstrap(self.f.git,self.child(files={**self.content,a.CI:self.content[a.CI].replace(old,new)},seal=True))

    def test_later_code_changes_and_repeating_the_transition_are_refused(self):
        for p in [a.CI,'scripts/statistical-levels-release/scripts/cli.mjs','public/llms.txt']:
            child=self.f.commit(self.root,{p:self.f.git.blob(self.root,p)+b'\n'},'not authorized')
            with self.subTest(path=p),self.assertRaises(ValueError):a.bootstrap(self.f.git,child)

    def test_editorial_rebind_remains_closed(self):
        g=self.f.git
        editorial=self.f.commit(self.root,{'public/llms.txt':g.blob(self.root,'public/llms.txt')+b'\n'},'local editorial fixture')
        files,entry=rebind_files(g,editorial,'dpl_ModelOnly','a'*40,a.lineage_registry(g,self.root),self.root,g.blob(editorial,a.CI),a.PUBLICATION_CLOSURE_IDENTITY,'local rebind fixture')
        child=self.f.commit(editorial,files,entry['rebind']['message'])
        with self.assertRaisesRegex(ValueError,'PUBLICATION_DATA_SUCCESSORS_ONLY'):a.bootstrap(g,child)

    def model(self):
        f=copy.copy(self.f);f.root=self.root;f.source=a.PUBLICATION_CLOSURE_BASE;f.daily=self.root
        f.day=20;f.producer_id=40000000000;f.receipt={'local_model':True}
        api=ModelAPI(f,daily=False);api.event['before']=a.PUBLICATION_CLOSURE_BASE
        git=ModelGit(f.repo,self.root);git.blob,git.tree,git.parents=f.git.blob,f.git.tree,f.git.parents
        return api,git

    def test_native_admission_requires_certified_parent_and_new_ci_not_r1(self):
        api,g=self.model();result=a.admit(g,api,api.env,api.event)
        self.assertEqual(result['mode'],'EXACT_PUBLICATION_CLOSURE_BOOTSTRAP')
        self.assertEqual(result['details']['r1_hosted_ci'],'FAILED_NOT_REUSED')
        self.assertEqual(result['details']['candidate_hosted_ci'],'REQUIRED_NOT_YET_CERTIFIED')
        self.assertFalse(result['release_authority_issued'])

    def test_failed_missing_noop_or_partial_parent_ci_is_refused(self):
        for variant in ['missing','failed','noop','partial']:
            api,g=self.model();key='/actions/workflows/'+str(a.CI_ID)+'/runs?head_sha='+a.PUBLICATION_CLOSURE_BASE+'&status=success&per_page=100'
            listing=api.responses[key];run=listing['workflow_runs'][0]
            jobs=api.responses['/actions/runs/'+str(run['id'])+'/attempts/1/jobs?per_page=100']
            if variant=='missing':listing.update(total_count=0,workflow_runs=[])
            if variant=='failed':run['conclusion']='failure'
            if variant=='noop':run['event']='workflow_run';jobs['jobs'][0]['conclusion']='skipped'
            if variant=='partial':jobs['jobs'][0]['steps'][0]['conclusion']='skipped'
            with self.subTest(variant=variant),self.assertRaises(ValueError):a.admit(g,api,api.env,api.event)

    def test_daily_successor_requires_full_ci_of_exact_new_root(self):
        f=copy.copy(self.f);f.root=self.root
        template=json.loads((ROOT/a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        make_lineage_daily(f,self.root,20,lineage_metadata(f.git,self.root,template))
        self.assertEqual(a.bootstrap(f.git,f.daily),(self.root,[f.daily]))
        for passed in [True,False]:
            api=november(ModelAPI(f,daily=True),f)
            g=ModelGit(f.repo,f.daily);g.blob,g.tree,g.parents=f.git.blob,f.git.tree,f.git.parents
            if not passed:
                key='/actions/workflows/'+str(a.CI_ID)+'/runs?head_sha='+self.root+'&status=success&per_page=100'
                api.responses[key]['workflow_runs'][0]['conclusion']='failure'
                with self.assertRaises(ValueError):a.admit(g,api,api.env,api.event)
            else:
                result=a.admit(g,api,api.env,api.event)
                self.assertEqual(result['root_sha'],self.root)
                self.assertEqual(result['details']['parent_ci']['head_sha'],self.root)

    def test_historical_reuse_excludes_only_closed_delta_and_keeps_old_subject(self):
        spec=importlib.util.spec_from_file_location('closure_historical',ROOT/'scripts/statistical-levels-ci/historical-tests.py')
        h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
        before,changed=h.reuse_scope(self.f.git,a.PUBLICATION_CLOSURE_BASE)
        after,new=h.reuse_scope(self.f.git,self.root)
        affected={p for p in a.PUBLICATION_CLOSURE_FILES if p.startswith('scripts/statistical-levels-release/')}
        self.assertEqual(after,before-affected);self.assertEqual(set(new),set(changed)|affected)
        self.assertEqual(a.reconciled_report_hashes(self.f.git,self.root),a.reconciled_report_hashes(self.f.git,a.PUBLICATION_CLOSURE_BASE))


if __name__ == '__main__':unittest.main()
