import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
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

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeTicker(value: string | string[] | undefined, fallback: string) {
  const ticker = firstParam(value)?.trim().toUpperCase();
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
  return readJsonFile<StatisticalLevelsManifest>(manifestPath);
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
  const requestedTicker = sanitizeTicker(searchParams.asset, manifest.defaultAsset);
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
