import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticQuestions, getQuestionCounts, getQuestionsForMode, getSelectedProducts } from "./questions";
import { diagnosticProgress, DiagnosticValidationError, pruneDiagnosticAnswers, updateDiagnosticAnswer, validateDiagnosticAnswers } from "./answers";
import { productComplexity } from "./evidence";
import { scoreDiagnostic } from "./scoring";
import { patchAnswers, regressionCases, solidAnswers } from "./scoring.fixtures";
import type { DiagnosticAnswers, DiagnosticMode, DiagnosticResult } from "./types";

const modes: DiagnosticMode[] = ["quick", "complete"];
const lightRank = { red: 0, yellow: 1, green: 2 };
const routeSuffixes: Record<string, string> = {
  beginner: "protect-your-money", "unstable-income": "budget", "no-surplus": "budget", "expensive-debt": "debt",
  "no-emergency-fund": "budget", "near-capital-need": "budget", "capacity-high-tolerance-low": "quantitative-analysis",
  "capacity-low-tolerance-high": "budget", "experienced-fragile": "debt", "overconfident-knowledge-gap": "protect-your-money",
  "leverage-gap": "protect-your-money", "options-gap": "protect-your-money", fomo: "protection",
  "unrealistic-expectations": "protection", "solid-experienced": "quantitative-analysis",
};

function comparable(result: DiagnosticResult) {
  const { baseLimitNote: _note, nextEducationalStep: _step, ...pai } = result.paiReadiness;
  void _note; void _step;
  return { mode: result.mode, scores: result.scores, pai, declared: result.declaredProfile, pressure: result.pressureProfile,
    declaredScore: result.declaredToleranceScore, pressureScore: result.pressureScore, relation: result.pressureRelation,
    lossScore: result.lossCapacity.score, knowledge: result.knowledge.score, experience: result.experience.score,
    flags: result.flags, products: result.selectedProducts,
    constraints: result.constraints.map(({ id, scope, severity, sources }) => ({ id, scope, severity, sources })),
    checks: result.productChecks.map(({ product, complexity, understanding, questionId }) => ({ product, complexity, understanding, questionId })),
  };
}

for (const mode of modes) {
  for (const fixture of regressionCases) test(`${mode}: regression ${fixture.id}`, () => {
    const answers = patchAnswers(mode, fixture.patch);
    assert.ok(validateDiagnosticAnswers(answers, mode).valid);
    const es = scoreDiagnostic(answers, mode, "es");
    const en = scoreDiagnostic(answers, mode, "en");
    assert.deepEqual(comparable(es), comparable(en), "language cannot change the model");
    assert.deepEqual(scoreDiagnostic(answers, mode, "es"), es, "deterministic result");
    assert.equal(en.route.href, "/en/" + routeSuffixes[fixture.id]);
    if (["expensive-debt", "no-surplus", "no-emergency-fund", "near-capital-need", "capacity-low-tolerance-high", "experienced-fragile"].includes(fixture.id)) assert.equal(es.paiReadiness.light, "red");
    if (["leverage-gap", "options-gap", "beginner", "fomo", "unrealistic-expectations", "overconfident-knowledge-gap"].includes(fixture.id)) assert.notEqual(es.paiReadiness.light, "green");
    if (fixture.id === "solid-experienced") assert.equal(es.paiReadiness.light, "green");
    if (fixture.id === "beginner") { assert.deepEqual(es.selectedProducts, []); assert.ok(es.knowledge.score < 45); assert.ok(es.experience.score < 35); }
    for (const value of Object.values(es.scores)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 100);
  });

  test(`${mode}: missing or invalid answers cannot yield an apparently valid result`, () => {
    const valid = solidAnswers(mode);
    const bad: unknown[] = [{}, null, [], { ...valid, income_stability: "invalid" }, { ...valid, income_stability: ["very_stable"] },
      { ...valid, products_known: [] }, { ...valid, products_known: ["none", "leverage"] }, { ...valid, products_known: ["leverage", "leverage"] },
      { ...valid, products_known: "leverage" }, { ...valid, products_known: ["leverage"] }, { ...valid, extra: "injected" }];
    for (const answers of bad) assert.throws(() => scoreDiagnostic(answers as DiagnosticAnswers, mode), DiagnosticValidationError);
    for (const question of getQuestionsForMode(mode, valid)) {
      const missing = { ...valid }; delete missing[question.id];
      assert.throws(() => scoreDiagnostic(missing, mode), DiagnosticValidationError, question.id);
    }
    assert.throws(() => scoreDiagnostic(valid, "invalid" as DiagnosticMode), DiagnosticValidationError);
  });

  test(`${mode}: direct tolerance has no influence on financial capacity, knowledge, experience or readiness`, () => {
    const results = ["5", "10", "20", "35", "more"].map((declared_drop) => scoreDiagnostic(patchAnswers(mode, { declared_drop }), mode));
    assert.equal(new Set(results.map((result) => result.declaredToleranceScore)).size, 5);
    assert.notEqual(results[0].declaredProfile, results[3].declaredProfile);
    for (const result of results) {
      assert.equal(result.lossCapacity.score, results[0].lossCapacity.score);
      assert.equal(result.scores.financialCapacity, results[0].scores.financialCapacity);
      assert.equal(result.pressureScore, results[0].pressureScore);
      assert.equal(result.knowledge.score, results[0].knowledge.score);
      assert.equal(result.experience.score, results[0].experience.score);
      assert.equal(result.paiReadiness.invertirScore, results[0].paiReadiness.invertirScore);
      assert.equal(result.paiReadiness.light, results[0].paiReadiness.light);
    }
  });

  test(`${mode}: all three pressure directions are explained correctly`, () => {
    const relations = new Set<string>();
    for (const declared_drop of ["5", "10", "20", "35", "more"]) for (const pressure_drop of ["review", "sell_part", "sell_all", "buy_more", "written_rule"]) for (const fomo_behavior of ["wait", "confirm"]) for (const slow_underperformance of ["process", "compare"]) {
      const r = scoreDiagnostic(patchAnswers(mode, { declared_drop, pressure_drop, fomo_behavior, slow_underperformance }), mode);
      relations.add(r.pressureRelation);
      if (r.pressureRelation === "higher") { assert.match(r.pressureSummary, /superior/); assert.doesNotMatch(r.pressureSummary, /inferior/); }
      if (r.pressureRelation === "lower") { assert.match(r.pressureSummary, /inferior/); assert.doesNotMatch(r.pressureSummary, /superior/); }
      if (r.pressureRelation === "equal") assert.match(r.pressureSummary, /coincide/);
    }
    assert.deepEqual([...relations].sort(), ["equal", "higher", "lower"]);
  });

  test(`${mode}: financial deterioration never improves numerical readiness or the readiness signal`, () => {
    const axes: DiagnosticAnswers = {
      income_stability: ["very_stable", "stable", "variable_manageable", "very_variable", "uncertain"],
      surplus_cash_flow: ["consistent", "most_months", "sometimes", "rarely", "tight_or_deficit"],
      expensive_debt: ["none", "small_controlled", "relevant_manageable", "pressures_me", "pending_priority"],
      emergency_months: ["gt12", "6_12", "3_6", "lt3", "none"],
      cash_need_12m: ["very_low", "low", "possible", "likely", "certain"],
      loss_life_effect: ["none", "annoying", "adjust", "uncomfortable", "serious"],
      savings_share: ["lt10", "10_25", "25_50", "gt50", "almost_all"],
    };
    const contexts: DiagnosticAnswers[] = [{}, { declared_drop: "5" }, { fomo_behavior: "confirm" }, { stock_basic: "unsure" },
      { products_known: ["leverage"], leverage_check: "margin_call" }, { expensive_debt: "pending_priority", emergency_months: "none" }];
    for (const context of contexts) for (const [question, values] of Object.entries(axes)) {
      let previous: DiagnosticResult | undefined;
      for (const value of values) {
        const r = scoreDiagnostic(patchAnswers(mode, { ...context, [question]: value }), mode);
        if (previous) {
          assert.ok(r.paiReadiness.invertirScore <= previous.paiReadiness.invertirScore, question + " readiness");
          assert.ok(lightRank[r.paiReadiness.light] <= lightRank[previous.paiReadiness.light], question + " signal");
          assert.ok(r.lossCapacity.score <= previous.lossCapacity.score, question + " loss capacity");
        }
        previous = r;
      }
    }
  });

  test(`${mode}: correct simple-product answers cannot compensate a critical product gap`, () => {
    const gaps = [{ product: "leverage", question: "leverage_check", wrong: "interest_only" }, { product: "options", question: "options_check", wrong: "guaranteed" },
      { product: "shortSelling", question: "short_check", wrong: "zero" }, { product: "crypto", question: "crypto_check", wrong: "cash" }];
    for (const gap of gaps) for (const extras of [[], ["cash", "bonds", "indexFunds", "individualStocks"], Object.keys(productComplexity).filter((id) => id !== gap.product)]) {
      const answers = patchAnswers(mode, { products_known: [gap.product, ...extras], [gap.question]: gap.wrong });
      const r = scoreDiagnostic(answers, mode);
      assert.ok(r.flags.includes("product_mismatch"));
      assert.equal(r.productChecks.find((item) => item.product === gap.product)?.understanding, "gap");
      assert.ok(r.constraints.some((item) => item.id === "product_" + gap.product));
      assert.notEqual(r.paiReadiness.light, "green");
      assert.equal(r.route.href, "/protege-tu-dinero");
    }
  });

  test(`${mode}: beginner option is exclusive, activates no products and carries no score penalty`, () => {
    const question = diagnosticQuestions.find((item) => item.id === "products_known")!;
    let a = patchAnswers(mode, { products_known: ["leverage"], leverage_check: "interest_only" });
    a = updateDiagnosticAnswer(a, question, "none", mode);
    assert.deepEqual(a.products_known, ["none"]); assert.equal(a.leverage_check, undefined);
    assert.deepEqual(getSelectedProducts(a), []);
    assert.equal(getQuestionsForMode(mode, a).length, getQuestionCounts(mode).base);
    const none = scoreDiagnostic(a, mode);
    const simple = scoreDiagnostic({ ...a, products_known: ["indexFunds"] }, mode);
    assert.equal(none.paiReadiness.invertirScore, simple.paiReadiness.invertirScore);
    a = updateDiagnosticAnswer(a, question, "leverage", mode);
    assert.deepEqual(a.products_known, ["leverage"]);
    assert.ok(!validateDiagnosticAnswers(a, mode).valid);
  });

  test(`${mode}: inactive answers are discarded; new adaptive questions reduce progress until answered`, () => {
    const simple = solidAnswers(mode);
    assert.equal(diagnosticProgress(simple, mode).percent, 100);
    const expanded = { ...simple, products_known: ["leverage"] };
    assert.ok(diagnosticProgress(expanded, mode).percent < 100);
    const completed = patchAnswers(mode, { products_known: ["leverage"], leverage_check: "interest_only" });
    const stale = { ...completed, products_known: ["indexFunds"] };
    assert.deepEqual(scoreDiagnostic(stale, mode), scoreDiagnostic(pruneDiagnosticAnswers(stale, mode), mode));
    assert.equal(pruneDiagnosticAnswers(stale, mode).leverage_check, undefined);
    assert.equal(diagnosticProgress(stale, mode).percent, 100);
  });

  test(`${mode}: direct capital constraints do not redefine stated tolerance or hypothetical responses`, () => {
    const base = scoreDiagnostic(solidAnswers(mode), mode);
    const r = scoreDiagnostic(patchAnswers(mode, { cash_need_12m: "certain", loss_life_effect: "serious" }), mode);
    assert.equal(base.declaredProfile, r.declaredProfile);
    assert.equal(base.pressureProfile, r.pressureProfile);
    assert.equal(r.paiReadiness.light, "red");
    assert.ok(r.constraints.some((item) => item.scope === "capital" && item.severity === "priority"));
    assert.ok(!r.constraints.some((item) => item.scope === "general"));
  });
}

test("question counts are derived from active definitions, not presentation strings", () => {
  for (const mode of modes) {
    const counts = getQuestionCounts(mode);
    assert.equal(counts.base, diagnosticQuestions.filter((question) => question.mode.includes(mode) && !question.adaptiveFor).length);
    assert.equal(counts.maximum, getQuestionsForMode(mode, { products_known: Object.keys(productComplexity) }).length);
  }
});

test("seeded combinations preserve finite values, deterministic bilingual results and non-compensatory restrictions", () => {
  let seed = 20261127;
  const next = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (const mode of modes) for (let i = 0; i < 192; i++) {
    const answers: DiagnosticAnswers = { products_known: i % 3 === 0 ? ["none"] : i % 3 === 1 ? ["leverage"] : Object.keys(productComplexity) };
    for (const question of getQuestionsForMode(mode, answers)) if (question.id !== "products_known") answers[question.id] = question.options[next(question.options.length)].id;
    const a = scoreDiagnostic(answers, mode, "es"), b = scoreDiagnostic(answers, mode, "en");
    assert.deepEqual(comparable(a), comparable(b));
    assert.deepEqual(scoreDiagnostic(answers, mode, "es"), a);
    for (const value of Object.values(a.scores)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 100);
    if (a.constraints.length) assert.notEqual(a.paiReadiness.light, "green");
    if (a.constraints.some((item) => item.severity === "priority")) assert.equal(a.paiReadiness.light, "red");
    if (a.paiReadiness.mainWeakness === "expensive_debt") assert.equal(a.route.href, "/deudas");
    if (a.route.href === "/analisiscuantitativo") assert.equal(a.paiReadiness.light, "green");
  }
});
