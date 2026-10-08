// Server-only operational release. This packages reviewed authority; it does not
// infer trading dates, refresh sources, or change the engine's calendar rules.
import reviewed from "../calendars/reviewed-2026.json" with { type: "json" };
import { assertEngineInput } from "../boundary.ts";
import { freeze, hash } from "../math.ts";
import { instant, resolveCalendar } from "../temporal.ts";
import type { Calendar } from "../types.ts";

export const REVIEWED_CALENDAR_RELEASE = "9b1bc306a4d8e390a294ceafc68fb0695465b7c4e5d3d4709507e5d8df8a7cf0";
export const CALENDAR_EXPIRY_WARNING_DAYS = 30;
export const CORE_CALENDAR_FAMILIES = ["equity", "vix", "vx"] as const;
type Family = typeof CORE_CALENDAR_FAMILIES[number];
type Resolution = ReturnType<typeof resolveCalendar>;
type SourceEvidence = { sourceReference: string; contentHash: string; retrievedAt: string; captureId: string };
type Provenance = Record<Family, {
  version: string; versionIdentity: string; calendarHash: string; provider: string;
  coverageStart: string; coverageEnd: string; knownAt: string;
  sourcePublishedAt: null; availabilityCertainty: "CONSERVATIVE_BOUND";
  inputSources: SourceEvidence[];
}>;
export type CalendarExpiry = Record<Family, {
  coverageRemaining: number; expiryDate: string; expiresAt: string;
  status: "OK" | "EXPIRING_SOON" | "EXPIRED";
}>;
export type ReviewedCalendarPackage = {
  releaseIdentity: string; preflightAsOf: string;
  calendars: Record<Family, Calendar>; provenance: Provenance;
  expiry: CalendarExpiry; resolutions: Record<Family, Resolution>; expectedSession: string;
};
export class CalendarPackageError extends Error {
  readonly code: "UNKNOWN_CALENDAR" | "INVALID_CALENDAR_PACKAGE";
  readonly expiry?: CalendarExpiry;
  constructor(code: CalendarPackageError["code"], detail: string, expiry?: CalendarExpiry) {
    super(`${code}: ${detail}`); this.name = "CalendarPackageError"; this.code = code; this.expiry = expiry;
  }
}
const authenticPackages = new WeakSet<object>();
const release = freeze(reviewed);
const invalid = (detail: string): never => { throw new CalendarPackageError("INVALID_CALENDAR_PACKAGE", detail); };

/** Verifies the reviewed release, including both historical identities. This
 * only validates the pinned data; it never authorizes an alternative release. */
export function verifyReviewedCalendarRelease(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("missing release");
  const { releaseIdentity, ...body } = value as typeof reviewed;
  if (releaseIdentity !== REVIEWED_CALENDAR_RELEASE || hash(body) !== REVIEWED_CALENDAR_RELEASE) invalid("release hash mismatch");
  const data = value as typeof reviewed;
  for (const family of CORE_CALENDAR_FAMILIES) {
    const { calendar, policy, inputs, calendarHash, versionIdentity } = data.families[family];
    const identity = hash({ transformVersion: data.transformVersion, inputs, policy, selected: calendar.sessions.map(row => row.session), holidays: data.holidays });
    if (identity !== versionIdentity || calendar.version !== `2026-reviewed-${identity}` || hash(calendar) !== calendarHash) invalid(`${family}: reviewed identity mismatch`);
    const primary = instant(calendar.availableAt);
    if (primary === null || calendar.capturedAt !== calendar.availableAt || calendar.sourcePublishedAt !== null ||
      inputs.some(input => instant(input.retrievedAt) === null || instant(input.retrievedAt)! > primary) ||
      inputs.at(-1)?.retrievedAt !== calendar.availableAt || inputs.at(-1)?.contentHash !== calendar.vintageHash) invalid(`${family}: invalid authority ancestry`);
  }
  try {
    assertEngineInput({ mode: "R2", asOf: "", equity: {}, calendars: Object.fromEntries(CORE_CALENDAR_FAMILIES.map(key => [key, data.families[key].calendar])) });
  } catch { invalid("invalid calendar structure"); }
}

/** UTC calendar-day horizon, matching resolveCalendar's frozen coverage test.
 * The last coverage date remains usable; the following midnight is expiry. */
export function inspectReviewedCalendarExpiry(asOf: string): CalendarExpiry {
  const cut = instant(asOf);
  if (cut === null) throw new CalendarPackageError("UNKNOWN_CALENDAR", "invalid preflight asOf");
  const midnight = Date.parse(new Date(cut).toISOString().slice(0, 10) + "T00:00:00Z");
  return freeze(Object.fromEntries(CORE_CALENDAR_FAMILIES.map(family => {
    const expiryDate = release.families[family].calendar.coverageEnd;
    const end = Date.parse(expiryDate + "T00:00:00Z"), coverageRemaining = Math.floor((end - midnight) / 86400000);
    return [family, { coverageRemaining, expiryDate, expiresAt: new Date(end + 86400000).toISOString(),
      status: coverageRemaining < 0 ? "EXPIRED" : coverageRemaining <= CALENDAR_EXPIRY_WARNING_DAYS ? "EXPIRING_SOON" : "OK" }];
  })) as CalendarExpiry);
}

/** actualPreflightAsOf is supplied by the operator's real clock before capture.
 * Strict R0 resolution here does not upgrade R2 market history or publication. */
export function loadReviewedCalendars(actualPreflightAsOf: string): ReviewedCalendarPackage {
  verifyReviewedCalendarRelease(release);
  const expiry = inspectReviewedCalendarExpiry(actualPreflightAsOf);
  const calendars = Object.fromEntries(CORE_CALENDAR_FAMILIES.map(key => [key, release.families[key].calendar])) as Record<Family, Calendar>;
  const resolutions = Object.fromEntries(CORE_CALENDAR_FAMILIES.map(key => [key, resolveCalendar(calendars[key], actualPreflightAsOf, "R0")])) as Record<Family, Resolution>;
  const expectedSession = resolutions.equity.target;
  if (!expectedSession || CORE_CALENDAR_FAMILIES.some(key => expiry[key].status === "EXPIRED" || resolutions[key].reason !== null || resolutions[key].target !== expectedSession)) {
    throw new CalendarPackageError("UNKNOWN_CALENDAR", "all core calendars must be known, covered and resolve the same closed session", expiry);
  }
  const provenance = Object.fromEntries(CORE_CALENDAR_FAMILIES.map(key => {
    const { calendar, policy, inputs, calendarHash, versionIdentity } = release.families[key];
    return [key, { version: calendar.version, versionIdentity, calendarHash, provider: policy.provider,
      coverageStart: calendar.coverageStart, coverageEnd: calendar.coverageEnd, knownAt: calendar.availableAt,
      sourcePublishedAt: null, availabilityCertainty: "CONSERVATIVE_BOUND", inputSources: inputs }];
  })) as Provenance;
  const result = freeze({ releaseIdentity: REVIEWED_CALENDAR_RELEASE, preflightAsOf: actualPreflightAsOf, calendars, provenance, expiry, resolutions, expectedSession });
  authenticPackages.add(result);
  return result;
}

/** Only the factory output can enter the independent reviewed-calendar path.
 * A serialized copy or a frozen object supplied by a caller is insufficient. */
export function assertReviewedCalendarPackage(value: unknown): asserts value is ReviewedCalendarPackage {
  if (!value || typeof value !== "object" || !authenticPackages.has(value)) invalid("calendar package was not loaded by this release factory");
}
