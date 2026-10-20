"""Differential models, never a native hosted CI PASS.

Use real Git objects/checkouts and the actual capture entrypoint. GitHub API,
runner/event and future S3 metadata are explicitly modeled function arguments;
no GITHUB_* process environment is rewritten to manufacture hosted evidence.
"""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT, jsonbytes


class NativeCaptureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-native-capture-model-')
        cls.directory = Path(cls.temp.name).resolve()
        cls.first = Fixture(cls.directory)
        cls.second = copy.copy(cls.first)
        cls.second.make_daily(parent=cls.first.daily, day=21)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(cls.first.repo), str(cls.checkout)],
                       check=True, capture_output=True)
        spec = importlib.util.spec_from_file_location('historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.reuse = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.reuse)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def prepare(self, second=False, daily=True):
        f = self.second if second else self.first
        api = ModelAPI(f, daily)
        head = api.env['GITHUB_SHA']
        subprocess.run(['git', 'checkout', '--detach', head], cwd=self.checkout, check=True, capture_output=True)
        type(self).serial += 1
        out = self.directory / ('evidence-' + str(self.serial))
        out.mkdir()
        env = {**api.env, 'CI_EVIDENCE': str(out), 'SL_NEXT_LOCAL_ORIGIN': 'http://127.0.0.1:31876',
            'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted', 'GITHUB_JOB': 'validate',
            'GITHUB_EVENT_PATH': str(out / 'native-event.json')}
        api.env = env
        git = ModelGit(f.repo, head)
        bounded = a.admit(git, api, env, api.event)
        event_bytes, bounded_bytes = jsonbytes(api.event), jsonbytes(bounded)
        Path(env['GITHUB_EVENT_PATH']).write_bytes(event_bytes)
        (out / 'bounded-admission.json').write_bytes(bounded_bytes)
        handoff = a.capture_preflight(git, api, env, event_bytes, bounded_bytes)
        if handoff:
            self.write_handoff(env, handoff)
        return f, api, git, env, bounded, handoff

    def write_handoff(self, env, value):
        data = jsonbytes(value)
        p = Path(env['CI_EVIDENCE']) / 'capture-admission.json'
        p.write_bytes(data)
        p.chmod(0o600)
        env['SL_NATIVE_CAPTURE_ADMISSION_SHA256'] = a.digest(data)

    def context(self, env, success=True):
        model = Path(env['CI_EVIDENCE']) / 'modeled-env.json'
        model.write_bytes(jsonbytes(env))
        program = """
          import fs from 'node:fs';
          import {pathToFileURL} from 'node:url';
          const {fullProductContext} = await import(pathToFileURL(process.argv[2]));
          const modeled = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
          try { console.log(JSON.stringify(fullProductContext(modeled))); }
          catch (e) { console.error(e.message); process.exitCode=1; }
        """
        result = subprocess.run(['node', '--input-type=module', '-e', program, 'native-capture-model',
            str(self.checkout / a.CAPTURE), str(model)], capture_output=True, text=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertNotIn('FULL_PRODUCT_CAPTURE_FAILED', result.stderr)
        return result.stderr

    def test_bootstrap_and_two_consecutive_native_capture_models(self):
        _, _, _, env, bounded, h = self.prepare(daily=False)
        self.assertIsNone(h)
        self.assertEqual(bounded['mode'], 'BOUNDED_CI_BOOTSTRAP')
        self.assertEqual(self.context(env), {'role': 'hosted', 'subject': self.first.root,
            'run_id': env['GITHUB_RUN_ID'], 'run_attempt': '1',
            'origin': env['SL_NEXT_LOCAL_ORIGIN'], 'out': env['CI_EVIDENCE'] + '/full-product'})
        for second in [False, True]:
            with self.subTest(second=second):
                f, _, _, env, bounded, h = self.prepare(second)
                result = self.context(env)
                self.assertEqual(result['role'], 'hosted')
                self.assertEqual(result['subject'], f.daily)
                self.assertEqual(result['run_id'], env['GITHUB_RUN_ID'])
                self.assertEqual(result['native_admission_sha256'], env['SL_NATIVE_CAPTURE_ADMISSION_SHA256'])
                self.assertEqual(bounded['details']['source_sha'], self.first.daily if second else f.root)
                self.assertEqual(a.bootstrap(f.git, f.daily)[1], [self.second.daily, self.first.daily] if second else [self.first.daily])
                self.assertEqual(h['producer_run_id'], 40000000001 if second else 40000000000)
                self.assertEqual(bounded['details']['parent_ci']['run_id'], 50000000000 if second else 39999999999)
                self.assertEqual(result['run_id'], '50000000001' if second else '50000000000')

    def test_orphan_replay_and_native_context_rejected(self):
        _, _, _, env, _, _ = self.prepare()
        for field, value in [
            ('SL_NATIVE_CAPTURE_ADMISSION_SHA256', ''), ('SL_NATIVE_CAPTURE_ADMISSION_SHA256', '0'*64),
            ('GITHUB_RUN_ID', '999'), ('GITHUB_RUN_ATTEMPT', '2'), ('GITHUB_SHA', a.BASE),
            ('CI_EVENT_SHA', a.BASE), ('GITHUB_REPOSITORY_ID', '1'), ('GITHUB_REPOSITORY', 'foreign/repo'),
            ('GITHUB_REF', 'refs/heads/main'), ('GITHUB_WORKFLOW_SHA', a.BASE),
            ('GITHUB_WORKFLOW_REF', 'foreign'), ('GITHUB_JOB', 'foreign'), ('GITHUB_ACTIONS', 'false'),
            ('RUNNER_ENVIRONMENT', 'self-hosted'), ('GITHUB_EVENT_NAME', 'pull_request'),
            ('SL_LOCAL_QUALIFICATION_SUBJECT_SHA256', '0'*64)]:
            with self.subTest(field=field, value=value):
                self.context({**env, field: value}, success=False)
        (Path(env['CI_EVIDENCE']) / 'capture-admission.json').unlink()
        self.context(env, success=False)

    def test_real_event_bytes_and_producer_binding_rejected(self):
        _, api, _, env, _, h = self.prepare()
        event_path = Path(env['GITHUB_EVENT_PATH'])
        forged = copy.deepcopy(api.event)
        forged['workflow_run']['id'] = 3
        event_path.write_bytes(jsonbytes(forged))
        self.assertIn('EVENT_DIGEST', self.context(env, False))
        for field, value in [('id', 3), ('run_attempt', 2), ('workflow_id', 1), ('path', 'foreign'),
                             ('head_sha', a.BASE), ('head_branch', 'main'), ('event', 'pull_request'),
                             ('status', 'in_progress'), ('conclusion', 'failure')]:
            with self.subTest(field=field):
                event = copy.deepcopy(api.event)
                event['workflow_run'][field] = value
                data = jsonbytes(event); event_path.write_bytes(data)
                altered = {**h, 'native_event_sha256': a.digest(data)}
                self.write_handoff(env, altered)
                self.assertIn('PRODUCER_EVENT', self.context(env, False))

    def test_handoff_fields_and_bounded_record_rejected(self):
        _, _, _, env, bounded, h = self.prepare()
        for field, value in [('head_sha', a.BASE), ('root_sha', a.BASE), ('source_sha', a.BASE),
                             ('run_id', '99'), ('run_attempt', '2'), ('workflow_id', 1),
                             ('workflow_path', 'foreign'), ('event', 'push'), ('phase', 'PASS'),
                             ('admission_sha256', 'f'*64), ('provenance_sha256', 'f'*64),
                             ('source_sha256', {})]:
            with self.subTest(field=field):
                self.write_handoff(env, {**h, field: value})
                self.context(env, False)
        self.write_handoff(env, h)
        (Path(env['CI_EVIDENCE']) / 'bounded-admission.json').write_bytes(jsonbytes({**bounded, 'admission': 'PASS', 'head_sha': a.BASE}))
        self.assertIn('RECORD_DIGEST', self.context(env, False))

    def test_file_modes_symlinks_and_duplicate_json_rejected(self):
        _, _, _, env, _, h = self.prepare()
        p = Path(env['CI_EVIDENCE']) / 'capture-admission.json'
        p.chmod(0o644)
        self.assertIn('ADMISSION_FILE', self.context(env, False))
        self.write_handoff(env, h)
        saved = p.with_suffix('.saved'); p.rename(saved); p.symlink_to(saved)
        self.assertIn('ADMISSION_PATH', self.context(env, False))
        p.unlink()
        data = b'{"schema":"forged",' + saved.read_bytes()[1:]
        p.write_bytes(data); p.chmod(0o600)
        env['SL_NATIVE_CAPTURE_ADMISSION_SHA256'] = a.digest(data)
        self.assertIn('DUPLICATE_KEY', self.context(env, False))

    def test_fresh_api_ref_event_and_initial_admission_required(self):
        _, api, git, env, bounded, _ = self.prepare()
        initial = jsonbytes(bounded)
        api.responses['/git/ref/heads/' + a.BRANCH]['object']['sha'] = a.BASE
        with self.assertRaisesRegex(ValueError, 'REF_MOVED'):
            a.capture_preflight(git, api, env, jsonbytes(api.event), initial)
        api.responses['/git/ref/heads/' + a.BRANCH]['object']['sha'] = env['GITHUB_SHA']
        api.event['workflow_run']['run_attempt'] = 2
        with self.assertRaisesRegex(ValueError, 'EVENT_RUN_MISMATCH'):
            a.capture_preflight(git, api, env, jsonbytes(api.event), initial)
        api.event['workflow_run']['run_attempt'] = 1
        with self.assertRaisesRegex(ValueError, 'CAPTURE_INITIAL_ADMISSION_CHANGED'):
            a.capture_preflight(git, api, env, jsonbytes(api.event), jsonbytes({**bounded, 'root_sha': a.BASE}))

    def test_second_successor_requires_exact_first_ci_and_receipt(self):
        _, api, git, env, _, _ = self.prepare(True)
        self.assertEqual(api.responses['/actions/workflows/' + str(a.CI_ID) +
            '/runs?head_sha=' + self.first.daily + '&status=success&per_page=100']['workflow_runs'][0]['event'], 'workflow_run')
        api.receipt['source_sha'] = self.first.root
        api.pack()
        with self.assertRaisesRegex(ValueError, 'RECEIPT_BINDING_SOURCE_SHA'):
            a.admit(git, api, env, api.event)

    def test_historical_reuse_is_exact_and_capture_is_not_reused(self):
        for head in [self.first.root, self.first.daily, self.second.daily]:
            reused, changed = self.reuse.reuse_scope(self.first.git, head)
            self.assertEqual(len(reused), 111)
            self.assertEqual(len(changed), 4)
            self.assertIn(a.CAPTURE, changed)
            self.assertNotIn(a.CAPTURE, reused)
        old = self.first.git.blob(a.OLD, a.CAPTURE).decode()
        current = (ROOT / a.CAPTURE).read_text()
        # Preserve native evidence and secret protection byte for byte.
        for begin, end in [('async function validateProduct(', 'export async function readFullProductEvidence('),
                           ('function safeEnvironment(', 'export async function captureFullProduct(')]:
            self.assertEqual(old[old.index(begin):old.index(end)], current[current.index(begin):current.index(end)])

    def test_push_and_local_context_regression(self):
        self.prepare(daily=False)
        base = {'SL_NEXT_LOCAL_ORIGIN': 'http://127.0.0.1:31876', 'CI_EVIDENCE': str(self.directory)}
        hosted = {**base, 'GITHUB_SHA': a.OLD, 'CI_EVENT_SHA': a.OLD, 'GITHUB_EVENT_NAME': 'push',
                  'GITHUB_REF': 'refs/heads/vercel-deployment', 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1'}
        self.assertEqual(self.context(hosted)['subject'], a.OLD)
        local = {**base, 'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256': 'a'*64,
                 'SL_FULL_PRODUCT_RUN_ID': 'LOCAL_MODEL', 'SL_FULL_PRODUCT_RUN_ATTEMPT': '1'}
        self.assertEqual(self.context(local)['role'], 'local')
        for patch in [{'CI_EVENT_SHA': a.BASE}, {'GITHUB_RUN_ID': '0'}, {'GITHUB_RUN_ATTEMPT': '0'},
                      {'GITHUB_REF': 'refs/heads/main'}, {'GITHUB_EVENT_NAME': 'workflow_dispatch'}]:
            self.context({**hosted, **patch}, False)
        self.context({**local, 'GITHUB_SHA': a.OLD}, False)


if __name__ == '__main__':
    unittest.main()
