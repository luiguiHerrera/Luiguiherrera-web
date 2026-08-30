import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildVixDashboardData,
  fetchVixHistory,
  getVixData,
  normalizeVixHistory,
  parseFredCsv,
} from "./vix.ts";
import type { VixHistoryPoint } from "../types.ts";

function observations(values: number[], start = "2026-07-01"): VixHistoryPoint[] {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  return values.map((value, index) => ({ date: new Date(startTime + index * 86_400_000).toISOString().slice(0, 10), value }));
}

test("production VIX path contains no fabricated fallback values", () => {
  const adapter = readFileSync(new URL("./vix.ts", import.meta.url), "utf8");
  const component = readFileSync(new URL("../../../components/dashboard/VixModule.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(adapter, /const latestVix = 17\.8|date: `demo-|buildFallbackVixData|Datos demo|FRED_API_KEY|api\.stlouisfed\.org/);
  assert.doesNotMatch(component, /Current VIX|VIX actual|Ampliar contexto|Contraer contexto/);
  assert.match(component, /VIX · last close/);
  assert.match(component, /VIX · último cierre/);
});

test("normalization rejects malformed values, sorts, and deduplicates by date", () => {
  const normalized = normalizeVixHistory([
    { date: "2026-08-27", value: 14.51 },
    { date: "invalid", value: 99 },
    { date: "2026-08-25", value: 15.45 },
    { date: "2026-08-27", value: 14.5 },
    { date: "2026-02-30", value: 20 },
    { date: "2026-08-26", value: Number.NaN },
    { date: "2026-08-24", value: -1 },
  ]);
  assert.deepEqual(normalized, [
    { date: "2026-08-25", value: 15.45 },
    { date: "2026-08-27", value: 14.5 },
  ]);
});

test("FRED CSV parser skips missing and non-numeric observations", () => {
  const csv = "observation_date,VIXCLS\n2026-08-24,15.85\n2026-08-25,.\n2026-08-26,bad\n2026-08-27,14.51\n";
  assert.deepEqual(parseFredCsv(csv), [
    { date: "2026-08-24", value: 15.85 },
    { date: "2026-08-27", value: 14.51 },
  ]);
});

test("latest close and 1D/5D/21D changes follow valid observation order across calendar gaps", () => {
  const history = Array.from({ length: 22 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 7, 1 + index + (index >= 5 ? 2 : 0))).toISOString().slice(0, 10),
    value: 10 + index,
  }));
  const data = buildVixDashboardData(history);
  assert.equal(data.spot.latestVix, 31);
  assert.equal(data.spot.previousVix, 30);
  assert.equal(data.spot.change1d, 1);
  assert.equal(data.spot.change5d, 5);
  assert.equal(data.spot.change21d, 21);
});

test("recent chart contains exactly the latest 24 valid sessions", () => {
  const history = observations(Array.from({ length: 40 }, (_, index) => 12 + index / 10));
  const data = buildVixDashboardData(history);
  assert.equal(data.spot.history.length, 24);
  assert.deepEqual(data.spot.history, history.slice(-24));
});

test("historical percentile preserves the full-history empirical formula", () => {
  const history = observations(Array.from({ length: 252 }, (_, index) => index + 1), "2025-12-01");
  const data = buildVixDashboardData(history);
  assert.equal(data.spot.vixPercentile, 100);
});

test("configured API credentials are not part of the normal public transport path", async () => {
  const csv = "observation_date,VIXCLS\n" + observations([14, 15, 16, 17, 18, 19], "2026-08-22").map((point) => point.date + "," + point.value).join("\n");
  const requests: string[] = [];
  const previousApiKey = process.env.FRED_API_KEY;
  process.env.FRED_API_KEY = "known-invalid-test-key";
  try {
    const data = await getVixData({
      fetcher: async (input) => {
        requests.push(String(input));
        return new Response(csv, { status: 200, headers: { "content-type": "application/csv" } });
      },
    });
    assert.deepEqual(requests, ["https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS"]);
    assert.equal(data.spot.latestVix, 19);
    assert.equal(data.spot.dataStatus, "automated");
  } finally {
    if (previousApiKey === undefined) delete process.env.FRED_API_KEY;
    else process.env.FRED_API_KEY = previousApiKey;
  }
});

test("source failure returns an explicit unavailable state without metrics or chart points", async () => {
  const data = await getVixData({ fetcher: async () => { throw new Error("offline"); } });
  assert.equal(data.spot.dataStatus, "unavailable");
  assert.equal(data.spot.latestVix, null);
  assert.equal(data.spot.change1d, null);
  assert.equal(data.spot.change5d, null);
  assert.equal(data.spot.change21d, null);
  assert.equal(data.spot.vixPercentile, null);
  assert.deepEqual(data.spot.history, []);
  assert.equal(data.module.status, "Datos temporalmente no disponibles");
  assert.match(data.spot.reliabilityNote, /No se sustituyen valores/);
});

test("successful source data remains automated without a calendar-day threshold", () => {
  const data = buildVixDashboardData(observations([14, 15, 16, 17, 18, 19], "2026-08-01"));
  assert.equal(data.spot.latestVix, 19);
  assert.equal(data.spot.dataStatus, "automated");
  assert.doesNotMatch(data.spot.reliabilityNote, /seven days|siete días|stale/i);
});

test("Friday close remains automated across the weekend", () => {
  const data = buildVixDashboardData([
    { date: "2026-08-21", value: 15 },
    { date: "2026-08-24", value: 14.8 },
    { date: "2026-08-25", value: 15.1 },
    { date: "2026-08-26", value: 14.9 },
    { date: "2026-08-27", value: 14.7 },
    { date: "2026-08-28", value: 14.51 },
  ]);
  assert.equal(data.spot.lastObservationDate, "2026-08-28");
  assert.equal(data.spot.dataStatus, "automated");
});

test("latest official observation date is exposed and context defaults collapsed", async () => {
  const history = await fetchVixHistory({ fetcher: async () => new Response("observation_date,VIXCLS\n2026-08-22,14\n2026-08-24,15\n2026-08-25,16\n2026-08-26,17\n2026-08-27,18\n2026-08-28,19\n") });
  const data = buildVixDashboardData(history);
  const component = readFileSync(new URL("../../../components/dashboard/VixModule.tsx", import.meta.url), "utf8");
  assert.equal(data.spot.lastObservationDate, "2026-08-28");
  assert.match(data.spot.lastUpdated, /^Último cierre disponible: 28.*ago.*2026$/);
  assert.match(component, /useState\(false\)/);
  assert.match(component, /aria-expanded=\{contextOpen\}/);
  assert.match(component, /Show context/);
  assert.match(component, /Hide context/);
});
