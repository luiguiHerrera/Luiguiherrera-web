import assert from "node:assert/strict";
import test from "node:test";
import { PublishedReadError, readPublishedText } from "./published-fetch.ts";

const url = "https://raw.githubusercontent.com/luiguiHerrera/Luiguiherrera-web/verified-snapshot.json";

test("a temporary upstream failure is retried without bypassing the persistent cache", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit & { next: { revalidate: number } }) => {
    calls++;
    assert.equal(options.next.revalidate, 600);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, undefined);
    return calls === 1 ? new Response("Unavailable", { status: 503 }) : new Response("verified bytes");
  });
  assert.equal(await readPublishedText(url, 600), "verified bytes");
  assert.equal(calls, 2);
});

test("concurrent callers share the full body read and receive the same immutable bytes", async t => {
  let complete!: (response: Response) => void;
  const fetch = t.mock.method(globalThis, "fetch", () => new Promise<Response>(resolve => { complete = resolve; }));
  const a = readPublishedText(url, 86400);
  const b = readPublishedText(url, 86400);
  assert.equal(fetch.mock.callCount(), 1);
  complete(new Response("same snapshot bytes"));
  assert.deepEqual(await Promise.all([a, b]), ["same snapshot bytes", "same snapshot bytes"]);
});

test("different cache lifetimes are not merged", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("bytes"));
  await Promise.all([readPublishedText(url, 600), readPublishedText(url, 86400)]);
  assert.equal(fetch.mock.callCount(), 2);
});

for (const name of ["TimeoutError", "AbortError", "TypeError"]) {
  test("recovers from transient " + name, async t => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      if (++calls === 1) throw name === "TypeError" ? new TypeError("fetch failed") : new DOMException("interrupted", name);
      return new Response("recovered");
    });
    assert.equal(await readPublishedText(url, 86400), "recovered");
    assert.equal(calls, 2);
  });
}

test("an interrupted response body is retried before falling back to an older capture", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => ++calls === 1
    ? new Response(new ReadableStream({ start(controller) { controller.error(new DOMException("interrupted", "TimeoutError")); } }))
    : new Response("complete bytes"));
  assert.equal(await readPublishedText(url, 86400), "complete bytes");
  assert.equal(calls, 2);
});

for (const status of [403, 404]) {
  test("does not retry permanent HTTP " + status, async t => {
    const fetch = t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status }));
    await assert.rejects(readPublishedText(url, 600), error => error instanceof PublishedReadError && error.code === "HTTP_" + status);
    assert.equal(fetch.mock.callCount(), 1);
  });
}

test("does not retry before a long upstream rate-limit delay", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("rate limited", { status: 429, headers: { "Retry-After": "60" } }));
  await assert.rejects(readPublishedText(url, 600), /HTTP_429/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("retries are bounded and a failed request does not poison later reads", async t => {
  let available = false;
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(available ? "recovered" : "unavailable", { status: available ? 200 : 503 }));
  await assert.rejects(readPublishedText(url, 600), /HTTP_503/);
  assert.equal(fetch.mock.callCount(), 2);
  available = true;
  assert.equal(await readPublishedText(url, 600), "recovered");
  assert.equal(fetch.mock.callCount(), 3);
});
