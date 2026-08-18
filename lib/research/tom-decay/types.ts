export type TomDatasetId = "yahoo" | "french";

export type TomRegimeId =
  | "PRE_PUBLICATION"
  | "PUBLISHED_PRE_DECIMAL"
  | "POST_DECIMAL_PRE_T2"
  | "T2"
  | "T1";

export type TomBreakId =
  | "PUBLICATION_ERA_1987"
  | "SETTLEMENT_T5_TO_T3_1995"
  | "DECIMALIZATION_2001"
  | "SETTLEMENT_T3_TO_T2_2017"
  | "SETTLEMENT_T2_TO_T1_2024";

export type TomCalendarGroupId = "REGULAR" | "QUARTER_ONLY" | "SEMI_YEAR";

export type RegimeEstimate = {
  regime: TomRegimeId;
  observations: number;
  tomDays: number;
  premiumDaily: number;
  premiumBps: number;
  hacSe: number;
  hacP: number;
  hacLags: number;
};

export type AdjacentRegimeTest = {
  from: TomRegimeId;
  to: TomRegimeId;
  premiumFromBps: number;
  premiumToBps: number;
  changeDaily: number;
  changeBps: number;
  changeHacP: number;
};

export type CumulativeBreakTest = {
  breakId: TomBreakId;
  cutoff: string;
  premiumPreBps: number;
  premiumPostBps: number;
  changeBps: number;
  changeHacP: number;
};

export type RollingPoint = {
  windowEnd: string;
  windowStart: string;
  year: number;
  years: number;
  observations: number;
  tomDays: number;
  premiumBps: number;
  ci95LoBps: number;
  ci95HiBps: number;
  hacP: number;
  isPartialWindow: boolean;
};

export type CalendarPairwiseTest = {
  groupA: TomCalendarGroupId;
  groupB: TomCalendarGroupId;
  months: number;
  differenceBps: number;
  differenceHacP: number;
};

export type PressureReversal = {
  months: number;
  correlation: number;
  afterNegativePressureBps: number;
  afterNonNegativePressureBps: number;
  differenceBps: number;
  differenceHacP: number;
};

export type ExploratoryBreakpoint = {
  status: string;
  selectedYear: number;
  premiumPreBps: number;
  premiumPostBps: number;
  changeBps: number;
  naiveHacPUnadjusted: number;
};

export type DatasetProvenance = {
  provider: string;
  dataset?: string;
  symbol: string;
  returnDefinition: string;
  downloadUrl?: string;
  downloadSha256?: string;
};

export type TomDecayDataset = {
  id: TomDatasetId;
  toolVersion: string;
  source: string;
  start: string;
  end: string;
  rollingYears: number;
  canonicalTomDays: readonly number[];
  provenance: DatasetProvenance;
  regimes: readonly RegimeEstimate[];
  adjacentTests: readonly AdjacentRegimeTest[];
  breakTests: readonly CumulativeBreakTest[];
  rolling: readonly RollingPoint[];
  calendarPairwise: readonly CalendarPairwiseTest[];
  pressureReversal: PressureReversal;
  exploratoryBreakpoint: ExploratoryBreakpoint;
};

export type TomDecayData = {
  yahoo: TomDecayDataset;
  french: TomDecayDataset;
};
