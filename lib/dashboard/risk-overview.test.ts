import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildRiskOverview } from "./risk-overview.ts";
import { buildUnavailableQuantRiskData } from "./risk-models.ts";
import { DashboardSectionOverview } from "../../components/dashboard/DashboardSectionOverview.tsx";
import type { QuantRiskData, VixSpotData, VixTermStructureData } from "./types.ts";

function inputs() {
  const quantRisk: QuantRiskData = {
    ...buildUnavailableQuantRiskData("test"), dataStatus: "automated", lastUpdated: "Fuente: 2026-11-20",
    ewmaVolAnnualized: 18.9, garchVolForecast: 18.2, modelStatus: "estimated",
    historicalRisk: {
      spy: { status: "available", es95: 0.0255, var95: 0.0169, observations: 1260, tailCount: 63, varRank: 1197, firstReturnDate: "2021-11-17", lastUpdated: "2026-11-24", reason: null },
      absorption: { status: "available", ratio: 0.6383, observations: 500, firstReturnDate: "2024-11-26", lastUpdated: "2026-11-23", reason: null },
      sourceName: "Yahoo Finance", sourceUrl: "https://finance.yahoo.com", adjustment: "Adjusted", updatedAt: "2026-11-25T12:00:00Z", updateStatus: "current",
    },
  };
  const vixSpot = { dataStatus: "automated", latestVix: 26.62, lastObservationDate: "2026-11-23", vixLevelLabel: "Tensión" } as VixSpotData;
  const vixTermStructure = { sourceStatus: "automated", classification: "Plano", lastUpdated: "2026-11-24" } as VixTermStructureData;
  return { quantRisk, vixSpot, vixTermStructure };
}

test("risk overview groups VIX with VX, EWMA with GARCH, then retains distinct SPY VaR and sector AR cards", () => {
  const source = inputs();
  const items = buildRiskOverview(source, "es");
  assert.deepEqual(items.map(item => item.id), ["vix", "ewma-garch", "var95", "absorption"]);
  assert.equal(items[0].value, "26,62");
  assert.equal(items[0].secondary?.value, "Plano");
  assert.equal(items[1].value, "18,9%");
  assert.equal(items[1].secondary?.value, "18,2%");
  assert.match(items[1].secondary?.detail ?? "", /Parámetros fijos/);
  assert.equal(items[2].value, "1,69%");
  assert.equal(items[2].label, "VaR95");
  assert.match(items[2].detail ?? "", /SPY · Pérdida a una sesión/);
  assert.equal(items[3].value, "63,83%");
  assert.match(items[3].detail ?? "", /Varianza explicada.*11 ETF.*500 sesiones.*2 componentes/);
  assert.equal(items.some(item => /ES95/.test(item.label)), false, "ES stays in the existing risk detail");
});

test("every measure keeps its own date instead of borrowing the newest source cut", () => {
  const items = buildRiskOverview(inputs(), "en");
  assert.equal(items[0].date, "Nov 23, 2026");
  assert.equal(items[0].secondary?.date, "Nov 24, 2026");
  assert.equal(items[1].date, "Nov 20, 2026");
  assert.equal(items[1].secondary?.date, "Nov 20, 2026");
  assert.equal(items[2].date, "Nov 24, 2026");
  assert.equal(items[3].date, "Nov 23, 2026");
  assert.equal(items[0].secondary?.value, "Flat");
  assert.equal(items[2].label, "VaR95");
  assert.match(items[2].detail ?? "", /SPY · One-session loss/);
});

test("VX retains the actual adapter's localized settlement date in both languages", () => {
  const source = inputs();
  for (const date of ["Último settlement disponible: 24 de nov de 2026", "Último settlement disponible:24 de nov de2026", "Último settlement disponible: 24 nov. 2026", "24 de noviembre de 2026"]) {
    source.vixTermStructure.lastUpdated = date;
    assert.equal(buildRiskOverview(source, "es")[0].secondary?.date, "24 nov 2026");
    assert.equal(buildRiskOverview(source, "en")[0].secondary?.date, "Nov 24, 2026");
    assert.equal(buildRiskOverview(source, "en")[0].date, "Nov 23, 2026");
  }
});

test("all Spanish settlement month names resolve and impossible dates stay unavailable", () => {
  const source = inputs();
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const [index, month] of months.entries()) {
    source.vixTermStructure.lastUpdated = `Último settlement disponible: 05 de ${month} de 2026`;
    assert.equal(buildRiskOverview(source, "en")[0].secondary?.date, `${expected[index]} 5, 2026`);
  }
  for (const date of ["31 de febrero de 2026", "29 feb 2025", "00 nov 2026", "32 nov 2026", "24 unknown 2026", "2026-02-30"]) {
    source.vixTermStructure.lastUpdated = date;
    assert.equal(buildRiskOverview(source, "en")[0].secondary?.date, undefined);
  }
});

test("an EWMA fallback cannot appear under GARCH and independent historical risk remains visible", () => {
  const source = inputs();
  source.quantRisk.modelStatus = "fallback_ewma";
  source.quantRisk.garchVolForecast = source.quantRisk.ewmaVolAnnualized;
  const items = buildRiskOverview(source, "en");
  assert.equal(items[1].value, "18.9%");
  assert.equal(items[1].secondary?.value, "Unavailable");
  assert.equal(items[1].secondary?.date, undefined);
  assert.equal(items[2].value, "1.69%");
  source.quantRisk.dataStatus = "unavailable";
  const unavailable = buildRiskOverview(source, "en");
  assert.equal(unavailable[1].value, "Unavailable");
  assert.equal(unavailable[2].value, "1.69%");
  assert.equal(unavailable[3].value, "63.83%");
});

test("the SPY loss retains its mathematical sign and fixed windows cannot be shortened", () => {
  const source = inputs();
  source.quantRisk.historicalRisk!.spy.var95 = -0.001;
  assert.equal(buildRiskOverview(source, "es")[2].value, "−0,10%");
  source.quantRisk.historicalRisk!.spy.observations = 1259;
  source.quantRisk.historicalRisk!.absorption.observations = 499;
  const short = buildRiskOverview(source, "es");
  assert.equal(short[2].value, "No disponible");
  assert.equal(short[3].value, "No disponible");
  assert.equal(short[2].date, undefined);
  assert.equal(short[3].date, undefined);
});

test("paired summary cards render both labels and dates while ordinary summaries retain their original structure", () => {
  const items = buildRiskOverview(inputs(), "en");
  const paired = renderToStaticMarkup(createElement(DashboardSectionOverview, { id: "risk", title: "Risk", items }));
  assert.equal((paired.match(/data-overview-paired="true"/g) ?? []).length, 2);
  assert.equal((paired.match(/data-overview-item=/g) ?? []).length, 4);
  assert.match(paired, /VX futures structure/);
  assert.match(paired, /GARCH\(1,1\)/);
  const ordinary = renderToStaticMarkup(createElement(DashboardSectionOverview, { id: "flows", title: "Flows", items: [{ id: "btc", label: "Bitcoin", value: "12 M USD", detail: "1D", date: "Nov 24, 2026" }] }));
  assert.doesNotMatch(ordinary, /data-overview-paired|data-overview-secondary|data-overview-available/);
  assert.match(ordinary, /12 M USD/);
});
