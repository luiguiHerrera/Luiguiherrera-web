import type { DashboardModuleId } from "@/lib/analytics/trackEvent";

export type DataStatus = "demo" | "manual" | "live_pending" | "automated";

export type RegimeLabel = "Constructivo" | "Neutral" | "Defensivo" | "Estrés";
export type RegimeBias = "Risk-on" | "Mixto" | "Risk-off";
export type RegimeConfidence = "Baja" | "Media" | "Alta";

export type DashboardDataSource = {
  sourceName: string;
  sourceUrl?: string;
  lastUpdated: string;
  updateFrequency: string;
  dataStatus: DataStatus;
  reliabilityNote: string;
};

export type DashboardModuleData = DashboardDataSource & {
  id: DashboardModuleId;
  title: string;
  status: string;
  observedData: string[][];
  interpretation: {
    lookingAt: string;
    why: string;
    how: string;
    whatItDoesNotMean: string;
  };
};

export type SectorTrend = "up" | "flat" | "down";
export type SectorLeadership = "defensiva" | "growth" | "cíclica" | "mixta";
export type SectorDetailPeriod = "30d" | "63d" | "252d";
export type VolatilityStatus = "normal" | "elevated" | "stress";
export type GarchModelStatus = "estimated" | "fallback_ewma" | "insufficient_data";
export type FragilityLabel = "Baja" | "Media" | "Alta";
export type VixSeverity = "low" | "normal" | "watch" | "elevated" | "stress" | "extreme";
export type VixTrend = "falling" | "stable" | "rising" | "rising_fast";
export type VixCurveState = "contango" | "flat" | "backwardation" | "live_pending";

export type SectorDetailSeries = {
  period: SectorDetailPeriod;
  points: number[];
  label: string;
  availableSessions: number;
};

export type SectorEtfSnapshot = {
  sectorName: string;
  etfTicker: string;
  latestClose: number;
  return1w: number;
  return1m: number;
  return3m: number | null;
  previousReturn1w: number | null;
  previousReturn1m: number | null;
  previousReturn3m: number | null;
  rank1w: number;
  rank1m: number;
  rank3m: number | null;
  previousRank1w: number | null;
  previousRank1m: number | null;
  previousRank3m: number | null;
  sparkline30d: number[];
  detailSeries: SectorDetailSeries[];
  trend: SectorTrend;
  lastUpdated: string;
  group: "defensive" | "growth" | "cyclical";
  dailyReturns: number[];
};

export type SectorRotationMetrics = {
  sectorDispersion1w: number;
  sectorDispersion1m: number;
  defensiveLeadership: number;
  growthLeadership: number;
  cyclicalLeadership: number;
  reading: SectorLeadership;
  interpretation: string;
};

export type SectorRotationData = DashboardDataSource & {
  sectors: SectorEtfSnapshot[];
  metrics: SectorRotationMetrics;
  closeConvention: "adjusted_close" | "close";
};

export type QuantRiskData = DashboardDataSource & {
  ewmaVolAnnualized: number | null;
  ewmaVolChange: number | null;
  ewmaStatus: VolatilityStatus;
  garchVolForecast: number | null;
  garchStatus: VolatilityStatus;
  modelStatus: GarchModelStatus;
  averageCorrelation21d: number | null;
  averageCorrelation63d: number | null;
  defensiveGrowthCorrelation21d: number | null;
  sectorDispersion1w: number;
  sectorDispersion1m: number;
  fragilityScore: number;
  fragilityLabel: FragilityLabel;
  fragilityInterpretation: string;
};

export type VixHistoryPoint = {
  date: string;
  value: number;
};

export type VixSpotData = DashboardDataSource & {
  latestVix: number | null;
  previousVix: number | null;
  change1d: number | null;
  change5d: number | null;
  change21d: number | null;
  vixPercentile: number | null;
  vixLevelLabel: string;
  vixSeverity: VixSeverity;
  vixDescription: string;
  vixCompositeLabel: string;
  vixCompositeSubtext: string;
  vixPercentileLabel: string;
  vixTrend: VixTrend;
  history: VixHistoryPoint[];
  interpretation: DashboardModuleData["interpretation"];
};

export type VixTermStructureData = DashboardDataSource & {
  spot: number | null;
  futureMonth1: number | null;
  futureMonth2: number | null;
  spreadM2M1: number | null;
  curveState: VixCurveState;
  interpretation: DashboardModuleData["interpretation"];
};

export type VixDashboardData = {
  spot: VixSpotData;
  termStructure: VixTermStructureData;
  module: DashboardModuleData;
};

export type RegimeSignal = {
  label: string;
  detail: string;
};

export type RegimeSummary = DashboardDataSource & {
  current: RegimeLabel;
  bias: RegimeBias;
  confidence: RegimeConfidence;
  riskSupportSignals: RegimeSignal[];
  cautionSignals: RegimeSignal[];
};

export type CrossSignalRadarRow = DashboardDataSource & {
  ticker: string;
  shortInterest: string;
  institutionalPresence: string;
  shortInterestDate: string;
  form13FDate: string;
  note: string;
};

export type DashboardData = {
  dashboardModules: DashboardModuleData[];
  crossSignalRadar: CrossSignalRadarRow[];
  regimeSummary: RegimeSummary;
  sectorRotation: SectorRotationData | null;
  quantRisk: QuantRiskData | null;
  vix: VixDashboardData | null;
};
