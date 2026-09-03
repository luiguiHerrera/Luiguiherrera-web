import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { en } from "../i18n/dictionaries/en.ts";
import { es } from "../i18n/dictionaries/es.ts";
import {
  nextPersonalFinanceOptionIndex,
  personalFinanceDefaultOptionId,
  personalFinanceEntryContent,
} from "./entry-content.ts";

const expectedRoutes = {
  es: ["/presupuesto", "/deudas", "/presupuesto", "/diagnostico?mode=quick"],
  en: ["/en/budget", "/en/debt", "/en/budget", "/en/diagnostic?mode=quick"],
} as const;

test("uses the approved personal-finance navigation labels without changing the main CTA", () => {
  assert.equal(es.layout.nav.start, "Finanzas personales");
  assert.equal(en.layout.nav.start, "Personal finance");
  assert.equal(es.layout.cta, "Comenzar");
  assert.equal(en.layout.cta, "Start");
});

test("provides exactly four bilingual situations and the verified canonical routes", () => {
  for (const locale of ["es", "en"] as const) {
    const options = personalFinanceEntryContent[locale].guidedRoute.options;
    assert.equal(options.length, 4);
    assert.deepEqual(options.map((option) => option.recommendation.href), expectedRoutes[locale]);
    assert.ok(options.every((option) => option.recommendation.outcomes.length === 3));
  }
});

test("starts with the budget recommendation and keeps one stable default", () => {
  assert.equal(personalFinanceDefaultOptionId, "budget");
  assert.equal(personalFinanceEntryContent.es.guidedRoute.options[0].id, personalFinanceDefaultOptionId);
  assert.equal(personalFinanceEntryContent.en.guidedRoute.options[0].id, personalFinanceDefaultOptionId);
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
  assert.equal(
    personalFinanceEntryContent.es.hero.privacy,
    "Sin registro · Tus datos permanecen en tu navegador",
  );
  assert.equal(
    personalFinanceEntryContent.en.hero.privacy,
    "No sign-up · Your data stays in your browser",
  );
  assert.equal(personalFinanceEntryContent.es.faq.items.length, 4);
  assert.equal(personalFinanceEntryContent.en.faq.items.length, 4);
  assert.ok(personalFinanceEntryContent.es.faq.items.every((item) => item.answer.length > 0));
  assert.ok(personalFinanceEntryContent.en.faq.items.every((item) => item.answer.length > 0));
});

test("uses the final approved English hero, route intro, and budget outcome copy", () => {
  assert.equal(
    personalFinanceEntryContent.en.hero.title,
    "Get your finances in order\nbefore investing",
  );
  assert.equal(
    personalFinanceEntryContent.en.guidedRoute.introduction,
    "Choose the option that best matches your situation.",
  );
  assert.equal(
    personalFinanceEntryContent.en.guidedRoute.options[0].recommendation.outcomes[1],
    "Which categories take the biggest share.",
  );
});

test("keeps the page server-led with one client recommendation and semantic FAQ", () => {
  const pageSource = readFileSync("components/pathways/StartPathPage.tsx", "utf8");
  const routeSource = readFileSync("components/pathways/PersonalFinanceGuidedRoute.tsx", "utf8");
  const footerSource = readFileSync("components/layout/Footer.tsx", "utf8");
  const headerSource = readFileSync("components/layout/Header.tsx", "utf8");

  assert.doesNotMatch(pageSource, /^"use client";/);
  assert.match(pageSource, /<details/);
  assert.match(pageSource, /"@type": "FAQPage"/);
  assert.match(pageSource, /priority/);
  assert.match(pageSource, /personal-finance-staircase-hero\.webp/);
  assert.doesNotMatch(pageSource, /hero-family-sculptural-ascent\.png/);
  assert.doesNotMatch(pageSource, /hero-abstract-architecture\.png/);
  assert.doesNotMatch(pageSource, /content\.(primaryActions|orientation|learning)/);
  assert.match(routeSource, /aria-expanded=\{isActive\}/);
  assert.match(routeSource, /aria-controls=\{panelId\}/);
  assert.match(routeSource, /isActive \? <Recommendation option=\{option\} \/> : null/);
  assert.doesNotMatch(routeSource, /<Link[^>]*>\s*<button/);
  assert.match(footerSource, /isPersonalFinanceEntry/);
  assert.match(footerSource, /<MarketLabMark \/>/);
  assert.match(headerSource, /personalFinancePaths/);
});
