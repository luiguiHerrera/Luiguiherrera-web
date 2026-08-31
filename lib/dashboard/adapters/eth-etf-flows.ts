import type {
  BtcEtfFlowPoint,
  BtcEtfFundFlow,
  BtcFlowBreadth,
  BtcFlowLevel,
  BtcFlowStreak,
  BtcFlowTrend,
  DashboardModuleData,
  EtfFlowsDashboardData,
  EtfFlowsData,
} from "@/lib/dashboard/types";

const FARSIDE_ETH_URL = "https://farside.co.uk/eth/";
const FARSIDE_ETH_ALL_DATA_URL = "https://farside.co.uk/ethereum-etf-flow-all-data/";
const FARSIDE_ETH_URLS = [FARSIDE_ETH_ALL_DATA_URL, FARSIDE_ETH_URL];
const REVALIDATE_SECONDS = 60 * 60 * 24;
const REQUEST_TIMEOUT_MS = 8000;
const ETH_EXPECTED_COLUMNS = ["Date", "ETHA", "FETH", "ETHW", "CETH", "ETHV", "QETH", "EZET", "ETHE", "ETH", "Total"];
const AGGREGATE_ROWS = new Set(["total", "totals", "average", "maximum", "minimum"]);

type ParsedEthFlowRow = {
  date: string;
  timestamp: number;
  totalNetFlow: number;
  latestFundFlows: BtcEtfFundFlow[];
  calculatedTotal: boolean;
};

type ParsedEthFlowTable = {
  rows: ParsedEthFlowRow[];
  columns: string[];
  calculatedTotal: boolean;
  sourceUrl: string;
};

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

function expectedFundColumns() {
  return new Set(ETH_EXPECTED_COLUMNS.filter((column) => !["date", "total"].includes(normalizeHeader(column))).map(normalizeHeader));
}

function parseFlowValue(value: string): number | null {
  const clean = value
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/m$/i, "")
    .replace(/[–—]/g, "-")
    .trim();

  if (!clean || clean === "-" || clean.toLowerCase() === "n/a") return null;

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

function isCloudflareChallenge(html: string) {
  return /just a moment/i.test(html) || /challenges\.cloudflare\.com/i.test(html) || /cf[_-]chl/i.test(html);
}

async function fetchEthHtml(url: string) {
  const response = await fetch(url, {
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
    throw new Error(`Farside ETH HTTP ${response.status}`);
  }
  if (isCloudflareChallenge(html)) {
    throw new Error("Farside ETH devolvió Cloudflare challenge; no hay tabla HTML parseable server-side.");
  }

  return html;
}

function parseEthFlowRows(html: string, sourceUrl: string): ParsedEthFlowTable {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const fundColumns = expectedFundColumns();

  for (const table of tableMatches) {
    const rawRows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    const parsedRows = rawRows.map((row) => {
      const cellMatches = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
      return cellMatches.map(stripHtml);
    });
    const headerIndex = parsedRows.findIndex((row) => {
      const normalized = row.map(normalizeHeader);
      const fundMatches = normalized.filter((cell) => fundColumns.has(cell)).length;
      const hasTotal = normalized.some((cell) => cell === "total" || cell.includes("total"));
      return normalized.includes("date") && (hasTotal || fundMatches >= 3);
    });

    if (headerIndex === -1) continue;

    const headers = parsedRows[headerIndex];
    const normalizedHeaders = headers.map(normalizeHeader);
    const dateIndex = normalizedHeaders.findIndex((cell) => cell === "date");
    const totalIndex = normalizedHeaders.findIndex((cell) => cell === "total" || cell.includes("total"));

    if (dateIndex === -1) continue;

    const rows = parsedRows
      .slice(headerIndex + 1)
      .map((cells) => {
        const date = cells[dateIndex] ?? "";
        if (AGGREGATE_ROWS.has(normalizeHeader(date))) return null;
        const timestamp = parseFarsideDate(date);
        if (timestamp === null) return null;

        const fundFlows = headers
          .map((ticker, index) => ({
            ticker: ticker.trim(),
            normalizedTicker: normalizeHeader(ticker),
            flow: parseFlowValue(cells[index] ?? ""),
          }))
          .filter(({ normalizedTicker }, index) => index !== dateIndex && index !== totalIndex && fundColumns.has(normalizedTicker))
          .map(({ ticker, flow }) => ({ ticker, flow: flow ?? 0 }));
        const calculatedTotal = totalIndex === -1;
        const totalFromTable = totalIndex === -1 ? null : parseFlowValue(cells[totalIndex] ?? "");
        const totalNetFlow = totalFromTable ?? fundFlows.reduce((sum, fund) => sum + fund.flow, 0);

        return { date, timestamp, totalNetFlow, latestFundFlows: fundFlows, calculatedTotal };
      })
      .filter((row): row is ParsedEthFlowRow => row !== null && Number.isFinite(row.totalNetFlow))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (rows.length >= 5) {
      return {
        rows,
        columns: headers,
        calculatedTotal: rows.some((row) => row.calculatedTotal),
        sourceUrl,
      };
    }
  }

  throw new Error("Farside ETH no expuso una tabla de flujos usable.");
}

function formatUsdMillions(value: number | null) {
  if (value === null) return "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} M USD`;
}

function sumRows(rows: ParsedEthFlowRow[], count: number) {
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

function positiveNegativeDays(rows: ParsedEthFlowRow[]) {
  return rows.slice(0, 10).reduce(
    (counts, row) => ({
      positive: counts.positive + (row.totalNetFlow > 0 ? 1 : 0),
      negative: counts.negative + (row.totalNetFlow < 0 ? 1 : 0),
    }),
    { positive: 0, negative: 0 },
  );
}

function flowStreak(rows: ParsedEthFlowRow[]): BtcFlowStreak {
  const direction = rows[0]?.totalNetFlow > 0 ? "inflow" : rows[0]?.totalNetFlow < 0 ? "outflow" : "none";
  if (direction === "none") return { direction, count: 0, label: "Sin racha clara" };

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
  if (value > 200) return "strong_inflow";
  if (value >= 25) return "moderate_inflow";
  if (value < -200) return "strong_outflow";
  if (value <= -25) return "moderate_outflow";
  return "neutral";
}

function recentTrend(rolling5d: number | null, rolling20d: number | null): BtcFlowTrend {
  if (rolling5d === null || rolling20d === null) return "pending";
  if (rolling5d > 500 || rolling20d > 1500) return "sustained_accumulation";
  if (rolling5d >= 125 || rolling20d >= 375) return "moderate_inflows";
  if (rolling5d < -500 || rolling20d < -1500) return "outflow_pressure";
  if (rolling5d <= -125 || rolling20d <= -375) return "moderate_outflows";
  return "mixed";
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

function classifyReading(latestTotalNetFlow: number | null, rolling5dNetFlow: number | null, rolling20dNetFlow: number | null) {
  if (latestTotalNetFlow === null || rolling5dNetFlow === null) {
    return {
      readingLabel: "Datos pendientes",
      readingSubtext: "La fuente aún no ha publicado o completado la actualización diaria.",
      readingSeverity: "pending" as const,
    };
  }
  if (rolling5dNetFlow > 125 || (rolling20dNetFlow !== null && rolling20dNetFlow > 375)) {
    return {
      readingLabel: "Entradas recientes",
      readingSubtext: "Los ETFs spot de Ethereum muestran demanda neta positiva en la ventana reciente.",
      readingSeverity: "positive" as const,
    };
  }
  if (rolling5dNetFlow < -125 || (rolling20dNetFlow !== null && rolling20dNetFlow < -375)) {
    return {
      readingLabel: "Salidas recientes",
      readingSubtext: "Los flujos recientes muestran reducción neta de exposición vía ETFs de Ethereum.",
      readingSeverity: "negative" as const,
    };
  }
  return {
    readingLabel: "Flujos mixtos",
    readingSubtext: "No hay una dirección dominante clara en los flujos recientes de ETFs de Ethereum.",
    readingSeverity: "neutral" as const,
  };
}

async function getParsedEthFlowTable() {
  const errors: string[] = [];

  for (const url of FARSIDE_ETH_URLS) {
    try {
      const html = await fetchEthHtml(url);
      return parseEthFlowRows(html, url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error desconocido";
      errors.push(`${url}: ${message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

function buildEthFlowsFromRows(parsed: ParsedEthFlowTable): EtfFlowsData {
  const latest = parsed.rows[0];
  const rolling5dNetFlow = sumRows(parsed.rows, 5);
  const rolling10dNetFlow = sumRows(parsed.rows, 10);
  const rolling20dNetFlow = sumRows(parsed.rows, 20);
  const dayCounts = positiveNegativeDays(parsed.rows);
  const streak = flowStreak(parsed.rows);
  const breadth = latestFundBreadth(latest.latestFundFlows);
  const reading = classifyReading(latest.totalNetFlow, rolling5dNetFlow, rolling20dNetFlow);

  return {
    sourceName: "Farside Investors",
    sourceUrl: parsed.sourceUrl,
    lastUpdated: `Última actualización disponible: ${latest.date}`,
    updateFrequency: "Diaria / según disponibilidad de la fuente",
    dataStatus: Date.now() - latest.timestamp > 4 * 24 * 60 * 60 * 1000 ? "delayed" : "automated",
    reliabilityNote: "Datos obtenidos desde tabla pública de Farside Investors. La fuente puede bloquear solicitudes server-side o cambiar estructura.",
    latestDate: latest.date,
    latestTotalNetFlow: latest.totalNetFlow,
    latestFundFlows: latest.latestFundFlows,
    rolling5dNetFlow,
    rolling10dNetFlow,
    rolling20dNetFlow,
    positiveDaysLast10: dayCounts.positive,
    negativeDaysLast10: dayCounts.negative,
    flowStreak: streak,
    cumulativeNetFlow: parsed.rows.reduce((sum, row) => sum + row.totalNetFlow, 0),
    largestInflowFundLatestDay: strongestPositive(latest.latestFundFlows),
    largestOutflowFundLatestDay: strongestNegative(latest.latestFundFlows),
    dominantFlowDriver: dominantDriver(latest.latestFundFlows),
    breadth,
    dailyLevel: dailyLevel(latest.totalNetFlow),
    recentTrend: recentTrend(rolling5dNetFlow, rolling20dNetFlow),
    calculatedTotal: parsed.calculatedTotal,
    rowsParsed: parsed.rows.length,
    history: parsed.rows.slice(0, 30).reverse().map<BtcEtfFlowPoint>((row) => ({ date: row.date, totalNetFlow: row.totalNetFlow })),
    interpretation: {
      lookingAt: "Flujos netos publicados para ETFs spot de ETH.",
      why: "Ayudan a separar demanda vía vehículo ETF de la lectura de precio spot ETH/USDT.",
      how: "Lectura aproximada basada en flujos netos diarios y acumulados recientes.",
      whatItDoesNotMean: "No representa una señal directa sobre el precio de ETH ni sustituye niveles estadísticos de ETH/USDT.",
    },
    ...reading,
  };
}

function buildPendingEthFlows(_reason?: string): EtfFlowsData {
  return {
    sourceName: "Farside Ethereum fund-flow source",
    sourceUrl: FARSIDE_ETH_URL,
    lastUpdated: "Pendiente de automatización",
    updateFrequency: "Según disponibilidad de la fuente",
    dataStatus: "live_pending",
    reliabilityNote: "Flujos de ETFs de Ethereum pendientes de automatización.",
    latestDate: "Pendiente de automatización",
    latestTotalNetFlow: null,
    latestFundFlows: [],
    rolling5dNetFlow: null,
    rolling10dNetFlow: null,
    rolling20dNetFlow: null,
    positiveDaysLast10: 0,
    negativeDaysLast10: 0,
    flowStreak: {
      direction: "none",
      count: 0,
      label: "Pendiente de automatización",
    },
    cumulativeNetFlow: null,
    largestInflowFundLatestDay: null,
    largestOutflowFundLatestDay: null,
    dominantFlowDriver: "Flujos de ETFs de Ethereum pendientes de automatización.",
    breadth: {
      positive: 0,
      negative: 0,
      flatOrMissing: 0,
    },
    dailyLevel: "pending",
    recentTrend: "pending",
    readingLabel: "Pendiente de automatización",
    readingSubtext: "Flujos de ETFs de Ethereum pendientes de automatización.",
    readingSeverity: "pending",
    calculatedTotal: false,
    rowsParsed: 0,
    history: [],
    interpretation: {
      lookingAt: "Flujos netos publicados para ETFs spot de ETH.",
      why: "Ayudan a separar demanda vía vehículo ETF de la lectura de precio spot ETH/USDT.",
      how: "Cuando haya parsing estable, se resumirán último flujo, ventanas acumuladas y contribución por fondo.",
      whatItDoesNotMean: "No representa una señal directa sobre el precio de ETH ni sustituye niveles estadísticos de ETH/USDT.",
    },
  };
}

function buildModuleFromFlows(flows: EtfFlowsData): DashboardModuleData {
  return {
    id: "btc-flows",
    title: "Ethereum fund flows",
    status: flows.readingLabel,
    sourceName: flows.sourceName,
    sourceUrl: flows.sourceUrl,
    lastUpdated: flows.lastUpdated,
    updateFrequency: flows.updateFrequency,
    dataStatus: flows.dataStatus,
    reliabilityNote: flows.reliabilityNote,
    observedData: [
      ["Flujo neto último día", formatUsdMillions(flows.latestTotalNetFlow)],
      ["Rolling 5D", formatUsdMillions(flows.rolling5dNetFlow)],
      ["Rolling 20D", formatUsdMillions(flows.rolling20dNetFlow)],
      ["Racha", flows.flowStreak.label],
    ],
    interpretation: flows.interpretation,
  };
}

export async function getEthEtfFlowsData(): Promise<EtfFlowsDashboardData> {
  try {
    const parsed = await getParsedEthFlowTable();
    const flows = buildEthFlowsFromRows(parsed);
    return { flows, module: buildModuleFromFlows(flows) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente ETH ETF";
    const flows = buildPendingEthFlows(reason);

    return { flows, module: buildModuleFromFlows(flows) };
  }
}
