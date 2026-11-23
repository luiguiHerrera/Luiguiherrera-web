import 'server-only';
import { unstable_cache } from 'next/cache';
import snapshot from './capital-flows-published.json';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import { CAPITAL_FLOW_IDS, CapitalFlowSourceError, fetchCapitalFlowSource, latestClosedFlowSession } from './capital-flows-source.mjs';

export const CAPITAL_FLOWS_CACHE_TAG = 'dashboard-capital-flows-automatic-v2';
// Separate entries: failure of one provider cannot prevent the other assets refreshing.
export const getCachedCapitalFlow = unstable_cache(
  (id: string) => fetchCapitalFlowSource(id),
  [CAPITAL_FLOWS_CACHE_TAG],
  { revalidate: 3600, tags: [CAPITAL_FLOWS_CACHE_TAG] },
);

export async function getPublishedCapitalFlows(): Promise<CapitalFlowAssetPreview[]> {
  const expected = latestClosedFlowSession();
  return Promise.all(CAPITAL_FLOW_IDS.map(async id => {
    try {
      const model = await getCachedCapitalFlow(id);
      return { ...model, refreshStatus: model.cutoffDate && model.cutoffDate >= expected ? 'current' as const : 'delayed' as const };
    } catch (error) {
      if (!(error instanceof CapitalFlowSourceError)) throw error;
      console.warn('[dashboard:capital-flows] Retained bundled validated cut', { asset: id, reason: error.message });
      const fallback = (snapshot as CapitalFlowAssetPreview[]).find(model => model.id === id)!;
      return { ...fallback, refreshMode: 'automatic' as const, refreshStatus: 'unavailable' as const, lastRefreshError: error.message };
    }
  }));
}
