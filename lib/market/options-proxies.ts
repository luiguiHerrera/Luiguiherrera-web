export type OptionsProxyContext = {
  sourceStatus: "prepared" | "automated" | "pending";
  sourceName: string;
  sourceUrl: string;
  lastUpdated: string;
  statusText: string;
  proxyClarification: string;
  nextStep: string;
  ratios: {
    total: number | null;
    index: number | null;
    equity: number | null;
    spxSpxw: number | null;
  };
};

const CBOE_DAILY_MARKET_STATISTICS_URL = "https://www.cboe.com/markets/us/options/market-statistics/daily";
const REQUEST_TIMEOUT_MS = 8000;
const REVALIDATE_SECONDS = 60 * 60 * 24;

function pendingOptionsProxyContext(reason?: string): OptionsProxyContext {
  return {
    sourceStatus: "pending",
    sourceName: "Cboe Daily Market Statistics",
    sourceUrl: CBOE_DAILY_MARKET_STATISTICS_URL,
    lastUpdated: "Pendiente",
    statusText: "Proxy Cboe pendiente de actualización; no hay dato 0DTE real cargado.",
    proxyClarification: reason
      ? `Cboe put/call ratios queda como proxy de opciones potencial; no sustituye datos reales por vencimiento 0DTE. Último intento: ${reason}`
      : "Cboe put/call ratios queda como proxy de opciones potencial; no sustituye datos reales por vencimiento 0DTE.",
    nextStep: "Integrar datos por vencimiento/serie antes de mostrar 0DTE real.",
    ratios: {
      total: null,
      index: null,
      equity: null,
      spxSpxw: null,
    },
  };
}

export const optionsProxyContext: OptionsProxyContext = {
  sourceStatus: "prepared",
  sourceName: "Cboe Daily Market Statistics",
  sourceUrl: CBOE_DAILY_MARKET_STATISTICS_URL,
  lastUpdated: "Pendiente",
  statusText: "Proxy Cboe pendiente de actualización; no hay dato 0DTE real cargado.",
  proxyClarification: "Cboe put/call ratios queda como proxy de opciones potencial; no sustituye datos reales por vencimiento 0DTE.",
  nextStep: "Integrar datos por vencimiento/serie antes de mostrar 0DTE real.",
  ratios: {
    total: null,
    index: null,
    equity: null,
    spxSpxw: null,
  },
};

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRatio(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escapedLabel}\\s+([0-9]+(?:\\.[0-9]+)?)`, "i"));
  return match ? parseNumber(match[1]) : null;
}

function parseCboeDate(html: string) {
  const match = html.match(/\\?"currentDate\\?"\s*:\s*\\?"(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) return match[1];

  const dates = [...new Set(html.match(/20\d{2}-\d{2}-\d{2}/g) ?? [])].sort();
  return dates.at(-1) ?? null;
}

function isFreshMarketDate(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return false;
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp <= maxAgeMs;
}

function parseCboeOptionsProxy(html: string): OptionsProxyContext {
  const table = html.match(/<table[\s\S]*?TOTAL PUT\/CALL RATIO[\s\S]*?<\/table>/i)?.[0];
  if (!table) {
    throw new Error("Cboe no expuso tabla de ratios put/call.");
  }

  const text = stripHtml(table);
  const currentDate = parseCboeDate(html);
  if (!currentDate) {
    throw new Error("Cboe no expuso fecha currentDate.");
  }
  if (!isFreshMarketDate(currentDate)) {
    throw new Error(`Cboe expuso fecha no vigente: ${currentDate}.`);
  }

  const ratios = {
    total: extractRatio(text, "TOTAL PUT/CALL RATIO"),
    index: extractRatio(text, "INDEX PUT/CALL RATIO"),
    equity: extractRatio(text, "EQUITY PUT/CALL RATIO"),
    spxSpxw: extractRatio(text, "SPX + SPXW PUT/CALL RATIO"),
  };

  if (Object.values(ratios).some((value) => value === null)) {
    throw new Error("Cboe no expuso todos los ratios esperados.");
  }

  return {
    sourceStatus: "automated",
    sourceName: "Cboe Daily Market Statistics",
    sourceUrl: CBOE_DAILY_MARKET_STATISTICS_URL,
    lastUpdated: currentDate,
    statusText: `Proxy Cboe: total put/call ${ratios.total?.toFixed(2)}; index ${ratios.index?.toFixed(2)}; equity ${ratios.equity?.toFixed(2)}; SPX + SPXW ${ratios.spxSpxw?.toFixed(2)}.`,
    proxyClarification: "Lectura proxy de opciones; no es dato 0DTE real por vencimiento/serie.",
    nextStep: "Integrar datos por vencimiento/serie antes de mostrar 0DTE real.",
    ratios,
  };
}

export async function getOptionsProxyData(): Promise<OptionsProxyContext> {
  try {
    const response = await fetch(CBOE_DAILY_MARKET_STATISTICS_URL, {
      headers: {
        "User-Agent": "MarketRegimeDashboard/1.0 (+https://market-lab.local)",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const html = await response.text();

    if (!response.ok) {
      throw new Error(`Cboe HTTP ${response.status}`);
    }

    return parseCboeOptionsProxy(html);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido al leer Cboe";
    return pendingOptionsProxyContext(reason);
  }
}
