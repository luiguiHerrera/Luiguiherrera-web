"""Bounded runtime recovery: local Git objects and synthetic API/process failures only."""
import ast
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import types
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT
from test_lineage_admission import identity_env, make_lineage_daily, lineage_metadata, november, rebind_files


class CIRuntimeRecoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='sl-ci-runtime-model-')
        f = cls.f = Fixture.__new__(Fixture)
        f.repo = Path(cls.tmp.name) / 'repo.git'
        subprocess.run(['git', 'clone', '--bare', '--shared', str(ROOT), str(f.repo)], check=True, capture_output=True)
        f.git = a.Git(f.repo)
        f.env = identity_env({**os.environ, 'GIT_INDEX_FILE': str(Path(cls.tmp.name) / 'index')}, a.RUNTIME_CI_IDENTITY)
        cls.root, _ = a.bootstrap(f.git, a.Git(ROOT).text('rev-parse', 'HEAD'))
        if f.git.parents(cls.root) == [a.TECHNICAL_CAPTURE_PARENT]:
            cls.root = a.TECHNICAL_CAPTURE_PARENT
        if f.git.parents(cls.root) == [a.NEXT_SECURITY_PARENT]:
            cls.root = a.NEXT_SECURITY_PARENT
        if f.git.parents(cls.root) == [a.COMPAT_PARENT]:
            cls.root = a.COMPAT_PARENT
        if f.git.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:
            cls.root = a.EXTRAORDINARY_HISTORY_ROOT
        if f.git.parents(cls.root) == [a.MEMORY_CI_BASE]:
            cls.root = a.MEMORY_CI_BASE  # Keep the real historical test subject.
        a.need(f.git.parents(cls.root) == [a.RUNTIME_CI_BASE], 'RUNTIME_TEST_SUBJECT')
        f.root = cls.root
        cls.content = {p: f.git.blob(cls.root, p) for p in a.RUNTIME_CI_FILES}
        template = json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        make_lineage_daily(f, cls.root, 20, lineage_metadata(f.git, cls.root, template))
        text = cls.content[a.CI].decode()
        section = text.split('      - name: Test bounded CI admission and producer readback\n', 1)[1].split('\n      - name:', 1)[0]
        cls.shell = '\n'.join(line[10:] for line in section.split('        run: |\n', 1)[1].splitlines()) + '\n'

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def child(self, files=None, parent=None, message=None, env=None, modes=None, reseal=False):
        files = dict(self.content if files is None else files)
        if reseal:
            blank = a.runtime_ci_workflow(files[a.CI])
            rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(blank if p == a.CI else files[p])} for p in sorted(a.RUNTIME_CI_FILES)]
            pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
            files[a.CI] = re.sub(a.RUNTIME_CI_PIN, lambda m: m[1] + pin.encode() + m[2], blank)
        return self.f.commit(parent or a.RUNTIME_CI_BASE, files, message or a.RUNTIME_CI_MESSAGE, env, modes)

    def model(self, daily=False):
        api = november(ModelAPI(self.f, daily=daily), self.f)
        if not daily:
            api.event['before'] = a.RUNTIME_CI_BASE
        g = ModelGit(self.f.repo, api.env['GITHUB_SHA'])
        g.blob, g.tree, g.parents = self.f.git.blob, self.f.git.tree, self.f.git.parents
        return api, g

    def test_exact_identity_parent_and_closed_delta(self):
        self.assertEqual(self.child(), self.root)
        self.assertEqual(a.bootstrap(self.f.git, self.root), (self.root, []))
        for parent in [a.PUBLICATION_CI_REPAIR_BASE, self.root, self.f.daily]:
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                a.bootstrap(self.f.git, self.child(parent=parent))
        for env in [{**self.f.env, 'GIT_AUTHOR_NAME': 'Other'}, {**self.f.env, 'GIT_COMMITTER_DATE': '1794789001 +0000'}]:
            with self.assertRaisesRegex(ValueError, 'RUNTIME_CI_HEADER'):
                a.bootstrap(self.f.git, self.child(env=env))
        with self.assertRaisesRegex(ValueError, 'RUNTIME_CI_HEADER'):
            a.bootstrap(self.f.git, self.child(message='another recovery'))
        merge = self.f.command(['commit-tree', self.f.git.text('rev-parse', self.root + '^{tree}'), '-p', a.RUNTIME_CI_BASE, '-p', a.PUBLICATION_CI_REPAIR_BASE], b'merge\n').decode().strip()
        with self.assertRaisesRegex(ValueError, 'LINEAGE_ORDERED_SINGLE_PARENT'):
            a.bootstrap(self.f.git, merge)
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
            a.bootstrap(self.f.git, self.child(files={**self.content, 'extra.txt': b'extra'}))
        for p in a.RUNTIME_CI_FILES:
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(self.f.git, self.child(files={n: b for n, b in self.content.items() if n != p}))
            with self.subTest(mode=p), self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                a.bootstrap(self.f.git, self.child(modes={p: '100755'}))

    def test_payload_and_resealed_workflow_weakening_are_rejected(self):
        for p in a.RUNTIME_CI_FILES - {a.CI}:
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'RUNTIME_CI_PAYLOAD'):
                a.bootstrap(self.f.git, self.child(files={**self.content, p: self.content[p] + b'\n'}))
        for old, new in [(b'timeout-minutes: 90', b'timeout-minutes: 91'), (b' -eq 40', b' -eq 39'),
                         (b')==111', b')==110'), (b'contents: read', b'contents: write'),
                         (b'pattern=\'test_*.py\'', b'pattern=\'no_tests.py\''), (b'node --test ', b'echo '),
                         (b'set -euo pipefail', b'set -eu'), (b'145', b'136'), (b'if: ${{ always() }}', b'if: ${{ success() }}')]:
            self.assertIn(old, self.content[a.CI])
            with self.subTest(old=old), self.assertRaisesRegex(ValueError, 'RUNTIME_CI_WORKFLOW_SCOPE'):
                a.bootstrap(self.f.git, self.child(files={**self.content, a.CI: self.content[a.CI].replace(old, new)}, reseal=True))

    def test_unqualified_attempts_never_become_certification_and_identity_is_exact(self):
        api, g = self.model()
        result = a.admit(g, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_CI_RUNTIME_RECOVERY_BOOTSTRAP')
        self.assertEqual(result['details']['unqualified_run_id'], 43760999722)
        self.assertEqual(result['details']['unqualified_attempts'], [1, 2])
        self.assertEqual(result['details']['parent_hosted_ci'], 'NOT_QUALIFIED_NOT_REUSED')
        self.assertEqual(result['details']['candidate_hosted_ci'], 'REQUIRED_NOT_YET_CERTIFIED')
        self.assertFalse(result['release_authority_issued'])
        for target, key, value in [('event', 'before', a.PUBLICATION_CI_REPAIR_BASE), ('event', 'forced', True),
                                  ('env', 'GITHUB_RUN_ATTEMPT', '2'), ('env', 'GITHUB_SHA', a.RUNTIME_CI_BASE),
                                  ('env', 'GITHUB_WORKFLOW_SHA', a.RUNTIME_CI_BASE), ('env', 'GITHUB_REF', 'refs/heads/main')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                api, g = self.model(); (api.event if target == 'event' else api.env)[key] = value
                a.admit(g, api, api.env, api.event)

    def test_daily_requires_exact_full_parent_ci_not_partial_or_failed_runs(self):
        api, g = self.model(True)
        self.assertEqual(a.admit(g, api, api.env, api.event)['details']['parent_ci']['head_sha'], self.root)
        listing_key = '/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + self.root + '&status=success&per_page=100'
        for kind in ['absent', 'failure', 'cancelled', 'timed_out', 'old_sha', 'duplicate', 'extra_job', 'skipped_job']:
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                api, g = self.model(True); listing = api.responses[listing_key]; run = listing['workflow_runs'][0]
                jobs = api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']
                if kind == 'absent': listing.update(total_count=0, workflow_runs=[])
                if kind in ['failure', 'cancelled', 'timed_out']: run['conclusion'] = kind
                if kind == 'old_sha': run.update(id=43760999722, head_sha=a.RUNTIME_CI_BASE, run_attempt=2, conclusion='cancelled')
                if kind == 'duplicate': listing.update(total_count=2, workflow_runs=[run, copy.deepcopy(run)])
                if kind == 'extra_job': jobs.update(total_count=2, jobs=jobs['jobs']*2)
                if kind == 'skipped_job': jobs['jobs'][0]['conclusion'] = 'skipped'
                a.admit(g, api, api.env, api.event)
        for index in range(6):
            for outcome in ['skipped', 'failure', 'cancelled', None]:
                with self.subTest(step=index, outcome=outcome), self.assertRaisesRegex(ValueError, 'PARENT_MANDATORY_STEP'):
                    api, g = self.model(True); run = api.responses[listing_key]['workflow_runs'][0]
                    api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]['steps'][index]['conclusion'] = outcome
                    a.admit(g, api, api.env, api.event)

    def test_no_repetition_code_successor_or_editorial_escape(self):
        g = self.f.git
        for parent in [self.root, self.f.daily]:
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                a.bootstrap(g, self.f.commit(parent, {a.CI: g.blob(parent, a.CI) + b'\n'}, a.RUNTIME_CI_MESSAGE))
        editorial = self.f.commit(self.root, {'public/llms.txt': g.blob(self.root, 'public/llms.txt') + b'\n'}, 'not authorized')
        files, entry = rebind_files(g, editorial, 'dpl_ModelOnly', 'a'*40, a.lineage_registry(g, self.root), self.root, g.blob(editorial, a.CI), a.RUNTIME_CI_IDENTITY, 'not authorized')
        with self.assertRaisesRegex(ValueError, 'RUNTIME_CI_DATA_SUCCESSORS_ONLY'):
            a.bootstrap(g, self.f.commit(editorial, files, entry['rebind']['message']))

    def test_all_159_original_cases_and_release_data_and_sources_preserved(self):
        g = self.f.git; before, after = g.tree(a.RUNTIME_CI_BASE), g.tree(self.root)
        self.assertEqual(len(a.paths(g)), 82)
        protected = a.paths(g) | {p for p in before if p.startswith('scripts/statistical-levels-release/')} | {a.PRODUCER, a.LINEAGE_REGISTRY, '.github/workflows/statistical-levels-release.yml', 'package.json', 'package-lock.json'}
        self.assertTrue(all(before[p] == after[p] for p in protected))
        self.assertEqual(len(json.loads(g.blob(self.root, 'scripts/statistical-levels-release/source-manifest.json'))), 111)
        files = [p for p in before if p.startswith('scripts/statistical-levels-ci/test_') and p.endswith('.py')]
        count = 0
        for p in files:
            methods = lambda b: {c.name + '.' + n.name: ast.dump(n) for c in ast.walk(ast.parse(b)) if isinstance(c, ast.ClassDef) for n in c.body if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')}
            old, new = methods(g.blob(a.RUNTIME_CI_BASE, p)), methods(g.blob(self.root, p))
            self.assertEqual(old, new, p); count += len(old)
        self.assertEqual(count, 159)
        self.assertEqual(len([p for p in after if p.startswith('scripts/statistical-levels-release/tests/') and p.endswith('.test.mjs')]), 42)

    def test_old_contracts_and_native_accounting_are_unchanged(self):
        g = self.f.git
        spec = importlib.util.spec_from_file_location('runtime_history', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        history = importlib.util.module_from_spec(spec); spec.loader.exec_module(history)
        self.assertEqual(history.reuse_scope(g, self.root), history.reuse_scope(g, a.RUNTIME_CI_BASE))
        self.assertEqual(a.reconciled_report_hashes(g, self.root), a.reconciled_report_hashes(g, a.RUNTIME_CI_BASE))
        functions = lambda raw: {n.name: ast.dump(n) for n in ast.parse(raw).body if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
        old, new = functions(g.blob(a.RUNTIME_CI_BASE, 'scripts/statistical-levels-ci/admission.py')), functions(g.blob(self.root, 'scripts/statistical-levels-ci/admission.py'))
        for name in old.keys() - {'bootstrap', 'admit', 'reconciled_report_hashes'}:
            self.assertEqual(old[name], new[name], name)
        blocks = lambda raw: re.findall(rb"^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$", raw, re.M)
        self.assertEqual(blocks(g.blob(a.RUNTIME_CI_BASE, a.CI)), blocks(self.content[a.CI]))
        self.assertIn(b'"${#release_tests[@]}" -eq 39', g.blob(a.DURABILITY_BASE, a.CI))
        self.assertIn(b')==110', g.blob(a.DURABILITY_BASE, a.CI))

    def test_actual_shell_preserves_failures_and_signal_exit_through_tee(self):
        with tempfile.TemporaryDirectory(prefix='sl-shell-model-') as td:
            path = Path(td); evidence = path / 'evidence'; evidence.mkdir()
            # Synthetic subprocesses exercise the actual shell; these logs are never qualification evidence.
            stub = '#!' + sys.executable + '\nimport os,sys\nif "-u" not in sys.argv: os.execv(sys.executable,[sys.executable]+sys.argv[1:])\npart="MAIN" if "-m" not in sys.argv else "ZOD"\nif part=="MAIN": sys.stdin.read()\ncount=145 if part=="MAIN" else 23\nprint("Ran %d tests in 0.1s\\n\\nOK"%count)\nsys.exit(int(os.environ["MODEL_"+part]))\n'
            (path / 'python3').write_text(stub); (path / 'python3').chmod(0o755)
            (path / 'node').write_text('#!/bin/sh\nprintf called > "$CI_EVIDENCE/node-called"\n'); (path / 'node').chmod(0o755)
            for main, zod in [(0, 0), (1, 0), (137, 0), (0, 1), (0, 137)]:
                marker = evidence / 'node-called'; marker.unlink(missing_ok=True)
                env = {**os.environ, 'PATH': str(path)+os.pathsep+os.environ['PATH'], 'CI_EVIDENCE': str(evidence), 'GITHUB_SHA': self.root, 'GITHUB_RUN_ID': 'synthetic', 'GITHUB_RUN_ATTEMPT': '1', 'MODEL_MAIN': str(main), 'MODEL_ZOD': str(zod)}
                result = subprocess.run(['bash', '-c', self.shell], env=env, capture_output=True)
                self.assertEqual(result.returncode == 0, main == zod == 0, result.stderr)
                self.assertEqual(marker.exists(), main == zod == 0)
                self.assertTrue((evidence / 'python-main.log').exists() and (evidence / 'python-zod.log').exists())
        text = self.content[a.CI].decode()
        self.assertIn('if: ${{ always() }}\n        timeout-minutes: 2\n        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a', text)
        self.assertNotIn('continue-on-error:', text)

    def test_actual_python_count_checks_reject_partial_duplicate_or_skipped_results(self):
        program = self.shell.split("python3 - <<'PYCOUNTS'\n", 1)[1].split('\nPYCOUNTS', 1)[0]
        with tempfile.TemporaryDirectory(prefix='sl-count-model-') as td:
            path = Path(td)
            for main, zod, passes in [('Ran 145 tests in 1s\n\nOK\n', 'Ran 23 tests in 1s\n\nOK\n', True),
                                     ('Ran 144 tests in 1s\n\nOK\n', 'Ran 23 tests in 1s\n\nOK\n', False),
                                     ('Ran 145 tests in 1s\n\nOK\n', '', False),
                                     ('Ran 145 tests in 1s\n\nOK\n'*2, 'Ran 23 tests in 1s\n\nOK\n', False),
                                     ('Ran 145 tests in 1s\n\nOK (skipped=1)\n', 'Ran 23 tests in 1s\n\nOK\n', False),
                                     ('Ran 145 tests in 1s\n\nFAILED (failures=1)\n', 'Ran 23 tests in 1s\n\nOK\n', False)]:
                (path/'python-main.log').write_text(main); (path/'python-zod.log').write_text(zod)
                result = subprocess.run([sys.executable, '-c', program], env={**os.environ, 'CI_EVIDENCE': td}, capture_output=True)
                self.assertEqual(result.returncode == 0, passes)
        body = self.shell.split("<<'PYTESTS'", 1)[1].split('\n', 1)[1].split('\nPYTESTS', 1)[0]
        check = ast.parse(body).body[-1].exc.args[0]
        for count, skipped, successful in [(145, [], True), (144, [], True), (145, ['skip'], True), (145, [], False)]:
            result = types.SimpleNamespace(testsRun=count, skipped=skipped, wasSuccessful=lambda: successful)
            self.assertEqual(eval(compile(ast.Expression(check), '<actual-python-result>', 'eval'), {'result': result}), 0 if count==145 and not skipped and successful else 1)


if __name__ == '__main__':
    unittest.main()
