import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { marketReports } from "../lib/reports/market-reports.ts";
import {
  getHistoricalAutomaticReadings,
  secondJuly2026AutomaticReadings as snapshot,
} from "../lib/reports/historical-automatic-readings.ts";
import { td3Editorial } from "../lib/research/td3-editorial.ts";
import { td3PaperContent } from "../lib/research/td3-paper.ts";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const first = marketReports.find((report) => report.id === "primer-informe-julio-2026");
const second = marketReports.find((report) => report.id === "segundo-informe-julio-2026");

assert(first, "Falta el primer informe.");
assert(second, "Falta el segundo informe.");

function assertIsoDate(value: string, label: string) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} no usa YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.equal(parsed.toISOString().slice(0, 10), value, `${label} no es una fecha ISO válida.`);
}

for (const report of marketReports) {
  assertIsoDate(report.publishedAt, `${report.id}.publishedAt`);
  assertIsoDate(report.modifiedAt, `${report.id}.modifiedAt`);
  assert(report.modifiedAt >= report.publishedAt, `${report.id}: modifiedAt precede a publishedAt.`);
}

assert.deepEqual(
  { publishedAt: first.publishedAt, modifiedAt: first.modifiedAt },
  { publishedAt: "2026-07-06", modifiedAt: "2026-07-06" },
);
assert.deepEqual(
  {
    publishedAt: second.publishedAt,
    modifiedAt: second.modifiedAt,
    editorialCutoffAt: second.editorialCutoffAt,
    automaticDataCutoffAt: second.automaticDataCutoffAt,
  },
  {
    publishedAt: "2026-07-20",
    modifiedAt: "2026-07-20",
    editorialCutoffAt: "2026-07-17",
    automaticDataCutoffAt: "2026-07-18",
  },
);

assert.deepEqual(Object.keys(snapshot), [
  "dataDate",
  "regime",
  "indices",
  "sectors",
  "vix",
  "btcEtfFlows",
  "gldFlowPressure",
  "statisticalAssets",
]);
assert.deepEqual(Object.keys(snapshot.regime), [
  "label",
  "score",
  "confidence",
  "bias",
  "interpretation",
  "support",
  "caution",
  "watch",
]);
assert.deepEqual(Object.keys(snapshot.sectors), [
  "positiveCount",
  "totalCount",
  "negativeCount",
  "dispersion1w",
  "leaders",
  "laggards",
  "reading",
]);
assert.deepEqual(Object.keys(snapshot.vix), [
  "level",
  "change1d",
  "stateLabel",
  "status",
  "momentum",
  "curve",
  "curveText",
]);
assert.deepEqual(Object.keys(snapshot.btcEtfFlows), [
  "lastDayUsdMillions",
  "rolling5dUsdMillions",
  "streakLabel",
  "reading",
]);
assert.deepEqual(Object.keys(snapshot.gldFlowPressure), [
  "asOf",
  "sharesChange5dPct",
  "label",
  "summary",
  "sourceNote",
]);
for (const index of snapshot.indices) {
  assert.deepEqual(Object.keys(index), ["ticker", "return1w", "distanceLongAverage", "distanceFromHigh"]);
}
for (const sector of [...snapshot.sectors.leaders, ...snapshot.sectors.laggards]) {
  assert.deepEqual(Object.keys(sector), ["ticker", "name", "return1w"]);
}
for (const asset of snapshot.statisticalAssets) {
  const expectedKeys = asset.symbol
    ? ["label", "symbol", "percentile", "zScore", "distanceLongAverage", "lastClose"]
    : ["label", "percentile", "zScore", "distanceLongAverage", "lastClose"];
  assert.deepEqual(Object.keys(asset), expectedKeys);
}

assert.equal(snapshot.dataDate, "2026-07-18");
assert.deepEqual(
  {
    label: snapshot.regime.label,
    score: snapshot.regime.score,
    confidence: snapshot.regime.confidence,
    bias: snapshot.regime.bias,
  },
  { label: "Cautela", score: 36, confidence: 58, bias: "cautious" },
);
assert.equal(
  snapshot.regime.interpretation,
  "El mercado muestra deterioro en varias lecturas, pero aún no hay confirmación suficiente para clasificarlo como estrés. Ponderación actual: rotación sectorial 45%, VIX 40%, BTC ETF flows 15% y FedWatch 0% mientras esté pendiente.",
);
assert.deepEqual(snapshot.regime.support, [
  "Rotación: Rotación mixta; no domina una lectura defensiva extrema.",
  "BTC ETF flows: Flujos mixtos aportan lectura neutral.",
]);
assert.deepEqual(snapshot.regime.caution, [
  "Rotación: Defensivos lideran mientras growth/cíclicos quedan débiles.",
  "Volatilidad: Vigilancia: zona de vigilancia.",
  "Momentum VIX: VIX subiendo rápido; aumenta la cautela.",
]);
assert.deepEqual(snapshot.regime.watch, [
  "Curva VIX: Contango moderado.",
  "Flujos BTC ETF: Flujos mixtos.",
  "La lectura sugiere una rotación mixta. No implica dirección futura del mercado.",
]);
assert.deepEqual(snapshot.indices, [
  { ticker: "SPY", return1w: -0.8, distanceLongAverage: 7.2, distanceFromHigh: -1.9 },
  { ticker: "QQQ", return1w: -2.3, distanceLongAverage: 8.7, distanceFromHigh: -6.7 },
  { ticker: "DIA", return1w: -0.7, distanceLongAverage: 7.4, distanceFromHigh: -1.7 },
  { ticker: "IWM", return1w: 0.2, distanceLongAverage: 12, distanceFromHigh: -2.1 },
]);
assert.deepEqual(
  {
    positiveCount: snapshot.sectors.positiveCount,
    totalCount: snapshot.sectors.totalCount,
    negativeCount: snapshot.sectors.negativeCount,
    dispersion1w: snapshot.sectors.dispersion1w,
  },
  { positiveCount: 5, totalCount: 11, negativeCount: 6, dispersion1w: 2.6 },
);
assert.deepEqual(snapshot.sectors.leaders, [
  { ticker: "XLU", name: "Utilities", return1w: 1.2 },
  { ticker: "XLP", name: "Consumo básico/defensivo", return1w: 0.9 },
  { ticker: "XLV", name: "Salud", return1w: 0.7 },
]);
assert.deepEqual(snapshot.sectors.laggards, [
  { ticker: "XLK", name: "Tecnología", return1w: -1.4 },
  { ticker: "XLY", name: "Consumo discrecional", return1w: -0.8 },
  { ticker: "XLE", name: "Energía", return1w: -0.5 },
]);
assert.equal(
  snapshot.sectors.reading,
  "La lectura sugiere una rotación mixta. No implica dirección futura del mercado.",
);
assert.deepEqual(snapshot.vix, {
  level: 18.8,
  change1d: 2,
  stateLabel: "Atención",
  status: "Vigilancia",
  momentum: "Subiendo rápido",
  curve: "Contango moderado",
  curveText:
    "Los contratos más largos cotizan por encima del vencimiento cercano. Es una estructura habitual en entornos de volatilidad más ordenada.",
});
assert.deepEqual(snapshot.btcEtfFlows, {
  lastDayUsdMillions: 124,
  rolling5dUsdMillions: -228,
  streakLabel: "Racha de entradas",
  reading: "No hay una dirección dominante clara en los flujos recientes.",
});
assert.deepEqual(snapshot.gldFlowPressure, {
  asOf: "2026-07-17",
  sharesChange5dPct: -0.34,
  label: "Salida neta probable",
  summary:
    "GLD muestra salida neta probable a 5 sesiones, usando cambios en participaciones como proxy de presión de flujos.",
  sourceNote:
    "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.",
});
assert.deepEqual(snapshot.statisticalAssets, [
  { label: "SPY", percentile: 48.9, zScore: 0.31, distanceLongAverage: 7.2, lastClose: 743.29 },
  { label: "GLD", percentile: 0.7, zScore: -1.99, distanceLongAverage: -10.4, lastClose: 368.41 },
  { label: "EWJ", percentile: 48.9, zScore: 0.19, distanceLongAverage: 5.7, lastClose: 90.49 },
  { label: "FXI", percentile: 22.1, zScore: -0.8, distanceLongAverage: -8.2, lastClose: 34.13 },
  { label: "BTC", symbol: "BTC/USDT", percentile: 18.4, zScore: -0.97, distanceLongAverage: -12.6, lastClose: 63941 },
  { label: "ETH", symbol: "ETH/USDT", percentile: 31.1, zScore: -0.63, distanceLongAverage: -15.8, lastClose: 1844.21 },
]);

assert.equal(getHistoricalAutomaticReadings(first.id), null, "El primer informe no debe recibir snapshot.");
assert.equal(getHistoricalAutomaticReadings(second.id), snapshot, "El segundo informe debe usar el snapshot recuperado.");

const reportRoute = read("app/(es)/informes/[slug]/page.tsx");
assert(!reportRoute.includes("buildWeeklyReportData"), "La ruta histórica aún depende de buildWeeklyReportData.");
assert(reportRoute.includes("getHistoricalAutomaticReadings"), "La ruta histórica no consulta el registro estático.");
assert(reportRoute.includes("datePublished: report.publishedAt"));
assert(reportRoute.includes("dateModified: report.modifiedAt"));
assert(reportRoute.includes("mainEntityOfPage: canonical"));

const historicalComponent = read("components/reports/HistoricalAutomaticMarketReadings.tsx");
for (const label of ["Dato vigente", "Nivel actual", "Lectura actual"]) {
  assert(!historicalComponent.includes(label), `El snapshot histórico contiene la etiqueta actual: ${label}.`);
}
for (const label of [
  "Lecturas automáticas al cierre del informe",
  "Datos con corte a",
  "Dato al corte",
  "Nivel al corte",
  "Lectura al publicar",
]) {
  assert(historicalComponent.includes(label), `Falta la etiqueta histórica: ${label}.`);
}

const weeklyPage = read("app/en/weekly-report/page.tsx");
const weeklyBuilder = read("lib/reports/build-weekly-report-data.ts");
const weeklyComponent = read("components/reports/WeeklyReport.tsx");
assert(weeklyPage.includes("buildWeeklyReportData"));
assert(weeklyPage.includes("export const revalidate"));
assert(!weeklyPage.includes("datePublished"));
assert(!weeklyPage.includes("dateModified"));
assert(weeklyBuilder.includes("dataThrough"));
assert(weeklyComponent.includes('generationDate: "Generated"'));
assert(weeklyComponent.includes('dataDate: "Data through"'));
assert(weeklyComponent.includes('liveData: "Live content"'));

const structuredData = read("lib/seo/structured-data.ts");
assert(structuredData.includes("mainEntityOfPage: options?.mainEntityOfPage ?? url"));
assert(!structuredData.includes("dateModified: options.datePublished"));

for (const locale of ["es", "en"] as const) {
  const editorial = td3Editorial[locale];
  assertIsoDate(editorial.publishedAt, `td3.${locale}.publishedAt`);
  assertIsoDate(editorial.modifiedAt, `td3.${locale}.modifiedAt`);
  assert(editorial.modifiedAt >= editorial.publishedAt);
  assert.equal(editorial.publishedAt, "2026-06-26");
  assert.equal(editorial.modifiedAt, "2026-07-16");
  assert.equal(editorial.headline, td3PaperContent[locale].hero.title);
}

console.log("Editorial validation passed: 2 reports, 1 historical snapshot and 2 TD3 locales.");
