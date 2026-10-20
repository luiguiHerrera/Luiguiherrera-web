"""Adversarial models, never hosted evidence or ambient GitHub impersonation."""
import copy
import ast
import contextlib
import types
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import admission as a

ROOT = Path(__file__).resolve().parents[2]


def jsonbytes(value):
    return (json.dumps(value, indent=2) + '\n').encode()


class ModelGit(a.Git):
    def __init__(self, directory, head):
        super().__init__(directory)
        self.head = head
        self.dirty = False

    def __call__(self, *args):
        if args == ('rev-parse', 'HEAD'):
            return (self.head + '\n').encode()
        if args and args[0] == 'status':
            return b' M tracked\n' if self.dirty else b''
        return super().__call__(*args)


class Fixture:
    """Real Git objects in an isolated bare clone; all API/runtime inputs modeled."""
    def __init__(self, directory):
        self.repo = Path(directory) / 'repo.git'
        subprocess.run(['git', 'clone', '--bare', '--shared', str(ROOT), str(self.repo)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.git = a.Git(self.repo)
        self.env = {**os.environ, 'GIT_INDEX_FILE': str(Path(directory) / 'index'), 'GIT_AUTHOR_NAME': 'Codex', 'GIT_AUTHOR_EMAIL': 'codex@openai.com',
                    'GIT_COMMITTER_NAME': 'Codex', 'GIT_COMMITTER_EMAIL': 'codex@openai.com', 'GIT_AUTHOR_DATE': '1792509106 +0000', 'GIT_COMMITTER_DATE': '1792509106 +0000'}
        contents = {p: (ROOT / p).read_bytes() for p in a.FILES}
        contents[a.CI] = re.sub(a.PIN, lambda m: m[1] + b'0'*64 + m[2], contents[a.CI])
        rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(contents[p])} for p in sorted(contents)]
        pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
        contents[a.CI] = re.sub(a.PIN, lambda m: m[1] + pin.encode() + m[2], contents[a.CI])
        self.root = self.commit(a.BASE, contents, a.BOOTSTRAP_MESSAGE)
        self.baseline_metadata = json.loads((ROOT / 'scripts/statistical-levels-ci/bootstrap-evidence.json').read_text())['metadata_objects']
        self.make_daily()

    def command(self, args, data=None, env=None):
        return subprocess.check_output(['git', *args], input=data, cwd=self.repo, env=env or self.env)

    def commit(self, parent, files, message, env=None, modes=None):
        self.command(['read-tree', parent])
        for p, data in files.items():
            if data is None:
                self.command(['update-index', '--index-info'], ('0 ' + '0'*40 + '\t' + p + '\n').encode())
            else:
                oid = self.command(['hash-object', '-w', '--stdin'], data).decode().strip()
                self.command(['update-index', '--add', '--cacheinfo', (modes or {}).get(p, '100644'), oid, p])
        tree = self.command(['write-tree']).decode().strip()
        return self.command(['commit-tree', tree, '-p', parent], (message + '\n').encode(), env).decode().strip()

    def make_daily(self, parent=None, day=20):
        self.source = parent or self.root
        self.day = day
        self.producer_id = 40000000000 + day - 20
        p = a.unique_json(self.git.blob(self.source, a.PROVENANCE))
        old_baseline = p['BASELINE_ID']
        baseline = f'202610{day}T170000000Z-11111111-1111-4111-8111-111111111111'
        cutoff = f'2026-10-{day}T17:04:00.000Z'
        prefix = 'statistical-levels/raw-authority/' + baseline + '/'
        original = self.receipt['metadata_objects'] if parent else self.baseline_metadata
        seal = a.unique_json(original['SEALED']['utf8'])
        objects = seal['OBJECTS']
        for name, b in objects.items():
            b['VERSION_ID'] = 'synthetic-version-' + name
            b['RETENTION']['RetainUntilDate'] = f'2031-10-{day}T17:04:00Z'
        meta = {}

        def set_meta(name, value):
            raw = value if isinstance(value, bytes) else jsonbytes(value)
            version = 'synthetic-version-' + name
            meta[name] = {'utf8': raw.decode(), 'bytes': len(raw), 'sha256': a.digest(raw), 'version': version}
            if name != 'SEALED':
                objects[name] = {'SHA256': a.digest(raw), 'BYTES': len(raw), 'VERSION_ID': version, 'RETENTION': {'Mode': 'GOVERNANCE', 'RetainUntilDate': f'2031-10-{day}T17:04:00Z'}}
        set_meta('RESERVATION', {'RUN_ID': baseline, 'PROTOCOL': seal['PROTOCOL']})
        raw = a.unique_json(original['raw-manifest.json']['utf8'])
        raw['BASELINE_ID'], raw['SNAPSHOT_CUTOFF'] = baseline, cutoff
        for r in raw['records']:
            r['FETCHED_AT'] = f'2026-10-{day}T17:02:00Z'
        set_meta('raw-manifest.json', raw)
        prov = a.unique_json(original['provenance-manifest.json']['utf8'])
        prov.update(GENERATOR_COMMIT=self.source, RUN_ID=baseline, SNAPSHOT_CUTOFF=cutoff, ARCHIVE_PREFIX=prefix)
        prov['OBJECTS'] = {k: v for k, v in objects.items() if k.startswith('raw/') or k in ['RESERVATION', 'raw-manifest.json']}
        set_meta('provenance-manifest.json', prov)
        set_meta('SHA256SUMS', ''.join(objects[n]['SHA256'] + '  ' + n + '\n' for n in sorted(objects) if n.startswith('raw/') or n == 'raw-manifest.json').encode())
        seal.update(RUN_ID=baseline, SNAPSHOT_CUTOFF=cutoff)
        set_meta('SEALED', seal)
        c = p['CONFIG']
        c.update(BASELINE_ID=baseline, GENERATOR_COMMIT=self.source, SNAPSHOT_CUTOFF=cutoff, GENERATED_AT=cutoff, RAW_ARCHIVE_RELATIVE_PATH=prefix,
                 RAW_ARCHIVE_SEAL_SHA256=meta['SEALED']['sha256'], RAW_ARCHIVE_SEAL_VERSION=meta['SEALED']['version'],
                 RAW_MANIFEST_SHA256=meta['raw-manifest.json']['sha256'], RAW_ARCHIVE_MANIFEST_SHA256=meta['SHA256SUMS']['sha256'])
        for key in ['BASELINE_ID', 'GENERATOR_COMMIT', 'GENERATED_AT', 'RAW_ARCHIVE_RELATIVE_PATH', 'RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256']:
            p[key] = c[key]
        p['CONFIG_SHA256'] = a.digest(a.js_json(c))
        files = {}
        for s in p['snapshots']:
            name = a.DATA + s['FILE']
            files[name] = self.git.blob(self.source, name).replace(old_baseline.encode(), baseline.encode()) + b'\n'
            s['SNAPSHOT_SHA256'] = a.digest(files[name])
            for key in ['GENERATOR_COMMIT', 'GENERATED_AT', 'CONFIG_SHA256']:
                s[key] = p[key]
            for i in s['INPUTS']:
                i['RAW_SOURCE_ID'] = i['RAW_SOURCE_ID'].replace(old_baseline, baseline)
                i['SNAPSHOT_CUTOFF'] = cutoff
        files[a.PROVENANCE] = jsonbytes(p)
        botenv = {**self.env, 'GIT_AUTHOR_NAME': 'github-actions[bot]', 'GIT_COMMITTER_NAME': 'github-actions[bot]',
                  'GIT_AUTHOR_EMAIL': '41898282+github-actions[bot]@users.noreply.github.com', 'GIT_COMMITTER_EMAIL': '41898282+github-actions[bot]@users.noreply.github.com',
                  'GIT_AUTHOR_DATE': f'2026-10-{day}T17:05:00Z', 'GIT_COMMITTER_DATE': f'2026-10-{day}T17:05:00Z'}
        self.daily = self.commit(self.source, files, 'Update statistical levels snapshot with durable raw provenance', botenv)
        self.receipt = {'schema': 'statistical-levels.hosted-publication-receipt.v1', 'repository': a.REPO, 'repository_id': a.REPO_ID,
            'workflow_id': a.PRODUCER_ID, 'workflow_path': a.PRODUCER, 'event': 'schedule', 'branch': a.BRANCH, 'run_id': self.producer_id, 'run_attempt': 1,
            'source_sha': self.source, 'published_sha': self.daily, 'published_tree': self.git.text('rev-parse', self.daily+'^{tree}'),
            'provenance_sha256': a.digest(files[a.PROVENANCE]), 'created_at': f'2026-10-{day}T17:06:00Z',
            's3': {'bucket': a.BUCKET, 'region': a.REGION, 'prefix': prefix, 'baseline': baseline, 'seal_sha256': meta['SEALED']['sha256'], 'seal_version': meta['SEALED']['version'],
                   'principal': f'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-{self.producer_id}-1', 'exact_version_read_count': 45,
                   'evidence_class': 'AUTHENTICATED_PRODUCER_EXACT_VERSION_READBACK'}, 'metadata_objects': meta}


class ModelAPI:
    def __init__(self, fixture, daily=True):
        f = fixture
        self.producer_id = f.producer_id
        own_id = 50000000000 + f.day - 20 if daily else 39999999999
        prior_id = 39999999999 if f.day == 20 else 50000000000
        head = f.daily if daily else f.root
        repo = {'id': a.REPO_ID, 'full_name': a.REPO, 'default_branch': a.BRANCH}
        common = {'repository': repo, 'head_repository': repo, 'head_branch': a.BRANCH}
        self.run = {**common, 'id': f.producer_id, 'run_attempt': 1, 'workflow_id': a.PRODUCER_ID, 'path': a.PRODUCER, 'head_sha': f.source,
                    'event': 'schedule', 'status': 'completed', 'conclusion': 'success', 'run_started_at': f'2026-10-{f.day}T17:00:00Z', 'updated_at': f'2026-10-{f.day}T17:07:00Z'}
        self.env = {'GITHUB_REPOSITORY': a.REPO, 'GITHUB_REPOSITORY_ID': str(a.REPO_ID), 'GITHUB_REF': 'refs/heads/' + a.BRANCH,
                    'GITHUB_WORKFLOW_REF': a.REPO + '/' + a.CI + '@refs/heads/' + a.BRANCH, 'GITHUB_WORKFLOW_SHA': head,
                    'GITHUB_SHA': head, 'CI_EVENT_SHA': head, 'GITHUB_RUN_ID': str(own_id), 'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_EVENT_NAME': 'workflow_run' if daily else 'push'}
        self.event = {'repository': repo, 'action': 'completed', 'workflow_run': copy.deepcopy(self.run)} if daily else {
            'repository': repo, 'before': a.BASE, 'after': head, 'ref': 'refs/heads/' + a.BRANCH, 'forced': False, 'deleted': False, 'created': False}
        prior = {**common, 'id': prior_id, 'run_attempt': 1, 'workflow_id': a.CI_ID, 'path': a.CI, 'head_sha': f.source, 'event': 'push' if f.day == 20 else 'workflow_run', 'status': 'completed', 'conclusion': 'success'}
        actor = {'id': 41898282, 'login': 'github-actions[bot]', 'type': 'Bot'}
        commit_actor = {'name': 'github-actions[bot]', 'email': '41898282+github-actions[bot]@users.noreply.github.com', 'date': f'2026-10-{f.day}T17:05:00Z'}
        self.responses = {'': repo,
            '/git/ref/heads/' + a.BRANCH: {'object': {'sha': head, 'type': 'commit', 'url': 'https://api.github.com/repos/' + a.REPO + '/git/commits/' + head}},
            f'/actions/runs/{own_id}': {**common, 'id': own_id, 'run_attempt': 1, 'workflow_id': a.CI_ID, 'path': a.CI, 'head_sha': head, 'event': self.env['GITHUB_EVENT_NAME']},
            f'/actions/runs/{f.producer_id}': self.run,
            '/actions/workflows/' + str(a.PRODUCER_ID): {'id': a.PRODUCER_ID, 'path': a.PRODUCER, 'name': 'Update statistical levels', 'state': 'active'},
            '/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100': {'total_count': 1, 'workflow_runs': [prior]},
            f'/actions/runs/{prior_id}/attempts/1/jobs?per_page=100': {'total_count': 1, 'jobs': [{'name': 'validate', 'status': 'completed', 'conclusion': 'success', 'steps': [
                {'name': n, 'status': 'completed', 'conclusion': 'success'} for n in ['Bind qualification to event SHA and governed metadata-repair successor lineage',
                'Test bounded CI admission and producer readback', 'Authenticate fresh native capture handoff', 'Run existing release, native proof, policy and security tests',
                'Reject missing or skipped mandatory coverage and candidate drift', 'Revalidate exact branch and emit bounded qualification evidence']]}]},
            '/commits/' + head: {'sha': head, 'parents': [{'sha': f.source}], 'author': actor, 'committer': actor,
                                 'commit': {'author': commit_actor, 'committer': commit_actor, 'message': 'Update statistical levels snapshot with durable raw provenance'}}}
        self.receipt = copy.deepcopy(f.receipt)
        self.artifact = {'id': 123, 'name': f'sl-published-{f.producer_id}-1', 'expired': False,
                        'workflow_run': {'id': f.producer_id, 'repository_id': a.REPO_ID, 'head_repository_id': a.REPO_ID, 'head_branch': a.BRANCH, 'head_sha': f.source}}
        self.pack()

    def pack(self, name='publication-receipt.json', symlink=False, duplicate=False):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as z:
            info = zipfile.ZipInfo(name)
            info.external_attr = (0o120777 if symlink else 0o100644) << 16
            z.writestr(info, jsonbytes(self.receipt))
            if duplicate:
                z.writestr('extra.json', b'{}')
        self.raw_bytes = buffer.getvalue()
        self.artifact.update(digest='sha256:' + a.digest(self.raw_bytes), size_in_bytes=len(self.raw_bytes))
        self.responses[f'/actions/runs/{self.producer_id}/artifacts?per_page=100'] = {'total_count': 1, 'artifacts': [self.artifact]}

    def get(self, suffix):
        return copy.deepcopy(self.responses[suffix])

    def raw(self, path, limit, download):
        assert path == '/repos/' + a.REPO + '/actions/artifacts/123/zip' and download
        return self.raw_bytes


class AdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-ci-model-')
        cls.f = Fixture(cls.temp.name)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def admit(self, api, head=None):
        model = ModelGit(self.f.repo, head or api.env['GITHUB_SHA'])
        # Immutable object caches are shared; the native context remains per model.
        model.blob, model.tree, model.parents = self.f.git.blob, self.f.git.tree, self.f.git.parents
        return a.admit(model, api, api.env, api.event)

    def test_real_git_bootstrap_and_daily_model(self):
        for daily, mode in [(False, 'BOUNDED_CI_BOOTSTRAP'), (True, 'AUTHENTICATED_DATA_SUCCESSOR')]:
            with self.subTest(mode=mode):
                result = self.admit(ModelAPI(self.f, daily))
                self.assertEqual(result['mode'], mode)
                self.assertFalse(result['release_authority_issued'])
                self.assertEqual(result['historical_N'], a.N)
                self.assertEqual(result['certified_production'], a.PRODUCTION)
                self.assertTrue(result['independent_review_required'])

    def test_exact_bootstrap_delta_and_header(self):
        root, chain = a.bootstrap(self.f.git, self.f.root)
        self.assertEqual((root, chain), (self.f.root, []))
        self.assertEqual(a.bootstrap(self.f.git, self.f.daily), (self.f.root, [self.f.daily]))
        for mode in ['same_tree_other_message', 'extra_code', 'mode', 'changed_pin', 'missing_helper']:
            with self.subTest(mode=mode):
                files = {p: self.f.git.blob(self.f.root, p) for p in a.FILES}
                message = a.BOOTSTRAP_MESSAGE
                modes = None
                if mode == 'same_tree_other_message': message += ' foreign'
                if mode == 'extra_code': files['foreign-code.py'] = b'print(1)\n'
                if mode == 'mode': modes = {a.CI: '100755'}
                if mode == 'changed_pin': files[a.CI] = re.sub(a.PIN, lambda m: m[1]+b'f'*64+m[2], files[a.CI])
                if mode == 'missing_helper': files.pop('scripts/statistical-levels-ci/producer-receipt.mjs')
                sha = self.f.commit(a.BASE, files, message, modes=modes)
                with self.assertRaises(ValueError): a.bootstrap(self.f.git, sha)

    def test_native_and_upstream_mutations(self):
        cases = [
            ('native_sha', lambda x: x.env.update(CI_EVENT_SHA=a.BASE)),
            ('native_repository', lambda x: x.env.update(GITHUB_REPOSITORY='foreign/repo')),
            ('native_id', lambda x: x.env.update(GITHUB_REPOSITORY_ID='1')),
            ('native_ref', lambda x: x.env.update(GITHUB_REF='refs/heads/main')),
            ('workflow_sha', lambda x: x.env.update(GITHUB_WORKFLOW_SHA=a.BASE)),
            ('workflow_ref', lambda x: x.env.update(GITHUB_WORKFLOW_REF='foreign/repo/workflow')),
            ('native_attempt', lambda x: x.env.update(GITHUB_RUN_ATTEMPT='2')),
            ('local_impersonation', lambda x: x.env.update(SL_LOCAL_QUALIFICATION_SUBJECT_SHA256='test')),
            ('default_branch', lambda x: x.responses[''].update(default_branch='main')),
            ('branch_tip', lambda x: x.responses['/git/ref/heads/'+a.BRANCH]['object'].update(sha=a.BASE)),
            ('own_run_id', lambda x: x.responses['/actions/runs/50000000000'].update(id=999)),
            ('own_run_sha', lambda x: x.responses['/actions/runs/50000000000'].update(head_sha=a.BASE)),
            ('own_run_workflow', lambda x: x.responses['/actions/runs/50000000000'].update(workflow_id=1)),
            ('wrong_producer_workflow', lambda x: x.run.update(workflow_id=1)),
            ('wrong_producer_branch', lambda x: x.run.update(head_branch='main')),
            ('failed_run', lambda x: x.run.update(conclusion='failure')),
            ('incomplete_run', lambda x: x.run.update(status='in_progress')),
            ('foreign_event', lambda x: x.run.update(event='pull_request')),
            ('source_displaced', lambda x: x.run.update(head_sha=a.BASE)),
            ('producer_attempt', lambda x: x.run.update(run_attempt=2)),
            ('event_forged', lambda x: x.event['workflow_run'].update(head_sha=a.BASE)),
            ('event_not_completed', lambda x: x.event.update(action='requested')),
        ]
        for name, mutate in cases:
            with self.subTest(case=name):
                api = ModelAPI(self.f); mutate(api)
                with self.assertRaises((ValueError, KeyError)): self.admit(api)

    def test_receipt_mutations_and_ambiguous_artifacts(self):
        for field, value in [('source_sha', a.BASE), ('published_sha', a.BASE), ('published_tree', 'f'*40), ('run_id', 1), ('run_attempt', 2),
                             ('workflow_id', 1), ('event', 'workflow_dispatch'), ('repository_id', 1), ('provenance_sha256', 'f'*64), ('created_at', '2026-10-21T00:00:00Z')]:
            with self.subTest(field=field):
                api = ModelAPI(self.f); api.receipt[field] = value; api.pack()
                with self.assertRaises(ValueError): self.admit(api)
        for name in ['digest', 'expired', 'duplicate', 'missing', 'cross_run', 'zip_extra', 'zip_path', 'symlink', 's3_principal', 's3_read_count']:
            with self.subTest(case=name):
                api = ModelAPI(self.f)
                listing = api.responses['/actions/runs/40000000000/artifacts?per_page=100']
                if name == 'digest': api.artifact['digest'] = 'sha256:'+'f'*64
                if name == 'expired': api.artifact['expired'] = True
                if name == 'duplicate': listing.update(total_count=2, artifacts=[api.artifact, api.artifact])
                if name == 'missing': listing.update(total_count=0, artifacts=[])
                if name == 'cross_run': api.artifact['workflow_run']['id'] = 1
                if name == 'zip_extra': api.pack(duplicate=True)
                if name == 'zip_path': api.pack(name='../publication-receipt.json')
                if name == 'symlink': api.pack(symlink=True)
                if name == 's3_principal': api.receipt['s3']['principal'] += '-foreign'; api.pack()
                if name == 's3_read_count': api.receipt['s3']['exact_version_read_count'] = 44; api.pack()
                with self.assertRaises(ValueError): self.admit(api)

    def test_parent_ci_required_without_retroactive_pass(self):
        for case in ['absent', 'ambiguous', 'skipped_mandatory', 'wrong_sha', 'failure']:
            with self.subTest(case=case):
                api = ModelAPI(self.f)
                listing = api.responses['/actions/workflows/'+str(a.CI_ID)+'/runs?head_sha='+self.f.root+'&status=success&per_page=100']
                if case == 'absent': listing.update(total_count=0, workflow_runs=[])
                if case == 'ambiguous': listing.update(total_count=2, workflow_runs=listing['workflow_runs']*2)
                if case == 'wrong_sha': listing['workflow_runs'][0]['head_sha'] = a.BASE
                if case == 'failure': listing['workflow_runs'][0]['conclusion'] = 'failure'
                if case == 'skipped_mandatory': api.responses['/actions/runs/39999999999/attempts/1/jobs?per_page=100']['jobs'][0]['steps'][0]['conclusion'] = 'skipped'
                with self.assertRaises(ValueError): self.admit(api)

    def test_data_only_and_metadata_corruption(self):
        for case in ['code', 'mode', 'missing', 'extra', 'snapshot', 'source_state', 'source_commit', 'config_hash', 'coverage']:
            with self.subTest(case=case):
                changes, modes = {}, None
                p = a.unique_json(self.f.git.blob(self.f.daily, a.PROVENANCE))
                first = sorted(a.paths(self.f.git)-{a.PROVENANCE})[0]
                if case == 'code': changes['package.json'] = self.f.git.blob(self.f.daily, 'package.json')+b'\n'
                if case == 'mode': changes[first] = self.f.git.blob(self.f.daily, first); modes = {first:'100755'}
                if case == 'missing': changes[first] = None
                if case == 'extra': changes[a.DATA+'assets/FOREIGN.json'] = b'{}'
                if case == 'snapshot': changes[first] = b'{}'
                if case == 'source_state': p['SOURCE_STATE'] = 'WORKTREE'
                if case == 'source_commit': p['GENERATOR_COMMIT'] = a.BASE
                if case == 'config_hash': p['CONFIG_SHA256'] = 'f'*64
                if case == 'coverage': p['snapshots'].pop()
                if case in ['source_state','source_commit','config_hash','coverage']: changes[a.PROVENANCE] = jsonbytes(p)
                sha = self.f.commit(self.f.daily, changes, 'synthetic corrupt child', modes=modes)
                if case in ['code','mode','missing','extra']:
                    with self.assertRaises(ValueError): a.bootstrap(self.f.git, sha)
                else:
                    with self.assertRaises(ValueError): a.validate_data(self.f.git, sha, self.f.root, self.f.receipt['metadata_objects'])
        for field in ['sha256','bytes','version','utf8']:
            with self.subTest(metadata=field):
                meta = copy.deepcopy(self.f.receipt['metadata_objects']); row = meta['raw-manifest.json']
                row[field] = row[field]+1 if field=='bytes' else row[field]+'corrupt'
                with self.assertRaises(ValueError): a.validate_data(self.f.git, self.f.daily, self.f.root, meta)

    def test_foreign_committer_and_commit_time(self):
        for field in ['login','id','type']:
            api = ModelAPI(self.f)
            api.responses['/commits/'+self.f.daily]['author'][field] = 'foreign'
            with self.subTest(field=field), self.assertRaises(ValueError): self.admit(api)
        api = ModelAPI(self.f)
        api.responses['/commits/'+self.f.daily]['commit']['committer']['date'] = '2026-10-21T00:00:00Z'
        with self.assertRaises(ValueError): self.admit(api)

    def test_original_G5_guard_bytes_and_new_head_negatives(self):
        current = (ROOT/a.CI).read_bytes()
        old = self.f.git.blob(a.OLD, a.CI)
        def guard(data):
            return data.split(b'          # G5_EXECUTION_PRESERVATION_BEGIN\n',1)[1].split(b'          # G5_EXECUTION_PRESERVATION_END',1)[0]
        self.assertEqual(guard(current), guard(old))
        source = '\n'.join(line[10:] for line in guard(current).decode().splitlines())
        context = {'git': self.f.git, 'hashlib': hashlib, 'os': os, 'subprocess': subprocess}
        exec(compile(source, 'unchanged-historical-G5-guard-model', 'exec'), context)
        context['verify_g5_execution'](a.OLD, self.f.git.parents(a.OLD))
        for sha in [a.BASE, self.f.root, self.f.daily]:
            with self.subTest(sha=sha), self.assertRaises(AssertionError): context['verify_g5_execution'](sha, self.f.git.parents(sha))

    def test_bootstrap_events(self):
        for field, value in [('before', a.OLD), ('after', a.BASE), ('forced', True), ('deleted', True), ('created', True), ('ref','refs/heads/main')]:
            api = ModelAPI(self.f, False); api.event[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): self.admit(api)

    def test_duplicate_json_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_JSON_KEY'): a.unique_json('{"sha":1,"sha":2}')


    def test_actual_inline_lineage_for_bootstrap_and_daily_models(self):
        import builtins
        import contextlib
        import types
        program = re.findall(r"          python3 - <<'PYCODE'\n(.*?)\n          PYCODE", self.f.git.blob(self.f.root, a.CI).decode(), re.S)[0]
        program = '\n'.join(line[10:] for line in program.splitlines())
        with tempfile.TemporaryDirectory(prefix='sl-ci-real-lineage-model-') as directory:
            directory = Path(directory).resolve()
            checkout = directory / 'checkout'
            subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(self.f.repo), str(checkout)], check=True, capture_output=True)
            for daily in [False, True]:
                with self.subTest(daily=daily):
                    api = ModelAPI(self.f, daily)
                    head = api.env['GITHUB_SHA']
                    subprocess.run(['git', 'checkout', '--detach', head], cwd=checkout, check=True, capture_output=True)
                    out = Path(directory) / ('daily' if daily else 'bootstrap'); out.mkdir()
                    bounded = self.admit(api)
                    (out/'bounded-admission.json').write_bytes(jsonbytes(bounded))
                    env = {**api.env, 'CI_EVIDENCE': str(out)}
                    class Paths:
                        def __call__(self, *args): return Path(*args)
                        def cwd(self): return checkout
                    model_os = types.SimpleNamespace(environ=env)
                    model_subprocess = types.SimpleNamespace(
                        check_output=lambda args, **kw: subprocess.check_output(args, cwd=checkout, **kw),
                        run=lambda args, **kw: subprocess.run(args, cwd=checkout, **kw))
                    original_import = builtins.__import__
                    def model_import(name, *args, **kwargs):
                        if name == 'os': return model_os
                        if name == 'subprocess': return model_subprocess
                        if name == 'pathlib': return types.SimpleNamespace(Path=Paths())
                        return original_import(name, *args, **kwargs)
                    namespace = {'__builtins__': {**vars(builtins), '__import__': model_import}}
                    with contextlib.redirect_stdout(io.StringIO()):
                        exec(compile(program, 'exact-CI-lineage-program-IN-MODELED-EVENT', 'exec'), namespace)
                    subject = json.loads((out/'subject.json').read_text())
                    self.assertEqual(subject['head_sha'], head)
                    self.assertEqual(subject['integration_push'], not daily)
                    self.assertTrue(subject['integration_qualified'])
                    self.assertEqual(subject['lineage']['integration_subject_sha'], a.OLD)
                    self.assertEqual(subject['lineage']['actual_ordered_parents'], [self.f.root] if daily else [a.BASE])
                    self.assertEqual(subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip(),head)


class WorkflowStructureTests(unittest.TestCase):
    def test_no_release_changes_and_real_tests_preserved(self):
        text = (ROOT/a.CI).read_text()
        producer = (ROOT/a.PRODUCER).read_text()
        self.assertIn('    workflows: [Update statistical levels]', text)
        self.assertIn('  contents: read\n  actions: read\n', text)
        self.assertNotIn('actions: write', text + producer)
        self.assertNotIn('id-token:', text)
        self.assertNotIn('workflow_dispatch:', text)
        for command in ['npm ci', 'npm run lint', 'npm run build', 'capture-full-product.mjs --verify', 'qa-statistical-levels-runtime.mjs', 'scripts/statistical-levels-release/tests/*.test.mjs']:
            self.assertIn(command, text)
        self.assertIn('"${#release_tests[@]}" -eq 39', text)
        self.assertIn('historical-tests.py', text)
        self.assertIn('DUPLICATE_OR_MISSING_TAP_COUNT', text)
        self.assertIn('BOUNDED_SUMMARY_RUN', text)


def build_accounting_tests(workflow):
    class ActualCIAccountingTests(unittest.TestCase):
        @classmethod
        def setUpClass(cls):
            cls.workflow_bytes = Path(workflow).read_bytes()
            programs = [
                '\n'.join(line[10:] for line in body.splitlines())
                for body in re.findall(
                    r"^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$",
                    cls.workflow_bytes.decode(), re.M)]
            if len(programs) != 3:
                raise AssertionError('Exactly three existing actual CI programs required')
            cls.tree = ast.parse(programs[2])
            cls.env = {'GITHUB_SHA': 'f' * 40, 'CI_EVENT_SHA': 'f' * 40,
                'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '2',
                'GITHUB_EVENT_NAME': 'workflow_run', 'GITHUB_REF': 'refs/heads/vercel-deployment'}

        @classmethod
        def actual_assertion(cls, message):
            nodes = [n for n in ast.walk(cls.tree) if isinstance(n, ast.Assert)
                and isinstance(n.msg, ast.Constant) and n.msg.value == message]
            if len(nodes) != 1:
                raise AssertionError('Missing or duplicated actual assertion: ' + message)
            return compile(ast.Module(body=nodes, type_ignores=[]), 'actual-ci:' + message, 'exec')

        def scope(self):
            bounded = {'head_sha': self.env['GITHUB_SHA'], 'run_id': '123',
                'run_attempt': '2', 'event': 'workflow_run', 'admission': 'PASS'}
            subject = {'head_sha': self.env['GITHUB_SHA'], 'run_id': '123',
                'run_attempt': '2', 'event': 'workflow_run', 'ref': self.env['GITHUB_REF'],
                'integration_push': False, 'integration_qualified': True,
                'bounded_admission': copy.deepcopy(bounded)}
            before = {'reviewed-file': {'mode': '100644', 'sha256': 'a' * 64}}
            return {'os': types.SimpleNamespace(environ=self.env), 'hashlib': hashlib, 're': re, 'subject': subject,
                'bounded': bounded, 'before': before, 'after': copy.deepcopy(before)}

        def test_actual_sha_source_run_and_event_assertions(self):
            cases = [
                ('GOVERNED_BYTES_CHANGED', lambda s: s['after']['reviewed-file'].update(sha256='b' * 64)),
                ('GOVERNED_BYTES_CHANGED', lambda s: s['after']['reviewed-file'].update(mode='100755')),
                ('WRONG_SUBJECT_SHA', lambda s: s['subject'].update(head_sha='e' * 40)),
                ('WRONG_SUMMARY_SHA', lambda s: s['subject'].update(head_sha='e' * 40)),
                ('CROSS_RUN_SUBJECT', lambda s: s['subject'].update(run_id='999')),
                ('CROSS_RUN_SUBJECT', lambda s: s['subject'].update(run_attempt='1')),
                ('WRONG_SUBJECT_EVENT', lambda s: s['subject'].update(event='push')),
                ('WRONG_SUBJECT_EVENT', lambda s: s['subject'].update(ref='refs/heads/main')),
                ('WRONG_INTEGRATION_CLASS', lambda s: s['subject'].update(integration_push=True)),
                ('QUALIFICATION_CLASS', lambda s: s['subject'].update(integration_qualified=False)),
                ('BOUNDED_ADMISSION_REQUIRED', lambda s: s['subject'].update(bounded_admission=None)),
                ('BOUNDED_SUMMARY', lambda s: s['bounded'].update(head_sha='e' * 40)),
                ('BOUNDED_SUMMARY', lambda s: s['bounded'].update(admission='FAIL')),
                ('BOUNDED_SUMMARY_RUN', lambda s: s['bounded'].update(run_id='999')),
                ('BOUNDED_SUMMARY_RUN', lambda s: s['bounded'].update(run_attempt='1')),
                ('BOUNDED_SUMMARY_RUN', lambda s: s['bounded'].update(event='push')),
            ]
            with contextlib.nullcontext():
                for message, mutate in cases:
                    with self.subTest(assertion=message, mutation=cases.index((message, mutate))):
                        code = self.actual_assertion(message)
                        scope = self.scope()
                        exec(code, scope)
                        mutate(scope)
                        with self.assertRaises(AssertionError):
                            exec(code, scope)

        def test_actual_historical_subject_and_tap_binding(self):
            raw = b'Synthetic local TAP bytes for digest-binding model only\n'
            positive = {'test_source_sha': '0004db585fb402c97d8470c31ea4e405f0905b7e',
                'qualification_sha': self.env['GITHUB_SHA'],
                'historical_caller_mode': 'ACTUAL_LOCAL_G5_CALLER_NOT_HOSTED',
                'native_admission_of_new_sha': False, 'tap_sha256': hashlib.sha256(raw).hexdigest(),
                'exit_code': 0}
            cases = [
                ('HISTORICAL_TEST_SUBJECT', 'test_source_sha', self.env['GITHUB_SHA']),
                ('HISTORICAL_TEST_SUBJECT', 'qualification_sha', 'e' * 40),
                ('HISTORICAL_TEST_ROLE', 'historical_caller_mode', 'ACTUAL_HOSTED_G5_CALLER'),
                ('HISTORICAL_TEST_ROLE', 'native_admission_of_new_sha', True),
                ('HISTORICAL_TEST_TAP', 'tap_sha256', 'e' * 64),
                ('HISTORICAL_TEST_TAP', 'exit_code', 1),
            ]
            with contextlib.nullcontext():
                for message, field, value in cases:
                    with self.subTest(assertion=message, field=field):
                        code = self.actual_assertion(message)
                        scope = {'historical': copy.deepcopy(positive), 'historical_bytes': raw,
                            'os': types.SimpleNamespace(environ=self.env), 'hashlib': hashlib}
                        exec(code, scope)
                        scope['historical'][field] = value
                        with self.assertRaises(AssertionError):
                            exec(code, scope)

        @staticmethod
        def tap(nested=False):
            return ('TAP version 13\n# Subtest: one\n'
                + ('    ok 1 - nested\n    1..1\n' if nested else '')
                + 'ok 1 - one\n# Subtest: two\nok 2 - two\n1..2\n'
                + '# tests ' + ('3' if nested else '2') + '\n'
                + '# pass ' + ('3' if nested else '2') + '\n'
                + '# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n')

        def actual_tap_loop(self, texts):
            loops = [n for n in ast.walk(self.tree) if isinstance(n, ast.For)
                and isinstance(n.target, ast.Name) and n.target.id == 'log']
            self.assertEqual(len(loops), 1)
            code = compile(ast.Module(body=loops, type_ignores=[]), 'actual-ci:partition-loop', 'exec')
            scope = {'texts': texts, 'counters': [], 'partitions': [], 're': re,
                'os': types.SimpleNamespace(environ=self.env), 'hashlib': hashlib, 'name': 'release',
                'historical': {'test_source_sha': '0004db585fb402c97d8470c31ea4e405f0905b7e'}}
            with contextlib.nullcontext():
                exec(code, scope)
            return scope

        def test_actual_original_tap_streams_remain_distinct(self):
            result = self.actual_tap_loop([self.tap(nested=True), self.tap()])
            self.assertEqual([x['tests'] for x in result['counters']], [3, 2])
            self.assertEqual([x['test_files'] for x in result['partitions']], [39, 2])
            self.assertEqual([x['test_source_sha'] for x in result['partitions']],
                [self.env['GITHUB_SHA'], '0004db585fb402c97d8470c31ea4e405f0905b7e'])
            self.assertEqual([x['log_sha256'] for x in result['partitions']],
                [hashlib.sha256(self.tap(nested=True).encode()).hexdigest(),
                 hashlib.sha256(self.tap().encode()).hexdigest()])

        def test_actual_tap_negative_plans_counts_and_results(self):
            valid = self.tap()
            cases = {
                'missing_header': valid.replace('TAP version 13\n', ''),
                'duplicate_header': 'TAP version 13\n' + valid,
                'missing_plan': valid.replace('1..2\n', ''),
                'duplicate_plan': valid + '1..2\n',
                'zero_plan': valid.replace('1..2\n', '1..0\n'),
                'truncated_result_with_forged_totals': valid.replace('ok 2 - two\n', ''),
                'duplicate_result': valid.replace('ok 2 - two\n', 'ok 1 - one\nok 2 - two\n'),
                'reordered_results': valid.replace('ok 1 - one', 'ok 2 - one').replace('ok 2 - two', 'ok 1 - two'),
                'missing_count': valid.replace('# pass 2\n', ''),
                'duplicate_count': valid + '# pass 2\n',
                'failed_result_with_forged_zero_fail_count': valid.replace('ok 1 - one', 'not ok 1 - one'),
                'failed_count': valid.replace('# fail 0', '# fail 1'),
                'cancelled_count': valid.replace('# cancelled 0', '# cancelled 1'),
                'todo_count': valid.replace('# todo 0', '# todo 1'),
                'inconsistent_count': valid.replace('# pass 2', '# pass 1'),
                'concatenated_two_plans': valid + valid,
            }
            for name, body in cases.items():
                with self.subTest(case=name), self.assertRaises(AssertionError):
                    self.actual_tap_loop([body])

        def test_actual_qualification_does_not_forge_push(self):
            nodes = [n for n in self.tree.body if isinstance(n, ast.Assign)
                and any(isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name)
                    and t.value.id == 'summary' and isinstance(t.slice, ast.Constant)
                    and t.slice.value in {'integration_qualification_complete', 'covered_obligations'}
                    for t in n.targets)]
            self.assertEqual(len(nodes), 2)
            code = compile(ast.Module(body=nodes, type_ignores=[]), 'actual-ci:obligation-accounting', 'exec')
            subject = self.scope()['subject']
            scope = {'summary': {}, 'subject': subject}
            exec(code, scope)
            self.assertTrue(scope['summary']['integration_qualification_complete'])
            self.assertEqual(scope['summary']['covered_obligations'], ['C%02d' % i for i in range(1, 14)])
            self.assertFalse(subject['integration_push'])
            subject['bounded_admission'] = None
            subject['integration_qualified'] = False
            scope['summary'] = {}
            exec(code, scope)
            self.assertFalse(scope['summary']['integration_qualification_complete'])
            self.assertNotIn('C11', scope['summary']['covered_obligations'])
            with self.assertRaises(AssertionError):
                exec(self.actual_assertion('BOUNDED_ADMISSION_REQUIRED'), scope | {'os': types.SimpleNamespace(environ=self.env)})

    return ActualCIAccountingTests


ActualCIAccountingTests = build_accounting_tests(ROOT / a.CI)

if __name__ == '__main__':
    unittest.main()
