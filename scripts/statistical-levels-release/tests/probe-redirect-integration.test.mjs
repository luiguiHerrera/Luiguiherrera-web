import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');

const root = new URL('../', import.meta.url);
const digest = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFile(new URL(file, root), 'utf8');
const shared = {
  'scripts/release-core.mjs': 'c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70',
  'scripts/qa-runner.mjs': '4584b988912f702a3b79f8de19640dd8eb0c0ebf61e45d0330af6ae975c03262',
  'scripts/browser-harness-base.mjs': '3d3a5f048d1e75f56f88ccb728e09aa7e892cc8f6b627dff81e05664145c18b9',
  'scripts/browser-harness.mjs': '2896a2c3f2886321eb47291a007fdf272ec95f4f4a593362d9a4a4ca6f04bf4c',
  'scripts/runtime-io.mjs': 'b114b3e246ae4bdbf1af1a3823218b65f53a18ca26719a6740b11538344a912e',
  'scripts/cli.mjs': 'c353aca844d0d69973d0bcd8abd9bf9539fd908245aca49d0caffcdb4a8c2407',
  'scripts/invoke.mjs': '95902e9029354124eba014dab478324f2318caf3a7a5ddf26732211d5819d113',
  'policy.json': 'c194090cdb1db2ce6aee032492aab95dac85c32405be7e8d0855f43bc728fd22',
  'controller-request-schema.json': 'd44337f72a9970d9db8e5d24ec1c400b4a5a4db9d4e3110b054727e6c9a224d3',
  'controller-qa-schema.json': '3fece1fd42493bc6210c1ea901459f50c85fc2deb24d177e0dadf51b35a063d8',
};

test('16: proven OIDC V3 validator and runtime identity boundary remain exact frozen bytes', async () => {
  assert.equal(digest(await read('scripts/probe-oidc.mjs')), '951606ee7fa3aa2442f3201af904afeb6afa0745475d72bbff24545f7ca603ab');
  // Metadata may change in this shared file; the six complete identity functions remain frozen.
  const expected = {
    "execution": "dcf5155b8c863ecb2e85bd0c11ae2571e38c2cb80c444a59bcd9155a5f8fe946",
    "oidcEvidencePath": "bb555c80eccc7c57b2e296e3e253dcfc1ed400bb662f2833e0f0b9a55d676683",
    "recordProbeOIDCEvidence": "c4949f1cf64903088dbf7fb3052676421feebd289e106dabc55b5a98e72cd501",
    "readProbeOIDCEvidence": "b119e4387f56327293d7fa25505e21d3cdbb1944e34f91e8fa08f740778a257b",
    "probeOIDC": "84bbf429a8cdc79ea69ee2e7efb127c7d5acec27085b8bcba387efefca55dd93",
    "readProbeRoleIdentity": "9e736e9695492f48167207cb75c03183737a236d7cd21c4ca3875b6805e65e63"
  };
  const ast = ts.createSourceFile('probe-runtime.mjs', await read('scripts/probe-runtime.mjs'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const observed = {};
  for (const node of ast.statements) {
    const name = node.name?.text ?? (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 ? node.declarationList.declarations[0].name.text : null);
    if (Object.hasOwn(expected, name)) observed[name] = digest(node.getText(ast));
  }
  assert.deepEqual(observed, expected);
});

test('17: probe entry defers OIDC creation to protected-baseline gate and never imports controller invocation', async () => {
  const cli = await read('scripts/probe-cli.mjs');
  assert.doesNotMatch(cli, /oidcLease/);
  assert.match(cli, /requestOIDCToken: \(\) => probeOIDC\(P\.vercel_audience\)/);
  assert.ok(cli.indexOf('requireProtectedProbeHTTP(await readOptional') < cli.indexOf("if (mode === 'aws-preflight')"));
  assert.match(cli, /httpPreflight: await readOptional\(path.join\(qaDirectory, 'http-preflight.json'\)\)/);
  for (const file of ['scripts/probe-cli.mjs', 'scripts/probe-http.mjs', 'scripts/probe-qa.mjs']) {
    assert.doesNotMatch(await read(file), /import[^\n]*(?:invoke|runtime-io|child_process|aws-sdk)|InvokeFunction|GetSecretValue|PutObject|api\.vercel\.com/);
  }
  const workflow = await fs.readFile(new URL('../../.github/workflows/statistical-levels-release.yml', root), 'utf8');
  const probe = workflow.split('  identity-probe:\n')[1];
  assert.match(probe, /if: inputs.operation == 'PROBE_IDENTITY'/);
  assert.match(probe, /"Effect":"Deny","NotAction":"sts:GetCallerIdentity","Resource":"\*"/);
  assert.doesNotMatch(probe, /invoke\.mjs|environment:|contents: write|secrets:/);
});

test('18: ADOPT transport, validation and controller request contract remain byte-identical', async () => {
  for (const [file, expected] of Object.entries(shared)) assert.equal(digest(await read(file)), expected, file);
});

test('19: PROMOTE and all release workflow jobs differ only by the newly frozen source checksum', async () => {
  const workflow = await fs.readFile(new URL('../../.github/workflows/statistical-levels-release.yml', root), 'utf8');
  const release = workflow.split('  identity-probe:\n')[0]
    .replace(/(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}/g, '$1<FROZEN_SOURCE_SUMS>');
  assert.equal(digest(release), 'bbb2a40f85ba7314a7189d121425b6b6559858cc460c1a91b2f7654d8b9af481');
});
