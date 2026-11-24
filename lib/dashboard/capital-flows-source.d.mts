import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
export const CAPITAL_FLOW_IDS: ('sp500' | 'gold' | 'btc')[];
export const CAPITAL_FLOW_SOURCES: Record<string, { ticker?: string; url: string; download?: string }>;
export class CapitalFlowSourceError extends Error {}
export function latestClosedFlowSession(asOf?: string): string;
export function parsePublishedBtcDataset(data: unknown, asOf: string): { points: import('./sp500-etf-flows.mjs').AggregatePoint[]; cutoffDate: string | null; vehicles: string[] };
export function buildCapitalFlowModel(id: string, bytes: Buffer, asOf?: string): Promise<CapitalFlowAssetPreview>;
export function fetchCapitalFlowSource(id: string, options?: { fetcher?: typeof fetch; asOf?: string }): Promise<CapitalFlowAssetPreview>;
