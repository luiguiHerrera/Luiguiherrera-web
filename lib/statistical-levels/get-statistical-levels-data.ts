import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalStatTicker } from "@/lib/statistical-levels/display";
import type {
  AssetManifestItem,
  AssetStatSummary,
  AssetStatRecord,
  DailySeasonalityData,
  StatisticalFrequency,
  StatisticalLevelsManifest,
  StatisticalWindow,
} from "@/lib/statistical-levels/types";

const generatedDir = path.join(process.cwd(), "lib/statistical-levels/generated");
const manifestPath = path.join(generatedDir, "manifest.json");
const assetsDir = path.join(generatedDir, "assets");
const seasonalityDir = path.join(generatedDir, "seasonality");

const validFrequencies = new Set<StatisticalFrequency>(["daily", "weekly", "monthly"]);
const validWindows = new Set<StatisticalWindow>(["1Y", "3Y", "5Y", "10Y", "Full"]);
const etfFlowOnlyTickers = new Set(["IBIT", "ETHA", "ETHE"]);

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

const ethSpotManifestItem: AssetManifestItem = {
  ticker: "ETHUSD",
  name: "Ethereum spot",
  category: "Cripto",
  stooqSymbol: "ethusd",
  status: "unavailable",
  statusNote: "Pendiente de generación de datos spot para ETH/USDT.",
  lastClose: null,
  lastDate: null,
};

const ethSpotSummary: AssetStatSummary = {
  ticker: "ETHUSD",
  name: "Ethereum spot",
  category: "Cripto",
  status: "unavailable",
  lastClose: null,
  lastDate: null,
  returns: {
    "1W": null,
    "1M": null,
    "3M": null,
    "6M": null,
    "1Y": null,
  },
  distanceToMovingAverages: {
    ma20: null,
    ma50: null,
    ma200: null,
  },
  extension: {
    zScore5Y: null,
    percentile5Y: null,
    currentDrawdownFull: null,
  },
};

const preparedManifestItems: AssetManifestItem[] = [
  ethSpotManifestItem,
  {
    ticker: "RSP",
    name: "Invesco S&P 500 Equal Weight ETF",
    category: "Índices / ETFs",
    stooqSymbol: "rsp.us",
    status: "unavailable",
    statusNote: "Pendiente de generación de datos para RSP.",
    lastClose: null,
    lastDate: null,
  },
  {
    ticker: "SMH",
    name: "VanEck Semiconductor ETF",
    category: "Temáticos",
    stooqSymbol: "smh.us",
    status: "unavailable",
    statusNote: "Pendiente de generación de datos para SMH.",
    lastClose: null,
    lastDate: null,
  },
];

const preparedSummaries: AssetStatSummary[] = [
  ethSpotSummary,
  {
    ticker: "RSP",
    name: "Invesco S&P 500 Equal Weight ETF",
    category: "Índices / ETFs",
    status: "unavailable",
    lastClose: null,
    lastDate: null,
    returns: {
      "1W": null,
      "1M": null,
      "3M": null,
      "6M": null,
      "1Y": null,
    },
    distanceToMovingAverages: {
      ma20: null,
      ma50: null,
      ma200: null,
    },
    extension: {
      zScore5Y: null,
      percentile5Y: null,
      currentDrawdownFull: null,
    },
  },
  {
    ticker: "SMH",
    name: "VanEck Semiconductor ETF",
    category: "Temáticos",
    status: "unavailable",
    lastClose: null,
    lastDate: null,
    returns: {
      "1W": null,
      "1M": null,
      "3M": null,
      "6M": null,
      "1Y": null,
    },
    distanceToMovingAverages: {
      ma20: null,
      ma50: null,
      ma200: null,
    },
    extension: {
      zScore5Y: null,
      percentile5Y: null,
      currentDrawdownFull: null,
    },
  },
];

function filterCorrelation(correlation: StatisticalLevelsManifest["correlation"]) {
  if (!correlation) return correlation;
  return Object.fromEntries(
    Object.entries(correlation).map(([frequency, windows]) => [
      frequency,
      Object.fromEntries(
        Object.entries(windows).map(([window, matrix]) => {
          const values = Object.fromEntries(
            Object.entries(matrix.values)
              .filter(([ticker]) => !etfFlowOnlyTickers.has(ticker))
              .map(([ticker, row]) => [
                ticker,
                Object.fromEntries(Object.entries(row).filter(([rowTicker]) => !etfFlowOnlyTickers.has(rowTicker))),
              ]),
          );
          return [
            window,
            {
              ...matrix,
              tickers: matrix.tickers.filter((ticker) => !etfFlowOnlyTickers.has(ticker)),
              values,
            },
          ];
        }),
      ),
    ]),
  ) as unknown as StatisticalLevelsManifest["correlation"];
}

function statusCountsFromSummaries(summaries: AssetStatSummary[]) {
  return summaries.reduce(
    (counts, asset) => ({
      ...counts,
      [asset.status]: counts[asset.status] + 1,
    }),
    { ok: 0, limited_history: 0, unavailable: 0 } satisfies StatisticalLevelsManifest["statusCounts"],
  );
}

function enrichManifest(manifest: StatisticalLevelsManifest): StatisticalLevelsManifest {
  const catalog = manifest.catalog.filter((asset) => !etfFlowOnlyTickers.has(asset.ticker));
  const summaries = manifest.summaries.filter((asset) => !etfFlowOnlyTickers.has(asset.ticker));
  const catalogTickers = new Set(catalog.map((asset) => asset.ticker));
  const summaryTickers = new Set(summaries.map((asset) => asset.ticker));
  const enrichedCatalog = [
    ...catalog,
    ...preparedManifestItems.filter((asset) => !catalogTickers.has(asset.ticker)),
  ];
  const enrichedSummaries = [
    ...summaries,
    ...preparedSummaries.filter((asset) => !summaryTickers.has(asset.ticker)),
  ];

  return {
    ...manifest,
    catalog: enrichedCatalog,
    summaries: enrichedSummaries,
    correlation: filterCorrelation(manifest.correlation),
    statusCounts: statusCountsFromSummaries(enrichedSummaries),
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeTicker(value: string | string[] | undefined, fallback: string) {
  const ticker = canonicalStatTicker(firstParam(value)?.trim().toUpperCase() ?? "");
  return ticker && /^[A-Z0-9.-]+$/.test(ticker) ? ticker : fallback;
}

function sanitizeFrequency(value: string | string[] | undefined, fallback: StatisticalFrequency) {
  const frequency = firstParam(value) as StatisticalFrequency | undefined;
  return frequency && validFrequencies.has(frequency) ? frequency : fallback;
}

function sanitizeWindow(value: string | string[] | undefined, fallback: StatisticalWindow) {
  const rawWindow = firstParam(value);
  const window = (rawWindow === "All" ? "Full" : rawWindow) as StatisticalWindow | undefined;
  return window && validWindows.has(window) ? window : fallback;
}

export async function getStatisticalLevelsManifest() {
  const manifest = await readJsonFile<StatisticalLevelsManifest>(manifestPath);
  return enrichManifest(manifest);
}

export async function getStatisticalLevelsAsset(ticker: string) {
  return readJsonFile<AssetStatRecord>(path.join(assetsDir, `${ticker}.json`));
}

export async function getStatisticalLevelsAssetSeasonality(ticker: string) {
  return readJsonFile<DailySeasonalityData>(path.join(seasonalityDir, `${ticker}.json`));
}

export async function getStatisticalLevelsPageData(searchParams: Record<string, string | string[] | undefined>) {
  const manifest = await getStatisticalLevelsManifest();
  const catalogTickers = new Set(manifest.catalog.map((asset) => asset.ticker));
  const requestedTicker = sanitizeTicker(searchParams.symbol ?? searchParams.asset, manifest.defaultAsset);
  const assetTicker = catalogTickers.has(requestedTicker) ? requestedTicker : manifest.defaultAsset;
  const frequency = sanitizeFrequency(searchParams.frequency, manifest.defaultFrequency);
  const window = sanitizeWindow(searchParams.window, manifest.defaultWindow);

  const [asset, seasonality] = await Promise.all([
    getStatisticalLevelsAsset(assetTicker),
    getStatisticalLevelsAssetSeasonality(assetTicker),
  ]);

  return {
    manifest,
    asset,
    seasonality,
    selection: {
      asset: assetTicker,
      frequency,
      window,
    },
  };
}
