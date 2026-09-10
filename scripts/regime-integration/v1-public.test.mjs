import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { publicProof, root } from './v1-public-proof.mjs';

test('integration public source binding uses the exact fresh-remote V1 aggregators', () => {
  const { baseline, integrated } = publicProof();
  for(const file of ['lib/dashboard/get-dashboard-data.ts','lib/dashboard/get-home-dashboard-preview-data.ts']){
    assert.equal(integrated.sourceHashes[file],baseline.sourceHashes[file]);
    assert.doesNotMatch(readFileSync(path.join(root,file),'utf8'),/withDashboardShadow|regime-engine-v2|V2_SHADOW/);
  }
  assert.deepEqual(integrated.observables.cacheDefinitions,baseline.observables.cacheDefinitions);
  assert.ok(integrated.checks.some(row=>row.name.includes('declared home key/TTL')&&row.status==='PASS'));
});
for(const route of ['/dashboard','/en/dashboard','/','/en'])test(`integration ${route}: flags cannot execute or delay V2, change HTML or V1 cache options`,()=>{
  const { baseline, integrated }=publicProof(), before=baseline.routeResults.find(row=>row.route===route),after=integrated.routeResults.find(row=>row.route===route);
  assert.equal(after.html,before.html);assert.deepEqual(after.requests,before.requests);
  assert.equal(after.variants.length,8);assert.ok(after.variants.every(row=>row.status==='PASS'));
  assert.deepEqual(integrated.calls,[]);assert.deepEqual(integrated.forbiddenImports,[]);
});
for(const name of ['dashboard','home'])test(`integration ${name}: original V1 failure propagates by identity when both flags are ON`,()=>{
  const {integrated}=publicProof();
  assert.ok(integrated.checks.some(row=>row.name===name+': original V1 exception identity propagates under both flags ON'&&row.status==='PASS'));
  assert.deepEqual(integrated.calls,[]);assert.equal(integrated.actualNetworkRequests,0);
});
