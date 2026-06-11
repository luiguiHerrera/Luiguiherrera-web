import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData } from "@/lib/dashboard/types";

const REVALIDATE_SECONDS = 60 * 60 * 24;

const sectorEtfs = [
  { symbol: "XLK", name: "Tecnología", group: "growth" },
  { symbol: "XLF", name: "Financieras", group: "cyclical" },
  { symbol: "XLV", name: "Salud", group: "defensive" },
  { symbol: "XLE", name: "Energía", group: "cyclical" },
  { symbol: "XLY", name: "Consumo discrecional", group: "cyclical" },
  { symbol: "XLP", name: "Consumo defensivo", group: "defensive" },
  { symbol: "XLI", name: "Industriales", group: "cyclical" },
  { symbol: "XLB", name: "Materiales", group: "cyclical" },
  { symbol: "XLU", name: "Utilities", group: "defensive" },
  { symbol: "XLRE", name: "Real Estate", group: "cyclical" },
  { symbol: "XLC", name: "Comunicación", group: "growth" },
] as const;

type SectorGroup = (typeof sectorEtfs)[number]["group"];

type AlphaVantageDailyResponse = {
  "Time Series (Daily)"?: Record<string, { "4. close"?: string; "5. adjusted close"?: string }>;
  "Error Message"?: string;
  "Note"?: string;
  Information?: string;
};

type SectorReturn = {
  symbol: string;
  name: string;
  group: SectorGroup;
  latestDate: string;
  weekReturn: number;
  monthReturn: number;
};

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function fallbackSectorModule(reason: string): DashboardModuleData {
  const fallback = dashboardModules.find((module) => module.id === "sectors");

  if (!fallback) {
    throw new Error("Missing sector fallback module");
  }

  return {
    ...fallback,
    status: "Fallback demo",
    dataStatus: "demo",
    lastUpdated: "Fallback demo",
    reliabilityNote: `${fallback.reliabilityNote} Fallback activo: ${reason}.`,
  };
}

function calculateReturn(latest: number, previous: number) {
  return ((latest / previous) - 1) * 100;
}

function classifyLeadership(topWeek: SectorReturn[], topMonth: SectorReturn[]) {
  const counts: Record<SectorGroup, number> = {
    defensive: 0,
    cyclical: 0,
    growth: 0,
  };

  [...topWeek, ...topMonth].forEach((sector) => {
    counts[sector.group] += 1;
  });

  if (counts.defensive >= 3) return "Liderazgo defensivo";
  if (counts.growth >= 3) return "Liderazgo growth";
  if (counts.cyclical >= 4) return "Liderazgo cíclico";
  return "Mixto";
}

async function fetchSectorReturn(symbol: string, apiKey: string): Promise<SectorReturn> {
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
  const rows = series
    ? Object.entries(series)
        .map(([date, values]) => ({
          date,
          close: Number(values["5. adjusted close"] ?? values["4. close"]),
        }))
        .filter((row) => Number.isFinite(row.close))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  if (rows.length < 22) {
    throw new Error(`Alpha Vantage ${symbol} returned insufficient history`);
  }

  return {
    symbol,
    name: meta.name,
    group: meta.group,
    latestDate: rows[0].date,
    weekReturn: calculateReturn(rows[0].close, rows[5].close),
    monthReturn: calculateReturn(rows[0].close, rows[21].close),
  };
}

export async function getSectorEtfsModule(): Promise<DashboardModuleData> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    return fallbackSectorModule("falta ALPHA_VANTAGE_API_KEY");
  }

  try {
    const results = await Promise.all(sectorEtfs.map((etf) => fetchSectorReturn(etf.symbol, apiKey)));
    const byWeek = [...results].sort((a, b) => b.weekReturn - a.weekReturn);
    const byMonth = [...results].sort((a, b) => b.monthReturn - a.monthReturn);
    const topWeek = byWeek.slice(0, 3);
    const bottomWeek = byWeek.slice(-3).reverse();
    const topMonth = byMonth.slice(0, 3);
    const bottomMonth = byMonth.slice(-3).reverse();
    const reading = classifyLeadership(topWeek, topMonth);
    const latestDate = results.map((result) => result.latestDate).sort().at(-1) ?? "fecha no disponible";

    return {
      id: "sectors",
      title: "Rotación sectorial por ETFs",
      status: reading,
      sourceName: "Alpha Vantage: precios diarios de ETFs sectoriales",
      sourceUrl: "https://www.alphavantage.co/documentation/",
      lastUpdated: `Automático con fuente pública: ${latestDate}`,
      updateFrequency: "Automática server-side con caché diaria; revisión semanal sugerida",
      dataStatus: "automated",
      reliabilityNote: "Lectura calculada con precios diarios de ETFs sectoriales como proxies. Puede tener retrasos, límites de API o diferencias frente a datos intradía. No sustituye un análisis completo.",
      observedData: [
        ["Universo proxy", sectorEtfs.map((etf) => `${etf.symbol} ${etf.name}`).join(", ")],
        ["Top 1 semana", topWeek.map((sector) => `${sector.symbol} ${formatPercent(sector.weekReturn)}`).join(", ")],
        ["Bottom 1 semana", bottomWeek.map((sector) => `${sector.symbol} ${formatPercent(sector.weekReturn)}`).join(", ")],
        ["Top 1 mes", topMonth.map((sector) => `${sector.symbol} ${formatPercent(sector.monthReturn)}`).join(", ")],
        ["Bottom 1 mes", bottomMonth.map((sector) => `${sector.symbol} ${formatPercent(sector.monthReturn)}`).join(", ")],
        ["Lectura", reading],
      ],
      interpretation: {
        lookingAt: "Performance aproximada de ETFs sectoriales para observar liderazgo y rezago por sectores.",
        why: "Ayuda a ver si el liderazgo se concentra en sectores defensivos, cíclicos o growth.",
        how: "Liderazgo defensivo puede sugerir cautela; liderazgo cíclico o growth puede sugerir mayor apetito por riesgo o crecimiento.",
        whatItDoesNotMean: "Estos datos son una aproximación por proxies sectoriales y no sustituyen un análisis completo ni una instrucción operativa.",
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido de fuente";
    return fallbackSectorModule(reason);
  }
}
