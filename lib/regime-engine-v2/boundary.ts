import type { EngineInput } from "./types.ts";

/** A governed failure for malformed envelopes, distinct from unavailable data. */
export class RegimeInputError extends Error {
  readonly code = "INVALID_REGIME_INPUT";
  readonly inputPath: string;
  constructor(inputPath: string, detail: string) {
    super(`${inputPath}: ${detail}`); this.name = "RegimeInputError"; this.inputPath = inputPath;
  }
}
const fail = (path: string, detail: string): never => { throw new RegimeInputError(path, detail); };
function object(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected an object");
}
function list(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
}
function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") fail(path, "expected a string");
}
function temporal(value: Record<string, unknown>, path: string) {
  for (const key of ["replayClass", "availabilityCertainty", "observationEndCertainty"]) {
    const allowed = key === "replayClass" ? ["R0", "R1", "R2", "UNKNOWN"] : ["EXACT", "CONSERVATIVE_BOUND", "UNKNOWN"];
    if (value[key] !== undefined && !allowed.includes(value[key] as string)) fail(`${path}.${key}`, "unrecognized enum");
  }
  for (const key of ["observationDate", "date", "observationEndAt", "sourcePublishedAt", "availableAt", "capturedAt", "sourceId", "sourceVersion", "vintageHash", "status", "availabilityEvidence"]) {
    if (value[key] !== undefined && value[key] !== null) string(value[key], `${path}.${key}`);
  }
}
/** Only plain data crosses this boundary. Nonfinite numeric cells remain missing
 * data for the numerical layer; accessors, cycles and executable values do not. */
export function assertEngineInput(value: unknown): asserts value is EngineInput {
  const active = new WeakSet<object>();
  function data(node: unknown, path: string, depth: number) {
    if (depth > 128) fail(path, "excessive nesting");
    if (node === null || node === undefined || ["string", "number", "boolean"].includes(typeof node)) return;
    if (typeof node !== "object") fail(path, "unsupported data type");
    const obj = node as object, proto = Object.getPrototypeOf(obj);
    if (Array.isArray(obj) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail(path, "expected plain data");
    if (active.has(obj)) fail(path, "cyclic data");
    active.add(obj);
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== "string") return fail(path, "symbol properties are not plain data");
      const descriptor = descriptors[key];
      if (descriptor.get || descriptor.set) fail(`${path}.${key}`, "accessor is not data");
      data(descriptor.value, `${path}.${key}`, depth + 1);
    }
    active.delete(obj);
  }
  data(value, "input", 0); object(value, "input");
  if (!["R0", "R1", "R2", "UNKNOWN"].includes(value.mode as string)) fail("input.mode", "unrecognized replay mode");
  string(value.asOf, "input.asOf"); object(value.equity, "input.equity"); object(value.calendars, "input.calendars");
  function packet(packet: unknown, path: string) {
    if (packet === undefined) return;
    object(packet, path); temporal(packet, path); list(packet.rows, `${path}.rows`);
    for (const key of ["seriesType", "priceBasis", "currency", "sourceField", "declaredStart"]) if (packet[key] !== undefined) string(packet[key], `${path}.${key}`);
    for (const row of packet.rows) { object(row, `${path}.rows[]`); temporal(row, `${path}.rows[]`); }
    for (const key of ["expectedFunds", "unitEventDates"]) if (packet[key] !== undefined) {
      list(packet[key], `${path}.${key}`); for (const v of packet[key]) string(v, `${path}.${key}[]`);
    }
  }
  for (const [ticker, p] of Object.entries(value.equity)) packet(p, `input.equity.${ticker}`);
  for (const key of ["vix", "btc", "gld"]) packet(value[key], `input.${key}`);
  for (const [key, cal] of Object.entries(value.calendars)) {
    if (cal === undefined) continue;
    object(cal, `input.calendars.${key}`); temporal(cal, `input.calendars.${key}`); list(cal.sessions, `input.calendars.${key}.sessions`);
    for (const field of ["id", "version", "timezone", "coverageStart", "coverageEnd"]) if (cal[field] !== undefined) string(cal[field], `input.calendars.${key}.${field}`);
    if (!["OFFICIAL", "R2_OBSERVED_PROXY", "SYNTHETIC"].includes(cal.kind as string)) fail(`input.calendars.${key}.kind`, "unrecognized calendar kind");
    if (typeof cal.completeIntervalCoverage !== "boolean") fail(`input.calendars.${key}.completeIntervalCoverage`, "expected a boolean");
    for (const row of cal.sessions) { object(row, "calendar.session"); string(row.session, "calendar.session.date"); string(row.closedAt, "calendar.session.closedAt"); }
  }
  if (value.vx !== undefined) {
    object(value.vx, "input.vx"); temporal(value.vx, "input.vx");
    for (const key of ["contracts", "expectedContracts"]) {
      list(value.vx[key], `input.vx.${key}`);
      for (const c of value.vx[key]) { object(c, `input.vx.${key}[]`); string(c.symbol, "contract.symbol"); string(c.expirationDate, "contract.expirationDate"); temporal(c, "contract"); }
    }
  }
  if (value.optionalFeatures !== undefined) { list(value.optionalFeatures, "input.optionalFeatures"); for (const id of value.optionalFeatures) string(id, "input.optionalFeatures[]"); }
}
