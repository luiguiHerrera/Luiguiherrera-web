import { readFile, stat, realpath, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EngineInput } from "../types.ts";
import type { RegimeOutput } from "../engine.ts";
import { evaluateRegime, RegimeInputError } from "../engine.ts";
import { bytesHash, hash } from "../math.ts";
import { instant } from "../temporal.ts";
import { CONTRACT_HASHES, ENGINE_VERSION } from "../contract.ts";
import { persistCapture } from "../capture.ts";
import { pipelineScope } from "./pipeline-capture.ts";
import { prepareSourceInput, prepareSourceVintage, resolveSourceVintage, SOURCE_BUNDLE_VERSION, SOURCE_PREPARATION_VERSION } from "./source-input.ts";
import { createSnapshot, persistSnapshot, readSnapshot } from "./snapshot.ts";
import type { ShadowSnapshot } from "./snapshot.ts";

type V1Reading = { regimeSummary: { current: string; regimeScore: number; confidence: number } };
export const SHADOW_CONFIG = { flag: "V2_SHADOW", directory: "V2_SHADOW_DIR", sourceBundle: "V2_SHADOW_INPUT", default: "OFF" } as const;
const MAX_BUNDLE_BYTES = 32 * 1024 * 1024;
const MAINTENANCE_NORMALIZER_SHA256 = "da2963f02e32ed2a01f317992e2259c6bc4a5abd972c433c3d9974b5cc9ac037";
// One immutable normalized vintage and one exact-cut result. Different cuts
// always resolve calendars and VX again; no source freshness or output TTL.
let vintageCache: { key: string; vintage: ReturnType<typeof prepareSourceVintage> } | undefined;
let preparedCache: { key: string; prepared: ReturnType<typeof prepareSourceInput> } | undefined;
// Serializes only private snapshot publication. No queue survives beyond a V1 call.
let publication: Promise<void> = Promise.resolve();
let pendingPublications = 0;
let activeSidecars = 0;
export const SHADOW_IO_TIMEOUT_MS = 2000;
const MAX_PENDING_PUBLICATIONS = 8;
export type ShadowOptions = {
  enabled?: boolean; directory?: string; inputFile?: string; repositoryRoot?: string;
  timeoutMs?: number;
  now?: () => string; loadInput?: (asOf: string) => Promise<{ input: EngineInput; issues: string[]; captureMetadata: unknown; sourceStatus: unknown }>;
  evaluate?: (input: EngineInput) => RegimeOutput;
  onDiagnostic?: (diagnostic: { code: string; snapshotId?: string }) => void;
};
export async function externalDirectory(directory: string, repositoryRoot: string) {
  if (!path.isAbsolute(directory)) throw new Error("SHADOW_DIRECTORY_MUST_BE_ABSOLUTE");
  // Resolve the existing ancestor before mkdir, including symlinked parents.
  let ancestor = directory;
  while (true) { try { ancestor = await realpath(ancestor); break; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; const parent = path.dirname(ancestor); if (parent === ancestor) throw error; ancestor = parent; } }
  const root = await realpath(repositoryRoot);
  if (ancestor === root || ancestor.startsWith(root + path.sep)) throw new Error("RUNTIME_DATA_INSIDE_REPOSITORY_FORBIDDEN");
  await mkdir(directory, { recursive: true });
  const resolved = await realpath(directory);
  if (resolved === root || resolved.startsWith(root + path.sep)) throw new Error("RUNTIME_DATA_INSIDE_REPOSITORY_FORBIDDEN");
  return resolved;
}
async function loadBundle(filename: string | undefined, asOf: string, directory: string) {
  if (!filename) return { input: { mode: "UNKNOWN", asOf, calendars: {}, equity: {} } as EngineInput, issues: ["SOURCE_BUNDLE_NOT_CONFIGURED", "UNKNOWN_CALENDAR"], captureMetadata: null, sourceStatus: null };
  if (!path.isAbsolute(filename)) throw new Error("SHADOW_INPUT_MUST_BE_ABSOLUTE");
  if ((await stat(filename)).size > MAX_BUNDLE_BYTES) throw new Error("SOURCE_BUNDLE_SIZE_LIMIT");
  const bytes = await readFile(filename);
  if (bytes.byteLength > MAX_BUNDLE_BYTES) throw new Error("SOURCE_BUNDLE_SIZE_LIMIT");
  const bundleHash = bytesHash(new Uint8Array(bytes)), storage = path.join(directory, "bundles");
  await mkdir(storage, { recursive: true });
  const retained = path.join(storage, `${bundleHash}.json`);
  try { await writeFile(retained, new Uint8Array(bytes), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || bytesHash(new Uint8Array(await readFile(retained))) !== bundleHash) throw error; }
  const vintageKey = hash({ bundleHash, engine: ENGINE_VERSION, parameterSet: "C03", contracts: CONTRACT_HASHES,
    bundleSchema: SOURCE_BUNDLE_VERSION, preparationVersion: SOURCE_PREPARATION_VERSION, normalizerImplementation: MAINTENANCE_NORMALIZER_SHA256 });
  if (vintageCache?.key !== vintageKey) vintageCache = { key: vintageKey, vintage: prepareSourceVintage(JSON.parse(bytes.toString("utf8"))) };
  const key = hash({ vintageKey, asOf });
  if (preparedCache?.key !== key) preparedCache = { key, prepared: resolveSourceVintage(vintageCache.vintage, asOf) };
  const prepared = preparedCache.prepared;
  return { ...prepared, captureMetadata: { ...prepared.captureMetadata, retainedBundle: { hash: bundleHash, relativePath: `bundles/${bundleHash}.json`, bytes: bytes.byteLength } } };
}
function v1Identity(value: V1Reading | null) {
  return { regime: value?.regimeSummary.current ?? null, score: value?.regimeSummary.regimeScore ?? null, confidence: value?.regimeSummary.confidence ?? null,
    version: "regime-v1/legacy-45-40-15; source-sha256=4513411deacf42d80bfbd2d8739c3b3c0e1f4cbf2eab91a66ba35ed01ca53f87", outputHash: hash(value) };
}
async function previousSnapshot(directory: string): Promise<ShadowSnapshot | undefined> {
  try {
    const id = (await readFile(path.join(directory, "latest.txt"), "utf8")).trim();
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("INVALID_SHADOW_CHECKPOINT");
    return await readSnapshot(path.join(directory, "snapshots", `${id}.json`));
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}
/** V1 is the only returned value. The enabled sidecar is fully contained here. */
export async function withDashboardShadow<T extends V1Reading>(loadV1: () => Promise<T>, options: ShadowOptions = {}): Promise<T> {
  const enabled = options.enabled ?? process.env.V2_SHADOW === "ON";
  if (!enabled) return loadV1();
  const tap = pipelineScope();
  let value: T | null = null, v1Failure: unknown, failed = false;
  try { value = await tap.run(loadV1); } catch (error) { v1Failure = error; failed = true; }
  const diagnostic = (event: { code: string; snapshotId?: string }) => { try { if (options.onDiagnostic) options.onDiagnostic(event); else console.info("[regime-v2:shadow]", event); } catch { /* Observer must not become V1 authority. */ } };
  if (activeSidecars >= MAX_PENDING_PUBLICATIONS) {
    diagnostic({ code: "SHADOW_BUSY" });
    if (failed) throw v1Failure;
    return value!;
  }
  activeSidecars++;
  const shadowWork = async () => {
  try {
    const asOf = (options.now ?? (() => new Date().toISOString()))();
    const root = options.repositoryRoot ?? process.cwd(), configured = options.directory ?? process.env.V2_SHADOW_DIR;
    if (!configured) throw new Error("SHADOW_DIRECTORY_NOT_CONFIGURED");
    const directory = await externalDirectory(configured, root);
    let input: EngineInput | null = null, output: RegimeOutput | null = null, error: { code: string; message: string } | null = null;
    let sourceStatus: unknown = null, sourceMetadata: unknown = null, issues: string[] = [];
    try {
      const prepared = await (options.loadInput ?? (cut => loadBundle(options.inputFile ?? process.env.V2_SHADOW_INPUT, cut, directory)))(asOf);
      input = prepared.input; issues = prepared.issues; sourceStatus = prepared.sourceStatus; sourceMetadata = prepared.captureMetadata;
      output = (options.evaluate ?? evaluateRegime)(input);
    } catch (failure) {
      error = { code: failure instanceof RegimeInputError ? "V2_TYPED_INPUT_FAILURE" : "V2_CALCULATION_OR_SOURCE_FAILURE", message: failure instanceof Error ? failure.message : "Unknown V2 failure" };
    }
    if (failed) error = { code: "V1_FAILURE", message: "V1 failed; original error propagated without V2 masking." };
    for (const capture of tap.captures) await persistCapture(path.join(directory, "captures"), capture);
    if (pendingPublications >= MAX_PENDING_PUBLICATIONS) throw new Error("SHADOW_PUBLICATION_BUSY");
    pendingPublications++;
    const publish = publication.catch(() => undefined).then(async () => {
      const previous = await previousSnapshot(directory);
      const snapshot = createSnapshot({ asOf, v1: v1Identity(value), input, output, error, sourceStatus: sourceStatus && typeof sourceStatus === "object" && !Array.isArray(sourceStatus) ? sourceStatus as Record<string, unknown> : undefined,
        captureMetadata: { origin: "PROSPECTIVE", canonicalImplementation: { acceptedFilesSha256: "3d8243d0f15a7cff80b012885b6dcf1de217565223d5f2afc8ab494c989390a4", maintenanceNormalizerSha256: MAINTENANCE_NORMALIZER_SHA256, maintenanceChange: "M-PERF-01: identical date formatter reused per normalization call", manifest: "docs/regime-engine-v2/maintainer/input-manifest.json", engineFiles: 12 }, sourceInput: sourceMetadata, pipelineCaptures: tap.captures.map(c => ({ captureId: c.captureId, rawHash: c.rawHash, sourceId: c.sourceId, sourceVersion: c.sourceVersion, availableAt: c.completedAt, sourcePublishedAt: null, replayClass: "UNKNOWN" })), issues: [...issues, ...tap.issues] }, previous });
      await persistSnapshot(path.join(directory, "snapshots"), snapshot, { repositoryRoot: root });
      // A single-process bounded checkpoint; immutable snapshots survive restarts.
      // Never replace the latest time with a late/out-of-order snapshot.
      if (!previous || instant(asOf)! > instant(previous.asOf)!) {
        const temp = path.join(directory, `.latest-${snapshot.snapshotId}.tmp`);
        await writeFile(temp, snapshot.snapshotId + "\n", { flag: "w" }); await rename(temp, path.join(directory, "latest.txt"));
      }
      diagnostic({ code: error?.code ?? output?.systemState ?? "V2_UNAVAILABLE", snapshotId: snapshot.snapshotId });
    });
    publication = publish.then(() => undefined, () => undefined);
    try { await publish; } finally { pendingPublications--; }
  } catch (error) { diagnostic({ code: error instanceof Error ? error.message : "SHADOW_INFRASTRUCTURE_FAILURE" }); }
  };
  // Resource deadline, never a data freshness TTL. Outstanding I/O remains bounded.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = shadowWork().finally(() => { activeSidecars--; });
  const requested = options.timeoutMs ?? SHADOW_IO_TIMEOUT_MS;
  const budget = Number.isFinite(requested) && requested > 0 ? Math.min(requested, SHADOW_IO_TIMEOUT_MS) : SHADOW_IO_TIMEOUT_MS;
  try { await Promise.race([work, new Promise<void>(resolve => { timer = setTimeout(() => { diagnostic({ code: "SHADOW_IO_TIMEOUT" }); resolve(); }, budget); })]); }
  finally { clearTimeout(timer); }
  if (failed) throw v1Failure;
  return value!;
}
