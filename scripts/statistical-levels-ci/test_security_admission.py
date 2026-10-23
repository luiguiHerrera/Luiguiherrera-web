"""Exact security successor models; no hosted PASS or provider requests."""
import builtins
import contextlib
import copy
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


class SecuritySuccessorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-security-successor-model-')
        cls.directory = Path(cls.temp.name).resolve()
        f = cls.first = Fixture(cls.directory)
        # This fixture retains the exact security successor as its subject;
        # future capture changes belong only to their separate root model.
        cls.content = {p: f.git.blob(a.CAPTURE_RECOVERY_BASE, p) for p in a.SECURITY_FILES}
        cls.content[a.CI] = re.sub(a.SECURITY_PIN, lambda m: m[1] + b'0' * 64 + m[2], cls.content[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(cls.content[p])} for p in sorted(cls.content)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        cls.content[a.CI] = re.sub(a.SECURITY_PIN, lambda m: m[1] + pin.encode() + m[2], cls.content[a.CI])
        cls.header_env = {**f.env, 'GIT_AUTHOR_DATE': a.SECURITY_BOOTSTRAP_IDENTITY.split('> ')[1],
                          'GIT_COMMITTER_DATE': a.SECURITY_BOOTSTRAP_IDENTITY.split('> ')[1]}
        f.root = f.commit(a.SECURITY_BASE, cls.content, a.SECURITY_BOOTSTRAP_MESSAGE, cls.header_env)
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=f.root, day=24)
        daily_models.ExactSuccessorTests.add_selection(f)
        cls.second = copy.copy(f)
        cls.second.make_daily(parent=f.daily, day=25)
        daily_models.ExactSuccessorTests.add_selection(cls.second)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = a.SECURITY_BASE
        elif f.source in [self.first.root, self.first.daily]:
            # Bind the modeled parent CI to the very root/day-one modeled run,
            # rather than an unrelated synthetic PASS for the same parent SHA.
            listing = api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100']
            prior = listing['workflow_runs'][0]
            old_jobs = '/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'
            prior['id'] = 39999999999 if f.source == self.first.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.first.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = api.responses.pop(old_jobs)
        return api, ModelGit(f.repo, api.env['GITHUB_SHA'])

    def changed_root(self, files=None, message=None, env=None, modes=None, parent=None):
        return self.first.commit(parent or a.SECURITY_BASE, files or self.content,
                                 message or a.SECURITY_BOOTSTRAP_MESSAGE, env or self.header_env, modes)

    def test_exact_security_root_and_two_data_successors(self):
        api, git = self.model(self.first, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_SECURITY_REPAIR_BOOTSTRAP')
        self.assertEqual(result['details']['security_base_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.first.root)
            self.assertEqual(result['head_sha'], f.daily)
            self.assertEqual(result['details']['data']['snapshots'], 81)

    def test_original_bootstrap_predicates_still_validate_original_objects(self):
        git = a.Git(self.first.repo)
        self.assertEqual(a.bootstrap(git, a.SECURITY_BASE), a.daily_bootstrap(git, a.SECURITY_BASE))
        self.assertEqual(a.bootstrap(git, a.REMOTE_BEFORE_RECONCILIATION),
                         a.historical_bootstrap(git, a.REMOTE_BEFORE_RECONCILIATION))

    def test_data_child_of_failed834_preserves_old_route_but_requires_real_parent_ci(self):
        f = copy.copy(self.first)
        f.root = a.SECURITY_BASE
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=a.SECURITY_BASE, day=26)
        daily_models.ExactSuccessorTests.add_selection(f)
        self.assertEqual(a.bootstrap(a.Git(f.repo), f.daily), a.daily_bootstrap(a.Git(f.repo), f.daily))
        api, git = self.model(f)
        api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + a.SECURITY_BASE + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
        with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'):
            a.admit(git, api, api.env, api.event)

    def test_exact_push_event_and_native_sha_required(self):
        mutations = [
            ('event', 'before', a.REMOTE_BEFORE_RECONCILIATION), ('event', 'after', a.SECURITY_BASE),
            ('event', 'forced', True), ('event', 'deleted', True), ('event', 'created', True),
            ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.SECURITY_BASE),
            ('env', 'CI_EVENT_SHA', a.SECURITY_BASE), ('env', 'GITHUB_WORKFLOW_SHA', a.SECURITY_BASE),
            ('env', 'GITHUB_REF', 'refs/heads/main'), ('env', 'GITHUB_REPOSITORY_ID', '1'),
            ('env', 'GITHUB_EVENT_NAME', 'workflow_run')]
        for target, key, value in mutations:
            with self.subTest(target=target, key=key):
                api, git = self.model(self.first, False)
                (api.event if target == 'event' else api.env)[key] = value
                with self.assertRaises(ValueError):
                    a.admit(git, api, api.env, api.event)

    def test_exact_commit_header_required(self):
        for change in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'},
                       {'GIT_AUTHOR_DATE': '1792765710 +0000'}, {'GIT_COMMITTER_DATE': '1792765710 +0000'}]:
            with self.subTest(change=change):
                head = self.changed_root(env={**self.header_env, **change})
                with self.assertRaisesRegex(ValueError, 'SECURITY_BOOTSTRAP_COMMIT_HEADER'):
                    a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(message='Different security successor')
        with self.assertRaisesRegex(ValueError, 'SECURITY_BOOTSTRAP_COMMIT_HEADER'):
            a.bootstrap(a.Git(self.first.repo), head)

    def test_wrong_or_extra_parent_rejected(self):
        head = self.changed_root(parent=a.RECONCILED)
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            a.bootstrap(a.Git(self.first.repo), head)
        tree = self.first.git.text('rev-parse', self.first.root + '^{tree}')
        head = self.first.command(['commit-tree', tree, '-p', a.SECURITY_BASE, '-p', a.RECONCILED],
                                 (a.SECURITY_BOOTSTRAP_MESSAGE + '\n').encode(), self.header_env).decode().strip()
        with self.assertRaisesRegex(ValueError, 'SECURITY_ORDERED_SINGLE_PARENT'):
            a.bootstrap(a.Git(self.first.repo), head)

    def test_missing_extra_or_nonregular_security_path_rejected(self):
        report = next(p for p in a.unique_json(self.first.git.blob(a.SECURITY_BASE, a.RECONCILIATION_EVIDENCE))['delta']
                      if p.startswith('public/reports/') and p.endswith('.html'))
        for content in [{**self.content, 'unexpected-security-file.json': b'{}'},
                        {p: value for p, value in self.content.items() if p != 'package.json'},
                        {**self.content, report: self.first.git.blob(a.SECURITY_BASE, report) + b'\n'},
                        {**self.content, a.PROVENANCE: self.first.git.blob(a.SECURITY_BASE, a.PROVENANCE) + b'\n'}]:
            with self.subTest(paths=sorted(content)):
                head = self.changed_root(files=content)
                with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                    a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(files={**self.content, 'package.json': None})
        with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
            a.bootstrap(a.Git(self.first.repo), head)
        head = self.changed_root(modes={'scripts/statistical-levels-ci/admission.py': '100755'})
        with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
            a.bootstrap(a.Git(self.first.repo), head)

    def test_security_payload_or_pin_drift_rejected(self):
        for content in [{**self.content, 'package.json': self.content['package.json'] + b'\n'},
                        {**self.content, a.CI: re.sub(a.SECURITY_PIN, lambda m: m[1] + b'0' * 64 + m[2], self.content[a.CI])}]:
            head = self.changed_root(files=content)
            with self.assertRaisesRegex(ValueError, 'SECURITY_BOOTSTRAP_PAYLOAD'):
                a.bootstrap(a.Git(self.first.repo), head)

    def test_descendant_code_change_or_second_security_change_rejected(self):
        for parent in [self.first.root, self.first.daily, self.second.daily]:
            head = self.first.commit(parent, {'package.json': self.content['package.json'] + b'\n'}, 'unapproved follow-up')
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(a.Git(self.first.repo), head)

    def test_daily_cannot_use_missing_or_wrong_parent_ci(self):
        for f in [self.first, self.second]:
            api, git = self.model(f)
            api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100'] = {'total_count': 0, 'workflow_runs': []}
            with self.assertRaisesRegex(ValueError, 'PARENT_CI_AMBIGUOUS_OR_ABSENT'):
                a.admit(git, api, api.env, api.event)

    def test_report_override_is_only_exact_security_test(self):
        git = a.Git(self.first.repo)
        old = a.reconciled_report_hashes(git, a.SECURITY_BASE)
        current = a.reconciled_report_hashes(git, self.first.root)
        self.assertEqual({p for p in old if old[p] != current[p]}, a.SECURITY_REPORT_FILES)
        self.assertEqual(current, a.reconciled_report_hashes(git, self.second.daily))
        for p in a.SECURITY_REPORT_FILES:
            self.assertEqual(current[p], a.digest(git.blob(self.first.root, p)))

    def test_failure_artifact_is_bounded_and_cannot_turn_gate_success(self):
        ci = self.content[a.CI].decode()
        section = ci.split('      - name: Retain failed dependency audit evidence\n')[1].split('      - name: Lint\n')[0]
        self.assertIn("if: ${{ failure() && steps.dependency_audit.outcome == 'failure' }}", section)
        self.assertIn('if-no-files-found: error', section)
        self.assertIn('overwrite: false', section)
        self.assertEqual(re.findall(r'statistical-levels-ci/(braces[^\s]+)', section),
                         ['braces-raw-npm-audit.json', 'braces-raw-npm-audit-exit.json', 'braces-patch-attestation-result.json'])
        self.assertNotIn('stderr', section)
        self.assertNotIn('continue-on-error', ci)
        self.assertIn('permissions:\n  contents: read\n  actions: read\n', ci)
        self.assertIn("python3 -m unittest discover -s scripts/statistical-levels-ci -p 'test_*.py' -v", ci)

    def test_native_capture_of_two_data_successors(self):
        # Reuse the unchanged native-capture model with the new exact security
        # root; APIs and future days remain explicitly synthetic.
        daily_models.ExactSuccessorTests.test_two_daily_native_capture_handoffs_use_actual_successor_bytes(self)

    def test_actual_inline_g5_and_bundle_guards(self):
        blocks = re.findall(r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE", self.content[a.CI].decode(), re.S)
        programs = ['\n'.join(line[10:] for line in block.splitlines()) for block in blocks[:2]]
        self.assertEqual(len(programs), 2)
        for f, daily in [(self.first, False), (self.first, True), (self.second, True)]:
            api, git = self.model(f, daily)
            head = api.env['GITHUB_SHA']
            subprocess.run(['git', 'checkout', '--detach', head], cwd=self.checkout, check=True, capture_output=True)
            type(self).serial += 1
            out = self.directory / ('security-inline-' + str(self.serial));out.mkdir()
            (out / 'bounded-admission.json').write_bytes(jsonbytes(a.admit(git, api, api.env, api.event)))
            env = {**api.env, 'CI_EVIDENCE': str(out)}
            checkout = self.checkout
            class Paths:
                def __call__(self, *args):return Path(*args)
                def cwd(self):return checkout
            model_os = types.SimpleNamespace(environ=env)
            model_subprocess = types.SimpleNamespace(check_output=lambda args, **kw: subprocess.check_output(args, cwd=checkout, **kw), run=lambda args, **kw: subprocess.run(args, cwd=checkout, **kw))
            original_import = builtins.__import__
            def model_import(name, *args, **kwargs):
                if name == 'os':return model_os
                if name == 'subprocess':return model_subprocess
                if name == 'pathlib':return types.SimpleNamespace(Path=Paths())
                return original_import(name, *args, **kwargs)
            for program in programs:
                namespace = {'__builtins__': {**vars(builtins), '__import__': model_import}}
                with contextlib.redirect_stdout(io.StringIO()):
                    exec(compile(program, 'actual-inline-guards-MODELED-SECURITY-SUCCESSOR', 'exec'), namespace)
            subject = json.loads((out / 'subject.json').read_bytes())
            self.assertEqual(subject['head_sha'], head)
            self.assertTrue(subject['integration_qualified'])
            self.assertEqual(subject['lineage']['integration_subject_sha'], a.OLD)
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [a.SECURITY_BASE])


if __name__ == '__main__':
    unittest.main()
