import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData, VixDashboardData, VixHistoryPoint, VixSpotData, VixTermStructureData } from "@/lib/dashboard/types";

type FredObservation = {
  date: string;
  value: string;
};

const FRED_VIX_SOURCE_URL = "https://fred.stlouisfed.org/series/VIXCLS";
const FRED_VIX_API_URL = "https://api.stlouisfed.org/fred/series/observations";
const FRED_VIX_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS";
const FALLBACK_MESSAGE = "Datos automáticos no disponibles temporalmente. Mostrando lectura demo para mantener la estructura visual.";
const FRED_TIMEOUT_MS = 8000;

function getFallbackModule() {
  const fallback = dashboardModules.find((module) => module.id === "vix");
  if (!fallback) {
    throw new Error("Missing VIX fallback module");
  }
  return fallback;
}

function logVixFallback(reason: string, details: Record<string, unknown> = {}) {
  console.warn("[dashboard:vix]", {
    reason,
    ...details,
  });
}

function parseVixValue(value: string) {
  if (!value || value === ".") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFredCsv(csv: string): VixHistoryPoint[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, rawValue] = line.split(",");
      const value = parseVixValue(rawValue);
      return date && value !== null ? { date, value } : null;
    })
    .filter((point): point is VixHistoryPoint => point !== null);
}

async function fetchFredWithApiKey(apiKey: string): Promise<VixHistoryPoint[]> {
  const params = new URLSearchParams({
    series_id: "VIXCLS",
    api_key: apiKey,
    file_type: "json",
    observation_start: "1990-01-01",
    sort_order: "asc",
  });
  const response = await fetch(`${FRED_VIX_API_URL}?${params.toString()}`, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(FRED_TIMEOUT_MS),
  });
  const json = await response.json();
  const topLevelKeys = json && typeof json === "object" ? Object.keys(json) : [];

  if (!response.ok || json.error_code || json.error_message) {
    logVixFallback("fred_api_error", {
      source: "FRED API VIXCLS",
      status: response.status,
      topLevelKeys,
      errorCode: json.error_code,
      errorMessage: json.error_message,
    });
    return [];
  }

  const observations = Array.isArray(json.observations) ? (json.observations as FredObservation[]) : [];
  console.info("[dashboard:vix]", {
    source: "FRED API VIXCLS",
    status: response.status,
    topLevelKeys,
    observationsCount: observations.length,
  });

  return observations
    .map((observation) => {
      const value = parseVixValue(observation.value);
      return observation.date && value !== null ? { date: observation.date, value } : null;
    })
    .filter((point): point is VixHistoryPoint => point !== null);
}

async function fetchFredPublicCsv(): Promise<VixHistoryPoint[]> {
  const response = await fetch(FRED_VIX_CSV_URL, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(FRED_TIMEOUT_MS),
  });
  const text = await response.text();
  const header = text.split(/\r?\n/)[0] ?? "";

  if (!response.ok) {
    logVixFallback("fred_csv_error", {
      source: "FRED public CSV VIXCLS",
      status: response.status,
      header,
    });
    return [];
  }

  const points = parseFredCsv(text);
  console.info("[dashboard:vix]", {
    source: "FRED public CSV VIXCLS",
    status: response.status,
    header,
    observationsCount: points.length,
  });
  return points;
}

async function fetchVixHistory(): Promise<VixHistoryPoint[]> {
  try {
    const apiKey = process.env.FRED_API_KEY;
    const history = apiKey ? await fetchFredWithApiKey(apiKey) : await fetchFredPublicCsv();
    return history.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    logVixFallback("fred_request_failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatVix(value: number | null) {
  return value === null ? "Dato no disponible temporalmente" : value.toFixed(1);
}

function formatChange(value: number | null) {
  if (value === null) return "Historial insuficiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pts`;
}

function vixStateFor(latestVix: number): VixSpotData["vixState"] {
  if (latestVix >= 30) return "stress";
  if (latestVix >= 20) return "attention";
  return "normal";
}

function vixTrendFor(change5d: number | null): VixSpotData["vixTrend"] {
  if (change5d === null) return "stable";
  if (change5d > 1) return "rising";
  if (change5d < -1) return "falling";
  return "stable";
}

function percentileFor(history: VixHistoryPoint[], latestVix: number) {
  if (history.length < 252) return null;
  const belowOrEqual = history.filter((point) => point.value <= latestVix).length;
  return (belowOrEqual / history.length) * 100;
}

function buildTermStructureFallback(latestVix: number | null, lastUpdated: string): VixTermStructureData {
  return {
    sourceName: "CBOE / VIX futures term structure",
    sourceUrl: "https://www.cboe.com/tradable_products/vix/",
    lastUpdated,
    updateFrequency: "Pendiente de proveedor estable",
    dataStatus: "live_pending",
    reliabilityNote: "Estructura preparada para VIX futures cercanos. No se automatiza hasta validar permisos, proveedor y timestamp sin scraping frágil.",
    spot: latestVix,
    futureMonth1: null,
    futureMonth2: null,
    spreadM2M1: null,
    curveState: "live_pending",
    interpretation: {
      lookingAt: "Relación entre VIX spot y futuros cercanos para observar si se paga más por protección cercana o futura.",
      why: "Ayuda a diferenciar tensión inmediata de una curva más normalizada.",
      how: "Contango suele asociarse con menor tensión inmediata; backwardation suele indicar más estrés cercano.",
      whatItDoesNotMean: "No predice por sí sola la dirección del mercado ni marca puntos de entrada o salida.",
    },
  };
}

function buildFallbackVixData(fallback: DashboardModuleData): VixDashboardData {
  const latestVix = 17.8;
  const lastUpdated = fallback.lastUpdated;
  const spot: VixSpotData = {
    sourceName: "FRED VIXCLS",
    sourceUrl: FRED_VIX_SOURCE_URL,
    lastUpdated,
    updateFrequency: "Actualización diaria con último cierre disponible",
    dataStatus: "demo",
    reliabilityNote: FALLBACK_MESSAGE,
    latestVix,
    previousVix: 18.1,
    change1d: -0.3,
    change5d: -0.8,
    change21d: 1.2,
    vixPercentile: 42,
    vixState: "normal",
    vixTrend: "falling",
    history: [
      18.4, 18.2, 18.9, 19.6, 18.8, 18.1, 17.6, 17.9, 18.5, 18.0, 17.4, 17.8,
      18.3, 19.1, 18.7, 18.0, 17.7, 17.2, 17.5, 18.1, 18.6, 18.2, 17.9, 17.8,
    ].map((value, index) => ({ date: `demo-${index + 1}`, value })),
    interpretation: {
      lookingAt: "Último cierre disponible del VIX y cambios recientes de volatilidad implícita del S&P 500.",
      why: "El VIX resume expectativas de volatilidad implícita y ayuda a leer presión de riesgo.",
      how: "Lectura aproximada basada en umbrales habituales y datos históricos; niveles más altos sugieren mayor tensión de volatilidad.",
      whatItDoesNotMean: "No predice dirección del mercado, no es una recomendación y no sustituye análisis de escenario.",
    },
  };

  return {
    spot,
    termStructure: buildTermStructureFallback(latestVix, lastUpdated),
    module: {
      ...fallback,
      title: "VIX / volatilidad",
      status: "Datos demo",
      sourceName: spot.sourceName,
      sourceUrl: spot.sourceUrl,
      lastUpdated: spot.lastUpdated,
      updateFrequency: spot.updateFrequency,
      dataStatus: spot.dataStatus,
      reliabilityNote: spot.reliabilityNote,
      observedData: [
        ["VIX último cierre", formatVix(spot.latestVix)],
        ["Cambio 1D", formatChange(spot.change1d)],
        ["Cambio 5D", formatChange(spot.change5d)],
        ["Estado", "Normal"],
      ],
      interpretation: spot.interpretation,
    },
  };
}

export async function getVixData(): Promise<VixDashboardData> {
  const fallback = getFallbackModule();
  const history = await fetchVixHistory();

  if (history.length < 6) {
    logVixFallback("insufficient_valid_vix_history", {
      source: process.env.FRED_API_KEY ? "FRED API VIXCLS" : "FRED public CSV VIXCLS",
      validObservations: history.length,
    });
    return buildFallbackVixData(fallback);
  }

  const latest = history.at(-1);
  const previous = history.at(-2);
  if (!latest || !previous) {
    return buildFallbackVixData(fallback);
  }

  const change5d = history.length >= 6 ? latest.value - history[history.length - 6].value : null;
  const change21d = history.length >= 22 ? latest.value - history[history.length - 22].value : null;
  const percentile = percentileFor(history, latest.value);
  const state = vixStateFor(latest.value);
  const trend = vixTrendFor(change5d);
  const lastUpdated = `Último cierre disponible: ${formatDate(latest.date)}`;

  const spot: VixSpotData = {
    sourceName: "FRED VIXCLS",
    sourceUrl: FRED_VIX_SOURCE_URL,
    lastUpdated,
    updateFrequency: "Actualización diaria con último cierre disponible",
    dataStatus: "automated",
    reliabilityNote: "Dato diario de cierre publicado por FRED. Puede tener retraso, revisiones o días sin observación; no representa cotización intradía.",
    latestVix: latest.value,
    previousVix: previous.value,
    change1d: latest.value - previous.value,
    change5d,
    change21d,
    vixPercentile: percentile,
    vixState: state,
    vixTrend: trend,
    history: history.slice(-60),
    interpretation: {
      lookingAt: "Último cierre disponible del VIX y cambios recientes de volatilidad implícita del S&P 500.",
      why: "El VIX resume expectativas de volatilidad implícita. Es una lectura de presión de riesgo, no una predicción de dirección del mercado.",
      how: "Lectura aproximada basada en umbrales habituales y datos históricos. VIX bajo sugiere menor presión; VIX alto sugiere más tensión de volatilidad.",
      whatItDoesNotMean: "No predice dirección, no recomienda comprar o vender y no sustituye una lectura completa de escenario.",
    },
  };

  const stateLabel = state === "stress" ? "Estrés" : state === "attention" ? "Atención" : "Normal";
  return {
    spot,
    termStructure: buildTermStructureFallback(latest.value, lastUpdated),
    module: {
      ...fallback,
      title: "VIX / volatilidad",
      status: stateLabel,
      sourceName: spot.sourceName,
      sourceUrl: spot.sourceUrl,
      lastUpdated,
      updateFrequency: spot.updateFrequency,
      dataStatus: spot.dataStatus,
      reliabilityNote: spot.reliabilityNote,
      observedData: [
        ["VIX último cierre", formatVix(spot.latestVix)],
        ["Cambio 1D", formatChange(spot.change1d)],
        ["Cambio 5D", formatChange(spot.change5d)],
        ["Cambio 21D", formatChange(spot.change21d)],
        ["Estado", stateLabel],
      ],
      interpretation: spot.interpretation,
    },
  };
}
