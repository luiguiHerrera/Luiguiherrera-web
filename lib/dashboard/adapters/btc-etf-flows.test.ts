import assert from "node:assert/strict";
import test from "node:test";
import { getBtcEtfFlowsData } from "./btc-etf-flows.ts";

const NOW = Date.parse("2026-08-31T12:00:00Z");

function sourceTable(latestDate: string, rowCount: number) {
  const latestTimestamp = Date.parse(`${latestDate} UTC`);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const date = new Date(latestTimestamp - index * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    const total = index === 0 ? -1 : index % 2 === 0 ? 30 : -20;
    return `<tr><td>${date}</td><td>${total + 5}</td><td>-5</td><td>0</td><td>${total}</td></tr>`;
  }).join("");

  return `<table><thead><tr><th>Date</th><th>IBIT</th><th>FBTC</th><th>GBTC</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function mockFetch(handler: (url: string) => Response): typeof fetch {
  return (async (input: RequestInfo | URL) => handler(String(input))) as typeof fetch;
}

test("fresh Bitbo data is primary and complete when at least 20 sessions exist", async () => {
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch(() => new Response(sourceTable("Aug 28, 2026", 20), { status: 200 })),
  });

  assert.equal(result.flows.dataStatus, "automated");
  assert.equal(result.flows.sourceRole, "primary");
  assert.equal(result.flows.coverage, "complete");
  assert.equal(result.flows.rowsParsed, 20);
  assert.notEqual(result.flows.rolling20dNetFlow, null);
});

test("fresh ten-session Bitbo data is automated with partial coverage", async () => {
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch(() => new Response(sourceTable("Aug 28, 2026", 10), { status: 200 })),
  });

  assert.equal(result.flows.dataStatus, "automated");
  assert.equal(result.flows.sourceRole, "primary");
  assert.equal(result.flows.coverage, "partial");
  assert.equal(result.flows.rowsParsed, 10);
  assert.equal(result.flows.rolling20dNetFlow, null);
});

test("rows do not override the governed delayed threshold", async () => {
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch(() => new Response(sourceTable("Aug 20, 2026", 10), { status: 200 })),
  });

  assert.equal(result.flows.rowsParsed, 10);
  assert.equal(result.flows.dataStatus, "delayed");
  assert.equal(result.flows.sourceRole, "primary");
  assert.equal(result.flows.coverage, "partial");
});

test("Farside is identified as the real fallback after Bitbo fails", async () => {
  const requested: string[] = [];
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch((url) => {
      requested.push(url);
      return url.includes("bitbo.io")
        ? new Response("upstream error", { status: 503 })
        : new Response(sourceTable("Aug 28, 2026", 20), { status: 200 });
    }),
  });

  assert.ok(requested[0].includes("bitbo.io"));
  assert.ok(requested.some((url) => url.includes("farside.co.uk")));
  assert.equal(result.flows.dataStatus, "automated");
  assert.equal(result.flows.sourceRole, "fallback");
  assert.equal(result.flows.coverage, "complete");
  assert.equal(result.flows.sourceName, "Farside Investors");
});

test("fallback role remains independent from delayed freshness and partial coverage", async () => {
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch((url) => url.includes("bitbo.io")
      ? new Response("upstream error", { status: 503 })
      : new Response(sourceTable("Aug 20, 2026", 10), { status: 200 })),
  });

  assert.equal(result.flows.dataStatus, "delayed");
  assert.equal(result.flows.sourceRole, "fallback");
  assert.equal(result.flows.coverage, "partial");
  assert.equal(result.flows.rolling20dNetFlow, null);
});

test("both real sources failing returns unavailable with no fabricated observations", async () => {
  const result = await getBtcEtfFlowsData({
    now: NOW,
    fetchImpl: mockFetch(() => new Response("upstream error", { status: 503 })),
  });

  assert.equal(result.flows.dataStatus, "unavailable");
  assert.equal(result.flows.sourceRole, "unavailable");
  assert.equal(result.flows.coverage, "unavailable");
  assert.equal(result.flows.latestTotalNetFlow, null);
  assert.equal(result.flows.rolling5dNetFlow, null);
  assert.equal(result.flows.rolling10dNetFlow, null);
  assert.equal(result.flows.rolling20dNetFlow, null);
  assert.equal(result.flows.cumulativeNetFlow, null);
  assert.equal(result.flows.rowsParsed, 0);
  assert.deepEqual(result.flows.history, []);
  assert.deepEqual(result.flows.latestFundFlows, []);
  assert.doesNotMatch(JSON.stringify(result.flows), /demo-/i);
});
