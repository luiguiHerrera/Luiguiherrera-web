import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import type { AggregatePoint } from './sp500-etf-flows.mjs';
export type EwjDataset = {
  schemaVersion: number; ticker: string; seriesId: string; issuer: string; coverage: string; asOf: string;
  cite: { publisher: string; page: string; methodology: string; as_of: string; class: string; license: string; [key: string]: unknown };
  daily: { d: string; flow: number | null; navDate: string; src: string; house: string; [key: string]: unknown }[];
  heartbeats: unknown[]; splits: unknown[];
  windows?: Record<string, { flow: number | null; days: number; of: number; from: string; to: string; heartbeat?: number; [key: string]: unknown }>;
  [key: string]: unknown;
};
export type EwjFundFeed = { data: EwjDataset; sourceHash: string; retrievedAt: string };
export type EwjHistory = { points: AggregatePoint[]; cutoffDate: string | null; retrievedAt?: string; sourceHash?: string; methodology?: string };
export const EWJ_FLOW_SOURCE: string;
export const EWJ_FLOW_PAGE: string;
export const EWJ_FLOW_METHODOLOGY: string;
export const EWJ_FLOW_LICENSE: string;
export const EWJ_FLOW_METHOD: string;
export class EwjFlowSourceError extends Error {}
export function parseEwjFundFeed(data: EwjDataset, asOf?: string): AggregatePoint[];
export function fetchEwjFundFeed(options?: { fetcher?: typeof fetch; asOf?: string }): Promise<EwjFundFeed>;
export function mergeEwjFlowHistory(previous: EwjHistory | null | undefined, feed: EwjFundFeed, asOf: string, through?: string): EwjHistory;
export function buildEwjAutomaticModel(previous: EwjHistory | null | undefined, feed: EwjFundFeed, asOf: string): CapitalFlowAssetPreview;
