import { dashboardModules } from "@/lib/dashboard/manual-data";
import type { DashboardModuleData, FedWatchDashboardData, FedWatchData, FedWatchMeeting, FedWatchRateRange } from "@/lib/dashboard/types";

const CME_FEDWATCH_PUBLIC_URL = "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html";
const REQUEST_TIMEOUT_MS = 8000;
const FALLBACK_MESSAGE = "Datos automáticos de FedWatch no disponibles temporalmente. Mostrando estructura educativa.";

type UnknownRecord = Record<string, unknown>;

function getFallbackModule() {
  const fallback = dashboardModules.find((module) => module.id === "rates");
  if (!fallback) {
    throw new Error("Missing FedWatch fallback module");
  }
  return fallback;
}

function logFedWatch(message: string, details: Record<string, unknown> = {}) {
  console.info("[dashboard:fedwatch]", { message, ...details });
}

function logFedWatchFallback(reason: string, details: Record<string, unknown> = {}) {
  console.warn("[dashboard:fedwatch]", { reason, ...details });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProbability(value: unknown) {
  const parsed = asNumber(value);
  if (parsed === null) return null;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function parseRangeLabel(label: string): Pick<FedWatchRateRange, "lowerBps" | "upperBps"> {
  const match = label.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!match) return { lowerBps: null, upperBps: null };
  return {
    lowerBps: Math.round(Number(match[1])),
    upperBps: Math.round(Number(match[2])),
  };
}

function rangeMidpoint(range: Pick<FedWatchRateRange, "lowerBps" | "upperBps">) {
  if (range.lowerBps === null || range.upperBps === null) return null;
  return (range.lowerBps + range.upperBps) / 2;
}

function convictionFor(probability: number | null): FedWatchMeeting["conviction"] {
  if (probability === null || probability < 50) return "Baja / dispersa";
  if (probability < 75) return "Media";
  return "Alta";
}

function extractArrayByKeys(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    const candidate = payload[key];
    if (Array.isArray(candidate)) return candidate;
  }
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.some(isRecord)) return value;
  }
  return [];
}

function extractDate(record: UnknownRecord) {
  return (
    asString(record.date) ??
    asString(record.meetingDate) ??
    asString(record.fomcDate) ??
    asString(record.eventDate) ??
    asString(record.expirationDate) ??
    "Fecha pendiente"
  );
}

function rangeFromRecord(record: UnknownRecord): FedWatchRateRange | null {
  const label =
    asString(record.range) ??
    asString(record.targetRange) ??
    asString(record.targetRate) ??
    asString(record.rateRange) ??
    asString(record.label) ??
    asString(record.name);
  const probability =
    normalizeProbability(record.probability) ??
    normalizeProbability(record.prob) ??
    normalizeProbability(record.percent) ??
    normalizeProbability(record.value);

  if (!label || probability === null) return null;
  return { label, probability, ...parseRangeLabel(label) };
}

function rangesFromMeeting(record: UnknownRecord): FedWatchRateRange[] {
  const rangesArray =
    asArray(record.ranges).length > 0 ? asArray(record.ranges) :
    asArray(record.probabilities).length > 0 ? asArray(record.probabilities) :
    asArray(record.targetRateProbabilities).length > 0 ? asArray(record.targetRateProbabilities) :
    asArray(record.outcomes);

  const fromArray = rangesArray
    .map((item) => (isRecord(item) ? rangeFromRecord(item) : null))
    .filter((range): range is FedWatchRateRange => range !== null);
  if (fromArray.length > 0) return fromArray.sort((a, b) => b.probability - a.probability);

  const nested = Object.entries(record)
    .map(([label, probability]) => {
      const parsed = normalizeProbability(probability);
      return parsed === null || !/\d+\s*[-–]\s*\d+/.test(label) ? null : { label, probability: parsed, ...parseRangeLabel(label) };
    })
    .filter((range): range is FedWatchRateRange => range !== null);

  return nested.sort((a, b) => b.probability - a.probability);
}

function aggregateCutPauseHike(ranges: FedWatchRateRange[], currentRange: string | null) {
  if (!currentRange) return { cutProbability: null, pauseProbability: null, hikeProbability: null };
  const currentMidpoint = rangeMidpoint(parseRangeLabel(currentRange));
  if (currentMidpoint === null) return { cutProbability: null, pauseProbability: null, hikeProbability: null };

  return ranges.reduce(
    (totals, range) => {
      const midpoint = rangeMidpoint(range);
      if (midpoint === null) return totals;
      if (midpoint < currentMidpoint) return { ...totals, cutProbability: totals.cutProbability + range.probability };
      if (midpoint > currentMidpoint) return { ...totals, hikeProbability: totals.hikeProbability + range.probability };
      return { ...totals, pauseProbability: totals.pauseProbability + range.probability };
    },
    { cutProbability: 0, pauseProbability: 0, hikeProbability: 0 },
  );
}

function meetingFromRecord(record: UnknownRecord, currentRange: string | null): FedWatchMeeting | null {
  const ranges = rangesFromMeeting(record);
  if (ranges.length === 0) return null;
  const dominant = ranges[0];
  const aggregates = aggregateCutPauseHike(ranges, currentRange);

  return {
    date: extractDate(record),
    dominantRange: dominant.label,
    dominantProbability: dominant.probability,
    conviction: convictionFor(dominant.probability),
    ranges,
    ...aggregates,
  };
}

function inferReading(nextMeeting: FedWatchMeeting | null): Pick<FedWatchData, "readingLabel" | "readingSubtext"> {
  if (!nextMeeting || nextMeeting.cutProbability === null || nextMeeting.pauseProbability === null || nextMeeting.hikeProbability === null) {
    return {
      readingLabel: "Estructura educativa",
      readingSubtext: "Probabilidades automáticas pendientes de una fuente CME configurada.",
    };
  }

  if (nextMeeting.pauseProbability > 70) {
    return {
      readingLabel: "Pausa esperada",
      readingSubtext: "El mercado asigna mayor probabilidad a mantener el rango actual.",
    };
  }
  if (nextMeeting.cutProbability > 50) {
    return {
      readingLabel: "Recorte esperado",
      readingSubtext: "Las expectativas se inclinan hacia una política menos restrictiva.",
    };
  }
  if (nextMeeting.hikeProbability > 30) {
    return {
      readingLabel: "Riesgo de subida",
      readingSubtext: "El mercado asigna probabilidad relevante a una política más restrictiva.",
    };
  }
  return {
    readingLabel: "Expectativas mixtas",
    readingSubtext: "Las probabilidades están repartidas entre varios rangos.",
  };
}

function firstRelevantCut(meetings: FedWatchMeeting[]) {
  return meetings.find((meeting) => (meeting.cutProbability ?? 0) >= 50)?.date ?? null;
}

function shapeSummary(payload: unknown) {
  if (Array.isArray(payload)) return `array:${payload.length}`;
  if (isRecord(payload)) return `object:${Object.keys(payload).slice(0, 8).join(",")}`;
  return typeof payload;
}

function envLength(value: string | undefined) {
  return value ? value.length : 0;
}

function endpointWithForecasts(baseUrl: string) {
  const clean = baseUrl.replace(/\/+$/, "").replace(/\/forecasts$/, "");
  return `${clean}/forecasts`;
}

function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function logFedWatchEnv() {
  const apiUrl = process.env.CME_FEDWATCH_API_URL;
  const tokenUrl = process.env.CME_OAUTH_TOKEN_URL;
  const clientId = process.env.CME_FEDWATCH_CLIENT_ID;
  const clientSecret = process.env.CME_FEDWATCH_CLIENT_SECRET;

  logFedWatch("cme_fedwatch_env", {
    hasApiUrl: Boolean(apiUrl),
    hasOAuthTokenUrl: Boolean(tokenUrl),
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    clientIdLength: envLength(clientId),
    clientSecretLength: envLength(clientSecret),
    authMode: tokenUrl && clientId && clientSecret ? "oauth" : clientId && clientSecret ? "basic" : "none",
    endpointFinal: apiUrl ? endpointWithForecasts(apiUrl) : null,
  });
}

async function fetchCmeAccessToken() {
  const tokenUrl = process.env.CME_OAUTH_TOKEN_URL;
  const clientId = process.env.CME_FEDWATCH_CLIENT_ID;
  const clientSecret = process.env.CME_FEDWATCH_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    if (clientId && clientSecret && !tokenUrl) {
      logFedWatchFallback("auth_mode_mismatch_possible", {
        hasOAuthTokenUrl: false,
        hasClientId: true,
        hasClientSecret: true,
        note: "Client credentials exist but no OAuth token URL is configured.",
      });
    }
    logFedWatchFallback("missing_cme_oauth_config", {
      hasOAuthTokenUrl: Boolean(tokenUrl),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      clientIdLength: envLength(clientId),
      clientSecretLength: envLength(clientSecret),
    });
    return null;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    logFedWatchFallback("cme_oauth_non_json_response", {
      tokenStatus: response.status,
      textLength: text.length,
    });
    return null;
  }

  const accessToken = isRecord(json) ? asString(json.access_token) : null;
  const expiresIn = isRecord(json) ? asNumber(json.expires_in) : null;
  logFedWatch("cme_oauth_response", {
    tokenStatus: response.status,
    topLevelKeys: isRecord(json) ? Object.keys(json) : [],
    hasAccessToken: Boolean(accessToken),
    hasExpiresIn: expiresIn !== null,
  });

  if (!response.ok || !accessToken) {
    logFedWatchFallback("cme_oauth_failed", {
      tokenStatus: response.status,
      topLevelKeys: isRecord(json) ? Object.keys(json) : [],
      hasAccessToken: Boolean(accessToken),
    });
    return null;
  }

  return accessToken;
}

async function fetchCmeFedWatchPayload() {
  logFedWatchEnv();

  const apiUrl = process.env.CME_FEDWATCH_API_URL;
  if (!apiUrl) {
    logFedWatchFallback("missing_cme_fedwatch_endpoint", { expectedEnv: "CME_FEDWATCH_API_URL" });
    return null;
  }

  const accessToken = await fetchCmeAccessToken();
  if (!accessToken) {
    logFedWatchFallback("skip_fedwatch_request_without_access_token", {
      endpointFinal: endpointWithForecasts(apiUrl),
    });
    return null;
  }

  const endpoint = endpointWithForecasts(apiUrl);
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    logFedWatchFallback("cme_fedwatch_non_json_response", { endpoint, status: response.status, textLength: text.length });
    return null;
  }

  logFedWatch("cme_fedwatch_response", {
    endpoint,
    status: response.status,
    topLevelKeys: isRecord(json) ? Object.keys(json) : [],
    shape: shapeSummary(json),
  });

  if (!response.ok) {
    logFedWatchFallback("cme_fedwatch_http_error", {
      endpoint,
      status: response.status,
      likelyReason: response.status === 401 ? "token_rejected_or_invalid_credentials" : response.status === 403 ? "entitlement_missing_or_forbidden" : "endpoint_or_provider_error",
      topLevelKeys: isRecord(json) ? Object.keys(json) : [],
    });
    return null;
  }

  return json;
}

function buildDataFromPayload(payload: unknown, fallback: DashboardModuleData): FedWatchDashboardData | null {
  const currentRange =
    process.env.CME_FEDWATCH_CURRENT_RANGE ??
    (isRecord(payload) ? asString(payload.currentTargetRange) ?? asString(payload.currentRange) ?? asString(payload.targetRange) : null);
  const meetingRecords = extractArrayByKeys(payload, ["meetings", "data", "events", "fomcMeetings", "probabilities"]);
  const meetings = meetingRecords
    .map((record) => (isRecord(record) ? meetingFromRecord(record, currentRange) : null))
    .filter((meeting): meeting is FedWatchMeeting => meeting !== null)
    .slice(0, 5);

  logFedWatch("cme_fedwatch_parse", {
    meetingsDetected: meetings.length,
    rangesDetected: meetings.reduce((sum, meeting) => sum + meeting.ranges.length, 0),
    latestDate: meetings[0]?.date ?? null,
  });

  if (meetings.length === 0) return null;

  const reading = inferReading(meetings[0]);
  const data: FedWatchData = {
    sourceName: "CME FedWatch",
    sourceUrl: CME_FEDWATCH_PUBLIC_URL,
    lastUpdated: `Última actualización disponible: ${meetings[0].date}`,
    updateFrequency: "Diaria / según disponibilidad de la fuente",
    dataStatus: "automated",
    reliabilityNote: "Probabilidades implícitas en futuros de Fed Funds; sujetas a metodología y actualizaciones de CME.",
    currentTargetRange: currentRange,
    nextMeeting: meetings[0],
    meetings,
    policyPath: meetings.map((meeting) => `${meeting.date}: ${meeting.dominantRange}`),
    firstRelevantCutMeeting: firstRelevantCut(meetings),
    rawShapeSummary: shapeSummary(payload),
    interpretation: fallback.interpretation,
    ...reading,
  };

  return { fedWatch: data, module: buildModuleFromData(data, fallback) };
}

function formatPercent(value: number | null) {
  return value === null ? "No disponible" : `${value.toFixed(1)}%`;
}

function buildModuleFromData(data: FedWatchData, fallback: DashboardModuleData): DashboardModuleData {
  const next = data.nextMeeting;
  return {
    ...fallback,
    status: data.readingLabel,
    sourceName: data.sourceName,
    sourceUrl: data.sourceUrl,
    lastUpdated: data.lastUpdated,
    updateFrequency: data.updateFrequency,
    dataStatus: data.dataStatus,
    reliabilityNote: data.reliabilityNote,
    observedData: [
      ["Próxima reunión", next?.date ?? "Pendiente"],
      ["Rango dominante", next?.dominantRange ?? "Pendiente"],
      ["Probabilidad dominante", formatPercent(next?.dominantProbability ?? null)],
      ["Recorte", formatPercent(next?.cutProbability ?? null)],
      ["Pausa", formatPercent(next?.pauseProbability ?? null)],
      ["Subida", formatPercent(next?.hikeProbability ?? null)],
    ],
    interpretation: data.interpretation,
  };
}

function fallbackFedWatchData(fallback: DashboardModuleData, reason: string): FedWatchDashboardData {
  logFedWatchFallback("using_fedwatch_fallback", { reason });
  const meetings: FedWatchMeeting[] = [
    {
      date: "Ejemplo educativo",
      dominantRange: "No disponible",
      dominantProbability: null,
      cutProbability: null,
      pauseProbability: null,
      hikeProbability: null,
      conviction: "Baja / dispersa",
      ranges: [],
    },
  ];
  const data: FedWatchData = {
    sourceName: "CME FedWatch",
    sourceUrl: CME_FEDWATCH_PUBLIC_URL,
    lastUpdated: FALLBACK_MESSAGE,
    updateFrequency: "Diaria / según disponibilidad de la fuente",
    dataStatus: "live_pending",
    reliabilityNote: "Estructura preparada para CME FedWatch. No consulta datos automáticos hasta configurar un endpoint/credencial permitido.",
    currentTargetRange: null,
    nextMeeting: meetings[0],
    meetings,
    readingLabel: "Estructura educativa",
    readingSubtext: "FedWatch automático pendiente de acceso CME limpio y confirmado.",
    policyPath: [],
    firstRelevantCutMeeting: null,
    rawShapeSummary: "No se obtuvo respuesta CME.",
    interpretation: {
      lookingAt: "Probabilidades implícitas en futuros de Fed Funds para próximas reuniones de la Reserva Federal.",
      why: "Ayuda a leer expectativas de política monetaria observadas por el mercado.",
      how: "Convierte probabilidades por rango objetivo en una lectura compacta de recorte, pausa o subida cuando el rango actual está identificado.",
      whatItDoesNotMean: "Una probabilidad alta no garantiza la decisión de la Reserva Federal. Las expectativas pueden cambiar rápidamente con inflación, empleo, comunicación de la Fed y condiciones financieras.",
    },
  };
  return { fedWatch: data, module: buildModuleFromData(data, fallback) };
}

export async function getFedWatchData(): Promise<FedWatchDashboardData> {
  const fallback = getFallbackModule();

  try {
    const payload = await fetchCmeFedWatchPayload();
    if (!payload) return fallbackFedWatchData(fallback, "missing_or_unavailable_cme_payload");
    const parsed = buildDataFromPayload(payload, fallback);
    if (!parsed) return fallbackFedWatchData(fallback, "unparseable_cme_payload");
    return parsed;
  } catch (error) {
    return fallbackFedWatchData(fallback, error instanceof Error ? error.message : "unknown FedWatch error");
  }
}
