import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const source = await readFile(new URL("../../../.github/workflows/regime-v2-shadow.yml", import.meta.url), "utf8");
const gate = source.split("  gate:\n")[1].split("\n  shadow:")[0];
const script = gate.match(/        run: \|\n([\s\S]*)$/)[1].split("\n").map(line => line.startsWith("          ") ? line.slice(10) : line).join("\n");
async function select(t, values) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-workflow-gate-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, "output"), summary = path.join(directory, "summary");
  // Execute the actual committed gate body with synthetic event/config values.
  // It has no checkout, actions, provider clients or external commands.
  const result = spawnSync("bash", ["--noprofile", "--norc", "-c", script], { encoding: "utf8", timeout: 5000,
    env: { PATH: process.env.PATH, EVENT_NAME: "schedule", JOB_ENABLED: "OFF", MANUAL_MODE: "preflight", CANARY_CONFIRMATION: "", GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, ...values },
  });
  assert.equal(result.error, undefined);
  return { ...result, output: await readFile(output, "utf8").catch(() => ""), summary: await readFile(summary, "utf8").catch(() => "") };
}
for (const enabled of ["", "OFF", "invalid"]) test(`actual scheduled gate skips ${JSON.stringify(enabled)} without granting execution`, async t => {
  const result = await select(t, { JOB_ENABLED: enabled });
  assert.equal(result.status, 0); assert.equal(result.output, "execute=false\nmode=off\n");
  assert.match(result.summary, /no OIDC, storage or market access/);
});

test("scheduled ON selects exactly the prospective schedule mode", async t => {
  const result = await select(t, { JOB_ENABLED: "ON" });
  assert.equal(result.status, 0); assert.equal(result.output, "execute=true\nmode=schedule\n");
});

test("manual default routes to preflight while the schedule stays OFF", async t => {
  const result = await select(t, { EVENT_NAME: "workflow_dispatch" });
  assert.equal(result.status, 0); assert.equal(result.output, "execute=true\nmode=preflight\n");
});

test("manual canary has no execution grant without the exact confirmation", async t => {
  for (const confirmation of ["", "yes", "RUN_ONE_SHADOW_OBSERVATION; echo bypass"]) {
    const result = await select(t, { EVENT_NAME: "workflow_dispatch", MANUAL_MODE: "canary", CANARY_CONFIRMATION: confirmation });
    assert.equal(result.status, 2); assert.equal(result.output, "");
  }
});

test("explicit canary grants one manual mode without altering the OFF switch", async t => {
  const result = await select(t, { EVENT_NAME: "workflow_dispatch", MANUAL_MODE: "canary", CANARY_CONFIRMATION: "RUN_ONE_SHADOW_OBSERVATION" });
  assert.equal(result.status, 0); assert.equal(result.output, "execute=true\nmode=canary\n");
  assert.doesNotMatch(script, /JOB_ENABLED=ON|gh\s+variable|api\.github/);
});

test("unsupported event and injected mode fail closed", async t => {
  for (const values of [{ EVENT_NAME: "push" }, { EVENT_NAME: "workflow_dispatch", MANUAL_MODE: "canary\nexecute=true" }]) {
    const result = await select(t, values); assert.equal(result.status, 2); assert.equal(result.output, "");
  }
});

test("OFF gate has no OIDC permission or checkout; only gated job can request temporary credentials", () => {
  assert.match(gate, /permissions: \{\}/); assert.doesNotMatch(gate, /id-token|uses:/);
  assert.match(source, /permissions: \{\}/);
  const job = source.split("\n  shadow:")[1];
  assert.match(job, /needs: gate/); assert.match(job, /if: \$\{\{ needs\.gate\.outputs\.execute == 'true' \}\}/);
  assert.match(job, /permissions:\n      contents: read\n      id-token: write/);
  assert.doesNotMatch(source, /pull_request|push:|--local-store|--as-of|--asOf|secrets\./);
});

test("all action pins are exact verified official commits and credentials are ephemeral", () => {
  const pins = [...source.matchAll(/uses: ([^\s]+)(?: |$)/gm)].map(match => match[1]);
  assert.deepEqual(pins, [
    "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
    "aws-actions/configure-aws-credentials@cbe3b392738ccf3f987d68400dafcf4b0624a56c",
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  ]);
  assert.match(source, /persist-credentials: false/); assert.match(source, /unset-current-credentials: true/);
  assert.match(source, /role-to-assume: \$\{\{ vars\.SHADOW_ROLE_ARN \}\}/);
  for (const variable of ["AWS_REGION", "S3_BUCKET", "SHADOW_ROLE_ARN"]) assert.match(source, new RegExp(`\\$\\{\\{ vars\\.${variable} \\}\\}`));
  assert.doesNotMatch(source, /AWS_ACCESS_KEY_ID:|AWS_SECRET_ACCESS_KEY:|AWS_SESSION_TOKEN:|@main|@master/);
});

test("runner context remains scoped to steps and temporal order comes from the real job clock", () => {
  assert.match(source, /cron: "30 8 \* \* 2-6"/);
  assert.match(source, /default: preflight/);
  const beforeSteps = source.split("\n  shadow:")[1].split("    steps:")[0];
  assert.doesNotMatch(beforeSteps, /runner\.temp/);
  assert.match(source, /args=\(--mode "\$EXECUTION_MODE" --storage s3 --diagnostics-dir "\$RUNNER_TEMP\/regime-v2-attempt"\)/);
  assert.doesNotMatch(source, /asOf|as_of|as-of|clock:/);
});

test("pre-OIDC configuration check rejects foreign resources and unsafe text without invoking AWS", () => {
  const configuration = source.split("      - name: Validate required nonsecret configuration\n")[1].split("      - run: npm ci")[0];
  const body = configuration.match(/        run: \|\n([\s\S]*)$/)[1].split("\n").map(line => line.startsWith("          ") ? line.slice(10) : line).join("\n");
  const approved = { AWS_REGION: "us-east-1", S3_BUCKET: "lh-regime-v2-shadow-732159826922-us-east-1", SHADOW_ROLE_ARN: "arn:aws:iam::732159826922:role/RegimeV2ShadowWriter" };
  const run = overrides => spawnSync("bash", ["--noprofile", "--norc", "-c", body], { encoding: "utf8", timeout: 5000, env: { ...approved, ...overrides } });
  assert.equal(run({}).status, 0);
  for (const overrides of [{ AWS_REGION: "" }, { AWS_REGION: "us-west-2" }, { S3_BUCKET: "other" }, { SHADOW_ROLE_ARN: "arn:aws:iam::732159826922:role/RegimeV2S3Probe" }, { SHADOW_ROLE_ARN: "$(echo unsafe)" }]) assert.equal(run(overrides).status, 2);
  assert.doesNotMatch(body, /aws |eval|\$\(/);
  assert.ok(source.indexOf("Validate required nonsecret configuration") < source.indexOf("aws-actions/configure-aws-credentials@"));
});

test("OIDC exchange is account-bound, bounded, fresh and does not output credential material", () => {
  for (const expected of ["use-existing-credentials: false", "output-credentials: false", "disable-retry: true", "action-timeout-s: 90", "audience: sts.amazonaws.com", "role-duration-seconds: 1800", 'allowed-account-ids: "732159826922"']) assert.ok(source.includes(expected), expected);
});
