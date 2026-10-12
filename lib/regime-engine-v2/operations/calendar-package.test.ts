import assert from "node:assert/strict";
import test from "node:test";
import reviewed from "../calendars/reviewed-2026.json" with { type: "json" };
import { bytesHash, hash } from "../math.ts";
import type { CaptureRecord } from "../capture.ts";
import { resolveCalendar } from "../temporal.ts";
import { assertReviewedCalendarPackage, CalendarPackageError, inspectReviewedCalendarExpiry, loadReviewedCalendars, REVIEWED_CALENDAR_RELEASE, verifyReviewedCalendarRelease } from "./calendar-package.ts";
import { prepareSourceVintage, prepareSourceVintageWithReviewedCalendars, resolveSourceVintage, SOURCE_BUNDLE_VERSION, SourceBundleError } from "./source-input.ts";

// Historical instants are explicit boundary tests; no test acquires market data
// or claims that these synthetic capture bytes came from an official provider.
const cut = "2026-09-09T13:06:56.019Z";
const empty = () => ({ schemaVersion: SOURCE_BUNDLE_VERSION, mode: "R2", captures: [], calendars: {} });
function syntheticVix(completedAt = "2026-09-09T13:02:00.000Z", origin: CaptureRecord["origin"] = "PROSPECTIVE") {
  const raw = "DATE,OPEN,HIGH,LOW,CLOSE\n09/04/2026,20,21,19,20\n09/08/2026,19,20,18,19\n";
  const sourceId = "VIX_OFFICIAL", sourceVersion = "SYNTHETIC_R1_BOUNDARY_TEST/1", rawHash = bytesHash(raw);
  const body = { sourceId, sourceVersion, sourceUrl: "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv", startedAt: completedAt, completedAt,
    rawHash, rawBase64: Buffer.from(raw).toString("base64"), origin, metadata: { sourceId, sourceVersion, vintageHash: rawHash,
      capturedAt: completedAt, availableAt: completedAt, sourcePublishedAt: null, availabilityCertainty: "CONSERVATIVE_BOUND" as const,
      availabilityEvidence: "SYNTHETIC_TEST_CAPTURE", replayClass: origin === "PROSPECTIVE" ? "R0" as const : "R2" as const, status: "AVAILABLE" } };
  return { kind: "CBOE_VIX_CSV", capture: { ...body, captureId: hash(body) } };
}

test("all accepted session counts, version identities and calendar hashes reproduce", () => {
  verifyReviewedCalendarRelease(reviewed);
  const loaded = loadReviewedCalendars(cut);
  assert.equal(loaded.releaseIdentity, REVIEWED_CALENDAR_RELEASE);
  assert.deepEqual(Object.values(loaded.calendars).map(c => c.sessions.length), [251, 209, 251]);
  assert.deepEqual(Object.values(loaded.calendars).map(hash), [
    "12233eac669834c21f54fe403d9ee8d47820692d8cd29d881b56826123819b32",
    "a66deff01a4ba027c5fcfa84f8b26bd51f62930a48f225446edc5269770ed07c",
    "54bb5ef167dada5cb0999828bf5fb56921a837c5aaa65080507db1543d6eb953",
  ]);
  assert.equal(loaded.expectedSession, "2026-09-08");
  assert.ok(Object.values(loaded.resolutions).every(r => r.reason === null && r.target === loaded.expectedSession));
});

test("primary calendar knownAt bounds every official input, including the CFE PDF", () => {
  const loaded = loadReviewedCalendars(cut);
  for (const p of Object.values(loaded.provenance)) {
    assert.equal(p.sourcePublishedAt, null);
    assert.equal(p.availabilityCertainty, "CONSERVATIVE_BOUND");
    assert.ok(p.inputSources.every(source => Date.parse(source.retrievedAt) <= Date.parse(p.knownAt) && Date.parse(p.knownAt) <= Date.parse(cut)));
  }
  assert.equal(loaded.provenance.vx.inputSources[0].sourceReference, "https://cdn.cboe.com/resources/regulation/rule_book/cfe-rule-book.pdf");
  assert.throws(() => loadReviewedCalendars("2026-09-09T13:01:21.923Z"), { code: "UNKNOWN_CALENDAR" });
  assert.equal(loadReviewedCalendars("2026-09-09T13:01:21.924Z").expectedSession, "2026-09-08");
});

test("release tampering cannot authorize changed sessions or authority ancestry", () => {
  for (const change of [
    (r: typeof reviewed) => { r.families.vix.calendar.sessions.pop(); },
    (r: typeof reviewed) => { r.families.vx.inputs[0].retrievedAt = "2027-01-01T00:00:00Z"; },
    (r: typeof reviewed) => { r.families.equity.calendar.sourcePublishedAt = "invented" as unknown as null; },
  ]) {
    const copy = structuredClone(reviewed); change(copy);
    assert.throws(() => verifyReviewedCalendarRelease(copy), { code: "INVALID_CALENDAR_PACKAGE" });
  }
});

test("uncovered or retrospective preflight and invalid instants fail closed", () => {
  for (const asOf of ["not-a-date", "2026-09-09", "2026-01-01T12:00:00Z", "2025-12-31T23:00:00Z", "2026-11-01T00:00:00Z", "2027-01-01T00:00:00Z"]) {
    assert.throws(() => loadReviewedCalendars(asOf), CalendarPackageError);
  }
});

test("different latest closed core sessions cannot pass preflight", () => {
  assert.throws(() => loadReviewedCalendars("2026-09-09T20:01:00Z"), { code: "UNKNOWN_CALENDAR" });
  assert.equal(loadReviewedCalendars("2026-09-09T20:16:00Z").expectedSession, "2026-09-09");
});

test("expiry warning begins at exactly 30 UTC calendar days", () => {
  assert.equal(inspectReviewedCalendarExpiry("2026-09-30T23:59:59Z").vix.coverageRemaining, 31);
  assert.equal(inspectReviewedCalendarExpiry("2026-09-30T23:59:59Z").vix.status, "OK");
  const warning = loadReviewedCalendars("2026-10-01T08:30:00Z").expiry.vix;
  assert.equal(warning.coverageRemaining, 30); assert.equal(warning.status, "EXPIRING_SOON");
  assert.equal(warning.expiryDate, "2026-10-31"); assert.equal(warning.expiresAt, "2026-11-01T00:00:00.000Z");
});

test("last coverage day is usable and following midnight reports expiry without a target", () => {
  const last = loadReviewedCalendars("2026-10-31T23:59:59Z");
  assert.equal(last.expiry.vix.coverageRemaining, 0); assert.equal(last.expectedSession, "2026-10-30");
  assert.throws(() => loadReviewedCalendars("2026-11-01T00:00:00Z"), (error: unknown) =>
    error instanceof CalendarPackageError && error.code === "UNKNOWN_CALENDAR" && error.expiry?.vix.status === "EXPIRED" && error.expiry.vix.coverageRemaining === -1);
});

test("reviewed early closes, DST and holiday exclusions retain accepted instants", () => {
  const { calendars } = loadReviewedCalendars(cut);
  const close = (family: "equity" | "vx", session: string) => calendars[family].sessions.find(row => row.session === session)?.closedAt;
  assert.equal(close("equity", "2026-03-06"), "2026-03-06T21:00:00.000Z");
  assert.equal(close("equity", "2026-03-09"), "2026-03-09T20:00:00.000Z");
  for (const day of ["2026-11-27", "2026-12-24"]) {
    assert.equal(close("equity", day), day + "T18:00:00.000Z");
    assert.equal(close("vx", day), day + "T18:00:00.000Z");
  }
  assert.equal(resolveCalendar(calendars.equity, "2026-09-07T23:00:00Z", "R2").target, "2026-09-04");
  assert.equal(resolveCalendar(calendars.vix, "2026-11-27T23:00:00Z", "R0").reason, "UNKNOWN_CALENDAR");
});

test("only authentic factory packages are accepted; copies cannot forge the boundary", () => {
  const loaded = loadReviewedCalendars(cut);
  assertReviewedCalendarPackage(loaded);
  assert.ok(Object.isFrozen(loaded.calendars.vx.sessions));
  for (const copy of [structuredClone(loaded), Object.freeze({ ...loaded }), null]) {
    assert.throws(() => assertReviewedCalendarPackage(copy), { code: "INVALID_CALENDAR_PACKAGE" });
  }
});

test("new source boundary rejects ambiguous calendars and other replay modes", () => {
  const loaded = loadReviewedCalendars(cut);
  assert.throws(() => prepareSourceVintageWithReviewedCalendars({ ...empty(), calendars: { equity: {} } }, loaded), SourceBundleError);
  for (const mode of ["R0", "R1"]) assert.throws(() => prepareSourceVintageWithReviewedCalendars({ ...empty(), mode }, loaded), SourceBundleError);
});

test("new preparation records release identity without raw calendar captures", () => {
  const loaded = loadReviewedCalendars(cut), b = empty();
  const prepared = prepareSourceVintageWithReviewedCalendars(b, loaded);
  assert.equal(prepared.captureMetadata.reviewedCalendarRelease?.releaseIdentity, loaded.releaseIdentity);
  assert.deepEqual(prepared.captureMetadata.reviewedCalendarRelease?.provenance, loaded.provenance);
  assert.equal(prepared.captureMetadata.rawBytes, 0);
  assert.equal(prepared.captureMetadata.bundleHash, hash({ bundle: b, reviewedCalendarRelease: loaded.releaseIdentity }));
  assert.equal(resolveSourceVintage(prepared, cut).input.mode, "R2");
  const legacy = prepareSourceVintage(b);
  assert.equal(legacy.captureMetadata.bundleHash, hash(b));
  assert.equal(Object.hasOwn(legacy.captureMetadata, "reviewedCalendarRelease"), false);
  assert.deepEqual(legacy.inputBase.calendars, {});
});

test("current rows may be R0 but historical rows and R2 imports cannot be upgraded", () => {
  const loaded = loadReviewedCalendars(cut);
  const prepare = (entry: ReturnType<typeof syntheticVix>) => prepareSourceVintageWithReviewedCalendars({ ...empty(), captures: [entry] }, loaded);
  const actual = prepare(syntheticVix());
  assert.deepEqual(actual.inputBase.vix?.rows.map(row => row.replayClass), ["R2", "R0"]);
  assert.equal(actual.inputBase.vix?.replayClass, "R2"); assert.equal(actual.hasR2History, true);
  assert.ok(actual.inputBase.vix?.rows.every(row => row.sourcePublishedAt === null && row.availabilityCertainty === "CONSERVATIVE_BOUND"));
  assert.deepEqual(prepare(syntheticVix(undefined, "R2_IMPORT")).inputBase.vix?.rows.map(row => row.replayClass), ["R2", "R2"]);
  // A later package load does not invent eligibility at the original capture.
  assert.deepEqual(prepare(syntheticVix("2026-09-09T12:00:00Z")).inputBase.vix?.rows.map(row => row.replayClass), ["R2", "R2"]);
});
