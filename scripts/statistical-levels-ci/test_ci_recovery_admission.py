"""One-time R1 repair: real isolated Git objects, explicitly synthetic hosted evidence."""
import ast
import copy
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

import admission as a
from test_admission import Fixture, ModelAPI, ModelGit, ROOT
import test_lineage_admission as lineage


def seal(files):
    blank = re.sub(a.CI_REPAIR_PIN, lambda m: m[1] + b'0' * 64 + m[2], files[a.CI])
    rows = [{'path': p, 'mode': '100644', 'sha256': a.digest(blank if p == a.CI else files[p])}
            for p in sorted(a.CI_REPAIR_FILES)]
    pin = a.digest(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode())
    return {**files, a.CI: re.sub(a.CI_REPAIR_PIN, lambda m: m[1] + pin.encode() + m[2], blank)}


class CIRecoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='sl-r1-repair-model-')
        directory = Path(cls.temp.name)
        f = cls.first = Fixture.__new__(Fixture)
        f.repo = directory / 'repo.git'
        subprocess.run(['git', 'clone', '--bare', '--shared', str(ROOT), str(f.repo)], check=True, capture_output=True)
        f.git = a.Git(f.repo)
        f.env = lineage.identity_env({**os.environ, 'GIT_INDEX_FILE': str(directory / 'index')}, a.CI_REPAIR_IDENTITY)
        cls.root, _ = a.bootstrap(f.git, a.Git(ROOT).text('rev-parse', 'HEAD'))
        a.need(f.git.parents(cls.root) == [a.CI_REPAIR_BASE], 'CI_REPAIR_TEST_SUBJECT')
        f.root = cls.root
        cls.content = {p: f.git.blob(cls.root, p) for p in a.CI_REPAIR_FILES}
        template = json.loads((ROOT / a.CURRENT_DATA_EVIDENCE).read_bytes())['metadata_objects']
        lineage.make_lineage_daily(f, cls.root, 11, lineage.lineage_metadata(f.git, cls.root, template))
        cls.second = copy.copy(f)
        lineage.make_lineage_daily(cls.second, f.daily, 12, lineage.lineage_metadata(f.git, f.daily, template))
        spec = importlib.util.spec_from_file_location('repair_historical_reuse', ROOT / 'scripts/statistical-levels-ci/historical-tests.py')
        cls.history = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.history)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def model(self, f=None, daily=False):
        f = f or self.first
        api = ModelAPI(f, daily)
        if daily:
            prior = api.responses[self.listing(f.source)]['workflow_runs'][0]
            jobs = api.responses.pop('/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100')
            prior['id'] = 39999999999 if f.source == self.root else 50000000000 + self.first.day - 20
            prior['event'] = 'push' if f.source == self.root else 'workflow_run'
            api.responses['/actions/runs/' + str(prior['id']) + '/attempts/1/jobs?per_page=100'] = jobs
        else:
            api.event['before'] = a.CI_REPAIR_BASE
        git = ModelGit(f.repo, api.env['GITHUB_SHA'])
        git.blob, git.tree, git.parents = f.git.blob, f.git.tree, f.git.parents
        return lineage.november(api, f), git

    @staticmethod
    def listing(sha):
        return '/actions/workflows/' + str(a.CI_ID) + '/runs?head_sha=' + sha + '&status=success&per_page=100'

    def changed(self, files=None, parent=None, message=None, env=None, modes=None, reseal=True):
        files = dict(self.content if files is None else files)
        if reseal:
            files = seal(files)
        return self.first.commit(parent or a.CI_REPAIR_BASE, files, message or a.CI_REPAIR_MESSAGE, env, modes)

    def test_exact_root_preserves_all_82_data_paths_and_release_policy(self):
        git = self.first.git
        self.assertEqual(a.bootstrap(git, self.root), (self.root, []))
        before, after = git.tree(a.CI_REPAIR_BASE), git.tree(self.root)
        self.assertEqual({p for p in before.keys() | after.keys() if before.get(p) != after.get(p)}, a.CI_REPAIR_FILES)
        self.assertEqual(len(a.paths(git)), 82)
        for p in a.paths(git) | {a.LINEAGE_REGISTRY, 'scripts/statistical-levels-release/policy.json'}:
            self.assertEqual(before[p], after[p], p)

    def test_native_root_explicitly_has_no_inherited_r1_certificate(self):
        api, git = self.model()
        api.responses[self.listing(self.root)] = {'total_count': 0, 'workflow_runs': []}
        result = a.admit(git, api, api.env, api.event)
        self.assertEqual(result['mode'], 'EXACT_R1_CI_REPAIR_BOOTSTRAP')
        self.assertEqual(result['details']['r1_hosted_ci'], 'FAILED_NOT_REUSED')
        self.assertEqual(result['details']['failed_run_id'], 42536568040)
        self.assertEqual(result['details']['failed_attempts'], [1, 2, 3])
        self.assertEqual(result['details']['candidate_hosted_ci'], 'REQUIRED_NOT_YET_CERTIFIED')
        self.assertTrue(result['details']['new_hosted_qualification_required'])
        self.assertFalse(result['release_authority_issued'])
        self.assertEqual(result['historical_subject_sha'], a.OLD)

    def test_native_event_identity_ref_and_attempt_cannot_be_substituted(self):
        mutations = [('event', 'before', a.CI_REPAIR_R1), ('event', 'after', a.CI_REPAIR_BASE),
            ('event', 'forced', True), ('event', 'created', True), ('event', 'deleted', True),
            ('event', 'ref', 'refs/heads/main'), ('env', 'GITHUB_SHA', a.CI_REPAIR_BASE),
            ('env', 'CI_EVENT_SHA', a.CI_REPAIR_R1), ('env', 'GITHUB_WORKFLOW_SHA', a.CI_REPAIR_R1),
            ('env', 'GITHUB_REF', 'refs/heads/main'), ('env', 'GITHUB_REPOSITORY_ID', '1'),
            ('env', 'GITHUB_RUN_ATTEMPT', '2'), ('env', 'GITHUB_EVENT_NAME', 'workflow_run'),
            ('env', 'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256', '0' * 64)]
        for target, key, value in mutations:
            with self.subTest(target=target, key=key):
                api, git = self.model()
                (api.event if target == 'event' else api.env)[key] = value
                with self.assertRaises(ValueError):
                    a.admit(git, api, api.env, api.event)
        api, git = self.model()
        api.responses['/git/ref/heads/' + a.BRANCH]['object']['sha'] = a.CI_REPAIR_BASE
        with self.assertRaisesRegex(ValueError, 'REF_MOVED'):
            a.admit(git, api, api.env, api.event)
        api, git = self.model(); git.dirty = True
        with self.assertRaisesRegex(ValueError, 'WORKTREE_DRIFT'):
            a.admit(git, api, api.env, api.event)

    def test_exact_parent_and_single_parent_are_required(self):
        with self.assertRaises(ValueError):
            a.bootstrap(self.first.git, self.changed(parent=a.CI_REPAIR_R1))
        tree = self.first.git.text('rev-parse', self.root + '^{tree}')
        merge = self.first.command(['commit-tree', tree, '-p', a.CI_REPAIR_BASE, '-p', a.CI_REPAIR_R1],
                                   (a.CI_REPAIR_MESSAGE + '\n').encode()).decode().strip()
        with self.assertRaisesRegex(ValueError, 'LINEAGE_ORDERED_SINGLE_PARENT'):
            a.bootstrap(self.first.git, merge)

    def test_exact_header_is_required(self):
        for change in [{'GIT_AUTHOR_NAME': 'Other'}, {'GIT_COMMITTER_EMAIL': 'other@example.invalid'},
                       {'GIT_AUTHOR_DATE': '1794354794 +0000'}]:
            with self.subTest(change=change):
                with self.assertRaisesRegex(ValueError, 'CI_REPAIR_HEADER'):
                    a.bootstrap(self.first.git, self.changed(env={**self.first.env, **change}))
        with self.assertRaisesRegex(ValueError, 'CI_REPAIR_HEADER'):
            a.bootstrap(self.first.git, self.changed(message='another repair'))

    def test_closed_delta_rejects_missing_extra_data_and_mode_changes(self):
        git = self.first.git
        for p in ['extra.txt', a.PROVENANCE, 'scripts/statistical-levels-release/policy.json', a.LINEAGE_REGISTRY]:
            with self.subTest(path=p):
                value = git.blob(a.CI_REPAIR_BASE, p) + b'\n' if p in git.tree(a.CI_REPAIR_BASE) else b'foreign'
                with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                    a.bootstrap(git, self.changed(files={**self.content, p: value}))
        for p in a.CI_REPAIR_FILES:
            with self.subTest(path=p):
                with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
                    a.bootstrap(git, self.changed(files={n: b for n, b in self.content.items() if n != p}, reseal=False))
                with self.assertRaisesRegex(ValueError, 'DELTA_MODE'):
                    a.bootstrap(git, self.changed(modes={p: '100755'}))

    def test_payload_pin_covers_every_repair_file(self):
        for p in a.CI_REPAIR_FILES - {a.CI}:
            with self.subTest(path=p):
                with self.assertRaisesRegex(ValueError, 'CI_REPAIR_PAYLOAD'):
                    a.bootstrap(self.first.git, self.changed(files={**self.content, p: self.content[p] + b'\n'}, reseal=False))
        bad = re.sub(a.CI_REPAIR_PIN, lambda m: m[1] + b'0' * 64 + m[2], self.content[a.CI])
        with self.assertRaisesRegex(ValueError, 'CI_REPAIR_PAYLOAD'):
            a.bootstrap(self.first.git, self.changed(files={**self.content, a.CI: bad}, reseal=False))

    def test_resealing_cannot_change_workflow_controls(self):
        for before, after in [(b'timeout-minutes: 40', b'timeout-minutes: 41'),
                              (b'contents: read', b'contents: write'),
                              (b'node --test ', b'echo skipped '),
                              (b"pattern='test_*.py'", b"pattern='test_nothing.py'")]:
            with self.subTest(before=before):
                self.assertIn(before, self.content[a.CI])
                with self.assertRaisesRegex(ValueError, 'CI_REPAIR_WORKFLOW_SCOPE'):
                    a.bootstrap(self.first.git, self.changed(files={**self.content, a.CI: self.content[a.CI].replace(before, after)}))

    def test_repair_cannot_repeat_or_admit_later_code_changes(self):
        git = self.first.git
        for parent in [self.root, self.first.daily, self.second.daily]:
            for p in [a.CI, 'scripts/statistical-levels-ci/admission.py', 'public/llms.txt']:
                with self.subTest(parent=parent, path=p):
                    bad = self.first.commit(parent, {p: git.blob(parent, p) + b'\n'}, a.CI_REPAIR_MESSAGE)
                    with self.assertRaises(ValueError):
                        a.bootstrap(git, bad)
        missing = self.first.commit(self.root, {a.PROVENANCE: git.blob(self.first.daily, a.PROVENANCE)}, 'partial data')
        with self.assertRaisesRegex(ValueError, 'EXACT_DELTA'):
            a.bootstrap(git, missing)

    def test_daily_admission_requires_full_candidate_ci_and_each_exact_parent(self):
        for f in [self.first, self.second]:
            api, git = self.model(f, daily=True)
            result = a.admit(git, api, api.env, api.event)
            self.assertEqual(result['mode'], 'AUTHENTICATED_DATA_SUCCESSOR')
            self.assertEqual(result['root_sha'], self.root)
            self.assertEqual(result['details']['parent_ci']['head_sha'], f.source)
            self.assertEqual(result['details']['data']['snapshots'], 81)
            for kind in ['absent', 'failed', 'noop', 'ambiguous', 'stale_r1', 'wrong_workflow']:
                with self.subTest(parent=f.source, kind=kind):
                    api, git = self.model(f, daily=True)
                    listing = api.responses[self.listing(f.source)]
                    run = listing['workflow_runs'][0]
                    if kind == 'absent': listing.update(total_count=0, workflow_runs=[])
                    if kind == 'failed': run['conclusion'] = 'failure'
                    if kind == 'noop':
                        run['event'] = 'workflow_run'
                        api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]['conclusion'] = 'skipped'
                    if kind == 'ambiguous': listing.update(total_count=2, workflow_runs=[run, copy.deepcopy(run)])
                    if kind == 'stale_r1': run['head_sha'] = a.CI_REPAIR_R1
                    if kind == 'wrong_workflow': run['workflow_id'] = a.PRODUCER_ID
                    with self.assertRaises(ValueError):
                        a.admit(git, api, api.env, api.event)
            for step_index in range(6):
                for conclusion in ['skipped', 'failure']:
                    with self.subTest(parent=f.source, step=step_index, conclusion=conclusion):
                        api, git = self.model(f, daily=True)
                        run = api.responses[self.listing(f.source)]['workflow_runs'][0]
                        job = api.responses['/actions/runs/' + str(run['id']) + '/attempts/1/jobs?per_page=100']['jobs'][0]
                        job['steps'][step_index]['conclusion'] = conclusion
                        with self.assertRaisesRegex(ValueError, 'PARENT_MANDATORY_STEP'):
                            a.admit(git, api, api.env, api.event)

    def test_repair_does_not_open_later_editorial_rebinds(self):
        git = self.first.git
        editorial = self.first.commit(self.root, {'public/llms.txt': git.blob(self.root, 'public/llms.txt') + b'\n'}, 'not this repair')
        registry = a.lineage_registry(git, self.root)
        files, entry = lineage.rebind_files(git, editorial, 'dpl_ModelOnly', 'a' * 40, registry, self.root,
            git.blob(editorial, a.CI), a.CI_REPAIR_IDENTITY, 'not this repair')
        bad = self.first.commit(editorial, files, entry['rebind']['message'])
        with self.assertRaisesRegex(ValueError, 'CI_REPAIR_DATA_SUCCESSORS_ONLY'):
            a.bootstrap(git, bad)

    def test_historical_contracts_and_all_existing_test_methods_are_preserved(self):
        git = self.first.git
        self.assertEqual(self.history.reuse_scope(git, self.root), self.history.reuse_scope(git, a.CI_REPAIR_BASE))
        self.assertEqual(a.reconciled_report_hashes(git, self.root), a.reconciled_report_hashes(git, a.CI_REPAIR_BASE))
        for p in git.tree(a.CI_REPAIR_BASE):
            if p.startswith('scripts/statistical-levels-ci/test_') and p.endswith('.py'):
                def test_methods(data):
                    return {(c.name, n.name): ast.dump(n) for c in ast.parse(data).body if isinstance(c, ast.ClassDef)
                            for n in c.body if isinstance(n, ast.FunctionDef) and n.name.startswith('test_')}
                self.assertEqual(test_methods(git.blob(a.CI_REPAIR_BASE, p)), test_methods(git.blob(self.root, p)), p)
        old = ast.parse(git.blob(a.CI_REPAIR_BASE, 'scripts/statistical-levels-ci/admission.py'))
        current = ast.parse(self.content['scripts/statistical-levels-ci/admission.py'])
        functions = lambda t: {n.name: ast.dump(n) for n in t.body if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
        old, current = functions(old), functions(current)
        for name in old.keys() - {'bootstrap', 'admit', 'reconciled_report_hashes'}:
            self.assertEqual(old[name], current[name], name)
        blocks = lambda b: re.findall(rb"^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$", b, re.M)
        self.assertEqual(len(blocks(self.content[a.CI])), 3)
        self.assertEqual(blocks(git.blob(a.CI_REPAIR_BASE, a.CI)), blocks(self.content[a.CI]))

    def test_both_python_processes_run_and_either_failure_blocks_node(self):
        text = self.content[a.CI].decode()
        block = text.split('      - name: Test bounded CI admission and producer readback\n', 1)[1].split('\n      - name:', 1)[0]
        script = '\n'.join(line[10:] for line in block.split('        run: |\n', 1)[1].splitlines())
        with tempfile.TemporaryDirectory(prefix='sl-r1-shell-model-') as tmp:
            directory = Path(tmp)
            python = directory / 'python3'
            python.write_text('#!/bin/sh\necho python >> "$CALLS"\nif [ "$1" = "-" ]; then exit "$FIRST"; else exit "$SECOND"; fi\n')
            node = directory / 'node'; node.write_text('#!/bin/sh\necho node >> "$CALLS"\n')
            python.chmod(0o755); node.chmod(0o755)
            for first, second in [(0, 0), (1, 0), (0, 1), (1, 1)]:
                calls = directory / ('calls-' + str(first) + str(second))
                result = subprocess.run(['bash', '-c', script], env={**os.environ, 'PATH': str(directory) + ':' + os.environ['PATH'],
                    'CALLS': str(calls), 'FIRST': str(first), 'SECOND': str(second)}, capture_output=True)
                self.assertEqual(result.returncode, 1 if first or second else 0, result.stderr)
                self.assertEqual(calls.read_text().splitlines(), ['python', 'python'] + ([] if first or second else ['node']))
