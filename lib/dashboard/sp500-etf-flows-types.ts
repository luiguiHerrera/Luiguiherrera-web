import type { AggregatePoint, FundFlows } from './sp500-etf-flows.mjs';

export type Sp500EtfFlowsPreviewData = {
  version: number;
  asOf: string;
  included: string[];
  cutoffDate: string | null;
  points: AggregatePoint[];
  lagging: string[];
  funds: (FundFlows & {
    issuer: string; url: string; download: string; filename: string; sha256: string; fileDownloadedAt: string;
    history: { firstNav: string; firstShares: string; last: string; sourceRows: number };
    revisions: unknown[] | null;
  })[];
  excluded: { ticker: string; reason: string }[];
  publication: string;
  automation: string;
};
