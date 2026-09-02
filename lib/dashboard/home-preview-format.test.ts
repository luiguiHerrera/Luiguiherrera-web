import assert from "node:assert/strict";
import test from "node:test";

import {
  formatHomeCurvePointTitle,
  formatHomePreviewNumber,
} from "./home-preview-format.ts";

test("formats Home curve titles as one deterministic locale-specific string", () => {
  assert.equal(formatHomeCurvePointTitle("VX1", 17.25, "es"), "VX1: 17,25");
  assert.equal(formatHomeCurvePointTitle("VX1", 17.25, "en"), "VX1: 17.25");
});

test("keeps Home preview unavailable values explicit by locale", () => {
  assert.equal(formatHomePreviewNumber(null, "es"), "n/d");
  assert.equal(formatHomePreviewNumber(undefined, "en"), "n/a");
});
