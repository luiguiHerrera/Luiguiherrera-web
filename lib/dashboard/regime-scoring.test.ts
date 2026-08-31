import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRegimeSummary } from "./regime-scoring.ts";

test("missing sector pillar fails closed without a normal score or confidence", () => {
  const result = buildRegimeSummary({ sectorRotation: null, vix: null, btcEtfFlows: null });
  assert.equal(result.current, "Incompleto");
  assert.equal(result.bias, "unavailable");
  assert.equal(result.regimeScore, null);
  assert.equal(result.confidence, null);
  assert.equal(result.dataStatus, "unavailable");
  assert.match(result.interpretation, /No se renormalizan los pesos restantes/);
});

test("governed weights remain unchanged and no missing-pillar renormalization exists", () => {
  const source = readFileSync(new URL("./regime-scoring.ts", import.meta.url), "utf8");
  assert.match(source, /sectorRotation: 0\.45/);
  assert.match(source, /vix: 0\.4/);
  assert.match(source, /btcEtfFlows: 0\.15/);
  assert.doesNotMatch(source, /renormaliz[^\n]*score|remainingWeight|availableWeight/i);
});
