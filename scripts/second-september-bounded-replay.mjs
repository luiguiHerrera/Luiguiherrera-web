import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const sha = value => createHash('sha256').update(value).digest('hex');
export async function replayBoundedV1() {
  const code = JSON.parse(fs.readFileSync('docs/reports/segundo-informe-septiembre-2026/corrective-release/deployed-v1-code.json','utf8'));
  const source = code['lib/dashboard/regime-scoring.ts'];
  const frozen = JSON.parse(fs.readFileSync('lib/reports/snapshots/segundo-informe-septiembre-2026/dashboard-evidence.json','utf8'));
  const { buildRegimeSummary } = await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
  const sectorRotation=frozen.modules[1],vix=frozen.modules[3],template=frozen.modules[5];
  assert.equal(sectorRotation.closeConvention,'close');
  assert(sectorRotation.sectors.every(s=>s.lastUpdated==='2026-09-18'));
  assert.equal(vix.spot.history.at(-1).date,'2026-09-17');
  const cases=[];
  function run(id,btcEtfFlows) {const r=buildRegimeSummary({sectorRotation,vix,btcEtfFlows});cases.push({id,score:r.regimeScore,label:r.current,bias:r.bias});}
  run('missing-pillar',null);
  // Conservative superset: every score-relevant severity/streak/status/source branch,
  // including combinations which an actual adapter may never produce.
  for(const severity of ['negative','neutral','positive','pending'])
    for(const direction of ['outflow','none','inflow'])
      for(const count of [0,1,2,3,4,30])
        for(const status of ['automated','delayed','unavailable','live_pending'])
          for(const role of ['primary','fallback','unavailable'])
            for(const rows of [0,1,9,10,19,20,30]) {
              const b=structuredClone(template);Object.assign(b.flows,{readingSeverity:severity,dataStatus:status,sourceRole:role,rowsParsed:rows,flowStreak:{direction,count,label:'Enumerated scoring branch'}});
              run([severity,direction,count,status,role,rows].join('/'),b);
            }
  const scores=cases.map(c=>c.score),labels=[...new Set(cases.map(c=>c.label))];
  const result={schema:'bounded-v1/1',deployment:'dpl_FwDTx8HZPNdPZDEiFKGxAVjxfcZ6',commit:'4ee6adb006f360fea13837db5f7d45815f297b55',codeSha256:sha(source),inputSha256:sha(JSON.stringify({sectorRotation,vix})),inputCaptureDate:frozen.retrievedAt,sectorDate:'2026-09-18',vixDate:'2026-09-17',exactHistoricalCacheProven:false,premise:'Hold the reconciled sector and VIX observations fixed. Their numeric replay is reproducible; their precise historical cache admission is not independently attested.',btcDomain:'All score-relevant branches, not selected example tables; primary/fallback/unavailable, all severities and both streak thresholds, all statuses and coverage penalty thresholds.',enumeratedCases:cases.length,scoreRange:[Math.min(...scores),Math.max(...scores)],labels,biases:[...new Set(cases.map(c=>c.bias))],classificationInvariant:labels.length===1,pointScorePublished:false,confidencePointPublished:false,extremeWitnesses:[cases.find(c=>c.id==='negative/outflow/3/automated/primary/20'),cases.find(c=>c.id==='positive/inflow/3/automated/primary/20')]};
  assert.deepEqual(result.scoreRange,[70,77]);assert.deepEqual(labels,['Risk-on selectivo']);assert.deepEqual(result.biases,['favorable']);
  return result;
}
if(process.argv[1]?.endsWith('second-september-bounded-replay.mjs')) console.log(JSON.stringify(await replayBoundedV1(),null,2));
