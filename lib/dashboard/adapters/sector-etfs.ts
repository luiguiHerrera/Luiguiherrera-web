import { unstable_cache } from "next/cache.js";
import {
  buildSectorResult,
  buildUnavailableSectorResult,
  MIN_SECTOR_HISTORY,
  parseAlphaVantagePrices,
  sanitizeProviderMessage,
  SECTOR_ETFS,
  SECTOR_STALE_AFTER_MS,
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

export class SectorDataUnavailableError extends Error {}

function isSourceTransportError(error: unknown) {
  if (!(error instanceof Error) || "digest" in error) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  const cause = error.cause as { code?: string } | undefined;
  return error instanceof TypeError && error.message === "fetch failed" &&
    ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET"].includes(cause?.code ?? "");
}

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

  let response: Response;
  try {
    response = await fetcher(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(ALPHA_VANTAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (!isSourceTransportError(error)) throw error;
    throw new SectorDataUnavailableError(`Alpha Vantage ${symbol} transport unavailable`);
  }
  if (!response.ok) {
    logSourceIssue(symbol, "http_error", { status: response.status });
    throw new SectorDataUnavailableError(`Alpha Vantage ${symbol} HTTP ${response.status}`);
  }

  let payload: AlphaVantageDailyResponse;
  try {
    payload = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError && !("digest" in error)) && !isSourceTransportError(error)) throw error;
    throw new SectorDataUnavailableError(`Alpha Vantage ${symbol} invalid response`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      [payload["Error Message"], payload.Information, payload.Note].some(value => value !== undefined && typeof value !== "string")) {
    throw new SectorDataUnavailableError(`Alpha Vantage ${symbol} invalid payload`);
  }
  const series = payload["Time Series (Daily)"];
  if (series !== undefined && (!series || typeof series !== "object" || Array.isArray(series) ||
      Object.entries(series).some(([date, values]) => !values || typeof values !== "object" || Array.isArray(values) ||
        (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isFinite(Date.parse(`${date}T00:00:00Z`)))))) {
    throw new SectorDataUnavailableError(`Alpha Vantage ${symbol} invalid daily series`);
  }
  const prices = parseAlphaVantagePrices(payload);
  const message = sanitizeProviderMessage(providerMessage(payload));
  if (message || prices.length < MIN_SECTOR_HISTORY) {
    logSourceIssue(symbol, message ? "provider_message" : "insufficient_history", {
      parsedRows: prices.length,
      message,
      topLevelKeys: Object.keys(payload).slice(0, 8),
    });
    throw new SectorDataUnavailableError(message ? `Alpha Vantage ${symbol} provider response` : `Alpha Vantage ${symbol} returned ${prices.length} sessions`);
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
    try {
      return buildSectorResult(histories, options.now ?? Date.now());
    } catch (error) {
      // These are the existing core's explicit source-history validation failures.
      if (error instanceof Error && error.constructor === Error && !("digest" in error) &&
          /^(sector coverage \d+\/\d+|common sector history \d+\/\d+|latest common sector session is unavailable|latest common sector session is stale: \d{4}-\d{2}-\d{2})$/.test(error.message)) {
        throw new SectorDataUnavailableError(error.message);
      }
      throw error;
    }
  } catch (error) {
    if (!(error instanceof SectorDataUnavailableError)) throw error;
    return buildUnavailableSectorResult(error.message);
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

export function assertUsableSectorRotation(rotation: SectorEtfsResult["rotation"], now = Date.now()) {
  const sectors = Array.isArray(rotation?.sectors) ? rotation.sectors : [];
  const expected = new Set<string>(SECTOR_ETFS.map(({ symbol }) => symbol));
  const actual = new Set(sectors.map(sector => sector?.etfTicker));
  const dates = new Set(sectors.map(sector => sector?.lastUpdated));
  const date = sectors[0]?.lastUpdated ?? "";
  const end = Date.parse(`${date}T23:59:59Z`);
  if (rotation?.dataStatus !== "automated" || sectors.length !== expected.size ||
      actual.size !== expected.size || [...actual].some(symbol => !expected.has(symbol)) ||
      dates.size !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(end) ||
      new Date(end).toISOString().slice(0, 10) !== date ||
      end - now > 86_400_000 || now - end > SECTOR_STALE_AFTER_MS) {
    throw new SectorDataUnavailableError("Sector snapshot lacks complete, dated, fresh coverage; cache not updated");
  }
}

export function requireCompleteSectorSnapshot(result: SectorEtfsResult, now = Date.now()) {
  assertUsableSectorRotation(result?.rotation, now);
  if (result?.module?.dataStatus !== "automated" || result?.quantRisk?.dataStatus !== "automated") {
    throw new SectorDataUnavailableError("Sector snapshot is unavailable; cache not updated");
  }
  return result;
}

const getPersistentSectorSnapshot = unstable_cache(
  async () => requireCompleteSectorSnapshot(await loadSectorEtfsData()),
  ["dashboard-sector-snapshot-v3-valid-only"],
  { revalidate: REVALIDATE_SECONDS, tags: ["dashboard-sector-snapshot"] },
);

const getDailySectorSnapshot = createDailySectorCache(getPersistentSectorSnapshot);

// Cache callbacks must use this strict reader, never the presentation fallback.
export async function getStrictSectorEtfsData() {
  return requireCompleteSectorSnapshot(await getDailySectorSnapshot());
}

export async function getSectorEtfsData(options?: SectorLoadOptions) {
  try {
    return options
      ? requireCompleteSectorSnapshot(await loadSectorEtfsData(options), options.now ?? Date.now())
      : await getStrictSectorEtfsData();
  } catch (error) {
    if (!(error instanceof SectorDataUnavailableError)) throw error;
    return buildUnavailableSectorResult(error.message);
  }
}

export type { SectorEtfsResult } from "./sector-data-core.ts";
