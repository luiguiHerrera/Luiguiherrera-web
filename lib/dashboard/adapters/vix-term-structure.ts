import type { VixTermStructureClassification, VixTermStructureData, VixTermStructurePoint } from "@/lib/dashboard/types";

export type CboeSettlementRow = {
  product: string;
  symbol: string;
  expirationDate: string;
  price: number | null;
};

const CBOE_SETTLEMENT_SOURCE_URL = "https://www.cboe.com/markets/us/futures/market-statistics/settlement/futures/daily/";
const CBOE_SETTLEMENT_CSV_URL = "https://www-api.cboe.com/us/futures/market_statistics/settlement/csv/";
const MONTHLY_VX_SYMBOL_PATTERN = /^VX\/[FGHJKMNQUVXZ][0-9]$/;
const MAX_MONTHLY_CONTRACTS = 9;
const REQUEST_TIMEOUT_MS = 8000;
const LOOKBACK_DAYS = 12;

function logVixTermStructure(details: Record<string, unknown>) {
  console.info("[dashboard:vix-term-structure]", details);
}

function emptyPoints(): VixTermStructurePoint[] {
  return [];
}

function buildFallbackData(sourceStatus: VixTermStructureData["sourceStatus"], reason: string): VixTermStructureData {
  logVixTermStructure({
    source: "cboe_settlement",
    reason,
    monthlyContractsFound: 0,
    selectedSymbols: [],
    sourceStatus,
  });

  return {
    source: "Cboe VIX Futures settlement prices",
    sourceUrl: CBOE_SETTLEMENT_SOURCE_URL,
    sourceStatus,
    lastUpdated: null,
    points: emptyPoints(),
    m1m2Spread: null,
    m1m2SlopePct: null,
    m1m3Spread: null,
    m1m3SlopePct: null,
    classification: "Pendiente",
    interpretation: "Estructura VIX pendiente de fuente automatizada estable.",
    whatItDoesNotMean:
      "La estructura temporal del VIX no predice por sí sola la dirección del mercado y no representa una señal de compra o venta.",
    reliabilityNote:
      "Fuente preparada sobre settlements diarios oficiales de Cboe CFE. Si la tabla no está disponible o cambia de formato, el módulo queda pendiente sin inventar datos.",
  };
}

function dateToQuery(date: Date) {
  return date.toISOString().slice(0, 10);
}

function recentSettlementDates() {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(12, 0, 0, 0);

  for (let offset = 0; offset < LOOKBACK_DAYS; offset += 1) {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() - offset);
    dates.push(dateToQuery(date));
  }

  return dates;
}

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

function parseSettlementPrice(value: string) {
  const cleaned = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0];
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function parseCboeSettlements(csv: string): CboeSettlementRow[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  const header = rows[0] ?? [];
  const indexes = new Map(header.map((value, index) => [normalizeHeader(value), index]));
  const productIndex = indexes.get("product");
  const symbolIndex = indexes.get("symbol");
  const expirationIndex = indexes.get("expirationdate");
  const priceIndex = indexes.get("price");

  if (
    productIndex === undefined ||
    symbolIndex === undefined ||
    expirationIndex === undefined ||
    priceIndex === undefined
  ) {
    return [];
  }

  return rows
    .slice(1)
    .map((row) => {
      const price = parseSettlementPrice(row[priceIndex] ?? "");

      return {
        product: row[productIndex] ?? "",
        symbol: row[symbolIndex] ?? "",
        expirationDate: row[expirationIndex] ?? "",
        price,
      };
    });
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function selectMonthlyVixContracts(
  rows: CboeSettlementRow[],
  settlementDate: string,
  limit = MAX_MONTHLY_CONTRACTS,
) {
  if (!isIsoDate(settlementDate) || limit <= 0) return [];

  const normalized = rows
    .map((row) => ({
      product: row.product.trim().toUpperCase(),
      symbol: row.symbol.trim().toUpperCase(),
      expirationDate: row.expirationDate.trim(),
      price: row.price !== null && Number.isFinite(row.price) ? row.price : null,
    }))
    .filter((row) => (
      row.product === "VX" &&
      MONTHLY_VX_SYMBOL_PATTERN.test(row.symbol) &&
      isIsoDate(row.expirationDate) &&
      row.expirationDate > settlementDate
    ))
    .sort((a, b) => (
      a.expirationDate.localeCompare(b.expirationDate) ||
      Number(b.price !== null) - Number(a.price !== null) ||
      a.symbol.localeCompare(b.symbol)
    ));
  const seenSymbols = new Set<string>();
  const seenExpirations = new Set<string>();

  return normalized
    .filter((row) => {
      if (seenSymbols.has(row.symbol) || seenExpirations.has(row.expirationDate)) return false;
      seenSymbols.add(row.symbol);
      seenExpirations.add(row.expirationDate);
      return true;
    })
    .slice(0, limit);
}

async function fetchSettlementCsv(date: string) {
  const url = `${CBOE_SETTLEMENT_CSV_URL}?dt=${encodeURIComponent(date)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "LuiguiHerreraDashboard/1.0 (market context dashboard)",
    },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    text,
  };
}

function contractLabel(expirationDate: string) {
  const date = new Date(`${expirationDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return expirationDate;
  return new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatSettlementDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

function classifySlope(slope: number | null): VixTermStructureClassification {
  if (slope === null) return "Pendiente";
  if (slope > 5) return "Fuerte contango";
  if (slope > 2) return "Contango moderado";
  if (slope >= -2) return "Plano";
  if (slope >= -5) return "Backwardation moderada";
  return "Backwardation fuerte";
}

function interpretationFor(classification: VixTermStructureClassification) {
  const normalized = classification.toLowerCase();
  if (normalized.includes("contango")) {
    return "Los contratos más largos cotizan por encima del vencimiento cercano. Es una estructura habitual en entornos de volatilidad más ordenada.";
  }
  if (normalized.includes("backwardation")) {
    return "Los contratos cercanos cotizan por encima de vencimientos posteriores. Suele aparecer en episodios de tensión o demanda elevada de cobertura inmediata.";
  }
  if (classification === "Plano") {
    return "La curva cercana está relativamente equilibrada. No domina una lectura clara de estructura temporal.";
  }
  return "Estructura VIX pendiente de fuente automatizada estable.";
}

export function buildDataFromContracts(contracts: CboeSettlementRow[], settlementDate: string): VixTermStructureData {
  const points: VixTermStructurePoint[] = contracts.slice(0, MAX_MONTHLY_CONTRACTS).map((contract, index) => ({
    label: `VX${index + 1}` as VixTermStructurePoint["label"],
    symbol: contract.symbol,
    contract: contractLabel(contract.expirationDate),
    expirationDate: contract.expirationDate,
    value: contract.price,
  }));
  const vx1 = points[0]?.value ?? null;
  const vx2 = points[1]?.value ?? null;
  const vx3 = points[2]?.value ?? null;
  const m1m2Spread = vx1 !== null && vx2 !== null ? vx2 - vx1 : null;
  const m1m2SlopePct = vx1 !== null && vx2 !== null && vx1 > 0 ? (vx2 / vx1 - 1) * 100 : null;
  const m1m3Spread = vx1 !== null && vx3 !== null ? vx3 - vx1 : null;
  const m1m3SlopePct = vx1 !== null && vx3 !== null && vx1 > 0 ? (vx3 / vx1 - 1) * 100 : null;
  const classification = classifySlope(m1m2SlopePct);

  return {
    source: "Cboe VIX Futures settlement prices",
    sourceUrl: CBOE_SETTLEMENT_SOURCE_URL,
    sourceStatus: "automated",
    lastUpdated: `Último settlement disponible: ${formatSettlementDate(settlementDate)}`,
    points,
    m1m2Spread,
    m1m2SlopePct,
    m1m3Spread,
    m1m3SlopePct,
    classification,
    interpretation: interpretationFor(classification),
    whatItDoesNotMean:
      "La estructura temporal del VIX no predice por sí sola la dirección del mercado y no representa una señal de compra o venta.",
    reliabilityNote:
      "Settlements diarios oficiales de Cboe CFE. La curva muestra hasta los nueve primeros contratos mensuales VX no vencidos y excluye contratos semanales.",
  };
}

export async function getVixTermStructureData(): Promise<VixTermStructureData> {
  try {
    for (const date of recentSettlementDates()) {
      const response = await fetchSettlementCsv(date);
      const rows = response.ok ? parseCboeSettlements(response.text) : [];
      const monthlyContracts = selectMonthlyVixContracts(rows, date, rows.length);
      const selectedContracts = monthlyContracts.slice(0, MAX_MONTHLY_CONTRACTS);
      const selectedSymbols = selectedContracts.map((row) => row.symbol);

      logVixTermStructure({
        source: "cboe_settlement",
        status: response.status,
        settlementDate: date,
        monthlyContractsFound: monthlyContracts.length,
        selectedSymbols,
        sourceStatus: selectedContracts.length > 0 ? "automated" : "pending",
      });

      if (selectedContracts.length > 0) {
        return buildDataFromContracts(selectedContracts, date);
      }
    }

    return buildFallbackData("pending", "insufficient_monthly_vx_contracts");
  } catch (error) {
    logVixTermStructure({
      source: "cboe_settlement",
      reason: "request_or_parse_failed",
      message: error instanceof Error ? error.message : "Unknown error",
      monthlyContractsFound: 0,
      selectedSymbols: [],
      sourceStatus: "unavailable",
    });
    return buildFallbackData("unavailable", "request_or_parse_failed");
  }
}
