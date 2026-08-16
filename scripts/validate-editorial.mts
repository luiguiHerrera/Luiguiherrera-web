import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { marketReports } from "../lib/reports/market-reports.ts";
import { buildReportExportModel } from "../lib/reports/report-export-model.ts";
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
const secondAugust = marketReports.find((report) => report.id === "segundo-informe-agosto-2026");

assert(first, "Falta el primer informe.");
assert(second, "Falta el segundo informe.");
assert(august, "Falta el primer informe de agosto.");
assert(secondAugust, "Falta el segundo informe de agosto.");

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
    modifiedAt: "2026-08-03",
    editorialCutoffAt: "2026-07-31",
    automaticDataCutoffAt: "2026-07-31",
    status: "archivado",
  },
);
assert.equal(second.status, "archivado");
assert.equal(
  marketReports.filter((report) => report.status === "actual").length,
  1,
  "El archivo debe exponer un único informe marcado como Actual.",
);
assert.equal(marketReports.find((report) => report.status === "actual")?.id, "segundo-informe-agosto-2026");
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
assert(!Object.hasOwn(august.presentation ?? {}, "enabledModules"), "enabledModules no debe duplicar módulos ya derivados por presencia de datos.");
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
  assert(event.sourceLabel && event.sourceHref, `${event.id}: falta fuente o página de seguimiento.`);
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
for (const item of [...(august.stockpicking?.earnings.published ?? []), ...(august.stockpicking?.earnings.upcoming ?? [])]) {
  assert.equal(item.impliedMoveProviderHref, `https://unusualwhales.com/stock/${item.ticker}/earnings`, `${item.ticker}: falta página específica del movimiento implícito.`);
  assert(item.consultedAt, `${item.ticker}: falta fecha de consulta.`);
  assert(item.dateTimeSourceLabel && item.dateTimeSourceHref, `${item.ticker}: falta fuente de fecha/hora.`);
}
for (const item of august.stockpicking?.earnings.published ?? []) {
  assert(item.actualMoveSourceLabel && item.actualMoveSourceHref && item.actualMoveMethodology, `${item.ticker}: falta trazabilidad del movimiento ocurrido.`);
}
const ccj = august.stockpicking?.earnings.published.find((item) => item.ticker === "CCJ");
assert.equal(ccj?.actualMovePct, -2.1);
assert.equal(ccj?.actualMoveSourceLabel, "Nasdaq Historical — CCJ");
assert(ccj?.actualMoveMethodology?.includes("86,38 / 88,23"), "CCJ debe explicar el cálculo cierre a cierre.");
const pltr = august.stockpicking?.earnings.upcoming.find((item) => item.ticker === "PLTR");
assert.equal(pltr?.dateTimeSourceHref, "https://www.nasdaq.com/press-release/palantir-announces-date-second-quarter-2026-earnings-release-and-webcast-2026-07-13");
for (const ticker of ["LFMD", "CELH"]) {
  const item = august.stockpicking?.earnings.upcoming.find((candidate) => candidate.ticker === ticker);
  assert.equal(item?.dateConfirmationStatus, "editorial-unconfirmed");
  assert.equal(item?.timeConfirmationStatus, "unconfirmed");
  assert(item?.dateTimeSourceLabel.includes("sin anuncio que confirme el evento"), `${ticker}: la portada de IR no debe presentarse como confirmación.`);
}
assert(august.sourcesNote.includes("Unusual Whales") && august.sourcesNote.includes("Nasdaq Historical") && august.sourcesNote.includes("Yahoo Finance"), "Fuentes y método debe enumerar proveedores de resultados.");
assert.equal(august.probableRoutes?.title, "Rutas probables");

// --- Segundo informe de agosto de 2026 -------------------------------------------------------

assert.deepEqual(
  {
    label: secondAugust.label,
    title: secondAugust.title,
    publishedAt: secondAugust.publishedAt,
    modifiedAt: secondAugust.modifiedAt,
    editorialCutoffAt: secondAugust.editorialCutoffAt,
    automaticDataCutoffAt: secondAugust.automaticDataCutoffAt,
    status: secondAugust.status,
  },
  {
    label: "Segundo informe de agosto",
    title: "El mercado vuelve al riesgo mientras la factura de la IA gana peso",
    publishedAt: "2026-08-16",
    modifiedAt: "2026-08-16",
    editorialCutoffAt: "2026-08-16",
    automaticDataCutoffAt: "2026-08-14",
    status: "actual",
  },
);

// El contexto general cumple la función de resumen ejecutivo: no hay tesis ni resumen separados.
assert.equal(secondAugust.presentation?.contextTitle, "Contexto general");
assert.equal(secondAugust.thesis, undefined, "El formato nuevo no publica una Tesis principal separada.");
assert.equal(secondAugust.executiveSummary, undefined, "El formato nuevo no publica un Resumen ejecutivo separado.");
assert.equal(secondAugust.transversalFactor, undefined, "DXY se publica como activo, no como bloque transversal duplicado.");

assert.deepEqual(
  buildReportExportModel(secondAugust).sections.map((section) => [section.id, section.title]),
  [
    ["context-general", "Contexto general"],
    ["historical-snapshot", "Lecturas de mercado al cierre"],
    ["asset-follow-up", "Lectura por activo"],
    ["calendar-and-scenarios", "Calendario de eventos"],
    ["probable-routes", "Rutas probables"],
    ["watchlist", "Lista de control"],
    ["sources-and-limitations", "Fuentes y aviso educativo"],
  ],
  "El orden canónico de secciones del segundo informe de agosto cambió.",
);

assert.deepEqual(
  secondAugust.assetReadings.map((item) => item.asset),
  ["S&P 500", "Oro", "China", "Japón", "Bitcoin", "Ethereum", "DXY", "Stockpicking"],
);
for (const asset of secondAugust.assetReadings) {
  assert(asset.story && asset.changed && asset.expected, `${asset.asset}: faltan Qué pasó / Qué cambió / Qué esperamos.`);
  assert.equal(asset.watch, undefined, `${asset.asset}: la vigilancia se concentra en la lista de control.`);
  assert.equal(asset.reading, undefined, `${asset.asset}: el formato nuevo no repite "Lectura del informe".`);
  assert.equal(asset.timeline, undefined, `${asset.asset}: el formato nuevo no publica "Secuencia de lectura".`);
}

// Movimiento ocurrido: cierre regular de la sesión de reacción contra el cierre regular previo.
assert.deepEqual(
  secondAugust.stockpicking?.earnings.published.map((item) => [item.ticker, item.actualMovePct]),
  [
    ["PLTR", 29.5],
    ["ANET", 3.6],
    ["CPNG", -4.6],
    ["UBER", -5.3],
    ["DUOL", -9.4],
    ["LFMD", -7.6],
    ["NET", 5.6],
    ["HIMS", -4.0],
    ["CELH", -18.5],
  ],
);
assert.deepEqual(
  secondAugust.stockpicking?.earnings.published
    .filter((item) => Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct)
    .map((item) => item.ticker),
  ["PLTR", "CELH"],
  "Solo PLTR y CELH excedieron el rango implícito.",
);
assert.deepEqual(
  secondAugust.stockpicking?.earnings.published.map((item) => [item.ticker, item.impliedMovePct]),
  [
    ["PLTR", 10.32],
    ["ANET", 10.4],
    ["CPNG", 10.23],
    ["UBER", 7.36],
    ["DUOL", 16.45],
    ["LFMD", 23.44],
    ["NET", 11.6],
    ["HIMS", 20.53],
    ["CELH", 11.55],
  ],
  "Los movimientos implícitos retrospectivos deben conservar los valores congelados del primer informe.",
);
const celh = secondAugust.stockpicking?.earnings.published.find((item) => item.ticker === "CELH");
assert.equal(celh?.reportDate, "2026-08-06", "La fecha confirmada de CELH es el 6 de agosto de 2026.");
assert.equal(celh?.reactionDate, "2026-08-06");
assert.equal(celh?.dateConfirmationStatus, "confirmed");
assert(
  celh?.actualMoveMethodology?.includes("La fecha finalmente confirmada fue el 6 de agosto"),
  "El segundo informe debe corregir explícitamente la fecha editorial de CELH.",
);
const cloudflare = secondAugust.stockpicking?.earnings.published.find((item) => item.ticker === "NET");
assert(cloudflare?.actualMoveMethodology?.includes("after-hours"), "NET debe aclarar que el +16 % es after-hours.");
const duolingo = secondAugust.stockpicking?.earnings.published.find((item) => item.ticker === "DUOL");
assert(duolingo?.actualMoveMethodology?.includes("after-hours"), "DUOL debe aclarar que los titulares mayores no usan esta metodología.");
for (const item of secondAugust.stockpicking?.earnings.published ?? []) {
  assert(item.reactionDate, `${item.ticker}: falta la sesión de reacción.`);
  assert(item.actualMoveSourceLabel && item.actualMoveSourceHref && item.actualMoveMethodology, `${item.ticker}: falta trazabilidad del movimiento ocurrido.`);
  assert.match(item.actualMoveSourceHref, /^https:\/\//, `${item.ticker}: la fuente de reacción debe usar HTTPS.`);
}
for (const item of [...(secondAugust.stockpicking?.earnings.published ?? []), ...(secondAugust.stockpicking?.earnings.upcoming ?? [])]) {
  assert.match(
    item.impliedMoveProviderHref,
    new RegExp(`^https://unusualwhales\\.com/stock/${item.ticker}/`),
    `${item.ticker}: falta la página por ticker del movimiento implícito.`,
  );
  assert(item.consultedAt, `${item.ticker}: falta la fecha de consulta congelada.`);
}

assert.deepEqual(
  secondAugust.stockpicking?.earnings.upcoming.map((item) => [item.ticker, item.reportDate, item.impliedMovePct, item.consultedAt]),
  [
    ["FUTU", "2026-08-20", 7.04, "2026-08-16"],
    ["NVDA", "2026-08-26", 6.18, "2026-08-16"],
  ],
  "Los próximos resultados son únicamente FUTU y NVDA, con el implícito congelado en la consulta del 16 de agosto.",
);

const opticalTheme = secondAugust.stockpicking?.themes?.[0];
assert.equal(opticalTheme?.label, "Oportunidad en consideración");
assert.deepEqual(opticalTheme?.examples?.map((item) => item.ticker), ["LITE", "COHR", "AVGO", "MRVL"]);
for (const forbidden of ["comprar", "selección recomendada", "próximo ganador", "la siguiente nvidia"]) {
  assert(
    !`${opticalTheme?.body} ${opticalTheme?.note}`.toLocaleLowerCase("es").includes(forbidden),
    `El tema óptico no puede formularse como recomendación: ${forbidden}.`,
  );
}

const secondAugustCalendar = getReportCalendar(secondAugust);
assert.deepEqual(
  secondAugustCalendar.map((event) => [event.id, event.dateStart]),
  [
    ["earnings-futu", "2026-08-20"],
    ["monthly-options-expiry-august", "2026-08-21"],
    ["pce-july", "2026-08-26"],
    ["earnings-nvda", "2026-08-26"],
    ["jackson-hole-2026", "2026-08-27"],
  ],
  "El calendario prospectivo cubre FUTU 20, OPEX 21, PCE y NVDA 26 y Jackson Hole 27-29.",
);
for (const event of secondAugustCalendar) {
  assert(event.dateStart, `${event.id}: falta fecha inicial.`);
  assertIsoDate(event.dateStart, `${event.id}.dateStart`);
  assert(event.dateStart >= "2026-08-17" && event.dateStart <= "2026-08-31", `${event.id}: fecha fuera del periodo prospectivo.`);
  assert(event.category && event.timeStatus && event.originalTimeZone, `${event.id}: falta categoría, estado de hora o zona.`);
  assert(event.affectedAssets?.length, `${event.id}: faltan activos o factores afectados.`);
  assert(event.sourceLabel && event.sourceHref, `${event.id}: falta fuente institucional.`);
  assert.match(event.sourceHref, /^https:\/\//, `${event.id}: la fuente debe usar HTTPS.`);
  if (event.timeStatus === "confirmed") {
    assert.match(event.startDateTimeUtc ?? "", /^2026-08-\d{2}T\d{2}:\d{2}:00Z$/, `${event.id}: hora UTC confirmada inválida.`);
    const instant = new Date(event.startDateTimeUtc ?? "");
    const original = dateTimeParts(instant, "America/New_York");
    const cest = dateTimeParts(instant, "Europe/Madrid");
    assert.equal(original.time, event.originalTime, `${event.id}: UTC no coincide con la hora original.`);
    assert.equal(`${cest.time} CEST`, event.displayTimeCest, `${event.id}: conversión UTC/CEST incorrecta.`);
  }
}
const jacksonHole = secondAugust.calendar.find((event) => event.id === "jackson-hole-2026");
assert.equal(jacksonHole?.dateEnd, "2026-08-29");
assert.equal(jacksonHole?.timeStatus, "tba", "No se inventa la hora del discurso del presidente de la Fed.");
assert(
  jacksonHole?.whyItMatters.includes("Financial Innovation: Implications for Payments and Policy"),
  "Falta el tema oficial de Jackson Hole 2026.",
);

assert.deepEqual(
  secondAugust.probableRoutes?.scenarios.map((route) => route.title),
  [
    "Ruta base — mercado funcional con rotación",
    "Ruta favorable — amplitud, desinflación y menor presión de tasas",
    "Ruta adversa — tasas y dólar convierten la rotación en reducción de riesgo",
  ],
);
assert.equal(secondAugust.probableRoutes?.engines, undefined, "El informe no inventa motores no sostenidos por el material.");
assert(
  secondAugust.probableRoutes?.note.includes("no son predicciones"),
  "Las rutas deben cerrar recordando que son escenarios condicionales.",
);
for (const route of secondAugust.probableRoutes?.scenarios ?? []) {
  assert(!/\b\d{1,3}\s?%\s+de probabilidad/i.test(route.body), `${route.title}: no se asignan probabilidades arbitrarias.`);
}

assert.deepEqual(
  secondAugust.watchlist.map((item) => item.key),
  [
    "spx-breadth",
    "us-yields",
    "ai-credit",
    "dxy",
    "gold-levels",
    "nvda-earnings",
    "futu-earnings",
    "japan-yen-boj",
    "china-domestic",
    "btc-etf-flows",
    "eth-liquidity",
  ],
  "La lista de control debe concentrar la vigilancia de los once frentes del informe.",
);
for (const item of secondAugust.watchlist) {
  assert(item.category && item.status && item.statusLabel, `${item.key}: falta clasificación visual.`);
  assert(item.whatLooksAt && item.whyItMatters && item.currentReading && item.whatWouldChange, `${item.key}: la divulgación progresiva pierde condiciones de lectura.`);
  assert(item.asOf && item.source, `${item.key}: falta trazabilidad editorial.`);
  if (item.href) assert(item.linkLabel, `${item.key}: el enlace de seguimiento no tiene etiqueta accesible.`);
}
const goldWatch = secondAugust.watchlist.find((item) => item.key === "gold-levels");
assert(goldWatch?.whatLooksAt.includes("4.400–4.500") && goldWatch.whatLooksAt.includes("5.056"));
assert(goldWatch?.whatWouldChange.includes("no debe tratarse como objetivo de precio"), "El nivel de 5.056 no puede presentarse como objetivo.");

for (const forbidden of ["gp", "familia", "portafolio", "portfolio", "cartera familiar", "destinatario privado", "asesoría personalizada de compra"]) {
  const haystack = JSON.stringify(secondAugust).toLocaleLowerCase("es");
  const pattern = forbidden === "gp" ? /\bgp\b/ : new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  assert(!pattern.test(haystack), `El segundo informe de agosto expone contexto privado: ${forbidden}.`);
}
assert(!JSON.stringify(secondAugust).includes("USD/COP"), "USD/COP queda fuera de esta edición.");

// El informe queda congelado al 14/08 mientras el dashboard sigue resolviendo el último dato.
const secondAugustSnapshot = getHistoricalAutomaticReadings(secondAugust.id);
assert.equal(secondAugustSnapshot?.dataDate, "2026-08-14", "El informe debe usar el snapshot congelado al 14 de agosto.");
assert.equal(secondAugustSnapshot?.gldFlowPressure?.asOf, "2026-08-14");
assert.equal(secondAugustSnapshot?.regime.label, "Risk-on selectivo");
assert.equal(secondAugustSnapshot?.regime.score, 61);
assert.equal(secondAugustSnapshot?.regime.confidence, 66);
assert.equal(secondAugustSnapshot?.quantRadar?.fragilityScore, 20);
assert.equal(secondAugustSnapshot?.vixTermStructure?.classification, "Fuerte contango");
assert.equal(
  secondAugustSnapshot?.indices,
  null,
  "Los módulos no capturados al corte permanecen en null; el snapshot no se completa con datos posteriores.",
);
assert.equal(secondAugustSnapshot?.statisticalAssets, null);

// Canary: el registro histórico es estático y no depende de ningún loader vivo ni de la fecha de render.
const historicalModule = read("lib/reports/historical-automatic-readings.ts");
for (const liveSource of ["buildWeeklyReportData", "getDashboardData", "fetch(", "new Date()", "Date.now("]) {
  assert(
    !historicalModule.includes(liveSource),
    `El snapshot histórico no puede depender de una fuente viva: ${liveSource}.`,
  );
}
const dashboardRoute = read("app/(es)/dashboard/page.tsx");
assert(dashboardRoute.includes("getDashboardData"), "El dashboard debe seguir resolviendo datos vivos.");
assert(dashboardRoute.includes("buildWeeklyReportData"), "El dashboard debe seguir resolviendo datos vivos.");
assert(
  !dashboardRoute.includes("historical-automatic-readings") && !dashboardRoute.includes("2026-08-14"),
  "El dashboard no puede consumir el snapshot del informe ni quedar fijado al 14 de agosto.",
);
for (const sharedModule of [
  "lib/dashboard/get-dashboard-data.ts",
  "lib/reports/build-weekly-report-data.ts",
  "lib/statistical-levels/get-statistical-levels-data.ts",
]) {
  assert(
    !read(sharedModule).includes("2026-08-14"),
    `${sharedModule}: un loader compartido no puede quedar fijado al corte del informe.`,
  );
}
for (const artifact of [
  "public/reports/segundo-informe-agosto-2026.md",
  "public/reports/segundo-informe-agosto-2026.html",
]) {
  const content = read(artifact);
  assert(content.includes("2026-08-14"), `${artifact}: la exportación debe reflejar el snapshot del 14 de agosto.`);
  for (const forbiddenHeading of ["Tesis principal", "Resumen ejecutivo", "Lectura del informe", "Secuencia de lectura"]) {
    assert(!content.includes(forbiddenHeading), `${artifact}: el formato anterior sobrevive en la exportación (${forbiddenHeading}).`);
  }
  assert(content.includes("-18,5 %") || content.includes("-18.5 %"), `${artifact}: falta la reacción verificada de CELH.`);
  assert(content.includes("+29,5") || content.includes("29,5 %"), `${artifact}: falta la reacción verificada de PLTR.`);
}
const secondAugustIcs = read("public/reports/segundo-informe-agosto-2026-calendar.ics").replace(/\r?\n[ \t]/g, "");
assert.equal((secondAugustIcs.match(/BEGIN:VEVENT/g) ?? []).length, 5, "El ICS solo incluye los cinco eventos confirmados del 17 al 31 de agosto.");
for (const stamp of ["20260820", "20260821", "20260826", "20260827"]) {
  assert(secondAugustIcs.includes(stamp), `El ICS debe incluir el evento del ${stamp}.`);
}

const explicitUnconfirmed = "Fecha prevista editorial no confirmada · hora por confirmar";
for (const artifact of [
  "public/reports/primer-informe-agosto-2026.md",
  "public/reports/primer-informe-agosto-2026.html",
  "public/reports/primer-informe-agosto-2026-calendar.ics",
]) {
  const content = read(artifact).replace(/\r?\n[ \t]/g, "");
  assert(content.includes(explicitUnconfirmed), `${artifact}: falta estado editorial no confirmado.`);
}
for (const artifact of ["public/reports/primer-informe-agosto-2026.md", "public/reports/primer-informe-agosto-2026.html"]) {
  const content = read(artifact);
  assert(content.includes("-2,1 %") || content.includes("-2.1 %"), `${artifact}: falta cifra reproducible de CCJ.`);
}

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
  "Lecturas de mercado al cierre",
  "Datos disponibles hasta",
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

console.log(
  `Editorial validation passed: ${marketReports.length} reports, 2 historical snapshots audited and 2 TD3 locales.`,
);
