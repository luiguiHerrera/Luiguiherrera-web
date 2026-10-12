/** Offline DESIGNER fixtures. Never import this generator into a product route. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { fromP8 } from "./regime-v2-conformance.mts";
import { TICKERS } from "../lib/regime-engine-v2/contract.ts";
import { evaluateRegime, type RegimeOutput } from "../lib/regime-engine-v2/engine.ts";
import { bytesHash, hash } from "../lib/regime-engine-v2/math.ts";
import { normalizeBtcTable, normalizeGldRows } from "../lib/regime-engine-v2/normalize.ts";
import type { Calendar, CoreInput, EngineInput, Packet, Temporal } from "../lib/regime-engine-v2/types.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "docs/regime-engine-v2/designer");
const rawPath = path.join(root, "docs/regime-engine-v2/p8/raw-fixtures.json.gz");
const sourceBytes = readFileSync(rawPath);
const sourceFixtures = JSON.parse(gunzipSync(sourceBytes).toString("utf8")).fixtures as { id: string; raw: unknown }[];
const historicalAsOf = "2025-03-31T23:59:59.999999Z";
const metadata: Temporal = {
  sourceVersion: "design-test/p8-synthetic/1.0.0", capturedAt: "2025-03-31T21:30:00Z",
  availableAt: "2025-03-31T21:30:00Z", sourcePublishedAt: null,
  availabilityCertainty: "CONSERVATIVE_BOUND", replayClass: "R2",
  vintageHash: bytesHash("DESIGN_TEST synthetic normalized data; not a provider capture"), status: "AVAILABLE",
};

export type DesignFixture = {
  schemaVersion: "regime-v2-design-fixture/1.0.0";
  id: string;
  provenance: {
    kind: "DESIGN_TEST"; synthetic: true; live: false; pointInTimeOosClaim: false;
    historicalAsOf: string; sourceFixtureId: string; sourceArchiveSha256: string;
    normalizedInputSha256: string; outputSha256: string; modifications: string[];
    limitation: string;
  };
  output: RegimeOutput;
};

function normalizedFixture(id: string): EngineInput {
  const frozen = sourceFixtures.find(candidate => candidate.id === id);
  assert.ok(frozen, `Missing accepted raw fixture ${id}`);
  const raw = fromP8(frozen.raw) as CoreInput;
  const calendar: Calendar = {
    ...metadata, sourceId: "DESIGN_TEST_CALENDAR", id: "DESIGN_TEST_SYNTHETIC_WEEKDAY_SESSIONS",
    version: "design-test/1.0.0", kind: "R2_OBSERVED_PROXY", timezone: "America/New_York",
    coverageStart: raw.expectedSessions[0], coverageEnd: raw.targetSession, completeIntervalCoverage: true,
    sessions: raw.expectedSessions.map(session => ({ session, closedAt: session + "T21:00:00Z" })),
  };
  const withMetadata = (packet: Packet, sourceId: string): Packet => ({
    ...packet, ...metadata, sourceId, declaredStart: raw.expectedSessions[0],
  });
  return {
    mode: "R2", asOf: historicalAsOf,
    calendars: Object.fromEntries(["equity", "vix", "vx", "btc", "gld"].map(key => [key, structuredClone(calendar)])),
    equity: Object.fromEntries(TICKERS.map(ticker => [ticker, raw.equity[ticker] ? withMetadata(raw.equity[ticker]!, "EQUITY_ADJUSTED") : undefined])),
    vix: raw.vix ? withMetadata(raw.vix, "VIX_OFFICIAL") : undefined,
    vx: raw.vx ? { ...raw.vx, ...metadata, sourceId: "VX_OFFICIAL" } : undefined,
  };
}

function withCompleteOptionals(input: EngineInput): void {
  // Preserve INITIAL_OPTIONALS. Supply their actual raw windows instead of weakening the profile.
  input.vix!.declaredStart = input.vix!.rows[0].observationDate ?? input.vix!.rows[0].date;
  const dates = input.calendars.equity!.sessions.map(row => row.session);
  input.btc = normalizeBtcTable({ columns: ["Date", "Synthetic Fund A", "Total"], rows: dates.slice(-5).map(date => [date, "0", "0"]) }, metadata);
  input.gld = normalizeGldRows(dates.slice(-21).map(date => ({ date, nav: 10, sharesOutstanding: 100, totalNetAssets: 1000 })), metadata);
}

type Specification = {
  id: string; source: string; regime: RegimeOutput["regime"]; mutate?: (input: EngineInput) => void;
  changes?: string[];
};
const specifications: Specification[] = [
  { id: "broad-complete", source: "C03-broad", regime: "RISK_ON_BROAD", mutate: withCompleteOptionals, changes: ["Supply native synthetic BTC/GLD windows and declare the available VIX history start; INITIAL_OPTIONALS unchanged."] },
  { id: "selective-partial", source: "C03-selective", regime: "RISK_ON_SELECTIVE" },
  { id: "transition-conflict", source: "C03-transition", regime: "TRANSITION" },
  { id: "transition-watch", source: "C03-v_watch-0", regime: "TRANSITION" },
  {
    id: "transition-fragility", source: "C03-defensive", regime: "TRANSITION",
    mutate: input => { for (const row of input.vix!.rows) row.value = 15; },
    changes: ["Set all six synthetic VIX closes to 15, retaining adverse equity participation/leadership and high co-movement from the accepted raw fixture."],
  },
  { id: "defensive-complete", source: "C03-defensive", regime: "DEFENSIVE", mutate: withCompleteOptionals, changes: ["Supply native synthetic BTC/GLD windows and declare the available VIX history start; INITIAL_OPTIONALS unchanged."] },
  { id: "stress-absolute", source: "C03-stress", regime: "STRESS", mutate: withCompleteOptionals, changes: ["Supply native synthetic BTC/GLD windows and declare the available VIX history start; INITIAL_OPTIONALS unchanged."] },
  { id: "stress-joint", source: "C03-joint-shock", regime: "STRESS" },
  { id: "incomplete-missing-core", source: "C03-incomplete", regime: null },
  { id: "incomplete-unknown-calendar", source: "C03-broad", regime: null, mutate: input => { delete input.calendars.equity; }, changes: ["Remove the equity calendar; no fallback calendar is supplied."] },
  {
    id: "incomplete-stale", source: "C03-broad", regime: null,
    mutate: input => {
      input.asOf = "2025-04-01T23:59:59.999999Z";
      for (const calendar of Object.values(input.calendars)) {
        calendar!.coverageEnd = "2025-04-01";
        calendar!.sessions.push({ session: "2025-04-01", closedAt: "2025-04-01T21:00:00Z" });
      }
    },
    changes: ["Advance the synthetic closed-session calendar and asOf by one session while retaining March 31 source rows; do not carry stale evidence forward."],
  },
  { id: "incomplete-with-shock", source: "C03-joint-shock", regime: null, mutate: input => { delete input.equity.XLK; }, changes: ["Remove required XLK input while preserving the actual joint-shock VIX/VX raw rows; incomplete must take precedence over STRESS."] },
];

/** Rebuild every output through the unmodified public engine; no output assignments. */
export function buildDesignFixtures(): { fixture: DesignFixture; input: EngineInput }[] {
  return specifications.map(specification => {
    const input = normalizedFixture(specification.source);
    specification.mutate?.(input);
    const output = evaluateRegime(input);
    assert.equal(output.regime, specification.regime, specification.id);
    assert.equal(output.parameterSet, "C03");
    assert.ok(output.replayClass === "R2" || (output.systemState === "INCOMPLETE" && output.replayClass === "UNKNOWN"), specification.id);
    assert.deepEqual(evaluateRegime(structuredClone(input)), output, specification.id + " deterministic output");
    return {
      input,
      fixture: {
        schemaVersion: "regime-v2-design-fixture/1.0.0", id: specification.id,
        provenance: {
          kind: "DESIGN_TEST", synthetic: true, live: false, pointInTimeOosClaim: false,
          historicalAsOf: input.asOf, sourceFixtureId: specification.source,
          sourceArchiveSha256: bytesHash(Uint8Array.from(sourceBytes)), normalizedInputSha256: hash(input), outputSha256: hash(output),
          modifications: ["Adapt accepted P8 synthetic normalized raw rows to the public EngineInput boundary with explicit design-test provenance and R2 replay mode.", ...(specification.changes ?? [])],
          limitation: "Synthetic design/test data at a fixed historical timestamp, not a live reading, actual market reconstruction, official exchange calendar, provider capture or point-in-time OOS evidence. R2 identifies the engine replay mode only.",
        },
        output,
      },
    };
  });
}

function main() {
  const generated = buildDesignFixtures();
  const write = !process.argv.includes("--check");
  if (write) mkdirSync(path.join(destination, "fixtures"), { recursive: true });
  const rows = generated.map(({ fixture }) => {
    const relativePath = `fixtures/${fixture.id}.json`, filename = path.join(destination, relativePath);
    const serialized = JSON.stringify(fixture) + "\n";
    if (write) writeFileSync(filename, serialized);
    else assert.equal(readFileSync(filename, "utf8"), serialized, `${fixture.id}: generated bytes differ`);
    const output = fixture.output;
    return {
      id: fixture.id, path: relativePath, bytes: Buffer.byteLength(serialized), sha256: bytesHash(serialized),
      sourceFixtureId: fixture.provenance.sourceFixtureId, normalizedInputSha256: fixture.provenance.normalizedInputSha256,
      outputSha256: fixture.provenance.outputSha256, asOf: output.asOf, observationDate: output.observationDate,
      regime: output.regime, systemState: output.systemState, concordance: output.concordance,
      uncertainty: output.uncertainty, dataQuality: output.dataQuality, replayClass: output.replayClass,
      pillarStates: output.pillarStates, ruleId: output.diagnostics.ruleId,
      sourceProblems: Object.fromEntries(Object.entries(output.sourceStatus).filter(([, value]) => value.status !== "AVAILABLE").map(([key, value]) => [key, value.status])),
    };
  });
  const coverage = {
    regimes: [...new Set(rows.map(row => row.regime ?? "INCOMPLETE"))],
    concordance: [...new Set(rows.map(row => row.concordance).filter(Boolean))],
    uncertainty: [...new Set(rows.map(row => row.uncertainty).filter(Boolean))],
    dataQuality: [...new Set(rows.map(row => row.dataQuality))],
    missingSatellite: "selective-partial", unknownCalendar: "incomplete-unknown-calendar", staleSource: "incomplete-stale",
    stressAbsolute: "stress-absolute", stressJoint: "stress-joint", incompletePrecedenceOverStress: "incomplete-with-shock",
    zeroBrakeItems: "broad-complete", oneSupportItem: "transition-fragility", multipleBrakeItems: "defensive-complete",
    longCopyScope: "Long evidence, source-name and methodology-note layout stress tests are presentation-only QA extensions; never overwritten engine output.",
  };
  assert.equal(coverage.regimes.length, 6);
  for (const key of ["concordance", "uncertainty", "dataQuality"] as const) assert.equal(coverage[key].length, 3, key);
  const report = {
    schemaVersion: "regime-v2-design-fixture-matrix/1.0.0", status: "PASS", fixtureCount: rows.length,
    generator: "scripts/regime-v2-design-fixtures.mts", reproduction: "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/regime-v2-design-fixtures.mts --check",
    origin: "DESIGN_TEST", engineEntryPoint: "evaluateRegime", architectureChanged: false, canonicalParametersChanged: false,
    noOutputOverrides: true, noClock: true, noNetwork: true, liveCompleteCaptureClaim: false, pointInTimeOosClaim: false,
    fullNormalizedInputsShippedToClient: false, serialization: "One compact JSON file per fixture; load only the selected file server-side.",
    coverage, rows,
  };
  const serialized = JSON.stringify(report, null, 2) + "\n", matrixPath = path.join(destination, "fixture-matrix.json");
  if (write) writeFileSync(matrixPath, serialized);
  else assert.equal(readFileSync(matrixPath, "utf8"), serialized, "Fixture matrix generated bytes differ");
  console.log(JSON.stringify({ status: "PASS", mode: write ? "GENERATE" : "CHECK", fixtures: rows.length, totalFixtureBytes: rows.reduce((sum, row) => sum + row.bytes, 0), coverage }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
