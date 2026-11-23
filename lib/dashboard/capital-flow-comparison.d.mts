import type { AggregatePoint, FundObservation } from './sp500-etf-flows.mjs';
export function metricAt(points: AggregatePoint[], sessions: number, end?: number, observations?: FundObservation[]): number | null;
export function compareFlowWindow(points: AggregatePoint[], sessions: number, observations?: FundObservation[]): { current: number | null; average: number | null; samples: number; referenceStart: string | null; referenceEnd: string | null };
export function summarizeFlowWindow(points: AggregatePoint[]): { complete: boolean; total: number | null; positive: number; negative: number; zero: number; missing: number; inflows: number | null; outflows: number | null; largestInflow: AggregatePoint | null; largestOutflow: AggregatePoint | null; streak: number; streakSign: number };
export function parsePublishedBtcRows(rows: string[][], asOf: string): { points: AggregatePoint[]; excluded: { date: string; reason: string }[]; vehicles: string[] };
