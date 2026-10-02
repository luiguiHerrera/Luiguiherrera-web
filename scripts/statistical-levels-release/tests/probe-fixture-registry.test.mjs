import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { P, sha } from '../scripts/release-core.mjs';
import { selectProbeTarget } from '../scripts/probe-core.mjs';
import { resolveProbeDeployment } from '../scripts/probe-runtime.mjs';
import { validateRegisteredProbeFixture, readRegisteredProbeFixture, requireRegisteredProbeTarget,
  requireRegisteredProbeResolution } from '../scripts/probe-fixture-registry.mjs';

const fixture = JSON.parse(await fs.readFile(new URL('../probe-fixture.json', import.meta.url), 'utf8'));
const inputs = { operation: 'PROBE_IDENTITY', probe_git_sha: fixture.git_sha, probe_deployment_id: fixture.deployment_id };
const target = selectProbeTarget(inputs);
const creator = { login: P.vercel_creator_login, id: P.vercel_creator_id };
const at = '2026-09-08T15:42:45Z';

function metadata(origin = fixture.origin) {
  return {
    deployments: [{ id: 101, creator, sha: fixture.git_sha, environment: 'Preview', production_environment: false,
      url: `https://api.github.com/repos/${P.repository}/deployments/101`, created_at: at, updated_at: at }],
    commits: [{ id: 303, creator, context: 'Vercel', target_url: P.vercel_details_base_url + fixture.deployment_id.slice(4), state: 'success', created_at: at, updated_at: at,
      url: `https://api.github.com/repos/${P.repository}/statuses/${fixture.git_sha}` }],
    statuses: [{ id: 202, creator, state: 'success', environment: 'Preview', created_at: at, updated_at: at,
      url: `https://api.github.com/repos/${P.repository}/deployments/101/statuses/202`,
      deployment_url: `https://api.github.com/repos/${P.repository}/deployments/101`,
      environment_url: origin, target_url: origin, log_url: origin }],
  };
}

function mockMetadata(t, data) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const u = new URL(url);calls.push(u.pathname + u.search);
    assert.equal(u.origin, 'https://api.github.com');
    assert.equal(options.method, 'GET');assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.keys(options.headers).sort(), ['Accept', 'X-GitHub-Api-Version']);
    const value = u.pathname.endsWith('/deployments') ? data.deployments :
      u.pathname.endsWith('/deployments/101/statuses') ? data.statuses :
        u.pathname.endsWith('/commits/' + fixture.git_sha + '/statuses') ? data.commits : null;
    assert.notEqual(value, null, 'Unexpected public metadata path');
    return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return calls;
}

test('registry is the exact approved five-field non-secret Preview declaration', async () => {
  assert.deepEqual(await readRegisteredProbeFixture(), {
    deployment_id: 'dpl_6wA7tYMv6yNhoMQJDXN3S9JXWw9J', git_sha: 'c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1',
    origin: 'https://luiguiherrera-7vs8qeq5j-luigui-herrera-s-projects.vercel.app', project: 'luiguiherrera-web', environment: 'Preview',
  });
  assert.deepEqual(requireRegisteredProbeTarget(target, fixture), fixture);
});

test('registry bytes participate in both existing source-manifest and SOURCE_SHA256SUMS', async () => {
  const bytes = await fs.readFile(new URL('../probe-fixture.json', import.meta.url));
  const manifest = JSON.parse(await fs.readFile(new URL('../source-manifest.json', import.meta.url), 'utf8'));
  const sums = await fs.readFile(new URL('../SOURCE_SHA256SUMS', import.meta.url), 'utf8');
  assert.equal(manifest['probe-fixture.json'], sha(bytes));
  assert.equal(sums.split('\n').filter(line => line === sha(bytes) + '  probe-fixture.json').length, 1);
});

test('a syntactically valid unregistered deployment fails before any public request', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Unregistered deployment reached transport'));
  await assert.rejects(resolveProbeDeployment({ ...target, deployment_id: 'dpl_Unregistered12345' }), /PROBE_UNREGISTERED_DEPLOYMENT/);
});

test('a syntactically valid unregistered commit fails before any public request', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Unregistered commit reached transport'));
  await assert.rejects(resolveProbeDeployment({ ...target, candidate_git_sha: 'a'.repeat(40) }), /PROBE_UNREGISTERED_GIT_SHA/);
});

test('the superseded historical fixture is rejected without a fallback or public request', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Historical fixture reached transport'));
  const historical = { ...target, candidate_git_sha: '4ee6adb006f360fea13837db5f7d45815f297b55',
    deployment_id: 'dpl_8iA33DzPN63dNoD9Hk6puJjc5XwH' };
  assert.throws(() => requireRegisteredProbeTarget(historical, fixture), /PROBE_UNREGISTERED_GIT_SHA/);
  await assert.rejects(resolveProbeDeployment(historical), /PROBE_UNREGISTERED_GIT_SHA/);
  await assert.rejects(resolveProbeDeployment({ ...target, deployment_id: historical.deployment_id }), /PROBE_UNREGISTERED_DEPLOYMENT/);
});

test('caller origin and latest selectors are rejected before transport', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Caller URL reached transport'));
  for (const key of ['origin', 'url', 'latest', 'project', 'environment']) {
    assert.throws(() => selectProbeTarget({ ...inputs, [key]: 'https://other.invalid' }), /PROBE_INPUT_FIELDS/);
    await assert.rejects(resolveProbeDeployment({ ...target, [key]: 'https://other.invalid' }), /PROBE_UNRESOLVED_TARGET/);
  }
});

test('wrong registered-project declaration is rejected', () => {
  assert.throws(() => validateRegisteredProbeFixture({ ...fixture, project: 'another-project' }), /PROBE_FIXTURE_REGISTRY_PROJECT/);
});

test('Production substitution is rejected by registry and operation gates', () => {
  assert.throws(() => validateRegisteredProbeFixture({ ...fixture, environment: 'Production' }), /PROBE_FIXTURE_REGISTRY_ENVIRONMENT/);
  assert.throws(() => requireRegisteredProbeTarget({ ...target, phase: 'production' }, fixture), /PROBE_FIXTURE_REGISTRY_OPERATION/);
  assert.throws(() => requireRegisteredProbeTarget({ ...target, operation: 'ADOPT_EXISTING_PRODUCTION_BASELINE' }, fixture), /PROBE_FIXTURE_REGISTRY_OPERATION/);
});

test('registry excludes public Production, foreign project, credentials, query and fragment origins', () => {
  for (const origin of [P.production_origin, 'https://other-project.vercel.app', 'http://example.invalid',
    fixture.origin + '?token=synthetic', fixture.origin + '#value', fixture.origin.replace('https://', 'https://user:synthetic@')])
    assert.throws(() => validateRegisteredProbeFixture({ ...fixture, origin }));
});

test('unexpected manifest fields and getters cannot supply a fixture', () => {
  assert.throws(() => validateRegisteredProbeFixture({ ...fixture, latest: true }), /PROBE_FIXTURE_REGISTRY_FIELDS/);
  let getterCalls = 0;
  const hostile = { ...fixture };
  Object.defineProperty(hostile, 'origin', { enumerable: true, get() { getterCalls++; return fixture.origin; } });
  assert.throws(() => validateRegisteredProbeFixture(hostile), /PROBE_FIXTURE_REGISTRY_VALUES/);
  assert.equal(getterCalls, 0);
});

test('even a same-project Preview origin must equal the exact registered origin', () => {
  assert.throws(() => requireRegisteredProbeResolution({ ...target,
    origin: 'https://luiguiherrera-other-luigui-herrera-s-projects.vercel.app' }, fixture), /PROBE_UNREGISTERED_ORIGIN/);
});

test('registered fixture still requires live exact Vercel-bot metadata before resolution', async t => {
  const calls = mockMetadata(t, metadata());
  const resolved = await resolveProbeDeployment(target);
  assert.equal(requireRegisteredProbeResolution(resolved, fixture), resolved);
  assert.equal(resolved.origin, fixture.origin);assert.equal(resolved.deployment_id, fixture.deployment_id);
  assert.equal(resolved.candidate_git_sha, fixture.git_sha);assert.equal(resolved.github_deployment_id, 101);
  assert.equal(resolved.status_id, 202);assert.equal(resolved.commit_status_id, 303);
  assert.match(resolved.status_sha256, /^[a-f0-9]{64}$/);assert.match(resolved.commit_status_sha256, /^[a-f0-9]{64}$/);
  assert.equal(calls.length, 3);
});

test('live same-project different origin is rejected despite matching bot status records', async t => {
  mockMetadata(t, metadata('https://luiguiherrera-other-luigui-herrera-s-projects.vercel.app'));
  await assert.rejects(resolveProbeDeployment(target), /PROBE_UNREGISTERED_ORIGIN/);
});

test('registration never revives a deployment whose latest live status is inactive', async t => {
  const data = metadata();data.statuses.push({ ...data.statuses[0], id: 203, url: `https://api.github.com/repos/${P.repository}/deployments/101/statuses/203`, state: 'inactive' });
  mockMetadata(t, data);
  await assert.rejects(resolveProbeDeployment(target), /PROBE_PREVIEW_METADATA_AMBIGUOUS/);
});

test('registration never substitutes a Production deployment of the registered commit', async t => {
  const data = metadata();data.deployments[0].environment = 'Production';data.deployments[0].production_environment = true;
  mockMetadata(t, data);
  await assert.rejects(resolveProbeDeployment(target), /PROBE_PREVIEW_METADATA_AMBIGUOUS/);
});

test('registration never replaces the exact Vercel deployment ID with latest commit status', async t => {
  const data = metadata();data.commits[0].target_url = P.vercel_details_base_url + 'AnotherDeployment123';
  mockMetadata(t, data);
  await assert.rejects(resolveProbeDeployment(target), /PROBE_VERCEL_ID_BINDING/);
});

test('registration preserves bot identity and project scope rejection', async t => {
  const data = metadata();data.commits[0] = { ...data.commits[0], creator: { ...creator, id: creator.id + 1 } };
  mockMetadata(t, data);
  await assert.rejects(resolveProbeDeployment(target), /PROBE_VERCEL_ID_BINDING/);
});

test('registered runtime accepts independent publication times through exact origin gate', async t => {
  const data = metadata();
  data.deployments[0].created_at = data.deployments[0].updated_at = '2026-09-28T22:33:37Z';
  data.commits[0].created_at = data.commits[0].updated_at = '2026-09-28T22:33:36Z';
  data.statuses[0].created_at = data.statuses[0].updated_at = '2026-09-28T22:33:37Z';
  const calls = mockMetadata(t, data);
  const resolved = await resolveProbeDeployment(target);
  assert.equal(resolved.origin, 'https://luiguiherrera-7vs8qeq5j-luigui-herrera-s-projects.vercel.app');
  assert.equal(resolved.candidate_git_sha, 'c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1');
  assert.equal(resolved.deployment_id, 'dpl_6wA7tYMv6yNhoMQJDXN3S9JXWw9J');
  assert.equal(calls.length, 3);
});

// Execute the workflow's Python, not a duplicate lineage implementation. Git responses
// model an uncommitted future child; all predecessor/product blobs come from real Git.
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const ciText = await fs.readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const ciPython = [...ciText.matchAll(/^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$/gm)]
  .map(match => match[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n'));
assert.equal(ciPython.length, 3, 'Expected actual binding, integrity and accounting programs');
const historicalCI = spawnSync('git', ['show', 'f7e3fe8e3e3cd8bdea753873c31d78f146cdc923:.github/workflows/ci.yml'],
  { cwd: repositoryRoot, encoding: 'utf8' });
assert.equal(historicalCI.status, 0, historicalCI.stderr);
const historicalPython = [...historicalCI.stdout.matchAll(/^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$/gm)]
  .map(match => match[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n'));
assert.equal(historicalPython.length, 3);
// Historical guard regressions use the immutable implementation they qualified.
// The current successor guard is exercised separately below with live candidate inputs.
const metadataCI=spawnSync('git',['show','d290691156b933ba62e5e8f6489dc870568126e0:.github/workflows/ci.yml'],{cwd:repositoryRoot,encoding:'utf8'});
assert.equal(metadataCI.status,0,metadataCI.stderr);
const metadataPython=[...metadataCI.stdout.matchAll(/^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$/gm)].map(m=>m[1].split('\n').map(l=>l.replace(/^ {10}/,'')).join('\n'));
const successorModel = String.raw`
import json,sys,os,hashlib,subprocess,tempfile,contextlib,io
from pathlib import Path
from unittest.mock import patch
payload=json.load(sys.stdin); case=payload['case']; root=Path.cwd(); repair=payload.get('repair',False)
R='c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1'; M='e7872b9c0e5bb0be3e090fbe2c5b930d68dcbece'
C='0c8fce262fce44650729883862ec948778ebea45'; P='c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f'; E='f'*40
B='f7e3fe8e3e3cd8bdea753873c31d78f146cdc923'; direct=B if repair else R
original_output=subprocess.check_output; original_run=subprocess.run
original_bytes=Path.read_bytes; original_text=Path.read_text; original_glob=Path.glob
def historical_glob(path,pattern):
    if path==root/'scripts/statistical-levels-release/tests' and pattern=='*.test.mjs':
        return iter(root/p for p in original_output(['git','ls-tree','-r','--name-only','d290691156b933ba62e5e8f6489dc870568126e0','--','scripts/statistical-levels-release/tests']).decode().splitlines() if p.endswith('.test.mjs'))
    return original_glob(path,pattern)
allowed=['.github/workflows/ci.yml','.github/workflows/statistical-levels-release.yml',
'scripts/statistical-levels-release/probe-fixture.json',
'scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs',
'scripts/statistical-levels-release/source-manifest.json',
'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
'scripts/statistical-levels-release/workflow-freeze.json']
if repair:
    allowed.remove('scripts/statistical-levels-release/probe-fixture.json')
    allowed.extend(['scripts/statistical-levels-release/scripts/probe-core.mjs','scripts/statistical-levels-release/tests/probe-core.test.mjs'])
    allowed.extend(['scripts/statistical-levels-release/tests/probe-qa-http.test.mjs', 'scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs'])
assert original_output(['git','show','-s','--format=%P',B]).decode().strip()==R
assert original_output(['git','show','-s','--format=%P',R]).decode().strip()==M
assert original_output(['git','show','-s','--format=%P',M]).decode().strip().split()==[C,P]
for ancestor in [M,C,P]: original_run(['git','merge-base','--is-ancestor',ancestor,R],check=True)
historical_inputs=json.loads(original_output(['git','show',R+':scripts/statistical-levels-release/source-inputs.json']))
ancestry=[]
def output(args,**kwargs):
    if args==['git','rev-parse','HEAD']: value=E.encode()+b'\n'
    elif args==['git','show','-s','--format=%P','HEAD']:
        parents={'unrelated':['a'*40],'sibling':[R if repair else M],'stale':[C],'grandchild':['b'*40],'multiple_parents':[direct,M]}.get(case,[direct])
        value=(' '.join(parents)+'\n').encode()
    elif args==['git','show','-s','--format=%P',B]: value=((M if case=='wrong_repair_parent_parent' else R)+'\n').encode()
    elif args==['git','show','-s','--format=%P',R]: value=((C if case=='wrong_predecessor_parent' else M)+'\n').encode()
    elif args==['git','show','-s','--format=%P',M]: value=(' '.join([P,C] if case=='reversed_anchor' else [C,P])+'\n').encode()
    elif args==['git','diff','--raw','--no-abbrev','--no-renames','-z',direct,'HEAD','--']:
        names=allowed+(['unreviewed.txt'] if case=='unreviewed_path' else [])
        if case=='missing_delta': names=names[:-1]
        if case=='missing_probe_qa_path': names=[n for n in names if n!='scripts/statistical-levels-release/tests/probe-qa-http.test.mjs']
        if case=='missing_product_qa_path': names=[n for n in names if n!='scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs']
        if case=='duplicate_probe_qa_path': names=names+['scripts/statistical-levels-release/tests/probe-qa-http.test.mjs']
        if case=='duplicate_product_qa_path': names=names+['scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs']
        value=b''.join((':100644 '+('100755' if case=='changed_mode' else '100644')+' '+'a'*40+' '+'b'*40+' M\0'+name+'\0').encode() for name in names)
    elif args==['git','show',B+':components/layout/Footer.tsx'] and case=='wrong_repair_input': value=b'incorrect repair parent bytes'
    elif args==['git','show',R+':components/layout/Footer.tsx'] and case=='wrong_preview_input': value=b'incorrect Preview bytes'
    else: return original_output(args,**kwargs)
    return value.decode() if kwargs.get('text') else value

def run(args,**kwargs):
    if args==['git','diff','--raw','--no-abbrev','--no-renames','-z','cb63f82d7e2e7cd9f6283f26d8bdb120da8c174c','9b860095e7f18c26393af1e028244c1bae9c1598','--']:return run(args,**kwargs)
    if args[:2] in [['git','show'],['git','ls-files']]: return original_run(args,**kwargs)
    if args[:3]==['git','diff','--exit-code']:
        if case=='dirty': raise subprocess.CalledProcessError(1,args)
        return subprocess.CompletedProcess(args,0)
    if args[:3]==['git','merge-base','--is-ancestor']:
        assert args[3] in ([B,R,M,C,P] if repair else [R,M,C,P]) and args[4]==E
        ancestry.append(args[3])
        if case=='missing_ancestry' and args[3]==P: raise subprocess.CalledProcessError(1,args)
        return subprocess.CompletedProcess(args,0)
    raise AssertionError('Unexpected command '+repr(args))

def read_bytes(path):
    value=original_bytes(path)
    name=str(path.relative_to(root)) if path.is_relative_to(root) else ''
    if name=='scripts/statistical-levels-release/source-inputs.json' or name in historical_inputs:
        value=original_output(['git','show',R+':'+name])
    if name=='scripts/statistical-levels-release/probe-fixture.json':
        data=json.loads(value)
        if case=='wrong_registration': data['git_sha']='a'*40
        if case=='extra_registration_field': data['latest']=True
        if case=='wrong_origin': data['origin']='https://wrong.vercel.app'
        if case=='duplicate_registration_key': return value.rstrip()[:-1]+b',"project":"luiguiherrera-web"}'
        if case in ['wrong_registration','extra_registration_field','wrong_origin']: value=json.dumps(data).encode()
        if case=='registration_byte_drift': value+=b' '
    if name=='scripts/statistical-levels-release/source-inputs.json' and case=='wrong_input_inventory': value+=b' '
    if name=='components/layout/Footer.tsx' and case=='wrong_product_input': value+=b'changed'
    return value

with tempfile.TemporaryDirectory(prefix='sl-successor-guard-') as directory:
    env={'CI_EVENT_SHA':'refs/heads/vercel-deployment' if case=='mutable_ref' else E,
         'GITHUB_SHA':'a'*40 if case=='wrong_sha' else E,'GITHUB_EVENT_NAME':'pull_request' if case=='pr_nonqualification' else 'push',
         'GITHUB_REF':'refs/pull/1/merge' if case=='pr_nonqualification' else 'refs/heads/vercel-deployment',
         'GITHUB_RUN_ID':'123','GITHUB_RUN_ATTEMPT':'1','CI_EVIDENCE':directory}
    try:
        with patch.dict(os.environ,env),patch('subprocess.check_output',output),patch('subprocess.run',run),patch.object(Path,'read_bytes',read_bytes),patch.object(Path,'glob',historical_glob),contextlib.redirect_stdout(io.StringIO()):
            exec(compile(payload['guard'],'actual-ci-guard','exec'),{})
        subject=json.loads((Path(directory)/'subject.json').read_text())
        if case=='pr_nonqualification':
            assert not subject['integration_push'] and not subject['lineage']['registration_successor_parent_verified']
            assert not subject['lineage']['registration_content_verified'] and ancestry==[]
        else:
            if repair:
                assert subject['lineage']['repair_parent_sha']==B and subject['lineage']['repair_parent_parents']==[R]
                assert subject['lineage']['metadata_repair_parent_verified']
            assert subject['parents']==[direct] and subject['lineage']['qualified_predecessor_parents']==[M]
            assert subject['lineage']['merge_anchor_parents']==[C,P] and ancestry==([B,R,M,C,P] if repair else [R,M,C,P])
        if case in ['stale_run','stale_attempt','cross_run_subject','wrong_subject_sha']:
            subject['head_sha' if case=='wrong_subject_sha' else 'run_id' if case in ['stale_run','cross_run_subject'] else 'run_attempt']='999'
            (Path(directory)/'subject.json').write_text(json.dumps(subject))
            tail=payload['summary'][payload['summary'].index("subject=json.loads"):]
            with patch.dict(os.environ,env),patch('subprocess.check_output',output),patch.object(Path,'read_bytes',read_bytes),patch.object(Path,'glob',historical_glob),contextlib.redirect_stdout(io.StringIO()):
                exec(compile(tail,'actual-ci-summary','exec'),{'out':Path(directory),'root':root,'summary':{},'after':{},'json':json,'os':os,'subprocess':subprocess,'hashlib':hashlib})
        if case.startswith('coverage_'):
            for suite,count in [('release',1964),('reports',31),('product',68)]:
                names=payload['mandatory'] if suite=='release' else ['real adapter failure injection: '+x for x in ['identity','storage','partial','collision','readback','manifest','provenance','validation']] if suite=='product' else []
                names=list(names)
                if case=='coverage_missing_repair' and suite=='release': names.remove('timestamp repair: exact registered Preview pending-to-success history')
                if case=='coverage_missing_probe_preservation' and suite=='release': names.remove('probe QA preservation: narrow predecessor security pins')
                if case=='coverage_missing_product_preservation' and suite=='release': names.remove('product QA preservation: narrow predecessor security pins')
                if case=='coverage_duplicate_probe_preservation' and suite=='release': names.append('probe QA preservation: rejects metadata_resolveProbePreview_call')
                if case=='coverage_duplicate_product_preservation' and suite=='release': names.append('product QA preservation: rejects metadata_resolveProbePreview_call')
                if case=='coverage_missing_historical' and suite=='release': names.remove('governed successor: valid')
                if case=='coverage_missing_storage' and suite=='product': names.remove('real adapter failure injection: storage')
                if case=='coverage_duplicate_repair' and suite=='release': names.append('timestamp repair: exact registered Preview pending-to-success history')
                if case=='coverage_low_count' and suite=='release': count=1963
                names += ['synthetic coverage padding '+str(i) for i in range(count-len(names))]
                rows=['ok '+str(i+1)+' - '+name for i,name in enumerate(names)]
                skipped=1 if case=='coverage_skipped_release' and suite=='release' else 0
                failed=1 if case=='coverage_failed_release' and suite=='release' else 0
                if skipped: rows[-1]+=' # SKIP'
                if failed: rows[-1]=rows[-1].replace('ok ','not ok ',1)
                (Path(directory)/(suite+'.tap')).write_text('\n'.join(rows)+f'\n# tests {count}\n# pass {count-skipped-failed}\n# fail {failed}\n# cancelled 0\n# skipped {skipped}\n# todo 0\n')
            if case=='coverage_drift':
                before=json.loads((Path(directory)/'before.json').read_text()); before['.github/workflows/ci.yml']['sha256']='0'*64
                (Path(directory)/'before.json').write_text(json.dumps(before))
            if case=='coverage_wrong_event': subject['event']='workflow_dispatch'
            if case=='coverage_wrong_class': subject['integration_push']=False
            (Path(directory)/'subject.json').write_text(json.dumps(subject))
            with patch.dict(os.environ,env),patch('subprocess.check_output',output),patch.object(Path,'read_bytes',read_bytes),patch.object(Path,'glob',historical_glob),contextlib.redirect_stdout(io.StringIO()):
                exec(compile(payload['summary'],'actual-ci-summary','exec'),{})
            summary=json.loads((Path(directory)/'qualification-summary.json').read_text())
            assert summary['covered_obligations']==['C%02d'%i for i in range(1,14)]
            assert summary['integration_qualification_complete'] and summary['governed_metadata_repair_parent_verified']
        if case in ['qualified_integrity','wrong_sums','wrong_workflow']:

            # Use the qualified predecessor's stored bytes, without rebuilding or
            # writing any derived artifact; tamper only at the read boundary.
            def predecessor_bytes(path):
                name=str(path.relative_to(root))
                value=original_output(['git','show',direct+':'+name])
                if case=='wrong_sums' and name.endswith('/SOURCE_SHA256SUMS'): value+=b'invalid checksum\n'
                if case=='wrong_workflow' and name=='.github/workflows/statistical-levels-release.yml': value+=b'# invalid workflow identity\n'
                return value
            def predecessor_text(path,*args,**kwargs): return predecessor_bytes(path).decode()
            def predecessor_inventory(args,**kwargs):
                if args==['git','ls-files','-z','scripts/statistical-levels-release/']:
                    # Inventory and bytes have the same immutable historical owner.
                    inventory=original_output(['git','ls-tree','-r','--name-only','-z',direct,'--','scripts/statistical-levels-release/'])
                    names=inventory.decode().rstrip('\0').split('\0')
                    historical_count=len(names)-3
                    assert historical_count==94, 'HISTORICAL_BUNDLE_COUNT'
                    return inventory
                return original_output(args,**kwargs)
            with patch('subprocess.check_output',predecessor_inventory),patch.object(Path,'read_bytes',predecessor_bytes),patch.object(Path,'read_text',predecessor_text),contextlib.redirect_stdout(io.StringIO()):
                exec(compile(payload['integrity'],'actual-ci-integrity','exec'),{})
        print(json.dumps({'accepted':True}))
    except (AssertionError,subprocess.CalledProcessError) as error:
        import traceback
        print(json.dumps({'accepted':False,'error':str(error),'model_trace':traceback.format_tb(error.__traceback__)}))
`;

const successorCases = {
  valid: null,
  unrelated: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  sibling: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  stale: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  grandchild: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  multiple_parents: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  wrong_predecessor_parent: 'WRONG_QUALIFIED_PREDECESSOR_PARENT',
  reversed_anchor: 'WRONG_ORDERED_ANCHOR_PARENTS',
  missing_ancestry: 'returned non-zero exit status',
  wrong_sha: 'WRONG_TESTED_SHA',
  mutable_ref: 'EVENT_SHA_NOT_IMMUTABLE',
  wrong_registration: 'WRONG_SUCCESSOR_REGISTRATION',
  extra_registration_field: 'WRONG_SUCCESSOR_REGISTRATION',
  wrong_origin: 'WRONG_SUCCESSOR_REGISTRATION',
  duplicate_registration_key: 'DUPLICATE_SUCCESSOR_JSON_KEY',
  wrong_input_inventory: 'SUCCESSOR_INPUT_INVENTORY_CHANGED',
  wrong_product_input: 'SUCCESSOR_PRODUCT_INPUT_CHANGED',
  wrong_preview_input: 'REGISTERED_PREVIEW_INPUT_MISMATCH',
  unreviewed_path: 'SUCCESSOR_CONTENT_SCOPE',
  changed_mode: 'SUCCESSOR_FILE_MODE_OR_STATUS',
  missing_delta: 'SUCCESSOR_CONTENT_SCOPE',
  dirty: 'returned non-zero exit status',
  pr_nonqualification: null,
  stale_run: 'CROSS_RUN_SUBJECT',
  stale_attempt: 'CROSS_RUN_SUBJECT',
  wrong_sums: 'SOURCE_SUMS',
  wrong_workflow: 'FREEZE_PARITY',
};

// Approval of arbitrary bytes within the permitted files is deliberately NOT
// inferred here: independent review and exact reviewed-tree/commit parity are
// separate mandatory integration gates. The path negative tests only that boundary.
test('governed successor: identity', () => {
  assert.deepEqual(validateRegisteredProbeFixture(fixture), {
    deployment_id: 'dpl_6wA7tYMv6yNhoMQJDXN3S9JXWw9J',
    git_sha: 'c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1',
    origin: 'https://luiguiherrera-7vs8qeq5j-luigui-herrera-s-projects.vercel.app',
    project: 'luiguiherrera-web', environment: 'Preview',
  });
  assert.deepEqual(requireRegisteredProbeTarget(target, fixture), fixture);
  assert.throws(() => requireRegisteredProbeTarget({ ...target,
    candidate_git_sha: 'd12c6575adcd4786e11aa1c6ea787df1cb231fed' }, fixture), /PROBE_UNREGISTERED_GIT_SHA/);
});

for (const [name, expectedError] of Object.entries(successorCases)) {
  test('governed successor: ' + name, () => {
    const result = spawnSync('python3', ['-c', successorModel], {
      cwd: repositoryRoot, encoding: 'utf8', timeout: 60000,
      input: JSON.stringify({ case: name, guard: historicalPython[0], integrity: historicalPython[1], summary: historicalPython[2] }),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const output = JSON.parse(result.stdout);
    assert.equal(output.accepted, expectedError === null, JSON.stringify(output));
    if (expectedError !== null) assert.ok(output.error.includes(expectedError), JSON.stringify(output));
  });
}

const repairCases = {
  ...successorCases,
  ...Object.fromEntries(['unrelated', 'sibling', 'stale', 'grandchild', 'multiple_parents']
    .map(name => [name, 'WRONG_METADATA_REPAIR_PARENT'])),
  wrong_repair_parent_parent: 'WRONG_REGISTRATION_SUCCESSOR_PARENT',
  registration_byte_drift: 'REPAIR_REGISTRATION_BYTES_CHANGED',
  wrong_repair_input: 'REPAIR_PARENT_INPUT_MISMATCH',
  cross_run_subject: 'CROSS_RUN_SUBJECT',
  wrong_subject_sha: 'WRONG_SUBJECT_SHA',
  missing_probe_qa_path: 'SUCCESSOR_CONTENT_SCOPE',
  missing_product_qa_path: 'SUCCESSOR_CONTENT_SCOPE',
  duplicate_probe_qa_path: 'SUCCESSOR_CONTENT_SCOPE',
  duplicate_product_qa_path: 'SUCCESSOR_CONTENT_SCOPE',
};
for (const [name, expectedError] of Object.entries(repairCases)) {
  test('governed metadata repair: ' + name, () => {
    const result = spawnSync('python3', ['-c', successorModel], {
      cwd: repositoryRoot, encoding: 'utf8', timeout: 60000,
      input: JSON.stringify({ case: name, repair: true, guard: metadataPython[0], integrity: metadataPython[1], summary: metadataPython[2] }),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const output = JSON.parse(result.stdout);
    assert.equal(output.accepted, expectedError === null, JSON.stringify(output));
    if (expectedError !== null) assert.ok(output.error.includes(expectedError), JSON.stringify(output));
  });
}

// Synthetic completed-run logs exercise the real accounting gate, not hosted CI.
const accountingCases = {
  coverage_valid: null,
  coverage_missing_probe_preservation: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_missing_product_preservation: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_duplicate_probe_preservation: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_duplicate_product_preservation: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_missing_repair: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_missing_historical: 'SUCCESSOR_GUARD_CASE_NOT_EXECUTED',
  coverage_missing_storage: 'STORAGE_CASE_NOT_EXECUTED',
  coverage_duplicate_repair: 'METADATA_REPAIR_CASE_NOT_EXECUTED',
  coverage_low_count: 'release',
  coverage_skipped_release: 'release',
  coverage_failed_release: 'release',
  coverage_drift: 'GOVERNED_BYTES_CHANGED',
  coverage_wrong_event: 'WRONG_SUBJECT_EVENT',
  coverage_wrong_class: 'WRONG_INTEGRATION_CLASS',
  qualified_integrity: null,
};
// Fixed mandatory case inventory is independently asserted against executed TAP.
const mandatoryCases = [
  "timestamp repair: exact registered Preview pending-to-success history",
  "timestamp repair: exact equality",
  "timestamp repair: equivalent represented instant",
  "timestamp repair: commit publication first",
  "timestamp repair: deployment status publication first",
  "timestamp repair: no maximum propagation window",
  "timestamp repair: old record update does not reorder status creation history",
  "timestamp repair rejects deployment created_at missing",
  "timestamp repair rejects deployment created_at UNKNOWN",
  "timestamp repair rejects deployment created_at invalid calendar date",
  "timestamp repair rejects deployment created_at invalid leap day",
  "timestamp repair rejects deployment created_at invalid format",
  "timestamp repair rejects deployment created_at numeric",
  "timestamp repair rejects deployment updated_at missing",
  "timestamp repair rejects deployment updated_at UNKNOWN",
  "timestamp repair rejects deployment updated_at invalid calendar date",
  "timestamp repair rejects deployment updated_at invalid leap day",
  "timestamp repair rejects deployment updated_at invalid format",
  "timestamp repair rejects deployment updated_at numeric",
  "timestamp repair rejects update before creation: deployment",
  "timestamp repair rejects commit created_at missing",
  "timestamp repair rejects commit created_at UNKNOWN",
  "timestamp repair rejects commit created_at invalid calendar date",
  "timestamp repair rejects commit created_at invalid leap day",
  "timestamp repair rejects commit created_at invalid format",
  "timestamp repair rejects commit created_at numeric",
  "timestamp repair rejects commit updated_at missing",
  "timestamp repair rejects commit updated_at UNKNOWN",
  "timestamp repair rejects commit updated_at invalid calendar date",
  "timestamp repair rejects commit updated_at invalid leap day",
  "timestamp repair rejects commit updated_at invalid format",
  "timestamp repair rejects commit updated_at numeric",
  "timestamp repair rejects update before creation: commit",
  "timestamp repair rejects status created_at missing",
  "timestamp repair rejects status created_at UNKNOWN",
  "timestamp repair rejects status created_at invalid calendar date",
  "timestamp repair rejects status created_at invalid leap day",
  "timestamp repair rejects status created_at invalid format",
  "timestamp repair rejects status created_at numeric",
  "timestamp repair rejects status updated_at missing",
  "timestamp repair rejects status updated_at UNKNOWN",
  "timestamp repair rejects status updated_at invalid calendar date",
  "timestamp repair rejects status updated_at invalid leap day",
  "timestamp repair rejects status updated_at invalid format",
  "timestamp repair rejects status updated_at numeric",
  "timestamp repair rejects update before creation: status",
  "timestamp repair rejects status creation before its deployment",
  "timestamp repair rejects inverted creation history: commit",
  "timestamp repair rejects inverted creation history: status",
  "timestamp repair rejects newer commit failure",
  "timestamp repair rejects newer status failure",
  "timestamp repair rejects newer commit error",
  "timestamp repair rejects newer status error",
  "timestamp repair rejects newer commit pending",
  "timestamp repair rejects newer status pending",
  "timestamp repair rejects newer commit inactive",
  "timestamp repair rejects newer status inactive",
  "timestamp repair rejects newer commit queued",
  "timestamp repair rejects newer status queued",
  "timestamp repair rejects newer commit in_progress",
  "timestamp repair rejects newer status in_progress",
  "timestamp repair rejects newer commit UNKNOWN",
  "timestamp repair rejects newer status UNKNOWN",
  "timestamp repair rejects newer untrusted exact-ID commit head",
  "timestamp repair rejects cross-commit record URL",
  "timestamp repair rejects cross-repository commit URL",
  "timestamp repair rejects cross-deployment object URL",
  "timestamp repair rejects cross-deployment status URL",
  "timestamp repair rejects cross-status record URL",
  "timestamp repair rejects missing commit link",
  "timestamp repair rejects missing deployment link",
  "timestamp repair rejects missing status link",
  "registered runtime accepts independent publication times through exact origin gate",
  "governed successor: identity",
  "governed successor: valid",
  "governed successor: unrelated",
  "governed successor: sibling",
  "governed successor: stale",
  "governed successor: grandchild",
  "governed successor: multiple_parents",
  "governed successor: wrong_predecessor_parent",
  "governed successor: reversed_anchor",
  "governed successor: missing_ancestry",
  "governed successor: wrong_sha",
  "governed successor: mutable_ref",
  "governed successor: wrong_registration",
  "governed successor: extra_registration_field",
  "governed successor: wrong_origin",
  "governed successor: duplicate_registration_key",
  "governed successor: wrong_input_inventory",
  "governed successor: wrong_product_input",
  "governed successor: wrong_preview_input",
  "governed successor: unreviewed_path",
  "governed successor: changed_mode",
  "governed successor: missing_delta",
  "governed successor: dirty",
  "governed successor: pr_nonqualification",
  "governed successor: stale_run",
  "governed successor: stale_attempt",
  "governed successor: wrong_sums",
  "governed successor: wrong_workflow",
  "governed metadata repair: valid",
  "governed metadata repair: unrelated",
  "governed metadata repair: sibling",
  "governed metadata repair: stale",
  "governed metadata repair: grandchild",
  "governed metadata repair: multiple_parents",
  "governed metadata repair: wrong_predecessor_parent",
  "governed metadata repair: reversed_anchor",
  "governed metadata repair: missing_ancestry",
  "governed metadata repair: wrong_sha",
  "governed metadata repair: mutable_ref",
  "governed metadata repair: wrong_registration",
  "governed metadata repair: extra_registration_field",
  "governed metadata repair: wrong_origin",
  "governed metadata repair: duplicate_registration_key",
  "governed metadata repair: wrong_input_inventory",
  "governed metadata repair: wrong_product_input",
  "governed metadata repair: wrong_preview_input",
  "governed metadata repair: unreviewed_path",
  "governed metadata repair: changed_mode",
  "governed metadata repair: missing_delta",
  "governed metadata repair: dirty",
  "governed metadata repair: pr_nonqualification",
  "governed metadata repair: stale_run",
  "governed metadata repair: stale_attempt",
  "governed metadata repair: wrong_sums",
  "governed metadata repair: wrong_workflow",
  "governed metadata repair: wrong_repair_parent_parent",
  "governed metadata repair: registration_byte_drift",
  "governed metadata repair: wrong_repair_input",
  "governed metadata repair: cross_run_subject",
  "governed metadata repair: wrong_subject_sha",
  "22 PROBE cannot invoke controller; authorization source unchanged",
  "requalified production target policy pinned; PROBE authorization and controller exclusion unchanged",
  "probe QA preservation: narrow predecessor security pins",
  "probe QA preservation: exact authorized metadata regions",
  "probe QA preservation: semantic PROBE_ONLY",
  "probe QA preservation: semantic RELEASE_INPUTS",
  "probe QA preservation: semantic ADOPT_ISOLATION",
  "probe QA preservation: semantic PROMOTE_ISOLATION",
  "probe QA preservation: semantic POLICY_BINDING",
  "probe QA preservation: semantic ROLE_IDENTITY",
  "probe QA preservation: semantic ATTESTATION_CONTROLLER_EXCLUSION",
  "probe QA preservation: semantic WORKFLOW_CONTROLLER_EXCLUSION",
  "probe QA preservation: rejects controller_call",
  "probe QA preservation: rejects authorization_import",
  "probe QA preservation: rejects release_request",
  "probe QA preservation: rejects release_fields",
  "probe QA preservation: rejects policy_binding",
  "probe QA preservation: rejects role_identity",
  "probe QA preservation: rejects attestation_contract",
  "probe QA preservation: rejects adopt_isolation",
  "probe QA preservation: rejects promote_isolation",
  "probe QA preservation: rejects unapproved_region",
  "probe QA preservation: rejects timestamp_validation",
  "probe QA preservation: rejects timestamp_return",
  "probe QA preservation: rejects top_level_call",
  "probe QA preservation: rejects extra_import",
  "probe QA preservation: rejects extra_export",
  "probe QA preservation: rejects duplicate_declaration",
  "probe QA preservation: rejects missing_declaration",
  "probe QA preservation: rejects unknown_declaration",
  "probe QA preservation: rejects changed_export",
  "probe QA preservation: rejects malformed_ast",
  "probe QA preservation: rejects metadata_timestamp_call",
  "probe QA preservation: rejects metadata_recordTime_call",
  "probe QA preservation: rejects metadata_currentStatus_call",
  "probe QA preservation: rejects metadata_resolveProbePreview_call",
  "product QA preservation: narrow predecessor security pins",
  "product QA preservation: exact authorized metadata regions",
  "product QA preservation: semantic PROBE_ONLY",
  "product QA preservation: semantic RELEASE_INPUTS",
  "product QA preservation: semantic ADOPT_ISOLATION",
  "product QA preservation: semantic PROMOTE_ISOLATION",
  "product QA preservation: semantic POLICY_BINDING",
  "product QA preservation: semantic ROLE_IDENTITY",
  "product QA preservation: semantic ATTESTATION_CONTROLLER_EXCLUSION",
  "product QA preservation: semantic WORKFLOW_CONTROLLER_EXCLUSION",
  "product QA preservation: rejects controller_call",
  "product QA preservation: rejects authorization_import",
  "product QA preservation: rejects release_request",
  "product QA preservation: rejects release_fields",
  "product QA preservation: rejects policy_binding",
  "product QA preservation: rejects role_identity",
  "product QA preservation: rejects attestation_contract",
  "product QA preservation: rejects adopt_isolation",
  "product QA preservation: rejects promote_isolation",
  "product QA preservation: rejects unapproved_region",
  "product QA preservation: rejects timestamp_validation",
  "product QA preservation: rejects timestamp_return",
  "product QA preservation: rejects top_level_call",
  "product QA preservation: rejects extra_import",
  "product QA preservation: rejects extra_export",
  "product QA preservation: rejects duplicate_declaration",
  "product QA preservation: rejects missing_declaration",
  "product QA preservation: rejects unknown_declaration",
  "product QA preservation: rejects changed_export",
  "product QA preservation: rejects malformed_ast",
  "product QA preservation: rejects metadata_timestamp_call",
  "product QA preservation: rejects metadata_recordTime_call",
  "product QA preservation: rejects metadata_currentStatus_call",
  "product QA preservation: rejects metadata_resolveProbePreview_call",
  "governed metadata repair: missing_probe_qa_path",
  "governed metadata repair: missing_product_qa_path",
  "governed metadata repair: duplicate_probe_qa_path",
  "governed metadata repair: duplicate_product_qa_path"
];
for (const [name, expectedError] of Object.entries(accountingCases)) {
  test('metadata repair accounting: ' + name, () => {
    const result = spawnSync('python3', ['-c', successorModel], {
      cwd: repositoryRoot, encoding: 'utf8', timeout: 60000,
      input: JSON.stringify({ case: name, repair: true, mandatory: [...mandatoryCases,
        ...Object.keys(accountingCases).map(name => 'metadata repair accounting: ' + name)],
        guard: metadataPython[0], integrity: metadataPython[1], summary: metadataPython[2] }),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const output = JSON.parse(result.stdout);
    assert.equal(output.accepted, expectedError === null, JSON.stringify(output));
    if (expectedError !== null) assert.ok(output.error.includes(expectedError), JSON.stringify(output));
  });
}

const runtimeExpectedDelta={
  "scripts/statistical-levels-release/tests/probe-product-browser-harness.test.mjs": "M",
  ".github/workflows/ci.yml": "M",
  ".github/workflows/statistical-levels-release.yml": "M",
  "app/(es)/niveles-estadisticos/page.tsx": "M",
  "app/api/statistical-levels/asset/route.ts": "A",
  "app/en/statistical-levels/page.tsx": "M",
  "components/statistical-levels/StatLevelsLab.tsx": "M",
  "docs/statistical-levels-architecture-aware-transition-evidence.md": "A",
  "lib/reports/september-corrective-release.test.mts": "M",
  "lib/statistical-levels/runtime-snapshot.ts": "A",
  "scripts/qa-statistical-levels-runtime.mjs": "A",
  "scripts/statistical-levels-release/SOURCE_SHA256SUMS": "M",
  "scripts/statistical-levels-release/probe-source-inputs.json": "A",
  "scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs": "M",
  "scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs": "M",
  "scripts/statistical-levels-release/scripts/browser-harness-base.mjs": "M",
  "scripts/statistical-levels-release/scripts/probe-cli.mjs": "M",
  "scripts/statistical-levels-release/scripts/probe-fixture-registry.mjs": "M",
  "scripts/statistical-levels-release/scripts/probe-qa.mjs": "M",
  "scripts/statistical-levels-release/scripts/runtime-transition-receipts.mjs": "A",
  "scripts/statistical-levels-release/source-inputs.json": "M",
  "scripts/statistical-levels-release/source-manifest.json": "M",
  "scripts/statistical-levels-release/tests/adopt-causal-bridge.test.mjs": "M",
  "scripts/statistical-levels-release/tests/input-manifest-roles.test.mjs": "A",
  "scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-qa-http.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-redirect-integration.test.mjs": "M",
  "scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs": "M",
  "scripts/statistical-levels-release/tests/runtime-transition-receipts.test.mjs": "A",
  "scripts/statistical-levels-release/tests/statistical-levels-runtime.test.mjs": "A",
  "scripts/statistical-levels-release/workflow-freeze.json": "M",
  "package-lock.json": "M"
};

const runtimeRepairExpectedDelta = {
  "scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs": "M",
  ".github/workflows/ci.yml": "M",
  "scripts/statistical-levels-release/source-manifest.json": "M",
  "scripts/statistical-levels-release/SOURCE_SHA256SUMS": "M",
  ".github/workflows/statistical-levels-release.yml": "M",
  "scripts/statistical-levels-release/workflow-freeze.json": "M"
};

const g5HostedExpectedDelta = {
  ".github/workflows/ci.yml": "M",
  ".github/workflows/statistical-levels-release.yml": "M",
  "scripts/statistical-levels-release/SOURCE_SHA256SUMS": "M",
  "scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs": "M",
  "scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs": "M",
  "scripts/statistical-levels-release/scripts/browser-harness-base.mjs": "M",
  "scripts/statistical-levels-release/source-manifest.json": "M",
  "scripts/statistical-levels-release/tests/adopt-causal-bridge.test.mjs": "M",
  "scripts/statistical-levels-release/tests/adopt-validation.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-product-browser-harness.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-qa-http.test.mjs": "M",
  "scripts/statistical-levels-release/tests/probe-redirect-integration.test.mjs": "M",
  "scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs": "M",
  "scripts/statistical-levels-release/workflow-freeze.json": "M"
};
const runtimeGuardModel=String.raw`
import json,sys,os,hashlib,subprocess,tempfile,contextlib,io
from pathlib import Path
from unittest.mock import patch
v=json.load(sys.stdin);case=v['case'];root=Path.cwd();head='f'*40
output=subprocess.check_output;run=subprocess.run;read=Path.read_bytes;text=Path.read_text
# Real checkout, fixed implementation base and synthetic event HEAD are distinct.
# Expected identities are independent literals, never copied from the guard.
parent='65aec8374a896bb7323dcd76af7263fb437610fa'
repair_parent='acfd5efed5984a7981e64a6953960c161fa11dc7'
checkout=output(['git','rev-parse','HEAD']).decode().strip()
assert head=='f'*40 and checkout!=head, 'WRONG_SYNTHETIC_FIXTURE_ROLE'
assert output(['git','show','-s','--format=%P',repair_parent]).decode().strip()==parent, 'WRONG_IMPLEMENTATION_BASE'
assert output(['git','rev-parse',repair_parent+'^{tree}']).decode().strip()=='5498cab4844ab8c7dc455c4f6347fa37e1624220', 'WRONG_REVIEWED_RUNTIME_TREE'
local_base='9b860095e7f18c26393af1e028244c1bae9c1598'
prior_base='cb63f82d7e2e7cd9f6283f26d8bdb120da8c174c'
snapshot_blobs={'lib/statistical-levels/generated-provenance.json': 'fca16c7da73622dd37bffa267de32043b9e20131', 'lib/statistical-levels/generated/assets/AIQ.json': '0d47d05a069ce5b4cceb60f08796f9b64e222494', 'lib/statistical-levels/generated/assets/BOTZ.json': 'cc27c6021f882ebe5d02e74d58cb2705fe08eff0', 'lib/statistical-levels/generated/assets/BTCUSD.json': '0a5f1be5d4789ba27866eb22f15d53a39d0c146a', 'lib/statistical-levels/generated/assets/CIBR.json': 'c842a9c73048cf24cc48286edfa04b33e05a14ef', 'lib/statistical-levels/generated/assets/DIA.json': '617c8398c4da52d0e475cb4bc2513d0014a7dda8', 'lib/statistical-levels/generated/assets/EEM.json': '0de743b968a4b53037f066ba5903cb662ccb35ea', 'lib/statistical-levels/generated/assets/EFA.json': '87e8b20cb7105f7b0836bf07132ad8a35b9f7c71', 'lib/statistical-levels/generated/assets/ETHUSD.json': '482211a8a84336fc643aaa58ae3231b5aac35563', 'lib/statistical-levels/generated/assets/EWJ.json': 'c5626f89e70b34036d7e79079d86a7800ad8c0c6', 'lib/statistical-levels/generated/assets/FINX.json': 'e3b0300b4bec0ac2f05b89ca3c79ca1754972f23', 'lib/statistical-levels/generated/assets/FXI.json': '708b0e928d75ebea6cfcdf60bf585ef2e920e3c8', 'lib/statistical-levels/generated/assets/GLD.json': '9d4565aae34a621a524fa68eb035abfec84b5fa4', 'lib/statistical-levels/generated/assets/HYG.json': '1b71ff9ad6ef2cab76670f5a56e77b63d2ad7679', 'lib/statistical-levels/generated/assets/IEF.json': 'dc0e96b354f39c6fddb0a95c971bf3dc7a2c22f7', 'lib/statistical-levels/generated/assets/ITA.json': '273a8abd7b1ab8d175862b85b04dbb92b6e1d335', 'lib/statistical-levels/generated/assets/IWM.json': 'b3aabfa92a91cb7ec91a5920bc72a5263f62993a', 'lib/statistical-levels/generated/assets/LQD.json': 'db8fa9c1e9e67522ac669a04f6a673c90da8335d', 'lib/statistical-levels/generated/assets/PAVE.json': '128a612451cb6f08289a53e5175bdb7f5a76c279', 'lib/statistical-levels/generated/assets/PHO.json': '3fe7859042d1aaf884ffa0cf1c83bd661944b06b', 'lib/statistical-levels/generated/assets/QQQ.json': '15ca2bf9d01ee8e5c53913701538b506b7637b13', 'lib/statistical-levels/generated/assets/RSP.json': 'd8e29d3c7300ef1e103a5f9be566febefee74cf3', 'lib/statistical-levels/generated/assets/SHY.json': '51dc44641c11d2031bbd8e9466b87150646e410d', 'lib/statistical-levels/generated/assets/SLV.json': 'f6214c7e7054edd615c78c133581620f817851c1', 'lib/statistical-levels/generated/assets/SMH.json': 'fcd597cacd5e2176a40d4f27ce17cebc6a957756', 'lib/statistical-levels/generated/assets/SPY.json': 'dfd1811fb3dedd1b6f7a6af36075cc66786a65c5', 'lib/statistical-levels/generated/assets/TLT.json': 'cd8699eeae498c4c1bc67605ab49afa49c474715', 'lib/statistical-levels/generated/assets/USO.json': '9bb86beb720ac3147fe1493b8783885376ac79a9', 'lib/statistical-levels/generated/assets/UUP.json': '4ed0491763ff5c970861b66288d19c660b7f2c69', 'lib/statistical-levels/generated/assets/VOO.json': '8eaed8bb6b74cfdf5b1dad110c57871b33cf61dc', 'lib/statistical-levels/generated/assets/XLB.json': 'e701a302c92fcfd95ab0cdffccbe214a2bb3006f', 'lib/statistical-levels/generated/assets/XLC.json': '6fa9aca46cc515792c1bc1e2756fae49391da91f', 'lib/statistical-levels/generated/assets/XLE.json': '9d99af339cc879beb2b44aec9f55d66c84f053be', 'lib/statistical-levels/generated/assets/XLF.json': 'f87cd5aa3688c9c754bcd163b7e6c264f9deeb63', 'lib/statistical-levels/generated/assets/XLI.json': '72aa923ae36775a6836ea758c627ed1fcb2950ac', 'lib/statistical-levels/generated/assets/XLK.json': 'd9e88b5c5884bec4918af4511e46e8e5e1cdabe3', 'lib/statistical-levels/generated/assets/XLP.json': '5cb50cd12565997b8601c3bd9772b0b6e73f2c6c', 'lib/statistical-levels/generated/assets/XLRE.json': 'a94164cfc3b4b40c8feb50afa93b5e5029bae7d4', 'lib/statistical-levels/generated/assets/XLU.json': '9a3b4ed791f316aa5c2524f5df007c82f7079f70', 'lib/statistical-levels/generated/assets/XLV.json': 'e742dc166c7c478f44cd19b1a4ea6ff7e5448876', 'lib/statistical-levels/generated/assets/XLY.json': 'ceaa08d8df31c75b30b40e4a6137e1916b4ddba7', 'lib/statistical-levels/generated/manifest.json': '33ea1ecae85c57ee10e2639a0aff5fc68c250d80', 'lib/statistical-levels/generated/seasonality/AIQ.json': '5472b79c5e7892924b00fa248e1d859d5be21f1c', 'lib/statistical-levels/generated/seasonality/BOTZ.json': '863b8fddb020b7d01be89cb5d2fefcd0e8f36b7e', 'lib/statistical-levels/generated/seasonality/BTCUSD.json': '66854be64659e0e2a983246b35e6ae86e8f5d123', 'lib/statistical-levels/generated/seasonality/CIBR.json': '1847c9132018117ecb50cd56179384fb2c0aea9f', 'lib/statistical-levels/generated/seasonality/DIA.json': '40fbb020952ef53b7fee8e6362c3d76170ba4781', 'lib/statistical-levels/generated/seasonality/EEM.json': '82d7eb386c81f1ed4e75d3f6339747f1e2701c0b', 'lib/statistical-levels/generated/seasonality/EFA.json': 'd28134900676c4f44c9f835efcd833105d6d217c', 'lib/statistical-levels/generated/seasonality/ETHUSD.json': '58a41e879d7045cf48b5800748c194b2966876ea', 'lib/statistical-levels/generated/seasonality/EWJ.json': '28eb9ecf5e4e75add9fabe322b9aa4b1d565b9a5', 'lib/statistical-levels/generated/seasonality/FINX.json': '42907556bba563cfe3d492618ee591c31889d048', 'lib/statistical-levels/generated/seasonality/FXI.json': '3d7e405d22bb3e8a6235ce391e1b92efe4e785e6', 'lib/statistical-levels/generated/seasonality/GLD.json': '17b65b790fb915cecc6ba000add574cac403b139', 'lib/statistical-levels/generated/seasonality/HYG.json': 'f24731678a65f9dc6c2073eb7d76ae1008005139', 'lib/statistical-levels/generated/seasonality/IEF.json': 'fe52ef4e328508202975912a3c772d96be07057d', 'lib/statistical-levels/generated/seasonality/ITA.json': 'dc285e4cc4a5a97ac600ee135fbb285541bf8322', 'lib/statistical-levels/generated/seasonality/IWM.json': '69fc20f3d96004d697628545c9bc06c7972e3787', 'lib/statistical-levels/generated/seasonality/LQD.json': 'cca112efbafc93a4b2215167ff6dd6c4c7d3cd59', 'lib/statistical-levels/generated/seasonality/PAVE.json': '4df36a275e6befcd2cd18185afb1d70be3870dc6', 'lib/statistical-levels/generated/seasonality/PHO.json': 'a79313ebd79c87d9376535b950a56fde6d1fea6e', 'lib/statistical-levels/generated/seasonality/QQQ.json': 'bf791e6cad2515c4836513e162880f04ecfb0ed7', 'lib/statistical-levels/generated/seasonality/RSP.json': 'd94a45f5e8bd08835e98950a639fa35360d13ca4', 'lib/statistical-levels/generated/seasonality/SHY.json': '52cbf96f0110c827168bc5956cd76e199d37bc6d', 'lib/statistical-levels/generated/seasonality/SLV.json': 'b7a77319684a38f2359d2e27c392574b00291259', 'lib/statistical-levels/generated/seasonality/SMH.json': '77219f5aab71ae34cf6b5e430c71119b8821c0f4', 'lib/statistical-levels/generated/seasonality/SPY.json': 'af7558f9f2a8393276c3f35c46ab094617e75bdb', 'lib/statistical-levels/generated/seasonality/TLT.json': '7f9bf19e61aa506a6b4e70f5a8081dc8c4960dea', 'lib/statistical-levels/generated/seasonality/USO.json': 'b664267c2fb43e318b5e8cd37fc2078b65b7524f', 'lib/statistical-levels/generated/seasonality/UUP.json': '890dc63fac55db1d0f31fb018cb984cc8e98f46d', 'lib/statistical-levels/generated/seasonality/VOO.json': '61876843e237f347a9f804ba9d67435451d84b4a', 'lib/statistical-levels/generated/seasonality/XLB.json': '1f746494ec831cc1fc740594121509bf38aafc56', 'lib/statistical-levels/generated/seasonality/XLC.json': '522b9b73804a60ce159a8c94715025f3a66c33af', 'lib/statistical-levels/generated/seasonality/XLE.json': '15272e6c7d113ab159caae54dfe59bec87a1106c', 'lib/statistical-levels/generated/seasonality/XLF.json': 'f6bc8697814874af69b6432fe3abcc4b10cf35a7', 'lib/statistical-levels/generated/seasonality/XLI.json': 'ed9fa02d40ee37b15c9d7fb1f51b406931c1204d', 'lib/statistical-levels/generated/seasonality/XLK.json': 'f7cd293aca7858c2094e8096bf0247c137634fc6', 'lib/statistical-levels/generated/seasonality/XLP.json': '446550c9924197482775f6d9aee7536f8d3e7416', 'lib/statistical-levels/generated/seasonality/XLRE.json': '012222273a50aa50cfaa938b74305466c0066907', 'lib/statistical-levels/generated/seasonality/XLU.json': '399a9a939f7b861467d6e9c0211de44961232f49', 'lib/statistical-levels/generated/seasonality/XLV.json': 'c4d61a896579d1f61148e530da13a9332b91be34', 'lib/statistical-levels/generated/seasonality/XLY.json': '3b1e3088dbdc9a9592ba0fe2c613f94a4a42f24c'}
local_scope={
 '.github/workflows/ci.yml',
 '.github/workflows/statistical-levels-release.yml',
 'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
 'scripts/statistical-levels-release/source-manifest.json',
 'scripts/statistical-levels-release/workflow-freeze.json',
 'scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs',
 'scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs',
 'scripts/statistical-levels-release/scripts/browser-harness-base.mjs',
 'scripts/statistical-levels-release/tests/adopt-causal-bridge.test.mjs',
 'scripts/statistical-levels-release/tests/adopt-validation.test.mjs',
 'scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs',
 'scripts/statistical-levels-release/tests/probe-product-browser-harness.test.mjs',
 'scripts/statistical-levels-release/tests/probe-qa-http.test.mjs',
 'scripts/statistical-levels-release/tests/probe-redirect-integration.test.mjs',
 'scripts/statistical-levels-release/tests/product-qa-observability-isolation.test.mjs'}
functional_pins={
 'scripts/statistical-levels-release/scripts/adopt-causal-bridge.mjs':'c383bdefe1f43997010d545cea81acc8deaf66eb7ab2acf610c972064d87edc2',
 'scripts/statistical-levels-release/scripts/adopt-request-evidence.mjs':'fb7b410d6df1fc7973ca5528254f6f8c4056cd93be055cba776b9da11660b697',
 'scripts/statistical-levels-release/scripts/browser-harness-base.mjs':'e92a7dea16f4847cdb381a018f3b421d20b1cadc607217828709967172b229c2',
 'scripts/statistical-levels-release/tests/adopt-causal-bridge.test.mjs':'ad99dd40d76371c207dd50f3be4dd39b88e2bb1a2f8518296f08ed4be72233f5',
 'scripts/statistical-levels-release/tests/adopt-validation.test.mjs':'32a73a79aac191a7d74ac1fbdf6ed168799acfee362266c28039ad69d0d8474d'}
canonical=lambda x:(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True)+'\n').encode('ascii')
sha256=lambda x:hashlib.sha256(x).hexdigest()
def committed_successor(identity):
    if identity==local_base:
        assert output(['git','show','-s','--format=%P',identity]).decode().strip()==prior_base, 'WRONG_SNAPSHOT_PARENT'
        assert output(['git','rev-parse',identity+'^{tree}']).decode().strip()=='2f6323a123273800d17f60ca9573785af3a2d22f', 'WRONG_SNAPSHOT_TREE'
        raw=output(['git','diff','--raw','--no-abbrev','--no-renames','-z',prior_base,identity,'--']).decode().rstrip('\0').split('\0')
        assert len(raw)==164 and len(set(raw[1::2]))==82 and set(raw[1::2])==set(snapshot_blobs), 'WRONG_SNAPSHOT_SCOPE'
        for header,name in zip(raw[::2],raw[1::2]):
            fields=header.split();assert len(fields)==5 and fields[0]==':100644' and fields[1]=='100644' and fields[4]=='M' and fields[3]==snapshot_blobs[name], 'WRONG_SNAPSHOT_BLOB_OR_MODE'
        return
    assert output(['git','show','-s','--format=%P',identity]).decode().strip()==repair_parent, 'WRONG_REPAIR_CHECKOUT_PARENT'
    raw=output(['git','diff','--raw','--no-abbrev','--no-renames','-z',repair_parent,identity,'--']).decode().rstrip('\0').split('\0')
    assert len(raw)==12 and len(set(raw[1::2]))==6 and set(raw[1::2])==set(v['delta']), 'WRONG_REPAIR_CHECKOUT_SCOPE'
    for header in raw[::2]:
        fields=header.split()
        assert len(fields)==5 and fields[0]==':100644' and fields[1]=='100644' and fields[4]=='M', 'WRONG_REPAIR_CHECKOUT_MODE'
def admit_checkout(identity,metadata,capture=None):
    if identity==repair_parent:return 'HISTORICAL_IMPLEMENTATION'
    local_hash=metadata.get('SL_LOCAL_QUALIFICATION_SUBJECT_SHA256')
    if local_hash:
        assert identity==local_base, 'WRONG_LOCAL_BASE'
        assert not any(metadata.get(k) for k in ['GITHUB_SHA','CI_EVENT_SHA','GITHUB_EVENT_NAME','GITHUB_REF']), 'LOCAL_HOSTED_ROLE_CONFLICT'
        committed_successor(identity)
        assert capture and capture['collector_source_sha256']=='c7263bbecf183120b6aaa4037f5e202e13eefe354a4634268d1b8419348a0c64', 'LOCAL_COLLECTOR_UNBOUND'
        assert sha256(canonical(capture['subject']))==capture['subject_sha256']==local_hash, 'LOCAL_SUBJECT_UNBOUND'
        assert sha256(canonical(capture['delta']))==capture['delta_sha256'], 'LOCAL_DELTA_UNBOUND'
        delta=capture['delta'];assert delta['parent']==local_base and not delta['unauthorized_path_hex'] and not delta['untracked_path_hex'], 'LOCAL_SCOPE_INVALID'
        assert {bytes.fromhex(p).decode() for p in delta['changed_path_hex']}==local_scope, 'LOCAL_SCOPE_INVALID'
        assert len(delta['tracked'])==15 and {bytes.fromhex(x['path_hex']).decode() for x in delta['tracked']}==local_scope, 'LOCAL_SCOPE_INVALID'
        for x in delta['tracked']:assert x['status']=='M' and x['old_mode']==x['new_mode']=='100644' and not x['git_mode_changed'], 'LOCAL_MODE_INVALID'
        records=capture['subject']['records'];names=[bytes.fromhex(x['path_hex']).decode() for x in records]
        live_names=output(['git','ls-files','-z']).decode().rstrip('\0').split('\0')
        assert len(names)==len(set(names)) and set(names)==set(live_names), 'LOCAL_INVENTORY_INVALID'
        baseline={p.decode():header.split()[2].decode() for header,p in (entry.split(b'\t',1) for entry in output(['git','ls-tree','-r','-z',local_base]).split(b'\0') if entry)}
        for x,name in zip(records,names):
            file=root/name;assert x['tracked'] and x['exists'] and x['worktree_file_type']=='REGULAR_FILE' and not file.is_symlink(), 'LOCAL_FILE_INVALID'
            content=read(file)
            assert format(file.stat().st_mode&0o7777,'06o')==x['worktree_mode'] and sha256(content)==x['sha256'], 'LOCAL_BYTES_CHANGED'
            if name in functional_pins:assert x['sha256']==functional_pins[name], 'LOCAL_FUNCTIONAL_DRIFT'
            elif name not in local_scope:assert hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()==baseline[name], 'LOCAL_UNAUTHORIZED_DRIFT'
        return 'LOCAL_GOVERNED_SUBJECT'
    # Hosted role uses actual event identities; local qualification never sets them.
    assert identity==metadata.get('GITHUB_SHA')==metadata.get('CI_EVENT_SHA'), 'WRONG_IMPLEMENTATION_CHECKOUT'
    assert metadata.get('GITHUB_EVENT_NAME')=='push' and metadata.get('GITHUB_REF')=='refs/heads/vercel-deployment', 'WRONG_REPAIR_EVENT'
    if identity in [local_base,prior_base]:committed_successor(identity)
    else:
        assert output(['git','show','-s','--format=%P',identity]).decode().strip()==local_base, 'WRONG_G5_CHECKOUT_PARENT'
        raw=output(['git','diff','--raw','--no-abbrev','--no-renames','-z',local_base,identity,'--']).decode().rstrip('\0').split('\0')
        assert len(raw)==30 and len(set(raw[1::2]))==15 and set(raw[1::2])==local_scope, 'WRONG_G5_CHECKOUT_SCOPE'
        for header in raw[::2]:
            fields=header.split();assert len(fields)==5 and fields[0]==':100644' and fields[1]=='100644' and fields[4]=='M', 'WRONG_G5_CHECKOUT_MODE'
    return 'HOSTED_PUSH_EVENT'
bootstrap_metadata={k:os.environ.get(k) for k in ['SL_LOCAL_QUALIFICATION_SUBJECT_SHA256','GITHUB_SHA','CI_EVENT_SHA','GITHUB_EVENT_NAME','GITHUB_REF']}
capture=json.loads((Path(os.environ['CI_EVIDENCE'])/'subject-before.json').read_text()) if bootstrap_metadata['SL_LOCAL_QUALIFICATION_SUBJECT_SHA256'] else None
bootstrap_mode=admit_checkout(checkout,bootstrap_metadata,capture)
# Admission regressions model input metadata explicitly, never impersonate a
# hosted run via process environment. Actual local subject is admitted first.
if v.get('admission_case'):
    test_case=v['admission_case'];metadata=bootstrap_metadata.copy();subject=json.loads(json.dumps(capture));identity=checkout
    if test_case=='historical':identity=repair_parent;metadata={}
    elif test_case=='hosted':metadata={'GITHUB_SHA':local_base,'CI_EVENT_SHA':local_base,'GITHUB_EVENT_NAME':'push','GITHUB_REF':'refs/heads/vercel-deployment'}
    elif test_case=='prior_hosted':identity=prior_base;metadata={'GITHUB_SHA':prior_base,'CI_EVENT_SHA':prior_base,'GITHUB_EVENT_NAME':'push','GITHUB_REF':'refs/heads/vercel-deployment'}
    elif test_case=='wrong_local_base':identity='a'*40
    elif test_case=='missing_local_binding':metadata={}
    elif test_case=='wrong_subject_hash':metadata['SL_LOCAL_QUALIFICATION_SUBJECT_SHA256']='0'*64
    elif test_case=='mixed_hosted_local':metadata['GITHUB_EVENT_NAME']='push'
    elif test_case=='wrong_collector':subject['collector_source_sha256']='0'*64
    elif test_case in ['extra_path','missing_path','wrong_mode','functional_drift','changed_bytes']:
        if test_case=='extra_path':subject['delta']['changed_path_hex'].append(b'unauthorized.txt'.hex())
        elif test_case=='missing_path':subject['delta']['changed_path_hex'].pop()
        elif test_case=='wrong_mode':subject['delta']['tracked'][0]['new_mode']='100755'
        else:
            name=next(iter(functional_pins)) if test_case=='functional_drift' else 'README.md'
            next(x for x in subject['subject']['records'] if bytes.fromhex(x['path_hex']).decode()==name)['sha256']='0'*64
        subject['delta_sha256']=sha256(canonical(subject['delta']));subject['subject_sha256']=sha256(canonical(subject['subject']));metadata['SL_LOCAL_QUALIFICATION_SUBJECT_SHA256']=subject['subject_sha256']
    try:print(json.dumps({'accepted':True,'mode':admit_checkout(identity,metadata,subject)}))
    except AssertionError as error:print(json.dumps({'accepted':False,'error':str(error)}))
    raise SystemExit(0)
live=output(['git','ls-files','-z','scripts/statistical-levels-release/']).decode().rstrip('\0').split('\0')
assert len(live)-3==99, 'LIVE_BUNDLE_COUNT'
stale=output(['git','show','-s','--format=%P',parent]).decode().strip()
assert stale=='94e8ef63bea09b1043bad217946736503b147731'
assert output(['git','show','-s','--format=%P',stale]).decode().strip()=='578498f33b5bf7c70f5c43894d05f67aea409a00', 'WRONG_IMPLEMENTATION_PREDECESSOR'
original=output(['git','diff','--raw','--no-abbrev','--no-renames','-z',parent,repair_parent,'--']).decode().rstrip('\0').split('\0')
assert len(original)==64 and len(set(original[1::2]))==32 and set(original[1::2])==set(v['implementationDelta']), 'WRONG_IMPLEMENTATION_SCOPE'
for header,name in zip(original[::2],original[1::2]):
    fields=header.split();status=v['implementationDelta'][name]
    assert len(fields)==5 and fields[0]==(':000000' if status=='A' else ':100644') and fields[1]=='100644' and fields[4]==status, 'WRONG_IMPLEMENTATION_MODE'
expected=v['g5Delta'];seen=[]
def git(args,**kwargs):
    if args==['git','rev-parse','HEAD']: return (head+'\n').encode()
    if args==['git','show','-s','--format=%P','HEAD']:
        parents={'wrong_parent':['a'*40],'stale_parent':[stale],
                 'arbitrary_descendant':['b'*40],
                 'unrelated_ancestor':['c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f'],
                 'multiple_parents':[local_base,stale],
                 'merge_parent_substitution':[stale,local_base]}.get(case,[local_base])
        return (' '.join(parents)+'\n').encode()
    if args[:4]==['git','diff','--raw','--no-abbrev']:
        if args[-3:] in [[parent,repair_parent,'--'],[repair_parent,prior_base,'--'],[prior_base,local_base,'--']]:
            return output(args,**kwargs)
        names=list(expected)
        if case=='extra_path':names.append('unauthorized.txt')
        if case=='missing_path':names.pop()
        if case=='duplicate_path':names.append(names[0])
        rows=[]
        for n in names:
            status=expected.get(n,'M');old='000000' if status=='A' else '100644';new='100755' if case=='wrong_mode' else '100644'
            if case=='wrong_status':status='D'
            rows.append(':'+old+' '+new+' '+'a'*40+' '+'b'*40+' '+status+'\0'+n+'\0')
        return ''.join(rows).encode()
    if args==['git','ls-files','-z']:
        names=set(output(args).decode().rstrip('\0').split('\0'))|set(expected)
        return ('\0'.join(sorted(names))+'\0').encode()
    return output(args,**kwargs)
def command(args,**kwargs):
    if args in [['git','rev-parse',repair_parent+'^{tree}'],['git','rev-parse',prior_base+'^{tree}'],['git','rev-parse',local_base+'^{tree}']]:return run(args,**kwargs)
    if args==['git','diff','--raw','--no-abbrev','--no-renames','-z',parent,repair_parent,'--']:return run(args,**kwargs)
    if args==['git','diff','--raw','--no-abbrev','--no-renames','-z','acfd5efed5984a7981e64a6953960c161fa11dc7','cb63f82d7e2e7cd9f6283f26d8bdb120da8c174c','--']:return run(args,**kwargs)
    if args==['git','diff','--raw','--no-abbrev','--no-renames','-z','cb63f82d7e2e7cd9f6283f26d8bdb120da8c174c','9b860095e7f18c26393af1e028244c1bae9c1598','--']:return run(args,**kwargs)
    if args[:2] in [['git','show'],['git','ls-files']]:return run(args,**kwargs)
    if args[:3]==['git','diff','--exit-code']:
        if case=='dirty':raise AssertionError('DIRTY_CANDIDATE')
        return subprocess.CompletedProcess(args,0)
    if args[:3]==['git','merge-base','--is-ancestor']:
        seen.append(args[3]);assert args[4]==head
        if case=='missing_ancestry':raise AssertionError('ANCESTRY_MISSING')
        return run(args[:4]+[local_base],**kwargs)
    raise AssertionError('UNEXPECTED_MUTATING_COMMAND')
def bytes_(p):
    b=read(p);name=str(p.relative_to(root)) if p.is_relative_to(root) else ''
    if name.endswith('/probe-source-inputs.json') and case in ['probe_mutation','roles_swapped']:return b+b' '
    if name.endswith('/source-inputs.json'):
        if case=='missing_material':d=json.loads(b);d.pop('components/statistical-levels/StatLevelsLab.tsx');return json.dumps(d).encode()
        if case=='stale_material':d=json.loads(b);d['components/statistical-levels/StatLevelsLab.tsx']='0'*64;return json.dumps(d).encode()
        if case=='duplicate_key':return b.rstrip()[:-1]+b',"x":"0" ,"x":"1"}'
    if name.endswith('/probe-fixture.json') and case=='wrong_registration':return b.replace(b'c8454dc',b'0000000')
    if name=='components/statistical-levels/StatLevelsLab.tsx' and case=='unbound_product':return b+b'changed'
    return b
def text_(p,*args,**kwargs):
    s=text(p,*args,**kwargs)
    if str(p).endswith('/scripts/probe-fixture-registry.mjs') and case=='probe_pin':return s.replace('d7a8470700b59ed501502e96cc10cba3de8f79824847ed72706f9942c8473621','0'*64)
    if str(p).endswith('/scripts/cli.mjs') and case=='release_probe_role':return s.replace('source-inputs.json','probe-source-inputs.json')
    if str(p).endswith('/scripts/probe-cli.mjs') and case=='probe_release_role':return s.replace('readRegisteredProbeInputManifest(target)','readCandidateManifest(target)')
    return s
with tempfile.TemporaryDirectory(prefix='sl-runtime-ci-model-') as out:
    env={'CI_EVIDENCE':out,'CI_EVENT_SHA':head,'GITHUB_SHA':head,'GITHUB_EVENT_NAME':'push','GITHUB_REF':'refs/heads/vercel-deployment','GITHUB_RUN_ID':'1','GITHUB_RUN_ATTEMPT':'1','SL_LOCAL_QUALIFICATION_SUBJECT_SHA256':''}
    if case=='wrong_sha':env['GITHUB_SHA']='a'*40
    if case=='mutable_ref':env['CI_EVENT_SHA']='refs/heads/vercel-deployment'
    if case=='missing_event':env['GITHUB_EVENT_NAME']=''
    if case=='wrong_event':env['GITHUB_EVENT_NAME']='pull_request'
    if case=='local_impersonation':env['SL_LOCAL_QUALIFICATION_SUBJECT_SHA256']='a'*64
    try:
        with patch.dict(os.environ,env),patch('subprocess.check_output',git),patch('subprocess.run',command),patch.object(Path,'read_bytes',bytes_),patch.object(Path,'read_text',text_),contextlib.redirect_stdout(io.StringIO()):exec(compile(v['guard'],'current-runtime-ci','exec'),{})
        subject=json.loads((Path(out)/'subject.json').read_text());assert subject['lineage']['runtime_parent_verified'] and subject['lineage']['implementation_parent_sha']==parent and subject['lineage']['implementation_parent_predecessor_sha']==stale and subject['lineage']['runtime_repair_parent_sha']==repair_parent and subject['lineage']['runtime_repair_parent_verified'] and subject['lineage']['g5_parent_sha']==local_base and subject['lineage']['g5_parent_verified'] and len(seen)==12
        assert seen==[local_base,prior_base,repair_parent,parent,stale,'578498f33b5bf7c70f5c43894d05f67aea409a00','d290691156b933ba62e5e8f6489dc870568126e0','f7e3fe8e3e3cd8bdea753873c31d78f146cdc923','c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1','e7872b9c0e5bb0be3e090fbe2c5b930d68dcbece','0c8fce262fce44650729883862ec948778ebea45','c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f']
        print(json.dumps({'accepted':True}))
    except (AssertionError,subprocess.CalledProcessError) as e:print(json.dumps({'accepted':False,'error':str(e)}))
`;
for(const name of ['valid','wrong_parent','stale_parent','arbitrary_descendant','unrelated_ancestor','multiple_parents','merge_parent_substitution','extra_path','missing_path','duplicate_path','wrong_mode','wrong_status','dirty','missing_ancestry','probe_mutation','roles_swapped','missing_material','stale_material','duplicate_key','wrong_registration','unbound_product','probe_pin','release_probe_role','probe_release_role','wrong_sha','mutable_ref'])test('governed runtime successor: '+name,()=>{
 const result=spawnSync('python3',['-c',runtimeGuardModel],{cwd:repositoryRoot,encoding:'utf8',timeout:60000,input:JSON.stringify({case:name,delta:runtimeRepairExpectedDelta,g5Delta:g5HostedExpectedDelta,implementationDelta:runtimeExpectedDelta,guard:ciPython[0]})});
 assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.equal(value.accepted,name==='valid',JSON.stringify(value));
 if(['wrong_parent','stale_parent','arbitrary_descendant','unrelated_ancestor','multiple_parents','merge_parent_substitution'].includes(name))assert.equal(value.error,'WRONG_RUNTIME_IMPLEMENTATION_PARENT');
});

for(const name of ['local','historical','hosted','prior_hosted','wrong_local_base','missing_local_binding','wrong_subject_hash','mixed_hosted_local','wrong_collector','extra_path','missing_path','wrong_mode','functional_drift','changed_bytes'])test('G5 fixture binding: checkout admission '+name,()=>{
 const result=spawnSync('python3',['-c',runtimeGuardModel],{cwd:repositoryRoot,encoding:'utf8',timeout:60000,input:JSON.stringify({case:'valid',admission_case:name,delta:runtimeRepairExpectedDelta,g5Delta:g5HostedExpectedDelta,implementationDelta:runtimeExpectedDelta,guard:ciPython[0]})});
 assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);
 assert.equal(value.accepted,['local','historical','hosted','prior_hosted'].includes(name),JSON.stringify(value));
 if(value.accepted)assert.equal(value.mode,{local:'LOCAL_GOVERNED_SUBJECT',historical:'HISTORICAL_IMPLEMENTATION',hosted:'HOSTED_PUSH_EVENT',prior_hosted:'HOSTED_PUSH_EVENT'}[name]);
});

test('governed runtime successor: oracle detects stale and ancestry-only workflow guards',()=>{
 const guard=ciPython[0];
 const stale=guard.replace("implementation_parent='65aec8374a896bb7323dcd76af7263fb437610fa'","implementation_parent='94e8ef63bea09b1043bad217946736503b147731'");
 assert.notEqual(stale,guard);
 const assess=(source,name)=>{const result=spawnSync('python3',['-c',runtimeGuardModel],{cwd:repositoryRoot,encoding:'utf8',timeout:60000,input:JSON.stringify({case:name,delta:runtimeRepairExpectedDelta,g5Delta:g5HostedExpectedDelta,implementationDelta:runtimeExpectedDelta,guard:source})});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
 assert.equal(assess(stale,'valid').accepted,false,'actual required parent must expose a stale workflow constant');
 const weak=guard.replace("assert parents==[g5_parent], 'WRONG_RUNTIME_IMPLEMENTATION_PARENT'","assert g5_parent in parents or len(parents)==1, 'WRONG_RUNTIME_IMPLEMENTATION_PARENT'");
 assert.notEqual(weak,guard);
 for(const name of ['stale_parent','arbitrary_descendant','multiple_parents','merge_parent_substitution'])assert.equal(assess(weak,name).accepted,true,'the negative oracle must detect a bypassed direct-parent assertion');
});

test('governed runtime successor: actual accounting SHA parity and separate review gate',()=>{
 const model=String.raw`
import ast,json,os,sys
from unittest.mock import patch
v=json.load(sys.stdin);tree=ast.parse(v['summary'])
def assertion(message):
    rows=[n for n in ast.walk(tree) if isinstance(n,ast.Assert) and isinstance(n.msg,ast.Constant) and n.msg.value==message]
    assert len(rows)==1,message
    return compile(ast.Module(body=rows,type_ignores=[]),'actual-ci-accounting-assertion','exec')
before={'reviewed.ts':{'sha256':'a'*64,'mode':'100644'}}
env={'CI_EVENT_SHA':'f'*40,'GITHUB_SHA':'f'*40,'GITHUB_RUN_ID':'1','GITHUB_RUN_ATTEMPT':'1'}
subject={'head_sha':'f'*40,'run_id':'1','run_attempt':'1'}
with patch.dict(os.environ,env):
    for message in ['GOVERNED_BYTES_CHANGED','WRONG_SUBJECT_SHA','WRONG_SUMMARY_SHA','CROSS_RUN_SUBJECT']:
        scope={'before':before,'after':before.copy(),'subject':subject.copy(),'os':os}
        code=assertion(message);exec(code,scope)
        if message=='GOVERNED_BYTES_CHANGED':scope['after']={'reviewed.ts':{'sha256':'b'*64,'mode':'100644'}}
        elif message=='CROSS_RUN_SUBJECT':scope['subject']['run_attempt']='2'
        else:scope['subject']['head_sha']='e'*40
        try:exec(code,scope)
        except AssertionError:pass
        else:raise AssertionError('ACCOUNTING_BYPASS:'+message)
rows=[n for n in ast.walk(tree) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Subscript) and isinstance(t.slice,ast.Constant) and t.slice.value=='covered_obligations' for t in n.targets)]
assert len(rows)==1
scope={'summary':{},'subject':{'integration_push':True}};exec(compile(ast.Module(body=rows,type_ignores=[]),'actual-ci-obligations','exec'),scope)
assert scope['summary']['covered_obligations']==['C%02d'%i for i in range(1,14)]
print(json.dumps({'PASS':True,'obligations':13}))
`;
 const result=spawnSync('python3',['-c',model],{encoding:'utf8',input:JSON.stringify({summary:ciPython[2]})});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).obligations,13);
 assert.match(ciText,/Review approval is a separate exact-tree pre-push gate, never inferred from ancestry/);
 assert.doesNotMatch(ciPython[0],/['"](?:review_approved|independent_review_passed)['"]\s*:/);
 assert.doesNotMatch(ciText,/continue-on-error:\s*true/);
 assert.match(ciText,/CI_EVENT_SHA: \$\{\{ github\.sha \}\}/);
});

test('governed runtime successor: parent repair mandatory coverage fail closed',()=>{
 const model=String.raw`
import ast,json,re,sys
v=json.load(sys.stdin);tree=ast.parse(v['summary'])
rows=[n for n in ast.walk(tree) if isinstance(n,ast.For) and isinstance(n.target,ast.Name) and n.target.id=='case' and isinstance(n.iter,ast.List) and n.iter.elts and isinstance(n.iter.elts[0],ast.Constant) and n.iter.elts[0].value=='valid']
assert len(rows)==1
row=rows[0];names=ast.literal_eval(row.iter)
assert len(names)==len(set(names))==29
for required in ['stale_parent','arbitrary_descendant','multiple_parents','merge_parent_substitution']:
    assert required in names
code=compile(ast.Module(body=[row],type_ignores=[]),'actual-ci-parent-case-accounting','exec')
lines=['ok '+str(i+1)+' - governed runtime successor: '+name for i,name in enumerate(names)]
for text,accepted in [('\n'.join(lines),True),('\n'.join(lines[1:]),False),('\n'.join(lines+[lines[0]]),False),('\n'.join(lines).replace('ok 1 -','not ok 1 -'),False),('\n'.join([lines[0]+' # SKIP']+lines[1:]),False)]:
    try:exec(code,{'text':text,'re':re})
    except AssertionError:assert not accepted
    else:assert accepted
print(json.dumps({'PASS':True,'cases':29}))
`;
 const result=spawnSync('python3',['-c',model],{encoding:'utf8',input:JSON.stringify({summary:ciPython[2]})});assert.equal(result.status,0,result.stderr);
});

for(const name of ['valid','wrong_parent','arbitrary_descendant','extra_path','missing_path','duplicate_path','wrong_sha','missing_event','wrong_event','local_impersonation'])test('G5 hosted lineage: '+name,()=>{
 const result=spawnSync('python3',['-c',runtimeGuardModel],{cwd:repositoryRoot,encoding:'utf8',timeout:60000,input:JSON.stringify({case:name,delta:runtimeRepairExpectedDelta,g5Delta:g5HostedExpectedDelta,implementationDelta:runtimeExpectedDelta,guard:ciPython[0]})});
 assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.equal(value.accepted,name==='valid',JSON.stringify(value));
});
