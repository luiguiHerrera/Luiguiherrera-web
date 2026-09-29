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
const successorModel = String.raw`
import json,sys,os,hashlib,subprocess,tempfile,contextlib,io
from pathlib import Path
from unittest.mock import patch
payload=json.load(sys.stdin); case=payload['case']; root=Path.cwd(); repair=payload.get('repair',False)
R='c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1'; M='e7872b9c0e5bb0be3e090fbe2c5b930d68dcbece'
C='0c8fce262fce44650729883862ec948778ebea45'; P='c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f'; E='f'*40
B='f7e3fe8e3e3cd8bdea753873c31d78f146cdc923'; direct=B if repair else R
original_output=subprocess.check_output; original_run=subprocess.run
original_bytes=Path.read_bytes; original_text=Path.read_text
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
        with patch.dict(os.environ,env),patch('subprocess.check_output',output),patch('subprocess.run',run),patch.object(Path,'read_bytes',read_bytes),contextlib.redirect_stdout(io.StringIO()):
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
            with patch.dict(os.environ,env),patch('subprocess.check_output',output),contextlib.redirect_stdout(io.StringIO()):
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
            with patch.dict(os.environ,env),patch('subprocess.check_output',output),contextlib.redirect_stdout(io.StringIO()):
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
            with patch.object(Path,'read_bytes',predecessor_bytes),patch.object(Path,'read_text',predecessor_text),contextlib.redirect_stdout(io.StringIO()):
                exec(compile(payload['integrity'],'actual-ci-integrity','exec'),{})
        print(json.dumps({'accepted':True}))
    except (AssertionError,subprocess.CalledProcessError) as error:
        print(json.dumps({'accepted':False,'error':str(error)}))
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
      input: JSON.stringify({ case: name, repair: true, guard: ciPython[0], integrity: ciPython[1], summary: ciPython[2] }),
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
        guard: ciPython[0], integrity: ciPython[1], summary: ciPython[2] }),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const output = JSON.parse(result.stdout);
    assert.equal(output.accepted, expectedError === null, JSON.stringify(output));
    if (expectedError !== null) assert.ok(output.error.includes(expectedError), JSON.stringify(output));
  });
}
