import "server-only";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { buildCapitalDataset, refreshCapitalStatus } from "./normalize";
import { digest } from "./audit";
import type { CapitalDataset, ComparisonReview, Universe } from "./types";
import universe from "./universe.json";
import config from "./config.json";

let memo: { key: string; dataset: CapitalDataset } | undefined;
export async function getCapitalData(): Promise<CapitalDataset> {
  try {
    const directory = path.join(process.cwd(), "lib/trends/capital/generated");
    const [bytes, manifestText, refreshText] = await Promise.all([
      readFile(path.join(directory, "snapshot.json.gz")), readFile(path.join(directory, "manifest.json"), "utf8"),
      readFile(path.join(directory, "refresh-status.json"), "utf8").catch(() => "{}"),
    ]);
    const manifest = JSON.parse(manifestText), refresh = JSON.parse(refreshText);
    const key = digest(bytes) + digest(JSON.stringify(config));
    if (manifest.snapshot_sha256 !== digest(bytes) || manifest.registry_sha256 !== digest(JSON.stringify(universe))) throw new Error("Snapshot transaction or registry mismatch");
    if (!memo || memo.key !== key) {
      const raw = JSON.parse(gunzipSync(bytes).toString("utf8")) as CapitalDataset;
      if (raw.schema_version !== 2 || raw.universe.id !== universe.id || raw.quarter_end !== config.quarter_end || raw.previous_quarter_end !== config.previous_quarter_end || !Number.isFinite(Date.parse(raw.as_of))) throw new Error("Invalid or mismatched snapshot");
      const dataset = buildCapitalDataset({ universe: universe as Universe, quarter_end: raw.quarter_end, previous_quarter_end: raw.previous_quarter_end, as_of: raw.as_of, filings: [...raw.current, ...raw.previous].flatMap((quarter) => quarter.filings), lookup_succeeded: raw.current.filter((quarter) => quarter.status !== "unknown").map((quarter) => quarter.manager_id), reviews: config.comparisons as ComparisonReview[], mappings: config.security_mappings });
      memo = { key, dataset };
    }
    const dataset = refreshCapitalStatus(memo.dataset, new Date());
    return refresh.status === "FAILED" ? { ...dataset, freshness: "stale", refresh_failure: refresh.attempted_at } : dataset;
  } catch {
    return buildCapitalDataset({ universe: universe as Universe, ...config, as_of: "", filings: [], lookup_succeeded: [] });
  }
}
