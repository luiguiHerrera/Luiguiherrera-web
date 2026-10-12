/** Full raw-boundary and real legacy-dashboard offline performance measurement. */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const p8=path.join(root,'docs/regime-engine-v2/p8/evidence');
const fixturePath=path.join(root,'docs/regime-engine-v2/sweeper/shadow-input-r2.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stats=values=>{const s=[...values].sort((a,b)=>a-b);return{n:s.length,minMs:s[0],medianMs:s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2,meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:s[Math.floor((s.length-1)*.95)],maxMs:s.at(-1)};};
const memory=()=>{const m=process.memoryUsage();return{heapUsedBytes:m.heapUsed,rssBytes:m.rss,externalBytes:m.external,arrayBuffersBytes:m.arrayBuffers};};
const codeFiles=['lib/regime-engine-v2/normalize.ts','lib/regime-engine-v2/operations/dashboard-shadow.ts','lib/regime-engine-v2/operations/source-input.ts','lib/regime-engine-v2/operations/snapshot.ts','lib/regime-engine-v2/operations/pipeline-capture.ts','lib/dashboard/get-dashboard-data.ts','lib/dashboard/regime-scoring.ts'];
const hashes=()=>Object.fromEntries(codeFiles.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));

async function buildBundle(directory) {
  const {hash}=await import(path.join(root,'lib/regime-engine-v2/math.ts'));
  const {prepareSourceInput}=await import(path.join(root,'lib/regime-engine-v2/operations/source-input.ts'));
  const {evaluateRegime}=await import(path.join(root,'lib/regime-engine-v2/engine.ts'));
  const input=JSON.parse(fs.readFileSync(fixturePath));const ledger=[];
  const capture=(bytes,sourceId,sourceUrl,startedAt,completedAt,evidence='FROZEN_P8_R2_RAW_IMPORT')=>{
    const rawHash=sha(bytes),sourceVersion='p8-source-contract/1.0.0';
    const metadata={sourceId,sourceVersion,vintageHash:rawHash,sourcePublishedAt:null,capturedAt:completedAt,availableAt:completedAt,availabilityCertainty:'CONSERVATIVE_BOUND',availabilityEvidence:evidence,replayClass:'R2',status:'AVAILABLE'};
    const body={sourceId,sourceVersion,sourceUrl,startedAt,completedAt,rawHash,rawBase64:Buffer.from(bytes).toString('base64'),origin:'R2_IMPORT',metadata};return{...body,captureId:hash(body)};
  };
  const original=(name,sourceId)=>{
    const m=JSON.parse(fs.readFileSync(path.join(p8,name+'.metadata.json'))),bytes=gunzipSync(fs.readFileSync(path.join(p8,name+'.gz')));
    assert.equal(sha(bytes),m.raw_sha256);ledger.push({name,sourceUrl:m.url,rawHash:m.raw_sha256,rawBytes:bytes.length,capturedAt:m.captured_at,origin:'R2_IMPORT'});
    return capture(bytes,sourceId,m.url,m.capture_started_at,m.captured_at);
  };
  const dates=input.calendars.equity.sessions.map(r=>r.session),target=dates.at(-1);
  const captures=Object.keys(input.equity).map(ticker=>({kind:'YAHOO_ADJCLOSE',ticker,observationDates:dates,capture:original(`yahoo-${ticker}.json`,'EQUITY_ADJUSTED')}));
  captures.push({kind:'CBOE_VIX_CSV',observationDates:dates.slice(-6),capture:original('vix-history.csv','VIX_OFFICIAL')});
  captures.push({kind:'CFE_MONTHLY_CATALOG',capture:original('cfe-contract-index.json','VX_OFFICIAL')});
  for(const identity of input.vx.expectedContracts.slice(0,2))captures.push({kind:'CFE_MONTHLY_CSV',identity,observationDates:[target],capture:original(`vx-${identity.expirationDate}.csv`,'VX_OFFICIAL')});
  const representedAt=new Date().toISOString(),calendarRaw=Buffer.from(JSON.stringify({...input.calendars.equity,coverageEnd:'2026-09-05'}));
  const calendarCapture=capture(calendarRaw,'R2_PROXY_CALENDAR_BENCHMARK','https://example.invalid/regime-v2/performance/r2-proxy-calendar',representedAt,representedAt,'LOCAL_REPRESENTATION_OF_ACCEPTED_R2_PROXY_NOT_PROVIDER_CAPTURE_NOT_OFFICIAL_CALENDAR');
  const calendar={...input.calendars.equity,coverageEnd:'2026-09-05',...calendarCapture.metadata};
  const packet={calendar,capture:calendarCapture,transformVersion:'maintainer-performance-r2-proxy-representation/1.0.0',calendarHash:hash(calendar)};
  const bundle={schemaVersion:'regime-v2-source-bundle/1.0.0',mode:'R2',captures,calendars:{equity:packet,vix:packet,vx:packet}};
  const bytes=JSON.stringify(bundle),filename=path.join(directory,'full-r2-bundle.json');fs.writeFileSync(filename,bytes);
  const t=performance.now(),prepared=prepareSourceInput(JSON.parse(bytes),input.asOf),normalizationMs=performance.now()-t;
  const output=evaluateRegime(prepared.input),expected=evaluateRegime(input);
  assert.equal(output.systemState,'COMPLETE',JSON.stringify({missing:output.diagnostics.missingReasons,issues:prepared.issues}));
  assert.equal(output.regime,expected.regime);assert.deepEqual(output.pillarStates,expected.pillarStates);assert.equal(output.diagnostics.ruleId,expected.diagnostics.ruleId);assert.equal(output.replayClass,'R2');
  assert.deepEqual(output.diagnostics.coreFeatures,expected.diagnostics.coreFeatures);
  return{filename,asOf:input.asOf,sourceLedger:ledger,bundleBytes:Buffer.byteLength(bytes),bundleHash:sha(bytes),captureCount:captures.length,normalizationCheck:{status:'PASS',normalizationMs,normalizedRowsVisited:prepared.sourceStatus.normalizedRows,sourceParseCount:prepared.captureMetadata.parseCount,regime:output.regime,pillarStates:output.pillarStates,ruleId:output.diagnostics.ruleId,coreFeaturesMatchSweeper:true,coreFeaturesHash:hash(output.diagnostics.coreFeatures),replayClass:'R2',pointInTimeOosClaim:false},calendarRepresentation:{kind:'R2_OBSERVED_PROXY',originalFixture:'docs/regime-engine-v2/sweeper/shadow-input-r2.json',representationCapturedAt:representedAt,rawHash:calendarCapture.rawHash,origin:'R2_IMPORT',officialCalendarClaim:false,providerCaptureClaim:false,benchmarkCoverageExtension:'coverageEnd extended only to 2026-09-05 for distinct overnight cuts; no trading session or close added, not an official calendar claim'},selection:{equityTickers:Object.keys(input.equity),equityDates:64,vixDates:6,vxNearContracts:2,vxDate:target,optionalThirdFourthVxNotRequiredByCore:true,BTC:'ABSENT_OPTIONAL',GLD:'ABSENT_OPTIONAL'}};
}

async function worker(enabled,bundleFilename,asOf,count,scenario='same-cut') {
  // The actual V1 adapters execute their existing no-key/fallback branches.
  process.env.V2_SHADOW='OFF';delete process.env.ALPHA_VANTAGE_API_KEY;delete process.env.FRED_API_KEY;
  const inputText=fs.readFileSync(bundleFilename,'utf8'),directory=await fsp.mkdtemp(path.join(os.tmpdir(),'regime-maintainer-full-pipeline-'));
  await import(path.join(root,'scripts/report-node-register.mjs'));
  const {hash}=await import(path.join(root,'lib/regime-engine-v2/math.ts'));
  const {getDashboardData}=await import(path.join(root,'lib/dashboard/get-dashboard-data.ts'));
  const {withDashboardShadow}=await import(path.join(root,'lib/regime-engine-v2/operations/dashboard-shadow.ts'));
  const original={fetch:globalThis.fetch,parse:JSON.parse,log:console.log,warn:console.warn,error:console.error,info:console.info};
  const counts={fetchAttempts:0,bundleReads:0,bundleJsonParses:0,allJsonParses:0,readBytes:0,writeBytes:0,filesystem:{},diagnostics:{}};
  let measuring=false,lastReturned=null,cutSequence=0;
  for(const method of ['log','warn','error','info'])console[method]=()=>{};
  globalThis.fetch=async()=>{if(measuring)counts.fetchAttempts++;return new Response('Not Found',{status:404,headers:{'content-type':'text/plain'}});};
  JSON.parse=function(...args){if(measuring){counts.allJsonParses++;if(args[0]===inputText)counts.bundleJsonParses++;}return original.parse.apply(this,args);};
  const fns={};
  for(const name of ['readFile','writeFile','stat','realpath','mkdir','rename','link','unlink','open']){
    fns[name]=fsp[name];fsp[name]=async(...args)=>{
      if(measuring){counts.filesystem[name]=(counts.filesystem[name]??0)+1;if(name==='readFile'&&args[0]===bundleFilename)counts.bundleReads++;}
      const value=await fns[name](...args);
      if(measuring&&name==='readFile')counts.readBytes+=Buffer.byteLength(value);
      if(measuring&&name==='writeFile')counts.writeBytes+=Buffer.byteLength(args[1]);
      if(name==='open')for(const method of ['read','stat','close','writeFile','sync']){const fn=value[method].bind(value);value[method]=async(...a)=>{if(measuring)counts.filesystem['FileHandle.'+method]=(counts.filesystem['FileHandle.'+method]??0)+1;const r=await fn(...a);if(measuring&&method==='read')counts.readBytes+=r.bytesRead;if(measuring&&method==='writeFile')counts.writeBytes+=Buffer.byteLength(a[0]);return r;};}
      return value;
    };
  }
  syncBuiltinESMExports();
  const options={enabled:true,directory,inputFile:bundleFilename,repositoryRoot:root,now:()=>scenario==='distinct-cut'?new Date(Date.parse('2026-09-05T00:00:00.000Z')+cutSequence++).toISOString():asOf,onDiagnostic:event=>{if(measuring)counts.diagnostics[event.code]=(counts.diagnostics[event.code]??0)+1;}};
  const callback=async()=>{const result=await getDashboardData();lastReturned=result;return result;};
  const invoke=()=>enabled?withDashboardShadow(callback,options):callback();
  const times=[],publicHashes=[];const once=async()=>{const t=performance.now(),result=await invoke(),elapsed=performance.now()-t;assert.equal(result,lastReturned);publicHashes.push(sha(JSON.stringify(result)));return elapsed;};
  globalThis.gc?.();const before=memory();measuring=true;const firstCallMs=await once();measuring=false;const firstCallCounts=structuredClone(counts);
  for(const key of Object.keys(counts))counts[key]=typeof counts[key]==='object'?{}:0;
  if(count>1)for(let i=0;i<3;i++)await once();
  globalThis.gc?.();const warmBefore=memory(),checkpoints=[];measuring=true;
  for(let i=0;i<count;i++){times.push(await once());if((i+1)%10===0){measuring=false;globalThis.gc?.();checkpoints.push({calls:i+1,...memory()});measuring=true;}}
  measuring=false;globalThis.gc?.();const after=memory();
  globalThis.fetch=original.fetch;JSON.parse=original.parse;for(const method of ['log','warn','error','info'])console[method]=original[method];for(const[name,fn]of Object.entries(fns))fsp[name]=fn;syncBuiltinESMExports();
  const snapshotFiles=enabled?fs.readdirSync(path.join(directory,'snapshots')).filter(f=>f.endsWith('.json')):[];
  const representativeSnapshot=enabled?JSON.parse(fs.readFileSync(path.join(directory,'snapshots',snapshotFiles.at(-1)))):null;
  if(enabled){assert.equal(counts.diagnostics.COMPLETE,count,JSON.stringify(counts.diagnostics));assert.equal(representativeSnapshot.v2.systemState,'COMPLETE');assert.equal(representativeSnapshot.replayClass,'R2');}
  assert.equal(new Set(publicHashes).size,1,'Actual V1 output changed between repeated equal failure-mode provider responses');
  const result={enabled,scenario,firstCallMs,firstCallCounts,timing:stats(times),rawSamplesMs:times,counts,perCall:{fetchAttempts:counts.fetchAttempts/count,bundleReads:counts.bundleReads/count,bundleJsonParses:counts.bundleJsonParses/count,allJsonParses:counts.allJsonParses/count,readBytes:counts.readBytes/count,writeBytes:counts.writeBytes/count,filesystem:Object.fromEntries(Object.entries(counts.filesystem).map(([k,v])=>[k,v/count]))},publicV1:{hash:publicHashes[0],unchangedAcrossCalls:true,regime:lastReturned.regimeSummary.current,score:lastReturned.regimeSummary.regimeScore,confidence:lastReturned.regimeSummary.confidence,serializedBytes:Buffer.byteLength(JSON.stringify(lastReturned))},v2:representativeSnapshot?{regime:representativeSnapshot.v2.regime,pillars:representativeSnapshot.v2.pillarStates,systemState:representativeSnapshot.v2.systemState,replayClass:representativeSnapshot.replayClass,sourceParseCount:representativeSnapshot.captureMetadata.sourceInput.parseCount,coreFeaturesHash:hash(representativeSnapshot.v2.diagnostics.coreFeatures)}:null,memory:{before,warmBefore,after,afterMinusWarmBefore:Object.fromEntries(Object.keys(after).map(k=>[k,after[k]-warmBefore[k]])),checkpoints},storage:{outsideRepository:true,immutableSnapshots:snapshotFiles.length,storedSnapshotBytes:snapshotFiles.reduce((n,f)=>n+fs.statSync(path.join(directory,'snapshots',f)).size,0),removedAfterMeasurement:true}};
  await fsp.rm(directory,{recursive:true,force:true});return result;
}

if(process.argv[2]==='--worker'){
  const result=await worker(process.argv[3]==='ON',process.argv[4],process.argv[5],Number(process.argv[6]),process.argv[7]);process.stdout.write(JSON.stringify(result));
}else{
  const startHashes=hashes(),directory=await fsp.mkdtemp(path.join(os.tmpdir(),'regime-maintainer-pipeline-input-'));
  const bundle=await buildBundle(directory);
  const run=(flag,count,scenario='same-cut')=>{const started=performance.now(),child=spawnSync(process.execPath,['--expose-gc','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',fileURLToPath(import.meta.url),'--worker',flag,bundle.filename,bundle.asOf,String(count),scenario],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,V2_SHADOW:'OFF',ALPHA_VANTAGE_API_KEY:'',FRED_API_KEY:''}});if(child.status!==0)throw new Error(child.stderr+'\n'+child.stdout);return{...JSON.parse(child.stdout),processElapsedMs:performance.now()-started};};
  const off=run('OFF',30),on=run('ON',30),distinctCutOn=run('ON',15,'distinct-cut'),cold=[];
  for(let i=0;i<5;i++)cold.push({off:run('OFF',1),on:run('ON',1)});
  assert.equal(off.publicV1.hash,on.publicV1.hash,'Shadow changed actual legacy Dashboard public output');
  assert.equal(off.publicV1.hash,distinctCutOn.publicV1.hash);assert.equal(distinctCutOn.v2.regime,bundle.normalizationCheck.regime);assert.deepEqual(distinctCutOn.v2.pillars,bundle.normalizationCheck.pillarStates);assert.equal(distinctCutOn.v2.coreFeaturesHash,bundle.normalizationCheck.coreFeaturesHash);
  assert.equal(off.perCall.fetchAttempts,on.perCall.fetchAttempts,'Shadow duplicated legacy provider fetch attempts');
  const finalHashes=hashes(),codeStable=JSON.stringify(startHashes)===JSON.stringify(finalHashes),increment=distinctCutOn.timing.medianMs-off.timing.medianMs;
  const report={schemaVersion:'regime-v2-maintainer-performance-full-pipeline/1.0.0',measuredAt:new Date().toISOString(),status:codeStable?'PASS':'RERUN_REQUIRED',method:{command:'node --expose-gc --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/maintainer/performance-pipeline.mjs',v1:'Actual getDashboardData with original adapters, legacy buildRegimeSummary and existing no-key/fallback behavior. Every fetch receives a controlled 404 Response. No live network, response latency, API credentials or rendering measured.',v2:'Actual default source-file loader: full preserved provider bytes, capture validation, normalization, retention by content hash, exact-cut cache, canonical evaluateRegime, snapshot hashing/checkpoint/fsync.',representationCheck:'Full prepared core features are deep-equal to accepted Sweeper values. Persisted feature identity uses the engine canonical hash so JSON object insertion order cannot create a false mismatch; no expected value or oracle changed.',temporal:'Accepted September 4 R2 asOf exactly preserved. Synthetic local representation of the accepted R2 observed proxy calendar is explicitly marked R2_IMPORT, never official or prospective.',rawSelection:'11 Yahoo adjusted-close histories, official Cboe VIX history, complete original CFE monthly catalog, original two nearest monthly VX histories. Explicit date selection after raw parsing; prices/raw hashes unchanged.',warm:'30 timed calls after first call and 3 untimed warmups for OFF/same-cut ON; 15 timed distinct-cut ON calls. Identical cut/vintage is a cache best case. Distinct overnight cuts differ by 1 ms and retain September 4 as the latest closed R2 proxy session; each must produce the same regime/pillars.',cold:'Five fresh-process OFF/ON pairs; firstCallMs includes initial full bundle parse/validation/normalization; processElapsedMs also includes module startup and a subsequent call.',counters:'Instrumented fetch attempts, JSON.parse, fs/promises and FileHandle operations. Raw files generated/persisted only outside Git; removed after measurement.',scope:'Offline whole legacy calculation plus complete V2 ingestion/snapshot benchmark. Controlled V1 source unavailability is a defined branch, not successful live-provider latency.',sla:'No new SLA; absolute and relative values measured on this host.'},environment:{node:process.version,platform:process.platform,architecture:process.arch,next:JSON.parse(fs.readFileSync(path.join(root,'node_modules/next/package.json'))).version},bundle,codeHashesBefore:startHashes,codeHashesAfter:finalHashes,codeStable,warm:{off,on,distinctCutOn},cold:{pairs:cold,offFirstCall:stats(cold.map(r=>r.off.firstCallMs)),onFirstCall:stats(cold.map(r=>r.on.firstCallMs)),offProcess:stats(cold.map(r=>r.off.processElapsedMs)),onProcess:stats(cold.map(r=>r.on.processElapsedMs))},summary:{baselineMedianMs:off.timing.medianMs,shadowMedianMs:distinctCutOn.timing.medianMs,sameCutBestCaseShadowMedianMs:on.timing.medianMs,absoluteIncrementMs:increment,relativeIncrementPercent:increment/off.timing.medianMs*100,ratio:distinctCutOn.timing.medianMs/off.timing.medianMs,additionalFetchAttempts:distinctCutOn.perCall.fetchAttempts-off.perCall.fetchAttempts,liveNetworkFetches:0,publicV1OutputHashPreserved:true,fullRawNormalizationComplete:true,canonicalRegimePillarsFeaturesMatchSweeper:true,headlineScenario:'ACTUAL_V1_FALLBACK_VS_FULL_RAW_SHADOW_DISTINCT_CUT',materialCostReview:'Report measured first/distinct-cut normalization and RSS high-water; PASS denotes reproducible functional measurement, not a deployment SLA or waived cost review.',verdict:codeStable?'PASS':'RERUN_REQUIRED'},limitations:['V1 providers deliberately unavailable via immediate 404; successful remote response latency and production traffic require deployment-environment measurement.','R2 cached bytes do not establish prospective/PIT performance or economic validity.','The two nearest VX contracts cover canonical requirements; higher-curve diagnostics and optional BTC/GLD remain unavailable.','Finite repeated/cold measurements do not prove arbitrary-size or long-lived-process behavior.']};
  const beforePath=path.join(root,'docs/regime-engine-v2/maintainer/performance-pipeline-before.json');
  if(fs.existsSync(beforePath)){
    const before=JSON.parse(fs.readFileSync(beforePath));
    const oldDistinct=before.warm.distinctCutOn,newDistinct=distinctCutOn;
    const sampledRss=run=>Math.max(run.memory.before.rssBytes,run.memory.warmBefore.rssBytes,run.memory.after.rssBytes,...run.memory.checkpoints.map(p=>p.rssBytes));
    const oldRss=sampledRss(oldDistinct),newRss=sampledRss(newDistinct),oldMs=oldDistinct.timing.medianMs,newMs=newDistinct.timing.medianMs;
    const repeatedRawWorkRemoved=newDistinct.perCall.bundleJsonParses===0&&newDistinct.perCall.allJsonParses<oldDistinct.perCall.allJsonParses;
    report.repairComparison={beforeArtifact:'docs/regime-engine-v2/maintainer/performance-pipeline-before.json',repairs:['Reuse one identical Intl.DateTimeFormat per Yahoo normalization call; same locale/timezone/options/formatToParts.','Cache one immutable validated/normalized source vintage; every new cut resolves calendars/VX and computes C03 again.'],methodologyImpact:'NO',distinctCut:{beforeMedianMs:oldMs,afterMedianMs:newMs,absoluteReductionMs:oldMs-newMs,reductionPercent:(oldMs-newMs)/oldMs*100,beforeAllJsonParsesPerCall:oldDistinct.perCall.allJsonParses,afterAllJsonParsesPerCall:newDistinct.perCall.allJsonParses,repeatedRawWorkRemoved},cold:{beforeMedianFirstCallMs:before.cold.onFirstCall.medianMs,afterMedianFirstCallMs:report.cold.onFirstCall.medianMs},memory:{beforeSampledRssBytes:oldRss,afterSampledRssBytes:newRss,reductionBytes:oldRss-newRss,reductionPercent:(oldRss-newRss)/oldRss*100,scope:'Maximum of observed before/warm/checkpoint/after RSS samples, not an exact native allocator peak.'}};
    report.performanceGate={status:codeStable&&repeatedRawWorkRemoved&&newMs<oldMs&&newRss<oldRss?'PASS':'REVIEW_REQUIRED',rationale:'The measured repeated historical parsing and formatter-allocation cost has been repaired. Remaining cost comprises independently resolved cut/calendar/VX, canonical evaluation, raw-byte verification/retention, full public-output identity hashing and durable private snapshot/checkpoint operations. These are bounded and measured; no decision rule was simplified and no deployment SLA is inferred.',remainingAbsoluteIncrementMs:increment,additionalFetchAttempts:report.summary.additionalFetchAttempts,publicV1Unchanged:true,normalizationAndFeaturesConform:true,operationalLimits:'One source vintage and one exact-cut preparation cache; eight active sidecars; existing 2-second I/O resource deadline, distinct from freshness policy.',prospectiveOrLiveLatencyClaim:false};
    report.summary.performanceVerdict=report.performanceGate.status;
    report.summary.materialCostReview='See repairComparison and performanceGate; original material historical-reprocessing/RSS cost is preserved in the before artifact.';
  }
  await fsp.rm(directory,{recursive:true,force:true});report.bundle.temporaryBundleRemoved=true;
  fs.writeFileSync(path.join(root,'docs/regime-engine-v2/maintainer/performance-pipeline.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({status:report.status,summary:report.summary,normalization:bundle.normalizationCheck,coldOn:report.cold.onFirstCall},null,2)+'\n');
}
