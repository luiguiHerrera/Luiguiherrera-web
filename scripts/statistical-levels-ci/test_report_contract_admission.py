"""Exact report-contract models; real Git objects, synthetic native/API contexts only."""
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


class ReportContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        a.need(bool(a.REPORT_CONTRACT_FILES), 'REPORT_CONTRACT_DELTA_PENDING')
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-report-contract-model-')
        cls.directory = Path(cls.temp.name).resolve()
        f = cls.first = Fixture(cls.directory)
        cls.content = {p: (ROOT / p).read_bytes() for p in a.REPORT_CONTRACT_FILES}
        cls.content[a.CI] = re.sub(a.REPORT_CONTRACT_PIN, lambda m: m[1] + b'0' * 64 + m[2], cls.content[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(cls.content[p])} for p in sorted(cls.content)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        cls.content[a.CI] = re.sub(a.REPORT_CONTRACT_PIN, lambda m: m[1] + pin.encode() + m[2], cls.content[a.CI])
        cls.header_env = {**f.env, 'GIT_AUTHOR_DATE': a.REPORT_CONTRACT_IDENTITY.split('> ')[1],
                          'GIT_COMMITTER_DATE': a.REPORT_CONTRACT_IDENTITY.split('> ')[1]}
        f.root = f.commit(a.REPORT_CONTRACT_BASE, cls.content, a.REPORT_CONTRACT_MESSAGE, cls.header_env)
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=f.root, day=29)
        daily_models.ExactSuccessorTests.add_selection(f)
        cls.second = copy.copy(f)
        cls.second.make_daily(parent=f.daily, day=30)
        daily_models.ExactSuccessorTests.add_selection(cls.second)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        spec = importlib.util.spec_from_file_location('report_contract_historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.reuse = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.reuse)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = a.REPORT_CONTRACT_BASE
        elif f.source in [self.first.root, self.first.daily]:
            listing = api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100']
            prior = listing['workflow_runs'][0]
            old_jobs = '/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'
            prior['id'] = 39999999999 if f.source == self.first.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.first.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = api.responses.pop(old_jobs)
        return api, ModelGit(f.repo, api.env['GITHUB_SHA'])

    def changed_root(self, files=None, message=None, env=None, modes=None, parent=None):
        return self.first.commit(parent or a.REPORT_CONTRACT_BASE, files or self.content,
                                 message or a.REPORT_CONTRACT_MESSAGE, env or self.header_env, modes)

    def test_exact_report_root_and_two_daily_successors(self):
        api, git = self.model(self.first, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_REPORT_CONTRACT_BOOTSTRAP')
        self.assertEqual(result['details']['failed_run_id'], 40012647047)
        self.assertEqual(result['details']['base_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.first.root)
            self.assertEqual(result['details']['data']['snapshots'], 81)

    def test_original_bootstrap_paths_remain_exact(self):
        git = a.Git(self.first.repo)
        self.assertEqual(a.bootstrap(git, a.REPORT_CONTRACT_BASE), a.capture_recovery_bootstrap(git, a.REPORT_CONTRACT_BASE))
        self.assertEqual(a.bootstrap(git, a.CAPTURE_RECOVERY_BASE), a.security_bootstrap(git, a.CAPTURE_RECOVERY_BASE))
        self.assertEqual(a.bootstrap(git, a.SECURITY_BASE), a.daily_bootstrap(git, a.SECURITY_BASE))
        self.assertEqual(a.bootstrap(git, a.REMOTE_BEFORE_RECONCILIATION), a.historical_bootstrap(git, a.REMOTE_BEFORE_RECONCILIATION))

    def test_failed_base_data_successor_still_requires_real_parent_ci(self):
        f = copy.copy(self.first)
        f.root = a.REPORT_CONTRACT_BASE
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=a.REPORT_CONTRACT_BASE, day=31)
        daily_models.ExactSuccessorTests.add_selection(f)
        self.assertEqual(a.bootstrap(a.Git(f.repo), f.daily), a.capture_recovery_bootstrap(a.Git(f.repo), f.daily))
        api, git = self.model(f)
        api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
        with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'):
            a.admit(git, api, api.env, api.event)

    def test_native_sha_event_and_branch_are_exact(self):
        mutations = [('event', 'before', a.SECURITY_BASE), ('event', 'after', a.REPORT_CONTRACT_BASE),
                     ('event', 'forced', True), ('event', 'deleted', True), ('event', 'created', True),
                     ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.REPORT_CONTRACT_BASE),
                     ('env', 'CI_EVENT_SHA', a.REPORT_CONTRACT_BASE), ('env', 'GITHUB_WORKFLOW_SHA', a.REPORT_CONTRACT_BASE),
                     ('env', 'GITHUB_REF', 'refs/heads/main'), ('env', 'GITHUB_REPOSITORY_ID', '1'),
                     ('env', 'GITHUB_EVENT_NAME', 'workflow_run')]
        for target, key, value in mutations:
            with self.subTest(target=target, key=key):
                api, git = self.model(self.first, False)
                (api.event if target == 'event' else api.env)[key] = value
                with self.assertRaises(ValueError):
                    a.admit(git, api, api.env, api.event)

    def test_header_and_ordered_sole_parent_are_exact(self):
        for change in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'},
                       {'GIT_AUTHOR_DATE': '1792786580 +0000'}, {'GIT_COMMITTER_DATE': '1792786580 +0000'}]:
            head = self.changed_root(env={**self.header_env, **change})
            with self.assertRaisesRegex(ValueError, 'REPORT_CONTRACT_COMMIT_HEADER'):
                a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(message='Different report contract')
        with self.assertRaisesRegex(ValueError, 'REPORT_CONTRACT_COMMIT_HEADER'):
            a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(parent=a.SECURITY_BASE)
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            a.bootstrap(a.Git(self.first.repo), head)
        tree = self.first.git.text('rev-parse', self.first.root + '^{tree}')
        head = self.first.command(['commit-tree', tree, '-p', a.REPORT_CONTRACT_BASE, '-p', a.SECURITY_BASE],
                                 (a.REPORT_CONTRACT_MESSAGE + '\n').encode(), self.header_env).decode().strip()
        with self.assertRaisesRegex(ValueError, 'REPORT_CONTRACT_ORDERED_SINGLE_PARENT'):
            a.bootstrap(a.Git(self.first.repo), head)

    def test_delta_inventory_modes_and_payload_are_exact(self):
        historical = 'scripts/statistical-levels-ci/historical-tests.py'
        for content in [{**self.content, 'unexpected-report-contract-file.json': b'{}'},
                        {p: value for p, value in self.content.items() if p != historical},
                        {**self.content, a.PROVENANCE: self.first.git.blob(a.REPORT_CONTRACT_BASE, a.PROVENANCE) + b'\n'}]:
            head = self.changed_root(files=content)
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(modes={historical: '100755'})
        with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
            a.bootstrap(a.Git(self.first.repo), head)
        for content in [{**self.content, historical: self.content[historical] + b'\n'},
                        {**self.content, a.CI: re.sub(a.REPORT_CONTRACT_PIN, lambda m: m[1] + b'0' * 64 + m[2], self.content[a.CI])}]:
            head = self.changed_root(files=content)
            with self.assertRaisesRegex(ValueError, 'REPORT_CONTRACT_PAYLOAD'):
                a.bootstrap(a.Git(self.first.repo), head)

    def test_second_code_change_cannot_be_daily_successor(self):
        for parent in [self.first.root, self.first.daily, self.second.daily]:
            head = self.first.commit(parent, {'package.json': self.first.git.blob(parent, 'package.json') + b'\n'}, 'unapproved code child')
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(a.Git(self.first.repo), head)

    def test_each_daily_requires_its_own_parent_ci(self):
        for f in [self.first, self.second]:
            api, git = self.model(f)
            api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
            with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'):
                a.admit(git, api, api.env, api.event)

    def test_report_override_changes_only_the_two_exact_test_paths(self):
        git = a.Git(self.first.repo)
        before = a.reconciled_report_hashes(git, a.REPORT_CONTRACT_BASE)
        expected = {**before, **{p: a.digest(self.content[p]) for p in a.REPORT_CONTRACT_TEST_FILES}}
        for head in [self.first.root, self.first.daily, self.second.daily]:
            current = a.reconciled_report_hashes(git, head)
            self.assertEqual(current, expected)
            self.assertEqual({p for p in before.keys() | current.keys() if before.get(p) != current.get(p)}, a.REPORT_CONTRACT_TEST_FILES)
        protected = 'public/reports/segundo-informe-octubre-2026.md'
        head = self.changed_root(files={**self.content, protected: git.blob(a.REPORT_CONTRACT_BASE, protected) + b'\n'})
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
            a.reconciled_report_hashes(git, head)

    def test_historical_scope_preserves_anchor_and_two_days(self):
        git = a.Git(self.first.repo)
        old = git.tree(a.OLD)
        scope = {p for p in old if p.startswith('scripts/statistical-levels-release/')} | {'package.json', 'package-lock.json'}
        expected = self.reuse.CAPTURE_RECOVERY_HISTORY_FILES
        self.assertTrue(expected)
        self.assertEqual(len(scope), 115)
        for head in [self.first.root, self.first.daily, self.second.daily]:
            reused, changed = self.reuse.reuse_scope(git, head)
            self.assertEqual(set(changed), expected)
            self.assertEqual(reused, scope - expected)
            self.assertTrue(all(git.tree(head)[p] == old[p] for p in reused))
        self.assertEqual(len(self.reuse.reuse_scope(git, a.REPORT_CONTRACT_BASE)[0]), 104)

    def test_historical_261_runner_remains_on_OLD(self):
        name = 'scripts/statistical-levels-ci/historical-tests.py'
        original = ast.parse(self.first.git.blob(a.REPORT_CONTRACT_BASE, name))
        current = ast.parse(self.content[name])
        function = lambda tree: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        self.assertEqual(ast.dump(function(original)), ast.dump(function(current)))
        self.assertEqual(a.OLD, '0004db585fb402c97d8470c31ea4e405f0905b7e')
        self.assertIn("'native_admission_of_new_sha': False", self.content[name].decode())

    def test_release_bundle_and_historical_functions_are_unchanged(self):
        git = a.Git(self.first.repo)
        before = git.tree(a.REPORT_CONTRACT_BASE)
        protected = {p for p in before if p.startswith('scripts/statistical-levels-release/')} | {
            '.github/workflows/statistical-levels-release.yml', 'package.json', 'package-lock.json'}
        self.assertFalse(protected & a.REPORT_CONTRACT_FILES)
        for head in [self.first.root, self.first.daily, self.second.daily]:
            after = git.tree(head)
            self.assertTrue(all(after[p] == before[p] for p in protected))
        self.assertEqual(a.digest(git.blob(self.first.root, '.github/workflows/statistical-levels-release.yml')),
                         'c406c783d9274d142c4ccf5f2493b6190040129cfc91033aaedf387b9f8c4602')
        old = ast.parse(git.blob(a.REPORT_CONTRACT_BASE, 'scripts/statistical-levels-ci/admission.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/admission.py'])
        function = lambda tree, name: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
        for name in ['historical_bootstrap', 'daily_bootstrap', 'security_bootstrap']:
            self.assertEqual(ast.dump(function(old, name)), ast.dump(function(current, name)))
        old_body = function(old, 'bootstrap'); new_body = function(current, 'capture_recovery_bootstrap')
        old_body.name = new_body.name
        self.assertEqual(ast.dump(old_body), ast.dump(new_body))
        pattern = r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE"
        self.assertEqual(re.findall(pattern, git.blob(a.REPORT_CONTRACT_BASE, a.CI).decode(), re.S),
                         re.findall(pattern, self.content[a.CI].decode(), re.S))

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
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [a.REPORT_CONTRACT_BASE])


if __name__ == '__main__':
    unittest.main()
