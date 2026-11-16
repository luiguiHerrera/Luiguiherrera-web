"""Local exact-memory-admission models, separate from the frozen 145 + 23 inventory.

Run explicitly with class_cache_cleanup; all API evidence is synthetic. This
module issues no hosted qualification and changes only temporary Git objects.
"""
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


class MemoryAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='sl-memory-admission-model-')
        cls.addClassCleanup(cls.tmp.cleanup)
        f = cls.f = Fixture.__new__(Fixture)
        f.repo = Path(cls.tmp.name) / 'repo.git'
        subprocess.run(['git', 'clone', '--bare', '--shared', str(ROOT), str(f.repo)], check=True, capture_output=True)
        f.git = a.Git(f.repo)
        f.env = identity_env({**os.environ, 'GIT_INDEX_FILE': str(Path(cls.tmp.name) / 'index')}, a.MEMORY_CI_IDENTITY)
        cls.root = a.Git(ROOT).text('rev-parse', 'HEAD')
        a.validate_memory_ci(f.git, cls.root)
        f.root = cls.root
        cls.content = {p: f.git.blob(cls.root, p) for p in a.MEMORY_CI_FILES}
        template = json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        make_lineage_daily(f, cls.root, 20, lineage_metadata(f.git, cls.root, template))
        cls.second = copy.copy(f)
        make_lineage_daily(cls.second, f.daily, 21, lineage_metadata(f.git, f.daily, template))
        spec = importlib.util.spec_from_file_location('memory_history', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.history = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.history)
        section = cls.content[a.CI].decode().split('      - name: Test bounded CI admission and producer readback\n', 1)[1].split('\n      - name:', 1)[0]
        cls.shell = '\n'.join(line[10:] for line in section.split('        run: |\n', 1)[1].splitlines()) + '\n'

    def child(self, files=None, parent=None, message=None, env=None, modes=None):
        return self.f.commit(parent or a.MEMORY_CI_BASE, self.content if files is None else files,
                             a.MEMORY_CI_MESSAGE if message is None else message, env, modes)

    def model(self, daily=False):
        api = november(ModelAPI(self.f, daily=daily), self.f)
        if not daily:
            api.event['before'] = a.MEMORY_CI_BASE
        git = ModelGit(self.f.repo, api.env['GITHUB_SHA'])
        git.blob, git.tree, git.parents = self.f.git.blob, self.f.git.tree, self.f.git.parents
        return api, git

    def test_exact_commit_and_two_data_successors(self):
        g = self.f.git
        self.assertEqual(self.child(), self.root)
        self.assertEqual(g.parents(self.root), [a.MEMORY_CI_BASE])
        self.assertEqual(a.bootstrap(g, self.root), (self.root, []))
        self.assertEqual(a.bootstrap(g, self.f.daily), (self.root, [self.f.daily]))
        self.assertEqual(a.bootstrap(g, self.second.daily), (self.root, [self.second.daily, self.f.daily]))
        self.assertEqual(a.memory_ci_payload(g, self.root), a.MEMORY_CI_PAYLOAD_SHA256)

    def test_wrong_parent_merge_and_commit_header(self):
        for parent in (a.RUNTIME_CI_BASE, self.root, self.f.daily):
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                a.bootstrap(self.f.git, self.child(parent=parent))
        for field, value in [('GIT_AUTHOR_NAME', 'Other'), ('GIT_AUTHOR_EMAIL', 'other@example.invalid'),
                             ('GIT_COMMITTER_NAME', 'Other'), ('GIT_COMMITTER_EMAIL', 'other@example.invalid'),
                             ('GIT_AUTHOR_DATE', '1794843364 +0000'), ('GIT_COMMITTER_DATE', '1794843364 +0000')]:
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'MEMORY_CI_HEADER'):
                a.bootstrap(self.f.git, self.child(env={**self.f.env, field: value}))
        with self.assertRaisesRegex(ValueError, 'MEMORY_CI_HEADER'):
            a.bootstrap(self.f.git, self.child(message='another memory fix'))
        merge = self.f.command(['commit-tree', self.f.git.text('rev-parse', self.root + '^{tree}'),
                                '-p', a.MEMORY_CI_BASE, '-p', a.RUNTIME_CI_BASE], b'merge\n').decode().strip()
        with self.assertRaisesRegex(ValueError, 'LINEAGE_ORDERED_SINGLE_PARENT'):
            a.bootstrap(self.f.git, merge)
        raw = self.f.git('cat-file', 'commit', self.root).replace(b'\n\n', b'\nencoding UTF-8\n\n', 1)
        extra = self.f.command(['hash-object', '-t', 'commit', '-w', '--stdin'], raw).decode().strip()
        with self.assertRaisesRegex(ValueError, 'MEMORY_CI_HEADER'):
            a.bootstrap(self.f.git, extra)

    def test_closed_delta_missing_extra_deleted_and_modes(self):
        for p in a.MEMORY_CI_FILES:
            with self.subTest(missing=p), self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(self.f.git, self.child(files={n: b for n, b in self.content.items() if n != p}))
            for mode in ('100755', '120000'):
                with self.subTest(path=p, mode=mode), self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                    a.bootstrap(self.f.git, self.child(modes={p: mode}))
        for p in ('extra.txt', a.PROVENANCE, a.DATA + 'manifest.json', a.PRODUCER, a.LINEAGE_REGISTRY,
                  'package-lock.json', 'scripts/statistical-levels-release/policy.json', 'public/llms.txt'):
            data = b'extra' if p == 'extra.txt' else self.f.git.blob(a.MEMORY_CI_BASE, p) + b'\n'
            with self.subTest(extra=p), self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                a.bootstrap(self.f.git, self.child(files={**self.content, p: data}))
        with self.assertRaises(ValueError):
            a.bootstrap(self.f.git, self.child(files={**self.content, a.MEMORY_CI_HELPER: None}))

    def test_each_payload_byte_and_pin_are_bound(self):
        for p in a.MEMORY_CI_FILES:
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'MEMORY_CI_(PAYLOAD|WORKFLOW_SCOPE|HELPER_SCOPE)'):
                a.bootstrap(self.f.git, self.child(files={**self.content, p: self.content[p] + b'\n'}))
        p = 'scripts/statistical-levels-ci/admission.py'
        raw = self.content[p]
        for changed in (re.sub(a.MEMORY_CI_PIN, lambda m: m[1] + b'f' * 64 + m[3], raw),
                        re.sub(a.MEMORY_CI_PIN, b'', raw), raw + re.search(a.MEMORY_CI_PIN, raw)[0]):
            with self.assertRaisesRegex(ValueError, 'MEMORY_CI_PIN'):
                a.bootstrap(self.f.git, self.child(files={**self.content, p: changed}))

    def test_resealing_admission_or_models_cannot_change_approved_payload(self):
        admission = 'scripts/statistical-levels-ci/admission.py'
        for p in a.MEMORY_CI_FILES - {a.CI, a.MEMORY_CI_HELPER}:
            files = {**self.content, p: self.content[p] + b'\n# unauthorized reseal\n'}
            blank = re.sub(a.MEMORY_CI_PIN, lambda m: m[1] + b'0' * 64 + m[3], files[admission])
            rows = [{'path': n, 'mode': '100644', 'sha256': a.digest(blank if n == admission else files[n])}
                    for n in sorted(a.MEMORY_CI_FILES)]
            pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
            files[admission] = re.sub(a.MEMORY_CI_PIN, lambda m: m[1] + pin.encode() + m[3], blank)
            with self.subTest(path=p), self.assertRaisesRegex(ValueError, 'MEMORY_CI_PIN'):
                a.bootstrap(self.f.git, self.child(files=files))

    def test_workflow_and_helper_are_the_exact_linux_validated_bytes(self):
        self.assertEqual(a.digest(self.content[a.CI]), 'bf3886887b75318605a65f885993ad7c017664d5494268761742eef1c45b42fb')
        self.assertEqual(a.digest(self.content[a.MEMORY_CI_HELPER]), '781547403be306890bb4c5afa4e0f47d44dc6c3b606ef4129ff0c1c16e4c52d9')
        for old, new in [(b'145', b'144'), (b'23', b'22'), (b"pattern='test_*.py'", b"pattern='no_tests.py'"),
                         (b'not result.skipped', b'True'), (b'set -euo pipefail', b'set -eu'),
                         (b'contents: read', b'contents: write'), (b'node --test ', b'echo '),
                         (b' -eq 40', b' -eq 39'), (b')==111', b')==110')]:
            self.assertIn(old, self.content[a.CI])
            with self.subTest(old=old), self.assertRaisesRegex(ValueError, 'MEMORY_CI_WORKFLOW_SCOPE'):
                a.bootstrap(self.f.git, self.child(files={**self.content, a.CI: self.content[a.CI].replace(old, new)}))
        with self.assertRaisesRegex(ValueError, 'MEMORY_CI_HELPER_SCOPE'):
            a.bootstrap(self.f.git, self.child(files={**self.content, a.MEMORY_CI_HELPER: self.content[a.MEMORY_CI_HELPER].replace(b'method.cache_clear()', b'pass')}))

    def test_no_repetition_code_successor_or_editorial_escape(self):
        g = self.f.git
        for parent in (self.root, self.f.daily, self.second.daily):
            for p in (a.CI, a.MEMORY_CI_HELPER, 'scripts/statistical-levels-ci/admission.py', 'public/llms.txt'):
                with self.subTest(parent=parent, path=p), self.assertRaises(ValueError):
                    a.bootstrap(g, self.f.commit(parent, {p: g.blob(parent, p) + b'\n'}, a.MEMORY_CI_MESSAGE))
            with self.subTest(parent=parent), self.assertRaises(ValueError):
                a.bootstrap(g, self.f.commit(parent, {}, a.MEMORY_CI_MESSAGE))
        editorial = self.f.commit(self.root, {'public/llms.txt': g.blob(self.root, 'public/llms.txt') + b'\n'}, 'not authorized')
        files, entry = rebind_files(g, editorial, 'dpl_ModelOnly', 'a' * 40, a.lineage_registry(g, self.root),
                                    self.root, g.blob(editorial, a.CI), a.MEMORY_CI_IDENTITY, 'not authorized')
        with self.assertRaisesRegex(ValueError, 'MEMORY_CI_DATA_SUCCESSORS_ONLY'):
            a.bootstrap(g, self.f.commit(editorial, files, entry['rebind']['message']))

    def test_native_admission_is_not_a_hosted_or_release_certificate(self):
        api, g = self.model()
        result = a.admit(g, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_CI_MEMORY_RECOVERY_BOOTSTRAP')
        self.assertEqual(result['details']['remote_before'], a.MEMORY_CI_BASE)
        self.assertEqual(result['details']['parent_hosted_ci'], 'NOT_QUALIFIED_NOT_REUSED')
        self.assertEqual(result['details']['candidate_hosted_ci'], 'REQUIRED_NOT_YET_CERTIFIED')
        self.assertFalse(result['details']['local_memory_measurement_is_hosted_qualification'])
        self.assertFalse(result['release_authority_issued'])
        self.assertEqual(result['historical_subject_sha'], a.OLD)

    def test_native_event_run_ref_and_worktree_identity(self):
        mutations = [('event', 'before', a.RUNTIME_CI_BASE), ('event', 'after', a.MEMORY_CI_BASE),
                     ('event', 'forced', True), ('event', 'created', True), ('event', 'deleted', True),
                     ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.MEMORY_CI_BASE),
                     ('env', 'CI_EVENT_SHA', a.MEMORY_CI_BASE), ('env', 'GITHUB_WORKFLOW_SHA', a.MEMORY_CI_BASE),
                     ('env', 'GITHUB_REF', 'refs/heads/main'), ('env', 'GITHUB_RUN_ATTEMPT', '2'),
                     ('env', 'GITHUB_REPOSITORY_ID', '1'), ('env', 'GITHUB_EVENT_NAME', 'workflow_run'),
                     ('env', 'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256', '0' * 64)]
        for target, key, value in mutations:
            api, g = self.model()
            (api.event if target == 'event' else api.env)[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                a.admit(g, api, api.env, api.event)
        api, g = self.model(); g.dirty = True
        with self.assertRaisesRegex(ValueError, 'WORKTREE_DRIFT'):
            a.admit(g, api, api.env, api.event)
        api, g = self.model(); api.responses['/git/ref/heads/' + a.BRANCH]['object']['sha'] = a.MEMORY_CI_BASE
        with self.assertRaises(ValueError):
            a.admit(g, api, api.env, api.event)

    def test_daily_requires_exact_complete_parent_ci(self):
        api, g = self.model(True)
        self.assertEqual(a.admit(g, api, api.env, api.event)['details']['parent_ci']['head_sha'], self.root)
        key = '/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + self.root + '&status=success&per_page=100'
        for kind in ('absent', 'failure', 'cancelled', 'timed_out', 'old_sha', 'duplicate', 'extra_job', 'skipped_job'):
            api, g = self.model(True)
            listing = api.responses[key]; run = listing['workflow_runs'][0]
            jobs = api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']
            if kind == 'absent': listing.update(total_count=0, workflow_runs=[])
            if kind in ('failure', 'cancelled', 'timed_out'): run['conclusion'] = kind
            if kind == 'old_sha': run['head_sha'] = a.MEMORY_CI_BASE
            if kind == 'duplicate': listing.update(total_count=2, workflow_runs=[run, copy.deepcopy(run)])
            if kind == 'extra_job': jobs.update(total_count=2, jobs=jobs['jobs'] * 2)
            if kind == 'skipped_job': jobs['jobs'][0]['conclusion'] = 'skipped'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                a.admit(g, api, api.env, api.event)
        for index in range(6):
            for outcome in ('skipped', 'failure', 'cancelled', None):
                api, g = self.model(True); run = api.responses[key]['workflow_runs'][0]
                api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]['steps'][index]['conclusion'] = outcome
                with self.subTest(step=index, outcome=outcome), self.assertRaisesRegex(ValueError, 'PARENT_MANDATORY_STEP'):
                    a.admit(g, api, api.env, api.event)

    def test_all_historical_validators_and_assertions_are_preserved(self):
        g = self.f.git
        functions = lambda raw: {n.name: ast.dump(n) for n in ast.parse(raw).body if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
        old = functions(g.blob(a.MEMORY_CI_BASE, 'scripts/statistical-levels-ci/admission.py'))
        new = functions(g.blob(self.root, 'scripts/statistical-levels-ci/admission.py'))
        for name in old.keys() - {'bootstrap', 'admit', 'reconciled_report_hashes'}:
            self.assertEqual(old[name], new[name], name)
        before, after = g.tree(a.MEMORY_CI_BASE), g.tree(self.root)
        files = [p for p in before if p.startswith('scripts/statistical-levels-ci/test_') and p.endswith('.py')]
        self.assertEqual(len(files), 14)
        methods = lambda raw: {c.name + '.' + n.name: ast.dump(n) for c in ast.walk(ast.parse(raw)) if isinstance(c, ast.ClassDef)
                               for n in c.body if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')}
        for p in files:
            self.assertEqual(methods(g.blob(a.MEMORY_CI_BASE, p)), methods(g.blob(self.root, p)), p)
        self.assertEqual(len(a.paths(g)), 82)
        self.assertTrue(all(before[p] == after[p] for p in before if p not in a.MEMORY_CI_FILES))
        self.assertEqual(self.history.reuse_scope(g, self.root), self.history.reuse_scope(g, a.MEMORY_CI_BASE))
        self.assertEqual(a.reconciled_report_hashes(g, self.root), a.reconciled_report_hashes(g, a.MEMORY_CI_BASE))
        self.assertEqual(a.bootstrap(g, a.MEMORY_CI_BASE), (a.MEMORY_CI_BASE, []))

    def test_original_168_inventory_and_order_remain_mandatory(self):
        def cases(suite):
            for case in suite:
                if isinstance(case, unittest.TestSuite):
                    yield from cases(case)
                else:
                    yield case
        original = list(cases(unittest.TestLoader().discover(str(ROOT / 'scripts/statistical-levels-ci'), pattern='test_*.py')))
        main = [t for t in original if t.__class__.__module__ not in ('test_zod_security_admission', 'test_ci_recovery_admission')]
        zod = list(cases(unittest.TestLoader().loadTestsFromNames(['test_zod_security_admission', 'test_ci_recovery_admission'])))
        self.assertEqual((len(main), len(zod), len(original)), (145, 23, 168))
        self.assertEqual(len({t.id() for t in main + zod}), 168)
        self.assertFalse(any(t.__class__.__module__ == __name__ for t in original))
        body = self.shell.split("<<'PYTESTS'", 1)[1].split('\n', 1)[1].split('\nPYTESTS', 1)[0]
        expr = ast.parse(body).body[-1].exc.args[0]
        for count, skipped, success in ((145, [], True), (144, [], True), (146, [], True), (145, ['skip'], True), (145, [], False)):
            result = types.SimpleNamespace(testsRun=count, skipped=skipped, wasSuccessful=lambda: success)
            self.assertEqual(eval(compile(ast.Expression(expr), '<frozen-result>', 'eval'), {'result': result}),
                             0 if count == 145 and not skipped and success else 1)

    def test_frozen_count_program_rejects_missing_partial_duplicate_skips_and_failures(self):
        program = self.shell.split("python3 - <<'PYCOUNTS'\n", 1)[1].split('\nPYCOUNTS', 1)[0]
        logs = ['Ran 145 tests in 1s\n\nOK\n', 'Ran 23 tests in 1s\n\nOK\n']
        with tempfile.TemporaryDirectory(prefix='sl-memory-count-') as td:
            for phase in (0, 1):
                for kind in ('ok', 'absent', 'empty', 'partial', 'duplicate', 'skip', 'failure', 'error'):
                    data = list(logs)
                    if kind == 'empty': data[phase] = ''
                    if kind == 'partial': data[phase] = data[phase].replace('145' if phase == 0 else '23', '144' if phase == 0 else '22')
                    if kind == 'duplicate': data[phase] *= 2
                    if kind == 'skip': data[phase] = data[phase].replace('OK', 'OK (skipped=1)')
                    if kind in ('failure', 'error'): data[phase] = data[phase].replace('OK', 'FAILED (' + kind + 's=1)')
                    for index, name in enumerate(('python-main.log', 'python-zod.log')):
                        p = Path(td) / name
                        if index == phase and kind == 'absent': p.unlink(missing_ok=True)
                        else: p.write_text(data[index])
                    run = subprocess.run([sys.executable, '-c', program], env={**os.environ, 'CI_EVIDENCE': td}, capture_output=True)
                    with self.subTest(phase=phase, kind=kind):
                        self.assertEqual(run.returncode == 0, kind == 'ok')

    def test_frozen_shell_cannot_hide_failure_or_signal_exit(self):
        with tempfile.TemporaryDirectory(prefix='sl-memory-shell-') as td:
            path = Path(td); evidence = path / 'evidence'; evidence.mkdir()
            stub = '#!' + sys.executable + '\nimport os,sys\nif "-u" not in sys.argv: os.execv(sys.executable,[sys.executable]+sys.argv[1:])\npart="MAIN" if "-m" not in sys.argv else "ZOD"\nif part=="MAIN": sys.stdin.read()\nprint("Ran %d tests in 0.1s\\n\\nOK"%(145 if part=="MAIN" else 23))\nsys.exit(int(os.environ["MODEL_"+part]))\n'
            (path / 'python3').write_text(stub); (path / 'python3').chmod(0o755)
            (path / 'node').write_text('#!/bin/sh\nprintf called > "$CI_EVIDENCE/node-called"\n'); (path / 'node').chmod(0o755)
            for main, zod in ((0, 0), (1, 0), (137, 0), (143, 0), (0, 1), (0, 137), (0, 143)):
                marker = evidence / 'node-called'; marker.unlink(missing_ok=True)
                env = {**os.environ, 'PATH': str(path) + os.pathsep + os.environ['PATH'], 'CI_EVIDENCE': str(evidence),
                       'GITHUB_SHA': self.root, 'GITHUB_RUN_ID': 'synthetic', 'GITHUB_RUN_ATTEMPT': '1',
                       'MODEL_MAIN': str(main), 'MODEL_ZOD': str(zod)}
                run = subprocess.run(['bash', '-c', self.shell], env=env, capture_output=True)
                with self.subTest(main=main, zod=zod):
                    self.assertEqual(run.returncode == 0, main == zod == 0, run.stderr)
                    self.assertEqual(marker.exists(), main == zod == 0)


if __name__ == '__main__':
    from class_cache_cleanup import ClassCleanupLoader
    unittest.main(defaultTest='MemoryAdmissionTests', testLoader=ClassCleanupLoader())
