import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const workflow = await fs.readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const match = workflow.match(/^          # G5_EXECUTION_PRESERVATION_BEGIN\n([\s\S]*?)^          # G5_EXECUTION_PRESERVATION_END$/m);
assert.ok(match, 'Current CI admission function must be exercised');
const guard = match[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');
const harness = String.raw`
import hashlib,json,os,subprocess,sys
from unittest.mock import patch
payload=json.load(sys.stdin);case=payload['case']
first='9aea3eb35580f24362edc206fc4454e658226d17'
production='b1df2f5f1d375e923efc429b6a503c4125a6d522'
head='f'*40 # Explicit synthetic child; actual frozen commit tested separately.
parents=[first,production]
real_output=subprocess.check_output
real_run=subprocess.run
def git(*args):return real_output(['git',*args])
entries={}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if not row:continue
    meta,p=row.split(b'\t',1);mode,oid,stage=meta.decode().split()
    assert stage=='0'
    entries[p.decode()]=(mode,'blob',oid)
if case=='reversed_parents':parents.reverse()
elif case=='wrong_first_parent':parents[0]=production
elif case=='missing_production_parent':parents.pop()
elif case=='extra_parent':parents.append('a'*40)
elif case=='regime_workflow_deleted':del entries['.github/workflows/regime-v2-shadow.yml']
elif case=='regime_source_modified':entries['lib/regime-engine-v2/core.ts']=('100644','blob','a'*40)
elif case=='regime_evidence_modified':entries['docs/regime-engine-v2/specification.md']=('100644','blob','b'*40)
elif case=='shared_file_modified':entries['components/layout/Footer.tsx']=('100644','blob','c'*40)
elif case=='mode_changed':entries['.github/workflows/ci.yml']=('100755','blob',entries['.github/workflows/ci.yml'][2])
elif case=='missing_release_change':
    p='scripts/statistical-levels-release/policy.json';meta=git('ls-tree',first,'--',p).split(b'\t')[0].decode().split();entries[p]=tuple(meta)
elif case=='extra_release_change':entries['scripts/statistical-levels-release/unreviewed.mjs']=('100644','blob','d'*40)
def observed_git(*args):
    if args==('ls-tree','-rz',head):
        return b''.join((' '.join(v)+'\t'+p+'\0').encode()for p,v in sorted(entries.items()))
    if case=='production_tree_mismatch' and args==('rev-parse',production+'^{tree}'):return b'0'*40+b'\n'
    return git(*args)
def command(args,**kwargs):
    if args[:3]!=['git','merge-base','--is-ancestor']:return real_run(args,**kwargs)
    assert args[:3]==['git','merge-base','--is-ancestor'] and args[3]in parents and args[4]==head
    if case=='missing_ancestry':raise subprocess.CalledProcessError(1,args)
    return subprocess.CompletedProcess(args,0)
namespace={'git':observed_git,'hashlib':hashlib,'os':os,'subprocess':subprocess}
exec(compile(payload['guard'],'actual-current-ci-admission','exec'),namespace)
try:
    with patch.dict(os.environ,{'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256':'a'*64 if case=='local_impersonation' else ''}),patch('subprocess.run',command):
        result=namespace['verify_g5_execution'](head,parents)
    print(json.dumps({'accepted':True,'result':result}))
except (AssertionError,subprocess.CalledProcessError) as error:
    print(json.dumps({'accepted':False,'error':str(error)}))
`;

for (const name of ['valid', 'reversed_parents', 'wrong_first_parent', 'missing_production_parent', 'extra_parent',
  'regime_workflow_deleted', 'regime_source_modified', 'regime_evidence_modified', 'shared_file_modified',
  'mode_changed', 'missing_release_change', 'extra_release_change', 'production_tree_mismatch', 'missing_ancestry', 'local_impersonation']) {
  test('G5 execution preservation: ' + name, () => {
    const result = spawnSync('python3', ['-c', harness], {
      cwd: root, encoding: 'utf8', timeout: 60000, input: JSON.stringify({ case: name, guard }),
    });
    assert.equal(result.status, 0, result.stderr);
    const value = JSON.parse(result.stdout);
    assert.equal(value.accepted, name === 'valid', JSON.stringify(value));
    if (name !== 'valid') {
      const expected = ['reversed_parents', 'wrong_first_parent', 'missing_production_parent', 'extra_parent'].includes(name)
        ? 'G5_ORDERED_PARENTS' : name === 'regime_workflow_deleted' ? 'G5_FIRST_PARENT_REMOVAL'
          : name === 'mode_changed' ? 'G5_DELTA_MODE' : name === 'production_tree_mismatch' ? 'G5_PARENT_TREE_READBACK'
            : name === 'local_impersonation' ? 'LOCAL_HOSTED_ROLE_CONFLICT'
              : name === 'missing_ancestry' ? 'non-zero exit status 1' : 'G5_EXACT_FIRST_PARENT_DELTA';
      assert.ok(value.error.includes(expected), JSON.stringify(value));
    }
    if (name === 'valid') {
      assert.equal(value.result.out_of_scope_removals, 0);
      assert.equal(value.result.out_of_scope_modifications, 0);
      assert.equal(value.result.first_parent_files, 1465);
    }
  });
}
