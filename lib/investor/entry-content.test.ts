import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { investorEntryContent, type InvestorRouteOption } from "./entry-content.ts";
import { translatePathname } from "../i18n/routes.ts";

const actionsFor = (option: InvestorRouteOption) => option.actions ?? [option];
// Fingerprints of the approved, published content excluding only recommendation 01.
const frozen = {"es":"db4d5a824fef26a0d6f015297188f66f65f4690759624fca190ba620c53d7fbc","en":"9b7755222e67d6b5472a29fdde9b5a188ef967a7d1c8bd0f2a0085954d297cee"};

for (const locale of ["es", "en"] as const) {
  test(`${locale}: four intentions expose five distinct canonical destinations`, () => {
    const content = investorEntryContent[locale];
    assert.equal(content.guided.options.length, 4);
    const hrefs = content.guided.options.flatMap(option => actionsFor(option).map(action => action.href));
    assert.equal(new Set(hrefs).size, 5);
    const bridgeHrefs = content.bridges.items.map(item => item.href);
    assert.equal(new Set(bridgeHrefs).size, bridgeHrefs.length);
    assert.ok(bridgeHrefs.every(href => !hrefs.includes(href)));
    for (const href of [...hrefs, ...bridgeHrefs]) {
      const file = href.startsWith("/en/") ? `app${href}/page.tsx` : `app/(es)${href}/page.tsx`;
      assert.ok(existsSync(file), `Missing destination ${href}`);
      assert.doesNotMatch(readFileSync(file, "utf8"), /\b(?:permanentRedirect|redirect)\(/);
      assert.equal(href.startsWith("/en/"), locale === "en");
    }
  });

  test(`${locale}: quick read keeps its intent and gives each complementary action its own time`, () => {
    const option = investorEntryContent[locale].guided.options[0];
    assert.equal(option.label, locale === "es" ? "Quiero una lectura rápida del mercado." : "I want a quick market read.");
    assert.equal(option.title, locale === "es" ? "Lee el mercado desde dos ángulos" : "Read the market from two angles");
    assert.equal(option.description, locale === "es" ? "Mira qué está pasando ahora y, si necesitas contexto, qué cambió y por qué importa." : "See what is happening now and, when you need context, what changed and why it matters.");
    assert.deepEqual(option.outcomes, locale === "es" ? ["Qué está favoreciendo o frenando el entorno.", "Qué cambió y merece atención.", "Qué mirar después."] : ["What is supporting or pressuring the environment.", "What changed and deserves attention.", "What to look at next."]);
    assert.equal(option.actions?.length, 2);
    assert.equal(option.time, undefined, "No combined recommendation time");
    assert.deepEqual(option.actions?.map(a => a.time), ["≈5–10 min", "≈10–20 min"]);
    assert.deepEqual(option.actions?.map(a => a.href), locale === "es" ? ["/dashboard", "/informes"] : ["/en/dashboard", "/en/reports"]);
    assert.deepEqual(option.actions?.map(a => a.product), locale === "es" ? ["Dashboard", "Informes"] : ["Dashboard", "Reports"]);
    assert.deepEqual(option.actions?.map(a => a.label), locale === "es" ? ["AHORA", "CONTEXTO"] : ["NOW", "CONTEXT"]);
    assert.deepEqual(option.actions?.map(a => a.cta), locale === "es" ? ["Ver dashboard", "Leer informes"] : ["Open dashboard", "Read reports"]);
    assert.deepEqual(option.actions?.map(a => a.description), locale === "es" ? ["Régimen, amplitud, volatilidad y flujos en una lectura rápida.", "Qué cambió, qué merece atención y cómo interpretar el entorno."] : ["Regime, breadth, volatility and flows in one quick read.", "What changed, what deserves attention and how to interpret the environment."]);
  });

  test(`${locale}: options 02–04, hero, bridge, FAQ and all other approved copy stay frozen`, () => {
    const content = investorEntryContent[locale];
    const { options, ...guided } = content.guided;
    const unchanged = { ...content, guided: { ...guided, options: options.slice(1) } };
    assert.equal(createHash("sha256").update(JSON.stringify(unchanged)).digest("hex"), frozen[locale]);
    assert.ok(options.slice(1).every(option => !option.actions && actionsFor(option).length === 1));
  });
}

test("option 02 retains the Founder's exact intention and historical frame", () => {
  const option = investorEntryContent.es.guided.options[1];
  assert.equal(option.label, "Quiero conocer las estadísticas de mis activos.");
  assert.equal(option.title, "Mira tus activos frente a su historia");
});

test("ES and EN actions use their actual locale routes and equal reading times", () => {
  for (const [index, option] of investorEntryContent.es.guided.options.entries()) {
    const english = investorEntryContent.en.guided.options[index];
    assert.equal(option.id, english.id);
    const es = actionsFor(option), en = actionsFor(english);
    assert.equal(es.length, en.length);
    es.forEach((action, i) => {
      assert.equal(translatePathname(action.href, "en"), en[i].href);
      assert.equal(action.time, en[i].time);
    });
  }
});

test("Reports destinations are actual report entries, not resource redirects", () => {
  const es = readFileSync("app/(es)/informes/page.tsx", "utf8");
  const en = readFileSync("app/en/reports/page.tsx", "utf8");
  assert.match(es, /getReportsByMonth/);
  assert.match(es, /Mes anterior/);
  assert.match(es, /Archivo histórico/);
  assert.match(es, /Abrir informe/);
  assert.match(en, /previousEnglishReports/);
  assert.match(en, /currentEnglishReport/);
  assert.doesNotMatch(es + en, /redirect\(|ResourcePage/);
});
