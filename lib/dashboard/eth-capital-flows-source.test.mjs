import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fetchEthFundFeed,parseEthFundFeed,mergeEthFlowHistory,buildEthAutomaticModel,expectedEthFlowSession,ETH_MCP_URL} from './eth-capital-flows-source.mjs';
import {latestClosedFlowSession} from './capital-flows-source.mjs';
import {ETH_FLOW_FUNDS} from './eth-etf-flows-preview.mjs';
const asOf='2026-11-23T22:30:00Z';
const seed=JSON.parse(await readFile(new URL('./eth-flow-history-seed.json',import.meta.url)));
// Synthetic edge cases below are protocol/parser tests, never market data.
const day=(date,value=1)=>({date,totalUsdM:value,funds:ETH_FLOW_FUNDS.map((ticker,i)=>({ticker,netFlowUsdM:i?0:value}))});
const feed=(days)=>({symbol:'ETH',windowDays:30,days});
test('ETH publication freshness is T+1 at 07 UTC, retaining the legacy close rule',()=>{
 assert.equal(expectedEthFlowSession(asOf),'2026-11-20');
 assert.equal(expectedEthFlowSession('2026-11-24T06:59:59Z'),'2026-11-20');
 assert.equal(expectedEthFlowSession('2026-11-24T07:00:00Z'),'2026-11-23');
 assert.equal(expectedEthFlowSession('2026-11-27T07:00:00Z'),'2026-11-25');
 assert.equal(latestClosedFlowSession(asOf),'2026-11-23');
});
test('licensed seed preserves missing 23 October and identifies its publisher and licence',()=>{
 assert.equal(seed.license,'https://creativecommons.org/licenses/by/4.0/');
 assert.equal(seed.units,'USD');assert.equal(seed.points.length,63);
 assert.deepEqual(seed.points.filter(p=>!p.complete).map(p=>p.date),['2026-10-23']);
 assert.equal(seed.lastCompleteDate,'2026-10-22');
});
test('partial or absent fund is null, observed zero stays zero, and open days are excluded',()=>{
 const a=day('2026-11-19',0),b=day('2026-11-20');b.funds[1].netFlowUsdM=null;
 const points=parseEthFundFeed(feed([a,b,day('2026-11-23')]),'2026-11-23T18:00:00Z');
 assert.equal(points.length,2);assert.equal(points[0].flow,0);
 assert.equal(points[1].flow,null);assert.equal(points[1].complete,false);
 assert.equal(points[1].funds[1].flow,null);
});
test('rejects changed identity, units contract, duplicate dates/funds and inconsistent totals',()=>{
 assert.throws(()=>parseEthFundFeed({...feed([]),symbol:'BTC'},asOf),/Invalid/);
 assert.throws(()=>parseEthFundFeed({...feed([]),windowDays:365},asOf),/Invalid/);
 assert.throws(()=>parseEthFundFeed(feed([day('2026-11-20'),day('2026-11-20')]),asOf),/duplicate/);
 const a=day('2026-11-20');a.funds.push(a.funds[0]);
 assert.throws(()=>parseEthFundFeed(feed([a]),asOf),/duplicated/);
 const b=day('2026-11-20');b.totalUsdM=100;
 assert.throws(()=>parseEthFundFeed(feed([b]),asOf),/reconcile/);
 assert.throws(()=>parseEthFundFeed(feed([day('2026-02-30')]),asOf),/invalid/);
});
test('revisions update their effective date; an incomplete revision never overwrites a valid close',()=>{
 const history={points:parseEthFundFeed(feed([day('2026-11-19'),day('2026-11-20')]),asOf)};
 const a=mergeEthFlowHistory(history,feed([day('2026-11-20',2)]),asOf);
 assert.equal(a.points.length,2);assert.equal(a.points.at(-1).flow,2e6);
 const partial=day('2026-11-20',3);partial.funds[0].netFlowUsdM=null;partial.totalUsdM=0;
 assert.equal(mergeEthFlowHistory(a,feed([partial]),asOf).points.at(-1).flow,2e6);
});
test('no bridge across missing negotiated sessions, and dated archive excludes future observations',()=>{
 const history={points:parseEthFundFeed(feed([day('2026-11-18')]),asOf)};
 const merged=mergeEthFlowHistory(history,feed([day('2026-11-20')]),asOf);
 assert.equal(merged.points[1].date,'2026-11-19');assert.equal(merged.points[1].flow,null);
 assert.equal(mergeEthFlowHistory(history,feed([day('2026-11-20')]),asOf,'2026-11-18').points.length,1);
});
test('protocol is deterministic, bounded, keyless, supports SSE and does not depend on an AI model',async()=>{
 const payload=feed([day('2026-11-20')]),methods=[];
 const fetcher=async(url,options)=>{
  assert.equal(url,ETH_MCP_URL);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers.Cookie,undefined);
  const req=JSON.parse(options.body);methods.push(req.method);
  if(req.method==='notifications/initialized')return new Response(null,{status:202});
  const result=req.method==='initialize'?{protocolVersion:'2025-03-26'}:{content:[{type:'text',text:JSON.stringify(payload)}]};
  if(req.method==='tools/call'){assert.equal(req.params.name,'get_fund_flows');assert.deepEqual(req.params.arguments,{asset:'eth'});}
  return new Response('data: '+JSON.stringify({jsonrpc:'2.0',id:req.id,result})+'\n\n',{headers:{'Content-Type':'text/event-stream','Mcp-Session-Id':'test-anonymous-session'}});
 };
 assert.deepEqual(await fetchEthFundFeed({fetcher}),payload);
 assert.deepEqual(methods,['initialize','notifications/initialized','tools/call']);
 await assert.rejects(fetchEthFundFeed({fetcher:async()=>new Response('Denied',{status:403})}),/HTTP 403/);
 await assert.rejects(fetchEthFundFeed({fetcher:async()=>new Response('x'.repeat(2_000_001))}),/too large/);
});
test('real live cut reconciles 11 funds; output is a chart excerpt and server-calibrated observations',async t=>{
 let live;try{live=JSON.parse(await readFile('/tmp/eth-etf-flows-preview/cryptoetf-live.json','utf8'));}catch{t.skip('Private API response not committed');return;}
 const model=buildEthAutomaticModel(seed,live,asOf);
 assert.equal(model.cutoffDate,'2026-11-20');assert.equal(model.coverage.reported,11);
 assert.deepEqual(model.comparisons.map(m=>m.current),[-97_300_000,-305_700_000,-1_501_400_000]);
 assert.equal(model.points.length,60);assert.ok(model.points.every(p=>p.funds.length===0));
 assert.deepEqual(model.points.filter(p=>!p.complete).map(p=>p.date),['2026-10-23']);
 assert.equal(model.interpretations[5].state,'outflows');assert.equal(model.interpretations[20].state,'unavailable');
 assert.equal(model.refreshMode,'automatic');assert.match(model.sourceHash,/^[a-f0-9]{64}$/);
});
