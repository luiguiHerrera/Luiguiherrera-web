// Registration narrows PROBE inputs. It does not replace live GitHub/Vercel-bot status proof.
import fs from 'node:fs/promises';
import { P, need, exactKeys, sha, verifiedOrigin } from './release-core.mjs';

const FILE = new URL('../probe-fixture.json', import.meta.url);
const MANIFEST = new URL('../source-manifest.json', import.meta.url);
const FIELDS = ['deployment_id', 'git_sha', 'origin', 'project', 'environment'];
const TARGET_FIELDS = ['operation', 'phase', 'candidate_git_sha', 'deployment_id'];

export function validateRegisteredProbeFixture(value) {
  exactKeys(value, FIELDS, 'PROBE_FIXTURE_REGISTRY_FIELDS');
  need(Object.values(Object.getOwnPropertyDescriptors(value)).every(d => 'value' in d && typeof d.value === 'string'), 'PROBE_FIXTURE_REGISTRY_VALUES');
  need(/^[a-f0-9]{40}$/.test(value.git_sha) && /^dpl_[a-zA-Z0-9]{10,80}$/.test(value.deployment_id), 'PROBE_FIXTURE_REGISTRY_IDENTITY');
  need(value.project === new URL(P.vercel_details_base_url).pathname.split('/').filter(Boolean).at(-1), 'PROBE_FIXTURE_REGISTRY_PROJECT');
  need(value.environment === 'Preview', 'PROBE_FIXTURE_REGISTRY_ENVIRONMENT');
  need(verifiedOrigin(value.origin, 'preview') === value.origin, 'PROBE_FIXTURE_REGISTRY_ORIGIN');
  return Object.freeze(Object.fromEntries(FIELDS.map(key => [key, value[key]])));
}

export async function readRegisteredProbeFixture() {
  const stat = await fs.lstat(FILE);
  need(stat.isFile() && !stat.isSymbolicLink() && stat.size < 4096, 'PROBE_FIXTURE_REGISTRY_FILE');
  const bytes = await fs.readFile(FILE);
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  need(typeof manifest['probe-fixture.json'] === 'string' && /^[a-f0-9]{64}$/.test(manifest['probe-fixture.json']) &&
    sha(bytes) === manifest['probe-fixture.json'], 'PROBE_FIXTURE_REGISTRY_HASH');
  return validateRegisteredProbeFixture(JSON.parse(bytes.toString('utf8')));
}

export function requireRegisteredProbeTarget(target, fixture) {
  const registered = validateRegisteredProbeFixture(fixture);
  exactKeys(target, TARGET_FIELDS, 'PROBE_UNRESOLVED_TARGET');
  need(target.operation === 'PROBE_IDENTITY' && target.phase === 'preview', 'PROBE_FIXTURE_REGISTRY_OPERATION');
  need(target.candidate_git_sha === registered.git_sha, 'PROBE_UNREGISTERED_GIT_SHA');
  need(target.deployment_id === registered.deployment_id, 'PROBE_UNREGISTERED_DEPLOYMENT');
  return registered;
}

export function requireRegisteredProbeResolution(target, fixture) {
  const registered = validateRegisteredProbeFixture(fixture);
  need(target?.operation === 'PROBE_IDENTITY' && target.phase === 'preview', 'PROBE_FIXTURE_REGISTRY_OPERATION');
  need(target.candidate_git_sha === registered.git_sha, 'PROBE_UNREGISTERED_GIT_SHA');
  need(target.deployment_id === registered.deployment_id, 'PROBE_UNREGISTERED_DEPLOYMENT');
  need(target.origin === registered.origin, 'PROBE_UNREGISTERED_ORIGIN');
  return target;
}
