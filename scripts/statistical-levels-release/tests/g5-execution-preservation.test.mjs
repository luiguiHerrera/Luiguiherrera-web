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
for row in git('ls-tree','-rz','38d8e64202a5f6eec827971f031fcafc9e5f9231').split(b'\0'):
    if not row:continue
    meta,p=row.split(b'\t',1);mode,kind,oid=meta.decode().split()
    assert kind=='blob'
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

const successorHarness = String.raw`
import hashlib,json,os,subprocess,sys
from unittest.mock import patch
payload=json.load(sys.stdin);case=payload['case']
anchor='38d8e64202a5f6eec827971f031fcafc9e5f9231'
head='f'*40 # Synthetic only; actual final commit is separately admitted.
parents=[anchor]
real_output=subprocess.check_output;real_run=subprocess.run
def git(*args):return real_output(['git',*args])
entries={}
for row in git('ls-tree','-rz','60f1d6b4cb78809a42ae40f8e1a2259a0cafd9ae').split(b'\0'):
    if not row:continue
    meta,p=row.split(b'\t',1);mode,kind,oid=meta.decode().split()
    entries[p.decode()]=(mode,kind,oid)
if case=='wrong_parent':parents=['a'*40]
elif case=='extra_parent':parents.append('b'*40)
elif case=='regime_workflow_deleted':del entries['.github/workflows/regime-v2-shadow.yml']
elif case=='regime_source_modified':entries['lib/regime-engine-v2/core.ts']=('100644','blob','a'*40)
elif case=='regime_evidence_modified':entries['docs/regime-engine-v2/specification.md']=('100644','blob','b'*40)
elif case=='product_modified':entries['components/layout/Header.tsx']=('100644','blob','c'*40)
elif case=='data_modified':entries['lib/statistical-levels/generated-provenance.json']=('100644','blob','c'*40)
elif case=='policy_modified':entries['scripts/statistical-levels-release/policy.json']=('100644','blob','c'*40)
elif case=='extra_file':entries['scripts/statistical-levels-release/unreviewed.mjs']=('100644','blob','d'*40)
elif case=='mode_changed':entries['.github/workflows/ci.yml']=('100755','blob',entries['.github/workflows/ci.yml'][2])
elif case=='missing_oidc_change':
    p='scripts/statistical-levels-release/scripts/runtime-io.mjs';entries[p]=tuple(git('ls-tree',anchor,'--',p).split(b'\t')[0].decode().split())
def observed_git(*args):
    if args==('ls-tree','-rz',head):
        return b''.join((' '.join(v)+'\t'+p+'\0').encode()for p,v in sorted(entries.items()))
    if case=='anchor_object_changed' and args==('cat-file','commit',anchor):return git(*args)+b'changed'
    return git(*args)
def command(args,**kwargs):
    if args==['git','merge-base','--is-ancestor',anchor,head]:
        if case=='missing_ancestry':raise subprocess.CalledProcessError(1,args)
        return subprocess.CompletedProcess(args,0)
    return real_run(args,**kwargs)
namespace={'git':observed_git,'hashlib':hashlib,'os':os,'subprocess':subprocess}
exec(compile(payload['guard'],'actual-oidc-ci-admission','exec'),namespace)
try:
    with patch.dict(os.environ,{'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256':'a'*64 if case=='local_impersonation' else ''}),patch('subprocess.run',command):
        result=namespace['verify_g5_execution'](head,parents)
    print(json.dumps({'accepted':True,'result':result}))
except (AssertionError,subprocess.CalledProcessError) as error:
    print(json.dumps({'accepted':False,'error':str(error)}))
`;
const successorErrors = {
  wrong_parent: 'G5_ORDERED_PARENTS', extra_parent: 'G5_ORDERED_PARENTS',
  regime_workflow_deleted: 'G5_OIDC_PATH_PRESERVATION', regime_source_modified: 'G5_OIDC_EXACT_DELTA',
  regime_evidence_modified: 'G5_OIDC_EXACT_DELTA', product_modified: 'G5_OIDC_EXACT_DELTA',
  data_modified: 'G5_OIDC_EXACT_DELTA', policy_modified: 'G5_OIDC_EXACT_DELTA', extra_file: 'G5_OIDC_PATH_PRESERVATION',
  mode_changed: 'G5_OIDC_MODE', missing_oidc_change: 'G5_OIDC_EXACT_DELTA',
  anchor_object_changed: 'G5_OIDC_ANCHOR_OBJECT', missing_ancestry: 'non-zero exit status 1',
  local_impersonation: 'LOCAL_HOSTED_ROLE_CONFLICT',
};
for (const name of ['valid', ...Object.keys(successorErrors)]) test('G5 OIDC successor preservation: ' + name, () => {
  const result = spawnSync('python3', ['-c', successorHarness], {
    cwd: root, encoding: 'utf8', timeout: 60000, input: JSON.stringify({ case: name, guard }),
  });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.accepted, name === 'valid', JSON.stringify(value));
  if (name === 'valid') {
    assert.equal(value.result.oidc_parent, '38d8e64202a5f6eec827971f031fcafc9e5f9231');
    assert.equal(value.result.source_files, 1469);
    assert.equal(value.result.oidc_preserved_files, 1455);
    assert.equal(value.result.out_of_scope_removals, 0);
    assert.equal(value.result.out_of_scope_modifications, 0);
  } else assert.ok(value.error.includes(successorErrors[name]), JSON.stringify(value));
});

const coverageMatch = workflow.match(/^\s*# G5_OIDC_COVERAGE_BEGIN\n([\s\S]*?)^\s*# G5_OIDC_COVERAGE_END$/m);
assert.ok(coverageMatch);
const coverageHarness = String.raw`
import ast,json,re,sys,textwrap
v=json.load(sys.stdin);source=textwrap.dedent(v['source']);tree=ast.parse(source)
required=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign)))
preservation=next(n for n in tree.body if isinstance(n,ast.For) and isinstance(n.target,ast.Name) and n.target.id=='case')
required += ['G5 OIDC successor preservation: '+x for x in ast.literal_eval(preservation.iter)]
lines=['ok '+str(i+1)+' - '+name for i,name in enumerate(required)]
if v['case']=='missing':lines.pop(0)
elif v['case']=='duplicate':lines.append(lines[0])
elif v['case']=='skipped':lines[0]+=' # SKIP'
ns={'name':'release','text':'\n'.join(lines),'re':re}
try:
    exec(compile(source,'actual-oidc-ci-coverage','exec'),ns)
    assert ns['name']=='release','G5_OIDC_SUITE_ACCOUNTING_SHADOWED'
    print(json.dumps({'accepted':True,'suite':ns['name']}))
except AssertionError as error:print(json.dumps({'accepted':False,'error':str(error)}))
`;
for (const name of ['valid', 'missing', 'duplicate', 'skipped']) test('G5 OIDC mandatory coverage: ' + name, () => {
  const result = spawnSync('python3', ['-c', coverageHarness], {
    encoding: 'utf8', input: JSON.stringify({ case: name, source: coverageMatch[1] }), timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.accepted, name === 'valid', JSON.stringify(value));
  if (name === 'valid') assert.equal(value.suite, 'release');
  else assert.equal(value.error, 'G5_OIDC_CASE_NOT_EXECUTED');
});

const diagnosticHarness = String.raw`
import hashlib,json,os,subprocess,sys
from unittest.mock import patch
payload=json.load(sys.stdin);case=payload['case']
anchor='60f1d6b4cb78809a42ae40f8e1a2259a0cafd9ae'
head='f'*40 # Synthetic only; actual final commit is separately admitted.
parents=[anchor]
real_output=subprocess.check_output;real_run=subprocess.run
def git(*args):return real_output(['git',*args])
entries={}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if not row:continue
    meta,p=row.split(b'\t',1);mode,oid,stage=meta.decode().split();assert stage=='0'
    entries[p.decode()]=(mode,'blob',oid)
if case=='wrong_parent':parents=['a'*40]
elif case=='extra_parent':parents.append('b'*40)
elif case=='regime_workflow_deleted':del entries['.github/workflows/regime-v2-shadow.yml']
elif case=='regime_source_modified':entries['lib/regime-engine-v2/core.ts']=('100644','blob','a'*40)
elif case=='regime_evidence_modified':entries['docs/regime-engine-v2/specification.md']=('100644','blob','b'*40)
elif case=='product_modified':entries['components/layout/Header.tsx']=('100644','blob','c'*40)
elif case=='data_modified':entries['lib/statistical-levels/generated-provenance.json']=('100644','blob','c'*40)
elif case=='policy_modified':entries['scripts/statistical-levels-release/policy.json']=('100644','blob','c'*40)
elif case=='extra_file':entries['scripts/statistical-levels-release/unreviewed.mjs']=('100644','blob','d'*40)
elif case=='mode_changed':entries['.github/workflows/ci.yml']=('100755','blob',entries['.github/workflows/ci.yml'][2])
elif case=='missing_diagnostic_change':
    p='scripts/statistical-levels-release/scripts/invoke.mjs';entries[p]=tuple(git('ls-tree',anchor,'--',p).split(b'\t')[0].decode().split())
def observed_git(*args):
    if args==('ls-tree','-rz',head):
        return b''.join((' '.join(v)+'\t'+p+'\0').encode()for p,v in sorted(entries.items()))
    if case=='anchor_object_changed' and args==('cat-file','commit',anchor):return git(*args)+b'changed'
    return git(*args)
def command(args,**kwargs):
    if args==['git','merge-base','--is-ancestor',anchor,head]:
        if case=='missing_ancestry':raise subprocess.CalledProcessError(1,args)
        return subprocess.CompletedProcess(args,0)
    return real_run(args,**kwargs)
namespace={'git':observed_git,'hashlib':hashlib,'os':os,'subprocess':subprocess}
exec(compile(payload['guard'],'actual-oidc-ci-admission','exec'),namespace)
try:
    with patch.dict(os.environ,{'SL_LOCAL_QUALIFICATION_SUBJECT_SHA256':'a'*64 if case=='local_impersonation' else ''}),patch('subprocess.run',command):
        result=namespace['verify_g5_execution'](head,parents)
    print(json.dumps({'accepted':True,'result':result}))
except (AssertionError,subprocess.CalledProcessError) as error:
    print(json.dumps({'accepted':False,'error':str(error)}))
`;
const diagnosticErrors = Object.fromEntries(Object.entries(successorErrors).map(([k,v]) => [
  k === 'missing_oidc_change' ? 'missing_diagnostic_change' : k,
  v.replaceAll('G5_OIDC_', 'G5_DIAGNOSTIC_'),
]));
for (const name of ['valid', ...Object.keys(diagnosticErrors)]) test('G5 diagnostic successor preservation: ' + name, () => {
  const result = spawnSync('python3', ['-c', diagnosticHarness], {
    cwd: root, encoding: 'utf8', timeout: 60000, input: JSON.stringify({ case: name, guard }),
  });
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.accepted, name === 'valid', JSON.stringify(value));
  if (name === 'valid') {
    assert.equal(value.result.certification_parent, '60f1d6b4cb78809a42ae40f8e1a2259a0cafd9ae');
    assert.equal(value.result.source_files, 1469);
    assert.equal(value.result.certification_preserved_files, 1459);
    assert.equal(value.result.out_of_scope_removals, 0);
    assert.equal(value.result.out_of_scope_modifications, 0);
  } else assert.ok(value.error.includes(diagnosticErrors[name]), JSON.stringify(value));
});

const diagnosticCoverage = workflow.match(/^\s*# G5_DIAGNOSTIC_COVERAGE_BEGIN\n([\s\S]*?)^\s*# G5_DIAGNOSTIC_COVERAGE_END$/m);
assert.ok(diagnosticCoverage);
const diagnosticCoverageHarness = String.raw`
import ast,json,re,sys,textwrap
v=json.load(sys.stdin);source=textwrap.dedent(v['source']);tree=ast.parse(source)
required=ast.literal_eval(next(n.value for n in tree.body if isinstance(n,ast.Assign)))
lines=['ok '+str(i+1)+' - '+name for i,name in enumerate(required)]
if v['case']=='missing':lines.pop(0)
elif v['case']=='duplicate':lines.append(lines[0])
elif v['case']=='skipped':lines[0]+=' # SKIP'
ns={'text':'\n'.join(lines),'re':re}
try:exec(compile(source,'actual-diagnostic-ci-coverage','exec'),ns);print(json.dumps({'accepted':True}))
except AssertionError as error:print(json.dumps({'accepted':False,'error':str(error)}))
`;
for (const name of ['valid','missing','duplicate','skipped']) test('G5 diagnostic mandatory coverage: '+name,()=>{
 const r=spawnSync('python3',['-c',diagnosticCoverageHarness],{encoding:'utf8',timeout:10000,input:JSON.stringify({case:name,source:diagnosticCoverage[1]})});
 assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.accepted,name==='valid');
 if(name!=='valid')assert.equal(v.error,'G5_DIAGNOSTIC_CASE_NOT_EXECUTED');
});
