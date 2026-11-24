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
  const candidates = [filename, filename + ".tsx", filename + ".ts"];
  const file = candidates.find(candidate => existsSync(candidate));
  if (!file) throw new Error("Missing test dependency: " + filename);
  if (cache.has(file)) return cache.get(file).exports;
  const compiled = { exports: {} };
  cache.set(file, compiled);
  const localRequire = specifier => {
    if (specifier.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (specifier === "next/link") return { __esModule: true, default: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children) };
    if (specifier === "next/image") return { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement("img", { src, alt, width, height, className }) };
    if (specifier === "next/navigation") return { usePathname: () => "/en/weekly-report" };
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

const { WeeklyReport } = load(path.join(root, "components/reports/WeeklyReport.tsx"));
const { WeeklyReportEdition } = load(path.join(root, "components/reports/WeeklyReportEdition.tsx"));
const fixture = {
  generatedAt: "2026-11-23T08:30:00.000Z", dataThrough: "2026-11-20", weekLabel: "2026 · Week 47",
  regimeSummary: { current: "Neutral / mixto", regimeScore: 50, confidence: 75, interpretation: "Fixture regime interpretation" },
  executiveSummary: { helped: [{ label: "Fixture support", detail: "Fixture supporting detail" }], weighed: [] },
  coreEtfs: [{ ticker: "SPY", name: "S&P 500", weeklyReturn: 0.0125, distanceToMa200: 0.04, distanceToAth: -0.03 }],
  sectors: { data: { metrics: { interpretation: "Fixture sector interpretation", sectorDispersion1w: 1.2 } }, leaders: [], laggards: [] },
  volatility: { vix: null, termStructure: null }, flows: { btcEtfFlows: null },
  statisticalLevels: [{ ticker: "SPY", name: "S&P 500", percentile: 62.5, zScore: 0.5, distanceToLongAverage: 0.04 }],
  seasonality: null, crossSignalRadar: [],
};
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const plain = html => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

test("editorial presentation preserves every visible weekly reading and leaves data unchanged", () => {
  const original = structuredClone(fixture);
  const previous = render(WeeklyReport, { data: fixture, locale: "en" });
  const editorial = render(WeeklyReport, { data: fixture, locale: "en", presentation: "editorial" });
  assert.equal(plain(editorial), plain(previous));
  assert.match(editorial, /62\.5/);
  assert.match(editorial, /Fixture supporting detail/);
  assert.deepEqual(fixture, original);
});

test("English edition uses the shared editorial layout and every contents link reaches a section", () => {
  const html = render(WeeklyReportEdition, { data: fixture });
  assert.match(html, /class="page"/);
  assert.match(html, /class="layout"/);
  assert.match(html, /class="edition" data-weekly-report-edition/);
  assert.match(html, /class="cover"/);
  assert.match(html, /href="\/en\/reports"/);
  assert.match(html, /November 20, 2026/);
  assert.match(html, /November 23, 2026/);
  assert.match(html, /Weekly reading/);
  assert.doesNotMatch(html, /Segunda edición|Navegación del informe|Recorrer esta edición/);
  const targets = [...html.matchAll(/href="#(weekly-[^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(targets).size, 10);
  for (const target of targets) assert.ok(html.includes('id="' + target + '"'), target);
});

test("missing readings keep their English unavailable labels in the editorial view", () => {
  const data = structuredClone(fixture);
  data.regimeSummary.regimeScore = null;
  data.regimeSummary.confidence = null;
  data.sectors.data = null;
  data.coreEtfs = [];
  data.statisticalLevels = [];
  const html = render(WeeklyReportEdition, { data });
  assert.match(html, /Unavailable/);
  assert.match(html, /Sector rotation pending/);
  assert.match(html, /Seasonality pending/);
  assert.doesNotMatch(html, /NaN|undefined/);
});
