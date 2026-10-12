"""Verify RC2 using only its Git history, sealed sources and installed tools.

The RC1 runner and all numerical oracles remain unchanged. The release manifest
names the exact operational delta; it cannot authorize changes to the engine.
All generated evidence goes outside the checkout. No AWS credentials are needed.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

RC1 = '330e95bf131fc824c4710ff5df734cafdc719263'
PACKAGE = 'docs/regime-engine-v2/shadow-operations/s3-rc2'
MANIFEST = PACKAGE + '/release-manifest.json'
RUNNER = 'docs/regime-engine-v2/release-candidate/run-verification.py'
PERMITTED_EXISTING = {
    '.env.example', 'lib/dashboard/get-dashboard-data.ts',
    'lib/dashboard/get-home-dashboard-preview-data.ts',
    'lib/dashboard/regime-v2-render.test.mjs',
    'lib/regime-engine-v2/operations/source-input.ts',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root)


def validate(root):
    if any((root / name).is_symlink() for name in ['.git', 'node_modules', '.next']):
        raise ValueError('Checkout, installed dependencies and build roots must not be external symlinks')
    if (root / MANIFEST).is_symlink() or not (root / MANIFEST).resolve().is_relative_to(root):
        raise ValueError('Manifest must be an in-checkout regular file')
    manifest_bytes = (root / MANIFEST).read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest['baseCommit'] != RC1:
        raise ValueError('Incorrect RC1 base')
    head = git(root, 'rev-parse', 'HEAD').decode().strip()
    if head != RC1 and git(root, 'rev-list', '--parents', '-n', '1', head).decode().split() != [head, RC1]:
        raise ValueError('RC2 must be a direct, single-parent child of RC1')
    original_paths = set(git(root, 'ls-tree', '-r', '--name-only', '-z', RC1).decode().split('\0')) - {''}
    changes = {row['path']: row for row in manifest['changes']}
    if len(changes) != len(manifest['changes']) or MANIFEST in changes:
        raise ValueError('Duplicate path or self-referential release manifest')
    for relative, item in changes.items():
        path = Path(relative)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Invalid release path')
        if (root / path).is_symlink() or not (root / path).resolve().is_relative_to(root):
            raise ValueError('Sealed inputs cannot redirect outside the checkout: ' + relative)
        if relative in original_paths and relative not in PERMITTED_EXISTING:
            raise ValueError('Existing source is outside the accepted operations delta: ' + relative)
        before = sha(git(root, 'show', RC1 + ':' + relative)) if relative in original_paths else None
        if before != item['beforeSha256'] or sha((root / relative).read_bytes()) != item['afterSha256']:
            raise ValueError('Release source identity mismatch: ' + relative)
    for relative in original_paths:
        if (root / relative).is_symlink() or not (root / relative).resolve().is_relative_to(root):
            raise ValueError('Original inputs cannot be symlinks: ' + relative)
        expected = changes[relative]['afterSha256'] if relative in changes else sha(git(root, 'show', RC1 + ':' + relative))
        if sha((root / relative).read_bytes()) != expected:
            raise ValueError('Unexpected change to RC1 source: ' + relative)
    allowed = original_paths | set(changes) | {MANIFEST}
    for directory, folders, files in os.walk(root):
        if any((Path(directory) / name).is_symlink() for name in folders):
            raise ValueError('Source directories cannot be symlinks')
        folders[:] = [name for name in folders if name not in {'.git', 'node_modules', '.next'}]
        for filename in files:
            relative = str((Path(directory) / filename).relative_to(root))
            if relative not in allowed:
                raise ValueError('Unsealed checkout input: ' + relative)
    for relative in manifest['supplementalTests']:
        if relative not in changes:
            raise ValueError('Supplemental test is not sealed: ' + relative)
    calendar = 'lib/regime-engine-v2/calendars/reviewed-2026.json'
    if sha((root / calendar).read_bytes()) != '570adddeef6e6dfdfa313cafb3c98c7a6793e3a932b49387132a99deb17e396a':
        raise ValueError('Accepted calendar package bytes changed')
    return manifest, sha(manifest_bytes), head


def main():
    sys.dont_write_bytecode = True
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--actionlint', required=True, type=Path)
    parser.add_argument('--gates', choices=['all', 'static', 'none'], default='all')
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    root, out = args.root.resolve(), args.output_dir.resolve()
    if out.is_relative_to(root):
        raise ValueError('Verification output must be outside the checkout')
    manifest, manifest_hash, head = validate(root)
    # Tests inject their own fake credentials/CLI. Never inherit an operator's
    # AWS credentials or job activation settings into compile/test processes.
    for name in list(os.environ):
        if name.startswith(('AWS_', 'GITHUB_', 'V2_SHADOW')):
            os.environ.pop(name)
    os.environ.update({'PYTHONDONTWRITEBYTECODE': '1', 'V2_SHADOW': 'OFF', 'V2_SHADOW_JOB_ENABLED': 'OFF', 'AWS_EC2_METADATA_DISABLED': 'true', 'AWS_CONFIG_FILE': os.devnull, 'AWS_SHARED_CREDENTIALS_FILE': os.devnull})
    guard = root / PACKAGE / 'deny-network.cjs'
    os.environ['NODE_OPTIONS'] = '--require=' + json.dumps(str(guard))
    os.environ['REGIME_NETWORK_GUARD_LOG'] = str(out / 'network-guard.jsonl')
    spec = importlib.util.spec_from_file_location('rc1_candidate_runner', root / RUNNER)
    runner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runner)
    original_accepted = runner.accepted_sources
    accepted = original_accepted(root)
    changes = {row['path']: row['afterSha256'] for row in manifest['changes']}
    differences = [{'path': path, 'acceptedRC1Sha256': accepted.get(path), 'approvedRC2Sha256': value}
                   for path, value in runner.canonical_sources(root).items() if accepted.get(path) != value]
    if any(changes.get(row['path']) != row['approvedRC2Sha256'] for row in differences):
        raise ValueError('Unsealed canonical source delta')
    runner.accepted_sources = lambda selected: {**original_accepted(selected), **changes}
    sys.argv = [str(root / RUNNER), '--root', str(root), '--output-dir', str(out), '--profile', 'candidate', '--identity', 'RC2_OPERATIONAL_DELTA_' + head, '--gates', args.gates, '--timeout', str(args.timeout)]
    canonical_exit = runner.main()
    report = runner.read(out / 'verification.json')
    report['checks']['sealed_RC2_operations_and_unchanged_engine'] = report['checks'].pop('accepted_engine_design_shadow_unchanged')
    report['preservation']['approved_RC1_source_differences'] = differences
    env = dict(os.environ)
    supplemental = runner.run(root, out, env, ('rc2-operational-tests', runner.NODE + ['--import', './scripts/trends-test-register.mjs', '--experimental-test-module-mocks', '--test', *manifest['supplementalTests']]), args.timeout)
    counts = runner.node_counts(out / 'rc2-operational-tests.log')
    report['supplemental_operational_tests'] = {'command': supplemental, 'counts': counts, 'separate_from_canonical_487': True}
    report['checks']['RC2_operational_tests'] = supplemental['exit_code'] == 0 and runner.clean(counts, manifest['expectedSupplementalTests'])
    portability = runner.run(root, out, env, ('portability-tests', [sys.executable, '-B', str(root / 'docs/regime-engine-v2/rc-portability-repair/test-portability.py'), '--root', str(root), '--lint-json', str(out / 'lint.json')]), args.timeout)
    rows = [json.loads(line) for line in (out / 'portability-tests.log').read_text().splitlines() if line.startswith('{')]
    portability_result = rows[-1] if rows else {}
    report['portability_tests'] = {'command': portability, 'result': portability_result}
    report['checks']['portability_32'] = portability['exit_code'] == 0 and portability_result.get('status') == 'PASS' and portability_result.get('tests') == 32
    policies = runner.run(root, out, env, ('policy-matrix', [sys.executable, '-B', str(root / PACKAGE / 'aws/test-policies.py')]), args.timeout)
    report['policy_matrix'] = policies
    report['checks']['policy_matrix'] = policies['exit_code'] == 0
    actionlint = args.actionlint.resolve()
    version = subprocess.run([str(actionlint), '--version'], capture_output=True, text=True, check=True).stdout
    if '1.7.12' not in version:
        raise ValueError('Use the reviewed actionlint 1.7.12 release')
    workflow = runner.run(root, out, env, ('shadow-workflow-actionlint', [str(actionlint), '-shellcheck=', '-pyflakes=', str(root / '.github/workflows/regime-v2-shadow.yml')]), args.timeout)
    report['workflow_validation'] = {'command': workflow, 'actionlintVersion': version.strip(), 'binarySha256': sha(actionlint.read_bytes())}
    report['checks']['shadow_workflow_actionlint'] = workflow['exit_code'] == 0
    report['checks']['canonical_487'] = report['tests']['passed'] == report['tests']['total'] == 487
    report['release'] = {'baseCommit': RC1, 'observedHead': head, 'manifest': MANIFEST, 'manifestSha256': manifest_hash, 'awsCredentialsRequired': False, 'remoteCanary': 'NOT_RUN'}
    network_log = out / 'network-guard.jsonl'
    network_rows = [json.loads(line) for line in network_log.read_text().splitlines()] if network_log.exists() else []
    report['network_audit'] = {'guard': str(guard.relative_to(root)), 'guardSha256': sha(guard.read_bytes()), 'log': str(network_log), 'logSha256': sha(network_log.read_bytes()) if network_log.exists() else None, 'events': len(network_rows), 'scope': 'Node fetch/http/https/net/tls outbound connections are denied; loopback and Unix IPC remain available for local tests. Dependency installation is outside this verification process.'}
    report['checks']['network_guard_loaded'] = any(row.get('event') == 'NETWORK_GUARD_LOADED' for row in network_rows)
    final_manifest, final_hash, final_head = validate(root)
    report['checks']['sealed_sources_preserved_after_all_verification'] = final_manifest == manifest and final_hash == manifest_hash and final_head == head
    report['status'] = 'PASS' if canonical_exit == 0 and all(report['checks'].values()) else 'FAIL'
    (out / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'RC2_status': report['status'], 'canonical': report['tests'], 'operational': counts, 'portability': portability_result}, indent=2))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
