import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { P, sha } from '../scripts/release-core.mjs';
import { probeEvidenceFiles } from '../scripts/probe-evidence.mjs';
import { validateProbeMetadataEvidence } from '../scripts/probe-metadata-observability.mjs';

const closure = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(closure, '../..');
const fixture = JSON.parse(await fs.readFile(new URL('../probe-fixture.json', import.meta.url), 'utf8'));
const execution = 'b'.repeat(40);

for (const [mode, httpStatus] of [['preflight', 403], ['preflight', 404], ['preflight', 429], ['qa', 403], ['aws-preflight', 403], ['qa', 200]]) {
  test(`two-process ${mode} HTTP${httpStatus} retains metadata evidence with no verified context, product or AWS`, async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-metadata-local-'));
    try {
      const event = path.join(directory, 'event.json');
      const output = path.join(directory, 'output.txt');
      const preload = path.join(directory, 'offline-preload.mjs');
      const requests = path.join(directory, 'requests.jsonl');
      await fs.writeFile(event, JSON.stringify({ inputs: {
        operation: 'PROBE_IDENTITY', probe_git_sha: fixture.git_sha, probe_deployment_id: fixture.deployment_id,
      } }));
      await fs.writeFile(output, '');
      // Synthetic Git blob read only: no git mutation/commit and no network. All source hashes still verify.
      await fs.writeFile(preload, `
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
cp.execFileSync = (program, args) => {
  assert.equal(program, 'git');
  assert.deepEqual(args, ['show', ${JSON.stringify(execution + ':' + P.workflow_path)}]);
  return fs.readFileSync(${JSON.stringify(path.join(repo, P.workflow_path))});
};
syncBuiltinESMExports();
globalThis.fetch = async (url, options) => {
  assert.equal(url, ${JSON.stringify('https://api.github.com/repos/' + P.repository + '/actions/runs/500')});
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, undefined);
  fs.appendFileSync(${JSON.stringify(requests)}, JSON.stringify({ path: new URL(url).pathname, method: options.method }) + '\\n');
  return new Response(${JSON.stringify(httpStatus === 200 ? '{}' : 'untrusted-response-body-should-never-be-exported')}, {
    status: ${httpStatus}, headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '0', 'set-cookie': 'private-cookie-must-never-be-exported' },
  });
};
`);
      const env = {
        PATH: process.env.PATH, RUNNER_TEMP: directory, GITHUB_OUTPUT: output,
        GITHUB_EVENT_PATH: event, GITHUB_REPOSITORY: P.repository, GITHUB_REF: 'refs/heads/' + P.branch,
        GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: P.workflow_ref,
        GITHUB_SHA: execution, GITHUB_WORKFLOW_SHA: execution, GITHUB_WORKFLOW: P.workflow_name,
        GITHUB_RUN_ID: '500', GITHUB_RUN_ATTEMPT: '1',
      };
      const launch = mode => spawnSync(process.execPath,
        ['--import', preload, path.join(closure, 'scripts/probe-cli.mjs'), mode],
        { cwd: repo, env, encoding: 'utf8', timeout: 15000 });
      const preflight = launch(mode);
      assert.equal(preflight.error, undefined);assert.equal(preflight.status, 1);
      const failureCode = httpStatus === 200 ? 'PUBLIC_REPOSITORY_IDENTITY' : 'PROBE_PUBLIC_METADATA_UNAVAILABLE';
      assert.equal(preflight.stderr.trim(), failureCode);
      const runRoot = path.join(directory, 'statistical-levels-identity-probe');
      await assert.rejects(fs.stat(path.join(runRoot, 'verified-context.json')), { code: 'ENOENT' });
      env.PROBE_RESOLVE_OUTCOME = 'failure';env.PROBE_QA_OUTCOME = 'skipped';
      env.PROBE_AWS_ASSUME_OUTCOME = 'skipped';env.PROBE_AWS_IDENTITY_OUTCOME = 'skipped';
      const finalizer = launch('evidence');
      assert.equal(finalizer.error, undefined);assert.equal(finalizer.status, 1);
      assert.match(await fs.readFile(output, 'utf8'), /ready=true/);
      const artifact = path.join(runRoot, 'artifact');
      assert.deepEqual((await fs.readdir(artifact)).sort(), [...probeEvidenceFiles].sort());
      const files = Object.fromEntries(await Promise.all(probeEvidenceFiles.map(async name => [name, await fs.readFile(path.join(artifact, name))])));
      const json = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, JSON.parse(bytes)]));
      assert.equal(json['metadata-resolution.json'].capture_status, 'RECORDED');
      const metadata = validateProbeMetadataEvidence(json['metadata-resolution.json'].evidence);
      assert.ok(JSON.stringify(metadata).includes(String(httpStatus)));
      assert.ok(JSON.stringify(metadata).includes(httpStatus === 200 ? 'EXPECTED_FIELD_MISSING' : 'HTTP_' + httpStatus));
      assert.equal(metadata.gate_failures.at(-1).error_code, failureCode);
      assert.ok(JSON.stringify(metadata).includes('/actions/runs/500'));
      assert.equal(json['probe-summary.json'].result, 'FAIL');
      assert.equal(json['probe-summary.json'].target, null);
      assert.equal(json['trusted-sources-qa.json'].preview_product_qa, 'NOT_RUN');
      assert.equal(json['aws-oidc-summary.json'].result, 'NOT_RUN');
      assert.equal(json['first-product-failure.json'].capture_status, 'NOT_AVAILABLE');
      assert.equal((await fs.readFile(requests, 'utf8')).trim().split('\n').length, 1, 'No retry or extra request in finalization');
      for (const bytes of Object.values(files)) {
        assert.ok(!bytes.includes('untrusted-response-body-should-never-be-exported'));
        assert.ok(!bytes.includes('private-cookie-must-never-be-exported'));
      }
      for (const [name, entry] of Object.entries(json['evidence-sha256.json'].files))
        assert.deepEqual(entry, { sha256: sha(files[name]), bytes: files[name].length });
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  });
}
