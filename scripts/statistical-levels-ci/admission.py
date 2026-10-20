"""Bounded native CI admission. No credentials other than the read-only job token.

The reviewed publication commit is the trust root. Its normalized payload pin
prevents accidental bootstrap broadening; it does not replace Founder approval
or independent review of that exact commit. No release/ADOPT authority is issued.
"""
import hashlib
from functools import lru_cache
import io
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.parse
import urllib.request
import urllib.error
import zipfile
from datetime import datetime, timedelta

REPO = 'luiguiHerrera/Luiguiherrera-web'
REPO_ID = 1263772150
BRANCH = 'vercel-deployment'
BASE = 'dd11884e078375996e89c205bdf1ee64915487bf'
OLD = '0004db585fb402c97d8470c31ea4e405f0905b7e'
PRODUCER_ID = 306145344
CI_ID = 336203586
BOOTSTRAP_IDENTITY = 'Codex <codex@openai.com> 1792509106 +0000'
BOOTSTRAP_MESSAGE = 'Qualify native capture and bounded hosted CI successors'
PRODUCER = '.github/workflows/update-statistical-levels.yml'
CI = '.github/workflows/ci.yml'
PROVENANCE = 'lib/statistical-levels/generated-provenance.json'
DATA = 'lib/statistical-levels/generated/'
BUCKET = 'sl-raw-authority-f9f4587745fa332cccfe'
REGION = 'eu-south-2'
N = '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d'
PRODUCTION = 'dpl_FRxYeCpiJohL9UZmKfRTEpF6tT5U'
FILES = {CI, PRODUCER, *('scripts/statistical-levels-ci/' + n for n in [
    'admission.py', 'test_admission.py', 'producer-receipt.mjs',
    'producer-receipt.test.mjs', 'historical-tests.py', 'bootstrap-evidence.json',
    'test_native_capture.py']),
    '.github/workflows/statistical-levels-release.yml',
    *('scripts/statistical-levels-release/' + n for n in [
        'scripts/capture-full-product.mjs', 'source-manifest.json',
        'SOURCE_SHA256SUMS', 'workflow-freeze.json'])}
CAPTURE = 'scripts/statistical-levels-release/scripts/capture-full-product.mjs'
META = {'RESERVATION', 'SEALED', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS'}
PIN = rb'(      SL_CI_BOOTSTRAP_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def need(value, code):
    if not value:
        raise ValueError(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def unique_json(data):
    def pairs(items):
        result = dict(items)
        need(len(result) == len(items), 'DUPLICATE_JSON_KEY')
        return result
    return json.loads(data, object_pairs_hook=pairs)


def js_json(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()


def instant(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


class Git:
    def __init__(self, root=Path.cwd()):
        self.root = Path(root)

    def __call__(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root)

    def text(self, *args):
        return self(*args).decode().strip()

    @lru_cache(maxsize=None)
    def blob(self, sha, name):
        return self('show', sha + ':' + name)

    @lru_cache(maxsize=None)
    def tree(self, sha):
        result = {}
        for row in self('ls-tree', '-r', '-z', sha).split(b'\0'):
            if not row:
                continue
            header, name = row.split(b'\t')
            mode, kind, oid = header.decode().split()
            need(kind == 'blob' and name.decode() not in result, 'TREE_ENTRY')
            result[name.decode()] = (mode, oid)
        return result

    @lru_cache(maxsize=None)
    def parents(self, sha):
        return self.text('show', '-s', '--format=%P', sha).split()


def paths(git):
    known = git.tree(BASE)
    result = {p for p in known if p.startswith(DATA)} | {PROVENANCE}
    need(len(result) == 82 and all(known[p][0] == '100644' for p in result), 'BASE_DATA_PATHS')
    need(sum(p.startswith(DATA + 'assets/') for p in result) == 40, 'BASE_ASSETS')
    need(sum(p.startswith(DATA + 'seasonality/') for p in result) == 40, 'BASE_SEASONALITY')
    need(DATA + 'manifest.json' in result, 'BASE_MANIFEST')
    return result


def delta(git, before, after, expected):
    a, b = git.tree(before), git.tree(after)
    changed = {p for p in a.keys() | b.keys() if a.get(p) != b.get(p)}
    need(changed == expected, 'EXACT_DELTA')
    for p in changed:
        need(b.get(p, (None,))[0] == '100644' and (p not in a or a[p][0] == '100644'), 'DELTA_MODE')
    return a, b


def payload_hash(git, sha):
    rows = []
    for p in sorted(FILES):
        data = git.blob(sha, p)
        if p == CI:
            need(len(re.findall(PIN, data)) == 1, 'BOOTSTRAP_PIN_FIELD')
            data = re.sub(PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': p, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def bootstrap(git, head):
    data_paths = paths(git)
    chain = []
    cursor = head
    for _ in range(4096):
        parent = git.parents(cursor)
        need(len(parent) == 1, 'ORDERED_SINGLE_PARENT')
        if parent == [BASE]:
            break
        need(cursor not in [OLD, BASE], 'MISSING_BOOTSTRAP')
        delta(git, parent[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parent[0]
    else:
        raise ValueError('LINEAGE_BOUND')
    delta(git, BASE, cursor, FILES)
    expected_commit = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + BASE + '\nauthor ' + BOOTSTRAP_IDENTITY + '\ncommitter ' + BOOTSTRAP_IDENTITY + '\n\n' + BOOTSTRAP_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected_commit, 'BOOTSTRAP_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_BOOTSTRAP_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == payload_hash(git, cursor), 'BOOTSTRAP_PAYLOAD')
    # Every non-generated file stays fixed after the exact reviewed bootstrap.
    current, start = git.tree(head), git.tree(cursor)
    need(set(current) == set(start), 'CURRENT_INVENTORY')
    need(all(current[p] == start[p] for p in current if p not in data_paths), 'CODE_CHANGED')
    need(git.parents(BASE) == [OLD], 'BASE_PARENT')
    delta(git, OLD, BASE, data_paths)
    return cursor, chain


class API:
    def __init__(self, token):
        need(bool(token), 'READ_TOKEN_REQUIRED')
        self.token = token

    def raw(self, path, limit=4_000_000, download=False):
        need(path == '/repos/' + REPO or path.startswith('/repos/' + REPO + '/'), 'API_SCOPE')
        request = urllib.request.Request('https://api.github.com' + path, headers={
            'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'statistical-levels-bounded-ci'})
        # urllib removes Authorization only if we explicitly do it here. Artifact
        # redirects are signed URLs; the job token must never follow them.
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        try:
            response = urllib.request.build_opener(NoRedirect).open(request, timeout=40)
        except urllib.error.HTTPError as error:
            need(download and error.code == 302, 'API_HTTP_FAILURE')
            url = error.headers.get('Location', '')
            u = urllib.parse.urlsplit(url)
            need(u.scheme == 'https' and u.hostname and not u.username and not u.password, 'ARTIFACT_REDIRECT')
            # GitHub's signed blob redirect is fetched without any Authorization.
            response = urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url), timeout=60)
        with response:
            data = response.read(limit + 1)
        need(len(data) <= limit, 'API_SIZE')
        return data

    def get(self, suffix):
        return unique_json(self.raw('/repos/' + REPO + suffix))


def repo_identity(repo):
    need(repo['id'] == REPO_ID and repo['full_name'] == REPO, 'REPOSITORY')


def run_identity(run, workflow_id, workflow_path, sha=None):
    repo_identity(run['repository'])
    repo_identity(run['head_repository'])
    need(run['workflow_id'] == workflow_id and run['path'] == workflow_path, 'WORKFLOW_IDENTITY')
    need(run['head_branch'] == BRANCH and re.fullmatch('[a-f0-9]{40}', run['head_sha']), 'RUN_BRANCH_SHA')
    if sha is not None:
        need(run['head_sha'] == sha, 'RUN_SHA')


def current_ref(api, sha):
    need(api.get('/git/ref/heads/' + BRANCH)['object'] == {'sha': sha, 'type': 'commit',
         'url': 'https://api.github.com/repos/' + REPO + '/git/commits/' + sha}, 'REF_MOVED')


def producer_run(api, event):
    need(event['action'] == 'completed', 'RUN_NOT_COMPLETED_EVENT')
    advertised = event['workflow_run']
    actual = api.get('/actions/runs/' + str(advertised['id']))
    run_identity(actual, PRODUCER_ID, PRODUCER)
    for field in ['id', 'run_attempt', 'workflow_id', 'head_sha', 'head_branch', 'event', 'status', 'conclusion']:
        need(actual[field] == advertised[field], 'EVENT_RUN_MISMATCH')
    repo_identity(advertised['repository'])
    repo_identity(advertised['head_repository'])
    need(actual['event'] in ['schedule', 'workflow_dispatch'] and actual['status'] == 'completed' and actual['conclusion'] == 'success', 'PRODUCER_NOT_SUCCESSFUL')
    workflow = api.get('/actions/workflows/' + str(PRODUCER_ID))
    need(workflow['id'] == PRODUCER_ID and workflow['name'] == 'Update statistical levels' and workflow['path'] == PRODUCER and workflow['state'] == 'active', 'PRODUCER_WORKFLOW')
    return actual


def receipt_artifact(api, run):
    listing = api.get('/actions/runs/' + str(run['id']) + '/artifacts?per_page=100')
    need(listing['total_count'] == len(listing['artifacts']) <= 100, 'ARTIFACT_PAGINATION')
    name = 'sl-published-' + str(run['id']) + '-' + str(run['run_attempt'])
    matches = [a for a in listing['artifacts'] if a['name'] == name]
    need(len(matches) == 1, 'ARTIFACT_AMBIGUOUS')
    a = matches[0]
    need(not a['expired'] and 0 < a['size_in_bytes'] <= 2_000_000, 'ARTIFACT_UNAVAILABLE')
    need(a['workflow_run'] == {k: v for k, v in [
        ('id', run['id']), ('repository_id', REPO_ID), ('head_repository_id', REPO_ID),
        ('head_branch', BRANCH), ('head_sha', run['head_sha'])]}, 'ARTIFACT_RUN')
    need(re.fullmatch('sha256:[a-f0-9]{64}', a['digest']), 'ARTIFACT_DIGEST_FORMAT')
    raw = api.raw('/repos/' + REPO + '/actions/artifacts/' + str(a['id']) + '/zip', 2_000_000, True)
    need('sha256:' + digest(raw) == a['digest'], 'ARTIFACT_DIGEST')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        need(len(entries) == 1 and entries[0].filename == 'publication-receipt.json', 'ARTIFACT_MEMBERS')
        need(0 < entries[0].file_size <= 1_000_000, 'RECEIPT_SIZE')
        file_type = (entries[0].external_attr >> 16) & 0o170000
        need(file_type in [0, 0o100000] and not entries[0].is_dir() and not entries[0].flag_bits & 1, 'ARTIFACT_FILE_TYPE')
        receipt = unique_json(archive.read(entries[0]))
    return receipt, {'id': a['id'], 'digest': a['digest'], 'name': name}


def validate_data(git, sha, parent, metadata):
    """Verify hashes/coverage/provenance using authenticated producer S3 readback.
    This is not an independent CI download of private raw response bodies.
    """
    p = unique_json(git.blob(sha, PROVENANCE))
    c = p['CONFIG']
    need(p['SCHEMA_VERSION'] == 'statistical-levels.provenance.v1' and p['SOURCE_STATE'] == c['SOURCE_STATE'] == 'COMMITTED', 'SOURCE_STATE')
    need(p['GENERATOR_COMMIT'] == c['GENERATOR_COMMIT'] == parent, 'GENERATOR_PARENT')
    need(p['CONFIG_SHA256'] == digest(js_json(c)), 'CONFIG_HASH')
    sources = ['scripts/build-statistical-levels.mjs', 'scripts/statistical-levels-offline.mjs',
               'lib/statistical-levels/baseline-policy.mjs', 'lib/statistical-levels/defect-repairs.mjs']
    need([r['file'] for r in p['SOURCE_BUNDLE']] == sources, 'SOURCE_COVERAGE')
    for row in p['SOURCE_BUNDLE']:
        need(digest(git.blob(sha, row['file'])) == row['SHA256'] == digest(git.blob(parent, row['file'])), 'SOURCE_BYTES')
    need(p['GENERATOR_SHA256'] == digest(js_json(p['SOURCE_BUNDLE'])), 'SOURCE_HASH')
    baseline = p['BASELINE_ID']
    need(re.fullmatch(r'[0-9]{8}T[0-9]{9}Z-[a-f0-9-]{36}', baseline), 'BASELINE_FORMAT')
    prefix = 'statistical-levels/raw-authority/' + baseline + '/'
    for key in ['BASELINE_ID', 'GENERATOR_COMMIT', 'RAW_MANIFEST_SHA256', 'RAW_ARCHIVE_MANIFEST_SHA256', 'RAW_ARCHIVE_RELATIVE_PATH', 'RAW_ARCHIVE_ACCESS_CLASS', 'GENERATED_AT']:
        need(p[key] == c[key], 'PROVENANCE_CONFIG')
    need(c['RAW_ARCHIVE_BUCKET'] == BUCKET and c['RAW_ARCHIVE_REGION'] == REGION and c['RAW_ARCHIVE_RELATIVE_PATH'] == prefix and c['RAW_ARCHIVE_ACCESS_CLASS'] == 'PRIVATE_S3_DURABLE', 'ARCHIVE_LOCATION')
    need(set(metadata) == META, 'METADATA_SET')
    decoded = {}
    for name, row in metadata.items():
        need(set(row) == {'utf8', 'sha256', 'bytes', 'version'}, 'METADATA_FIELDS')
        data = row['utf8'].encode()
        need(digest(data) == row['sha256'] and len(data) == row['bytes'], 'METADATA_HASH')
        need(isinstance(row['version'], str) and 0 < len(row['version']) < 1024 and row['version'] != 'null', 'METADATA_VERSION')
        decoded[name] = data
    need(metadata['SEALED']['sha256'] == c['RAW_ARCHIVE_SEAL_SHA256'] and metadata['SEALED']['version'] == c['RAW_ARCHIVE_SEAL_VERSION'], 'SEAL_BINDING')
    seal = unique_json(decoded['SEALED'])
    raw = unique_json(decoded['raw-manifest.json'])
    archive_prov = unique_json(decoded['provenance-manifest.json'])
    need(seal['PROTOCOL'] == 'statistical-levels.raw-archive.v1' and seal['RUN_ID'] == baseline, 'SEAL_IDENTITY')
    need(unique_json(decoded['RESERVATION']) == {'RUN_ID': baseline, 'PROTOCOL': seal['PROTOCOL']}, 'RESERVATION')
    need(seal['SNAPSHOT_CUTOFF'] == raw['SNAPSHOT_CUTOFF'] == archive_prov['SNAPSHOT_CUTOFF'] == c['SNAPSHOT_CUTOFF'] == c['GENERATED_AT'], 'ARCHIVE_TIME')
    need(raw['BASELINE_ID'] == baseline and raw['PROVIDER'] == archive_prov['PROVIDER'] == 'Yahoo', 'RAW_IDENTITY')
    need(archive_prov['RUN_ID'] == baseline and archive_prov['GENERATOR_COMMIT'] == parent and archive_prov['IDENTITY'] == 'GITHUB_OIDC', 'ARCHIVE_SOURCE')
    need(archive_prov['ARCHIVE_BUCKET'] == BUCKET and archive_prov['ARCHIVE_REGION'] == REGION and archive_prov['ARCHIVE_PREFIX'] == prefix, 'ARCHIVE_PROVENANCE_LOCATION')
    allowed = paths(git) - {PROVENANCE}
    tickers = {n.removeprefix(DATA + 'assets/').removesuffix('.json') for n in allowed if n.startswith(DATA + 'assets/')}
    raw_names = {'raw/' + t + '.json' for t in tickers}
    need(set(seal['OBJECTS']) == raw_names | (META - {'SEALED'}), 'SEALED_COVERAGE')
    need(archive_prov['OBJECTS'] == {k: v for k, v in seal['OBJECTS'].items() if k in raw_names | {'RESERVATION', 'raw-manifest.json'}}, 'ARCHIVE_OBJECT_BINDING')
    for name, binding in seal['OBJECTS'].items():
        need(re.fullmatch('[a-f0-9]{64}', binding['SHA256']) and type(binding['BYTES']) is int and binding['BYTES'] > 0 and binding['VERSION_ID'] not in ['', 'null', None], 'SEALED_OBJECT')
        need(binding['RETENTION']['Mode'] == 'GOVERNANCE' and instant(binding['RETENTION']['RetainUntilDate']) >= instant(c['SNAPSHOT_CUTOFF']) + timedelta(days=365*5, minutes=-10), 'SEALED_RETENTION')
        if name in metadata:
            r = metadata[name]
            need((r['sha256'], r['bytes'], r['version']) == (binding['SHA256'], binding['BYTES'], binding['VERSION_ID']), 'METADATA_SEAL')
    sums = ''.join(seal['OBJECTS'][name]['SHA256'] + '  ' + name + '\n' for name in sorted(raw_names | {'raw-manifest.json'}))
    need(decoded['SHA256SUMS'] == sums.encode(), 'RAW_SUMS')
    need(digest(decoded['SHA256SUMS']) == p['RAW_ARCHIVE_MANIFEST_SHA256'] and digest(decoded['raw-manifest.json']) == p['RAW_MANIFEST_SHA256'], 'MANIFEST_HASH')
    records = raw['records']
    need(len(records) == 40 and {r['ASSET'] for r in records} == tickers and {r['SOURCE_FILE'] for r in records} == raw_names, 'RAW_COVERAGE')
    by_ticker = {r['ASSET']: r for r in records}
    for r in records:
        need(r['SOURCE_FILE'] == 'raw/' + r['ASSET'] + '.json', 'RAW_PATH')
        binding = seal['OBJECTS'][r['SOURCE_FILE']]
        need(r['SHA256'] == binding['SHA256'] and r['BYTES'] == binding['BYTES'] and 0 < r['ROW_COUNT'] <= r['RAW_TIMESTAMP_COUNT'], 'RAW_BINDING')
    need(len(p['snapshots']) == 81 and {DATA + s['FILE'] for s in p['snapshots']} == allowed, 'SNAPSHOT_COVERAGE')
    for s in p['snapshots']:
        need(digest(git.blob(sha, DATA + s['FILE'])) == s['SNAPSHOT_SHA256'], 'SNAPSHOT_HASH')
        for key in ['GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']:
            need(s[key] == p[key], 'SNAPSHOT_PROVENANCE')
        need(s['SCHEMA_VERSION'] == c['SCHEMA_VERSION'] == 'statistical-levels.snapshot.v3', 'SNAPSHOT_SCHEMA')
        wanted = tickers if s['FILE'] == 'manifest.json' else {s['FILE'].split('/')[1].removesuffix('.json')}
        need(len(s['INPUTS']) == len(wanted) and {i['ASSET'] for i in s['INPUTS']} == wanted, 'INPUT_COVERAGE')
        for i in s['INPUTS']:
            r = by_ticker[i['ASSET']]
            need(i['RAW_SOURCE_ID'] == baseline + '/' + r['SOURCE_FILE'] and i['RAW_SHA256'] == r['SHA256'] and i['RAW_ROW_COUNT'] == r['ROW_COUNT'] and i['SNAPSHOT_CUTOFF'] == c['SNAPSHOT_CUTOFF'], 'INPUT_BINDING')
            need(i['RAW_FIRST_DATE'] == r['FIRST_DATE'] and i['RAW_LAST_DATE'] == r['LAST_DATE'] and instant(i['CURRENT_MARK_TIMESTAMP']) <= instant(c['SNAPSHOT_CUTOFF']), 'INPUT_DATES')
            need(0 < i['COMPLETED_DAILY_ROW_COUNT'] <= r['ROW_COUNT'] and set(i['LAST_COMPLETED_OBSERVATION']) == {'daily', 'weekly', 'monthly'}, 'COMPLETED_INPUT')
    manifest = unique_json(git.blob(sha, DATA + 'manifest.json'))
    need(manifest['baseline']['id'] == baseline and len(manifest['catalog']) == 40, 'MANIFEST_BASELINE')
    need(manifest['windows'] == ['1Y', '3Y', '5Y', '10Y', 'Full'] and manifest['frequencies'] == ['daily', 'weekly', 'monthly'], 'CAPABILITY_DATA_LOSS')
    return {'baseline': baseline, 'seal_sha256': c['RAW_ARCHIVE_SEAL_SHA256'], 'seal_version': c['RAW_ARCHIVE_SEAL_VERSION'], 'snapshots': 81, 'files': 82}


def bind_receipt(git, head, run, receipt):
    expected = {'schema', 'repository', 'repository_id', 'workflow_id', 'workflow_path', 'event', 'branch', 'run_id', 'run_attempt', 'source_sha', 'published_sha', 'published_tree', 'provenance_sha256', 'created_at', 's3', 'metadata_objects'}
    need(set(receipt) == expected, 'RECEIPT_FIELDS')
    for key, value in {'schema': 'statistical-levels.hosted-publication-receipt.v1', 'repository': REPO,
        'repository_id': REPO_ID, 'workflow_id': PRODUCER_ID, 'workflow_path': PRODUCER,
        'event': run['event'], 'branch': BRANCH, 'run_id': run['id'], 'run_attempt': run['run_attempt'],
        'source_sha': run['head_sha'], 'published_sha': head, 'published_tree': git.text('rev-parse', head + '^{tree}'),
        'provenance_sha256': digest(git.blob(head, PROVENANCE))}.items():
        need(receipt[key] == value, 'RECEIPT_BINDING_' + key.upper())
    need(git.parents(head) == [run['head_sha']], 'PUBLISHED_PARENT')
    delta(git, run['head_sha'], head, paths(git))
    need(instant(run['run_started_at']) <= instant(receipt['created_at']) <= instant(run['updated_at']), 'RECEIPT_TIME')
    qualified = validate_data(git, head, run['head_sha'], receipt['metadata_objects'])
    provenance = unique_json(git.blob(head, PROVENANCE))
    need(provenance['BASELINE_ID'] != unique_json(git.blob(run['head_sha'], PROVENANCE))['BASELINE_ID'], 'BASELINE_REUSED')
    need(instant(run['run_started_at']) <= instant(provenance['CONFIG']['SNAPSHOT_CUTOFF']) <= instant(receipt['created_at']), 'SNAPSHOT_RUN_TIME')
    expected_s3 = {'bucket': BUCKET, 'region': REGION, 'prefix': 'statistical-levels/raw-authority/' + qualified['baseline'] + '/',
        'baseline': qualified['baseline'], 'seal_sha256': qualified['seal_sha256'], 'seal_version': qualified['seal_version'],
        'principal': 'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-' + str(run['id']) + '-' + str(run['run_attempt']),
        'exact_version_read_count': 45, 'evidence_class': 'AUTHENTICATED_PRODUCER_EXACT_VERSION_READBACK'}
    need(receipt['s3'] == expected_s3, 'RECEIPT_S3')
    return qualified


def commit_identity(api, head, run):
    c = api.get('/commits/' + head)
    need(c['sha'] == head and [p['sha'] for p in c['parents']] == [run['head_sha']], 'COMMIT_IDENTITY')
    for role in ['author', 'committer']:
        need(c[role]['id'] == 41898282 and c[role]['login'] == 'github-actions[bot]' and c[role]['type'] == 'Bot', 'COMMIT_ACTOR')
        need(c['commit'][role]['name'] == 'github-actions[bot]' and c['commit'][role]['email'] == '41898282+github-actions[bot]@users.noreply.github.com', 'COMMIT_ACTOR_BYTES')
        need(instant(run['run_started_at']) <= instant(c['commit'][role]['date']) <= instant(run['updated_at']), 'COMMIT_TIME')
    need(c['commit']['message'] == 'Update statistical levels snapshot with durable raw provenance', 'COMMIT_MESSAGE')


def parent_ci(api, parent):
    listing = api.get('/actions/workflows/' + str(CI_ID) + '/runs?head_sha=' + parent + '&status=success&per_page=100')
    need(listing['total_count'] == len(listing['workflow_runs']), 'PARENT_CI_PAGINATION')
    runs = listing['workflow_runs']
    need(len(runs) == 1, 'PARENT_CI_AMBIGUOUS_OR_ABSENT')
    r = runs[0]
    run_identity(r, CI_ID, CI, parent)
    need(r['event'] in ['push', 'workflow_run'] and r['status'] == 'completed' and r['conclusion'] == 'success', 'PARENT_CI_NOT_PASS')
    jobs = api.get('/actions/runs/' + str(r['id']) + '/attempts/' + str(r['run_attempt']) + '/jobs?per_page=100')
    need(jobs['total_count'] == len(jobs['jobs']) == 1, 'PARENT_JOB_SET')
    job = jobs['jobs'][0]
    need(job['name'] == 'validate' and job['status'] == 'completed' and job['conclusion'] == 'success', 'PARENT_JOB')
    steps = {s['name']: s for s in job['steps']}
    for name in ['Bind qualification to event SHA and governed metadata-repair successor lineage',
                 'Test bounded CI admission and producer readback',
                 'Authenticate fresh native capture handoff',
                 'Run existing release, native proof, policy and security tests',
                 'Reject missing or skipped mandatory coverage and candidate drift',
                 'Revalidate exact branch and emit bounded qualification evidence']:
        need(name in steps and steps[name]['status'] == 'completed' and steps[name]['conclusion'] == 'success', 'PARENT_MANDATORY_STEP')
    return {'run_id': r['id'], 'run_attempt': r['run_attempt'], 'head_sha': parent}


def admit(git, api, env, event):
    head = git.text('rev-parse', 'HEAD')
    need(re.fullmatch('[a-f0-9]{40}', head) and head == env['GITHUB_SHA'] == env['CI_EVENT_SHA'], 'NATIVE_SHA')
    need(env['GITHUB_REPOSITORY'] == REPO and env['GITHUB_REPOSITORY_ID'] == str(REPO_ID) and env['GITHUB_REF'] == 'refs/heads/' + BRANCH, 'NATIVE_REPOSITORY_REF')
    need(env['GITHUB_WORKFLOW_SHA'] == head, 'NATIVE_WORKFLOW_SHA')
    need(env['GITHUB_WORKFLOW_REF'] == REPO + '/' + CI + '@refs/heads/' + BRANCH, 'NATIVE_WORKFLOW')
    need(not env.get('SL_LOCAL_QUALIFICATION_SUBJECT_SHA256'), 'LOCAL_HOSTED_ROLE_CONFLICT')
    need(not git.text('status', '--porcelain', '--untracked-files=no'), 'WORKTREE_DRIFT')
    repo_identity(event['repository'])
    repo = api.get('')
    repo_identity(repo)
    need(repo['default_branch'] == BRANCH, 'DEFAULT_BRANCH')
    own = api.get('/actions/runs/' + env['GITHUB_RUN_ID'])
    run_identity(own, CI_ID, CI, head)
    need(str(own['id']) == env['GITHUB_RUN_ID'], 'NATIVE_RUN_ID')
    need(str(own['run_attempt']) == env['GITHUB_RUN_ATTEMPT'] and own['event'] == env['GITHUB_EVENT_NAME'], 'NATIVE_RUN')
    current_ref(api, head)
    root, chain = bootstrap(git, head)
    evidence = unique_json(git.blob(root, 'scripts/statistical-levels-ci/bootstrap-evidence.json'))
    need(evidence['head_sha'] == BASE and evidence['producer_run_id'] == 39432688384 and evidence['source_sha'] == OLD, 'BOOTSTRAP_DATA_IDENTITY')
    validate_data(git, BASE, OLD, evidence['metadata_objects'])
    if not chain:
        need(env['GITHUB_EVENT_NAME'] == 'push' and event['before'] == BASE and event['after'] == head and event['ref'] == 'refs/heads/' + BRANCH and not event['forced'] and not event['deleted'] and not event['created'], 'BOOTSTRAP_EVENT')
        mode, details = 'BOUNDED_CI_BOOTSTRAP', {'data_evidence': 'REUSED_INDEPENDENT_EXACT_VERSION_READBACK', 'data_head': BASE, 'hosted_ci_at_data_head': False, 'native_run_to_published_sha_receipt_at_data_head': False}
    else:
        need(env['GITHUB_EVENT_NAME'] == 'workflow_run', 'DAILY_EVENT')
        run = producer_run(api, event)
        need(run['head_sha'] == git.parents(head)[0], 'SOURCE_IS_EXACT_PARENT')
        prior = parent_ci(api, run['head_sha'])
        receipt, artifact = receipt_artifact(api, run)
        qualified = bind_receipt(git, head, run, receipt)
        commit_identity(api, head, run)
        mode, details = 'AUTHENTICATED_DATA_SUCCESSOR', {'producer_run_id': run['id'], 'producer_attempt': run['run_attempt'], 'source_sha': run['head_sha'], 'artifact': artifact, 'parent_ci': prior, 'data': qualified, 's3_evidence_class': receipt['s3']['evidence_class']}
    current_ref(api, head)
    return {'schema': 'statistical-levels.bounded-ci-admission.v1', 'head_sha': head, 'root_sha': root,
        'run_id': env['GITHUB_RUN_ID'], 'run_attempt': env['GITHUB_RUN_ATTEMPT'], 'event': env['GITHUB_EVENT_NAME'],
        'mode': mode, 'details': details, 'historical_subject_sha': OLD, 'historical_N': N,
        'certified_production': PRODUCTION, 'release_authority_issued': False, 'independent_review_required': True, 'publication_authority': 'EXTERNAL_EXACT_FOUNDER_AUTHORIZATION', 'admission': 'PASS'}


def capture_preflight(git, api, env, event_bytes, initial_bytes):
    """Fresh authentication in the token-bearing step; capture never gets token.

    This handoff has only same-job custody. Its root of trust is the exact
    reviewed workflow + native runner, not the report's self-declared PASS.
    """
    result = admit(git, api, env, unique_json(event_bytes))
    need(result == unique_json(initial_bytes), 'CAPTURE_INITIAL_ADMISSION_CHANGED')
    if result['event'] == 'push':
        return None
    need(env.get('GITHUB_ACTIONS') == 'true' and env.get('RUNNER_ENVIRONMENT') == 'github-hosted'
         and env.get('GITHUB_JOB') == 'validate', 'CAPTURE_NATIVE_RUNNER')
    head, d = result['head_sha'], result['details']
    return {'schema': 'statistical-levels.native-capture-admission.v1',
        'phase': 'FRESH_PRE_CAPTURE_API_AUTHENTICATION', 'repository': REPO, 'repository_id': REPO_ID,
        'ref': 'refs/heads/' + BRANCH, 'workflow_id': CI_ID, 'workflow_path': CI,
        **{k: result[k] for k in ['head_sha', 'root_sha', 'run_id', 'run_attempt', 'event']},
        **{k: d[k] for k in ['source_sha', 'producer_run_id', 'producer_attempt', 'artifact']},
        'native_event_sha256': digest(event_bytes), 'admission_sha256': digest(initial_bytes),
        'provenance_sha256': digest(git.blob(head, PROVENANCE)),
        'source_sha256': {p: digest(git.blob(head, p)) for p in [CI, CAPTURE, 'scripts/statistical-levels-ci/admission.py']}}


def main():
    api = API(os.environ['GH_TOKEN'])
    git = Git()
    out = Path(os.environ['CI_EVIDENCE'])
    args = __import__('sys').argv[1:]
    need(args in [[], ['capture'], ['final']], 'CLI_ARGUMENTS')
    if args == ['capture']:
        result = capture_preflight(git, api, os.environ,
            Path(os.environ['GITHUB_EVENT_PATH']).read_bytes(), (out / 'bounded-admission.json').read_bytes())
        if result is not None:
            data = (json.dumps(result, indent=2) + '\n').encode()
            # Never overwrite a previous proof; replay within the job is closed.
            fd = os.open(out / 'capture-admission.json', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'wb') as f:
                f.write(data)
            with Path(os.environ['GITHUB_ENV']).open('a') as f:
                f.write('SL_NATIVE_CAPTURE_ADMISSION_SHA256=' + digest(data) + '\n')
    elif args == ['final']:
        result = unique_json((out / 'bounded-admission.json').read_bytes())
        need(result['head_sha'] == git.text('rev-parse', 'HEAD') == os.environ['GITHUB_SHA'], 'FINAL_NATIVE_SHA')
        need(result['run_id'] == os.environ['GITHUB_RUN_ID'] and result['run_attempt'] == os.environ['GITHUB_RUN_ATTEMPT'], 'FINAL_RUN')
        if result['event'] == 'workflow_run':
            need(digest((out / 'capture-admission.json').read_bytes()) == os.environ['SL_NATIVE_CAPTURE_ADMISSION_SHA256'], 'FINAL_CAPTURE_HANDOFF')
        current_ref(api, result['head_sha'])
        result['final_ref_verified'] = True
        (out / 'bounded-terminal.json').write_text(json.dumps(result, indent=2) + '\n')
    else:
        result = admit(git, api, os.environ, unique_json(Path(os.environ['GITHUB_EVENT_PATH']).read_bytes()))
        (out / 'bounded-admission.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never echo API responses, signed artifact URLs or bearer credentials.
        code = str(error) if isinstance(error, ValueError) and re.fullmatch('[A-Z0-9_]+', str(error)) else 'CI_ADMISSION_FAILED_CLOSED'
        raise SystemExit(code)
