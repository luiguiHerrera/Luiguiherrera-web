import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { bytesHash, hash } from "../math.ts";
import { acquireJobSources, JobSourceError, JOB_SOURCE_POLICY, type JobSourceAttempt } from "./job-sources.ts";

// Deliberate TEST_HTTP fixtures: only the acquisition protocol is exercised.
// These strings are not live observations and are never evaluated by C03 here.
const dates = ["2026-09-16", "2026-10-21", "2026-11-18", "2026-12-16", "2027-01-20", "2027-02-17", "2027-03-17", "2027-04-21", "2027-05-19", "2027-06-16"];
const symbols = ["U6", "V6", "X6", "Z6", "F7", "G7", "H7", "J7", "K7", "M7"];
function catalog(count = 9) {
  return dates.slice(0, count).map((date, index) => ({ duration_type: "M", futures_root: "VX", expire_date: date, product_display: `VX/${symbols[index]}`, path: `/data/us/futures/market_statistics/historical_data/VX/VX_${symbols[index]}.csv` }));
}
function fake(options: { catalog?: unknown; intercept?: (url: string, init: RequestInit | undefined) => Response | Promise<Response> | undefined } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); calls.push({ url, init });
    const replacement = options.intercept?.(url, init);
    if (replacement) return replacement;
    return new Response(url.includes("/product/list/VX/") ? JSON.stringify(options.catalog ?? catalog()) : url.includes("/chart/") ? '{"test":"native-adjclose-response"}' : "Trade Date,Futures,Settle\nTEST_HTTP,TEST_HTTP,1\n", { status: 200 });
  };
  return { calls, fetcher };
}
const isCode = (expected: string) => (error: unknown) => error instanceof JobSourceError && error.code === expected;

test("normal nine-month acquisition is exactly 25 direct GETs with real capture envelopes and no satellites", async () => {
  const { calls, fetcher } = fake(), events: Readonly<JobSourceAttempt>[] = [];
  const before = new Date().toISOString(), result = await acquireJobSources({ expectedSession: "2026-09-08", fetcher, onAttempt: attempt => events.push(attempt) });
  assert.equal(result.fetchCalls, 25); assert.equal(calls.length, 25); assert.equal(result.bundle.captures.length, 25);
  assert.equal(result.bundle.mode, "R2"); assert.deepEqual(result.bundle.calendars, {});
  assert.equal(result.bundle.captures.filter(item => item.kind === "YAHOO_ADJCLOSE").length, 14);
  assert.equal(result.bundle.captures.filter(item => item.kind === "CFE_MONTHLY_CSV").length, 9);
  assert.equal(events.length, 50);
  assert.ok(calls.every(call => call.init?.method === "GET" && call.init.redirect === "manual" && call.init.signal));
  assert.ok(!calls.some(call => /farside|ssga|fred|alphavantage|stooq/.test(call.url)));
  for (const { capture } of result.bundle.captures) {
    const { captureId, ...body } = capture;
    assert.equal(captureId, hash(body)); assert.equal(capture.rawHash, bytesHash(new Uint8Array(Buffer.from(capture.rawBase64, "base64"))));
    assert.equal(capture.metadata.sourcePublishedAt, null); assert.equal(capture.metadata.availableAt, capture.completedAt);
    assert.equal(capture.origin, "PROSPECTIVE"); assert.ok(capture.startedAt >= before && capture.completedAt <= result.completedAt);
  }
  for (const event of events) { assert.ok(!("rawBase64" in event)); assert.ok(!("responseBody" in event)); assert.ok(Object.isFrozen(event)); }
});
test("two supported monthly contracts produce exactly 18 requests without manufacturing optional depth", async () => {
  const { fetcher } = fake({ catalog: catalog(2) }), result = await acquireJobSources({ expectedSession: "2026-09-08", fetcher });
  assert.equal(result.fetchCalls, 18); assert.equal(result.bundle.captures.filter(entry => entry.kind === "CFE_MONTHLY_CSV").length, 2);
});
test("selector excludes expiration equal to expectedSession and does not use wall-clock expiry", async () => {
  const rows = [{ ...catalog(1)[0], expire_date: "2020-01-01", product_display: "VX/F0", path: "/data/us/futures/market_statistics/historical_data/VX/VX_F0.csv" }, { ...catalog(1)[0], expire_date: "2020-02-01", product_display: "VX/G0", path: "/data/us/futures/market_statistics/historical_data/VX/VX_G0.csv" }, { ...catalog(1)[0], expire_date: "2020-03-01", product_display: "VX/H0", path: "/data/us/futures/market_statistics/historical_data/VX/VX_H0.csv" }];
  const { fetcher } = fake({ catalog: rows }), result = await acquireJobSources({ expectedSession: "2020-01-01", fetcher });
  assert.deepEqual(result.bundle.captures.filter(entry => entry.kind === "CFE_MONTHLY_CSV").map(entry => entry.identity!.expirationDate), ["2020-02-01", "2020-03-01"]);
});
test("catalog selection is capped at nine nearest monthly identities and ignores weekly rows", async () => {
  const rows = [...catalog(10).reverse(), { ...catalog(1)[0], duration_type: "W" }];
  const { fetcher } = fake({ catalog: { data: rows } }), result = await acquireJobSources({ expectedSession: "2026-09-08", fetcher });
  assert.equal(result.fetchCalls, 25);
  assert.deepEqual(result.bundle.captures.filter(entry => entry.kind === "CFE_MONTHLY_CSV").map(entry => entry.identity!.expirationDate), dates.slice(0, 9));
});
test("Yahoo calls preserve explicit native adjusted-close request and the accepted bounded history window", async () => {
  const { calls, fetcher } = fake({ catalog: catalog(2) });
  await acquireJobSources({ expectedSession: "2026-09-08", fetcher });
  const urls = calls.filter(call => call.url.includes("/chart/")).map(call => new URL(call.url));
  assert.equal(new Set(urls.map(url => url.pathname.split("/").at(-1))).size, 14);
  for (const url of urls) {
    assert.equal(url.searchParams.get("includeAdjustedClose"), "true"); assert.equal(url.searchParams.get("interval"), "1d");
    assert.equal(url.searchParams.get("events"), "div,splits");
    assert.equal(Number(url.searchParams.get("period2")) - Number(url.searchParams.get("period1")), 550 * 86400);
  }
});
test("request concurrency never exceeds three including body completion", async () => {
  let active = 0, maximum = 0;
  const { fetcher } = fake({ catalog: catalog(2), intercept: url => {
    active++; maximum = Math.max(maximum, active);
    return new Response(new ReadableStream<Uint8Array>({ async start(controller) {
      await delay(2); active--;
      controller.enqueue(new TextEncoder().encode(url.includes("/product/list/VX/") ? JSON.stringify(catalog(2)) : "TEST_HTTP"));
      controller.close();
    } }));
  } });
  await acquireJobSources({ expectedSession: "2026-09-08", fetcher });
  assert.equal(maximum, 3); assert.equal(active, 0);
});
for (const status of [301, 403, 500]) test(`HTTP ${status} fails closed with no redirects/retries or provider substitution`, async () => {
  const { calls, fetcher } = fake({ intercept: url => url.includes("/chart/") ? new Response("PRIVATE_RESPONSE_MUST_NOT_APPEAR", { status }) : undefined });
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), error => {
    assert.ok(error instanceof JobSourceError); assert.equal(error.code, "SOURCE_UNAVAILABLE");
    assert.equal(error.fetchCalls, calls.length); assert.ok(error.fetchCalls <= 3);
    assert.ok(!JSON.stringify(error.attempts).includes("PRIVATE_RESPONSE"));
    assert.ok(error.attempts.every(attempt => attempt.status !== "STARTED")); return true;
  });
  assert.equal(new Set(calls.map(call => call.url)).size, calls.length);
});
test("any selected monthly HTTP failure is a source failure even beyond the nearest two contracts", async () => {
  const { calls, fetcher } = fake({ intercept: url => url.endsWith("VX_K7.csv") ? new Response("not available", { status: 404 }) : undefined });
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), error => {
    assert.ok(error instanceof JobSourceError); assert.equal(error.code, "SOURCE_UNAVAILABLE"); assert.equal(error.fetchCalls, calls.length);
    assert.ok(error.attempts.some(attempt => attempt.symbol === "VX/K7" && attempt.httpStatus === 404)); return true;
  });
});
test("unexpected redirect destination on a 200 response is rejected", async () => {
  const response = new Response("TEST_HTTP"); Object.defineProperty(response, "url", { value: "https://other.invalid/" });
  const { fetcher } = fake({ intercept: () => response });
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), isCode("SOURCE_UNAVAILABLE"));
});
test("invalid/duplicate/insufficient catalog never starts a monthly history request", async () => {
  for (const payload of [[], catalog(1), [...catalog(2), catalog(1)[0]], { wrong: true }, catalog(2).map(row => ({ ...row, path: "https://evil.invalid/steal.csv" })), catalog(2).map(row => ({ ...row, path: catalog(1)[0].path }))]) {
    const { calls, fetcher } = fake({ catalog: payload });
    await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), isCode("INVALID_CATALOG"));
    assert.equal(calls.length, 16); assert.ok(!calls.some(call => call.url.includes("historical_data/VX/")));
  }
});
test("malformed catalog JSON is classified and retains all completed request metadata", async () => {
  const { fetcher } = fake({ intercept: url => url.includes("/product/list/VX/") ? new Response("{not-json") : undefined });
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), error => {
    assert.ok(error instanceof JobSourceError); assert.equal(error.code, "INVALID_CATALOG"); assert.equal(error.fetchCalls, 16); assert.equal(error.attempts.length, 16); return true;
  });
});
test("response length and streamed payload bounds reject without accepting oversized captures", async () => {
  for (const response of [() => new Response("x", { headers: { "content-length": String(JOB_SOURCE_POLICY.maxResponseBytes + 1) } }), () => new Response(new Uint8Array(JOB_SOURCE_POLICY.maxResponseBytes + 1))]) {
    const { fetcher } = fake({ intercept: () => response() });
    await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), isCode("SOURCE_LIMIT_EXCEEDED"));
  }
});
test("aggregate streamed byte budget remains bounded across concurrent responses", async () => {
  const { fetcher } = fake({ intercept: () => new Response(new Uint8Array(3 * 1024 * 1024)) });
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher }), isCode("SOURCE_LIMIT_EXCEEDED"));
});
test("pre-aborted signal and unknown calendar session cause zero provider requests", async () => {
  const { calls, fetcher } = fake(), controller = new AbortController(); controller.abort();
  await assert.rejects(acquireJobSources({ expectedSession: "2026-09-08", fetcher, signal: controller.signal }), isCode("SOURCE_ABORTED"));
  await assert.rejects(acquireJobSources({ expectedSession: "2026-02-30", fetcher }), isCode("INVALID_EXPECTED_SESSION"));
  assert.equal(calls.length, 0);
});
test("abort ends a blocked provider operation with terminal metadata, without waiting for its promise", async () => {
  const controller = new AbortController(); let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return new Promise<Response>(() => {}); };
  const work = acquireJobSources({ expectedSession: "2026-09-08", fetcher, signal: controller.signal });
  await delay(5); controller.abort();
  await assert.rejects(work, error => {
    assert.ok(error instanceof JobSourceError); assert.equal(error.code, "SOURCE_ABORTED"); assert.equal(error.fetchCalls, calls);
    assert.ok(error.attempts.every(attempt => attempt.completedAt && attempt.status === "SOURCE_UNAVAILABLE")); return true;
  });
});
test("abort also ends a stalled response body without accepting its partial bytes", async () => {
  const controller = new AbortController();
  const { fetcher } = fake({ intercept: () => new Response(new ReadableStream<Uint8Array>({ start(stream) { stream.enqueue(new TextEncoder().encode("partial")); } })) });
  const work = acquireJobSources({ expectedSession: "2026-09-08", fetcher, signal: controller.signal });
  await delay(5); controller.abort();
  await assert.rejects(work, error => {
    assert.ok(error instanceof JobSourceError); assert.equal(error.code, "SOURCE_ABORTED");
    assert.ok(error.attempts.every(attempt => attempt.status === "SOURCE_UNAVAILABLE" && !attempt.captureId)); return true;
  });
});
test("diagnostic callbacks receive snapshots and cannot mutate retained acquisition evidence", async () => {
  const { fetcher } = fake({ catalog: catalog(2) });
  const result = await acquireJobSources({ expectedSession: "2026-09-08", fetcher, onAttempt: attempt => { (attempt as JobSourceAttempt).url = "mutation"; } });
  assert.equal(result.fetchCalls, 18); assert.ok(result.attempts.every(attempt => attempt.url.startsWith("https:")));
});
