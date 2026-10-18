/** Offline Maintainer measurement. No network, runtime data or methodology edits. */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const target = path.join(root, 'docs/regime-engine-v2/maintainer/performance.json');
const inputPath = path.join(root, 'docs/regime-engine-v2/sweeper/shadow-input-r2.json');
const v1Path = path.join(root, 'lib/reports/snapshots/primer-informe-septiembre-2026/automatic.json');
const modulePaths = ['dashboard-shadow.ts', 'pipeline-capture.ts', 'source-input.ts', 'snapshot.ts'].map(f => path.join(root, 'lib/regime-engine-v2/operations', f));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const codeHashes = () => Object.fromEntries(modulePaths.map(f => [path.relative(root, f), digest(fs.readFileSync(f))]));
const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(deepFreeze); } return value; };
const sum = values => values.reduce((a,b) => a+b,0);
const stats = values => { const sorted = [...values].sort((a,b)=>a-b); const q = fraction => sorted[Math.min(sorted.length-1, Math.floor((sorted.length-1)*fraction))]; return { n: values.length, minMs: sorted[0], medianMs: sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2, meanMs: sum(values)/values.length, p95Ms:q(.95), maxMs: sorted.at(-1) }; };
const memory = () => { const m=process.memoryUsage(); return {heapUsedBytes:m.heapUsed, rssBytes:m.rss, externalBytes:m.external, arrayBuffersBytes:m.arrayBuffers}; };

async function worker(enabled, scenario, count) {
  const started = performance.now();
  const fixtureBytes = fs.readFileSync(inputPath), frozenInput = deepFreeze(JSON.parse(fixtureBytes)), fixtureHash=digest(fixtureBytes);
  const published = deepFreeze(JSON.parse(fs.readFileSync(v1Path)));
  const v1 = deepFreeze({ regimeSummary:{current:published.regime.label,regimeScore:published.regime.score,confidence:published.regime.confidence}, publishedReading:published });
  const beforeImport = performance.now();
  const { withDashboardShadow } = await import(path.join(root,'lib/regime-engine-v2/operations/dashboard-shadow.ts'));
  const importMs = performance.now()-beforeImport;
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'regime-maintainer-performance-'));
  const rawBundle=scenario==='empty-bundle'?JSON.stringify({schemaVersion:'regime-v2-source-bundle/1.0.0',mode:'R2',captures:[],calendars:{}}):null;
  const bundlePath=path.join(directory,'input-bundle.json');
  if(rawBundle!==null)await fsp.writeFile(bundlePath,rawBundle);
  const counters = {v1Calls:0, inputLoads:0, bundleFileReads:0, networkFetches:0, inputJsonParses:0, allRuntimeJsonParses:0, filesystem:{}, readBytes:0, writeBytes:0, diagnostics:{}};
  const saved = {parse:JSON.parse, fetch:globalThis.fetch};
  const original = {};
  let measuring = false;
  JSON.parse = function (...args) { if (measuring) { counters.allRuntimeJsonParses++; if(rawBundle!==null && args[0]===rawBundle)counters.inputJsonParses++; } return saved.parse.apply(this,args); };
  globalThis.fetch = async () => { if (measuring) counters.networkFetches++; throw new Error('PERFORMANCE_HARNESS_NETWORK_FORBIDDEN'); };
  for (const name of ['readFile','writeFile','stat','realpath','mkdir','rename','link','unlink','open']) {
    original[name] = fsp[name];
    fsp[name] = async (...args) => {
      if (measuring) { counters.filesystem[name]=(counters.filesystem[name]??0)+1; }
      if(measuring && name==='readFile' && args[0]===bundlePath)counters.bundleFileReads++;
      const value=await original[name](...args);
      if (measuring && name==='writeFile') counters.writeBytes+=Buffer.byteLength(args[1]);
      if (measuring && name==='readFile') counters.readBytes+=Buffer.byteLength(value);
      if (name==='open') for(const method of ['read','stat','close','writeFile','sync']) {
        const savedMethod=value[method].bind(value);
        value[method]=async(...callArgs)=>{ if(measuring)counters.filesystem['FileHandle.'+method]=(counters.filesystem['FileHandle.'+method]??0)+1; const result=await savedMethod(...callArgs); if(measuring&&method==='writeFile')counters.writeBytes+=Buffer.byteLength(callArgs[0]); if(measuring&&method==='read')counters.readBytes+=result.bytesRead; return result; };
      }
      return value;
    };
  }
  syncBuiltinESMExports();
  let sequence = 0;
  const calls = [];
  const options = {enabled, directory, repositoryRoot:root,
    now:()=>frozenInput.asOf,
    loadInput:rawBundle!==null?undefined:async asOf=>{if(measuring)counters.inputLoads++;return {input:asOf===frozenInput.asOf?frozenInput:{...frozenInput,asOf},issues:['OFFLINE_PERFORMANCE_R2_REPLAY_NOT_PROSPECTIVE_EVIDENCE'],captureMetadata:{origin:'R2_IMPORT',fixtureHash,...(scenario==='unique-capture-metadata'?{benchmarkCaptureSequence:sequence++}:{})},sourceStatus:{benchmark:'PRENORMALIZED_R2_FIXTURE'}};},
    inputFile:rawBundle!==null?bundlePath:undefined,
    onDiagnostic:event=>{if(measuring)counters.diagnostics[event.code]=(counters.diagnostics[event.code]??0)+1;},
  };
  const loadV1 = async()=>{if(measuring)counters.v1Calls++;return v1;};
  const once = async()=>{const t=performance.now();const returned=await withDashboardShadow(loadV1,options);const elapsed=performance.now()-t;assert.equal(returned,v1);return elapsed;};
  const firstStarted=performance.now();
  measuring=true;const firstCallMs=await once();measuring=false;
  const firstElapsedMs=performance.now()-firstStarted;
  const firstCallCounters=structuredClone(counters);
  for(const k of Object.keys(counters)){counters[k]=typeof counters[k]==='object'?{}:0;}
  if(count>1)for(let n=0;n<5;n++)await once();
  globalThis.gc?.(); const memoryBefore=memory(), memoryCheckpoints=[];
  let maxMemory=memoryBefore;
  measuring=true;
  for(let i=0;i<count;i++) {
    calls.push(await once());
    const mem=memory(); maxMemory=Object.fromEntries(Object.keys(mem).map(k=>[k,Math.max(maxMemory[k],mem[k])]));
    if((i+1)%20===0){measuring=false;globalThis.gc?.();memoryCheckpoints.push({completed:i+1,...memory()});measuring=true;}
  }
  measuring=false;globalThis.gc?.();const memoryAfter=memory();
  JSON.parse=saved.parse;globalThis.fetch=saved.fetch;
  for(const [name,fn]of Object.entries(original))fsp[name]=fn;
  syncBuiltinESMExports();
  const snapshots=fs.existsSync(path.join(directory,'snapshots'))?fs.readdirSync(path.join(directory,'snapshots')).filter(f=>f.endsWith('.json')):[];
  const persistedBytes=sum(snapshots.map(f=>fs.statSync(path.join(directory,'snapshots',f)).size));
  const result={enabled,scenario,fixtureBytes:fixtureBytes.length,v1RepresentativeBytes:Buffer.byteLength(JSON.stringify(v1)),fixtureParsesBeforeTiming:2,inputFixtureHash:digest(fixtureBytes),v1FixtureHash:digest(fs.readFileSync(v1Path)),importMs,firstCallMs,firstElapsedMs,workerElapsedMs:performance.now()-started,warmupCalls:count>1?5:0,timing:stats(calls),rawSamplesMs:calls,firstCallCounters,counters,perCallCounters:{inputLoads:counters.inputLoads/count,networkFetches:counters.networkFetches/count,inputJsonParses:counters.inputJsonParses/count,bundleFileReads:counters.bundleFileReads/count,allRuntimeJsonParses:counters.allRuntimeJsonParses/count,filesystem:Object.fromEntries(Object.entries(counters.filesystem).map(([k,v])=>[k,v/count])),readBytes:counters.readBytes/count,writeBytes:counters.writeBytes/count},memory:{gcAvailable:typeof globalThis.gc==='function',before:memoryBefore,after:memoryAfter,afterMinusBefore:Object.fromEntries(Object.keys(memoryAfter).map(k=>[k,memoryAfter[k]-memoryBefore[k]])),observedHighWater:maxMemory,checkpoints:memoryCheckpoints},storage:{directory,outsideRepository:true,immutableSnapshots:snapshots.length,persistedBytes,scope:'Disposable offline benchmark R2 artifacts; not live prospective evidence'}};
  if(enabled)assert.equal(counters.diagnostics[rawBundle!==null?'INCOMPLETE':'COMPLETE'],count,JSON.stringify(counters.diagnostics));
  assert.equal(counters.networkFetches,0);
  await fsp.rm(directory,{recursive:true,force:true});result.storage.removedAfterMeasurement=true;
  return result;
}

if(process.argv[2]==='--worker') {
  const result=await worker(process.argv[3]==='ON',process.argv[4],Number(process.argv[5]));
  process.stdout.write(JSON.stringify(result));
} else {
  const startHashes=codeHashes(),runs=[];
  const run=(flag,scenario,count)=>{
    const start=performance.now();
    const child=spawnSync(process.execPath,['--expose-gc','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',fileURLToPath(import.meta.url),'--worker',flag,scenario,String(count)],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
    if(child.status!==0)throw new Error(child.stderr+'\n'+child.stdout);
    const result=JSON.parse(child.stdout);result.processElapsedMs=performance.now()-start;return result;
  };
  // Warm and repeated calls include real filesystem publication/checkpoint reads.
  const warmOff=run('OFF','same-cut',120),warmOn=run('ON','same-cut',120),uniqueOn=run('ON','unique-capture-metadata',120);
  for(let i=0;i<5;i++){runs.push({off:run('OFF','same-cut',1),on:run('ON','same-cut',1)});}
  const emptyBundleOn=run('ON','empty-bundle',120);
  const afterHashes=codeHashes(),unchanged=JSON.stringify(startHashes)===JSON.stringify(afterHashes);
  const delta=warmOn.timing.medianMs-warmOff.timing.medianMs;
  const report={schemaVersion:'regime-v2-maintainer-performance/1.0.0',measuredAt:new Date().toISOString(),status:unchanged?'MEASURED':'RERUN_REQUIRED_CODE_CHANGED',environment:{node:process.version,platform:process.platform,architecture:process.arch,cpus:os.cpus().length,next:JSON.parse(fs.readFileSync(path.join(root,'node_modules/next/package.json'))).version},method:{command:'node --expose-gc --disable-warning=MODULE_TYPELESS_PACKAGE_JSON docs/regime-engine-v2/maintainer/performance.mjs',v1:'Frozen representative callback carrying the actual published September 4 V1 reading. It returns one existing object; no fetch, V1 recalculation, rendering, or network latency is simulated.',v2:'Actual withDashboardShadow and canonical evaluateRegime; accepted Sweeper normalized fixture parsed once per process; real external-directory snapshot/checkpoint filesystem work.',sameCut:'Repeated identical cut/vintage. Measures existing immutable-file duplicate writes/reads as currently implemented.',uniqueCaptureMetadata:'Identical accepted input/asOf with distinct benchmark capture sequence metadata. Exercises new immutable snapshot writes rather than EEXIST duplicate verification; no invented market inputs, vintages, closed sessions, or prospective evidence.',cold:'Fresh Node process per observation, five OFF/ON pairs. Includes module import, fixture read/parse, wrapper, process startup/exit; firstCallMs separately excludes imports/setup.',clock:'performance.now; subprocesses sequential; five untimed warmups; explicit GC outside timed calls every 20 observations.',counters:'Instrumented fetch, JSON.parse and fs/promises operations; wrappers restored after each worker. Injected loadInput executes zero input parsing; total JSON parses include engine/snapshot serialization and checkpoint reading.',storage:'All snapshots written under OS temporary directory outside repository, then removed after byte/count measurement.',interpretation:'Absolute sidecar increment applies to this fixture and machine. Relative percentage against a trivial frozen callback is not whole-dashboard latency regression. Bundle FETCH/CAPTURE/VALIDATE/NORMALIZE time is excluded from injected input path and must not be claimed zero.',sla:'No repository SLA exists; none introduced.'},fixtures:{input:path.relative(root,inputPath),v1:path.relative(root,v1Path)},codeHashesBefore:startHashes,codeHashesAfter:afterHashes,codeStableDuringMeasurement:unchanged,warm:{off:warmOff,on:warmOn,uniqueCaptureMetadataOn:uniqueOn},rawBundlePath:{emptyBundleOn,meaning:'Actual filesystem read/content retention/hash/JSON parse/prepareSourceInput/default loader path using an explicit empty R2 bundle. It correctly returns INCOMPLETE/UNKNOWN_CALENDAR. Measures cache and degradation path only; not a full-source normalization latency claim.'},cold:{pairedRuns:runs,offProcess:stats(runs.map(r=>r.off.processElapsedMs)),onProcess:stats(runs.map(r=>r.on.processElapsedMs)),offFirstCall:stats(runs.map(r=>r.off.firstCallMs)),onFirstCall:stats(runs.map(r=>r.on.firstCallMs))},summary:{baselineMedianMs:warmOff.timing.medianMs,shadowMedianMs:warmOn.timing.medianMs,absoluteIncrementMs:delta,ratio:warmOn.timing.medianMs/warmOff.timing.medianMs,relativeIncrementPercent:delta/warmOff.timing.medianMs*100,uniqueCaptureMetadataShadowMedianMs:uniqueOn.timing.medianMs,additionalNetworkFetches:warmOn.perCallCounters.networkFetches-warmOff.perCallCounters.networkFetches,additionalInputJsonParses:0,additionalAllRuntimeJsonParses:warmOn.perCallCounters.allRuntimeJsonParses-warmOff.perCallCounters.allRuntimeJsonParses,additionalInputLoads:warmOn.perCallCounters.inputLoads-warmOff.perCallCounters.inputLoads,methodologyChanged:false,publicReturnReferencePreserved:true,verdict:unchanged?'PASS':'RERUN_REQUIRED',costClassification:'EXPECTED_MEASURED_SHADOW_COST; no SLA or complete Dashboard latency claim',assessment:['OFF returned the exact V1 object with no sidecar filesystem, network, input load or JSON parse.','Complete-input ON scenarios performed canonical evaluation and durable external snapshot operations for every measured call; empty source bundle correctly recorded INCOMPLETE.','Same-cut and distinct-capture workloads remain bounded by input/checkpoint size, with no historical directory scan.','The absolute increment is reported; a trivial frozen baseline makes the percentage unsuitable as an application latency claim.']},limitations:['No live market provider or production server traffic measured.','Complete canonical normalized input benchmark excludes raw source bundle validation/normalization and capture taps; separate empty-bundle scenario covers actual default loading/cache/INCOMPLETE path.','Finite 120-call measurements can detect observed heap trend, not prove absence of all future leaks.','Cold measurements include fixtures/module loading in both OFF and ON; deployed bundler/import lifecycle can differ.','The existing checkpoint does not scan snapshot directory; retained disk history still needs operational retention/archival policy.']};
  const featuresPath=path.join(root,'lib/regime-engine-v2/features.ts');
  const featuresHash=digest(fs.readFileSync(featuresPath));
  const accepted=JSON.parse(fs.readFileSync(path.join(root,'docs/regime-engine-v2/groweer/input-manifest.json')));
  report.readOnlyCostAndHygieneAudit={
    btcStreakRepair:{file:'lib/regime-engine-v2/features.ts',sha256:featuresHash,acceptedSweeperSha256:accepted.files['lib/regime-engine-v2/features.ts'],preserved:featuresHash===accepted.files['lib/regime-engine-v2/features.ts'],algorithm:'Build one indexRows Map, then one backwards session walk; no per-step full-history index construction. Frozen Sweeper algorithm unchanged.'},
    cache:'One immutable normalized vintage keyed by raw bundle hash, engine, C03, contract/schema/preparation versions and normalizer implementation hash; one prepared cut keyed by vintage and exact asOf. Every changed cut re-resolves calendars and VX; no stale TTL or unbounded global map.',
    checkpoint:'Read only latest.txt and one immutable previous snapshot. No history-directory scan participates in timed operations. Publication queue bounded at eight.',
    sourceEconomy:'Existing CFE fetch response tap and Yahoo batch response tap observe existing bytes; no substituting FRED VIX, unadjusted close, or VX Close for Settle. Normalized-fixture benchmark observed zero network calls.',
    publicSurface:'Read-only rg search found no regime-v2/regime-engine-v2 import or route in app/. Integration wrappers return the original V1 object.',
    costs:['ON awaits full sidecar evaluation and snapshot persistence; measured milliseconds are added to callback completion.','Snapshot input/output hashing and serialization allocate transient memory; GC checkpoints and RSS show the actual measured footprint.','Snapshot disk storage grows with immutable publication history; operational archival/retention is separate from the bounded in-memory checkpoint.','Raw bundle read/retention/hash and first-time normalization are outside the injected-input measurement. Vintage caching reuses raw normalization across cuts; every cut still re-resolves calendars and VX.'],
    note:'Review of current operations source and frozen canonical feature hash; full Sweeper attacks and integration regressions are recorded by Maintainer verification.json.'
  };
  report.scope='ISOLATED_NORMALIZED_INPUT_SIDECAR; use authoritativeFullPipelineBenchmark for actual V1/full-ingestion headline values';
  const authoritativePath=path.join(root,'docs/regime-engine-v2/maintainer/performance-pipeline.json');
  if(fs.existsSync(authoritativePath)){
    const bytes=fs.readFileSync(authoritativePath),full=JSON.parse(bytes);
    report.authoritativeFullPipelineBenchmark={path:path.relative(root,authoritativePath),sha256:digest(bytes),summary:full.summary,performanceGate:full.performanceGate.status,role:'AUTHORITATIVE: actual legacy V1 fallback versus full raw-source shadow with distinct asOf cuts; no live-provider latency or SLA claim.'};
  }
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({status:report.status,summary:report.summary},null,2)+'\n');
}
