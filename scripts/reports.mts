import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAllReportExportModels,
  REPORT_EXPORT_AUTHOR,
  REPORT_EXPORT_SCHEMA_VERSION,
  REPORT_SITE_URL,
  type ReportExportModel,
  type ReportExportSection,
} from "../lib/reports/report-export-model.ts";
import { earningsScheduleLabel, formatEvidenceConsultedAt, getMonthGrid } from "../lib/reports/report-presentation.ts";

type ArtifactManifestEntry = {
  path: string;
  mimeType: string;
  sha256: string;
  size: number;
};

type ReportManifestEntry = {
  id: string;
  canonicalUrl: string;
  publishedAt: string;
  modifiedAt: string;
  cutoffs: {
    editorial: string | null;
    automaticData: string | null;
  };
  sourceHash: string;
  formats: Partial<Record<"html" | "markdown" | "pdf" | "ics", ArtifactManifestEntry>>;
};

type ReportsManifest = {
  schemaVersion: typeof REPORT_EXPORT_SCHEMA_VERSION;
  reports: ReportManifestEntry[];
};

const root = process.cwd();
const reportsDir = path.join(root, "public", "reports");
const llmsPath = path.join(root, "public", "llms.txt");
const pdfScript = path.join(root, "scripts", "render-report-pdf.py");
const command = process.argv[2] ?? "generate";
const models = buildAllReportExportModels();
const llmsSectionHeading = "## Reports and machine-readable files";
const forbiddenHistoricalPhrases = ["dato vigente", "nivel actual", "lectura actual", "datos de hoy"];

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function stableStringify(value: unknown, spaces = 0) {
  return JSON.stringify(stableValue(value), null, spaces);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function esc(value: unknown) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(value: string) {
  if (/^(https?:|mailto:)/.test(value)) return value;
  return value.startsWith("/") ? `${REPORT_SITE_URL}${value}` : value;
}

function relativeFigurePath(value: string) {
  return value.startsWith("/images/") ? `..${value}` : value;
}

function formatSigned(value: number, digits = 1) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function formatUsdMillions(value: number) {
  return `${formatSigned(value, 0)} M USD`;
}

function renderMetadataHtml(model: ReportExportModel) {
  const rows = [
    ["Autor", model.author],
    ["Publicación", model.publishedAt],
    ["Actualización", model.modifiedAt],
    ["Corte editorial", model.editorialCutoffAt ?? "No aplica"],
    ["Corte de datos de mercado", model.automaticDataCutoffAt ?? "No aplica"],
    ["URL editorial primaria", `<a href="${model.canonicalUrl}">${model.canonicalUrl}</a>`],
  ];
  return `<dl class="metadata">${rows
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("")}</dl>`;
}

function renderHistoricalHtml(section: Extract<ReportExportSection, { kind: "historical-snapshot" }>) {
  const snapshot = section.snapshot;
  const regime = snapshot.regime;
  return `
    <p class="historical-note">Corte de esta edición: <strong>${snapshot.dataDate}</strong>. Cada módulo conserva la última fecha disponible de su fuente.</p>
    <h3>Régimen al corte</h3>
    ${htmlTable(
      ["Campo", "Valor"],
      [
        ["Régimen", regime.label],
        ["Puntuación", regime.score === null ? "No publicada" : `${regime.score}/100`],
        ["Confianza", regime.confidence === null ? "No publicada" : `${regime.confidence}%`],
        ["Sesgo", regime.bias],
        ["Interpretación histórica", regime.interpretation],
      ],
    )}
    <div class="columns">
      ${htmlList("Qué impulsó", regime.support)}
      ${htmlList("Qué frenó", regime.caution)}
      ${htmlList("Qué vigilar", regime.watch)}
    </div>
    <h3>Índices principales vía ETF</h3>
    ${htmlTable(
      ["Ticker", "Retorno 1W", "Media larga", "Distancia a máximos"],
      snapshot.indices.map((item) => [
        item.ticker,
        `${formatSigned(item.return1w)}%`,
        `${formatSigned(item.distanceLongAverage)}%`,
        `${formatSigned(item.distanceFromHigh)}%`,
      ]),
    )}
    <h3>Rotación sectorial</h3>
    ${htmlTable(
      ["Campo", "Valor"],
      [
        ["Sectores positivos", `${snapshot.sectors.positiveCount} / ${snapshot.sectors.totalCount}`],
        ["Sectores negativos", String(snapshot.sectors.negativeCount)],
        ["Dispersión 1W", `${formatSigned(snapshot.sectors.dispersion1w)}%`],
        ["Lectura al publicar", snapshot.sectors.reading],
      ],
    )}
    ${htmlTable(
      ["Grupo", "Ticker", "Nombre", "Retorno 1W"],
      [
        ...snapshot.sectors.leaders.map((item) => [
          "Líder",
          item.ticker,
          item.name,
          `${formatSigned(item.return1w)}%`,
        ]),
        ...snapshot.sectors.laggards.map((item) => [
          "Rezagado",
          item.ticker,
          item.name,
          `${formatSigned(item.return1w)}%`,
        ]),
      ],
    )}
    <h3>VIX - Volatilidad al corte</h3>
    ${snapshot.vix ? htmlTable(
      ["Campo", "Valor"],
      [
        ["Nivel al corte", snapshot.vix.level.toFixed(1)],
        ["Cambio 1D", formatSigned(snapshot.vix.change1d)],
        ["Estado", `${snapshot.vix.stateLabel} / ${snapshot.vix.status}`],
        ["Momentum", snapshot.vix.momentum],
        ["Curva", snapshot.vix.curve],
        ["Lectura histórica", snapshot.vix.curveText],
      ],
    ) : "<p>No disponible al cierre.</p>"}
    <h3>Flujos netos de ETFs de BTC al corte</h3>
    ${snapshot.btcEtfFlows ? htmlTable(
      ["Campo", "Valor"],
      [
        ["Último día", formatUsdMillions(snapshot.btcEtfFlows.lastDayUsdMillions)],
        ["Rolling 5D", formatUsdMillions(snapshot.btcEtfFlows.rolling5dUsdMillions)],
        ["Racha", snapshot.btcEtfFlows.streakLabel],
        ["Lectura al publicar", snapshot.btcEtfFlows.reading],
      ],
    ) : "<p>No disponible al cierre.</p>"}
    <h3>Proxy histórico de presión de flujos en GLD</h3>
    ${snapshot.gldFlowPressure ? htmlTable(
      ["Campo", "Valor"],
      [
        ["Fecha del dato", snapshot.gldFlowPressure.asOf],
        ["Proxy al corte", snapshot.gldFlowPressure.label],
        ["Cambio 5D en participaciones", `${formatSigned(snapshot.gldFlowPressure.sharesChange5dPct, 2)}%`],
        ["Resumen", snapshot.gldFlowPressure.summary],
        ["Limitación de fuente", snapshot.gldFlowPressure.sourceNote],
      ],
    ) : "<p>No disponible al cierre.</p>"}
    <h3>Posición técnica por activo</h3>
    ${htmlTable(
      ["Activo", "Percentil", "Z-score", "Media larga", "Último cierre"],
      snapshot.statisticalAssets.map((asset) => [
        `${asset.label} (${asset.symbol ?? asset.label})`,
        asset.percentile.toFixed(1),
        asset.zScore.toFixed(2),
        `${formatSigned(asset.distanceLongAverage)}%`,
        asset.label === "BTC" ? asset.lastClose.toFixed(0) : asset.lastClose.toFixed(2),
      ]),
    )}`;
}

function htmlList(title: string, items: string[]) {
  return `<article class="card"><h3>${esc(title)}</h3><ul>${items
    .map((item) => `<li>${esc(item)}</li>`)
    .join("")}</ul></article>`;
}

function htmlTable(headers: string[], rows: Array<Array<string>>) {
  return `<div class="table-wrap"><table><thead><tr>${headers
    .map((item) => `<th>${esc(item)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((item) => `<td>${esc(item)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function impliedMove(item: { impliedMovePct: number; impliedMoveApproximate?: boolean }) {
  return `${item.impliedMoveApproximate ? "≈" : ""}±${item.impliedMovePct.toFixed(2).replace(".", ",")} %`;
}

function earningsTraceHtml(items: NonNullable<Extract<ReportExportSection, { kind: "asset-readings" }>["stockpicking"]>["earnings"]["published"]) {
  return `<div class="earnings-trace">${items.map((item) => `<article class="card"><h5>${esc(item.company)} (${esc(item.ticker)})</h5><p><strong>Movimiento implícito:</strong> <a href="${esc(item.impliedMoveProviderHref)}" target="_blank" rel="noopener noreferrer">${esc(item.impliedMoveProvider)} — ${esc(item.ticker)} ↗</a> · consulta ${esc(formatEvidenceConsultedAt(item.consultedAt))}</p><p><strong>Fecha y hora:</strong> <a href="${esc(item.dateTimeSourceHref)}" target="_blank" rel="noopener noreferrer">${esc(item.dateTimeSourceLabel)} ↗</a> · ${esc(earningsScheduleLabel(item))}</p>${item.actualMoveSourceHref && item.actualMoveSourceLabel ? `<p><strong>Movimiento ocurrido:</strong> <a href="${esc(item.actualMoveSourceHref)}" target="_blank" rel="noopener noreferrer">${esc(item.actualMoveSourceLabel)} ↗</a>${item.actualMoveMethodology ? ` · ${esc(item.actualMoveMethodology)}` : ""}</p>` : "<p><strong>Movimiento ocurrido:</strong> pendiente de publicación.</p>"}</article>`).join("")}</div>`;
}

function earningsTraceMarkdown(items: NonNullable<Extract<ReportExportSection, { kind: "asset-readings" }>["stockpicking"]>["earnings"]["published"]) {
  return items.map((item) => `- **${item.company} (${item.ticker})**
  - Movimiento implícito: [${item.impliedMoveProvider} — ${item.ticker}](${item.impliedMoveProviderHref}); consulta ${formatEvidenceConsultedAt(item.consultedAt)}.
  - Fecha y hora: [${item.dateTimeSourceLabel}](${item.dateTimeSourceHref}); ${earningsScheduleLabel(item)}.
  - Movimiento ocurrido: ${item.actualMoveSourceHref && item.actualMoveSourceLabel ? `[${item.actualMoveSourceLabel}](${item.actualMoveSourceHref})${item.actualMoveMethodology ? `; ${item.actualMoveMethodology}` : "."}` : "pendiente de publicación."}`).join("\n");
}

function renderStockpickingHtml(stockpicking: NonNullable<Extract<ReportExportSection, { kind: "asset-readings" }>["stockpicking"]>) {
  const { published, upcoming, methodology } = stockpicking.earnings;
  const exceeded = published.filter((item) => Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct);
  return `<div class="stockpicking-earnings"><h4>Qué pasó — resultados publicados</h4><p><strong>${published.length} resultados publicados; ${exceeded.length} excedieron el rango.</strong> VRT, COIN y RDDT fueron las reacciones negativas más fuertes.</p>${htmlTable(["Fecha", "Empresa", "Movimiento implícito esperado", "Movimiento ocurrido", "Lectura"], published.map((item) => [item.reportDate, `${item.company} (${item.ticker})`, impliedMove(item), `${item.actualMovePct?.toFixed(1).replace(".", ",")} %`, Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct ? "Excedió el rango" : "Dentro del rango"]))}<h5>Trazabilidad — resultados publicados</h5>${earningsTraceHtml(published)}<h4>Qué esperamos — próximos resultados</h4>${htmlTable(["Fecha", "Empresa", "Movimiento implícito esperado", "Hora o estado", "Fuente de fecha y hora"], upcoming.map((item) => [item.reportDate, `${item.company} (${item.ticker})`, impliedMove(item), earningsScheduleLabel(item), item.dateTimeSourceLabel]))}<h5>Trazabilidad — próximos resultados</h5>${earningsTraceHtml(upcoming)}<p class="historical-note">${esc(methodology)} Cada fila enlaza su página por ticker, la fecha de consulta y las fuentes utilizadas para fecha, hora y reacción.</p></div>`;
}

function renderStockpickingMarkdown(stockpicking: NonNullable<Extract<ReportExportSection, { kind: "asset-readings" }>["stockpicking"]>) {
  const { published, upcoming, methodology } = stockpicking.earnings;
  return `#### Qué pasó — resultados publicados

**${published.length} resultados publicados; ${published.filter((item) => Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct).length} excedieron el rango.** VRT, COIN y RDDT fueron las reacciones negativas más fuertes.

| Fecha | Empresa | Movimiento implícito esperado | Movimiento ocurrido | Lectura |
|---|---|---:|---:|---|
${published.map((item) => `| ${item.reportDate} | ${item.company} (${item.ticker}) | ${impliedMove(item)} | ${item.actualMovePct?.toFixed(1).replace(".", ",")} % | ${Math.abs(item.actualMovePct ?? 0) > item.impliedMovePct ? "Excedió el rango" : "Dentro del rango"} |`).join("\n")}

#### Qué esperamos — próximos resultados

| Fecha | Empresa | Movimiento implícito esperado | Hora o estado | Fuente de fecha y hora |
|---|---|---:|---|---|
${upcoming.map((item) => `| ${item.reportDate} | ${item.company} (${item.ticker}) | ${impliedMove(item)} | ${earningsScheduleLabel(item)} | [${item.dateTimeSourceLabel}](${item.dateTimeSourceHref}) |`).join("\n")}

##### Trazabilidad — resultados publicados

${earningsTraceMarkdown(published)}

##### Trazabilidad — próximos resultados

${earningsTraceMarkdown(upcoming)}

${methodology} Cada fila enlaza su página por ticker, la fecha de consulta y las fuentes utilizadas para fecha, hora y reacción.`;
}

function calendarTimeLabel(item: Extract<ReportExportSection, { kind: "calendar-scenarios" }>["calendar"][number]) {
  if (item.dateConfirmationStatus === "editorial-unconfirmed") return "Fecha prevista editorial no confirmada · hora por confirmar";
  if (item.timeStatus === "tba") return `Hora por confirmar · ${item.originalTimeZone ?? "Zona por confirmar"}`;
  return [
    item.originalTime && item.originalTimeZone ? `${item.originalTime} ${item.originalTimeZone}` : null,
    item.displayTimeCest,
  ].filter(Boolean).join(" · ") || "Hora por confirmar";
}

function renderMonthlyCalendarHtml(items: Extract<ReportExportSection, { kind: "calendar-scenarios" }>["calendar"], model: ReportExportModel) {
  const year = model.presentation?.year ?? Number(model.publishedAt.slice(0, 4));
  const month = model.presentation?.month ?? Number(model.publishedAt.slice(5, 7));
  const title = model.presentation?.localizedTitle ?? new Intl.DateTimeFormat(model.presentation?.locale ?? "es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  const days = getMonthGrid(year, month);
  return `<div class="month-calendar" aria-label="Calendario de ${esc(title)}">
    ${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => `<div class="month-calendar__weekday">${day}</div>`).join("")}
    ${days.map((day) => {
      if (!day) return `<div class="month-calendar__day month-calendar__day--empty"></div>`;
      const dayItems = items.filter((item) => item.dateStart === `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      const weekend = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() % 6) === 0;
      return `<div class="month-calendar__day${weekend ? " month-calendar__day--weekend" : ""}"><strong>${day}</strong>${dayItems.map((item) => `<span class="event-chip event-chip--${esc(item.category ?? "other")}">${esc(item.ticker ?? item.event)}</span>`).join("")}</div>`;
    }).join("")}
  </div>
  <h3>Detalle de eventos</h3>
  ${htmlTable(
    ["Fecha", "Hora y zona", "Evento", "Por qué importa", "Activos", "Fuente"],
    items.map((item) => [
      item.dateLabel,
      calendarTimeLabel(item),
      item.event,
      item.whyItMatters,
      item.affectedAssets?.join(", ") ?? "No especificados",
      item.sourceLabel ?? "Fuente institucional no indicada",
    ]),
  )}
  <div class="event-links">${items.map((item) => `<article class="card"><h4>${esc(item.event)}</h4>${item.trackingHref && item.trackingLabel ? `<a href="${esc(absoluteUrl(item.trackingHref))}"${item.trackingHref.startsWith("http") ? ` target="_blank" rel="noopener noreferrer"` : ""}>${esc(item.trackingLabel)}${item.trackingHref.startsWith("http") ? " ↗" : ""}</a>` : ""}${item.sourceHref && item.sourceLabel ? `<br><a href="${esc(item.sourceHref)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a>` : ""}</article>`).join("")}</div>`;
}

const watchCategoryLabels = {
  "market-structure": "Estructura de mercado",
  "rates-credit": "Tasas y crédito",
  "technology-ai": "Tecnología e IA",
  "fx-commodities": "Divisas y materias primas",
} as const;

function renderWatchlistDashboardHtml(
  items: Extract<ReportExportSection, { kind: "watchlist" }>["items"],
  model: ReportExportModel,
) {
  return Object.entries(watchCategoryLabels).map(([category, label]) => {
    const categoryItems = items.filter((item) => item.category === category);
    if (!categoryItems.length) return "";
    return `<section class="watch-group"><h3>${esc(label)}</h3><div class="watch-grid">${categoryItems.map((item) => {
      const href = item.href ?? item.reference?.href;
      const linkLabel = item.linkLabel ?? item.reference?.label;
      const external = Boolean(href?.startsWith("http"));
      return `<article class="watch watch--compact">
        <div class="watch-heading"><h4>${esc(item.name)}</h4><span class="status status--${esc(item.status ?? "watch")}">${esc(item.statusLabel ?? "Seguimiento")}</span></div>
        <p>${esc(item.currentReading ?? "Lectura editorial de seguimiento basada en el contexto del informe.")}</p>
        <p class="watch-change"><strong>Qué cambiaría la lectura</strong><br>${esc(item.whatWouldChange ?? "La lectura cambiaría si el comportamiento observado contradice la tesis principal.")}</p>
        ${href && linkLabel ? `<a class="follow-link" href="${esc(absoluteUrl(href))}"${external ? ` target="_blank" rel="noopener noreferrer"` : ""}>${esc(linkLabel)} ${external ? "↗" : "→"}</a>` : `<p class="unavailable">Seguimiento institucional no disponible públicamente.</p>`}
        <details><summary>Ver contexto completo</summary><p><strong>Qué mira:</strong> ${esc(item.whatLooksAt)}</p><p><strong>Por qué importa:</strong> ${esc(item.whyItMatters)}</p><p><strong>Corte:</strong> ${esc(item.asOf ?? model.publishedAt)}</p><p><strong>Fuente:</strong> ${esc(item.source ?? model.description)}</p></details>
      </article>`;
    }).join("")}</div></section>`;
  }).join("");
}

function renderSectionHtml(section: ReportExportSection, model: ReportExportModel) {
  let body = "";
  switch (section.kind) {
    case "narrative":
      body = `<p class="lead">${esc(section.body)}</p>`;
      break;
    case "summary":
      body = `<div class="grid">${section.items
        .map((item) => `<article class="card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`)
        .join("")}</div>`;
      if (section.transversalFactor) {
        body += `<article class="callout"><p class="eyebrow">${esc(section.transversalFactor.label ?? "Factor transversal")}</p><h3>${esc(section.transversalFactor.title)}</h3><p>${esc(section.transversalFactor.text)}</p></article>`;
      }
      break;
    case "context":
      body = section.items
        .map(
          (item) =>
            `<article class="card"><h3>${esc(item.title)}</h3><p class="summary">${esc(item.summary)}</p><p>${esc(item.body)}</p></article>`,
        )
        .join("");
      break;
    case "asset-readings":
      body = section.items
        .map(
          (item) => `<article class="asset">
            <p class="eyebrow">${esc(item.asset)} · ${esc(item.badge)}</p>
            <h3>${esc(item.headline)}</h3>
            ${htmlTable(
              ["Lectura", "Contenido"],
              [
                ["Qué pasó", item.story],
                ["Qué cambió", item.changed],
                ["Qué esperamos", item.expected],
                ["Qué vigilar", item.watch],
                ["Lectura del informe", item.reading],
                ...(model.presentation?.timelineStyle === "progression" ? [] : [
                  ["Antes / contexto", item.timeline.before],
                  ["Ahora / cambio", item.timeline.now],
                  ["Próximas señales", item.timeline.next],
                ]),
              ],
            )}${model.presentation?.timelineStyle === "progression" ? `
            <p class="eyebrow">Secuencia de lectura</p><ol class="reading-flow"><li><strong>Antes — Contexto</strong><span>${esc(item.timeline.before)}</span></li><li><strong>Ahora — Qué cambió</strong><span>${esc(item.timeline.now)}</span></li><li><strong>Después — Qué vigilamos</strong><span>${esc(item.timeline.next)}</span></li></ol>` : ""}
            ${item.detailsModule === "earnings" && section.stockpicking ? renderStockpickingHtml(section.stockpicking) : ""}
          </article>`,
        )
        .join("");
      break;
    case "historical-snapshot":
      body = renderHistoricalHtml(section);
      break;
    case "figures":
      body = section.items
        .map((figure) => {
          const source = figure.sourceHref
            ? `<a href="${esc(figure.sourceHref)}">${esc(figure.source)}</a>`
            : esc(figure.source);
          return `<figure>
            <img src="${esc(relativeFigurePath(figure.src))}" alt="${esc(figure.alt)}" width="${figure.width}" height="${figure.height}">
            <figcaption><strong>${esc(figure.asset)}.</strong> ${esc(figure.caption)}</figcaption>
            <p class="source">${source}${figure.note ? ` ${esc(figure.note)}` : ""}</p>
          </figure>`;
        })
        .join("");
      break;
    case "calendar-scenarios":
      body = `<h3>Eventos y ventanas editoriales</h3>${model.presentation?.calendarStyle === "monthly" ? renderMonthlyCalendarHtml(section.calendar, model) : section.calendar
        .map(
          (item) =>
            `<article class="card"><p class="eyebrow">${esc(item.dateLabel)}</p><h4>${esc(item.event)}</h4><p>${esc(item.whyItMatters)}</p></article>`,
        )
        .join("")}<h3>Escenarios</h3><div class="grid">${section.scenarios
        .map((item) => `<article class="card"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></article>`)
        .join("")}</div>`;
      break;
    case "probable-routes":
      body = `<p class="historical-note">${esc(section.routes.note)}</p><h3>Motores</h3><div class="grid">${section.routes.engines.map((item) => `<article class="card"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></article>`).join("")}</div><h3>Escenarios</h3><div class="grid">${section.routes.scenarios.map((item) => `<article class="card"><h4>${esc(item.title)}</h4><p>${esc(item.body)}</p></article>`).join("")}</div>`;
      break;
    case "watchlist":
      body = model.presentation?.watchlistStyle === "dashboard" ? renderWatchlistDashboardHtml(section.items, model) : section.items
        .map((item) => {
          const readingLabel = item.currentReading ? "Lectura al publicar" : "Lectura de seguimiento";
          const href = item.href ?? item.reference?.href;
          const linkLabel = item.linkLabel ?? item.reference?.label;
          return `<article class="watch">
            <h3>${esc(item.name)}</h3>
            ${htmlTable(
              ["Campo", "Contenido"],
              [
                ["Estado", item.statusLabel ?? "Seguimiento"],
                ["Qué mira", item.whatLooksAt],
                ["Por qué importa", item.whyItMatters],
                [
                  readingLabel,
                  item.currentReading ??
                    "Lectura editorial de seguimiento basada en el contexto del informe.",
                ],
                [
                  "Qué cambiaría",
                  item.whatWouldChange ??
                    "La lectura cambiaría si el comportamiento observado contradice la tesis principal.",
                ],
                ["Fecha", item.asOf ?? model.publishedAt],
                ["Fuente", item.source ?? model.description],
              ],
            )}
            ${href && linkLabel ? `<p><a href="${esc(absoluteUrl(href))}">${esc(linkLabel)}</a></p>` : ""}
          </article>`;
        })
        .join("");
      break;
    case "sources":
      body = `<h3>Fuentes y método</h3><p>${esc(section.sourcesNote)}</p><h3>Limitaciones y aviso educativo</h3><p class="disclaimer">${esc(section.disclaimer)}</p>`;
      break;
  }

  return `<section id="${section.id}" data-section="${section.id}"><h2>${esc(section.title)}</h2>${body}</section>`;
}

function renderHtml(model: ReportExportModel) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(model.editionName)} · ${esc(model.title)} | Luigui Herrera</title>
  <meta name="description" content="${esc(model.description)}">
  <meta name="author" content="${model.author}">
  <meta name="date" content="${model.publishedAt}">
  <link rel="canonical" href="${model.canonicalUrl}">
  <style>${reportCss(Boolean(model.presentation?.timelineStyle || model.presentation?.calendarStyle || model.presentation?.watchlistStyle))}</style>
</head>
<body>
  <main>
    <header class="cover">
      <p class="eyebrow">${esc(model.editionName)}</p>
      <h1>${esc(model.title)}</h1>
      <p class="subtitle">${esc(model.subtitle)}</p>
      ${renderMetadataHtml(model)}
      <p class="primary-url">Página editorial primaria: <a href="${model.canonicalUrl}">${model.canonicalUrl}</a></p>
    </header>
    ${model.sections.map((section) => renderSectionHtml(section, model)).join("\n")}
  </main>
</body>
</html>
`.replace(/[ \t]+$/gm, "");
}

function renderHistoricalMarkdown(
  section: Extract<ReportExportSection, { kind: "historical-snapshot" }>,
) {
  const snapshot = section.snapshot;
  return `Corte de esta edición: **${snapshot.dataDate}**. Cada módulo conserva la última fecha disponible de su fuente.

### Régimen al corte

| Campo | Valor |
|---|---|
| Régimen | ${snapshot.regime.label} |
| Puntuación | ${snapshot.regime.score === null ? "No publicada" : `${snapshot.regime.score}/100`} |
| Confianza | ${snapshot.regime.confidence === null ? "No publicada" : `${snapshot.regime.confidence}%`} |
| Sesgo | ${snapshot.regime.bias} |
| Interpretación histórica | ${snapshot.regime.interpretation} |

#### Qué impulsó

${snapshot.regime.support.map((item) => `- ${item}`).join("\n")}

#### Qué frenó

${snapshot.regime.caution.map((item) => `- ${item}`).join("\n")}

#### Qué vigilar

${snapshot.regime.watch.map((item) => `- ${item}`).join("\n")}

### Índices principales vía ETF

| Ticker | Retorno 1W | Media larga | Distancia a máximos |
|---|---:|---:|---:|
${snapshot.indices
  .map(
    (item) =>
      `| ${item.ticker} | ${formatSigned(item.return1w)}% | ${formatSigned(item.distanceLongAverage)}% | ${formatSigned(item.distanceFromHigh)}% |`,
  )
  .join("\n")}

### Rotación sectorial

- Sectores positivos: **${snapshot.sectors.positiveCount} / ${snapshot.sectors.totalCount}**
- Sectores negativos: **${snapshot.sectors.negativeCount}**
- Dispersión 1W: **${formatSigned(snapshot.sectors.dispersion1w)}%**
- Lectura al publicar: ${snapshot.sectors.reading}

| Grupo | Ticker | Nombre | Retorno 1W |
|---|---|---|---:|
${[
  ...snapshot.sectors.leaders.map((item) => ["Líder", item] as const),
  ...snapshot.sectors.laggards.map((item) => ["Rezagado", item] as const),
]
  .map(([group, item]) => `| ${group} | ${item.ticker} | ${item.name} | ${formatSigned(item.return1w)}% |`)
  .join("\n")}

### VIX - Volatilidad al corte

| Campo | Valor |
|---|---|
${snapshot.vix ? `| Nivel al corte | ${snapshot.vix.level.toFixed(1)} |
| Cambio 1D | ${formatSigned(snapshot.vix.change1d)} |
| Estado | ${snapshot.vix.stateLabel} / ${snapshot.vix.status} |
| Momentum | ${snapshot.vix.momentum} |
| Curva | ${snapshot.vix.curve} |
| Lectura histórica | ${snapshot.vix.curveText} |` : "No disponible al cierre."}

### Flujos netos de ETFs de BTC al corte

${snapshot.btcEtfFlows ? `- Último día: **${formatUsdMillions(snapshot.btcEtfFlows.lastDayUsdMillions)}**
- Rolling 5D: **${formatUsdMillions(snapshot.btcEtfFlows.rolling5dUsdMillions)}**
- Racha: **${snapshot.btcEtfFlows.streakLabel}**
- Lectura al publicar: ${snapshot.btcEtfFlows.reading}` : "No disponible al cierre."}

### Proxy histórico de presión de flujos en GLD

${snapshot.gldFlowPressure ? `- Fecha del dato: **${snapshot.gldFlowPressure.asOf}**
- Proxy al corte: **${snapshot.gldFlowPressure.label}**
- Cambio 5D en participaciones: **${formatSigned(snapshot.gldFlowPressure.sharesChange5dPct, 2)}%**
- Resumen: ${snapshot.gldFlowPressure.summary}
- Limitación de fuente: ${snapshot.gldFlowPressure.sourceNote}` : "No disponible al cierre."}

### Posición técnica por activo

| Activo | Percentil | Z-score | Media larga | Último cierre |
|---|---:|---:|---:|---:|
${snapshot.statisticalAssets
  .map(
    (asset) =>
      `| ${asset.label} (${asset.symbol ?? asset.label}) | ${asset.percentile.toFixed(1)} | ${asset.zScore.toFixed(2)} | ${formatSigned(asset.distanceLongAverage)}% | ${asset.label === "BTC" ? asset.lastClose.toFixed(0) : asset.lastClose.toFixed(2)} |`,
  )
  .join("\n")}`;
}

function renderSectionMarkdown(section: ReportExportSection, model: ReportExportModel) {
  const heading = `## ${section.title}`;
  switch (section.kind) {
    case "narrative":
      return `${heading}\n\n${section.body}`;
    case "summary":
      return `${heading}\n\n${section.items
        .map((item) => `- **${item.title}:** ${item.text}`)
        .join("\n")}${
        section.transversalFactor
          ? `\n\n### ${section.transversalFactor.label ?? "Factor transversal"}: ${section.transversalFactor.title}\n\n${section.transversalFactor.text}`
          : ""
      }`;
    case "context":
      return `${heading}\n\n${section.items
        .map((item) => `### ${item.title}\n\n**${item.summary}**\n\n${item.body}`)
        .join("\n\n")}`;
    case "asset-readings":
      return `${heading}\n\n${section.items
        .map(
          (item) => `### ${item.asset}

**${item.headline}**

Clasificación: **${item.badge}**

- **Qué pasó:** ${item.story}
- **Qué cambió:** ${item.changed}
- **Qué esperamos:** ${item.expected}
- **Qué vigilar:** ${item.watch}
- **Lectura del informe:** ${item.reading}
- **Antes / contexto:** ${item.timeline.before}
- **Ahora / cambio:** ${item.timeline.now}
- **Próximas señales:** ${item.timeline.next}${item.detailsModule === "earnings" && section.stockpicking ? `\n\n${renderStockpickingMarkdown(section.stockpicking)}` : ""}`,
        )
        .join("\n\n")}`;
    case "historical-snapshot":
      return `${heading}\n\n${renderHistoricalMarkdown(section)}`;
    case "figures":
      return `${heading}\n\n${section.items
        .map(
          (figure) => `### ${figure.asset}

![${figure.alt}](${relativeFigurePath(figure.src)})

${figure.caption}

Fuente: ${figure.sourceHref ? `[${figure.source}](${figure.sourceHref})` : figure.source}${
            figure.note ? `\n\n${figure.note}` : ""
          }`,
        )
        .join("\n\n")}`;
    case "calendar-scenarios":
      return `${heading}

### Eventos y ventanas editoriales

${model.presentation?.calendarStyle === "monthly" ? `| Fecha | Hora y zona | Evento | Por qué importa | Activos o factores | Fuente | Seguimiento |
|---|---|---|---|---|---|---|
${section.calendar.map((item) => `| ${item.dateLabel} | ${calendarTimeLabel(item)} | ${item.event} | ${item.whyItMatters} | ${item.affectedAssets?.join(", ") ?? "No especificados"} | ${item.sourceHref && item.sourceLabel ? `[${item.sourceLabel}](${item.sourceHref})` : item.sourceLabel ?? "No indicada"} | ${item.trackingHref && item.trackingLabel ? `[${item.trackingLabel}](${absoluteUrl(item.trackingHref)})` : "No disponible"} |`).join("\n")}` : section.calendar.map((item) => `- **${item.dateLabel}:** ${item.event}. ${item.whyItMatters}`).join("\n")}

### Escenarios

${section.scenarios.map((item) => `#### ${item.title}\n\n${item.body}`).join("\n\n")}`;
    case "probable-routes":
      return `${heading}\n\n${section.routes.note}\n\n### Motores\n\n${section.routes.engines.map((item) => `#### ${item.title}\n\n${item.body}`).join("\n\n")}\n\n### Escenarios\n\n${section.routes.scenarios.map((item) => `#### ${item.title}\n\n${item.body}`).join("\n\n")}`;
    case "watchlist":
      return `${heading}\n\n${section.items
        .map((item) => {
          const readingLabel = item.currentReading ? "Lectura al publicar" : "Lectura de seguimiento";
          const href = item.href ?? item.reference?.href;
          const linkLabel = item.linkLabel ?? item.reference?.label;
          const category = item.category ? watchCategoryLabels[item.category] : null;
          return `### ${item.name}${category ? `\n\n- **Categoría:** ${category}` : ""}

- **Estado:** ${item.statusLabel ?? "Seguimiento"}
- **Qué mira:** ${item.whatLooksAt}
- **Por qué importa:** ${item.whyItMatters}
- **${readingLabel}:** ${item.currentReading ?? "Lectura editorial de seguimiento basada en el contexto del informe."}
- **Qué cambiaría:** ${item.whatWouldChange ?? "La lectura cambiaría si el comportamiento observado contradice la tesis principal."}
- **Fecha:** ${item.asOf ?? model.publishedAt}
- **Fuente:** ${item.source ?? model.description}${
            href && linkLabel ? `\n- **Enlace:** [${linkLabel}](${absoluteUrl(href)})` : model.presentation?.watchlistStyle === "dashboard" ? `\n- **Enlace:** Seguimiento institucional no disponible públicamente.` : ""
          }`;
        })
        .join("\n\n")}`;
    case "sources":
      return `${heading}

### Fuentes y método

${section.sourcesNote}

### Limitaciones y aviso educativo

${section.disclaimer}`;
  }
}

function renderMarkdown(model: ReportExportModel) {
  const metadata = [
    `- Edición: ${model.editionName}`,
    `- Autor: ${model.author}`,
    `- Publicación: ${model.publishedAt}`,
    `- Actualización: ${model.modifiedAt}`,
    `- Corte editorial: ${model.editorialCutoffAt ?? "No aplica"}`,
    `- Corte de datos de mercado: ${model.automaticDataCutoffAt ?? "No aplica"}`,
    `- URL editorial primaria: ${model.canonicalUrl}`,
  ];
  return `# ${model.title}

${model.subtitle}

${metadata.join("\n")}

> La página editorial indicada arriba es la representación primaria de este informe.

${model.sections.map((section) => renderSectionMarkdown(section, model)).join("\n\n")}
`.replace(/[ \t]+$/gm, "");
}

function reportCss(enhanced = false) {
  return `
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    html { background: #f7f4ec; color: #1f2328; font-family: Inter, Arial, sans-serif; }
    body { margin: 0; font-size: 16px; line-height: 1.65; }
    main { max-width: 1060px; margin: 0 auto; padding: 42px 28px 64px; }
    a { color: #0b3436; }
    h1, h2, h3, h4, p { margin-top: 0; }
    h1 { max-width: 850px; font-size: clamp(42px, 7vw, 76px); line-height: 1; }
    h2 { font-size: 30px; border-bottom: 1px solid #d8d2c6; padding-bottom: 12px; }
    h3 { color: #153638; }
    section { padding: 40px 0; border-bottom: 1px solid #d8d2c6; }
    .cover { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; }
    .eyebrow { color: #9a7a45; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .subtitle, .lead { color: #153638; font-size: 22px; }
    .metadata { max-width: 820px; margin: 24px 0; }
    .metadata div { display: grid; grid-template-columns: 210px 1fr; border-top: 1px solid #d8d2c6; padding: 8px 0; }
    dt { color: #6e7471; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    dd { margin: 0; }
    .grid, .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }${enhanced ? `
    .reading-flow { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; list-style: none; margin: 18px 0 0; padding: 0; }
    .reading-flow li { border-top: 3px solid #9a7a45; padding: 12px 0; }
    .reading-flow span { color: #6e7471; display: block; font-size: 14px; margin-top: 6px; }
    .month-calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-left: 1px solid #d8d2c6; border-top: 1px solid #d8d2c6; }
    .month-calendar__weekday, .month-calendar__day { border-bottom: 1px solid #d8d2c6; border-right: 1px solid #d8d2c6; min-height: 105px; padding: 8px; }
    .month-calendar__weekday { background: #153638; color: white; min-height: 0; text-align: center; }
    .month-calendar__day--weekend { background: #efeae1; }
    .month-calendar__day--empty { background: rgba(239,234,225,.45); }
    .event-chip { border: 1px solid #d8d2c6; display: block; font-size: 11px; line-height: 1.3; margin-top: 6px; padding: 4px; }
    .event-chip--macro { background: rgba(11,52,54,.08); color: #0b3436; }
    .event-chip--central-bank, .event-chip--earnings { background: rgba(154,122,68,.1); color: #6f542d; }
    .event-chip--options { background: rgba(138,78,69,.1); color: #8a4e45; }
    .event-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .watch-group { border: 0; padding: 12px 0; }
    .watch-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .watch--compact { display: flex; flex-direction: column; }
    .watch-heading { align-items: start; display: flex; gap: 12px; justify-content: space-between; }
    .status { border: 1px solid #d8d2c6; font-size: 10px; font-weight: 700; padding: 3px 7px; text-transform: uppercase; }
    .status--stressed { background: rgba(138,78,69,.1); color: #8a4e45; }
    .status--tba { background: rgba(154,122,68,.1); color: #6f542d; }
    .status--watch, .status--stable, .status--improving { background: rgba(11,52,54,.08); color: #0b3436; }
    .watch-change { border-left: 3px solid #9a7a45; padding-left: 12px; }
    .follow-link, .unavailable { display: block; margin-top: auto; padding: 9px 11px; }
    .follow-link { background: #153638; color: white; text-decoration: none; }
    .unavailable { background: #efeae1; color: #6e7471; font-size: 13px; }
    details { border-top: 1px solid #d8d2c6; margin-top: 12px; padding-top: 9px; }
    summary { color: #0b3436; cursor: pointer; font-weight: 700; }` : ""}
    .card, .asset, .watch, .callout { margin: 14px 0; padding: 18px; border: 1px solid #d8d2c6; background: rgba(255,255,255,.62); break-inside: avoid; }
    .summary, .source { color: #6e7471; font-size: 14px; }
    .historical-note, .disclaimer { border-left: 3px solid #9a7a45; padding: 12px 16px; background: rgba(239,234,224,.7); }
    .table-wrap { overflow-x: auto; margin: 14px 0 22px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d8d2c6; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #153638; color: white; }
    figure { margin: 24px 0; padding: 16px; border: 1px solid #d8d2c6; background: white; break-inside: avoid; }
    figure img { display: block; max-width: 100%; height: auto; margin: auto; }
    figcaption { margin-top: 10px; }
    @media print {
      body { font-size: 10pt; print-color-adjust: exact; }
      main { max-width: none; padding: 0; }
      .cover { min-height: 248mm; break-after: page; }
      section { break-before: page; border-bottom: 0; padding: 0; }
      h1 { font-size: 42pt; }
      h2 { font-size: 20pt; }
      .subtitle, .lead { font-size: 13pt; }
      .card, .asset, .watch, .callout { padding: 4mm; }
    }
    @media (max-width: 720px) {
      main { padding: 28px 16px 48px; }
      .grid, .columns { grid-template-columns: 1fr; }${enhanced ? `
      .reading-flow { grid-template-columns: 1fr; }
      .month-calendar__weekday, .month-calendar__day { min-height: 54px; padding: 4px; }
      .event-chip { font-size: 0; min-height: 10px; padding: 0; }
      .event-links, .watch-grid { grid-template-columns: 1fr; }` : ""}
      .metadata div { grid-template-columns: 1fr; gap: 3px; }
    }
  `;
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function icsDate(value: string) {
  return value.replaceAll("-", "");
}

function icsDateTime(value: string) {
  return value.replace(/[-:]/g, "").replace(".000", "");
}

function addOneDay(value: string) {
  let [year, month, day] = value.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  day += 1;
  if (day > daysInMonth[month - 1]) {
    day = 1;
    month += 1;
  }
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return [year, month, day].map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("-");
}

function foldIcsLine(line: string) {
  const lines: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const bytes = Buffer.byteLength(character);
    if (currentBytes + bytes > 75) {
      lines.push(current);
      current = ` ${character}`;
      currentBytes = 1 + bytes;
    } else {
      current += character;
      currentBytes += bytes;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

function renderIcs(model: ReportExportModel) {
  assert(model.events.length, `${model.id}: no hay eventos verificables para ICS.`);
  const stamp = `${icsDate(model.modifiedAt)}T000000Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Luigui Herrera//Market Reports//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(model.editionName)}`,
  ];
  for (const event of model.events) {
    const timingLines = event.startDateTimeUtc
      ? [`DTSTART:${icsDateTime(event.startDateTimeUtc)}`]
      : [
          `DTSTART;VALUE=DATE:${icsDate(event.startDate)}`,
          `DTEND;VALUE=DATE:${icsDate(event.endDate ?? addOneDay(event.startDate))}`,
        ];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(event.uid)}`,
      `DTSTAMP:${stamp}`,
      ...timingLines,
      `SUMMARY:${escapeIcs(event.summary)}`,
      `DESCRIPTION:${escapeIcs(event.description)}`,
      `URL:${event.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function findPdfPython() {
  const candidates = [
    process.env.REPORTS_PYTHON,
    path.join(
      os.homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "python",
      "bin",
      "python3",
    ),
    "python3",
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["-c", "import reportlab, pdfplumber, pypdf"], {
      encoding: "utf8",
    });
    if (probe.status === 0) return candidate;
  }
  throw new Error(
    "PDF tooling unavailable. Set REPORTS_PYTHON to Python with reportlab, pdfplumber and pypdf.",
  );
}

function runPdfPython(args: string[], capture = false) {
  const result = spawnSync(findPdfPython(), [pdfScript, ...args], {
    cwd: root,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      capture
        ? `PDF command failed: ${result.stderr || result.stdout}`
        : `PDF command failed with exit ${result.status}.`,
    );
  }
  return capture ? String(result.stdout) : "";
}

function artifactEntry(outputDir: string, relativeName: string, mimeType: string): ArtifactManifestEntry {
  const absolutePath = path.join(outputDir, relativeName);
  const value = fs.readFileSync(absolutePath);
  return {
    path: `/reports/${relativeName}`,
    mimeType,
    sha256: sha256(value),
    size: value.length,
  };
}

function renderLlmsSection(current: string, manifest: ReportsManifest) {
  const reports = manifest.reports.map((entry) => {
    const model = models.find((item) => item.id === entry.id);
    assert(model, `Modelo no encontrado para ${entry.id}.`);
    const formats = entry.formats;
    const lines = [
      `### ${model.editionName}`,
      `- Primary canonical editorial URL: ${model.canonicalUrl}`,
      `- Description: ${model.description}`,
      `- Published: ${model.publishedAt}`,
      `- Markdown auxiliary machine-readable representation: ${REPORT_SITE_URL}${formats.markdown?.path}`,
      `- PDF human-readable download: ${REPORT_SITE_URL}${formats.pdf?.path}`,
      `- Secondary downloadable HTML representation: ${REPORT_SITE_URL}${formats.html?.path}`,
    ];
    if (formats.ics) {
      lines.push(`- Structured calendar events: ${REPORT_SITE_URL}${formats.ics.path}`);
    }
    return lines.join("\n");
  });
  const generated = `${llmsSectionHeading}

This section is a complementary discovery aid, not an official indexing protocol. The editorial page is the primary representation of each report.

${reports.join("\n\n")}`;
  const headingIndex = current.indexOf(llmsSectionHeading);
  assert(headingIndex >= 0, `No se encontró ${llmsSectionHeading} en llms.txt.`);
  const afterHeading = headingIndex + llmsSectionHeading.length;
  const nextHeadingOffset = current.slice(afterHeading).search(/\n## /);
  const endIndex = nextHeadingOffset >= 0 ? afterHeading + nextHeadingOffset : current.length;
  const prefix = current.slice(0, headingIndex);
  const suffix = current.slice(endIndex);
  return `${prefix}${generated}\n\n${suffix.replace(/^\n+/, "")}`;
}

function generateInto(outputDir: string, inputLlms: string) {
  fs.mkdirSync(outputDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "geo01b-models-"));
  try {
    for (const model of models) {
      if (model.status === "archivado") {
        for (const relativeName of [
          `${model.id}.html`,
          `${model.id}.md`,
          `${model.id}.pdf`,
          ...(model.formats.ics ? [path.basename(model.formats.ics)] : []),
        ]) {
          const source = path.join(reportsDir, relativeName);
          const destination = path.join(outputDir, relativeName);
          if (source !== destination) fs.copyFileSync(source, destination);
        }
        continue;
      }
      fs.writeFileSync(path.join(outputDir, `${model.id}.html`), renderHtml(model), "utf8");
      fs.writeFileSync(path.join(outputDir, `${model.id}.md`), renderMarkdown(model), "utf8");
      if (model.formats.ics) {
        fs.writeFileSync(path.join(outputDir, path.basename(model.formats.ics)), renderIcs(model), "utf8");
      }
      const modelPath = path.join(tempDir, `${model.id}.json`);
      fs.writeFileSync(modelPath, stableStringify(model, 2), "utf8");
      runPdfPython(["generate", modelPath, path.join(outputDir, `${model.id}.pdf`), root]);
    }

    const manifest: ReportsManifest = {
      schemaVersion: REPORT_EXPORT_SCHEMA_VERSION,
      reports: models.map((model) => {
        const formats: ReportManifestEntry["formats"] = {
          html: artifactEntry(outputDir, `${model.id}.html`, "text/html; charset=utf-8"),
          markdown: artifactEntry(outputDir, `${model.id}.md`, "text/markdown; charset=utf-8"),
          pdf: artifactEntry(outputDir, `${model.id}.pdf`, "application/pdf"),
        };
        if (model.formats.ics) {
          formats.ics = artifactEntry(outputDir, path.basename(model.formats.ics), "text/calendar; charset=utf-8");
        }
        return {
          id: model.id,
          canonicalUrl: model.canonicalUrl,
          publishedAt: model.publishedAt,
          modifiedAt: model.modifiedAt,
          cutoffs: {
            editorial: model.editorialCutoffAt ?? null,
            automaticData: model.automaticDataCutoffAt ?? null,
          },
          sourceHash: sha256(stableStringify(model)),
          formats,
        };
      }),
    };
    fs.writeFileSync(path.join(outputDir, "manifest.json"), `${stableStringify(manifest, 2)}\n`, "utf8");
    return {
      manifest,
      llms: renderLlmsSection(inputLlms, manifest),
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function normalizedText(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u2011\u2012\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/»/g, "≈")
    .replace(/luigui herrera\s+\d+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function assertContains(haystack: string, needle: string, label: string) {
  const normalizedHaystack = normalizedText(haystack);
  const normalizedNeedle = normalizedText(needle);
  assert(
    normalizedHaystack.includes(normalizedNeedle),
    `${label}: falta "${needle.slice(0, 120)}".`,
  );
}

function substantiveNeedles(section: ReportExportSection, model: ReportExportModel) {
  const values: string[] = [section.title];
  switch (section.kind) {
    case "narrative":
      values.push(section.body);
      break;
    case "summary":
      for (const item of section.items) values.push(item.title, item.text);
      if (section.transversalFactor) {
        values.push(section.transversalFactor.title, section.transversalFactor.text);
      }
      break;
    case "context":
      for (const item of section.items) values.push(item.title, item.summary, item.body);
      break;
    case "asset-readings":
      for (const item of section.items) {
        values.push(
          item.asset,
          item.headline,
          item.story,
          item.changed,
          item.expected,
          item.watch,
          item.reading,
          item.timeline.before,
          item.timeline.now,
          item.timeline.next,
        );
      }
      break;
    case "historical-snapshot": {
      const snapshot = section.snapshot;
      values.push(
        snapshot.dataDate,
        snapshot.regime.label,
        snapshot.regime.score === null ? "No publicada" : `${snapshot.regime.score}/100`,
        snapshot.regime.confidence === null ? "No publicada" : `${snapshot.regime.confidence}%`,
        snapshot.regime.interpretation,
        ...snapshot.regime.support,
        ...snapshot.regime.caution,
        ...snapshot.regime.watch,
        snapshot.sectors.reading,
        snapshot.vix?.level.toFixed(1) ?? "No disponible al cierre",
        snapshot.vix?.curveText ?? "No disponible al cierre",
        snapshot.btcEtfFlows ? formatUsdMillions(snapshot.btcEtfFlows.lastDayUsdMillions) : "No disponible al cierre",
        snapshot.btcEtfFlows ? formatUsdMillions(snapshot.btcEtfFlows.rolling5dUsdMillions) : "No disponible al cierre",
        snapshot.gldFlowPressure?.summary ?? "No disponible al cierre",
      );
      for (const item of snapshot.indices) {
        values.push(item.ticker, `${formatSigned(item.return1w)}%`);
      }
      for (const item of [...snapshot.sectors.leaders, ...snapshot.sectors.laggards]) {
        values.push(item.ticker, item.name, `${formatSigned(item.return1w)}%`);
      }
      for (const asset of snapshot.statisticalAssets) {
        values.push(
          asset.label,
          asset.percentile.toFixed(1),
          asset.zScore.toFixed(2),
          `${formatSigned(asset.distanceLongAverage)}%`,
          asset.label === "BTC" ? asset.lastClose.toFixed(0) : asset.lastClose.toFixed(2),
        );
      }
      break;
    }
    case "figures":
      for (const item of section.items) values.push(item.asset, item.caption, item.source, item.note ?? "");
      break;
    case "calendar-scenarios":
      for (const item of section.calendar) {
        values.push(item.dateLabel, item.event, item.whyItMatters);
        if (model.presentation?.calendarStyle === "monthly") {
          values.push(
            calendarTimeLabel(item),
            ...(item.affectedAssets ?? []),
            item.sourceLabel ?? "",
            item.trackingLabel ?? "",
          );
        }
      }
      for (const item of section.scenarios) values.push(item.title, item.body);
      break;
    case "probable-routes":
      values.push(section.routes.note);
      for (const item of [...section.routes.engines, ...section.routes.scenarios]) values.push(item.title, item.body);
      break;
    case "watchlist":
      for (const item of section.items) {
        values.push(
          item.name,
          item.statusLabel ?? "Seguimiento",
          item.whatLooksAt,
          item.whyItMatters,
          item.currentReading ?? "Lectura editorial de seguimiento basada en el contexto del informe.",
          item.whatWouldChange ??
            "La lectura cambiaría si el comportamiento observado contradice la tesis principal.",
          item.asOf ?? model.publishedAt,
          item.source ?? model.description,
        );
      }
      break;
    case "sources":
      values.push(section.sourcesNote, section.disclaimer);
      break;
  }
  return values.filter(Boolean);
}

function inspectPdf(pdfPath: string) {
  return JSON.parse(runPdfPython(["inspect", pdfPath], true)) as {
    pages: number;
    metadata: { title: string; author: string; subject: string };
    pageTextLengths: number[];
    blankPages: number[];
    text: string;
  };
}

function validateIcs(model: ReportExportModel, value: string) {
  const physicalLines = value.split("\r\n").filter(Boolean);
  for (const line of physicalLines) {
    assert(Buffer.byteLength(line) <= 75, `${model.id}: línea ICS supera 75 octetos.`);
  }
  const unfolded = value.replace(/\r\n[ \t]/g, "");
  const events = [...unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map((match) => match[1]);
  assert.equal(events.length, model.events.length, `${model.id}: cantidad de eventos ICS incorrecta.`);
  const uids = events.map((event) => event.match(/^UID:(.+)$/m)?.[1]);
  assert(uids.every(Boolean), `${model.id}: evento ICS sin UID.`);
  assert.equal(new Set(uids).size, events.length, `${model.id}: UIDs duplicados en ICS.`);
  for (const expected of model.events) {
    const matchingEvents = events.filter((item) => item.includes(`UID:${escapeIcs(expected.uid)}`));
    assert.equal(matchingEvents.length, 1, `${model.id}: UID ausente o duplicado ${expected.uid}.`);
    const event = matchingEvents[0];
    assert(event, `${model.id}: falta UID ${expected.uid}.`);
    if (expected.startDateTimeUtc) {
      assert(event.includes(`DTSTART:${icsDateTime(expected.startDateTimeUtc)}`));
      assert(!event.includes("DTSTART;VALUE=DATE:"));
      assert(!event.includes("DTEND;VALUE=DATE:"));
    } else {
      assert(event.includes(`DTSTART;VALUE=DATE:${icsDate(expected.startDate)}`));
      const expectedEnd = model.status === "archivado"
        ? addOneDay(expected.endDate ?? expected.startDate)
        : expected.endDate ?? addOneDay(expected.startDate);
      assert(event.includes(`DTEND;VALUE=DATE:${icsDate(expectedEnd)}`));
    }
    assert(event.includes(`SUMMARY:${escapeIcs(expected.summary)}`));
    assert(event.includes(`DESCRIPTION:${escapeIcs(expected.description)}`));
    assert(event.includes(`URL:${expected.url}`));
    assert(event.includes(`DTSTAMP:${icsDate(model.modifiedAt)}T000000Z`));
  }
}

function validateRepository() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(reportsDir, "manifest.json"), "utf8"),
  ) as ReportsManifest;
  assert.equal(manifest.schemaVersion, REPORT_EXPORT_SCHEMA_VERSION);
  assert.equal(manifest.reports.length, models.length);

  for (const model of models) {
    const entry = manifest.reports.find((item) => item.id === model.id);
    assert(entry, `Falta ${model.id} en manifest.json.`);
    assert.equal(entry.canonicalUrl, model.canonicalUrl);
    assert.equal(entry.publishedAt, model.publishedAt);
    assert.equal(entry.modifiedAt, model.modifiedAt);
    assert.equal(entry.cutoffs.editorial, model.editorialCutoffAt ?? null);
    assert.equal(entry.cutoffs.automaticData, model.automaticDataCutoffAt ?? null);
    assert.equal(entry.sourceHash, sha256(stableStringify(model)));

    for (const [format, artifact] of Object.entries(entry.formats)) {
      assert(artifact, `${model.id}: artefacto ${format} vacío.`);
      const artifactPath = path.join(root, "public", artifact.path);
      assert(fs.existsSync(artifactPath), `${model.id}: no existe ${artifact.path}.`);
      const bytes = fs.readFileSync(artifactPath);
      assert.equal(bytes.length, artifact.size, `${model.id}: tamaño incoherente en ${format}.`);
      assert.equal(sha256(bytes), artifact.sha256, `${model.id}: hash incoherente en ${format}.`);
    }

    const html = fs.readFileSync(path.join(reportsDir, `${model.id}.html`), "utf8");
    const markdown = fs.readFileSync(path.join(reportsDir, `${model.id}.md`), "utf8");
    const pdfPath = path.join(reportsDir, `${model.id}.pdf`);
    const pdf = inspectPdf(pdfPath);

    assert(html.startsWith("<!doctype html>"));
    assert(html.includes('<html lang="es">'));
    assert(html.includes(`<link rel="canonical" href="${model.canonicalUrl}">`));
    assert.equal((markdown.match(/^# /gm) ?? []).length, 1, `${model.id}: Markdown debe tener un H1.`);
    assertContains(markdown, model.canonicalUrl, `${model.id} Markdown`);
    assert.equal(pdf.metadata.title, model.title, `${model.id}: Title PDF incorrecto.`);
    assert.equal(pdf.metadata.author, REPORT_EXPORT_AUTHOR, `${model.id}: Author PDF incorrecto.`);
    assert.equal(pdf.metadata.subject, model.description, `${model.id}: Subject PDF incorrecto.`);
    assert(pdf.pages > 0, `${model.id}: PDF sin páginas.`);
    assert.deepEqual(pdf.blankPages, [], `${model.id}: PDF contiene páginas vacías.`);

    for (const value of [
      model.editionName,
      model.title,
      model.subtitle,
      model.author,
      model.publishedAt,
      model.modifiedAt,
      model.editorialCutoffAt ?? "No aplica",
      model.automaticDataCutoffAt ?? "No aplica",
      model.canonicalUrl,
    ]) {
      assertContains(html, value, `${model.id} HTML`);
      assertContains(markdown, value, `${model.id} Markdown`);
      assertContains(pdf.text, value, `${model.id} PDF`);
    }

    for (const section of model.sections) {
      assert(html.includes(`data-section="${section.id}"`), `${model.id}: falta ${section.id} en HTML.`);
      for (const value of substantiveNeedles(section, model)) {
        assertContains(html, value, `${model.id} HTML/${section.id}`);
        assertContains(markdown, value, `${model.id} Markdown/${section.id}`);
        assertContains(pdf.text, value, `${model.id} PDF/${section.id}`);
      }
      if (section.kind === "figures") {
        for (const figure of section.items) {
          assert(html.includes(`alt="${esc(figure.alt)}"`), `${model.id}: alt ausente en HTML.`);
          assert(markdown.includes(`![${figure.alt}]`), `${model.id}: alt ausente en Markdown.`);
          assert(
            fs.existsSync(path.join(root, "public", figure.src)),
            `${model.id}: figura inexistente ${figure.src}.`,
          );
        }
      }
    }

    assert(!markdown.includes("public/reports/"), `${model.id}: ruta interna inválida en Markdown.`);
    if (model.id === "segundo-informe-julio-2026") {
      for (const value of forbiddenHistoricalPhrases) {
        for (const [format, content] of [
          ["HTML", html],
          ["Markdown", markdown],
          ["PDF", pdf.text],
        ] as const) {
          assert(
            !normalizedText(content).includes(value),
            `${model.id}: "${value}" aparece en ${format}.`,
          );
        }
      }
    }

    if (model.formats.ics) {
      const ics = fs.readFileSync(path.join(reportsDir, path.basename(model.formats.ics)), "utf8");
      validateIcs(model, ics);
    } else {
      assert.equal(model.events.length, 0, `${model.id}: eventos estructurados sin formato ICS.`);
    }
  }

  const currentLlms = fs.readFileSync(llmsPath, "utf8");
  assert.equal(currentLlms, renderLlmsSection(currentLlms, manifest), "llms.txt no está sincronizado.");
  console.log(
    `Reports validation passed: ${models.length} reports, ${manifest.reports.reduce(
      (sum, item) => sum + Object.keys(item.formats).length,
      0,
    )} artifacts and synchronized llms.txt.`,
  );
}

function expectedArtifactNames() {
  return [
    ...models.flatMap((model) => [
      `${model.id}.html`,
      `${model.id}.md`,
      `${model.id}.pdf`,
      ...(model.formats.ics ? [path.basename(model.formats.ics)] : []),
    ]),
    "manifest.json",
  ].sort();
}

function checkForDrift() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "geo01b-check-"));
  try {
    const currentLlms = fs.readFileSync(llmsPath, "utf8");
    const generated = generateInto(tempDir, currentLlms);
    const drift: string[] = [];
    for (const name of expectedArtifactNames()) {
      const expectedPath = path.join(tempDir, name);
      const actualPath = path.join(reportsDir, name);
      if (!fs.existsSync(actualPath)) {
        drift.push(`${name}: missing`);
        continue;
      }
      if (!fs.readFileSync(expectedPath).equals(fs.readFileSync(actualPath))) {
        drift.push(`${name}: differs`);
      }
    }
    if (generated.llms !== currentLlms) drift.push("public/llms.txt: differs");
    assert.equal(drift.length, 0, `Report artifact drift detected:\n${drift.join("\n")}`);
    console.log(`Reports check passed: ${expectedArtifactNames().length} files are deterministic and synchronized.`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (command === "generate") {
  const currentLlms = fs.readFileSync(llmsPath, "utf8");
  const generated = generateInto(reportsDir, currentLlms);
  fs.writeFileSync(llmsPath, generated.llms, "utf8");
  console.log(
    `Generated ${generated.manifest.reports.length} reports, manifest.json and the reports section of public/llms.txt.`,
  );
} else if (command === "validate") {
  validateRepository();
} else if (command === "check") {
  checkForDrift();
} else {
  throw new Error(`Unknown reports command: ${command}`);
}
