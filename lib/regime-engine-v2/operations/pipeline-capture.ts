/** Observation tap around existing fetches. Never supplies values back to V1. */
import { AsyncLocalStorage } from "node:async_hooks";
import { persistCapture } from "../capture.ts";
import type { CaptureRecord } from "../capture.ts";
import { bytesHash, freeze, hash } from "../math.ts";

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;
const MAX_SCOPE_BYTES = 32 * 1024 * 1024;
const MAX_SCOPE_CAPTURES = 32;
type Scope = { captures: CaptureRecord[]; issues: string[]; bytes: number };
const scopes = new AsyncLocalStorage<Scope>();
export function pipelineScope() {
  const scope: Scope = { captures: [], issues: [], bytes: 0 };
  return { ...scope, run: <T>(work: () => Promise<T>) => scopes.run(scope, work) };
}
export type FetchIdentity = { sourceId: string; sourceVersion: string; sourceUrl: string };
export function observedCapture(identity: FetchIdentity, bytes: Uint8Array, startedAt: string, completedAt: string): CaptureRecord {
  if (bytes.byteLength > MAX_CAPTURE_BYTES) throw new Error("CAPTURE_SIZE_LIMIT");
  const rawHash = bytesHash(bytes);
  const payload = { ...identity, startedAt, completedAt, rawHash, rawBase64: Buffer.from(bytes).toString("base64"), origin: "PROSPECTIVE" as const,
    metadata: { sourceId: identity.sourceId, sourceVersion: identity.sourceVersion, vintageHash: rawHash, sourcePublishedAt: null, capturedAt: completedAt, availableAt: completedAt,
      availabilityCertainty: "CONSERVATIVE_BOUND" as const, availabilityEvidence: "ACTUAL_RESPONSE_BYTES_OBTAINED; PUBLICATION_UNKNOWN; ROW_REPLAY_ELIGIBILITY_NOT_ESTABLISHED", replayClass: "UNKNOWN" as const, status: "AVAILABLE" } };
  return freeze({ ...payload, captureId: hash(payload) });
}
export async function readObservedResponse(response: Response, identity: FetchIdentity): Promise<string> {
  const scope = scopes.getStore();
  if (!scope) return response.text();
  // TextDecoder follows Response.text UTF-8/BOM behavior; raw bytes remain exact.
  const startedAt = new Date().toISOString(), bytes = new Uint8Array(await response.arrayBuffer());
  const completedAt = new Date().toISOString(), text = new TextDecoder().decode(bytes);
  try {
    if (!response.ok) scope.issues.push(`HTTP_${response.status}:${identity.sourceId}`);
    else if (scope.captures.length >= MAX_SCOPE_CAPTURES || scope.bytes + bytes.byteLength > MAX_SCOPE_BYTES) scope.issues.push("CAPTURE_SCOPE_LIMIT");
    else { scope.captures.push(observedCapture(identity, bytes, startedAt, completedAt)); scope.bytes += bytes.byteLength; }
  } catch { scope.issues.push(`CAPTURE_REJECTED:${identity.sourceId}`); }
  return text;
}
/** Explicit existing batch-pipeline tap; failure is logged and cannot change V1 parsing. */
export async function persistBatchObservation(identity: FetchIdentity, bytes: Uint8Array, startedAt: string, completedAt: string, directory: string) {
  return persistCapture(directory, observedCapture(identity, bytes, startedAt, completedAt));
}
