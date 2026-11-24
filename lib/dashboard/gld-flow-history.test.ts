import assert from "node:assert/strict";
import test from "node:test";
import { buildGldFlowHistory } from "./gld-flow-history.ts";

const observation = (date: string, nav: number, sharesOutstanding: number) => ({ date, nav, sharesOutstanding, totalNetAssets: nav * sharesOutstanding });

test("an observation without a predecessor cannot produce an estimated flow", () => {
  assert.deepEqual(buildGldFlowHistory([]), []);
  assert.deepEqual(buildGldFlowHistory([observation("2026-01-01", 100, 1_000)]), []);
});

test("changes in NAV alone are not treated as creations or redemptions", () => {
  assert.deepEqual(buildGldFlowHistory([
    observation("2026-01-01", 100, 1_000),
    observation("2026-01-02", 150, 1_000),
  ]), [{ date: "2026-01-02", impliedFlowMillions: 0 }]);
});

test("estimates use the current NAV and express amounts in millions of USD", () => {
  const history = [observation("2026-01-01", 100, 1_000), observation("2026-01-02", 200, 500)];
  const unchanged = structuredClone(history);
  assert.deepEqual(buildGldFlowHistory(history), [{ date: "2026-01-02", impliedFlowMillions: -0.1 }]);
  assert.deepEqual(history, unchanged);
});
