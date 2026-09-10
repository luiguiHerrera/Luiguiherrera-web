import type { Calendar, CoreInput, Mode, Packet, ReplayClass, Row, Temporal } from "./types.ts";
import { canonical, positive } from "./math.ts";
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function instant(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !validDate(value.slice(0, 10))) return null;
  const match = /T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(value)!;
  if (+match[1] > 23 || +match[2] > 59 || +match[3] > 59) return null;
  const result = Date.parse(value.replace(/\.\d+(?=Z|[+-])/, "")) + (match[4] ? Number("0." + match[4]) * 1000 : 0);
  return Number.isFinite(result) ? result : null;
}
export function temporalEligible(meta: Temporal, asOf: string, mode: Mode, requireEnd = true) {
  const cut = instant(asOf);
  if (cut === null || (meta.status && meta.status !== "AVAILABLE")) return false;
  if (meta.replayClass !== undefined && !["R0", "R1", "R2"].includes(meta.replayClass)) return false;
  if (mode === "R2") return true;
  if (!["R0", "R1", "SYNTHETIC"].includes(mode)) return false;
  if (meta.replayClass === "R2") return false;
  if (mode === "R0" && meta.replayClass === "R1") return false;
  if (meta.replayClass === "R1" && !meta.availabilityEvidence) return false;
  if ((mode === "R0" || meta.replayClass === "R0") && meta.capturedAt !== undefined && (instant(meta.capturedAt) === null || instant(meta.capturedAt)! > cut)) return false;
  const available = instant(meta.availableAt), end = instant(meta.observationEndAt);
  return ["EXACT", "CONSERVATIVE_BOUND"].includes(meta.availabilityCertainty ?? "UNKNOWN") && available !== null && available <= cut && (!requireEnd || (end !== null && end <= cut));
}
export function admissible(row: Row, packet: Temporal, raw: CoreInput) {
  const date = row.observationDate ?? row.date;
  const sameSource = row.sourceId === undefined || packet.sourceId === undefined || row.sourceId === packet.sourceId;
  return sameSource && validDate(date) && date <= raw.targetSession && temporalEligible(packet, raw.asOf, raw.mode, false) && temporalEligible({ ...packet, ...row }, raw.asOf, raw.mode);
}
export function windowRows(packet: Packet | undefined, raw: CoreInput, count: number): Row[] | null {
  if (!packet || !Array.isArray(packet.rows) || (packet.status && packet.status !== "AVAILABLE")) return null;
  const wanted = raw.expectedSessions.slice(-count);
  if (wanted.length !== count) return null;
  const rows = indexRows(packet, raw, wanted);
  const selected = wanted.map(date => rows.get(date));
  return selected.every((row): row is Row => row !== undefined && row !== null) ? selected : null;
}
/** One pass for callers that inspect many adjacent windows (for example streaks). */
export function indexRows(packet: Packet | undefined, raw: CoreInput, wanted: string[]): Map<string, Row | null> {
  const dates = new Set(wanted), rows = new Map<string, Row | null>();
  if (!packet || (packet.status && packet.status !== "AVAILABLE")) return rows;
  for (const row of packet.rows) {
    const date = row.observationDate ?? row.date;
    if (!date || !dates.has(date) || !admissible(row, packet, raw)) continue;
    rows.set(date, rows.has(date) && canonical(rows.get(date)) !== canonical(row) ? null : row);
  }
  return rows;
}
export function windowValues(packet: Packet | undefined, raw: CoreInput, count: number, field: string, basis?: string): number[] | null {
  if (basis && (packet?.priceBasis !== basis || packet?.currency !== "USD")) return null;
  const rows = windowRows(packet, raw, count);
  if (!rows || rows.some(row => !positive(row[field]) || (basis && (row.priceBasis ?? basis) !== basis))) return null;
  return rows.map(row => row[field] as number);
}
export function resolveCalendar(calendar: Calendar | undefined, asOf: string, mode: ReplayClass): { target: string | null; sessions: string[]; reason: string | null } {
  const fail = (reason: string) => ({ target: null, sessions: [], reason });
  const cut = instant(asOf);
  if (!calendar || cut === null || !calendar.id || !calendar.version || !calendar.timezone || !calendar.completeIntervalCoverage || !validDate(calendar.coverageStart) || !validDate(calendar.coverageEnd)) return fail("UNKNOWN_CALENDAR");
  if (mode !== "R2" && (calendar.kind !== "OFFICIAL" || !calendar.sourceId || !calendar.sourceVersion || !/^[a-f0-9]{64}$/.test(calendar.vintageHash ?? "") || instant(calendar.capturedAt) === null)) return fail("UNKNOWN_CALENDAR");
  const cutoffDate = new Date(cut).toISOString().slice(0, 10);
  if (cutoffDate < calendar.coverageStart || cutoffDate > calendar.coverageEnd || !temporalEligible(calendar, asOf, mode, false)) return fail("UNKNOWN_CALENDAR");
  try { new Intl.DateTimeFormat("en", { timeZone: calendar.timezone }); } catch { return fail("UNKNOWN_CALENDAR"); }
  const ordered = [...calendar.sessions].sort((a, b) => a.session.localeCompare(b.session));
  if (new Set(ordered.map(r => r.session)).size !== ordered.length || ordered.some(r => !validDate(r.session) || instant(r.closedAt) === null || r.session < calendar.coverageStart || r.session > calendar.coverageEnd || (instant(r.closedAt) !== null && new Date(instant(r.closedAt)!).toISOString().slice(0, 10) < r.session))) return fail("UNKNOWN_CALENDAR");
  const sessions = ordered.filter(row => instant(row.closedAt)! <= cut).map(row => row.session);
  return sessions.length ? { target: sessions[sessions.length - 1], sessions, reason: null } : fail("UNKNOWN_CALENDAR");
}
export function weakest(classes: (ReplayClass | undefined)[]): ReplayClass {
  const order: ReplayClass[] = ["R0", "R1", "R2", "UNKNOWN"];
  return order[Math.max(0, ...classes.map(c => { const rank = order.indexOf(c ?? "UNKNOWN"); return rank < 0 ? 3 : rank; }))];
}
