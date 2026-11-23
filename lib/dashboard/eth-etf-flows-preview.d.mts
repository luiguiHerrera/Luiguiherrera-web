import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import type { AggregatePoint } from './sp500-etf-flows.mjs';
export const ETH_FLOW_SOURCE: string;
export const ETH_FLOW_FUNDS: string[];
export type EthFlowSnapshot = { source:string; units:string; retrievedAt:string; rows:string[][] };
export function parseEthFlowRows(rows:string[][], asOf:string): { points:AggregatePoint[]; excluded:{date:string;reason:string}[]; sourceFirstDate:string|null; latestPartial:{date:string;reported:number;missing:string[]}|null };
export function buildEthFlowPreview(snapshot:EthFlowSnapshot): CapitalFlowAssetPreview;
