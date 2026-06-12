export type StatisticalWindow = "1Y" | "3Y" | "5Y" | "10Y" | "Full";

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

export type CompactPricePoint = {
  date: string;
  close: number;
  ma200: number | null;
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
};

export type StatisticalLevelsGeneratedData = {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  defaultWindow: StatisticalWindow;
  windows: StatisticalWindow[];
  catalog: AssetCatalogItem[];
  assets: AssetStatRecord[];
};
