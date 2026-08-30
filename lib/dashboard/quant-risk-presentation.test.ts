import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildQuantRiskPresentation } from "./quant-risk-presentation.ts";
import type { QuantRiskData } from "./types.ts";

const automatedData: QuantRiskData = {
  sourceName: "Cálculos propios sobre ETFs sectoriales vía proveedor de precios",
  sourceUrl: "https://www.alphavantage.co/documentation/",
  lastUpdated: "Automático con fuente pública: 2026-08-28",
  updateFrequency: "Automática server-side con caché diaria; revisión periódica sugerida",
  dataStatus: "automated",
  reliabilityNote: "Los modelos cuantitativos son sensibles a ventanas, supuestos y calidad de datos. No predicen dirección de mercado.",
  ewmaVolAnnualized: 7.1,
  ewmaVolChange: 0.2,
  ewmaStatus: "normal",
  garchVolForecast: 7.3,
  garchStatus: "normal",
  modelStatus: "estimated",
  averageCorrelation21d: 0.12,
  averageCorrelation63d: 0.18,
  defensiveGrowthCorrelation21d: 0.2,
  sectorDispersion1w: 3.4,
  sectorDispersion1m: 6.8,
  fragilityScore: 20,
  fragilityLabel: "Baja",
  fragilityInterpretation: "La lectura cuantitativa muestra fragilidad baja.",
};

test("maps the four primary metrics to their existing analytical fields", () => {
  const presentation = buildQuantRiskPresentation(automatedData, "es");
  assert.deepEqual(
    presentation.primaryMetrics.map(({ id, value }) => [id, value]),
    [
      ["fragility", "20/100 · Baja"],
      ["ewma", "+7.1%"],
      ["garch", "+7.3%"],
      ["correlation", "0.12"],
    ],
  );
  assert.equal(presentation.status, "Datos automatizados");
});

test("keeps unavailable model-dependent values unavailable and demo state visible", () => {
  const demo = buildQuantRiskPresentation({
    ...automatedData,
    dataStatus: "demo",
    modelStatus: "insufficient_data",
    ewmaVolAnnualized: null,
    garchVolForecast: null,
    averageCorrelation21d: null,
    fragilityScore: 0,
    fragilityLabel: "Baja",
    updateFrequency: "Automática server-side con caché diaria cuando exista fuente disponible",
  }, "en");

  assert.equal(demo.status, "Demo data");
  assert.equal(demo.primaryMetrics[0].value, "Not enough data");
  assert.equal(demo.primaryMetrics[1].value, "Not enough data");
  assert.equal(demo.primaryMetrics[2].value, "Not enough data");
  assert.equal(demo.primaryMetrics[3].value, "Not enough data");
  assert.ok(demo.primaryMetrics.every((metric) => !metric.available));
  assert.match(demo.interpretation, /demo scenario/);
  assert.equal(demo.updateFrequency, "Automated server-side with a daily cache when a source is available");
});

test("labels an existing EWMA fallback without presenting it as a native GARCH estimate", () => {
  const fallback = buildQuantRiskPresentation({
    ...automatedData,
    modelStatus: "fallback_ewma",
    garchVolForecast: 18.2,
  }, "en");

  const garch = fallback.primaryMetrics.find((metric) => metric.id === "garch");
  assert.equal(garch?.value, "+18.2%");
  assert.equal(garch?.note, "EWMA fallback");
  assert.equal(fallback.readiness.find((item) => item.id === "garch")?.value, "EWMA fallback");
});

test("localizes the presentation and keeps the disclosure collapsed by default", () => {
  const english = buildQuantRiskPresentation(automatedData, "en");
  assert.equal(english.copy.eyebrow, "Quantitative risk");
  assert.equal(english.copy.title, "Statistical conditions");
  assert.equal(english.primaryMetrics[0].value, "20/100 · Low");
  assert.equal(english.sourceName, "Own calculations on sector ETF proxies via price provider");

  const component = readFileSync(new URL("../../components/dashboard/QuantRiskPanel.tsx", import.meta.url), "utf8");
  assert.match(component, /useState\(false\)/);
  assert.match(component, /DashboardDisclosureButton/);
  assert.match(component, /data-quant-context/);
  assert.doesNotMatch(component, /xl:grid-cols-3|Radar cuantitativo de riesgo|Quantitative risk radar/);
});
