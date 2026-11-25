import assert from "node:assert/strict";
import test from "node:test";
import { buildQuantRiskData, buildUnavailableQuantRiskData, withoutRetiredSectorIndex } from "./risk-models.ts";
import type { SectorEtfSnapshot, SectorRotationMetrics } from "./types.ts";

test("missing real history is insufficient, not low risk", () => {
  const data = buildUnavailableQuantRiskData("provider unavailable");
  assert.equal(data.dataStatus, "unavailable");
  assert.equal(data.modelStatus, "insufficient_data");
  assert.equal("fragilityScore" in data, false);
  assert.equal("fragilityLabel" in data, false);
  assert.equal(data.ewmaStatus, null);
  assert.equal(data.garchStatus, null);
});

test("short sector history leaves EWMA available without relabeling it as GARCH", () => {
  const sectors = Array.from({ length: 11 }, (_, index) => ({
    dailyReturns: Array.from({ length: 42 }, (_, day) => Math.sin(day + index) / 100),
    group: index < 5 ? "defensive" : "growth",
  })) as SectorEtfSnapshot[];
  const data = buildQuantRiskData(sectors, { sectorDispersion1w: 1, sectorDispersion1m: 2 } as SectorRotationMetrics, "2026-11-24");
  assert.ok(Number.isFinite(data.ewmaVolAnnualized));
  assert.equal(data.garchVolForecast, null);
  assert.equal(data.garchStatus, null);
  assert.equal(data.modelStatus, "insufficient_data");
});

test("legacy cached EWMA fallback cannot masquerade as a GARCH result", () => {
  const cached = { ...buildUnavailableQuantRiskData("test"), ewmaVolAnnualized: 12, garchVolForecast: 12,
    modelStatus: "fallback_ewma" as const, garchStatus: "normal" as const };
  const clean = withoutRetiredSectorIndex(cached);
  assert.equal(clean.ewmaVolAnnualized, 12);
  assert.equal(clean.garchVolForecast, null);
  assert.equal(clean.modelStatus, "insufficient_data");
  assert.equal(cached.garchVolForecast, 12);
});
