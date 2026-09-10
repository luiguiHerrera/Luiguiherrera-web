// Server-only persistence infrastructure. The caller supplies its existing source
// fetch; no second provider fetcher or public scheduler is installed by Builder.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bytesHash, canonical, freeze, hash } from "./math.ts";
import { instant } from "./temporal.ts";
import type { Temporal } from "./types.ts";
export type CaptureRecord = { captureId: string; sourceId: string; sourceVersion: string; sourceUrl: string; startedAt: string; completedAt: string; rawHash: string; rawBase64: string; origin: "PROSPECTIVE" | "R2_IMPORT"; metadata: Temporal };
export function captureScope() {
  const inFlight = new Map<string, Promise<CaptureRecord>>();
  return {
    capture(request: { sourceId: string; sourceVersion: string; sourceUrl: string; origin: "PROSPECTIVE" | "R2_IMPORT" }, existingFetch: () => Promise<Uint8Array>): Promise<CaptureRecord> {
      const key = canonical(request);
      const prior = inFlight.get(key); if (prior) return prior;
      const task = (async () => {
        if (!request.sourceId || !request.sourceVersion || !/^https:\/\//.test(request.sourceUrl)) throw new Error("Capture requires an explicit versioned source");
        const startedAt = new Date().toISOString(), bytes = await existingFetch(), completedAt = new Date().toISOString();
        if (instant(completedAt)! < instant(startedAt)!) throw new Error("Capture clock moved backwards");
        const rawHash = bytesHash(bytes);
        const metadata: Temporal = { sourceId: request.sourceId, sourceVersion: request.sourceVersion, vintageHash: rawHash, sourcePublishedAt: null, capturedAt: completedAt, availableAt: completedAt, availabilityCertainty: "CONSERVATIVE_BOUND", availabilityEvidence: "ACTUAL_CAPTURE_COMPLETED", replayClass: request.origin === "PROSPECTIVE" ? "R0" : "R2", status: "AVAILABLE" };
        const payload = { ...request, startedAt, completedAt, rawHash, rawBase64: Buffer.from(bytes).toString("base64"), metadata };
        return freeze({ ...payload, captureId: hash(payload) });
      })();
      inFlight.set(key, task); return task;
    },
  };
}
export async function persistCapture(directory: string, capture: CaptureRecord): Promise<string> {
  const { captureId, ...body } = capture;
  if (hash(body) !== captureId || bytesHash(new Uint8Array(Buffer.from(capture.rawBase64, "base64"))) !== capture.rawHash) throw new Error("Invalid capture hash");
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, captureId + ".json"), bytes = canonical(capture) + "\n";
  try { await writeFile(filename, bytes, { flag: "wx" }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(filename, "utf8") !== bytes) throw error; }
  return filename;
}
export async function readCapture(filename: string): Promise<CaptureRecord> {
  const capture = JSON.parse(await readFile(filename, "utf8")) as CaptureRecord;
  const { captureId, ...body } = capture;
  if (hash(body) !== captureId || bytesHash(new Uint8Array(Buffer.from(capture.rawBase64, "base64"))) !== capture.rawHash) throw new Error("Corrupt immutable capture");
  return freeze(capture);
}
