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
    deployments: [{ id: 101, creator, sha: fixture.git_sha, environment: 'Preview', production_environment: false }],
    commits: [{ id: 303, creator, context: 'Vercel', target_url: P.vercel_details_base_url + fixture.deployment_id.slice(4), state: 'success', updated_at: at }],
    statuses: [{ id: 202, creator, state: 'success', environment: 'Preview', updated_at: at,
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
  const data = metadata();data.statuses.push({ ...data.statuses[0], id: 203, state: 'inactive' });
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

// Execute the workflow's Python, not a duplicate lineage implementation. Git responses
// model an uncommitted future E; all predecessor/product blobs come from real Git.
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const ciText = await fs.readFile(new URL('../../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const ciPython = [...ciText.matchAll(/^          python3 - <<'PYCODE'\n([\s\S]*?)^          PYCODE$/gm)]
  .map(match => match[1].split('\n').map(line => line.replace(/^ {10}/, '')).join('\n'));
assert.equal(ciPython.length, 3, 'Expected actual binding, integrity and accounting programs');
const successorModel = String.raw`
import json,sys,os,hashlib,subprocess,tempfile,contextlib,io
from pathlib import Path
from unittest.mock import patch
payload=json.load(sys.stdin); case=payload['case']; root=Path.cwd()
R='c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1'; M='e7872b9c0e5bb0be3e090fbe2c5b930d68dcbece'
C='0c8fce262fce44650729883862ec948778ebea45'; P='c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f'; E='f'*40
original_output=subprocess.check_output; original_run=subprocess.run
original_bytes=Path.read_bytes; original_text=Path.read_text
allowed=['.github/workflows/ci.yml','.github/workflows/statistical-levels-release.yml',
'scripts/statistical-levels-release/probe-fixture.json',
'scripts/statistical-levels-release/tests/probe-fixture-registry.test.mjs',
'scripts/statistical-levels-release/source-manifest.json',
'scripts/statistical-levels-release/SOURCE_SHA256SUMS',
'scripts/statistical-levels-release/workflow-freeze.json']
assert original_output(['git','show','-s','--format=%P',R]).decode().strip()==M
assert original_output(['git','show','-s','--format=%P',M]).decode().strip().split()==[C,P]
for ancestor in [M,C,P]: original_run(['git','merge-base','--is-ancestor',ancestor,R],check=True)
ancestry=[]
def output(args,**kwargs):
    if args==['git','rev-parse','HEAD']: value=E.encode()+b'\n'
    elif args==['git','show','-s','--format=%P','HEAD']:
        parents={'unrelated':['a'*40],'sibling':[M],'stale':[C],'grandchild':['b'*40],'multiple_parents':[R,M]}.get(case,[R])
        value=(' '.join(parents)+'\n').encode()
    elif args==['git','show','-s','--format=%P',R]: value=((C if case=='wrong_predecessor_parent' else M)+'\n').encode()
    elif args==['git','show','-s','--format=%P',M]: value=(' '.join([P,C] if case=='reversed_anchor' else [C,P])+'\n').encode()
    elif args==['git','diff','--raw','--no-abbrev','--no-renames','-z',R,'HEAD','--']:
        names=allowed+(['unreviewed.txt'] if case=='unreviewed_path' else [])
        if case=='missing_delta': names=names[:-1]
        value=b''.join((':100644 '+('100755' if case=='changed_mode' else '100644')+' '+'a'*40+' '+'b'*40+' M\0'+name+'\0').encode() for name in names)
    elif args==['git','show',R+':components/layout/Footer.tsx'] and case=='wrong_preview_input': value=b'incorrect Preview bytes'
    else: return original_output(args,**kwargs)
    return value.decode() if kwargs.get('text') else value

def run(args,**kwargs):
    if args[:2] in [['git','show'],['git','ls-files']]: return original_run(args,**kwargs)
    if args[:3]==['git','diff','--exit-code']:
        if case=='dirty': raise subprocess.CalledProcessError(1,args)
        return subprocess.CompletedProcess(args,0)
    if args[:3]==['git','merge-base','--is-ancestor']:
        assert args[3] in [R,M,C,P] and args[4]==E
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
        value=json.dumps(data).encode()
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
            assert subject['parents']==[R] and subject['lineage']['qualified_predecessor_parents']==[M]
            assert subject['lineage']['merge_anchor_parents']==[C,P] and ancestry==[R,M,C,P]
        if case in ['stale_run','stale_attempt']:
            subject['run_id' if case=='stale_run' else 'run_attempt']='999'
            (Path(directory)/'subject.json').write_text(json.dumps(subject))
            tail=payload['summary'][payload['summary'].index("subject=json.loads"):]
            with patch.dict(os.environ,env),patch('subprocess.check_output',output),contextlib.redirect_stdout(io.StringIO()):
                exec(compile(tail,'actual-ci-summary','exec'),{'out':Path(directory),'root':root,'summary':{},'after':{},'json':json,'os':os,'subprocess':subprocess,'hashlib':hashlib})
        if case in ['wrong_sums','wrong_workflow']:
            # Use the qualified predecessor's stored bytes, without rebuilding or
            # writing any derived artifact; tamper only at the read boundary.
            def predecessor_bytes(path):
                name=str(path.relative_to(root))
                value=original_output(['git','show',R+':'+name])
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
      input: JSON.stringify({ case: name, guard: ciPython[0], integrity: ciPython[1], summary: ciPython[2] }),
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    const output = JSON.parse(result.stdout);
    assert.equal(output.accepted, expectedError === null, JSON.stringify(output));
    if (expectedError !== null) assert.ok(output.error.includes(expectedError), JSON.stringify(output));
  });
}
