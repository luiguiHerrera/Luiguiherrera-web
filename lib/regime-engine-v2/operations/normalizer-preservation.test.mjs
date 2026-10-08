/** The accepted normalizer is reconstructed only by reversing the exact
 * formatter hoist and verifying its input-manifest hash before executing it.
 * No frozen oracle file is rewritten and no temporary module enters Git.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { gunzipSync } from "node:zlib";
import { TICKERS } from "../contract.ts";
import { normalizeYahoo } from "../normalize.ts";

const root = new URL("../../../", import.meta.url);
const normalizerUrl = new URL("../normalize.ts", import.meta.url);
const sha = value => createHash("sha256").update(value).digest("hex");
const current = readFileSync(normalizerUrl, "utf8");
const declaration = '  const dateFormatter = new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });\n';
const optimized = "    const parts = dateFormatter.formatToParts(instant);";
const accepted = '    const parts = new Intl.DateTimeFormat("en", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);';
assert.equal(current.split(declaration).length - 1, 1, "exactly one approved formatter declaration");
assert.equal(current.split(optimized).length - 1, 1, "exactly one approved formatter use");
const original = current.replace(declaration, "").replace(optimized, accepted);
const manifest = JSON.parse(readFileSync(new URL("docs/regime-engine-v2/maintainer/input-manifest.json", root), "utf8"));
assert.equal(sha(original), manifest.sweeper_files["lib/regime-engine-v2/normalize.ts"], "reverse transformation must restore every pre-Maintainer byte");
const javascript = stripTypeScriptTypes(original, { mode: "strip" }).replace(/from\s+"(\.\/[^"\n]+)"/g, (_, relative) => `from ${JSON.stringify(new URL(relative, normalizerUrl).href)}`);
const frozen = await import("data:text/javascript;base64," + Buffer.from(javascript).toString("base64"));
const metadata = { sourceVersion: "synthetic-preservation/1", replayClass: "R2", availabilityCertainty: "UNKNOWN", sourcePublishedAt: null, status: "AVAILABLE" };

test("only the approved formatter hoist differs from the byte-identified Sweeper normalizer", () => {
  assert.equal(sha(original), manifest.sweeper_files["lib/regime-engine-v2/normalize.ts"]);
  assert.notEqual(sha(current), sha(original));
});

for (const ticker of TICKERS) test(`full preserved P8 Yahoo ${ticker} output equals the original normalizer`, () => {
  const raw = gunzipSync(readFileSync(new URL(`docs/regime-engine-v2/p8/evidence/yahoo-${ticker}.json.gz`, root))).toString("utf8");
  const ledger = JSON.parse(readFileSync(new URL(`docs/regime-engine-v2/p8/evidence/yahoo-${ticker}.json.metadata.json`, root), "utf8"));
  assert.equal(sha(raw), ledger.raw_sha256);
  const meta = { sourceVersion: "p8-source-contract/1.0.0", capturedAt: ledger.captured_at, availableAt: ledger.available_at, availabilityCertainty: "CONSERVATIVE_BOUND", sourcePublishedAt: null, vintageHash: ledger.raw_sha256, replayClass: "R2", status: "AVAILABLE" };
  const before = frozen.normalizeYahoo(raw, meta, ticker), after = normalizeYahoo(raw, meta, ticker);
  assert.ok(after.rows.length > 1900, "use full archived history, not a reduced sample");
  assert.deepEqual(after, before);
});

const instants = ["2025-03-09T04:30:00Z", "2025-03-09T05:30:00Z", "2025-03-10T03:30:00Z", "2025-03-10T04:30:00Z", "2025-11-02T03:30:00Z", "2025-11-02T04:30:00Z", "2025-11-03T04:30:00Z", "2025-11-03T05:30:00Z"];
function payload(zone = "America/New_York") {
  return { chart: { result: [{ meta: { symbol: "XLK", currency: "USD", exchangeTimezoneName: zone }, timestamp: instants.map(instant => Date.parse(instant) / 1000), indicators: { adjclose: [{ adjclose: instants.map((_, index) => 100 + index) }], quote: [{ close: instants.map(() => 9999) }] } }], error: null } };
}
for (const zone of ["America/New_York", "UTC", "Pacific/Kiritimati", "Asia/Kathmandu", "Europe/Madrid"]) test(`identical preserved date semantics for DST and timezone ${zone}`, () => {
  const bytes = JSON.stringify(payload(zone));
  assert.deepEqual(normalizeYahoo(bytes, metadata, "XLK"), frozen.normalizeYahoo(bytes, metadata, "XLK"));
});
test("New York observation dates cross DST midnights without adopting a fixed UTC offset", () => {
  const output = normalizeYahoo(JSON.stringify(payload()), metadata, "XLK");
  assert.deepEqual(output.rows.map(row => row.observationDate), ["2025-03-08", "2025-03-09", "2025-03-09", "2025-03-10", "2025-11-01", "2025-11-02", "2025-11-02", "2025-11-03"]);
});
test("malformed zones, arrays, timestamps and missing adjclose retain exact frozen failure semantics", () => {
  const cases = [payload(""), payload("Unknown/Zone")];
  const absent = payload(); delete absent.chart.result[0].indicators.adjclose; cases.push(absent);
  const misaligned = payload(); misaligned.chart.result[0].indicators.adjclose[0].adjclose.pop(); cases.push(misaligned);
  const invalid = payload(); invalid.chart.result[0].timestamp = [null, "1741498200", 1e100, -1, 0]; invalid.chart.result[0].indicators.adjclose[0].adjclose = [null, 0, -1, 120, 130]; cases.push(invalid);
  const currency = payload(); currency.chart.result[0].meta.currency = "EUR"; cases.push(currency);
  const wrongTicker = payload(); wrongTicker.chart.result[0].meta.symbol = "XLF"; cases.push(wrongTicker);
  for (const item of cases) {
    const bytes = JSON.stringify(item);
    assert.deepEqual(normalizeYahoo(bytes, metadata, "XLK"), frozen.normalizeYahoo(bytes, metadata, "XLK"));
  }
  for (const bytes of ["{malformed", "null", "{}", '{"chart":{"error":"source unavailable"}}']) assert.deepEqual(normalizeYahoo(bytes, metadata, "XLK"), frozen.normalizeYahoo(bytes, metadata, "XLK"));
});
