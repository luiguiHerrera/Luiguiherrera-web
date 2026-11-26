import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
export function createSpyFlowPublisher(options: {
  cache: { get(key: string): Promise<unknown>; set(key: string, value: unknown, options?: { ttl?: number }): Promise<unknown> };
  seed: CapitalFlowAssetPreview;
  fetchSource?: typeof import('./capital-flows-source.mjs').fetchCapitalFlowSource;
  now?: () => number;
}): (force?: boolean) => Promise<CapitalFlowAssetPreview>;
