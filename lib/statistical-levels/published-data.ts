import "server-only";
import { createHash } from "node:crypto";
import { bundledStatisticalLevels, getStatisticalLevelsPageData } from "./get-statistical-levels-data";
import { createRuntimeSnapshot, runtimeDigest, SNAPSHOT_SCHEMA } from "./runtime-snapshot";
import type { RuntimeSnapshot } from "./runtime-snapshot";
import type { AssetStatRecord, DailySeasonalityData, StatisticalLevelsManifest } from "./types";

type Source = typeof bundledStatisticalLevels;
type Selection = Parameters<typeof getStatisticalLevelsPageData>[0];
type FileEntry = { FILE: string; SNAPSHOT_SHA256: string; SCHEMA_VERSION: string };
type Run = {
  workflow_id: number; event: string; conclusion: string; head_branch: string; head_sha: string;
  repository: { id: number }; head_repository: { id: number };
  head_commit: { id: string; message: string; timestamp: string };
};

const repo = "luiguiHerrera/Luiguiherrera-web";
const runsUrl = "https://api.github.com/repos/" + repo + "/actions/workflows/336203586/runs?event=workflow_run&branch=vercel-deployment&status=success&per_page=30";
// Independently recovered from the hosted producer receipt for run 44942599945.
const seed = "2c495e7472a3a9a3185f3a69ad4335d3a86b5613";
const seedHash = "b429b84a2b6fdf217fee274dad009164fc4f565396aea1619093d4802a9b5250";
const seedCutoff = "2026-11-21T19:49:49.829Z";
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

async function verifiedRuns(): Promise<Run[]> {
  const runs: Run[] = JSON.parse(await readText(runsUrl, 600)).workflow_runs;
  // A successful workflow_run for a generated commit binds the updater receipt,
  // the S3 readback and the exact generated tree. Editorial pushes are separate.
  return runs.filter(r => r.workflow_id === 336203586 && r.event === "workflow_run" &&
    r.conclusion === "success" && r.repository.id === 1263772150 && r.head_repository.id === 1263772150 &&
    r.head_branch === "vercel-deployment" && /^[a-f0-9]{40}$/.test(r.head_sha) &&
    r.head_commit?.id === r.head_sha && r.head_commit.message === "Update statistical levels snapshot with durable raw provenance")
    .sort((a,b) => Date.parse(b.head_commit.timestamp) - Date.parse(a.head_commit.timestamp));
}

function checkHash(text: string, expected: string) {
  if (createHash("sha256").update(text).digest("hex") !== expected) throw new Error("Statistical Levels checksum mismatch");
}

async function hostedSource(revision: string) {
  const base = "https://raw.githubusercontent.com/" + repo + "/" + revision + "/lib/statistical-levels/generated";
  const bytes = await readText(base + "-provenance.json", 86400);
  if (revision === seed) checkHash(bytes, seedHash);
  const meta = JSON.parse(bytes);
  if (meta.SCHEMA_VERSION !== "statistical-levels.provenance.v1" || meta.RAW_ARCHIVE_ACCESS_CLASS !== "PRIVATE_S3_DURABLE" ||
      meta.SOURCE_STATE !== "COMMITTED" || !hashPattern.test(meta.CONFIG?.RAW_ARCHIVE_SEAL_SHA256) ||
      !Number.isFinite(Date.parse(meta.GENERATED_AT)) || meta.snapshots?.length !== 81) throw new Error("Invalid production provenance");
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
  if (liveDataEnabled()) {
    // A corrupt or briefly unavailable release must not displace the last usable one.
    let runs: Run[] = [];
    try {
      runs = await verifiedRuns();
    } catch { console.error("Statistical Levels release list unavailable."); }
    const recent = runs.filter(run => Date.parse(run.head_commit.timestamp) > Date.parse(seedCutoff)).slice(0, 3);
    for (const run of recent) {
      try {
        const { source, snapshot, cutoff } = await hostedSource(run.head_sha);
        if (cutoff >= seedCutoff) return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
      } catch { console.error("Statistical Levels could not read verified release", run.head_sha); }
    }
    try {
      const { source, snapshot } = await hostedSource(seed);
      return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
    } catch { console.error("Statistical Levels archive unavailable. Using bundled snapshot."); }
  }
  const { source, snapshot } = await bundledSource();
  return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
}

export async function sourceForSnapshot(id: string, revision: string | null) {
  if (revision) {
    if (!liveDataEnabled() ||
        (revision !== seed && !(await verifiedRuns()).some(run => run.head_sha === revision))) return null;
    const hosted = await hostedSource(revision);
    return hosted.snapshot.id === id ? hosted : null;
  }
  const local = await bundledSource();
  return local.snapshot.id === id ? local : null;
}
