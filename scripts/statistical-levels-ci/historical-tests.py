"""Execute the unchanged historical registry models on their real Git subject.

The CI job's native SHA and environment are never changed. Only this separate
historical subprocess has no event identity. Its result is explicitly NOT a
native hosted qualification of the new SHA; native admission is tested separately.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from admission import Git, OLD, need, digest, bootstrap


def reuse_scope(git, head):
    # The old 261 cases retain OLD as their actual subject. Changed native
    # capture bytes are qualified by the new differential tests and live capture.
    root, _ = bootstrap(git, head)
    a, b = git.tree(OLD), git.tree(head)
    scope = {p for p in a if p.startswith('scripts/statistical-levels-release/')} | {'package.json', 'package-lock.json'}
    changed = {'scripts/statistical-levels-release/' + p for p in [
        'scripts/capture-full-product.mjs', 'source-manifest.json', 'SOURCE_SHA256SUMS', 'workflow-freeze.json']}
    need(len(scope) == 115 and {p for p in scope if a[p] != b.get(p)} == changed, 'HISTORICAL_BYTES_CHANGED')
    need(all(b[p] == git.tree(root)[p] for p in changed), 'CAPTURE_SUCCESSOR_BYTES_CHANGED')
    return scope - changed, {p: {'old_sha256': digest(git.blob(OLD, p)), 'current_sha256': digest(git.blob(head, p))}
        for p in sorted(changed)}


def run(root, output, env):
    git = Git(root)
    head = git.text('rev-parse', 'HEAD')
    need(head == env['GITHUB_SHA'] == env['CI_EVENT_SHA'], 'HISTORICAL_CALLER_SHA')
    reused, changed = reuse_scope(git, head)
    target = Path(tempfile.mkdtemp(prefix='sl-ci-historical-', dir=env['RUNNER_TEMP'])) / 'checkout'
    subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(root), str(target)], check=True)
    subprocess.run(['git', 'checkout', '--detach', OLD], cwd=target, check=True)
    historical = Git(target)
    need(historical.text('rev-parse', 'HEAD') == OLD and historical.text('status', '--porcelain') == '', 'HISTORICAL_CHECKOUT')
    child_env = {k: v for k, v in env.items() if k not in {'GITHUB_SHA', 'CI_EVENT_SHA', 'GITHUB_EVENT_NAME', 'GITHUB_REF', 'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256', 'CI_EVIDENCE'}}
    tests = ['scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs',
             'scripts/statistical-levels-release/tests/g5-execution-preservation.test.mjs']
    with (output / 'release-historical.tap').open('wb') as log:
        result = subprocess.run(['node', '--test', '--test-concurrency=1', '--test-reporter=tap', *tests], cwd=target, env=child_env, stdout=log, stderr=subprocess.STDOUT)
    need(result.returncode == 0, 'HISTORICAL_TEST_FAILURE')
    need(historical.text('status', '--porcelain', '--untracked-files=no') == '', 'HISTORICAL_TRACKED_DRIFT')
    need(git.text('rev-parse', 'HEAD') == head and env['GITHUB_SHA'] == head, 'NATIVE_CALLER_CHANGED')
    record = {'schema': 'statistical-levels.ci-historical-tests.v1', 'qualification_sha': head,
        'test_source_sha': OLD, 'test_files': tests, 'historical_caller_mode': 'ACTUAL_LOCAL_G5_CALLER_NOT_HOSTED',
        'native_admission_of_new_sha': False, 'unchanged_release_and_dependency_files': len(reused),
        'excluded_from_historical_reuse': changed,
        'tap_sha256': digest((output / 'release-historical.tap').read_bytes()), 'exit_code': result.returncode}
    (output / 'historical-test-subject.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record))


if __name__ == '__main__':
    run(Path.cwd(), Path(os.environ['CI_EVIDENCE']), os.environ)
