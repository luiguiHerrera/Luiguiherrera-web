import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { P, canonical } from '../scripts/release-core.mjs';
import { probeOIDC, recordProbeOIDCEvidence, readProbeOIDCEvidence } from '../scripts/probe-runtime.mjs';
import { signedFixture, jwks, env } from './probe-oidc-fixture.mjs';

for (const [audience, extra, code] of [[P.vercel_audience, {}, null], [P.aws_audience, {}, null],
  [P.vercel_audience, { environment: 'Preview' }, 'UNEXPECTED_GITHUB_ENVIRONMENT_CLAIM'],
  [P.vercel_audience, { job_workflow_ref: 'unexpected' }, 'UNEXPECTED_JOB_WORKFLOW_REF'],
  [P.aws_audience, { sub: P.aws_subject + '-wrong' }, 'OIDC_SUBJECT_MISMATCH']]) {
  test('runtime persists only safe diagnostics before pass or precise rejection: ' + audience + ':' + code, async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-oidc-unit-'));
    try {
      const { token } = signedFixture(audience, extra);
      const input = { ...env, RUNNER_TEMP: root, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://test.actions.githubusercontent.com/id-token',
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'synthetic-request-marker' };
      let calls = 0;
      t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls++; assert.equal(options.redirect, 'error');
        if (calls === 1) {
          assert.equal(new URL(url).searchParams.get('audience'), audience);
          assert.equal(options.headers.Authorization, 'Bearer synthetic-request-marker');
          return { ok: true, json: async () => ({ value: token }) };
        }
        assert.equal(calls, 2); assert.equal(String(url), 'https://token.actions.githubusercontent.com/.well-known/jwks');
        assert.equal(options.headers, undefined); return { ok: true, json: async () => jwks };
      });
      if (code) await assert.rejects(probeOIDC(audience, input), error => error.message === code);
      else assert.equal(await probeOIDC(audience, input), token);
      assert.equal(calls, 2);
      const records = await readProbeOIDCEvidence(input);
      assert.equal(records.length, 1); assert.equal(records[0].error_code, code);
      const file = path.join(root, 'statistical-levels-identity-probe', 'oidc-claims.jsonl');
      const bytes = await fs.readFile(file, 'utf8');
      assert.ok(!bytes.includes(token)); assert.ok(!bytes.includes('synthetic-request-marker'));
      assert.ok(!bytes.includes(token.split('.')[2]));
      assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
      assert.equal((await fs.stat(path.dirname(file))).mode & 0o777, 0o700);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}

test('journal preserves audience order and rejects unsafe input before any write', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-oidc-unit-')), input = { RUNNER_TEMP: root };
  try {
    assert.deepEqual(await readProbeOIDCEvidence(input), []);
    const vercel = signedFixture().evidence, aws = signedFixture(P.aws_audience).evidence;
    await assert.rejects(recordProbeOIDCEvidence({ ...vercel, token: 'private-marker' }, input));
    assert.deepEqual(await fs.readdir(root), []);
    await recordProbeOIDCEvidence(vercel, input); await recordProbeOIDCEvidence(aws, input);
    assert.deepEqual(await readProbeOIDCEvidence(input), [vercel, aws]);
    const file = path.join(root, 'statistical-levels-identity-probe', 'oidc-claims.jsonl');
    await fs.writeFile(file, 'malformed-json');
    await assert.rejects(readProbeOIDCEvidence(input), /PROBE_OIDC_EVIDENCE_INVALID/);
    await fs.writeFile(file, canonical({ ...vercel, token: 'private-marker' }));
    await assert.rejects(readProbeOIDCEvidence(input));
    await fs.writeFile(file, (canonical(vercel).toString() + '\n').repeat(257));
    await assert.rejects(readProbeOIDCEvidence(input), /PROBE_OIDC_EVIDENCE_COUNT/);
    await fs.writeFile(file, 'x'.repeat(1_000_001));
    await assert.rejects(readProbeOIDCEvidence(input), /PROBE_OIDC_EVIDENCE_SIZE/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('journal serializes only the sanitized copy and ignores custom serialization methods', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'probe-oidc-unit-')), input = { RUNNER_TEMP: root };
  try {
    const evidence = signedFixture().evidence;
    Object.defineProperty(evidence, 'toJSON', { value: () => ({ Authorization: 'private-serialization-marker' }) });
    Object.defineProperty(evidence.claims, 'toJSON', { value: () => ({ token: 'private-serialization-marker' }) });
    await recordProbeOIDCEvidence(evidence, input);
    const records = await readProbeOIDCEvidence(input);
    assert.equal(records.length, 1); assert.equal(records[0].result, 'PASS');
    assert.ok(!JSON.stringify(records).includes('private-serialization-marker'));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
