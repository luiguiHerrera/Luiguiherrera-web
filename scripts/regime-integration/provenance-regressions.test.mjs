import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SOURCE_RC2, CALENDAR_PATH, PROVENANCE_PATH, GENERATOR_PATH, digest, verifyCalendar, verifyGeneratorDelta, verifyHistoricalArtifact } from './provenance-core.mjs';

const remoteBase=process.env.REGIME_INTEGRATION_REMOTE_BASE??'7dae726917ded8f5828a8525d596b1ce02830196';
const readWorking=file=>fs.readFileSync(file);
const readGit=(ref,file)=>execFileSync('git',['show',`${ref}:${file}`],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
const hookArgs=()=>({sourceRC2Source:readGit(SOURCE_RC2,GENERATOR_PATH),remoteSource:readGit(remoteBase,GENERATOR_PATH),integratedSource:readWorking(GENERATOR_PATH)});

test('published 81 snapshots retain their recorded historical generator identity despite the distinct approved capture hook',()=>{
  const result=verifyHistoricalArtifact({readWorking,readGit,remoteBase});
  assert.equal(result.snapshots.length,81);assert.equal(result.sources.length,4);
  assert.equal(result.generatorCommit,'75a89d93c79752ca83cde0c9ef6bb221071dd4cd');
  const generator=result.sources.find(s=>s.file===GENERATOR_PATH);
  assert.equal(generator.recordedSha256,'e298c952e02112757d09ccf089383dd4653e044b305cd4d45e5f624857b04f6c');
  assert.equal(generator.sameAsHistorical,false);assert.notEqual(generator.integratedSha256,generator.recordedSha256);
  assert.equal(result.provenanceChanged,false);assert.equal(result.rawHistoricalReplay,'NOT_EXECUTED_BY_BINDING_CHECK');
});
test('a substituted historical Git generator fails its recorded hash even when current checkout is unchanged',()=>{
  const historical=JSON.parse(readWorking(PROVENANCE_PATH)).GENERATOR_COMMIT;
  assert.throws(()=>verifyHistoricalArtifact({readWorking,remoteBase,readGit:(ref,file)=>ref===historical&&file===GENERATOR_PATH?Buffer.concat([readGit(ref,file),Buffer.from('\n// changed\n')]):readGit(ref,file)}),{code:'HISTORICAL_GENERATOR_BLOB_HASH_MISMATCH'});
});
test('changing the published provenance to bless the integrated generator is rejected',()=>{
  const changed=JSON.parse(readWorking(PROVENANCE_PATH));changed.SOURCE_BUNDLE[0].SHA256=digest(readWorking(GENERATOR_PATH));changed.GENERATOR_SHA256=digest(JSON.stringify(changed.SOURCE_BUNDLE));
  assert.throws(()=>verifyHistoricalArtifact({remoteBase,readGit,readWorking:file=>file===PROVENANCE_PATH?Buffer.from(JSON.stringify(changed)):readWorking(file)}),{code:'PUBLISHED_PROVENANCE_CHANGED'});
});
test('a changed canonical statistical snapshot is rejected independently of formula equivalence',()=>{
  assert.throws(()=>verifyHistoricalArtifact({remoteBase,readGit,readWorking:file=>file==='lib/statistical-levels/generated/assets/SPY.json'?Buffer.concat([readWorking(file),Buffer.from(' ')]):readWorking(file)}),{code:'PUBLISHED_SNAPSHOT_BYTES_CHANGED'});
});
test('the approved source hook is preserved and every other generator byte equals fresh remote authority',()=>{
  const result=verifyGeneratorDelta(hookArgs());assert.equal(result.hookPreserved,true);assert.equal(result.allBytesOutsideHookEqualRemote,true);
  assert.equal(result.sourceRC2GeneratorHash,'de9da118da379ccb12618adee258364b730935da36055b9822ca201f869095dd');
  assert.notEqual(result.sourceRC2GeneratorHash,result.historicalRemoteGeneratorHash);assert.notEqual(result.integratedGeneratorHash,result.historicalRemoteGeneratorHash);
});
test('an unrelated formula edit cannot be excused as the passive capture hook',()=>{
  const args=hookArgs();args.integratedSource=String(args.integratedSource).replace('annualization: Math.sqrt(252)','annualization: Math.sqrt(253)');
  assert.throws(()=>verifyGeneratorDelta(args),{code:'GENERATOR_CHANGE_EXCEEDS_ACCEPTED_PASSIVE_HOOK'});
});
test('silently removing the already approved capture hook fails the integration proof',()=>{
  const args=hookArgs();args.integratedSource=args.remoteSource;
  assert.throws(()=>verifyGeneratorDelta(args),{code:'INTEGRATED_HOOK_DIFFERS_FROM_SOURCE_RC2'});
});
test('accepted calendar provenance validates with exact payload, releases and original coverage',()=>{
  const result=verifyCalendar({readWorking,readGit});
  assert.equal(result.payloadSha256,'570adddeef6e6dfdfa313cafb3c98c7a6793e3a932b49387132a99deb17e396a');
  assert.equal(result.families.equity.sessions,251);assert.equal(result.families.vix.sessions,209);assert.equal(result.families.vx.sessions,251);
  assert.equal(result.families.vix.coverageEnd,'2026-10-31');assert.equal(result.families.equity.coverageEnd,'2026-12-31');assert.equal(result.families.vx.coverageEnd,'2026-12-31');
  assert.equal(result.payloadChanged,false);assert.equal(result.semanticsIdentical,true);
});
test('a calendar session change fails closed as Case C even if other release labels remain',()=>{
  const changed=JSON.parse(readWorking(CALENDAR_PATH));changed.families.equity.calendar.sessions.pop();
  assert.throws(()=>verifyCalendar({readGit,readWorking:file=>file===CALENDAR_PATH?Buffer.from(JSON.stringify(changed)):readWorking(file)}),{code:'CALENDAR_PAYLOAD_CHANGED_STOP_CASE_C'});
});
test('a calendar implementation change cannot be hidden behind equal JSON',()=>{
  const file='lib/regime-engine-v2/temporal.ts';
  assert.throws(()=>verifyCalendar({readGit,readWorking:name=>name===file?Buffer.concat([readWorking(name),Buffer.from('\n// changed')]):readWorking(name)}),{code:'CALENDAR_OR_CONTRACT_IMPLEMENTATION_CHANGED_STOP_CASE_C'});
});
test('September static production preservation is scoped to fresh remote data while historical test bytes stay unchanged',()=>{
  const original='lib/reports/september-production-integration.test.mts';assert.deepEqual(readWorking(original),readGit(remoteBase,original));
  assert.match(readWorking(original).toString(),/const production = '80e5cc26d29d68d71ff55022f6897bd3e08640bf'/);
  for(const file of ['scripts/statistical-levels-offline.mjs','lib/statistical-levels/baseline-policy.mjs','lib/statistical-levels/defect-repairs.mjs','lib/statistical-levels/baseline-config.json',PROVENANCE_PATH,'lib/dashboard/get-dashboard-data.ts','lib/dashboard/regime-scoring.ts'])assert.deepEqual(readWorking(file),readGit(remoteBase,file),file);
  verifyGeneratorDelta(hookArgs());
  assert.notDeepEqual(readGit('80e5cc26d29d68d71ff55022f6897bd3e08640bf',PROVENANCE_PATH),readGit(remoteBase,PROVENANCE_PATH),'The historical assertion is preserved, not pretended to pass against newer generated data');
});
test('live statistical dates bind to fresh published input provenance while the complete report remains frozen',()=>{
  const provenance=JSON.parse(readGit(remoteBase,PROVENANCE_PATH));
  const asset=JSON.parse(readWorking('lib/statistical-levels/generated/assets/BTCUSD.json'));
  const input=provenance.snapshots.find(s=>s.FILE==='assets/BTCUSD.json').INPUTS[0];
  assert.equal(asset.lastDate,input.RAW_LAST_DATE);assert.equal(asset.currentMark.timestamp,input.CURRENT_MARK_TIMESTAMP);
  assert.equal(asset.lastDate,'2026-09-09');assert.notEqual(asset.lastDate,'2026-09-06');
  const original='lib/reports/september-current-production-isolation.test.mts';assert.deepEqual(readWorking(original),readGit(remoteBase,original));
  assert.match(readWorking(original).toString(),/assert.equal\(before.asset.lastDate, '2026-09-06'\)/);
  for(const file of ['lib/reports/snapshots/primer-informe-septiembre-2026/statistical.json','lib/reports/snapshots/primer-informe-septiembre-2026/prices-evidence.json.gz'])assert.deepEqual(readWorking(file),readGit(remoteBase,file),file);
});
