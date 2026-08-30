import type { DashboardModuleData, LegacyVixTermStructureData, VixDashboardData, VixHistoryPoint, VixSpotData } from "@/lib/dashboard/types";

type VixFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type GetVixDataOptions = { fetcher?: VixFetch };

const FRED_VIX_SOURCE_URL = "https://fred.stlouisfed.org/series/VIXCLS";
const FRED_VIX_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS";
const FRED_TIMEOUT_MS = 8000;
const MIN_ANALYTICAL_HISTORY = 6;
const RECENT_SESSION_COUNT = 24;

function logVixSourceIssue(reason: string, details: Record<string, unknown> = {}) {
  console.warn("[dashboard:vix]", { reason, ...details });
}

function parseVixValue(value: string) {
  if (!value || value === ".") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isValidObservationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeVixHistory(points: VixHistoryPoint[]) {
  const byDate = new Map<string, VixHistoryPoint>();
  for (const point of points) {
    if (!isValidObservationDate(point.date) || !Number.isFinite(point.value) || point.value < 0) continue;
    byDate.set(point.date, { date: point.date, value: point.value });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function parseFredCsv(csv: string): VixHistoryPoint[] {
  const rows = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (rows.length < 2) return [];
  return normalizeVixHistory(rows.slice(1).flatMap((line) => {
    const separator = line.indexOf(",");
    if (separator < 0) return [];
    const date = line.slice(0, separator).trim();
    const value = parseVixValue(line.slice(separator + 1).trim());
    return value === null ? [] : [{ date, value }];
  }));
}

async function fetchFredPublicCsv(fetcher: VixFetch): Promise<VixHistoryPoint[]> {
  const response = await fetcher(FRED_VIX_CSV_URL, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(FRED_TIMEOUT_MS) });
  const text = await response.text();
  if (!response.ok) {
    logVixSourceIssue("fred_csv_error", { source: "FRED public CSV VIXCLS", status: response.status });
    return [];
  }
  return parseFredCsv(text);
}

export async function fetchVixHistory({ fetcher = fetch }: GetVixDataOptions = {}) {
  try {
    return await fetchFredPublicCsv(fetcher);
  } catch (error) {
    logVixSourceIssue("fred_csv_request_failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return [];
  }
}

export function formatVixObservationDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatVix(value: number | null) {
  return value === null ? "Dato no disponible temporalmente" : value.toFixed(1);
}

function formatChange(value: number | null) {
  if (value === null) return "Historial insuficiente";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function vixLevelFor(latestVix: number): Pick<VixSpotData, "vixLevelLabel" | "vixSeverity" | "vixDescription"> {
  if (latestVix >= 40) return { vixLevelLabel: "Estrés extremo", vixSeverity: "extreme", vixDescription: "Lectura excepcionalmente elevada de volatilidad implícita." };
  if (latestVix >= 30) return { vixLevelLabel: "Estrés", vixSeverity: "stress", vixDescription: "Volatilidad implícita alta, normalmente asociada a mayor demanda de protección." };
  if (latestVix >= 25) return { vixLevelLabel: "Tensión", vixSeverity: "elevated", vixDescription: "Presión de volatilidad elevada frente a condiciones normales." };
  if (latestVix >= 20) return { vixLevelLabel: "Vigilancia", vixSeverity: "watch", vixDescription: "La volatilidad entra en una zona donde suele aumentar la sensibilidad del mercado." };
  if (latestVix >= 16) return { vixLevelLabel: "Normal alto", vixSeverity: "watch", vixDescription: "Volatilidad todavía moderada, pero acercándose a zona de vigilancia." };
  if (latestVix >= 12) return { vixLevelLabel: "Normal bajo", vixSeverity: "normal", vixDescription: "Entorno de volatilidad contenido." };
  return { vixLevelLabel: "Complacencia", vixSeverity: "low", vixDescription: "Volatilidad implícita muy baja frente a rangos habituales." };
}

function relativeChange(current: number, previous: number | null | undefined) {
  return !previous || previous <= 0 ? null : ((current - previous) / previous) * 100;
}

function vixTrendFor(change1dPct: number | null, change5dPct: number | null): VixSpotData["vixTrend"] {
  if (change5dPct === null && change1dPct === null) return "stable";
  if ((change5dPct ?? -Infinity) >= 15 || (change1dPct ?? -Infinity) >= 8) return "rising_fast";
  if ((change5dPct ?? -Infinity) >= 5) return "rising";
  if ((change5dPct ?? Infinity) <= -10) return "falling";
  return "stable";
}

function percentileFor(history: VixHistoryPoint[], latestVix: number) {
  return history.length < 252 ? null : (history.filter((point) => point.value <= latestVix).length / history.length) * 100;
}

function percentileLabelFor(percentile: number | null) {
  if (percentile === null) return "Historial insuficiente";
  if (percentile >= 95) return "Extremo frente a su historia";
  if (percentile >= 80) return "Alto frente a su historia";
  if (percentile >= 60) return "Por encima de lo habitual";
  if (percentile >= 25) return "En rango habitual";
  return "Bajo frente a su historia reciente";
}

function compositeReadingFor(latestVix: number, level: Pick<VixSpotData, "vixLevelLabel" | "vixSeverity">, percentile: number | null, trend: VixSpotData["vixTrend"]): Pick<VixSpotData, "vixCompositeLabel" | "vixCompositeSubtext" | "vixSeverity"> {
  if (latestVix >= 40) return { vixCompositeLabel: "Estrés extremo", vixCompositeSubtext: "Lectura excepcional de presión de volatilidad.", vixSeverity: "extreme" };
  if (latestVix >= 30) return { vixCompositeLabel: "Estrés", vixCompositeSubtext: "Mayor demanda implícita de protección.", vixSeverity: "stress" };
  if (latestVix >= 25) return { vixCompositeLabel: "Tensión", vixCompositeSubtext: "Estrés de mercado por encima de rangos normales.", vixSeverity: "elevated" };
  if (latestVix >= 20) return { vixCompositeLabel: "Vigilancia", vixCompositeSubtext: trend === "rising" || trend === "rising_fast" ? "Presión de volatilidad en aumento." : "Volatilidad en zona de mayor sensibilidad.", vixSeverity: "watch" };
  if (latestVix >= 18 && (trend === "rising" || trend === "rising_fast" || (percentile ?? 0) > 60)) return { vixCompositeLabel: "Vigilancia", vixCompositeSubtext: "Volatilidad acercándose a zona de tensión.", vixSeverity: "watch" };
  if (latestVix >= 18) return { vixCompositeLabel: "Normal alto", vixCompositeSubtext: "Cerca de zona de vigilancia.", vixSeverity: "watch" };
  return { vixCompositeLabel: level.vixLevelLabel, vixCompositeSubtext: level.vixSeverity === "low" ? "Volatilidad implícita muy contenida." : "Presión de volatilidad contenida.", vixSeverity: level.vixSeverity };
}

function buildTermStructureFallback(latestVix: number | null, lastUpdated: string): LegacyVixTermStructureData {
  return {
    sourceName: "CBOE / VIX futures term structure", sourceUrl: "https://www.cboe.com/tradable_products/vix/", lastUpdated,
    updateFrequency: "Pendiente de proveedor estable", dataStatus: "live_pending",
    reliabilityNote: "Estructura preparada para VIX futures cercanos. No se automatiza hasta validar permisos, proveedor y timestamp sin scraping frágil.",
    spot: latestVix, futureMonth1: null, futureMonth2: null, spreadM2M1: null, curveState: "live_pending",
    interpretation: {
      lookingAt: "Relación entre VIX spot y futuros cercanos para observar si se paga más por protección cercana o futura.",
      why: "Ayuda a diferenciar tensión inmediata de una curva más normalizada.", how: "Contango suele asociarse con menor tensión inmediata; backwardation suele indicar más estrés cercano.",
      whatItDoesNotMean: "No anticipa por sí sola la dirección del mercado ni marca puntos de entrada o salida.",
    },
  };
}

function buildModule(spot: VixSpotData): DashboardModuleData {
  return {
    id: "vix", title: "VIX / volatilidad",
    status: spot.dataStatus === "automated" ? "Datos automatizados" : spot.latestVix === null ? "Datos temporalmente no disponibles" : "Datos con retraso",
    sourceName: spot.sourceName, sourceUrl: spot.sourceUrl, lastUpdated: spot.lastUpdated, updateFrequency: spot.updateFrequency,
    dataStatus: spot.dataStatus, reliabilityNote: spot.reliabilityNote,
    observedData: [["VIX último cierre", formatVix(spot.latestVix)], ["Cambio 1D", formatChange(spot.change1d)], ["Cambio 5D", formatChange(spot.change5d)], ["Cambio 21D", formatChange(spot.change21d)], ["Lectura", spot.vixCompositeLabel]],
    interpretation: spot.interpretation,
  };
}

function unavailableVixData(): VixDashboardData {
  const lastUpdated = "Sin observación válida disponible";
  const spot: VixSpotData = {
    sourceName: "FRED VIXCLS", sourceUrl: FRED_VIX_SOURCE_URL, lastUpdated, updateFrequency: "Diaria · último cierre disponible", dataStatus: "unavailable",
    reliabilityNote: "La fuente oficial no devolvió un historial válido. No se sustituyen valores, métricas ni gráficos con datos fabricados.",
    lastObservationDate: null, latestVix: null, previousVix: null, change1d: null, change5d: null, change21d: null, vixPercentile: null,
    vixLevelLabel: "No disponible", vixSeverity: "normal", vixDescription: "Datos temporalmente no disponibles.",
    vixCompositeLabel: "No disponible", vixCompositeSubtext: "Datos temporalmente no disponibles. La lectura se reanudará cuando FRED publique un historial válido.",
    vixPercentileLabel: "No disponible", vixTrend: "stable", history: [],
    interpretation: {
      lookingAt: "Último cierre disponible del VIX y cambios recientes de volatilidad implícita del S&P 500.", why: "El VIX resume expectativas de volatilidad implícita y ayuda a leer presión de riesgo.",
      how: "La lectura permanece no disponible mientras no exista un historial oficial válido.", whatItDoesNotMean: "La ausencia temporal del dato no permite inferir un nivel, tendencia o dirección de mercado.",
    },
  };
  return { spot, termStructure: buildTermStructureFallback(null, lastUpdated), module: buildModule(spot) };
}

export function buildVixDashboardData(rawHistory: VixHistoryPoint[]): VixDashboardData {
  const history = normalizeVixHistory(rawHistory);
  if (history.length < MIN_ANALYTICAL_HISTORY) return unavailableVixData();
  const latest = history.at(-1);
  const previous = history.at(-2);
  if (!latest || !previous) return unavailableVixData();
  const percentile = percentileFor(history, latest.value);
  const level = vixLevelFor(latest.value);
  const trend = vixTrendFor(relativeChange(latest.value, previous.value), relativeChange(latest.value, history.at(-6)?.value));
  const composite = compositeReadingFor(latest.value, level, percentile, trend);
  const lastUpdated = `Último cierre disponible: ${formatVixObservationDate(latest.date)}`;
  const spot: VixSpotData = {
    sourceName: "FRED VIXCLS", sourceUrl: FRED_VIX_SOURCE_URL, lastUpdated, updateFrequency: "Diaria · último cierre disponible", dataStatus: "automated",
    reliabilityNote: "Dato diario de cierre publicado por FRED. Puede tener retraso, revisiones o días sin observación; no representa cotización intradía.",
    lastObservationDate: latest.date, latestVix: latest.value, previousVix: previous.value, change1d: latest.value - previous.value,
    change5d: latest.value - history[history.length - 6].value, change21d: history.length >= 22 ? latest.value - history[history.length - 22].value : null,
    vixPercentile: percentile, vixLevelLabel: level.vixLevelLabel, vixSeverity: composite.vixSeverity, vixDescription: level.vixDescription,
    vixCompositeLabel: composite.vixCompositeLabel, vixCompositeSubtext: composite.vixCompositeSubtext, vixPercentileLabel: percentileLabelFor(percentile), vixTrend: trend,
    history: history.slice(-RECENT_SESSION_COUNT),
    interpretation: {
      lookingAt: "Último cierre disponible del VIX y cambios recientes de volatilidad implícita del S&P 500.",
      why: "El VIX resume expectativas de volatilidad implícita del S&P 500 a partir de opciones. Es una lectura de presión de riesgo, no una lectura de dirección del mercado.",
      how: "Lectura compuesta basada en nivel absoluto, percentil histórico y momentum reciente. Niveles más altos suelen sugerir más tensión de volatilidad.",
      whatItDoesNotMean: "Un VIX alto no significa automáticamente caída futura del mercado. Un VIX bajo tampoco elimina el riesgo. Mide expectativas implícitas de volatilidad, no dirección ni retorno esperado.",
    },
  };
  return { spot, termStructure: buildTermStructureFallback(latest.value, lastUpdated), module: buildModule(spot) };
}

export async function getVixData(options: GetVixDataOptions = {}): Promise<VixDashboardData> {
  const history = await fetchVixHistory(options);
  if (history.length < MIN_ANALYTICAL_HISTORY) logVixSourceIssue("insufficient_valid_vix_history", { source: "FRED VIXCLS", validObservations: history.length });
  return buildVixDashboardData(history);
}
