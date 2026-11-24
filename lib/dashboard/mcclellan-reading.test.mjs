import assert from "node:assert/strict";
import test from "node:test";
import { READING_POLICY, SIGN_GUIDE, selectMcClellanReading, signQuadrant } from "./mcclellan-reading.mjs";

// Synthetic structures test interpretation only; production calculations are tested separately.
function history(steps, initial = 0) {
  const values = [...Array(60).fill(0), ...steps];
  let total = initial;
  const day = new Date("2025-01-02T12:00Z");
  return values.map(oscillator => {
    while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    day.setUTCDate(day.getUTCDate() + 1);
    return { date, oscillator, summation: total += oscillator };
  });
}
const read = (points, options = {}) => selectMcClellanReading(points, { cutoffDate: points.at(-1)?.date, ...options });
const rebound = () => history([-20, -20, -20, 10, 10, 10, -5, -5], 10);

test("four requested interpretations use full precision; exact zero is neutral", () => {
  for (const [oscillator, summation, expected] of [[1, 1, "++"], [-1, 1, "-+"], [1, -1, "+-"], [-1, -1, "--"], [0.001, -0.001, "+-"], [0, 1, null], [1, 0, null]]) {
    assert.equal(signQuadrant({ oscillator, summation }), expected);
  }
  assert.deepEqual(SIGN_GUIDE.map(row => row.label), ["Fortaleza acumulada mejorando", "Deterioro reciente con saldo positivo", "Recuperación inicial con saldo negativo", "Debilidad reciente y acumulada"]);
});
test("below +500 while rising is never classified as a failed rebound", () => {
  const points = history([-30, -30, -30, ...Array(12).fill(10)], 10);
  for (let end = 64; end <= points.length; end++) {
    const selected = read(points.slice(0, end));
    assert.notEqual(selected?.kind, "rebound-turn");
    assert.doesNotMatch(selected?.body ?? "", /fracaso|fallido|precio.*caer/i);
  }
});
test("rebound needs prior decline, negative trough, rise, peak, and two subsequent negative closes", () => {
  const points = rebound();
  assert.equal(read(points.slice(0, -1)), null);
  const selected = read(points);
  assert.equal(selected.kind, "rebound-turn");
  assert.equal(selected.trough.date, points[62].date);
  assert.equal(selected.peak.date, points[65].date);
  assert.equal(selected.confirmedAt, points[67].date);
  assert.equal(selected.trough.value, -50);
  assert.equal(selected.peak.value, -20);
  assert.match(selected.source.url, /learning_center\/weekly_chart\/rasi_stalled/);
});
test("no rebound diagnosis without the required previous context or sufficient rise", () => {
  for (const points of [history([-20, -20, 10, 10, 10, -5, -5], 10), history([-20, -20, -20, 10, 10, -5, -5], 10), history([-20, -20, -20, 10, 10, 10, -5, -5], 1000)]) {
    assert.notEqual(read(points)?.kind, "rebound-turn");
  }
});
test("an isolated dip followed by a higher high moves the local peak, with no look-ahead", () => {
  const points = history([-20, -20, -20, 10, 10, 10, -5, 10, 10, -5, -5], 10);
  assert.equal(read(points.slice(0, -1)), null);
  const selected = read(points);
  assert.equal(selected.kind, "rebound-turn");
  assert.equal(selected.peak.date, points.at(-3).date);
  assert.equal(selected.confirmedAt, points.at(-1).date);
});
test("confirmed rebound turn has priority over simultaneous RASI and RAMO crossings", () => {
  const points = history([-20, -20, -20, 10, 10, 45, -10, -10], 0);
  assert.equal(read(points).kind, "rebound-turn");
});
test("RASI crossing has priority over a simultaneous RAMO crossing", () => {
  const points = history([-5, -5, 15, 15], 0);
  assert.equal(read(points).kind, "summation-up");
});
test("RAMO crossings need two closes; their body reflects the RASI context", () => {
  const points = history([5, 5, -2, -2], 100);
  assert.equal(read(points.slice(0, -1)), null);
  const selected = read(points);
  assert.equal(selected.kind, "oscillator-down");
  assert.match(selected.body, /saldo acumulado sigue siendo positivo/);
});
test("one episode keeps its ID and confirmation date, then expires; no daily retrigger", () => {
  const points = rebound(), first = read(points);
  let total = points.at(-1).summation;
  for (let i = 1; i <= 4; i++) {
    const date = `2025-06-${String(2 + i).padStart(2, "0")}`;
    points.push({ date, oscillator: -1, summation: --total });
    assert.equal(read(points)?.id, first.id);
    assert.equal(read(points)?.confirmedAt, first.confirmedAt);
  }
  points.push({ date: "2025-06-09", oscillator: -1, summation: --total });
  assert.equal(read(points), null);
});
test("a rebound message stops as soon as subsequent RAMO contradicts it", () => {
  const points = rebound();
  points.push({ date: "2025-06-02", oscillator: 1, summation: points.at(-1).summation + 1 });
  assert.notEqual(read(points)?.kind, "rebound-turn");
});
test("stale, mismatched cutoff, insufficient, non-finite, duplicate or inconsistent history is suppressed", () => {
  const points = rebound();
  assert.equal(read(points, { stale: true }), null);
  assert.equal(read(points, { cutoffDate: "2026-11-23" }), null);
  assert.equal(read(points.slice(-59)), null);
  for (const change of [{ oscillator: NaN }, { summation: Infinity }, { summation: 999 }, { date: points.at(-2).date }, { date: "2025-02-30" }]) {
    const changed = points.map(point => ({ ...point }));
    Object.assign(changed.at(-1), change);
    assert.equal(read(changed), null);
  }
});
test("rules do not mutate the history and use no NYSE amplitude threshold", () => {
  const points = rebound().map(point => Object.freeze(point));
  Object.freeze(points);
  const base = read(points);
  // Scaling leaves the structural interpretation unchanged, across the +500 level.
  const scaled = points.map(point => ({ ...point, oscillator: point.oscillator * 100, summation: point.summation * 100 }));
  assert.equal(read(scaled).kind, base.kind);
  assert.equal(read(scaled).confirmedAt, base.confirmedAt);
  assert.equal(READING_POLICY.minimumHistory, 60);
});

test("a flat local high uses the last plateau date and still needs two later negative closes", () => {
  const points = history([-20, -20, -20, 10, 10, 10, 0, -5, -5], 10);
  assert.equal(read(points.slice(0, -1)), null);
  assert.equal(read(points).kind, "rebound-turn");
  assert.equal(read(points).peak.date, points.at(-3).date);
});

test("a lower trough resets an unconfirmed rebound rather than retaining its old origin", () => {
  const points = history([-20, -20, -20, 5, 5, -10, -10, -10, 10, 10, 10, -5, -5], 10);
  const selected = read(points);
  assert.equal(selected.kind, "rebound-turn");
  assert.equal(selected.trough.date, points[67].date);
  assert.equal(selected.trough.value, -70);
});
