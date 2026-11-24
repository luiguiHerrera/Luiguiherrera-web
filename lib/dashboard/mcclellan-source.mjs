import { createHash } from "node:crypto";
import { researchSnapshot } from "../research/mcclellan-core.mjs";

const REPO = "DeanFinancials/deanfi-data";
const FILE = "advance-decline/ad_line_historical.json";
export class McClellanSourceError extends Error {}

async function boundedText(response, maximum) {
  if (!response.ok) throw new McClellanSourceError(`Source HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > maximum) throw new McClellanSourceError("Source exceeds size limit");
  if (!response.body) throw new McClellanSourceError("Empty source body");
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new McClellanSourceError("Source exceeds size limit");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

export function buildMcClellanData(source, asOf = new Date().toISOString()) {
  if (![source?.commit, source?.blob].every(value => /^[a-f0-9]{40}$/.test(value))) throw new McClellanSourceError("Invalid source provenance");
  let result;
  try { result = researchSnapshot(source.snapshot, { asOf }); }
  catch (error) { throw new McClellanSourceError("Invalid source history", { cause: error }); }
  const counts = new Map(source.snapshot.data.map(row => [row.date, row]));
  const points = result.series.filter(row => row.warmedUp).map(row => ({
    date: row.date, advances: counts.get(row.date).advances, declines: counts.get(row.date).declines,
    oscillator: row.oscillator, summation: row.summation,
  }));
  if (points.length < 120) throw new McClellanSourceError("Insufficient mature history");
  return {
    points, declaredTotal: source.snapshot.metadata.total_stocks,
    cutoffDate: result.audit.latestClosedCandidate,
    sourceGeneratedAt: result.audit.sourceGeneratedAt,
    sourceCommit: source.commit, sourceBlob: source.blob,
    sourceRows: result.audit.sourceRows, closedCandidates: result.audit.closedCandidates,
    excludedDates: result.audit.excludedOpenOrUnconfirmed, stale: result.audit.stale,
  };
}

export async function fetchMcClellanSource({ fetcher = fetch, asOf = new Date().toISOString() } = {}) {
  try {
    const options = () => ({ cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "luiguiherrera-dashboard", Accept: "application/vnd.github+json" } });
    const headText = await boundedText(await fetcher(`https://api.github.com/repos/${REPO}/commits?path=${FILE}&per_page=1`, options()), 100000);
    const commit = JSON.parse(headText)?.[0]?.sha;
    if (!/^[a-f0-9]{40}$/.test(commit)) throw new McClellanSourceError("Missing immutable source revision");
    const content = await boundedText(await fetcher(`https://raw.githubusercontent.com/${REPO}/${commit}/${FILE}`, options()), 500000);
    const bytes = Buffer.from(content);
    const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    const source = { snapshot: JSON.parse(content), commit, blob };
    const data = buildMcClellanData(source, asOf);
    // Throw before replacing a validated cache entry. An old or partial source is never a new valid snapshot.
    if (data.stale) throw new McClellanSourceError("Latest closed session not yet available from source");
    return source;
  } catch (error) {
    if (error instanceof McClellanSourceError) throw error;
    if (error instanceof Error && "digest" in error) throw error;
    throw new McClellanSourceError("McClellan source unavailable or invalid", { cause: error });
  }
}
