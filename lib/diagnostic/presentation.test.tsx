import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { DiagnosticFlow } from "../../components/diagnostic/DiagnosticFlow";
import { DiagnosticPrintableReport } from "../../components/diagnostic/DiagnosticPrintableReport";
import { DiagnosticReportActions } from "../../components/diagnostic/DiagnosticReportActions";
import EsPage from "../../app/(es)/diagnostico/page";
import EnPage from "../../app/en/diagnostic/page";
import { scoreDiagnostic } from "./scoring";
import { getQuestionCounts } from "./questions";
import { patchAnswers } from "./scoring.fixtures";
import { diagnosticSummaryText } from "./summary";

for (const locale of ["es", "en"] as const) {
  test(`${locale}: start screen announces the actual base and maximum question counts`, () => {
    const html = renderToStaticMarkup(<DiagnosticFlow locale={locale} />);
    for (const mode of ["quick", "complete"] as const) {
      const counts = getQuestionCounts(mode);
      assert.ok(html.includes(counts.base + " base · " + (locale === "es" ? "hasta " : "up to ") + counts.maximum));
    }
    assert.doesNotMatch(html, /29 (preguntas|base)|45-55 base/);
    assert.doesNotMatch(html, /7-10|15-20/);
    assert.match(html, locale === "es" ? /Responde a tu ritmo/ : /Answer at your own pace/);
    assert.match(html, locale === "es" ? /No determina ni certifica tu perfil inversor/ : /does not determine or certify your investor profile/);
    assert.match(html, locale === "es" ? /entidad legalmente autorizada/ : /firm legally authorized/);
  });

  for (const initialMode of ["quick", "complete"] as const) test(`${locale}/${initialMode}: direct entry has no result and cannot continue unanswered`, () => {
    const html = renderToStaticMarkup(<DiagnosticFlow locale={locale} initialMode={initialMode} />);
    assert.match(html, /data-diagnostic-question="capital_reference"/);
    assert.doesNotMatch(html, /data-diagnostic-result=/);
    assert.match(html, /<button[^>]*disabled=""/);
  });

  test(`${locale}: printed summary retains every restriction, product gap and localized route`, () => {
    const result = scoreDiagnostic(patchAnswers("complete", { products_known: ["options", "leverage"], options_check: "guaranteed", leverage_check: "interest_only", expensive_debt: "pending_priority" }), "complete", locale);
    const html = renderToStaticMarkup(<DiagnosticPrintableReport locale={locale} result={result} generatedAt={new Date("2026-11-27T12:00:00Z")} />);
    assert.ok(html.includes(result.declaredLoss));
    assert.ok(html.includes(result.pressureSummary));
    assert.ok(html.includes(result.methodologyNote));
    assert.ok(html.includes(result.route.href));
    for (const item of result.constraints) assert.ok(html.includes(item.note));
    for (const item of result.productChecks) assert.ok(html.includes(item.note));
    assert.doesNotMatch(html, /pesa más|matters more|Perfil orientativo|Orientative profile/);
  });

  test(`${locale}: the summary action explicitly opens printing rather than claiming an automatic download`, () => {
    const result = scoreDiagnostic(patchAnswers("quick", {}), "quick", locale);
    const html = renderToStaticMarkup(<DiagnosticReportActions locale={locale} result={result} />);
    assert.match(html, locale === "es" ? /Imprimir \/ guardar PDF/ : /Print \/ save PDF/);
    assert.match(html, locale === "es" ? /Descargar resumen \(\.txt\)/ : /Download summary \(\.txt\)/);
    assert.doesNotMatch(html, /Descargar resumen educativo como PDF|Download educational summary as PDF/);
  });
}

test("print action invokes the browser print dialog locally", () => {
  let calls = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { print: () => { calls++; } } });
  try {
    const tree = DiagnosticReportActions({ locale: "es", result: scoreDiagnostic(patchAnswers("quick", {}), "quick") });
    const children = tree.props.children as React.ReactElement<{ onClick?: () => void }>[];
    const button = children.find((child) => child.type === "button")!;
    button.props.onClick!();
    assert.equal(calls, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("both pages retain the four reading dimensions in server HTML inside a closed accessible disclosure", async () => {
  for (const [Page, labels] of [[EsPage, ["Qué es", "Para qué sirve", "Límites", "Siguiente paso"]], [EnPage, ["What it is", "What it is for", "Limits", "Next step"]]] as const) {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
    const disclosure = html.match(/<details[^>]*data-diagnostic-guide=""[^>]*>[\s\S]*?<\/details>/)?.[0];
    assert.ok(disclosure, "guide content must be present without JavaScript");
    assert.doesNotMatch(disclosure.match(/^<details[^>]*>/)![0], /\sopen(?:[\s=>])/);
    assert.match(disclosure, /<summary/);
    for (const label of labels) assert.ok(disclosure.includes(label));
    assert.equal((disclosure.match(/<dd\b/g) ?? []).length, 4);
  }
});

test("URL modes are allowlisted in both languages; restart tokens cannot fabricate answers", async () => {
  for (const Page of [EsPage, EnPage]) for (const mode of [undefined, "invalid", ["quick", "complete"]]) {
    const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ mode, restart: "arbitrary" }) }));
    assert.doesNotMatch(html, /data-diagnostic-result=/);
    assert.doesNotMatch(html, /data-diagnostic-question=/);
  }
});

test("diagnostic sources contain no response transmission or persistent storage APIs", () => {
  const files = ["components/diagnostic/DiagnosticFlow.tsx", "components/diagnostic/DiagnosticPrintableReport.tsx", "components/diagnostic/DiagnosticReportActions.tsx", "lib/diagnostic/scoring.ts", "lib/diagnostic/answers.ts", "lib/diagnostic/evidence.ts", "lib/diagnostic/summary.ts"];
  for (const path of files) assert.doesNotMatch(readFileSync(path, "utf8"), /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test("plain-text export preserves every critical limitation and route in both languages", () => {
  for (const locale of ["es", "en"] as const) {
    const result = scoreDiagnostic(patchAnswers("complete", { products_known: ["options", "leverage"], options_check: "guaranteed", leverage_check: "interest_only", cash_need_12m: "certain" }), "complete", locale);
    const text = diagnosticSummaryText(result, locale);
    assert.ok(text.includes(result.methodologyNote));
    assert.ok(text.includes(result.declaredLoss));
    assert.ok(text.includes(result.pressureSummary));
    assert.ok(text.includes(result.route.href));
    for (const item of result.constraints) assert.ok(text.includes(item.note));
    for (const item of result.productChecks) assert.ok(text.includes(item.note));
  }
});
