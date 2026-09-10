"""Independent negative controls for authority boundaries and source seals."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('integration_model', Path(__file__).with_name('model.py'))
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


class DualBaselineTests(unittest.TestCase):
    def policy(self, candidate=None, observed=None):
        remote = {'remote.ts': 'REMOTE', 'app/(es)/dashboard/page.tsx': 'REMOTE_PAGE'}
        approved = {'core.ts': 'RC2', model.COMPATIBILITY_PATH: 'OLD_COMPONENT', 'app/(es)/dashboard/page.tsx': 'OLD_PAGE'}
        actual = {'remote.ts': 'REMOTE', 'core.ts': 'RC2', model.COMPATIBILITY_PATH: 'NEW_COMPONENT',
                  'app/(es)/dashboard/page.tsx': 'REMOTE_PAGE', 'scripts/regime-integration/test.py': 'LAYER'}
        model.approve_sources(remote, approved, {'unrelated-parent.ts': 'PARENT'}, candidate or actual,
                              set(approved), 'REVIEWED', observed or {model.COMPATIBILITY_PATH: 'REVIEWED'})

    def test_two_authorities_accept_exact_remote_and_exact_rc2_with_reviewed_compatibility(self):
        self.policy()

    def test_remote_only_change_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Remote-only'):
            self.policy({'remote.ts': 'CHANGED'})

    def test_original_rc2_copy_cannot_replace_evolved_public_page(self):
        candidate = {'remote.ts': 'REMOTE', 'app/(es)/dashboard/page.tsx': 'OLD_PAGE',
                     'core.ts': 'RC2', model.COMPATIBILITY_PATH: 'NEW_COMPONENT'}
        with self.assertRaisesRegex(ValueError, 'Public remote'):
            self.policy(candidate)

    def test_modified_core_rejected_even_with_matching_compatibility(self):
        candidate = {'remote.ts': 'REMOTE', 'app/(es)/dashboard/page.tsx': 'REMOTE_PAGE',
                     'core.ts': 'CHANGED', model.COMPATIBILITY_PATH: 'NEW_COMPONENT'}
        with self.assertRaisesRegex(ValueError, 'non-overlap'):
            self.policy(candidate)

    def test_unreviewed_compatibility_hash_fails(self):
        with self.assertRaisesRegex(ValueError, 'Compatibility'):
            self.policy(observed={model.COMPATIBILITY_PATH: 'SELF_SELECTED_CURRENT_HASH'})

    def test_unrelated_new_source_is_rejected(self):
        candidate = {'remote.ts': 'REMOTE', 'app/(es)/dashboard/page.tsx': 'REMOTE_PAGE',
                     'core.ts': 'RC2', model.COMPATIBILITY_PATH: 'NEW_COMPONENT', 'secret-helper.ts': 'NEW'}
        with self.assertRaisesRegex(ValueError, 'Unrelated'):
            self.policy(candidate)

    def test_exact_tree_seal_uses_independent_git_blob_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'input.txt').write_bytes(b'hello\n')
            # Known Git object for hello-newline, independent of model hashing.
            self.assertEqual(model.assert_tree_bytes(root, {'input.txt': {'blob': 'ce013625030ba8dba906f756967f9e9ca394464a'}}),
                             {'input.txt': hashlib.sha256(b'hello\n').hexdigest()})

    def test_edited_source_rejected_after_seal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'input.txt').write_bytes(b'changed\n')
            with self.assertRaisesRegex(ValueError, 'bytes changed'):
                model.assert_tree_bytes(root, {'input.txt': {'blob': 'ce013625030ba8dba906f756967f9e9ca394464a'}})

    def test_unsealed_extra_file_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'hidden-input.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Unsealed'):
                model.assert_tree_bytes(root, {})

    def test_symlink_file_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'external').symlink_to('/dev/null')
            with self.assertRaisesRegex(ValueError, 'redirects'):
                model.assert_tree_bytes(root, {})

    def test_symlink_dependency_directory_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'node_modules').symlink_to('/tmp', target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'Directory symlink'):
                model.assert_tree_bytes(root, {})

    def test_wrong_authority_head_rejected_before_sources_read(self):
        with mock.patch.object(model, 'git', return_value=b'WRONG\n'), mock.patch.object(model, 'tree') as tree:
            with self.assertRaisesRegex(ValueError, 'declared commit'):
                model.validate_authority(Path('/does-not-exist'), model.SOURCE_RC2)
            tree.assert_not_called()

    def test_lint_duplicate_warning_preserves_multiplicity(self):
        record = ('file.ts', 'rule', 'warning', 'unchanged statement')
        current = [{'errorCount': 0, 'warningCount': 2}]
        baseline = [{'errorCount': 0, 'warningCount': 1}]
        with mock.patch.object(model, 'warning_records', side_effect=[[record, record], [record]]):
            result = model.warning_delta(current, Path('/candidate'), baseline, Path('/remote'))
        self.assertEqual(result['newWarnings'], 1)
        self.assertEqual(result['newWarningDetails'], [record])

    def test_lint_displaced_identical_statement_is_not_new(self):
        record = ('file.ts', 'rule', 'warning', 'same statement')
        with mock.patch.object(model, 'warning_records', side_effect=[[record], [record]]):
            result = model.warning_delta([{'errorCount': 0, 'warningCount': 1}], Path('/candidate'),
                                         [{'errorCount': 0, 'warningCount': 1}], Path('/remote'))
        self.assertEqual(result['newWarnings'], 0)


if __name__ == '__main__':
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(DualBaselineTests))
    print(json.dumps({'status': 'PASS' if result.wasSuccessful() else 'FAIL', 'tests': result.testsRun,
                      'failures': len(result.failures), 'errors': len(result.errors)}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
