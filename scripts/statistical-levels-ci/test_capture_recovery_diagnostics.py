"""Local failure diagnostics; never admission or hosted qualification."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / 'scripts/statistical-levels-release/scripts/capture-full-product.mjs'


class CaptureRecoveryDiagnostics(unittest.TestCase):
    def run_js(self, program, *args):
        result = subprocess.run(['node', '--input-type=module', '-e',
            'import {captureFailureDiagnostic, captureEvidenceDiagnostic} from ' + json.dumps(MODULE.as_uri()) + ';\n' + program,
            *args], text=True, capture_output=True, check=True)
        return json.loads(result.stdout)

    def test_cleanup_is_not_duplicated_as_primary(self):
        result = self.run_js("const e=Error('ADOPT_REQUEST_EVIDENCE_INVALID'); e.primaryException=null;e.cleanupException=e;e.failurePhase='CLEANUP';console.log(JSON.stringify(captureFailureDiagnostic(e)));")
        self.assertIsNone(result['primary_exception'])
        self.assertEqual(result['cleanup_exception']['message'], 'ADOPT_REQUEST_EVIDENCE_INVALID')
        self.assertEqual(result['exit_code'], 1)

    def test_real_primary_and_cleanup_remain_distinct(self):
        result = self.run_js("const e=Error('PRODUCT_SUITE_FAILED');e.primaryException=e;e.cleanupException=Error('ADOPT_REQUEST_EVIDENCE_INVALID');console.log(JSON.stringify(captureFailureDiagnostic(e)));")
        self.assertEqual(result['primary_exception']['message'], 'PRODUCT_SUITE_FAILED')
        self.assertEqual(result['cleanup_exception']['message'], 'ADOPT_REQUEST_EVIDENCE_INVALID')

    def test_early_error_remains_primary_and_redacted(self):
        result = self.run_js("console.log(JSON.stringify(captureFailureDiagnostic(Error('token=private-value'))));")
        self.assertNotIn('private-value', json.dumps(result))
        self.assertIsNone(result['cleanup_exception'])
        self.assertEqual(result['result'], 'FULL_PRODUCT_CAPTURE_FAILED')

    def test_projection_retains_failure_codes_and_hashes_without_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            raw = json.dumps({'validation':{'status':'FAIL','issues':['UNKNOWN_REQUEST_CLASSIFICATION']},
                'capture_issues':['NATIVE_INTERPRETATION_FAILED'], 'requests':[{'authorization':'private-value'}],
                'journal':[{'url':'https://private.invalid/private-value'}]}).encode()
            (p/'adopt-request-evidence.json').write_bytes(raw)
            result = self.run_js('console.log(JSON.stringify(await captureEvidenceDiagnostic(process.argv[1])));', tmp)
            import hashlib
            self.assertEqual(result['files']['adopt-request-evidence.json']['sha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual(result['validation_issues'], ['UNKNOWN_REQUEST_CLASSIFICATION'])
            self.assertEqual(result['capture_issues'], ['NATIVE_INTERPRETATION_FAILED'])
            self.assertNotIn('private-value', json.dumps(result))
            self.assertTrue(result['diagnostic_only'])
            self.assertEqual(result['request_count'], 1)

    def test_missing_malformed_duplicate_and_linked_inputs_are_unavailable(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            for raw in [None, b'{', b'{"validation":null,"validation":null}']:
                if raw is not None: (p/'adopt-request-evidence.json').write_bytes(raw)
                result = self.run_js('console.log(JSON.stringify(await captureEvidenceDiagnostic(process.argv[1])));', tmp)
                self.assertEqual(result['validation_status'], 'UNAVAILABLE')
            target=p/'private';target.write_text('{"validation":{"status":"PASS"}}')
            (p/'adopt-request-evidence.json').unlink()
            (p/'adopt-request-evidence.json').symlink_to(target)
            result=self.run_js('console.log(JSON.stringify(await captureEvidenceDiagnostic(process.argv[1])));', tmp)
            self.assertEqual(result['files']['adopt-request-evidence.json']['status'], 'UNAVAILABLE')

    def test_invalid_issue_values_are_redacted_not_echoed(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p/'adopt-request-evidence.json').write_text(json.dumps({'validation':{'status':'forged','issues':['Bearer private-value',{'secret':'private-value'}]},'capture_issues':[]}))
            result=self.run_js('console.log(JSON.stringify(await captureEvidenceDiagnostic(process.argv[1])));', tmp)
            self.assertEqual(result['validation_status'], 'UNAVAILABLE')
            self.assertEqual(result['validation_issues'], ['REDACTED_INVALID_ISSUE'])
            self.assertNotIn('private-value', json.dumps(result))


if __name__ == '__main__':
    unittest.main()
