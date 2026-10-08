"""Three real Git authorities; no ancestry or historical-oracle substitution."""
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import subprocess

SOURCE_RC2 = '2271bee0a21aadd12ab2f45d080c58c94b696326'
SOURCE_RC2_TREE = '362fed10af7de0c198965921b81d7f26166d1c04'
SOURCE_RC1 = '330e95bf131fc824c4710ff5df734cafdc719263'
SOURCE_PARENT = '636cb73fb0fe4d2b28ad96cb7185f8c07d8f895b'
REMOTE_BASE = '7dae726917ded8f5828a8525d596b1ce02830196'
COMPATIBILITY_PATH = 'components/dashboard/DashboardRegimeV1.tsx'
LAYER_PREFIXES = ('scripts/regime-integration/', 'docs/regime-engine-v2/remote-integration/')
OVERLAPS = {'app/(es)/dashboard/page.tsx', 'lib/dashboard/adapters/vix-term-structure.ts',
            'lib/dashboard/get-dashboard-data.ts', 'lib/dashboard/get-home-dashboard-preview-data.ts',
            'scripts/build-statistical-levels.mjs', 'scripts/trends-test-register.mjs'}
REMOTE_EXACT_OVERLAPS = {'app/(es)/dashboard/page.tsx', 'lib/dashboard/get-dashboard-data.ts',
                         'lib/dashboard/get-home-dashboard-preview-data.ts'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root)


def tree(root, ref):
    result = {}
    for row in git(root, 'ls-tree', '-rz', ref).split(b'\0'):
        if not row:
            continue
        header, name = row.split(b'\t', 1)
        mode, kind, blob = header.decode().split()
        if kind != 'blob' or mode not in {'100644', '100755'}:
            raise ValueError('Non-regular committed source: ' + name.decode())
        result[name.decode()] = {'mode': mode, 'blob': blob}
    return result


def file_inventory(root):
    result = {}
    for directory, folders, files in os.walk(root):
        for name in folders:
            if (Path(directory) / name).is_symlink():
                raise ValueError('Directory symlink: ' + str(Path(directory) / name))
        folders[:] = [name for name in folders if name not in {'.git', 'node_modules', '.next'}]
        for name in files:
            path = Path(directory) / name
            if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
                raise ValueError('Source redirects outside checkout: ' + str(path))
            result[str(path.relative_to(root))] = path.read_bytes()
    return result


def assert_tree_bytes(root, expected):
    observed = file_inventory(root)
    if set(observed) != set(expected):
        raise ValueError('Unsealed source inventory: ' + json.dumps(sorted(set(observed) ^ set(expected))))
    for path, data in observed.items():
        actual = hashlib.sha1(('blob ' + str(len(data)) + '\0').encode() + data).hexdigest()
        if actual != expected[path]['blob']:
            raise ValueError('Sealed source bytes changed: ' + path)
        if 'mode' in expected[path]:
            mode = '100755' if (root / path).stat().st_mode & 0o111 else '100644'
            if mode != expected[path]['mode']:
                raise ValueError('Sealed source executable mode changed: ' + path)
    return {path: sha(data) for path, data in observed.items()}


def validate_authority(root, ref):
    root = root.resolve()
    head = git(root, 'rev-parse', 'HEAD').decode().strip()
    if head != ref:
        raise ValueError('Authority checkout HEAD is not its declared commit')
    if (root / '.git').is_symlink() or (root / 'node_modules').is_symlink():
        raise ValueError('Authority metadata/dependencies cannot be symlinks')
    expected = tree(root, ref)
    hashes = assert_tree_bytes(root, expected)
    return {'root': str(root), 'commit': ref, 'tree': git(root, 'rev-parse', ref + '^{tree}').decode().strip(),
            'fileCount': len(hashes), 'hashes': hashes}


def approve_sources(remote, approved, parent, candidate, touched, compatibility_hash, observed_hashes):
    """Pure policy comparison; hashes come from verified Git trees, not self-oracles."""
    for path, record in remote.items():
        if path not in touched and candidate.get(path) != record:
            raise ValueError('Remote-only source changed: ' + path)
    for path in touched:
        if path == COMPATIBILITY_PATH:
            if observed_hashes.get(path) != compatibility_hash:
                raise ValueError('Compatibility resolution differs from independently reviewed SHA256')
        elif path in REMOTE_EXACT_OVERLAPS:
            if candidate.get(path) != remote.get(path):
                raise ValueError('Public remote source changed: ' + path)
        elif path == 'scripts/build-statistical-levels.mjs':
            # The exclusive hook and historical provenance contract are tested by
            # provenance-verify. Its current bytes are still bound by candidate tree.
            if path not in candidate:
                raise ValueError('Generator absent')
        elif candidate.get(path) != approved.get(path):
            raise ValueError('Approved non-overlap source changed: ' + path)
    allowed = set(remote) | touched
    for path in set(candidate) - allowed:
        if not path.startswith(LAYER_PREFIXES):
            raise ValueError('Unrelated added source: ' + path)
    # A source-parent file absent from both authorities cannot enter by accident.
    for path in set(parent) - set(remote) - touched:
        if path in candidate:
            raise ValueError('Unapproved source-parent history imported: ' + path)


def validate_candidate(root, expected_tree, compatibility_hash):
    if git(root, 'rev-parse', SOURCE_RC2 + '^{tree}').decode().strip() != SOURCE_RC2_TREE:
        raise ValueError('Source RC2 tree changed')
    if git(root, 'rev-list', '--parents', '-n', '1', SOURCE_RC2).decode().split() != [SOURCE_RC2, SOURCE_RC1]:
        raise ValueError('Source RC2 ancestry changed')
    head = git(root, 'rev-parse', 'HEAD').decode().strip()
    if head != REMOTE_BASE and git(root, 'rev-list', '--parents', '-n', '1', head).decode().split() != [head, REMOTE_BASE]:
        raise ValueError('Candidate is neither fresh remote nor its direct integration child')
    entries = tree(root, expected_tree)
    hashes = assert_tree_bytes(root, entries)
    touched = set()
    for ref in ['f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c', SOURCE_RC1, SOURCE_RC2]:
        touched.update(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', '-z', ref).decode().split('\0'))
    touched.discard('')
    approve_sources(tree(root, REMOTE_BASE), tree(root, SOURCE_RC2), tree(root, SOURCE_PARENT),
                    entries, touched, compatibility_hash, hashes)
    if not any(path.startswith(LAYER_PREFIXES) for path in entries):
        raise ValueError('Committed integration layer missing')
    return {'head': head, 'actualParents': git(root, 'rev-list', '--parents', '-n', '1', head).decode().split()[1:],
            'expectedTree': expected_tree, 'sourceRC2': SOURCE_RC2, 'sourceRC2Tree': SOURCE_RC2_TREE,
            'remoteBase': REMOTE_BASE, 'fileCount': len(hashes), 'touchedPaths': len(touched),
            'compatibilitySha256': compatibility_hash, 'hashes': hashes, 'ancestrySpoofed': False}


def warning_records(rows, root, revision=None):
    result = []
    for row in rows:
        messages = [message for message in row['messages'] if message['severity'] == 1]
        if not messages:
            continue
        path = str(Path(row['filePath']).resolve().relative_to(root.resolve()))
        text = git(root, 'show', revision + ':' + path).decode() if revision else (root / path).read_text()
        lines = text.splitlines()
        result.extend((path, message.get('ruleId'), message['message'], lines[message['line'] - 1].strip()) for message in messages)
    return result


def warning_delta(current_rows, current_root, baseline_rows, baseline_root):
    current = Counter(warning_records(current_rows, current_root))
    baseline = Counter(warning_records(baseline_rows, baseline_root, REMOTE_BASE))
    additions, removals = list((current - baseline).elements()), list((baseline - current).elements())
    return {'errors': sum(row['errorCount'] for row in current_rows),
            'warnings': sum(row['warningCount'] for row in current_rows),
            'remoteBaselineWarnings': sum(row['warningCount'] for row in baseline_rows),
            'newWarnings': len(additions), 'removedWarnings': len(removals),
            'newWarningDetails': additions, 'removedWarningDetails': removals}
