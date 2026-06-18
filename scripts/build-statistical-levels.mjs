import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.join(process.cwd(), "lib/statistical-levels/generated-data.ts");
const generatedDir = path.join(process.cwd(), "lib/statistical-levels/generated");
const manifestOutputPath = path.join(generatedDir, "manifest.json");
const assetOutputDir = path.join(generatedDir, "assets");
const seasonalityOutputDir = path.join(generatedDir, "seasonality");
const requestTimeoutMs = 8000;
const requestPauseMs = 250;

const windows = {
  "1Y": { daily: 252, weekly: 52, monthly: 12 },
  "3Y": { daily: 756, weekly: 156, monthly: 36 },
  "5Y": { daily: 1260, weekly: 260, monthly: 60 },
  "10Y": { daily: 2520, weekly: 520, monthly: 120 },
  Full: { daily: null, weekly: null, monthly: null },
};

const seasonalityWindows = ["3Y", "5Y", "10Y", "All"];
const correlationWindows = ["3Y", "5Y", "10Y", "All"];
const presidentialCyclePhases = ["all", "post_election", "midterm", "pre_election", "election"];

const frequencyConfig = {
  daily: {
    label: "Diario",
    annualization: Math.sqrt(252),
    minPeriods: 252,
    chartLimit: 500,
    movingAverages: { short: 20, medium: 50, long: 200 },
    longKey: "MA200",
    newHighLowLookback: 252,
  },
  weekly: {
    label: "Semanal",
    annualization: Math.sqrt(52),
    minPeriods: 104,
    chartLimit: 520,
    movingAverages: { short: 10, medium: 30, long: 40, extra: 52 },
    longKey: "MA40",
    newHighLowLookback: 52,
  },
  monthly: {
    label: "Mensual",
    annualization: Math.sqrt(12),
    minPeriods: 36,
    chartLimit: 240,
    movingAverages: { short: 6, medium: 10, long: 12, extra: 24 },
    longKey: "MA12",
    newHighLowLookback: 12,
  },
};

const universe = [
  ["SPY", "SPDR S&P 500 ETF", "Índices / ETFs", "spy.us", "SPY"],
  ["QQQ", "Invesco QQQ Trust", "Índices / ETFs", "qqq.us", "QQQ"],
  ["IWM", "iShares Russell 2000 ETF", "Índices / ETFs", "iwm.us", "IWM"],
  ["DIA", "SPDR Dow Jones Industrial Average ETF", "Índices / ETFs", "dia.us", "DIA"],
  ["VOO", "Vanguard S&P 500 ETF", "Índices / ETFs", "voo.us", "VOO"],
  ["TLT", "iShares 20+ Year Treasury Bond ETF", "Bonos", "tlt.us", "TLT"],
  ["IEF", "iShares 7-10 Year Treasury Bond ETF", "Bonos", "ief.us", "IEF"],
  ["SHY", "iShares 1-3 Year Treasury Bond ETF", "Bonos", "shy.us", "SHY"],
  ["HYG", "iShares iBoxx High Yield Corporate Bond ETF", "Bonos", "hyg.us", "HYG"],
  ["LQD", "iShares iBoxx Investment Grade Corporate Bond ETF", "Bonos", "lqd.us", "LQD"],
  ["GLD", "SPDR Gold Shares", "Oro y materias primas", "gld.us", "GLD"],
  ["SLV", "iShares Silver Trust", "Oro y materias primas", "slv.us", "SLV"],
  ["USO", "United States Oil Fund", "Oro y materias primas", "uso.us", "USO"],
  ["XLK", "Technology Select Sector SPDR", "Sectores", "xlk.us", "XLK"],
  ["XLF", "Financial Select Sector SPDR", "Sectores", "xlf.us", "XLF"],
  ["XLV", "Health Care Select Sector SPDR", "Sectores", "xlv.us", "XLV"],
  ["XLE", "Energy Select Sector SPDR", "Sectores", "xle.us", "XLE"],
  ["XLY", "Consumer Discretionary Select Sector SPDR", "Sectores", "xly.us", "XLY"],
  ["XLP", "Consumer Staples Select Sector SPDR", "Sectores", "xlp.us", "XLP"],
  ["XLI", "Industrial Select Sector SPDR", "Sectores", "xli.us", "XLI"],
  ["XLB", "Materials Select Sector SPDR", "Sectores", "xlb.us", "XLB"],
  ["XLU", "Utilities Select Sector SPDR", "Sectores", "xlu.us", "XLU"],
  ["XLRE", "Real Estate Select Sector SPDR", "Sectores", "xlre.us", "XLRE"],
  ["XLC", "Communication Services Select Sector SPDR", "Sectores", "xlc.us", "XLC"],
  ["BTCUSD", "Bitcoin / US Dollar", "Cripto", "btcusd", "BTC-USD"],
  ["IBIT", "iShares Bitcoin Trust ETF", "Cripto", "ibit.us", "IBIT"],
  ["EWJ", "iShares MSCI Japan ETF", "Internacional", "ewj.us", "EWJ"],
  ["FXI", "iShares China Large-Cap ETF", "Internacional", "fxi.us", "FXI"],
  ["EFA", "iShares MSCI EAFE ETF", "Internacional", "efa.us", "EFA"],
  ["EEM", "iShares MSCI Emerging Markets ETF", "Internacional", "eem.us", "EEM"],
].map(([ticker, name, category, stooqSymbol, yahooSymbol]) => ({ ticker, name, category, stooqSymbol, yahooSymbol }));

const catalog = universe.map(({ yahooSymbol, ...asset }) => asset);
const diagnostics = [];

function mean(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null;
}

function standardDeviation(values) {
  const clean = values.filter(Number.isFinite);
  const avg = mean(clean);
  if (avg === null || clean.length < 2) return null;
  return Math.sqrt(clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (clean.length - 1));
}

function quantile(values, percentile) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const index = (clean.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

function percentileRank(values, value) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(value)) return null;
  return (clean.filter((item) => item <= value).length / clean.length) * 100;
}

function zScore(values, value) {
  const avg = mean(values);
  const sd = standardDeviation(values);
  if (avg === null || sd === null || sd === 0) return null;
  return (value - avg) / sd;
}

function clampPrecision(value, digits = 4) {
  return value === null || value === undefined || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}

function correlation(first, second) {
  const length = Math.min(first.length, second.length);
  if (length < 20) return null;
  const x = first.slice(-length).filter(Number.isFinite);
  const y = second.slice(-length).filter(Number.isFinite);
  if (x.length !== y.length || x.length < 20) return null;
  const xMean = mean(x);
  const yMean = mean(y);
  if (xMean === null || yMean === null) return null;
  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;
  for (let index = 0; index < x.length; index += 1) {
    const xDelta = x[index] - xMean;
    const yDelta = y[index] - yMean;
    numerator += xDelta * yDelta;
    xDenominator += xDelta ** 2;
    yDenominator += yDelta ** 2;
  }
  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator === 0 ? null : clampPrecision(numerator / denominator, 3);
}

function dateParts(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function presidentialCyclePhase(year) {
  const offset = ((year % 4) + 4) % 4;
  if (offset === 0) return "election";
  if (offset === 1) return "post_election";
  if (offset === 2) return "midterm";
  return "pre_election";
}

function extensionLabel(value) {
  if (value === null) return "Zona media";
  if (value <= -2) return "Extensión negativa extrema";
  if (value <= -1) return "Extensión negativa";
  if (value < 1) return "Zona media";
  if (value < 2) return "Extensión positiva";
  return "Extensión positiva extrema";
}

function percentileLabel(value) {
  if (value === null) return "Zona media";
  if (value <= 10) return "Zona históricamente baja";
  if (value <= 30) return "Zona baja";
  if (value < 70) return "Zona media";
  if (value < 90) return "Zona alta";
  return "Zona históricamente alta";
}

function rollingReturn(closes, periods, index = closes.length - 1) {
  const start = index - periods;
  if (start < 0 || !closes[index] || !closes[start]) return null;
  return closes[index] / closes[start] - 1;
}

function periodReturns(closes) {
  const returns = [];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index - 1] > 0 && closes[index] > 0) returns.push(closes[index] / closes[index - 1] - 1);
  }
  return returns;
}

function annualizedVolatility(returns, annualization) {
  const sd = standardDeviation(returns);
  return sd === null ? null : sd * annualization;
}

function movingAverage(values, window, index = values.length - 1) {
  const start = index - window + 1;
  if (start < 0) return null;
  return mean(values.slice(start, index + 1));
}

function drawdownSeries(closes) {
  let peak = -Infinity;
  return closes.map((close) => {
    peak = Math.max(peak, close);
    return peak > 0 ? close / peak - 1 : 0;
  });
}

function maxDrawdown(closes) {
  const drawdowns = drawdownSeries(closes);
  return drawdowns.length ? Math.min(...drawdowns) : null;
}

function linearSlope(values) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 3) return null;
  const xMean = (clean.length - 1) / 2;
  const yMean = mean(clean);
  const denominator = clean.reduce((sum, _, index) => sum + (index - xMean) ** 2, 0);
  if (!denominator || yMean === null || yMean === 0) return null;
  const numerator = clean.reduce((sum, value, index) => sum + (index - xMean) * (value - yMean), 0);
  return numerator / denominator / yMean;
}

function normalizeBodyPreview(text) {
  return text.slice(0, 300).replace(/\s+/g, " ").trim();
}

function detectBodyReason(text) {
  const normalized = text.trimStart().toLowerCase();
  if (normalized.startsWith("<!doctype") || normalized.startsWith("<html") || normalized.includes("requires javascript to verify your browser")) {
    return "html_or_browser_verification";
  }
  if (normalized.includes("no data")) return "no_data";
  return null;
}

function parseNumber(value) {
  const cleaned = String(value ?? "").replace(/^\uFEFF/, "").replace(/\s/g, "").replace(/,/g, "");
  if (!cleaned || cleaned === "-") return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function splitDelimitedLine(line, delimiter) {
  return line.split(delimiter).map((value) => value.replace(/^\uFEFF/, "").trim());
}

function normalizeRow(row) {
  const factor = row.adjustedClose && row.close ? row.adjustedClose / row.close : 1;
  return {
    ...row,
    adjustedOpen: clampPrecision(row.open * factor, 6),
    adjustedHigh: clampPrecision(row.high * factor, 6),
    adjustedLow: clampPrecision(row.low * factor, 6),
    adjustedClose: clampPrecision(row.adjustedClose ?? row.close, 6),
  };
}

function parseCsv(text) {
  const bodyReason = detectBodyReason(text);
  if (bodyReason) return { rows: [], reason: bodyReason };
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { rows: [], reason: "not_enough_lines" };
  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const dateIndex = headers.indexOf("date");
  const openIndex = headers.indexOf("open");
  const highIndex = headers.indexOf("high");
  const lowIndex = headers.indexOf("low");
  const closeIndex = headers.indexOf("close");
  const adjustedIndex = headers.findIndex((header) => ["adj close", "adjclose", "adjustedclose"].includes(header));
  const volumeIndex = headers.indexOf("volume");
  if (dateIndex === -1 || closeIndex === -1) return { rows: [], reason: "unexpected_headers" };
  const rows = lines
    .slice(1)
    .map((line) => {
      const values = splitDelimitedLine(line, delimiter);
      const close = parseNumber(values[closeIndex]);
      return normalizeRow({
        date: values[dateIndex],
        periodStart: values[dateIndex],
        periodEnd: values[dateIndex],
        close,
        open: parseNumber(values[openIndex]) ?? close,
        high: parseNumber(values[highIndex]) ?? close,
        low: parseNumber(values[lowIndex]) ?? close,
        adjustedClose: adjustedIndex >= 0 ? parseNumber(values[adjustedIndex]) : close,
        volume: parseNumber(values[volumeIndex]) ?? 0,
      });
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.adjustedClose) && row.adjustedClose > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { rows, reason: rows.length ? null : "no_parseable_rows" };
}

function stooqUrlVariants(asset) {
  const lower = asset.stooqSymbol.toLowerCase();
  const upper = asset.stooqSymbol.toUpperCase();
  return [
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(lower)}&i=d`,
    `https://stooq.com/q/d/l/?s=${encodeURIComponent(upper)}&i=d`,
    `https://stooq.com/q/d/?s=${encodeURIComponent(lower)}`,
    `https://stooq.com/q/d/?s=${encodeURIComponent(lower)}&c=0`,
  ];
}

function yahooUrl(asset) {
  const period2 = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({
    period1: "0",
    period2: String(period2),
    interval: "1d",
    events: "history",
    includeAdjustedClose: "true",
  });
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.yahooSymbol)}?${params.toString()}`;
}

async function fetchText(url, accept = "text/csv,text/plain,*/*") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "luiguiherrera-market-lab/1.0 educational static data build",
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const text = await response.text();
    return { url, status: response.status, contentType: response.headers.get("content-type") ?? "unknown", body: text };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStooq(asset) {
  let finalAttempt = null;
  for (const url of stooqUrlVariants(asset)) {
    await sleep(requestPauseMs);
    const attempt = await fetchText(url);
    const parsed = parseCsv(attempt.body);
    finalAttempt = diagnosticFromAttempt("stooq", asset.ticker, asset.stooqSymbol, url, attempt, parsed);
    if (attempt.status >= 200 && attempt.status < 300 && parsed.rows.length > 0) return { rows: parsed.rows, diagnostic: finalAttempt };
  }
  return { rows: [], diagnostic: finalAttempt };
}

function parseYahooChart(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { rows: [], reason: "invalid_json" };
  }
  const result = payload?.chart?.result?.[0];
  const error = payload?.chart?.error;
  if (error) return { rows: [], reason: `yahoo_error:${error.code ?? "unknown"}` };
  if (!result?.timestamp?.length) return { rows: [], reason: "missing_timestamp" };
  const quote = result.indicators?.quote?.[0] ?? {};
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const rows = result.timestamp
    .map((timestamp, index) => {
      const close = parseNumber(quote.close?.[index]);
      const adjustedClose = parseNumber(adjusted[index] ?? close);
      return normalizeRow({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        periodStart: new Date(timestamp * 1000).toISOString().slice(0, 10),
        periodEnd: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: parseNumber(quote.open?.[index]) ?? close,
        high: parseNumber(quote.high?.[index]) ?? close,
        low: parseNumber(quote.low?.[index]) ?? close,
        close,
        adjustedClose,
        volume: parseNumber(quote.volume?.[index]) ?? 0,
      });
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.adjustedClose) && row.adjustedClose > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { rows, reason: rows.length ? null : "no_parseable_rows" };
}

async function fetchYahooFallback(asset) {
  const url = yahooUrl(asset);
  await sleep(requestPauseMs);
  const attempt = await fetchText(url, "application/json,text/plain,*/*");
  const parsed = parseYahooChart(attempt.body);
  return { rows: parsed.rows, diagnostic: diagnosticFromAttempt("yahoo_fallback", asset.ticker, asset.yahooSymbol, url, attempt, parsed) };
}

function diagnosticFromAttempt(provider, ticker, symbol, url, attempt, parsed) {
  return {
    provider,
    ticker,
    symbol,
    url,
    status: attempt.status,
    contentType: attempt.contentType,
    bodyPreview: normalizeBodyPreview(attempt.body),
    detectedHtml: detectBodyReason(attempt.body) === "html_or_browser_verification",
    detectedNoData: detectBodyReason(attempt.body) === "no_data",
    parsedRows: parsed.rows.length,
    reason: parsed.reason,
  };
}

async function fetchMarketData(asset) {
  const stooq = await fetchStooq(asset);
  diagnostics.push(stooq.diagnostic);
  logDiagnostic(stooq.diagnostic);
  if (stooq.rows.length > 0) return { rows: stooq.rows, provider: "Stooq", diagnostic: stooq.diagnostic };
  const yahoo = await fetchYahooFallback(asset);
  diagnostics.push(yahoo.diagnostic);
  logDiagnostic(yahoo.diagnostic);
  if (yahoo.rows.length > 0) return { rows: yahoo.rows, provider: "Yahoo Finance fallback", diagnostic: yahoo.diagnostic };
  return { rows: [], provider: "unavailable", diagnostic: yahoo.diagnostic };
}

function logDiagnostic(diagnostic) {
  if (!diagnostic) return;
  const level = diagnostic.parsedRows > 0 ? console.log : console.warn;
  level(
    `[stat-levels:diagnostic] ${diagnostic.ticker} ${diagnostic.provider} ` +
      `symbol=${diagnostic.symbol} status=${diagnostic.status} content-type=${diagnostic.contentType} ` +
      `rows=${diagnostic.parsedRows} html=${diagnostic.detectedHtml} no_data=${diagnostic.detectedNoData} ` +
      `reason=${diagnostic.reason ?? "ok"} url=${diagnostic.url} body="${diagnostic.bodyPreview}"`,
  );
}

function weekKey(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(dateString) {
  return dateString.slice(0, 7);
}

function aggregateRows(rows, frequency) {
  if (frequency === "daily") return rows;
  const groups = new Map();
  for (const row of rows) {
    const key = frequency === "weekly" ? weekKey(row.date) : monthKey(row.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.values()).map((items) => {
    const first = items[0];
    const last = items.at(-1);
    const raw = {
      date: last.date,
      periodStart: first.date,
      periodEnd: last.date,
      open: first.open,
      high: Math.max(...items.map((item) => item.high)),
      low: Math.min(...items.map((item) => item.low)),
      close: last.close,
      adjustedClose: last.adjustedClose,
      volume: items.reduce((sum, item) => sum + (item.volume ?? 0), 0),
    };
    return normalizeRow(raw);
  });
}

function compactSeries(rows, limit, longMa) {
  const source = rows.length > limit ? rows.slice(-limit) : rows;
  return source.map((row, index) => {
    const originalIndex = rows.length - source.length + index;
    return {
      date: row.periodEnd,
      close: clampPrecision(row.adjustedClose, 2),
      ma200: clampPrecision(movingAverage(rows.map((item) => item.adjustedClose), longMa, originalIndex), 2),
    };
  });
}

function movementRows(rows) {
  const result = [];
  for (let index = 1; index < rows.length; index += 1) {
    const current = rows[index];
    const previous = rows[index - 1];
    const prevClose = previous.adjustedClose;
    const open = current.adjustedOpen;
    const high = current.adjustedHigh;
    const low = current.adjustedLow;
    const close = current.adjustedClose;
    if (![prevClose, open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) continue;
    const highLowRange = high - low;
    const openGap = open / prevClose - 1;
    const change = close / prevClose - 1;
    const closeLocation = highLowRange === 0 ? 0.5 : Math.max(0, Math.min(1, (close - low) / highLowRange));
    result.push({
      period: current.periodEnd,
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
      open,
      high,
      low,
      close,
      change,
      openGap,
      highExtensionFromOpen: high / open - 1,
      lowExtensionFromOpen: low / open - 1,
      highExtensionFromPrevClose: high / prevClose - 1,
      lowExtensionFromPrevClose: low / prevClose - 1,
      closeLocation,
      upperFade: (high - close) / open,
      lowerRecovery: (close - low) / open,
      range: high / low - 1,
      openingRangeCategory: open > previous.adjustedHigh ? "Above previous range" : open < previous.adjustedLow ? "Below previous range" : "Inside previous range",
      openingCloseCategory: null,
    });
  }
  const averageAbsMove = mean(result.map((row) => Math.abs(row.change))) ?? 0;
  const nearThreshold = Math.max(0.001, averageAbsMove * 0.15);
  return result.map((row) => ({
    ...row,
    openingCloseCategory:
      Math.abs(row.openGap) <= nearThreshold ? "Near previous close" : row.openGap > 0 ? "Above previous close" : "Below previous close",
  }));
}

function summarizeMovement(values) {
  const clean = values.filter(Number.isFinite);
  return {
    mean: clampPrecision(mean(clean)),
    std: clampPrecision(standardDeviation(clean)),
    p10: clampPrecision(quantile(clean, 0.1)),
    p25: clampPrecision(quantile(clean, 0.25)),
    p50: clampPrecision(quantile(clean, 0.5)),
    p75: clampPrecision(quantile(clean, 0.75)),
    p90: clampPrecision(quantile(clean, 0.9)),
    min: clampPrecision(clean.length ? Math.min(...clean) : null),
    max: clampPrecision(clean.length ? Math.max(...clean) : null),
  };
}

function buildChangeMoves(moves) {
  const keys = [
    "change",
    "openGap",
    "highExtensionFromOpen",
    "lowExtensionFromOpen",
    "highExtensionFromPrevClose",
    "lowExtensionFromPrevClose",
    "closeLocation",
    "upperFade",
    "lowerRecovery",
    "range",
  ];
  return Object.fromEntries(keys.map((key) => [key, summarizeMovement(moves.map((row) => row[key]))]));
}

function buildOpeningLocation(moves) {
  const build = (key, categories) =>
    categories.map((category) => {
      const rows = moves.filter((row) => row[key] === category);
      return {
        category,
        count: rows.length,
        proportion: moves.length ? clampPrecision(rows.length / moves.length) : null,
        averageForwardReturn: clampPrecision(mean(rows.map((row) => row.change))),
        averageVolatility: clampPrecision(mean(rows.map((row) => row.range))),
        positiveRate: rows.length ? clampPrecision(rows.filter((row) => row.change > 0).length / rows.length) : null,
      };
    });
  return {
    range: build("openingRangeCategory", ["Above previous range", "Inside previous range", "Below previous range"]),
    close: build("openingCloseCategory", ["Above previous close", "Near previous close", "Below previous close"]),
  };
}

function buildCalendarExtremes(rows, frequency, lookback) {
  const labels =
    frequency === "monthly"
      ? ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
      : frequency === "weekly"
        ? ["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5"]
        : ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const counts = new Map(labels.map((label) => [label, { label, highs: 0, lows: 0, periods: 0 }]));
  for (let index = lookback; index < rows.length; index += 1) {
    const row = rows[index];
    const date = new Date(`${row.periodEnd}T00:00:00Z`);
    const label =
      frequency === "monthly"
        ? labels[date.getUTCMonth()]
        : frequency === "weekly"
          ? labels[Math.min(Math.floor((date.getUTCDate() - 1) / 7), 4)]
          : labels[(date.getUTCDay() + 6) % 7];
    const item = counts.get(label);
    const slice = rows.slice(index - lookback, index);
    const previousHigh = Math.max(...slice.map((itemRow) => itemRow.adjustedHigh));
    const previousLow = Math.min(...slice.map((itemRow) => itemRow.adjustedLow));
    item.periods += 1;
    if (row.adjustedHigh > previousHigh) item.highs += 1;
    if (row.adjustedLow < previousLow) item.lows += 1;
  }
  return Array.from(counts.values());
}

function unavailableKeyLevels(prefix, periods = 0) {
  const keys = prefix === "W" ? ["WSHE", "WAHE", "WALE", "WSLE"] : ["MSHE", "MAHE", "MALE", "MSLE"];
  return {
    available: false,
    statusNote: "Historial insuficiente para calcular niveles de extensión.",
    periods,
    currentOpen: null,
    lastClose: null,
    avgHigherExtension: null,
    stdHigherExtension: null,
    avgLowerExtension: null,
    stdLowerExtension: null,
    levels: Object.fromEntries(keys.map((key) => [key, null])),
    distances: Object.fromEntries(keys.map((key) => [key, null])),
    location: "Historial insuficiente",
  };
}

function describeLevelLocation(lastClose, levels, frequency) {
  const isWeekly = frequency === "weekly";
  const highExtreme = levels[isWeekly ? "WSHE" : "MSHE"];
  const highAverage = levels[isWeekly ? "WAHE" : "MAHE"];
  const lowAverage = levels[isWeekly ? "WALE" : "MALE"];
  const lowExtreme = levels[isWeekly ? "WSLE" : "MSLE"];
  const periodLabel = isWeekly ? "semanal" : "mensual";
  if (lastClose > highExtreme) return `Por encima de extensión ${periodLabel} extrema`;
  if (lastClose >= highAverage) return `Cerca de extensión ${periodLabel} alta`;
  if (lastClose <= lowExtreme) return `Por debajo de extensión ${periodLabel} extrema`;
  if (lastClose <= lowAverage) return `Cerca de extensión ${periodLabel} baja`;
  return `Dentro del rango ${periodLabel} medio`;
}

function buildKeyLevels(periodRows, frequency) {
  const prefix = frequency === "weekly" ? "W" : "M";
  const minimumHistory = frequency === "weekly" ? 52 : 24;
  const completedRows = periodRows.slice(0, -1);
  const current = periodRows.at(-1);
  if (!current || completedRows.length < minimumHistory) return unavailableKeyLevels(prefix, completedRows.length);

  const higherExtensions = completedRows
    .map((row) => (row.adjustedOpen && row.adjustedHigh ? row.adjustedHigh / row.adjustedOpen - 1 : null))
    .filter(Number.isFinite);
  const lowerExtensions = completedRows
    .map((row) => (row.adjustedOpen && row.adjustedLow ? row.adjustedOpen / row.adjustedLow - 1 : null))
    .filter(Number.isFinite);
  const avgHigher = mean(higherExtensions);
  const stdHigher = standardDeviation(higherExtensions);
  const avgLower = mean(lowerExtensions);
  const stdLower = standardDeviation(lowerExtensions);
  const currentOpen = current.adjustedOpen;
  const lastClose = current.adjustedClose;
  if (![avgHigher, stdHigher, avgLower, stdLower, currentOpen, lastClose].every(Number.isFinite)) return unavailableKeyLevels(prefix, completedRows.length);

  const levels =
    frequency === "weekly"
      ? {
          WSHE: currentOpen * (1 + avgHigher + stdHigher),
          WAHE: currentOpen * (1 + avgHigher),
          WALE: currentOpen * (1 - avgLower),
          WSLE: currentOpen * (1 - avgLower - stdLower),
        }
      : {
          MSHE: currentOpen * (1 + avgHigher + stdHigher),
          MAHE: currentOpen * (1 + avgHigher),
          MALE: currentOpen * (1 - avgLower),
          MSLE: currentOpen * (1 - avgLower - stdLower),
        };
  const roundedLevels = Object.fromEntries(Object.entries(levels).map(([key, value]) => [key, clampPrecision(value, 2)]));
  const distances = Object.fromEntries(Object.entries(levels).map(([key, value]) => [key, clampPrecision(lastClose / value - 1)]));

  return {
    available: true,
    statusNote: `Calculado con ${completedRows.length} periodos completados.`,
    periods: completedRows.length,
    currentOpen: clampPrecision(currentOpen, 2),
    lastClose: clampPrecision(lastClose, 2),
    avgHigherExtension: clampPrecision(avgHigher),
    stdHigherExtension: clampPrecision(stdHigher),
    avgLowerExtension: clampPrecision(avgLower),
    stdLowerExtension: clampPrecision(stdLower),
    levels: roundedLevels,
    distances,
    location: describeLevelLocation(lastClose, levels, frequency),
  };
}

function buildNewHighLow(rows, lookback) {
  let newHighCount = 0;
  let newLowCount = 0;
  let eligible = 0;
  for (let index = lookback; index < rows.length; index += 1) {
    const slice = rows.slice(index - lookback, index);
    const previousHigh = Math.max(...slice.map((row) => row.adjustedHigh));
    const previousLow = Math.min(...slice.map((row) => row.adjustedLow));
    eligible += 1;
    if (rows[index].adjustedHigh > previousHigh) newHighCount += 1;
    if (rows[index].adjustedLow < previousLow) newLowCount += 1;
  }
  return {
    lookback,
    newHighCount,
    newLowCount,
    newHighRate: eligible ? clampPrecision(newHighCount / eligible) : null,
    newLowRate: eligible ? clampPrecision(newLowCount / eligible) : null,
  };
}

function seasonalitySessions(windowKey, frequency) {
  const normalizedWindow = windowKey === "All" ? "Full" : windowKey;
  return windows[normalizedWindow]?.[frequency] ?? null;
}

function summarizeSeasonalityBucket(values, dimensions) {
  return {
    ...dimensions,
    averageReturn: clampPrecision(mean(values), 6),
    medianReturn: clampPrecision(quantile(values, 0.5), 6),
    winRate: values.length ? clampPrecision(values.filter((value) => value > 0).length / values.length, 4) : null,
    sampleSize: values.length,
  };
}

function buildSeasonalityCells(observations, keyBuilder, dimensionsBuilder, sorter) {
  const buckets = new Map();
  for (const observation of observations) {
    const key = keyBuilder(observation);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(observation.returnValue);
  }

  return Array.from(buckets.entries())
    .map(([key, values]) => {
      return summarizeSeasonalityBucket(values, dimensionsBuilder(key), key);
    })
    .sort(sorter);
}

function buildDailySeasonalityCells(observations) {
  return buildSeasonalityCells(
    observations,
    (observation) => `${observation.month}-${observation.day}`,
    (key) => {
      const [month, day] = key.split("-").map(Number);
      return { month, day };
    },
    (a, b) => a.month - b.month || a.day - b.day,
  );
}

function buildMonthlySeasonalityCells(observations) {
  return buildSeasonalityCells(
    observations,
    (observation) => String(observation.month),
    (key) => ({ month: Number(key) }),
    (a, b) => a.month - b.month,
  );
}

function buildWeeklySeasonalityCells(observations) {
  return buildSeasonalityCells(
    observations,
    (observation) => `${observation.month}-${observation.weekOfMonth}`,
    (key) => {
      const [month, weekOfMonth] = key.split("-").map(Number);
      return { month, weekOfMonth };
    },
    (a, b) => a.month - b.month || a.weekOfMonth - b.weekOfMonth,
  );
}

function seasonalityObservations(rows, frequency) {
  const periodRows = frequency === "daily" ? rows : aggregateRows(rows, frequency);
  const observations = [];
  for (let index = 1; index < periodRows.length; index += 1) {
    const previous = periodRows[index - 1];
    const current = periodRows[index];
    if (!previous?.adjustedClose || !current?.adjustedClose) continue;
    const returnValue = current.adjustedClose / previous.adjustedClose - 1;
    if (!Number.isFinite(returnValue)) continue;
    const parts = dateParts(current.periodEnd);
    observations.push({
      date: current.periodEnd,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekOfMonth: Math.min(5, Math.floor((parts.day - 1) / 7) + 1),
      phase: presidentialCyclePhase(parts.year),
      returnValue,
    });
  }
  return observations;
}

function buildSeasonalityDimension(observations, cellBuilder) {
  return {
    general: cellBuilder(observations),
    presidentialCycle: Object.fromEntries(
      presidentialCyclePhases.map((phase) => [
        phase,
        cellBuilder(phase === "all" ? observations : observations.filter((observation) => observation.phase === phase)),
      ]),
    ),
  };
}

function buildDailySeasonalityData(ticker, rows) {
  const observationsByFrequency = {
    daily: seasonalityObservations(rows, "daily"),
    weekly: seasonalityObservations(rows, "weekly"),
    monthly: seasonalityObservations(rows, "monthly"),
  };
  const windowEntries = seasonalityWindows.map((windowKey) => {
    const dailySessions = seasonalitySessions(windowKey, "daily");
    const weeklySessions = seasonalitySessions(windowKey, "weekly");
    const monthlySessions = seasonalitySessions(windowKey, "monthly");
    const dailyObservations = dailySessions ? observationsByFrequency.daily.slice(-dailySessions) : observationsByFrequency.daily;
    const weeklyObservations = weeklySessions ? observationsByFrequency.weekly.slice(-weeklySessions) : observationsByFrequency.weekly;
    const monthlyObservations = monthlySessions ? observationsByFrequency.monthly.slice(-monthlySessions) : observationsByFrequency.monthly;
    const daily = buildSeasonalityDimension(dailyObservations, buildDailySeasonalityCells);
    const weekly = {
      ...buildSeasonalityDimension(weeklyObservations, buildWeeklySeasonalityCells),
      methodology: "Semanas agregadas por fecha de cierre semanal. Semana 1 = días 1-7 del mes; Semana 5 = días 29-31.",
    };
    const monthly = buildSeasonalityDimension(monthlyObservations, buildMonthlySeasonalityCells);

    return [
      windowKey,
      {
        general: daily.general,
        presidentialCycle: daily.presidentialCycle,
        monthly,
        weekly,
        daily,
      },
    ];
  });

  return {
    asset: ticker,
    windows: Object.fromEntries(windowEntries),
  };
}

function buildWindowMetric(allCloses, windowSize, config) {
  const closes = windowSize ? allCloses.slice(-windowSize) : [...allCloses];
  if (windowSize && allCloses.length < windowSize) return unavailableWindow(allCloses.length);
  if (closes.length < config.minPeriods) return unavailableWindow(closes.length);

  const returns = periodReturns(closes);
  const drawdowns = drawdownSeries(closes);
  const lastClose = closes.at(-1);
  const currentReturn = rollingReturn(closes, 1);
  const currentLongMa = movingAverage(closes, config.movingAverages.long);
  const currentExtension = currentLongMa ? lastClose / currentLongMa - 1 : null;
  const extensionHistory = [];
  for (let index = config.movingAverages.long - 1; index < closes.length; index += 1) {
    const ma = movingAverage(closes, config.movingAverages.long, index);
    if (ma) extensionHistory.push(closes[index] / ma - 1);
  }
  const returnHistory = [];
  for (let index = 1; index < closes.length; index += 1) {
    const value = rollingReturn(closes, 1, index);
    if (value !== null) returnHistory.push(value);
  }
  const volatilityWindow = Math.min(52, Math.max(12, Math.floor(config.minPeriods / 4)));
  const volHistory = [];
  for (let index = volatilityWindow; index <= returns.length; index += 1) {
    const vol = annualizedVolatility(returns.slice(index - volatilityWindow, index), config.annualization);
    if (vol !== null) volHistory.push(vol);
  }
  const currentVol = annualizedVolatility(returns.slice(-volatilityWindow), config.annualization);
  const currentDrawdown = drawdowns.at(-1) ?? null;
  const extensionZ = currentExtension === null ? null : zScore(extensionHistory, currentExtension);
  const extensionPct = currentExtension === null ? null : percentileRank(extensionHistory, currentExtension);

  return {
    available: true,
    sessions: closes.length,
    annualizedVolatility63d: clampPrecision(currentVol),
    annualizedVolatility252d: clampPrecision(annualizedVolatility(returns, config.annualization)),
    annualizedVolatilityWindow: clampPrecision(annualizedVolatility(returns, config.annualization)),
    currentDrawdown: clampPrecision(currentDrawdown),
    maxDrawdown: clampPrecision(maxDrawdown(closes)),
    pricePercentile: clampPrecision(percentileRank(closes, lastClose), 1),
    return1mPercentile: currentReturn === null ? null : clampPrecision(percentileRank(returnHistory, currentReturn), 1),
    return1mZScore: currentReturn === null ? null : clampPrecision(zScore(returnHistory, currentReturn), 2),
    ma200Extension: clampPrecision(currentExtension),
    ma200ExtensionZScore: clampPrecision(extensionZ, 2),
    ma200ExtensionPercentile: clampPrecision(extensionPct, 1),
    drawdownPercentile: currentDrawdown === null ? null : clampPrecision(percentileRank(drawdowns, currentDrawdown), 1),
    volatilityPercentile: currentVol === null ? null : clampPrecision(percentileRank(volHistory, currentVol), 1),
    extensionLabel: extensionLabel(extensionZ),
    extensionPercentileLabel: percentileLabel(extensionPct),
    windowReturns: returns.slice(-config.chartLimit).map((value) => clampPrecision(value, 6)),
  };
}

function unavailableWindow(sessions) {
  return {
    available: false,
    sessions,
    annualizedVolatility63d: null,
    annualizedVolatility252d: null,
    annualizedVolatilityWindow: null,
    currentDrawdown: null,
    maxDrawdown: null,
    pricePercentile: null,
    return1mPercentile: null,
    return1mZScore: null,
    ma200Extension: null,
    ma200ExtensionZScore: null,
    ma200ExtensionPercentile: null,
    drawdownPercentile: null,
    volatilityPercentile: null,
    extensionLabel: "Zona media",
    extensionPercentileLabel: "Zona media",
    windowReturns: [],
  };
}

function buildFrequencyMetrics(rows, frequency) {
  const config = frequencyConfig[frequency];
  const periodRows = aggregateRows(rows, frequency);
  const closes = periodRows.map((row) => row.adjustedClose);
  const returns = periodReturns(closes);
  const moves = movementRows(periodRows);
  const latest = periodRows.at(-1);
  const status = periodRows.length >= config.minPeriods ? "ok" : periodRows.length >= Math.floor(config.minPeriods / 2) ? "limited_history" : "unavailable";
  const movingAverages = {};
  const distanceToMovingAverages = {};
  for (const [key, value] of Object.entries(config.movingAverages)) {
    const label = `MA${value}`;
    const ma = movingAverage(closes, value);
    movingAverages[label] = clampPrecision(ma, 2);
    distanceToMovingAverages[label] = ma && latest?.adjustedClose ? clampPrecision(latest.adjustedClose / ma - 1) : null;
  }
  const longMaValue = movingAverages[config.longKey];
  const rangeValues = moves.map((row) => row.range);
  const latestMove = moves.at(-1);
  const trendWindow = closes.slice(-Math.min(26, closes.length));

  return {
    status,
    statusNote:
      status === "ok"
        ? `Historial suficiente para frecuencia ${config.label.toLowerCase()}.`
        : `Historial limitado para esta frecuencia: ${periodRows.length} periodos.`,
    periods: periodRows.length,
    lastClose: clampPrecision(latest?.adjustedClose ?? null, 2),
    lastDate: latest?.periodEnd ?? null,
    returns: {
      "1P": clampPrecision(rollingReturn(closes, 1)),
      "4P": clampPrecision(rollingReturn(closes, 4)),
      "12P": clampPrecision(rollingReturn(closes, 12)),
      "26P": clampPrecision(rollingReturn(closes, 26)),
      "52P": clampPrecision(rollingReturn(closes, 52)),
    },
    movingAverages,
    distanceToMovingAverages,
    longMovingAverageKey: config.longKey,
    compactSeries: compactSeries(periodRows, config.chartLimit, config.movingAverages.long),
    windows: Object.fromEntries(Object.entries(windows).map(([key, sizes]) => [key, buildWindowMetric(closes, sizes[frequency], config)])),
    changeMoves: buildChangeMoves(moves),
    openingLocation: buildOpeningLocation(moves),
    calendarExtremes: buildCalendarExtremes(periodRows, frequency, config.newHighLowLookback),
    newHighLow: buildNewHighLow(periodRows, config.newHighLowLookback),
    recentPeriods: moves.slice(-80).reverse().map((row) => ({
      period: row.period,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      open: clampPrecision(row.open, 2),
      high: clampPrecision(row.high, 2),
      low: clampPrecision(row.low, 2),
      close: clampPrecision(row.close, 2),
      change: clampPrecision(row.change),
      openGap: clampPrecision(row.openGap),
      range: clampPrecision(row.range),
      closeLocation: clampPrecision(row.closeLocation, 3),
      classification: extensionLabel(zScore(moves.map((item) => item.change), row.change)),
      openingRangeCategory: row.openingRangeCategory,
    })),
    mlFeatures: {
      return_1p: clampPrecision(rollingReturn(closes, 1)),
      return_4p: clampPrecision(rollingReturn(closes, 4)),
      return_12p: clampPrecision(rollingReturn(closes, 12)),
      volatility: clampPrecision(annualizedVolatility(returns.slice(-Math.min(52, returns.length)), config.annualization)),
      drawdown: clampPrecision(drawdownSeries(closes).at(-1) ?? null),
      trend_slope: clampPrecision(linearSlope(trendWindow), 6),
      distance_to_long_ma: longMaValue && latest?.adjustedClose ? clampPrecision(latest.adjustedClose / longMaValue - 1) : null,
      extension_zscore: buildWindowMetric(closes, windows["5Y"][frequency], config).ma200ExtensionZScore,
      range_percentile: latestMove?.range === undefined ? null : clampPrecision(percentileRank(rangeValues, latestMove.range), 1),
      close_location: clampPrecision(latestMove?.closeLocation ?? null, 3),
      correlation_to_selected_average: null,
    },
  };
}

function buildUnavailableFrequency(periods = 0) {
  const changeMoves = buildChangeMoves([]);
  return {
    status: "unavailable",
    statusNote: "Historial limitado para esta frecuencia.",
    periods,
    lastClose: null,
    lastDate: null,
    returns: { "1P": null, "4P": null, "12P": null, "26P": null, "52P": null },
    movingAverages: {},
    distanceToMovingAverages: {},
    longMovingAverageKey: "MA200",
    compactSeries: [],
    windows: Object.fromEntries(Object.keys(windows).map((key) => [key, unavailableWindow(periods)])),
    changeMoves,
    openingLocation: { range: [], close: [] },
    calendarExtremes: [],
    newHighLow: { lookback: 0, newHighCount: 0, newLowCount: 0, newHighRate: null, newLowRate: null },
    recentPeriods: [],
    mlFeatures: {
      return_1p: null,
      return_4p: null,
      return_12p: null,
      volatility: null,
      drawdown: null,
      trend_slope: null,
      distance_to_long_ma: null,
      extension_zscore: null,
      range_percentile: null,
      close_location: null,
      correlation_to_selected_average: null,
    },
  };
}

function buildAssetRecord(asset, rows, provider) {
  const { yahooSymbol, ...catalogAsset } = asset;
  const weeklyRows = rows.length ? aggregateRows(rows, "weekly") : [];
  const monthlyRows = rows.length ? aggregateRows(rows, "monthly") : [];
  const frequencies = rows.length
    ? {
        daily: buildFrequencyMetrics(rows, "daily"),
        weekly: buildFrequencyMetrics(rows, "weekly"),
        monthly: buildFrequencyMetrics(rows, "monthly"),
      }
    : {
        daily: buildUnavailableFrequency(0),
        weekly: buildUnavailableFrequency(0),
        monthly: buildUnavailableFrequency(0),
      };
  const keyStatisticalLevels = {
    weekly: buildKeyLevels(weeklyRows, "weekly"),
    monthly: buildKeyLevels(monthlyRows, "monthly"),
  };
  const daily = frequencies.daily;
  const status = daily.status === "ok" && frequencies.weekly.status === "ok" && frequencies.monthly.status === "ok" ? "ok" : "limited_history";
  return {
    ...catalogAsset,
    status: rows.length ? status : "unavailable",
    statusNote: rows.length ? `Datos públicos procesados vía ${provider}.` : "Sin datos suficientes desde fuentes públicas.",
    lastClose: daily.lastClose,
    lastDate: daily.lastDate,
    returns: {
      "1W": daily.returns["4P"],
      "1M": daily.returns["12P"],
      "3M": daily.returns["52P"],
      "6M": clampPrecision(rollingReturn(rows.map((row) => row.adjustedClose), 126)),
      "1Y": clampPrecision(rollingReturn(rows.map((row) => row.adjustedClose), 252)),
    },
    movingAverages: {
      ma20: daily.movingAverages.MA20 ?? null,
      ma50: daily.movingAverages.MA50 ?? null,
      ma200: daily.movingAverages.MA200 ?? null,
    },
    distanceToMovingAverages: {
      ma20: daily.distanceToMovingAverages.MA20 ?? null,
      ma50: daily.distanceToMovingAverages.MA50 ?? null,
      ma200: daily.distanceToMovingAverages.MA200 ?? null,
    },
    compactSeries: daily.compactSeries,
    windows: daily.windows,
    frequencies,
    keyStatisticalLevels,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeAssets(assets) {
  return assets.reduce(
    (counts, asset) => {
      counts[asset.status] += 1;
      return counts;
    },
    { ok: 0, limited_history: 0, unavailable: 0 },
  );
}

function summarizeAssetForManifest(asset) {
  return {
    ticker: asset.ticker,
    name: asset.name,
    category: asset.category,
    status: asset.status,
    lastClose: asset.lastClose,
    lastDate: asset.lastDate,
    returns: asset.returns,
    distanceToMovingAverages: asset.distanceToMovingAverages,
    extension: {
      zScore5Y: asset.windows["5Y"].ma200ExtensionZScore,
      percentile5Y: asset.windows["5Y"].ma200ExtensionPercentile,
      currentDrawdownFull: asset.windows.Full.currentDrawdown,
    },
  };
}

function buildCorrelationSource(rows) {
  return Object.fromEntries(
    ["daily", "weekly", "monthly"].map((frequency) => {
      const periodRows = aggregateRows(rows, frequency);
      return [frequency, periodReturns(periodRows.map((row) => row.adjustedClose))];
    }),
  );
}

function buildCorrelationMatrix(assets, sources, frequency, windowKey) {
  const tickers = assets.filter((asset) => asset.status !== "unavailable").map((asset) => asset.ticker);
  const sessionLimit = windowKey === "All" ? null : windows[windowKey]?.[frequency] ?? null;
  const seriesByTicker = Object.fromEntries(
    tickers.map((ticker) => {
      const source = sources.get(ticker)?.[frequency] ?? [];
      return [ticker, sessionLimit ? source.slice(-sessionLimit) : source];
    }),
  );
  const values = Object.fromEntries(
    tickers.map((rowTicker) => [
      rowTicker,
      Object.fromEntries(
        tickers.map((columnTicker) => [
          columnTicker,
          rowTicker === columnTicker ? 1 : correlation(seriesByTicker[rowTicker] ?? [], seriesByTicker[columnTicker] ?? []),
        ]),
      ),
    ]),
  );

  return {
    tickers,
    minObservations: 20,
    values,
  };
}

function buildCorrelationData(assets, sources) {
  return Object.fromEntries(
    ["daily", "weekly", "monthly"].map((frequency) => [
      frequency,
      Object.fromEntries(correlationWindows.map((windowKey) => [windowKey, buildCorrelationMatrix(assets, sources, frequency, windowKey)])),
    ]),
  );
}

const assets = [];
const dailySeasonality = [];
const correlationSources = new Map();
for (const asset of universe) {
  try {
    const { rows, provider } = await fetchMarketData(asset);
    const record = buildAssetRecord(asset, rows, provider);
    assets.push(record);
    dailySeasonality.push(buildDailySeasonalityData(asset.ticker, rows));
    correlationSources.set(asset.ticker, buildCorrelationSource(rows));
    console.log(
      `[stat-levels] ${asset.ticker}: ${record.status} (${rows.length} daily rows, weekly ${record.frequencies.weekly.periods}, monthly ${record.frequencies.monthly.periods}, provider ${provider})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[stat-levels] ${asset.ticker}: unavailable (${message})`);
    assets.push(buildAssetRecord(asset, [], "unavailable"));
    dailySeasonality.push(buildDailySeasonalityData(asset.ticker, []));
    correlationSources.set(asset.ticker, buildCorrelationSource([]));
  }
}

const latestDates = assets.map((asset) => asset.lastDate).filter(Boolean).sort();
const generatedAt = latestDates.at(-1) ?? new Date().toISOString().slice(0, 10);
const summary = summarizeAssets(assets);
const unavailableReasons = diagnostics
  .filter((item) => item?.parsedRows === 0)
  .reduce((counts, item) => {
    const reason = item.reason ?? "unknown";
    counts[reason] = (counts[reason] ?? 0) + 1;
    return counts;
  }, {});

const data = {
  generatedAt,
  source: "Datos públicos de mercado procesados en actualización estática · cálculos propios",
  sourceUrl: "https://stooq.com/",
  defaultWindow: "5Y",
  defaultFrequency: "weekly",
  frequencies: ["daily", "weekly", "monthly"],
  windows: Object.keys(windows),
  catalog,
  assets,
};

const seasonalityData = {
  dailySeasonality,
  presidentialCycleSeasonality: {
    phases: {
      all: "Todos los años",
      post_election: "Año 1 posterior a elección presidencial",
      midterm: "Año 2 / midterm",
      pre_election: "Año 3 / pre-elección",
      election: "Año 4 / elección presidencial",
    },
    methodology: "Clasificación por año calendario: años divisibles por 4 son election; +1 post_election; +2 midterm; +3 pre_election.",
  },
};

const manifest = {
  generatedAt: data.generatedAt,
  source: data.source,
  sourceUrl: data.sourceUrl,
  defaultAsset: "SPY",
  defaultWindow: data.defaultWindow,
  defaultFrequency: data.defaultFrequency,
  frequencies: data.frequencies,
  windows: data.windows,
  catalog: assets.map(({ ticker, name, category, stooqSymbol, status, statusNote, lastClose, lastDate }) => ({
    ticker,
    name,
    category,
    stooqSymbol,
    status,
    statusNote,
    lastClose,
    lastDate,
  })),
  summaries: assets.map(summarizeAssetForManifest),
  correlation: buildCorrelationData(assets, correlationSources),
  statusCounts: summary,
  seasonality: {
    presidentialCycleSeasonality: seasonalityData.presidentialCycleSeasonality,
  },
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(assetOutputDir, { recursive: true });
await mkdir(seasonalityOutputDir, { recursive: true });
await writeFile(manifestOutputPath, JSON.stringify(manifest));
await Promise.all(
  assets.map((asset) => writeFile(path.join(assetOutputDir, `${asset.ticker}.json`), JSON.stringify(asset))),
);
await Promise.all(
  dailySeasonality.map((assetSeasonality) => writeFile(path.join(seasonalityOutputDir, `${assetSeasonality.asset}.json`), JSON.stringify(assetSeasonality))),
);
await writeFile(
  outputPath,
  `import type { StatisticalLevelsGeneratedData } from "@/lib/statistical-levels/types";\n\nexport const statisticalLevelsData = ${JSON.stringify({ ...data, assets: [] })} as StatisticalLevelsGeneratedData;\n`,
);

console.log("[stat-levels] summary", summary);
console.log("[stat-levels] unavailable reasons", unavailableReasons);
console.log(`[stat-levels] wrote ${manifestOutputPath}`);
console.log(`[stat-levels] wrote ${assetOutputDir}/{ticker}.json`);
console.log(`[stat-levels] wrote ${seasonalityOutputDir}/{ticker}.json`);
console.log(`[stat-levels] wrote ${outputPath}`);
