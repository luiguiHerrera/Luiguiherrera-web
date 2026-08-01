import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { marketReports } from "../lib/reports/market-reports.ts";
import { exclusiveAllDayEnd, getMonthGrid, getReportCalendar } from "../lib/reports/report-presentation.ts";
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
const august = marketReports.find((report) => report.id === "primer-informe-agosto-2026");

assert(first, "Falta el primer informe.");
assert(second, "Falta el segundo informe.");
assert(august, "Falta el primer informe de agosto.");

function assertIsoDate(value: string, label: string) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} no usa YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.equal(parsed.toISOString().slice(0, 10), value, `${label} no es una fecha ISO válida.`);
}

function dateTimeParts(value: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
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
assert.deepEqual(
  {
    publishedAt: august.publishedAt,
    modifiedAt: august.modifiedAt,
    editorialCutoffAt: august.editorialCutoffAt,
    automaticDataCutoffAt: august.automaticDataCutoffAt,
    status: august.status,
  },
  {
    publishedAt: "2026-08-01",
    modifiedAt: "2026-08-01",
    editorialCutoffAt: "2026-07-31",
    automaticDataCutoffAt: "2026-07-31",
    status: "actual",
  },
);
assert.equal(second.status, "archivado");
assert.deepEqual(
  august.executiveSummary.map((item) => item.title),
  ["VOO", "GLD", "EWJ", "FXI", "BTC / ETH", "Stockpicking"],
);
assert.deepEqual(
  august.assetReadings.map((item) => item.asset),
  [
    "VOO / S&P 500",
    "GLD / Oro",
    "EWJ / Japón",
    "FXI / China",
    "BTC / ETH",
    "Stockpicking",
    "DXY / USD/COP",
  ],
);
assert.equal(august.transversalFactor?.title, "DXY / USD/COP");
assert.equal(getHistoricalAutomaticReadings(august.id)?.dataDate, "2026-07-31", "Agosto debe usar el snapshot congelado al cierre.");
for (const forbidden of ["familia", "portafolio", "portfolio", "destinatario privado"]) {
  assert(
    !JSON.stringify(august).toLocaleLowerCase("es").includes(forbidden),
    `El informe de agosto expone contexto privado: ${forbidden}.`,
  );
}

assert.equal(august.presentation?.year, 2026);
assert.equal(august.presentation?.month, 8);
assert.deepEqual(august.presentation?.enabledModules, ["automatic-readings", "probable-routes", "stockpicking-earnings"]);
const augustCalendar = getReportCalendar(august);
assert.equal(august.calendar.length, 9, "La base editorial conserva nueve eventos no derivados.");
assert.equal(augustCalendar.length, 18, "El calendario combinado debe contener 18 eventos.");
assert.equal(new Set(augustCalendar.map((event) => event.id)).size, augustCalendar.length, "Los eventos de agosto requieren identificadores únicos.");
for (const event of augustCalendar) {
  assert(event.id, `Evento sin id: ${event.event}`);
  assert(event.dateStart, `${event.id}: falta fecha inicial.`);
  assertIsoDate(event.dateStart, `${event.id}.dateStart`);
  assert(event.dateStart.startsWith("2026-08-"), `${event.id}: fecha fuera de agosto de 2026.`);
  if (event.dateEnd) {
    assertIsoDate(event.dateEnd, `${event.id}.dateEnd`);
    assert(event.dateEnd.startsWith("2026-08-"), `${event.id}: fecha final fuera de agosto de 2026.`);
    assert(event.dateEnd >= event.dateStart, `${event.id}: fecha final anterior a la inicial.`);
  }
  assert(event.category, `${event.id}: falta categoría.`);
  assert(event.timeStatus, `${event.id}: falta estado de hora.`);
  assert(event.originalTimeZone, `${event.id}: falta zona horaria original.`);
  assert(event.affectedAssets?.length, `${event.id}: faltan activos o factores afectados.`);
  assert(event.sourceLabel && event.sourceHref, `${event.id}: falta fuente primaria.`);
  assert.match(event.sourceHref, /^https:\/\//, `${event.id}: la fuente debe usar HTTPS.`);
  assert(!event.sourceHref.includes("utm_source=chatgpt.com"), `${event.id}: la fuente contiene UTM de ChatGPT.`);
  if (event.timeStatus === "confirmed") {
    assert.match(event.startDateTimeUtc ?? "", /^2026-08-\d{2}T\d{2}:\d{2}:00Z$/, `${event.id}: hora UTC confirmada inválida.`);
    assert.match(event.originalTime ?? "", /^\d{2}:\d{2}$/, `${event.id}: hora original confirmada inválida.`);
    assert.match(event.displayTimeCest ?? "", /^\d{2}:\d{2} CEST$/, `${event.id}: conversión CEST inválida.`);
    const instant = new Date(event.startDateTimeUtc ?? "");
    assert(!Number.isNaN(instant.getTime()), `${event.id}: instante UTC no válido.`);
    const originalZone = event.originalTimeZone === "ET" ? "America/New_York" : null;
    assert(originalZone, `${event.id}: zona original sin conversión reproducible.`);
    const original = dateTimeParts(instant, originalZone);
    const cest = dateTimeParts(instant, "Europe/Madrid");
    assert.equal(original.date, event.dateStart, `${event.id}: UTC cambia el día en la zona original.`);
    assert.equal(original.time, event.originalTime, `${event.id}: UTC no coincide con la hora original.`);
    assert.equal(cest.date, event.dateStart, `${event.id}: la conversión a CEST cambia de día y requiere fecha visible propia.`);
    assert.equal(`${cest.time} CEST`, event.displayTimeCest, `${event.id}: conversión UTC/CEST incorrecta.`);
  } else if (event.timeStatus === "tba") {
    assert(!event.startDateTimeUtc, `${event.id}: una hora por confirmar no debe tener DTSTART horario.`);
    assert.equal(event.originalTime, "Hora por confirmar", `${event.id}: el estado pendiente debe ser explícito.`);
    assert.equal(event.displayTimeCest, "Hora por confirmar", `${event.id}: no se debe inferir CEST.`);
  }
}
assert.equal(augustCalendar.filter((event) => event.timeStatus === "confirmed").length, 14);
assert.deepEqual(
  augustCalendar.filter((event) => event.timeStatus === "tba").map((event) => event.id),
  ["earnings-lfmd", "earnings-celh", "monthly-options-expiry", "jackson-hole-2026"],
);
assert.deepEqual(august.stockpicking?.earnings.published.filter((item) => Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct).map((item) => item.ticker), ["VRT", "COIN", "RDDT"]);
assert.deepEqual(august.stockpicking?.earnings.upcoming.filter((item) => item.impliedMoveApproximate).map((item) => item.ticker), ["ANET", "DUOL", "LFMD", "NET"]);
assert.equal(august.probableRoutes?.title, "Rutas probables");

assert.equal(getMonthGrid(2023, 1)[6], 1, "Un mes que empieza en domingo debe usar desplazamiento lunes-domingo.");
assert.equal(getMonthGrid(2026, 4).filter(Boolean).length, 30, "Abril debe tener 30 días.");
assert.equal(getMonthGrid(2024, 2).filter(Boolean).length, 29, "Febrero bisiesto debe tener 29 días.");
assert.equal(dateTimeParts(new Date("2026-08-03T21:00:00Z"), "America/New_York").date, "2026-08-03", "UTC no debe desplazar la fecha editorial.");
assert.equal(exclusiveAllDayEnd("2026-08-11"), "2026-08-12", "DTEND de día completo debe ser exclusivo.");
assert.deepEqual(
  new Set(august.watchlist.map((item) => item.category)),
  new Set(["market-structure", "rates-credit", "technology-ai", "fx-commodities"]),
);
for (const item of august.watchlist) {
  assert(item.name.trim(), `${item.key}: falta nombre accesible.`);
  assert(item.category, `${item.key}: falta categoría de seguimiento.`);
  assert(item.status && item.statusLabel, `${item.key}: falta estado visual.`);
  assert(item.whatLooksAt && item.whyItMatters && item.currentReading && item.whatWouldChange, `${item.key}: la divulgación progresiva pierde condiciones de lectura.`);
  assert(item.asOf && item.source, `${item.key}: falta trazabilidad editorial.`);
  if (item.href) assert(item.linkLabel, `${item.key}: el enlace de seguimiento no tiene etiqueta accesible.`);
  if (item.href?.startsWith("http")) {
    assert.match(item.href, /^https:\/\//, `${item.key}: el seguimiento externo debe usar HTTPS.`);
    assert(!item.href.includes("utm_source=chatgpt.com"), `${item.key}: el seguimiento contiene UTM de ChatGPT.`);
  }
}

const monthlyCalendarComponent = read("components/reports/ReportMonthlyCalendar.tsx");
for (const requirement of [
  'aria-controls="report-calendar-detail"',
  'aria-label="Cerrar detalle del evento"',
  'rel="noopener noreferrer"',
  'event.key === "Escape"',
  "onClick={() => selectEvent(eventId(event))}",
  'keyboardEvent.key === "Enter" || keyboardEvent.key === " "',
]) {
  assert(monthlyCalendarComponent.includes(requirement), `Calendario mensual: falta ${requirement}.`);
}

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

console.log("Editorial validation passed: 3 reports, 1 historical snapshot and 2 TD3 locales.");
