import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { C03 } from '../../../lib/regime-engine-v2/contract.ts';
import { classifyCore } from '../../../lib/regime-engine-v2/core.ts';
import { omissions, mechanical, reduced, benchmark } from './challengers.mjs';
const dir = new URL('./', import.meta.url);
const input = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('analysis-input.json.gz',dir))));
const rows = input.rows;
const out = { version: 'groweer-experiments/1.0.0', protocol: 'analysis-protocol.json', replayClass: 'R2', dates: rows.map(r=>r.date), sessionIndices: rows.map(r=>r.sessionIndex), benchmark: {}, mechanical: {}, reduced: {}, sensitivity: {}, benchmarkSensitivity: {} };
for (const r of rows) {
  assert.deepEqual(reduced(r.features).pillarStates,r.pillarStates);
  assert.equal(reduced(r.features).regime,r.regime);
  assert.equal(classifyCore(r.features).regime,r.regime);
}
for (const id of ['B1_VIX_ONLY','B2_VIX_BREADTH','B3_FAMILY_VOTE','B4_PREVIOUS','B5_C03']) out.benchmark[id] = rows.map((r,i)=>benchmark(r,id,rows[i-1]));
for (const name of Object.keys(omissions)) {
  out.mechanical[name] = rows.map(r=>mechanical(r.features,name));
  out.reduced[name] = rows.map(r=>reduced(r.features,name));
}
for (const key of ['k_weak','k_broad','leadership_gap','v_watch','v_adverse','v_stress','jump_1','jump_5','curve_flat','curve_adverse','rho_floor','rho_high','delta_rising']) {
  for (const direction of [-1,1]) {
    const value = C03[key] + direction * (key.startsWith('k_') ? 1 : C03[key]*.05);
    const p = { ...C03, [key]: value }, id = `${key}_${direction < 0 ? 'lower' : 'upper'}`;
    const classified = rows.map(r=>classifyCore(r.features,p));
    out.sensitivity[id] = { threshold:key, canonical:C03[key], value, outputs:classified };
    out.benchmarkSensitivity[id] = Object.fromEntries(['B1_VIX_ONLY','B2_VIX_BREADTH','B3_FAMILY_VOTE'].map(b=>[b,rows.map((r,i)=>benchmark({...r,...classified[i]},b,rows[i-1],p))]));
  }
}
fs.writeFileSync(new URL('experiment-outputs.json.gz',dir),zlib.gzipSync(JSON.stringify(out),{level:9,mtime:0}));
console.log(JSON.stringify({status:'PASS',fullReducedMatchesCanonical:rows.length,mechanicalVariants:11,reducedVariants:11,thresholdVariants:26,benchmarkIds:Object.keys(out.benchmark)}));
