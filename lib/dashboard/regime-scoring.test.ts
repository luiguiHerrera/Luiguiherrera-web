import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRegimeSummary } from "./regime-scoring.ts";
import type { BtcEtfFlowsDashboardData, SectorRotationData, VixDashboardData } from "./types.ts";

function qualifiedSector(): SectorRotationData {
  const sectors = [
    ["Growth 1", "growth", 3.0],
    ["Growth 2", "growth", 2.9],
    ["Cyclical 1", "cyclical", 2.8],
    ["Cyclical 2", "cyclical", 2.7],
    ["Other", "growth", 2.6],
    ["Middle", "cyclical", 2.5],
    ["Defensive 1", "defensive", 2.4],
    ["Defensive 2", "defensive", 2.3],
    ["Defensive 3", "defensive", 2.2],
    ["Defensive 4", "defensive", 2.1],
    ["Defensive 5", "defensive", 2.0],
  ].map(([sectorName, group, return1w], index) => ({
    sectorName,
    group,
    return1w,
    return1m: Number(return1w),
    etfTicker: `T${index}`,
  }));

  return {
    dataStatus: "automated",
    sectors,
    metrics: {
      reading: "growth",
      sectorDispersion1w: 1,
      interpretation: "La lectura sugiere una rotación growth.",
    },
  } as unknown as SectorRotationData;
}

function qualifiedVix(): VixDashboardData {
  return {
    spot: {
      latestVix: 14,
      dataStatus: "automated",
      vixCompositeLabel: "Normal bajo",
      vixSeverity: "normal",
      vixTrend: "falling",
    },
  } as unknown as VixDashboardData;
}

function qualifiedBtc(dataStatus: "automated" | "delayed" = "automated"): BtcEtfFlowsDashboardData {
  return {
    flows: {
      dataStatus,
      sourceRole: "primary",
      coverage: "partial",
      rowsParsed: 10,
      readingSeverity: "neutral",
      flowStreak: { direction: "none", count: 0, label: "Sin racha clara" },
    },
  } as unknown as BtcEtfFlowsDashboardData;
}

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

test("automated partial BTC preserves the governed score and confidence", () => {
  const result = buildRegimeSummary({
    sectorRotation: qualifiedSector(),
    vix: qualifiedVix(),
    btcEtfFlows: qualifiedBtc(),
  });

  assert.equal(result.regimeScore, 76);
  assert.equal(result.confidence, 82);
  assert.equal(result.dataStatus, "automated");
});

test("delayed partial BTC keeps the score and propagates update pending semantics", () => {
  const result = buildRegimeSummary({
    sectorRotation: qualifiedSector(),
    vix: qualifiedVix(),
    btcEtfFlows: qualifiedBtc("delayed"),
  });

  assert.equal(result.regimeScore, 76);
  assert.equal(result.confidence, 74);
  assert.equal(result.dataStatus, "delayed");
});

test("unavailable BTC is neutralized without consuming any fabricated values", () => {
  const unavailable = qualifiedBtc();
  unavailable.flows.dataStatus = "unavailable";
  unavailable.flows.sourceRole = "unavailable";
  unavailable.flows.rowsParsed = 0;
  unavailable.flows.readingSeverity = "positive";
  unavailable.flows.flowStreak = { direction: "inflow", count: 99, label: "fabricated" };

  const result = buildRegimeSummary({
    sectorRotation: qualifiedSector(),
    vix: qualifiedVix(),
    btcEtfFlows: unavailable,
  });

  assert.equal(result.regimeScore, 76);
  assert.equal(result.confidence, 73);
  assert.ok(result.cautionSignals.some((signal) => signal.detail.includes("no disponibles")));
  assert.ok(result.riskSupportSignals.every((signal) => signal.detail !== "fabricated"));
});
