"""Exact zod-security models; real Git objects, synthetic native/API contexts only."""
import ast
import builtins
import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import types
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT, jsonbytes
import test_daily_admission as daily_models


class ZodSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        a.need(bool(a.ZOD_FILES), 'ZOD_DELTA_PENDING')
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-zod-security-model-')
        cls.directory = Path(cls.temp.name).resolve()
        f = cls.first = Fixture(cls.directory)
        cls.content = {p: (ROOT / p).read_bytes() for p in a.ZOD_FILES}
        cls.content[a.CI] = re.sub(a.ZOD_PIN, lambda m: m[1] + b'0' * 64 + m[2], cls.content[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(cls.content[p])} for p in sorted(cls.content)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        cls.content[a.CI] = re.sub(a.ZOD_PIN, lambda m: m[1] + pin.encode() + m[2], cls.content[a.CI])
        cls.header_env = {**f.env, 'GIT_AUTHOR_DATE': a.ZOD_IDENTITY.split('> ')[1],
                          'GIT_COMMITTER_DATE': a.ZOD_IDENTITY.split('> ')[1]}
        f.root = f.commit(a.ZOD_BASE, cls.content, a.ZOD_MESSAGE, cls.header_env)
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=f.root, day=29)
        daily_models.ExactSuccessorTests.add_selection(f)
        cls.second = copy.copy(f)
        cls.second.make_daily(parent=f.daily, day=30)
        daily_models.ExactSuccessorTests.add_selection(cls.second)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        spec = importlib.util.spec_from_file_location('zod_security_historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.reuse = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.reuse)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = a.ZOD_BASE
        elif f.source in [self.first.root, self.first.daily]:
            listing = api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100']
            prior = listing['workflow_runs'][0]
            old_jobs = '/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'
            prior['id'] = 39999999999 if f.source == self.first.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.first.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = api.responses.pop(old_jobs)
        return api, ModelGit(f.repo, api.env['GITHUB_SHA'])

    def changed_root(self, files=None, message=None, env=None, modes=None, parent=None):
        return self.first.commit(parent or a.ZOD_BASE, files or self.content,
                                 message or a.ZOD_MESSAGE, env or self.header_env, modes)

    def test_exact_bootstrap_and_two_daily_successors(self):
        api, git = self.model(self.first, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_ZOD_SECURITY_BOOTSTRAP')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        self.assertEqual(result['details']['base_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertEqual(result['details']['failed_run_id'], 40033193844)
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.first.root)
            self.assertEqual(result['details']['data']['snapshots'], 81)

    def test_original_durability_bootstrap_and_guards_remain_unchanged(self):
        git = a.Git(self.first.repo)
        self.assertEqual(a.bootstrap(git, a.ZOD_BASE), a.durability_bootstrap(git, a.ZOD_BASE))
        old = ast.parse(git.blob(a.ZOD_BASE, 'scripts/statistical-levels-ci/admission.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/admission.py'])
        function = lambda tree, name: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
        for name in ['historical_bootstrap', 'daily_bootstrap', 'security_bootstrap', 'capture_recovery_bootstrap', 'report_contract_bootstrap', 'producer_run', 'parent_ci', 'validate_data', 'capture_preflight']:
            self.assertEqual(ast.dump(function(old, name)), ast.dump(function(current, name)))
        old_body, new_body = function(old, 'bootstrap'), function(current, 'durability_bootstrap')
        old_body.name = new_body.name
        self.assertEqual(ast.dump(old_body), ast.dump(new_body))

    def test_exact_header_parent_delta_modes_and_pin(self):
        git = a.Git(self.first.repo)
        for files in [{**self.content, 'extra.txt': b'unapproved'},
                      {p: b for p, b in self.content.items() if p != 'package-lock.json'},
                      {**self.content, a.PROVENANCE: git.blob(a.ZOD_BASE, a.PROVENANCE) + b'\n'}]:
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(git, self.changed_root(files=files))
        for name in a.ZOD_FILES:
            with self.subTest(path=name):
                with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                    a.bootstrap(git, self.changed_root(modes={name: '100755'}))
                with self.assertRaisesRegex(ValueError, 'ZOD_PAYLOAD'):
                    a.bootstrap(git, self.changed_root(files={**self.content, name: self.content[name] + b'\n'}))
        for changes in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_AUTHOR_DATE': '1792795231 +0000'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'}]:
            with self.assertRaisesRegex(ValueError, 'ZOD_COMMIT_HEADER'):
                a.bootstrap(git, self.changed_root(env={**self.header_env, **changes}))
        with self.assertRaisesRegex(ValueError, 'ZOD_COMMIT_HEADER'):
            a.bootstrap(git, self.changed_root(message='another repair'))
        tree = git.text('rev-parse', self.first.root + '^{tree}')
        bad = self.first.command(['commit-tree', tree, '-p', a.ZOD_BASE, '-p', a.REPORT_CONTRACT_BASE], (a.ZOD_MESSAGE + '\n').encode(), self.header_env).decode().strip()
        with self.assertRaisesRegex(ValueError, 'ZOD_ORDERED_SINGLE_PARENT'):
            a.bootstrap(git, bad)
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            a.bootstrap(git, self.changed_root(parent=a.REPORT_CONTRACT_BASE))

    def test_native_push_context_is_exact_and_each_day_requires_own_ci(self):
        mutations = [('event', 'before', a.REPORT_CONTRACT_BASE), ('event', 'after', a.ZOD_BASE),
                     ('event', 'forced', True), ('event', 'deleted', True), ('event', 'created', True),
                     ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.ZOD_BASE),
                     ('env', 'CI_EVENT_SHA', a.ZOD_BASE), ('env', 'GITHUB_WORKFLOW_SHA', a.ZOD_BASE),
                     ('env', 'GITHUB_REF', 'refs/heads/main'), ('env', 'GITHUB_REPOSITORY_ID', '1'),
                     ('env', 'GITHUB_EVENT_NAME', 'workflow_run')]
        for target, key, value in mutations:
            with self.subTest(target=target, key=key):
                api, git = self.model(self.first, False)
                (api.event if target == 'event' else api.env)[key] = value
                with self.assertRaises(ValueError): a.admit(git, api, api.env, api.event)
        for f in [self.first, self.second]:
            api, git = self.model(f)
            api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
            with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'): a.admit(git, api, api.env, api.event)

    def test_later_code_change_cannot_be_admitted_as_data(self):
        for parent in [self.first.root, self.first.daily, self.second.daily]:
            bad = self.first.commit(parent, {'scripts/statistical-levels-hosted.mjs': b'changed'}, 'unapproved code')
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'): a.bootstrap(a.Git(self.first.repo), bad)

    def test_daily_child_of_failed_base_does_not_inherit_success(self):
        f = copy.copy(self.first)
        f.make_daily(parent=a.ZOD_BASE, day=27)
        daily_models.ExactSuccessorTests.add_selection(f)
        api = ModelAPI(f, True)
        api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + a.ZOD_BASE + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
        with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'):
            a.admit(ModelGit(f.repo, f.daily), api, api.env, api.event)

    def test_reused_bytes_and_untouched_exclusions_cannot_drift(self):
        git = a.Git(self.first.repo)
        reused, excluded = self.reuse.reuse_scope(git, a.ZOD_BASE)
        # Both categories remain closed by the exact repair delta, not merely
        # by unchanged counts in the historical test accounting.
        names = [sorted(reused)[0], sorted(set(excluded) - a.ZOD_FILES)[0]]
        for name in names:
            with self.subTest(path=name):
                bad = self.changed_root(files={**self.content, name: git.blob(a.ZOD_BASE, name) + b'\n'})
                with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                    self.reuse.reuse_scope(git, bad)

    def test_exact_lock_delta_and_existing_historical_exclusions(self):
        git = a.Git(self.first.repo)
        before = git.tree(a.ZOD_BASE)
        reports = a.reconciled_report_hashes(git, a.ZOD_BASE)
        reused, excluded = self.reuse.reuse_scope(git, a.ZOD_BASE)
        self.assertEqual((len(reused), len(excluded)), (104, 11))
        self.assertEqual(a.N, '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d')
        old_lock = a.unique_json(git.blob(a.ZOD_BASE, 'package-lock.json'))
        new_lock = a.unique_json(self.content['package-lock.json'])
        old_zod = old_lock['packages'].pop('node_modules/zod')
        new_zod = new_lock['packages'].pop('node_modules/zod')
        self.assertEqual(old_lock, new_lock)
        self.assertEqual(old_zod['version'], '4.4.3')
        self.assertEqual(new_zod['version'], '4.6.6')
        self.assertTrue(new_zod['dev'])
        protected = {p for p in before if p.startswith('scripts/statistical-levels-release/')}
        protected -= a.ZOD_FILES
        protected |= {'package.json', '.github/workflows/update-statistical-levels.yml'}
        for head in [self.first.root, self.first.daily, self.second.daily]:
            after = git.tree(head)
            self.assertTrue(all(after[p] == before[p] for p in protected))
            self.assertEqual(a.reconciled_report_hashes(git, head), reports)
            current_reused, current_excluded = self.reuse.reuse_scope(git, head)
            self.assertEqual(current_reused, reused)
            self.assertEqual(set(current_excluded), set(excluded))
            for name, entry in current_excluded.items():
                self.assertEqual(entry['old_sha256'], excluded[name]['old_sha256'])
                self.assertEqual(entry['current_sha256'], a.digest(git.blob(head, name)))
        old = ast.parse(git.blob(a.ZOD_BASE, 'scripts/statistical-levels-ci/historical-tests.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/historical-tests.py'])
        fn = lambda tree: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        self.assertEqual(ast.dump(fn(old)), ast.dump(fn(current)))
        pattern = r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE"
        self.assertEqual(re.findall(pattern, git.blob(a.ZOD_BASE, a.CI).decode(), re.S), re.findall(pattern, self.content[a.CI].decode(), re.S))

    def test_native_capture_handoff_for_two_daily_successors(self):
        daily_models.ExactSuccessorTests.test_two_daily_native_capture_handoffs_use_actual_successor_bytes(self)

    def test_literal_inline_g5_bundle_and_historical_gate_for_each_context(self):
        blocks = re.findall(r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE", self.content[a.CI].decode(), re.S)
        programs = ['\n'.join(line[10:] for line in block.splitlines()) for block in blocks[:2]]
        self.assertEqual(len(programs), 2)
        for f, daily in [(self.first, False), (self.first, True), (self.second, True)]:
            api, git = self.model(f, daily)
            head = api.env['GITHUB_SHA']
            subprocess.run(['git', 'checkout', '--detach', head], cwd=self.checkout, check=True, capture_output=True)
            type(self).serial += 1
            out = self.directory / ('report-contract-inline-' + str(self.serial))
            out.mkdir()
            (out / 'bounded-admission.json').write_bytes(jsonbytes(a.admit(git, api, api.env, api.event)))
            self.reuse.reuse_scope(git, head)
            env = {**api.env, 'CI_EVIDENCE': str(out)}
            checkout = self.checkout

            class Paths:
                def __call__(self, *args):return Path(*args)
                def cwd(self):return checkout

            model_os = types.SimpleNamespace(environ=env)
            model_subprocess = types.SimpleNamespace(check_output=lambda args, **kw: subprocess.check_output(args, cwd=checkout, **kw),
                                                    run=lambda args, **kw: subprocess.run(args, cwd=checkout, **kw))
            original_import = builtins.__import__

            def model_import(name, *args, **kwargs):
                if name == 'os':return model_os
                if name == 'subprocess':return model_subprocess
                if name == 'pathlib':return types.SimpleNamespace(Path=Paths())
                return original_import(name, *args, **kwargs)

            for program in programs:
                namespace = {'__builtins__': {**vars(builtins), '__import__': model_import}}
                with contextlib.redirect_stdout(io.StringIO()):
                    exec(compile(program, 'literal-inline-MODELED-report-contract', 'exec'), namespace)
            subject = json.loads((out / 'subject.json').read_bytes())
            self.assertEqual(subject['head_sha'], head)
            self.assertTrue(subject['integration_qualified'])
            self.assertEqual(subject['lineage']['integration_subject_sha'], a.OLD)
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [a.ZOD_BASE])


if __name__ == '__main__':
    unittest.main()
