import 'server-only';
import snapshot from './capital-flows-published.json';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';

// The published cut is bundled with this release; no filesystem paths, private sessions or
// undocumented provider automation are needed to serve it. Dates remain explicit in the UI.
export function getPublishedCapitalFlows(): CapitalFlowAssetPreview[] {
  return snapshot as CapitalFlowAssetPreview[];
}
