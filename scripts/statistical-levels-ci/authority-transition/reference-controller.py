"""Pure release state machine. No credentials, URLs, keys or policy from callers.

Adapters are server-owned; injecting adapters is a LOCAL TEST seam only. The
Lambda handler never deserializes adapters or code from an invocation.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
POLICY = {'allowlist': ['lib/statistical-levels/generated-provenance.json', 'lib/statistical-levels/generated/assets/AIQ.json', 'lib/statistical-levels/generated/assets/BOTZ.json', 'lib/statistical-levels/generated/assets/BTCUSD.json', 'lib/statistical-levels/generated/assets/CIBR.json', 'lib/statistical-levels/generated/assets/DIA.json', 'lib/statistical-levels/generated/assets/EEM.json', 'lib/statistical-levels/generated/assets/EFA.json', 'lib/statistical-levels/generated/assets/ETHUSD.json', 'lib/statistical-levels/generated/assets/EWJ.json', 'lib/statistical-levels/generated/assets/FINX.json', 'lib/statistical-levels/generated/assets/FXI.json', 'lib/statistical-levels/generated/assets/GLD.json', 'lib/statistical-levels/generated/assets/HYG.json', 'lib/statistical-levels/generated/assets/IEF.json', 'lib/statistical-levels/generated/assets/ITA.json', 'lib/statistical-levels/generated/assets/IWM.json', 'lib/statistical-levels/generated/assets/LQD.json', 'lib/statistical-levels/generated/assets/PAVE.json', 'lib/statistical-levels/generated/assets/PHO.json', 'lib/statistical-levels/generated/assets/QQQ.json', 'lib/statistical-levels/generated/assets/RSP.json', 'lib/statistical-levels/generated/assets/SHY.json', 'lib/statistical-levels/generated/assets/SLV.json', 'lib/statistical-levels/generated/assets/SMH.json', 'lib/statistical-levels/generated/assets/SPY.json', 'lib/statistical-levels/generated/assets/TLT.json', 'lib/statistical-levels/generated/assets/USO.json', 'lib/statistical-levels/generated/assets/UUP.json', 'lib/statistical-levels/generated/assets/VOO.json', 'lib/statistical-levels/generated/assets/XLB.json', 'lib/statistical-levels/generated/assets/XLC.json', 'lib/statistical-levels/generated/assets/XLE.json', 'lib/statistical-levels/generated/assets/XLF.json', 'lib/statistical-levels/generated/assets/XLI.json', 'lib/statistical-levels/generated/assets/XLK.json', 'lib/statistical-levels/generated/assets/XLP.json', 'lib/statistical-levels/generated/assets/XLRE.json', 'lib/statistical-levels/generated/assets/XLU.json', 'lib/statistical-levels/generated/assets/XLV.json', 'lib/statistical-levels/generated/assets/XLY.json', 'lib/statistical-levels/generated/manifest.json', 'lib/statistical-levels/generated/seasonality/AIQ.json', 'lib/statistical-levels/generated/seasonality/BOTZ.json', 'lib/statistical-levels/generated/seasonality/BTCUSD.json', 'lib/statistical-levels/generated/seasonality/CIBR.json', 'lib/statistical-levels/generated/seasonality/DIA.json', 'lib/statistical-levels/generated/seasonality/EEM.json', 'lib/statistical-levels/generated/seasonality/EFA.json', 'lib/statistical-levels/generated/seasonality/ETHUSD.json', 'lib/statistical-levels/generated/seasonality/EWJ.json', 'lib/statistical-levels/generated/seasonality/FINX.json', 'lib/statistical-levels/generated/seasonality/FXI.json', 'lib/statistical-levels/generated/seasonality/GLD.json', 'lib/statistical-levels/generated/seasonality/HYG.json', 'lib/statistical-levels/generated/seasonality/IEF.json', 'lib/statistical-levels/generated/seasonality/ITA.json', 'lib/statistical-levels/generated/seasonality/IWM.json', 'lib/statistical-levels/generated/seasonality/LQD.json', 'lib/statistical-levels/generated/seasonality/PAVE.json', 'lib/statistical-levels/generated/seasonality/PHO.json', 'lib/statistical-levels/generated/seasonality/QQQ.json', 'lib/statistical-levels/generated/seasonality/RSP.json', 'lib/statistical-levels/generated/seasonality/SHY.json', 'lib/statistical-levels/generated/seasonality/SLV.json', 'lib/statistical-levels/generated/seasonality/SMH.json', 'lib/statistical-levels/generated/seasonality/SPY.json', 'lib/statistical-levels/generated/seasonality/TLT.json', 'lib/statistical-levels/generated/seasonality/USO.json', 'lib/statistical-levels/generated/seasonality/UUP.json', 'lib/statistical-levels/generated/seasonality/VOO.json', 'lib/statistical-levels/generated/seasonality/XLB.json', 'lib/statistical-levels/generated/seasonality/XLC.json', 'lib/statistical-levels/generated/seasonality/XLE.json', 'lib/statistical-levels/generated/seasonality/XLF.json', 'lib/statistical-levels/generated/seasonality/XLI.json', 'lib/statistical-levels/generated/seasonality/XLK.json', 'lib/statistical-levels/generated/seasonality/XLP.json', 'lib/statistical-levels/generated/seasonality/XLRE.json', 'lib/statistical-levels/generated/seasonality/XLU.json', 'lib/statistical-levels/generated/seasonality/XLV.json', 'lib/statistical-levels/generated/seasonality/XLY.json'], 'source_bundle': [{'file': 'scripts/build-statistical-levels.mjs', 'SHA256': 'd26a5d548a0a0925f9336dc76c52eb89e7fd89c5d094c38100da0ed79bffeb97'}, {'file': 'scripts/statistical-levels-offline.mjs', 'SHA256': '5a4193bc3937b36ff71f48a8277be9b7aa277091bff058545cd01034f5b335f1'}, {'file': 'lib/statistical-levels/baseline-policy.mjs', 'SHA256': 'cf6f2aa44d9711d37cccd02c28f396497d2c1620dfae72c5edec1d829d423523'}, {'file': 'lib/statistical-levels/defect-repairs.mjs', 'SHA256': '5fee525b1a7e453dc149b91a92b5eb427f55c7231b031aae9f04cbde932925d1'}], 'ledger_hash': '1a26f1f84a29b9073a9abcc56d440398b4816999a6c569171c4084162b6b8a7e', 'capabilities': ['SL-CAP-001', 'SL-CAP-002', 'SL-CAP-003', 'SL-CAP-004', 'SL-CAP-005', 'SL-CAP-006', 'SL-CAP-007', 'SL-CAP-008', 'SL-CAP-009', 'SL-CAP-010', 'SL-CAP-011', 'SL-CAP-012', 'SL-CAP-013', 'SL-CAP-014', 'SL-CAP-015', 'SL-CAP-016', 'SL-CAP-017', 'SL-CAP-018', 'SL-CAP-019', 'SL-CAP-020', 'SL-CAP-021', 'SL-CAP-022', 'SL-CAP-023', 'SL-CAP-024', 'SL-CAP-025', 'SL-CAP-026', 'SL-CAP-027', 'SL-CAP-028', 'SL-CAP-029', 'SL-CAP-030', 'SL-CAP-031', 'SL-CAP-032', 'SL-CAP-033', 'SL-CAP-034', 'SL-CAP-035', 'SL-CAP-036', 'SL-CAP-037', 'SL-CAP-038', 'SL-CAP-039', 'SL-CAP-040', 'SL-CAP-041', 'SL-CAP-042', 'SL-CAP-043', 'SL-CAP-044', 'SL-CAP-045', 'SL-CAP-046', 'SL-CAP-047', 'SL-CAP-048', 'SL-CAP-049', 'SL-CAP-050', 'SL-CAP-051', 'SL-CAP-052', 'SL-CAP-053', 'SL-CAP-054', 'SL-CAP-055', 'SL-CAP-056', 'SL-CAP-057', 'SL-CAP-058', 'SL-CAP-059', 'SL-CAP-060', 'SL-CAP-061', 'SL-CAP-062', 'SL-CAP-063', 'SL-CAP-064', 'SL-CAP-065', 'SL-CAP-066', 'SL-CAP-067', 'SL-CAP-068', 'SL-CAP-069', 'SL-CAP-070', 'SL-CAP-071', 'SL-CAP-072', 'SL-CAP-073', 'SL-CAP-074', 'SL-CAP-075', 'SL-CAP-076', 'SL-CAP-077', 'SL-CAP-078', 'SL-CAP-079', 'SL-CAP-080', 'SL-CAP-081', 'SL-CAP-082', 'SL-CAP-083', 'SL-CAP-084', 'SL-CAP-085', 'SL-CAP-086', 'SL-CAP-087'], 'authority': {'BASELINE_ID': '20261107T145859578Z-0692c205-c4c8-4487-b6c0-47c629b82a60', 'SNAPSHOT_CUTOFF': '2026-11-07T15:02:50.630Z', 'RAW_MANIFEST_SHA256': '864d026099bf968e78bab53d3c504fcdb3e5865ce1f0509715cb45ca9f24ac96', 'RAW_ARCHIVE_MANIFEST_SHA256': '65635ce6fd6a83b0d50f4a2c16a850f7b5b8d07d68c6aa423276056e297e3b30', 'RAW_ARCHIVE_RELATIVE_PATH': 'statistical-levels/raw-authority/20261107T145859578Z-0692c205-c4c8-4487-b6c0-47c629b82a60/', 'RAW_ARCHIVE_ACCESS_CLASS': 'PRIVATE_S3_DURABLE', 'SCHEMA_VERSION': 'statistical-levels.snapshot.v3', 'POLICY_VERSION': 'completed-history-current-mark.v1', 'GENERATOR_COMMIT': '4dd88f2f812d02299af7d2d1538f10e8a96ddd9c', 'SOURCE_STATE': 'COMMITTED', 'GENERATED_AT': '2026-11-07T15:02:50.630Z', 'HISTORICAL_DRIFT_CAUSE': 'UNEXPLAINED', 'FOUNDER_DECISION': 'Scheduled durable raw authority updates authorized after provisioning pass', 'RAW_ARCHIVE_BUCKET': 'sl-raw-authority-f9f4587745fa332cccfe', 'RAW_ARCHIVE_REGION': 'eu-south-2', 'RAW_ARCHIVE_SEAL_SHA256': '1cee1c618b157189202da161edb55e24dbcfd08e945b275cb5fac15c14e02bf1', 'RAW_ARCHIVE_SEAL_VERSION': 'Gyjvv7YiHoe22mB29qmxVF2Ckidill1e', 'PREVIOUS_BASELINE_ID': 'STATISTICAL_LEVELS_RAW_AUTHORITY_20260906T163225Z'}, 'project': 'prj_kT4Z9GpDUghMK5Xfd9E3SzV2PvE6', 'team': 'team_TgzErUW5yorClhKhZYjLz3yT', 'repository': 'luiguiHerrera/Luiguiherrera-web', 'branch': 'vercel-deployment', 'production_branch': 'main', 'workflow_path': '.github/workflows/statistical-levels-release.yml', 'test_version': 'statistical-levels-release-qa.v1', 'controller_version': 'statistical-levels-release-controller.v2', 'repository_id': '1263772150', 'repository_owner_id': '280950454', 'workflow_name': 'Statistical Levels controlled release', 'baseline': {'production_git_sha': '8ce104066fe968026d24e0f006744f88e338585a', 'production_deployment_id': 'dpl_3aqTNqaAPksX8sYAbRqD7RjFwRe1', 'authority_run_id': '20261107T145859578Z-0692c205-c4c8-4487-b6c0-47c629b82a60', 'sealed_manifest_sha256': '1cee1c618b157189202da161edb55e24dbcfd08e945b275cb5fac15c14e02bf1', 'main_sha_observed': '9fd1b9205e40a0e68e90e780892726353175c0ae', 'publication_date_utc': '2026-11-07', 'provenance_sha256': '5c82ba4126fba9eea695fc6a28b27548f6010367e2bbce47ec5fab8e5417d375', 'adoption_commit': '83d304321a2937713942d908c811d40c15e59847'}, 'production_origin': 'https://www.luiguiherrera.com'}
TRANSITION = 'EXTRAORDINARY_EDITORIAL_AUTHORITY_TRANSITION'
# Server-owned, exact one-off authorization. No real target is authorized by this
# local candidate. Tests supply their explicit model authorization in memory.
EDITORIAL_AUTHORIZATION = None
EDITORIAL_SOURCE_IDENTITY = {'sha': 'f0b53f6d83879c2323db8fcabf2f20f06d82fade', 'parent': 'ae09a44ffce5860f511c08061f9621934eadbe08', 'tree': 'c44eadb389e02ce6c0113526ac2ca3ba6ef33adc'}
OP = 'PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE'
ADOPT = 'ADOPT_EXISTING_PRODUCTION_BASELINE'
REQUIRED = {'operation', 'candidate_git_sha', 'candidate_deployment_id', 'authority_run_id', 'sealed_manifest_sha256', 'qa_attestation_id', 'qa_attestation_hash', 'qa_attestation', 'workflow_run_id', 'workflow_execution_sha'}
CERT_FIELDS = {'production_qa_attestation_id', 'production_qa_attestation_hash'}
PROMOTION_FIELDS = {'expected_previous_production_sha', 'expected_previous_production_deployment', 'previous_publication_date'}
OPTIONAL = CERT_FIELDS | PROMOTION_FIELDS
SHA = '[a-f0-9]{40}'
HASH = '[a-f0-9]{64}'
DPL = 'dpl_[A-Za-z0-9]{10,80}'
RUN = '\\d{8}T\\d{9}Z-[a-f0-9-]{36}'

class Denied(Exception):
    """Only constant error codes may cross the handler boundary."""

def need(condition, code):
    if not condition:
        raise Denied(code)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()

def js_json(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()

def timestamp(value):
    need(isinstance(value, str) and value.endswith('Z'), 'INVALID_TIMESTAMP')
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))

def request(value):
    if type(value) is dict and value.get('operation') == TRANSITION:
        return transition_request(value)
    need(type(value) is dict and REQUIRED <= value.keys() and (value.keys() <= REQUIRED | OPTIONAL), 'REQUEST_SCHEMA')
    need(all((type(v) is str for v in value.values())), 'REQUEST_SCHEMA')
    need(value['operation'] in [OP, ADOPT], 'OPERATION_DENIED')
    need(value['operation'] == ADOPT and set(value) == REQUIRED or (value['operation'] == OP and PROMOTION_FIELDS <= value.keys()), 'REQUEST_SCHEMA')
    for key in ['candidate_git_sha', 'workflow_execution_sha'] + (['expected_previous_production_sha'] if value['operation'] == OP else []):
        need(re.fullmatch(SHA, value[key]), 'INVALID_SHA')
    for key in ['candidate_deployment_id'] + (['expected_previous_production_deployment'] if value['operation'] == OP else []):
        need(re.fullmatch(DPL, value[key]), 'INVALID_DEPLOYMENT')
    need(re.fullmatch(RUN, value['authority_run_id']), 'INVALID_AUTHORITY')
    for key in ['sealed_manifest_sha256', 'qa_attestation_hash']:
        need(re.fullmatch(HASH, value[key]), 'INVALID_HASH')
    need(re.fullmatch('[1-9][0-9]{0,19}', value['qa_attestation_id']), 'INVALID_ATTESTATION_ID')
    need(re.fullmatch('[1-9][0-9]{0,19}', value['workflow_run_id']), 'INVALID_WORKFLOW_RUN_ID')
    need(0 < len(value['qa_attestation'].encode()) < 60000, 'QA_SIZE_LIMIT')
    q = json.loads(value['qa_attestation'])
    need(encode(q).decode() == value['qa_attestation'], 'QA_NOT_CANONICAL')
    need(bool(CERT_FIELDS & value.keys()) == (CERT_FIELDS <= value.keys()), 'REQUEST_SCHEMA')
    if 'previous_publication_date' in value:
        date = value['previous_publication_date']
        need(re.fullmatch('\\d{4}-\\d{2}-\\d{2}', date) and dt.date.fromisoformat(date).isoformat() == date, 'INVALID_PUBLICATION_DATE')
    if CERT_FIELDS <= value.keys():
        need(re.fullmatch(HASH, value['production_qa_attestation_hash']) and re.fullmatch('[1-9][0-9]{0,19}', value['production_qa_attestation_id']), 'INVALID_ATTESTATION')
    return dict(value)

def validate_source(r, git, *, transition_parent=None):
    need(git['repository'] == POLICY['repository'], 'WRONG_REPOSITORY')
    need(git['sha'] == r['candidate_git_sha'], 'WRONG_SHA')
    need(git['branch'] == POLICY['branch'] and git['branch_sha'] == r['workflow_execution_sha'], 'WRONG_BRANCH')
    relation = git['comparison']
    need(relation['base_commit']['sha'] == relation['merge_base_commit']['sha'] == r['candidate_git_sha'] and type(relation['behind_by']) is int and (relation['behind_by'] == 0) and (type(relation['ahead_by']) is int) and (r['candidate_git_sha'] == r['workflow_execution_sha'] and relation['status'] == 'identical' and (relation['ahead_by'] == 0) or (r['candidate_git_sha'] != r['workflow_execution_sha'] and relation['status'] == 'ahead' and (relation['ahead_by'] > 0))), 'WORKFLOW_CANDIDATE_ANCESTRY')
    adoption = r['operation'] == ADOPT
    if adoption:
        b = POLICY['baseline']
        need(r['candidate_git_sha'] == b['production_git_sha'] and r['candidate_deployment_id'] == b['production_deployment_id'] and (r['authority_run_id'] == b['authority_run_id']) and (r['sealed_manifest_sha256'] == b['sealed_manifest_sha256']), 'BASELINE_IDENTITY_MISMATCH')
        need(git['main_sha'] == b['main_sha_observed'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
    else:
        need(git['parents'] == [r['expected_previous_production_sha']] or (git['parents'] == [POLICY['baseline']['adoption_commit']] and r['expected_previous_production_sha'] == POLICY['baseline']['production_git_sha']) or (transition_parent is not None and git['parents'] == [transition_parent]), 'ANCESTRY_MISMATCH')
    need(re.fullmatch(SHA, git['main_sha']), 'INVALID_MAIN_OBSERVATION')
    before, after = (git['parent_tree'], git['tree'])
    changed = {f for f in before.keys() | after.keys() if before.get(f) != after.get(f)}
    if not adoption:
        need(bool(changed) and changed <= set(POLICY['allowlist']) and ('lib/statistical-levels/generated-provenance.json' in changed), 'DATA_ONLY_POLICY')
    for f in POLICY['allowlist']:
        need(f in after and after[f]['mode'] == '100644' and (after[f]['type'] == 'blob'), 'GENERATED_FILE_TYPE')
    blobs = git['blobs']
    for name, data in blobs.items():
        obj = b'blob ' + str(len(data)).encode() + b'\x00' + data
        need(name in after and hashlib.sha1(obj).hexdigest() == after[name]['sha'], 'GIT_BLOB_MISMATCH')
    p = json.loads(blobs['lib/statistical-levels/generated-provenance.json'])
    c = p['CONFIG']
    need(p['SCHEMA_VERSION'] == 'statistical-levels.provenance.v1' and p['BASELINE_ID'] == c['BASELINE_ID'] == r['authority_run_id'], 'PROVENANCE_MISMATCH')
    if adoption:
        need(digest(blobs['lib/statistical-levels/generated-provenance.json']) == POLICY['baseline']['provenance_sha256'] and c == POLICY['authority'] and (p['GENERATOR_COMMIT'] == c['GENERATOR_COMMIT']), 'BASELINE_PROVENANCE_MISMATCH')
    else:
        need(p['GENERATOR_COMMIT'] == c['GENERATOR_COMMIT'] == git['parents'][0], 'GENERATOR_PARENT_MISMATCH')
    need(p['SOURCE_BUNDLE'] == POLICY['source_bundle'], 'GENERATOR_POLICY_CHANGED')
    need(digest(js_json(p['SOURCE_BUNDLE'])) == p['GENERATOR_SHA256'] and digest(js_json(c)) == p['CONFIG_SHA256'], 'PROVENANCE_HASH_MISMATCH')
    for item in POLICY['source_bundle']:
        need(digest(blobs[item['file']]) == item['SHA256'], 'GENERATOR_BYTES_CHANGED')
    ledger_name = 'docs/statistical-levels-capability-ledger.json'
    need(digest(blobs[ledger_name]) == POLICY['ledger_hash'], 'CAPABILITY_LEDGER_CHANGED')
    need([x['ID'] for x in json.loads(blobs[ledger_name])['capabilities']] == POLICY['capabilities'] and len(POLICY['capabilities']) == 87, 'CAPABILITY_COUNT')
    expected = sorted((f.removeprefix('lib/statistical-levels/generated/') for f in POLICY['allowlist'] if '/generated/' in f))
    need(sorted((x['FILE'] for x in p['snapshots'])) == expected and len(expected) == 81, 'SNAPSHOT_COVERAGE')
    for s in p['snapshots']:
        need(digest(blobs['lib/statistical-levels/generated/' + s['FILE']]) == s['SNAPSHOT_SHA256'], 'SNAPSHOT_HASH')
        for key in ['GENERATOR_COMMIT', 'GENERATOR_SHA256', 'CONFIG_SHA256', 'GENERATED_AT']:
            need(s[key] == p[key], 'SNAPSHOT_PROVENANCE')
    need(c['RAW_ARCHIVE_SEAL_SHA256'] == r['sealed_manifest_sha256'], 'SEAL_HASH_BINDING')
    need(c['RAW_ARCHIVE_BUCKET'] == 'sl-raw-authority-f9f4587745fa332cccfe' and c['RAW_ARCHIVE_REGION'] == 'eu-south-2' and (c['RAW_ARCHIVE_RELATIVE_PATH'] == 'statistical-levels/raw-authority/' + r['authority_run_id'] + '/'), 'AUTHORITY_NAMESPACE')
    manifest = json.loads(blobs['lib/statistical-levels/generated/manifest.json'])
    need(manifest['baseline']['id'] == r['authority_run_id'] and len(manifest['catalog']) == 40, 'MANIFEST_INVALID')
    return p

def validate_authority(r, p, archive):
    seal = json.loads(archive['seal_bytes'])
    need(digest(archive['seal_bytes']) == r['sealed_manifest_sha256'] and archive['seal_version'] == p['CONFIG']['RAW_ARCHIVE_SEAL_VERSION'], 'AUTHORITY_NOT_SEALED')
    need(seal['RUN_ID'] == r['authority_run_id'] and seal['PROTOCOL'] == 'statistical-levels.raw-archive.v1', 'AUTHORITY_NOT_SEALED')
    raw_names = {'raw/' + Path(f).name for f in POLICY['allowlist'] if '/assets/' in f}
    need(set(seal['OBJECTS']) == raw_names | {'RESERVATION', 'raw-manifest.json', 'provenance-manifest.json', 'SHA256SUMS'}, 'SEALED_OBJECT_SET')
    for name, binding in seal['OBJECTS'].items():
        obj = archive['objects'][name]
        need(obj['version'] == binding['VERSION_ID'] and len(obj['bytes']) == binding['BYTES'] and (digest(obj['bytes']) == binding['SHA256']), 'SEALED_OBJECT_MISMATCH')
    raw = json.loads(archive['objects']['raw-manifest.json']['bytes'])
    need(raw['BASELINE_ID'] == r['authority_run_id'] and len(raw['records']) == 40 and (raw['SNAPSHOT_CUTOFF'] == seal['SNAPSHOT_CUTOFF'] == p['CONFIG']['SNAPSHOT_CUTOFF']), 'RAW_MANIFEST_MISMATCH')
    need(digest(archive['objects']['raw-manifest.json']['bytes']) == p['RAW_MANIFEST_SHA256'] and digest(archive['objects']['SHA256SUMS']['bytes']) == p['RAW_ARCHIVE_MANIFEST_SHA256'], 'RAW_HASH_MISMATCH')
    records = {x['ASSET']: x for x in raw['records']}
    need(len(records) == 40 and {x['SOURCE_FILE'] for x in records.values()} == raw_names, 'RAW_COVERAGE')
    for rec in records.values():
        need(digest(archive['objects'][rec['SOURCE_FILE']]['bytes']) == rec['SHA256'], 'RAW_RECORD_HASH')
    for s in p['snapshots']:
        expected = set(records) if s['FILE'] == 'manifest.json' else {Path(s['FILE']).stem}
        need(len(s['INPUTS']) == len(expected) and {i['ASSET'] for i in s['INPUTS']} == expected, 'INPUT_COVERAGE')
        for i in s['INPUTS']:
            rec = records[i['ASSET']]
            need(i['RAW_SHA256'] == rec['SHA256'] and i['RAW_ROW_COUNT'] == rec['ROW_COUNT'] and (i['RAW_SOURCE_ID'] == r['authority_run_id'] + '/' + rec['SOURCE_FILE']) and (i['SNAPSHOT_CUTOFF'] == seal['SNAPSHOT_CUTOFF']), 'INPUT_BINDING')
    day = timestamp(seal['SNAPSHOT_CUTOFF']).date().isoformat()
    need(r['authority_run_id'][:8] == day.replace('-', ''), 'AUTHORITY_DAY_MISMATCH')
    return day

def validate_execution(r, evidence, phase):
    """Public server metadata and exact source bytes, not caller path/hash claims."""
    run = evidence['run']
    for key in ['repository', 'head_repository']:
        repo = run[key]
        need(repo['full_name'] == POLICY['repository'] and repo['private'] is False and (type(repo['id']) is int) and (str(repo['id']) == POLICY['repository_id']) and (type(repo['owner']['id']) is int) and (str(repo['owner']['id']) == POLICY['repository_owner_id']), 'QA_REPOSITORY_IDENTITY')
    need(run['name'] == POLICY['workflow_name'], 'QA_WORKFLOW_NAME')
    need(str(run['id']) == (r['workflow_run_id'] if phase == 'preview' or r['operation'] == ADOPT else str(evidence['check']['external_id'])) and run['path'] == POLICY['workflow_path'] and (run['head_branch'] == POLICY['branch']) and (run['head_sha'] == r['workflow_execution_sha']) and (run['repository']['full_name'] == POLICY['repository']) and (run['event'] == 'workflow_dispatch') and (type(run['run_attempt']) is int) and (1 <= run['run_attempt'] <= 100000), 'QA_RUN_MISMATCH')
    need(evidence['workflow_hash'] == evidence['approved_workflow_hash'] and re.fullmatch(HASH, evidence['approved_workflow_hash']) and (evidence['approved_workflow_hash'] != '0' * 64), 'QA_WORKFLOW_NOT_APPROVED')

def validate_qa(r, evidence, phase, deployment, now):
    """Inline preview bytes are authenticated by server-owned public job metadata.

    The pinned workflow creates a digest-named job only after the QA job succeeds.
    Production certification retains the independently fetched public Check source.
    """
    q, run = (evidence['attestation'], evidence['run'])
    validate_execution(r, evidence, phase)
    allowed = {'candidate_git_sha', 'deployment_id', 'authority_run_id', 'sealed_manifest_sha256', 'project_id', 'test_version', 'phase', 'result', 'snapshot_count', 'provenance_coverage', 'capability_ids', 'timestamp', 'defects', 'interactions', 'expected_values', 'routes', 'viewports', 'application_console_errors', 'hydration_errors', 'required_application_request_failures', 'broken_assets', 'overflow', 'raw_platform_events', 'raw_rsc_events', 'unclassified_failures', 'origin', 'public_authority_run_id'}
    need(type(q) is dict and set(q) == allowed, 'QA_SCHEMA')
    inline = phase == 'preview' or r['operation'] == ADOPT
    prefix = '' if inline else 'production_'
    need(digest(encode(q)) == r[prefix + 'qa_attestation_hash'], 'QA_HASH_MISMATCH')
    if inline:
        need(encode(q).decode() == r['qa_attestation'], 'QA_INLINE_MISMATCH')
        jobs = evidence['jobs']
        need(type(jobs) is dict and type(jobs.get('total_count')) is int and (type(jobs.get('jobs')) is list) and (0 < jobs['total_count'] <= 100) and (len(jobs['jobs']) == jobs['total_count']), 'QA_JOBS_INCOMPLETE')
        qa_jobs = [j for j in jobs['jobs'] if j.get('name') == 'Statistical Levels candidate QA']
        markers = [j for j in jobs['jobs'] if j.get('name', '').startswith('statistical-levels-candidate-qa-sha256-')]
        need(len(qa_jobs) == len(markers) == 1, 'QA_JOB_NOT_UNIQUE')
        check, qa_job = (markers[0], qa_jobs[0])
        need(str(check['id']) == r['qa_attestation_id'] and check['name'] == 'statistical-levels-candidate-qa-sha256-' + r['qa_attestation_hash'] and (check['id'] != qa_job['id']), 'QA_MARKER_INVALID')
        for job in [check, qa_job]:
            need(str(job['run_id']) == str(run['id']) and job['run_attempt'] == run['run_attempt'] and (job['head_sha'] == r['workflow_execution_sha']) and (job['head_branch'] == POLICY['branch']) and (job['status'] == 'completed') and (job['conclusion'] == 'success'), 'QA_JOB_INVALID')
        need(timestamp(qa_job['completed_at']) <= timestamp(check['started_at']) <= timestamp(check['completed_at']), 'QA_JOB_ORDER')
    else:
        check = evidence['check']
        need(str(check['id']) == r[prefix + 'qa_attestation_id'] and check['app']['slug'] == 'github-actions' and (check['name'] == 'statistical-levels-production-qa') and (check['head_sha'] == r['workflow_execution_sha']) and (check['conclusion'] == 'success') and (check['status'] == 'completed'), 'QA_CHECK_INVALID')
    for k, v in {'candidate_git_sha': r['candidate_git_sha'], 'deployment_id': deployment, 'authority_run_id': r['authority_run_id'], 'sealed_manifest_sha256': r['sealed_manifest_sha256'], 'project_id': POLICY['project'], 'test_version': POLICY['test_version'], 'phase': phase, 'result': 'PASS', 'snapshot_count': 81, 'provenance_coverage': 100, 'capability_ids': POLICY['capabilities']}.items():
        need(q.get(k) == v, 'QA_BINDING_MISMATCH')
    age = (now - timestamp(q['timestamp'])).total_seconds()
    need(0 <= age <= (900 if r['operation'] == ADOPT else 86400) and timestamp(check['completed_at']) >= timestamp(q['timestamp']), 'QA_EXPIRED')
    need(q['defects'] == {f'SL_DEF_{i:03}': 'PASS' for i in range(1, 7)}, 'QA_DEFECT_FAILURE')
    need(q['interactions'] == 'PASS' and q['expected_values'] == 'PASS', 'QA_INTERACTION_FAILURE')
    need(q['routes'] == ['/niveles-estadisticos', '/en/statistical-levels'] and q['viewports'] == [[1440, 900], [390, 844]], 'QA_COVERAGE')
    for key in ['application_console_errors', 'hydration_errors', 'required_application_request_failures', 'broken_assets', 'overflow']:
        need(type(q.get(key)) is int and q[key] == 0, 'QA_APPLICATION_ERRORS')
    need(type(q.get('raw_platform_events')) is list and type(q.get('raw_rsc_events')) is list and (q.get('unclassified_failures') == []), 'QA_EVENT_CLASSIFICATION')
    for event_group in ['raw_platform_events', 'raw_rsc_events']:
        for item in q[event_group]:
            need(type(item) is dict and set(item) == {'sha256', 'count', 'classification'} and re.fullmatch(HASH, item['sha256']) and (type(item['count']) is int) and (item['count'] >= 0) and (item['classification'] in ['platform_non_application', 'rsc_non_application'] or event_group == 'raw_rsc_events' and item['classification'] == 'rsc_transition_completed_non_application'), 'QA_UNSAFE_EVENT')
    return q

def deployment_matches(d, sha, deployment, target):
    need(d['id'] == deployment and d['projectId'] == POLICY['project'], 'VERCEL_PROJECT_MISMATCH')
    need(d['readyState'] == 'READY' and d.get('target') == target, 'VERCEL_NOT_READY')
    need(d['meta']['githubCommitSha'] == sha and d['meta']['githubRepo'] == 'Luiguiherrera-web' and (d['meta']['githubOrg'] == 'luiguiHerrera'), 'VERCEL_SHA_MISMATCH')

def production_matches(d, r):
    deployment_matches(d, r['expected_previous_production_sha'], r['expected_previous_production_deployment'], 'production')
BASELINE_FIELDS = {'schema_version', 'publication_date_utc', 'authority_run_id', 'sealed_manifest_sha256', 'production_git_sha', 'production_deployment_id', 'main_sha_observed', 'production_certified_at_utc', 'workflow_execution_sha', 'workflow_sha256', 'controller_version', 'adoption_mode', 'provenance_sha256', 'production_qa_attestation_hash'}

def validate_baseline_marker(marker, now):
    b = POLICY['baseline']
    need(type(marker) is dict and set(marker) == BASELINE_FIELDS and (marker['schema_version'] == 'statistical-levels.publication-baseline.v1') and (marker['adoption_mode'] == 'existing-production-baseline') and (marker['controller_version'] == POLICY['controller_version']), 'PREVIOUS_MARKER_SCHEMA')
    for key in ['publication_date_utc', 'authority_run_id', 'sealed_manifest_sha256', 'production_git_sha', 'production_deployment_id', 'main_sha_observed', 'provenance_sha256']:
        need(marker[key] == b[key], 'BASELINE_MARKER_IDENTITY')
    need(type(marker['workflow_execution_sha']) is str and re.fullmatch(SHA, marker['workflow_execution_sha']), 'PREVIOUS_MARKER_SCHEMA')
    for key in ['workflow_sha256', 'production_qa_attestation_hash']:
        need(type(marker[key]) is str and re.fullmatch(HASH, marker[key]) and (marker[key] != '0' * 64), 'PREVIOUS_MARKER_SCHEMA')
    need(timestamp(marker['production_certified_at_utc']) <= now and marker['production_certified_at_utc'][:10] >= marker['publication_date_utc'], 'PREVIOUS_MARKER_SCHEMA')

def adopt_baseline(r, io):
    """Read + verify + certify + create marker. No promotion function is called.

    The handler supplies a distinct adapter with no rebuild method and a GET-only
    HTTP transport. Marker time is the authenticated QA time, making an exact
    retry deterministic; new evidence that changes the marker fails closed.
    """
    need(r['operation'] == ADOPT, 'OPERATION_DENIED')
    evidence = io.qa(r, 'production')
    validate_execution(r, evidence, 'production')
    git = io.source(r)
    p = validate_source(r, git)
    day = validate_authority(r, p, io.authority(r, p))
    need(day == POLICY['baseline']['publication_date_utc'], 'BASELINE_DAY_MISMATCH')
    cert = validate_qa(r, evidence, 'production', r['candidate_deployment_id'], io.now())
    need(cert['origin'] == POLICY['production_origin'] and cert['public_authority_run_id'] == r['authority_run_id'], 'PUBLIC_CERTIFICATION_MISMATCH')
    marker = {'schema_version': 'statistical-levels.publication-baseline.v1', 'publication_date_utc': day, 'authority_run_id': r['authority_run_id'], 'sealed_manifest_sha256': r['sealed_manifest_sha256'], 'production_git_sha': r['candidate_git_sha'], 'production_deployment_id': r['candidate_deployment_id'], 'main_sha_observed': git['main_sha'], 'production_certified_at_utc': cert['timestamp'], 'workflow_execution_sha': r['workflow_execution_sha'], 'workflow_sha256': evidence['workflow_hash'], 'controller_version': POLICY['controller_version'], 'adoption_mode': 'existing-production-baseline', 'provenance_sha256': digest(git['blobs']['lib/statistical-levels/generated-provenance.json']), 'production_qa_attestation_hash': r['qa_attestation_hash']}
    validate_baseline_marker(marker, io.now())
    key = 'statistical-levels/publication-state/' + day + '/published.json'
    existing = io.marker_get(key)
    need(existing is None or existing == marker, 'BASELINE_MARKER_CONFLICT')
    if existing is not None:
        effective = resolve_effective_authority(existing, io)
        need(effective['head_sha256'] == digest(encode(existing)) and effective['reservation'] is None, 'ADOPT_AFTER_TRANSITION')
    secret = None
    try:
        secret = io.secret()
        need(type(secret) is str and secret.strip() == secret and (20 <= len(secret) <= 2048), 'SECRET_INVALID')
        io.use_secret(secret)
        project = io.project()
        need(project['id'] == POLICY['project'] and project['accountId'] == POLICY['team'] and (project['link']['productionBranch'] == POLICY['production_branch']), 'VERCEL_PROJECT_MISMATCH')
        production = io.production()
        deployment_matches(production, r['candidate_git_sha'], r['candidate_deployment_id'], 'production')
        need(type(production.get('ready')) is int and timestamp(cert['timestamp']).timestamp() * 1000 >= production['ready'], 'CERT_BEFORE_PRODUCTION_READY')
        io.public_authority(r['authority_run_id'])
        need(io.main_sha() == git['main_sha'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
        deployment_matches(io.production(), r['candidate_git_sha'], r['candidate_deployment_id'], 'production')
        if existing is not None:
            return {'state': 'ALREADY_ADOPTED', 'marker_sha256': digest(encode(marker)), 'vercel_write': False, 'provider_fetch': False}
        try:
            io.marker_create(key, marker)
        except Denied as error:
            if str(error) != '412_PRECONDITION_FAILED':
                raise
            need(io.marker_get(key) == marker, 'BASELINE_MARKER_CONFLICT')
            return {'state': 'ALREADY_ADOPTED', 'marker_sha256': digest(encode(marker)), 'vercel_write': False, 'provider_fetch': False}
        return {'state': 'BASELINE_ADOPTED', 'marker_sha256': digest(encode(marker)), 'vercel_write': False, 'provider_fetch': False}
    finally:
        io.clear_secret()
        secret = None

def validate_lineage(r, git, day, io):
    """Every future promotion requires a certified predecessor on an earlier UTC day.

    Same-day timestamps never select a winner. No first-release target exception.
    The accepted historical main lag remains a sentinel, never an update command.
    """
    previous_date = r['previous_publication_date']
    observed = git['main_sha']
    need(previous_date < day, 'PREDECESSOR_DATE_INVALID')
    marker = io.marker_get('statistical-levels/publication-state/' + previous_date + '/published.json')
    need(type(marker) is dict, 'PREVIOUS_CERTIFIED_MARKER_MISSING')
    required = {'publication_date_utc', 'authority_run_id', 'sealed_manifest_sha256', 'generated_commit', 'preview_deployment_id', 'production_deployment_id', 'production_git_sha', 'qa_attestation_hash', 'production_qa_attestation_hash', 'production_certified_at_utc', 'production_certified_at', 'controller_version', 'previous_production_sha', 'previous_production_deployment', 'new_production_sha', 'new_production_deployment', 'main_sha_observed', 'main_sha_observed_before_release', 'main_sha_observed_after_release', 'previous_publication_date', 'previous_publication_marker_sha256'}
    if marker.get('adoption_mode') == 'existing-production-baseline':
        validate_baseline_marker(marker, io.now())
        effective = resolve_effective_authority(marker, io)
        need(marker['publication_date_utc'] == previous_date and effective['binding']['sha'] == r['expected_previous_production_sha'] and effective['binding']['deployment'] == r['expected_previous_production_deployment'], 'PRODUCTION_LINEAGE_MISMATCH')
        need(observed == marker['main_sha_observed'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
        result = {'main_sha_observed_before_release': observed, 'previous_publication_date': previous_date, 'previous_publication_marker_sha256': digest(encode(marker))}
        if effective['sequence']:
            result['previous_authority_transition_sha256'] = effective['head_sha256']
        return result
    if 'previous_authority_transition_sha256' in marker:
        required.add('previous_authority_transition_sha256')
        anchor = io.marker_get(baseline_key())
        effective = resolve_effective_authority(anchor, io)
        need(effective['sequence'] > 0 and marker['previous_authority_transition_sha256'] == effective['head_sha256'] and marker['previous_publication_date'] == anchor['publication_date_utc'] and marker['previous_publication_marker_sha256'] == digest(encode(anchor)), 'PREVIOUS_TRANSITION_ANCHOR')
    need(set(marker) == required and marker['publication_date_utc'] == previous_date and (marker['controller_version'] == POLICY['controller_version']), 'PREVIOUS_MARKER_SCHEMA')
    for k in ['generated_commit', 'production_git_sha', 'previous_production_sha', 'new_production_sha', 'main_sha_observed', 'main_sha_observed_before_release', 'main_sha_observed_after_release']:
        need(type(marker[k]) is str and re.fullmatch(SHA, marker[k]), 'PREVIOUS_MARKER_SCHEMA')
    for k in ['preview_deployment_id', 'production_deployment_id', 'previous_production_deployment', 'new_production_deployment']:
        need(type(marker[k]) is str and re.fullmatch(DPL, marker[k]), 'PREVIOUS_MARKER_SCHEMA')
    for k in ['sealed_manifest_sha256', 'qa_attestation_hash', 'production_qa_attestation_hash']:
        need(type(marker[k]) is str and re.fullmatch(HASH, marker[k]), 'PREVIOUS_MARKER_SCHEMA')
    need(re.fullmatch(RUN, marker['authority_run_id']) and marker['authority_run_id'][:8] == previous_date.replace('-', '') and (marker['production_certified_at'] == marker['production_certified_at_utc']) and (timestamp(marker['production_certified_at']) <= io.now()), 'PREVIOUS_MARKER_SCHEMA')
    prior_date, prior_hash = (marker['previous_publication_date'], marker['previous_publication_marker_sha256'])
    need(prior_date is not None and prior_hash is not None, 'PREVIOUS_MARKER_SCHEMA')
    if prior_date is not None:
        need(type(prior_date) is str and re.fullmatch('\\d{4}-\\d{2}-\\d{2}', prior_date) and (dt.date.fromisoformat(prior_date).isoformat() == prior_date) and (prior_date < previous_date) and (type(prior_hash) is str) and re.fullmatch(HASH, prior_hash), 'PREVIOUS_MARKER_SCHEMA')
    need(marker['generated_commit'] == marker['production_git_sha'] == marker['new_production_sha'] == r['expected_previous_production_sha'] and marker['production_deployment_id'] == marker['new_production_deployment'] == r['expected_previous_production_deployment'], 'PRODUCTION_LINEAGE_MISMATCH')
    need(marker['main_sha_observed_before_release'] == marker['main_sha_observed_after_release'] == marker['main_sha_observed'], 'PREVIOUS_MARKER_MAIN_INCONSISTENT')
    need(observed == marker['main_sha_observed_after_release'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
    return {'main_sha_observed_before_release': observed, 'previous_publication_date': previous_date, 'previous_publication_marker_sha256': digest(encode(marker))}

def release(value, io):
    """Synchronous, retryable observation; an ambiguous POST is never retried."""
    r = request(value)
    if r['operation'] == TRANSITION:
        return editorial_transition(r, io)
    if r['operation'] == ADOPT:
        return adopt_baseline(r, io)
    return promote(r, io)

def promote(r, io):
    need(r['operation'] == OP, 'OPERATION_DENIED')
    preview_evidence = io.qa(r, 'preview')
    validate_execution(r, preview_evidence, 'preview')
    git = io.source(r)
    p = validate_source(r, git, transition_parent=authorized_transition_parent(r, git, io))
    day = validate_authority(r, p, io.authority(r, p))
    qa = validate_qa(r, preview_evidence, 'preview', r['candidate_deployment_id'], io.now())
    lineage = validate_lineage(r, git, day, io)
    binding = {k: r[k] for k in ['candidate_git_sha', 'candidate_deployment_id', 'authority_run_id', 'sealed_manifest_sha256', 'expected_previous_production_sha', 'expected_previous_production_deployment']}
    binding.update(lineage)
    base = 'statistical-levels/publication-state/' + day + '/'
    if io.marker_get(base + 'published.json') is not None:
        raise Denied('412_ALREADY_PUBLISHED')
    reserve_ordinary_successor(r, lineage, binding, io)
    selected = io.marker_get(base + 'authority-selected.json')
    if selected is not None:
        need(selected == binding, 'DAILY_AUTHORITY_CONFLICT')
    else:
        io.marker_create(base + 'authority-selected.json', binding)
    io.marker_once(base + 'preview-qualified/' + r['candidate_deployment_id'] + '/' + r['qa_attestation_hash'] + '.json', qa)
    request_id = digest(encode(binding))
    intent_key = base + 'promotion-requested/' + request_id + '.json'
    response_key = base + 'promotion-response/' + request_id + '.json'
    intent, response = (io.marker_get(intent_key), io.marker_get(response_key))
    cert = None
    if CERT_FIELDS <= r.keys():
        need(response is not None, 'PRODUCTION_CERT_BEFORE_REBUILD')
        cert = validate_qa(r, io.qa(r, 'production'), 'production', response['production_deployment_id'], io.now())
    secret = None
    try:
        secret = io.secret()
        need(type(secret) is str and secret.strip() == secret and (20 <= len(secret) <= 2048), 'SECRET_INVALID')
        io.use_secret(secret)
        project = io.project()
        need(project['id'] == POLICY['project'] and project['accountId'] == POLICY['team'] and (project['link']['productionBranch'] == POLICY['production_branch']), 'VERCEL_PROJECT_MISMATCH')
        preview = io.deployment(r['candidate_deployment_id'])
        deployment_matches(preview, r['candidate_git_sha'], r['candidate_deployment_id'], None)
        need(preview['meta']['githubCommitRef'] == POLICY['branch'], 'VERCEL_BRANCH_MISMATCH')
        need(re.fullmatch('[a-z0-9-]+\\.vercel\\.app', preview['url']) and qa['origin'] == 'https://' + preview['url'], 'PREVIEW_ORIGIN_MISMATCH')
        if intent is None:
            need(response is None, 'ORPHAN_RESPONSE')
            production_matches(io.production(), r)
            io.marker_create(intent_key, binding)
            need(io.main_sha() == lineage['main_sha_observed_before_release'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
            production_matches(io.production(), r)
            try:
                created = io.rebuild(r['candidate_deployment_id'])
                need(re.fullmatch(DPL, created['id']), 'VERCEL_INVALID_RESPONSE')
            except Denied as error:
                if str(error) == 'VERCEL_AUTH_DENIED':
                    return {'state': 'VERCEL_AUTH_DENIED', 'request_id': request_id, 'provider_fetch': False}
                return {'state': 'PROMOTION_OUTCOME_UNKNOWN', 'request_id': request_id, 'provider_fetch': False}
            except Exception:
                return {'state': 'PROMOTION_OUTCOME_UNKNOWN', 'request_id': request_id, 'provider_fetch': False}
            try:
                io.marker_create(response_key, {'production_deployment_id': created['id'], 'request_id': request_id})
            except Exception:
                return {'state': 'PROMOTION_RESPONSE_UNRECORDED', 'production_deployment_id': created['id'], 'provider_fetch': False}
            response = {'production_deployment_id': created['id'], 'request_id': request_id}
        else:
            need(intent == binding, 'INTENT_CONFLICT')
            if response is None:
                return {'state': 'PROMOTION_OUTCOME_UNKNOWN', 'request_id': request_id, 'provider_fetch': False}
        prod_id = response['production_deployment_id']
        d = io.deployment(prod_id)
        need(d['projectId'] == POLICY['project'] and d['meta']['githubCommitSha'] == r['candidate_git_sha'], 'PRODUCTION_IDENTITY_MISMATCH')
        if d['readyState'] in ['ERROR', 'CANCELED']:
            return {'state': 'PRODUCTION_BUILD_FAILED', 'production_deployment_id': prod_id, 'provider_fetch': False}
        if d['readyState'] != 'READY':
            return {'state': 'PRODUCTION_BUILD_PENDING', 'production_deployment_id': prod_id, 'provider_fetch': False}
        deployment_matches(d, r['candidate_git_sha'], prod_id, 'production')
        try:
            io.marker_once(base + 'production-built/' + prod_id + '.json', {'production_deployment_id': prod_id, **binding})
        except Exception:
            return {'state': 'PRODUCTION_READY_EVENT_UNRECORDED', 'production_deployment_id': prod_id, 'provider_fetch': False}
        if not CERT_FIELDS <= r.keys():
            return {'state': 'PROMOTED_NOT_CERTIFIED', 'production_deployment_id': prod_id, 'provider_fetch': False}
        need(type(d.get('ready')) is int and timestamp(cert['timestamp']).timestamp() * 1000 >= d['ready'], 'CERT_BEFORE_PRODUCTION_READY')
        need(cert['origin'] == 'https://www.luiguiherrera.com' and cert['public_authority_run_id'] == r['authority_run_id'], 'PUBLIC_CERTIFICATION_MISMATCH')
        deployment_matches(io.production(), r['candidate_git_sha'], prod_id, 'production')
        io.public_authority(r['authority_run_id'])
        main_after = io.main_sha()
        need(main_after == lineage['main_sha_observed_before_release'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
        marker = {'publication_date_utc': day, 'authority_run_id': r['authority_run_id'], 'sealed_manifest_sha256': r['sealed_manifest_sha256'], 'generated_commit': r['candidate_git_sha'], 'preview_deployment_id': r['candidate_deployment_id'], 'production_deployment_id': prod_id, 'production_git_sha': r['candidate_git_sha'], 'qa_attestation_hash': r['qa_attestation_hash'], 'production_qa_attestation_hash': r['production_qa_attestation_hash'], 'production_certified_at_utc': cert['timestamp'], 'controller_version': POLICY['controller_version'], 'production_certified_at': cert['timestamp'], 'previous_production_sha': r['expected_previous_production_sha'], 'previous_production_deployment': r['expected_previous_production_deployment'], 'new_production_sha': r['candidate_git_sha'], 'new_production_deployment': prod_id, 'main_sha_observed': main_after, 'main_sha_observed_after_release': main_after, **lineage}
        try:
            io.marker_once(base + 'production-certified/' + prod_id + '.json', cert)
            io.marker_create(base + 'published.json', marker)
        except Denied as error:
            if str(error) == '412_PRECONDITION_FAILED':
                return {'state': '412_PRECONDITION_FAILED', 'production_deployment_id': prod_id, 'provider_fetch': False}
            return {'state': 'PRODUCTION_CERTIFIED_MARKER_UNCONFIRMED', 'production_deployment_id': prod_id, 'provider_fetch': False}
        except Exception:
            return {'state': 'PRODUCTION_CERTIFIED_MARKER_UNCONFIRMED', 'production_deployment_id': prod_id, 'provider_fetch': False}
        return {'state': 'PUBLISHED', 'production_deployment_id': prod_id, 'marker_sha256': digest(encode(marker)), 'provider_fetch': False}
    finally:
        io.clear_secret()
        secret = None
'Fixed AWS/HTTPS adapters. No generic API entry point is exported to callers.'
import base64
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class HTTP:

    def __init__(self):
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, url, *, token=None, body=None, limit=24 * 1024 * 1024):
        parsed = urllib.parse.urlsplit(url)
        need(parsed.scheme == 'https' and (not parsed.username) and (not parsed.password) and (parsed.port in [None, 443]), 'HTTP_ORIGIN_DENIED')
        if token is not None:
            need(parsed.netloc == 'api.vercel.com', 'SECRET_ORIGIN_DENIED')
        headers = {'User-Agent': 'statistical-levels-release-controller-v1', 'Accept': 'application/json'}
        if token is not None:
            headers['Authorization'] = 'Bearer ' + token
        if body is not None:
            need(token is not None and parsed.netloc == 'api.vercel.com' and (parsed.path == '/v13/deployments'), 'WRITE_ENDPOINT_DENIED')
            headers['Content-Type'] = 'application/json'
        try:
            req = urllib.request.Request(url, data=encode(body) if body is not None else None, headers=headers)
            with self.opener.open(req, timeout=25) as res:
                need(res.status == 200 or (body is not None and res.status in [201, 202]), 'HTTP_STATUS')
                data = res.read(limit + 1)
                need(len(data) <= limit, 'HTTP_RESPONSE_LIMIT')
                return data
        except urllib.error.HTTPError as e:
            raise Denied('VERCEL_AUTH_DENIED' if token and e.code in [401, 403] else 'HTTP_READ_OR_WRITE_FAILED') from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise Denied('HTTP_TRANSPORT_FAILURE') from None

class ReadHTTP:

    def __init__(self):
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, url, *, token=None, limit=24 * 1024 * 1024):
        parsed = urllib.parse.urlsplit(url)
        need(parsed.scheme == 'https' and (not parsed.username) and (not parsed.password) and (parsed.port in [None, 443]), 'HTTP_ORIGIN_DENIED')
        if token is not None:
            need(parsed.netloc == 'api.vercel.com', 'SECRET_ORIGIN_DENIED')
        headers = {'User-Agent': 'statistical-levels-release-controller-v1', 'Accept': 'application/json'}
        if token is not None:
            headers['Authorization'] = 'Bearer ' + token
        try:
            req = urllib.request.Request(url, headers=headers)
            with self.opener.open(req, timeout=25) as res:
                need(res.status == 200, 'HTTP_STATUS')
                data = res.read(limit + 1)
                need(len(data) <= limit, 'HTTP_RESPONSE_LIMIT')
                return data
        except urllib.error.HTTPError as e:
            raise Denied('VERCEL_AUTH_DENIED' if token and e.code in [401, 403] else 'HTTP_READ_OR_WRITE_FAILED') from None
        except (urllib.error.URLError, TimeoutError, OSError):
            raise Denied('HTTP_TRANSPORT_FAILURE') from None

class ReadRuntime:
    RAW_BUCKET = 'sl-raw-authority-f9f4587745fa332cccfe'

    def __init__(self):
        import boto3
        from botocore.config import Config
        cfg = Config(region_name='eu-south-2', connect_timeout=5, read_timeout=25, retries={'total_max_attempts': 1})
        self.s3 = boto3.client('s3', config=cfg)
        self.sm = boto3.client('secretsmanager', config=cfg)
        self.http = ReadHTTP()
        self._token = None
        self.account = os.environ['AWS_ACCOUNT_ID']
        self.state_bucket = os.environ['PUBLICATION_STATE_BUCKET']
        self.secret_arn = os.environ['VERCEL_SECRET_ARN']
        self.workflow_hash = os.environ['APPROVED_WORKFLOW_SHA256']
        need(re.fullmatch('\\d{12}', self.account), 'INVALID_ACCOUNT')
        need(self.state_bucket == 'sl-publication-state-' + self.account + '-eu-south-2', 'STATE_BUCKET_MISMATCH')
        need(re.fullmatch('arn:aws:secretsmanager:eu-south-2:' + self.account + ':secret:statistical-levels/vercel/project-publisher-[A-Za-z0-9]{6}', self.secret_arn), 'SECRET_ARN_MISMATCH')

    def now(self):
        return dt.datetime.now(dt.timezone.utc)

    def gh(self, path):
        return json.loads(self.http.get('https://api.github.com/repos/' + POLICY['repository'] + path))

    def raw_file(self, sha, name):
        return self.http.get('https://raw.githubusercontent.com/' + POLICY['repository'] + '/' + sha + '/' + urllib.parse.quote(name, safe='/'), limit=32 * 1024 * 1024)

    def main_sha(self):
        return self.gh('/git/ref/heads/main')['object']['sha']

    def source(self, r):
        sha = r['candidate_git_sha']
        commit = self.gh('/git/commits/' + sha)
        need(commit['sha'] == sha and len(commit['parents']) == 1, 'COMMIT_IDENTITY')
        parent = commit['parents'][0]['sha']

        def tree(ref):
            data = self.gh('/git/trees/' + ref + '?recursive=1')
            need(not data.get('truncated', True), 'TRUNCATED_GIT_TREE')
            return {x['path']: {k: x[k] for k in ['mode', 'type', 'sha']} for x in data['tree'] if x['type'] != 'tree'}
        names = POLICY['allowlist'] + [x['file'] for x in POLICY['source_bundle']] + ['docs/statistical-levels-capability-ledger.json']
        with ThreadPoolExecutor(max_workers=6) as pool:
            blobs = dict(zip(names, pool.map(lambda name: self.raw_file(sha, name), names)))
        return {'repository': POLICY['repository'], 'sha': sha, 'branch': POLICY['branch'], 'branch_sha': self.gh('/git/ref/heads/vercel-deployment')['object']['sha'], 'main_sha': self.main_sha(), 'parents': [parent], 'tree_sha': commit['tree']['sha'], 'tree': tree(commit['tree']['sha']), 'parent_tree': tree(parent), 'blobs': blobs, 'comparison': self.gh('/compare/' + sha + '...' + r['workflow_execution_sha'])}

    def s3_get(self, bucket, key, version=None, missing=False):
        args = {'Bucket': bucket, 'Key': key, 'ExpectedBucketOwner': self.account, 'ChecksumMode': 'ENABLED'}
        if version:
            args['VersionId'] = version
        try:
            obj = self.s3.get_object(**args)
        except Exception as e:
            code = getattr(e, 'response', {}).get('Error', {}).get('Code')
            if missing and code in ['NoSuchKey', '404']:
                return None
            raise Denied('STATE_READ_UNAVAILABLE' if bucket == self.state_bucket else 'AUTHORITY_READ_UNAVAILABLE') from None
        try:
            data = obj['Body'].read(32 * 1024 * 1024 + 1)
        finally:
            obj['Body'].close()
        need(len(data) <= 32 * 1024 * 1024 and obj.get('VersionId') not in [None, 'null'] and (obj.get('ServerSideEncryption') == 'AES256') and (obj.get('ChecksumSHA256') == base64.b64encode(bytes.fromhex(digest(data))).decode()), 'S3_INTEGRITY')
        return {'bytes': data, 'version': obj['VersionId'], 'retention': obj.get('ObjectLockRetainUntilDate'), 'mode': obj.get('ObjectLockMode')}

    def authority(self, r, p):
        prefix = 'statistical-levels/raw-authority/' + r['authority_run_id'] + '/'
        seal = self.s3_get(self.RAW_BUCKET, prefix + 'SEALED', p['CONFIG']['RAW_ARCHIVE_SEAL_VERSION'])
        need(digest(seal['bytes']) == r['sealed_manifest_sha256'], 'SEAL_HASH_MISMATCH')
        bindings = json.loads(seal['bytes'])['OBJECTS']
        need(len(bindings) == 44 and all((re.fullmatch('(raw/[A-Z0-9]+\\.json|RESERVATION|raw-manifest\\.json|provenance-manifest\\.json|SHA256SUMS)', n) for n in bindings)), 'SEALED_PATH_DENIED')
        with ThreadPoolExecutor(max_workers=6) as pool:
            objects = dict(zip(bindings, pool.map(lambda n: self.s3_get(self.RAW_BUCKET, prefix + n, bindings[n]['VERSION_ID']), bindings)))
        return {'seal_bytes': seal['bytes'], 'seal_version': seal['version'], 'objects': objects}

    def qa(self, r, phase):
        if phase == 'preview' or r['operation'] == ADOPT:
            run_id = r['workflow_run_id']
            check = None
            attestation = json.loads(r['qa_attestation'])
        else:
            check = self.gh('/check-runs/' + r['production_qa_attestation_id'])
            need(check.get('output') and type(check['output'].get('text')) is str and (len(check['output']['text']) < 60000) and re.fullmatch('[1-9][0-9]{0,19}', check.get('external_id', '')), 'QA_ABSENT')
            run_id = check['external_id']
            attestation = json.loads(check['output']['text'])
        run = self.gh('/actions/runs/' + run_id)
        for key in ['repository', 'head_repository']:
            repo = run[key]
            need(repo['full_name'] == POLICY['repository'] and repo['private'] is False and (type(repo['id']) is int) and (str(repo['id']) == POLICY['repository_id']) and (type(repo['owner']['id']) is int) and (str(repo['owner']['id']) == POLICY['repository_owner_id']), 'QA_REPOSITORY_IDENTITY')
        need(run['name'] == POLICY['workflow_name'], 'QA_WORKFLOW_NAME')
        need(str(run['id']) == run_id and run['repository']['full_name'] == POLICY['repository'] and (run['head_sha'] == r['workflow_execution_sha']) and (run['head_branch'] == POLICY['branch']) and (run['path'] == POLICY['workflow_path']) and (run['event'] == 'workflow_dispatch') and (type(run['run_attempt']) is int) and (1 <= run['run_attempt'] <= 100000), 'QA_RUN_MISMATCH')
        evidence = {'run': run, 'attestation': attestation, 'workflow_hash': digest(self.raw_file(r['workflow_execution_sha'], POLICY['workflow_path'])), 'approved_workflow_hash': self.workflow_hash}
        if phase == 'preview' or r['operation'] == ADOPT:
            evidence['jobs'] = self.gh('/actions/runs/' + run_id + '/attempts/' + str(run['run_attempt']) + '/jobs?per_page=100')
        else:
            evidence['check'] = check
        return evidence

    def secret(self):
        try:
            obj = self.sm.get_secret_value(SecretId=self.secret_arn, VersionStage='AWSCURRENT')
            value = json.loads(obj['SecretString'])
            need(set(value) == {'token', 'expires_at', 'project_id'} and value['project_id'] == POLICY['project'], 'SECRET_SCOPE_METADATA')
            expires = dt.datetime.fromisoformat(value['expires_at'].replace('Z', '+00:00'))
            need(expires > self.now() + dt.timedelta(minutes=20), 'TOKEN_EXPIRED_OR_EXPIRING')
            return value['token']
        except Denied:
            raise
        except Exception:
            raise Denied('SECRET_UNAVAILABLE') from None

    def use_secret(self, secret):
        self._token = secret

    def clear_secret(self):
        self._token = None

    def vercel_read(self, path):
        need(self._token is not None, 'SECRET_NOT_LOADED')
        return json.loads(self.http.get('https://api.vercel.com' + path, token=self._token))

    def project(self):
        return self.vercel_read('/v9/projects/' + POLICY['project'])

    def deployment(self, deployment_id):
        need(re.fullmatch('dpl_[A-Za-z0-9]{10,80}', deployment_id), 'DEPLOYMENT_ID_INVALID')
        return self.vercel_read('/v13/deployments/' + deployment_id)

    def production(self):
        p = self.project()
        need(p['id'] == POLICY['project'] and p['accountId'] == POLICY['team'], 'PRODUCTION_PROJECT_MISMATCH')
        return self.deployment(p['targets']['production']['id'])

    def marker_key(self, key):
        if re.fullmatch(re.escape(transition_prefix()) + r'[a-f0-9]{64}/(?:intent|receipt)\.json', key):
            return
        need(re.fullmatch('statistical-levels/publication-state/\\d{4}-\\d{2}-\\d{2}/(?:authority-selected\\.json|published\\.json|promotion-requested/[a-f0-9]{64}\\.json|promotion-response/[a-f0-9]{64}\\.json|production-(?:built|certified)/dpl_[A-Za-z0-9]{10,80}\\.json|preview-qualified/dpl_[A-Za-z0-9]{10,80}/[a-f0-9]{64}\\.json)', key), 'STATE_KEY_DENIED')

    def marker_get(self, key):
        self.marker_key(key)
        try:
            listing = self.s3.list_objects_v2(Bucket=self.state_bucket, Prefix=key, MaxKeys=1, ExpectedBucketOwner=self.account)
        except Exception:
            raise Denied('STATE_READ_UNAVAILABLE') from None
        if not any((x['Key'] == key for x in listing.get('Contents', []))):
            return None
        obj = self.s3_get(self.state_bucket, key)
        return json.loads(obj['bytes'])

    def marker_create(self, key, value):
        self.marker_key(key)
        data = encode(value)
        need(len(data) < 60000, 'STATE_SIZE_LIMIT')
        try:
            obj = self.s3.put_object(Bucket=self.state_bucket, Key=key, ExpectedBucketOwner=self.account, Body=data, IfNoneMatch='*', ServerSideEncryption='AES256', ChecksumAlgorithm='SHA256', ChecksumSHA256=base64.b64encode(bytes.fromhex(digest(data))).decode())
        except Exception as e:
            code = getattr(e, 'response', {}).get('Error', {}).get('Code')
            raise Denied('412_PRECONDITION_FAILED' if code in ['PreconditionFailed', '412'] else 'STATE_WRITE_UNAVAILABLE') from None
        got = self.s3_get(self.state_bucket, key, obj.get('VersionId'))
        need(got['version'] == obj.get('VersionId') and got['bytes'] == data and (got['mode'] == 'GOVERNANCE') and got['retention'] and (got['retention'] > self.now() + dt.timedelta(days=1824)), 'STATE_READBACK_MISMATCH')

    def marker_once(self, key, value):
        existing = self.marker_get(key)
        if existing is not None:
            need(existing == value, 'STATE_EVENT_CONFLICT')
        else:
            self.marker_create(key, value)

    def transition_qualification(self, grant):
        run = self.gh('/actions/runs/' + grant['ci_run_id'])
        return {'run': run, 'jobs': self.gh('/actions/runs/' + grant['ci_run_id'] + '/attempts/' + str(grant['ci_attempt']) + '/jobs?per_page=100'), 'workflow_sha256': digest(self.raw_file(grant['execution_sha'], '.github/workflows/ci.yml'))}

    def public_authority(self, run_id):
        for path in ['/niveles-estadisticos', '/en/statistical-levels']:
            data = self.http.get('https://www.luiguiherrera.com' + path)
            need(run_id.encode() in data, 'PUBLIC_AUTHORITY_MISMATCH')

class AdoptionRuntime(ReadRuntime):
    """No Vercel write capability, including no generic body-capable HTTP method."""

class Runtime(ReadRuntime):

    def __init__(self):
        super().__init__()
        self.http = HTTP()

    def rebuild(self, candidate_id):
        need(re.fullmatch('dpl_[A-Za-z0-9]{10,80}', candidate_id), 'DEPLOYMENT_ID_INVALID')
        return json.loads(self.http.get('https://api.vercel.com/v13/deployments', token=self._token, body={'deploymentId': candidate_id, 'project': POLICY['project'], 'name': 'luiguiherrera-web', 'target': 'production', 'withLatestCommit': False}))

def handler(event, context):
    try:
        r = request(event)
        if r['operation'] == TRANSITION:
            need(r['authorization_sha256'] == digest(encode(transition_authorization())), 'TRANSITION_AUTHORIZATION')
        return release(r, AdoptionRuntime() if r['operation'] in [ADOPT, TRANSITION] else Runtime())
    except Denied as e:
        code = str(e)
        if code == 'BLOCKED_CONCURRENT_MAIN_ACTIVITY':
            return {'state': code, 'provider_fetch': False}
        return {'state': 'DENIED', 'code': code if re.fullmatch('[A-Z0-9_]{1,80}', code) else 'RELEASE_DENIED', 'provider_fetch': False}
    except Exception:
        return {'state': 'DENIED', 'code': 'UNCLASSIFIED_FAIL_CLOSED', 'provider_fetch': False}


def validate_preserved_editorial_snapshot(tree, blobs):
    """Authenticate exactly the adopted 82 source files; never regenerate them."""
    names = set(POLICY['allowlist'])
    provenance = 'lib/statistical-levels/generated-provenance.json'
    need(len(names) == 82 and set(blobs) == names, 'EDITORIAL_SNAPSHOT_COVERAGE')
    generated = {p for p in tree if p.startswith('lib/statistical-levels/generated/') or p == provenance}
    need(generated == names, 'EDITORIAL_SNAPSHOT_TREE_SCOPE')
    need(all(type(data) is bytes for data in blobs.values()), 'EDITORIAL_SNAPSHOT_BYTES')
    need(digest(blobs[provenance]) == POLICY['baseline']['provenance_sha256'], 'EDITORIAL_PROVENANCE_IDENTITY')
    p = json.loads(blobs[provenance])
    need(p['CONFIG'] == POLICY['authority'] and p['BASELINE_ID'] == POLICY['baseline']['authority_run_id'], 'EDITORIAL_AUTHORITY_IDENTITY')
    need(p['CONFIG']['RAW_ARCHIVE_SEAL_SHA256'] == POLICY['baseline']['sealed_manifest_sha256'], 'EDITORIAL_SEAL_IDENTITY')
    expected = {provenance: POLICY['baseline']['provenance_sha256']}
    for item in p['snapshots']:
        name = 'lib/statistical-levels/generated/' + item['FILE']
        need(name in names and name not in expected, 'EDITORIAL_SNAPSHOT_PATH')
        expected[name] = item['SNAPSHOT_SHA256']
    need(set(expected) == names, 'EDITORIAL_SNAPSHOT_HASH_COVERAGE')
    for name in sorted(names):
        data, entry = blobs[name], tree[name]
        need(entry['mode'] == '100644' and entry['type'] == 'blob', 'EDITORIAL_SNAPSHOT_MODE')
        need(hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == entry['sha'], 'EDITORIAL_GIT_BLOB')
        need(digest(data) == expected[name], 'EDITORIAL_SNAPSHOT_IDENTITY')
    return {'scope': 'SNAPSHOT_IDENTITY_ONLY', 'files': 82,
            'authority_run_id': POLICY['baseline']['authority_run_id'],
            'provenance_sha256': POLICY['baseline']['provenance_sha256'],
            'sealed_manifest_sha256': POLICY['baseline']['sealed_manifest_sha256'],
            'snapshot_manifest_sha256': digest(encode(expected)),
            'release_authority_issued': False}



def transition_time(value):
    need(type(value) is str and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z', value), 'TRANSITION_TIMESTAMP')
    try:
        return timestamp(value)
    except (ValueError, TypeError):
        raise Denied('TRANSITION_TIMESTAMP') from None

def baseline_key():
    return 'statistical-levels/publication-state/' + POLICY['baseline']['publication_date_utc'] + '/published.json'


def transition_prefix():
    return baseline_key().removesuffix('published.json') + 'authority-transitions/v1/'


def transition_keys(head):
    need(type(head) is str and re.fullmatch(HASH, head), 'TRANSITION_HEAD')
    prefix = transition_prefix() + head + '/'
    return prefix + 'intent.json', prefix + 'receipt.json'


def transition_request(value):
    fields = {'operation', 'direction', 'phase', 'authorization_sha256', 'expected_head_sha256'}
    need(value.get('phase') in ['prepare', 'certify'], 'TRANSITION_PHASE')
    if value['phase'] == 'certify':
        fields |= CERT_FIELDS
    need(set(value) == fields and all(type(v) is str for v in value.values()), 'TRANSITION_REQUEST_SCHEMA')
    need(value['direction'] in ['rebind', 'rollback'], 'TRANSITION_DIRECTION')
    for key in ['authorization_sha256', 'expected_head_sha256']:
        need(re.fullmatch(HASH, value[key]), 'TRANSITION_HASH')
    if value['phase'] == 'certify':
        need(re.fullmatch(HASH, value['production_qa_attestation_hash']) and re.fullmatch('[1-9][0-9]{0,19}', value['production_qa_attestation_id']), 'TRANSITION_CHECK')
    return dict(value)


def transition_authorization():
    g = EDITORIAL_AUTHORIZATION
    fields = {'schema', 'baseline_marker_sha256', 'source', 'baseline_tree', 'deployment',
              'execution_sha', 'ci_run_id', 'ci_attempt', 'ci_workflow_sha256',
              'release_workflow_sha256', 'snapshot_manifest_sha256', 'rebind_window', 'rollback_window'}
    need(type(g) is dict and set(g) == fields and g['schema'] == 'sl.editorial-authorization.v1', 'TRANSITION_NOT_AUTHORIZED')
    need(set(g['source']) == {'sha', 'parent', 'tree'}, 'TRANSITION_SOURCE_GRANT')
    for v in [*g['source'].values(), g['execution_sha'], g['baseline_tree']]:
        need(type(v) is str and re.fullmatch(SHA, v), 'TRANSITION_SOURCE_GRANT')
    need(g['source'] == EDITORIAL_SOURCE_IDENTITY, 'TRANSITION_SOURCE_GRANT_IDENTITY')
    need(re.fullmatch(DPL, g['deployment']) and g['deployment'] != POLICY['baseline']['production_deployment_id'], 'TRANSITION_TARGET_GRANT')
    for key in ['baseline_marker_sha256', 'ci_workflow_sha256', 'release_workflow_sha256', 'snapshot_manifest_sha256']:
        need(type(g[key]) is str and re.fullmatch(HASH, g[key]) and g[key] != '0' * 64, 'TRANSITION_GRANT_HASH')
    need(re.fullmatch('[1-9][0-9]{0,19}', g['ci_run_id']) and type(g['ci_attempt']) is int and g['ci_attempt'] > 0, 'TRANSITION_CI_GRANT')
    for key in ['rebind_window', 'rollback_window']:
        need(type(g[key]) is list and len(g[key]) == 2 and transition_time(g[key][0]) < transition_time(g[key][1]), 'TRANSITION_WINDOW')
    need(transition_time(g['rollback_window'][1]) >= transition_time(g['rebind_window'][0]), 'TRANSITION_WINDOW')
    return g


def transition_binding(g, sequence):
    b = POLICY['baseline']
    return {'sha': g['source']['sha'], 'deployment': g['deployment']} if sequence == 1 else {'sha': b['production_git_sha'], 'deployment': b['production_deployment_id']}


def resolve_effective_authority(marker, io, *, allow_pending=False):
    """The sole binding resolver. Original marker is always the immutable root.

    Fixed, bounded walk: original -> editorial receipt -> rollback receipt.
    An unresolved transition is NEVER returned as an effective authority.
    Ordinary promotion and editorial transition share a create-only successor slot.
    """
    validate_baseline_marker(marker, io.now())
    root = digest(encode(marker))
    result = {'sequence': 0, 'head_sha256': root, 'binding': transition_binding({}, 0),
              'reservation': None, 'phase': 'EFFECTIVE', 'certified_at_utc': marker['production_certified_at_utc']}
    for sequence in range(3):
        ik, rk = transition_keys(result['head_sha256'])
        intent, receipt = io.marker_get(ik), io.marker_get(rk)
        need(intent is not None or receipt is None, 'TRANSITION_ORPHAN_RECEIPT')
        if intent is None:
            return result
        if intent.get('kind') == 'ordinary':
            need(set(intent) == {'kind', 'previous_head_sha256', 'request_sha256'} and intent['previous_head_sha256'] == result['head_sha256'] and re.fullmatch(HASH, intent['request_sha256']) and receipt is None, 'TRANSITION_ORDINARY_SLOT')
            result['reservation'] = intent
            return result
        g = transition_authorization()
        need(g['baseline_marker_sha256'] == root and sequence < 2, 'TRANSITION_CHAIN_LIMIT')
        direction = 'rebind' if sequence == 0 else 'rollback'
        need(set(intent) == {'schema', 'kind', 'authorization_sha256', 'previous_head_sha256', 'baseline_marker_sha256', 'binding', 'snapshot_manifest_sha256', 'qualification_sha256', 'prepared_at_utc'}, 'TRANSITION_INTENT_SCHEMA')
        need(intent['schema'] == 'sl.authority-intent.v1' and intent['kind'] == direction and intent['authorization_sha256'] == digest(encode(g)) and intent['previous_head_sha256'] == result['head_sha256'] and intent['baseline_marker_sha256'] == root and intent['binding'] == transition_binding(g, sequence + 1) and intent['snapshot_manifest_sha256'] == g['snapshot_manifest_sha256'], 'TRANSITION_INTENT_BINDING')
        start, end = map(timestamp, g[direction + '_window'])
        need(transition_time(result['certified_at_utc']) <= transition_time(intent['prepared_at_utc']) <= io.now() and start <= transition_time(intent['prepared_at_utc']) <= end and re.fullmatch(HASH, intent['qualification_sha256']), 'TRANSITION_INTENT_TIME')
        if receipt is None:
            need(allow_pending, 'AUTHORITY_TRANSITION_PENDING')
            return {**result, 'phase': 'PENDING', 'pending': intent, 'binding': None, 'previous_binding': result['binding']}
        need(set(receipt) == {'schema', 'intent_sha256', 'previous_head_sha256', 'sequence', 'binding', 'certified_at_utc', 'production_qa_attestation_id', 'production_qa_attestation_hash'}, 'TRANSITION_RECEIPT_SCHEMA')
        need(receipt['schema'] == 'sl.authority-receipt.v1' and receipt['intent_sha256'] == digest(encode(intent)) and receipt['previous_head_sha256'] == result['head_sha256'] and type(receipt['sequence']) is int and receipt['sequence'] == sequence + 1 and receipt['binding'] == intent['binding'], 'TRANSITION_RECEIPT_BINDING')
        need(transition_time(intent['prepared_at_utc']) <= transition_time(receipt['certified_at_utc']) <= min(end, io.now()) and re.fullmatch('[1-9][0-9]{0,19}', receipt['production_qa_attestation_id']) and re.fullmatch(HASH, receipt['production_qa_attestation_hash']), 'TRANSITION_RECEIPT_TIME')
        result = {'sequence': sequence + 1, 'head_sha256': digest(encode(receipt)), 'binding': receipt['binding'], 'phase': 'EFFECTIVE', 'reservation': None, 'certified_at_utc': receipt['certified_at_utc']}
    raise Denied('TRANSITION_CHAIN_LIMIT')


def reserve_ordinary_successor(r, lineage, binding, io):
    if r['previous_publication_date'] != POLICY['baseline']['publication_date_utc']:
        return
    root = io.marker_get(baseline_key())
    effective = resolve_effective_authority(root, io)
    expected = lineage.get('previous_authority_transition_sha256', lineage['previous_publication_marker_sha256'])
    need(effective['head_sha256'] == expected, 'TRANSITION_PREDECESSOR_MOVED')
    ik, _ = transition_keys(expected)
    conditional_once(io, ik, {'kind': 'ordinary', 'previous_head_sha256': expected, 'request_sha256': digest(encode(binding))})


def authorized_transition_parent(r, source, io):
    """Only the first data child of the exact qualified technical source R.

    Deployment rollback does not rewrite Git. The immutable receipt must bind
    the expected public predecessor; every data/provenance check still runs.
    """
    if EDITORIAL_AUTHORIZATION is None or r['previous_publication_date'] != POLICY['baseline']['publication_date_utc']:
        return None
    g = transition_authorization()
    if source['parents'] != [g['execution_sha']]:
        return None
    effective = resolve_effective_authority(io.marker_get(baseline_key()), io)
    need(effective['sequence'] in [1, 2] and effective['binding'] == {'sha': r['expected_previous_production_sha'], 'deployment': r['expected_previous_production_deployment']}, 'TRANSITION_DATA_PARENT')
    return g['execution_sha']


def conditional_once(io, key, value):
    """Conflicting contenders lose; a lost response to the same write is safe."""
    existing = io.marker_get(key)
    if existing is not None:
        need(existing == value, 'TRANSITION_SUCCESSOR_CONFLICT')
        return
    try:
        io.marker_create(key, value)
    except Denied as e:
        if str(e) != '412_PRECONDITION_FAILED':
            raise
        need(io.marker_get(key) == value, 'TRANSITION_SUCCESSOR_CONFLICT')


def transition_ci(g, evidence):
    run, jobs = evidence['run'], evidence['jobs']
    for key in ['repository', 'head_repository']:
        repo = run[key]
        need(repo['full_name'] == POLICY['repository'] and repo['private'] is False and str(repo['id']) == POLICY['repository_id'] and str(repo['owner']['id']) == POLICY['repository_owner_id'], 'TRANSITION_CI_REPOSITORY')
    need(str(run['id']) == g['ci_run_id'] and run['run_attempt'] == g['ci_attempt'] and run['workflow_id'] == 336203586 and run['name'] == 'CI' and run['path'] == '.github/workflows/ci.yml' and run['head_sha'] == g['execution_sha'] and run['head_branch'] == POLICY['branch'] and run['event'] == 'push' and run['status'] == 'completed' and run['conclusion'] == 'success', 'TRANSITION_CI_IDENTITY')
    need(evidence['workflow_sha256'] == g['ci_workflow_sha256'], 'TRANSITION_CI_WORKFLOW')
    need(jobs['total_count'] == len(jobs['jobs']) == 1, 'TRANSITION_CI_JOBS')
    job = jobs['jobs'][0]
    need(job['name'] == 'validate' and job['status'] == 'completed' and job['conclusion'] == 'success' and str(job['run_id']) == g['ci_run_id'] and job['run_attempt'] == g['ci_attempt'] and job['head_sha'] == g['execution_sha'], 'TRANSITION_CI_JOB')
    steps = job['steps']
    need(len({s['name'] for s in steps}) == len(steps), 'TRANSITION_CI_STEPS')
    required = {'Bind qualification to event SHA and governed metadata-repair successor lineage',
                'Test bounded CI admission and producer readback', 'Authenticate fresh native capture handoff',
                'Run existing release, native proof, policy and security tests',
                'Reject missing or skipped mandatory coverage and candidate drift',
                'Revalidate exact branch and emit bounded qualification evidence'}
    need(required <= {s['name'] for s in steps}, 'TRANSITION_CI_COVERAGE')
    need(all(s['status'] == 'completed' and s['conclusion'] == 'success' for s in steps if s['name'] in required), 'TRANSITION_CI_COVERAGE')
    return digest(encode(evidence))


def transition_source(g, source, sequence):
    target = transition_binding(g, sequence)
    need(source['repository'] == POLICY['repository'] and source['sha'] == target['sha'] and source['branch'] == POLICY['branch'] and source['branch_sha'] == g['execution_sha'] and source['main_sha'] == POLICY['baseline']['main_sha_observed'], 'TRANSITION_SOURCE_IDENTITY')
    need(source['tree_sha'] == (g['source']['tree'] if sequence == 1 else g['baseline_tree']), 'TRANSITION_SOURCE_TREE')
    if sequence == 1:
        need(source['parents'] == [g['source']['parent']], 'TRANSITION_SOURCE_PARENT')
    relation = source['comparison']
    need(relation['base_commit']['sha'] == relation['merge_base_commit']['sha'] == target['sha'] and type(relation['behind_by']) is int and relation['behind_by'] == 0 and relation['status'] == 'ahead' and type(relation['ahead_by']) is int and relation['ahead_by'] > 0, 'TRANSITION_SOURCE_ANCESTRY')
    identity = validate_preserved_editorial_snapshot(source['tree'], {n: source['blobs'][n] for n in POLICY['allowlist']})
    need(identity['snapshot_manifest_sha256'] == g['snapshot_manifest_sha256'], 'TRANSITION_SNAPSHOT_GRANT')
    return identity


def editorial_transition(r, io):
    """Prepare reservation, then certify an externally authorized traffic change.

    This operation has NO deployment/promotion adapter. Certification happens
    only after independent server evidence observes the exact public target.
    """
    g = transition_authorization()
    need(r['authorization_sha256'] == digest(encode(g)), 'TRANSITION_AUTHORIZATION')
    start, end = map(timestamp, g[r['direction'] + '_window'])
    need(start <= io.now() <= end, 'TRANSITION_WINDOW_CLOSED')
    root = io.marker_get(baseline_key())
    need(digest(encode(root)) == g['baseline_marker_sha256'], 'TRANSITION_BASELINE_HASH')
    current = resolve_effective_authority(root, io, allow_pending=True)
    sequence = 1 if r['direction'] == 'rebind' else 2
    # An exact certification retry is idempotent only while it is the latest
    # transition. An old rebind can never reactivate after rollback or succession.
    if r['phase'] == 'certify' and current['phase'] == 'EFFECTIVE' and current['sequence'] == sequence:
        _, key = transition_keys(r['expected_head_sha256'])
        receipt = io.marker_get(key)
        need(receipt is not None and digest(encode(receipt)) == current['head_sha256'] and receipt['production_qa_attestation_id'] == r['production_qa_attestation_id'] and receipt['production_qa_attestation_hash'] == r['production_qa_attestation_hash'] and current['reservation'] is None, 'TRANSITION_STALE_REPLAY')
        secret = None
        try:
            secret = io.secret()
            need(type(secret) is str and secret.strip() == secret and 20 <= len(secret) <= 2048, 'SECRET_INVALID')
            io.use_secret(secret)
            observe_transition_production(current['binding'], io)
            return {'state': 'ALREADY_CERTIFIED', 'authority_head_sha256': current['head_sha256'], 'provider_fetch': False}
        finally:
            io.clear_secret()
    need(current['sequence'] == sequence - 1 and current['head_sha256'] == r['expected_head_sha256'] and current['reservation'] is None, 'TRANSITION_PREDECESSOR')
    qualification = transition_ci(g, io.transition_qualification(g))
    target = transition_binding(g, sequence)
    request_target = {'operation': TRANSITION, 'candidate_git_sha': target['sha'], 'candidate_deployment_id': target['deployment'], 'authority_run_id': POLICY['baseline']['authority_run_id'], 'sealed_manifest_sha256': POLICY['baseline']['sealed_manifest_sha256'], 'workflow_execution_sha': g['execution_sha'], **{k:r[k] for k in CERT_FIELDS if k in r}}
    transition_source(g, io.source(request_target), sequence)
    ik, rk = transition_keys(current['head_sha256'])
    intent = current.get('pending')
    if intent is not None:
        need(intent['kind'] == r['direction'] and intent['qualification_sha256'] == qualification, 'TRANSITION_PENDING_CONFLICT')
    else:
        need(r['phase'] == 'prepare', 'TRANSITION_NOT_PREPARED')
        intent = {'schema': 'sl.authority-intent.v1', 'kind': r['direction'], 'authorization_sha256': digest(encode(g)), 'previous_head_sha256': current['head_sha256'], 'baseline_marker_sha256': g['baseline_marker_sha256'], 'binding': target, 'snapshot_manifest_sha256': g['snapshot_manifest_sha256'], 'qualification_sha256': qualification, 'prepared_at_utc': io.now().isoformat().replace('+00:00', 'Z')}
    secret = None
    try:
        secret = io.secret()
        need(type(secret) is str and secret.strip() == secret and 20 <= len(secret) <= 2048, 'SECRET_INVALID')
        io.use_secret(secret)
        need(io.main_sha() == POLICY['baseline']['main_sha_observed'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
        deployment = io.deployment(target['deployment'])
        deployment_matches(deployment, target['sha'], target['deployment'], 'production')
        if r['phase'] == 'prepare':
            previous = current.get('previous_binding', current['binding'])
            deployment_matches(io.production(), previous['sha'], previous['deployment'], 'production')
            conditional_once(io, ik, intent)
            return {'state': 'TRANSITION_PREPARED_NOT_CERTIFIED', 'intent_sha256': digest(encode(intent)), 'provider_fetch': False}
        need(current['phase'] == 'PENDING', 'TRANSITION_NOT_PREPARED')
        evidence = io.qa(request_target, 'production')
        need(evidence['approved_workflow_hash'] == g['release_workflow_sha256'], 'TRANSITION_QA_WORKFLOW')
        cert = validate_qa(request_target, evidence, 'production', target['deployment'], io.now())
        need(transition_time(intent['prepared_at_utc']) <= transition_time(cert['timestamp']) and type(deployment.get('ready')) is int and transition_time(cert['timestamp']).timestamp() * 1000 >= deployment['ready'], 'TRANSITION_QA_BEFORE_READY')
        need(cert['origin'] == POLICY['production_origin'] and cert['public_authority_run_id'] == POLICY['baseline']['authority_run_id'], 'TRANSITION_PUBLIC_AUTHORITY')
        observe_transition_production(target, io)
        receipt = {'schema': 'sl.authority-receipt.v1', 'intent_sha256': digest(encode(intent)), 'previous_head_sha256': current['head_sha256'], 'sequence': sequence, 'binding': target, 'certified_at_utc': cert['timestamp'], **{k:r[k] for k in CERT_FIELDS}}
        conditional_once(io, rk, receipt)
        resolved = resolve_effective_authority(root, io)
        need(resolved['head_sha256'] == digest(encode(receipt)), 'TRANSITION_POSTCONDITION')
        return {'state': 'TRANSITION_CERTIFIED', 'authority_head_sha256': resolved['head_sha256'], 'provider_fetch': False}
    finally:
        io.clear_secret()


def observe_transition_production(binding, io):
    production = io.production()
    deployment_matches(production, binding['sha'], binding['deployment'], 'production')
    need({'luiguiherrera.com', 'www.luiguiherrera.com'} <= set(production.get('alias', [])), 'TRANSITION_PUBLIC_DOMAINS')
    io.public_authority(POLICY['baseline']['authority_run_id'])
    need(io.main_sha() == POLICY['baseline']['main_sha_observed'], 'BLOCKED_CONCURRENT_MAIN_ACTIVITY')
    deployment_matches(io.production(), binding['sha'], binding['deployment'], 'production')
