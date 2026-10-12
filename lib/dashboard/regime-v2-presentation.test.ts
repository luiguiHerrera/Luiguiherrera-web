import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { C03, DECISION_TABLE, TICKERS } from "../regime-engine-v2/contract.ts";
import type { RegimeOutput } from "../regime-engine-v2/engine.ts";
import { buildRegimeV2View, regimeV2ReasonLabel, type RegimeV2Locale } from "./regime-v2-presentation.ts";

const fixtureDirectory = new URL("../../docs/regime-engine-v2/designer/fixtures/", import.meta.url);
const fixtures = readdirSync(fixtureDirectory).filter(name => name.endsWith(".json")).map(name => JSON.parse(readFileSync(new URL(name, fixtureDirectory), "utf8")) as { id: string; output: RegimeOutput });
const fixture = (id: string) => fixtures.find(item => item.id === id)!.output;

for (const locale of ["es", "en"] as const) {
  test(`${locale}: every evaluated fixture keeps its exact economic or technical state without mutating output`, () => {
    for (const { output } of fixtures) {
      const before = JSON.stringify(output);
      const view = buildRegimeV2View(output, locale);
      assert.deepEqual(buildRegimeV2View(output, locale), view);
      assert.equal(JSON.stringify(output), before);
      assert.equal(view.state, output.systemState === "INCOMPLETE" ? "INCOMPLETE" : output.regime);
      assert.equal(view.ruleId, output.diagnostics.ruleId);
      assert.equal(view.concordance.code, output.concordance);
      assert.equal(view.uncertainty.code, output.uncertainty);
      assert.equal(view.dataQuality.code, output.dataQuality);
      assert.equal(view.asOf, output.asOf);
      assert.equal(view.observationDate, output.observationDate);
      assert.equal(view.methodology.engineVersion, output.engineVersion);
      assert.equal(view.methodology.parameterSet, "C03");
    }
  });
  test(`${locale}: selected claims have a real pillar, measurement and source path`, () => {
    for (const { output } of fixtures.filter(item => item.output.systemState === "COMPLETE")) {
      const view = buildRegimeV2View(output, locale);
      for (const item of [...view.supports, ...view.brakes, ...view.watch]) {
        assert.ok(item.pillarIds.length > 0);
        assert.ok(item.featureIds.length > 0);
        assert.equal(item.evidenceHref, `#v2-measurement-${item.featureIds[0]}`);
        assert.equal(item.ruleId, output.diagnostics.ruleId);
        assert.ok(item.sourceKeys.length > 0);
        for (const id of item.featureIds) {
          const evidence = output.evidence.find(feature => feature.featureId === id)!;
          const row = view.measurements.find(measurement => measurement.featureId === id)!;
          assert.equal(evidence.status, "AVAILABLE");
          assert.equal(row.status, evidence.status);
          assert.deepEqual(row.rawValue, evidence.value);
          assert.equal(row.asOf, output.asOf);
          assert.ok(row.sources.length > 0);
        }
      }
      assert.ok(view.supports.length <= 3 && view.brakes.length <= 3 && view.watch.length <= 2);
      assert.equal(new Set([...view.supports, ...view.brakes].map(item => item.id)).size, view.supports.length + view.brakes.length);
    }
  });
  test(`${locale}: quick reading has no fabricated score, percentages of confidence or portfolio instructions`, () => {
    for (const { output } of fixtures) {
      const view = buildRegimeV2View(output, locale);
      const quick = [view.title, view.interpretation, view.concordance.value, ...view.supports.map(item => item.text), ...view.brakes.map(item => item.text), ...view.watch.map(item => item.text)].join(" ");
      assert.doesNotMatch(quick, /\b(score|confianza|confidence|probabilidad|probability|bullishness|compra|vende|reduce|aprovecha|buy|sell|cautela|danger|emergency)\b/i);
      assert.doesNotMatch(quick, /\d\s*%|\d\s*\/\s*100/);
      assert.equal("score" in view, false);
      assert.equal("confidence" in view, false);
      assert.doesNotMatch(view.methodology.paragraphs.join(" "), /\bH1\b|challenger/i);
    }
  });
  test(`${locale}: unavailable calendars and stale sources are technical, even alongside a genuine shock`, () => {
    for (const id of ["incomplete-missing-core", "incomplete-unknown-calendar", "incomplete-stale", "incomplete-with-shock"]) {
      const output = fixture(id), view = buildRegimeV2View(output, locale);
      assert.equal(view.technical, true);
      assert.equal(view.state, "INCOMPLETE");
      assert.equal(view.title, locale === "es" ? "LECTURA INCOMPLETA" : "INCOMPLETE READING");
      assert.equal(view.supports.length, 0);
      assert.equal(view.brakes.length, 0);
      assert.equal(view.dataQuality.prominent, true);
      assert.equal(view.dataQuality.code, "INSUFFICIENT");
      assert.doesNotMatch(view.interpretation, /STRESS|TRANSICI[ÓO]N|RISK.ON|DEFENSIV|probabl/i);
      assert.ok(view.watch.length > 0);
      assert.ok(view.missingReasons.length > 0);
    }
  });
  test(`${locale}: source dates, unavailable publication times, versions and vintage hashes remain exact`, () => {
    for (const { output } of fixtures) {
      for (const source of buildRegimeV2View(output, locale).sources) {
        const original = output.sourceStatus[source.key];
        for (const field of ["observationDate", "sourcePublishedAt", "availableAt", "capturedAt", "sourceVersion", "sourceId", "vintageHash", "replayClass", "availabilityCertainty"] as const) assert.equal(source[field], original[field]);
      }
    }
  });
  test(`${locale}: complete quality stays quiet and partial quality explains optional evidence`, () => {
    const broad = buildRegimeV2View(fixture("broad-complete"), locale);
    assert.equal(broad.dataQuality.code, "COMPLETE");
    assert.equal(broad.dataQuality.prominent, false);
    const selective = buildRegimeV2View(fixture("selective-partial"), locale);
    assert.equal(selective.dataQuality.code, "PARTIAL");
    assert.equal(selective.dataQuality.prominent, true);
    assert.ok(selective.optionalProblems.length > 0);
    assert.equal(selective.state, "RISK_ON_SELECTIVE");
  });
  test(`${locale}: empty brakes and a single support are not padded for symmetry`, () => {
    assert.equal(buildRegimeV2View(fixture("broad-complete"), locale).brakes.length, 0);
    const sparse = buildRegimeV2View(fixture("transition-fragility"), locale);
    assert.equal(sparse.supports.length, 1);
    assert.equal(sparse.supports[0].id, "volatility");
    assert.ok(sparse.brakes.length > 1);
  });
  test(`${locale}: high concordance does not imply a constructive market`, () => {
    const defensive = buildRegimeV2View(fixture("defensive-complete"), locale);
    assert.equal(defensive.concordance.code, "HIGH");
    assert.equal(defensive.state, "DEFENSIVE");
    assert.ok(defensive.brakes.length > 0);
    assert.doesNotMatch(defensive.concordance.description, /\d/);
  });
  test(`${locale}: satellites remain separate, zero vote context including missing satellites`, () => {
    for (const { output } of fixtures) {
      const view = buildRegimeV2View(output, locale);
      assert.equal(view.satellites.votes, 0);
      assert.equal(view.satellites.role, "CONTEXTUAL_ONLY");
      for (const claim of [...view.supports, ...view.brakes, ...view.watch]) assert.equal(claim.sourceKeys.some(key => key === "BTC" || key === "GLD"), false);
      assert.equal(view.pillars.length, 3);
    }
    const missing = buildRegimeV2View(fixture("selective-partial"), locale);
    assert.equal(missing.measurements.find(row => row.featureId === "btc_daily")?.rawValue, null);
    assert.equal(missing.measurements.find(row => row.featureId === "btc_daily")?.status, "UNAVAILABLE");
  });
}

test("Spanish labels are the exact frozen five regimes and the separate technical status", () => {
  const visible = new Set(fixtures.map(item => buildRegimeV2View(item.output, "es").title));
  assert.deepEqual(visible, new Set([...Object.values(DECISION_TABLE.labels_es), "LECTURA INCOMPLETA"]));
});
test("absolute and joint STRESS triggers retain their different actual evidence", () => {
  const level = fixture("stress-absolute"), joint = fixture("stress-joint");
  assert.ok(level.diagnostics.coreFeatures.vix! >= C03.v_stress);
  assert.ok(joint.diagnostics.coreFeatures.vix! < C03.v_stress);
  const levelCopy = buildRegimeV2View(level, "es").brakes[0];
  const jointCopy = buildRegimeV2View(joint, "es").brakes[0];
  assert.match(levelCopy.text, /nivel del VIX/);
  assert.match(jointCopy.text, /salto rápido e inversión/);
  assert.equal(jointCopy.sourceKeys.includes("VX"), true);
});
test("participation attribution includes all eleven sector parents, not broad-index proxies", () => {
  const view = buildRegimeV2View(fixture("broad-complete"), "es");
  assert.deepEqual(view.supports.find(item => item.id === "participation")?.sourceKeys, TICKERS);
  assert.equal(view.supports.some(item => item.sourceKeys.includes("SPY")), false);
});
test("R2 remains reconstruction and the preview does not claim live completeness or point-in-time OOS", () => {
  for (const locale of ["es", "en"] as RegimeV2Locale[]) {
    const view = buildRegimeV2View(fixture("broad-complete"), locale);
    assert.equal(view.methodology.replayClass, "R2");
    assert.match(view.methodology.paragraphs.join(" "), /R2/);
    assert.match(view.labels.fixture, /FIXTURE/);
    assert.match(view.labels.fixtureNote, locale === "es" ? /No es una lectura del mercado actual/ : /not a current market reading/);
  }
});
test("unknown reason codes use honest human fallback instead of inventing a market interpretation", () => {
  for (const locale of ["es", "en"] as const) {
    const label = regimeV2ReasonLabel("UNSEEN_PROVIDER_INTERNAL_STACK_TRACE", locale);
    assert.doesNotMatch(label, /UNSEEN|STACK|STRESS|TRANSITION|defensiv/i);
    assert.ok(label.length > 20);
  }
});
test("transition watch does not imply already aligned participation and leadership are unaligned", () => {
  const output = fixture("transition-watch");
  assert.equal(output.pillarStates.participation, "FAVORABLE");
  assert.equal(output.pillarStates.leadership, "FAVORABLE");
  assert.equal(output.pillarStates.volatility, "WATCH");
  const es = buildRegimeV2View(output, "es").watch.map(item => item.text).join(" ");
  const en = buildRegimeV2View(output, "en").watch.map(item => item.text).join(" ");
  assert.doesNotMatch(es, /pasan a confirmar|empiezan a confirmar|aún no confirman/);
  assert.doesNotMatch(en, /come to confirm|start to confirm|do not yet confirm/);
});
test("STRESS headings distinguish favorable context from its adverse trigger in both languages", () => {
  for (const id of ["stress-absolute", "stress-joint"]) {
    const output = fixture(id);
    const es = buildRegimeV2View(output, "es"), en = buildRegimeV2View(output, "en");
    assert.equal(es.labels.supports, "Evidencia favorable");
    assert.equal(es.labels.brakes, "Evidencia adversa");
    assert.equal(en.labels.supports, "Favorable evidence");
    assert.equal(en.labels.brakes, "Adverse evidence");
    assert.equal(es.brakes[0].id, "volatility");
    assert.equal(en.brakes[0].id, "volatility");
    assert.equal(es.state, "STRESS");
    assert.equal(es.ruleId, "R01");
  }
  assert.equal(buildRegimeV2View(fixture("broad-complete"), "es").labels.supports, "Qué impulsa");
  assert.equal(buildRegimeV2View(fixture("broad-complete"), "en").labels.supports, "What supports it");
});
