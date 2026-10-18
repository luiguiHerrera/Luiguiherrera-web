// Explicit offline capture of the independent remote V1 renderer, never the repaired wrapper.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, componentFromSource, importFromRoot, renderComponent, metricValues } from './v1-render-runtime.mjs';
const sourceCommit = '7dae726917ded8f5828a8525d596b1ce02830196', sourceRC2 = '2271bee0a21aadd12ab2f45d080c58c94b696326';
const sha = value => createHash('sha256').update(value).digest('hex');
const from = (ref, file) => execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8' });
const rendererFile = 'components/dashboard/IntegratedRegimeModule.tsx', scorerFile = 'lib/dashboard/regime-scoring.ts';
const rendererSource = from(sourceCommit, rendererFile);
if (rendererSource !== readFileSync(path.join(root, rendererFile), 'utf8') || from(sourceCommit, scorerFile) !== readFileSync(path.join(root, scorerFile), 'utf8')) throw new Error('Remote V1 authority changed');
const Remote = await componentFromSource(rendererSource, 'IntegratedRegimeModule');
const legacySource = from(sourceRC2, 'components/dashboard/DashboardRegimeV1.tsx'), Legacy = await componentFromSource(legacySource, 'DashboardRegimeV1');
const { buildRegimeSummary } = await importFromRoot(scorerFile);
const sectorRows = [['Growth 1','growth',3],['Growth 2','growth',2.9],['Cyclical 1','cyclical',2.8],['Cyclical 2','cyclical',2.7],['Other','growth',2.6],['Middle','cyclical',2.5],['Defensive 1','defensive',2.4],['Defensive 2','defensive',2.3],['Defensive 3','defensive',2.2],['Defensive 4','defensive',2.1],['Defensive 5','defensive',2]];
const sector = { dataStatus:'automated',sectors:sectorRows.map(([sectorName,group,return1w],index)=>({sectorName,group,return1w,return1m:return1w,etfTicker:`T${index}`})),metrics:{reading:'growth',sectorDispersion1w:1,interpretation:'La lectura sugiere una rotación growth.'} };
const vix = {spot:{latestVix:14,dataStatus:'automated',vixCompositeLabel:'Normal bajo',vixSeverity:'normal',vixTrend:'falling'}};
const btc = {flows:{dataStatus:'automated',sourceRole:'primary',coverage:'partial',rowsParsed:10,readingSeverity:'neutral',flowStreak:{direction:'none',count:0,label:'Sin racha clara'}}};
const normal = buildRegimeSummary({sectorRotation:sector,vix,btcEtfFlows:btc});
const unavailable = buildRegimeSummary({sectorRotation:null,vix:null,btcEtfFlows:null});
const { loadSectorEtfsData } = await importFromRoot('lib/dashboard/adapters/sector-etfs.ts');
let simulatedProviderRequests = 0;
const unavailableSector = await loadSectorEtfsData({apiKey:'OFFLINE_TEST_CREDENTIAL_NOT_REAL',fetcher:async()=>{simulatedProviderRequests++;return new Response('',{status:503});},sleep:async()=>{}});
const fallback = buildRegimeSummary({sectorRotation:unavailableSector.rotation,vix,btcEtfFlows:btc});
const definitions = [
 ['normal',normal,'Actual frozen remote scorer on synthetic qualified inputs'],
 ['unavailable',unavailable,'Actual frozen remote scorer with missing governed sector pillar'],
 ['provider-error-fallback',fallback,'Actual remote sector adapter on injected HTTP503 then actual remote scorer'],
 ['zero',{...normal,regimeScore:0,confidence:0},'Explicit render-boundary zero fixture; not a market observation'],
 ['null-confidence',{...normal,regimeScore:0,confidence:null},'Explicit independently nullable field fixture; not a market observation'],
 ['null-score',{...normal,regimeScore:null,confidence:0},'Explicit independently nullable field fixture; not a market observation'],
];
const rows=[];
for(const [id,summary,provenance] of definitions)for(const locale of ['es','en']){
 const remoteHtml=renderComponent(Remote,{data:summary,locale,provenance:[]},locale),legacyHtml=renderComponent(Legacy,{regimeSummary:summary,locale},locale);
 rows.push({id,locale,provenance,summary,remoteValues:metricValues(remoteHtml,'data-regime-metrics'),remoteHtmlSha256:sha(remoteHtml),legacyHtmlSha256:sha(legacyHtml),legacyMetrics:metricValues(legacyHtml,'data-insight-metrics'),legacyMarkupMustRemainIdentical:summary.regimeScore!==null&&summary.confidence!==null&&summary.bias!=='unavailable'});
}
const output={schemaVersion:'regime-v2-integration-v1-oracle/1.0.0',sourceCommit,sourceRC2,scope:'Independent remote renderer/scorer authority with synthetic or unavailable inputs. No market data or live output claim.',sourceHashes:{[rendererFile]:sha(rendererSource),[scorerFile]:sha(from(sourceCommit,scorerFile)),'lib/dashboard/types.ts':sha(from(sourceCommit,'lib/dashboard/types.ts')),'components/dashboard/DashboardRegimeV1.tsx@RC2':sha(legacySource)},simulatedProviderRequests,realNetworkRequests:0,rows};
const destination=process.argv[2];if(!destination)throw new Error('Explicit output required');writeFileSync(destination,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:'CAPTURED',rows:rows.length,normalScore:normal.regimeScore,normalConfidence:normal.confidence,fallbackBias:fallback.bias,simulatedProviderRequests,output:destination,sha256:sha(readFileSync(destination))}));
