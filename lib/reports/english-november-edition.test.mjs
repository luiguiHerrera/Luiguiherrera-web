
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
const { secondNovember2026EnglishReport: report } = load(path.join(root, "lib/reports/second-november-2026.en.ts"));
const spanishSource = readFileSync(process.env.REPORT_SPANISH_SOURCE ?? path.join(root, "lib/reports/second-november-2026.ts"), "utf8");
const spanish = JSON.parse(spanishSource.slice(spanishSource.indexOf("= {") + 2).trim().replace(/;$/, ""));
const { EnglishNovemberReportEdition } = load(path.join(root, "components/reports/EnglishNovemberReportEdition.tsx"));
const html = renderToStaticMarkup(React.createElement(EnglishNovemberReportEdition));
const numeric = (value, locale) => Number(value.replace(/[%+\s]/g, "").replace("−", "-").replaceAll(locale === "es" ? "." : ",", "").replace(",", "."));

test("English edition preserves all seven chapters, every block and the source hierarchy", () => {
  assert.deepEqual(report.editorialSections.map(s => s.id), spanish.editorialSections.map(s => s.id));
  report.editorialSections.forEach((section, i) => {
    assert.equal(section.blocks.length, spanish.editorialSections[i].blocks.length);
    section.blocks.forEach((block, j) => {
      const original = spanish.editorialSections[i].blocks[j];
      assert.equal(block.kind, original.kind);
      assert.equal(block.level, original.level);
      if (block.kind !== "table") {
        assert.notEqual(block.text, original.text);
        assert.ok(block.text.length > 0);
      }
    });
  });
});

test("all table rows, asset prices and percentage changes retain their exact values", () => {
  report.editorialSections.forEach((section, i) => section.blocks.forEach((block, j) => {
    if (block.kind !== "table") return;
    const original = spanish.editorialSections[i].blocks[j];
    assert.equal(block.headers.length, original.headers.length);
    assert.equal(block.rows.length, original.rows.length);
    block.rows.forEach((row, k) => {
      assert.equal(row.length, original.rows[k].length);
      row.forEach((cell, l) => {
        if (/^[+−-]?\d[\d.,]*(?:\s*%)?$/.test(original.rows[k][l])) {
          assert.equal(numeric(cell, "en"), numeric(original.rows[k][l], "es"));
        }
      });
    });
  }));
});

test("edition and cutoffs are frozen to the Spanish edition and calendar evidence is preserved", () => {
  for (const field of ["editionAt", "publishedAt", "editorialCutoffAt", "automaticDataCutoffAt", "pdfHref"]) assert.equal(report[field], spanish[field]);
  assert.equal(report.calendar.length, spanish.calendar.length);
  report.calendar.forEach((event, i) => {
    for (const field of ["dateStart", "dateEnd", "sourceHref", "category", "timeStatus"]) assert.equal(event[field], spanish.calendar[i][field]);
  });
  assert.match(html, /November 13, 2026/);
  assert.match(html, /November 15, 2026/);
  assert.match(html, /November 16, 2026/);
  assert.doesNotMatch(readFileSync("app/en/weekly-report/page.tsx", "utf8"), /buildWeeklyReportData|getStatisticalLevelsManifest/);
});

test("English report renders the same editorial layout, six statistical panels and sector chart", () => {
  assert.match(html, /class="page"/);
  assert.match(html, /class="layout"/);
  assert.match(html, /class="[^"]*cover/);
  assert.equal((html.match(/data-native-report-section=/g) ?? []).length, 7);
  assert.equal((html.match(/data-weekly-levels=/g) ?? []).length, 6);
  assert.equal((html.match(/data-sector=/g) ?? []).length, 11);
  for (const ticker of ["spy", "gld", "fxi", "ewj", "btc", "eth"]) assert.match(html, new RegExp('id="' + ticker + '"'));
  for (const section of report.editorialSections) assert.ok(html.includes('id="' + section.id + '"'));
  assert.deepEqual([...html.matchAll(/Lecturas al cierre|variación desde|Qué pasó|Qué cambió|Qué esperamos|Navegación del informe|Bancos centrales|Precio al corte|NaN|undefined/g)].map(m => html.slice(Math.max(0, m.index - 45), m.index + 65)), []);
  assert.match(html, /href="\/en\/dashboard"/);
});

test("exports identify the original Spanish PDF while text and calendar downloads are English", () => {
  assert.match(html, /PDF \(Spanish\)/);
  assert.match(html, /second-november-2026.en.md/);
  assert.match(readFileSync("public/reports/second-november-2026.en.md", "utf8"), /## 7. Sources and methodology/);
  const ics = readFileSync("public/reports/second-november-2026.en.ics", "utf8");
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 7);
  assert.doesNotMatch(ics, /undefined|Resultados|Minutas/);
});

test("English archive describes this exact edition and English language switch reaches its Spanish counterpart", () => {
  const { currentEnglishReport } = load(path.join(root, "lib/reports/english-reports.ts"));
  assert.equal(currentEnglishReport.title, report.title);
  assert.equal(currentEnglishReport.href, "/en/weekly-report");
  assert.doesNotMatch(readFileSync("app/en/reports/page.tsx", "utf8"), /getStatisticalLevelsManifest/);
  assert.match(readFileSync("components/layout/LanguageSwitcher.tsx", "utf8"), /pathname === "\/en\/weekly-report" && locale === "es"/);
});
