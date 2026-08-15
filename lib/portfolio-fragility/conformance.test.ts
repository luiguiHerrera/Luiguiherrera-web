/* eslint-disable @typescript-eslint/no-explicit-any -- language-neutral fixture data is dynamically shaped by case */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  behaviourClusters, changeHolding, concentrationMetrics, directStress, drawdownAnalysis,
  historicalAssetAvailability, normalizeWeights, portfolioRisk, removeHolding, staticSharePath,
} from "./engine.ts";

type Fixture = { fixture_id: string; inputs: Record<string, any>; expected: unknown; comparison: { default_tolerance_class: string } };
type Contract = { default_tolerances: Record<string, { absolute: number; relative: number }>; canonical_examples: Fixture[] };
const fixtureUrl = new URL("./fixtures/pfl-conformance-fixture-contract-v0.1.json", import.meta.url);
const bytes = readFileSync(fixtureUrl);
const contract = JSON.parse(bytes.toString()) as Contract;

function execute(fixture: Fixture) {
  const input = fixture.inputs;
  switch (fixture.fixture_id) {
    case "WEIGHTS_CONCENTRATION_001": {
      const normalized = normalizeWeights(input.holdings.map((row: any) => ({ assetId: row.asset_id, rawWeight: row.raw_weight })));
      assert.equal(normalized.status, "OK");
      if (normalized.status !== "OK") return normalized;
      return concentrationMetrics(normalized.asset_ids, normalized.normalized_weights);
    }
    case "RISK_KERNEL_001": return portfolioRisk(input.asset_ids, input.normalized_weights, input.annual_covariance);
    case "STATIC_SHARE_DRAWDOWN_001": return staticSharePath(input.asset_ids, input.normalized_weights, input.dates, input.values);
    case "DRAWDOWN_TIMING_001": return drawdownAnalysis(input.dates, input.wealth);
    case "DIRECT_STRESS_001": return directStress(input.asset_ids, input.normalized_weights, input.resolved_direct_shocks);
    case "REMOVE_CHANGE_001": {
      const removed = removeHolding(input.asset_ids, input.normalized_weights, input.remove_asset_id);
      const changed = changeHolding(input.asset_ids, input.normalized_weights, input.change.asset_id, input.change.target_normalized_weight);
      assert.equal(removed.status, "OK"); assert.equal(changed.status, "OK");
      if (removed.status !== "OK" || changed.status !== "OK") return removed;
      return { status: "OK", remove_B_weights: removed.normalized_weights, change_A_to_0_2_weights: changed.normalized_weights, quality_flags: [] };
    }
    case "CLUSTER_COMPLETE_LINKAGE_001": return behaviourClusters(input.asset_ids, input.normalized_weights, input.correlation, input.observation_count);
    case "UNAVAILABLE_ASSET_NOT_EXIST_001": return historicalAssetAvailability(input.positive_weight_asset_ids, input.asset_inception_dates, input.episode_id, input.proxy_opt_in);
    default: throw new Error("Unknown fixture " + fixture.fixture_id);
  }
}

function compare(expected: any, actual: any, tolerance?: { absolute: number; relative: number }, path = "$") {
  if (typeof expected === "number" && tolerance) {
    assert.ok(Number.isFinite(actual), path + " must be finite");
    assert.ok(Math.abs(actual - expected) <= tolerance.absolute + tolerance.relative * Math.abs(expected), path + " numeric mismatch");
    return;
  }
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), path + " must be an array"); assert.equal(actual.length, expected.length, path + " length");
    expected.forEach((value, index) => compare(value, actual[index], tolerance, path + "[" + index + "]")); return;
  }
  if (expected && typeof expected === "object") {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path + " keys");
    Object.entries(expected).forEach(([key, value]) => compare(value, actual[key], tolerance, path + "." + key)); return;
  }
  assert.equal(actual, expected, path);
}

test("canonical conformance contract digest matches accepted v0.1.0", () => {
  assert.equal(createHash("sha256").update(new Uint8Array(bytes)).digest("hex"), "258ed43a62d88b1f568c0a8bafdbe9f2cc7e7a737a82b8f264bb9a5fa9cb42f6");
});

for (const fixture of contract.canonical_examples) {
  test("conformance " + fixture.fixture_id, () => {
    const tolerance = fixture.comparison.default_tolerance_class === "EXACT" ? undefined : contract.default_tolerances[fixture.comparison.default_tolerance_class];
    compare(fixture.expected, execute(fixture), tolerance);
  });
}
