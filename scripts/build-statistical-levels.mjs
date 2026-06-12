import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.join(process.cwd(), "lib/statistical-levels/generated-data.ts");
const requestTimeoutMs = 8000;
const requestPauseMs = 250;

const windows = {
  "1Y": 252,
  "3Y": 756,
  "5Y": 1260,
  "10Y": 2520,
  Full: null,
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
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values) {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
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
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
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

function rollingReturn(closes, sessions, index = closes.length - 1) {
  const start = index - sessions;
  if (start < 0 || !closes[index] || !closes[start]) return null;
  return closes[index] / closes[start] - 1;
}

function dailyReturns(closes) {
  const returns = [];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index - 1] > 0 && closes[index] > 0) returns.push(closes[index] / closes[index - 1] - 1);
  }
  return returns;
}

function annualizedVolatility(returns) {
  const sd = standardDeviation(returns);
  return sd === null ? null : sd * Math.sqrt(252);
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

function parseCsv(text) {
  const bodyReason = detectBodyReason(text);
  if (bodyReason) return { rows: [], reason: bodyReason };

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { rows: [], reason: "not_enough_lines" };

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.toLowerCase());
  const dateIndex = headers.indexOf("date");
  const closeIndex = headers.indexOf("close");
  const openIndex = headers.indexOf("open");
  const highIndex = headers.indexOf("high");
  const lowIndex = headers.indexOf("low");
  const volumeIndex = headers.indexOf("volume");

  if (dateIndex === -1 || closeIndex === -1) return { rows: [], reason: "unexpected_headers" };

  const rows = lines
    .slice(1)
    .map((line) => {
      const values = splitDelimitedLine(line, delimiter);
      const close = parseNumber(values[closeIndex]);
      return {
        date: values[dateIndex],
        close,
        open: parseNumber(values[openIndex]),
        high: parseNumber(values[highIndex]),
        low: parseNumber(values[lowIndex]),
        volume: parseNumber(values[volumeIndex]) ?? 0,
      };
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close) && row.close > 0)
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
    return {
      url,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "unknown",
      body: text,
    };
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
    finalAttempt = {
      provider: "stooq",
      ticker: asset.ticker,
      symbol: asset.stooqSymbol,
      url,
      status: attempt.status,
      contentType: attempt.contentType,
      bodyPreview: normalizeBodyPreview(attempt.body),
      detectedHtml: detectBodyReason(attempt.body) === "html_or_browser_verification",
      detectedNoData: detectBodyReason(attempt.body) === "no_data",
      parsedRows: parsed.rows.length,
      reason: parsed.reason,
    };
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
      const close = parseNumber(adjusted[index] ?? quote.close?.[index]);
      const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
      return {
        date,
        close,
        open: parseNumber(quote.open?.[index]),
        high: parseNumber(quote.high?.[index]),
        low: parseNumber(quote.low?.[index]),
        volume: parseNumber(quote.volume?.[index]) ?? 0,
      };
    })
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { rows, reason: rows.length ? null : "no_parseable_rows" };
}

async function fetchYahooFallback(asset) {
  const url = yahooUrl(asset);
  await sleep(requestPauseMs);
  const attempt = await fetchText(url, "application/json,text/plain,*/*");
  const parsed = parseYahooChart(attempt.body);
  return {
    rows: parsed.rows,
    diagnostic: {
      provider: "yahoo_fallback",
      ticker: asset.ticker,
      symbol: asset.yahooSymbol,
      url,
      status: attempt.status,
      contentType: attempt.contentType,
      bodyPreview: normalizeBodyPreview(attempt.body),
      detectedHtml: detectBodyReason(attempt.body) === "html_or_browser_verification",
      detectedNoData: detectBodyReason(attempt.body) === "no_data",
      parsedRows: parsed.rows.length,
      reason: parsed.reason,
    },
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

function compactSeries(rows) {
  const step = Math.max(1, Math.floor(rows.length / 180));
  return rows
    .filter((_, index) => index % step === 0 || index === rows.length - 1)
    .slice(-180)
    .map((row) => {
      const originalIndex = rows.findIndex((candidate) => candidate.date === row.date);
      return {
        date: row.date,
        close: clampPrecision(row.close, 2),
        ma200: clampPrecision(movingAverage(rows.map((item) => item.close), 200, originalIndex), 2),
      };
    });
}

function oneMonthReturnsForWindow(closes) {
  const values = [];
  for (let index = 21; index < closes.length; index += 1) {
    const value = rollingReturn(closes, 21, index);
    if (value !== null) values.push(value);
  }
  return values;
}

function ma200ExtensionsForWindow(closes) {
  const values = [];
  for (let index = 199; index < closes.length; index += 1) {
    const ma200 = movingAverage(closes, 200, index);
    if (ma200) values.push(closes[index] / ma200 - 1);
  }
  return values;
}

function volatilitySeriesForWindow(closes) {
  const returns = dailyReturns(closes);
  const values = [];
  for (let index = 63; index <= returns.length; index += 1) {
    const vol = annualizedVolatility(returns.slice(index - 63, index));
    if (vol !== null) values.push(vol);
  }
  return values;
}

function buildWindowMetric(allCloses, windowSize) {
  const closes = windowSize ? allCloses.slice(-windowSize) : [...allCloses];
  if (windowSize && allCloses.length < windowSize) {
    return unavailableWindow(allCloses.length);
  }
  if (closes.length < 252) return unavailableWindow(closes.length);

  const returns = dailyReturns(closes);
  const drawdowns = drawdownSeries(closes);
  const lastClose = closes.at(-1);
  const currentReturn1m = rollingReturn(closes, 21);
  const currentMa200 = movingAverage(closes, 200);
  const currentExtension = currentMa200 ? lastClose / currentMa200 - 1 : null;
  const extensionHistory = ma200ExtensionsForWindow(closes);
  const return1mHistory = oneMonthReturnsForWindow(closes);
  const volHistory = volatilitySeriesForWindow(closes);
  const currentVol63 = annualizedVolatility(returns.slice(-63));
  const currentVol252 = annualizedVolatility(returns.slice(-252));
  const currentDrawdown = drawdowns.at(-1) ?? null;
  const extensionZ = currentExtension === null ? null : zScore(extensionHistory, currentExtension);
  const extensionPct = currentExtension === null ? null : percentileRank(extensionHistory, currentExtension);

  return {
    available: true,
    sessions: closes.length,
    annualizedVolatility63d: clampPrecision(currentVol63),
    annualizedVolatility252d: clampPrecision(currentVol252),
    annualizedVolatilityWindow: clampPrecision(annualizedVolatility(returns)),
    currentDrawdown: clampPrecision(currentDrawdown),
    maxDrawdown: clampPrecision(maxDrawdown(closes)),
    pricePercentile: clampPrecision(percentileRank(closes, lastClose), 1),
    return1mPercentile: currentReturn1m === null ? null : clampPrecision(percentileRank(return1mHistory, currentReturn1m), 1),
    return1mZScore: currentReturn1m === null ? null : clampPrecision(zScore(return1mHistory, currentReturn1m), 2),
    ma200Extension: clampPrecision(currentExtension),
    ma200ExtensionZScore: clampPrecision(extensionZ, 2),
    ma200ExtensionPercentile: clampPrecision(extensionPct, 1),
    drawdownPercentile: currentDrawdown === null ? null : clampPrecision(percentileRank(drawdowns, currentDrawdown), 1),
    volatilityPercentile: currentVol63 === null ? null : clampPrecision(percentileRank(volHistory, currentVol63), 1),
    extensionLabel: extensionLabel(extensionZ),
    extensionPercentileLabel: percentileLabel(extensionPct),
    windowReturns: returns.slice(-2520).map((value) => clampPrecision(value, 6)),
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

function buildUnavailableRecord(asset, rows, reason = "Sin datos suficientes desde fuentes públicas.") {
  const { yahooSymbol, ...catalogAsset } = asset;
  return {
    ...catalogAsset,
    status: "unavailable",
    statusNote: reason,
    lastClose: null,
    lastDate: null,
    returns: { "1W": null, "1M": null, "3M": null, "6M": null, "1Y": null },
    movingAverages: { ma20: null, ma50: null, ma200: null },
    distanceToMovingAverages: { ma20: null, ma50: null, ma200: null },
    compactSeries: [],
    windows: Object.fromEntries(Object.keys(windows).map((key) => [key, unavailableWindow(rows.length)])),
  };
}

function buildAssetRecord(asset, rows, provider) {
  if (rows.length < 252) {
    return buildUnavailableRecord(asset, rows, `Historial insuficiente desde ${provider}: ${rows.length} sesiones.`);
  }

  const { yahooSymbol, ...catalogAsset } = asset;
  const closes = rows.map((row) => row.close);
  const lastClose = closes.at(-1);
  const ma20 = movingAverage(closes, 20);
  const ma50 = movingAverage(closes, 50);
  const ma200 = movingAverage(closes, 200);
  const status = rows.length < 756 ? "limited_history" : "ok";

  return {
    ...catalogAsset,
    status,
    statusNote:
      status === "ok"
        ? `Datos históricos disponibles vía ${provider}.`
        : `Historial limitado vía ${provider}; algunas ventanas no estarán disponibles.`,
    lastClose: clampPrecision(lastClose, 2),
    lastDate: rows.at(-1).date,
    returns: {
      "1W": clampPrecision(rollingReturn(closes, 5)),
      "1M": clampPrecision(rollingReturn(closes, 21)),
      "3M": clampPrecision(rollingReturn(closes, 63)),
      "6M": clampPrecision(rollingReturn(closes, 126)),
      "1Y": clampPrecision(rollingReturn(closes, 252)),
    },
    movingAverages: {
      ma20: clampPrecision(ma20, 2),
      ma50: clampPrecision(ma50, 2),
      ma200: clampPrecision(ma200, 2),
    },
    distanceToMovingAverages: {
      ma20: ma20 ? clampPrecision(lastClose / ma20 - 1) : null,
      ma50: ma50 ? clampPrecision(lastClose / ma50 - 1) : null,
      ma200: ma200 ? clampPrecision(lastClose / ma200 - 1) : null,
    },
    compactSeries: compactSeries(rows),
    windows: Object.fromEntries(Object.entries(windows).map(([key, size]) => [key, buildWindowMetric(closes, size)])),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeAssets(assets) {
  const summary = {
    ok: 0,
    limited_history: 0,
    unavailable: 0,
  };
  for (const asset of assets) summary[asset.status] += 1;
  return summary;
}

const assets = [];
for (const asset of universe) {
  try {
    const { rows, provider, diagnostic } = await fetchMarketData(asset);
    const reason = diagnostic?.reason ? `Razón interna: ${diagnostic.reason}.` : "Sin datos suficientes desde fuentes públicas.";
    const record = rows.length ? buildAssetRecord(asset, rows, provider) : buildUnavailableRecord(asset, rows, reason);
    assets.push(record);
    console.log(
      `[stat-levels] ${asset.ticker}: ${record.status} (${rows.length} rows, last ${record.lastDate ?? "n/a"}, provider ${provider})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[stat-levels] ${asset.ticker}: unavailable (${message})`);
    assets.push(buildUnavailableRecord(asset, [], `Error de ingesta: ${message}.`));
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
  source: "Stooq como fuente primaria; Yahoo Finance como fallback · cálculos propios",
  sourceUrl: "https://stooq.com/",
  defaultWindow: "5Y",
  windows: Object.keys(windows),
  catalog,
  assets,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `import type { StatisticalLevelsGeneratedData } from "@/lib/statistical-levels/types";\n\nexport const statisticalLevelsData = ${JSON.stringify(data, null, 2)} satisfies StatisticalLevelsGeneratedData;\n`,
);

console.log("[stat-levels] summary", summary);
console.log("[stat-levels] unavailable reasons", unavailableReasons);
console.log(`[stat-levels] wrote ${outputPath}`);
