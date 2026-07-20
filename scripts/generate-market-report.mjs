import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const reportsDir = path.join(root, "public", "reports");
const marketReportsPath = path.join(root, "lib", "reports", "market-reports.ts");
const siteUrl = "https://www.luiguiherrera.com";
const requestedSlug = process.argv[2] ?? "segundo-informe-julio-2026";
const editorialVersion = "20 de julio de 2026";

const report = loadMarketReport(requestedSlug);
const displayName = report.label ?? report.title;
const canonicalUrl = `${siteUrl}/informes/${report.id}`;
const outputBase = path.join(reportsDir, report.id);
const htmlPath = `${outputBase}.html`;
const mdPath = `${outputBase}.md`;
const pdfPath = `${outputBase}.pdf`;
const generatedLabel = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(new Date());

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(htmlPath, buildHtml(report).replace(/[ \t]+$/gm, ""), "utf8");
fs.writeFileSync(mdPath, buildMarkdown(report), "utf8");
await generatePdf(htmlPath, pdfPath);

console.log(`Generated ${path.relative(root, htmlPath)}`);
console.log(`Generated ${path.relative(root, mdPath)}`);
console.log(`Generated ${path.relative(root, pdfPath)}`);

function loadMarketReport(slug) {
  const source = fs.readFileSync(marketReportsPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: marketReportsPath,
  }).outputText;
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require,
  };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(compiled, sandbox, { filename: marketReportsPath });
  const found = sandbox.exports.marketReports.find((item) => item.id === slug);
  if (!found) {
    throw new Error(`No market report found for slug: ${slug}`);
  }
  return found;
}

async function generatePdf(inputHtmlPath, outputPdfPath) {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("Google Chrome is required to generate the PDF in this project.");
  }

  const port = 9333 + (process.pid % 400);
  const userDataDir = path.join("/tmp", `luigui-report-chrome-${process.pid}`);
  fs.rmSync(userDataDir, { force: true, maxRetries: 3, recursive: true, retryDelay: 100 });

  const { spawn } = await import("node:child_process");
  const browserProcess = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ], { stdio: "ignore" });

  try {
    const webSocketDebuggerUrl = await waitForPageDebuggerUrl(port);
    const client = await createCdpClient(webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Page.navigate", { url: `file://${inputHtmlPath}` });
    await client.waitFor("Page.loadEventFired");
    const result = await client.send("Page.printToPDF", {
      displayHeaderFooter: true,
      footerTemplate:
        '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#6e7471;padding:0 14mm;border-top:1px solid #d8d2c6;"><span>Luigui Herrera</span><span style="float:right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
      headerTemplate: "<div></div>",
      marginBottom: 0.33,
      marginLeft: 0,
      marginRight: 0,
      marginTop: 0.12,
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(outputPdfPath, Buffer.from(result.data, "base64"));
    client.close();
  } finally {
    browserProcess.kill("SIGTERM");
    fs.rmSync(userDataDir, { force: true, maxRetries: 6, recursive: true, retryDelay: 150 });
  }
}

function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    process.env.CHROME_BIN,
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForPageDebuggerUrl(port) {
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  for (let index = 0; index < 80; index += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const targets = await response.json();
        const pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
        if (pageTarget) return pageTarget.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error("Chrome page DevTools endpoint did not become available.");
}

function createCdpClient(url) {
  return new Promise((resolve, reject) => {
    if (typeof WebSocket === "undefined") {
      reject(new Error("This Node.js runtime does not expose WebSocket."));
      return;
    }
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const waiters = new Map();

    socket.addEventListener("open", () => {
      resolve({
        close: () => socket.close(),
        send(method, params = {}) {
          const id = nextId;
          nextId += 1;
          socket.send(JSON.stringify({ id, method, params }));
          return new Promise((innerResolve, innerReject) => {
            pending.set(id, { resolve: innerResolve, reject: innerReject });
          });
        },
        waitFor(method) {
          return new Promise((innerResolve) => {
            waiters.set(method, innerResolve);
          });
        },
      });
    });
    socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && pending.has(payload.id)) {
        const waiter = pending.get(payload.id);
        pending.delete(payload.id);
        if (payload.error) waiter.reject(new Error(payload.error.message));
        else waiter.resolve(payload.result ?? {});
        return;
      }
      if (payload.method && waiters.has(payload.method)) {
        const waiter = waiters.get(payload.method);
        waiters.delete(payload.method);
        waiter(payload.params ?? {});
      }
    });
    socket.addEventListener("error", reject);
  });
}

function buildHtml(item) {
  const figures = item.assetReadings.flatMap((asset) =>
    (asset.figures ?? []).map((figure) => ({ ...figure, asset: asset.asset })),
  );

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(displayName)} - Luigui Herrera</title>
  <meta name="description" content="${esc(item.subtitle)}">
  <meta name="author" content="Luigui Herrera">
  <meta name="date" content="${esc(item.publishedLabel ?? item.dateLabel)}">
  <link rel="canonical" href="${canonicalUrl}">
  <!-- Contenido generado desde market-reports.ts. Versión editorial: ${editorialVersion}. Slug: ${item.id}. -->
  <style>${css()}</style>
</head>
<body>
  <main>
    <section class="page cover">
      <div class="topline">
        <span>Informes de mercado - Julio 2026</span>
        <span>Luigui Herrera</span>
      </div>
      <div class="cover-body">
        <p class="kicker">${esc(displayName)}</p>
        <h1>${esc(item.title)}</h1>
        <p class="subtitle">${esc(item.subtitle)}</p>
        <dl class="cover-meta">
          <div><dt>Fecha</dt><dd>${esc(item.publishedLabel ?? item.dateLabel)}</dd></div>
          <div><dt>Autor</dt><dd>Luigui Herrera</dd></div>
          <div><dt>URL</dt><dd><a href="${canonicalUrl}">luiguiherrera.com/informes/${esc(item.id)}</a></dd></div>
        </dl>
      </div>
      <p class="legal">${esc(item.disclaimer)}</p>
    </section>

    <section class="page">
      ${sectionHeader("Tesis principal", "La lectura de fondo")}
      <p class="lead">${esc(item.thesis)}</p>
      <div class="summary-grid">
        ${item.executiveSummary.map((entry) => smallCard(entry.title, entry.text)).join("")}
      </div>
      ${item.transversalFactor ? transverseCallout(item.transversalFactor) : ""}
      ${sectionHeader("Qué pasó", "Contexto por activo")}
      <div class="asset-order">
        ${item.whatHappened.map((block) => narrativeBlock(block.title, block.body)).join("")}
      </div>
    </section>

    <section class="page">
      ${sectionHeader("Qué esperamos", "Lectura de seguimiento por activo")}
      ${item.assetReadings.map(assetReading).join("")}
    </section>

    <section class="page">
      ${sectionHeader("Figuras", "Evidencia visual seleccionada")}
      <div class="figures">
        ${figures.map(figureBlock).join("")}
      </div>
    </section>

    <section class="page">
      ${sectionHeader("Calendario y escenarios", "Fechas y rutas probables")}
      <div class="compact-grid">
        ${item.calendar.map((entry) => smallCard(entry.dateLabel, `${entry.event}. ${entry.whyItMatters}`)).join("")}
      </div>
      <div class="scenario-grid">
        ${item.scenarios.map((scenario) => smallCard(scenario.title, scenario.body)).join("")}
      </div>
      <div class="signals-section">
      ${sectionHeader("Señales a vigilar", "Lista de control")}
      <div class="watchlist">
        ${item.watchlist.map(watchItem).join("")}
      </div>
      </div>
      <div class="final closing-section">
      ${sectionHeader("Fuentes y aviso educativo", "Marco de lectura")}
      <p class="lead">${esc(item.sourcesNote)}</p>
      <p class="disclaimer">${esc(item.disclaimer)}</p>
      <dl class="trace">
        <div><dt>Slug</dt><dd>${esc(item.id)}</dd></div>
        <div><dt>Fecha de generación</dt><dd>${esc(generatedLabel)}</dd></div>
        <div><dt>Versión editorial</dt><dd>${editorialVersion}</dd></div>
        <div><dt>URL canónica</dt><dd><a href="${canonicalUrl}">${canonicalUrl}</a></dd></div>
      </dl>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function buildMarkdown(item) {
  const figures = item.assetReadings.flatMap((asset) =>
    (asset.figures ?? []).map((figure) => ({ ...figure, asset: asset.asset })),
  );

  return `<!-- Contenido generado desde market-reports.ts. Versión editorial: ${editorialVersion}. Slug: ${item.id}. -->

# ${item.title}

${item.subtitle}

- Informe: ${displayName}
- Fecha: ${item.publishedLabel ?? item.dateLabel}
- Autor: Luigui Herrera
- URL canónica: ${canonicalUrl}
- Versión editorial: ${editorialVersion}
- Fecha de generación: ${generatedLabel}

> ${item.disclaimer}

## Tesis principal

${item.thesis}

## Resumen ejecutivo

${item.executiveSummary.map((entry) => `- **${entry.title}:** ${entry.text}`).join("\n")}
${item.transversalFactor ? `\n\n**${item.transversalFactor.label ?? "Factor transversal"} - ${item.transversalFactor.title}:** ${item.transversalFactor.text}` : ""}

## Qué pasó

${item.whatHappened.map((block) => `### ${block.title}\n\n${block.body}`).join("\n\n")}

## Qué esperamos

${item.assetReadings.map(markdownAssetReading).join("\n\n")}

## Figuras

${figures.map(markdownFigure).join("\n\n")}

## Calendario y escenarios

${item.calendar.map((entry) => `- **${entry.dateLabel}:** ${entry.event}. ${entry.whyItMatters}`).join("\n")}

${item.scenarios.map((scenario) => `### ${scenario.title}\n\n${scenario.body}`).join("\n\n")}

## Señales a vigilar

${item.watchlist.map(markdownWatchItem).join("\n\n")}

## Fuentes y aviso educativo

${item.sourcesNote}

${item.disclaimer}
`;
}

function assetReading(asset) {
  return `<article class="asset-reading">
    <div>
      <p class="asset-label">${esc(asset.asset)} · ${esc(asset.badge)}</p>
      <h3>${esc(asset.headline)}</h3>
    </div>
    <div class="asset-columns">
      ${microBlock("Qué pasó", asset.story)}
      ${microBlock("Qué cambió", asset.changed)}
      ${microBlock("Qué esperamos", asset.expected)}
      ${microBlock("Qué vigilar", asset.watch)}
      ${microBlock("Lectura del informe", asset.reading)}
      ${microBlock("Secuencia", `${asset.timeline.before} ${asset.timeline.now} ${asset.timeline.next}`)}
    </div>
  </article>`;
}

function markdownAssetReading(asset) {
  return `### ${asset.asset}

**${asset.headline}**

- **Qué pasó:** ${asset.story}
- **Qué cambió:** ${asset.changed}
- **Qué esperamos:** ${asset.expected}
- **Qué vigilar:** ${asset.watch}
- **Lectura del informe:** ${asset.reading}
- **Secuencia:** ${asset.timeline.before} ${asset.timeline.now} ${asset.timeline.next}`;
}

function watchItem(item) {
  const href = item.href ?? item.reference?.href;
  const linkLabel = item.linkLabel ?? item.reference?.label;
  const className = item.key === "earnings-reaction" ? "watch-item watch-item-wide" : "watch-item";
  return `<article class="${className}">
    <h3>${esc(item.name)}</h3>
    <p class="status">${esc(item.statusLabel ?? "Seguimiento")}</p>
    ${microBlock("Qué mira", item.whatLooksAt)}
    ${microBlock("Por qué importa", item.whyItMatters)}
    ${microBlock("Lectura actual", item.currentReading ?? "Lectura editorial de seguimiento basada en el contexto del informe.")}
    ${microBlock("Qué cambiaría", item.whatWouldChange ?? "La lectura cambiaría si el comportamiento observado contradice la tesis principal del informe.")}
    <p class="source"><strong>Fecha:</strong> ${esc(item.asOf ?? item.publishedLabel ?? report.publishedLabel ?? report.dateLabel)} · <strong>Fuente:</strong> ${esc(item.source ?? report.sourcesNote)}</p>
    ${href && linkLabel ? `<p class="source"><a href="${esc(absoluteLink(href))}">${esc(linkLabel)}</a></p>` : ""}
  </article>`;
}

function markdownWatchItem(item) {
  const href = item.href ?? item.reference?.href;
  const linkLabel = item.linkLabel ?? item.reference?.label;
  const link = href && linkLabel ? `\n- **Enlace:** [${linkLabel}](${absoluteLink(href)})` : "";
  return `### ${item.name}

- **Estado:** ${item.statusLabel ?? "Seguimiento"}
- **Qué mira:** ${item.whatLooksAt}
- **Por qué importa:** ${item.whyItMatters}
- **Lectura actual:** ${item.currentReading ?? "Lectura editorial de seguimiento basada en el contexto del informe."}
- **Qué cambiaría:** ${item.whatWouldChange ?? "La lectura cambiaría si el comportamiento observado contradice la tesis principal del informe."}
- **Fecha:** ${item.asOf ?? report.publishedLabel ?? report.dateLabel}
- **Fuente:** ${item.source ?? report.sourcesNote}${link}`;
}

function figureBlock(figure) {
  const src = toRelativeImagePath(figure.src);
  const source = figure.sourceHref
    ? `<a href="${esc(figure.sourceHref)}">${esc(figure.source)}</a>`
    : esc(figure.source);
  return `<figure>
    <img src="${src}" alt="${esc(figure.alt)}" width="${figure.width}" height="${figure.height}">
    <figcaption><strong>${esc(figure.asset)}.</strong> ${esc(figure.caption)} ${figure.note ? `<span>${esc(figure.note)}</span>` : ""}</figcaption>
    <p class="figure-source">${source}</p>
  </figure>`;
}

function transverseCallout(factor) {
  return `<article class="transverse">
    ${factor.label ? `<p>${esc(factor.label)}</p>` : ""}
    <h3>${esc(factor.title)}</h3>
    <span>${esc(factor.text)}</span>
  </article>`;
}

function markdownFigure(figure) {
  const src = toRelativeImagePath(figure.src);
  const note = figure.note ? `\n\n${figure.note}` : "";
  const source = figure.sourceHref ? `[${figure.source}](${figure.sourceHref})` : figure.source;
  return `### ${figure.asset}

![${figure.alt}](${src})

${figure.caption}

Fuente: ${source}${note}`;
}

function sectionHeader(kicker, title) {
  return `<header class="section-head"><p>${esc(kicker)}</p><h2>${esc(title)}</h2></header>`;
}

function smallCard(title, body) {
  return `<article class="small-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`;
}

function narrativeBlock(title, body) {
  return `<article class="narrative"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`;
}

function microBlock(title, body) {
  return `<div class="micro"><p>${esc(title)}</p><span>${esc(body)}</span></div>`;
}

function toRelativeImagePath(src) {
  return src.startsWith("/images/") ? `..${src}` : src;
}

function absoluteLink(href) {
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) return href;
  if (href.startsWith("/")) return `${siteUrl}${href}`;
  return href;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function css() {
  return `
    @page { size: A4; margin: 15mm 14mm 17mm; }
    * { box-sizing: border-box; }
    html { background: #f7f4ec; color: #1f2328; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    body { margin: 0; font-size: 10.2pt; line-height: 1.55; }
    a { color: #0b3436; text-decoration: none; border-bottom: 1px solid rgba(11, 52, 54, 0.35); }
    h1, h2, h3, p { margin: 0; }
    h1 { max-width: 165mm; font-size: clamp(38px, 7vw, 72px); line-height: 0.98; letter-spacing: 0; color: #111817; }
    h2 { font-size: 25px; line-height: 1.1; letter-spacing: 0; color: #111817; }
    h3 { font-size: 15px; line-height: 1.25; color: #153638; }
    .page { position: relative; max-width: 980px; margin: 0 auto; padding: 46px 42px 54px; break-after: page; }
    .page:last-child { break-after: auto; }
    .closing-section { margin-top: 36px; border-top: 1px solid #d8d2c6; padding-top: 26px; }
    .cover { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
    .topline { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid #d8d2c6; padding-bottom: 18px; color: #6e7471; font-size: 12px; font-weight: 650; text-transform: uppercase; letter-spacing: 0.08em; }
    .cover-body { align-self: center; padding: 76px 0; }
    .kicker, .section-head p, .asset-label, .status { color: #9a7a45; font-size: 11px; font-weight: 750; letter-spacing: 0.11em; text-transform: uppercase; }
    .subtitle { max-width: 720px; margin-top: 22px; color: #0b3436; font-size: 24px; line-height: 1.25; }
    .cover-meta, .trace { display: grid; gap: 10px; margin-top: 34px; max-width: 720px; }
    .cover-meta div, .trace div { display: grid; grid-template-columns: 150px 1fr; gap: 16px; border-top: 1px solid #d8d2c6; padding-top: 9px; }
    dt { color: #6e7471; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    dd { margin: 0; color: #1f2328; }
    .legal, .disclaimer { border-left: 2px solid #9a7a45; padding-left: 16px; color: #555d58; font-size: 12px; line-height: 1.55; }
    .section-head { margin: 0 0 22px; padding-top: 6px; }
    .section-head h2 { margin-top: 8px; }
    .lead { max-width: 830px; color: #414844; font-size: 16px; line-height: 1.72; }
    .summary-grid, .compact-grid, .scenario-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 24px 0 34px; }
    .transverse { margin: -16px 0 34px; border: 1px solid rgba(154, 122, 69, 0.45); background: rgba(239, 234, 224, 0.46); padding: 18px; break-inside: avoid; }
    .transverse p { color: #9a7a45; font-size: 11px; font-weight: 750; letter-spacing: 0.11em; text-transform: uppercase; }
    .transverse h3 { margin-top: 8px; }
    .transverse span { display: block; margin-top: 8px; color: #555d58; }
    .small-card, .narrative, .asset-reading, .watch-item { border: 1px solid #d8d2c6; background: rgba(239, 234, 224, 0.68); padding: 18px; break-inside: avoid; }
    .small-card p, .narrative p, .micro span { display: block; margin-top: 9px; color: #555d58; }
    .asset-order { display: grid; gap: 13px; }
    .asset-reading { margin-bottom: 14px; }
    .asset-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .micro { border-left: 1px solid rgba(154, 122, 69, 0.55); padding-left: 11px; }
    .micro p { color: #9a7a45; font-size: 10px; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase; }
    .figures { display: grid; gap: 20px; }
    figure { margin: 0; padding: 16px; border: 1px solid #d8d2c6; background: #fffdf8; break-inside: avoid; page-break-inside: avoid; }
    figure img { display: block; width: auto; max-width: 100%; max-height: 560px; margin: 0 auto; object-fit: contain; }
    figcaption { margin-top: 12px; color: #414844; font-size: 12px; line-height: 1.5; }
    figcaption span { display: block; margin-top: 5px; color: #6e7471; }
    .figure-source, .source { margin-top: 7px; color: #6e7471; font-size: 11px; line-height: 1.45; }
    .scenario-grid { margin-top: 4px; }
    .watchlist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .signals-section { break-inside: auto; }
    .signals-section .section-head { break-after: avoid; page-break-after: avoid; }
    .watchlist { break-before: avoid; page-break-before: avoid; }
    .watch-item { padding: 14px; }
    .watch-item-wide { grid-column: 1 / -1; }
    .watch-item .micro { margin-top: 10px; }
    .final { min-height: 0; }
    .trace { margin-top: 28px; font-size: 12px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: none; min-height: auto; padding: 0; }
      .closing-section { margin-top: 8mm; padding-top: 6mm; }
      .cover { min-height: 247mm; }
      h1 { font-size: 46pt; }
      .subtitle { font-size: 18pt; }
      .lead { font-size: 11pt; }
      .small-card, .narrative, .asset-reading, .watch-item { padding: 5mm; }
      .asset-columns { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; }
      .summary-grid, .compact-grid, .scenario-grid { gap: 4mm; margin: 7mm 0 10mm; }
      .transverse { margin: -5mm 0 9mm; padding: 4mm; }
      .signals-section { break-before: page; page-break-before: always; }
      .signals-section .section-head { margin-bottom: 4mm; }
      .asset-reading { margin-bottom: 4mm; }
      .figures { gap: 6mm; }
      figure { padding: 4mm; }
      figure img { max-height: 128mm; }
      .watchlist { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3mm; }
      .watch-item { font-size: 7.7pt; line-height: 1.38; padding: 3.5mm; }
      .watch-item h3 { font-size: 10.5pt; }
      .watch-item .micro { margin-top: 2.5mm; }
      .watch-item .micro p { font-size: 6.8pt; }
      .trace { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm 5mm; margin-top: 5mm; font-size: 7.6pt; }
      .trace div { display: block; border-top: 0; padding-top: 0; }
      .trace dt { margin-bottom: 1mm; font-size: 6.8pt; }
    }
    @media (max-width: 760px) {
      .page { padding: 32px 18px 42px; }
      .topline, .cover-meta div, .trace div { grid-template-columns: 1fr; }
      .summary-grid, .compact-grid, .scenario-grid, .asset-columns, .watchlist { grid-template-columns: 1fr; }
    }
  `;
}
