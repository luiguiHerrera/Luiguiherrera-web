/** Offline Groweer materialization from the accepted public API; no canonical writes. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {evaluateRegime} from '../../../lib/regime-engine-v2/engine.ts';
import {normalizeYahoo,normalizeVixCsv,normalizeMonthlyCatalog,normalizeVxHistory,assembleVx} from '../../../lib/regime-engine-v2/normalize.ts';
const dir=new URL('./',import.meta.url),p8=new URL('../p8/',dir),json=n=>JSON.parse(readFileSync(new URL(n,p8))),sha=b=>createHash('sha256').update(b).digest('hex');
const tickers=json('selection-protocol.json').data_scope.core_universe;
const cache=json('historical-features-r2.json').rows;
const accepted=new Map(JSON.parse(readFileSync(new URL('../sweeper/historical-r2-output.json',dir))).map(r=>[r.date,r]));
const sourceLedger=[];
function source(name){const m=json(`evidence/${name}.metadata.json`),bytes=gunzipSync(readFileSync(new URL(`evidence/${name}.gz`,p8))).toString('utf8');assert.equal(sha(bytes),m.raw_sha256);sourceLedger.push({name,rawHash:m.raw_sha256,capturedAt:m.captured_at,availableAt:m.available_at,replayClass:'R2'});return {bytes,meta:{sourceVersion:'p8-source-contract/1.0.0',capturedAt:m.captured_at,availableAt:m.available_at,availabilityCertainty:'CONSERVATIVE_BOUND',sourcePublishedAt:null,vintageHash:m.raw_sha256,replayClass:'R2',status:'AVAILABLE'}};}
const equities={};for(const ticker of [...tickers,'SPY']){const s=source(`yahoo-${ticker}.json`);equities[ticker]=normalizeYahoo(s.bytes,s.meta,ticker);}
const vs=source('vix-history.csv'),vix=normalizeVixCsv(vs.bytes,vs.meta),cs=source('cfe-contract-index.json'),catalog=normalizeMonthlyCatalog(json('evidence/selected-contracts.json'));
const histories=catalog.map(id=>{const s=source(`vx-${id.expirationDate}.csv`);return normalizeVxHistory(s.bytes,id,s.meta);});
const calendar=equities.SPY.rows.map(r=>r.observationDate).filter(d=>d<='2026-09-04').sort();
const dateIndex=new Map(calendar.map((d,i)=>[d,i]));
const eqMaps=Object.fromEntries(Object.entries(equities).map(([t,p])=>[t,new Map(p.rows.map(r=>[r.observationDate,r]))]));
const vixMap=new Map(vix.rows.map(r=>[r.observationDate,r]));
function compare(a,b){if(typeof b==='number'){assert.ok(typeof a==='number'&&Math.abs(a-b)<=1e-10,`${a} != ${b}`);return;}if(b===null||typeof b!=='object'){assert.equal(a,b);return;}assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const k of Object.keys(b))compare(a[k],b[k]);}
const rows=[];
for(const expected of cache){const index=dateIndex.get(expected.date);assert.notEqual(index,undefined);const sessions=calendar.slice(Math.max(0,index-63),index+1);const cal={id:'P8_SPY_OBSERVED_PROXY',version:'p8-r2/1',kind:'R2_OBSERVED_PROXY',timezone:'America/New_York',replayClass:'R2',availabilityCertainty:'UNKNOWN',coverageStart:sessions[0],coverageEnd:expected.date,completeIntervalCoverage:true,sessions:sessions.map(session=>({session,closedAt:session+'T23:59:59.999999Z'}))};const input={mode:'R2',asOf:expected.date+'T23:59:59.999999Z',equity:Object.fromEntries(tickers.map(t=>[t,{...equities[t],rows:sessions.map(d=>eqMaps[t].get(d)).filter(Boolean)}])),vix:{...vix,rows:sessions.slice(-6).map(d=>vixMap.get(d)).filter(Boolean)},vx:assembleVx(expected.date,catalog,cs.meta,histories),calendars:{equity:cal,vix:cal,vx:cal}};
 const r=evaluateRegime(input),old=accepted.get(expected.date);compare(r.diagnostics.coreFeatures,expected.features);assert.equal(r.regime,old.regime);assert.deepEqual(r.pillarStates,old.pillarStates);assert.equal(r.diagnostics.ruleId,old.ruleId);assert.equal(r.diagnostics.inputHash,old.inputHash);assert.equal(r.replayClass,'R2');assert.equal(r.diagnostics.pointInTimeOosClaim,false);
 rows.push({date:expected.date,sessionIndex:index,asOf:r.asOf,regime:r.regime,systemState:r.systemState,pillarStates:r.pillarStates,ruleId:r.diagnostics.ruleId,concordance:r.concordance,uncertainty:r.uncertainty,plausibleRegimes:r.plausibleRegimes,dataQuality:r.dataQuality,dependencyUnits:r.diagnostics.dependencyContributions,features:r.diagnostics.coreFeatures,missingReasons:r.diagnostics.missingReasons,optionalProblems:r.diagnostics.optionalProblems,inputHash:r.diagnostics.inputHash,replayClass:'R2'});
}
assert.equal(rows.length,1930);
const payload={version:'groweer-analysis-input/1.0.0',scope:'RAW_TO_OUTPUT; previously inspected R2, not new OOS',sourceLedger,rows};const bytes=JSON.stringify(payload);writeFileSync(new URL('analysis-input.json.gz',dir),gzipSync(bytes));const report={status:'PASS',sessions:rows.length,rawSourcesVerified:sourceLedger.length,featuresMatchP8:1930,publicOutputsAndInputHashesMatchSweeper:1930,canonicalEngineModified:false,replayClass:'R2',pointInTimeOos:false,analysisUncompressedSha256:sha(bytes),analysisFileSha256:sha(readFileSync(new URL('analysis-input.json.gz',dir))),protocolSha256:sha(readFileSync(new URL('analysis-protocol.json',dir)))};writeFileSync(new URL('analysis-input-audit.json',dir),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
