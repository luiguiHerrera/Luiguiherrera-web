// Synthetic fixtures only; no market evidence or backtest claims.
import assert from "node:assert/strict";
import test from "node:test";
import { buildRegimeContextPreview, previewFlow, PREVIEW_POLICY } from "./regime-context-preview.ts";
import { sessionDates } from "../research/mcclellan-core.mjs";
import type { DashboardData } from "./types.ts";
import type { CapitalFlowAssetPreview } from "./capital-flows-preview-types.ts";

const date="2026-11-24", capturedAt="2026-11-24T23:00:00Z";
function flow(id:CapitalFlowAssetPreview["id"], value=1):CapitalFlowAssetPreview {
  return {id,cutoffDate:date,points:sessionDates("2026-10-01",date).slice(-20).map(date=>({date,flow:value,complete:true,funds:[]})),vehicles:[id],metricBasis:"daily-sum",kind:"published",title:id,eyebrow:id,description:"synthetic",sources:[],notes:[]};
}
function fixture(ramo=10,rasi=100):DashboardData {
  return {marketContext:{id:"synthetic-test",capturedAt,breadth:{points:[{date,oscillator:ramo,summation:rasi,advances:260,declines:240}],cutoffDate:date,stale:false,declaredTotal:500,sourceGeneratedAt:capturedAt,sourceCommit:"a".repeat(40),sourceBlob:"b".repeat(40),sourceRows:500,closedCandidates:500,excludedDates:[]},flows:[flow("sp500"),flow("btc"),flow("eth"),flow("gold"),flow("ewj")]},vix:{spot:{dataStatus:"automated",lastObservationDate:date,latestVix:15,vixSeverity:"normal",vixTrend:"stable"}},vixTermStructure:null,sectorRotation:null} as unknown as DashboardData;
}
test("four RAMO/RASI combinations form one breadth block",()=>{
  for(const [ramo,rasi,state,regime] of [[10,100,"strong","constructive"],[-10,100,"deteriorating","mixed"],[10,-100,"recovering","selective"],[-10,-100,"weak","caution"]] as const){const m=buildRegimeContextPreview(fixture(ramo,rasi));assert.equal(m.breadth.state,state);assert.equal(m.regime,regime);}
  assert.equal(PREVIEW_POLICY.weights,null);
});
test("stress requires breadth confirmation; volatility stress alone is caution",()=>{
  for(const [ramo,rasi,expected] of [[-10,-100,"stress"],[10,100,"caution"]] as const){const d=fixture(ramo,rasi);d.vix!.spot.vixSeverity="stress";assert.equal(buildRegimeContextPreview(d).regime,expected);}
});
test("missing, stale, nonfinite and future primary evidence never become neutral",()=>{
  for(const mutate of [(d:DashboardData)=>{d.marketContext!.breadth=null;},(d:DashboardData)=>{d.marketContext!.breadth!.stale=true;d.marketContext!.breadth!.cutoffDate="2026-11-20";d.marketContext!.breadth!.points[0].date="2026-11-20";},(d:DashboardData)=>{d.marketContext!.breadth!.points[0].oscillator=NaN;},(d:DashboardData)=>{d.vix!.spot.lastObservationDate="2026-11-25";},(d:DashboardData)=>{d.vix!.spot.dataStatus="fallback";},(d:DashboardData)=>{d.vix!.spot.latestVix=null;}]){const d=fixture();mutate(d);const m=buildRegimeContextPreview(d);assert.equal(m.regime,"incomplete");assert.equal(m.quality,"insufficient");}
});
test("incomplete equity windows yield partial selective support, not fabricated zero",()=>{
  const d=fixture();d.marketContext!.flows[0].points.pop();const m=buildRegimeContextPreview(d);assert.equal(m.flows[0].five,null);assert.equal(m.quality,"partial");assert.equal(m.regime,"selective");
});
test("fresh joint crypto outflows narrow broad support; one crypto market is not two votes",()=>{
  const d=fixture();d.marketContext!.flows[1]=flow("btc",-1);assert.equal(buildRegimeContextPreview(d).regime,"constructive");d.marketContext!.flows[2]=flow("eth",-1);assert.equal(buildRegimeContextPreview(d).regime,"selective");
});
test("gold and Japan signs do not decide a US-equity regime",()=>{
  const d=fixture();const initial=buildRegimeContextPreview(d).regime;d.marketContext!.flows[3]=flow("gold",-1);d.marketContext!.flows[4]=flow("ewj",-1);assert.equal(buildRegimeContextPreview(d).regime,initial);
});
test("flow windows preserve zero, duplicates, missing sessions and future cuts",()=>{
  assert.equal(previewFlow(flow("sp500",0),"sp500",date).direction,"mixed");
  const gap=flow("sp500");gap.points[5].complete=false;assert.equal(previewFlow(gap,"sp500",date).direction,"missing");
  const duplicate=flow("sp500");duplicate.points[5].date=duplicate.points[4].date;assert.equal(previewFlow(duplicate,"sp500",date).eligible,false);
  const future=flow("sp500");future.cutoffDate="2026-11-25";assert.equal(previewFlow(future,"sp500",date).five,null);
});
test("old cuts are shown but do not confirm the current regime",()=>{
  const d=fixture();const old=flow("sp500");old.points=old.points.slice(0,-1);old.cutoffDate=old.points.at(-1)!.date;d.marketContext!.flows[0]=old;assert.equal(buildRegimeContextPreview(d).flows[0].eligible,false);
});
test("GLD keeps its reviewed endpoint-NAV convention",()=>{
  const g=flow("gold");g.metricBasis="ending-nav";g.comparisons=[{sessions:5,current:111,average:1,samples:252,referenceStart:date,referenceEnd:date},{sessions:20,current:222,average:1,samples:252,referenceStart:date,referenceEnd:date}];const m=previewFlow(g,"gold",date);assert.equal(m.five,111);assert.equal(m.twenty,222);
});
test("new regime ignores the previous BTC scalar and cannot mutate its inputs",()=>{
  const d=fixture();const original=JSON.stringify(d);buildRegimeContextPreview(d);assert.equal(JSON.stringify(d),original);d.btcEtfFlows={flows:{readingSeverity:"negative"}} as DashboardData["btcEtfFlows"];assert.equal(buildRegimeContextPreview(d).regime,"constructive");
});

test("one-session reporting lag is explicit and cannot produce broad support",()=>{
 const d=fixture();d.marketContext!.breadth!.cutoffDate="2026-11-23";d.marketContext!.breadth!.points[0].date="2026-11-23";d.marketContext!.breadth!.stale=true;
 const m=buildRegimeContextPreview(d);assert.equal(m.breadth.ready,true);assert.equal(m.quality,"partial");assert.equal(m.regime,"selective");
});
