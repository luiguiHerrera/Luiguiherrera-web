import { unstable_cache } from "next/cache.js";
import {
  buildSectorResult,
  buildUnavailableSectorResult,
  MIN_SECTOR_HISTORY,
  parseAlphaVantagePrices,
  sanitizeProviderMessage,
  SECTOR_ETFS,
  type AlphaVantageDailyResponse,
  type SectorEtfsResult,
  type SectorHistory,
} from "./sector-data-core.ts";

const REVALIDATE_SECONDS = 60 * 60 * 24;
const ALPHA_VANTAGE_ENDPOINT = "TIME_SERIES_DAILY";
const ALPHA_VANTAGE_OUTPUTSIZE = "compact";
const ALPHA_VANTAGE_REQUEST_DELAY_MS = 1200;
const ALPHA_VANTAGE_TIMEOUT_MS = 8000;

type SectorFetch = (input: string | URL | Request, init?: RequestInit & { next?: { revalidate: number } }) => Promise<Response>;

type SectorLoadOptions = {
  apiKey?: string;
  fetcher?: SectorFetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: number;
};

function providerMessage(payload: AlphaVantageDailyResponse) {
  return payload["Error Message"] ?? payload.Information ?? payload.Note;
}

function logSourceIssue(symbol: string, reason: string, details: Record<string, unknown> = {}) {
  console.warn("[dashboard:sector-etfs]", { symbol, reason, ...details });
}

async function fetchSectorHistory(
  symbol: (typeof SECTOR_ETFS)[number]["symbol"],
  apiKey: string,
  fetcher: SectorFetch,
): Promise<SectorHistory> {
  const meta = SECTOR_ETFS.find((etf) => etf.symbol === symbol);
  if (!meta) throw new Error(`unknown sector symbol: ${symbol}`);

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", ALPHA_VANTAGE_ENDPOINT);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", ALPHA_VANTAGE_OUTPUTSIZE);
  url.searchParams.set("apikey", apiKey);

  const response = await fetcher(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(ALPHA_VANTAGE_TIMEOUT_MS),
  });
  if (!response.ok) {
    logSourceIssue(symbol, "http_error", { status: response.status });
    throw new Error(`Alpha Vantage ${symbol} HTTP ${response.status}`);
  }

  const payload = (await response.json()) as AlphaVantageDailyResponse;
  const prices = parseAlphaVantagePrices(payload);
  const message = sanitizeProviderMessage(providerMessage(payload));
  if (message || prices.length < MIN_SECTOR_HISTORY) {
    logSourceIssue(symbol, message ? "provider_message" : "insufficient_history", {
      parsedRows: prices.length,
      message,
      topLevelKeys: Object.keys(payload).slice(0, 8),
    });
    throw new Error(message ? `Alpha Vantage ${symbol} provider response` : `Alpha Vantage ${symbol} returned ${prices.length} sessions`);
  }

  return {
    symbol,
    name: meta.name,
    group: meta.group,
    latestDate: prices.at(-1)?.date ?? "",
    prices,
    closeConvention: "close",
  };
}

export async function loadSectorEtfsData(options: SectorLoadOptions = {}): Promise<SectorEtfsResult> {
  const apiKey = options.apiKey ?? process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return buildUnavailableSectorResult("credencial de proveedor ausente");

  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  try {
    const histories: SectorHistory[] = [];
    for (const etf of SECTOR_ETFS) {
      histories.push(await fetchSectorHistory(etf.symbol, apiKey, fetcher));
      if (histories.length < SECTOR_ETFS.length) await sleep(ALPHA_VANTAGE_REQUEST_DELAY_MS);
    }
    return buildSectorResult(histories, options.now ?? Date.now());
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente";
    return buildUnavailableSectorResult(reason);
  }
}

export function createDailySectorCache(loader: () => Promise<SectorEtfsResult>, now: () => number = Date.now) {
  let cached: { expiresAt: number; promise: Promise<SectorEtfsResult> } | null = null;
  return () => {
    const current = now();
    if (cached && current < cached.expiresAt) return cached.promise;
    cached = { expiresAt: current + REVALIDATE_SECONDS * 1000, promise: loader() };
    return cached.promise;
  };
}

const getPersistentSectorSnapshot = unstable_cache(
  () => loadSectorEtfsData(),
  ["dashboard-sector-snapshot-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-sector-snapshot"] },
);

const getDailySectorSnapshot = createDailySectorCache(getPersistentSectorSnapshot);

export async function getSectorEtfsData(options?: SectorLoadOptions) {
  return options ? loadSectorEtfsData(options) : getDailySectorSnapshot();
}

export type { SectorEtfsResult } from "./sector-data-core.ts";
