import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBtcRecentSessionRows,
  btcFlowCoverageCopy,
  btcFlowStatusLabel,
  capitalFlowTone,
  flowDirectionLabel,
  formatCapitalFlowDate,
  formatCapitalFlowUsdMillions,
} from "./capital-flows-presentation.ts";

test("recent BTC sessions keep source values and show newest rows first", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    totalNetFlow: index - 5,
  }));

  const rows = buildBtcRecentSessionRows(history);

  assert.equal(rows.length, 10);
  assert.deepEqual(rows[0], { date: "2026-08-12", totalNetFlow: 6, direction: "inflow" });
  assert.deepEqual(rows.at(-1), { date: "2026-08-03", totalNetFlow: -3, direction: "outflow" });
  assert.deepEqual(buildBtcRecentSessionRows(history, 0), []);
});

test("capital-flow tones distinguish inflow, outflow, flat and unavailable values", () => {
  assert.equal(capitalFlowTone(1), "positive");
  assert.equal(capitalFlowTone(-1), "negative");
  assert.equal(capitalFlowTone(0), "neutral");
  assert.equal(capitalFlowTone(null), "unavailable");
});

test("BTC flow display precision scales consistently without changing units", () => {
  assert.equal(formatCapitalFlowUsdMillions(944.2, "en"), "+944 M USD");
  assert.equal(formatCapitalFlowUsdMillions(142.8, "en"), "+143 M USD");
  assert.equal(formatCapitalFlowUsdMillions(-944.8, "en"), "-945 M USD");
  assert.equal(formatCapitalFlowUsdMillions(42.67, "en"), "+42.7 M USD");
  assert.equal(formatCapitalFlowUsdMillions(10, "en"), "+10 M USD");
  assert.equal(formatCapitalFlowUsdMillions(-1.14, "en"), "-1.1 M USD");
  assert.equal(formatCapitalFlowUsdMillions(0, "en"), "0 M USD");
  assert.equal(formatCapitalFlowUsdMillions(-0.04, "en"), "0 M USD");
});

test("BTC primary metric, chart tooltip and recent-session table share the canonical formatter", () => {
  const moduleSource = readFileSync(
    new URL("../../components/dashboard/BtcEtfFlowsModule.tsx", import.meta.url),
    "utf8",
  );

  assert.match(moduleSource, /value: formatCapitalFlowUsdMillions\(flows\.latestTotalNetFlow, locale\)/);
  assert.match(moduleSource, /formatCapitalFlowUsdMillions\(active\.point\.totalNetFlow, locale\)/);
  assert.match(moduleSource, /formatCapitalFlowUsdMillions\(row\.totalNetFlow, locale\)/);
});

test("BTC flow precision is identical across ES and EN while separators stay localized", () => {
  assert.equal(formatCapitalFlowUsdMillions(42.67, "es"), "+42,7 M USD");
  assert.equal(formatCapitalFlowUsdMillions(42.67, "en"), "+42.7 M USD");
  assert.equal(formatCapitalFlowUsdMillions(944.2, "es"), "+944 M USD");
  assert.equal(formatCapitalFlowUsdMillions(944.2, "en"), "+944 M USD");
});

test("BTC flow unavailable copy remains contextual", () => {
  assert.equal(formatCapitalFlowUsdMillions(null, "es"), "Dato pendiente");
  assert.equal(formatCapitalFlowUsdMillions(null, "en"), "Pending data");
  assert.equal(formatCapitalFlowUsdMillions(null, "es", "insufficient"), "Historial insuficiente");
  assert.equal(formatCapitalFlowUsdMillions(null, "en", "insufficient"), "Not enough history");
});

test("direction and date labels are localized without changing underlying values", () => {
  assert.equal(flowDirectionLabel(12, "es"), "Entrada");
  assert.equal(flowDirectionLabel(-12, "en"), "Outflow");
  assert.equal(flowDirectionLabel(0, "es"), "Sin cambio");
  assert.match(formatCapitalFlowDate("2026-08-28", "es"), /28 ago 2026/i);
  assert.equal(formatCapitalFlowDate("2026-08-28", "en"), "Aug 28, 2026");
  assert.match(formatCapitalFlowDate("Aug 27, 2026", "es"), /27 ago 2026/i);
  assert.equal(formatCapitalFlowDate("Aug 27, 2026", "en"), "Aug 27, 2026");
  assert.equal(formatCapitalFlowDate("demo-1", "en"), "demo-1");
  assert.equal(formatCapitalFlowDate(null, "es"), "Pendiente");
});

test("BTC headline freshness remains independent from row count and source role", () => {
  assert.equal(btcFlowStatusLabel("automated", "primary", "es"), "Datos automatizados");
  assert.equal(btcFlowStatusLabel("automated", "fallback", "en"), "Automated data · alternate source");
  assert.equal(btcFlowStatusLabel("delayed", "primary", "es"), "Datos retrasados");
  assert.equal(btcFlowStatusLabel("delayed", "fallback", "en"), "Delayed data · alternate source");
  assert.equal(btcFlowStatusLabel("unavailable", "unavailable", "es"), "Datos no disponibles");
});

test("BTC coverage describes sufficiency without changing freshness", () => {
  assert.deepEqual(btcFlowCoverageCopy("partial", 10, "es"), {
    label: "Cobertura parcial",
    detail: "10 sesiones disponibles · Rolling 20D no disponible",
  });
  assert.deepEqual(btcFlowCoverageCopy("complete", 20, "en"), {
    label: "Complete coverage",
    detail: "20 available sessions · Rolling 20D available",
  });
});
