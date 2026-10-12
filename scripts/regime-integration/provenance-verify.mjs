// New integration verifier. Historical verifiers/data remain byte-for-byte intact.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { SOURCE_RC2, GENERATOR_PATH, digest, requireEvidence, verifyCalendar, verifyGeneratorDelta, verifyHistoricalArtifact } from './provenance-core.mjs';

const flags={};
try {
  const args=process.argv.slice(2);
  requireEvidence(args.length%2===0,'EXPECTED_NAMED_ARGUMENT_PAIRS');
  for(let i=0;i<args.length;i+=2){requireEvidence(['--root','--source-rc2','--remote-base','--output','--archive'].includes(args[i])&&!flags[args[i]]&&args[i+1],'INVALID_ARGUMENT');flags[args[i]]=args[i+1];}
  const root=fs.realpathSync(flags['--root']??process.cwd()),sourceRC2=flags['--source-rc2'],remoteBase=flags['--remote-base'];
  requireEvidence(sourceRC2===SOURCE_RC2&&/^[a-f0-9]{40}$/.test(remoteBase??''),'EXPLICIT_DUAL_BASELINE_REQUIRED');
  const output=flags['--output']?path.resolve(flags['--output']):null;
  requireEvidence(!output||(!fs.existsSync(output)&&!output.startsWith(root+path.sep)),'OUTPUT_MUST_BE_NEW_AND_EXTERNAL');
  const readWorking=file=>fs.readFileSync(path.join(root,file));
  const readGit=(ref,file)=>{requireEvidence(/^[a-f0-9]{40}$/.test(ref)&&!file.startsWith('/')&&!file.split('/').includes('..'),'INVALID_GIT_BLOB_IDENTITY');return execFileSync('git',['-C',root,'show',`${ref}:${file}`],{maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});};
  const artifact=verifyHistoricalArtifact({readWorking,readGit,remoteBase});
  const calendar=verifyCalendar({readWorking,readGit,sourceRC2});
  const historicalSource=readGit(artifact.generatorCommit,GENERATOR_PATH),remoteSource=readGit(remoteBase,GENERATOR_PATH),integratedSource=readWorking(GENERATOR_PATH);
  const generator=verifyGeneratorDelta({sourceRC2Source:readGit(sourceRC2,GENERATOR_PATH),remoteSource,integratedSource});
  // Both imports have already been checked against the historical/RC2 bytes.
  const offline=await import(pathToFileURL(path.join(root,'scripts/statistical-levels-offline.mjs')).href);
  const calendarApi=await import(pathToFileURL(path.join(root,'lib/regime-engine-v2/operations/calendar-package.ts')).href);
  calendarApi.verifyReviewedCalendarRelease(JSON.parse(readWorking('lib/regime-engine-v2/calendars/reviewed-2026.json')));
  const historicalEngine=offline.createEngine(String(historicalSource),artifact.config.SNAPSHOT_CUTOFF),integratedEngine=offline.createEngine(String(integratedSource),artifact.config.SNAPSHOT_CUTOFF);
  const functionNames=Object.keys(historicalEngine.engine).filter(k=>typeof historicalEngine.engine[k]==='function');
  const computationalFunctions=functionNames.map(name=>{requireEvidence(typeof integratedEngine.engine[name]==='function'&&String(historicalEngine.engine[name])===String(integratedEngine.engine[name]),'EXPORTED_FORMULA_CHANGED');return {name,sourceSha256:digest(String(historicalEngine.engine[name])),identical:true};});
  requireEvidence(JSON.stringify(historicalEngine.engine.universe)===JSON.stringify(integratedEngine.engine.universe),'ASSET_UNIVERSE_CHANGED');
  let reproduction={status:'NOT_RUN',reason:'Exact privately archived raw input was not supplied. Artifact binding and formula identity are not mislabeled as historical reproduction.'};
  if(flags['--archive']) {
    const archive=fs.realpathSync(flags['--archive']);requireEvidence(!archive.startsWith(root+path.sep),'RAW_ARCHIVE_MUST_BE_EXTERNAL');
    const rawManifest=offline.verifyArchive(archive,artifact.config);
    const before=new Map(artifact.snapshots.map(s=>[s.file,digest(readWorking('lib/statistical-levels/generated/'+s.file))]));
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'regime-integration-provenance-'));fs.chmodSync(temp,0o700);
    try {
      // Same frozen inputs/config twice; source identity is intentionally distinct.
      // Only separate temporary outputs are written. Published sidecars stay intact.
      const priorFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('PROVIDER_FETCH_FORBIDDEN');};
      let historical,integrated;
      try {
        historical=offline.generateSnapshots({archive,output:path.join(temp,'historical'),config:artifact.config,source:String(historicalSource)});
        integrated=offline.generateSnapshots({archive,output:path.join(temp,'integrated'),config:artifact.config,source:String(integratedSource)});
      } finally {globalThis.fetch=priorFetch;}
      const cases=artifact.snapshots.map(snapshot=>{
        const h=fs.readFileSync(path.join(temp,'historical',snapshot.file)),i=fs.readFileSync(path.join(temp,'integrated',snapshot.file));
        requireEvidence(digest(h)===snapshot.sha256,'HISTORICAL_GENERATOR_DID_NOT_REPRODUCE_PUBLISHED_BYTES');
        requireEvidence(h.equals(i),'INTEGRATED_GENERATOR_OUTPUT_DIFFERS');
        requireEvidence(digest(readWorking('lib/statistical-levels/generated/'+snapshot.file))===before.get(snapshot.file),'PUBLISHED_OUTPUT_MUTATED');
        return {file:snapshot.file,historicalSha256:digest(h),integratedSha256:digest(i),publishedSha256:snapshot.sha256,identical:true};
      });
      requireEvidence(historical.runManifest.NETWORK_ATTEMPTS===0&&integrated.runManifest.NETWORK_ATTEMPTS===0,'FORBIDDEN_REPRODUCTION_NETWORK');
      requireEvidence(historical.provenance.GENERATOR_SHA256===artifact.generatorBundleHash,'HISTORICAL_BUNDLE_BINDING_CHANGED');
      requireEvidence(integrated.provenance.GENERATOR_SHA256!==historical.provenance.GENERATOR_SHA256,'DISTINCT_GENERATOR_IDENTITY_WAS_HIDDEN');
      reproduction={status:'PASS',historicalRaw:true,archiveManifestSha256:artifact.config.RAW_MANIFEST_SHA256,archiveChecksumManifestSha256:artifact.config.RAW_ARCHIVE_MANIFEST_SHA256,rawAssets:rawManifest.records.length,publishedSnapshotCases:cases.length,historicalGeneratorBundleHash:historical.provenance.GENERATOR_SHA256,integratedGeneratorBundleHash:integrated.provenance.GENERATOR_SHA256,publishedProvenanceRewritten:false,generatedSidecars:'Separate temporary proof outputs only; integrated identity is not attributed to published historical snapshots.',nodeVersion:process.version,publishedGenerationNodeVersion:JSON.parse(readWorking('lib/statistical-levels/generated-provenance.json')).NODE_VERSION,networkAttempts:0,providerFetches:0,cases};
    } finally {fs.rmSync(temp,{recursive:true,force:true});}
  }
  const result={schemaVersion:'regime-remote-integration-provenance/1.0.0',status:reproduction.status==='PASS'?'PASS':'PASS_BINDINGS_HISTORICAL_REPLAY_NOT_RUN',sourceRC2,remoteBase,baselineModel:'DUAL_BASELINE',finding:'RI-PROVENANCE-002',resolution:'HISTORICAL_GENERATOR_BLOB_BINDING_PLUS_SEPARATE_INTEGRATED_HOOK_EQUIVALENCE',actualDefectDomain:'Statistical Levels historical generator expectation, not a calendar materialization change',calendar,artifact,generator,computationalFunctions,reproduction,historicalVerifiersRewritten:false,storedProvenanceChanged:false,rawInputsWrittenToGit:false,caseCRequired:false};
  if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({status:result.status,output,historicalSources:artifact.sources.length,publishedSnapshots:artifact.snapshots.length,calendar:calendar.status,historicalReplay:reproduction.status})+'\n');
} catch(error) {
  const code=typeof error?.code==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(error.code)?error.code:'INTEGRATION_PROVENANCE_VERIFICATION_FAILED';
  process.stderr.write(JSON.stringify({status:'FAIL',code})+'\n');process.exitCode=1;
}
