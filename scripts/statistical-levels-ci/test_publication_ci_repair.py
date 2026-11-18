"""Exact CI-only repair; real local Git objects, explicitly synthetic API evidence."""
import ast
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT
from test_lineage_admission import identity_env, make_lineage_daily, lineage_metadata, november, rebind_files


class PublicationCIRepairTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='sl-publication-ci-repair-model-')
        f = cls.f = Fixture.__new__(Fixture)
        f.repo = Path(cls.tmp.name) / 'repo.git'
        subprocess.run(['git', 'clone', '--bare', '--shared', str(ROOT), str(f.repo)], check=True, capture_output=True)
        f.git = a.Git(f.repo)
        f.env = identity_env({**os.environ, 'GIT_INDEX_FILE': str(Path(cls.tmp.name) / 'index')}, a.PUBLICATION_CI_REPAIR_IDENTITY)
        cls.root, _ = a.bootstrap(f.git, a.Git(ROOT).text('rev-parse', 'HEAD'))
        if f.git.parents(cls.root) == [a.COMPAT_PARENT]:
            cls.root = a.COMPAT_PARENT
        if f.git.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:
            cls.root = a.EXTRAORDINARY_HISTORY_ROOT
        if f.git.parents(cls.root) == [a.MEMORY_CI_BASE]:
            cls.root = a.MEMORY_CI_BASE  # Keep the real historical test subject.
        if f.git.parents(cls.root) == [a.RUNTIME_CI_BASE]:
            cls.root = a.RUNTIME_CI_BASE
        a.need(f.git.parents(cls.root) == [a.PUBLICATION_CI_REPAIR_BASE], 'PUBLICATION_CI_REPAIR_TEST_SUBJECT')
        f.root = cls.root
        cls.content = {p: f.git.blob(cls.root, p) for p in a.PUBLICATION_CI_REPAIR_FILES}
        template = json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        make_lineage_daily(f, cls.root, 20, lineage_metadata(f.git, cls.root, template))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def child(self, files=None, parent=None, message=None, env=None, modes=None, reseal=False):
        files = dict(self.content if files is None else files)
        if reseal:
            blank = re.sub(a.PUBLICATION_CI_REPAIR_PIN, lambda m: m[1] + b'0' * 64 + m[2], files[a.CI])
            rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(blank if p == a.CI else files[p])}
                    for p in sorted(a.PUBLICATION_CI_REPAIR_FILES)]
            pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
            files[a.CI] = re.sub(a.PUBLICATION_CI_REPAIR_PIN, lambda m: m[1] + pin.encode() + m[2], blank)
        return self.f.commit(parent or a.PUBLICATION_CI_REPAIR_BASE, files,
            message or a.PUBLICATION_CI_REPAIR_MESSAGE, env, modes)

    def model(self, daily=False):
        api = november(ModelAPI(self.f, daily=daily), self.f)
        if not daily:
            api.event['before'] = a.PUBLICATION_CI_REPAIR_BASE
        g = ModelGit(self.f.repo, api.env['GITHUB_SHA'])
        g.blob, g.tree, g.parents = self.f.git.blob, self.f.git.tree, self.f.git.parents
        return api, g

    def test_exact_parent_header_and_closed_delta(self):
        g = self.f.git
        self.assertEqual(a.bootstrap(g, self.root), (self.root, []))
        self.assertEqual(self.child(), self.root)
        for parent in [a.PUBLICATION_CLOSURE_BASE, a.PUBLICATION_RECOVERY_ROOT, self.root]:
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                a.bootstrap(g, self.child(parent=parent))
        for env in [{**self.f.env, 'GIT_AUTHOR_NAME': 'Other'}, {**self.f.env, 'GIT_COMMITTER_DATE': '1794778801 +0000'}]:
            with self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_HEADER'):
                a.bootstrap(g, self.child(env=env))
        with self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_HEADER'):
            a.bootstrap(g, self.child(message='repeatable repair'))
        merge = self.f.command(['commit-tree', g.text('rev-parse', self.root + '^{tree}'),
            '-p', a.PUBLICATION_CI_REPAIR_BASE, '-p', a.PUBLICATION_CLOSURE_BASE], b'unapproved merge\n').decode().strip()
        with self.assertRaisesRegex(ValueError, 'LINEAGE_ORDERED_SINGLE_PARENT'):
            a.bootstrap(g, merge)
        for p in ['extra.txt', a.PROVENANCE, 'scripts/statistical-levels-release/policy.json']:
            data = g.blob(a.PUBLICATION_CI_REPAIR_BASE, p) + b'\n' if p != 'extra.txt' else b'extra'
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(g, self.child(files={**self.content, p: data}))
        for p in a.PUBLICATION_CI_REPAIR_FILES:
            with self.subTest(missing=p), self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(g, self.child(files={n: data for n, data in self.content.items() if n != p}))
            with self.subTest(mode=p), self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                a.bootstrap(g, self.child(modes={p: '100755'}))

    def test_omitted_tests_or_changed_payload_are_rejected(self):
        for p in a.PUBLICATION_CI_REPAIR_FILES - {a.CI}:
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_PAYLOAD'):
                a.bootstrap(self.f.git, self.child(files={**self.content, p: self.content[p] + b'\n'}))
        p = 'scripts/statistical-levels-ci/test_admission.py'
        omitted = self.content[p].replace(b'def test_actual_original_tap_streams_remain_distinct(', b'def omitted_original_tap_streams(')
        self.assertNotEqual(omitted, self.content[p])
        with self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_PAYLOAD'):
            a.bootstrap(self.f.git, self.child(files={**self.content, p: omitted}))

    def test_resealing_cannot_omit_tests_sources_or_workflow_controls(self):
        for old, new in [(b"pattern='test_*.py'", b"pattern='test_nothing.py'"),
                         (b'node --test ', b'echo omitted '), (b' -eq 40', b' -eq 39'),
                         (b')==111', b')==110'), (b'timeout-minutes: 40', b'timeout-minutes: 41'),
                         (b'contents: read', b'contents: write')]:
            with self.subTest(old=old):
                self.assertIn(old, self.content[a.CI])
                with self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_WORKFLOW_SCOPE'):
                    a.bootstrap(self.f.git, self.child(files={**self.content, a.CI: self.content[a.CI].replace(old, new)}, reseal=True))

    def test_failed_parent_ci_is_not_reused_or_called_a_certificate(self):
        api, g = self.model()
        # The only exception is initial admission of this exact repair, not a green label for 5c53.
        result = a.admit(g, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_PUBLICATION_CI_REPAIR_BOOTSTRAP')
        self.assertEqual(result['details']['failed_run_id'], 43753556930)
        self.assertEqual(result['details']['parent_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertEqual(result['details']['candidate_hosted_ci'], 'REQUIRED_NOT_YET_CERTIFIED')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        self.assertEqual(result['historical_subject_sha'], a.OLD)

    def test_native_event_and_identity_remain_exact(self):
        for target, key, value in [('event', 'before', a.PUBLICATION_CLOSURE_BASE), ('event', 'forced', True),
                ('env', 'GITHUB_RUN_ATTEMPT', '2'), ('env', 'GITHUB_WORKFLOW_SHA', a.PUBLICATION_CI_REPAIR_BASE),
                ('env', 'GITHUB_SHA', a.PUBLICATION_CI_REPAIR_BASE), ('env', 'GITHUB_REF', 'refs/heads/main')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                api, g = self.model()
                (api.event if target == 'event' else api.env)[key] = value
                a.admit(g, api, api.env, api.event)

    def test_daily_successor_requires_full_ci_of_repair_not_failed_5c53(self):
        api, g = self.model(daily=True)
        result = a.admit(g, api, api.env, api.event)
        self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
        self.assertEqual(result['details']['parent_ci']['head_sha'], self.root)
        listing_key = '/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + self.root + '&status=success&per_page=100'
        for kind in ['missing', 'failed', 'failed_5c53', 'old_success', 'noop', 'ambiguous']:
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                api, g = self.model(daily=True)
                listing = api.responses[listing_key]; run = listing['workflow_runs'][0]
                if kind == 'missing': listing.update(total_count=0, workflow_runs=[])
                if kind == 'failed': run['conclusion'] = 'failure'
                if kind == 'failed_5c53': run.update(id=43753556930, head_sha=a.PUBLICATION_CI_REPAIR_BASE, conclusion='failure')
                if kind == 'old_success': run['head_sha'] = a.PUBLICATION_CLOSURE_BASE
                if kind == 'noop':
                    run['event'] = 'workflow_run'
                    api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]['conclusion'] = 'skipped'
                if kind == 'ambiguous': listing.update(total_count=2, workflow_runs=[run, copy.deepcopy(run)])
                a.admit(g, api, api.env, api.event)
        for index in range(6):
            for conclusion in ['skipped', 'failure']:
                with self.subTest(step=index, conclusion=conclusion), self.assertRaisesRegex(ValueError, 'PARENT_MANDATORY_STEP'):
                    api, g = self.model(daily=True); run = api.responses[listing_key]['workflow_runs'][0]
                    api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]['steps'][index]['conclusion'] = conclusion
                    a.admit(g, api, api.env, api.event)

    def test_repetition_code_children_and_editorial_rebind_are_rejected(self):
        g = self.f.git
        for parent in [self.root, self.f.daily]:
            for p in [a.CI, 'scripts/statistical-levels-ci/admission.py', 'public/llms.txt']:
                with self.subTest(parent=parent, path=p), self.assertRaises(ValueError):
                    a.bootstrap(g, self.f.commit(parent, {p: g.blob(parent, p) + b'\n'}, a.PUBLICATION_CI_REPAIR_MESSAGE))
        editorial = self.f.commit(self.root, {'public/llms.txt': g.blob(self.root, 'public/llms.txt') + b'\n'}, 'not authorized')
        files, entry = rebind_files(g, editorial, 'dpl_ModelOnly', 'a' * 40, a.lineage_registry(g, self.root), self.root,
            g.blob(editorial, a.CI), a.PUBLICATION_CI_REPAIR_IDENTITY, 'not authorized')
        with self.assertRaisesRegex(ValueError, 'PUBLICATION_CI_REPAIR_DATA_SUCCESSORS_ONLY'):
            a.bootstrap(g, self.f.commit(editorial, files, entry['rebind']['message']))

    def test_current_40_tests_111_sources_are_complete_and_unchanged(self):
        g = self.f.git; prefix = 'scripts/statistical-levels-release/'
        before, after = g.tree(a.PUBLICATION_CI_REPAIR_BASE), g.tree(self.root)
        self.assertEqual(len(a.paths(g)), 82)
        protected = a.paths(g) | {p for p in before if p.startswith(prefix)} | {a.PRODUCER, a.LINEAGE_REGISTRY, '.github/workflows/statistical-levels-release.yml'}
        self.assertTrue(all(after[p] == before[p] for p in protected))
        manifest = json.loads(g.blob(self.root, prefix + 'source-manifest.json'))
        self.assertEqual(len(manifest), 111)
        self.assertEqual(set(manifest), {p[len(prefix):] for p in after if p.startswith(prefix)} - {'SOURCE_SHA256SUMS', 'source-manifest.json', 'workflow-freeze.json'})
        sums = dict((p, h) for h, p in (line.split('  ', 1) for line in g.blob(self.root, prefix + 'SOURCE_SHA256SUMS').decode().splitlines()))
        self.assertEqual(set(sums), set(manifest) | {'source-manifest.json'})
        for p, h in manifest.items():
            self.assertEqual(a.digest(g.blob(self.root, prefix + p)), h, p)
            self.assertEqual(sums[p], h, p)
        self.assertEqual(sums['source-manifest.json'], a.digest(g.blob(self.root, prefix + 'source-manifest.json')))
        tests = {p for p in after if p.startswith(prefix + 'tests/') and p.endswith('.test.mjs')}
        old = {prefix + 'tests/' + n for n in ['probe-fixture-registry.test.mjs', 'g5-execution-preservation.test.mjs']}
        self.assertEqual(len(tests - old), 40); self.assertTrue(old <= tests)

    def test_historical_39_tests_110_sources_and_old_guards_are_preserved(self):
        g = self.f.git
        historical = g.blob(a.DURABILITY_BASE, a.CI)
        self.assertIn(b'"${#release_tests[@]}" -eq 39', historical)
        self.assertIn(b')==110', historical)
        self.assertEqual(len(json.loads(g.blob(a.DURABILITY_BASE, 'scripts/statistical-levels-release/source-manifest.json'))), 110)
        spec = importlib.util.spec_from_file_location('publication_ci_repair_history', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        history = importlib.util.module_from_spec(spec); spec.loader.exec_module(history)
        self.assertEqual(history.reuse_scope(g, self.root), history.reuse_scope(g, a.PUBLICATION_CI_REPAIR_BASE))
        self.assertEqual(a.reconciled_report_hashes(g, self.root), a.reconciled_report_hashes(g, a.PUBLICATION_CI_REPAIR_BASE))
        functions = lambda raw: {n.name: ast.dump(n) for n in ast.parse(raw).body if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
        for p, changed in [('scripts/statistical-levels-ci/admission.py', {'bootstrap', 'admit', 'reconciled_report_hashes'}),
                           ('scripts/statistical-levels-ci/historical-tests.py', {'reuse_scope'})]:
            old, new = functions(g.blob(a.PUBLICATION_CI_REPAIR_BASE, p)), functions(g.blob(self.root, p))
            for name in old.keys() - changed:
                self.assertEqual(old[name], new[name], name)
        # Every original Python test remains discoverable; fixtures may bind their historical subject.
        methods = lambda raw: {n.name for n in ast.walk(ast.parse(raw)) if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')}
        for p in g.tree(a.PUBLICATION_CI_REPAIR_BASE):
            if p.startswith('scripts/statistical-levels-ci/test_') and p.endswith('.py'):
                self.assertEqual(methods(g.blob(a.PUBLICATION_CI_REPAIR_BASE, p)), methods(g.blob(self.root, p)), p)


if __name__ == '__main__':
    unittest.main()
