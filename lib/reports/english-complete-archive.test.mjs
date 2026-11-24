
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const React = require("react");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");
const cache = new Map();
function load(filename) {
  const file = [filename, filename + ".tsx", filename + ".ts"].find(existsSync);
  if (!file) throw new Error("Missing dependency: " + filename);
  if (file.endsWith(".json")) return JSON.parse(readFileSync(file, "utf8"));
  if (cache.has(file)) return cache.get(file).exports;
  const compiled = { exports: {} };
  cache.set(file, compiled);
  const localRequire = specifier => {
    if (specifier.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (specifier === "next/link") return { __esModule: true, default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
    if (specifier === "next/image") return { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement("img", { src, alt, width, height, className }) };
    if (specifier.startsWith("@/")) return load(path.join(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return load(path.resolve(path.dirname(file), specifier));
    return require(specifier);
  };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}

const { catalogue, sourceFor, buildEnglishReport, reportBody, englishPath } = await import("../../scripts/build-english-archive.mjs");
const { parseEnglishArchive } = load(path.join(root, "lib/reports/english-archive.ts"));
const { EnglishArchiveReportEdition } = load(path.join(root, "components/reports/EnglishArchiveReportEdition.tsx"));
const { ReportsArchive } = load(path.join(root, "components/reports/ReportsArchive.tsx"));
const { default: ReportsPage } = load(path.join(root, "app/en/reports/page.tsx"));
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const indexHtml = render(ReportsPage);
const { archivedReportSpanishPath, englishReportPath } = load(path.join(root, "lib/reports/english-report-paths.ts"));
const numberOnly = value => value.replace(/\*\*/g, "").replace(/\s*(?:pp|USD|M USD|B USD|t)\s*$/g, "").trim();
const normalNumber = (value, locale) => {
  let n = numberOnly(value).replaceAll("−", "-").replaceAll(" ", "");
  if (locale === "es" && n.includes(",")) n = n.replaceAll(".", "").replaceAll(",", ".");
  else if (locale === "en") n = n.replaceAll(",", "");
  return n;
};

test("English index contains ten unique editions, two per month from July through November", () => {
  assert.equal(catalogue.length, 9);
  assert.equal(new Set(catalogue.map(r => r.href)).size, 9);
  assert.equal((indexHtml.match(/data-archive-report=/g) ?? []).length, 10);
  for (const month of ["07","08","09","10","11"]) {
    assert.equal((indexHtml.match(new RegExp('data-archive-month="2026-' + month + '"', "g")) ?? []).length, 1);
  }
  assert.match(indexHtml, /10 reports available/);
  for (const report of catalogue) assert.ok(indexHtml.includes('href="' + report.href + '"'), report.slug);
});

test("all ten reports switch to their matching English edition and archives switch back", () => {
  for (const report of catalogue) {
    assert.equal(englishReportPath(report.spanishHref), report.href);
    assert.equal(archivedReportSpanishPath(report.href), report.spanishHref);
  }
  assert.equal(englishReportPath("/informes/segundo-informe-noviembre-2026"), "/en/weekly-report");
  assert.equal(englishReportPath("/dashboard"), null);
});

for (const report of catalogue) {
  test(report.slug + ": complete frozen translation retains all chapters, block types, tables, values, images and links", () => {
    const source = sourceFor(report);
    const translated = buildEnglishReport(report);
    assert.equal(readFileSync("public" + report.markdownHref, "utf8"), translated);
    const a = parseEnglishArchive(source);
    const b = parseEnglishArchive(translated);
    assert.equal(a.length, b.length);
    assert.deepEqual(b.map(c => c.blocks.map(v => v.kind)), a.map(c => c.blocks.map(v => v.kind)));
    let tableCells = 0;
    b.forEach((chapter, i) => chapter.blocks.forEach((block, j) => {
      const original = a[i].blocks[j];
      if (block.kind === "image") assert.equal(block.src, original.src);
      if (block.kind === "list") assert.equal(block.items.length, original.items.length);
      if (block.kind === "table") {
        assert.equal(block.headers.length, original.headers.length);
        assert.equal(block.rows.length, original.rows.length);
        block.rows.forEach((row, k) => {
          assert.equal(row.length, original.rows[k].length);
          row.forEach((cell, l) => {
            const old = numberOnly(original.rows[k][l]);
            if (/^[+−-]?\d[\d.,/%+-]*$/.test(old)) {
              assert.equal(normalNumber(cell, "en"), normalNumber(old, "es"), report.slug + ": " + original.rows[k][l]);
              tableCells++;
            }
          });
        });
      }
    }));
    assert.ok(tableCells > 0 || report.slug === "first-july-2026");
    const links = value => [...value.matchAll(/\[((?:\[[^\]]+\]|[^\]])+)\]\(([^)]+)\)/g)].map(m => m[2]);
    const canonicalLink = value => englishPath(value).replace(/^https:\/\/www\.luiguiherrera\.com(?=\/)/, "");
    assert.deepEqual(links(reportBody(source)).map(canonicalLink).sort(), links(reportBody(translated)).map(canonicalLink).sort());
    const html = render(EnglishArchiveReportEdition, { report, chapters: b });
    assert.equal((html.match(/data-english-archive-chapter/g) ?? []).length, a.length);
    assert.match(html, /Original PDF \(Spanish\)/);
    assert.match(html, /Markdown \(English\)/);
    assert.ok(html.includes(report.publishedAt));
    assert.doesNotMatch(html, /NaN|undefined|Qué pasó|Qué cambió|Lecturas de mercado al cierre|Clasificación:|Retorno promedio/);
    for (const href of links(reportBody(translated))) {
      if (!href.startsWith(report.href + "#")) continue;
      const id = href.split("#")[1];
      assert.ok(html.includes('id="' + id + '"'), href);
    }
  });
}

test("English citations support nested reference labels without duplicate visible text", () => {
  const { EnglishReportInline } = load(path.join(root, "components/reports/EnglishReportInline.tsx"));
  const html = render(EnglishReportInline, { text: "[[M1]](https://example.com) [**FactSet**](https://example.com/factset)" });
  assert.equal((html.match(/>\[M1\]</g) ?? []).length, 1);
  assert.ok(html.includes("<strong>FactSet</strong>"));
});

test("month filtering inventory includes nine real archive pages and explicitly labeled original downloads", () => {
  const cards = catalogue.map(r => ({
    ...r, summary: r.subtitle, excerpt: r.subtitle, status: "archivado",
    downloads: [{label: "PDF (Spanish)",href:r.pdfHref}], publishedAt:r.publishedAt,
  }));
  const html = render(ReportsArchive, { reports: cards, locale: "en" });
  for (const month of ["July","August","September","October","November"]) assert.ok(html.includes(month));
  assert.equal((html.match(/data-archive-report=/g) ?? []).length, 9);
});
