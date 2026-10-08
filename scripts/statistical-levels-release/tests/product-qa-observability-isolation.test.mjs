import { readFileSync } from 'node:fs';
import * as probeContract from '../scripts/probe-core.mjs';
import * as releaseContract from '../scripts/release-core.mjs';
import {withoutReceiptClass} from './semantic-closure-compat.mjs';
// The requalified production target policy is pinned explicitly; other frozen security/classifier/ADOPT/PROMOTE contracts remain exact.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const ts = createRequire(import.meta.url)('typescript');
const expected = {
  "explicit receipt accounting migration with no header-based exemption": {
    "scripts/network-accounting.mjs": "a9058dca108abf3920ce3cfe0260b800f1978bc6aa5d4c1d69c4e322584432ca"
  },
  "Custom Trusted Source and anonymous baseline logic unchanged": {
    "scripts/probe-http.mjs": "036a21186195bfaecadfe046d08786b69f692b730e2144da7b450f8d319614df"
  },
  "HTTP application fixture binding unchanged": {
    "scripts/probe-dom.mjs": "1164dc7ff85c69b970a70ee0a00586dbbd662e7d7970b9615f9fdd60ae5cda4e"
  },
  "browser authority binding unchanged": {
    "scripts/probe-browser-authority.mjs": "d8873a83f6159e33e874124c62324d8bf76c7527786adeaaa1414b2b1e304209"
  },
  "OIDC V3 identity security unchanged": {
    "scripts/probe-oidc.mjs": "951606ee7fa3aa2442f3201af904afeb6afa0745475d72bbff24545f7ca603ab"
  },
  "phase-scoped token budget unchanged": {
    "scripts/probe-token-budget.mjs": "944a180e12e516417acf3f98b3e59ad402b33293b9141eaa830753d47c09860e"
  },
  "requalified production target policy pinned; PROBE authorization and controller exclusion unchanged": {
    "policy.json": "e8865e7b7c392147f111a4f558434d536cbdfbb648d463053a74701b2bb98e9a",
    "controller-request-schema.json": "d44337f72a9970d9db8e5d24ec1c400b4a5a4db9d4e3110b054727e6c9a224d3",
    "controller-qa-schema.json": "3fece1fd42493bc6210c1ea901459f50c85fc2deb24d177e0dadf51b35a063d8"
  },
  "ADOPT evidence wiring is pinned; shared runner and transport unchanged": {
    "scripts/qa-runner.mjs": "70ffd3c5796f2a432a83347109000a20c326d7d49efee59285a403ab932a69df",
    "scripts/browser-harness-base.mjs": "HARNESS_SECURITY_REGIONS",
    "scripts/release-core.mjs": "c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70"
  },
  "PROMOTE shared runner unchanged; ADOPT-only harness extension pinned": {
    "scripts/qa-runner.mjs": "70ffd3c5796f2a432a83347109000a20c326d7d49efee59285a403ab932a69df",
    "scripts/browser-harness-base.mjs": "HARNESS_SECURITY_REGIONS",
    "scripts/release-core.mjs": "c461b1af450c69007b4f5bfac9c21010ca475b843aec5fed3ff6fe6b8912dd70"
  }
};
for (const [name, files] of Object.entries(expected)) {
  test(name, async () => {
    if (name === 'requalified production target policy pinned; PROBE authorization and controller exclusion unchanged') {
      assertProbePreservation(probeSourceText());
      assertProbeSecuritySemantics();
    }
    for (const [file, hash] of Object.entries(files)) {
      const bytes = await readFile(new URL('../' + file, import.meta.url));
      if(hash==='HARNESS_SECURITY_REGIONS')assertHarnessPreserved(bytes.toString('utf8'));else assert.equal(createHash('sha256').update(file==='scripts/release-core.mjs'?withoutReceiptClass(bytes):bytes).digest('hex'), hash, file);
    }
  });
}

// Metadata functions in this shared file may change; the complete OIDC/STS function bytes may not.
const frozenIdentityFunctions = {
  "execution": "dcf5155b8c863ecb2e85bd0c11ae2571e38c2cb80c444a59bcd9155a5f8fe946",
  "oidcEvidencePath": "bb555c80eccc7c57b2e296e3e253dcfc1ed400bb662f2833e0f0b9a55d676683",
  "recordProbeOIDCEvidence": "c4949f1cf64903088dbf7fb3052676421feebd289e106dabc55b5a98e72cd501",
  "readProbeOIDCEvidence": "b119e4387f56327293d7fa25505e21d3cdbb1944e34f91e8fa08f740778a257b",
  "probeOIDC": "84bbf429a8cdc79ea69ee2e7efb127c7d5acec27085b8bcba387efefca55dd93",
  "readProbeRoleIdentity": "9e736e9695492f48167207cb75c03183737a236d7cd21c4ca3875b6805e65e63"
};
test('metadata repair preserves exact OIDC journals, token validation, execution and STS function bytes', async () => {
  const source = await readFile(new URL('../scripts/probe-runtime.mjs', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('probe-runtime.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const observed = {};
  for (const node of ast.statements) {
    const name = node.name?.text ?? (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 ? node.declarationList.declarations[0].name.text : null);
    if (Object.hasOwn(frozenIdentityFunctions, name)) observed[name] = createHash('sha256').update(node.getText(ast)).digest('hex');
  }
  assert.deepEqual(observed, frozenIdentityFunctions);
});

// The orchestration may preload extra QA routes; these certificate/token validators may not change.
const frozenProbeGateValidators = {"requireProbeCertificationHTTP": "ce2101bdfa119d7bdc60427bf6c0ba442604f50940fad0270dc1ac6522b61b7c", "requireProtectedProbeHTTP": "91b75a77847a882a8ad8086f6a34df5c1fa5c2170be90ca88a7a0f2a96e9983f", "requireProbeQATokenBudget": "d5028ea7416faa4e86a0428ae2da6cfa7f31d47d4557e5a9531e6aaef48143cd"};
test('QA cache repair preserves complete exact certification and token-budget validators', async () => {
  const source = await readFile(new URL('../scripts/probe-gate.mjs', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('probe-gate.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const observed = {};
  for (const node of ast.statements) {
    if (Object.hasOwn(frozenProbeGateValidators, node.name?.text)) observed[node.name.text] = createHash('sha256').update(node.getText(ast)).digest('hex');
  }
  assert.deepEqual(observed, frozenProbeGateValidators);
});

// Step26.5.6.2.4.1: security literals from f7e3fe8e3e3cd8bdea753873c31d78f146cdc923.
// Metadata literals come separately from the frozen Step26.5.6.2.2 adjudicated target.
// Neither baseline is obtained from the implementation while these tests run.
const probeSecurityPins = {
  "ImportDeclaration": "b91501084153fddb0050bbf39fd12023ff6ed2b9fe5cbbb16036f4ceba55ffda",
  "PROBE": "062ed85ea55ef93f48dac4e6b2e5f70bb1a3ff348a009adfb2eb7d8f4859a572",
  "SHA,HASH,DEPLOYMENT": "8a5b7636f1d9f02d46a000f60791e26334743476ad89b9c2f62142fba9ca1110",
  "RUN": "4b94222b2ca1960096eaed321ce5e24d9cea47f1d990b8008486ba0f89e5cb94",
  "matches": "1ac97bad2411e08fb5417b2fa9354c621dd0d2338563a8a1cb6b234c368fc910",
  "releaseInputs": "04cda7c53aed718af18d69bdc768fb42329d4eccc5263520196b0aa6a1453a5f",
  "metadataKeys": "9a4bba7af3eb9c3359f64b32e64141b074129348b027fe31ca67cb19d2a6108c",
  "targetKeys": "ae6e148c642fc2cfd6c721f3f1b8d8bbd02a854451f537e4c514510b23cba32c",
  "selectProbeTarget": "3132ba38e423d709716e940129b72b8519303d82f5648d5317ba285ee5a9a629",
  "fixtureIdentity": "d34f3a8bd5c8364050641629def39d14fc09fc2431c965527d5160057e852149",
  "metadataProof": "7b55802e85f026140c500ca2e8ff7cfebe7949a1641c4c4057a6c85bd2c21c4d",
  "validateProbeTarget": "f8d93ad703d3e9510de315f8d4c8518b9c12f3baa9344382ddecd4e943e1376e",
  "completePage": "f960660e868164a5b1e41ef203cd6a6280b47f695ee2e401bbf588832c6cb9d6",
  "validateRun": "10d739ae3c0c0a2edba951962206417d41f4b814478d51672ebe2dac443eb373",
  "attestProbe": "b3c6c72cd40330d6c02f03e577e953ba6b7fe560714cf2f227b56515eddc0d49",
  "validateProbeAttestation": "7a94e4242ac2b5d246bab336bc0a918f20a99c6e5897470ea1a6b9d69001811c",
  "validateProbeRoleIdentity": "dc0435c576b20d96c6429b4c1cab1c0060b6ed146a57c525a392a827af31240c"
};
const authorizedMetadataPins = {
  "timestamp": "4a9f93fe771ae034fb65083e053aa7748594a6f8a99aded5b74d0a9019af26a6",
  "recordTime": "712a248d86e3752851fc9133ad5694f78fb29ec3d47884cb77ecb4274246814a",
  "currentStatus": "6fc029a70e11ef255d45319ae1929cbb512dabaab311315854b5fc362c2f6f1d",
  "resolveProbePreview": "6d4a0cb00e85c7c5a9f3a46dc12f24b9a42745604a2fd915dbb1ffab47ed8f3e"
};
const probeDeclarationInventory = [
  [
    "ImportDeclaration",
    "import",
    false
  ],
  [
    "PROBE",
    "variable",
    true
  ],
  [
    "SHA,HASH,DEPLOYMENT",
    "variable",
    false
  ],
  [
    "RUN",
    "variable",
    false
  ],
  [
    "matches",
    "variable",
    false
  ],
  [
    "releaseInputs",
    "variable",
    false
  ],
  [
    "metadataKeys",
    "variable",
    false
  ],
  [
    "targetKeys",
    "variable",
    false
  ],
  [
    "selectProbeTarget",
    "function",
    true
  ],
  [
    "fixtureIdentity",
    "function",
    false
  ],
  [
    "metadataProof",
    "function",
    false
  ],
  [
    "validateProbeTarget",
    "function",
    true
  ],
  [
    "completePage",
    "function",
    false
  ],
  [
    "timestamp",
    "function",
    false
  ],
  [
    "recordTime",
    "function",
    false
  ],
  [
    "currentStatus",
    "function",
    false
  ],
  [
    "resolveProbePreview",
    "function",
    true
  ],
  [
    "validateRun",
    "function",
    false
  ],
  [
    "attestProbe",
    "function",
    true
  ],
  [
    "validateProbeAttestation",
    "function",
    true
  ],
  [
    "validateProbeRoleIdentity",
    "function",
    true
  ]
];
const timestampValidationPin = 'fefc9e0f73419b12dcb6fc97bfe6550c1e1de80b53fdc236d76a0fb5e18a44ea';
const probeSourceText = () => readFileSync(new URL('../scripts/probe-core.mjs', import.meta.url), 'utf8');
const regionHash = text => createHash('sha256').update(text).digest('hex');
function probeRegions(source) {
  const ast = ts.createSourceFile('probe-core.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0, 'PROBE_CORE_PARSE');
  const inventory = ast.statements.map(node => {
    const kind = ts.isImportDeclaration(node) ? 'import' : ts.isFunctionDeclaration(node) ? 'function' : ts.isVariableStatement(node) ? 'variable' : 'UNKNOWN';
    const name = kind === 'import' ? 'ImportDeclaration' : kind === 'function' ? node.name?.text : kind === 'variable' ? node.declarationList.declarations.map(d => d.name.getText(ast)).join(',') : 'UNKNOWN';
    return [name, kind, Boolean(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))];
  });
  assert.deepEqual(inventory, probeDeclarationInventory, 'PROBE_CORE_INVENTORY');
  assert.equal(new Set(inventory.map(x => x[0])).size, inventory.length, 'PROBE_CORE_INVENTORY_DUPLICATE');
  return { ast, nodes: new Map(ast.statements.map((node, i) => [inventory[i][0], node])) };
}
function assertProbeSecurityRegions(source) {
  const { ast, nodes } = probeRegions(source);
  for (const [name, expected] of Object.entries(probeSecurityPins))
    assert.equal(regionHash(nodes.get(name).getText(ast)), expected, 'PROBE_CORE_SECURITY:' + name);
  const body = nodes.get('timestamp').body.statements;
  assert.equal(body.length, 2, 'PROBE_CORE_TIMESTAMP_SHAPE');
  assert.equal(regionHash(body[0].getText(ast)), timestampValidationPin, 'PROBE_CORE_TIMESTAMP_VALIDATION');
  assert.equal(body[1].getText(ast), 'return Date.parse(value);', 'PROBE_CORE_TIMESTAMP_RETURN');
}
function assertAuthorizedProbeMetadata(source) {
  const { ast, nodes } = probeRegions(source);
  for (const [name, expected] of Object.entries(authorizedMetadataPins))
    assert.equal(regionHash(nodes.get(name).getText(ast)), expected, 'PROBE_CORE_METADATA:' + name);
}
function assertProbePreservation(source) {
  assertProbeSecurityRegions(source);
  assertAuthorizedProbeMetadata(source);
}
// Synthetic immutable inputs; no transport, workflow dispatch, OIDC or controller execution.
const preservationInputs = { operation: 'PROBE_IDENTITY', probe_git_sha: 'a'.repeat(40), probe_deployment_id: 'dpl_PreservationFixture123' };
const preservationRun = { id: '500', attempt: '1', execution_sha: 'b'.repeat(40) };
const preservationTarget = { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40),
  deployment_id: 'dpl_PreservationFixture123', origin: 'https://luiguiherrera-preservation-luigui-herrera-s-projects.vercel.app',
  authority_run_id: '20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d', sealed_manifest_sha256: 'c'.repeat(64),
  github_deployment_id: 100, status_id: 200, status_sha256: 'd'.repeat(64), commit_status_id: 300, commit_status_sha256: 'e'.repeat(64) };
const preservationReport = () => ({ result: 'PASS',
  gates: Object.fromEntries(['SEASONALITY','DRAWDOWN','PATTERNS','NULL_STATES','CORRELATION','SL_DEF_001','SL_DEF_002','SL_DEF_003','SL_DEF_004','SL_DEF_005','SL_DEF_006'].map(k => [k, 'PASS'])),
  snapshot_count: 81, provenance_coverage: 100, capability_ids: Array.from({ length: 87 }, (_, i) => 'SL-CAP-' + String(i + 1).padStart(3, '0')),
  routes: ['/niveles-estadisticos', '/en/statistical-levels'], viewports: [[1440,900],[390,844]],
  application_console_errors: 0, required_application_request_failures: 0, broken_assets: 0, hydration_errors: 0, overflow: 0,
  raw_platform_events: [], raw_rsc_events: [], unclassified_failures: [], expected_values: 'PASS' });
const preservationEnvelope = () => probeContract.attestProbe(preservationReport(), preservationRun, preservationTarget, 'f'.repeat(64), '2026-09-10T08:00:00Z');
const preservationSemantics = {
  PROBE_ONLY() {
    assert.equal(probeContract.PROBE, 'PROBE_IDENTITY');
    assert.deepEqual(probeContract.selectProbeTarget(preservationInputs), { operation: 'PROBE_IDENTITY', phase: 'preview', candidate_git_sha: 'a'.repeat(40), deployment_id: 'dpl_PreservationFixture123' });
  },
  RELEASE_INPUTS() {
    for (const field of ['candidate_git_sha','candidate_deployment_id','expected_previous_production_sha','expected_previous_production_deployment','previous_publication_date'])
      assert.throws(() => probeContract.selectProbeTarget({ ...preservationInputs, [field]: 'forbidden' }), { message: 'PROBE_RELEASE_INPUT_FORBIDDEN' });
    for (const field of ['controller_request','controller_payload','role_arn','origin'])
      assert.throws(() => probeContract.selectProbeTarget({ ...preservationInputs, [field]: 'forbidden' }), { message: 'PROBE_INPUT_FIELDS' });
  },
  ADOPT_ISOLATION() {
    assert.throws(() => probeContract.selectProbeTarget({ ...preservationInputs, operation: 'ADOPT_EXISTING_PRODUCTION_BASELINE' }), { message: 'PROBE_OPERATION_REQUIRED' });
    assert.throws(() => releaseContract.selectTarget(preservationInputs));
  },
  PROMOTE_ISOLATION() {
    assert.throws(() => probeContract.selectProbeTarget({ ...preservationInputs, operation: 'PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE' }), { message: 'PROBE_OPERATION_REQUIRED' });
    assert.throws(() => releaseContract.validateTarget(preservationTarget));
  },
  POLICY_BINDING() {
    assert.equal(regionHash(readFileSync(new URL('../policy.json', import.meta.url))), 'e8865e7b7c392147f111a4f558434d536cbdfbb648d463053a74701b2bb98e9a');
    assert.equal(releaseContract.P.account_id, '732159826922');
    assert.equal(releaseContract.P.release_role_arn, 'arn:aws:iam::732159826922:role/LuiguiHerreraStatisticalLevelsReleaseInvoker');
    assert.equal(releaseContract.P.aws_audience, 'sts.amazonaws.com');
    assert.equal(releaseContract.P.vercel_audience, 'https://github.com/luiguiHerrera');
    assert.equal(releaseContract.P.aws_subject, 'repo:luiguiHerrera/Luiguiherrera-web:ref:refs/heads/vercel-deployment');
  },
  ROLE_IDENTITY() {
    const identity = { Account: '732159826922', Arn: 'arn:aws:sts::732159826922:assumed-role/LuiguiHerreraStatisticalLevelsReleaseInvoker/sl-probe-500', UserId: 'AROA' + 'A'.repeat(17) + ':sl-probe-500' };
    assert.deepEqual(probeContract.validateProbeRoleIdentity(identity, preservationRun), { result: 'PASS', assumed_role: 'LuiguiHerreraStatisticalLevelsReleaseInvoker', account_match: true, session_match: true, workflow_run_id: '500', workflow_run_attempt: '1', workflow_execution_sha: 'b'.repeat(40) });
    for (const delta of [{ Account: '000000000000' }, { Arn: identity.Arn.replace('ReleaseInvoker', 'OtherRole') }, { Arn: identity.Arn.replace('500', '501') }, { UserId: identity.UserId.replace('AROA', 'AIDA') }])
      assert.throws(() => probeContract.validateProbeRoleIdentity({ ...identity, ...delta }, preservationRun), { message: 'PROBE_AWS_ROLE_MISMATCH' });
  },
  ATTESTATION_CONTROLLER_EXCLUSION() {
    const envelope = preservationEnvelope();
    assert.deepEqual(Object.keys(envelope).sort(), ['kind','operation','phase','classification','production_release_target','workflow_path','workflow_sha256','workflow_run_id','workflow_run_attempt','workflow_execution_sha','probe_git_sha','probe_deployment_id','preview_origin','project_id','authority_run_id','sealed_manifest_sha256','qa_suite_version','result','timestamp','preview_metadata','product_report_sha256','product_report','attestation_sha256'].sort());
    assert.equal(envelope.kind, 'statistical-levels.identity-probe-attestation.v1');
    assert.equal(envelope.operation, 'PROBE_IDENTITY'); assert.equal(envelope.phase, 'preview');
    assert.equal(envelope.classification, 'PROBE_ONLY'); assert.equal(envelope.production_release_target, false);
    assert.equal(envelope.probe_git_sha, 'a'.repeat(40)); assert.equal(envelope.workflow_execution_sha, 'b'.repeat(40));
    assert.throws(() => releaseContract.validateControllerRequest(envelope));
    for (const key of ['controller_payload','controller_request','qa_attestation','previous_publication_date']) {
      assert.equal(Object.hasOwn(envelope, key), false);
      assert.throws(() => probeContract.validateProbeAttestation({ ...envelope, [key]: {} }, preservationRun, preservationTarget, 'f'.repeat(64)), { message: 'PROBE_ATTESTATION_FIELDS' });
    }
    for (const operation of ['ADOPT_EXISTING_PRODUCTION_BASELINE','PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE'])
      assert.throws(() => probeContract.attestProbe(preservationReport(), preservationRun, { ...preservationTarget, operation }, 'f'.repeat(64), '2026-09-10T08:00:00Z'), { message: 'PROBE_FIXTURE_IDENTITY' });
    assert.equal(regionHash(readFileSync(new URL('../probe-attestation-schema.json', import.meta.url))), 'c4293cfd35f926e7f5b26bd84390c74cae83a8d4a9174c51682c852360e7dfa9');
  },
  WORKFLOW_CONTROLLER_EXCLUSION() {
    const workflow = readFileSync(new URL('../../../.github/workflows/statistical-levels-release.yml', import.meta.url), 'utf8');
    const guard = workflow.split('\n').find(line => line.includes('needs.candidate-qa.result') && line.includes('needs.seal-qa.result'));
    assert.equal(guard, "    if: (inputs.operation == 'ADOPT_EXISTING_PRODUCTION_BASELINE' || inputs.operation == 'PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE') && needs.candidate-qa.result == 'success' && needs.seal-qa.result == 'success' && github.repository == 'luiguiHerrera/Luiguiherrera-web' && github.ref == 'refs/heads/vercel-deployment'");
    assert.ok(workflow.includes('inline-session-policy: \'{"Version":"2012-10-17","Statement":[{"Effect":"Deny","NotAction":"sts:GetCallerIdentity","Resource":"*"}]}\''));
  },
};
function assertProbeSecuritySemantics() { for (const check of Object.values(preservationSemantics)) check(); }
test('product QA preservation: narrow predecessor security pins', () => assertProbeSecurityRegions(probeSourceText()));
test('product QA preservation: exact authorized metadata regions', () => assertAuthorizedProbeMetadata(probeSourceText()));
for (const [name, check] of Object.entries(preservationSemantics)) test('product QA preservation: semantic ' + name, check);
function replacePreservationText(source, before, after) {
  assert.equal(source.split(before).length, 2, 'mutation fixture must match exactly once');
  return source.replace(before, after);
}
const preservationMutations = {
  controller_call: s => replacePreservationText(s, 'export function selectProbeTarget(inputs) {', 'export function selectProbeTarget(inputs) { invokeController();'),
  authorization_import: s => replacePreservationText(s, "from './release-core.mjs'", "from './other-authority.mjs'"),
  release_request: s => replacePreservationText(s, 'classification: \'PROBE_ONLY\'', 'controller_request: {}, classification: \'PROBE_ONLY\''),
  release_fields: s => replacePreservationText(s, "['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha',", "['candidate_git_sha', 'expected_previous_production_sha',"),
  policy_binding: s => replacePreservationText(s, 'project_id: P.project', "project_id: 'other-project'"),
  role_identity: s => replacePreservationText(s, 'identity.Account === P.account_id', 'true'),
  attestation_contract: s => replacePreservationText(s, 'production_release_target: false', 'production_release_target: true'),
  adopt_isolation: s => replacePreservationText(s, "export const PROBE = 'PROBE_IDENTITY'", "export const PROBE = 'ADOPT_EXISTING_PRODUCTION_BASELINE'"),
  promote_isolation: s => replacePreservationText(s, "export const PROBE = 'PROBE_IDENTITY'", "export const PROBE = 'PROMOTE_EXACT_STATISTICAL_LEVELS_CANDIDATE'"),
  unapproved_region: s => replacePreservationText(s, 'new Set(values.map(x => x.id)).size === values.length', 'true'),
  timestamp_validation: s => replacePreservationText(s, 'Number.isFinite(Date.parse(value))', 'true'),
  timestamp_return: s => replacePreservationText(s, 'return Date.parse(value);', 'return 0;'),
  top_level_call: s => s + '\ninvokeController();\n',
  extra_import: s => s + "\nimport './controller.mjs';\n",
  extra_export: s => s + '\nexport { attestProbe as releaseRequest };\n',
  duplicate_declaration: s => s + '\nfunction validateRun(run) {}\n',
  missing_declaration: s => replacePreservationText(s, 'const RUN = /^[1-9][0-9]{0,19}$/;', ''),
  unknown_declaration: s => s + '\nconst bypass = true;\n',
  changed_export: s => replacePreservationText(s, 'function fixtureIdentity(target)', 'export function fixtureIdentity(target)'),
  malformed_ast: s => s + '\nfunction {',
  metadata_timestamp_call: s => replacePreservationText(s, 'function timestamp(value) {', 'function timestamp(value) { invokeController();'),
  metadata_recordTime_call: s => replacePreservationText(s, 'function recordTime(record) {', 'function recordTime(record) { invokeController();'),
  metadata_currentStatus_call: s => replacePreservationText(s, 'function currentStatus(records, validateLink, parentCreated) {', 'function currentStatus(records, validateLink, parentCreated) { invokeController();'),
  metadata_resolveProbePreview_call: s => replacePreservationText(s, 'export function resolveProbePreview(deployments, statusSets, commitStatuses, target) {', 'export function resolveProbePreview(deployments, statusSets, commitStatuses, target) { invokeController();'),
};
for (const [name, mutate] of Object.entries(preservationMutations)) test('product QA preservation: rejects ' + name, () => {
  const source = probeSourceText(), changed = mutate(source);
  assert.notEqual(changed, source);
  // Parse/check only: never evaluate, import or execute mutated source.
  assert.throws(() => assertProbePreservation(changed), /PROBE_CORE_(?:PARSE|INVENTORY|SECURITY|METADATA|TIMESTAMP)/);
});

// Independently frozen from parent 578498f, before authorized runtime wiring.
// Pins cover credential/interception, ingress/errors, raw ledger and close/freeze.
// New architecture behavior is covered by real receipt replay and mutations.
function assertHarnessPreserved(source) {
  const regions = [
["    const context = await browser.newContext(", "    const pending =", "72e217e9a64c3ea3687064fc55660ed83074e65a474229365073ea3fe0a6e044"],
  [
    "  need(production ?",
    "  const pages =",
    "c74bfed5940d5acc468388ab6d791fed900bfd53de9be8f05e3e3989e218cc4d"
  ],
  [
    "    if (!production) cdp.on('Fetch.requestPaused'",
    "    onNative('Network.requestWillBeSent'",
    "7b5aa8fd013377b4b8ec1cabe4b4f5524932f2f74b2abb6256e17480ee598da2"
  ],
  [
    "    function retainUnresolved(",
    "    function recordException(",
    "34460bb9a52e20742e5bc017563c574db8db91fb1661ea4eec446a4750c3d6e8"
  ],
  [
    "      // page.url() fallback",
    "    onNative('Runtime.consoleAPICalled'",
    "8d62d47ce44f90071b6a78ec1e0b390591c31a9ca4a83078af2e18c75ed014a2"
  ],
  [
    "    onNative('Runtime.consoleAPICalled'",
    "    const causalBridge =",
    "2e75e61dcf7a64d6fa0c921760c44bb14cc7951b224b6ac0243f64255b05f60e"
  ],
  [
    "    const closePage=async()=>{",
    "    closePages.set(",
    "c81d22684550234ac5204107b81f6f27ee26a226a6618fe027ef4034724c1a35"
  ],
  [
    "    finish: async finalProductPassed => {",
    "\n    } };",
    "a803b499842cdfbef72f0d5c7981b7cc5bc9e472cff5b804db992aead3771808"
  ],
  [
    "      events.push({ ...requests.get(e.requestId), kind: 'request_failure'",
    "    onNative('Network.responseReceived'",
    "aa6cea3ff300f8b428ed09c8738f46c2e8b8f0f0350c6733977934dc094ea9e0"
  ],
  [
    "      if (e.response.status >= 400) events.push",
    "    // Conversion and journal/ledger insertion",
    "128af595ab5d05b1658e4f960c79ac76b73b43c41f921aa3defb017ded8d4c50"
  ]
];
  for (const [start,end,expected] of regions) {
    const at=source.indexOf(start);assert.ok(at>=0,start);
    assert.equal(source.indexOf(start,at+1),-1,'AMBIGUOUS_SECURITY_REGION');
    const until=source.indexOf(end,at);assert.ok(until>at,end);
    assert.equal(createHash('sha256').update(source.slice(at,until)).digest('hex'),expected,start);
  }
  assert.doesNotMatch(source,/process\.env\.(?:DEBUG_TOKEN|VERCEL_TOKEN)|aws-sdk|InvokeFunction|api\.vercel\.com/);
}

const harnessMutations = [
 ['PRODUCTION_TOKEN_SOURCE_ALLOWED','production ? tokenSource === undefined','production ? true'],
 ['PRODUCTION_FETCH_INTERCEPTION_ENABLED',"if (!production) cdp.on('Fetch.requestPaused'","if (true) cdp.on('Fetch.requestPaused'"],
 ['DEBUG_ALLOWED','!process.env.DEBUG && !process.env.PWDEBUG','true'],
 ['SERVICE_WORKER_ENABLED',"serviceWorkers: 'block'","serviceWorkers: 'allow'"],
 ['FAILURE_LEDGER_DROPPED','events.push({ ...requests.get(e.requestId)', 'void ({ ...requests.get(e.requestId)'],
 ['HTTP_ERROR_IGNORED','e.response.status >= 400','e.response.status > 999'],
 ['APPLICATION_EXCEPTION_IGNORED','events.push({...raw','void ({...raw'],
 ['UNRESOLVED_REQUEST_IGNORED','if(unresolved?.event)events.push(unresolved.event);','if(unresolved?.event)return false;'],
 ['FREEZE_BEFORE_SOURCE_CLOSE','adopt?.pageLifecycle(pageId,\'CLOSING\');adopt?.listenerDrain(pageId);','adopt.freeze();'],
 ['MISSING_DURABLE_EVIDENCE_WRITE',"writeFileSync(path.join(out,'adopt-request-evidence.json')","void (path.join(out,'adopt-request-evidence.json')"],
 ['RECEIPT_ERASES_BLOCKING_EVENT','result = account(events, finalProductPassed, target.origin);','result = account([], true, target.origin);'],
 ['PRODUCTION_INTERCEPTION_ENABLE',"if (!production) await cdp.send('Fetch.enable'","if (true) await cdp.send('Fetch.enable'"],
];
for (const [name,from,to] of harnessMutations) test('harness preservation mutation: '+name,()=>{
 const source=readFileSync(new URL('../scripts/browser-harness-base.mjs',import.meta.url),'utf8');
 assert.ok(source.includes(from),'mutation must reach actual source');
 assert.throws(()=>assertHarnessPreserved(source.replace(from,to)));
});
