import type { AggregatePoint, FundObservation } from './sp500-etf-flows.mjs';

export type CapitalFlowAssetPreview = {
  id: 'sp500' | 'gold' | 'btc' | 'eth';
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
  refreshMode?: 'snapshot' | 'automatic';
  refreshStatus?: 'current' | 'delayed' | 'unavailable';
  retrievedAt?: string;
  sourceHash?: string;
  lastRefreshError?: string;
  coverage?: {
    reported:number; expected:number; firstDate:string|null; sourceFirstDate:string|null;
    latestPartial:{date:string;reported:number;missing:string[]}|null;
    funds:{ticker:string;flow:number|null}[]; updateNote:string;
  };
  comparisons?: { sessions: number; current: number | null; average: number | null; samples: number; referenceStart: string | null; referenceEnd: string | null }[];
};
