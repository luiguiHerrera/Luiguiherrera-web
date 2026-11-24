export type McClellanPreviewPoint = {
  date: string;
  advances: number;
  declines: number;
  oscillator: number;
  summation: number;
};

export type McClellanPreviewData = {
  points: McClellanPreviewPoint[];
  declaredTotal: number;
  cutoffDate: string;
  sourceGeneratedAt: string;
  sourceCommit: string;
  sourceBlob: string;
  sourceRows: number;
  closedCandidates: number;
  excludedDates: string[];
  stale: boolean;
};

