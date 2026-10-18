import assert from 'node:assert/strict';
import test from 'node:test';
import { publicProof } from './v1-public-proof.mjs';

test('integration Maintainer counterpart: fresh remote V1 output is preserved with legacy and job activation flags', () => {
  const { baseline, integrated } = publicProof();
  assert.deepEqual(integrated.observables.dashboardValue, baseline.observables.dashboardValue);
  assert.deepEqual(integrated.observables.homeValue, baseline.observables.homeValue);
  assert.deepEqual(integrated.calls, []); assert.deepEqual(integrated.forbiddenImports, []);
  assert.equal(integrated.actualNetworkRequests, 0);
});
