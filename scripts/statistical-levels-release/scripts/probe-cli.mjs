import fs from 'node:fs/promises';
import path from 'node:path';
import { P, need, canonical } from './release-core.mjs';
import { attestProbe, validateProbeAttestation } from './probe-core.mjs';
import { assertProbeWorkflow, resolveProbeDeployment, probeOIDC, readProbeRoleIdentity, readProbeOIDCEvidence, packageRoot, candidateRoot, execution } from './probe-runtime.mjs';
import { writeProbeEvidence } from './probe-evidence.mjs';
import { requireProtectedProbeHTTP, requireProbeCertificationHTTP, requireProbeQATokenBudget } from './probe-gate.mjs';

const root = path.join(process.env.RUNNER_TEMP ?? '', 'statistical-levels-identity-probe');
const qaDirectory = path.join(root, 'qa');
const stateFile = path.join(root, 'verified-context.json');
async function save(file, value) { await fs.writeFile(file, canonical(value), { mode: 0o600 }); }
async function readOptional(file) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; } }
try {
  need(process.env.RUNNER_TEMP && path.isAbsolute(process.env.RUNNER_TEMP), 'PROBE_RUNNER_TEMP');
  const mode = process.argv[2];
  need(['preflight', 'qa', 'aws-preflight', 'aws-identity', 'evidence'].includes(mode), 'PROBE_MODE');
  if (mode === 'evidence') {
    const context = await readOptional(stateFile);
    const summary = await writeProbeEvidence(path.join(root, 'artifact'), {
      context: context ?? { run: execution(), target: null,
        workflow_sha256: JSON.parse(await fs.readFile(path.join(packageRoot, 'workflow-freeze.json'), 'utf8')).workflow_sha256 },
      outcomes: { resolve: process.env.PROBE_RESOLVE_OUTCOME, qa: process.env.PROBE_QA_OUTCOME,
        aws_assume: process.env.PROBE_AWS_ASSUME_OUTCOME, aws_identity: process.env.PROBE_AWS_IDENTITY_OUTCOME },
      productReport: await readOptional(path.join(qaDirectory, 'product-report.json')),
      accounting: await readOptional(path.join(qaDirectory, 'network-accounting.json')),
      httpPreflight: await readOptional(path.join(qaDirectory, 'http-preflight.json')),
      certificationHttp: await readOptional(path.join(qaDirectory, 'trusted-sources-certification.json')),
      tokenBudget: await readOptional(path.join(qaDirectory, 'token-budget.json')),
      awsProof: await readOptional(path.join(root, 'aws-proof.json')),
      attestation: await readOptional(path.join(root, 'qa-attestation.json')),
      oidcEvidence: await readProbeOIDCEvidence() });
    await fs.appendFile(process.env.GITHUB_OUTPUT, 'ready=true\n');
    if (summary.result !== 'PASS') process.exitCode = 1;
  } else {
    const frozen = await assertProbeWorkflow(), run = execution();
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    if (mode === 'preflight') {
      const target = await resolveProbeDeployment(frozen.target);
      await save(stateFile, { run, target, workflow_sha256: frozen.workflow_sha256 });
      await fs.appendFile(process.env.GITHUB_OUTPUT, 'candidate_sha=' + target.candidate_git_sha + '\n');
    } else if (mode === 'qa') {
      const target = await resolveProbeDeployment(frozen.target);
      const inputs = JSON.parse(await fs.readFile(path.join(packageRoot, 'source-inputs.json'), 'utf8'));
      const { verifyProbeInputs, runProbeQA } = await import('./probe-qa.mjs');
      const verified = { ...target, ...await verifyProbeInputs(candidateRoot, inputs, target) };
      await save(stateFile, { run, target: verified, workflow_sha256: frozen.workflow_sha256 });
      const { report } = await runProbeQA({ target: verified,
        requestOIDCToken: () => probeOIDC(P.vercel_audience),
        out: qaDirectory, codeRoot: candidateRoot, inputManifest: inputs });
      await save(path.join(root, 'qa-attestation.json'), attestProbe(report, run, verified, frozen.workflow_sha256, new Date().toISOString()));
    } else {
      const context = JSON.parse(await fs.readFile(stateFile, 'utf8'));
      const attestation = JSON.parse(await fs.readFile(path.join(root, 'qa-attestation.json'), 'utf8'));
      validateProbeAttestation(attestation, run, context.target, frozen.workflow_sha256);
      requireProtectedProbeHTTP(await readOptional(path.join(qaDirectory, 'http-preflight.json')), context.target);
      requireProbeCertificationHTTP(await readOptional(path.join(qaDirectory, 'trusted-sources-certification.json')), context.target);
      requireProbeQATokenBudget(await readOptional(path.join(qaDirectory, 'token-budget.json')), context.target.origin);
      const age = Date.now() - Date.parse(attestation.timestamp);
      need(age >= 0 && age <= 86400000, 'PROBE_QA_EXPIRED');
      need(context.target.candidate_git_sha === frozen.target.candidate_git_sha && context.target.deployment_id === frozen.target.deployment_id, 'PROBE_FIXTURE_CHANGED');
      if (mode === 'aws-preflight') await probeOIDC(P.aws_audience);
      else await save(path.join(root, 'aws-proof.json'), readProbeRoleIdentity(run));
    }
  }
} catch (error) {
  const code = /^[A-Z][A-Z0-9_]{1,95}$/.test(error.message) ? error.message : 'IDENTITY_PROBE_QUALIFICATION_FAILED';
  process.stderr.write(code + '\n'); process.exitCode = 1;
}
