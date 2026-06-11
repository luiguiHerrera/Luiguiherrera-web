import { dashboardModules } from "@/lib/dashboard/manual-data";
import { buildQuantRiskData } from "@/lib/dashboard/risk-models";
import type { DashboardModuleData, QuantRiskData, SectorEtfSnapshot, SectorLeadership, SectorRotationData, SectorRotationMetrics } from "@/lib/dashboard/types";

const REVALIDATE_SECONDS = 60 * 60 * 24;
const CLOSE_CONVENTION = "adjusted_close";

const sectorEtfs = [
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

type SectorGroup = (typeof sectorEtfs)[number]["group"];

type AlphaVantageDailyResponse = {
  "Time Series (Daily)"?: Record<string, { "4. close"?: string; "5. adjusted close"?: string }>;
  "Error Message"?: string;
  "Note"?: string;
  Information?: string;
};

type PricePoint = {
  date: string;
  close: number;
};

type SectorHistory = {
  symbol: string;
  name: string;
  group: SectorGroup;
  latestDate: string;
  prices: PricePoint[];
};

export type SectorEtfsResult = {
  module: DashboardModuleData;
  rotation: SectorRotationData | null;
  quantRisk: QuantRiskData | null;
};

function formatPercent(value: number | null) {
  if (value === null) return "No disponible";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function fallbackSectorResult(reason: string): SectorEtfsResult {
  const fallback = dashboardModules.find((module) => module.id === "sectors");

  if (!fallback) {
    throw new Error("Missing sector fallback module");
  }

  const demoSectors = applyRanks(
    [
      ["Tecnología", "XLK", "growth", -1.4, 2.1, 5.2],
      ["Financieras", "XLF", "cyclical", 0.4, 3.0, 4.8],
      ["Salud", "XLV", "defensive", 0.7, 2.1, 2.8],
      ["Energía", "XLE", "cyclical", -0.5, -0.9, 1.4],
      ["Consumo discrecional", "XLY", "growth", -0.8, 1.2, 3.5],
      ["Consumo básico/defensivo", "XLP", "defensive", 0.9, 1.8, 2.4],
      ["Industriales", "XLI", "cyclical", 0.2, 2.4, 3.2],
      ["Materiales", "XLB", "cyclical", -0.2, 1.1, 1.9],
      ["Utilities", "XLU", "defensive", 1.2, 1.7, 0.9],
      ["Real Estate", "XLRE", "defensive", -0.3, -1.2, -0.7],
      ["Comunicación", "XLC", "growth", -0.4, -0.4, 2.7],
    ].map(([sectorName, etfTicker, group, return1w, return1m, return3m], index) => {
      const base = 100 + index;
      const sparkline30d = Array.from({ length: 30 }, (_, day) => base + Math.sin(day / 4) * 1.5 + (Number(return1m) / 29) * day);

      return {
        sectorName: String(sectorName),
        etfTicker: String(etfTicker),
        latestClose: sparkline30d.at(-1) ?? base,
        return1w: Number(return1w),
        return1m: Number(return1m),
        return3m: Number(return3m),
        rank1w: 0,
        rank1m: 0,
        rank3m: null,
        sparkline30d,
        trend: trendFromSparkline(sparkline30d),
        lastUpdated: "Fallback demo",
        group: group as SectorGroup,
        dailyReturns: [],
      };
    }),
  );
  const metrics = buildMetrics(demoSectors);
  const rotation: SectorRotationData = {
    sourceName: "Fallback demo de ETFs sectoriales",
    lastUpdated: "Fallback demo",
    updateFrequency: "Automática server-side con caché diaria cuando exista fuente disponible",
    dataStatus: "demo",
    reliabilityNote: `Datos demo para mantener la lectura disponible. Fallback activo: ${reason}.`,
    sectors: demoSectors,
    metrics,
    closeConvention: CLOSE_CONVENTION,
  };

  return {
    module: {
      ...fallback,
      status: "Fallback demo",
      dataStatus: "demo",
      lastUpdated: "Fallback demo",
      reliabilityNote: `${fallback.reliabilityNote} Fallback activo: ${reason}.`,
    },
    rotation,
    quantRisk: {
      sourceName: "Fallback demo sobre ETFs sectoriales",
      lastUpdated: "Fallback demo",
      updateFrequency: "Automática server-side con caché diaria cuando exista fuente disponible",
      dataStatus: "demo",
      reliabilityNote: `Los modelos cuantitativos requieren historial suficiente. Fallback activo: ${reason}. No predicen dirección de mercado.`,
      ewmaVolAnnualized: null,
      ewmaVolChange: null,
      ewmaStatus: "stress",
      garchVolForecast: null,
      garchStatus: "stress",
      modelStatus: "insufficient_data",
      averageCorrelation21d: null,
      averageCorrelation63d: null,
      defensiveGrowthCorrelation21d: null,
      sectorDispersion1w: metrics.sectorDispersion1w,
      sectorDispersion1m: metrics.sectorDispersion1m,
      fragilityScore: 0,
      fragilityLabel: "Baja",
      fragilityInterpretation: "La lectura cuantitativa está en fallback demo por falta de datos automatizados suficientes. Es contexto operativo, no una estimación activa.",
    },
  };
}

function calculateReturn(latest: number, previous: number) {
  return ((latest / previous) - 1) * 100;
}

function calculateDailyReturns(pricesAscending: PricePoint[]) {
  const returns: number[] = [];

  for (let index = 1; index < pricesAscending.length; index += 1) {
    returns.push((pricesAscending[index].close / pricesAscending[index - 1].close) - 1);
  }

  return returns;
}

function rankBy(sectors: SectorEtfSnapshot[], key: "return1w" | "return1m" | "return3m") {
  return [...sectors]
    .filter((sector) => sector[key] !== null)
    .sort((a, b) => (b[key] ?? Number.NEGATIVE_INFINITY) - (a[key] ?? Number.NEGATIVE_INFINITY))
    .map((sector, index) => ({ ticker: sector.etfTicker, rank: index + 1 }));
}

function applyRanks(sectors: SectorEtfSnapshot[]) {
  const rank1w = rankBy(sectors, "return1w");
  const rank1m = rankBy(sectors, "return1m");
  const rank3m = rankBy(sectors, "return3m");

  return sectors.map((sector) => ({
    ...sector,
    rank1w: rank1w.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? sector.rank1w,
    rank1m: rank1m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? sector.rank1m,
    rank3m: rank3m.find((rank) => rank.ticker === sector.etfTicker)?.rank ?? null,
  }));
}

function averageGroupReturn(sectors: SectorEtfSnapshot[], group: SectorGroup) {
  const values = sectors.filter((sector) => sector.group === group).map((sector) => sector.return1m);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMetrics(sectors: SectorEtfSnapshot[]): SectorRotationMetrics {
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
  if (values.length < 10) return "flat";
  const start = values.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
  const end = values.slice(-5).reduce((sum, value) => sum + value, 0) / 5;
  const change = ((end / start) - 1) * 100;

  if (change > 1) return "up";
  if (change < -1) return "down";
  return "flat";
}

async function fetchSectorHistory(symbol: string, apiKey: string): Promise<SectorHistory> {
  const meta = sectorEtfs.find((etf) => etf.symbol === symbol);

  if (!meta) {
    throw new Error(`Unknown ETF symbol: ${symbol}`);
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Alpha Vantage ${symbol} HTTP ${response.status}`);
  }

  const payload = (await response.json()) as AlphaVantageDailyResponse;

  if (payload["Error Message"] || payload.Note || payload.Information) {
    throw new Error(`Alpha Vantage ${symbol} did not return daily prices`);
  }

  const series = payload["Time Series (Daily)"];
  const prices = series
    ? Object.entries(series)
        .map(([date, values]) => ({
          date,
          close: Number(values["5. adjusted close"] ?? values["4. close"]),
        }))
        .filter((row) => Number.isFinite(row.close))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  if (prices.length < 64) {
    throw new Error(`Alpha Vantage ${symbol} returned insufficient market sessions`);
  }

  return {
    symbol,
    name: meta.name,
    group: meta.group,
    latestDate: prices[0].date,
    prices,
  };
}

function buildSectorSnapshot(history: SectorHistory): SectorEtfSnapshot {
  const latest = history.prices[0];
  const pricesAscending = [...history.prices].reverse();
  const sparkline30d = history.prices.slice(0, 30).reverse().map((point) => point.close);

  return {
    sectorName: history.name,
    etfTicker: history.symbol,
    latestClose: latest.close,
    return1w: calculateReturn(latest.close, history.prices[5].close),
    return1m: calculateReturn(latest.close, history.prices[21].close),
    return3m: history.prices[63] ? calculateReturn(latest.close, history.prices[63].close) : null,
    rank1w: 0,
    rank1m: 0,
    rank3m: null,
    sparkline30d,
    trend: trendFromSparkline(sparkline30d),
    lastUpdated: latest.date,
    group: history.group,
    dailyReturns: calculateDailyReturns(pricesAscending),
  };
}

export async function getSectorEtfsData(): Promise<SectorEtfsResult> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return fallbackSectorResult("falta ALPHA_VANTAGE_API_KEY");
  }

  try {
    const histories = await Promise.all(sectorEtfs.map((etf) => fetchSectorHistory(etf.symbol, apiKey)));
    const sectors = applyRanks(histories.map(buildSectorSnapshot));
    const metrics = buildMetrics(sectors);
    const latestDate = sectors.map((sector) => sector.lastUpdated).sort().at(-1) ?? "fecha no disponible";
    const byWeek = [...sectors].sort((a, b) => b.return1w - a.return1w);
    const byMonth = [...sectors].sort((a, b) => b.return1m - a.return1m);
    const byQuarter = [...sectors].sort((a, b) => (b.return3m ?? Number.NEGATIVE_INFINITY) - (a.return3m ?? Number.NEGATIVE_INFINITY));
    const rotation: SectorRotationData = {
      sourceName: "Alpha Vantage: precios diarios ajustados de ETFs sectoriales",
      sourceUrl: "https://www.alphavantage.co/documentation/",
      lastUpdated: `Automático con fuente pública: ${latestDate}`,
      updateFrequency: "Automática server-side con caché diaria; revisión semanal sugerida",
      dataStatus: "automated",
      reliabilityNote: "La rotación se estima mediante ETFs sectoriales líquidos como proxies. Puede diferir de índices o grupos sectoriales de otros proveedores.",
      sectors,
      metrics,
      closeConvention: CLOSE_CONVENTION,
    };

    return {
      module: {
        id: "sectors",
        title: "Rotación sectorial por ETFs",
        status: metrics.reading === "mixta" ? "Lectura mixta" : `Lectura ${metrics.reading}`,
        sourceName: rotation.sourceName,
        sourceUrl: rotation.sourceUrl,
        lastUpdated: rotation.lastUpdated,
        updateFrequency: rotation.updateFrequency,
        dataStatus: "automated",
        reliabilityNote: `${rotation.reliabilityNote} Convención usada: cierre ajustado diario; 1W = 5 sesiones, 1M = 21 sesiones, 3M = 63 sesiones.`,
        observedData: [
          ["Universo proxy", sectorEtfs.map((etf) => `${etf.symbol} ${etf.name}`).join(", ")],
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
          whatItDoesNotMean: "No implica dirección futura del mercado, no muestra acciones individuales y no es recomendación de inversión.",
        },
      },
      rotation,
      quantRisk: buildQuantRiskData(sectors, metrics, rotation.lastUpdated),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente";
    return fallbackSectorResult(reason);
  }
}
