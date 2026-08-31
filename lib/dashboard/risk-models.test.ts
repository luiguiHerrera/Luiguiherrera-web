import assert from "node:assert/strict";
import test from "node:test";
import { buildUnavailableQuantRiskData } from "./risk-models.ts";

test("missing real history is insufficient, not low risk", () => {
  const data = buildUnavailableQuantRiskData("provider unavailable");
  assert.equal(data.dataStatus, "unavailable");
  assert.equal(data.modelStatus, "insufficient_data");
  assert.equal(data.fragilityScore, null);
  assert.equal(data.fragilityLabel, null);
  assert.equal(data.ewmaStatus, null);
  assert.equal(data.garchStatus, null);
});
