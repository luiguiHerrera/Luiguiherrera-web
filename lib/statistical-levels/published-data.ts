import "server-only";
import { bundledStatisticalLevels, getStatisticalLevelsPageData } from "./get-statistical-levels-data";
import { createRuntimeSnapshot, runtimeDigest, SNAPSHOT_SCHEMA } from "./runtime-snapshot";
import type { RuntimeSnapshot } from "./runtime-snapshot";
import type { AssetStatRecord, DailySeasonalityData, StatisticalLevelsManifest } from "./types";

type Source = typeof bundledStatisticalLevels;
type Release = { revision: string; snapshot: RuntimeSnapshot };
const repository = "https://raw.githubusercontent.com/luiguiHerrera/Luiguiherrera-web";
const digest = /^[0-9a-f]{64}$/;

async function readJson<T>(url: string, revalidate: number): Promise<T> {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000), next: { revalidate } });
  if (!response.ok) throw new Error("Statistical Levels data unavailable");
  return response.json();
}

async function verifiedJson<T>(url: string, expected: string): Promise<T> {
  const value = await readJson<T>(url, 86400);
  if (await runtimeDigest(value) !== expected) throw new Error("Statistical Levels file integrity check failed");
  return value;
}

async function remoteSource(index: string, filename: string) {
  const { revision, snapshot } = await readJson<Release>(new URL(filename, index).href, 300);
  if (!/^[0-9a-f]{40}$/.test(revision) || snapshot?.schema !== SNAPSHOT_SCHEMA || !digest.test(snapshot.id)) {
    throw new Error("Invalid Statistical Levels release");
  }
  const { id, ...descriptor } = snapshot;
  if (await runtimeDigest(descriptor) !== id) throw new Error("Invalid snapshot descriptor");
  const base = repository + "/" + revision + "/lib/statistical-levels/generated/";
  const source: Source = {
    getManifest: () => verifiedJson<StatisticalLevelsManifest>(base + "manifest.json", snapshot.manifest_sha256),
    getAsset: ticker => verifiedJson<AssetStatRecord>(base + "assets/" + ticker + ".json", snapshot.records[ticker].asset),
    getSeasonality: ticker => verifiedJson<DailySeasonalityData>(base + "seasonality/" + ticker + ".json", snapshot.records[ticker].seasonality),
  };
  return { source, snapshot };
}

async function bundledSource() {
  const source = bundledStatisticalLevels;
  const snapshot = await createRuntimeSnapshot(await source.getManifest(), source.getAsset, source.getSeasonality);
  return { source, snapshot };
}

type Selection = Parameters<typeof getStatisticalLevelsPageData>[0];

export async function loadPublishedPage(selection: Selection) {
  const index = process.env.STAT_LEVELS_RELEASE_INDEX;
  if (index) {
    try {
      const { source, snapshot } = await remoteSource(index, "current.json");
      return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
    } catch {
      console.error("Statistical Levels release unavailable. Serving bundled snapshot.");
    }
  }
  const { source, snapshot } = await bundledSource();
  return { data: await getStatisticalLevelsPageData(selection, source), snapshot };
}

export async function sourceForSnapshot(id: string) {
  if (!digest.test(id)) return null;
  const index = process.env.STAT_LEVELS_RELEASE_INDEX;
  if (index) {
    try {
      const published = await remoteSource(index, "snapshots/" + id + ".json");
      if (published.snapshot.id === id) return published;
    } catch {
      // A page served from the bundled fallback must also support asset selection.
    }
  }
  const local = await bundledSource();
  return local.snapshot.id === id ? local : null;
}
