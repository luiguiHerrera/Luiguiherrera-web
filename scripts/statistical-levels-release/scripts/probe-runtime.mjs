import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, need, sha, validateRun, validateRunMetadata, validateAncestry, verifyOIDC } from './release-core.mjs';
import { selectProbeTarget, resolveProbePreview, validateProbeRoleIdentity } from './probe-core.mjs';

export const packageRoot = path.resolve(import.meta.dirname, '..');
export const codeRoot = path.resolve(packageRoot, '../..');
export const candidateRoot = path.join(codeRoot, '.identity-probe-candidate');
export const execution = (env = process.env) => ({ id: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, execution_sha: env.GITHUB_SHA });

// Public metadata only. No operator-provided endpoint or GitHub credential is accepted.
export async function probeGithub(relative) {
  need([/^\/actions\/runs\/[1-9][0-9]*$/, /^\/git\/ref\/heads\/vercel-deployment$/,
    /^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}\?per_page=1$/,
    /^\/deployments\?sha=[a-f0-9]{40}&per_page=100$/,
    /^\/deployments\/[1-9][0-9]*\/statuses\?per_page=100$/,
    /^\/commits\/[a-f0-9]{40}\/statuses\?per_page=100$/].some(pattern => pattern.test(relative)), 'PROBE_GITHUB_PATH');
  const response = await fetch('https://api.github.com/repos/' + P.repository + relative, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  need(response.ok, 'PROBE_PUBLIC_METADATA_UNAVAILABLE');
  const text = await response.text(); need(text.length < 2_000_000, 'PROBE_METADATA_SIZE');
  return JSON.parse(text);
}

export async function assertProbeWorkflow(env = process.env) {
  const frozen = JSON.parse(await fs.readFile(path.join(packageRoot, 'workflow-freeze.json'), 'utf8'));
  need(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? ''), 'WORKFLOW_EXECUTION_SHA');
  // The only Git subprocess is a read of the pinned workflow blob.
  const bytes = execFileSync('git', ['show', env.GITHUB_SHA + ':' + P.workflow_path], { cwd: codeRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  validateRun(env, bytes, frozen);
  need((await fs.readFile(path.join(codeRoot, P.workflow_path))).equals(bytes), 'CHECKOUT_WORKFLOW_DRIFT');
  const bundle = JSON.parse(await fs.readFile(path.join(packageRoot, 'source-manifest.json'), 'utf8'));
  for (const [name, expected] of Object.entries(bundle)) {
    need(!name.includes('..') && !path.isAbsolute(name), 'SOURCE_MANIFEST_PATH');
    const stat = await fs.lstat(path.join(packageRoot, name));
    need(stat.isFile() && !stat.isSymbolicLink(), 'SOURCE_SYMLINK');
    need(sha(await fs.readFile(path.join(packageRoot, name))) === expected, 'SOURCE_BUNDLE_MISMATCH');
  }
  const event = JSON.parse(await fs.readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  const target = selectProbeTarget(event.inputs ?? {}), run = execution(env);
  validateRunMetadata(await probeGithub('/actions/runs/' + run.id), run);
  const tip = await probeGithub('/git/ref/heads/' + P.branch);
  need(tip.object.sha === run.execution_sha, 'WORKFLOW_BRANCH_DRIFT');
  validateAncestry(await probeGithub('/compare/' + target.candidate_git_sha + '...' + run.execution_sha + '?per_page=1'), run.execution_sha, target.candidate_git_sha);
  return { ...frozen, target };
}

export async function resolveProbeDeployment(target) {
  const [deployments, commits] = await Promise.all([
    probeGithub('/deployments?sha=' + target.candidate_git_sha + '&per_page=100'),
    probeGithub('/commits/' + target.candidate_git_sha + '/statuses?per_page=100')]);
  need(Array.isArray(deployments) && deployments.length < 100, 'DEPLOYMENT_METADATA_INCOMPLETE');
  const statuses = {};
  for (const item of deployments) {
    need(Number.isSafeInteger(item.id) && item.id > 0, 'GITHUB_DEPLOYMENT_ID');
    if (item.sha === target.candidate_git_sha && item.environment === 'Preview' && item.production_environment === false)
      statuses[String(item.id)] = await probeGithub('/deployments/' + item.id + '/statuses?per_page=100');
  }
  return resolveProbePreview(deployments, statuses, commits, target);
}

export async function probeOIDC(audience, env = process.env) {
  need([P.vercel_audience, P.aws_audience].includes(audience), 'PROBE_OIDC_AUDIENCE');
  const url = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  need(url.protocol === 'https:' && url.hostname.endsWith('.actions.githubusercontent.com') && !url.username && !url.password, 'OIDC_REQUEST_ORIGIN');
  url.searchParams.set('audience', audience);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Authorization: 'Bearer ' + env.ACTIONS_ID_TOKEN_REQUEST_TOKEN } });
  need(response.ok, 'OIDC_REQUEST_FAILED');
  const token = (await response.json()).value;
  const keys = await fetch(P.issuer + '/.well-known/jwks', { redirect: 'error', signal: AbortSignal.timeout(30000) });
  need(keys.ok, 'OIDC_JWKS_FAILED');
  verifyOIDC(token, await keys.json(), audience, env, Math.floor(Date.now() / 1000));
  return token;
}

// No service/operation/function/role argument is accepted. No invocation import exists.
export function readProbeRoleIdentity(run, env = process.env) {
  need(env.AWS_REGION === 'eu-south-2' && env.AWS_SESSION_TOKEN && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY, 'AWS_SESSION_REQUIRED');
  const identity = JSON.parse(execFileSync('aws', ['sts', 'get-caller-identity', '--region', 'eu-south-2',
    '--output', 'json', '--no-cli-pager', '--cli-connect-timeout', '10', '--cli-read-timeout', '30'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000,
    env: { PATH: env.PATH, AWS_REGION: 'eu-south-2', AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN: env.AWS_SESSION_TOKEN,
      AWS_MAX_ATTEMPTS: '1', AWS_PAGER: '', AWS_EC2_METADATA_DISABLED: 'true',
      AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' } }));
  return validateProbeRoleIdentity(identity, run);
}
