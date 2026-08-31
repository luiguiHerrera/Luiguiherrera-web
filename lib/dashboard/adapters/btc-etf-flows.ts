import type {
  BtcEtfFlowPoint,
  BtcEtfFlowsDashboardData,
  BtcEtfFlowsData,
  BtcEtfFundFlow,
  BtcFlowBreadth,
  BtcFlowLevel,
  BtcFlowStreak,
  BtcFlowTrend,
  DashboardModuleData,
} from "../types.ts";
import { formatCapitalFlowUsdMillions } from "../capital-flows-presentation.ts";

const REVALIDATE_SECONDS = 60 * 60 * 24;
const BITBO_URL = "https://bitbo.io/treasuries/etf-flows/";
const FARSIDE_URL = "https://farside.co.uk/btc/";
const FARSIDE_ALL_DATA_URL = "https://farside.co.uk/bitcoin-etf-flow-all-data/";
const FARSIDE_URLS = [FARSIDE_ALL_DATA_URL, FARSIDE_URL];
const REQUEST_TIMEOUT_MS = 8000;
const BITBO_EXPECTED_COLUMNS = ["Date", "IBIT", "FBTC", "GBTC", "BTC", "BITB", "ARKB", "HODL", "BTCO", "BRRR", "EZBC", "MSBT", "BTCW", "DEFI", "Totals"];
const FARSIDE_EXPECTED_COLUMNS = ["Date", "IBIT", "FBTC", "BITB", "ARKB", "BTCO", "EZBC", "BRRR", "HODL", "BTCW", "MSBT", "GBTC", "BTC", "Total"];
const AGGREGATE_ROWS = new Set(["total", "totals", "average", "maximum", "minimum"]);

const PRIMARY_SOURCE = {
  name: "Bitbo / BitcoinTreasuries",
  url: BITBO_URL,
};

const FALLBACK_SOURCE = {
  name: "Farside Investors",
  url: FARSIDE_ALL_DATA_URL,
};

type BtcEtfFlowsOptions = {
  fetchImpl?: typeof fetch;
  now?: number;
};

type SourceConfig = {
  id: "bitbo" | "farside";
  label: string;
  urls: string[];
  expectedColumns: string[];
  reliabilityNote: string;
};

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    id: "bitbo",
    label: "Bitbo / BitcoinTreasuries",
    urls: [BITBO_URL],
    expectedColumns: BITBO_EXPECTED_COLUMNS,
    reliabilityNote: "Datos obtenidos desde tabla pública de Bitbo. El historial visible puede estar limitado a las filas publicadas en la página.",
  },
  {
    id: "farside",
    label: "Farside Investors",
    urls: FARSIDE_URLS,
    expectedColumns: FARSIDE_EXPECTED_COLUMNS,
    reliabilityNote: "Fallback experimental sobre tabla pública de Farside Investors. La fuente puede bloquear solicitudes server-side o cambiar estructura.",
  },
];

type ParsedFlowRow = {
  date: string;
  timestamp: number;
  totalNetFlow: number;
  latestFundFlows: BtcEtfFundFlow[];
  calculatedTotal: boolean;
};

type ParsedFarsideTable = {
  rows: ParsedFlowRow[];
  columns: string[];
  calculatedTotal: boolean;
  source: SourceConfig;
  sourceUrl: string;
};

function logBtcFlows(message: string, details: Record<string, unknown> = {}) {
  console.info("[dashboard:btc-etf-flows]", { message, ...details });
}

function logBtcFlowsFallback(reason: string, details: Record<string, unknown> = {}) {
  console.warn("[dashboard:btc-etf-flows]", { reason, ...details });
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function expectedFundColumns(expectedColumns: string[]) {
  return new Set(expectedColumns.filter((column) => !["date", "total", "totals"].includes(normalizeHeader(column))).map(normalizeHeader));
}

function matchingExpectedColumns(headers: string[], expectedColumns: string[]) {
  const normalized = headers.map(normalizeHeader);
  return expectedColumns.filter((column) => normalized.includes(normalizeHeader(column)));
}

function parseFlowValue(value: string): number | null {
  const clean = value
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/m$/i, "")
    .replace(/[–—]/g, "-")
    .trim();

  if (!clean || clean === "-" || clean.toLowerCase() === "n/a") {
    return null;
  }

  const parenthetical = clean.match(/^\(([-\d.]+)\)$/);
  const normalized = parenthetical ? `-${parenthetical[1]}` : clean;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.abs(parsed) < 0.000001 ? 0 : parsed;
}

function parseFarsideDate(value: string) {
  const clean = value.replace(/(\d+)(st|nd|rd|th)/gi, "$1").trim();
  const timestamp = Date.parse(`${clean} UTC`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatRollingFlow(value: number | null) {
  return formatCapitalFlowUsdMillions(value, "es", "insufficient");
}

function formatPositiveFundFlow(flow: BtcEtfFundFlow | null) {
  return flow ? `${flow.ticker} ${formatCapitalFlowUsdMillions(flow.flow, "es")}` : "Sin entradas positivas";
}

function formatNegativeFundFlow(flow: BtcEtfFundFlow | null) {
  return flow ? `${flow.ticker} ${formatCapitalFlowUsdMillions(flow.flow, "es")}` : "Sin salidas negativas";
}

function dataStatusForTimestamp(timestamp: number, now = Date.now()): BtcEtfFlowsData["dataStatus"] {
  const staleAfterMs = 4 * 24 * 60 * 60 * 1000;
  return now - timestamp > staleAfterMs ? "delayed" : "automated";
}

function sumRows(rows: ParsedFlowRow[], count: number) {
  return rows.length >= count ? rows.slice(0, count).reduce((sum, row) => sum + row.totalNetFlow, 0) : null;
}

function latestFundBreadth(fundFlows: BtcEtfFundFlow[]): BtcFlowBreadth {
  return fundFlows.reduce<BtcFlowBreadth>(
    (breadth, fund) => {
      if (fund.flow > 0) return { ...breadth, positive: breadth.positive + 1 };
      if (fund.flow < 0) return { ...breadth, negative: breadth.negative + 1 };
      return { ...breadth, flatOrMissing: breadth.flatOrMissing + 1 };
    },
    { positive: 0, negative: 0, flatOrMissing: 0 },
  );
}

function positiveNegativeDays(rows: ParsedFlowRow[]) {
  return rows.slice(0, 10).reduce(
    (counts, row) => ({
      positive: counts.positive + (row.totalNetFlow > 0 ? 1 : 0),
      negative: counts.negative + (row.totalNetFlow < 0 ? 1 : 0),
    }),
    { positive: 0, negative: 0 },
  );
}

function flowStreak(rows: ParsedFlowRow[]): BtcFlowStreak {
  const direction = rows[0]?.totalNetFlow > 0 ? "inflow" : rows[0]?.totalNetFlow < 0 ? "outflow" : "none";
  if (direction === "none") {
    return { direction, count: 0, label: "Sin racha clara" };
  }

  const count = rows.findIndex((row) => (direction === "inflow" ? row.totalNetFlow <= 0 : row.totalNetFlow >= 0));
  const streakCount = count === -1 ? rows.length : count;
  const noun = direction === "inflow" ? "entradas" : "salidas";
  return {
    direction,
    count: streakCount,
    label: streakCount > 1 ? `Racha de ${streakCount} días de ${noun}` : `Racha de ${noun}`,
  };
}

function dailyLevel(value: number | null): BtcFlowLevel {
  if (value === null) return "pending";
  if (value > 300) return "strong_inflow";
  if (value >= 50) return "moderate_inflow";
  if (value < -300) return "strong_outflow";
  if (value <= -50) return "moderate_outflow";
  return "neutral";
}

function recentTrend(rolling5d: number | null, rolling20d: number | null): BtcFlowTrend {
  if (rolling5d === null || rolling20d === null) return "pending";
  if (rolling5d > 1000 || rolling20d > 3000) return "sustained_accumulation";
  if (rolling5d >= 250 || rolling20d >= 750) return "moderate_inflows";
  if (rolling5d < -1000 || rolling20d < -3000) return "outflow_pressure";
  if (rolling5d <= -250 || rolling20d <= -750) return "moderate_outflows";
  return "mixed";
}

function classifyFlowReading(
  latestTotalNetFlow: number | null,
  rolling5dNetFlow: number | null,
  rolling20dNetFlow: number | null,
  breadth: BtcFlowBreadth,
  streak: BtcFlowStreak,
): Pick<BtcEtfFlowsData, "readingLabel" | "readingSubtext" | "readingSeverity"> {
  if (latestTotalNetFlow === null || rolling5dNetFlow === null) {
    return {
      readingLabel: "Datos pendientes",
      readingSubtext: "La fuente aún no ha publicado o completado la actualización diaria.",
      readingSeverity: "pending",
    };
  }

  if ((rolling5dNetFlow > 250 && (rolling20dNetFlow === null || rolling20dNetFlow > 750)) || (latestTotalNetFlow > 300 && breadth.positive > breadth.negative)) {
    return {
      readingLabel: "Entradas sostenidas",
      readingSubtext: rolling20dNetFlow === null ? "La ventana reciente muestra demanda neta positiva; historial insuficiente para 20D." : streak.direction === "inflow" ? "Los ETFs spot de Bitcoin muestran demanda neta positiva en la ventana reciente." : "La ventana reciente mantiene demanda neta positiva vía ETFs.",
      readingSeverity: "positive",
    };
  }

  if ((rolling5dNetFlow < -250 && (rolling20dNetFlow === null || rolling20dNetFlow < -750)) || (latestTotalNetFlow < -300 && breadth.negative > breadth.positive)) {
    return {
      readingLabel: "Presión de salidas",
      readingSubtext: rolling20dNetFlow === null ? "La ventana reciente muestra reducción neta de exposición; historial insuficiente para 20D." : "Los flujos recientes muestran reducción neta de exposición vía ETFs.",
      readingSeverity: "negative",
    };
  }

  return {
    readingLabel: "Flujos mixtos",
    readingSubtext: "No hay una dirección dominante clara en los flujos recientes.",
    readingSeverity: "neutral",
  };
}

function strongestPositive(fundFlows: BtcEtfFundFlow[]) {
  return fundFlows.filter((fund) => fund.flow > 0).sort((a, b) => b.flow - a.flow)[0] ?? null;
}

function strongestNegative(fundFlows: BtcEtfFundFlow[]) {
  return fundFlows.filter((fund) => fund.flow < 0).sort((a, b) => a.flow - b.flow)[0] ?? null;
}

function dominantDriver(fundFlows: BtcEtfFundFlow[]) {
  const driver = [...fundFlows].sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow))[0];
  return driver && driver.flow !== 0 ? driver.ticker : "Sin aportante dominante";
}

function parsePublicFlowRows(html: string, source: SourceConfig, sourceUrl: string): ParsedFarsideTable {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const fundColumns = expectedFundColumns(source.expectedColumns);

  for (const table of tableMatches) {
    const rawRows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const parsedRows = rawRows.map((row) => {
      const cellMatches = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
      return cellMatches.map(stripHtml);
    });
    const headerIndex = parsedRows.findIndex((row) => {
      const normalized = row.map(normalizeHeader);
      const expectedFundMatches = normalized.filter((cell) => fundColumns.has(cell)).length;
      const hasTotal = normalized.some((cell) => cell === "total" || cell === "totals" || cell.includes("total"));
      return normalized.includes("date") && (hasTotal || expectedFundMatches >= 3);
    });

    if (headerIndex === -1) continue;

    const headers = parsedRows[headerIndex];
    const normalizedHeaders = headers.map(normalizeHeader);
    const dateIndex = normalizedHeaders.findIndex((cell) => cell === "date");
    const totalIndex = normalizedHeaders.findIndex((cell) => cell === "total" || cell === "totals" || cell.includes("total"));

    if (dateIndex === -1) continue;

    const rows = parsedRows
      .slice(headerIndex + 1)
      .map((cells) => {
        const date = cells[dateIndex] ?? "";
        if (AGGREGATE_ROWS.has(normalizeHeader(date))) return null;
        const timestamp = parseFarsideDate(date);
        if (timestamp === null) return null;

        const fundFlows = headers
          .map((ticker, index) => ({ ticker: ticker.trim(), normalizedTicker: normalizeHeader(ticker), flow: parseFlowValue(cells[index] ?? "") }))
          .filter(({ normalizedTicker }, index) => index !== dateIndex && index !== totalIndex && fundColumns.has(normalizedTicker))
          .map(({ ticker, flow }) => ({ ticker, flow: flow ?? 0 }));
        const calculatedTotal = totalIndex === -1;
        const totalFromTable = totalIndex === -1 ? null : parseFlowValue(cells[totalIndex] ?? "");
        const totalNetFlow = totalFromTable ?? fundFlows.reduce((sum, fund) => sum + fund.flow, 0);

        return { date, timestamp, totalNetFlow, latestFundFlows: fundFlows, calculatedTotal };
      })
      .filter((row): row is ParsedFlowRow => row !== null && Number.isFinite(row.totalNetFlow))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (rows.length >= 5) {
      return {
        rows,
        columns: headers,
        calculatedTotal: rows.some((row) => row.calculatedTotal),
        source,
        sourceUrl,
      };
    }
  }

  return { rows: [], columns: [], calculatedTotal: false, source, sourceUrl };
}

async function fetchSourceHtml(url: string, source: SourceConfig, fetchImpl: typeof fetch) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          "User-Agent": "MarketRegimeDashboard/1.0 (+https://market-lab.local)",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const html = await response.text();
      logBtcFlows("source_response", {
        source: source.id,
        url,
        attempt,
        status: response.status,
        htmlLength: html.length,
      });

      if (!response.ok) {
        lastError = new Error(`${source.label} HTTP ${response.status}`);
        continue;
      }

      return html;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("unknown Farside request error");
      logBtcFlowsFallback("source_request_attempt_failed", {
        source: source.id,
        url,
        attempt,
        message: lastError.message,
      });
    }
  }

  throw lastError ?? new Error(`${source.label} request failed`);
}

async function getParsedSourceTable(source: SourceConfig, fetchImpl: typeof fetch) {
  const errors: string[] = [];

  for (const url of source.urls) {
    try {
      const html = await fetchSourceHtml(url, source, fetchImpl);
      const parsed = parsePublicFlowRows(html, source, url);
      logBtcFlows("source_parse", {
        source: source.id,
        url,
        tableFound: parsed.rows.length > 0,
        rowsParsed: parsed.rows.length,
        latestDates: parsed.rows.slice(0, 3).map((row) => row.date),
        columns: parsed.columns,
        expectedColumnsDetected: matchingExpectedColumns(parsed.columns, source.expectedColumns),
        calculatedTotal: parsed.calculatedTotal,
        rolling20dAvailable: parsed.rows.length >= 20,
      });

      if (parsed.rows.length >= 5) {
        return parsed;
      }
      errors.push(`${url}: no usable table`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`${url}: ${message}`);
      logBtcFlowsFallback("source_fetch_or_parse_failed", { source: source.id, url, message });
    }
  }

  throw new Error(errors.join(" | "));
}

async function getParsedBtcFlowTable(fetchImpl: typeof fetch) {
  const errors: string[] = [];

  for (const source of SOURCE_CONFIGS) {
    try {
      return await getParsedSourceTable(source, fetchImpl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown source error";
      errors.push(`${source.label}: ${message}`);
      logBtcFlowsFallback("btc_flow_source_failed", { source: source.id, message });
    }
  }

  throw new Error(errors.join(" | "));
}

function buildBtcDataFromRows(parsed: ParsedFarsideTable, now: number): BtcEtfFlowsData {
  const { calculatedTotal, rows, source, sourceUrl } = parsed;
  const latest = rows[0];
  const rolling5dNetFlow = sumRows(rows, 5);
  const rolling10dNetFlow = sumRows(rows, 10);
  const rolling20dNetFlow = sumRows(rows, 20);
  const dayCounts = positiveNegativeDays(rows);
  const streak = flowStreak(rows);
  const breadth = latestFundBreadth(latest.latestFundFlows);
  const largestInflowFundLatestDay = strongestPositive(latest.latestFundFlows);
  const largestOutflowFundLatestDay = strongestNegative(latest.latestFundFlows);
  const reading = classifyFlowReading(latest.totalNetFlow, rolling5dNetFlow, rolling20dNetFlow, breadth, streak);

  return {
    sourceRole: source.id === "bitbo" ? "primary" : "fallback",
    coverage: rows.length >= 20 ? "complete" : "partial",
    primarySource: PRIMARY_SOURCE,
    fallbackSource: FALLBACK_SOURCE,
    sourceName: source.label,
    sourceUrl,
    lastUpdated: latest.date,
    updateFrequency: "Diaria / según disponibilidad de la fuente",
    dataStatus: dataStatusForTimestamp(latest.timestamp, now),
    reliabilityNote: source.reliabilityNote,
    latestDate: latest.date,
    latestTotalNetFlow: latest.totalNetFlow,
    latestFundFlows: latest.latestFundFlows,
    rolling5dNetFlow,
    rolling10dNetFlow,
    rolling20dNetFlow,
    positiveDaysLast10: dayCounts.positive,
    negativeDaysLast10: dayCounts.negative,
    flowStreak: streak,
    cumulativeNetFlow: rows.reduce((sum, row) => sum + row.totalNetFlow, 0),
    largestInflowFundLatestDay,
    largestOutflowFundLatestDay,
    dominantFlowDriver: dominantDriver(latest.latestFundFlows),
    breadth,
    dailyLevel: dailyLevel(latest.totalNetFlow),
    recentTrend: recentTrend(rolling5dNetFlow, rolling20dNetFlow),
    calculatedTotal,
    rowsParsed: rows.length,
    history: rows.slice(0, 30).reverse().map<BtcEtfFlowPoint>((row) => ({ date: row.date, totalNetFlow: row.totalNetFlow })),
    interpretation: {
      lookingAt: "Flujos netos hacia o desde ETFs spot de Bitcoin de EE. UU. como proxy de demanda vía vehículos regulados.",
      why: "Ayuda a observar presión de flujos y absorción institucional separada del movimiento diario del precio spot.",
      how: "Lectura aproximada basada en flujos netos diarios y acumulados recientes. Ventanas positivas sugieren demanda vía ETFs; ventanas negativas sugieren reducción de exposición vía ETFs.",
      whatItDoesNotMean: "Entradas netas no garantizan subidas del precio de Bitcoin. Salidas netas tampoco implican caídas futuras. Los flujos son una pieza de contexto junto con precio, liquidez, volatilidad y régimen macro.",
    },
    ...reading,
  };
}

function buildModuleFromData(data: BtcEtfFlowsData): DashboardModuleData {
  const driverSummary = [
    `Mayor aporte positivo: ${formatPositiveFundFlow(data.largestInflowFundLatestDay)}`,
    `Mayor aporte negativo: ${formatNegativeFundFlow(data.largestOutflowFundLatestDay)}`,
  ].join(" · ");

  return {
    id: "btc-flows",
    title: "BTC ETF Flows",
    status: data.readingLabel,
    sourceName: data.sourceName,
    sourceUrl: data.sourceUrl,
    lastUpdated: data.lastUpdated,
    updateFrequency: data.updateFrequency,
    dataStatus: data.dataStatus,
    reliabilityNote: data.reliabilityNote,
    observedData: [
      ["Flujo neto último día", formatCapitalFlowUsdMillions(data.latestTotalNetFlow, "es")],
      ["Rolling 5D", formatCapitalFlowUsdMillions(data.rolling5dNetFlow, "es")],
      ["Rolling 20D", formatRollingFlow(data.rolling20dNetFlow)],
      ["Racha", data.flowStreak.label],
      ["Aportantes", driverSummary],
    ],
    interpretation: data.interpretation,
  };
}

function unavailableBtcFlowsData(reason: string): BtcEtfFlowsDashboardData {
  logBtcFlowsFallback("btc_flows_unavailable", { reason });
  const data: BtcEtfFlowsData = {
    sourceRole: "unavailable",
    coverage: "unavailable",
    primarySource: PRIMARY_SOURCE,
    fallbackSource: FALLBACK_SOURCE,
    sourceName: "Sin fuente activa",
    lastUpdated: "",
    updateFrequency: "Diaria / según disponibilidad de la fuente",
    dataStatus: "unavailable",
    reliabilityNote: "Bitbo y Farside no devolvieron una tabla válida. No se sustituyen observaciones ni métricas con datos fabricados. El detalle técnico permanece en logs server-side.",
    latestDate: "",
    latestTotalNetFlow: null,
    latestFundFlows: [],
    rolling5dNetFlow: null,
    rolling10dNetFlow: null,
    rolling20dNetFlow: null,
    positiveDaysLast10: 0,
    negativeDaysLast10: 0,
    flowStreak: { direction: "none", count: 0, label: "Sin observaciones disponibles" },
    cumulativeNetFlow: null,
    largestInflowFundLatestDay: null,
    largestOutflowFundLatestDay: null,
    dominantFlowDriver: "Sin observaciones disponibles",
    breadth: { positive: 0, negative: 0, flatOrMissing: 0 },
    dailyLevel: "pending",
    recentTrend: "pending",
    readingLabel: "Datos no disponibles",
    readingSubtext: "Las fuentes reales configuradas no están disponibles temporalmente.",
    readingSeverity: "pending",
    calculatedTotal: false,
    rowsParsed: 0,
    history: [],
    interpretation: {
      lookingAt: "Flujos netos hacia o desde ETFs spot de Bitcoin de EE. UU. como proxy de demanda vía vehículos regulados.",
      why: "Ayuda a observar presión de flujos y absorción institucional separada del movimiento diario del precio spot.",
      how: "La lectura se reanudará cuando Bitbo o Farside vuelvan a publicar una tabla válida.",
      whatItDoesNotMean: "La ausencia temporal de observaciones no permite inferir entradas, salidas, tendencia ni dirección del precio de Bitcoin.",
    },
  };

  return {
    flows: data,
    module: buildModuleFromData(data),
  };
}

export async function getBtcEtfFlowsData(options: BtcEtfFlowsOptions = {}): Promise<BtcEtfFlowsDashboardData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now();

  try {
    const parsed = await getParsedBtcFlowTable(fetchImpl);
    const data = buildBtcDataFromRows(parsed, now);
    return {
      flows: data,
      module: buildModuleFromData(data),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente";
    return unavailableBtcFlowsData(reason);
  }
}
