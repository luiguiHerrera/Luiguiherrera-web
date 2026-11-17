import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { P, need, canonical, sha, resolvePreview, validateRun, requestFor, validateControllerRequest,
  validateRunMetadata, validateAncestry, validateAttestation, selectTarget, ADOPT, PROMOTE, validateQAAge, productionTarget, certificationRequest } from './release-core.mjs';

import { evaluateProbeOIDC } from './probe-oidc.mjs';

export const packageRoot = path.resolve(import.meta.dirname, '..');
export const codeRoot = path.resolve(packageRoot, '../..');
export const candidateRoot = path.join(codeRoot, '.release-candidate');
export const execution = (env = process.env) => ({ id: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, execution_sha: env.GITHUB_SHA });
export function git(...args) { return execFileSync('git', args, { cwd: codeRoot, stdio: ['ignore', 'pipe', 'pipe'] }); }
export async function github(relative) {
  need([/^\/check-runs\/[1-9][0-9]*$/, /^\/commits\/[a-f0-9]{40}\/check-runs\?check_name=statistical-levels-published&per_page=100$/, /^\/commits\/[a-f0-9]{40}$/, /^\/actions\/runs\/[1-9][0-9]*(?:\/attempts\/[1-9][0-9]*\/jobs\?per_page=100)?$/, /^\/git\/ref\/heads\/vercel-deployment$/, /^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}\?per_page=1$/, /^\/deployments\?sha=[a-f0-9]{40}&per_page=100$/, /^\/deployments\/[1-9][0-9]*\/statuses\?per_page=100$/, /^\/commits\/[a-f0-9]{40}\/statuses\?per_page=100$/].some(pattern => pattern.test(relative)), 'GITHUB_PATH');
  const response = await fetch('https://api.github.com/repos/' + P.repository + relative, {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  need(response.ok, 'GITHUB_PUBLIC_VERIFICATION_UNAVAILABLE');
  const text = await response.text(); need(text.length < 2_000_000, 'GITHUB_RESPONSE_SIZE');
  return JSON.parse(text);
}
// Preserve every legacy input value/error; strip only GitHub's known empty probe defaults.
export function normalizeReleaseInputs(inputs) {
  const keys = ['probe_git_sha', 'probe_deployment_id', 'transition_request'];
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || !keys.some(key => Object.hasOwn(inputs, key))) return inputs;
  const releaseInputs = { ...inputs };
  for (const key of keys) {
    if (Object.hasOwn(releaseInputs, key)) {
      need(releaseInputs[key] === '', 'RELEASE_PROBE_INPUT_FORBIDDEN');
      delete releaseInputs[key];
    }
  }
  return releaseInputs;
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
  const target = selectTarget(normalizeReleaseInputs(event.inputs ?? {}));
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
  const evidence = evaluateProbeOIDC(token, await keys.json(), audience, env, Math.floor(Date.now() / 1000));
  need(evidence.result === 'PASS', evidence.error_code);
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
  if (frozen.target.resume_production_deployment_id) request.observe_production_deployment_id = frozen.target.resume_production_deployment_id;
  validateControllerRequest(request);
  return request;
}
export async function writeRequest(request, destination) {
  validateControllerRequest(request);
  await fs.writeFile(destination, canonical(request), { mode: 0o600 });
}

export async function githubWrite(endpoint, body, env = process.env) {
  need(endpoint === '/check-runs' || endpoint === '/actions/workflows/353998515/dispatches', 'GITHUB_WRITE_ENDPOINT');
  need(typeof env.GH_TOKEN === 'string' && env.GH_TOKEN.length > 0, 'GITHUB_JOB_TOKEN_REQUIRED');
  // No retries: an ambiguous mutation requires inspection of its existing result.
  const response = await fetch('https://api.github.com/repos/' + P.repository + endpoint, {
    method:'POST', redirect:'error', signal:AbortSignal.timeout(30000),
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
      Authorization:'Bearer ' + env.GH_TOKEN,'Content-Type':'application/json'},body:canonical(body)});
  need(response.status === (endpoint === '/check-runs' ? 201 : 204), 'GITHUB_WRITE_NOT_CONFIRMED_NO_RETRY');
  return response.status === 204 ? null : response.json();
}

export async function createEvidenceCheck(name, payload, env = process.env) {
  need(['statistical-levels-production-qa','statistical-levels-published'].includes(name), 'EVIDENCE_CHECK_NAME');
  const text=canonical(payload).toString(); need(text.length < 60000, 'EVIDENCE_CHECK_SIZE');
  const check = await githubWrite('/check-runs',{name,head_sha:env.GITHUB_SHA,external_id:env.GITHUB_RUN_ID,
    status:'completed',conclusion:'success',completed_at:new Date().toISOString(),
    output:{title:name,summary:'Exact controlled release evidence; see canonical payload.',text}},env);
  need(check.app?.slug === 'github-actions' && check.name === name && check.head_sha === env.GITHUB_SHA &&
    check.external_id === env.GITHUB_RUN_ID && check.conclusion === 'success' && check.output?.text === text, 'EVIDENCE_CHECK_READBACK');
  return check;
}

export async function runProductionQA(env = process.env) {
  const frozen=await assertWorkflow(env), run=execution(env);
  const observed=JSON.parse(env.SL_PRODUCTION_STAGE);
  const inputManifest=JSON.parse(await fs.readFile(path.join(packageRoot,'source-inputs.json'),'utf8'));
  const {verifyInputs,runCandidateQA}=await import('./preview-qa.mjs');
  const authority=await verifyInputs(candidateRoot,inputManifest,frozen.target);
  const target=productionTarget(frozen.target,authority,observed);
  const out=path.join(env.RUNNER_TEMP,'statistical-levels-production-qa');
  const report=await runCandidateQA({target,out,codeRoot:candidateRoot,inputManifest});
  const {attest}=await import('./release-core.mjs');
  const envelope=attest(report,run,target,frozen.workflow_sha256,new Date().toISOString());
  need(Date.parse(envelope.timestamp) >= observed.ready_at_ms, 'QA_BEFORE_PRODUCTION_READY');
  await fs.writeFile(path.join(out,'qa-attestation.json'),canonical(envelope),{mode:0o600});
  const check=await createEvidenceCheck('statistical-levels-production-qa',envelope.controller_payload,env);
  await fs.appendFile(env.GITHUB_OUTPUT,'production_envelope='+canonical(envelope).toString()+'\nproduction_check_id='+check.id+'\nproduction_payload_sha256='+envelope.controller_payload_sha256+'\n');
}

export async function prepareCertification(env = process.env) {
  const frozen=await assertWorkflow(env), preview=await prepareInvocation(env);
  delete preview.observe_production_deployment_id;
  need(/^[1-9][0-9]*$/.test(env.SL_PRODUCTION_CHECK_ID ?? ''), 'PRODUCTION_CHECK_ID');
  return certificationRequest(preview,JSON.parse(env.SL_PRODUCTION_ENVELOPE),
    await github('/check-runs/'+env.SL_PRODUCTION_CHECK_ID),execution(env),frozen.workflow_sha256,JSON.parse(env.SL_PRODUCTION_STAGE));
}

export async function sealPublication(env = process.env) {
  const frozen=await assertWorkflow(env);
  const receipt=JSON.parse(await fs.readFile(path.join(env.RUNNER_TEMP,'statistical-levels-published-receipt.json'),'utf8'));
  need(receipt.state === 'PUBLISHED' && receipt.execution_sha === env.GITHUB_SHA && receipt.id === env.GITHUB_RUN_ID &&
    receipt.workflow_sha256 === frozen.workflow_sha256 && receipt.candidate_git_sha === frozen.target.candidate_git_sha &&
    /^[a-f0-9]{64}$/.test(receipt.marker_sha256), 'PUBLICATION_RECEIPT_BINDING');
  await createEvidenceCheck('statistical-levels-published',receipt,env);
}

export async function dispatchCertifiedDaily(env = process.env) {
  const {validateDailyCI,publishedCheck}=await import('./release-core.mjs');
  need(env.SL_DAILY_PUBLICATION === 'APPROVED_AFTER_FIRST_PUBLISHED' && /^[1-9][0-9]*$/.test(env.SL_FIRST_PUBLISHED_CHECK_ID ?? ''), 'DAILY_PUBLICATION_DISABLED');
  need(env.GITHUB_EVENT_NAME === 'workflow_run' && env.GITHUB_REF === 'refs/heads/'+P.branch && env.GITHUB_REPOSITORY === P.repository, 'DAILY_TRIGGER');
  const event=JSON.parse(await fs.readFile(env.GITHUB_EVENT_PATH,'utf8'));
  need(event.action === 'completed' && event.workflow_run?.workflow_id === 336203586 && event.workflow_run.head_sha === env.GITHUB_SHA, 'DAILY_EVENT_SHA');
  const frozen=JSON.parse(await fs.readFile(path.join(packageRoot,'workflow-freeze.json'),'utf8'));
  need(sha(git('show',env.GITHUB_SHA+':'+P.workflow_path)) === frozen.workflow_sha256, 'DAILY_WORKFLOW_FREEZE');
  const ci=await github('/actions/runs/'+event.workflow_run.id);
  validateDailyCI(ci,await github('/actions/runs/'+ci.id+'/attempts/'+ci.run_attempt+'/jobs?per_page=100'),env.GITHUB_SHA);
  const proof=await github('/check-runs/'+env.SL_FIRST_PUBLISHED_CHECK_ID);
  const first=await verifiedPublished(proof,frozen.workflow_sha256);
  validateAncestry(await github('/compare/'+first.candidate_git_sha+'...'+env.GITHUB_SHA+'?per_page=1'),env.GITHUB_SHA,first.candidate_git_sha);
  const commit=await github('/commits/'+env.GITHUB_SHA);
  need(commit.sha === env.GITHUB_SHA && commit.parents.length === 1, 'DAILY_SINGLE_PARENT');
  const parent=commit.parents[0].sha;
  const checks=await github('/commits/'+parent+'/check-runs?check_name=statistical-levels-published&per_page=100');
  need(checks.total_count === checks.check_runs.length && checks.total_count === 1, 'DAILY_PREDECESSOR_CERTIFICATE');
  const previous=await verifiedPublished(checks.check_runs[0],frozen.workflow_sha256);
  const statuses=await github('/commits/'+env.GITHUB_SHA+'/statuses?per_page=100');
  need(Array.isArray(statuses) && statuses.length < 100, 'DAILY_PREVIEW_STATUS');
  const status=statuses.filter(s=>s.context === 'Vercel').sort((a,b)=>b.id-a.id)[0];
  need(status?.state === 'success' && status.target_url?.startsWith(P.vercel_details_base_url), 'DAILY_PREVIEW_NOT_READY');
  const inputs={operation:PROMOTE,candidate_git_sha:env.GITHUB_SHA,
    candidate_deployment_id:'dpl_'+status.target_url.slice(P.vercel_details_base_url.length),
    expected_previous_production_sha:previous.candidate_git_sha,
    expected_previous_production_deployment:previous.production_deployment_id,previous_publication_date:previous.publication_date};
  await deployment(selectTarget(inputs)); // Existing full GitHub/Vercel Preview binding.
  need((await github('/git/ref/heads/'+P.branch)).object.sha === env.GITHUB_SHA, 'DAILY_REF_MOVED');
  await githubWrite('/actions/workflows/353998515/dispatches',{ref:P.branch,inputs},env);
  process.stdout.write('DAILY_DISPATCH_ACCEPTED_UNCERTIFIED\n');
}

async function verifiedPublished(check, workflowHash) {
  const {publishedCheck}=await import('./release-core.mjs');
  need(/^[1-9][0-9]*$/.test(check.external_id ?? ''), 'PUBLISHED_RUN_ID');
  const run=await github('/actions/runs/'+check.external_id);
  need(/^[a-f0-9]{40}$/.test(run.head_sha), 'PUBLISHED_RUN_SHA');
  const response=await fetch('https://raw.githubusercontent.com/'+P.repository+'/'+run.head_sha+'/'+P.workflow_path,
    {redirect:'error',signal:AbortSignal.timeout(30000)});
  need(response.ok && sha(Buffer.from(await response.arrayBuffer())) === workflowHash, 'PUBLISHED_WORKFLOW_BYTES');
  return publishedCheck(check,run,workflowHash,await github('/actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100'));
}

// The same controlled workflow and invoker are used. No caller target or
// authority tuple is accepted for an extraordinary transition.
export function validateTransitionCheckReadback(check, body) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const metadata = ['url','html_url','details_url','node_id','started_at','check_suite','pull_requests','deployment'];
  const fields = ['name','head_sha','external_id','status','conclusion','completed_at'];
  const valid = object(check) && Number.isSafeInteger(check.id) && check.id > 0 &&
    object(check.app) && check.app.slug === 'github-actions' &&
    Object.keys(check).every(key => ['id','app','output',...fields,...metadata].includes(key)) &&
    fields.every(key => typeof check[key] === 'string' && check[key] === body[key]) &&
    object(check.output) && ['title','summary','text'].every(key =>
      typeof check.output[key] === 'string' && check.output[key] === body.output[key]) &&
    Object.keys(check.output).every(key => ['title','summary','text','annotations_count','annotations_url'].includes(key)) &&
    (!Object.hasOwn(check.output,'annotations_count') || Number.isSafeInteger(check.output.annotations_count) && check.output.annotations_count >= 0) &&
    (!Object.hasOwn(check.output,'annotations_url') || check.output.annotations_url ===
      'https://api.github.com/repos/'+P.repository+'/check-runs/'+check.id+'/annotations');
  need(valid,'TRANSITION_CHECK_READBACK');
  return check;
}

// GitHub returns Check timestamps at whole-second precision. Observe that instant
// before submitting it; never postdate QA or relax its freshness comparisons.
export async function transitionCheckTimestamp(qaTimestamp, clock, wait = ms => new Promise(resolve => setTimeout(resolve,ms))) {
  const {transitionUTC}=await import('./release-core.mjs');
  const earliest=Math.ceil(transitionUTC(qaTimestamp)/1000)*1000;
  let observed=transitionUTC(clock());
  if(observed<earliest){await wait(earliest-observed);observed=transitionUTC(clock());}
  need(Math.floor(observed/1000)*1000>=earliest,'TRANSITION_CHECK_CLOCK');
  return new Date(Math.floor(observed/1000)*1000).toISOString().replace('.000Z','Z');
}

export async function assertTransitionWorkflow(env = process.env) {
  const core=await import('./release-core.mjs');
  const frozen=JSON.parse(await fs.readFile(path.join(packageRoot,'workflow-freeze.json'),'utf8'));
  need(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA??''),'WORKFLOW_EXECUTION_SHA');
  const bytes=git('show',env.GITHUB_SHA+':'+P.workflow_path);
  validateRun(env,bytes,frozen);
  need((await fs.readFile(path.join(codeRoot,P.workflow_path))).equals(bytes),'CHECKOUT_WORKFLOW_DRIFT');
  const bundle=JSON.parse(await fs.readFile(path.join(packageRoot,'source-manifest.json'),'utf8'));
  for(const [name,hash] of Object.entries(bundle)) {
    need(!name.includes('..')&&!path.isAbsolute(name),'SOURCE_MANIFEST_PATH');
    const full=path.join(packageRoot,name),stat=await fs.lstat(full);
    need(stat.isFile()&&!stat.isSymbolicLink()&&sha(await fs.readFile(full))===hash,'SOURCE_BUNDLE_MISMATCH');
  }
  const event=JSON.parse(await fs.readFile(env.GITHUB_EVENT_PATH,'utf8'));
  const selection=core.selectTransition(event.inputs??{}),run=execution(env);
  validateRunMetadata(await github('/actions/runs/'+run.id),run);
  need((await github('/git/ref/heads/'+P.branch)).object.sha===run.execution_sha,'WORKFLOW_BRANCH_DRIFT');
  return {...frozen,selection,run};
}
export async function runTransitionMode(mode,env=process.env,ports={}) {
  const core=await import('./release-core.mjs');
  const frozen=await (ports.assertWorkflow??assertTransitionWorkflow)(env),{selection,run}=frozen;
  const clock=ports.clock??(()=>new Date().toISOString());
  const read=ports.github??github;
  const output=async values=>fs.appendFile(env.GITHUB_OUTPUT,Object.entries(values).map(([k,v])=>k+'='+v+'\n').join(''));
  const write=async request=>fs.writeFile(path.join(env.RUNNER_TEMP,'statistical-levels-release-request.json'),canonical(core.validateTransitionRequest(request)),{flag:'wx',mode:0o600});
  if(mode==='transition-prepare') {
    await (ports.oidc??oidc)(P.aws_audience,env);
    await write(core.transitionPrepareRequest(selection));
    await output({direction:selection.direction,requested_phase:selection.phase});
    return;
  }
  need(['transition-target','transition-qa','transition-certify'].includes(mode),'TRANSITION_MODE');
  need(selection.phase==='certify'&&typeof env.SL_TRANSITION_CONTEXT==='string'&&env.SL_TRANSITION_CONTEXT.length<60000,'TRANSITION_CONTEXT_ABSENT');
  const proof=JSON.parse(env.SL_TRANSITION_CONTEXT);
  const ctx=core.validateTransitionContext(proof,selection,run,frozen.workflow_sha256,Date.parse(clock()));
  const jobs=await read('/actions/runs/'+run.id+'/attempts/'+run.attempt+'/jobs?per_page=100');
  need(Array.isArray(jobs?.jobs)&&jobs.total_count===jobs.jobs.length&&jobs.total_count<=100,'TRANSITION_PREPARATION_JOBS');
  const prepared=jobs.jobs.filter(j=>j.name==='Statistical Levels extraordinary preparation');
  need(prepared.length===1&&String(prepared[0].run_id)===run.id&&String(prepared[0].run_attempt)===run.attempt&&prepared[0].head_sha===run.execution_sha&&prepared[0].head_branch===P.branch&&prepared[0].status==='completed'&&prepared[0].conclusion==='success'&&core.transitionUTC(prepared[0].completed_at)>=core.transitionUTC(proof.completed_at),'TRANSITION_PREPARATION_JOB');
  need(canonical(ctx.active_binding).equals(canonical(ctx.intent.binding)),'TRANSITION_PUBLIC_TARGET_REQUIRED');
  validateAncestry(await read('/compare/'+ctx.target.candidate_git_sha+'...'+run.execution_sha+'?per_page=1'),run.execution_sha,ctx.target.candidate_git_sha);
  if(mode==='transition-target') {
    await output({candidate_sha:ctx.target.candidate_git_sha});
    return;
  }
  if(mode==='transition-qa') {
    const inputManifest=JSON.parse(await fs.readFile(path.join(packageRoot,'source-inputs.json'),'utf8'));
    const out=path.join(env.RUNNER_TEMP,'statistical-levels-transition-qa');
    await fs.mkdir(out,{mode:0o700}); // Fresh directory; never reuse a prior QA artifact.
    const started=clock();
    const runQA=ports.runQA??(await import('./preview-qa.mjs')).runCandidateQA;
    const report=await runQA({target:ctx.target,out,codeRoot:candidateRoot,inputManifest});
    const envelope=core.attest(report,run,ctx.target,frozen.workflow_sha256,clock());
    const body=core.transitionCheckBody(ctx,selection,envelope,run,started,await transitionCheckTimestamp(envelope.timestamp,clock));
    // The independent QA job owns checks:write; the invoker jobs do not.
    const check=await (ports.githubWrite??githubWrite)('/check-runs',body,env);
    validateTransitionCheckReadback(check,body);
    const binding=JSON.parse(body.output.summary);
    const seal=sha(canonical({binding,payload:envelope.controller_payload}));
    await fs.writeFile(path.join(out,'qa-envelope.json'),canonical(envelope),{flag:'wx',mode:0o600});
    await fs.writeFile(path.join(out,'qa-binding.json'),canonical(binding),{flag:'wx',mode:0o600});
    await output({transition_envelope:canonical(envelope).toString(),transition_check_id:String(check.id),transition_payload_sha256:envelope.controller_payload_sha256,transition_seal_sha256:seal});
    return;
  }
  need(/^[1-9][0-9]{0,19}$/.test(env.SL_TRANSITION_CHECK_ID??'')&&typeof env.SL_TRANSITION_ENVELOPE==='string'&&env.SL_TRANSITION_ENVELOPE.length<60000,'TRANSITION_QA_REFERENCE');
  const request=core.transitionCertificationRequest(ctx,selection,JSON.parse(env.SL_TRANSITION_ENVELOPE),await read('/check-runs/'+env.SL_TRANSITION_CHECK_ID),jobs,run,frozen.workflow_sha256,Date.parse(clock()));
  await (ports.oidc??oidc)(P.aws_audience,env);
  await write(request);
}
