import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ETH_FLOW_FUNDS, ETH_FLOW_SOURCE, parseEthFlowRows, buildEthFlowPreview } from './eth-etf-flows-preview.mjs';
import { flowWindow, interpretFlows } from './sp500-etf-flows.mjs';
import { compareFlowWindow } from './capital-flow-comparison.mjs';
import { extractEthRows } from '../../scripts/research/eth-etf-flows-preview.mjs';

// Synthetic edge cases below are parser tests, never dashboard data.
const header = ['', ...ETH_FLOW_FUNDS, 'Total'];
const row = (date, total='0.0') => [date, total, ...Array(10).fill('0.0'), total];
const asOf = '2026-11-23T23:30:00Z';

test('keeps published zero, negative parentheses and million-dollar units distinct', () => {
  const {points} = parseEthFlowRows([header, row('18 Nov 2026'), row('19 Nov 2026','(12.3)'), row('20 Nov 2026','2.4')], asOf);
  assert.deepEqual(points.map(p=>p.flow), [0,-12_300_000,2_400_000]);
});
test('rejects inconsistent totals, invalid numbers, changed schema and conflicting fund revisions', () => {
  const changed = row('20 Nov 2026'); changed[2]='1.0';
  assert.throws(()=>parseEthFlowRows([header,changed],asOf),/reconcile/);
  const bad = row('20 Nov 2026'); bad[2]='unknown';
  assert.throws(()=>parseEthFlowRows([header,bad],asOf),/number/);
  assert.throws(()=>parseEthFlowRows([['',...ETH_FLOW_FUNDS,'NEW','Total']],asOf),/universe/);
  const a = row('20 Nov 2026','1.0'), b = row('20 Nov 2026','1.0'); b[1]='0.0'; b[2]='1.0';
  assert.throws(()=>parseEthFlowRows([header,a,b],asOf),/Conflicting/);
});
test('deduplicates identical dates and rebuilds revised snapshots without appending duplicates', () => {
  assert.equal(parseEthFlowRows([header,row('20 Nov 2026'),row('20 Nov 2026')],asOf).points.length,1);
  assert.equal(parseEthFlowRows([header,row('20 Nov 2026','2.0')],asOf).points[0].flow,2e6);
});
test('a missing ETF stays null, partial latest close does not become the headline total', () => {
  const partial=row('20 Nov 2026','2.0'); partial[2]='-';
  const result=parseEthFlowRows([header,row('19 Nov 2026'),partial],asOf);
  assert.equal(result.points.at(-1).date,'2026-11-19');
  assert.deepEqual(result.latestPartial,{date:'2026-11-20',reported:10,missing:['ETHB']});
});
test('fills an absent exchange session and interrupts accumulation, never compresses dates', () => {
  const {points}=parseEthFlowRows([header,row('18 Nov 2026'),row('20 Nov 2026')],asOf);
  assert.equal(points[1].flow,null); assert.equal(points[1].complete,false);
  assert.equal(flowWindow(points,3),null);
});
test('ignores seed, holiday, weekend, all-dash placeholders and an unconfirmed close', () => {
  const empty=['23 Nov 2026',...Array(11).fill('-'),'0.0'];
  const result=parseEthFlowRows([header,['Seed',...Array(12).fill('1000')],row('20 Nov 2026'),row('21 Nov 2026'),row('26 Nov 2026'),empty],asOf);
  assert.equal(result.points.length,1);
  assert.ok(result.excluded.some(r=>r.reason==='empty-placeholder'));
  assert.equal(parseEthFlowRows([header,row('23 Nov 2026')],'2026-11-23T18:00:00Z').points.length,0);
});
test('partial history before the first fully reported universe is excluded, not zero-filled', () => {
  const partial=row('18 Nov 2026'); partial[9]='-';
  const result=parseEthFlowRows([header,partial,row('19 Nov 2026')],asOf);
  assert.equal(result.sourceFirstDate,'2026-11-18');
  assert.equal(result.points[0].date,'2026-11-19');
});
test('HTML adapter requires explicit USD-million units and leaves absent values untouched', () => {
  const html='<title>Ethereum ETF Flow – All Data (US$m)</title><table>'+[header,row('20 Nov 2026')].map(r=>'<tr>'+r.map(c=>`<td><b>${c}</b></td>`).join('')+'</tr>').join('')+'</table>';
  assert.equal(extractEthRows(html)[0][1],'ETHA');
  assert.throws(()=>extractEthRows(html.replace('US$m','ETH')),/units/);
});
test('no data yields an empty model rather than simulated market figures', () => {
  const model=buildEthFlowPreview({source:ETH_FLOW_SOURCE,units:'USD millions',retrievedAt:asOf,rows:[header]});
  assert.equal(model.cutoffDate,null); assert.deepEqual(model.points,[]);
  assert.equal(model.coverage.reported,0); assert.equal(interpretFlows([],20).state,'unavailable');
});

test('real private cut: reconciles 11 funds, preserves 83 consecutive sessions and verified 1/5/20 sums', async t => {
  let snapshot;
  try { snapshot=JSON.parse(await readFile('/tmp/eth-etf-flows-preview/source.json','utf8')); }
  catch { t.skip('Private research cut is intentionally not committed'); return; }
  const model=buildEthFlowPreview(snapshot);
  if (model.cutoffDate!=='2026-11-20') { t.skip('The live source has advanced beyond the reviewed cut'); return; }
  assert.equal(model.coverage.firstDate,'2026-07-28'); assert.equal(model.points.length,83);
  assert.ok(model.points.every(p=>p.complete&&p.funds.length===11));
  assert.equal(flowWindow(model.points,1).total,-97_300_000);
  assert.equal(flowWindow(model.points,5).total,-305_800_000);
  assert.equal(flowWindow(model.points,20).total,-1_501_300_000);
  assert.equal(interpretFlows(model.points,5).state,'outflows');
  assert.equal(interpretFlows(model.points,20).state,'unavailable');
  assert.equal(compareFlowWindow(model.points,20).samples,44);
  assert.ok(compareFlowWindow(model.points,20).referenceEnd<flowWindow(model.points,20).start);
});
