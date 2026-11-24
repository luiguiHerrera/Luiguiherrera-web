export function sessionDates(start:string, end:string):string[];
export type ResearchPoint = {
  date: string;
  rana: number;
  ema19: number;
  ema39: number;
  oscillator: number;
  summation: number;
  warmedUp: boolean;
};
export function researchSnapshot(snapshot: unknown, options?: { asOf?: string }): {
  audit: {
    sourceGeneratedAt: string;
    sourceRows: number;
    closedCandidates: number;
    excludedOpenOrUnconfirmed: string[];
    latestClosedCandidate: string;
    stale: boolean;
    [key: string]: unknown;
  };
  series: ResearchPoint[];
};

