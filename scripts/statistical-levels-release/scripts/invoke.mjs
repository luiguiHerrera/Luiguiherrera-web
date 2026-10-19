// The only cloud mutation this future workflow can request. Never used by local tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ADOPT, P, need, sha, canonical, validateControllerRequest, controllerOutcome } from './release-core.mjs';
import { adoptInvocationReceipt } from './adopt-invocation-receipt.mjs';
try {
  const requestFile = path.join(process.env.RUNNER_TEMP, 'statistical-levels-release-request.json');
  const request = JSON.parse(await fs.readFile(requestFile, 'utf8'));
  validateControllerRequest(request);
  need(process.env.AWS_REGION === 'eu-south-2' && process.env.AWS_SESSION_TOKEN, 'AWS_SESSION_REQUIRED');
  const output = path.join(process.env.RUNNER_TEMP, 'statistical-levels-controller-response.json');
  const invocationStartedAt = new Date().toISOString();
  const metadata = JSON.parse(execFileSync('aws', ['lambda', 'invoke', '--function-name', P.lambda_arn,
    '--region', 'eu-south-2', '--invocation-type', 'RequestResponse', ...(request.operation === ADOPT ? ['--log-type', 'Tail'] : []), '--cli-binary-format', 'raw-in-base64-out',
    '--payload', 'fileb://' + requestFile, '--cli-read-timeout', '930', '--no-cli-pager', output],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 950000,
      env: { ...process.env, AWS_MAX_ATTEMPTS: '1', AWS_PAGER: '' } }));
  need(metadata.StatusCode === 200 && !metadata.FunctionError, 'CONTROLLER_INVOCATION_FAILED');
  const response = JSON.parse(await fs.readFile(output, 'utf8'));
  const outcome = controllerOutcome(request.operation, response);
  if (request.operation === ADOPT) {
    const receipt = adoptInvocationReceipt({ request, response, metadata, environment: process.env,
      workflowSha256: sha(await fs.readFile(P.workflow_path)), startedAt: invocationStartedAt, completedAt: new Date().toISOString() });
    await fs.writeFile(path.join(process.env.RUNNER_TEMP, 'statistical-levels-g5-invocation-receipt.json'),
      canonical(receipt), { flag: 'wx', mode: 0o600 });
  }
  if (outcome.stdout) process.stdout.write(outcome.stdout);
  if (outcome.stderr) process.stderr.write(outcome.stderr);
  process.exitCode = outcome.exitCode;
} catch {
  process.stderr.write('CONTROLLER_INVOCATION_NOT_CONFIRMED_NO_RETRY\n'); process.exitCode = 1;
}
