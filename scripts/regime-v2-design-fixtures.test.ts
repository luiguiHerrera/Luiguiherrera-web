import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDesignFixtures } from "./regime-v2-design-fixtures.mts";
import { C03, INITIAL_OPTIONALS } from "../lib/regime-engine-v2/contract.ts";
import { evaluateRegime } from "../lib/regime-engine-v2/engine.ts";
import { hash } from "../lib/regime-engine-v2/math.ts";

const generated = buildDesignFixtures();
const scenario = (id: string) => generated.find(row => row.fixture.id === id)!;
for (const { fixture, input } of generated) test(`DESIGN_TEST ${fixture.id} is a deterministic full-engine output`, () => {
  const serialized = JSON.parse(readFileSync(new URL(`../docs/regime-engine-v2/designer/fixtures/${fixture.id}.json`, import.meta.url), "utf8"));
  assert.deepEqual(serialized, fixture);
  assert.deepEqual(evaluateRegime(structuredClone(input)), fixture.output);
  assert.equal(fixture.provenance.outputSha256, hash(fixture.output));
  assert.equal(fixture.provenance.normalizedInputSha256, hash(input));
  assert.equal(fixture.provenance.kind, "DESIGN_TEST");
  assert.equal(fixture.provenance.live, false);
  assert.equal(fixture.output.parameterSet, "C03");
  assert.ok(fixture.output.replayClass === "R2" || (fixture.output.systemState === "INCOMPLETE" && fixture.output.replayClass === "UNKNOWN"));
  assert.equal(fixture.output.diagnostics.pointInTimeOosClaim, false);
  assert.equal("input" in serialized, false, "No full raw input packaged for rendering");
});
test("fixture matrix covers every regime and every qualitative dimension independently", () => {
  const outputs = generated.map(row => row.fixture.output);
  assert.deepEqual([...new Set(outputs.map(output => output.regime))].sort(), ["DEFENSIVE", "RISK_ON_BROAD", "RISK_ON_SELECTIVE", "STRESS", "TRANSITION", null].sort());
  for (const dimension of ["concordance", "uncertainty"] as const) assert.deepEqual([...new Set(outputs.map(output => output[dimension]).filter(Boolean))].sort(), ["HIGH", "LOW", "MEDIUM"]);
  assert.deepEqual([...new Set(outputs.map(output => output.dataQuality))].sort(), ["COMPLETE", "INSUFFICIENT", "PARTIAL"]);
});
test("complete data comes from native optional inputs with the unchanged feature profile", () => {
  for (const id of ["broad-complete", "defensive-complete", "stress-absolute"]) {
    const { fixture, input } = scenario(id);
    assert.equal(fixture.output.dataQuality, "COMPLETE");
    assert.deepEqual(fixture.output.diagnostics.profile, [...INITIAL_OPTIONALS].sort());
    assert.equal(input.optionalFeatures, undefined);
    assert.equal(fixture.output.sourceStatus.BTC.status, "AVAILABLE");
    assert.equal(fixture.output.sourceStatus.GLD.status, "AVAILABLE");
  }
});
test("missing satellites remain partial without substituting a technical market state", () => {
  const output = scenario("selective-partial").fixture.output;
  assert.equal(output.dataQuality, "PARTIAL");
  assert.equal(output.regime, "RISK_ON_SELECTIVE");
  assert.equal(output.sourceStatus.BTC.status, "MISSING_SOURCE");
  assert.equal(output.sourceStatus.GLD.status, "MISSING_SOURCE");
  const satellites = output.evidence.filter(item => item.featureId.startsWith("btc_") || item.featureId.startsWith("gld_"));
  assert.equal(satellites.length, 16);
  assert.ok(satellites.every(item => item.role === "SATELLITE" || item.role === "PRESENTATION_ONLY"));
});
test("stress absolute-level and joint-shock fixtures retain distinct canonical activation", () => {
  const absolute = scenario("stress-absolute").fixture.output.diagnostics.coreFeatures;
  assert.ok(absolute.vix! >= C03.v_stress);
  assert.equal(absolute.jump_1, 0);
  assert.equal(absolute.jump_5, 0);
  const joint = scenario("stress-joint").fixture.output.diagnostics.coreFeatures;
  assert.ok(joint.vix! < C03.v_stress && joint.vix! >= C03.v_adverse);
  assert.ok(joint.jump_1! >= C03.jump_1 || joint.jump_5! >= C03.jump_5);
  assert.ok(joint.slope! <= -C03.curve_adverse);
});
test("technical failure fixtures never adjudicate STRESS or TRANSITION", () => {
  for (const id of ["incomplete-missing-core", "incomplete-unknown-calendar", "incomplete-stale", "incomplete-with-shock"]) {
    const output = scenario(id).fixture.output;
    assert.equal(output.regime, null); assert.equal(output.systemState, "INCOMPLETE");
    assert.equal(output.dataQuality, "INSUFFICIENT"); assert.equal(output.diagnostics.ruleId, "R00");
  }
  assert.equal(scenario("incomplete-unknown-calendar").fixture.output.sourceStatus.XLK.status, "UNKNOWN_CALENDAR");
  assert.equal(scenario("incomplete-stale").fixture.output.sourceStatus.XLK.status, "STALE_OR_WRONG_SESSION");
  assert.equal(scenario("incomplete-with-shock").fixture.output.pillarStates.volatility, "STRESS");
});
test("sparse-support scenario preserves adverse fragility and benign volatility", () => {
  const output = scenario("transition-fragility").fixture.output;
  assert.equal(output.pillarStates.participation, "ADVERSE");
  assert.equal(output.pillarStates.leadership, "ADVERSE");
  assert.equal(output.pillarStates.fragility, "HIGH");
  assert.equal(output.pillarStates.volatility, "BENIGN");
  assert.equal(output.regime, "TRANSITION");
});
