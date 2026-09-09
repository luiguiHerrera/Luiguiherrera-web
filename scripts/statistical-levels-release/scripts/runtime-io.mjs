import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, need, canonical, sha, verifyOIDC, resolvePreview, validateRun, requestFor, validateControllerRequest,
  validateRunMetadata, validateAncestry, validateAttestation, selectTarget, ADOPT, validateQAAge } from './release-core.mjs';

export const packageRoot = path.resolve(import.meta.dirname, '..');
export const codeRoot = path.resolve(packageRoot, '../..');
export const candidateRoot = path.join(codeRoot, '.release-candidate');
export const execution = (env = process.env) => ({ id: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, execution_sha: env.GITHUB_SHA });
export function git(...args) { return execFileSync('git', args, { cwd: codeRoot, stdio: ['ignore', 'pipe', 'pipe'] }); }
export async function github(relative) {
  need([/^\/actions\/runs\/[1-9][0-9]*(?:\/attempts\/[1-9][0-9]*\/jobs\?per_page=100)?$/, /^\/git\/ref\/heads\/vercel-deployment$/, /^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}\?per_page=1$/, /^\/deployments\?sha=[a-f0-9]{40}&per_page=100$/, /^\/deployments\/[1-9][0-9]*\/statuses\?per_page=100$/, /^\/commits\/[a-f0-9]{40}\/statuses\?per_page=100$/].some(pattern => pattern.test(relative)), 'GITHUB_PATH');
  const response = await fetch('https://api.github.com/repos/' + P.repository + relative, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  need(response.ok, 'GITHUB_PUBLIC_VERIFICATION_UNAVAILABLE');
  const text = await response.text(); need(text.length < 2_000_000, 'GITHUB_RESPONSE_SIZE');
  return JSON.parse(text);
}
export async function assertWorkflow(env = process.env) {
  const frozen = JSON.parse(await fs.readFile(path.join(packageRoot, 'workflow-freeze.json'), 'utf8'));
  need(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''), 'WORKFLOW_EXECUTION_SHA');
  let bytes;
  try { bytes = git('show', env.GITHUB_SHA + ':' + P.workflow_path); }
  catch { throw new Error('WORKFLOW_CONTENT_UNAVAILABLE_AT_EXECUTION_SHA'); }
  validateRun(env, bytes, frozen);
  need((await fs.readFile(path.join(codeRoot, P.workflow_path))).equals(bytes), 'CHECKOUT_WORKFLOW_DRIFT');
  const bundle = JSON.parse(await fs.readFile(path.join(packageRoot, 'source-manifest.json'), 'utf8'));
  for (const [name, expected] of Object.entries(bundle)) {
    need(!name.includes('..') && !path.isAbsolute(name), 'SOURCE_MANIFEST_PATH');
    const stat = await fs.lstat(path.join(packageRoot, name)); need(stat.isFile() && !stat.isSymbolicLink(), 'SOURCE_SYMLINK');
    need(sha(await fs.readFile(path.join(packageRoot, name))) === expected, 'SOURCE_BUNDLE_MISMATCH');
  }
  const event = JSON.parse(await fs.readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  const target = selectTarget(event.inputs ?? {});
  const run = execution(env);
  validateRunMetadata(await github('/actions/runs/' + run.id), run);
  const tip = await github('/git/ref/heads/' + P.branch);
  need(tip.object.sha === run.execution_sha, 'WORKFLOW_BRANCH_DRIFT');
  validateAncestry(await github('/compare/' + target.candidate_git_sha + '...' + run.execution_sha + '?per_page=1'), run.execution_sha, target.candidate_git_sha);
  return { ...frozen, target };
}
export async function oidc(audience, env = process.env) {
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  need(url.protocol === 'https:' && url.hostname.endsWith('.actions.githubusercontent.com') && !url.username && !url.password, 'OIDC_REQUEST_ORIGIN');
  url.searchParams.set('audience', audience);
  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Authorization: 'Bearer ' + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN } });
  need(res.ok, 'OIDC_REQUEST_FAILED');
  const token = (await res.json()).value;
  const keys = await fetch(P.issuer + '/.well-known/jwks', { redirect: 'error', signal: AbortSignal.timeout(30000) });
  need(keys.ok, 'OIDC_JWKS_FAILED');
  verifyOIDC(token, await keys.json(), audience, env, Math.floor(Date.now() / 1000));
  return token;
}
export async function deployment(target) {
  if (target.operation === ADOPT) return target; // Exact immutable baseline tuple; controller independently resolves current Vercel Production.
  const [list, commits] = await Promise.all([
    github('/deployments?sha=' + target.candidate_git_sha + '&per_page=100'),
    github('/commits/' + target.candidate_git_sha + '/statuses?per_page=100')]);
  need(Array.isArray(list) && list.length < 100, 'DEPLOYMENT_METADATA_INCOMPLETE');
  const statusSets = {};
  for (const item of list) {
    need(Number.isSafeInteger(item.id) && item.id > 0, 'GITHUB_DEPLOYMENT_ID');
    if (item.sha === target.candidate_git_sha && item.environment === 'Preview' && item.production_environment === false)
      statusSets[String(item.id)] = await github('/deployments/' + item.id + '/statuses?per_page=100');
  }
  return resolvePreview(list, statusSets, commits, target);
}
export async function emitAttestation(envelope, target, env = process.env) {
  validateAttestation(envelope, execution(env), target, envelope.workflow_sha256);
  const serialized = canonical(envelope).toString(); need(serialized.length < 60000, 'ATTESTATION_SIZE');
  // Non-secret runner outputs. Their digest is anchored by a server-owned completed job name.
  await fs.appendFile(env.GITHUB_OUTPUT, 'qa_envelope=' + serialized + '\nqa_payload_sha256=' + envelope.controller_payload_sha256 + '\n');
}
export async function prepareInvocation(env = process.env) {
  const frozen = await assertWorkflow(env), run = execution(env);
  need(/^[a-f0-9]{64}$/.test(env.SL_QA_PAYLOAD_SHA256 ?? '') && typeof env.SL_QA_ENVELOPE === 'string' && env.SL_QA_ENVELOPE.length < 60000, 'QA_OUTPUT_FORMAT');
  const envelope = JSON.parse(env.SL_QA_ENVELOPE);
  need(envelope.controller_payload_sha256 === env.SL_QA_PAYLOAD_SHA256, 'QA_OUTPUT_MISMATCH');
  validateQAAge(envelope.timestamp, frozen.target.operation);
  const jobs = await github('/actions/runs/' + run.id + '/attempts/' + run.attempt + '/jobs?per_page=100');
  const request = requestFor(envelope, jobs, run, frozen.workflow_sha256, frozen.target);
  await oidc(P.aws_audience, env); // Validate actual default subject before assuming the dedicated role.
  return request;
}
export async function writeRequest(request, destination) {
  validateControllerRequest(request);
  await fs.writeFile(destination, canonical(request), { mode: 0o600 });
}
