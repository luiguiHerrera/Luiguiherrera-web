// Integration evidence joins two authorities; it never changes stored provenance.
import { createHash } from 'node:crypto';

export const SOURCE_RC2 = '2271bee0a21aadd12ab2f45d080c58c94b696326';
export const CALENDAR_PATH = 'lib/regime-engine-v2/calendars/reviewed-2026.json';
export const PROVENANCE_PATH = 'lib/statistical-levels/generated-provenance.json';
export const GENERATOR_PATH = 'scripts/build-statistical-levels.mjs';
export const digest = value => createHash('sha256').update(value).digest('hex');
export function requireEvidence(condition, code) { if (!condition) throw Object.assign(new Error(code), { code }); }
const json = value => JSON.parse(Buffer.isBuffer(value) ? value.toString() : value);
const same = (a,b) => Buffer.from(a).equals(Buffer.from(b));
const validPath = value => typeof value==='string' && !value.startsWith('/') && !value.split('/').some(part=>!part||part==='.'||part==='..');

export function verifyCalendar({readWorking,readGit,sourceRC2=SOURCE_RC2}) {
  requireEvidence(sourceRC2===SOURCE_RC2,'UNAPPROVED_SOURCE_RC2');
  const expected=readGit(sourceRC2,CALENDAR_PATH), actual=readWorking(CALENDAR_PATH);
  requireEvidence(same(actual,expected),'CALENDAR_PAYLOAD_CHANGED_STOP_CASE_C');
  const release=json(actual);
  const approvedVersions={equity:'2026-reviewed-c1954f555e37dec4ca1e860848f4fc91a834b1b0aaa7dc99bcc14ca54c729674',vix:'2026-reviewed-8e33f92519f19c0c09986fd888058f289ffe2fc09aefd42723b3e62185123ad6',vx:'2026-reviewed-f35287986642f0832e2bd1986a8ce635b433b14951c775fb7f3af702db3bea0c'};
  requireEvidence(release.releaseIdentity==='9b1bc306a4d8e390a294ceafc68fb0695465b7c4e5d3d4709507e5d8df8a7cf0','CALENDAR_RELEASE_CHANGED_STOP_CASE_C');
  const semanticsFiles=['lib/regime-engine-v2/operations/calendar-package.ts','lib/regime-engine-v2/temporal.ts','lib/regime-engine-v2/contract.ts'];
  const sourceFiles=semanticsFiles.map(file=>{const expected=readGit(sourceRC2,file),actual=readWorking(file);requireEvidence(same(expected,actual),'CALENDAR_OR_CONTRACT_IMPLEMENTATION_CHANGED_STOP_CASE_C');return {file,sha256:digest(actual),equalsSourceRC2:true};});
  return {status:'PASS',payloadChanged:false,payloadSha256:digest(actual),releaseIdentity:release.releaseIdentity,contentIdentical:true,releaseIdsIdentical:true,coverageIdentical:true,semanticsIdentical:true,sourceFiles,families:Object.fromEntries(Object.entries(approvedVersions).map(([family,version])=>{
    const entry=release.families[family],c=entry.calendar;
    requireEvidence(c.version===version,'CALENDAR_VERSION_CHANGED_STOP_CASE_C');
    return [family,{version:c.version,calendarHash:entry.calendarHash,coverageStart:c.coverageStart,coverageEnd:c.coverageEnd,sessions:c.sessions.length,sourceId:c.sourceId,availableAt:c.availableAt,inputs:entry.inputs}];
  }))};
}

export function verifyGeneratorDelta({sourceRC2Source,remoteSource,integratedSource}) {
  const rc=String(sourceRC2Source), remote=String(remoteSource), current=String(integratedSource);
  const marker='    let text;\n    if (process.env.V2_SHADOW === "ON"';
  const start=rc.indexOf(marker),end=rc.indexOf('    return { url, status: response.status,',start);
  requireEvidence(start>=0 && end>start && rc.indexOf(marker,start+1)===-1,'ACCEPTED_CAPTURE_HOOK_IDENTITY_MISSING');
  const approvedHook=rc.slice(start,end);
  requireEvidence(current.split(approvedHook).length===2,'INTEGRATED_HOOK_DIFFERS_FROM_SOURCE_RC2');
  requireEvidence(!remote.includes(marker),'REMOTE_ALREADY_HAS_ANOTHER_CAPTURE_HOOK');
  requireEvidence(current.replace(approvedHook,'    const text = await response.text();\n')===remote,'GENERATOR_CHANGE_EXCEEDS_ACCEPTED_PASSIVE_HOOK');
  return {status:'PASS',sourceRC2GeneratorHash:digest(rc),historicalRemoteGeneratorHash:digest(remote),integratedGeneratorHash:digest(current),approvedHookHash:digest(approvedHook),hookPreserved:true,allBytesOutsideHookEqualRemote:true,classification:'CASE_B_PASSIVE_TRANSPORT_CAPTURE_ADDITION_WITH_UNCHANGED_FORMULA_BYTES'};
}

export function verifyHistoricalArtifact({readWorking,readGit,remoteBase}) {
  requireEvidence(/^[a-f0-9]{40}$/.test(remoteBase),'EXPLICIT_REMOTE_BASE_REQUIRED');
  const provenanceBytes=readWorking(PROVENANCE_PATH),remoteBytes=readGit(remoteBase,PROVENANCE_PATH);
  requireEvidence(same(provenanceBytes,remoteBytes),'PUBLISHED_PROVENANCE_CHANGED');
  const p=json(provenanceBytes);
  requireEvidence(p.SCHEMA_VERSION==='statistical-levels.provenance.v1' && /^[a-f0-9]{40}$/.test(p.GENERATOR_COMMIT),'UNSUPPORTED_HISTORICAL_PROVENANCE');
  requireEvidence(p.CONFIG_SHA256===digest(JSON.stringify(p.CONFIG)) && p.BASELINE_ID===p.CONFIG.BASELINE_ID && p.GENERATOR_SHA256===digest(JSON.stringify(p.SOURCE_BUNDLE)),'PROVENANCE_INTERNAL_BINDING_FAILED');
  const expectedSources=[GENERATOR_PATH,'scripts/statistical-levels-offline.mjs','lib/statistical-levels/baseline-policy.mjs','lib/statistical-levels/defect-repairs.mjs'];
  requireEvidence(JSON.stringify(p.SOURCE_BUNDLE.map(row=>row.file))===JSON.stringify(expectedSources),'UNREVIEWED_SOURCE_BUNDLE');
  const sources=p.SOURCE_BUNDLE.map(row=>{
    requireEvidence(validPath(row.file),'INVALID_HISTORICAL_SOURCE_PATH');
    const historical=readGit(p.GENERATOR_COMMIT,row.file);
    requireEvidence(digest(historical)===row.SHA256,'HISTORICAL_GENERATOR_BLOB_HASH_MISMATCH');
    requireEvidence(same(historical,readGit(remoteBase,row.file)),'REMOTE_GENERATOR_DIFFERS_FROM_PUBLISHED_AUTHORITY');
    const integrated=readWorking(row.file);
    if(row.file!==GENERATOR_PATH)requireEvidence(same(integrated,historical),'NON_HOOK_GENERATION_DEPENDENCY_CHANGED');
    return {file:row.file,recordedSha256:row.SHA256,historicalGeneratorCommit:p.GENERATOR_COMMIT,historicalBlobSha256:digest(historical),integratedSha256:digest(integrated),sameAsHistorical:same(integrated,historical)};
  });
  requireEvidence(p.snapshots.length===81 && new Set(p.snapshots.map(s=>s.FILE)).size===81,'SNAPSHOT_COVERAGE_MISMATCH');
  const snapshots=p.snapshots.map(s=>{
    requireEvidence(s.FILE==='manifest.json'||/^(assets|seasonality)\/[A-Z0-9]+\.json$/.test(s.FILE),'INVALID_SNAPSHOT_PATH');
    const file='lib/statistical-levels/generated/'+s.FILE,actual=readWorking(file);
    requireEvidence(digest(actual)===s.SNAPSHOT_SHA256 && same(actual,readGit(remoteBase,file)),'PUBLISHED_SNAPSHOT_BYTES_CHANGED');
    for(const key of ['SCHEMA_VERSION','GENERATOR_COMMIT','GENERATOR_SHA256','CONFIG_SHA256','GENERATED_AT'])requireEvidence(s[key]===(key==='SCHEMA_VERSION'?p.CONFIG.SCHEMA_VERSION:p[key]),'SNAPSHOT_PROVENANCE_FIELD_MISMATCH');
    requireEvidence(s.INPUTS.length===(s.FILE==='manifest.json'?40:1),'SNAPSHOT_INPUT_CARDINALITY_MISMATCH');
    for(const input of s.INPUTS){for(const key of ['RAW_SOURCE_ID','RAW_SHA256','RAW_ROW_COUNT','RAW_FIRST_DATE','RAW_LAST_DATE','SNAPSHOT_CUTOFF','CURRENT_MARK_TIMESTAMP','LAST_COMPLETED_OBSERVATION'])requireEvidence(Boolean(input[key]),'INCOMPLETE_SNAPSHOT_INPUT_BINDING');requireEvidence(input.SNAPSHOT_CUTOFF===p.CONFIG.SNAPSHOT_CUTOFF,'SNAPSHOT_INPUT_CUTOFF_MISMATCH');}
    return {file:s.FILE,sha256:s.SNAPSHOT_SHA256,bytes:actual.length};
  });
  return {status:'PASS',classification:'CASE_A_HISTORICAL_SOURCE_BOUND_TO_GENERATOR_COMMIT_NOT_CURRENT_CHECKOUT',domain:'STATISTICAL_LEVELS',calendarDefect:false,provenanceSha256:digest(provenanceBytes),provenanceChanged:false,generatorCommit:p.GENERATOR_COMMIT,generatorBundleHash:p.GENERATOR_SHA256,remoteBase,sources,snapshots,config:p.CONFIG,rawHistoricalReplay:'NOT_EXECUTED_BY_BINDING_CHECK',historicalVerifierRewritten:false};
}
