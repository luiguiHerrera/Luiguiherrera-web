import assert from "node:assert/strict";
import test from "node:test";
import { calculate, compareSnapshots, isClosed, isSession, researchSnapshot } from "./mcclellan-sp500.mjs";

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, actual + " != " + expected);
function fixture(pairs = [[3,1],[1,3],[2,2]], dates = ["2026-01-02","2026-01-05","2026-01-06"]) {
  let sum = 0;
  return { metadata: { universe: "S&P 500", total_stocks: 4, generated_at: "2026-01-07T12:00:00Z" },
    data: pairs.map(([advances, declines], i) => ({ date: dates[i], advances, declines, net_advances: advances-declines, ad_line: sum += advances-declines })) };
}
test("hand-calculated 19/39 values and calibrated cumulative SI, without rounding", () => {
  const r = calculate(fixture().data, 3);
  [500,-500,0].forEach((v,i) => near(r[i].rana,v));
  [25,-3.75,-3.3125].forEach((v,i) => near(r[i].oscillator,v));
  [25,21.25,17.9375].forEach((v,i) => near(r[i].summation,v));
  assert.deepEqual(r.map(r=>r.warmedUp), [false,false,true]);
});
test("ratio adjustment is invariant to universe size and is not A/D or an EMA of the cumulative A/D line", () => {
  const a = calculate(fixture().data);
  const b = calculate(fixture().data.map(r=>({...r,advances:r.advances*100,declines:r.declines*100,ad_line:999999})));
  a.forEach((r,i)=>{near(r.oscillator,b[i].oscillator);near(r.summation,b[i].summation);});
  near(a[0].rana,500);
});
test("balanced breadth remains zero and symmetric input reverses signs", () => {
  const rows = fixture().data;
  const a = calculate(rows), b = calculate(rows.map(r=>({...r,advances:r.declines,declines:r.advances})));
  a.forEach((r,i)=>{near(r.oscillator,-b[i].oscillator);near(r.summation,-b[i].summation);});
  assert.ok(calculate(rows.map(r=>({...r,advances:2,declines:2}))).every(r=>r.oscillator===0&&r.summation===0));
});
test("calendar handles holidays, Carter closure, early closes and DST", () => {
  assert.equal(isSession("2025-01-09"),false);
  assert.equal(isSession("2026-04-03"),false);
  assert.equal(isSession("2026-11-21"),false);
  assert.equal(isClosed("2026-11-20","2026-11-20T21:59:00Z"),false);
  assert.equal(isClosed("2026-11-20","2026-11-20T22:00:00Z"),true);
  assert.equal(isClosed("2026-07-02","2026-07-02T21:00:00Z"),true);
  assert.equal(isClosed("2026-11-27","2026-11-27T19:00:00Z"),true);
  assert.equal(isClosed("2025-12-24","2025-12-24T18:59:00Z"),false);
  assert.equal(isSession("2027-01-04"),true);
  assert.equal(isSession("2027-03-26"),false);
  assert.equal(isSession("2028-01-03"),true);
  assert.equal(isClosed("2028-07-03","2028-07-03T18:00:00Z"),true);
  assert.throws(()=>isSession("2029-01-02"),/calendar only/);
});
test("intraday rows are excluded using both observation and source timestamps", () => {
  const f=fixture();f.metadata.generated_at="2026-01-06T18:00:00Z";
  const r=researchSnapshot(f,{asOf:"2026-01-07T12:00:00Z"});
  assert.equal(r.audit.latestClosedCandidate,"2026-01-05");
  assert.deepEqual(r.audit.excludedOpenOrUnconfirmed,["2026-01-06"]);
  assert.equal(r.audit.stale,true);
  assert.equal(r.audit.publicationAllowed,false);
  assert.equal(r.audit.riskSignalsEnabled,false);
  assert.equal(r.audit.usableResearchRows,0);
});
test("a mature zero-seeded summation does not acquire an arbitrary offset when the source window rolls", () => {
  const rows=Array.from({length:800},(_,i)=>({date:String(i),advances:Math.round(250+150*Math.sin(i/17)),declines:Math.round(250-150*Math.sin(i/17))}));
  const a=calculate(rows),b=calculate(rows.slice(200));
  near(a.at(-1).oscillator,b.at(-1).oscillator,1e-8);
  near(a.at(-1).summation,b.at(-1).summation,1e-7);
  a.forEach((r,i)=>{near(r.summation,19*r.ema39-9*r.ema19,1e-7);if(i)near(r.summation-a[i-1].summation,r.oscillator,1e-9);});
});
test("missing sessions, duplicates and inconsistent source values fail rather than filling zero", () => {
  const f=fixture(),asOf="2026-01-07T12:00:00Z";
  assert.throws(()=>researchSnapshot({...f,data:[f.data[0],f.data[0]]},{asOf}),/duplicate/);
  const skipped=fixture([[3,1],[1,3]],["2026-01-02","2026-01-06"]);
  assert.throws(()=>researchSnapshot(skipped,{asOf}),/Missing sessions/);
  assert.throws(()=>researchSnapshot({...f,data:f.data.map((r,i)=>i? r:{...r,net_advances:99})},{asOf}),/Net advances/);
  assert.throws(()=>researchSnapshot({...f,data:f.data.map((r,i)=>i? r:{...r,ad_line:99})},{asOf}),/cumulative/);
  assert.throws(()=>researchSnapshot({...f,metadata:{...f.metadata,universe:"NYSE"}},{asOf}),/universe/);
  assert.throws(()=>researchSnapshot(f,{asOf:"2026-01-01T12:00:00Z"}),/future source/);
});
test("negative, fractional, NaN, impossible totals and zero denominators fail", () => {
  for (const pair of [[-1,2],[1.5,2],[NaN,2],[0,0],[5,1]]) {
    const f=fixture([pair],["2026-01-02"]);
    assert.throws(()=>researchSnapshot(f,{asOf:"2026-01-07T12:00:00Z"}),/counts/);
  }
});
test("revisions are counted on matching dates, not by comparing rebased A/D levels", () => {
  const a=fixture(),b=fixture();b.data[1].advances=0;b.data[1].declines=4;b.data[1].net_advances=-4;
  const diff=compareSnapshots(a,b);
  assert.equal(diff.overlap,3);assert.equal(diff.changed,1);assert.equal(diff.maxAbsoluteNetRevision,2);
});

