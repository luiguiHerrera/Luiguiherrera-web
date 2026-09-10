import { PRICE_BASIS } from "./contract.ts";
import { bytesHash, finite, positive } from "./math.ts";
import { instant, validDate, weakest } from "./temporal.ts";
import type { ContractIdentity, Packet, Row, Temporal, VxPacket } from "./types.ts";
const record = (x: unknown): Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
const array = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const text = (x: unknown): string => typeof x === "string" ? x : "";
function bindSource(metadata: Temporal, sourceId: string): Temporal {
  return { ...metadata, sourceId: metadata.sourceId ?? sourceId, status: metadata.sourceId !== undefined && metadata.sourceId !== sourceId ? "SOURCE_ID_MISMATCH" : metadata.status ?? "AVAILABLE" };
}
export function parseNumericCell(value: unknown): number | null {
  if (finite(value)) return value;
  if (typeof value !== "string") return null;
  let s = value.trim().replaceAll(",", "");
  if (/^\([\d.]+\)$/.test(s)) s = "-" + s.slice(1, -1);
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s) && finite(Number(s)) ? Number(s) : null;
}
function dated(date: string): Row {
  return { observationDate: date, observationEndAt: date + "T23:59:59.999999Z", observationEndCertainty: "CONSERVATIVE_BOUND", sourcePublishedAt: null };
}
function parseJson(bytes: string): unknown { try { return JSON.parse(bytes); } catch { return null; } }
function csvRows(csv: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === "," || c === "\n")) { row.push(cell.replace(/\r$/, "")); cell = ""; if (c === "\n") { rows.push(row); row = []; } }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  if (quoted || !rows.length) return [];
  const headers = rows.shift()!.map(s => s.replace(/^\uFEFF/, "").trim());
  return rows.filter(r => r.length === headers.length).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
export function normalizeYahoo(bytes: string, metadata: Temporal, expectedTicker: string): Packet {
  metadata = bindSource(metadata, "EQUITY_ADJUSTED");
  const payload = record(parseJson(bytes)), chart = record(payload.chart), result = record(array(chart.result)[0]);
  const meta = record(result.meta), indicators = record(result.indicators), adjusted = array(record(array(indicators.adjclose)[0]).adjclose);
  const zone = text(meta.exchangeTimezoneName);
  let validZone = true; try { if (!zone) throw Error(); new Intl.DateTimeFormat("en", { timeZone: zone }); } catch { validZone = false; }
  const packet: Packet = { ...metadata, vintageHash: bytesHash(bytes), sourceField: "chart.result[0].indicators.adjclose[0].adjclose", seriesType: "ETF_ADJUSTED_PRICE", priceBasis: PRICE_BASIS, currency: text(meta.currency), rows: [], status: metadata.status ?? "AVAILABLE" };
  if (chart.error || !validZone || meta.symbol !== expectedTicker || meta.currency !== "USD") return { ...packet, status: "INVALID" };
  if (adjusted.length !== array(result.timestamp).length) packet.status = "MISALIGNED_ADJCLOSE_ARRAY";
  const dateFormatter = new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
  for (const [index, timestamp] of array(result.timestamp).entries()) {
    if (!finite(timestamp)) continue;
    const instant = new Date(timestamp * 1000);
    if (!finite(instant.valueOf())) continue;
    const parts = dateFormatter.formatToParts(instant);
    const value = (kind: string) => parts.find(p => p.type === kind)?.value;
    const date = `${value("year")}-${value("month")}-${value("day")}`;
    // No quote.close read exists on this path. Missing adjclose remains missing.
    packet.rows.push({ ...dated(date), adjusted_close: positive(adjusted[index]) ? adjusted[index] : null });
  }
  packet.declaredStart = packet.rows.map(r => r.observationDate!).sort()[0];
  return packet;
}
export function normalizeVixCsv(bytes: string, metadata: Temporal): Packet {
  metadata = bindSource(metadata, "VIX_OFFICIAL");
  const rows = csvRows(bytes).map(row => {
    const parts = /^([0-9]{1,2})\/([0-9]{1,2})\/(\d{4})$/.exec(row.DATE ?? "");
    const date = parts ? `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}` : "";
    const value = parseNumericCell(row.CLOSE);
    return { ...dated(date), value: positive(value) ? value : null };
  }).filter(r => validDate(r.observationDate));
  return { ...metadata, sourceField: "DATE,CLOSE", vintageHash: bytesHash(bytes), seriesType: "OFFICIAL_VIX_INDEX", rows, declaredStart: rows.map(r => r.observationDate!).sort()[0], status: metadata.status ?? "AVAILABLE" };
}
export type MonthlyHistory = { identity: ContractIdentity; metadata: Temporal; rows: Row[] };
export function normalizeVxHistory(bytes: string, identity: ContractIdentity, metadata: Temporal): MonthlyHistory {
  const month = Number(identity.expirationDate.slice(5, 7));
  const code = "FGHJKMNQUVXZ"[month - 1], name = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1];
  const expected = `${code} (${name} ${identity.expirationDate.slice(0, 4)})`;
  const validIdentity = validDate(identity.expirationDate) && identity.symbol === `VX/${code}${identity.expirationDate.slice(3, 4)}`;
  const rows = csvRows(bytes).map(row => ({ ...dated(row["Trade Date"]), settlement: parseNumericCell(row.Settle), status: validIdentity && row.Futures?.trim() === expected ? "AVAILABLE" : "CONTRACT_IDENTITY_MISMATCH" })).filter(row => validDate(row.observationDate));
  return { identity: { ...identity }, metadata: { ...bindSource(metadata, "VX_OFFICIAL"), vintageHash: bytesHash(bytes) }, rows };
}
export function normalizeMonthlyCatalog(payload: unknown): ContractIdentity[] {
  const entries = Array.isArray(payload) ? payload : Object.values(record(payload)).flatMap(array);
  return entries.map(record).filter(row => row.duration_type === "M" && row.futures_root === "VX" && validDate(row.expire_date)).map(row => ({ symbol: "VX/" + text(row.product_display).split("/").at(-1), expirationDate: text(row.expire_date) })).filter(row => /^VX\/[FGHJKMNQUVXZ]\d$/.test(row.symbol)).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
}
export function assembleVx(date: string, catalog: ContractIdentity[], catalogMetadata: Temporal, histories: MonthlyHistory[]): VxPacket {
  const expected = catalog.filter(r => /^VX\/[FGHJKMNQUVXZ]\d$/.test(r.symbol) && validDate(r.expirationDate) && r.expirationDate > date).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)).slice(0, 9);
  const catalogParent = bindSource(catalogMetadata, "VX_OFFICIAL");
  const latest = (parents: Temporal[], field: "availableAt" | "capturedAt" | "observationEndAt" | "sourcePublishedAt") => {
    const values = parents.map(p => p[field]);
    return values.every(v => instant(v) !== null) ? values.reduce((a, b) => instant(a)! >= instant(b)! ? a : b)! : null;
  };
  const lineage = (parents: Temporal[]): Temporal => {
    const availableAt = latest(parents, "availableAt");
    return { sourceId: "VX_OFFICIAL", sourceVersion: catalogMetadata.sourceVersion, vintageHash: bytesHash(JSON.stringify(parents.map(m => m.vintageHash))),
      availableAt, capturedAt: latest(parents, "capturedAt"), sourcePublishedAt: latest(parents, "sourcePublishedAt"),
      availabilityCertainty: availableAt !== null && parents.every(m => ["EXACT", "CONSERVATIVE_BOUND"].includes(m.availabilityCertainty ?? "UNKNOWN")) ? "CONSERVATIVE_BOUND" : "UNKNOWN",
      replayClass: weakest(parents.map(m => m.replayClass)), availabilityEvidence: parents.every(m => !!m.availabilityEvidence) ? parents.map(m => m.availabilityEvidence).join(";") : undefined,
      status: parents.some(m => m.status && m.status !== "AVAILABLE") ? "INVALID_PARENT" : "AVAILABLE" };
  };
  const contracts = expected.map(identity => {
    const matches = histories.filter(h => h.identity.symbol === identity.symbol && h.identity.expirationDate === identity.expirationDate);
    const history = matches.length === 1 ? matches[0] : undefined;
    const rows = history?.rows.filter(r => r.observationDate === date) ?? [];
    const value = rows.length === 1 ? rows[0].settlement : null;
    const parent = bindSource(history?.metadata ?? {}, "VX_OFFICIAL");
    const row = rows.length === 1 ? { ...parent, ...rows[0] } : { ...parent, status: "MISSING_OR_DUPLICATE_CONTRACT_ROW" };
    const provenanceConflict = rows[0]?.sourceId !== undefined && rows[0].sourceId !== parent.sourceId;
    const ancestry = lineage([catalogParent, parent, row]);
    return { ...identity, ...dated(date), ...ancestry, observationEndAt: row.observationEndAt ?? date + "T23:59:59.999999Z",
      status: provenanceConflict ? "SOURCE_ID_MISMATCH" : ancestry.status, settlement: positive(value) ? value : null };
  });
  const coreLineage = lineage([catalogParent, ...contracts.slice(0, 2)]);
  return { ...dated(date), ...coreLineage,
    status: new Set(expected.map(r => r.expirationDate)).size !== expected.length ? "DUPLICATE_CONTRACT_EXPIRATION" : coreLineage.status,
    seriesType: "OFFICIAL_MONTHLY_VX_SETTLEMENT", expectedContracts: expected, contracts };
}
function flowDate(value: unknown): string {
  if (validDate(value)) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(text(value));
  if (!match || !months.includes(match[2])) return "";
  return `${match[3]}-${String(months.indexOf(match[2]) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
export function normalizeBtcTable(payload: unknown, metadata: Temporal): Packet {
  metadata = bindSource(metadata, "BTC_NATIVE");
  const p = record(payload), columns = array(p.columns).map(text), expectedFunds = columns.filter(c => c !== "Date" && c !== "Total");
  const rows = array(p.rows).map(array).map(cells => {
    const date = flowDate(cells[columns.indexOf("Date")]);
    const funds = Object.fromEntries(expectedFunds.map(fund => [fund, parseNumericCell(cells[columns.indexOf(fund)])]));
    const reported = parseNumericCell(cells[columns.indexOf("Total")]);
    const allObserved = expectedFunds.length > 0 && Object.values(funds).every(finite);
    const sum = allObserved ? Object.values(funds).reduce<number>((s, v) => s + v!, 0) : null;
    return { ...dated(date), total: reported ?? sum, reportedTotal: reported, totalDerived: reported === null && sum !== null, reconciliationDifference: reported !== null && sum !== null ? reported - sum : null, funds, coverage: allObserved ? "COMPLETE" : "PARTIAL" };
  }).filter(r => validDate(r.observationDate));
  return { ...metadata, sourceField: "columns,rows", vintageHash: bytesHash(JSON.stringify(payload)), seriesType: "REPORTED_ETF_NET_FLOW", currency: "USD_MILLIONS", expectedFunds, rows, status: !columns.includes("Date") || !columns.includes("Total") || new Set(columns).size !== columns.length ? "INVALID" : metadata.status ?? "AVAILABLE" };
}
export function normalizeGldRows(payload: unknown, metadata: Temporal, unitEventDates: string[] = []): Packet {
  metadata = bindSource(metadata, "GLD_NATIVE");
  // Accept dated parsed native fund rows only, never oneDay/twentyDay presentation scalars.
  const rows = array(payload).map(record).map(row => ({ ...dated(text(row.date)), shares: parseNumericCell(row["shares outstanding"] ?? row.sharesOutstanding), nav: parseNumericCell(row.nav), aum: parseNumericCell(row["total net assets"] ?? row.totalNetAssets) })).filter(r => validDate(r.observationDate));
  return { ...metadata, sourceField: "date,nav,shares outstanding,total net assets", vintageHash: bytesHash(JSON.stringify(payload)), seriesType: "FUND_SHARES_NAV_AUM", rows, unitEventDates: [...unitEventDates], status: Array.isArray(payload) ? metadata.status ?? "AVAILABLE" : "INVALID" };
}
