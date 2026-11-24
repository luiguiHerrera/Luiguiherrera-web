import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionDates } from '../research/mcclellan-core.mjs';
import { compareFlowWindow, metricAt, parsePublishedBtcRows, summarizeFlowWindow } from './capital-flow-comparison.mjs';

const dates = sessionDates('2026-01-02','2026-11-20');
const makePoints = (values) => dates.slice(-values.length).map((date,i)=>({date,flow:values[i],complete:values[i]!=null,funds:[]}));

test('each average uses prior windows of equal duration, excluding the current window',()=>{
  const points=makePoints([...Array(50).fill(10),100,100,100,100,100]);
  const comparison=compareFlowWindow(points,5);
  assert.equal(comparison.current,500);assert.equal(comparison.average,50);
  assert.equal(comparison.samples,46);assert.ok(comparison.referenceEnd<points.at(-5).date);
});
test('daily and 20-session averages use totals on their own scale',()=>{
  const points=makePoints(Array(100).fill(7));
  assert.equal(compareFlowWindow(points,1).average,7);
  assert.equal(compareFlowWindow(points,20).average,140);
});
test('averages require 20 complete reference windows; missing data are not zeros',()=>{
  const points=makePoints(Array(25).fill(7));
  assert.equal(compareFlowWindow(points,20).average,null);
  const gap=makePoints([...Array(45).fill(10),null,...Array(10).fill(20)]);
  assert.equal(compareFlowWindow(gap,5).samples,42);
  assert.equal(compareFlowWindow(gap,5).average,(41*50+100)/42);
  assert.equal(compareFlowWindow(gap.slice(0,-8),5).current,null);
});
test('GLD comparison preserves endpoint NAV convention instead of changing operational amounts',()=>{
  const points=makePoints([0,120,-45]);
  const observations=points.map((p,i)=>({date:p.date,shares:[100,110,105][i],nav:[10,12,9][i]}));
  assert.equal(metricAt(points,2,2),75);
  assert.equal(metricAt(points,2,2,observations),45);
});
test('detail and background follow dollar balance independently from session counts',()=>{
  const stats=summarizeFlowWindow(makePoints([100,-1,-1]));
  assert.equal(stats.total,98);assert.equal(stats.positive,1);assert.equal(stats.negative,2);
  assert.equal(stats.inflows,100);assert.equal(stats.outflows,-2);assert.equal(stats.streak,2);
  assert.equal(stats.largestInflow.flow,100);assert.equal(stats.largestOutflow.flow,-1);
  assert.equal(summarizeFlowWindow(makePoints([1,null])).total,null);
});
const header=['Date','IBIT','FBTC','GBTC','Total'];
test('BTC excludes all-dash zero placeholders, weekends and open dates',()=>{
  const rows=[header,['19 Nov 2026','10.0','(3.0)','0.0','7.0'],['20 Nov 2026','-','-','-','0.0'],['21 Nov 2026','1','0','0','1'],['23 Nov 2026','1','0','0','1']];
  const parsed=parsePublishedBtcRows(rows,'2026-11-23T19:00:00Z');
  assert.equal(parsed.points.length,1);assert.equal(parsed.points[0].flow,7e6);assert.equal(parsed.excluded.length,3);
});
test('BTC preserves missing sessions and verifies published total rounding',()=>{
  const rows=[header,['18 Nov 2026','0.1','0.1','0.1','0.2'],['19 Nov 2026','5','1','0','20'],['20 Nov 2026','-','3.0','0.0','3.0']];
  const parsed=parsePublishedBtcRows(rows,'2026-11-23T19:00:00Z');
  assert.equal(parsed.points[0].flow,.2e6);assert.equal(parsed.points[1].flow,null);
  assert.equal(parsed.points[2].funds[0].flow,null);assert.equal(parsed.points[2].flow,3e6);
  assert.equal(parsed.excluded.length,1);
});
test('BTC conflicts on the same effective date cannot silently replace values',()=>{
  assert.throws(()=>parsePublishedBtcRows([header,['20 Nov 2026','1','0','0','1'],['20 Nov 2026','2','0','0','2']],'2026-11-23T19:00:00Z'),/Conflicting/);
});
