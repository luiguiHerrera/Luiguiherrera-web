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
