import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseOfrFsiCsv, type OfrFsiSnapshot } from "./ofr-fsi.ts";
import { refreshOfrFsiSnapshot } from "./ofr-fsi-source.ts";

const seed = JSON.parse(readFileSync(new URL("./ofr-fsi-published.json", import.meta.url), "utf8"));
const previous: OfrFsiSnapshot = { dataset: parseOfrFsiCsv(seed.csv), retrievedAt: seed.retrievedAt, sourceHash: seed.sourceHash, refreshStatus: "current" };
const fixedNow = () => new Date("2026-11-25T12:00:00Z");
const fetchResponse = (body: string, status = 200) => (async () => new Response(body, { status })) as typeof fetch;

test("failed network, HTTP and invalid publication retain complete last-valid history and dates", async () => {
  const failures = [
    (async () => { throw new TypeError("Network unavailable"); }) as typeof fetch,
    fetchResponse("Unavailable", 503), fetchResponse("<html>Maintenance</html>"),
    fetchResponse(seed.csv.replace("2026-11-20,-0.449", "2026-11-20,broken")),
  ];
  for (const fetcher of failures) {
    const retained = await refreshOfrFsiSnapshot(previous, fetcher, fixedNow);
    assert.equal(retained.refreshStatus, "retained");
    assert.equal(retained.dataset, previous.dataset);
    assert.equal(retained.dataset.observations.at(-1)?.date, "2026-11-20");
    assert.equal(retained.retrievedAt, previous.retrievedAt);
    assert.equal(retained.sourceHash, previous.sourceHash);
    assert.ok(retained.lastRefreshError);
  }
});
test("a successful refresh replaces revised history and clears a previous failure", async () => {
  const revised = seed.csv.replace("2000-01-03,", "1999-12-31,");
  const snapshot = await refreshOfrFsiSnapshot({ ...previous, refreshStatus: "retained", lastRefreshError: "error" }, fetchResponse(revised), fixedNow);
  assert.equal(snapshot.refreshStatus, "current");
  assert.equal(snapshot.lastRefreshError, undefined);
  assert.equal(snapshot.dataset.observations[0].date, "1999-12-31");
  assert.equal(snapshot.dataset.observations.at(-1)?.date, "2026-11-20");
  assert.equal(snapshot.retrievedAt, "2026-11-25T12:00:00.000Z");
  assert.notEqual(snapshot.sourceHash, previous.sourceHash);
});
test("a missing contribution is retained as missing without replacing the official index", async () => {
  const csv = seed.csv.replace("2026-11-20,-0.449,-0.782", "2026-11-20,-0.449,");
  const snapshot = await refreshOfrFsiSnapshot(previous, fetchResponse(csv), fixedNow);
  assert.equal(snapshot.refreshStatus, "current");
  assert.equal(snapshot.dataset.observations.at(-1)?.credit, null);
  assert.equal(snapshot.dataset.observations.at(-1)?.fsi, -0.449);
});
test("unexpected programming errors are not disguised as provider failures", async () => {
  await assert.rejects(refreshOfrFsiSnapshot(previous, (async () => { throw new ReferenceError("bug"); }) as typeof fetch), ReferenceError);
  await assert.rejects(refreshOfrFsiSnapshot(previous, fetchResponse(seed.csv), () => { throw new TypeError("clock bug"); }), TypeError);
});
