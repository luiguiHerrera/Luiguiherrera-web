// Compare the old security/QA contract after removing only explicitly authorized additions.
export function withoutReceiptHooks(source) {
  return source.replace(/c\.transitionStart\?\.\('T[1-4]'\),/g,'').replace(/if\(c\.transitionComplete\)await c\.transitionComplete\('T[1-4]'\);/g,'');
}
export function withoutReceiptClass(source) {
  return String(source).replace("event.classification === (kind === 'raw_rsc_events' ? 'rsc_transition_completed_non_application' : 'platform_non_application')", "event.classification === (kind === 'raw_rsc_events' ? 'rsc_non_application' : 'platform_non_application')");
}

// Historical assertions keep their original subjects. Current bytes must first
// match the independently fixed Rprime and the already admitted publication closure.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../../../',import.meta.url));
const digest=value=>createHash('sha256').update(value).digest('hex');
const DX="8ce104066fe968026d24e0f006744f88e338585a", CLOSURE="5c53fa63577c39e8b656b563865cbefd4cd8b524", RPRIME="aec5be3b7207d1023effea78785291df815965b9";
const filePins={
  "release-core.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "c780d2996c3b77f99ed56226ca93317eaa1bdae06890f3d6ab484e97ded441ee",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "841304fcab5cd79590259a0b2eaa53255e88950224f218f3cdccf69c2796c692",
    "aec5be3b7207d1023effea78785291df815965b9": "20d75ef381a2c2b488292a9a8c1c1642a1e962b8e9bc874d945053c1afc1964b"
  },
  "runtime-io.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "0c37a3b444a32847f3b9af0de405313d79e765e7e65c33e3ed7e45c9c385d0ef",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "983b968d5869ecc3184cdfc7a38916ff444239d572ff2d47d0e7bcbdc6ee3127",
    "aec5be3b7207d1023effea78785291df815965b9": "b0c739e966a4f466dde7747325c05775c392116f6117fb572357520a445d6b0a"
  },
  "cli.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "c353aca844d0d69973d0bcd8abd9bf9539fd908245aca49d0caffcdb4a8c2407",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "68eca36d28444373dc1c18580f80c1f26a16189b49c61cda1f4145fe4f152b30",
    "aec5be3b7207d1023effea78785291df815965b9": "5a6603152660040e42fdf7db8d7327487c39c1444acd0355aecbf1c562e8378e"
  },
  "invoke.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "25132f92c007fef6ad503282c0e62c0248887bebec2bac0a76e26e737630de0b",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "f149c42fdb206de21448b659479fe6d59716a0d1332002c72e3691a777dc6ed3",
    "aec5be3b7207d1023effea78785291df815965b9": "08b17b6e45d598b69629771c1844ca88c3f10444cf9e5b224d568e907bea5b23"
  },
  "browser-harness.mjs": {
    "8ce104066fe968026d24e0f006744f88e338585a": "2896a2c3f2886321eb47291a007fdf272ec95f4f4a593362d9a4a4ca6f04bf4c",
    "5c53fa63577c39e8b656b563865cbefd4cd8b524": "dc1d4bb7d45dc3a3daa253c5c0c4a74b1c764b110cfb4eb040ef38e6d3217589",
    "aec5be3b7207d1023effea78785291df815965b9": "dc1d4bb7d45dc3a3daa253c5c0c4a74b1c764b110cfb4eb040ef38e6d3217589"
  }
};
function historicalBlob(ref,name,expected) {
  const bytes=execFileSync('git',['--no-optional-locks','show',ref+':'+name],{cwd:repo});
  assert.equal(digest(bytes),expected,'HISTORICAL_SUBJECT_BYTES:'+name);
  return bytes;
}
export function historicalPinnedBytes(file,current) {
  const name=file.replace(/^scripts\//,'');
  if(!Object.hasOwn(filePins,name))return current;
  const pins=filePins[name],gitName='scripts/statistical-levels-release/scripts/'+name;
  assert.equal(digest(current),pins[RPRIME],'CURRENT_HISTORICAL_CONTRACT:'+name);
  historicalBlob(RPRIME,gitName,pins[RPRIME]);
  historicalBlob(CLOSURE,gitName,pins[CLOSURE]);
  return historicalBlob(DX,gitName,pins[DX]);
}
const historicalReleaseInputs="const releaseInputs = ['candidate_git_sha', 'candidate_deployment_id', 'expected_previous_production_sha',\n  'expected_previous_production_deployment', 'previous_publication_date'];";
const currentReleaseInputsSHA="bcc473a55991a468620d522e475495def75d8978068eefe75ffe07816285221b";
export function historicalProbeRegion(name,source) {
  if(name!=='releaseInputs')return source;
  assert.equal(digest(source),currentReleaseInputsSHA,'PROBE_CORE_SECURITY:releaseInputs');
  return historicalReleaseInputs;
}
const workflowPath='.github/workflows/statistical-levels-release.yml';
const normalizeWorkflow=source=>source.replace(/(EXPECTED_SOURCE_SUMS: )[a-f0-9]{64}/g,'$1<FROZEN_SOURCE_SUMS>');
const workflowNormalizedSHA="c548670b9e2d652e34aebed307fee83bed76d349f22ebccf939048ce9b3a798f";
const historicalWorkflowSHA="13d9429121704fb5a7ca891cfbe06c60629a357540c41fd86cd8ccdd00038b28";
const requiredJobs=["candidate-qa", "seal-qa", "invoke-controller", "production-qa", "seal-production-qa", "certify-production", "publication-result", "daily-dispatch", "identity-probe", "transition-prepare", "transition-qa", "seal-transition-qa", "transition-certify"];
export function assertHistoricalWorkflow(source) {
  const pins=[...source.matchAll(/EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})/g)].map(m=>m[1]);
  const sums=digest(readFileSync(new URL('../SOURCE_SHA256SUMS',import.meta.url)));
  assert.equal(pins.length,10,'HISTORICAL_WORKFLOW_PINS');
  assert.ok(pins.every(pin=>pin===sums),'HISTORICAL_WORKFLOW_PINS');
  const jobs=[...source.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)].map(m=>m[1]);
  assert.deepEqual(jobs,requiredJobs,'HISTORICAL_WORKFLOW_JOB_INVENTORY');
  assert.equal(new Set(jobs).size,jobs.length,'HISTORICAL_WORKFLOW_DUPLICATE_JOB');
  assert.equal(digest(normalizeWorkflow(source)),workflowNormalizedSHA,'HISTORICAL_WORKFLOW_DELTA');
}
export function exactWorkflowJob(source,name) {
  assertHistoricalWorkflow(source);
  const jobs=[...source.matchAll(/^  ([a-z][a-z0-9-]*):\n/gm)];
  const index=jobs.findIndex(m=>m[1]===name);
  assert.ok(index>=0,'HISTORICAL_WORKFLOW_MISSING_JOB');
  return source.slice(jobs[index].index,index+1<jobs.length?jobs[index+1].index:source.length);
}
export function historicalWorkflowPrefix(source) {
  assertHistoricalWorkflow(source);
  const historical=historicalBlob(DX,workflowPath,historicalWorkflowSHA).toString();
  assert.equal(historical.split('  identity-probe:\n').length,2,'HISTORICAL_WORKFLOW_PROBE');
  return normalizeWorkflow(historical.split('  identity-probe:\n')[0]);
}
