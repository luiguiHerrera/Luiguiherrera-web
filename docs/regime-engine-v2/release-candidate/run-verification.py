"""Portable, read-only release verification; every output has an explicit destination.

Usage: python3 run-verification.py --root /checkout --output-dir /audit --profile candidate
The candidate profile uses committed baseline tests and the intentional V2 tests.
The former worktree profile is retired: unrelated pending files are not release
inputs. This runner never rewrites any six-stage artifact or oracle.
"""
import argparse
from collections import Counter
import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path

BASELINE_TESTS = [
    'lib/dashboard/adapters/vix-term-structure.test.ts',
    'lib/personal-finance/budget/projection-calculations.test.ts',
    'lib/personal-finance/budget/projection-presentation.test.ts',
    'lib/personal-finance/budget/target-calculations.test.ts',
    'lib/portfolio-fragility/analysis-view.test.ts',
    'lib/portfolio-fragility/conformance.test.ts',
    'lib/portfolio-fragility/engine.test.ts',
    'lib/portfolio-fragility/format.test.ts',
    'lib/reports/first-september-2026.test.mts',
    'lib/reports/weekly-review.test.mts',
    'lib/research/tom-decay/chart-geometry.test.ts',
    'lib/research/tom-decay/freeze.test.ts',
    'lib/research/tom-decay/parse.test.ts',
]
OPERATIONS_TESTS = [
    'lib/regime-engine-v2/operations/dashboard-shadow.test.ts',
    'lib/regime-engine-v2/operations/public-preservation.test.ts',
    'lib/regime-engine-v2/operations/source-input.test.ts',
    'lib/regime-engine-v2/operations/snapshot.test.ts',
    'lib/regime-engine-v2/operations/normalizer-preservation.test.mjs',
]
DESIGNER_TESTS = [
    'lib/dashboard/regime-v2-presentation.test.ts',
    'lib/dashboard/regime-v2-preview.test.mjs',
    'lib/dashboard/regime-v2-render.test.mjs',
    'scripts/regime-v2-design-fixtures.test.ts',
]
NODE = ['node', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON']


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def aggregate(values):
    return hashlib.sha256(json.dumps(values, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def node_counts(path):
    result = {}
    for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
        match = re.search(r'^(?:ℹ|#)\s+' + key + r'\s+(\d+)\s*$', path.read_text(), re.MULTILINE)
        result[key] = int(match.group(1)) if match else None
    return result


def clean(counts, expected=None):
    return counts['tests'] is not None and counts['tests'] == counts['pass'] and (expected is None or counts['tests'] == expected) and all(counts[key] == 0 for key in ['fail', 'cancelled', 'skipped', 'todo'])


def canonical_sources(root):
    paths = list((root / 'lib/regime-engine-v2').rglob('*'))
    paths += list((root / 'lib/dashboard').glob('regime-v2*'))
    paths += list((root / 'components/dashboard').glob('*RegimeV*'))
    paths += list((root / 'components/dashboard').glob('regime-v2*'))
    paths += list((root / 'scripts').glob('regime-v2*'))
    paths += list((root / 'app').glob('**/internal/regime-v2/*'))
    paths += [root / p for p in ['.env.example', 'app/(es)/dashboard/page.tsx', 'lib/dashboard/adapters/vix-term-structure.ts', 'lib/dashboard/get-dashboard-data.ts', 'lib/dashboard/get-home-dashboard-preview-data.ts', 'scripts/build-statistical-levels.mjs', 'scripts/trends-test-register.mjs']]
    return {str(p.relative_to(root)): sha(p) for p in sorted(set(paths)) if p.is_file() and (p.suffix in {'.ts', '.tsx', '.mts', '.mjs', '.css'} or p.name == '.env.example')}


def prior_artifacts(root):
    directory = root / 'docs/regime-engine-v2'
    return {str(p.relative_to(root)): sha(p) for p in sorted(directory.rglob('*')) if p.is_file() and 'release-candidate' not in p.relative_to(directory).parts and '__pycache__' not in p.parts}


def accepted_sources(root):
    original = read(root / 'docs/regime-engine-v2/designer/input-manifest.json')['all_input_files']
    designer = read(root / 'docs/regime-engine-v2/designer/files-changed.json')
    for item in designer['modified_existing_files']:
        original[item['path']] = item['after_sha256']
    for item in designer['added_files']:
        if item.get('sha256'):
            original[item['path']] = item['sha256']
    return original


def run(root, out, env, item, timeout):
    name, command = item
    start = time.monotonic()
    try:
        result = subprocess.run(command, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout)
        output, code = result.stdout, result.returncode
    except subprocess.TimeoutExpired as error:
        output, code = str(error.stdout or '') + '\nCommand exceeded timeout.\n', 124
    logfile = out / (name + '.log')
    logfile.write_text(output)
    record = {'name': name, 'command': command, 'exit_code': code, 'elapsed_seconds': time.monotonic() - start, 'log': str(logfile), 'log_sha256': sha(logfile)}
    print(json.dumps({'completed': name, 'exit_code': code, 'elapsed_seconds': round(record['elapsed_seconds'], 3)}), flush=True)
    return record


def lint_summary(root, filename):
    if not filename.exists():
        return None
    rows = read(filename)
    result = {'errors': sum(row['errorCount'] for row in rows), 'warnings': sum(row['warningCount'] for row in rows)}
    package = root / 'docs/regime-engine-v2/release-candidate'
    baseline_file = package / 'parent-head-lint.json'
    metadata = read(package / 'parent-lint-baseline.json')
    if sha(baseline_file) != metadata['lint_output_sha256']:
        raise RuntimeError('Committed parent lint evidence hash mismatch.')
    baseline_rows = read(baseline_file)
    parent = metadata['identity']['commit']
    parent_tree = subprocess.check_output(['git', 'rev-parse', parent + '^{tree}'], cwd=root, text=True).strip()
    if parent_tree != metadata['identity']['tree']:
        raise RuntimeError('Committed parent lint tree mismatch.')

    def warning_records(items, directory, revision=None):
        records = []
        for row in items:
            warnings = [message for message in row['messages'] if message['severity'] == 1]
            if not warnings:
                continue
            # The historical absolute root is provenance, never a filesystem input.
            relative = str(Path(row['filePath']).relative_to(directory))
            if revision:
                text = subprocess.check_output(['git', 'show', revision + ':' + relative], cwd=root, text=True)
            else:
                text = (directory / relative).read_text()
            lines = text.splitlines()
            for message in warnings:
                line = message.get('line', 0)
                fragment = lines[line - 1].strip() if 0 < line <= len(lines) else ''
                identity = (relative, message.get('ruleId'), message.get('message'), fragment)
                records.append({'identity': identity, 'line': line, 'column': message.get('column')})
        return records
    current = warning_records(rows, root)
    baseline = warning_records(baseline_rows, Path(metadata['identity']['root']), parent)
    current_counts = Counter(tuple(row['identity']) for row in current)
    baseline_counts = Counter(tuple(row['identity']) for row in baseline)
    new = list((current_counts - baseline_counts).elements())
    moved = []
    for row in current:
        matches = [old for old in baseline if old['identity'] == row['identity']]
        if matches and not any(old['line'] == row['line'] and old['column'] == row['column'] for old in matches):
            moved.append({'path': row['identity'][0], 'rule': row['identity'][1], 'message': row['identity'][2], 'unchanged_source_fragment': row['identity'][3], 'parent_positions': [{'line': old['line'], 'column': old['column']} for old in matches], 'candidate_position': {'line': row['line'], 'column': row['column']}})
    result.update({'new_warnings': len(new), 'new_warning_details': new, 'moved_existing_warnings': moved, 'baseline_warnings': sum(row['warningCount'] for row in baseline_rows), 'baseline_lint_file': str(baseline_file), 'baseline_lint_sha256': sha(baseline_file), 'baseline_commit': parent, 'baseline_tree': parent_tree, 'baseline_source': 'Committed diagnostics and Git parent blobs; no historical checkout or uncommitted baseline file is read.', 'note': 'Warning identity is checkout-relative path, rule, message and exact trimmed source line, with multiplicity. Unchanged statements displaced by inserted code remain existing warnings; original/candidate positions are retained.'})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--profile', choices=['candidate'], default='candidate', help='Only committed candidate inputs are supported; the historical worktree profile is retired.')
    parser.add_argument('--identity', default='unspecified checkout')
    parser.add_argument('--gates', choices=['none', 'static', 'all'], default='none')
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    root, out = args.root.resolve(), args.output_dir.resolve()
    previous = root / 'docs/regime-engine-v2'
    if out == root or (out.is_relative_to(previous) and not out.is_relative_to(previous / 'release-candidate')):
        raise ValueError('Output must be outside the source checkout or inside release-candidate, never a prior-stage directory.')
    if out.exists() and any(out.iterdir()):
        raise ValueError('Output directory must be empty; use a new audit destination for a complete candidate run.')
    out.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'V2_SHADOW': 'OFF'}
    before_sources, before_artifacts = canonical_sources(root), prior_artifacts(root)
    accepted = accepted_sources(root)
    accepted_differences = [{'path': p, 'accepted': accepted.get(p), 'observed': value} for p, value in before_sources.items() if accepted.get(p) != value]
    if accepted_differences:
        raise RuntimeError('Accepted engine/design/shadow source changed: ' + json.dumps(accepted_differences))
    prefix = NODE + ['--import', './scripts/trends-test-register.mjs', '--experimental-test-module-mocks', '--test']
    baseline = BASELINE_TESTS + ['lib/regime-engine-v2/engine.test.ts']
    for relative in baseline + OPERATIONS_TESTS + DESIGNER_TESTS:
        if not (root / relative).is_file():
            raise RuntimeError('Required test absent from selected checkout: ' + relative)
    commands = {
        'conformance': NODE + ['scripts/regime-v2-conformance.mts', '--output-dir', str(out / 'conformance')],
        'sweeper-attacks': NODE + ['docs/regime-engine-v2/sweeper/adversarial.mjs', str(out / 'sweeper-attacks.json')],
        'baseline-node-tests': prefix + baseline,
        'operations-tests': prefix + OPERATIONS_TESTS,
        'designer-tests': prefix + DESIGNER_TESTS,
        'designer-fixtures-check': NODE + ['scripts/regime-v2-design-fixtures.mts', '--check'],
        'offline-challenger-tests': NODE + ['--test', 'docs/regime-engine-v2/groweer/challengers.test.mjs'],
        'reports-validate': ['npm', 'run', 'reports:validate'],
        'reports-check': ['npm', 'run', 'reports:check'],
        'editorial': ['npm', 'run', 'validate:editorial'],
    }
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda item: run(root, out, env, item, args.timeout), commands.items()))
    if args.gates != 'none':
        results.append(run(root, out, env, ('typecheck', ['npx', 'tsc', '--noEmit', '--incremental', 'false']), args.timeout))
        results.append(run(root, out, env, ('lint', ['npx', 'eslint', '.', '--format', 'json', '--output-file', str(out / 'lint.json')]), args.timeout))
    if args.gates == 'all':
        results.append(run(root, out, env, ('build', ['npm', 'run', 'build']), args.timeout))
        results.append(run(root, out, env, ('typecheck-after-build', ['npx', 'tsc', '--noEmit', '--incremental', 'false']), args.timeout))
    conf = read(out / 'conformance/conformance.json')
    attacks = read(out / 'sweeper-attacks.json')
    node = node_counts(out / 'baseline-node-tests.log')
    ops = node_counts(out / 'operations-tests.log')
    design = node_counts(out / 'designer-tests.log')
    challenger = node_counts(out / 'offline-challenger-tests.log')
    history_equal = read(out / 'conformance/historical-r2-output.json') == read(root / 'docs/regime-engine-v2/sweeper/historical-r2-output.json')
    after_sources, after_artifacts = canonical_sources(root), prior_artifacts(root)
    checks = {
        'commands_exit_zero': all(item['exit_code'] == 0 for item in results),
        'golden_464': conf.get('goldenPassed') == conf.get('goldenTotal') == 464,
        'historical_R2_1930': conf.get('historicalPassed') == conf.get('historicalTotal') == conf.get('publicC03HistoricalPassed') == 1930,
        'accepted_Sweeper_history_identical': history_equal,
        'sweeper_attacks_110': attacks.get('passed') == attacks.get('total') == 110 and attacks.get('status') == 'PASS',
        'baseline_V1_and_engine_tests': clean(node),
        'Maintainer_operations_78': clean(ops, 78), 'Designer_59': clean(design, 59),
        'offline_Groweer_36': clean(challenger, 36),
        'accepted_engine_design_shadow_unchanged': not accepted_differences and before_sources == after_sources,
        'prior_stage_artifacts_not_rewritten': before_artifacts == after_artifacts,
    }
    groups = {'baseline_node': {'passed': node['pass'], 'total': node['tests']}, 'maintainer_operations': {'passed': ops['pass'], 'total': ops['tests']}, 'designer': {'passed': design['pass'], 'total': design['tests']}, 'offline_challengers': {'passed': challenger['pass'], 'total': challenger['tests']}, 'sweeper_attacks': {'passed': attacks.get('passed'), 'total': attacks.get('total')}}
    lint = lint_summary(root, out / 'lint.json')
    if lint is not None:
        checks['lint_errors_zero'] = lint['errors'] == 0
        if 'new_warnings' in lint:
            checks['new_lint_warnings_zero'] = lint['new_warnings'] == 0
    package = read(root / 'package.json'); lock = read(root / 'package-lock.json'); installed = read(root / 'node_modules/next/package.json')
    versions = {'declared': package['dependencies']['next'], 'locked': lock['packages']['node_modules/next']['version'], 'installed': installed['version']}
    checks['Next_accepted_16_3_1'] = set(versions.values()) == {'16.3.1'}
    report = {
        'status': 'PASS' if all(checks.values()) else 'FAIL', 'profile': args.profile,
        'source_root': str(root), 'output_dir': str(out), 'identity': args.identity,
        'started_at': started, 'completed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'checks': checks, 'commands': results, 'next_versions': versions, 'lint': lint,
        'golden': {'passed': conf.get('goldenPassed'), 'total': conf.get('goldenTotal')},
        'historical_R2': {'passed': conf.get('historicalPassed'), 'total': conf.get('historicalTotal'), 'accepted_history_equal': history_equal, 'point_in_time_OOS': False},
        'sweeper_attacks': {'passed': attacks.get('passed'), 'total': attacks.get('total')},
        'tests': {'breakdown': groups, 'passed': sum(item['passed'] or 0 for item in groups.values()), 'total': sum(item['total'] or 0 for item in groups.values()), 'note': 'Golden/history are separate. Candidate excludes pending unrelated tests absent from HEAD; offline challengers do not enter canonical methodology.'},
        'test_selection': {'baseline_files': baseline, 'operations_files': OPERATIONS_TESTS, 'designer_files': DESIGNER_TESTS, 'unrelated_pending_work_included': False},
        'preservation': {'accepted_source_differences': accepted_differences, 'critical_source_files': len(before_sources), 'critical_source_hash': aggregate(after_sources), 'critical_source_hashes': after_sources, 'prior_stage_files_observed': len(before_artifacts), 'prior_stage_hash_before': aggregate(before_artifacts), 'prior_stage_hash_after': aggregate(after_artifacts)},
        'gates_requested': args.gates, 'build': 'PASS' if args.gates == 'all' and checks['commands_exit_zero'] else 'NOT_RUN' if args.gates != 'all' else 'FAIL',
        'shadow': 'OFF', 'public_authority': 'V1', 'live_capture_acquired': False,
        'runtime_capture_in_repository': False, 'push': False, 'deployment': False, 'cutover': False,
    }
    (out / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'checks': checks, 'tests': report['tests']}, indent=2), flush=True)
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
