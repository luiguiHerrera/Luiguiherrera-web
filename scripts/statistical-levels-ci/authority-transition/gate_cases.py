"""Negative accounting cases exercised by the same mandatory runner."""
import copy,unittest
from run import validate_inventory,validate_python,validate_node

class GateTests(unittest.TestCase):
    def test_missing_or_duplicate_python_test_is_rejected(self):
        for actual in [['a'],['a','a']]:
            with self.subTest(actual=actual),self.assertRaisesRegex(ValueError,'INVENTORY'):validate_inventory(actual,['a','b'])
    def test_skipped_failed_or_incomplete_python_test_is_rejected(self):
        for status in ['SKIP','FAIL','ERROR','INCOMPLETE','EXPECTED_FAILURE','UNEXPECTED_SUCCESS']:
            with self.subTest(status=status),self.assertRaisesRegex(ValueError,'NOT_FULL_PASS'):validate_python([{'id':'a','status':status}],['a'])
    def test_full_python_inventory_is_accepted(self):
        validate_python([{'id':'a','status':'PASS'},{'id':'b','status':'PASS'}],['a','b'])
    def test_node_inventory_failure_skip_and_missing_case_are_rejected(self):
        good='TAP version 13\nok 1 - a\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n'
        validate_node(good,['a'])
        bad=[good.replace('ok 1 - a\n',''),good.replace('ok 1','not ok 1'),good.replace(' - a\n',' - a # SKIP\n'),good.replace(' - a\n',' - a # TODO\n'),good.replace('# pass 1','# pass 0'),good.replace(' - a',' - b'),good+'# tests 1\n']
        for text in bad:
            with self.subTest(text=text),self.assertRaises(ValueError):validate_node(text,['a'])
    def test_python_runner_records_real_failure_and_skip(self):
        import io
        from run import Result
        class Cases(unittest.TestCase):
            def test_fail(self):self.fail('deliberate gate self-test')
            @unittest.skip('deliberate gate self-test')
            def test_skip(self):pass
        result=unittest.TextTestRunner(stream=io.StringIO(),resultclass=Result).run(unittest.defaultTestLoader.loadTestsFromTestCase(Cases))
        records=[{'id':name,'status':status} for name,status in result.records.items()]
        self.assertEqual(set(result.records.values()),{'FAIL','SKIP'})
        with self.assertRaisesRegex(ValueError,'NOT_FULL_PASS'):validate_python(records,list(result.records))

    def test_coverage_manifest_rejects_missing_changed_or_symlinked_file(self):
        import hashlib,tempfile
        from pathlib import Path
        from unittest.mock import patch
        import run
        with tempfile.TemporaryDirectory(prefix='sl-coverage-gate-') as directory:
            root=Path(directory);f=root/'case.py';f.write_bytes(b'expected')
            inventory={'files':{'case.py':hashlib.sha256(b'expected').hexdigest()}}
            with patch.object(run,'REPO',root):
                run.validate_files(inventory)
                f.write_bytes(b'changed')
                with self.assertRaisesRegex(ValueError,'COVERAGE_BYTES'):run.validate_files(inventory)
                f.unlink()
                with self.assertRaisesRegex(ValueError,'COVERAGE_BYTES'):run.validate_files(inventory)
                target=root/'target';target.write_bytes(b'expected');f.symlink_to(target)
                with self.assertRaisesRegex(ValueError,'COVERAGE_BYTES'):run.validate_files(inventory)
