import "server-only";
import { createHash } from "node:crypto";
import { bundledStatisticalLevels, getStatisticalLevelsPageData } from "./get-statistical-levels-data";
import { createRuntimeSnapshot, runtimeDigest, SNAPSHOT_SCHEMA } from "./runtime-snapshot";
import type { RuntimeSnapshot } from "./runtime-snapshot";
import type { AssetStatRecord, DailySeasonalityData, StatisticalLevelsManifest } from "./types";

type Source = typeof bundledStatisticalLevels;
type Selection = Parameters<typeof getStatisticalLevelsPageData>[0];
type FileEntry = { FILE: string; SNAPSHOT_SHA256: string; SCHEMA_VERSION: string };
type ProducerRun = {
  id: number; run_attempt: number; workflow_id: number; event: string; conclusion: string; head_branch: string; head_sha: string;
  repository: { id: number }; head_repository: { id: number }; run_started_at: string; updated_at: string;
};
type Push = { actor: { id: number }; ref: string; activity_type: string; before: string; after: string; timestamp: string };
type Publication = { revision: string; push: Push; run: ProducerRun };
type ReceiptArtifact = { name: string; expired: boolean; digest: string; workflow_run: { id: number; head_sha: string }; };

const repo = "luiguiHerrera/Luiguiherrera-web";
const api = "https://api.github.com/repos/" + repo;
const runsUrl = api + "/actions/workflows/306145344/runs?branch=vercel-deployment&status=success&per_page=50";
const activityUrl = api + "/activity?ref=refs%2Fheads%2Fvercel-deployment&actor=github-actions%5Bbot%5D&activity_type=push&per_page=50";
// Independently recovered from the hosted producer receipt for run 44139982306.
// The November 21 release and every subsequent release go through live discovery.
const seed = "c4bb2047ed54fd3c1fdd40f6fddd99ec187b31ce";
const seedHash = "d996f9e9d03f45e1612b951c3db58789a8cebae0d813cc5251300c382c116826";
const seedCutoff = "2026-11-17T17:47:55.286Z";
const hashPattern = /^[a-f0-9]{64}$/;

function liveDataEnabled() {
  return (process.env.STAT_LEVELS_LIVE_DATA ?? (process.env.VERCEL === "1" ? "true" : "false")) === "true";
}

async function readText(url: string, revalidate: number) {
  const response = await fetch(url, { headers: { "User-Agent": "Statistical-Levels-Web" },
    redirect: "error", signal: AbortSignal.timeout(8000), next: { revalidate } });
  if (!response.ok) throw new Error("Dataset source returned " + response.status);
  return response.text();
}

async function publications(): Promise<Publication[]> {
  const [runsText, pushesText] = await Promise.all([readText(runsUrl, 600), readText(activityUrl, 600)]);
  const runs: ProducerRun[] = JSON.parse(runsText).workflow_runs;
  const pushes: Push[] = JSON.parse(pushesText);
  const successful = runs.filter(run => run.workflow_id === 306145344 && run.conclusion === "success" &&
    ["schedule","workflow_dispatch"].includes(run.event) && run.head_branch === "vercel-deployment" &&
    run.repository.id === 1263772150 && run.head_repository.id === 1263772150 && Number.isSafeInteger(run.id));
  const releases: Publication[] = [];
  for (const push of pushes) {
    if (push.actor?.id !== 41898282 || push.ref !== "refs/heads/vercel-deployment" || push.activity_type !== "push" ||
        !/^[a-f0-9]{40}$/.test(push.after)) continue;
    const timestamp = Date.parse(push.timestamp);
    const run = successful.find(r => r.head_sha === push.before && Date.parse(r.run_started_at) <= timestamp && timestamp <= Date.parse(r.updated_at));
    if (run) releases.push({ revision: push.after, push, run });
  }
  return releases.sort((a,b) => Date.parse(b.push.timestamp) - Date.parse(a.push.timestamp));
}

async function verifyReceipt(publication: Publication) {
  const { run } = publication;
  const result = JSON.parse(await readText(api + "/actions/runs/" + run.id + "/artifacts", 86400));
  const named = result.artifacts.filter((a: ReceiptArtifact) => a.name === "sl-published-" + run.id + "-" + run.run_attempt &&
    !a.expired && a.workflow_run?.id === run.id && a.workflow_run.head_sha === run.head_sha && /^sha256:[a-f0-9]{64}$/.test(a.digest));
  if (named.length !== 1) throw new Error("Missing successful producer readback receipt");
}

function checkHash(text: string, expected: string) {
  if (createHash("sha256").update(text).digest("hex") !== expected) throw new Error("Statistical Levels checksum mismatch");
}

async function hostedSource(revision: string, publication?: Publication) {
  const base = "https://raw.githubusercontent.com/" + repo + "/" + revision + "/lib/statistical-levels/generated";
  const [bytes] = await Promise.all([readText(base + "-provenance.json", 86400), publication && verifyReceipt(publication)]);
  if (revision === seed) checkHash(bytes, seedHash);
  const meta = JSON.parse(bytes);
  if (meta.SCHEMA_VERSION !== "statistical-levels.provenance.v1" || meta.RAW_ARCHIVE_ACCESS_CLASS !== "PRIVATE_S3_DURABLE" ||
      meta.SOURCE_STATE !== "COMMITTED" || !hashPattern.test(meta.CONFIG?.RAW_ARCHIVE_SEAL_SHA256) ||
      !Number.isFinite(Date.parse(meta.GENERATED_AT)) || meta.snapshots?.length !== 81) throw new Error("Invalid production provenance");
  if (publication && (meta.GENERATOR_COMMIT !== publication.push.before ||
      Date.parse(meta.GENERATED_AT) > Date.parse(publication.push.timestamp) ||
      meta.GENERATED_AT.slice(0, 10) !== publication.push.timestamp.slice(0, 10))) throw new Error("Snapshot does not belong to producer run");
  const hashes = new Map<string, string>();
  for (const entry of meta.snapshots as FileEntry[]) {
    if (!hashPattern.test(entry.SNAPSHOT_SHA256) || entry.SCHEMA_VERSION !== "statistical-levels.snapshot.v3" || hashes.has(entry.FILE)) {
      throw new Error("Invalid snapshot file inventory");
    }
    hashes.set(entry.FILE, entry.SNAPSHOT_SHA256);
  }
  async function file<T>(name: string): Promise<T> {
    const expected = hashes.get(name);
    if (!expected) throw new Error("Missing snapshot file");
    const data = await readText(base + "/" + name, 86400);
    checkHash(data, expected);
    return JSON.parse(data);
  }
  const manifest = await file<StatisticalLevelsManifest>("manifest.json");
  if (manifest.catalog.length !== 40 || !manifest.baseline || manifest.baseline.id !== meta.BASELINE_ID ||
      manifest.baseline?.cutoff !== meta.GENERATED_AT) throw new Error("Invalid snapshot manifest");
  const records: RuntimeSnapshot["records"] = {};
  for (const {ticker} of manifest.catalog) {
    const asset = hashes.get("assets/" + ticker + ".json"), seasonality = hashes.get("seasonality/" + ticker + ".json");
    if (!/^[A-Z0-9.-]{1,12}$/.test(ticker) || Object.hasOwn(records,ticker) || !asset || !seasonality) throw new Error("Invalid ticker inventory");
    records[ticker] = { asset, seasonality };
  }
  const descriptor = { schema: SNAPSHOT_SCHEMA, revision, manifest_sha256: hashes.get("manifest.json")!, records } as const;
  const snapshot = { ...descriptor, id: await runtimeDigest(descriptor) };
  const source: Source = { getManifest: async () => manifest,
    getAsset: ticker => file<AssetStatRecord>("assets/" + ticker + ".json"),
    getSeasonality: ticker => file<DailySeasonalityData>("seasonality/" + ticker + ".json") };
  return { source, snapshot, cutoff: manifest.baseline.cutoff };
}

async function bundledSource() {
  const source = bundledStatisticalLevels;
  const snapshot = await createRuntimeSnapshot(await source.getManifest(), source.getAsset, source.getSeasonality);
  return { source, snapshot };
}

export async function loadPublishedPage(selection: Selection) {
  // The approved archive replay can include a fuller explorer at the same cutoff.
  // Keep that immutable dataset until a genuinely newer producer release exists.
  const bundledCutoff = Date.parse((await bundledStatisticalLevels.getManifest()).baseline?.cutoff ?? '');
  const newerThanBundled = (cutoff: string) => !Number.isFinite(bundledCutoff) || Date.parse(cutoff) > bundledCutoff;
  if (liveDataEnabled()) {
    // A corrupt or briefly unavailable release must not displace the last usable one.
    let releases: Publication[] = [];
    try {
      releases = await publications();
    } catch { console.error("Statistical Levels release list unavailable."); }
    const recent = releases.filter(entry => Date.parse(entry.push.timestamp) > Date.parse(seedCutoff)).slice(0, 3);
    for (const entry of recent) {
      try {
        const { source, snapshot, cutoff } = await hostedSource(entry.revision, entry);
        if (cutoff >= seedCutoff && newerThanBundled(cutoff)) return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
      } catch { console.error("Statistical Levels could not read verified release", entry.revision); }
    }
    if (newerThanBundled(seedCutoff)) try {
      const { source, snapshot } = await hostedSource(seed);
      return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
    } catch { console.error("Statistical Levels archive unavailable. Using bundled snapshot."); }
  }
  const { source, snapshot } = await bundledSource();
  return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
}

export async function sourceForSnapshot(id: string, revision: string | null) {
  if (revision) {
    if (!liveDataEnabled()) return null;
    const entry = revision === seed ? undefined : (await publications()).find(p => p.revision === revision);
    if (!entry && revision !== seed) return null;
    const hosted = await hostedSource(revision, entry);
    return hosted.snapshot.id === id ? hosted : null;
  }
  const local = await bundledSource();
  return local.snapshot.id === id ? local : null;
}
