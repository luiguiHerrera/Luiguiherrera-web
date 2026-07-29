import type { DashboardModuleId } from "@/lib/analytics/trackEvent";

export type DataStatus = "demo" | "manual" | "live_pending" | "automated" | "fallback" | "delayed";

export type RegimeLabel = "Risk-on constructivo" | "Risk-on selectivo" | "Neutral / mixto" | "Cautela" | "Estrés";
export type RegimeBias = "favorable" | "neutral" | "cautious" | "stress";

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

export type VixTermStructurePoint = {
  label: "VX1" | "VX2" | "VX3";
  symbol: string | null;
  contract: string | null;
  expirationDate: string | null;
  value: number | null;
};

export type VixTermStructureSourceStatus = "automated" | "manual_fallback" | "pending" | "unavailable";

export type VixTermStructureClassification =
  | "Fuerte contango"
  | "Contango moderado"
  | "Plano"
  | "Backwardation moderada"
  | "Backwardation fuerte"
  | "Pendiente";

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

export type LegacyVixTermStructureData = DashboardDataSource & {
  spot: number | null;
  futureMonth1: number | null;
  futureMonth2: number | null;
  spreadM2M1: number | null;
  curveState: VixCurveState;
  interpretation: DashboardModuleData["interpretation"];
};

export type VixTermStructureData = {
  source: string;
  sourceUrl?: string;
  sourceStatus: VixTermStructureSourceStatus;
  lastUpdated: string | null;
  points: VixTermStructurePoint[];
  m1m2Spread: number | null;
  m1m2SlopePct: number | null;
  m1m3Spread: number | null;
  m1m3SlopePct: number | null;
  classification: VixTermStructureClassification;
  interpretation: string;
  whatItDoesNotMean: string;
  reliabilityNote: string;
};

export type VixDashboardData = {
  spot: VixSpotData;
  termStructure: LegacyVixTermStructureData;
  module: DashboardModuleData;
};

export type BtcEtfFundFlow = {
  ticker: string;
  flow: number;
};

export type BtcFlowBreadth = {
  positive: number;
  negative: number;
  flatOrMissing: number;
};

export type BtcFlowStreak = {
  direction: "inflow" | "outflow" | "none";
  count: number;
  label: string;
};

export type BtcFlowLevel = "strong_inflow" | "moderate_inflow" | "neutral" | "moderate_outflow" | "strong_outflow" | "pending";
export type BtcFlowTrend = "sustained_accumulation" | "moderate_inflows" | "mixed" | "moderate_outflows" | "outflow_pressure" | "pending";
export type BtcFlowSeverity = "positive" | "neutral" | "negative" | "pending";

export type BtcEtfFlowPoint = {
  date: string;
  totalNetFlow: number;
};

export type BtcEtfFlowsData = DashboardDataSource & {
  latestDate: string;
  latestTotalNetFlow: number | null;
  latestFundFlows: BtcEtfFundFlow[];
  rolling5dNetFlow: number | null;
  rolling10dNetFlow: number | null;
  rolling20dNetFlow: number | null;
  positiveDaysLast10: number;
  negativeDaysLast10: number;
  flowStreak: BtcFlowStreak;
  cumulativeNetFlow: number | null;
  largestInflowFundLatestDay: BtcEtfFundFlow | null;
  largestOutflowFundLatestDay: BtcEtfFundFlow | null;
  dominantFlowDriver: string;
  breadth: BtcFlowBreadth;
  dailyLevel: BtcFlowLevel;
  recentTrend: BtcFlowTrend;
  readingLabel: string;
  readingSubtext: string;
  readingSeverity: BtcFlowSeverity;
  calculatedTotal: boolean;
  rowsParsed: number;
  history: BtcEtfFlowPoint[];
  interpretation: DashboardModuleData["interpretation"];
};

export type BtcEtfFlowsDashboardData = {
  flows: BtcEtfFlowsData;
  module: DashboardModuleData;
};

export type GldPressureState = "inflow" | "outflow" | "neutral" | "pending";

export type GldFlowPressurePoint = {
  date: string;
  nav: number;
  sharesOutstanding: number;
  totalNetAssets: number;
};

export type GldFlowPressure = {
  asOf: string | null;
  source: "State Street / SPDR Gold Shares";
  sourceUrl: string;
  dataStatus: "available" | "delayed" | "pending";
  nav: number | null;
  sharesOutstanding: number | null;
  totalNetAssets: number | null;
  oneDayShareChange: number | null;
  fiveDayShareChange: number | null;
  twentyDayShareChange: number | null;
  oneDayShareChangePct: number | null;
  fiveDayShareChangePct: number | null;
  twentyDayShareChangePct: number | null;
  oneDayImpliedPressureUsd: number | null;
  fiveDayImpliedPressureUsd: number | null;
  twentyDayImpliedPressureUsd: number | null;
  pressureState: GldPressureState;
  pressureLabel: string;
  summary: string;
  sourceNote: string;
  reliabilityNote: string;
  history: GldFlowPressurePoint[];
};

export type FedWatchConviction = "Alta" | "Media" | "Baja / dispersa";

export type FedWatchRateRange = {
  label: string;
  lowerBps: number | null;
  upperBps: number | null;
  probability: number;
};

export type FedWatchMeeting = {
  date: string;
  dominantRange: string;
  dominantProbability: number | null;
  cutProbability: number | null;
  pauseProbability: number | null;
  hikeProbability: number | null;
  conviction: FedWatchConviction;
  ranges: FedWatchRateRange[];
};

export type FedWatchData = DashboardDataSource & {
  currentTargetRange: string | null;
  nextMeeting: FedWatchMeeting | null;
  meetings: FedWatchMeeting[];
  readingLabel: string;
  readingSubtext: string;
  policyPath: string[];
  firstRelevantCutMeeting: string | null;
  rawShapeSummary: string;
  interpretation: DashboardModuleData["interpretation"];
};

export type FedWatchDashboardData = {
  fedWatch: FedWatchData;
  module: DashboardModuleData;
};

export type RegimeSignal = {
  label: string;
  detail: string;
};

export type RegimeSummary = DashboardDataSource & {
  current: RegimeLabel;
  bias: RegimeBias;
  confidence: number;
  regimeScore: number;
  interpretation: string;
  whatItDoesNotMean: string;
  dataQualityNote: string;
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
  vixTermStructure: VixTermStructureData | null;
  btcEtfFlows: BtcEtfFlowsDashboardData | null;
  ethEtfFlows: BtcEtfFlowsDashboardData | null;
  gldFlowPressure: GldFlowPressure;
};
