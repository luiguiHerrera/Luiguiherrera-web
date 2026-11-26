import 'server-only';
import { getCache } from '@vercel/functions';
import snapshots from './capital-flows-published.json';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import { createSpyFlowPublisher } from './spy-flow-publication.mjs';
import { CapitalFlowSourceError } from './capital-flows-source.mjs';

const seed = (snapshots as CapitalFlowAssetPreview[]).find(model => model.id === 'sp500')!;
const getPublication = createSpyFlowPublisher({
  cache: getCache({ namespace: 'luiguiherrera-spy-validated-cuts-v1' }), seed,
});

export async function getSpyAutomaticModel(force = false) {
  try {
    return await getPublication(force);
  } catch (error) {
    if (error instanceof CapitalFlowSourceError || error instanceof Error && 'digest' in error) throw error;
    throw new CapitalFlowSourceError(`SPY publication unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
