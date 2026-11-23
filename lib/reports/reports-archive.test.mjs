import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const root = process.cwd();
const sourceRoot = process.env.REPORT_ARCHIVE_SOURCE_ROOT ?? root;
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function compile(filename, localRequire) {
  const source = readFileSync(filename, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", code)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const dates = compile(path.join(root, "lib/editorial/dates.ts"), require);
const { ReportsArchive } = compile(path.join(sourceRoot, "components/reports/ReportsArchive.tsx"), specifier => {
  if (specifier === "next/link") return { __esModule: true, default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
  if (specifier.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  if (specifier === "@/lib/editorial/dates") return dates;
  return require(specifier);
});

const entry = {
  id: "report", title: "Report fixture", label: "Edition", summary: "Summary", excerpt: "Excerpt",
  monthKey: "2026-11", monthLabel: "November 2026", publishedAt: "2026-11-18", editionAt: "2026-11-15",
  status: "actual", href: "/informes/report-fixture", downloads: [{ label: "PDF", href: "/reports/report-fixture.pdf" }],
};
const render = (reports, locale) => renderToStaticMarkup(React.createElement(ReportsArchive, { reports, locale }));

test("Spanish archive preserves publication and edition dates, report links and downloads", () => {
  const html = render([entry], "es");
  assert.match(html, /<h1>Análisis y perspectivas<\/h1>/);
  assert.match(html, /Noviembre de 2026/);
  assert.match(html, /Edición del <time dateTime="2026-11-15">15 de noviembre de 2026<\/time>/);
  assert.match(html, /Publicación web: <time dateTime="2026-11-18">18 de noviembre de 2026<\/time>/);
  assert.match(html, /href="\/informes\/report-fixture"/);
  assert.match(html, /href="\/reports\/report-fixture.pdf"/);
});

test("English current report shows its actual data cutoff without inventing a publication date", () => {
  const html = render([{ ...entry, href: "/en/weekly-report", publishedAt: null, editionAt: undefined, dataThrough: "2026-11-20", downloads: [] }], "en");
  assert.match(html, /<h1>Reports<\/h1>/);
  assert.match(html, /Latest report/);
  assert.match(html, /November 2026/);
  assert.match(html, /Data through <time dateTime="2026-11-20">November 20, 2026<\/time>/);
  assert.match(html, /href="\/en\/weekly-report"/);
  assert.doesNotMatch(html, /Published on|Pending publication|Análisis|Noviembre|Abrir informe|Descargar|Todos los meses/);
});

test("English empty archive has localized filters and no featured report", () => {
  const html = render([], "en");
  assert.match(html, /All months/);
  assert.match(html, /No reports are available for the selected period/);
  assert.doesNotMatch(html, /data-featured-report/);
});

test("the old Spanish archive redirects permanently while report detail URLs stay valid", async () => {
  const config = compile(path.join(sourceRoot, "next.config.ts"), require).default;
  const redirects = await config.redirects();
  assert.deepEqual(redirects.find(item => item.source === "/informes"), { source: "/informes", destination: "/analisisyperpectivas", permanent: true });
  assert.equal(redirects.some(item => item.source === "/informes/:path*"), false);
});

test("language links and canonical metadata use the new archive route in both directions", () => {
  const catalog = compile(path.join(root, "lib/trends/catalog.ts"), require);
  const pairs = compile(path.join(sourceRoot, "lib/i18n/language-pairs.ts"), specifier => specifier === "../trends/catalog.ts" ? catalog : require(specifier));
  const seo = compile(path.join(sourceRoot, "lib/seo/site.ts"), specifier => {
    if (specifier === "../trends/catalog.ts") return catalog;
    if (specifier === "../i18n/language-pairs.ts") return pairs;
    return require(specifier);
  });
  assert.equal(pairs.getTranslatedPathname("/analisisyperpectivas", "en"), "/en/reports");
  assert.equal(pairs.getTranslatedPathname("/en/reports", "es"), "/analisisyperpectivas");
  const expected = { es: seo.SITE_URL + "/analisisyperpectivas", en: seo.SITE_URL + "/en/reports", "x-default": seo.SITE_URL + "/analisisyperpectivas" };
  assert.deepEqual(seo.languageAlternates("/analisisyperpectivas"), expected);
  assert.deepEqual(seo.languageAlternates("/en/reports"), expected);
  assert.equal(seo.getRouteMetadata("/analisisyperpectivas").alternates.canonical, expected.es);
  assert.equal(seo.getRouteMetadata("/en/reports").alternates.canonical, expected.en);
  assert.equal(seo.indexableRoutePaths.includes("/informes"), false);
});
