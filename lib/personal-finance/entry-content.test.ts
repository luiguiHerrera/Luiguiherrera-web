import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { en } from "../i18n/dictionaries/en.ts";
import { es } from "../i18n/dictionaries/es.ts";
import {
  nextPersonalFinanceOptionIndex,
  personalFinanceDefaultOptionId,
  personalFinanceEntryContent,
} from "./entry-content.ts";

const expectedActionRoutes = {
  es: [
    ["/presupuesto"],
    ["/deudas"],
    ["/presupuesto"],
    ["/diagnostico?mode=quick", "/diagnostico?mode=complete"],
  ],
  en: [
    ["/en/budget"],
    ["/en/debt"],
    ["/en/budget"],
    ["/en/diagnostic?mode=quick", "/en/diagnostic?mode=complete"],
  ],
} as const;

const routeFiles = new Map([
  ["/presupuesto", "app/(es)/presupuesto/page.tsx"],
  ["/deudas", "app/(es)/deudas/page.tsx"],
  ["/diagnostico", "app/(es)/diagnostico/page.tsx"],
  ["/proteccion", "app/(es)/proteccion/page.tsx"],
  ["/protege-tu-dinero", "app/(es)/protege-tu-dinero/page.tsx"],
  ["/inversionista", "app/(es)/inversionista/page.tsx"],
  ["/en/budget", "app/en/budget/page.tsx"],
  ["/en/debt", "app/en/debt/page.tsx"],
  ["/en/diagnostic", "app/en/diagnostic/page.tsx"],
  ["/en/protection", "app/en/protection/page.tsx"],
  ["/en/protect-your-money", "app/en/protect-your-money/page.tsx"],
  ["/en/investor", "app/en/investor/page.tsx"],
]);

function recommendation(locale: "es" | "en", index: number) {
  return personalFinanceEntryContent[locale].guidedRoute.options[index].recommendation;
}

function allHrefs(locale: "es" | "en") {
  const content = personalFinanceEntryContent[locale];
  return [
    ...content.guidedRoute.options.flatMap((option) => option.recommendation.actions.map((action) => action.href)),
    ...content.bridge.resources.map((resource) => resource.href),
    content.bridge.transition.href,
  ];
}

test("uses the approved personal-finance navigation labels without changing the main CTA", () => {
  assert.equal(es.layout.nav.start, "Finanzas personales");
  assert.equal(en.layout.nav.start, "Personal finance");
  assert.equal(es.layout.cta, "Comenzar");
  assert.equal(en.layout.cta, "Start");
});

test("provides exactly four bilingual situations with one stable budget default", () => {
  for (const locale of ["es", "en"] as const) {
    const options = personalFinanceEntryContent[locale].guidedRoute.options;
    assert.equal(options.length, 4);
    assert.ok(options.every((option) => option.recommendation.outcomes.length === 3));
    assert.deepEqual(
      options.map((option) => option.recommendation.actions.map((action) => action.href)),
      expectedActionRoutes[locale],
    );
  }
  assert.equal(personalFinanceDefaultOptionId, "budget");
  assert.equal(personalFinanceEntryContent.es.guidedRoute.options[0].id, personalFinanceDefaultOptionId);
  assert.equal(personalFinanceEntryContent.en.guidedRoute.options[0].id, personalFinanceDefaultOptionId);
});

test("removes generic short durations and gives Budget, Debt and Emergency one honest action", () => {
  const serialized = JSON.stringify(personalFinanceEntryContent);
  assert.doesNotMatch(serialized, /2–4 min|3–5 min|4–6 min/);

  const expectedTimes = {
    es: [
      "≈30 min · con tus cifras a mano",
      "≈30 min · con saldos y tasas a mano",
      "≈30 min · como parte de tu presupuesto",
    ],
    en: [
      "≈30 min · with your figures at hand",
      "≈30 min · with balances and rates at hand",
      "≈30 min · as part of your budget",
    ],
  } as const;

  for (const locale of ["es", "en"] as const) {
    for (const [index, time] of expectedTimes[locale].entries()) {
      const actions = recommendation(locale, index).actions;
      assert.equal(actions.length, 1);
      assert.equal(actions[0].time, time);
    }
  }
});

test("keeps Budget and Emergency distinct while honestly sharing the canonical Budget route", () => {
  for (const locale of ["es", "en"] as const) {
    const budget = personalFinanceEntryContent[locale].guidedRoute.options[0];
    const emergency = personalFinanceEntryContent[locale].guidedRoute.options[2];
    assert.notEqual(budget.label, emergency.label);
    assert.notEqual(budget.recommendation.title, emergency.recommendation.title);
    assert.notEqual(budget.recommendation.description, emergency.recommendation.description);
    assert.notDeepEqual(budget.recommendation.outcomes, emergency.recommendation.outcomes);
    assert.notEqual(budget.recommendation.actions[0].cta, emergency.recommendation.actions[0].cta);
    assert.equal(budget.recommendation.actions[0].href, emergency.recommendation.actions[0].href);
  }
});

test("makes Diagnostic the only two-depth recommendation and uses its real modes", () => {
  for (const locale of ["es", "en"] as const) {
    const options = personalFinanceEntryContent[locale].guidedRoute.options;
    assert.deepEqual(options.map((option) => option.recommendation.actions.length), [1, 1, 1, 2]);
    const actions = recommendation(locale, 3).actions;
    const completeAction = actions[1];
    assert.ok(completeAction);
    assert.equal(actions[0].time, "≈10–15 min");
    assert.equal(completeAction.time, "≈30–45 min");
    assert.match(actions[0].href, /diagnostic|diagnostico/);
    assert.match(actions[0].href, /mode=quick$/);
    assert.match(completeAction.href, /mode=complete$/);
  }

  const allRoutes = (["es", "en"] as const).flatMap(allHrefs);
  assert.ok(allRoutes.every((href) => !/(budget|presupuesto|debt|deudas).*mode=/i.test(href)));
});

test("uses the Founder-approved recommendation copy in both languages", () => {
  assert.equal(
    recommendation("es", 1).description,
    "Compara cuánto pesa cada deuda sobre tu ingreso y cuál merece atención primero.",
  );
  assert.equal(
    recommendation("en", 1).description,
    "Compare how much each debt weighs on your income and which one needs attention first.",
  );
  assert.deepEqual(
    personalFinanceEntryContent.es.guidedRoute.options.map((option) => option.recommendation.title),
    [
      "Empieza por tu presupuesto",
      "Ordena tus deudas por impacto",
      "Construye tu fondo desde un margen real",
      "Revisa tu capacidad antes de asumir riesgo",
    ],
  );
  assert.deepEqual(
    personalFinanceEntryContent.en.guidedRoute.options.map((option) => option.recommendation.title),
    [
      "Start with your budget",
      "Prioritize your debt by impact",
      "Build your emergency fund from a realistic margin",
      "Review your capacity before taking risk",
    ],
  );

  const esDiagnostic = recommendation("es", 3);
  const enDiagnostic = recommendation("en", 3);
  assert.equal(esDiagnostic.actionLabel, "Elige la profundidad");
  assert.equal(enDiagnostic.actionLabel, "Choose the depth");
  assert.deepEqual(esDiagnostic.actions.map((action) => action.label), ["Diagnóstico rápido", "Diagnóstico completo"]);
  assert.deepEqual(enDiagnostic.actions.map((action) => action.label), ["Quick assessment", "Complete assessment"]);
  const esCompleteAction = esDiagnostic.actions[1];
  const enCompleteAction = enDiagnostic.actions[1];
  assert.ok(esCompleteAction);
  assert.ok(enCompleteAction);
  assert.equal(esDiagnostic.actions[0].cta, "Hacer diagnóstico rápido →");
  assert.equal(esCompleteAction.cta, "Hacer diagnóstico completo →");
  assert.equal(enDiagnostic.actions[0].cta, "Take quick assessment →");
  assert.equal(enCompleteAction.cta, "Take complete assessment →");
});

test("contains exactly two bridge resources and one subordinate market continuation", () => {
  const expected = {
    es: {
      titles: ["Simulador de decisiones financieras", "Protege tu dinero"],
      routes: ["/proteccion", "/protege-tu-dinero"],
      continuation: ["Conoce el mercado →", "/inversionista"],
    },
    en: {
      titles: ["Financial decision simulator", "Protect your money"],
      routes: ["/en/protection", "/en/protect-your-money"],
      continuation: ["Know the market →", "/en/investor"],
    },
  } as const;

  for (const locale of ["es", "en"] as const) {
    const bridge = personalFinanceEntryContent[locale].bridge;
    assert.equal(bridge.resources.length, 2);
    assert.deepEqual(bridge.resources.map((resource) => resource.title), expected[locale].titles);
    assert.deepEqual(bridge.resources.map((resource) => resource.href), expected[locale].routes);
    assert.equal(bridge.transition.cta, expected[locale].continuation[0]);
    assert.equal(bridge.transition.href, expected[locale].continuation[1]);
  }
});

test("all configured destinations resolve to real application route files", () => {
  for (const locale of ["es", "en"] as const) {
    for (const href of allHrefs(locale)) {
      const pathname = href.split("?")[0];
      const file = routeFiles.get(pathname);
      assert.ok(file, "No canonical route mapping for " + href);
      assert.ok(existsSync(file), "Missing application route for " + href + ": " + file);
    }
  }
});

test("supports wrapping arrow navigation plus Home and End", () => {
  assert.equal(nextPersonalFinanceOptionIndex(0, "ArrowDown", 4), 1);
  assert.equal(nextPersonalFinanceOptionIndex(3, "ArrowRight", 4), 0);
  assert.equal(nextPersonalFinanceOptionIndex(0, "ArrowUp", 4), 3);
  assert.equal(nextPersonalFinanceOptionIndex(2, "ArrowLeft", 4), 1);
  assert.equal(nextPersonalFinanceOptionIndex(2, "Home", 4), 0);
  assert.equal(nextPersonalFinanceOptionIndex(1, "End", 4), 3);
  assert.equal(nextPersonalFinanceOptionIndex(1, "Enter", 4), 1);
});

test("keeps privacy and FAQ copy complete in both languages", () => {
  assert.equal(personalFinanceEntryContent.es.hero.privacy, "Sin registro · Tus datos permanecen en tu navegador");
  assert.equal(personalFinanceEntryContent.en.hero.privacy, "No sign-up · Your data stays in your browser");
  assert.equal(personalFinanceEntryContent.es.faq.items.length, 4);
  assert.equal(personalFinanceEntryContent.en.faq.items.length, 4);
  assert.ok(personalFinanceEntryContent.es.faq.items.every((item) => item.answer.length > 0));
  assert.ok(personalFinanceEntryContent.en.faq.items.every((item) => item.answer.length > 0));
});

test("uses the final approved English hero and route intro copy", () => {
  assert.equal(personalFinanceEntryContent.en.hero.title, "Get your finances in order\nbefore investing");
  assert.equal(personalFinanceEntryContent.en.guidedRoute.introduction, "Choose the option that best matches your situation.");
  assert.equal(recommendation("en", 0).outcomes[1], "Which categories take the biggest share.");
});

test("keeps a server-led, accessible page without legacy grids or nested controls", () => {
  const pageSource = readFileSync("components/pathways/StartPathPage.tsx", "utf8");
  const routeSource = readFileSync("components/pathways/PersonalFinanceGuidedRoute.tsx", "utf8");
  const footerSource = readFileSync("components/layout/Footer.tsx", "utf8");
  const headerSource = readFileSync("components/layout/Header.tsx", "utf8");

  assert.doesNotMatch(pageSource, /^"use client";/);
  assert.match(pageSource, /<details/);
  assert.match(pageSource, /"@type": "FAQPage"/);
  assert.match(pageSource, /priority/);
  assert.match(pageSource, /personal-finance-staircase-hero\.webp/);
  assert.match(pageSource, /aria-labelledby="personal-finance-bridge-title"/);
  assert.match(pageSource, /content\.bridge\.resources\.map/);
  assert.doesNotMatch(pageSource, /hero-family-sculptural-ascent\.png|hero-abstract-architecture\.png/);
  assert.doesNotMatch(pageSource, /content\.(primaryActions|orientation|learning)/);
  assert.doesNotMatch(pageSource, /Aprender y profundizar|Learn and go deeper/);
  assert.match(routeSource, /aria-expanded=\{isActive\}/);
  assert.match(routeSource, /aria-controls=\{panelId\}/);
  assert.match(routeSource, /recommendation\.actions\.map/);
  assert.match(routeSource, /min-h-12/);
  assert.doesNotMatch(routeSource, /<Link[^>]*>\s*<button/);
  assert.match(footerSource, /isPersonalFinanceEntry/);
  assert.match(footerSource, /<MarketLabMark \/>/);
  assert.match(headerSource, /personalFinancePaths/);
});
