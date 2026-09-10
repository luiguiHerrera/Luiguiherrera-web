"""Committed dual-baseline verification; all generated evidence stays external.

SOURCE_RC2 original suites run on an exact independent checkout. Integration
counterparts are explicitly selected below; historical source is never rewritten.
REMOTE_BASE raw failures stay visible and are compared with the same candidate
tests. Only named, evidenced historical-scope bindings may be adjudicated.
"""
import argparse
import datetime
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def names(path):
    result = []
    for line in path.read_text().splitlines():
        if line.startswith('✖ ') and not line.startswith('✖ failing'):
            name = line[2:].rsplit(' (', 1)[0]
            if name not in result:
                result.append(name)
    return result


def source_result(model, directory):
    result = read(directory / 'verification.json')
    if result['status'] != 'PASS' or not all(result['checks'].values()):
        raise ValueError('Exact SOURCE_RC2 verification did not pass')
    if result['release']['observedHead'] != model.SOURCE_RC2:
        raise ValueError('Wrong source RC2 verification identity')
    if result['tests']['passed'] != 487 or result['tests']['total'] != 487:
        raise ValueError('Wrong original canonical universe')
    if result['supplemental_operational_tests']['counts']['pass'] != 142 or result['portability_tests']['result']['tests'] != 32:
        raise ValueError('Original operational/portability results absent')
    commands = result['commands'] + [result['supplemental_operational_tests']['command'],
                                    result['portability_tests']['command'], result['policy_matrix'],
                                    result['workflow_validation']['command']]
    for command in commands:
        if command['exit_code'] != 0 or model.sha(Path(command['log']).read_bytes()) != command['log_sha256']:
            raise ValueError('Source RC2 command evidence is invalid')
    return {'status': 'PASS', 'commit': model.SOURCE_RC2, 'tree': model.SOURCE_RC2_TREE,
            'originalCanonical': result['tests'], 'originalOperational': result['supplemental_operational_tests']['counts'],
            'originalPortability': result['portability_tests']['result'],
            'report': str(directory / 'verification.json'), 'sha256': model.sha((directory / 'verification.json').read_bytes()),
            'commandLogsVerified': len(commands)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['root', 'source-root', 'remote-root', 'source-results', 'output-dir', 'actionlint', 'historical-archive']:
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--candidate-tree', required=True)
    parser.add_argument('--compatibility-sha256', required=True)
    args = parser.parse_args()
    root, source, remote, out = (value.resolve() for value in [args.root, args.source_root, args.remote_root, args.output_dir])
    if out.exists() or any(out.is_relative_to(value) for value in [root, source, remote]):
        raise ValueError('New external output destination required')
    model = load('dual_baseline_model', Path(__file__).with_name('model.py'))
    initial = model.validate_candidate(root, args.candidate_tree, args.compatibility_sha256)
    authorities = {'SOURCE_RC2': model.validate_authority(source, model.SOURCE_RC2),
                   'REMOTE_BASE': model.validate_authority(remote, model.REMOTE_BASE)}
    verified_source = source_result(model, args.source_results.resolve())
    runner_path = 'docs/regime-engine-v2/release-candidate/run-verification.py'
    if (root / runner_path).read_bytes() != model.git(root, 'show', model.SOURCE_RC2 + ':' + runner_path):
        raise ValueError('Historical canonical verifier modified')
    runner = load('unchanged_canonical_definitions', root / runner_path)
    manifest = read(root / 'docs/regime-engine-v2/shadow-operations/s3-rc2/release-manifest.json')
    out.mkdir(parents=True)
    env = dict(os.environ)
    for name in list(env):
        if name.startswith(('AWS_', 'GITHUB_', 'V2_SHADOW', 'ACTIONS_ID_TOKEN')):
            env.pop(name)
    guard = root / 'docs/regime-engine-v2/shadow-operations/s3-rc2/deny-network.cjs'
    env.update(PYTHONDONTWRITEBYTECODE='1', V2_SHADOW='OFF', V2_SHADOW_JOB_ENABLED='OFF',
               AWS_CONFIG_FILE=os.devnull, AWS_SHARED_CREDENTIALS_FILE=os.devnull,
               AWS_EC2_METADATA_DISABLED='true', NEXT_TELEMETRY_DISABLED='1',
               NODE_OPTIONS='--require=' + json.dumps(str(guard)), REGIME_NETWORK_GUARD_LOG=str(out / 'network-guard.jsonl'),
               REGIME_INTEGRATION_ROOT=str(root), REGIME_INTEGRATION_REMOTE_ROOT=str(remote),
               REGIME_INTEGRATION_SOURCE_RC2_ROOT=str(source), REGIME_INTEGRATION_AUDIT_OUTPUT_DIR=str(out))
    prefix = runner.NODE + ['--import', './scripts/trends-test-register.mjs', '--experimental-test-module-mocks', '--test']
    remote_tests = [path for path in model.tree(remote, model.REMOTE_BASE) if re.search(r'\.test\.(?:ts|tsx|mts|mjs|js)$', path)]
    operations = [path for path in runner.OPERATIONS_TESTS if not path.endswith('/public-preservation.test.ts')] + ['scripts/regime-integration/v1-maintainer.test.mjs']
    designer = [path for path in runner.DESIGNER_TESTS if not path.endswith('/regime-v2-render.test.mjs')] + ['scripts/regime-integration/v1-designer.test.mjs']
    operational = [path for path in manifest['supplementalTests'] if not path.endswith('/public-shadow-isolation.test.mjs')] + ['scripts/regime-integration/v1-public.test.mjs']
    commands = []

    def run(name, command, selected=root):
        value = runner.run(selected, out, env, (name, command), 600)
        commands.append(value)
        write(out / 'commands.json', commands)
        return value

    run('remote-baseline-raw', prefix + remote_tests, remote)
    run('remote-baseline-lint', ['node', 'node_modules/eslint/bin/eslint.js', '.', '--format', 'json', '--output-file', str(out / 'remote-lint.json')], remote)
    run('remote-baseline-typecheck', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'], remote)
    run('remote-baseline-build', ['npm', 'run', 'build'], remote)
    run('remote-baseline-typecheck-after-build', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'], remote)
    run('conformance', runner.NODE + ['scripts/regime-v2-conformance.mts', '--output-dir', str(out / 'conformance')])
    run('sweeper-attacks', runner.NODE + ['docs/regime-engine-v2/sweeper/adversarial.mjs', str(out / 'sweeper-attacks.json')])
    run('canonical-baseline', prefix + runner.BASELINE_TESTS + ['lib/regime-engine-v2/engine.test.ts'])
    run('canonical-maintainer', prefix + operations)
    run('canonical-designer', prefix + designer)
    run('canonical-challengers', runner.NODE + ['--test', 'docs/regime-engine-v2/groweer/challengers.test.mjs'])
    run('designer-fixtures', runner.NODE + ['scripts/regime-v2-design-fixtures.mts', '--check'])
    run('shadow-operational', prefix + operational)
    run('remote-candidate-raw', prefix + remote_tests)
    run('python-xml', [sys.executable, '-B', 'scripts/test-capital-xml.py'])
    run('dual-baseline-negative-controls', [sys.executable, '-B', 'scripts/regime-integration/model.test.py'])
    run('v1-compatibility', prefix + ['scripts/regime-integration/v1-compat.test.mjs'])
    run('remote-preservation-controls', prefix + ['scripts/regime-integration/remote-preservation.test.mjs'])
    run('provenance', runner.NODE + ['scripts/regime-integration/provenance-verify.mjs', '--source-rc2', model.SOURCE_RC2, '--remote-base', model.REMOTE_BASE, '--output', str(out / 'provenance.json'), '--archive', str(args.historical_archive.resolve())])
    provenance_tests = sorted(str(path.relative_to(root)) for path in (root / 'scripts/regime-integration').glob('provenance-*.test.mjs'))
    if not provenance_tests:
        raise ValueError('Required provenance negative regressions absent')
    run('provenance-regressions', prefix + provenance_tests)
    for name in ['reports:validate', 'reports:check', 'validate:editorial', 'validate:seo']:
        run(name.replace(':', '-'), ['npm', 'run', name])
    run('typecheck', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'])
    run('lint', ['node', 'node_modules/eslint/bin/eslint.js', '.', '--format', 'json', '--output-file', str(out / 'lint.json')])
    run('portability', [sys.executable, '-B', 'scripts/regime-integration/portability.test.py', '--root', str(root), '--remote-root', str(remote), '--lint-json', str(out / 'lint.json'), '--remote-lint-json', str(out / 'remote-lint.json'), '--output', str(out / 'portability.json')])
    run('build', ['npm', 'run', 'build'])
    run('typecheck-after-build', ['node', 'node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'])
    run('policy-matrix', [sys.executable, '-B', 'docs/regime-engine-v2/shadow-operations/s3-rc2/aws/test-policies.py'])
    run('shadow-workflow-actionlint', [str(args.actionlint.resolve()), '-shellcheck=', '-pyflakes=', str(root / '.github/workflows/regime-v2-shadow.yml')])
    conf, attacks = read(out / 'conformance/conformance.json'), read(out / 'sweeper-attacks.json')
    counts = {name: runner.node_counts(out / (name + '.log')) for name in ['canonical-baseline', 'canonical-maintainer', 'canonical-designer', 'canonical-challengers', 'shadow-operational', 'remote-baseline-raw', 'remote-candidate-raw', 'v1-compatibility', 'provenance-regressions', 'remote-preservation-controls']}
    canonical_names = ['canonical-baseline', 'canonical-maintainer', 'canonical-designer', 'canonical-challengers']
    total = sum(counts[name]['tests'] or 0 for name in canonical_names) + attacks['total']
    passed = sum(counts[name]['pass'] or 0 for name in canonical_names) + attacks['passed']
    old_failures, new_failures = names(out / 'remote-baseline-raw.log'), names(out / 'remote-candidate-raw.log')
    historical_binding = 'all 81 canonical snapshots bind to source hashes, code, config, cutoff and exact output bytes'
    unexpected = sorted(set(new_failures) - set(old_failures) - {historical_binding})
    missing_preexisting = sorted(set(old_failures) - set(new_failures))
    lint = model.warning_delta(read(out / 'lint.json'), root, read(out / 'remote-lint.json'), remote)
    final = model.validate_candidate(root, args.candidate_tree, args.compatibility_sha256)
    final_authorities = {'SOURCE_RC2': model.validate_authority(source, model.SOURCE_RC2), 'REMOTE_BASE': model.validate_authority(remote, model.REMOTE_BASE)}
    provenance, portability = read(out / 'provenance.json'), read(out / 'portability.json')
    catalog = read(root / 'docs/regime-engine-v2/remote-integration/operational-case-catalog.json')
    case_map = {row['id']: row for row in catalog['cases']}
    operational_log = (out / 'shadow-operational.log').read_text()
    case_counts = {}
    for category, specification in catalog['categories'].items():
        results = []
        for case_id in specification['testIds']:
            case = case_map[case_id]
            source_equal = model.sha((root / case['file']).read_bytes()) == catalog['testSourceSha256'][case['file']]
            matches = re.findall(r'^✔ ' + re.escape(case['name']) + r' \(.*?\)$', operational_log, re.MULTILINE)
            results.append({'id': case_id, 'name': case['name'], 'sourceMatchesRC2': source_equal, 'singlePassRegistration': len(matches) == 1})
        case_counts[category] = {'passed': sum(row['sourceMatchesRC2'] and row['singlePassRegistration'] for row in results), 'total': len(results), 'cases': results}
    expected_preexisting = {
        'both locales preserve each weekly return, win rate, N and limited-sample warning',
        'current production Statistical Levels admits later values without moving the complete September report',
        'integration preserves the production generator, completed-history policy and provenance byte for byte',
    }
    def raw_scope(value, passed_count, failed_count):
        return value == {'tests': 567, 'pass': passed_count, 'fail': failed_count, 'cancelled': 0, 'skipped': 3, 'todo': 0}
    negative_rows = [json.loads(line) for line in (out / 'dual-baseline-negative-controls.log').read_text().splitlines() if line.startswith('{')]
    negative_result = negative_rows[-1] if negative_rows else {}
    network_file = out / 'network-guard.jsonl'
    network_events = [json.loads(line) for line in network_file.read_text().splitlines()] if network_file.exists() else []
    installed = {label: {'declaredNext': read(selected / 'package.json')['dependencies']['next'], 'lockedNext': read(selected / 'package-lock.json')['packages']['node_modules/next']['version'], 'installedNext': read(selected / 'node_modules/next/package.json')['version']} for label, selected in [('SOURCE_RC2', source), ('REMOTE_BASE', remote), ('CANDIDATE', root)]}
    checks = {
        'sourceRC2_original_suites': verified_source['status'] == 'PASS',
        'canonical_all_pass': passed == total and all(runner.clean(counts[name]) for name in canonical_names),
        'canonical_scope_493': passed == total == 493 and runner.clean(counts['canonical-baseline'], 210) and runner.clean(counts['canonical-challengers'], 36),
        'maintainer_78': runner.clean(counts['canonical-maintainer'], 78),
        'designer_59': runner.clean(counts['canonical-designer'], 59),
        'shadow_operational_142': runner.clean(counts['shadow-operational'], 142),
        'portability_32': portability['status'] == 'PASS' and portability['tests'] == 32,
        'golden_464': conf['goldenPassed'] == conf['goldenTotal'] == 464,
        'historical_1930': conf['historicalPassed'] == conf['historicalTotal'] == 1930,
        'historical_output_unchanged': read(out / 'conformance/historical-r2-output.json') == read(root / 'docs/regime-engine-v2/sweeper/historical-r2-output.json'),
        'attacks_110': attacks['passed'] == attacks['total'] == 110,
        'integration_commands_pass': all(row['exit_code'] == 0 for row in commands if row['name'] not in {'remote-baseline-raw', 'remote-candidate-raw'}),
        'remote_no_new_runtime_failure_names': not unexpected and not missing_preexisting,
        'raw_remote_baseline_scope_preserved': set(old_failures) == expected_preexisting and raw_scope(counts['remote-baseline-raw'], 561, 3),
        'raw_candidate_scope_fully_accounted': set(new_failures) == expected_preexisting | {historical_binding} and raw_scope(counts['remote-candidate-raw'], 560, 4),
        'integration_v1_compatibility_15': runner.clean(counts['v1-compatibility'], 15),
        'remote_behavior_controls_2': runner.clean(counts['remote-preservation-controls'], 2),
        'provenance_regressions_12': runner.clean(counts['provenance-regressions'], 12),
        'dual_baseline_negative_controls_14': negative_result.get('status') == 'PASS' and negative_result.get('tests') == 14 and negative_result.get('failures') == negative_result.get('errors') == 0,
        'network_guard_loaded': any(row.get('event') == 'NETWORK_GUARD_LOADED' for row in network_events),
        'installed_Next_matches_each_lock': all(set(row.values()) == {'16.3.1'} for row in installed.values()),
        'provenance_scope_proof': provenance['status'] == 'PASS',
        'required_case_categories': all(row['passed'] == row['total'] == expected for row, expected in zip([case_counts['STORAGE_CONTRACT_TESTS'], case_counts['CONCURRENCY_TESTS'], case_counts['FAILURE_TESTS']], [22, 8, 17])),
        'lint_errors_zero': lint['errors'] == 0, 'new_integration_warnings_zero': lint['newWarnings'] == 0,
        'candidate_seal_preserved': initial == final, 'both_authorities_preserved': authorities == final_authorities,
    }
    report = {'status': 'PASS' if all(checks.values()) else 'FAIL', 'baselineModel': 'DUAL_BASELINE',
              'checks': checks, 'sourceRC2Verification': verified_source, 'candidate': final,
              'authorities': {key: {name: value for name, value in record.items() if name != 'hashes'} for key, record in authorities.items()},
              'canonical': {'passed': passed, 'total': total, 'scope': 'Current integration contract universe; historical bindings execute unchanged against SOURCE_RC2.'},
              'counts': counts, 'portability': portability, 'dependencyIdentities': installed, 'golden': {'passed': conf['goldenPassed'], 'total': conf['goldenTotal']},
              'historical': {'passed': conf['historicalPassed'], 'total': conf['historicalTotal']}, 'attacks': attacks,
              'remoteRaw': {'baselineFailures': old_failures, 'candidateFailures': new_failures, 'unexpectedFailures': unexpected,
                            'preservedPreexistingClassification': 'PREEXISTING_UNRELATED_PRESERVED; never relabeled PASS.',
                            'historicalGeneratorBinding': historical_binding, 'scopeProof': str(out / 'provenance.json')},
              'lint': lint, 'provenance': provenance, 'commands': commands, 'operationalCategories': case_counts,
              'categoryCountsOverlap': True,
              'networkAudit': {'guardSha256': model.sha(guard.read_bytes()), 'logSha256': model.sha(network_file.read_bytes()) if network_file.exists() else None, 'loadedEvents': sum(row.get('event') == 'NETWORK_GUARD_LOADED' for row in network_events), 'deniedEvents': sum(row.get('event') == 'OUTBOUND_NETWORK_DENIED' for row in network_events), 'scope': 'Node fetch/http/https/net/tls audit guard; loopback and deliberate fixture mocks permitted. No kernel/native/non-Node universal isolation claim.'},
              'negativeControlResult': negative_result,
              'historicalVerifiersRewritten': False, 'productDecisionEngineChanged': False,
              'liveCaptureAcquired': False, 'shadowScheduleActive': False, 'push': False,
              'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    write(out / 'verification.json', report)
    print(json.dumps({'status': report['status'], 'checks': checks, 'canonical': report['canonical'], 'counts': counts}, indent=2), flush=True)
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
