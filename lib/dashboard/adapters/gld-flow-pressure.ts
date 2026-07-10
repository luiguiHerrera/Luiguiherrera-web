import ExcelJS from "exceljs";
import type { GldFlowPressure, GldFlowPressurePoint, GldPressureState } from "@/lib/dashboard/types";

const SOURCE_URL = "https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx";
const SOURCE_NAME = "State Street / SPDR Gold Shares" as const;
const REQUIRED_HEADERS = ["date", "nav", "shares outstanding", "total net assets"] as const;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_FILE_BYTES = 2_000_000;
const MIN_OBSERVATIONS = 21;
const NEUTRAL_BAND = 0.0005;
const STALE_AFTER_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_AUM_GAP_PCT = 0.01;

const sourceNote = "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.";
const reliabilityNote = "Proxy de presión de flujos: prioriza cambios en participaciones en circulación. NAV y activos netos se usan solo como control de coherencia; no se interpreta el cambio de AUM como flujo.";

function pendingResult(reason: string, asOf: string | null = null): GldFlowPressure {
  return {
    asOf,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    dataStatus: "pending",
    nav: null,
    sharesOutstanding: null,
    totalNetAssets: null,
    oneDayShareChange: null,
    fiveDayShareChange: null,
    twentyDayShareChange: null,
    oneDayShareChangePct: null,
    fiveDayShareChangePct: null,
    twentyDayShareChangePct: null,
    oneDayImpliedPressureUsd: null,
    fiveDayImpliedPressureUsd: null,
    twentyDayImpliedPressureUsd: null,
    pressureState: "pending",
    pressureLabel: "Dato pendiente",
    summary: "El proxy de presión de flujos en GLD está pendiente porque la fuente no está disponible o no contiene historial suficiente.",
    sourceNote,
    reliabilityNote: `${reliabilityNote} ${reason}`,
    history: [],
  };
}

function normalizeHeader(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function cellNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateFromCell(value: unknown, text: unknown) {
  const date = value instanceof Date ? value : new Date(`${String(text ?? "").trim()} UTC`);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseWorksheet(worksheet: ExcelJS.Worksheet) {
  let headerRowNumber: number | null = null;
  const columns = new Map<string, number>();

  worksheet.eachRow((row, rowNumber) => {
    if (headerRowNumber !== null || rowNumber > 25) return;
    row.eachCell((cell, columnNumber) => {
      const header = normalizeHeader(cell.text);
      if (REQUIRED_HEADERS.includes(header as (typeof REQUIRED_HEADERS)[number])) columns.set(header, columnNumber);
    });
    if (REQUIRED_HEADERS.every((header) => columns.has(header))) headerRowNumber = rowNumber;
  });

  if (headerRowNumber === null || !REQUIRED_HEADERS.every((header) => columns.has(header))) {
    throw new Error("Columnas obligatorias no disponibles");
  }

  const points: GldFlowPressurePoint[] = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const dateCell = row.getCell(columns.get("date")!);
    const date = dateFromCell(dateCell.value, dateCell.text);
    const nav = cellNumber(row.getCell(columns.get("nav")!).value);
    const sharesOutstanding = cellNumber(row.getCell(columns.get("shares outstanding")!).value);
    const totalNetAssets = cellNumber(row.getCell(columns.get("total net assets")!).value);
    if (!date || nav === null || sharesOutstanding === null || totalNetAssets === null) continue;
    if (nav <= 0 || sharesOutstanding <= 0 || totalNetAssets <= 0) continue;
    points.push({ date, nav, sharesOutstanding, totalNetAssets });
  }

  return [...new Map(points.map((point) => [point.date, point])).values()].sort((a, b) => a.date.localeCompare(b.date));
}

function windowMetrics(points: GldFlowPressurePoint[], sessions: number) {
  const latest = points.at(-1);
  const previous = points.at(-(sessions + 1));
  if (!latest || !previous) return { change: null, changePct: null, impliedUsd: null };
  const change = latest.sharesOutstanding - previous.sharesOutstanding;
  return {
    change,
    changePct: change / previous.sharesOutstanding,
    impliedUsd: change * latest.nav,
  };
}

function classify(fiveDay: number | null, twentyDay: number | null): GldPressureState {
  if (fiveDay === null || twentyDay === null) return "pending";
  if (Math.abs(fiveDay) <= NEUTRAL_BAND) return "neutral";
  if (fiveDay > NEUTRAL_BAND && twentyDay >= -NEUTRAL_BAND) return "inflow";
  if (fiveDay < -NEUTRAL_BAND && twentyDay <= NEUTRAL_BAND) return "outflow";
  return "neutral";
}

function stateCopy(state: GldPressureState) {
  if (state === "inflow") return { label: "Entrada neta probable", summary: "GLD muestra entrada neta probable a 5 sesiones, usando cambios en participaciones como proxy de presión de flujos." };
  if (state === "outflow") return { label: "Salida neta probable", summary: "GLD muestra salida neta probable a 5 sesiones, usando cambios en participaciones como proxy de presión de flujos." };
  if (state === "neutral") return { label: "Presión neutral", summary: "GLD muestra presión neutral o señales contrapuestas, usando cambios en participaciones como proxy de presión de flujos." };
  return { label: "Dato pendiente", summary: "El proxy de presión de flujos en GLD está pendiente porque la fuente no está disponible o no contiene historial suficiente." };
}

export async function getGldFlowPressure(): Promise<GldFlowPressure> {
  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return pendingResult(`La fuente respondió HTTP ${response.status}.`);

    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_FILE_BYTES) return pendingResult("El archivo supera el tamaño máximo permitido.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_BYTES) return pendingResult("El archivo recibido tiene un tamaño inválido.");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return pendingResult("El archivo no contiene una hoja de datos.");
    const points = parseWorksheet(worksheet);
    const latest = points.at(-1);
    if (!latest || points.length < MIN_OBSERVATIONS) return pendingResult("Historial insuficiente.", latest?.date ?? null);

    const recent = points.slice(-MIN_OBSERVATIONS);
    const inconsistent = recent.some((point) => Math.abs(point.nav * point.sharesOutstanding - point.totalNetAssets) / point.totalNetAssets > MAX_AUM_GAP_PCT);
    if (inconsistent) return pendingResult("La comprobación entre NAV, participaciones y activos netos no es consistente.", latest.date);

    const oneDay = windowMetrics(points, 1);
    const fiveDay = windowMetrics(points, 5);
    const twentyDay = windowMetrics(points, 20);
    const pressureState = classify(fiveDay.changePct, twentyDay.changePct);
    const copy = stateCopy(pressureState);
    const timestamp = Date.parse(`${latest.date}T23:59:59Z`);
    const dataStatus = Date.now() - timestamp > STALE_AFTER_MS ? "delayed" : "available";

    return {
      asOf: latest.date,
      source: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      dataStatus,
      nav: latest.nav,
      sharesOutstanding: latest.sharesOutstanding,
      totalNetAssets: latest.totalNetAssets,
      oneDayShareChange: oneDay.change,
      fiveDayShareChange: fiveDay.change,
      twentyDayShareChange: twentyDay.change,
      oneDayShareChangePct: oneDay.changePct,
      fiveDayShareChangePct: fiveDay.changePct,
      twentyDayShareChangePct: twentyDay.changePct,
      oneDayImpliedPressureUsd: oneDay.impliedUsd,
      fiveDayImpliedPressureUsd: fiveDay.impliedUsd,
      twentyDayImpliedPressureUsd: twentyDay.impliedUsd,
      pressureState,
      pressureLabel: copy.label,
      summary: copy.summary,
      sourceNote,
      reliabilityNote,
      history: points.slice(-20),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error desconocido";
    console.warn("[dashboard:gld-flow-pressure]", { reason });
    return pendingResult("La fuente no pudo procesarse temporalmente.");
  }
}
