export type StatisticalWindow = "1Y" | "3Y" | "5Y" | "10Y" | "Full";

export type SeasonalityWindow = "3Y" | "5Y" | "10Y" | "Full" | "All";

export type StatisticalFrequency = "daily" | "weekly" | "monthly";

export type CorrelationWindowKey = "3Y" | "5Y" | "10Y" | "All";

export type AssetCategory =
  | "Índices / ETFs"
  | "Bonos"
  | "Oro y materias primas"
  | "Sectores"
  | "Cripto"
  | "Internacional";

export type AssetDataStatus = "ok" | "limited_history" | "unavailable";

export type ExtensionLabel =
  | "Extensión negativa extrema"
  | "Extensión negativa"
  | "Zona media"
  | "Extensión positiva"
  | "Extensión positiva extrema";

export type PercentileLabel =
  | "Zona históricamente baja"
  | "Zona baja"
  | "Zona media"
  | "Zona alta"
  | "Zona históricamente alta";

export type AssetCatalogItem = {
  ticker: string;
  name: string;
  category: AssetCategory;
  stooqSymbol: string;
};

export type AssetManifestItem = AssetCatalogItem & {
  status: AssetDataStatus;
  statusNote: string;
  lastClose: number | null;
  lastDate: string | null;
};

export type CompactPricePoint = {
  date: string;
  close: number;
  ma200: number | null;
};

export type PeriodPricePoint = {
  date: string;
  periodStart: string;
  periodEnd: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedOpen: number | null;
  adjustedHigh: number | null;
  adjustedLow: number | null;
  adjustedClose: number | null;
  volume: number;
};

export type WindowMetric = {
  available: boolean;
  sessions: number;
  annualizedVolatility63d: number | null;
  annualizedVolatility252d: number | null;
  annualizedVolatilityWindow: number | null;
  currentDrawdown: number | null;
  maxDrawdown: number | null;
  pricePercentile: number | null;
  return1mPercentile: number | null;
  return1mZScore: number | null;
  ma200Extension: number | null;
  ma200ExtensionZScore: number | null;
  ma200ExtensionPercentile: number | null;
  drawdownPercentile: number | null;
  volatilityPercentile: number | null;
  extensionLabel: ExtensionLabel;
  extensionPercentileLabel: PercentileLabel;
  windowReturns: number[];
};

export type MovementSummary = {
  mean: number | null;
  std: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
};

export type ChangeMoveMetric =
  | "change"
  | "openGap"
  | "highExtensionFromOpen"
  | "lowExtensionFromOpen"
  | "highExtensionFromPrevClose"
  | "lowExtensionFromPrevClose"
  | "closeLocation"
  | "upperFade"
  | "lowerRecovery"
  | "range";

export type OpeningRangeCategory = "Above previous range" | "Inside previous range" | "Below previous range";

export type OpeningCloseCategory = "Above previous close" | "Near previous close" | "Below previous close";

export type OpeningCategoryStats = {
  category: string;
  count: number;
  proportion: number;
  averageForwardReturn: number | null;
  averageVolatility: number | null;
  positiveRate: number | null;
};

export type CalendarFrequencyPoint = {
  label: string;
  highs: number;
  lows: number;
  periods: number;
};

export type NewHighLowStats = {
  lookback: number;
  newHighCount: number;
  newLowCount: number;
  newHighRate: number | null;
  newLowRate: number | null;
};

export type PeriodExplorerRow = {
  period: string;
  periodStart: string;
  periodEnd: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  openGap: number | null;
  range: number | null;
  closeLocation: number | null;
  classification: string;
  openingRangeCategory: OpeningRangeCategory | null;
};

export type MlFeatureSet = {
  return_1p: number | null;
  return_4p: number | null;
  return_12p: number | null;
  volatility: number | null;
  drawdown: number | null;
  trend_slope: number | null;
  distance_to_long_ma: number | null;
  extension_zscore: number | null;
  range_percentile: number | null;
  close_location: number | null;
  correlation_to_selected_average: number | null;
};

export type KeyStatisticalLevelSet = {
  available: boolean;
  statusNote: string;
  periods: number;
  currentOpen: number | null;
  lastClose: number | null;
  avgHigherExtension: number | null;
  stdHigherExtension: number | null;
  avgLowerExtension: number | null;
  stdLowerExtension: number | null;
  levels: Record<string, number | null>;
  distances: Record<string, number | null>;
  location: string;
};

export type AssetKeyStatisticalLevels = {
  weekly: KeyStatisticalLevelSet;
  monthly: KeyStatisticalLevelSet;
};

export type DailySeasonalityCell = {
  month: number;
  day: number;
  averageReturn: number | null;
  medianReturn: number | null;
  winRate: number | null;
  sampleSize: number;
};

export type CalendarMonthSeasonalityCell = {
  month: number;
  averageReturn: number | null;
  medianReturn: number | null;
  winRate: number | null;
  sampleSize: number;
};

export type CalendarWeekSeasonalityCell = {
  month: number;
  weekOfMonth: number;
  averageReturn: number | null;
  medianReturn: number | null;
  winRate: number | null;
  sampleSize: number;
};

export type CalendarDaySeasonalityCell = DailySeasonalityCell;

export type PresidentialCyclePhase =
  | "all"
  | "post_election"
  | "midterm"
  | "pre_election"
  | "election";

export type DailySeasonalityWindowData = {
  general: DailySeasonalityCell[];
  presidentialCycle: Record<PresidentialCyclePhase, DailySeasonalityCell[]>;
  monthly?: {
    general: CalendarMonthSeasonalityCell[];
    presidentialCycle: Record<PresidentialCyclePhase, CalendarMonthSeasonalityCell[]>;
  };
  weekly?: {
    general: CalendarWeekSeasonalityCell[];
    presidentialCycle: Record<PresidentialCyclePhase, CalendarWeekSeasonalityCell[]>;
    methodology: string;
  };
  daily?: {
    general: CalendarDaySeasonalityCell[];
    presidentialCycle: Record<PresidentialCyclePhase, CalendarDaySeasonalityCell[]>;
  };
};

export type DailySeasonalityData = {
  asset: string;
  windows: Record<SeasonalityWindow, DailySeasonalityWindowData>;
};

export type PresidentialCycleSeasonalityIndex = {
  phases: Record<PresidentialCyclePhase, string>;
  methodology: string;
};

export type StatisticalLevelsSeasonalityGeneratedData = {
  dailySeasonality: DailySeasonalityData[];
  presidentialCycleSeasonality: PresidentialCycleSeasonalityIndex;
};

export type FrequencyMetricSet = {
  status: AssetDataStatus;
  statusNote: string;
  periods: number;
  lastClose: number | null;
  lastDate: string | null;
  returns: {
    "1P": number | null;
    "4P": number | null;
    "12P": number | null;
    "26P": number | null;
    "52P": number | null;
  };
  movingAverages: Record<string, number | null>;
  distanceToMovingAverages: Record<string, number | null>;
  longMovingAverageKey: string;
  compactSeries: CompactPricePoint[];
  windows: Record<StatisticalWindow, WindowMetric>;
  changeMoves: Record<ChangeMoveMetric, MovementSummary>;
  openingLocation: {
    range: OpeningCategoryStats[];
    close: OpeningCategoryStats[];
  };
  calendarExtremes: CalendarFrequencyPoint[];
  newHighLow: NewHighLowStats;
  recentPeriods: PeriodExplorerRow[];
  mlFeatures: MlFeatureSet;
};

export type AssetStatRecord = {
  ticker: string;
  name: string;
  category: AssetCategory;
  stooqSymbol: string;
  status: AssetDataStatus;
  statusNote: string;
  lastClose: number | null;
  lastDate: string | null;
  returns: {
    "1W": number | null;
    "1M": number | null;
    "3M": number | null;
    "6M": number | null;
    "1Y": number | null;
  };
  movingAverages: {
    ma20: number | null;
    ma50: number | null;
    ma200: number | null;
  };
  distanceToMovingAverages: {
    ma20: number | null;
    ma50: number | null;
    ma200: number | null;
  };
  compactSeries: CompactPricePoint[];
  windows: Record<StatisticalWindow, WindowMetric>;
  frequencies: Record<StatisticalFrequency, FrequencyMetricSet>;
  keyStatisticalLevels: AssetKeyStatisticalLevels;
};

export type AssetStatSummary = {
  ticker: string;
  name: string;
  category: AssetCategory;
  status: AssetDataStatus;
  lastClose: number | null;
  lastDate: string | null;
  returns: AssetStatRecord["returns"];
  distanceToMovingAverages: AssetStatRecord["distanceToMovingAverages"];
  extension: {
    zScore5Y: number | null;
    percentile5Y: number | null;
    currentDrawdownFull: number | null;
  };
};

export type CorrelationMatrix = {
  tickers: string[];
  minObservations: number;
  values: Record<string, Record<string, number | null>>;
};

export type StatisticalLevelsCorrelation = Record<StatisticalFrequency, Record<CorrelationWindowKey, CorrelationMatrix>>;

export type StatisticalLevelsManifest = {
  generatedAt: string;
  snapshotGeneratedAt?: string;
  source: string;
  sourceUrl: string;
  defaultAsset: string;
  defaultWindow: StatisticalWindow;
  defaultFrequency: StatisticalFrequency;
  frequencies: StatisticalFrequency[];
  windows: StatisticalWindow[];
  catalog: AssetManifestItem[];
  summaries: AssetStatSummary[];
  correlation?: StatisticalLevelsCorrelation;
  statusCounts: Record<AssetDataStatus, number>;
  seasonality: {
    presidentialCycleSeasonality: PresidentialCycleSeasonalityIndex;
  };
};

export type StatisticalLevelsGeneratedData = {
  generatedAt: string;
  snapshotGeneratedAt?: string;
  source: string;
  sourceUrl: string;
  defaultWindow: StatisticalWindow;
  defaultFrequency: StatisticalFrequency;
  frequencies: StatisticalFrequency[];
  windows: StatisticalWindow[];
  catalog: AssetCatalogItem[];
  assets: AssetStatRecord[];
};
