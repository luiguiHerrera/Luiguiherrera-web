// Registration narrows PROBE inputs. It does not replace live GitHub/Vercel-bot status proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P, need, exactKeys, sha, verifiedOrigin } from './release-core.mjs';

const FILE = new URL('../probe-fixture.json', import.meta.url);
const MANIFEST = new URL('../source-manifest.json', import.meta.url);
const FIELDS = ['deployment_id', 'git_sha', 'origin', 'project', 'environment'];
const TARGET_FIELDS = ['operation', 'phase', 'candidate_git_sha', 'deployment_id'];
export const REGISTERED_PROBE_INPUT_SHA256='d7a8470700b59ed501502e96cc10cba3de8f79824847ed72706f9942c8473621';
const PROBE_INPUTS=new URL('../probe-source-inputs.json',import.meta.url);
const issuedInputManifests=new WeakMap();
const historicalProbe=Object.freeze({git_sha:'c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1',deployment_id:'dpl_6wA7tYMv6yNhoMQJDXN3S9JXWw9J',origin:'https://luiguiherrera-7vs8qeq5j-luigui-herrera-s-projects.vercel.app',project:'luiguiherrera-web',environment:'Preview'});

export async function readRegisteredProbeInputManifest(target) {
  const fixture=await readRegisteredProbeFixture();
  for(const field of FIELDS)need(fixture[field]===historicalProbe[field],'PROBE_HISTORICAL_FIXTURE_CHANGED');
  requireRegisteredProbeResolution(target,fixture);
  const stat=await fs.lstat(PROBE_INPUTS);
  need(stat.isFile()&&!stat.isSymbolicLink(),'PROBE_INPUT_FILE');
  need(await fs.realpath(PROBE_INPUTS)===fileURLToPath(PROBE_INPUTS),'PROBE_INPUT_SYMLINK');
  const bytes=await fs.readFile(PROBE_INPUTS);
  need(sha(bytes)===REGISTERED_PROBE_INPUT_SHA256,'PROBE_HISTORICAL_INPUT_SHA');
  const inputs=JSON.parse(bytes.toString('utf8'));
  need(Object.keys(inputs).length===41,'PROBE_HISTORICAL_INPUT_COUNT');
  for(const [file,hash] of Object.entries(inputs)) {
    need(typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash),'PROBE_INPUT_HASH_FORMAT');
    need(!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(p=>p&&p!=='.'&&p!=='..'),'PROBE_INPUT_PATH');
  }
  const handle=Object.freeze({role:'PROBE_IDENTITY',manifest_sha256:REGISTERED_PROBE_INPUT_SHA256});
  issuedInputManifests.set(handle,Object.freeze(inputs));
  return handle;
}

export function requireRegisteredProbeInputManifest(handle,target) {
  requireRegisteredProbeResolution(target,historicalProbe);
  need(handle&&issuedInputManifests.has(handle),'PROBE_INPUT_ROLE');
  return issuedInputManifests.get(handle);
}

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
