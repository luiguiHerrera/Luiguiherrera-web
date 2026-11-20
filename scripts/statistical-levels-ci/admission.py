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


def historical_bootstrap(git, head):
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


# Exact local successor proposal. Publishing it requires separate Founder authority.
# The two-parent report reconciliation is accepted only by this immutable object.
RECONCILED = 'c89be06fe0f374d6394c115c2223707c0d57314c'
REMOTE_BEFORE_RECONCILIATION = 'e68811777dd31051a3d5587539361a88447a7463'
REPORT_PARENT = '502d192f8d3d2536e29e27e36a87cc4b24030efc'
RECONCILIATION_EVIDENCE = 'scripts/statistical-levels-ci/reconciliation-evidence.json'
RECONCILIATION_EVIDENCE_SHA256 = '3b98461b3250a278e1ca86dcfa7578d44af979cbfdf07509f893d3679bbac50e'
DAILY_BOOTSTRAP_IDENTITY = 'Codex <codex@openai.com> 1792758073 +0000'
CURRENT_DATA_EVIDENCE = 'scripts/statistical-levels-ci/current-data-evidence.json'
CURRENT_DATA_EVIDENCE_SHA256 = '3dcaf948423fcd5e4b35148fb159b901c7879e92d46b13c0f980734cf2860e6f'
DAILY_BOOTSTRAP_MESSAGE = 'Qualify bounded daily durability and exact report reconciliation'
DAILY_FILES = {CI, PRODUCER, CURRENT_DATA_EVIDENCE, '.github/workflows/statistical-levels-release.yml',
    *('scripts/statistical-levels-release/' + n for n in ['source-inputs.json', 'source-manifest.json', 'SOURCE_SHA256SUMS', 'workflow-freeze.json']), 'scripts/statistical-levels-hosted.mjs',
    'scripts/statistical-levels-storage.mjs', 'scripts/statistical-levels-daily.mjs',
    'scripts/statistical-levels-daily.test.mjs', RECONCILIATION_EVIDENCE,
    'scripts/statistical-levels-ci/test_daily_admission.py',
    'scripts/statistical-levels-ci/producer-receipt.test.mjs',
    'scripts/statistical-levels-ci/producer-receipt.mjs', 'scripts/statistical-levels-ci/admission.py'}
DAILY_PIN = rb'(      SL_CI_DAILY_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def daily_payload_hash(git, sha):
    rows = []
    for p in sorted(DAILY_FILES):
        data = git.blob(sha, p)
        if p == CI:
            need(len(re.findall(DAILY_PIN, data)) == 1, 'DAILY_BOOTSTRAP_PIN_FIELD')
            data = re.sub(DAILY_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': p, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def daily_bootstrap(git, head):
    # Preserve the entire old accepted lineage and predicate implementation.
    if subprocess.run(['git', 'merge-base', '--is-ancestor', RECONCILED, head], cwd=git.root,
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return historical_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'DAILY_ORDERED_SINGLE_PARENT')
        if parents == [RECONCILED]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor); cursor = parents[0]
    else:
        raise ValueError('DAILY_LINEAGE_BOUND')
    evidence_bytes = git.blob(cursor, RECONCILIATION_EVIDENCE)
    need(digest(evidence_bytes) == RECONCILIATION_EVIDENCE_SHA256, 'EXACT_RECONCILIATION_EVIDENCE')
    evidence = unique_json(evidence_bytes)
    need(evidence['merge'] == RECONCILED and evidence['tree'] == '0b9482694252c608db51c285751ef932441bf201' and
         evidence['parents'] == [REMOTE_BEFORE_RECONCILIATION, REPORT_PARENT], 'EXACT_RECONCILIATION_SCOPE')
    need(git.parents(RECONCILED) == evidence['parents'] and git.text('rev-parse', RECONCILED + '^{tree}') == evidence['tree'], 'EXACT_RECONCILIATION_OBJECT')
    historical_bootstrap(git, REMOTE_BEFORE_RECONCILIATION)
    _, reconciled = delta(git, REMOTE_BEFORE_RECONCILIATION, RECONCILED, set(evidence['delta']))
    need(len(evidence['delta']) == 42 and git.text('rev-parse', REPORT_PARENT + '^{tree}') == evidence['source_report_tree'], 'EXACT_REPORT_TREE')
    report = git.tree(REPORT_PARENT)
    for name, item in evidence['delta'].items():
        need(reconciled[name] == report[name] == (item['mode'], item['git_blob']) and
             digest(git.blob(RECONCILED, name)) == item['sha256'], 'REPORT_PRESERVATION')
    delta(git, RECONCILED, cursor, DAILY_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + RECONCILED +
        '\nauthor ' + DAILY_BOOTSTRAP_IDENTITY + '\ncommitter ' + DAILY_BOOTSTRAP_IDENTITY + '\n\n' + DAILY_BOOTSTRAP_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'DAILY_BOOTSTRAP_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_DAILY_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == daily_payload_hash(git, cursor), 'DAILY_BOOTSTRAP_PAYLOAD')
    current, start = git.tree(head), git.tree(cursor)
    need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'DAILY_SUCCESSOR_CODE_CHANGED')
    return cursor, chain


SECURITY_BASE = '834cdf4c543a8334e36020817db088e6722c80d8'
SECURITY_BOOTSTRAP_IDENTITY = 'Codex <codex@openai.com> 1792765709 +0000'
SECURITY_BOOTSTRAP_MESSAGE = 'Qualify exact hosted CI security repair'
SECURITY_REPORT_FILES = {'lib/dashboard/sector-failure-handling.test.mjs'}
SECURITY_FILES = {CI, 'package.json', 'package-lock.json',
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/test_daily_admission.py',
    'scripts/statistical-levels-ci/test_security_admission.py',
    '.github/workflows/statistical-levels-release.yml',
    *('scripts/statistical-levels-release/' + n for n in [
        'source-inputs.json', 'source-manifest.json', 'SOURCE_SHA256SUMS', 'workflow-freeze.json',
        'scripts/verify-braces-patch-attestation.cjs', 'tests/braces-patch-attestation.test.mjs']),
    *SECURITY_REPORT_FILES}
SECURITY_PIN = rb'(      SL_CI_SECURITY_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def security_payload_hash(git, sha):
    rows = []
    for name in sorted(SECURITY_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(SECURITY_PIN, data)) == 1, 'SECURITY_PIN_FIELD')
            data = re.sub(SECURITY_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def security_bootstrap(git, head):
    # The failed CI at SECURITY_BASE is never treated as a qualification PASS.
    # Preserve the original paths verbatim; only one exact security child gains
    # a new bootstrap route, followed solely by existing 82-file data successors.
    if head == SECURITY_BASE or subprocess.run(
            ['git', 'merge-base', '--is-ancestor', SECURITY_BASE, head], cwd=git.root,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return daily_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'SECURITY_ORDERED_SINGLE_PARENT')
        if parents == [SECURITY_BASE]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('SECURITY_LINEAGE_BOUND')
    before, child = git.tree(SECURITY_BASE), git.tree(cursor)
    changed = {p for p in before.keys() | child.keys() if before.get(p) != child.get(p)}
    if changed == data_paths:
        return daily_bootstrap(git, head)
    daily_bootstrap(git, SECURITY_BASE)
    delta(git, SECURITY_BASE, cursor, SECURITY_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + SECURITY_BASE +
        '\nauthor ' + SECURITY_BOOTSTRAP_IDENTITY + '\ncommitter ' + SECURITY_BOOTSTRAP_IDENTITY +
        '\n\n' + SECURITY_BOOTSTRAP_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'SECURITY_BOOTSTRAP_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_SECURITY_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == security_payload_hash(git, cursor), 'SECURITY_BOOTSTRAP_PAYLOAD')
    current = git.tree(head)
    need(set(current) == set(child) and all(current[p] == child[p] for p in current if p not in data_paths), 'SECURITY_SUCCESSOR_CODE_CHANGED')
    return cursor, chain


CAPTURE_RECOVERY_BASE = 'ed65a28d2574518f5b94b3d6c2f025dce0f75c3e'
CAPTURE_RECOVERY_IDENTITY = 'Codex <codex@openai.com> 1792781446 +0000'
CAPTURE_RECOVERY_MESSAGE = 'Qualify exact native capture recovery and historical reuse'
# Deliberately closed until the causally required source delta is frozen.
CAPTURE_RECOVERY_FILES = frozenset({
    '.github/workflows/ci.yml',
    '.github/workflows/statistical-levels-release.yml',
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_capture_recovery_admission.py',
    'scripts/statistical-levels-ci/test_capture_recovery_diagnostics.py',
    'scripts/statistical-levels-ci/test_security_admission.py',
    'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
    'scripts/statistical-levels-release/scripts/capture-full-product.mjs',
    'scripts/statistical-levels-release/scripts/runtime-transition-receipts.mjs',
    'scripts/statistical-levels-release/source-manifest.json',
    'scripts/statistical-levels-release/tests/statistical-levels-runtime.test.mjs',
    'scripts/statistical-levels-release/workflow-freeze.json',
})
CAPTURE_RECOVERY_PIN = rb'(      SL_CI_CAPTURE_RECOVERY_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def capture_recovery_payload_hash(git, sha):
    need(bool(CAPTURE_RECOVERY_FILES), 'CAPTURE_RECOVERY_DELTA_PENDING')
    rows = []
    for name in sorted(CAPTURE_RECOVERY_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(CAPTURE_RECOVERY_PIN, data)) == 1, 'CAPTURE_RECOVERY_PIN_FIELD')
            data = re.sub(CAPTURE_RECOVERY_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def capture_recovery_bootstrap(git, head):
    # Native failure at the base never qualifies a new data or code subject.
    if head == CAPTURE_RECOVERY_BASE or subprocess.run(
            ['git', 'merge-base', '--is-ancestor', CAPTURE_RECOVERY_BASE, head], cwd=git.root,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return security_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'CAPTURE_RECOVERY_ORDERED_SINGLE_PARENT')
        if parents == [CAPTURE_RECOVERY_BASE]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('CAPTURE_RECOVERY_LINEAGE_BOUND')
    before, child = git.tree(CAPTURE_RECOVERY_BASE), git.tree(cursor)
    changed = {p for p in before.keys() | child.keys() if before.get(p) != child.get(p)}
    if changed == data_paths:
        return security_bootstrap(git, head)
    security_bootstrap(git, CAPTURE_RECOVERY_BASE)
    need(bool(CAPTURE_RECOVERY_FILES), 'CAPTURE_RECOVERY_DELTA_PENDING')
    delta(git, CAPTURE_RECOVERY_BASE, cursor, CAPTURE_RECOVERY_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + CAPTURE_RECOVERY_BASE +
        '\nauthor ' + CAPTURE_RECOVERY_IDENTITY + '\ncommitter ' + CAPTURE_RECOVERY_IDENTITY +
        '\n\n' + CAPTURE_RECOVERY_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'CAPTURE_RECOVERY_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_CAPTURE_RECOVERY_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == capture_recovery_payload_hash(git, cursor), 'CAPTURE_RECOVERY_PAYLOAD')
    current = git.tree(head)
    need(set(current) == set(child) and all(current[p] == child[p] for p in current if p not in data_paths), 'CAPTURE_RECOVERY_SUCCESSOR_CODE_CHANGED')
    return cursor, chain


REPORT_CONTRACT_BASE = '1da02669236e9a99fe3298dcad4582a29150c59d'
REPORT_CONTRACT_IDENTITY = 'Codex <codex@openai.com> 1792786579 +0000'
REPORT_CONTRACT_MESSAGE = 'Reconcile exact historical report test contracts'
REPORT_CONTRACT_TEST_FILES = frozenset({
    'lib/reports/first-september-2026.test.mts',
    'lib/reports/september-corrective-release.test.mts',
})
REPORT_CONTRACT_FILES = REPORT_CONTRACT_TEST_FILES | frozenset({
    '.github/workflows/ci.yml',
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_capture_recovery_admission.py',
    'scripts/statistical-levels-ci/test_report_contract_admission.py',
})
REPORT_CONTRACT_PIN = rb'(      SL_CI_REPORT_CONTRACT_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def report_contract_payload_hash(git, sha):
    rows = []
    for name in sorted(REPORT_CONTRACT_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(REPORT_CONTRACT_PIN, data)) == 1, 'REPORT_CONTRACT_PIN_FIELD')
            data = re.sub(REPORT_CONTRACT_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def report_contract_bootstrap(git, head):
    # Only the exact reviewed test-contract successor can extend this failed CI.
    if head == REPORT_CONTRACT_BASE or subprocess.run(
            ['git', 'merge-base', '--is-ancestor', REPORT_CONTRACT_BASE, head], cwd=git.root,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return capture_recovery_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'REPORT_CONTRACT_ORDERED_SINGLE_PARENT')
        if parents == [REPORT_CONTRACT_BASE]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('REPORT_CONTRACT_LINEAGE_BOUND')
    before, child = git.tree(REPORT_CONTRACT_BASE), git.tree(cursor)
    changed = {p for p in before.keys() | child.keys() if before.get(p) != child.get(p)}
    if changed == data_paths:
        return capture_recovery_bootstrap(git, head)
    capture_recovery_bootstrap(git, REPORT_CONTRACT_BASE)
    delta(git, REPORT_CONTRACT_BASE, cursor, REPORT_CONTRACT_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + REPORT_CONTRACT_BASE +
        '\nauthor ' + REPORT_CONTRACT_IDENTITY + '\ncommitter ' + REPORT_CONTRACT_IDENTITY +
        '\n\n' + REPORT_CONTRACT_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'REPORT_CONTRACT_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_REPORT_CONTRACT_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == report_contract_payload_hash(git, cursor), 'REPORT_CONTRACT_PAYLOAD')
    current = git.tree(head)
    need(set(current) == set(child) and all(current[p] == child[p] for p in current if p not in data_paths), 'REPORT_CONTRACT_SUCCESSOR_CODE_CHANGED')
    return cursor, chain


DURABILITY_BASE = 'ac733586792587dd3584cb355e1fc3a799648f5e'
DURABILITY_IDENTITY = 'Codex <codex@openai.com> 1792792447 +0000'
DURABILITY_MESSAGE = 'Bound provider streaming and retain partial-run diagnostics'
DURABILITY_FILES = frozenset({
    '.github/workflows/ci.yml',
    'scripts/statistical-levels-hosted.mjs',
    'scripts/statistical-levels-provider-durability.test.mjs',
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_provider_durability_admission.py',
})
DURABILITY_PIN = rb'(      SL_CI_DURABILITY_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def durability_payload_hash(git, sha):
    rows = []
    for name in sorted(DURABILITY_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(DURABILITY_PIN, data)) == 1, 'DURABILITY_PIN_FIELD')
            data = re.sub(DURABILITY_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())



def durability_bootstrap(git, head):
    # Only this reviewed acquisition/diagnostics successor may extend the qualified source.
    if head == DURABILITY_BASE or subprocess.run(
            ['git', 'merge-base', '--is-ancestor', DURABILITY_BASE, head], cwd=git.root,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return report_contract_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'DURABILITY_ORDERED_SINGLE_PARENT')
        if parents == [DURABILITY_BASE]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('DURABILITY_LINEAGE_BOUND')
    before, child = git.tree(DURABILITY_BASE), git.tree(cursor)
    changed = {p for p in before.keys() | child.keys() if before.get(p) != child.get(p)}
    if changed == data_paths:
        return report_contract_bootstrap(git, head)
    report_contract_bootstrap(git, DURABILITY_BASE)
    delta(git, DURABILITY_BASE, cursor, DURABILITY_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + DURABILITY_BASE +
        '\nauthor ' + DURABILITY_IDENTITY + '\ncommitter ' + DURABILITY_IDENTITY +
        '\n\n' + DURABILITY_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'DURABILITY_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_DURABILITY_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == durability_payload_hash(git, cursor), 'DURABILITY_PAYLOAD')
    current = git.tree(head)
    need(set(current) == set(child) and all(current[p] == child[p] for p in current if p not in data_paths), 'DURABILITY_SUCCESSOR_CODE_CHANGED')
    return cursor, chain



ZOD_BASE = '6640c152f2a0cb478e19b2071c59a7bd99d487ca'
ZOD_IDENTITY = 'Codex <codex@openai.com> 1792795230 +0000'
ZOD_MESSAGE = 'Repair Zod audit gate with exact dependency successor'
ZOD_FILES = frozenset({
    '.github/workflows/ci.yml',
    '.github/workflows/statistical-levels-release.yml',
    'package-lock.json',
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_provider_durability_admission.py',
    'scripts/statistical-levels-ci/test_zod_security_admission.py',
    'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
    'scripts/statistical-levels-release/source-inputs.json',
    'scripts/statistical-levels-release/source-manifest.json',
    'scripts/statistical-levels-release/workflow-freeze.json',
})
ZOD_PIN = rb'(      SL_CI_ZOD_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'


def zod_payload_hash(git, sha):
    rows = []
    for name in sorted(ZOD_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(ZOD_PIN, data)) == 1, 'ZOD_PIN_FIELD')
            data = re.sub(ZOD_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())



def zod_bootstrap(git, head):
    # Exact security repair only. The failed parent is never attributed a CI PASS.
    if head == ZOD_BASE or subprocess.run(
            ['git', 'merge-base', '--is-ancestor', ZOD_BASE, head], cwd=git.root,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return durability_bootstrap(git, head)
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'ZOD_ORDERED_SINGLE_PARENT')
        if parents == [ZOD_BASE]:
            break
        delta(git, parents[0], cursor, data_paths)
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('ZOD_LINEAGE_BOUND')
    before, child = git.tree(ZOD_BASE), git.tree(cursor)
    changed = {p for p in before.keys() | child.keys() if before.get(p) != child.get(p)}
    if changed == data_paths:
        return durability_bootstrap(git, head)
    durability_bootstrap(git, ZOD_BASE)
    delta(git, ZOD_BASE, cursor, ZOD_FILES)
    expected = ('tree ' + git.text('rev-parse', cursor + '^{tree}') + '\nparent ' + ZOD_BASE +
        '\nauthor ' + ZOD_IDENTITY + '\ncommitter ' + ZOD_IDENTITY +
        '\n\n' + ZOD_MESSAGE + '\n').encode()
    need(git('cat-file', 'commit', cursor) == expected, 'ZOD_COMMIT_HEADER')
    pin = re.findall(rb'      SL_CI_ZOD_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(cursor, CI))
    need(len(pin) == 1 and pin[0].decode() == zod_payload_hash(git, cursor), 'ZOD_PAYLOAD')
    current = git.tree(head)
    need(set(current) == set(child) and all(current[p] == child[p] for p in current if p not in data_paths), 'ZOD_SUCCESSOR_CODE_CHANGED')
    return cursor, chain



# ---- Lineage transition epoch (P7-B, November 2026). Repeatable, exact, data-pinned transitions. ----
# A transition is one editorial commit E (Production base) followed by one rebind commit R (release-policy
# rebind). Every byte of both is pinned in the registry carried by R: E by sha, tree, parent, header and
# per-path blob/sha256 delta; R by parent, header, exact file set and the self-excluding payload pin in CI.
# After R only exact 82-path data successors are admitted. Later transitions append a registry entry; the
# previous rebind is pinned by sha and its registry must be the exact prefix. Code files may change only in
# the first transition of this epoch (reviewed once); later rebinds are restricted to data/pin files.
LINEAGE_REGISTRY = 'scripts/statistical-levels-ci/lineage-transitions.json'
LINEAGE_SCHEMA = 'statistical-levels.lineage-transition.v1'
# Exact local proposal only: no Git object, hosted CI, or deployment is created.
EXTRAORDINARY_HISTORY_ROOT = 'ae09a44ffce5860f511c08061f9621934eadbe08'
EXTRAORDINARY_EDITORIAL = {'sha': '8c770af7059b33a2e841f5afa4b87344db4aa177', 'tree': 'c44eadb389e02ce6c0113526ac2ca3ba6ef33adc', 'author': 'Codex <codex@openai.com> 1794939028 +0000', 'committer': 'Codex <codex@openai.com> 1794939028 +0000', 'message': 'Prepare extraordinary November editorial source with exact D_X snapshot', 'parent': 'c4bb2047ed54fd3c1fdd40f6fddd99ec187b31ce'}
EXTRAORDINARY_EDITORIAL_PATHS = frozenset(['components/reports/NovemberReportSections.tsx', 'docs/reports/segundo-informe-noviembre-2026/segundo-informe-noviembre-2026.md', 'lib/reports/first-november-2026.test.mts', 'lib/reports/market-reports.ts', 'lib/reports/second-november-2026.test.mts', 'lib/reports/second-november-2026.ts', 'next.config.ts', 'public/llms.txt', 'public/reports/manifest.json', 'public/reports/segundo-informe-noviembre-2026-calendar.ics', 'public/reports/segundo-informe-noviembre-2026.html', 'public/reports/segundo-informe-noviembre-2026.md', 'public/reports/segundo-informe-noviembre-2026.pdf', 'scripts/build-second-november-report.mts', 'scripts/validate-editorial.mts'])
EXTRAORDINARY_BASELINE = '8ce104066fe968026d24e0f006744f88e338585a'
EXTRAORDINARY_CONTROL_FILES = frozenset(['scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-release/scripts/cli.mjs', 'scripts/statistical-levels-release/scripts/invoke.mjs', 'scripts/statistical-levels-release/scripts/preview-qa.mjs', 'scripts/statistical-levels-release/scripts/probe-core.mjs', 'scripts/statistical-levels-release/scripts/release-core.mjs', 'scripts/statistical-levels-release/scripts/runtime-io.mjs'])

# Closed supplemental inventory for this one extraordinary lineage only.
EXTRAORDINARY_TEST_FILES = frozenset('scripts/statistical-levels-ci/authority-transition/' + name for name in ['check-readback-cases.mjs', 'controller.py', 'gate_cases.py', 'inputs-cases.mjs', 'inventory.json', 'legacy-selection.json', 'link_models.py', 'models.py', 'p4_cases.py', 'qa-producer-model.mjs', 'qa_cases.py', 'reference-controller.py', 'run.py', 'service-check.mjs', 'workflow-cases.mjs'])
EXTRAORDINARY_HISTORICAL_FIXTURES = frozenset('scripts/statistical-levels-ci/' + name for name in ['test_ci_recovery_admission.py', 'test_ci_runtime_recovery.py', 'test_publication_ci_repair.py', 'test_publication_closure.py', 'test_lineage_admission.py'])
EXTRAORDINARY_CI_TEST_STEP = b'      - name: Test extraordinary authority transition coverage\n        shell: bash\n        run: |\n          set -euo pipefail\n          python3 -B scripts/statistical-levels-ci/authority-transition/run.py --out "$CI_EVIDENCE/authority-transition"\n\n'

def extraordinary_entry(entry):
    return entry['editorial']['sha'] == EXTRAORDINARY_EDITORIAL['sha']

LINEAGE_PIN = rb'(      SL_CI_LINEAGE_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'
LINEAGE_PIN_LINE = rb'      SL_CI_LINEAGE_PAYLOAD_SHA256: "[a-f0-9]{64}"\n'
# The first transition's parent is pinned in its registry entry (sealed by the rebind payload pin, like every
# epoch root's own constants) and must be admitted by the previous (Zod) epoch: any qualified data head may be the
# base, so the daily producer advancing the branch never requires a code change of this epoch. Bases admitted only by
# earlier epochs (ZOD_BASE itself, pre-Zod heads) are refused (LINEAGE_FIRST_PARENT_EPOCH).
LINEAGE_REBIND_FILES = frozenset({
    CI, LINEAGE_REGISTRY,
    '.github/workflows/statistical-levels-release.yml',
    'scripts/statistical-levels-release/policy.json',
    'scripts/statistical-levels-release/source-inputs.json',
    'scripts/statistical-levels-release/source-manifest.json',
    'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
    'scripts/statistical-levels-release/workflow-freeze.json',
    'scripts/statistical-levels-ci/policy-migration.json',
    'scripts/statistical-levels-release/tests/probe-qa-http.test.mjs',
    'scripts/statistical-levels-release/tests/probe-redirect-integration.test.mjs',
    'scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs',
})
LINEAGE_EPOCH_FILES = LINEAGE_REBIND_FILES | frozenset({
    'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py',
    'scripts/statistical-levels-release/tests/preview-qa.test.mjs',
    'scripts/statistical-levels-release/tests/input-manifest-roles.test.mjs',
    'scripts/statistical-levels-ci/test_zod_security_admission.py',
})
# An editorial transition may never touch Statistical Levels data, the generator bundle, the producer,
# the release package, the CI contracts or the dependency lock.
LINEAGE_EDITORIAL_FORBIDDEN_PREFIXES = (DATA, 'scripts/statistical-levels-release/', 'scripts/statistical-levels-ci/', '.github/workflows/')
LINEAGE_EDITORIAL_FORBIDDEN_FILES = frozenset({PROVENANCE, PRODUCER, CI, 'package.json', 'package-lock.json',
    'scripts/build-statistical-levels.mjs', 'scripts/statistical-levels-offline.mjs',
    'lib/statistical-levels/baseline-policy.mjs', 'lib/statistical-levels/defect-repairs.mjs',
    'scripts/statistical-levels-hosted.mjs', 'scripts/statistical-levels-storage.mjs', 'scripts/statistical-levels-daily.mjs',
    'docs/statistical-levels-capability-ledger.json'})


def lineage_registry(git, sha):
    if LINEAGE_REGISTRY not in git.tree(sha):
        return None
    registry = unique_json(git.blob(sha, LINEAGE_REGISTRY))
    need(isinstance(registry, list) and registry, 'LINEAGE_REGISTRY')
    for index, entry in enumerate(registry, 1):
        need(set(entry) == {'schema', 'index', 'parent', 'editorial', 'rebind', 'previous_rebind'} and entry['schema'] == LINEAGE_SCHEMA and entry['index'] == index, 'LINEAGE_REGISTRY_ENTRY')
        need(set(entry['editorial']) == {'sha', 'tree', 'author', 'committer', 'message', 'delta'} and set(entry['rebind']) == {'author', 'committer', 'message', 'files'}, 'LINEAGE_REGISTRY_ENTRY')
        need(re.fullmatch('[a-f0-9]{40}', entry['parent']) and re.fullmatch('[a-f0-9]{40}', entry['editorial']['sha']) and re.fullmatch('[a-f0-9]{40}', entry['editorial']['tree']), 'LINEAGE_REGISTRY_SHA')
        need((entry['previous_rebind'] is None) == (index == 1) and (index == 1 or re.fullmatch('[a-f0-9]{40}', entry['previous_rebind'])), 'LINEAGE_REGISTRY_PREVIOUS')
    return registry


def lineage_header(git, sha, tree, parent, author, committer, message, code):
    expected = ('tree ' + tree + '\nparent ' + parent + '\nauthor ' + author + '\ncommitter ' + committer + '\n\n' + message + '\n').encode()
    need(git('cat-file', 'commit', sha) == expected, code)


def validate_lineage_editorial(git, entry):
    e = entry['editorial']
    sha = e['sha']
    need(git.parents(sha) == [entry['parent']], 'LINEAGE_EDITORIAL_PARENT')
    need(git.text('rev-parse', sha + '^{tree}') == e['tree'], 'LINEAGE_EDITORIAL_TREE')
    lineage_header(git, sha, e['tree'], entry['parent'], e['author'], e['committer'], e['message'], 'LINEAGE_EDITORIAL_HEADER')
    need(e['delta'] and all(set(item) == {'status', 'mode', 'git_blob', 'sha256'} for item in e['delta'].values()), 'LINEAGE_EDITORIAL_DELTA_SCHEMA')
    exceptional = extraordinary_entry(entry)
    if exceptional:
        fixed = EXTRAORDINARY_EDITORIAL
        need(entry['index'] == 2 and entry['parent'] == fixed['parent'] and entry['previous_rebind'] == EXTRAORDINARY_HISTORY_ROOT, 'EXTRAORDINARY_LINEAGE')
        need(all(e[k] == fixed[k] for k in ['sha', 'tree', 'author', 'committer', 'message']), 'EXTRAORDINARY_IDENTITY')
        preserved = paths(git)
        need(len(preserved) == 82 and set(e['delta']) == preserved | EXTRAORDINARY_EDITORIAL_PATHS, 'EXTRAORDINARY_EXACT_SCOPE')
        before_sl, after_sl = git.tree(EXTRAORDINARY_BASELINE), git.tree(sha)
        for name in preserved:
            need(after_sl.get(name) == before_sl.get(name) and git.blob(sha, name) == git.blob(EXTRAORDINARY_BASELINE, name), 'EXTRAORDINARY_SNAPSHOT_IDENTITY')
    for p in e['delta']:
        if not exceptional or p not in paths(git):
            need(not p.startswith(LINEAGE_EDITORIAL_FORBIDDEN_PREFIXES) and p not in LINEAGE_EDITORIAL_FORBIDDEN_FILES, 'LINEAGE_EDITORIAL_SCOPE')
    before, after = delta(git, entry['parent'], sha, set(e['delta']))
    for p, item in e['delta'].items():
        if item['status'] == 'D':
            need(p in before and p not in after and item['git_blob'] is None and item['sha256'] is None, 'LINEAGE_EDITORIAL_BLOB')
        else:
            need(item['status'] == ('A' if p not in before else 'M') and item['mode'] == '100644', 'LINEAGE_EDITORIAL_BLOB')
            need(after[p] == ('100644', item['git_blob']) and digest(git.blob(sha, p)) == item['sha256'], 'LINEAGE_EDITORIAL_BLOB')


def lineage_payload_hash(git, sha, files):
    rows = []
    for name in sorted(files):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(LINEAGE_PIN, data)) == 1, 'LINEAGE_PIN_FIELD')
            data = re.sub(LINEAGE_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def validate_lineage_rebind(git, root, entry):
    r = entry['rebind']
    editorial = entry['editorial']['sha']
    need(git.parents(root) == [editorial], 'LINEAGE_REBIND_PARENT')
    files = frozenset(r['files'])
    need(sorted(files) == r['files'] and len(files) == len(r['files']), 'LINEAGE_REBIND_FILES')
    allowed = LINEAGE_EPOCH_FILES if entry['index'] == 1 else LINEAGE_REBIND_FILES
    exceptional = extraordinary_entry(entry)
    mandatory = {CI, LINEAGE_REGISTRY, 'scripts/statistical-levels-release/policy.json'}
    if exceptional:
        allowed |= EXTRAORDINARY_CONTROL_FILES | EXTRAORDINARY_TEST_FILES | EXTRAORDINARY_HISTORICAL_FIXTURES
        mandatory = {CI, LINEAGE_REGISTRY, 'scripts/statistical-levels-ci/admission.py'} | EXTRAORDINARY_TEST_FILES | EXTRAORDINARY_HISTORICAL_FIXTURES
    need(files <= allowed and mandatory <= files, 'LINEAGE_REBIND_SCOPE')
    delta(git, editorial, root, files)
    lineage_header(git, root, git.text('rev-parse', root + '^{tree}'), editorial, r['author'], r['committer'], r['message'], 'LINEAGE_REBIND_HEADER')
    # Ordinary lineage remains pin-only; this exception adds exactly one mandatory step.
    ci_bytes = git.blob(root, CI)
    if exceptional:
        for name in EXTRAORDINARY_HISTORICAL_FIXTURES:
            git_name = 'git' if name.endswith('/test_lineage_admission.py') else 'f.git'
            anchor = f'        if {git_name}.parents(cls.root) == [a.MEMORY_CI_BASE]:\n'.encode()
            selector = f"        if {git_name}.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:\n            cls.root = a.EXTRAORDINARY_HISTORY_ROOT\n".encode()
            historical = git.blob(editorial, name)
            need(historical.count(anchor) == 1 and git.blob(root, name) == historical.replace(anchor, selector + anchor, 1), 'EXTRAORDINARY_HISTORICAL_SELECTOR')
        need(ci_bytes.count(EXTRAORDINARY_CI_TEST_STEP) == 1, 'EXTRAORDINARY_CI_TEST_STEP')
        ci_bytes = ci_bytes.replace(EXTRAORDINARY_CI_TEST_STEP, b'', 1)
        new_pins = b"assert len(pins)==10 and all(p.decode()==sha(canonical.encode()) for p in pins), 'WORKFLOW_PINS'"
        need(ci_bytes.count(new_pins) == 1, 'EXTRAORDINARY_WORKFLOW_PINS')
        ci_bytes = ci_bytes.replace(new_pins, new_pins.replace(b'==10', b'==7'), 1)
    need(re.sub(LINEAGE_PIN_LINE, b'', ci_bytes) == re.sub(LINEAGE_PIN_LINE, b'', git.blob(editorial, CI)), 'LINEAGE_CI_SCOPE')
    pin = re.findall(rb'      SL_CI_LINEAGE_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', git.blob(root, CI))
    need(len(pin) == 1 and pin[0].decode() == lineage_payload_hash(git, root, files), 'LINEAGE_PAYLOAD')
    # The rebind must bind exactly the pinned editorial commit (not merely change the allowed files).
    policy = unique_json(git.blob(root, 'scripts/statistical-levels-release/policy.json'))
    migration = unique_json(git.blob(root, 'scripts/statistical-levels-ci/policy-migration.json'))
    if exceptional:
        policy_path = 'scripts/statistical-levels-release/policy.json'
        need(git.blob(root, policy_path) == git.blob(entry['parent'], policy_path), 'EXTRAORDINARY_BASELINE_POLICY_CHANGED')
        migration_path = 'scripts/statistical-levels-ci/policy-migration.json'
        need(git.blob(root, migration_path) == git.blob(entry['parent'], migration_path), 'EXTRAORDINARY_BASELINE_MIGRATION_CHANGED')
    else:
        need(policy['baseline']['production_git_sha'] == editorial and migration['editorial_sha'] == editorial and migration['transition_index'] == entry['index'] and migration['current_policy_sha256'] == digest(git.blob(root, 'scripts/statistical-levels-release/policy.json')), 'LINEAGE_REBIND_POLICY')


def lineage_entry(git, root):
    """The registry entry describing `root` when `root` is a lineage rebind commit, else None."""
    registry = lineage_registry(git, root)
    if registry is None:
        return None
    entry = registry[-1]
    return entry if git.parents(root) == [entry['editorial']['sha']] else None


# One reviewed repair of the failed R1 CI, not a repeatable transition API.
# The existing lineage registry and 82 data files remain byte-for-byte intact.
CI_REPAIR_BASE = '50cd6ae7724804cc7a819f18f8732a6b733c290c'
CI_REPAIR_R1 = '83d304321a2937713942d908c811d40c15e59847'
CI_REPAIR_IDENTITY = 'Codex <codex@openai.com> 1794433524 +0000'
CI_REPAIR_MESSAGE = 'Recover R1 CI with an exact one-time admission and isolated Zod tests'
CI_REPAIR_FILES = frozenset({CI, 'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py',
    'scripts/statistical-levels-ci/test_ci_recovery_admission.py'})
CI_REPAIR_PIN = rb'(      SL_CI_R1_REPAIR_PAYLOAD_SHA256: ")[a-f0-9]{64}("\n)'
CI_REPAIR_PIN_LINE = rb'      SL_CI_R1_REPAIR_PAYLOAD_SHA256: "[a-f0-9]{64}"\n'
# Exact parent workflow with only the reviewed test command split, before adding the repair pin.
CI_REPAIR_WORKFLOW_SHA256 = '63b4410a59a0e66c8debdf3af6e57185a0fc6632b90ecf7cf34c7df16fdadeca'


def ci_repair_payload_hash(git, sha):
    rows = []
    for name in sorted(CI_REPAIR_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(CI_REPAIR_PIN, data)) == 1, 'CI_REPAIR_PIN_FIELD')
            data = re.sub(CI_REPAIR_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def validate_ci_repair(git, root):
    need(git.parents(root) == [CI_REPAIR_BASE], 'CI_REPAIR_PARENT')
    need(git.parents(CI_REPAIR_BASE) == ['b6f77209710bbfd3cd46ad1587f43ddabe96d33e'] and
         bootstrap(git, CI_REPAIR_BASE) == (CI_REPAIR_R1, [CI_REPAIR_BASE, 'b6f77209710bbfd3cd46ad1587f43ddabe96d33e']), 'CI_REPAIR_EXISTING_LINEAGE')
    delta(git, CI_REPAIR_BASE, root, CI_REPAIR_FILES)
    lineage_header(git, root, git.text('rev-parse', root + '^{tree}'), CI_REPAIR_BASE,
                   CI_REPAIR_IDENTITY, CI_REPAIR_IDENTITY, CI_REPAIR_MESSAGE, 'CI_REPAIR_HEADER')
    workflow = git.blob(root, CI)
    need(digest(re.sub(CI_REPAIR_PIN_LINE, b'', workflow)) == CI_REPAIR_WORKFLOW_SHA256, 'CI_REPAIR_WORKFLOW_SCOPE')
    pin = re.findall(rb'      SL_CI_R1_REPAIR_PAYLOAD_SHA256: "([a-f0-9]{64})"\n', workflow)
    need(len(pin) == 1 and pin[0].decode() == ci_repair_payload_hash(git, root), 'CI_REPAIR_PAYLOAD')



# One exact publication closure. No registry-driven or repeatable code exception.
PUBLICATION_CLOSURE_BASE = '22488a6c6a66d45bb7b06a2bbf4b1fcc0de2a711'
PUBLICATION_RECOVERY_ROOT = '76cc75817da7dc88e6f2d79784b123b0c09bee96'
PUBLICATION_CLOSURE_IDENTITY = 'Codex <codex@openai.com> 1794744000 +0000'
PUBLICATION_CLOSURE_MESSAGE = 'Close exact Statistical Levels publication and gated daily release'
PUBLICATION_CLOSURE_FILES = frozenset({
    CI, '.github/workflows/statistical-levels-release.yml',
    'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py',
    'scripts/statistical-levels-ci/test_publication_closure.py',
    *('scripts/statistical-levels-release/' + p for p in [
        'scripts/release-core.mjs','scripts/runtime-io.mjs','scripts/cli.mjs','scripts/invoke.mjs','scripts/browser-harness.mjs',
        'source-manifest.json','SOURCE_SHA256SUMS','workflow-freeze.json','tests/publication-closure.test.mjs'])})
PUBLICATION_CLOSURE_PIN = rb'(      SL_CI_PUBLICATION_CLOSURE_SHA256: ")[a-f0-9]{64}("\n)'
PUBLICATION_CLOSURE_PIN_LINE = rb'      SL_CI_PUBLICATION_CLOSURE_SHA256: "[a-f0-9]{64}"\n'
PUBLICATION_CI_SHA256 = '83c881e9f2aa8a0cb92a59a20b997d93e78305def99468d42b3a6a36805aace6'


def publication_closure_payload(git, sha):
    rows = []
    for name in sorted(PUBLICATION_CLOSURE_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(PUBLICATION_CLOSURE_PIN, data)) == 1, 'PUBLICATION_PIN_FIELD')
            data = re.sub(PUBLICATION_CLOSURE_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path':name,'mode':'100644','sha256':digest(data)})
    return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())


def validate_publication_closure(git, root):
    need(git.parents(root) == [PUBLICATION_CLOSURE_BASE], 'PUBLICATION_EXACT_PARENT')
    need(bootstrap(git, PUBLICATION_CLOSURE_BASE) == (PUBLICATION_RECOVERY_ROOT,
         [PUBLICATION_CLOSURE_BASE, '8e29087b2edd31599ffe3f6eab1e60a8e2d983de', '68ea8bfda54b923f5ec1769f52d306becbf56f3c']), 'PUBLICATION_EXISTING_LINEAGE')
    delta(git, PUBLICATION_CLOSURE_BASE, root, PUBLICATION_CLOSURE_FILES)
    lineage_header(git, root, git.text('rev-parse',root+'^{tree}'), PUBLICATION_CLOSURE_BASE,
        PUBLICATION_CLOSURE_IDENTITY, PUBLICATION_CLOSURE_IDENTITY, PUBLICATION_CLOSURE_MESSAGE, 'PUBLICATION_HEADER')
    workflow = git.blob(root,CI)
    need(digest(re.sub(PUBLICATION_CLOSURE_PIN_LINE,b'',workflow)) == PUBLICATION_CI_SHA256, 'PUBLICATION_CI_SCOPE')
    pin = re.findall(rb'      SL_CI_PUBLICATION_CLOSURE_SHA256: "([a-f0-9]{64})"\n',workflow)
    need(len(pin) == 1 and pin[0].decode() == publication_closure_payload(git,root), 'PUBLICATION_PAYLOAD')


# One CI-only repair of 5c53fa63, whose hosted run failed four contract tests.
# No publication code, historical subject, data or future code transition is admitted.
PUBLICATION_CI_REPAIR_BASE = '5c53fa63577c39e8b656b563865cbefd4cd8b524'
PUBLICATION_CI_REPAIR_IDENTITY = 'Codex <codex@openai.com> 1794778800 +0000'
PUBLICATION_CI_REPAIR_MESSAGE = 'Repair exact publication CI inventory and historical models'
PUBLICATION_CI_REPAIR_FILES = frozenset({CI,
    'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_admission.py', 'scripts/statistical-levels-ci/test_report_contract_admission.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py',
    'scripts/statistical-levels-ci/test_publication_closure.py', 'scripts/statistical-levels-ci/test_publication_ci_repair.py'})
PUBLICATION_CI_REPAIR_PIN = rb'(      SL_CI_PUBLICATION_REPAIR_SHA256: ")[a-f0-9]{64}("\n)'
PUBLICATION_CI_REPAIR_PIN_LINE = rb'      SL_CI_PUBLICATION_REPAIR_SHA256: "[a-f0-9]{64}"\n'


def publication_ci_repair_payload(git, sha):
    rows = []
    for name in sorted(PUBLICATION_CI_REPAIR_FILES):
        data = git.blob(sha, name)
        if name == CI:
            need(len(re.findall(PUBLICATION_CI_REPAIR_PIN, data)) == 1, 'PUBLICATION_CI_REPAIR_PIN_FIELD')
            data = re.sub(PUBLICATION_CI_REPAIR_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def validate_publication_ci_repair(git, root):
    need(git.parents(root) == [PUBLICATION_CI_REPAIR_BASE], 'PUBLICATION_CI_REPAIR_PARENT')
    need(bootstrap(git, PUBLICATION_CI_REPAIR_BASE) == (PUBLICATION_CI_REPAIR_BASE, []), 'PUBLICATION_CI_REPAIR_LINEAGE')
    delta(git, PUBLICATION_CI_REPAIR_BASE, root, PUBLICATION_CI_REPAIR_FILES)
    lineage_header(git, root, git.text('rev-parse', root + '^{tree}'), PUBLICATION_CI_REPAIR_BASE,
        PUBLICATION_CI_REPAIR_IDENTITY, PUBLICATION_CI_REPAIR_IDENTITY, PUBLICATION_CI_REPAIR_MESSAGE, 'PUBLICATION_CI_REPAIR_HEADER')
    workflow = git.blob(root, CI)
    need(re.sub(PUBLICATION_CI_REPAIR_PIN_LINE, b'', workflow) == git.blob(PUBLICATION_CI_REPAIR_BASE, CI), 'PUBLICATION_CI_REPAIR_WORKFLOW_SCOPE')
    pin = re.findall(rb'      SL_CI_PUBLICATION_REPAIR_SHA256: "([a-f0-9]{64})"\n', workflow)
    need(len(pin) == 1 and pin[0].decode() == publication_ci_repair_payload(git, root), 'PUBLICATION_CI_REPAIR_PAYLOAD')


# One bounded runtime recovery from the unqualified ee6cce commit. No failed CI is reused.
RUNTIME_CI_BASE = 'ee6cce7360de20ff66bdf7c4343b79579f6502fe'
RUNTIME_CI_IDENTITY = 'Codex <codex@openai.com> 1794781980 +0000'
RUNTIME_CI_MESSAGE = 'Bound CI runtime recovery and retain Python diagnostic evidence'
RUNTIME_CI_FILES = frozenset({CI, 'scripts/statistical-levels-ci/admission.py',
    'scripts/statistical-levels-ci/historical-tests.py', 'scripts/statistical-levels-ci/test_ci_runtime_recovery.py',
    'scripts/statistical-levels-ci/test_publication_ci_repair.py', 'scripts/statistical-levels-ci/test_publication_closure.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py'})
RUNTIME_CI_PIN = rb'(      SL_CI_RUNTIME_RECOVERY_SHA256: ")[a-f0-9]{64}("\n)'
RUNTIME_CI_WORKFLOW_SHA256 = '2b5af8e3351081e8adf3b872a6da41cc7601d72283d7cfad0f116ed228db8775'


def runtime_ci_workflow(data):
    need(len(re.findall(RUNTIME_CI_PIN, data)) == 1, 'RUNTIME_CI_PIN_FIELD')
    return re.sub(RUNTIME_CI_PIN, lambda m: m[1] + b'0' * 64 + m[2], data)


def runtime_ci_payload(git, sha):
    rows = []
    for name in sorted(RUNTIME_CI_FILES):
        data = git.blob(sha, name)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(runtime_ci_workflow(data) if name == CI else data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def validate_runtime_ci(git, root):
    need(git.parents(root) == [RUNTIME_CI_BASE], 'RUNTIME_CI_PARENT')
    need(bootstrap(git, RUNTIME_CI_BASE) == (RUNTIME_CI_BASE, []), 'RUNTIME_CI_LINEAGE')
    delta(git, RUNTIME_CI_BASE, root, RUNTIME_CI_FILES)
    lineage_header(git, root, git.text('rev-parse', root + '^{tree}'), RUNTIME_CI_BASE,
        RUNTIME_CI_IDENTITY, RUNTIME_CI_IDENTITY, RUNTIME_CI_MESSAGE, 'RUNTIME_CI_HEADER')
    workflow = git.blob(root, CI)
    need(digest(runtime_ci_workflow(workflow)) == RUNTIME_CI_WORKFLOW_SHA256, 'RUNTIME_CI_WORKFLOW_SCOPE')
    pin = re.findall(rb'      SL_CI_RUNTIME_RECOVERY_SHA256: "([a-f0-9]{64})"\n', workflow)
    need(len(pin) == 1 and pin[0].decode() == runtime_ci_payload(git, root), 'RUNTIME_CI_PAYLOAD')


# One reviewed memory fix, anchored to the exact unqualified runtime root.
# The validated workflow/helper bytes are immutable. This self-excluding seal
# binds all admission glue; it is not an API for resealing later code changes.
MEMORY_CI_BASE = 'a6354355742d8b359c8cbcd5c339d6abaf5ee691'
MEMORY_CI_IDENTITY = 'Codex <codex@openai.com> 1794843363 +0000'
MEMORY_CI_MESSAGE = 'Admit exact CI memory cleanup without widening historical contracts'
MEMORY_CI_HELPER = 'scripts/statistical-levels-ci/class_cache_cleanup.py'
MEMORY_CI_FILES = frozenset({CI, MEMORY_CI_HELPER,
    'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/historical-tests.py',
    'scripts/statistical-levels-ci/test_ci_runtime_recovery.py',
    'scripts/statistical-levels-ci/test_publication_ci_repair.py',
    'scripts/statistical-levels-ci/test_publication_closure.py',
    'scripts/statistical-levels-ci/test_lineage_admission.py',
    'scripts/statistical-levels-ci/test_ci_recovery_admission.py',
    'scripts/statistical-levels-ci/memory_admission_tests.py'})
MEMORY_CI_WORKFLOW_SHA256 = 'bf3886887b75318605a65f885993ad7c017664d5494268761742eef1c45b42fb'
MEMORY_CI_HELPER_SHA256 = '781547403be306890bb4c5afa4e0f47d44dc6c3b606ef4129ff0c1c16e4c52d9'
MEMORY_CI_PAYLOAD_SHA256 = '5adae8e15c06c861a81d99f0ce4d8eec3ec10ef954639a8668fcd0813a8482ee'
MEMORY_CI_PIN = rb"(?m)^(MEMORY_CI_PAYLOAD_SHA256 = ')([a-f0-9]{64})('\n)"


def memory_ci_payload(git, sha):
    rows = []
    for name in sorted(MEMORY_CI_FILES):
        data = git.blob(sha, name)
        if name == 'scripts/statistical-levels-ci/admission.py':
            pin = re.findall(MEMORY_CI_PIN, data)
            need(len(pin) == 1 and pin[0][1].decode() == MEMORY_CI_PAYLOAD_SHA256, 'MEMORY_CI_PIN')
            data = re.sub(MEMORY_CI_PIN, lambda m: m[1] + b'0' * 64 + m[3], data)
        rows.append({'path': name, 'mode': '100644', 'sha256': digest(data)})
    return digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())


def validate_memory_ci(git, root):
    need(git.parents(root) == [MEMORY_CI_BASE], 'MEMORY_CI_PARENT')
    need(bootstrap(git, MEMORY_CI_BASE) == (MEMORY_CI_BASE, []), 'MEMORY_CI_LINEAGE')
    delta(git, MEMORY_CI_BASE, root, MEMORY_CI_FILES)
    lineage_header(git, root, git.text('rev-parse', root + '^{tree}'), MEMORY_CI_BASE,
        MEMORY_CI_IDENTITY, MEMORY_CI_IDENTITY, MEMORY_CI_MESSAGE, 'MEMORY_CI_HEADER')
    need(digest(git.blob(root, CI)) == MEMORY_CI_WORKFLOW_SHA256, 'MEMORY_CI_WORKFLOW_SCOPE')
    need(digest(git.blob(root, MEMORY_CI_HELPER)) == MEMORY_CI_HELPER_SHA256, 'MEMORY_CI_HELPER_SCOPE')
    need(memory_ci_payload(git, root) == MEMORY_CI_PAYLOAD_SHA256, 'MEMORY_CI_PAYLOAD')


# One exact technical child for historical compatibility, never a reusable repair category.
COMPAT_PARENT = 'aec5be3b7207d1023effea78785291df815965b9'
COMPAT_PARENT_TREE = 'cc6f7b615a917d9a5434deef33f916f27f9c12cd'
COMPAT_IDENTITY = 'Codex <codex@openai.com> 1795027655 +0000'
COMPAT_MESSAGE = 'Restore exact historical release and OLD compatibility'
COMPAT_FILES = frozenset(['.github/workflows/statistical-levels-release.yml', 'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/authority-transition/compat-cases.mjs', 'scripts/statistical-levels-ci/authority-transition/compat_cases.py', 'scripts/statistical-levels-ci/authority-transition/inventory.json', 'scripts/statistical-levels-ci/authority-transition/link_models.py', 'scripts/statistical-levels-ci/authority-transition/p4_cases.py', 'scripts/statistical-levels-ci/authority-transition/run.py', 'scripts/statistical-levels-ci/historical-tests.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py', 'scripts/statistical-levels-ci/test_ci_runtime_recovery.py', 'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_publication_ci_repair.py', 'scripts/statistical-levels-ci/test_publication_closure.py', 'scripts/statistical-levels-release/SOURCE_SHA256SUMS', 'scripts/statistical-levels-release/source-manifest.json', 'scripts/statistical-levels-release/tests/probe-qa-http.test.mjs', 'scripts/statistical-levels-release/tests/probe-redirect-integration.test.mjs', 'scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs', 'scripts/statistical-levels-release/tests/semantic-closure-compat.mjs', 'scripts/statistical-levels-release/workflow-freeze.json'])
COMPAT_PAYLOAD_SHA256 = 'c32d797fd5259dbfc5b8cdd3ed5c987e1bc138a2ef2f96cb5baf3b3d89cc89af'
COMPAT_PIN = rb"(?m)^(COMPAT_PAYLOAD_SHA256 = ')([a-f0-9]{64})('\n)"


def compatibility_payload(git, root):
    rows = []
    for name in sorted(COMPAT_FILES):
        data = git.blob(root, name)
        if name == 'scripts/statistical-levels-ci/admission.py':
            pins = re.findall(COMPAT_PIN, data)
            need(len(pins) == 1 and pins[0][1].decode() == COMPAT_PAYLOAD_SHA256, 'COMPAT_PIN')
            data = re.sub(COMPAT_PIN, lambda m: m[1] + b'0' * 64 + m[3], data)
        elif name == 'scripts/statistical-levels-ci/authority-transition/inventory.json':
            field = rb'("scripts/statistical-levels-ci/admission.py": ")[a-f0-9]{64}("[\n,])'
            need(len(re.findall(field,data)) == 1, 'COMPAT_INVENTORY_PIN')
            data = re.sub(field, lambda m: m[1] + b'0' * 64 + m[2], data)
        rows.append({'path':name,'mode':'100644','sha256':digest(data)})
    return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())


def validate_compatibility(git, root):
    need(git.parents(root) == [COMPAT_PARENT], 'COMPAT_PARENT')
    need(git.text('rev-parse',COMPAT_PARENT+'^{tree}') == COMPAT_PARENT_TREE, 'COMPAT_PARENT_TREE')
    need(bootstrap(git,COMPAT_PARENT) == (COMPAT_PARENT,[]), 'COMPAT_HISTORICAL_LINEAGE')
    before,after = delta(git,COMPAT_PARENT,root,COMPAT_FILES)
    lineage_header(git,root,git.text('rev-parse',root+'^{tree}'),COMPAT_PARENT,
                   COMPAT_IDENTITY,COMPAT_IDENTITY,COMPAT_MESSAGE,'COMPAT_HEADER')
    for name in paths(git):
        need(after[name] == before[name] and git.blob(root,name) == git.blob(EXTRAORDINARY_BASELINE,name), 'COMPAT_SL_IDENTITY')
    need(git.blob(root,CI) == git.blob(COMPAT_PARENT,CI), 'COMPAT_CI_UNCHANGED')
    wf = '.github/workflows/statistical-levels-release.yml'
    normalize = lambda data: re.sub(rb'(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}',lambda m:m[1]+b'0'*64,data)
    need(normalize(git.blob(root,wf)) == normalize(git.blob(COMPAT_PARENT,wf)), 'COMPAT_WORKFLOW_SCOPE')
    for name in EXTRAORDINARY_HISTORICAL_FIXTURES:
        gn = 'git' if name.endswith('/test_lineage_admission.py') else 'f.git'
        anchor = f"        if {gn}.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:\n".encode()
        addition = f"        if {gn}.parents(cls.root) == [a.COMPAT_PARENT]:\n            cls.root = a.COMPAT_PARENT\n".encode()
        prior = git.blob(COMPAT_PARENT,name)
        need(prior.count(anchor) == 1 and git.blob(root,name) == prior.replace(anchor,addition+anchor,1), 'COMPAT_HISTORICAL_SELECTOR')
    current = unique_json(git.blob(root,'scripts/statistical-levels-ci/authority-transition/inventory.json'))
    previous = unique_json(git.blob(COMPAT_PARENT,'scripts/statistical-levels-ci/authority-transition/inventory.json'))
    need(current['schema'] == previous['schema'], 'COMPAT_TEST_SCHEMA')
    for key in ['python_tests','node_tests','python_modules','node_files']:
        need(len(current[key]) == len(set(current[key])) and set(previous[key]) <= set(current[key]), 'COMPAT_TEST_INVENTORY')
    need(set(previous['files']) <= set(current['files']), 'COMPAT_TEST_FILES')
    for name,value in current['files'].items():
        need(digest(git.blob(root,name)) == value, 'COMPAT_TEST_BYTES')
    need(compatibility_payload(git,root) == COMPAT_PAYLOAD_SHA256, 'COMPAT_PAYLOAD')


# One fixed security child of the preserved compatibility commit. This is not
# a reusable technical-successor category. Its sole native push spans Rprime→T→U.
NEXT_SECURITY_PARENT = '37363b10183a9505512ced3c21730c190ca0c736'
NEXT_SECURITY_PARENT_TREE = 'cebba641d0e60cca94a8c3b52193646313f40a90'
NEXT_SECURITY_IDENTITY = 'Codex <codex@openai.com> 1795036647 +0000'
NEXT_SECURITY_MESSAGE = 'Qualify exact Next.js 16.4.5 security successor'
NEXT_SECURITY_FILES = frozenset(['.github/workflows/statistical-levels-release.yml', 'package-lock.json', 'package.json', 'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/authority-transition/compat_cases.py', 'scripts/statistical-levels-ci/authority-transition/inventory.json', 'scripts/statistical-levels-ci/authority-transition/next_security_cases.py', 'scripts/statistical-levels-ci/authority-transition/p4_cases.py', 'scripts/statistical-levels-ci/authority-transition/run.py', 'scripts/statistical-levels-ci/historical-tests.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py', 'scripts/statistical-levels-ci/test_ci_runtime_recovery.py', 'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_publication_ci_repair.py', 'scripts/statistical-levels-ci/test_publication_closure.py', 'scripts/statistical-levels-release/SOURCE_SHA256SUMS', 'scripts/statistical-levels-release/source-inputs.json', 'scripts/statistical-levels-release/source-manifest.json', 'scripts/statistical-levels-release/workflow-freeze.json'])
NEXT_SECURITY_DEPENDENCIES = {
    'package.json':'ad58bbfb71e31c079008cdb440edd9eac75cc06ef9c27aec487fab7c76ba0e6c',
    'package-lock.json':'94fdf3ee7bec192e751a6d05f3d7cb4a2301882e666683e61c612d2d90652360',
}
NEXT_SECURITY_PAYLOAD_SHA256 = '8130d25e9c0c5a73fc6057a53bebfdc762020643495a5403a32ec7f4990bf7e3'
NEXT_SECURITY_PIN = rb"(?m)^(NEXT_SECURITY_PAYLOAD_SHA256 = ')([a-f0-9]{64})('\n)"


def next_security_payload(git, root):
    rows = []
    for name in sorted(NEXT_SECURITY_FILES):
        data = git.blob(root,name)
        if name == 'scripts/statistical-levels-ci/admission.py':
            pins = re.findall(NEXT_SECURITY_PIN,data)
            need(len(pins) == 1 and pins[0][1].decode() == NEXT_SECURITY_PAYLOAD_SHA256, 'NEXT_SECURITY_PIN')
            data = re.sub(NEXT_SECURITY_PIN,lambda m:m[1]+b'0'*64+m[3],data)
        elif name == 'scripts/statistical-levels-ci/authority-transition/inventory.json':
            field = rb'("scripts/statistical-levels-ci/admission.py": ")[a-f0-9]{64}("[\n,])'
            need(len(re.findall(field,data)) == 1, 'NEXT_SECURITY_INVENTORY_PIN')
            data = re.sub(field,lambda m:m[1]+b'0'*64+m[2],data)
        rows.append({'path':name,'mode':'100644','sha256':digest(data)})
    return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())


def validate_next_security(git, root):
    need(git.parents(root) == [NEXT_SECURITY_PARENT], 'NEXT_SECURITY_PARENT')
    need(git.text('rev-parse',NEXT_SECURITY_PARENT+'^{tree}') == NEXT_SECURITY_PARENT_TREE, 'NEXT_SECURITY_PARENT_TREE')
    need(git.parents(NEXT_SECURITY_PARENT) == [COMPAT_PARENT], 'NEXT_SECURITY_CHAIN')
    need(bootstrap(git,NEXT_SECURITY_PARENT) == (NEXT_SECURITY_PARENT,[]), 'NEXT_SECURITY_HISTORICAL_LINEAGE')
    before,after = delta(git,NEXT_SECURITY_PARENT,root,NEXT_SECURITY_FILES)
    lineage_header(git,root,git.text('rev-parse',root+'^{tree}'),NEXT_SECURITY_PARENT,
                   NEXT_SECURITY_IDENTITY,NEXT_SECURITY_IDENTITY,NEXT_SECURITY_MESSAGE,'NEXT_SECURITY_HEADER')
    for name in paths(git):
        need(after[name] == before[name] and git.blob(root,name) == git.blob(EXTRAORDINARY_BASELINE,name), 'NEXT_SECURITY_SL_IDENTITY')
    need(git.blob(root,CI) == git.blob(NEXT_SECURITY_PARENT,CI), 'NEXT_SECURITY_CI_UNCHANGED')
    for name,value in NEXT_SECURITY_DEPENDENCIES.items():
        need(digest(git.blob(root,name)) == value, 'NEXT_SECURITY_DEPENDENCY')
    wf = '.github/workflows/statistical-levels-release.yml'
    normalize = lambda data:re.sub(rb'(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}',lambda m:m[1]+b'0'*64,data)
    need(normalize(git.blob(root,wf)) == normalize(git.blob(NEXT_SECURITY_PARENT,wf)), 'NEXT_SECURITY_WORKFLOW_SCOPE')
    for name in EXTRAORDINARY_HISTORICAL_FIXTURES:
        gn = 'git' if name.endswith('/test_lineage_admission.py') else 'f.git'
        anchor = f'        if {gn}.parents(cls.root) == [a.COMPAT_PARENT]:\n'.encode()
        addition = f'        if {gn}.parents(cls.root) == [a.NEXT_SECURITY_PARENT]:\n            cls.root = a.NEXT_SECURITY_PARENT\n'.encode()
        prior = git.blob(NEXT_SECURITY_PARENT,name)
        need(prior.count(anchor) == 1 and git.blob(root,name) == prior.replace(anchor,addition+anchor,1), 'NEXT_SECURITY_HISTORICAL_SELECTOR')
    source = 'scripts/statistical-levels-release/source-inputs.json'
    previous_inputs = unique_json(git.blob(NEXT_SECURITY_PARENT,source))
    need(unique_json(git.blob(root,source)) == {**previous_inputs,**NEXT_SECURITY_DEPENDENCIES}, 'NEXT_SECURITY_INPUT_SCOPE')
    inventory = 'scripts/statistical-levels-ci/authority-transition/inventory.json'
    current,previous = (unique_json(git.blob(ref,inventory)) for ref in [root,NEXT_SECURITY_PARENT])
    need(current['schema'] == previous['schema'], 'NEXT_SECURITY_TEST_SCHEMA')
    for key in ['python_tests','node_tests','python_modules','node_files']:
        need(len(current[key]) == len(set(current[key])) and set(previous[key]) <= set(current[key]), 'NEXT_SECURITY_TEST_INVENTORY')
    need(set(previous['files']) <= set(current['files']), 'NEXT_SECURITY_TEST_FILES')
    for name,value in current['files'].items():
        need(digest(git.blob(root,name)) == value, 'NEXT_SECURITY_TEST_BYTES')
    need(next_security_payload(git,root) == NEXT_SECURITY_PAYLOAD_SHA256, 'NEXT_SECURITY_PAYLOAD')


# A single capture-only child of U. No release operation or authorization.
TECHNICAL_CAPTURE_PARENT = 'e66a44e90628154546d0190c69ba5030828d972a'
TECHNICAL_CAPTURE_PARENT_TREE = 'b3fb77a393b23bbdf233fc180b0189976d86eea0'
TECHNICAL_CAPTURE_IDENTITY = 'Codex <codex@openai.com> 1795038091 +0000'
TECHNICAL_CAPTURE_MESSAGE = 'Separate exact extraordinary artifact capture from public certification'
TECHNICAL_CAPTURE_FILES = frozenset(['.github/workflows/statistical-levels-release.yml', 'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/authority-transition/capture-cases.mjs', 'scripts/statistical-levels-ci/authority-transition/capture_cases.py', 'scripts/statistical-levels-ci/authority-transition/compat_cases.py', 'scripts/statistical-levels-ci/authority-transition/inventory.json', 'scripts/statistical-levels-ci/authority-transition/next_security_cases.py', 'scripts/statistical-levels-ci/authority-transition/p4_cases.py', 'scripts/statistical-levels-ci/authority-transition/run.py', 'scripts/statistical-levels-ci/historical-tests.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py', 'scripts/statistical-levels-ci/test_ci_runtime_recovery.py', 'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_publication_ci_repair.py', 'scripts/statistical-levels-ci/test_publication_closure.py', 'scripts/statistical-levels-release/SOURCE_SHA256SUMS', 'scripts/statistical-levels-release/scripts/capture-full-product.mjs', 'scripts/statistical-levels-release/scripts/preview-qa.mjs', 'scripts/statistical-levels-release/source-manifest.json', 'scripts/statistical-levels-release/workflow-freeze.json'])
TECHNICAL_CAPTURE_PAYLOAD_SHA256 = '739b0098eb16fa28f8e6baab79f12c095f2271afa7c73a63cbb59022735fd095'
TECHNICAL_CAPTURE_PIN = rb"(?m)^(TECHNICAL_CAPTURE_PAYLOAD_SHA256 = ')([a-f0-9]{64})('\n)"


def technical_capture_payload(git, root):
    rows = []
    for name in sorted(TECHNICAL_CAPTURE_FILES):
        data = git.blob(root,name)
        if name == 'scripts/statistical-levels-ci/admission.py':
            pins = re.findall(TECHNICAL_CAPTURE_PIN,data)
            need(len(pins) == 1 and pins[0][1].decode() == TECHNICAL_CAPTURE_PAYLOAD_SHA256, 'TECHNICAL_CAPTURE_PIN')
            data = re.sub(TECHNICAL_CAPTURE_PIN,lambda m:m[1]+b'0'*64+m[3],data)
        elif name == 'scripts/statistical-levels-ci/authority-transition/inventory.json':
            field = rb'("scripts/statistical-levels-ci/admission.py": ")[a-f0-9]{64}("[\n,])'
            need(len(re.findall(field,data)) == 1, 'TECHNICAL_CAPTURE_INVENTORY_PIN')
            data = re.sub(field,lambda m:m[1]+b'0'*64+m[2],data)
        rows.append({'path':name,'mode':'100644','sha256':digest(data)})
    return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())


def validate_technical_capture(git, root):
    need(git.parents(root) == [TECHNICAL_CAPTURE_PARENT], 'TECHNICAL_CAPTURE_PARENT')
    need(git.text('rev-parse',TECHNICAL_CAPTURE_PARENT+'^{tree}') == TECHNICAL_CAPTURE_PARENT_TREE, 'TECHNICAL_CAPTURE_PARENT_TREE')
    need(bootstrap(git,TECHNICAL_CAPTURE_PARENT) == (TECHNICAL_CAPTURE_PARENT,[]), 'TECHNICAL_CAPTURE_ANCESTRY')
    before,after = delta(git,TECHNICAL_CAPTURE_PARENT,root,TECHNICAL_CAPTURE_FILES)
    lineage_header(git,root,git.text('rev-parse',root+'^{tree}'),TECHNICAL_CAPTURE_PARENT,
                   TECHNICAL_CAPTURE_IDENTITY,TECHNICAL_CAPTURE_IDENTITY,TECHNICAL_CAPTURE_MESSAGE,'TECHNICAL_CAPTURE_HEADER')
    for name in paths(git):
        need(after[name] == before[name] and git.blob(root,name) == git.blob(EXTRAORDINARY_BASELINE,name), 'TECHNICAL_CAPTURE_SL_IDENTITY')
    need(git.blob(root,CI) == git.blob(TECHNICAL_CAPTURE_PARENT,CI), 'TECHNICAL_CAPTURE_CI_UNCHANGED')
    wf = '.github/workflows/statistical-levels-release.yml'
    normalize = lambda data:re.sub(rb'(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}',lambda m:m[1]+b'0'*64,data)
    need(normalize(git.blob(root,wf)) == normalize(git.blob(TECHNICAL_CAPTURE_PARENT,wf)), 'TECHNICAL_CAPTURE_WORKFLOW_SCOPE')
    for name in EXTRAORDINARY_HISTORICAL_FIXTURES:
        gn = 'git' if name.endswith('/test_lineage_admission.py') else 'f.git'
        anchor = f'        if {gn}.parents(cls.root) == [a.NEXT_SECURITY_PARENT]:\n'.encode()
        addition = f'        if {gn}.parents(cls.root) == [a.TECHNICAL_CAPTURE_PARENT]:\n            cls.root = a.TECHNICAL_CAPTURE_PARENT\n'.encode()
        prior = git.blob(TECHNICAL_CAPTURE_PARENT,name)
        need(prior.count(anchor) == 1 and git.blob(root,name) == prior.replace(anchor,addition+anchor,1), 'TECHNICAL_CAPTURE_HISTORICAL_SELECTOR')
    inventory = 'scripts/statistical-levels-ci/authority-transition/inventory.json'
    current,previous = (unique_json(git.blob(ref,inventory)) for ref in [root,TECHNICAL_CAPTURE_PARENT])
    need(current['schema'] == previous['schema'], 'TECHNICAL_CAPTURE_TEST_SCHEMA')
    for key in ['python_tests','node_tests','python_modules','node_files']:
        need(len(current[key]) == len(set(current[key])) and set(previous[key]) <= set(current[key]), 'TECHNICAL_CAPTURE_TEST_INVENTORY')
    need(set(previous['files']) <= set(current['files']), 'TECHNICAL_CAPTURE_TEST_FILES')
    for name,value in current['files'].items():
        need(digest(git.blob(root,name)) == value, 'TECHNICAL_CAPTURE_TEST_BYTES')
    need(technical_capture_payload(git,root) == TECHNICAL_CAPTURE_PAYLOAD_SHA256, 'TECHNICAL_CAPTURE_PAYLOAD')


# One fixed catalog-test successor of V; no report, dependency or authority change.
CATALOG_PARENT = 'bb54caa5084dbc8ed0833ca9dcbbe3c3218db84e'
CATALOG_PARENT_TREE = '0073d5a5fcca738d6123efd6b78b4adaac85d7dd'
CATALOG_IDENTITY = 'Codex <codex@openai.com> 1795163308 +0000'
CATALOG_MESSAGE = 'Bind historical and current November report catalogs to their exact Git subjects'
CATALOG_FILES = frozenset(['.github/workflows/statistical-levels-release.yml', 'lib/reports/september-corrective-release.test.mts', 'scripts/statistical-levels-ci/admission.py', 'scripts/statistical-levels-ci/authority-transition/capture_cases.py', 'scripts/statistical-levels-ci/authority-transition/catalog_cases.py', 'scripts/statistical-levels-ci/authority-transition/compat_cases.py', 'scripts/statistical-levels-ci/authority-transition/inventory.json', 'scripts/statistical-levels-ci/authority-transition/next_security_cases.py', 'scripts/statistical-levels-ci/authority-transition/p4_cases.py', 'scripts/statistical-levels-ci/authority-transition/run.py', 'scripts/statistical-levels-ci/historical-tests.py', 'scripts/statistical-levels-ci/test_ci_recovery_admission.py', 'scripts/statistical-levels-ci/test_ci_runtime_recovery.py', 'scripts/statistical-levels-ci/test_lineage_admission.py', 'scripts/statistical-levels-ci/test_publication_ci_repair.py', 'scripts/statistical-levels-ci/test_publication_closure.py', 'scripts/statistical-levels-release/SOURCE_SHA256SUMS', 'scripts/statistical-levels-release/scripts/capture-full-product.mjs', 'scripts/statistical-levels-release/source-manifest.json', 'scripts/statistical-levels-release/workflow-freeze.json'])
CATALOG_PAYLOAD_SHA256 = '13afd9a00fdcc1a6c17f7345b21a08ffe763fee0f6ca3cbf28f9f8723b3a3b90'
CATALOG_PIN = rb"(?m)^(CATALOG_PAYLOAD_SHA256 = ')([a-f0-9]{64})('\n)"
CATALOG_TEST = 'lib/reports/september-corrective-release.test.mts'


def catalog_payload(git, root):
    rows = []
    for name in sorted(CATALOG_FILES):
        data = git.blob(root,name)
        if name == 'scripts/statistical-levels-ci/admission.py':
            pins = re.findall(CATALOG_PIN,data)
            need(len(pins) == 1 and pins[0][1].decode() == CATALOG_PAYLOAD_SHA256, 'CATALOG_PIN')
            data = re.sub(CATALOG_PIN,lambda m:m[1]+b'0'*64+m[3],data)
        elif name == 'scripts/statistical-levels-ci/authority-transition/inventory.json':
            field = rb'("scripts/statistical-levels-ci/admission.py": ")[a-f0-9]{64}("[\n,])'
            need(len(re.findall(field,data)) == 1, 'CATALOG_INVENTORY_PIN')
            data = re.sub(field,lambda m:m[1]+b'0'*64+m[2],data)
        rows.append({'path':name,'mode':'100644','sha256':digest(data)})
    return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())


def validate_catalog(git, root):
    need(git.parents(root) == [CATALOG_PARENT], 'CATALOG_PARENT')
    need(git.text('rev-parse',CATALOG_PARENT+'^{tree}') == CATALOG_PARENT_TREE, 'CATALOG_PARENT_TREE')
    need(bootstrap(git,CATALOG_PARENT) == (CATALOG_PARENT,[]), 'CATALOG_ANCESTRY')
    before,after = delta(git,CATALOG_PARENT,root,CATALOG_FILES)
    lineage_header(git,root,git.text('rev-parse',root+'^{tree}'),CATALOG_PARENT,
                   CATALOG_IDENTITY,CATALOG_IDENTITY,CATALOG_MESSAGE,'CATALOG_HEADER')
    for name in paths(git):
        need(after[name] == before[name] and git.blob(root,name) == git.blob(EXTRAORDINARY_BASELINE,name), 'CATALOG_SL_IDENTITY')
    need(git.blob(root,CI) == git.blob(CATALOG_PARENT,CI), 'CATALOG_CI_UNCHANGED')
    wf = '.github/workflows/statistical-levels-release.yml'
    normalize = lambda data:re.sub(rb'(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}',lambda m:m[1]+b'0'*64,data)
    need(normalize(git.blob(root,wf)) == normalize(git.blob(CATALOG_PARENT,wf)), 'CATALOG_WORKFLOW_SCOPE')
    for name in EXTRAORDINARY_HISTORICAL_FIXTURES:
        gn = 'git' if name.endswith('/test_lineage_admission.py') else 'f.git'
        anchor = f'        if {gn}.parents(cls.root) == [a.TECHNICAL_CAPTURE_PARENT]:\n'.encode()
        addition = f'        if {gn}.parents(cls.root) == [a.CATALOG_PARENT]:\n            cls.root = a.CATALOG_PARENT\n'.encode()
        prior = git.blob(CATALOG_PARENT,name)
        need(prior.count(anchor) == 1 and git.blob(root,name) == prior.replace(anchor,addition+anchor,1), 'CATALOG_HISTORICAL_SELECTOR')
    inventory = 'scripts/statistical-levels-ci/authority-transition/inventory.json'
    current,previous = (unique_json(git.blob(ref,inventory)) for ref in [root,CATALOG_PARENT])
    need(current['schema'] == previous['schema'], 'CATALOG_TEST_SCHEMA')
    for key in ['python_tests','node_tests','python_modules','node_files']:
        need(len(current[key]) == len(set(current[key])) and set(previous[key]) <= set(current[key]), 'CATALOG_TEST_INVENTORY')
    need(set(previous['files']) <= set(current['files']), 'CATALOG_TEST_FILES')
    for name,value in current['files'].items():
        need(digest(git.blob(root,name)) == value, 'CATALOG_TEST_BYTES')
    need(catalog_payload(git,root) == CATALOG_PAYLOAD_SHA256, 'CATALOG_PAYLOAD')


def technical_capture_identity(git):
    """Read-only, credential-free artifact facts; never a grant or public QA.

    Selection is by actual Git ancestry, followed by the closed P4 seal. A data
    child (even of this exact commit) must use the ordinary future-data capture.
    """
    import stat
    head = git.text('rev-parse','HEAD')
    catalog = git.parents(head) == [CATALOG_PARENT]
    if catalog:
        before,after = git.tree(CATALOG_PARENT),git.tree(head)
        # V also permits ordinary data children; they retain future-data capture.
        if set(before) == set(after) and {p for p in before if before[p] != after[p]} == paths(git):
            return None
    if not catalog and git.parents(head) != [TECHNICAL_CAPTURE_PARENT]:
        return None
    need(bootstrap(git,head) == (head,[]), 'TECHNICAL_CAPTURE_ROOT')
    entries = git.tree(head)
    tracked = git('ls-files','-z').split(b'\0')
    need(set(p.decode() for p in tracked if p) == set(entries), 'TECHNICAL_CAPTURE_INDEX')
    records = []
    for raw in sorted(p for p in tracked if p):
        name = raw.decode(); file = git.root / name
        need(file.resolve() == file.absolute(), 'TECHNICAL_CAPTURE_SYMLINK')
        info = file.lstat()
        need(stat.S_ISREG(info.st_mode), 'TECHNICAL_CAPTURE_FILE_TYPE')
        data = file.read_bytes()
        blob = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        mode = '100755' if info.st_mode & 0o111 else '100644'
        need(entries[name] == (mode,blob), 'TECHNICAL_CAPTURE_CHECKOUT_BYTES')
        records.append({'exists':True,'path_hex':raw.hex(),'sha256':digest(data),'tracked':True,
                        'worktree_file_type':'REGULAR_FILE','worktree_mode':format(stat.S_IMODE(info.st_mode),'06o')})
    subject = {'mode_encoding':'six-octal-digits-of-lstat-S_IMODE','path_encoding':'hex-of-exact-git-path-bytes',
               'records':records,'schema':'statistical-levels.local-qualification-subject.v2',
               'symlink_hash_rule':'sha256-of-link-text-bytes-without-following-target'}
    snapshot = {p:digest(git.blob(head,p)) for p in sorted(paths(git))}
    need(git.text('rev-parse','HEAD') == head, 'TECHNICAL_CAPTURE_HEAD_DRIFT')
    return {'schema':'sl.technical-capture-identity.v1','scope':'ARTIFACT_ONLY_NOT_RELEASE_AUTHORIZATION',
            'sha':head,'tree':git.text('rev-parse',head+'^{tree}'),'parent':CATALOG_PARENT if catalog else TECHNICAL_CAPTURE_PARENT,
            'baseline_git_sha':EXTRAORDINARY_BASELINE,'snapshot_files':len(snapshot),
            'snapshot_manifest_sha256':digest(json.dumps(snapshot,sort_keys=True,separators=(',',':')).encode()),
            'payload_sha256':CATALOG_PAYLOAD_SHA256 if catalog else TECHNICAL_CAPTURE_PAYLOAD_SHA256,
            'local_subject_sha256':digest(json.dumps(subject,sort_keys=True,separators=(',',':')).encode()),
            'release_authority_issued':False}


def bootstrap(git, head):
    # Exact lineage transitions only. The editorial commit alone is never admitted; its CI failure is never reused.
    if LINEAGE_REGISTRY not in git.tree(head):
        return zod_bootstrap(git, head)  # pre-epoch lineages keep their exact behaviour and error codes
    data_paths = paths(git)
    chain, cursor = [], head
    for _ in range(4096):
        parents = git.parents(cursor)
        need(len(parents) == 1, 'LINEAGE_ORDERED_SINGLE_PARENT')
        a, b = git.tree(parents[0]), git.tree(cursor)
        changed = {p for p in a.keys() | b.keys() if a.get(p) != b.get(p)}
        if changed != data_paths:
            break
        for p in changed:
            need(b.get(p, (None,))[0] == '100644' and (p not in a or a[p][0] == '100644'), 'DELTA_MODE')
        chain.append(cursor)
        cursor = parents[0]
    else:
        raise ValueError('LINEAGE_BOUND')
    if git.parents(cursor) == [CATALOG_PARENT]:
        validate_catalog(git,cursor)
        current,start = git.tree(head),git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'CATALOG_SUCCESSOR_CODE_CHANGED')
        return cursor,chain
    if git.parents(cursor) == [TECHNICAL_CAPTURE_PARENT]:
        validate_technical_capture(git,cursor)
        current,start = git.tree(head),git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'TECHNICAL_CAPTURE_SUCCESSOR_CODE_CHANGED')
        return cursor,chain
    if git.parents(cursor) == [NEXT_SECURITY_PARENT]:
        validate_next_security(git,cursor)
        current,start = git.tree(head),git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'NEXT_SECURITY_SUCCESSOR_CODE_CHANGED')
        return cursor,chain
    if git.parents(cursor) == [COMPAT_PARENT]:
        validate_compatibility(git,cursor)
        current,start = git.tree(head),git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'COMPAT_SUCCESSOR_CODE_CHANGED')
        return cursor,chain
    if git.parents(cursor) == [MEMORY_CI_BASE]:
        validate_memory_ci(git, cursor)
        current, start = git.tree(head), git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'MEMORY_CI_SUCCESSOR_CODE_CHANGED')
        return cursor, chain
    if git.parents(cursor) == [RUNTIME_CI_BASE]:
        validate_runtime_ci(git, cursor)
        current, start = git.tree(head), git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'RUNTIME_CI_SUCCESSOR_CODE_CHANGED')
        return cursor, chain
    if git.parents(cursor) == [PUBLICATION_CI_REPAIR_BASE]:
        validate_publication_ci_repair(git, cursor)
        current, start = git.tree(head), git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'PUBLICATION_CI_REPAIR_SUCCESSOR_CODE_CHANGED')
        return cursor, chain
    if git.parents(cursor) == [PUBLICATION_CLOSURE_BASE]:
        validate_publication_closure(git,cursor)
        current, start = git.tree(head), git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'PUBLICATION_SUCCESSOR_CODE_CHANGED')
        return cursor, chain
    if git.parents(cursor) == [CI_REPAIR_BASE]:
        validate_ci_repair(git, cursor)
        current, start = git.tree(head), git.tree(cursor)
        need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'CI_REPAIR_SUCCESSOR_CODE_CHANGED')
        return cursor, chain
    registry = lineage_registry(git, cursor)
    need(registry is not None, 'LINEAGE_REGISTRY')  # the registry is a frozen non-data path: every lineage ancestor below the head carries it
    entry = registry[-1]
    if git.parents(cursor) != [entry['editorial']['sha']]:
        delta(git, git.parents(cursor)[0], cursor, data_paths)  # a malformed data successor is EXACT_DELTA, as before
        raise ValueError('LINEAGE_REBIND_PARENT')
    validate_lineage_editorial(git, entry)
    validate_lineage_rebind(git, cursor, entry)
    if entry['index'] == 1:
        # The pinned base must be admitted by the Zod epoch itself (its root or an exact data successor of it): zod_bootstrap
        # delegates older heads to earlier epochs, so the returned root's parent is checked explicitly.
        zod_root, _ = zod_bootstrap(git, entry['parent'])
        need(git.parents(zod_root) == [ZOD_BASE], 'LINEAGE_FIRST_PARENT_EPOCH')
    else:
        previous_root, previous_data_chain = bootstrap(git, entry['parent'])
        if extraordinary_entry(entry):
            need(previous_root == EXTRAORDINARY_HISTORY_ROOT and previous_data_chain == [EXTRAORDINARY_EDITORIAL['parent']] and git.parents(previous_root) == [MEMORY_CI_BASE], 'EXTRAORDINARY_ROOT')
        else:
            need(git.parents(previous_root) != [MEMORY_CI_BASE], 'MEMORY_CI_DATA_SUCCESSORS_ONLY')
            previous_entry = lineage_entry(git, previous_root)
            need(previous_entry is None or not extraordinary_entry(previous_entry), 'EXTRAORDINARY_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [CATALOG_PARENT], 'CATALOG_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [TECHNICAL_CAPTURE_PARENT], 'TECHNICAL_CAPTURE_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [NEXT_SECURITY_PARENT], 'NEXT_SECURITY_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [COMPAT_PARENT], 'COMPAT_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [RUNTIME_CI_BASE], 'RUNTIME_CI_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [PUBLICATION_CI_REPAIR_BASE], 'PUBLICATION_CI_REPAIR_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [PUBLICATION_CLOSURE_BASE], 'PUBLICATION_DATA_SUCCESSORS_ONLY')
        need(git.parents(previous_root) != [CI_REPAIR_BASE], 'CI_REPAIR_DATA_SUCCESSORS_ONLY')
        need(previous_root == entry['previous_rebind'], 'LINEAGE_PREVIOUS_REBIND')
        need(lineage_registry(git, previous_root) == registry[:-1], 'LINEAGE_REGISTRY_CHAIN')
        frozen = LINEAGE_EPOCH_FILES - LINEAGE_REBIND_FILES
        if extraordinary_entry(entry):
            frozen -= EXTRAORDINARY_CONTROL_FILES | EXTRAORDINARY_TEST_FILES | EXTRAORDINARY_HISTORICAL_FIXTURES
        for name in frozen:
            need(git.tree(cursor).get(name) == git.tree(previous_root).get(name), 'LINEAGE_CODE_FROZEN')
    current, start = git.tree(head), git.tree(cursor)
    need(set(current) == set(start) and all(current[p] == start[p] for p in current if p not in data_paths), 'LINEAGE_SUCCESSOR_CODE_CHANGED')
    return cursor, chain


def reconciled_report_hashes(git, head):
    """Current report bytes only from the exact reconciled, qualified lineage.

    Historical report hashes are still authenticated by CI at their original
    commits. This mapping cannot admit arbitrary current report changes.
    """
    if subprocess.run(['git', 'merge-base', '--is-ancestor', RECONCILED, head], cwd=git.root,
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0:
        return {}
    root, _ = bootstrap(git, head)
    if git.parents(root) == [CATALOG_PARENT]:
        result = reconciled_report_hashes(git,CATALOG_PARENT)
        result[CATALOG_TEST] = digest(git.blob(root,CATALOG_TEST))
        return result
    if git.parents(root) == [TECHNICAL_CAPTURE_PARENT]:
        return reconciled_report_hashes(git,TECHNICAL_CAPTURE_PARENT)
    if git.parents(root) == [NEXT_SECURITY_PARENT]:
        return reconciled_report_hashes(git,NEXT_SECURITY_PARENT)
    if git.parents(root) == [COMPAT_PARENT]:
        return reconciled_report_hashes(git,COMPAT_PARENT)
    if git.parents(root) == [MEMORY_CI_BASE]:
        return reconciled_report_hashes(git, MEMORY_CI_BASE)
    if git.parents(root) == [RUNTIME_CI_BASE]:
        return reconciled_report_hashes(git, RUNTIME_CI_BASE)
    if git.parents(root) == [PUBLICATION_CI_REPAIR_BASE]:
        return reconciled_report_hashes(git, PUBLICATION_CI_REPAIR_BASE)
    if git.parents(root) == [PUBLICATION_CLOSURE_BASE]:
        return reconciled_report_hashes(git,PUBLICATION_CLOSURE_BASE)
    if git.parents(root) == [CI_REPAIR_BASE]:
        return reconciled_report_hashes(git, CI_REPAIR_BASE)
    if lineage_entry(git, root) is not None:
        registry = lineage_registry(git, root)
        result = reconciled_report_hashes(git, registry[0]['parent'])
        for entry in registry:
            for name, item in entry['editorial']['delta'].items():
                if extraordinary_entry(entry) and name in paths(git):
                    continue
                if item['status'] == 'D':
                    result.pop(name, None)
                else:
                    result[name] = item['sha256']
        return result
    if git.parents(root) == [ZOD_BASE]:
        return reconciled_report_hashes(git, ZOD_BASE)
    if git.parents(root) == [DURABILITY_BASE]:
        return reconciled_report_hashes(git, DURABILITY_BASE)
    if git.parents(root) == [REPORT_CONTRACT_BASE]:
        result = reconciled_report_hashes(git, REPORT_CONTRACT_BASE)
        for name in REPORT_CONTRACT_TEST_FILES:
            result[name] = digest(git.blob(root, name))
        return result
    evidence = unique_json(git.blob(root, RECONCILIATION_EVIDENCE))
    result = {p: v['sha256'] for p, v in evidence['delta'].items()}
    if git.parents(root) == [SECURITY_BASE]:
        for name in SECURITY_REPORT_FILES:
            need(name in result, 'SECURITY_REPORT_PATH')
            result[name] = digest(git.blob(root, name))
    elif git.parents(root) == [CAPTURE_RECOVERY_BASE]:
        for name in SECURITY_REPORT_FILES:
            need(name in result and git.tree(root)[name] == git.tree(CAPTURE_RECOVERY_BASE)[name], 'CAPTURE_RECOVERY_REPORT_BYTES')
            result[name] = digest(git.blob(CAPTURE_RECOVERY_BASE, name))
    return result


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


def bind_receipt(git, head, run, receipt, original_run=None):
    expected = {'schema', 'repository', 'repository_id', 'workflow_id', 'workflow_path', 'event', 'branch', 'run_id', 'run_attempt', 'source_sha', 'published_sha', 'published_tree', 'provenance_sha256', 'created_at', 's3', 'metadata_objects'}
    if 'scripts/statistical-levels-daily.mjs' in git.tree(run['head_sha']):
        expected.add('daily_admission')
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
    if 'daily_admission' in receipt:
        validate_daily_selection(receipt, run, provenance, original_run)
    else:
        need(instant(run['run_started_at']) <= instant(provenance['CONFIG']['SNAPSHOT_CUTOFF']) <= instant(receipt['created_at']), 'SNAPSHOT_RUN_TIME')
    expected_s3 = {'bucket': BUCKET, 'region': REGION, 'prefix': 'statistical-levels/raw-authority/' + qualified['baseline'] + '/',
        'baseline': qualified['baseline'], 'seal_sha256': qualified['seal_sha256'], 'seal_version': qualified['seal_version'],
        'principal': 'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/sl-raw-' + str(run['id']) + '-' + str(run['run_attempt']),
        'exact_version_read_count': 45, 'evidence_class': 'AUTHENTICATED_PRODUCER_EXACT_VERSION_READBACK'}
    need(receipt['s3'] == expected_s3, 'RECEIPT_S3')
    return qualified


def validate_daily_selection(receipt, run, provenance, original_run=None):
    d = receipt['daily_admission']
    need(set(d) == {'mode', 'day', 'selection'} and d['mode'] in ['FETCH_NEW', 'REUSE_SEALED'], 'DAILY_RECEIPT_SCHEMA')
    ref = d['selection']
    need(set(ref) == {'key', 'version', 'sha256', 'utf8'} and ref['key'] == 'statistical-levels/raw-authority/daily/' + d['day'] + '/SELECTED.json', 'DAILY_SELECTION_REF')
    need(type(ref['version']) is str and ref['version'] not in ['', 'null'] and digest(ref['utf8'].encode()) == ref['sha256'], 'DAILY_SELECTION_INTEGRITY')
    selected = unique_json(ref['utf8'])
    need(set(selected) == {'schema', 'day', 'run_id', 'source_sha', 'producer_run_id', 'producer_attempt', 'created_at'}, 'DAILY_SELECTION_SCHEMA')
    need(selected['schema'] == 'statistical-levels.daily-selection.v1' and selected['day'] == d['day'] == provenance['CONFIG']['SNAPSHOT_CUTOFF'][:10], 'DAILY_SELECTION_DAY')
    need(selected['run_id'] == provenance['BASELINE_ID'] and selected['source_sha'] == run['head_sha'] == provenance['GENERATOR_COMMIT'], 'DAILY_SELECTION_SOURCE')
    need(instant(selected['created_at']) <= instant(provenance['CONFIG']['SNAPSHOT_CUTOFF']) <= instant(receipt['created_at']), 'DAILY_SELECTION_TIME')
    if d['mode'] == 'FETCH_NEW':
        need((selected['producer_run_id'], selected['producer_attempt']) == (str(run['id']), str(run['run_attempt'])), 'DAILY_SELECTION_RUN')
        need(instant(run['run_started_at']) <= instant(selected['created_at']), 'DAILY_SELECTION_RUN_TIME')
        need(original_run is None, 'DAILY_UNEXPECTED_ORIGINAL_RUN')
    else:
        need(original_run is not None, 'DAILY_REUSE_NATIVE_ORIGIN_REQUIRED')
        run_identity(original_run, PRODUCER_ID, PRODUCER, run['head_sha'])
        need((str(original_run['id']), str(original_run['run_attempt'])) == (selected['producer_run_id'], selected['producer_attempt']), 'DAILY_REUSE_ORIGINAL_RUN')
        need(original_run['event'] in ['schedule', 'workflow_dispatch'] and original_run['status'] == 'completed' and original_run['conclusion'] in ['failure', 'cancelled', 'timed_out'], 'DAILY_REUSE_ORIGINAL_TERMINAL')
        need(instant(original_run['run_started_at']) <= instant(selected['created_at']) <= instant(provenance['CONFIG']['SNAPSHOT_CUTOFF']) <= instant(original_run['updated_at']) <= instant(run['run_started_at']), 'DAILY_REUSE_NATIVE_TIME')
        need((original_run['id'], original_run['run_attempt']) != (run['id'], run['run_attempt']), 'DAILY_REUSE_SAME_RUN')


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
    qualified = []
    for r in listing['workflow_runs']:
        run_identity(r, CI_ID, CI, parent)
        need(r['event'] in ['push', 'workflow_run'] and r['status'] == 'completed' and r['conclusion'] == 'success', 'PARENT_CI_NOT_PASS')
        jobs = api.get('/actions/runs/' + str(r['id']) + '/attempts/' + str(r['run_attempt']) + '/jobs?per_page=100')
        need(jobs['total_count'] == len(jobs['jobs']) == 1, 'PARENT_JOB_SET')
        job = jobs['jobs'][0]
        need(job['name'] == 'validate' and job['status'] == 'completed', 'PARENT_JOB')
        if r['event'] == 'workflow_run' and job['conclusion'] == 'skipped':
            # A native no-op CI run is not a qualification, despite GitHub's
            # aggregate success label. It can never satisfy the parent gate.
            continue
        need(job['conclusion'] == 'success', 'PARENT_JOB')
        steps = {s['name']: s for s in job['steps']}
        for name in ['Bind qualification to event SHA and governed metadata-repair successor lineage',
                     'Test bounded CI admission and producer readback',
                     'Authenticate fresh native capture handoff',
                     'Run existing release, native proof, policy and security tests',
                     'Reject missing or skipped mandatory coverage and candidate drift',
                     'Revalidate exact branch and emit bounded qualification evidence']:
            need(name in steps and steps[name]['status'] == 'completed' and steps[name]['conclusion'] == 'success', 'PARENT_MANDATORY_STEP')
        qualified.append(r)
    need(len(qualified) == 1, 'PARENT_CI_AMBIGUOUS_OR_ABSENT')
    r = qualified[0]
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
        catalog_root = git.parents(root) == [CATALOG_PARENT]
        technical_capture_root = git.parents(root) == [TECHNICAL_CAPTURE_PARENT]
        next_security_root = git.parents(root) == [NEXT_SECURITY_PARENT]
        compat_root = git.parents(root) == [COMPAT_PARENT]
        memory_root = git.parents(root) == [MEMORY_CI_BASE]
        runtime_root = git.parents(root) == [RUNTIME_CI_BASE]
        publication_ci_repair_root = git.parents(root) == [PUBLICATION_CI_REPAIR_BASE]
        closure_root = git.parents(root) == [PUBLICATION_CLOSURE_BASE]
        repair_root = git.parents(root) == [CI_REPAIR_BASE]
        daily_root = git.parents(root) == [RECONCILED]
        security_root = git.parents(root) == [SECURITY_BASE]
        capture_root = git.parents(root) == [CAPTURE_RECOVERY_BASE]
        report_root = git.parents(root) == [REPORT_CONTRACT_BASE]
        durability_root = git.parents(root) == [DURABILITY_BASE]
        zod_root = git.parents(root) == [ZOD_BASE]
        lineage = lineage_entry(git, root)
        lineage_root = lineage is not None
        expected_before = COMPAT_PARENT if catalog_root or technical_capture_root or next_security_root or compat_root else MEMORY_CI_BASE if memory_root else RUNTIME_CI_BASE if runtime_root else PUBLICATION_CI_REPAIR_BASE if publication_ci_repair_root else PUBLICATION_CLOSURE_BASE if closure_root else CI_REPAIR_BASE if repair_root else lineage['editorial']['sha'] if lineage_root else ZOD_BASE if zod_root else DURABILITY_BASE if durability_root else REPORT_CONTRACT_BASE if report_root else CAPTURE_RECOVERY_BASE if capture_root else SECURITY_BASE if security_root else REMOTE_BEFORE_RECONCILIATION if daily_root else BASE
        need(env['GITHUB_EVENT_NAME'] == 'push' and event['before'] == expected_before and event['after'] == head and event['ref'] == 'refs/heads/' + BRANCH and not event['forced'] and not event['deleted'] and not event['created'], 'BOOTSTRAP_EVENT')
        if catalog_root or technical_capture_root or next_security_root or compat_root or memory_root or runtime_root or publication_ci_repair_root or closure_root or repair_root or daily_root or security_root or capture_root or report_root or durability_root or zod_root or lineage_root:
            recent_bytes = git.blob(root, CURRENT_DATA_EVIDENCE)
            need(digest(recent_bytes) == CURRENT_DATA_EVIDENCE_SHA256, 'CURRENT_DATA_EVIDENCE_PIN')
            recent = unique_json(recent_bytes)
            need(recent['published_sha'] == REMOTE_BEFORE_RECONCILIATION and recent['producer_run_id'] == 39791362129 and recent['producer_attempt'] == 1, 'CURRENT_DATA_EVIDENCE_IDENTITY')
            validate_data(git, recent['published_sha'], recent['source_sha'], recent['metadata_objects'])
            if catalog_root:
                mode,details = 'EXACT_CATALOG_CLOSURE_SUCCESSOR', {
                    'remote_before':COMPAT_PARENT,'technical_parent':CATALOG_PARENT,
                    'intermediate_hosted_ci':'NOT_REQUIRED_NOT_REUSED','prior_head_hosted_ci':'FAILED_NOT_REUSED',
                    'new_hosted_qualification_required':True,'daily_successors_require_exact_parent_ci':True,
                    'native_update':{'before':COMPAT_PARENT,'after':head},
                    'data_preservation':'EXACT_82_PATHS','capture_scope':'TECHNICAL_ARTIFACT_ONLY',
                    'historical_catalog_subject':'c4bb2047ed54fd3c1fdd40f6fddd99ec187b31ce',
                    'current_catalog_subject':EXTRAORDINARY_EDITORIAL['sha'],
                    'authority_protocol_unchanged':True,'technical_successor_reusable':False,
                    'release_authority_issued':False}
            elif technical_capture_root:
                mode,details = 'EXACT_TECHNICAL_CAPTURE_SUCCESSOR', {
                    'remote_before':COMPAT_PARENT,'technical_parent':TECHNICAL_CAPTURE_PARENT,
                    'intermediate_hosted_ci':'NOT_REQUIRED_NOT_REUSED','prior_head_hosted_ci':'FAILED_NOT_REUSED',
                    'new_hosted_qualification_required':True,'daily_successors_require_exact_parent_ci':True,
                    'native_update':{'before':COMPAT_PARENT,'after':head},
                    'data_preservation':'EXACT_82_PATHS','capture_scope':'TECHNICAL_ARTIFACT_ONLY',
                    'authority_protocol_unchanged':True,'technical_successor_reusable':False,
                    'release_authority_issued':False}
            elif next_security_root:
                mode,details = 'EXACT_NEXT_SECURITY_SUCCESSOR', {
                    'remote_before':COMPAT_PARENT,'technical_parent':NEXT_SECURITY_PARENT,
                    'technical_parent_hosted_ci':'NOT_REQUIRED_NOT_REUSED','prior_head_hosted_ci':'FAILED_NOT_REUSED',
                    'new_hosted_qualification_required':True,'daily_successors_require_exact_parent_ci':True,
                    'native_update':{'before':COMPAT_PARENT,'after':head},'next_version':'16.4.5',
                    'data_preservation':'EXACT_82_PATHS','historical_subject_unchanged':True,
                    'authority_protocol_unchanged':True,'technical_successor_reusable':False,
                    'release_authority_issued':False}
            elif compat_root:
                mode,details = 'EXACT_HISTORICAL_COMPATIBILITY_SUCCESSOR', {
                    'remote_before':COMPAT_PARENT,'parent_hosted_ci':'FAILED_NOT_REUSED',
                    'failed_run_id':44196885302,'failed_attempt':1,
                    'new_hosted_qualification_required':True,'daily_successors_require_exact_parent_ci':True,
                    'data_preservation':'EXACT_82_PATHS','historical_subject_unchanged':True,
                    'runtime_unchanged':True,'authority_protocol_unchanged':True,
                    'technical_successor_reusable':False,'release_authority_issued':False}
            elif memory_root:
                mode, details = 'EXACT_CI_MEMORY_RECOVERY_BOOTSTRAP', {
                    'remote_before': MEMORY_CI_BASE, 'parent_hosted_ci': 'NOT_QUALIFIED_NOT_REUSED',
                    'candidate_hosted_ci': 'REQUIRED_NOT_YET_CERTIFIED',
                    'new_hosted_qualification_required': True, 'daily_successors_require_exact_parent_ci': True,
                    'data_preservation': 'EXACT_82_PATHS', 'historical_subject_unchanged': True,
                    'local_memory_measurement_is_hosted_qualification': False, 'release_authority_issued': False}
            elif runtime_root:
                mode, details = 'EXACT_CI_RUNTIME_RECOVERY_BOOTSTRAP', {
                    'remote_before': RUNTIME_CI_BASE, 'unqualified_run_id': 43760999722, 'unqualified_attempts': [1, 2],
                    'parent_hosted_ci': 'NOT_QUALIFIED_NOT_REUSED', 'candidate_hosted_ci': 'REQUIRED_NOT_YET_CERTIFIED',
                    'new_hosted_qualification_required': True, 'daily_successors_require_exact_parent_ci': True,
                    'data_preservation': 'EXACT_82_PATHS', 'historical_subject_unchanged': True,
                    'release_authority_issued': False}
            elif publication_ci_repair_root:
                mode, details = 'EXACT_PUBLICATION_CI_REPAIR_BOOTSTRAP', {
                    'remote_before': PUBLICATION_CI_REPAIR_BASE, 'failed_run_id': 43753556930,
                    'parent_hosted_ci': 'FAILED_NOT_REUSED', 'candidate_hosted_ci': 'REQUIRED_NOT_YET_CERTIFIED',
                    'new_hosted_qualification_required': True, 'daily_successors_require_exact_parent_ci': True,
                    'data_preservation': 'EXACT_82_PATHS', 'historical_subject_unchanged': True,
                    'release_authority_issued': False}
            elif closure_root:
                prior = parent_ci(api,PUBLICATION_CLOSURE_BASE)
                mode, details = 'EXACT_PUBLICATION_CLOSURE_BOOTSTRAP', {
                    'remote_before':PUBLICATION_CLOSURE_BASE,'certified_recovery_root':PUBLICATION_RECOVERY_ROOT,
                    'parent_ci':prior,'r1_hosted_ci':'FAILED_NOT_REUSED','data_preservation':'EXACT_82_PATHS',
                    'candidate_hosted_ci':'REQUIRED_NOT_YET_CERTIFIED','new_hosted_qualification_required':True,
                    'daily_successors_require_exact_parent_ci':True,'daily_release_activation':'DISABLED_UNTIL_FIRST_PUBLISHED_AND_FOUNDER',
                    'release_authority_issued':False}
            elif repair_root:
                mode, details = 'EXACT_R1_CI_REPAIR_BOOTSTRAP', {
                    'remote_before': CI_REPAIR_BASE, 'r1_sha': CI_REPAIR_R1,
                    'r1_hosted_ci': 'FAILED_NOT_REUSED', 'failed_run_id': 42536568040,
                    'failed_attempts': [1, 2, 3], 'parent_hosted_ci': 'NOT_REUSED',
                    'candidate_hosted_ci': 'REQUIRED_NOT_YET_CERTIFIED',
                    'data_head': CI_REPAIR_BASE, 'data_preservation': 'EXACT_82_PATHS',
                    'historical_subject_unchanged': True, 'new_hosted_qualification_required': True,
                    'daily_successors_require_exact_parent_ci': True, 'release_authority_issued': False}
            elif lineage_root:
                mode, details = 'EXACT_LINEAGE_TRANSITION_BOOTSTRAP', {'transition_index': lineage['index'],
                    'editorial_sha': lineage['editorial']['sha'], 'editorial_tree': lineage['editorial']['tree'],
                    'editorial_parent': lineage['parent'], 'remote_before': expected_before,
                    'editorial_hosted_ci': 'FAILED_NOT_REUSED', 'data_head': REMOTE_BEFORE_RECONCILIATION,
                    'historical_qualification_reused': True, 'new_hosted_qualification_required': True,
                    'report_source': REPORT_PARENT, 'production_base': lineage['editorial']['sha'],
                    'controller_policy_rebind_required': not extraordinary_entry(lineage), 'release_authority_issued': False}
                if extraordinary_entry(lineage):
                    details.update(production_base=EXTRAORDINARY_BASELINE, authority_transition_required=True, original_marker_preserved=True, editorial_hosted_ci='NOT_EXECUTED_NOT_REUSED')
            elif zod_root:
                mode, details = 'EXACT_ZOD_SECURITY_BOOTSTRAP', {'zod_base': ZOD_BASE,
                    'remote_before': expected_before, 'base_hosted_ci': 'FAILED_NOT_REUSED',
                    'failed_run_id': 40033193844, 'data_head': REMOTE_BEFORE_RECONCILIATION,
                    'historical_qualification_reused': True, 'new_hosted_qualification_required': True,
                    'report_source': REPORT_PARENT, 'dependency': 'zod@4.6.6',
                    'audit_exception_added': False}
            elif durability_root:
                mode, details = 'EXACT_PROVIDER_DURABILITY_BOOTSTRAP', {'durability_base': DURABILITY_BASE,
                    'remote_before': expected_before, 'base_hosted_ci': 'NOT_ATTRIBUTED_TO_NEW_SHA',
                    'data_head': REMOTE_BEFORE_RECONCILIATION, 'historical_qualification_reused': True,
                    'new_hosted_qualification_required': True, 'report_source': REPORT_PARENT,
                    'provider_retries_added': False, 'reservation_recovery_authorized': False}
            elif report_root:
                mode, details = 'EXACT_REPORT_CONTRACT_BOOTSTRAP', {'report_contract_base': REPORT_CONTRACT_BASE,
                    'remote_before': expected_before, 'base_hosted_ci': 'FAILED_NOT_REUSED', 'failed_run_id': 40012647047,
                    'data_head': REMOTE_BEFORE_RECONCILIATION, 'historical_qualification_reused': True,
                    'new_hosted_qualification_required': True, 'report_source': REPORT_PARENT,
                    'report_test_only_successor': sorted(REPORT_CONTRACT_TEST_FILES)}
            elif capture_root:
                mode, details = 'EXACT_CAPTURE_RECOVERY_BOOTSTRAP', {'capture_recovery_base': CAPTURE_RECOVERY_BASE,
                    'remote_before': expected_before, 'base_hosted_ci': 'FAILED_NOT_REUSED', 'failed_run_id': 40003775664,
                    'data_head': REMOTE_BEFORE_RECONCILIATION, 'historical_qualification_reused': True,
                    'new_hosted_qualification_required': True, 'report_source': REPORT_PARENT,
                    'report_test_only_successor': sorted(SECURITY_REPORT_FILES)}
            elif security_root:
                mode, details = 'EXACT_SECURITY_REPAIR_BOOTSTRAP', {'security_base': SECURITY_BASE, 'remote_before': expected_before,
                    'security_base_hosted_ci': 'FAILED_NOT_REUSED', 'failed_run_id': 39963404183,
                    'data_head': REMOTE_BEFORE_RECONCILIATION, 'historical_qualification_reused': True,
                    'new_hosted_qualification_required': True, 'report_source': REPORT_PARENT,
                    'report_test_only_successor': sorted(SECURITY_REPORT_FILES)}
            else:
                mode, details = 'EXACT_RECONCILIATION_AND_DAILY_BOOTSTRAP', {'reconciled_parent': RECONCILED, 'remote_before': expected_before,
                    'report_source': REPORT_PARENT, 'report_preservation': 'EXACT_42_PATHS', 'historical_qualification_reused': True,
                    'new_hosted_qualification_required': True, 'external_IAM_activation_required': True}
        else:
            mode, details = 'BOUNDED_CI_BOOTSTRAP', {'data_evidence': 'REUSED_INDEPENDENT_EXACT_VERSION_READBACK', 'data_head': BASE, 'hosted_ci_at_data_head': False, 'native_run_to_published_sha_receipt_at_data_head': False}
    else:
        need(env['GITHUB_EVENT_NAME'] == 'workflow_run', 'DAILY_EVENT')
        run = producer_run(api, event)
        need(run['head_sha'] == git.parents(head)[0], 'SOURCE_IS_EXACT_PARENT')
        prior = parent_ci(api, run['head_sha'])
        receipt, artifact = receipt_artifact(api, run)
        original_run = None
        if receipt.get('daily_admission', {}).get('mode') == 'REUSE_SEALED':
            selected = unique_json(receipt['daily_admission']['selection']['utf8'])
            need(re.fullmatch('[1-9][0-9]*', selected['producer_run_id']) and re.fullmatch('[1-9][0-9]*', selected['producer_attempt']), 'DAILY_REUSE_NATIVE_ID')
            original_run = api.get('/actions/runs/' + selected['producer_run_id'] + '/attempts/' + selected['producer_attempt'])
        qualified = bind_receipt(git, head, run, receipt, original_run)
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
