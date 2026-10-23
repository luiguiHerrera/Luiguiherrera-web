import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { translateDashboardText } from "./translate-dashboard-copy.ts";
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

test("unavailable BTC blocks calculation without consuming any fabricated values", () => {
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

  assert.equal(result.regimeScore, null);
  assert.equal(result.confidence, null);
  assert.deepEqual(result.cautionSignals.map((signal) => signal.label), ["BTC ETF flows"]);
  assert.ok(result.riskSupportSignals.every((signal) => signal.detail !== "fabricated"));
});

// Synthetic fixtures only: these are not the historical FRED response.
for (let mask = 0; mask < 8; mask++) {
  test(`all required pillars: availability mask ${mask.toString(2).padStart(3, "0")} in ES/EN`, () => {
    const result = buildRegimeSummary({
      sectorRotation: mask & 4 ? qualifiedSector() : null,
      vix: mask & 2 ? qualifiedVix() : null,
      btcEtfFlows: mask & 1 ? qualifiedBtc() : null,
    });
    if (mask === 7) {
      assert.equal(result.regimeScore, 76);
      assert.equal(result.confidence, 82);
      assert.equal(result.current, "Risk-on selectivo");
      assert.equal(result.bias, "favorable");
      assert.equal(result.dataStatus, "automated");
      return;
    }
    assert.equal(result.current, "Incompleto");
    assert.equal(translateDashboardText(result.current), "Incomplete");
    assert.equal(result.bias, "unavailable");
    assert.equal(result.dataStatus, "unavailable");
    assert.equal(result.regimeScore, null);
    assert.equal(result.confidence, null);
    assert.deepEqual(result.riskSupportSignals, []);
    const expected = [
      { bit: 4, label: "Rotación", es: "Pilar de rotación sectorial ausente o inválido.", en: "Sector-rotation pillar missing or invalid." },
      { bit: 2, label: "VIX", es: "Pilar VIX ausente o inválido.", en: "VIX pillar missing or invalid." },
      { bit: 1, label: "BTC ETF flows", es: "Pilar BTC ETF flows ausente o inválido.", en: "BTC ETF flows pillar missing or invalid." },
    ];
    assert.deepEqual(result.cautionSignals.map((signal) => signal.label), expected.filter((p) => !(mask & p.bit)).map((p) => p.label));
    for (const p of expected) {
      assert.equal(result.interpretation.includes(p.es), !(mask & p.bit));
      assert.equal(translateDashboardText(result.interpretation).includes(p.en), !(mask & p.bit));
    }
    for (const signal of result.cautionSignals) {
      assert.equal(translateDashboardText(signal.detail), expected.find((p) => p.label === signal.label)!.en);
    }
  });
}

test("invalid required inputs block calculation without throwing or emitting directional signals", () => {
  type Inputs = Parameters<typeof buildRegimeSummary>[0];
  const cases: Array<[string, (input: Inputs) => void]> = [
    ["Rotación", (i) => { i.sectorRotation!.dataStatus = "fallback"; }],
    ["Rotación", (i) => { i.sectorRotation!.sectors = []; }],
    ["Rotación", (i) => { i.sectorRotation!.sectors[0].return1w = NaN; }],
    ["Rotación", (i) => { i.sectorRotation!.metrics.sectorDispersion1w = Infinity; }],
    ["VIX", (i) => { i.vix!.spot.latestVix = null; }],
    ["VIX", (i) => { i.vix!.spot.latestVix = NaN; }],
    ["VIX", (i) => { i.vix!.spot.latestVix = Infinity; }],
    ["VIX", (i) => { i.vix!.spot.latestVix = -1; }],
    ["VIX", (i) => { i.vix!.spot.dataStatus = "unavailable"; }],
    ["VIX", (i) => { i.vix!.spot.dataStatus = "delayed"; }],
    ["VIX", (i) => { i.vix!.spot.dataStatus = "fallback"; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.dataStatus = "unavailable"; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.sourceRole = "unavailable"; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.coverage = "unavailable"; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.rowsParsed = 0; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.rowsParsed = NaN; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.readingSeverity = "pending"; }],
    ["BTC ETF flows", (i) => { i.btcEtfFlows!.flows.flowStreak.count = Infinity; }],
  ];
  for (const [pillar, mutate] of cases) {
    const input = { sectorRotation: qualifiedSector(), vix: qualifiedVix(), btcEtfFlows: qualifiedBtc() };
    mutate(input);
    const result = buildRegimeSummary(input);
    assert.equal(result.current, "Incompleto", pillar);
    assert.equal(result.bias, "unavailable", pillar);
    assert.equal(result.dataStatus, "unavailable", pillar);
    assert.equal(result.regimeScore, null, pillar);
    assert.equal(result.confidence, null, pillar);
    assert.deepEqual(result.cautionSignals.map((s) => s.label), [pillar]);
    assert.deepEqual(result.riskSupportSignals, []);
  }
});

test("real secondary BTC and usable partial histories retain previous scores and quality penalties", () => {
  for (const sourceRole of ["primary", "fallback"] as const) {
    for (const dataStatus of ["automated", "delayed"] as const) {
      for (const [rowsParsed, automatedConfidence] of [[1, 78], [5, 78], [10, 82], [19, 82], [20, 88]]) {
        const btcEtfFlows = qualifiedBtc(dataStatus);
        Object.assign(btcEtfFlows.flows, { sourceRole, rowsParsed, coverage: rowsParsed < 20 ? "partial" : "complete" });
        const result = buildRegimeSummary({ sectorRotation: qualifiedSector(), vix: qualifiedVix(), btcEtfFlows });
        assert.equal(result.regimeScore, 76);
        assert.equal(result.confidence, dataStatus === "automated" ? automatedConfidence : 74);
        assert.equal(result.dataStatus, dataStatus);
      }
    }
  }
});
