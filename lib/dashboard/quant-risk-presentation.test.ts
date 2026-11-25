import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildQuantRiskPresentation } from "./quant-risk-presentation.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuantRiskPanel } from "../../components/dashboard/QuantRiskPanel.tsx";
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
};

test("preserves EWMA, GARCH, correlation and dispersion in both languages", () => {
  for (const locale of ["es", "en"] as const) {
    const presentation = buildQuantRiskPresentation(automatedData, locale);
    assert.deepEqual(
      presentation.primaryMetrics.map(({ id, value }) => [id, value]),
      [["ewma", "+7.1%"], ["garch", "+7.3%"], ["correlation", "0.12"]],
    );
    assert.deepEqual(presentation.dispersion, [{ label: "1W", value: "+3.4%" }, { label: "1M", value: "+6.8%" }]);
    assert.equal(presentation.status, locale === "es" ? "Datos automatizados" : "Automated data");
  }
});

test("retired fields in a previous cached snapshot cannot reintroduce the index into either rendered panel", () => {
  const legacyCachedData = {
    ...automatedData,
    fragilityScore: 80,
    fragilityLabel: "Alta",
    fragilityInterpretation: "La lectura cuantitativa muestra fragilidad alta.",
  };
  for (const locale of ["es", "en"] as const) {
    const html = renderToStaticMarkup(createElement(QuantRiskPanel, { data: legacyCachedData, locale }));
    assert.doesNotMatch(html, /fragility|fragilidad|80\/100/i);
    assert.match(html, /data-quant-primary-metric="ewma"/);
    assert.match(html, /data-quant-primary-metric="garch"/);
    assert.match(html, /data-quant-primary-metric="correlation"/);
    assert.match(html, /\+7\.1%/);
    assert.match(html, /\+7\.3%/);
    assert.match(html, /0\.12/);
  }
});

test("keeps unavailable model-dependent values unavailable and demo state visible", () => {
  const demo = buildQuantRiskPresentation({
    ...automatedData,
    dataStatus: "demo",
    modelStatus: "insufficient_data",
    ewmaVolAnnualized: null,
    garchVolForecast: null,
    averageCorrelation21d: null,
    updateFrequency: "Automática server-side con caché diaria cuando exista fuente disponible",
  }, "en");

  assert.equal(demo.status, "Demo data");
  assert.equal(demo.primaryMetrics[0].value, "Not enough data");
  assert.equal(demo.primaryMetrics[1].value, "Not enough data");
  assert.equal(demo.primaryMetrics[2].value, "Not enough data");
  assert.ok(demo.primaryMetrics.every((metric) => !metric.available));
  assert.match(demo.interpretation, /demo scenario/);
  assert.equal(demo.updateFrequency, "Automated server-side with a daily cache when a source is available");
});

test("hides legacy EWMA fallback values under the GARCH label while retaining EWMA", () => {
  const fallback = buildQuantRiskPresentation({
    ...automatedData,
    modelStatus: "fallback_ewma",
    garchVolForecast: 18.2,
  }, "en");

  const garch = fallback.primaryMetrics.find((metric) => metric.id === "garch");
  assert.equal(garch?.value, "Not enough data");
  assert.equal(garch?.available, false);
  assert.match(garch?.note ?? "", /Fixed parameters/);
  assert.equal(fallback.readiness.find((item) => item.id === "garch")?.value, "Not enough data");
  assert.equal(fallback.primaryMetrics.find((metric) => metric.id === "ewma")?.value, "+7.1%");
  const html = renderToStaticMarkup(createElement(QuantRiskPanel, { data: { ...automatedData, modelStatus: "fallback_ewma", garchVolForecast: 18.2 }, locale: "en" }));
  assert.doesNotMatch(html, /18\.2%|EWMA fallback/);
});

test("presents unavailable real-sector history as insufficient rather than low risk", () => {
  const unavailable = buildQuantRiskPresentation({
    ...automatedData,
    dataStatus: "unavailable",
    modelStatus: "insufficient_data",
    ewmaVolAnnualized: null,
    ewmaStatus: null,
    garchVolForecast: null,
    garchStatus: null,
    averageCorrelation21d: null,
    sectorDispersion1w: null,
    sectorDispersion1m: null,
    reliabilityNote: "Los modelos no se calculan sin historiales sectoriales reales y completos.",
  }, "en");
  assert.equal(unavailable.status, "Data temporarily unavailable");
  assert.ok(unavailable.primaryMetrics.every((metric) => metric.available === false));
  assert.equal(unavailable.dispersion[0].value, "Not enough data");
  assert.match(unavailable.interpretation, /complete sector history is unavailable/i);
});

test("localizes the presentation and keeps the disclosure collapsed by default", () => {
  const english = buildQuantRiskPresentation(automatedData, "en");
  assert.equal(english.copy.eyebrow, "Quantitative risk");
  assert.equal(english.copy.title, "Statistical conditions");
  assert.equal(english.primaryMetrics[0].value, "+7.1%");
  assert.equal(english.sourceName, "Own calculations on sector ETF proxies via price provider");

  const component = readFileSync(new URL("../../components/dashboard/QuantRiskPanel.tsx", import.meta.url), "utf8");
  assert.match(component, /useState\(false\)/);
  assert.match(component, /DashboardDisclosureButton/);
  assert.match(component, /data-quant-context/);
  assert.doesNotMatch(component, /xl:grid-cols-3|Radar cuantitativo de riesgo|Quantitative risk radar/);
});


const historicalRisk: NonNullable<QuantRiskData["historicalRisk"]> = {
  spy: { status: "available", es95: 0.0321, var95: 0.0211, observations: 1260, tailCount: 63, varRank: 1197, firstReturnDate: "2021-11-22", lastUpdated: "2026-11-24", reason: null },
  absorption: { status: "available", ratio: 0.7362, observations: 500, firstReturnDate: "2024-12-02", lastUpdated: "2026-11-24", reason: null },
  sourceName: "Verified price provider", sourceUrl: "https://example.com/prices", adjustment: "Split and distribution adjusted", updatedAt: "2026-11-25T08:00:00Z", updateStatus: "current",
};

test("new metrics retain their own universe, units, exact windows and observation dates in ES/EN", () => {
  for (const locale of ["es", "en"] as const) {
    const view = buildQuantRiskPresentation({ ...automatedData, historicalRisk }, locale);
    assert.deepEqual(view.historicalMetrics.map(({ id, value, date }) => [id, value, date]), [
      ["es95", locale === "en" ? "3.21%" : "3,21%", `${locale === "en" ? "Data through" : "Datos hasta"} 2026-11-24`],
      ["var95", locale === "en" ? "2.11%" : "2,11%", `${locale === "en" ? "Data through" : "Datos hasta"} 2026-11-24`],
      ["absorption", locale === "en" ? "73.62%" : "73,62%", `${locale === "en" ? "Data through" : "Datos hasta"} 2026-11-24`],
    ]);
    assert.match(view.historicalMetrics[0].label, /SPY/);
    assert.match(view.primaryMetrics[0].label, locale === "en" ? /Sector basket/ : /Cesta sectorial/);
    assert.match(view.primaryMetrics[1].label, /GARCH\(1,1\)/);
    assert.match(view.copy.spyMethod, /63/);
    assert.match(view.copy.spyMethod, /nearest rank|nearest-rank/);
    assert.match(view.copy.spyMethod, locale === "en" ? /1,197/ : /1\.197/);
    assert.match(view.copy.absorptionScope, /11.*2.*500/);
    assert.match(view.copy.absorptionMethod, /250/);
    assert.match(view.copy.volatilityMethod, locale === "en" ? /maximum likelihood/ : /máxima verosimilitud/);
    assert.equal(view.spyDateRange, "2021-11-22 – 2026-11-24");
    assert.equal(view.absorptionDateRange, "2024-12-02 – 2026-11-24");
    assert.equal(view.primaryMetrics.length, 3);
    const html = renderToStaticMarkup(createElement(QuantRiskPanel, { data: { ...automatedData, historicalRisk }, locale }));
    assert.doesNotMatch(html, /data-quant-detail-metric|3\.21%|73\.62%/);
  }
});

test("retained historical metrics keep original dates and signed loss values", () => {
  const view = buildQuantRiskPresentation({ ...automatedData, historicalRisk: {
    ...historicalRisk, updateStatus: "retained", updatedAt: "2026-11-25T12:00:00Z", spy: { ...historicalRisk.spy, es95: -0.001, var95: -0.002 },
  } }, "en");
  assert.equal(view.historicalRetained, true);
  assert.equal(view.historicalMetrics[0].value, "-0.10%");
  assert.equal(view.historicalMetrics[1].value, "-0.20%");
  assert.equal(view.historicalMetrics[0].date, "Data through 2026-11-24");
});

test("missing or unavailable historical windows do not display stale numeric fields", () => {
  const missing = buildQuantRiskPresentation(automatedData, "es");
  assert.ok(missing.historicalMetrics.every((metric) => !metric.available && metric.value === "Datos insuficientes"));
  assert.match(missing.spyWindow, /0 \/ 1\.260/);
  const unavailable = buildQuantRiskPresentation({ ...automatedData, historicalRisk: {
    ...historicalRisk, spy: { ...historicalRisk.spy, status: "unavailable", observations: 100 }, absorption: { ...historicalRisk.absorption, status: "unavailable", observations: 80 },
  } }, "en");
  assert.ok(unavailable.historicalMetrics.every((metric) => !metric.available && metric.value === "Not enough data"));
  assert.match(unavailable.spyWindow, /100 \/ 1,260/);
  assert.match(unavailable.absorptionWindow, /80 \/ 500/);
});

test("old cached provider diagnostics stay outside both language interfaces", () => {
  for (const locale of ["es", "en"] as const) {
    const view = buildQuantRiskPresentation({ ...automatedData, dataStatus: "unavailable", reliabilityNote: "Detalle técnico: internal provider failure" }, locale);
    assert.doesNotMatch(view.interpretation, /Detalle técnico|internal provider failure/);
    assert.match(view.interpretation, locale === "es" ? /histórico sectorial/ : /sector history/);
  }
});

test("unavailable historical metrics explain the concrete data-quality issue in ES and EN", () => {
  const cases: [string, RegExp, RegExp][] = [
    ["XLK adjusted closes: 500/501; missing session 2026-11-23", /XLK: 500 de 501.*falta la sesión 2026-11-23/, /XLK: 500 of 501.*missing trading session 2026-11-23/],
    ["SPY adjusted closes: 1260/1261; missing session 2026-11-23", /SPY: 1260 de 1261.*falta la sesión/, /SPY: 1260 of 1261.*missing trading session/],
    ["XLF: Duplicate adjusted close on 2026-11-20", /XLF: Cierre ajustado duplicado.*2026-11-20/, /XLF: Duplicate adjusted close.*2026-11-20/],
    ["Invalid adjusted close on 2026-11-20", /Cierre ajustado no válido.*2026-11-20/, /Invalid adjusted close.*2026-11-20/],
    ["Trading-session calendar: 400/501 closes", /400 de las 501 fechas/, /400 of the 501 required close dates/],
    ["Trading-session calendar does not include 2026-11-24", /calendario de sesiones no incluye 2026-11-24/, /calendar does not include 2026-11-24/],
    ["Invalid or duplicate trading-session dates", /fechas no válidas o duplicadas/, /invalid or duplicate dates/],
    ["Absorption ratio requires all 11 fixed sector ETFs, without duplicate symbols", /11 ETF sectoriales fijos.*sin símbolos ausentes ni duplicados/, /11 fixed sector ETFs.*no missing or duplicate symbols/],
    ["Sector covariance has no positive variance or is numerically invalid", /varianza total nula/, /zero total variance/],
    ["Adjusted source not verified", /No se ha verificado el ajuste.*splits y distribuciones/, /adjustment for splits and distributions has not been verified/],
  ];
  for (const locale of ["es", "en"] as const) for (const [reason, spanish, english] of cases) {
    const view = buildQuantRiskPresentation({ ...automatedData, historicalRisk: {
      ...historicalRisk, absorption: { ...historicalRisk.absorption, status: "unavailable", ratio: null, observations: 500, reason },
    } }, locale);
    const metric = view.historicalMetrics.find(({ id }) => id === "absorption");
    assert.match(metric?.reason ?? "", locale === "es" ? spanish : english, reason);
    assert.equal(metric?.available, false);
    assert.match(view.absorptionWindow, /500 \/ 500/);
  }
});

test("GARCH rejects non-finite and negative legacy cached values", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    const view = buildQuantRiskPresentation({ ...automatedData, garchVolForecast: value }, "en");
    assert.equal(view.primaryMetrics.find(({ id }) => id === "garch")?.value, "Not enough data");
    assert.equal(view.primaryMetrics.find(({ id }) => id === "garch")?.available, false);
  }
});

test("Yahoo source and adjustment metadata remain localized without changing provider identity", () => {
  const data = { ...automatedData, historicalRisk: { ...historicalRisk, sourceName: "Yahoo Finance chart API · adjusted daily closes", adjustment: "Yahoo Finance adjclose, adjusted for splits and cash distributions" } };
  const spanish = buildQuantRiskPresentation(data, "es");
  const english = buildQuantRiskPresentation(data, "en");
  assert.equal(spanish.historicalSource, "Yahoo Finance · cierres diarios ajustados");
  assert.equal(english.historicalSource, "Yahoo Finance · adjusted daily closes");
  assert.equal(spanish.historicalAdjustment, "Yahoo Finance adjclose · Ajustado por splits y distribuciones");
  assert.equal(english.historicalAdjustment, "Yahoo Finance adjclose · Adjusted for splits and distributions");
  assert.equal(spanish.historicalSourceUrl, historicalRisk.sourceUrl);
});


test("reused Quantitative Analysis source metadata is translated in both languages", () => {
  const data = { ...automatedData, historicalRisk: { ...historicalRisk, sourceName: "Yahoo Finance · histórico ajustado de Análisis Cuantitativo", adjustment: "Cierres ajustados por splits y distribuciones" } };
  const spanish = buildQuantRiskPresentation(data, "es");
  const english = buildQuantRiskPresentation(data, "en");
  assert.equal(spanish.historicalSource, "Yahoo Finance · histórico ajustado de Análisis Cuantitativo");
  assert.equal(english.historicalSource, "Yahoo Finance · Quantitative Analysis adjusted history");
  assert.equal(spanish.historicalAdjustment, "Ajustado por splits y distribuciones");
  assert.equal(english.historicalAdjustment, "Adjusted for splits and distributions");
});
