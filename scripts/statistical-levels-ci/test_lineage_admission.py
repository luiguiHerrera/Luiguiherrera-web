"""Exact lineage-transition models; real Git objects, synthetic native/API contexts only."""
import ast
import builtins
import contextlib
import copy
import datetime
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT, jsonbytes
import test_daily_admission as daily_models

PKG = 'scripts/statistical-levels-release/'
WF = '.github/workflows/statistical-levels-release.yml'


def identity_env(base, identity):
    name, rest = identity.split(' <'); email, date = rest.split('> ')
    return {**base, 'GIT_AUTHOR_NAME': name, 'GIT_AUTHOR_EMAIL': email, 'GIT_COMMITTER_NAME': name, 'GIT_COMMITTER_EMAIL': email,
            'GIT_AUTHOR_DATE': date, 'GIT_COMMITTER_DATE': date}


def seal(files, ci_path=a.CI):
    """Return files with the lineage pin sealed over the exact file set (CI blanked while hashing)."""
    blank = re.sub(a.LINEAGE_PIN, lambda m: m[1] + b'0' * 64 + m[2], files[ci_path])
    rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(blank if p == ci_path else b)} for p, b in sorted(files.items())]
    pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
    return {**files, ci_path: re.sub(a.LINEAGE_PIN, lambda m: m[1] + pin.encode() + m[2], blank)}


def rebind_files(git, editorial, deployment_id, main_sha, registry_prefix, previous_root, ci_bytes, identity, message):
    """Mechanical data-only rebind for a later transition (policy, fixture, two hash literals, manifest, sums, pins, freeze, registry, CI)."""
    show = lambda p: git.blob(editorial, p)
    prov_bytes = show(a.PROVENANCE); prov = a.unique_json(prov_bytes); c = prov['CONFIG']
    pol_bytes = show(PKG + 'policy.json'); P = a.unique_json(pol_bytes); before = a.unique_json(pol_bytes)
    P['authority'] = dict(c)
    P['baseline'] = {'production_git_sha': editorial, 'production_deployment_id': deployment_id, 'authority_run_id': prov['BASELINE_ID'],
                     'sealed_manifest_sha256': c['RAW_ARCHIVE_SEAL_SHA256'], 'main_sha_observed': main_sha,
                     'publication_date_utc': c['SNAPSHOT_CUTOFF'][:10], 'provenance_sha256': a.digest(prov_bytes)}
    new = {PKG + 'policy.json': (json.dumps(P, indent=2, ensure_ascii=False) + '\n').encode()}
    prev = {s: {k: before[s][k] for k in before[s] if before[s][k] != P[s][k]} for s in ('baseline', 'authority')}
    new['scripts/statistical-levels-ci/policy-migration.json'] = jsonbytes({'schema': 'statistical-levels.policy-migration.v1', 'transition_index': len(registry_prefix) + 1, 'editorial_sha': editorial,
        'previous_policy_sha256': a.digest(pol_bytes), 'current_policy_sha256': a.digest(new[PKG + 'policy.json']),
        'current_target': {'candidate_git_sha': editorial, 'deployment_id': deployment_id, 'authority_run_id': prov['BASELINE_ID'], 'sealed_manifest_sha256': c['RAW_ARCHIVE_SEAL_SHA256']}, 'previous_values': prev})
    pol_hash = a.digest(new[PKG + 'policy.json'])
    binding = rb"""(new URL\('\.\./policy\.json', import\.meta\.url\)\)\), ')[a-f0-9]{64}(')"""
    for t, patterns in [('tests/probe-redirect-integration.test.mjs', [rb"('policy\.json': ')[a-f0-9]{64}(')"]),
                        ('tests/product-qa-observability-isolation.test.mjs', [rb'("policy\.json": ")[a-f0-9]{64}(")', binding]),
                        ('tests/probe-qa-http.test.mjs', [binding])]:
        data = show(PKG + t)
        for pat in patterns:
            data = re.sub(pat, lambda m: m.group(1) + pol_hash.encode() + m.group(2), data)
        new[PKG + t] = data
    cur = lambda p: new[p] if p in new else show(p)
    man = a.unique_json(show(PKG + 'source-manifest.json'))
    man2 = {n: a.digest(cur(PKG + n)) for n in man}
    new[PKG + 'source-manifest.json'] = (json.dumps(dict(sorted(man2.items())), indent=2) + '\n').encode()
    sums = {**man2, 'source-manifest.json': a.digest(new[PKG + 'source-manifest.json'])}
    canonical = ''.join(v + '  ' + p + '\n' for p, v in sorted(sums.items())).encode()
    new[PKG + 'SOURCE_SHA256SUMS'] = canonical
    new[WF] = re.sub(rb'(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}', lambda m: m.group(1) + a.digest(canonical).encode(), show(WF))
    fz = a.unique_json(show(PKG + 'workflow-freeze.json')); fz['workflow_sha256'] = a.digest(new[WF]); fz['source_sums_sha256'] = a.digest(canonical)
    new[PKG + 'workflow-freeze.json'] = (json.dumps(fz, indent=2, ensure_ascii=False) + '\n').encode()
    new[a.CI] = ci_bytes
    raw = git('cat-file', 'commit', editorial).decode(); headers, msg = raw.split('\n\n', 1); hdr = dict(l.split(' ', 1) for l in headers.split('\n'))
    parent = hdr['parent']
    rows = git('diff', '--raw', '--no-abbrev', '--no-renames', '-z', parent, editorial).decode().rstrip('\0').split('\0')
    delta = {}
    for meta, path in zip(rows[::2], rows[1::2]):
        _, mode_new, _, oid, status = meta.split()
        delta[path] = {'status': 'D', 'mode': None, 'git_blob': None, 'sha256': None} if status == 'D' else {'status': status, 'mode': mode_new, 'git_blob': oid, 'sha256': a.digest(show(path))}
    files = sorted(set(new) | {a.LINEAGE_REGISTRY})
    entry = {'schema': a.LINEAGE_SCHEMA, 'index': len(registry_prefix) + 1, 'parent': parent,
             'editorial': {'sha': editorial, 'tree': hdr['tree'], 'author': hdr['author'], 'committer': hdr['committer'], 'message': msg.rstrip('\n'), 'delta': dict(sorted(delta.items()))},
             'rebind': {'author': identity, 'committer': identity, 'message': message, 'files': files}, 'previous_rebind': previous_root}
    new[a.LINEAGE_REGISTRY] = (json.dumps(registry_prefix + [entry], indent=1, ensure_ascii=False) + '\n').encode()
    return seal(new), entry


def lineage_metadata(git, parent, template):
    """Synthetic raw-authority metadata consistent with the parent's provenance inputs (the real archive is S3-only)."""
    p = a.unique_json(git.blob(parent, a.PROVENANCE))
    inputs = {}
    for s in p['snapshots']:
        for i in s['INPUTS']:
            inputs[i['ASSET']] = i
    meta = copy.deepcopy(template)
    raw = a.unique_json(meta['raw-manifest.json']['utf8'])
    seal = a.unique_json(meta['SEALED']['utf8'])
    records = []
    for asset in sorted(inputs):
        i = inputs[asset]
        size = 1000 + len(asset)
        records.append({'ASSET': asset, 'SOURCE_FILE': 'raw/' + asset + '.json', 'SHA256': i['RAW_SHA256'], 'BYTES': size, 'ROW_COUNT': i['RAW_ROW_COUNT'],
                        'RAW_TIMESTAMP_COUNT': i['RAW_ROW_COUNT'], 'FIRST_DATE': i['RAW_FIRST_DATE'], 'LAST_DATE': i['RAW_LAST_DATE'], 'FETCHED_AT': p['CONFIG']['SNAPSHOT_CUTOFF']})
        seal['OBJECTS']['raw/' + asset + '.json'] = {**seal['OBJECTS'].get('raw/' + asset + '.json', {'VERSION_ID': 'v', 'RETENTION': {'Mode': 'GOVERNANCE', 'RetainUntilDate': '2032-01-01T00:00:00Z'}}), 'SHA256': i['RAW_SHA256'], 'BYTES': size}
    raw['records'] = records
    meta['raw-manifest.json']['utf8'] = jsonbytes(raw).decode()
    meta['SEALED']['utf8'] = jsonbytes(seal).decode()
    return meta


def make_lineage_daily(f, parent, day, metadata):
    """Daily successor dated the day after the parent's snapshot (same construction as Fixture.make_daily); `day` is only an id counter."""
    f.source = parent
    f.day = day
    f.date = (datetime.date.fromisoformat(a.unique_json(f.git.blob(parent, a.PROVENANCE))['CONFIG']['SNAPSHOT_CUTOFF'][:10]) + datetime.timedelta(days=1))
    D = f.date.isoformat(); RETAIN = f.date.replace(year=f.date.year + 5).isoformat()
    f.producer_id = 40000000000 + day - 20
    p = a.unique_json(f.git.blob(parent, a.PROVENANCE))
    old_baseline = p['BASELINE_ID']
    baseline = D.replace('-', '') + 'T170000000Z-11111111-1111-4111-8111-111111111111'
    cutoff = D + 'T17:04:00.000Z'
    prefix = 'statistical-levels/raw-authority/' + baseline + '/'
    seal = a.unique_json(metadata['SEALED']['utf8'])
    objects = seal['OBJECTS']
    for name, b in objects.items():
        b['VERSION_ID'] = 'synthetic-version-' + name
        b['RETENTION'] = {'Mode': 'GOVERNANCE', 'RetainUntilDate': RETAIN + 'T17:04:00Z'}
    meta = {}

    def set_meta(name, value):
        raw = value if isinstance(value, bytes) else jsonbytes(value)
        version = 'synthetic-version-' + name
        meta[name] = {'utf8': raw.decode(), 'bytes': len(raw), 'sha256': a.digest(raw), 'version': version}
        if name != 'SEALED':
            objects[name] = {'SHA256': a.digest(raw), 'BYTES': len(raw), 'VERSION_ID': version, 'RETENTION': {'Mode': 'GOVERNANCE', 'RetainUntilDate': RETAIN + 'T17:04:00Z'}}
    set_meta('RESERVATION', {'RUN_ID': baseline, 'PROTOCOL': seal['PROTOCOL']})
    raw = a.unique_json(metadata['raw-manifest.json']['utf8'])
    raw['BASELINE_ID'], raw['SNAPSHOT_CUTOFF'] = baseline, cutoff
    for r in raw['records']:
        r['FETCHED_AT'] = D + 'T17:02:00Z'
    set_meta('raw-manifest.json', raw)
    prov = a.unique_json(metadata['provenance-manifest.json']['utf8'])
    prov.update(GENERATOR_COMMIT=f.source, RUN_ID=baseline, SNAPSHOT_CUTOFF=cutoff, ARCHIVE_PREFIX=prefix)
    prov['OBJECTS'] = {k: v for k, v in objects.items() if k.startswith('raw/') or k in ['RESERVATION', 'raw-manifest.json']}
    set_meta('provenance-manifest.json', prov)
    set_meta('SHA256SUMS', ''.join(objects[n]['SHA256'] + '  ' + n + '\n' for n in sorted(objects) if n.startswith('raw/') or n == 'raw-manifest.json').encode())
    seal.update(RUN_ID=baseline, SNAPSHOT_CUTOFF=cutoff)
    set_meta('SEALED', seal)
    c = p['CONFIG']
    c.update(BASELINE_ID=baseline, GENERATOR_COMMIT=f.source, SNAPSHOT_CUTOFF=cutoff, GENERATED_AT=cutoff, RAW_ARCHIVE_RELATIVE_PATH=prefix,
             RAW_ARCHIVE_SEAL_SHA256=meta['SEALED']['sha256'], RAW_ARCHIVE_SEAL_VERSION=meta['SEALED']['version'],
             RAW_MANIFEST_SHA256=meta['raw-manifest.json']['sha256'], RAW_ARCHIVE_MANIFEST_SHA256=meta['SHA256SUMS']['sha256'])
    for key in ['BASELINE_ID', 'GENERATOR_COMMIT', 'GENERATED_AT', 'RAW_ARCHIVE_RELATIVE_PATH', 'RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256']:
        p[key] = c[key]
    p['CONFIG_SHA256'] = a.digest(a.js_json(c))
    files = {}
    for s in p['snapshots']:
        name = a.DATA + s['FILE']
        files[name] = f.git.blob(f.source, name).replace(old_baseline.encode(), baseline.encode()) + b'\n'
        s['SNAPSHOT_SHA256'] = a.digest(files[name])
        for key in ['GENERATOR_COMMIT', 'GENERATED_AT', 'CONFIG_SHA256']:
            s[key] = p[key]
        for i in s['INPUTS']:
            i['RAW_SOURCE_ID'] = i['RAW_SOURCE_ID'].replace(old_baseline, baseline)
            i['SNAPSHOT_CUTOFF'] = cutoff
    files[a.PROVENANCE] = jsonbytes(p)
    botenv = {**f.env, 'GIT_AUTHOR_NAME': 'github-actions[bot]', 'GIT_COMMITTER_NAME': 'github-actions[bot]',
              'GIT_AUTHOR_EMAIL': '41898282+github-actions[bot]@users.noreply.github.com', 'GIT_COMMITTER_EMAIL': '41898282+github-actions[bot]@users.noreply.github.com',
              'GIT_AUTHOR_DATE': D + 'T17:05:00Z', 'GIT_COMMITTER_DATE': D + 'T17:05:00Z'}
    f.daily = f.commit(f.source, files, 'Update statistical levels snapshot with durable raw provenance', botenv)
    f.receipt = {'schema': 'statistical-levels.hosted-publication-receipt.v1', 'repository': a.REPO, 'repository_id': a.REPO_ID,
        'workflow_id': a.PRODUCER_ID, 'workflow_path': a.PRODUCER, 'event': 'schedule', 'branch': a.BRANCH, 'run_id': f.producer_id, 'run_attempt': 1,
        'source_sha': f.source, 'published_sha': f.daily, 'published_tree': f.git.text('rev-parse', f.daily + '^{tree}'),
        'provenance_sha256': a.digest(files[a.PROVENANCE]), 'created_at': D + 'T17:06:00Z',
        's3': {'bucket': a.BUCKET, 'region': a.REGION, 'prefix': prefix, 'baseline': baseline, 'seal_sha256': meta['SEALED']['sha256'], 'seal_version': meta['SEALED']['version'],
               'principal': f'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-{f.producer_id}-1', 'exact_version_read_count': 45,
               'evidence_class': 'AUTHENTICATED_PRODUCER_EXACT_VERSION_READBACK'}, 'metadata_objects': meta}
    dayname = D
    selected = {'schema': 'statistical-levels.daily-selection.v1', 'day': dayname, 'run_id': baseline, 'source_sha': f.source,
                'producer_run_id': str(f.producer_id), 'producer_attempt': '1', 'created_at': dayname + 'T17:01:00Z'}
    text = json.dumps(selected)
    f.receipt['daily_admission'] = {'mode': 'FETCH_NEW', 'day': dayname, 'selection': {'key': 'statistical-levels/raw-authority/daily/' + dayname + '/SELECTED.json',
                                   'version': 'synthetic-selection', 'sha256': a.digest(text.encode()), 'utf8': text}}


def november(api, f):
    """Move the modelled producer/CI/commit timestamps of ModelAPI from October to the fixture's own day."""
    d = f.date.isoformat()
    for run in [api.run, api.event.get('workflow_run', {})]:
        run['run_started_at'] = d + 'T17:00:00Z'
        run['updated_at'] = d + 'T17:07:00Z'
    commit = api.responses.get('/commits/' + api.env['GITHUB_SHA'])
    if commit:
        for role in ['author', 'committer']:
            commit['commit'][role]['date'] = d + 'T17:05:00Z'
    return api


class LineageTransitionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-lineage-model-')
        cls.directory = Path(cls.temp.name).resolve()
        f = cls.first = Fixture(cls.directory)
        git = f.git
        head = a.Git(ROOT).text('rev-parse', 'HEAD')
        cls.root, _ = a.bootstrap(git, head)
        cls.registry = a.lineage_registry(git, cls.root)
        a.need(cls.registry is not None and a.lineage_entry(git, cls.root) is not None, 'LINEAGE_ROOT_IN_HISTORY')
        cls.entry = cls.registry[-1]
        cls.editorial = cls.entry['editorial']['sha']
        cls.content = {p: git.blob(cls.root, p) for p in cls.entry['rebind']['files']}
        cls.header_env = identity_env(f.env, cls.entry['rebind']['author'])
        f.root = cls.root
        template = json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        make_lineage_daily(f, f.root, 6, lineage_metadata(git, f.root, template))
        cls.second = copy.copy(f)
        make_lineage_daily(cls.second, f.daily, 7, lineage_metadata(git, f.daily, template))
        cls.checkout = cls.directory / 'checkout'
        subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(f.repo), str(cls.checkout)], check=True, capture_output=True)
        spec = importlib.util.spec_from_file_location('lineage_historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.reuse = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.reuse)
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f, daily=True):
        api = ModelAPI(f, daily)
        if not daily:
            api.event['before'] = self.editorial
        elif f.source in [self.first.root, self.first.daily]:
            listing = api.responses['/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + f.source + '&status=success&per_page=100']
            prior = listing['workflow_runs'][0]
            old_jobs = '/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'
            prior['id'] = 39999999999 if f.source == self.first.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.first.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = api.responses.pop(old_jobs)
        return november(api, f), ModelGit(f.repo, api.env['GITHUB_SHA'])

    def changed_root(self, files=None, message=None, env=None, modes=None, parent=None, reseal=True):
        files = dict(files or self.content)
        if reseal: files = seal(files)
        return self.first.commit(parent or self.editorial, files, message or self.entry['rebind']['message'], env or self.header_env, modes)

    def test_exact_transition_bootstrap_and_two_daily_successors(self):
        api, git = self.model(self.first, False)
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_LINEAGE_TRANSITION_BOOTSTRAP')
        self.assertEqual(result['details']['transition_index'], self.entry['index'])
        self.assertEqual(result['details']['production_base'], self.editorial)
        self.assertEqual(result['details']['editorial_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        for f in [self.first, self.second]:
            api, git = self.model(f)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.first.root)
            self.assertEqual(result['details']['data']['snapshots'], 81)

    def test_editorial_commit_alone_is_never_admitted(self):
        git = a.Git(self.first.repo)
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
            a.bootstrap(git, self.editorial)

    def test_previous_epoch_functions_remain_unchanged(self):
        git = a.Git(self.first.repo)
        self.assertEqual(a.zod_bootstrap(git, self.entry['parent']), a.bootstrap(git, self.entry['parent']))
        old = ast.parse(git.blob(self.editorial, 'scripts/statistical-levels-ci/admission.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/admission.py'])
        function = lambda tree, name: next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
        for name in ['historical_bootstrap', 'daily_bootstrap', 'security_bootstrap', 'capture_recovery_bootstrap', 'report_contract_bootstrap', 'durability_bootstrap', 'producer_run', 'parent_ci', 'validate_data', 'capture_preflight', 'bind_receipt', 'commit_identity', 'delta', 'paths', 'payload_hash']:
            self.assertEqual(ast.dump(function(old, name)), ast.dump(function(current, name)), name)
        old_body, new_body = function(old, 'bootstrap'), function(current, 'zod_bootstrap')
        old_body.name = new_body.name
        self.assertEqual(ast.dump(old_body), ast.dump(new_body))

    def test_exact_header_parent_delta_modes_and_pin(self):
        git = a.Git(self.first.repo)
        for files in [{**self.content, 'extra.txt': b'unapproved'},
                      {p: b for p, b in self.content.items() if p != PKG + 'workflow-freeze.json'},
                      {**self.content, a.PROVENANCE: git.blob(self.editorial, a.PROVENANCE) + b'\n'}]:
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA|LINEAGE_REBIND_SCOPE'):
                a.bootstrap(git, self.changed_root(files=files))
        for name in sorted(self.content)[:4]:
            with self.subTest(path=name):
                with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                    a.bootstrap(git, self.changed_root(modes={name: '100755'}))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_PAYLOAD'):
            a.bootstrap(git, self.changed_root(files={**self.content, PKG + 'policy.json': self.content[PKG + 'policy.json'] + b'\n'}, reseal=False))
        for changes in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_AUTHOR_DATE': '1793878201 +0100'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'}]:
            with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_HEADER'):
                a.bootstrap(git, self.changed_root(env={**self.header_env, **changes}))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_HEADER'):
            a.bootstrap(git, self.changed_root(message='another rebind'))
        tree = git.text('rev-parse', self.first.root + '^{tree}')
        bad = self.first.command(['commit-tree', tree, '-p', self.editorial, '-p', self.entry['parent']], (self.entry['rebind']['message'] + '\n').encode(), self.header_env).decode().strip()
        with self.assertRaisesRegex(ValueError, 'LINEAGE_ORDERED_SINGLE_PARENT'):
            a.bootstrap(git, bad)
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA|LINEAGE_REBIND_PARENT'):
            a.bootstrap(git, self.changed_root(parent=self.entry['parent']))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_CI_SCOPE'):
            a.bootstrap(git, self.changed_root(files={**self.content, a.CI: self.content[a.CI].replace(b'timeout-minutes: 40', b'timeout-minutes: 41')}))
        # Each LINEAGE_REBIND_POLICY clause is isolated: every other clause stays satisfied.
        policy = a.unique_json(self.content[PKG + 'policy.json']); policy['baseline']['production_git_sha'] = self.entry['parent']
        policy_bytes = (json.dumps(policy, indent=2, ensure_ascii=False) + '\n').encode()
        consistent = a.unique_json(self.content['scripts/statistical-levels-ci/policy-migration.json']); consistent['current_policy_sha256'] = a.digest(policy_bytes)
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_POLICY'):
            a.bootstrap(git, self.changed_root(files={**self.content, PKG + 'policy.json': policy_bytes, 'scripts/statistical-levels-ci/policy-migration.json': jsonbytes(consistent)}))
        wrong_index = a.unique_json(self.content['scripts/statistical-levels-ci/policy-migration.json']); wrong_index['transition_index'] = self.entry['index'] + 1
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_POLICY'):
            a.bootstrap(git, self.changed_root(files={**self.content, 'scripts/statistical-levels-ci/policy-migration.json': jsonbytes(wrong_index)}))
        stale_hash = a.unique_json(self.content['scripts/statistical-levels-ci/policy-migration.json']); stale_hash['current_policy_sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_POLICY'):
            a.bootstrap(git, self.changed_root(files={**self.content, 'scripts/statistical-levels-ci/policy-migration.json': jsonbytes(stale_hash)}))
        migration = a.unique_json(self.content['scripts/statistical-levels-ci/policy-migration.json']); migration['editorial_sha'] = self.entry['parent']
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_POLICY'):
            a.bootstrap(git, self.changed_root(files={**self.content, 'scripts/statistical-levels-ci/policy-migration.json': jsonbytes(migration)}))

    def registry_variant(self, mutate):
        registry = copy.deepcopy(self.registry)
        mutate(registry[-1])
        return {**self.content, a.LINEAGE_REGISTRY: (json.dumps(registry, indent=1, ensure_ascii=False) + '\n').encode()}

    def test_editorial_pins_are_exact(self):
        git = a.Git(self.first.repo)
        first_path = sorted(self.entry['editorial']['delta'])[0]
        cases = [
            ('LINEAGE_EDITORIAL_TREE', lambda e: e['editorial'].__setitem__('tree', '0' * 40)),
            ('LINEAGE_EDITORIAL_HEADER', lambda e: e['editorial'].__setitem__('author', 'Other <other@example.invalid> 1793876400 +0100')),
            ('LINEAGE_EDITORIAL_HEADER', lambda e: e['editorial'].__setitem__('message', e['editorial']['message'] + ' foreign')),
            ('EXACT_DELTA', lambda e: e['editorial']['delta'].pop(first_path)),
            ('EXACT_DELTA', lambda e: e['editorial']['delta'].__setitem__('foreign/file.txt', {'status': 'A', 'mode': '100644', 'git_blob': '0' * 40, 'sha256': '0' * 64})),
            ('LINEAGE_EDITORIAL_BLOB', lambda e: e['editorial']['delta'][first_path].__setitem__('sha256', '0' * 64)),
            ('LINEAGE_EDITORIAL_BLOB', lambda e: e['editorial']['delta'][first_path].__setitem__('git_blob', '0' * 40)),
            ('LINEAGE_EDITORIAL_PARENT', lambda e: e.__setitem__('parent', a.ZOD_BASE)),
            ('LINEAGE_REBIND_PARENT|EXACT_DELTA', lambda e: e['editorial'].__setitem__('sha', e['parent'])),
            ('LINEAGE_REGISTRY_ENTRY', lambda e: e.__setitem__('schema', 'other')),
            ('LINEAGE_REGISTRY_ENTRY', lambda e: e.__setitem__('index', 7)),
        ]
        for code, mutate in cases:
            with self.subTest(code=code):
                with self.assertRaisesRegex(ValueError, code):
                    a.bootstrap(git, self.changed_root(files=self.registry_variant(mutate)))

    def test_editorial_scope_excludes_data_tooling_and_dependencies(self):
        git = a.Git(self.first.repo)
        for forbidden in ['scripts/statistical-levels-hosted.mjs', a.DATA + 'manifest.json', 'package.json', PKG + 'scripts/release-core.mjs', a.PRODUCER]:
            with self.subTest(path=forbidden):
                editorial = self.first.commit(self.entry['parent'], {forbidden: git.blob(self.entry['parent'], forbidden) + b'\n'}, self.entry['editorial']['message'], identity_env(self.first.env, self.entry['editorial']['author']))
                raw = git('cat-file', 'commit', editorial).decode(); hdr = dict(l.split(' ', 1) for l in raw.split('\n\n', 1)[0].split('\n'))
                def mutate(e, editorial=editorial, hdr=hdr, forbidden=forbidden):
                    e['editorial'].update(sha=editorial, tree=hdr['tree'], delta={forbidden: {'status': 'M', 'mode': '100644', 'git_blob': git.tree(editorial)[forbidden][1], 'sha256': a.digest(git.blob(editorial, forbidden))}})
                files = self.registry_variant(mutate)
                with self.assertRaisesRegex(ValueError, 'LINEAGE_EDITORIAL_SCOPE'):
                    a.bootstrap(git, self.changed_root(files=files, parent=editorial))

    def test_first_parent_must_be_admitted_by_the_previous_epoch(self):
        git = a.Git(self.first.repo)
        parent = self.entry['parent']
        rogue = self.first.commit(parent, {'scripts/statistical-levels-hosted.mjs': git.blob(parent, 'scripts/statistical-levels-hosted.mjs') + b'\n'}, 'unreviewed code before the transition')
        editorial = self.first.commit(rogue, {'public/llms.txt': git.blob(rogue, 'public/llms.txt') + b'\n'}, self.entry['editorial']['message'], identity_env(self.first.env, self.entry['editorial']['author']))
        raw = git('cat-file', 'commit', editorial).decode(); hdr = dict(l.split(' ', 1) for l in raw.split('\n\n', 1)[0].split('\n'))
        def mutate(e):
            e['parent'] = rogue
            e['editorial'].update(sha=editorial, tree=hdr['tree'], delta={'public/llms.txt': {'status': 'M', 'mode': '100644', 'git_blob': git.tree(editorial)['public/llms.txt'][1], 'sha256': a.digest(git.blob(editorial, 'public/llms.txt'))}})
        files = self.registry_variant(mutate)
        policy = a.unique_json(files[PKG + 'policy.json']); policy['baseline']['production_git_sha'] = editorial
        files[PKG + 'policy.json'] = (json.dumps(policy, indent=2, ensure_ascii=False) + '\n').encode()
        migration = a.unique_json(files['scripts/statistical-levels-ci/policy-migration.json'])
        migration.update(editorial_sha=editorial, current_policy_sha256=a.digest(files[PKG + 'policy.json']))
        files['scripts/statistical-levels-ci/policy-migration.json'] = jsonbytes(migration)
        root = self.changed_root(files=files, parent=editorial)
        calls, original = [], a.zod_bootstrap
        def spy(git_, head):
            calls.append(head)
            return original(git_, head)
        with patch.object(a, 'zod_bootstrap', spy):
            with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(git, root)
        # Every editorial/rebind check passed: the only call into the previous epoch is for the pinned parent, and it refused.
        self.assertEqual(calls, [rogue])

    def test_first_parent_must_belong_to_the_zod_epoch(self):
        # ZOD_BASE is admitted by an earlier epoch only (it is the durability root); it can never be the first parent.
        git = a.Git(self.first.repo)
        base = a.ZOD_BASE
        editorial = self.first.commit(base, {'public/llms.txt': git.blob(base, 'public/llms.txt') + b'\n'}, self.entry['editorial']['message'], identity_env(self.first.env, self.entry['editorial']['author']))
        raw = git('cat-file', 'commit', editorial).decode(); hdr = dict(l.split(' ', 1) for l in raw.split('\n\n', 1)[0].split('\n'))
        def mutate(e):
            e['parent'] = base
            e['editorial'].update(sha=editorial, tree=hdr['tree'], delta={'public/llms.txt': {'status': 'M', 'mode': '100644', 'git_blob': git.tree(editorial)['public/llms.txt'][1], 'sha256': a.digest(git.blob(editorial, 'public/llms.txt'))}})
        files = self.registry_variant(mutate)
        ci = git.blob(editorial, a.CI).decode()
        pin_anchor = re.search(r'      SL_CI_BOOTSTRAP_PAYLOAD_SHA256: "[a-f0-9]{64}"\n', ci)
        files[a.CI] = (ci[:pin_anchor.end()] + '      SL_CI_LINEAGE_PAYLOAD_SHA256: "' + '0' * 64 + '"\n' + ci[pin_anchor.end():]).encode()
        policy = a.unique_json(files[PKG + 'policy.json']); policy['baseline']['production_git_sha'] = editorial
        files[PKG + 'policy.json'] = (json.dumps(policy, indent=2, ensure_ascii=False) + '\n').encode()
        migration = a.unique_json(files['scripts/statistical-levels-ci/policy-migration.json'])
        migration.update(editorial_sha=editorial, current_policy_sha256=a.digest(files[PKG + 'policy.json']))
        files['scripts/statistical-levels-ci/policy-migration.json'] = jsonbytes(migration)
        with self.assertRaisesRegex(ValueError, 'LINEAGE_FIRST_PARENT_EPOCH'):
            a.bootstrap(git, self.changed_root(files=files, parent=editorial))

    def test_later_code_change_cannot_be_admitted_as_data(self):
        git = a.Git(self.first.repo)
        for parent in [self.first.root, self.first.daily, self.second.daily]:
            for path in ['scripts/statistical-levels-hosted.mjs', PKG + 'policy.json', a.CI, 'public/llms.txt']:
                bad = self.first.commit(parent, {path: git.blob(parent, path) + b'\n'}, 'unapproved change')
                with self.assertRaisesRegex(ValueError, 'EXACT_DELTA|LINEAGE_REBIND_PARENT'):
                    a.bootstrap(git, bad)

    def test_native_push_context_is_exact_and_each_day_requires_own_ci(self):
        mutations = [('event', 'before', self.entry['parent']), ('event', 'after', self.editorial),
                     ('event', 'forced', True), ('event', 'deleted', True), ('event', 'created', True),
                     ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', self.editorial),
                     ('env', 'CI_EVENT_SHA', self.editorial), ('env', 'GITHUB_WORKFLOW_SHA', self.editorial),
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

    def test_future_editorial_transition_appends_registry_without_code_change(self):
        git = a.Git(self.first.repo)
        k2 = self.second.daily
        editorial_identity = self.entry['editorial']['author'].rsplit(' ', 2)[0] + ' 1793962800 +0100'
        e2 = self.first.commit(k2, {'public/llms.txt': git.blob(k2, 'public/llms.txt') + b'\n# second report\n'}, 'Publish a later editorial report', identity_env(self.first.env, editorial_identity))
        rebind_identity = self.entry['rebind']['author'].rsplit(' ', 2)[0] + ' 1793964600 +0100'
        files, entry2 = rebind_files(git, e2, 'dpl_FutureProductionE2000001', a.unique_json(git.blob(self.root, PKG + 'policy.json'))['baseline']['main_sha_observed'], self.registry, self.root, git.blob(e2, a.CI), rebind_identity, 'Bind release policy to the later editorial base')
        self.assertTrue(set(files) <= a.LINEAGE_REBIND_FILES)
        r2 = self.first.commit(e2, files, entry2['rebind']['message'], identity_env(self.first.env, rebind_identity))
        self.assertEqual(a.bootstrap(git, r2), (r2, []))
        self.assertEqual(a.lineage_registry(git, r2)[:-1], self.registry)
        self.assertEqual(git.blob(r2, 'scripts/statistical-levels-ci/admission.py'), git.blob(self.root, 'scripts/statistical-levels-ci/admission.py'))
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
            a.bootstrap(git, e2)
        third = copy.copy(self.second); third.root = r2
        make_lineage_daily(third, r2, 10, lineage_metadata(git, r2, json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']))
        self.assertEqual(a.bootstrap(git, third.daily), (r2, [third.daily]))
        reports = a.reconciled_report_hashes(git, third.daily)
        self.assertEqual(reports['public/llms.txt'], a.digest(git.blob(e2, 'public/llms.txt')))
        # negatives: code in a later rebind, broken registry prefix, wrong previous root, CI change beyond the pin
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REBIND_SCOPE'):
            bad = seal({**files, 'scripts/statistical-levels-ci/admission.py': git.blob(e2, 'scripts/statistical-levels-ci/admission.py') + b'\n'})
            reg = a.unique_json(bad[a.LINEAGE_REGISTRY]); reg[-1]['rebind']['files'] = sorted(bad); bad[a.LINEAGE_REGISTRY] = (json.dumps(reg, indent=1, ensure_ascii=False) + '\n').encode(); bad = seal(bad)
            a.bootstrap(git, self.first.commit(e2, bad, entry2['rebind']['message'], identity_env(self.first.env, rebind_identity)))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_REGISTRY_CHAIN|LINEAGE_PREVIOUS_REBIND|EXACT_DELTA|LINEAGE_EDITORIAL'):
            reg = a.unique_json(files[a.LINEAGE_REGISTRY]); reg[0]['editorial']['message'] += ' tampered'
            bad = seal({**files, a.LINEAGE_REGISTRY: (json.dumps(reg, indent=1, ensure_ascii=False) + '\n').encode()})
            a.bootstrap(git, self.first.commit(e2, bad, entry2['rebind']['message'], identity_env(self.first.env, rebind_identity)))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_PREVIOUS_REBIND'):
            reg = a.unique_json(files[a.LINEAGE_REGISTRY]); reg[-1]['previous_rebind'] = self.first.daily
            bad = seal({**files, a.LINEAGE_REGISTRY: (json.dumps(reg, indent=1, ensure_ascii=False) + '\n').encode()})
            a.bootstrap(git, self.first.commit(e2, bad, entry2['rebind']['message'], identity_env(self.first.env, rebind_identity)))
        with self.assertRaisesRegex(ValueError, 'LINEAGE_CI_SCOPE'):
            bad = seal({**files, a.CI: files[a.CI].replace(b'timeout-minutes: 40', b'timeout-minutes: 41')})
            a.bootstrap(git, self.first.commit(e2, bad, entry2['rebind']['message'], identity_env(self.first.env, rebind_identity)))

    def test_report_hashes_and_historical_reuse_scope(self):
        git = a.Git(self.first.repo)
        base = a.reconciled_report_hashes(git, self.entry['parent'])
        expected = dict(base)
        for name, item in self.entry['editorial']['delta'].items():
            if item['status'] == 'D': expected.pop(name, None)
            else: expected[name] = item['sha256']
        reused0, changed0 = self.reuse.reuse_scope(git, self.entry['parent'])
        for head in [self.first.root, self.first.daily, self.second.daily]:
            self.assertEqual(a.reconciled_report_hashes(git, head), expected)
            reused, changed = self.reuse.reuse_scope(git, head)
            affected = set(self.entry['rebind']['files']) & (reused0 | set(changed0) | {p for p in git.tree(head) if p.startswith(PKG)})
            self.assertEqual(reused, reused0 - affected)
            self.assertTrue(set(changed0) <= set(changed))
            for name in affected:
                self.assertEqual(changed[name]['current_sha256'], a.digest(git.blob(head, name)))

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
            out = self.directory / ('lineage-inline-' + str(self.serial))
            out.mkdir()
            (out / 'bounded-admission.json').write_bytes(jsonbytes(a.admit(git, api, api.env, api.event)))
            self.reuse.reuse_scope(git, head)
            env = {**api.env, 'CI_EVIDENCE': str(out)}
            checkout = self.checkout

            class Paths:
                def __call__(self, *args): return Path(*args)
                def cwd(self): return checkout

            model_os = types.SimpleNamespace(environ=env)
            model_subprocess = types.SimpleNamespace(check_output=lambda args, **kw: subprocess.check_output(args, cwd=checkout, **kw),
                                                    run=lambda args, **kw: subprocess.run(args, cwd=checkout, **kw))
            original_import = builtins.__import__

            def model_import(name, *args, **kwargs):
                if name == 'os': return model_os
                if name == 'subprocess': return model_subprocess
                if name == 'pathlib': return types.SimpleNamespace(Path=Paths())
                return original_import(name, *args, **kwargs)

            for program in programs:
                namespace = {'__builtins__': {**vars(builtins), '__import__': model_import}}
                with contextlib.redirect_stdout(io.StringIO()):
                    exec(compile(program, 'literal-inline-MODELED-lineage-transition', 'exec'), namespace)
            subject = json.loads((out / 'subject.json').read_bytes())
            self.assertEqual(subject['head_sha'], head)
            self.assertTrue(subject['integration_qualified'])
            self.assertEqual(subject['lineage']['integration_subject_sha'], a.OLD)
            self.assertEqual(subject['lineage']['actual_ordered_parents'], [f.source] if daily else [self.editorial])


if __name__ == '__main__':
    unittest.main()
