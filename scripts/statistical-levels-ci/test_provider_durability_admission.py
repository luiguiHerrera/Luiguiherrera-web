"""Exact provider-durability models; real Git objects, synthetic native/API contexts only."""
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


class ProviderDurabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        a.need(bool(a.DURABILITY_FILES), 'DURABILITY_DELTA_PENDING')
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-provider-durability-model-')
        cls.directory = Path(cls.temp.name).resolve()
        f = cls.first = Fixture(cls.directory)
        cls.content = {p: (ROOT / p).read_bytes() for p in a.DURABILITY_FILES}
        cls.content[a.CI] = re.sub(a.DURABILITY_PIN, lambda m: m[1] + b'0' * 64 + m[2], cls.content[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(cls.content[p])} for p in sorted(cls.content)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        cls.content[a.CI] = re.sub(a.DURABILITY_PIN, lambda m: m[1] + pin.encode() + m[2], cls.content[a.CI])
        cls.header_env = {**f.env, 'GIT_AUTHOR_DATE': a.DURABILITY_IDENTITY.split('> ')[1],
                          'GIT_COMMITTER_DATE': a.DURABILITY_IDENTITY.split('> ')[1]}
        f.root = f.commit(a.DURABILITY_BASE, cls.content, a.DURABILITY_MESSAGE, cls.header_env)
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=f.root, day=29)
        daily_models.ExactSuccessorTests.add_selection(f)
        cls.second = copy.copy(f)
        cls.second.make_daily(parent=f.daily, day=30)
        daily_models.ExactSuccessorTests.add_selection(cls.second)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        spec = importlib.util.spec_from_file_location('provider_durability_historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.reuse = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.reuse)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = a.DURABILITY_BASE
        elif f.source in [self.first.root, self.first.daily]:
            listing = api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100']
            prior = listing['workflow_runs'][0]
            old_jobs = '/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'
            prior['id'] = 39999999999 if f.source == self.first.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.first.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = api.responses.pop(old_jobs)
        return api, ModelGit(f.repo, api.env['GITHUB_SHA'])

    def changed_root(self, files=None, message=None, env=None, modes=None, parent=None):
        return self.first.commit(parent or a.DURABILITY_BASE, files or self.content,
                                 message or a.DURABILITY_MESSAGE, env or self.header_env, modes)

    def test_exact_bootstrap_and_two_daily_successors(self):
        api, git = self.model(self.first, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_PROVIDER_DURABILITY_BOOTSTRAP')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.first.root)
            self.assertEqual(result['details']['data']['snapshots'], 81)

    def test_original_report_bootstrap_and_guards_remain_unchanged(self):
        git = a.Git(self.first.repo)
        self.assertEqual(a.bootstrap(git, a.DURABILITY_BASE), a.report_contract_bootstrap(git, a.DURABILITY_BASE))
        old = ast.parse(git.blob(a.DURABILITY_BASE, 'scripts/statistical-levels-ci/admission.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/admission.py'])
        function = lambda tree, name: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
        for name in ['historical_bootstrap', 'daily_bootstrap', 'security_bootstrap', 'capture_recovery_bootstrap', 'producer_run', 'parent_ci', 'validate_data', 'capture_preflight']:
            self.assertEqual(ast.dump(function(old, name)), ast.dump(function(current, name)))
        old_body, new_body = function(old, 'bootstrap'), function(current, 'report_contract_bootstrap')
        old_body.name = new_body.name
        self.assertEqual(ast.dump(old_body), ast.dump(new_body))

    def test_exact_header_parent_delta_modes_and_pin(self):
        git = a.Git(self.first.repo)
        for files in [{**self.content, 'extra.txt': b'unapproved'},
                      {p: b for p, b in self.content.items() if p != 'scripts/statistical-levels-hosted.mjs'},
                      {**self.content, a.PROVENANCE: git.blob(a.DURABILITY_BASE, a.PROVENANCE) + b'\n'}]:
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(git, self.changed_root(files=files))
        for name in a.DURABILITY_FILES:
            with self.subTest(path=name):
                with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                    a.bootstrap(git, self.changed_root(modes={name: '100755'}))
                with self.assertRaisesRegex(ValueError, 'DURABILITY_PAYLOAD'):
                    a.bootstrap(git, self.changed_root(files={**self.content, name: self.content[name] + b'\n'}))
        for changes in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_AUTHOR_DATE': '1792792448 +0000'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'}]:
            with self.assertRaisesRegex(ValueError, 'DURABILITY_COMMIT_HEADER'):
                a.bootstrap(git, self.changed_root(env={**self.header_env, **changes}))
        with self.assertRaisesRegex(ValueError, 'DURABILITY_COMMIT_HEADER'):
            a.bootstrap(git, self.changed_root(message='another repair'))
        tree = git.text('rev-parse', self.first.root + '^{tree}')
        bad = self.first.command(['commit-tree', tree, '-p', a.DURABILITY_BASE, '-p', a.REPORT_CONTRACT_BASE], (a.DURABILITY_MESSAGE + '\n').encode(), self.header_env).decode().strip()
        with self.assertRaisesRegex(ValueError, 'DURABILITY_ORDERED_SINGLE_PARENT'):
            a.bootstrap(git, bad)
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            a.bootstrap(git, self.changed_root(parent=a.REPORT_CONTRACT_BASE))

    def test_native_push_context_is_exact_and_each_day_requires_own_ci(self):
        mutations = [('event', 'before', a.REPORT_CONTRACT_BASE), ('event', 'after', a.DURABILITY_BASE),
                     ('event', 'forced', True), ('event', 'deleted', True), ('event', 'created', True),
                     ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.DURABILITY_BASE),
                     ('env', 'CI_EVENT_SHA', a.DURABILITY_BASE), ('env', 'GITHUB_WORKFLOW_SHA', a.DURABILITY_BASE),
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

    def test_report_release_and_historical_reuse_are_byte_identical(self):
        git = a.Git(self.first.repo)
        before = git.tree(a.DURABILITY_BASE)
        protected = {p for p in before if p.startswith('scripts/statistical-levels-release/')} | {
            '.github/workflows/statistical-levels-release.yml', '.github/workflows/update-statistical-levels.yml',
            'package.json', 'package-lock.json'}
        self.assertFalse(protected & a.DURABILITY_FILES)
        reports = a.reconciled_report_hashes(git, a.DURABILITY_BASE)
        reused = self.reuse.reuse_scope(git, a.DURABILITY_BASE)
        for head in [self.first.root, self.first.daily, self.second.daily]:
            after = git.tree(head)
            self.assertTrue(all(after[p] == before[p] for p in protected))
            self.assertEqual(a.reconciled_report_hashes(git, head), reports)
            self.assertEqual(self.reuse.reuse_scope(git, head), reused)
        old = ast.parse(git.blob(a.DURABILITY_BASE, 'scripts/statistical-levels-ci/historical-tests.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/historical-tests.py'])
        fn = lambda tree: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'run')
        self.assertEqual(ast.dump(fn(old)), ast.dump(fn(current)))
        pattern = r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE"
        self.assertEqual(re.findall(pattern, git.blob(a.DURABILITY_BASE, a.CI).decode(), re.S), re.findall(pattern, self.content[a.CI].decode(), re.S))

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
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [a.DURABILITY_BASE])


if __name__ == '__main__':
    unittest.main()
