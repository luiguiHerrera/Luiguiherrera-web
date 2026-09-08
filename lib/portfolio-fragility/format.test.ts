import assert from "node:assert/strict";
import test from "node:test";
import { createFormatters } from "./format.ts";

test("volatility multiplier uses the decimal separator of each locale", () => {
  assert.equal(createFormatters("es").multiplier(1.35), "1,35×");
  assert.equal(createFormatters("en").multiplier(1.35), "1.35×");
});

test("multiplier keeps two decimals so the slider readout does not change width", () => {
  assert.equal(createFormatters("es").multiplier(1), "1,00×");
  assert.equal(createFormatters("en").multiplier(1), "1.00×");
  assert.equal(createFormatters("es").multiplier(0), "0,00×");
  assert.equal(createFormatters("en").multiplier(3), "3.00×");
});

test("percentages and decimals stay locale-consistent with the multiplier", () => {
  const es = createFormatters("es"); const en = createFormatters("en");
  assert.equal(es.number(1.35), "1,35");
  assert.equal(en.number(1.35), "1.35");
  assert.equal(es.pct(0.351), "35,1 %");
  assert.equal(en.pct(0.351), "35.1%");
});


test("first insight and signed contributions retain required precision and units in both languages", () => {
  for (const locale of ["en", "es"] as const) {
    const f = createFormatters(locale);
    assert.ok(f.hhi(.445).includes(locale === "en" ? "0.445" : "0,445"));
    assert.ok(f.signedPct(-.05).includes("-5"));
    assert.ok(f.signedPct(1.2).includes("+120"));
    assert.ok(f.points(-.005).includes(locale === "en" ? "-0.5" : "-0,5"));
    assert.notEqual(f.precisePct(1e-15), f.precisePct(0));
  }
});
