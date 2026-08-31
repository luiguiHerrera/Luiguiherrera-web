import { buildQuantRiskData, buildUnavailableQuantRiskData } from "../risk-models.ts";
import type {
  DashboardModuleData,
  QuantRiskData,
  SectorDetailSeries,
  SectorEtfSnapshot,
  SectorLeadership,
  SectorRotationData,
  SectorRotationMetrics,
} from "../types.ts";

export const SECTOR_ETFS = [
  { symbol: "XLK", name: "Tecnología", group: "growth" },
  { symbol: "XLF", name: "Financieras", group: "cyclical" },
  { symbol: "XLV", name: "Salud", group: "defensive" },
  { symbol: "XLE", name: "Energía", group: "cyclical" },
  { symbol: "XLY", name: "Consumo discrecional", group: "growth" },
  { symbol: "XLP", name: "Consumo básico/defensivo", group: "defensive" },
  { symbol: "XLI", name: "Industriales", group: "cyclical" },
  { symbol: "XLB", name: "Materiales", group: "cyclical" },
  { symbol: "XLU", name: "Utilities", group: "defensive" },
  { symbol: "XLRE", name: "Real Estate", group: "defensive" },
  { symbol: "XLC", name: "Comunicación", group: "growth" },
] as const;

export const SECTOR_SOURCE_NAME = "Alpha Vantage: precios diarios de ETFs sectoriales";
export const SECTOR_SOURCE_URL = "https://www.alphavantage.co/documentation/";
export const SECTOR_UPDATE_FREQUENCY = "Automática server-side con caché diaria; revisión periódica sugerida";
export const MIN_SECTOR_HISTORY = 64;
export const SECTOR_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

type SectorGroup = (typeof SECTOR_ETFS)[number]["group"];

export type AlphaVantageDailyResponse = {
  "Time Series (Daily)"?: Record<string, { "4. close"?: string; "5. adjusted close"?: string }>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
};

export type SectorPricePoint = {
  date: string;
  close: number;
};

export type SectorHistory = {
  symbol: string;
  name: string;
  group: SectorGroup;
  latestDate: string;
  prices: SectorPricePoint[];
  closeConvention: "close";
};

export type SectorEtfsResult = {
  module: DashboardModuleData;
  rotation: SectorRotationData | null;
  quantRisk: QuantRiskData;
};

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function sanitizeProviderMessage(value: string | undefined) {
  if (!value) return undefined;
  return value
    .replace(/API key as\s+[A-Z0-9_-]+/gi, "API key as [redacted]")
    .replace(/apikey[=:]\s*[A-Z0-9_-]+/gi, "apikey=[redacted]");
}

export function parseAlphaVantagePrices(payload: AlphaVantageDailyResponse) {
  const rows = new Map<string, SectorPricePoint>();
  const series = payload["Time Series (Daily)"];

  for (const [date, values] of Object.entries(series ?? {})) {
    const close = Number(values["5. adjusted close"] ?? values["4. close"]);
    if (!isIsoDate(date) || !Number.isFinite(close) || close <= 0) continue;
    rows.set(date, { date, close });
  }

  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function calculateReturn(latest: number, previous: number) {
  return ((latest / previous) - 1) * 100;
}

function calculateDailyReturns(pricesAscending: SectorPricePoint[]) {
  const returns: number[] = [];
  for (let index = 1; index < pricesAscending.length; index += 1) {
    returns.push((pricesAscending[index].close / pricesAscending[index - 1].close) - 1);
  }
  return returns;
}

function rankBy(
  sectors: SectorEtfSnapshot[],
  key: "return1w" | "return1m" | "return3m" | "previousReturn1w" | "previousReturn1m" | "previousReturn3m",
) {
  return [...sectors]
    .filter((sector) => sector[key] !== null)
    .sort((a, b) => (b[key] ?? Number.NEGATIVE_INFINITY) - (a[key] ?? Number.NEGATIVE_INFINITY))
    .map((sector, index) => ({ ticker: sector.etfTicker, rank: index + 1 }));
}

export function applySectorRanks(sectors: SectorEtfSnapshot[]) {
  const rank1w = rankBy(sectors, "return1w");
  const rank1m = rankBy(sectors, "return1m");
  const rank3m = rankBy(sectors, "return3m");
  const previousRank1w = rankBy(sectors, "previousReturn1w");
  const previousRank1m = rankBy(sectors, "previousReturn1m");
  const previousRank3m = rankBy(sectors, "previousReturn3m");

  return sectors.map((sector) => ({
    ...sector,
    rank1w: rank1w.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? sector.rank1w,
    rank1m: rank1m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? sector.rank1m,
    rank3m: rank3m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? null,
    previousRank1w: previousRank1w.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? null,
    previousRank1m: previousRank1m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? null,
    previousRank3m: previousRank3m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? null,
  }));
}

function averageGroupReturn(sectors: SectorEtfSnapshot[], group: SectorGroup) {
  const values = sectors.filter((sector) => sector.group === group).map((sector) => sector.return1m);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildSectorMetrics(sectors: SectorEtfSnapshot[]): SectorRotationMetrics {
  const returns1w = sectors.map((sector) => sector.return1w);
  const returns1m = sectors.map((sector) => sector.return1m);
  const defensiveLeadership = averageGroupReturn(sectors, "defensive");
  const growthLeadership = averageGroupReturn(sectors, "growth");
  const cyclicalLeadership = averageGroupReturn(sectors, "cyclical");
  const leaders = [
    { label: "defensiva" as SectorLeadership, value: defensiveLeadership },
    { label: "growth" as SectorLeadership, value: growthLeadership },
    { label: "cíclica" as SectorLeadership, value: cyclicalLeadership },
  ].sort((a, b) => b.value - a.value);
  const reading = leaders[0].value - leaders[1].value >= 1 ? leaders[0].label : "mixta";

  return {
    sectorDispersion1w: Math.max(...returns1w) - Math.min(...returns1w),
    sectorDispersion1m: Math.max(...returns1m) - Math.min(...returns1m),
    defensiveLeadership,
    growthLeadership,
    cyclicalLeadership,
    reading,
    interpretation: `La lectura sugiere una rotación ${reading}. No implica dirección futura del mercado.`,
  };
}

function trendFromSparkline(values: number[]) {
  if (values.length < 10) return "flat" as const;
  const start = values.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
  const end = values.slice(-5).reduce((sum, value) => sum + value, 0) / 5;
  const change = ((end / start) - 1) * 100;
  if (change > 1) return "up" as const;
  if (change < -1) return "down" as const;
  return "flat" as const;
}

function buildDetailSeries(pricesAscending: number[]): SectorDetailSeries[] {
  return [
    { period: "30d" as const, sessions: 30, label: "Retorno acumulado · 30 sesiones" },
    { period: "63d" as const, sessions: 63, label: "Retorno acumulado · 3 meses aprox." },
    { period: "252d" as const, sessions: 252, label: "Retorno acumulado · 12 meses aprox." },
  ].map(({ label, period, sessions }) => {
    const points = pricesAscending.slice(-sessions);
    return {
      period,
      points,
      label: points.length >= sessions ? label : `Historial disponible · ${points.length} sesiones`,
      availableSessions: points.length,
    };
  });
}

export function buildSectorSnapshot(history: SectorHistory): SectorEtfSnapshot {
  const latestIndex = history.prices.length - 1;
  const latest = history.prices[latestIndex];
  const pricesAscending = history.prices;
  const sparkline30d = history.prices.slice(-30).map((point) => point.close);

  return {
    sectorName: history.name,
    etfTicker: history.symbol,
    latestClose: latest.close,
    return1w: calculateReturn(latest.close, history.prices[latestIndex - 5].close),
    return1m: calculateReturn(latest.close, history.prices[latestIndex - 21].close),
    return3m: history.prices[latestIndex - 63] ? calculateReturn(latest.close, history.prices[latestIndex - 63].close) : null,
    previousReturn1w: history.prices[latestIndex - 10] ? calculateReturn(history.prices[latestIndex - 5].close, history.prices[latestIndex - 10].close) : null,
    previousReturn1m: history.prices[latestIndex - 42] ? calculateReturn(history.prices[latestIndex - 21].close, history.prices[latestIndex - 42].close) : null,
    previousReturn3m: history.prices[latestIndex - 126] ? calculateReturn(history.prices[latestIndex - 63].close, history.prices[latestIndex - 126].close) : null,
    rank1w: 0,
    rank1m: 0,
    rank3m: null,
    previousRank1w: null,
    previousRank1m: null,
    previousRank3m: null,
    sparkline30d,
    detailSeries: buildDetailSeries(pricesAscending.map((point) => point.close)),
    trend: trendFromSparkline(sparkline30d),
    lastUpdated: latest.date,
    group: history.group,
    dailyReturns: calculateDailyReturns(pricesAscending),
  };
}

export function alignSectorHistories(histories: SectorHistory[]) {
  if (histories.length !== SECTOR_ETFS.length) throw new Error(`sector coverage ${histories.length}/${SECTOR_ETFS.length}`);
  const commonDates = histories
    .map((history) => new Set(history.prices.map((point) => point.date)))
    .reduce((common, dates) => new Set([...common].filter((date) => dates.has(date))));
  const orderedCommonDates = [...commonDates].sort((a, b) => a.localeCompare(b));
  if (orderedCommonDates.length < MIN_SECTOR_HISTORY) throw new Error(`common sector history ${orderedCommonDates.length}/${MIN_SECTOR_HISTORY}`);
  const allowed = new Set(orderedCommonDates);
  return histories.map((history) => {
    const prices = history.prices.filter((point) => allowed.has(point.date));
    return { ...history, latestDate: prices.at(-1)?.date ?? history.latestDate, prices };
  });
}

function formatPercent(value: number | null) {
  if (value === null) return "Pendiente de datos suficientes";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function buildSectorResult(histories: SectorHistory[], now = Date.now()): SectorEtfsResult {
  const aligned = alignSectorHistories(histories);
  const latestCommonSession = aligned[0].prices.at(-1)?.date;
  if (!latestCommonSession) throw new Error("latest common sector session is unavailable");
  const age = now - new Date(`${latestCommonSession}T23:59:59Z`).getTime();
  if (age > SECTOR_STALE_AFTER_MS) throw new Error(`latest common sector session is stale: ${latestCommonSession}`);

  const sectors = applySectorRanks(aligned.map(buildSectorSnapshot));
  const metrics = buildSectorMetrics(sectors);
  const byWeek = [...sectors].sort((a, b) => b.return1w - a.return1w);
  const byMonth = [...sectors].sort((a, b) => b.return1m - a.return1m);
  const byQuarter = [...sectors].sort((a, b) => (b.return3m ?? Number.NEGATIVE_INFINITY) - (a.return3m ?? Number.NEGATIVE_INFINITY));
  const lastUpdated = `Automático con fuente pública: ${latestCommonSession}`;
  const rotation: SectorRotationData = {
    sourceName: SECTOR_SOURCE_NAME,
    sourceUrl: SECTOR_SOURCE_URL,
    lastUpdated,
    updateFrequency: SECTOR_UPDATE_FREQUENCY,
    dataStatus: "automated",
    reliabilityNote: "La rotación se estima mediante ETFs sectoriales líquidos como proxies. Puede diferir de índices o grupos sectoriales de otros proveedores.",
    sectors,
    metrics,
    closeConvention: "close",
  };

  return {
    module: {
      id: "sectors",
      title: "Rotación sectorial por ETFs",
      status: metrics.reading === "mixta" ? "Lectura mixta" : `Lectura ${metrics.reading}`,
      sourceName: rotation.sourceName,
      sourceUrl: rotation.sourceUrl,
      lastUpdated,
      updateFrequency: rotation.updateFrequency,
      dataStatus: "automated",
      reliabilityNote: `${rotation.reliabilityNote} Convención usada: cierre diario; 1W = 5 sesiones, 1M = 21 sesiones, 3M = 63 sesiones.`,
      observedData: [
        ["Universo proxy", SECTOR_ETFS.map((etf) => `${etf.symbol} ${etf.name}`).join(", ")],
        ["Top 1W", byWeek.slice(0, 3).map((sector) => `${sector.etfTicker} ${formatPercent(sector.return1w)}`).join(", ")],
        ["Bottom 1W", byWeek.slice(-3).reverse().map((sector) => `${sector.etfTicker} ${formatPercent(sector.return1w)}`).join(", ")],
        ["Top 1M", byMonth.slice(0, 3).map((sector) => `${sector.etfTicker} ${formatPercent(sector.return1m)}`).join(", ")],
        ["Top 3M", byQuarter.slice(0, 3).map((sector) => `${sector.etfTicker} ${formatPercent(sector.return3m)}`).join(", ")],
        ["Lectura", metrics.interpretation],
      ],
      interpretation: {
        lookingAt: "Performance de ETFs sectoriales con retornos por sesiones de mercado: 5, 21 y 63 sesiones.",
        why: "Ayuda a observar si la presión relativa se concentra en sectores defensivos, cíclicos o growth.",
        how: "La rotación apunta a una lectura prudente de liderazgo relativo; diferencias pequeñas deben tratarse como mixtas.",
        whatItDoesNotMean: "No implica dirección futura del mercado, no muestra acciones individuales y no es una lectura personalizada.",
      },
    },
    rotation,
    quantRisk: buildQuantRiskData(sectors, metrics, lastUpdated),
  };
}

export function buildUnavailableSectorResult(reason: string): SectorEtfsResult {
  const lastUpdated = "Fuente temporalmente no disponible";
  const reliabilityNote = "Alpha Vantage no devolvió un snapshot completo y válido para los 11 ETFs sectoriales. No se sustituyen rankings, barras ni cálculos con historiales sintéticos.";
  return {
    module: {
      id: "sectors",
      title: "Rotación sectorial por ETFs",
      status: "Datos temporalmente no disponibles",
      sourceName: SECTOR_SOURCE_NAME,
      sourceUrl: SECTOR_SOURCE_URL,
      lastUpdated,
      updateFrequency: SECTOR_UPDATE_FREQUENCY,
      dataStatus: "unavailable",
      reliabilityNote,
      observedData: [],
      interpretation: {
        lookingAt: "La rotación sectorial queda pendiente hasta disponer de un snapshot real y completo.",
        why: "Un universo incompleto no permite comparar liderazgo y rezago con la cobertura gobernada.",
        how: "La lectura se reanuda cuando los 11 ETFs superan validación de fechas, cierres e historial.",
        whatItDoesNotMean: "La ausencia temporal del dato no implica una rotación neutral ni defensiva.",
      },
    },
    rotation: null,
    quantRisk: buildUnavailableQuantRiskData(reason),
  };
}
