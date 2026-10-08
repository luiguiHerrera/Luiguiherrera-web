"""Focused RC portability regressions; no historical verifier body is executed.

Run after generating fresh lint in the selected isolated checkout:
  python3 -B test-portability.py --root CHECKOUT --lint-json AUDIT/lint.json

The lint file is an explicit output of the current canonical run, not historical
workspace evidence. Tests use only the standard library and already-installed
Python, Node and Git. Temporary mutations never touch candidate inputs.
"""
import argparse
import ast
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


RC0 = "f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c"
PACKAGE = Path("docs/regime-engine-v2/release-candidate")
RUNNER = PACKAGE / "run-verification.py"
RETIRED_PYTHON = [
    "docs/regime-engine-v2/sweeper/run-verification.py",
    "docs/regime-engine-v2/groweer/run-canonical-verification.py",
    "docs/regime-engine-v2/groweer/close-verification.py",
    "docs/regime-engine-v2/groweer/seal-manifest.py",
    "docs/regime-engine-v2/maintainer/run-verification.py",
    "docs/regime-engine-v2/maintainer/close-verification.py",
    "docs/regime-engine-v2/designer/run-verification.py",
    "docs/regime-engine-v2/designer/seal-review.py",
]
RETIRED_NODE = [
    "docs/regime-engine-v2/designer/browser-qa.mjs",
    "docs/regime-engine-v2/designer/accessibility-qa.mjs",
]
RETIREMENT_MARKER = "RETIRED_WORKSPACE_VERIFIER"

# Compile the selected current bytes before installing the guard. Retired code
# then has no filesystem or child-process access. The canonical parser also has
# no access to its requested root/output, while ordinary stdlib imports remain
# permitted. A guard violation cannot masquerade as the expected exit 2.
PYTHON_PROBE = r'''
import argparse, collections, concurrent.futures, datetime, hashlib, json
import os, pathlib, re, subprocess, sys, time
payload = json.loads(sys.stdin.read())
code = compile(payload["source"], payload["filename"], "exec")
sys.argv = [payload["filename"], *payload["args"]]
blocked = tuple(payload["blocked"])
filesystem_events = {
    "open", "os.listdir", "os.scandir", "os.chdir", "os.mkdir", "os.rmdir",
    "os.remove", "os.rename", "os.link", "os.symlink", "os.truncate",
    "os.chmod", "os.chown", "os.utime",
}
def audit(event, arguments):
    process_event = event.startswith(("subprocess.", "os.exec", "os.spawn")) or event == "os.system"
    forbidden = process_event
    if event in filesystem_events:
        if payload["mode"] == "retired":
            forbidden = True
        else:
            for value in arguments:
                if isinstance(value, (str, bytes)):
                    name = os.fsdecode(value)
                    if any(name == root or name.startswith(root + os.sep) for root in blocked):
                        forbidden = True
    if forbidden:
        raise RuntimeError("PORTABILITY_TEST_FORBIDDEN_IO: " + event)
sys.addaudithook(audit)
exec(code, {"__name__": "__main__", "__file__": payload["filename"]})
'''

# Native module startup finishes before hooks are installed. The retired JS
# bytes execute as an ES module with public filesystem/child-process APIs denied.
# This is focused behavioral instrumentation, not a claim of a kernel sandbox.
NODE_PROBE = r'''
import fs from "node:fs";
import fsp from "node:fs/promises";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
const deny = () => { throw new Error("PORTABILITY_TEST_FORBIDDEN_IO"); };
for (const api of [fs, fsp, childProcess]) {
  for (const key of Object.keys(api)) {
    if (typeof api[key] !== "function") continue;
    const descriptor = Object.getOwnPropertyDescriptor(api, key);
    // Node 26 exposes Utf8Stream through a configurable getter with no setter.
    // Replace configurable descriptors; assignment would throw before the test.
    if (descriptor.configurable) {
      Object.defineProperty(api, key, { value: deny, writable: true,
        enumerable: descriptor.enumerable, configurable: true });
    } else if (descriptor.writable) {
      api[key] = deny;
    } else {
      throw new Error("PORTABILITY_TEST_UNPATCHABLE_IO_API: " + key);
    }
  }
}
syncBuiltinESMExports();
process.argv = [process.execPath, payload.filename, ...payload.args];
await import("data:text/javascript;base64," + Buffer.from(payload.source).toString("base64"));
'''


def literal_assignment(source, name):
    matches = [node.value for node in ast.parse(source).body
               if isinstance(node, ast.Assign)
               and any(isinstance(target, ast.Name) and target.id == name
                       for target in node.targets)]
    if len(matches) != 1:
        raise AssertionError("Expected one literal assignment for " + name)
    return ast.literal_eval(matches[0])


class PortabilityTests(unittest.TestCase):
    root = None
    lint_file = None

    @classmethod
    def setUpClass(cls):
        cls.current_source = (cls.root / RUNNER).read_text()
        cls.original_source = subprocess.check_output(
            ["git", "show", RC0 + ":" + str(RUNNER)], cwd=cls.root, text=True)
        sys.dont_write_bytecode = True
        spec = importlib.util.spec_from_file_location("portable_candidate_verifier", cls.root / RUNNER)
        cls.runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.runner)
        cls.lint_rows = json.loads(cls.lint_file.read_text())
        cls.metadata = json.loads((cls.root / PACKAGE / "parent-lint-baseline.json").read_text())

    def retirement_case(self, relative, legacy):
        source = (self.root / relative).read_text()
        # Refuse to exercise an obsolete historical body even if the caller
        # mistakenly points this harness at RC0 instead of the repaired tree.
        self.assertIn(RETIREMENT_MARKER, source)
        self.assertLess(len(source.splitlines()), 40, "Retirement must not retain an executable historical body")
        with tempfile.TemporaryDirectory(prefix="regime-portability-retired-") as directory:
            empty = Path(directory)
            arguments = (["--root", str(empty / "absent-checkout"),
                          "--output-dir", str(empty / "must-not-exist"),
                          "--profile", "worktree", "--resume-failed"] if legacy else [])
            payload = {"source": source, "filename": str(self.root / relative),
                       "args": arguments, "blocked": [str(empty)], "mode": "retired"}
            if relative.endswith(".py"):
                command = [sys.executable, "-I", "-B", "-c", PYTHON_PROBE]
            else:
                command = ["node", "--input-type=module", "-e", NODE_PROBE]
            result = subprocess.run(command, cwd=empty, input=json.dumps(payload), text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                    env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}, timeout=20)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertEqual(result.stdout, "")
            self.assertIn(RETIREMENT_MARKER, result.stderr)
            self.assertIn(RC0, result.stderr)
            self.assertIn(str(RUNNER), result.stderr)
            self.assertIn("--profile candidate", result.stderr)
            self.assertNotIn("PORTABILITY_TEST_FORBIDDEN_IO", result.stderr)
            self.assertEqual(list(empty.iterdir()), [], "Retirement created outputs")

    def rejected_option_case(self, arguments, diagnostic):
        with tempfile.TemporaryDirectory(prefix="regime-portability-option-") as directory:
            empty = Path(directory)
            source_root, output = empty / "unreadable-source", empty / "must-not-exist"
            payload = {"source": self.current_source, "filename": str(self.root / RUNNER),
                       "args": ["--root", str(source_root), "--output-dir", str(output), *arguments],
                       "blocked": [str(source_root), str(output)], "mode": "parser"}
            result = subprocess.run([sys.executable, "-I", "-B", "-c", PYTHON_PROBE],
                                    cwd=empty, input=json.dumps(payload), text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertEqual(result.stdout, "")
            self.assertIn(diagnostic, result.stderr)
            self.assertNotIn("PORTABILITY_TEST_FORBIDDEN_IO", result.stderr)
            self.assertNotIn("Traceback", result.stderr)
            self.assertFalse(output.exists())
            self.assertEqual(list(empty.iterdir()), [])

    def test_reject_worktree_before_io(self):
        self.rejected_option_case(["--profile", "worktree"], "invalid choice")

    def test_reject_resume_failed_before_io(self):
        self.rejected_option_case(["--resume-failed"], "unrecognized arguments")

    def test_reject_external_baseline_lint_before_io(self):
        self.rejected_option_case(["--baseline-lint", "/uncommitted/lint.json"], "unrecognized arguments")

    def test_reject_external_baseline_root_before_io(self):
        self.rejected_option_case(["--baseline-root", "/historical/worktree"], "unrecognized arguments")

    def test_nonempty_output_rejected_without_changing_prior_evidence(self):
        with tempfile.TemporaryDirectory(prefix="regime-portability-prior-output-") as directory:
            empty = Path(directory)
            output = empty / "prior-audit"
            output.mkdir()
            sentinel = output / "verification.json"
            original = b'{"status":"FAIL","commands":[{"command":["uncommitted-historical-command"]}]}\n'
            sentinel.write_bytes(original)
            arguments = [str(self.root / RUNNER), "--root", str(empty / "absent-source"),
                         "--output-dir", str(output), "--profile", "candidate"]
            with mock.patch.object(sys, "argv", arguments), \
                 mock.patch.object(self.runner, "canonical_sources", side_effect=AssertionError("Source work must not start")) as source_work, \
                 mock.patch.object(self.runner.subprocess, "run", side_effect=AssertionError("Subprocess work must not start")) as child_work, \
                 mock.patch.object(self.runner.subprocess, "check_output", side_effect=AssertionError("Git work must not start")) as git_work:
                with self.assertRaisesRegex(ValueError, "Output directory must be empty"):
                    self.runner.main()
                source_work.assert_not_called()
                child_work.assert_not_called()
                git_work.assert_not_called()
            self.assertEqual(sentinel.read_bytes(), original)
            self.assertEqual(list(output.iterdir()), [sentinel])

    def test_baseline_test_selection_equals_rc0(self):
        self.assertEqual(literal_assignment(self.current_source, "BASELINE_TESTS"),
                         literal_assignment(self.original_source, "BASELINE_TESTS"))
        self.assertEqual(len(self.runner.BASELINE_TESTS), 13)

    def test_operations_test_selection_equals_rc0(self):
        self.assertEqual(literal_assignment(self.current_source, "OPERATIONS_TESTS"),
                         literal_assignment(self.original_source, "OPERATIONS_TESTS"))
        self.assertEqual(len(self.runner.OPERATIONS_TESTS), 5)

    def test_designer_test_selection_equals_rc0(self):
        self.assertEqual(literal_assignment(self.current_source, "DESIGNER_TESTS"),
                         literal_assignment(self.original_source, "DESIGNER_TESTS"))
        self.assertEqual(len(self.runner.DESIGNER_TESTS), 4)

    def test_fresh_lint_preserves_18_warnings_and_two_moved_positions_without_old_checkout(self):
        historical = Path(self.metadata["identity"]["root"])
        original_read = Path.read_text

        def guarded_read(path, *args, **kwargs):
            self.assertFalse(path.is_relative_to(historical), "Attempted historical checkout read")
            return original_read(path, *args, **kwargs)

        with mock.patch.object(Path, "read_text", guarded_read):
            summary = self.runner.lint_summary(self.root, self.lint_file)
        self.assertEqual(summary["errors"], 0)
        self.assertEqual(summary["warnings"], 18)
        self.assertEqual(summary["baseline_warnings"], 18)
        self.assertEqual(summary["new_warnings"], 0)
        self.assertEqual(len(summary["moved_existing_warnings"]), 2)
        self.assertEqual(summary["baseline_commit"], self.metadata["identity"]["commit"])
        self.assertEqual(summary["baseline_tree"], self.metadata["identity"]["tree"])

    def lint_with_extra_warning(self, duplicate):
        rows = copy.deepcopy(self.lint_rows)
        row = next(item for item in rows if any(message["severity"] == 1 for message in item["messages"]))
        warning = copy.deepcopy(next(message for message in row["messages"] if message["severity"] == 1))
        if not duplicate:
            warning["ruleId"] = "portability-test/additional-warning"
            warning["message"] = "Synthetic additional warning: must fail the no-new-warning gate."
        row["messages"].append(warning)
        row["warningCount"] += 1
        with tempfile.TemporaryDirectory(prefix="regime-portability-lint-") as directory:
            filename = Path(directory) / "current-lint-with-addition.json"
            filename.write_text(json.dumps(rows))
            return self.runner.lint_summary(self.root, filename)

    def test_added_warning_is_detected(self):
        summary = self.lint_with_extra_warning(duplicate=False)
        self.assertEqual(summary["warnings"], 19)
        self.assertEqual(summary["new_warnings"], 1)
        self.assertEqual(summary["new_warning_details"][0][1], "portability-test/additional-warning")

    def test_duplicate_warning_is_not_lost_by_set_comparison(self):
        summary = self.lint_with_extra_warning(duplicate=True)
        self.assertEqual(summary["warnings"], 19)
        self.assertEqual(summary["new_warnings"], 1)

    def test_tampered_parent_lint_fails_closed_before_git_or_historical_reads(self):
        with tempfile.TemporaryDirectory(prefix="regime-portability-tamper-") as directory:
            fixture = Path(directory)
            package = fixture / PACKAGE
            package.mkdir(parents=True)
            for name in ["parent-lint-baseline.json", "parent-head-lint.json"]:
                (package / name).write_bytes((self.root / PACKAGE / name).read_bytes())
            baseline = package / "parent-head-lint.json"
            baseline.write_bytes(baseline.read_bytes() + b"\n")
            current = fixture / "fresh-lint.json"
            current.write_text("[]\n")
            with mock.patch.object(self.runner.subprocess, "check_output", side_effect=AssertionError("Git must not run after evidence tampering")) as git:
                with self.assertRaisesRegex(RuntimeError, "parent lint evidence hash mismatch"):
                    self.runner.lint_summary(fixture, current)
                git.assert_not_called()


def install_retirement_tests():
    for index, relative in enumerate(RETIRED_PYTHON + RETIRED_NODE, 1):
        for legacy in [False, True]:
            def test(self, path=relative, old_arguments=legacy):
                self.retirement_case(path, old_arguments)
            suffix = "legacy_arguments" if legacy else "normal_invocation"
            setattr(PortabilityTests, f"test_retired_{index:02d}_{suffix}", test)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--lint-json", type=Path, required=True,
                        help="Fresh lint output from this checkout's canonical run; never an excluded historical log")
    args = parser.parse_args()
    PortabilityTests.root = args.root.resolve()
    PortabilityTests.lint_file = args.lint_json.resolve()
    install_retirement_tests()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(PortabilityTests)
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    print(json.dumps({"status": "PASS" if result.wasSuccessful() else "FAIL",
                      "tests": result.testsRun, "failures": len(result.failures),
                      "errors": len(result.errors), "skipped": len(result.skipped),
                      "retired_entrypoints": len(RETIRED_PYTHON) + len(RETIRED_NODE),
                      "root": str(PortabilityTests.root),
                      "current_lint_sha256": hashlib.sha256(PortabilityTests.lint_file.read_bytes()).hexdigest(),
                      "rc0": RC0, "historical_verifiers_executed": False,
                      "product_source_mutations": 0, "network_acquisition": False}))
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
