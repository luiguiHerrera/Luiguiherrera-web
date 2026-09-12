import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
    deployment_id: 'dpl_8iA33DzPN63dNoD9Hk6puJjc5XwH', git_sha: '4ee6adb006f360fea13837db5f7d45815f297b55',
    origin: 'https://luiguiherrera-ddqf0dzk8-luigui-herrera-s-projects.vercel.app', project: 'luiguiherrera-web', environment: 'Preview',
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
