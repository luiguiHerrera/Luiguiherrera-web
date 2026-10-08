"""32 integration portability cases, with three explicitly remote-scoped lint cases.

The original 32 remain bound to SOURCE_RC2 and run there unchanged. This layer
inherits its 29 context-independent regressions and supplies three fresh-remote
lint regressions, retaining old-checkout denial and duplicate-warning detection.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import unittest
from unittest import mock

sys.dont_write_bytecode = True


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--remote-root', type=Path, required=True)
    parser.add_argument('--lint-json', type=Path, required=True)
    parser.add_argument('--remote-lint-json', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root, remote = args.root.resolve(), args.remote_root.resolve()
    model = load('portability_authorities', Path(__file__).with_name('model.py'))
    original_path = root / 'docs/regime-engine-v2/rc-portability-repair/test-portability.py'
    if original_path.read_bytes() != model.git(root, 'show', model.SOURCE_RC2 + ':' + str(original_path.relative_to(root))):
        raise ValueError('Historical portability source changed')
    if model.git(remote, 'rev-parse', 'HEAD').decode().strip() != model.REMOTE_BASE:
        raise ValueError('Wrong remote lint authority')
    original = load('historical_portability', original_path)
    original.install_retirement_tests()
    remote_rows = json.loads(args.remote_lint_json.read_text())
    baseline_count = sum(row['warningCount'] for row in remote_rows)

    class IntegrationPortability(original.PortabilityTests):
        # These three literal RC1 bindings are executed in SOURCE_RC2, not here.
        # Explicitly named replacements below keep the integration universe32.
        test_fresh_lint_preserves_18_warnings_and_two_moved_positions_without_old_checkout = None
        test_added_warning_is_detected = None
        test_duplicate_warning_is_not_lost_by_set_comparison = None

        def test_remote_lint_preservation_denies_old_checkout_reads(self):
            historical = Path(self.metadata['identity']['root'])
            original_read = Path.read_text

            def guarded_read(path, *values, **keywords):
                self.assertFalse(path.is_relative_to(historical), 'Attempted historical checkout read')
                return original_read(path, *values, **keywords)

            with mock.patch.object(Path, 'read_text', guarded_read):
                old_scope = self.runner.lint_summary(self.root, self.lint_file)
                current_scope = model.warning_delta(self.lint_rows, self.root, remote_rows, remote)
            self.assertEqual(old_scope['baseline_commit'], self.metadata['identity']['commit'])
            self.assertEqual(old_scope['baseline_tree'], self.metadata['identity']['tree'])
            self.assertEqual(current_scope['errors'], 0)
            self.assertEqual(current_scope['warnings'], baseline_count)
            self.assertEqual(current_scope['newWarnings'], 0)
            self.assertEqual(current_scope['removedWarnings'], 0)

        def additional_warning(self, duplicate):
            import copy
            rows = copy.deepcopy(self.lint_rows)
            row = next(item for item in rows if any(item['severity'] == 1 for item in item['messages']))
            warning = copy.deepcopy(next(item for item in row['messages'] if item['severity'] == 1))
            if not duplicate:
                warning.update(ruleId='integration-test/new-warning', message='Independent synthetic regression warning')
            row['messages'].append(warning)
            row['warningCount'] += 1
            return model.warning_delta(rows, self.root, remote_rows, remote)

        def test_remote_new_warning_is_detected(self):
            result = self.additional_warning(False)
            self.assertEqual(result['warnings'], baseline_count + 1)
            self.assertEqual(result['newWarnings'], 1)
            self.assertEqual(result['newWarningDetails'][0][1], 'integration-test/new-warning')

        def test_remote_duplicate_warning_is_not_lost(self):
            result = self.additional_warning(True)
            self.assertEqual(result['warnings'], baseline_count + 1)
            self.assertEqual(result['newWarnings'], 1)

    IntegrationPortability.root = root
    IntegrationPortability.lint_file = args.lint_json.resolve()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(IntegrationPortability)
    if suite.countTestCases() != 32:
        raise ValueError('Portability scope must retain exactly32 cases')
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    report = {'status': 'PASS' if result.wasSuccessful() else 'FAIL', 'tests': result.testsRun,
              'failures': len(result.failures), 'errors': len(result.errors), 'skipped': len(result.skipped),
              'baselineModel': 'DUAL_BASELINE', 'sourceRC2': model.SOURCE_RC2, 'remoteBase': model.REMOTE_BASE,
              'historicalTestSourceSha256': model.sha(original_path.read_bytes()),
              'historicalTestsRewritten': False, 'unchangedInheritedCases': 29, 'explicitRemoteLintCases': 3,
              'remoteLintSha256': model.sha(args.remote_lint_json.read_bytes()),
              'candidateLintSha256': model.sha(args.lint_json.read_bytes()), 'remoteWarnings': baseline_count}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report), flush=True)
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
