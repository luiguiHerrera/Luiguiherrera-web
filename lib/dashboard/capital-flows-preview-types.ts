import type { AggregatePoint, FundObservation } from './sp500-etf-flows.mjs';

export type CapitalFlowAssetPreview = {
  id: 'sp500' | 'gold' | 'btc';
  title: string;
  eyebrow: string;
  description: string;
  cutoffDate: string | null;
  points: AggregatePoint[];
  metricBasis: 'daily-sum' | 'ending-nav';
  observations?: FundObservation[];
  kind: 'estimated' | 'published';
  sources: { name: string; url: string }[];
  vehicles: string[];
  notes: string[];
  refreshMode?: 'snapshot';
  comparisons?: { sessions: number; current: number | null; average: number | null; samples: number; referenceStart: string | null; referenceEnd: string | null }[];
};
