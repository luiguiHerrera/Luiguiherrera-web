import 'server-only';
import { unstable_cache } from 'next/cache';
import snapshot from './capital-flows-published.json';
import ewjSnapshot from './ewj-etf-flows-published.json';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import { CAPITAL_FLOW_IDS, CapitalFlowSourceError, fetchCapitalFlowSource, latestClosedFlowSession } from './capital-flows-source.mjs';
import {getEthAutomaticModel} from './get-eth-capital-flows';
import {getEwjAutomaticModel} from './get-ewj-capital-flows';
import {getSpyAutomaticModel} from './get-spy-capital-flows';
import {expectedEthFlowSession} from './eth-capital-flows-source.mjs';
import {createDevelopmentSourceCache} from './development-source-cache.mjs';

export const CAPITAL_FLOWS_CACHE_TAG = 'dashboard-capital-flows-automatic-v3-magnitude';
export const PUBLISHED_CAPITAL_FLOW_IDS = [...CAPITAL_FLOW_IDS, 'eth', 'ewj'];
export const fetchUncachedCapitalFlow = (id:string) => id==='sp500' ? getSpyAutomaticModel(true) : id==='eth' ? getEthAutomaticModel(true)
  : id==='ewj' ? getEwjAutomaticModel(true) : fetchCapitalFlowSource(id);
// Separate entries: failure of one provider cannot prevent the other assets refreshing.
const getCachedLegacyCapitalFlow = unstable_cache(
  (id: string) => fetchCapitalFlowSource(id),
  [CAPITAL_FLOWS_CACHE_TAG],
  { revalidate: process.env.NODE_ENV === 'development' ? false : 3600, tags: [CAPITAL_FLOWS_CACHE_TAG] },
);
const getCachedEthCapitalFlow = unstable_cache(
  () => getEthAutomaticModel(),
  ['dashboard-eth-capital-flows-durable-v3-magnitude'],
  {revalidate:process.env.NODE_ENV === 'development' ? false : 3600,tags:[CAPITAL_FLOWS_CACHE_TAG]},
);
const getCachedEwjCapitalFlow = unstable_cache(
  () => getEwjAutomaticModel(),
  ['dashboard-ewj-capital-flows-durable-v2'],
  {revalidate:process.env.NODE_ENV === 'development' ? false : 86400,tags:[CAPITAL_FLOWS_CACHE_TAG]},
);
const readPersistentCapitalFlow = (id:string) => id==='sp500' ? getSpyAutomaticModel() : id==='eth' ? getCachedEthCapitalFlow()
  : id==='ewj' ? getCachedEwjCapitalFlow() : getCachedLegacyCapitalFlow(id);
const getDevelopmentCapitalFlow = createDevelopmentSourceCache({
  load: fetchUncachedCapitalFlow,
  readPrevious: readPersistentCapitalFlow,
  isSourceError: error => error instanceof CapitalFlowSourceError,
});
export const getCachedCapitalFlow = (id:string) => process.env.NODE_ENV === 'development'
  ? getDevelopmentCapitalFlow(id)
  : readPersistentCapitalFlow(id);

export async function getPublishedCapitalFlows(): Promise<CapitalFlowAssetPreview[]> {
  return Promise.all(PUBLISHED_CAPITAL_FLOW_IDS.map(async id => {
    const expected = id==='eth' ? expectedEthFlowSession() : latestClosedFlowSession();
    try {
      const model = await getCachedCapitalFlow(id);
      return { ...model, refreshStatus: model.lastRefreshError ? 'unavailable' as const
        : model.cutoffDate && model.cutoffDate >= expected ? 'current' as const : 'delayed' as const };
    } catch (error) {
      if (!(error instanceof CapitalFlowSourceError)) throw error;
      console.warn('[dashboard:capital-flows] Retained bundled validated cut', { asset: id, reason: error.message });
      const fallback = id === 'ewj' ? ewjSnapshot as CapitalFlowAssetPreview
        : (snapshot as CapitalFlowAssetPreview[]).find(model => model.id === id)!;
      return { ...fallback, refreshMode: 'automatic' as const, refreshStatus: 'unavailable' as const, lastRefreshError: error.message };
    }
  }));
}

