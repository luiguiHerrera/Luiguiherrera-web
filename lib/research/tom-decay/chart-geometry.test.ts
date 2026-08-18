import assert from "node:assert/strict";
import test from "node:test";
import {
  bandPath,
  linePath,
  linearScale,
  nearestIndex,
  niceAxisTicks,
  niceStep,
  paddedDomain,
} from "./chart-geometry.ts";

test("linearScale maps the domain onto an inverted pixel range", () => {
  const scale = linearScale([-5, 20], [300, 20]);
  assert.equal(scale(-5), 300);
  assert.equal(scale(20), 20);
  assert.equal(Math.round(scale(7.5)), 160);
});

test("linearScale returns the range midpoint for a degenerate domain", () => {
  const scale = linearScale([4, 4], [0, 100]);
  assert.equal(scale(4), 50);
});

test("niceStep rounds to a readable 1/2/5 progression", () => {
  assert.equal(niceStep(0.9), 1);
  assert.equal(niceStep(1.7), 2);
  assert.equal(niceStep(4.2), 5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(5.4), 5);
  assert.equal(niceStep(23), 20);
});

test("niceAxisTicks covers the domain and always includes zero when spanned", () => {
  const ticks = niceAxisTicks(-6, 21, 5);
  assert.ok(ticks.includes(0));
  assert.ok(ticks[0] >= -6);
  assert.ok(ticks.at(-1)! <= 21);
  assert.ok(ticks.length >= 4 && ticks.length <= 8);
});

test("paddedDomain always spans zero so the reference line stays visible", () => {
  const [min, max] = paddedDomain([2.1, 5.4, 8.2]);
  assert.ok(min <= 0);
  assert.ok(max >= 8.2);
});

test("paddedDomain survives an empty or non-finite series", () => {
  assert.deepEqual(paddedDomain([]), [0, 1]);
  assert.deepEqual(paddedDomain([Number.NaN]), [0, 1]);
});

test("linePath needs at least two points", () => {
  assert.equal(linePath([{ x: 1, y: 2 }]), "");
  assert.equal(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }]), "M0.00 0.00 L10.00 5.00");
});

test("bandPath closes the confidence ribbon back along its lower edge", () => {
  const path = bandPath([
    { x: 0, low: 10, high: 2 },
    { x: 10, low: 12, high: 4 },
  ]);
  assert.ok(path.startsWith("M0.00 2.00 L10.00 4.00"));
  assert.ok(path.endsWith("L0.00 10.00 Z"));
});

test("nearestIndex finds the closest x for pointer and keyboard lookups", () => {
  const values = [0, 25, 50, 75, 100];
  assert.equal(nearestIndex(values, 0), 0);
  assert.equal(nearestIndex(values, 60), 2);
  assert.equal(nearestIndex(values, 999), 4);
  assert.equal(nearestIndex([], 5), -1);
});
