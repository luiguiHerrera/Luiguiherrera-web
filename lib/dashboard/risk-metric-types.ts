import type { IndicatorReference } from './indicator-history';
/** Values remain decimal fractions until the presentation boundary. */
export type HistoricalRiskMetrics = {
  references?: {var95: IndicatorReference | null; absorption: IndicatorReference | null};
  spy: {
    status: "available" | "unavailable";
    es95: number | null;
    var95: number | null;
    observations: number;
    tailCount: 63;
    varRank: 1197;
    firstReturnDate: string | null;
    lastUpdated: string | null;
    reason: string | null;
  };
  absorption: {
    status: "available" | "unavailable";
    ratio: number | null;
    observations: number;
    firstReturnDate: string | null;
    lastUpdated: string | null;
    reason: string | null;
  };
  sourceName: string;
  sourceUrl: string;
  adjustment: string;
  updatedAt: string;
  updateStatus: "current" | "retained" | "unavailable";
};

