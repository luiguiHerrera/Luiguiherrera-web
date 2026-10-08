import { validateTarget, ADOPT } from './release-core.mjs';
import { createReadOnlyHarness } from './browser-harness-base.mjs';

export async function createHarness(target, tokenSource, out) {
  validateTarget(target);
  return createReadOnlyHarness(target, tokenSource, out, target.operation === ADOPT);
}
