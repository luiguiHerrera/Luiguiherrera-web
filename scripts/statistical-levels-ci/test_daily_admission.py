"""Local daily protocol models. No native hosted PASS or provider access."""
import copy
import json
import unittest
import admission as a


class ParentCIAPI:
    def __init__(self, conclusions):
        self.sha = 'a' * 40
        common = {'repository': {'id': a.REPO_ID, 'full_name': a.REPO}, 'head_repository': {'id': a.REPO_ID, 'full_name': a.REPO},
            'head_sha': self.sha, 'head_branch': a.BRANCH, 'workflow_id': a.CI_ID, 'path': a.CI, 'run_attempt': 1,
            'event': 'workflow_run', 'status': 'completed', 'conclusion': 'success'}
        self.runs = [{**common, 'id': 100 + i} for i in range(len(conclusions))]
        required = ['Bind qualification to event SHA and governed metadata-repair successor lineage',
            'Test bounded CI admission and producer readback', 'Authenticate fresh native capture handoff',
            'Run existing release, native proof, policy and security tests',
            'Reject missing or skipped mandatory coverage and candidate drift',
            'Revalidate exact branch and emit bounded qualification evidence']
        self.jobs = {r['id']: {'name': 'validate', 'status': 'completed', 'conclusion': c,
            'steps': [{'name': n, 'status': 'completed', 'conclusion': 'success'} for n in required]} for r, c in zip(self.runs, conclusions)}
    def get(self, suffix):
        if suffix.startswith('/actions/workflows/'):
            return {'total_count': len(self.runs), 'workflow_runs': self.runs}
        run = int(suffix.split('/')[3]);return {'total_count': 1, 'jobs': [self.jobs[run]]}


class DailyTests(unittest.TestCase):
    def test_noop_does_not_count_as_qualification(self):
        api = ParentCIAPI(['skipped', 'success'])
        self.assertEqual(a.parent_ci(api, api.sha)['run_id'], 101)
    def test_only_noops_never_qualify_parent(self):
        api = ParentCIAPI(['skipped', 'skipped'])
        with self.assertRaisesRegex(ValueError, 'AMBIGUOUS_OR_ABSENT'):a.parent_ci(api, api.sha)
    def test_multiple_real_qualifications_still_ambiguous(self):
        api = ParentCIAPI(['success', 'skipped', 'success'])
        with self.assertRaisesRegex(ValueError, 'AMBIGUOUS_OR_ABSENT'):a.parent_ci(api, api.sha)
    def test_renamed_noop_job_is_rejected(self):
        api = ParentCIAPI(['skipped', 'success']);api.jobs[100]['name'] = 'fake-validate'
        with self.assertRaisesRegex(ValueError, 'PARENT_JOB'):a.parent_ci(api, api.sha)
    def test_fake_success_without_real_steps_is_rejected(self):
        api = ParentCIAPI(['success']);api.jobs[100]['steps'] = []
        with self.assertRaisesRegex(ValueError, 'MANDATORY_STEP'):a.parent_ci(api, api.sha)
    def test_wrong_sha_cannot_supply_parent_pass(self):
        api = ParentCIAPI(['success']);api.runs[0]['head_sha'] = 'b' * 40
        with self.assertRaisesRegex(ValueError, 'RUN_SHA'):a.parent_ci(api, api.sha)
    def test_skipped_mandatory_test_cannot_supply_parent_pass(self):
        api = ParentCIAPI(['success']);api.jobs[100]['steps'][1]['conclusion'] = 'skipped'
        with self.assertRaisesRegex(ValueError, 'MANDATORY_STEP'):a.parent_ci(api, api.sha)

    def fixture(self):
        repo = {'id': a.REPO_ID, 'full_name': a.REPO}
        prior = {'id': 123, 'run_attempt': 1, 'workflow_id': a.PRODUCER_ID, 'path': a.PRODUCER, 'repository': repo, 'head_repository': repo,
            'head_branch': a.BRANCH, 'head_sha': 'a' * 40, 'event': 'schedule', 'status': 'completed', 'conclusion': 'failure',
            'run_started_at': '2026-10-23T08:30:00Z', 'updated_at': '2026-10-23T08:40:00Z'}
        run = {**prior, 'id': 124, 'conclusion': 'success', 'run_started_at': '2026-10-23T09:00:00Z', 'updated_at': '2026-10-23T09:05:00Z'}
        selected = {'schema': 'statistical-levels.daily-selection.v1', 'day': '2026-10-23', 'run_id': '20261023T083100000Z-11111111-1111-4111-8111-111111111111',
            'source_sha': run['head_sha'], 'producer_run_id': '123', 'producer_attempt': '1', 'created_at': '2026-10-23T08:31:00Z'}
        text = json.dumps(selected)
        p = {'BASELINE_ID': selected['run_id'], 'GENERATOR_COMMIT': run['head_sha'], 'CONFIG': {'SNAPSHOT_CUTOFF': '2026-10-23T08:35:00Z'}}
        receipt = {'created_at': '2026-10-23T09:04:00Z', 'daily_admission': {'mode': 'REUSE_SEALED', 'day': selected['day'],
            'selection': {'key': 'statistical-levels/raw-authority/daily/2026-10-23/SELECTED.json', 'version': 'synthetic-version', 'sha256': a.digest(text.encode()), 'utf8': text}}}
        return receipt, run, p, prior
    def test_reuse_requires_native_earlier_failed_run_same_source_and_sealed_window(self):
        a.validate_daily_selection(*self.fixture())
    def test_reuse_missing_native_origin_fails(self):
        r, run, p, _ = self.fixture()
        with self.assertRaisesRegex(ValueError, 'ORIGIN_REQUIRED'):a.validate_daily_selection(r, run, p)
    def test_reuse_wrong_original_attempt_fails(self):
        r, run, p, prior = self.fixture();prior['run_attempt'] = 2
        with self.assertRaisesRegex(ValueError, 'ORIGINAL_RUN'):a.validate_daily_selection(r, run, p, prior)
    def test_reuse_wrong_original_source_fails(self):
        r, run, p, prior = self.fixture();prior['head_sha'] = 'b' * 40
        with self.assertRaisesRegex(ValueError, 'RUN_SHA'):a.validate_daily_selection(r, run, p, prior)
    def test_reuse_original_still_running_fails(self):
        r, run, p, prior = self.fixture();prior['status'] = 'in_progress'
        with self.assertRaisesRegex(ValueError, 'ORIGINAL_TERMINAL'):a.validate_daily_selection(r, run, p, prior)
    def test_reuse_altered_cutoff_outside_original_run_fails(self):
        r, run, p, prior = self.fixture();p['CONFIG']['SNAPSHOT_CUTOFF'] = '2026-10-23T08:45:00Z'
        with self.assertRaisesRegex(ValueError, 'NATIVE_TIME'):a.validate_daily_selection(r, run, p, prior)
    def test_reuse_selection_body_without_matching_hash_fails(self):
        r, run, p, prior = self.fixture();r['daily_admission']['selection']['utf8'] += ' '
        with self.assertRaisesRegex(ValueError, 'INTEGRITY'):a.validate_daily_selection(r, run, p, prior)
    def test_reuse_cross_day_fails(self):
        r, run, p, prior = self.fixture();r['daily_admission']['day'] = '2026-10-24'
        with self.assertRaisesRegex(ValueError, 'SELECTION_REF'):a.validate_daily_selection(r, run, p, prior)



# The following models use real Git trees and the actual native capture entrypoint.
# GitHub identity/events and two future days are synthetic, never hosted evidence.
import importlib.util
import os
from pathlib import Path
import re
import subprocess
import tempfile
from test_admission import Fixture, ModelAPI, ModelGit, ROOT, jsonbytes

class ExactSuccessorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-daily-successor-model-')
        cls.directory = Path(cls.temp.name).resolve()
        cls.first = Fixture(cls.directory)
        f = cls.first
        # Preserve the exact historical daily bootstrap subject. Current working
        # tree dependency repairs belong to the separate security-root model.
        content = {p: f.git.blob(a.SECURITY_BASE, p) for p in a.DAILY_FILES}
        content[a.CI] = re.sub(a.DAILY_PIN, lambda m: m[1] + b'0' * 64 + m[2], content[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(content[p])} for p in sorted(content)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        content[a.CI] = re.sub(a.DAILY_PIN, lambda m: m[1] + pin.encode() + m[2], content[a.CI])
        env = {**f.env, 'GIT_AUTHOR_DATE': a.DAILY_BOOTSTRAP_IDENTITY.split('> ')[1], 'GIT_COMMITTER_DATE': a.DAILY_BOOTSTRAP_IDENTITY.split('> ')[1]}
        f.root = f.commit(a.RECONCILED, content, a.DAILY_BOOTSTRAP_MESSAGE, env)
        f.receipt = {'metadata_objects': json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']}
        f.make_daily(parent=f.root, day=23)
        cls.add_selection(f)
        cls.second = copy.copy(f)
        cls.second.make_daily(parent=f.daily, day=24)
        cls.add_selection(cls.second)
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        cls.serial = 0
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    @staticmethod
    def add_selection(f):
        day = f'2026-10-{f.day}'
        selected = {'schema': 'statistical-levels.daily-selection.v1', 'day': day, 'run_id': f.receipt['s3']['baseline'],
            'source_sha': f.source, 'producer_run_id': str(f.producer_id), 'producer_attempt': '1', 'created_at': day + 'T17:01:00Z'}
        text = json.dumps(selected)
        f.receipt['daily_admission'] = {'mode': 'FETCH_NEW', 'day': day, 'selection': {
            'key': 'statistical-levels/raw-authority/daily/' + day + '/SELECTED.json', 'version': 'synthetic-selection',
            'sha256': a.digest(text.encode()), 'utf8': text}}
    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = a.REMOTE_BEFORE_RECONCILIATION
        return api, ModelGit(f.repo, api.env['GITHUB_SHA'])
    def test_exact_successor_bootstrap_and_two_consecutive_daily_sha(self):
        f = self.first
        api, git = self.model(f, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_RECONCILIATION_AND_DAILY_BOOTSTRAP')
        self.assertEqual(result['root_sha'], f.root)
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['head_sha'], f.daily)
            self.assertEqual(result['details']['data']['snapshots'], 81)
    def test_daily_without_required_selection_is_rejected(self):
        f = self.first;api, git = self.model(f)
        del f.receipt['daily_admission']
        try:
            # API artifact bytes are generated from current receipt by ModelAPI.
            api, git = self.model(f)
            with self.assertRaisesRegex(ValueError, 'RECEIPT_FIELDS'):a.admit(git, api, api.env, api.event)
        finally:self.add_selection(f)
    def test_new_root_missing_a_required_path_cannot_bootstrap(self):
        f = self.first
        bad = f.commit(f.root, {'scripts/statistical-levels-daily.mjs': None}, 'not-a-data-successor')
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):a.bootstrap(a.Git(f.repo), bad)
    def test_new_root_changed_code_cannot_be_daily_successor(self):
        f = self.first
        bad = f.commit(f.root, {'scripts/statistical-levels-daily.mjs': b'changed'}, 'not-a-data-successor')
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):a.bootstrap(a.Git(f.repo), bad)
    def test_two_daily_native_capture_handoffs_use_actual_successor_bytes(self):
        for f in [self.first, self.second]:
            api, git = self.model(f)
            subprocess.run(['git', 'checkout', '--detach', f.daily], cwd=self.checkout, check=True, capture_output=True)
            type(self).serial += 1
            out = self.directory / ('native-' + str(self.serial));out.mkdir()
            env = {**api.env, 'CI_EVIDENCE': str(out), 'SL_NEXT_LOCAL_ORIGIN': 'http://127.0.0.1:31876',
                'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted', 'GITHUB_JOB': 'validate', 'GITHUB_EVENT_PATH': str(out / 'event.json')}
            result = a.admit(git, api, env, api.event)
            event_bytes, admission_bytes = jsonbytes(api.event), jsonbytes(result)
            (out / 'event.json').write_bytes(event_bytes);(out / 'bounded-admission.json').write_bytes(admission_bytes)
            handoff = a.capture_preflight(git, api, env, event_bytes, admission_bytes)
            handoff_bytes = jsonbytes(handoff);(out / 'capture-admission.json').write_bytes(handoff_bytes);(out / 'capture-admission.json').chmod(0o600)
            env['SL_NATIVE_CAPTURE_ADMISSION_SHA256'] = a.digest(handoff_bytes)
            model = out / 'env.json';model.write_bytes(jsonbytes(env))
            js = "import fs from 'node:fs';import{pathToFileURL}from'node:url';const{fullProductContext}=await import(pathToFileURL(process.argv[2]));console.log(JSON.stringify(fullProductContext(JSON.parse(fs.readFileSync(process.argv[3],'utf8')))));"
            r = subprocess.run(['node', '--input-type=module', '-e', js, 'synthetic-native-context', str(self.checkout / a.CAPTURE), str(model)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(json.loads(r.stdout)['subject'], f.daily)

    def test_actual_unchanged_inline_g5_guards_for_new_bootstrap_and_daily_models(self):
        import builtins, contextlib, io, types
        blocks = re.findall(r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE", self.first.git.blob(self.first.root, a.CI).decode(), re.S)
        programs = ['\n'.join(line[10:] for line in block.splitlines()) for block in blocks[:2]]
        for f, daily in [(self.first, False), (self.first, True), (self.second, True)]:
            api, git = self.model(f, daily)
            head = api.env['GITHUB_SHA']
            subprocess.run(['git', 'checkout', '--detach', head], cwd=self.checkout, check=True, capture_output=True)
            type(self).serial += 1
            out = self.directory / ('inline-' + str(self.serial));out.mkdir()
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
                with contextlib.redirect_stdout(io.StringIO()):exec(compile(program, 'actual-inline-g5-and-bundle-guards-MODELED-NEW-SUCCESSOR', 'exec'), namespace)
            subject = json.loads((out / 'subject.json').read_bytes())
            self.assertEqual(subject['head_sha'], head)
            self.assertTrue(subject['integration_qualified'])
            self.assertEqual(subject['lineage']['integration_subject_sha'], a.OLD)
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [a.RECONCILED])


if __name__ == '__main__':unittest.main()
