import fs from 'node:fs/promises';
import path from 'node:path';
import { P, need, attest, canonical, oidcLease, ADOPT } from './release-core.mjs';
import { assertWorkflow, deployment, oidc, emitAttestation, prepareInvocation, writeRequest, packageRoot, candidateRoot, execution } from './runtime-io.mjs';

try {
  const mode = process.argv[2];
  need(['preflight', 'qa', 'prepare-invocation'].includes(mode), 'MODE');
  const frozen = await assertWorkflow();
  if (mode === 'preflight') {
    // Target SHA comes only from validated fixed-operation inputs or the approved baseline policy.
    await fs.appendFile(process.env.GITHUB_OUTPUT, 'candidate_sha=' + frozen.target.candidate_git_sha + '\n');
  } else if (mode === 'qa') {
    const inputs = JSON.parse(await fs.readFile(path.join(packageRoot, 'source-inputs.json'), 'utf8'));
    const { runCandidateQA, verifyInputs } = await import('./preview-qa.mjs');
    const authority = await verifyInputs(candidateRoot, inputs, frozen.target);
    const verified = { ...await deployment(frozen.target), ...authority };
    // Production is public: this branch neither requests nor supplies any bypass identity.
    const tokenSource = verified.operation === ADOPT ? undefined : oidcLease(await oidc(P.vercel_audience), () => oidc(P.vercel_audience));
    const out = path.join(process.env.RUNNER_TEMP, 'statistical-levels-candidate-qa');
    const report = await runCandidateQA({ target: verified, tokenSource, out, codeRoot: candidateRoot, inputManifest: inputs });
    const envelope = attest(report, execution(), verified, frozen.workflow_sha256, new Date().toISOString());
    await fs.writeFile(path.join(out, 'qa-attestation.json'), canonical(envelope), { mode: 0o600 });
    await emitAttestation(envelope, verified);
  } else if (mode === 'prepare-invocation') {
    const request = await prepareInvocation();
    await writeRequest(request, path.join(process.env.RUNNER_TEMP, 'statistical-levels-release-request.json'));
  }
} catch (error) {
  // Never print raw provider/transport errors, headers, tokens, payloads or stacks.
  const code = /^[A-Z][A-Z0-9_]{1,95}$/.test(error.message) ? error.message : 'LOCAL_OR_RUNTIME_QUALIFICATION_FAILED';
  process.stderr.write(code + '\n'); process.exitCode = 1;
}
