"""Real lineage and permission boundary regression tests for website CI."""
import importlib.util
from pathlib import Path
import unittest

from admission import Git

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('workflow_scope', Path(__file__).with_name('workflow-scope.py'))
scope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scope)


class WorkflowScopeTests(unittest.TestCase):
    def test_pre_reconciliation_native_lineage_is_still_recognized(self):
        result = scope.native_scope(Git(ROOT), 'dfb000cc02c5ce3d95ca39e5d85f418fbc507f3f',
                                    'refs/heads/vercel-deployment', 'push')
        self.assertTrue(result['native'])

    def test_published_website_is_not_native_qualification_on_default_branch(self):
        result = scope.native_scope(Git(ROOT), 'dfad944f6d6366e87b55cc7997c86900d7efcba1',
                                    'refs/heads/vercel-deployment', 'push')
        self.assertFalse(result['native'])

    def test_pr_and_other_branches_cannot_select_native_qualification(self):
        class NoLineageAccess:
            def __getattr__(self, name):
                raise AssertionError('Unexpected native lineage access')
        for ref, event in [('refs/heads/vercel-deployment', 'pull_request'), ('refs/heads/example', 'push')]:
            self.assertFalse(scope.native_scope(NoLineageAccess(), 'a' * 40, ref, event)['native'])

    def test_unexpected_validator_failure_is_not_silently_ignored(self):
        class BrokenGit:
            def __getattr__(self, name):
                raise RuntimeError('Unexpected validation failure')
        with self.assertRaises(RuntimeError):
            scope.native_scope(BrokenGit(), 'a' * 40, 'refs/heads/vercel-deployment', 'push')

    def test_web_tests_run_on_default_and_do_not_issue_native_evidence(self):
        text = (ROOT / '.github/workflows/ci.yml').read_text()
        website = text.split('\n  website:\n', 1)[1].split('\n  validate:\n', 1)[0]
        self.assertNotIn('github.ref', website)
        self.assertNotIn('admission.py', website)
        self.assertNotIn('qualification-summary.json', website)
        self.assertIn('test_daily_admission.DailyTests', website)
        self.assertIn("native == 'true'", text)


if __name__ == '__main__':
    unittest.main()
