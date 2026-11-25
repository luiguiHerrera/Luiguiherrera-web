import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),ts=require('typescript');
class RiskHistorySourceError extends Error {}
const seed=JSON.parse(readFileSync(new URL('./risk-history-seed.json',import.meta.url),'utf8'));

function getterHarness(read){
  let configuration;
  const saved={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL('./get-historical-risk.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req=name=>{
    if(name==='server-only')return {};
    if(name==='next/cache')return {unstable_cache:(callback,keys,options)=>{configuration={callback,keys,options};return read;}};
    if(name.endsWith('risk-history-seed.json'))return seed;
    if(name.endsWith('risk-history-source'))return {RiskHistorySourceError,fetchHistoricalRiskSource:()=>{throw new RiskHistorySourceError('bad source');},metricsFromRiskHistory:source=>({spy:{lastUpdated:source.cutoffDate},absorption:{lastUpdated:source.cutoffDate},updatedAt:source.acquiredAt,updateStatus:'current'})};
    throw new Error(name);
  };
  new Function('require','module','exports',code)(req,saved,saved.exports);
  return {...saved.exports,configuration};
}

test('persistent cache stores source histories and rejects invalid refresh candidates',async()=>{
  const source={...seed,cutoffDate:'2026-11-23',acquiredAt:'2026-11-24T19:00:00Z'};
  const h=getterHarness(async()=>source);
  const metrics=await h.getHistoricalRiskMetrics();
  assert.equal(metrics.spy.lastUpdated,'2026-11-23');
  assert.equal(metrics.updatedAt,source.acquiredAt);
  assert.equal(h.configuration.options.revalidate,86400);
  assert.deepEqual(h.configuration.options.tags,[h.HISTORICAL_RISK_CACHE_TAG]);
  await assert.rejects(async()=>h.configuration.callback(),RiskHistorySourceError);
});

test('cold cache failure preserves immutable seed dates rather than stamping current dates',async()=>{
  const h=getterHarness(async()=>{throw new RiskHistorySourceError('provider offline');});
  const metrics=await h.getHistoricalRiskMetrics();
  assert.equal(metrics.spy.lastUpdated,'2026-11-20');
  assert.equal(metrics.absorption.lastUpdated,'2026-11-20');
  assert.equal(metrics.updatedAt,seed.acquiredAt);
  assert.equal(metrics.updateStatus,'retained');
});

test('framework control flow and programming errors remain visible',async()=>{
  for(const error of [new TypeError('programming bug'),Object.assign(new Error('redirect'),{digest:'NEXT_REDIRECT'})]){
    const h=getterHarness(async()=>{throw error;});
    await assert.rejects(h.getHistoricalRiskMetrics(),value=>value===error);
  }
});
