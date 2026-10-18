import { constants } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, realpath, rename, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export type JobStorageCode = "STORAGE_NOT_CONFIGURED" | "STORAGE_INVALID_CONFIG" | "STORAGE_INVALID_KEY" | "STORAGE_INVALID_JSON" | "STORAGE_CORRUPT" | "STORAGE_CONFLICT" | "CRITICAL_IDENTITY_COLLISION" | "PUBLICATION_CONFLICT" | "STORAGE_LOCKED" | "STORAGE_LOCK_REQUIRED" | "STORAGE_MISSING_OBSERVATION" | "STORAGE_IO" | "STORAGE_PREFLIGHT_FAILED";
export class JobStorageError extends Error {
  readonly code: JobStorageCode;
  constructor(code: JobStorageCode, message: string) { super(message); this.name = "JobStorageError"; this.code = code; }
}
export type JobLatest = { expectedSession: string; asOf: string; observationId: string; observationKey: string; compatibility?: string };
export type JobCreateResult = { status: "CREATED" | "UNCHANGED"; contentHash: string };
export type JobLatestResult = { status: "CREATED" | "UNCHANGED" | "ADVANCED" | "STALE"; latest: JobLatest };
export interface JobStorageTransaction {
  readJson<T = unknown>(key: string): Promise<T | null>;
  createJson(key: string, value: unknown): Promise<JobCreateResult>;
  putLatest(key: string, value: JobLatest): Promise<JobLatestResult>;
}
export type StoragePreflight = { kind: JobStorage["kind"]; operational: boolean; checks: Record<string, "PASS"> };
export interface JobStorage extends JobStorageTransaction {
  readonly kind: "TEST_FILESYSTEM" | "LOCAL_FILESYSTEM" | "S3";
  readonly operational: boolean;
  preflight(): Promise<StoragePreflight>;
  // Only local filesystems expose this capability. S3 uses per-object conditions,
  // never a simulated global lock or a multi-object atomicity claim.
  withExclusive?<T>(work: (transaction: JobStorageTransaction) => Promise<T>): Promise<T>;
}
export interface LocalJobStorage extends JobStorage {
  withExclusive<T>(work: (transaction: JobStorageTransaction) => Promise<T>): Promise<T>;
}
const MAX_BYTES = 32 * 1024 * 1024;
const SCHEMA = "regime-v2-job-object/1.0.0";
function fail(code: JobStorageCode, message: string): never { throw new JobStorageError(code, message); }
function isCode(error: unknown, code: string) { return !!error && typeof error === "object" && "code" in error && error.code === code; }
function inside(candidate: string, root: string) { return candidate === root || candidate.startsWith(root + path.sep); }

// Reject non-JSON values instead of silently losing undefined, NaN or prototypes.
function jsonBytes(value: unknown, seen = new Set<object>(), depth = 0): string {
  if (depth > 100) fail("STORAGE_INVALID_JSON", "JSON nesting exceeds the storage bound");
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || value === null || seen.has(value)) fail("STORAGE_INVALID_JSON", "Expected finite, acyclic plain JSON");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail("STORAGE_INVALID_JSON", "Expected plain JSON objects");
  seen.add(value);
  if (Object.getOwnPropertySymbols(value).length) fail("STORAGE_INVALID_JSON", "Symbol properties are not JSON records");
  let result: string;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) fail("STORAGE_INVALID_JSON", "Sparse or decorated arrays are not JSON records");
    result = `[${Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, index);
      if (!descriptor || !("value" in descriptor)) fail("STORAGE_INVALID_JSON", "Sparse arrays or accessors are not JSON records");
      return jsonBytes(descriptor.value, seen, depth + 1);
    }).join(",")}]`;
  } else {
    result = `{${Object.keys(value).sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) fail("STORAGE_INVALID_JSON", "Accessors are not JSON records");
      return `${JSON.stringify(key)}:${jsonBytes(descriptor.value, seen, depth + 1)}`;
    }).join(",")}}`;
  }
  seen.delete(value);
  if (Buffer.byteLength(result) > MAX_BYTES) fail("STORAGE_INVALID_JSON", "JSON exceeds the storage byte bound");
  return result;
}
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function encode(value: unknown) {
  const body = jsonBytes(value), contentHash = digest(body);
  const bytes = `{"schemaVersion":${JSON.stringify(SCHEMA)},"contentHash":${JSON.stringify(contentHash)},"value":${body}}\n`;
  if (Buffer.byteLength(bytes) > MAX_BYTES) fail("STORAGE_INVALID_JSON", "Object envelope exceeds the storage byte bound");
  return { bytes, contentHash };
}
function decode(bytes: string): unknown {
  try {
    const record = JSON.parse(bytes);
    if (!record || record.schemaVersion !== SCHEMA || typeof record.contentHash !== "string" || Object.keys(record).sort().join(",") !== "contentHash,schemaVersion,value") fail("STORAGE_CORRUPT", "Invalid stored object envelope");
    if (encode(record.value).bytes !== bytes || digest(jsonBytes(record.value)) !== record.contentHash) fail("STORAGE_CORRUPT", "Stored object bytes do not match their identity");
    return record.value;
  } catch (error) {
    if (error instanceof JobStorageError && error.code === "STORAGE_CORRUPT") throw error;
    return fail("STORAGE_CORRUPT", "Unreadable or invalid stored JSON");
  }
}
function keyParts(key: string) {
  const parts = typeof key === "string" ? key.split("/") : [];
  if (!parts.length || parts.length > 20 || key.length > 1024 || !key.endsWith(".json") || parts.some(part => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(part))) fail("STORAGE_INVALID_KEY", "Expected a bounded relative JSON object key");
  return parts;
}
function latest(value: unknown): asserts value is JobLatest {
  if (!value || typeof value !== "object") fail("STORAGE_CORRUPT", "Invalid latest pointer");
  const item = value as JobLatest;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.expectedSession) || !Number.isFinite(Date.parse(item.expectedSession)) || new Date(item.expectedSession).toISOString().slice(0, 10) !== item.expectedSession || typeof item.asOf !== "string" || !Number.isFinite(Date.parse(item.asOf)) || !item.asOf.endsWith("Z") || typeof item.observationId !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(item.observationId)) fail("STORAGE_CORRUPT", "Invalid latest identity or ordering fields");
  keyParts(item.observationKey);
  if (item.observationKey.startsWith("latest/") || item.observationKey.startsWith("regime-v2/indexes/")) fail("STORAGE_CORRUPT", "Latest must reference an immutable observation");
  if (item.compatibility !== undefined && !/^[a-f0-9]{64}$/.test(item.compatibility)) fail("STORAGE_CORRUPT", "Invalid version compatibility identity");
}

export function compareJobLatest(prior: JobLatest, value: JobLatest): "UNCHANGED" | "STALE" | "ADVANCED" {
  latest(prior); latest(value);
  if (prior.compatibility !== value.compatibility) fail("STORAGE_CONFLICT", "Latest version compatibility changed; operator review required");
  if (prior.observationId === value.observationId && prior.observationKey === value.observationKey) return "UNCHANGED";
  const order = value.expectedSession.localeCompare(prior.expectedSession) || Date.parse(value.asOf) - Date.parse(prior.asOf);
  if (order < 0) return "STALE";
  if (order === 0) fail("STORAGE_CONFLICT", "Different observations cannot occupy the same canonical session and asOf");
  return "ADVANCED";
}
// One canonical envelope shared by both adapters; snapshots retain their own
// unchanged Maintainer identity inside the value.
export const jobObjectCodec = { encode, decode, validateKey: keyParts, validateLatest: (value: unknown): void => latest(value), maxBytes: MAX_BYTES };

/** Configuration is explicit. Importing the module never obtains credentials or
 * makes network requests; missing production configuration never falls back. */
export async function createProductionJobStore(config?: { region?: string; bucket?: string; roleArn?: string }): Promise<JobStorage> {
  const selected = config ?? { region: process.env.AWS_REGION, bucket: process.env.S3_BUCKET, roleArn: process.env.SHADOW_ROLE_ARN };
  if (!selected.region || !selected.bucket || !selected.roleArn) return fail("STORAGE_NOT_CONFIGURED", "AWS_REGION, S3_BUCKET and SHADOW_ROLE_ARN are required");
  const { createS3JobStore } = await import("./s3-storage.ts");
  return createS3JobStore({ region: selected.region, bucket: selected.bucket, roleArn: selected.roleArn });
}

/** Explicit TEST/LOCAL filesystem adapter only; not evidence of deployment durability.
 * Every cooperating process uses the same directory lock. Abandoned locks are never
 * reclaimed automatically: after a crash, an operator must establish no live writer.
 */
export async function createLocalJobStore(config: { mode: "TEST" | "LOCAL"; directory: string; repositoryRoot?: string; lockWaitMs?: number }): Promise<LocalJobStorage> {
  if (process.env.GITHUB_ACTIONS === "true") fail("STORAGE_INVALID_CONFIG", "Filesystem storage is not a GitHub Actions backing");
  if (!config || !["TEST", "LOCAL"].includes(config.mode) || !path.isAbsolute(config.directory ?? "") || !Number.isFinite(config.lockWaitMs ?? 5000) || (config.lockWaitMs ?? 5000) < 0 || (config.lockWaitMs ?? 5000) > 60000) fail("STORAGE_INVALID_CONFIG", "Explicit TEST/LOCAL private directory and bounded lock wait required");
  const repository = await realpath(config.repositoryRoot ?? fileURLToPath(new URL("../../../", import.meta.url)));
  let ancestor = path.resolve(config.directory);
  for (;;) { try { ancestor = await realpath(ancestor); break; } catch (error) { if (!isCode(error, "ENOENT") || path.dirname(ancestor) === ancestor) throw error; ancestor = path.dirname(ancestor); } }
  if (inside(path.resolve(config.directory), repository) || inside(ancestor, repository)) fail("STORAGE_INVALID_CONFIG", "Private local store must be outside the repository and public serving roots");
  await mkdir(config.directory, { recursive: true, mode: 0o700 });
  const directory = await realpath(config.directory), rootInfo = await lstat(directory);
  if (inside(directory, repository) || !rootInfo.isDirectory() || (rootInfo.mode & 0o077) !== 0) fail("STORAGE_INVALID_CONFIG", "Local store must be a private directory (0700)");

  async function filename(key: string, createParents = false) {
    const parts = keyParts(key);
    if (await realpath(directory) !== directory) fail("STORAGE_INVALID_CONFIG", "Local storage root was replaced");
    let parent = directory;
    for (const part of parts.slice(0, -1)) {
      parent = path.join(parent, part);
      if (createParents) await mkdir(parent, { mode: 0o700 }).catch(error => { if (!isCode(error, "EEXIST")) throw error; });
      try { const info = await lstat(parent); if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) fail("STORAGE_INVALID_CONFIG", "Unsafe object directory"); }
      catch (error) { if (!createParents && isCode(error, "ENOENT")) return path.join(directory, ...parts); throw error; }
    }
    return path.join(directory, ...parts);
  }
  async function read<T>(key: string): Promise<T | null> {
    const target = await filename(key);
    let handle;
    try { handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW); }
    catch (error) { if (isCode(error, "ENOENT")) return null; throw error; }
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > MAX_BYTES || (info.mode & 0o077) !== 0) fail("STORAGE_CORRUPT", "Unsafe or oversized stored object");
      const bytes = await handle.readFile();
      if (!Buffer.from(bytes.toString("utf8"), "utf8").equals(new Uint8Array(bytes))) fail("STORAGE_CORRUPT", "Stored object is not lossless UTF-8");
      return decode(bytes.toString("utf8")) as T;
    } finally { await handle.close(); }
  }
  async function temporary(target: string, bytes: string) {
    const name = path.join(path.dirname(target), `.pending-${randomUUID()}`), handle = await open(name, "wx", 0o600);
    try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { await handle.close(); await unlink(name).catch(() => {}); throw error; }
    await handle.close(); return name;
  }
  async function create(key: string, value: unknown): Promise<JobCreateResult> {
    if (keyParts(key)[0] === "latest" || key.startsWith("regime-v2/indexes/")) fail("STORAGE_INVALID_KEY", "Mutable latest pointers require conditional publication");
    const encoded = encode(value), target = await filename(key, true), staged = await temporary(target, encoded.bytes);
    let status: JobCreateResult["status"] = "CREATED";
    try {
      try { await link(staged, target); }
      catch (error) {
        if (!isCode(error, "EEXIST")) throw error;
        const existing = await read(key);
        if (encode(existing).bytes !== encoded.bytes) fail("CRITICAL_IDENTITY_COLLISION", "Immutable object key already contains different bytes");
        status = "UNCHANGED";
      }
      if (encode(await read(key)).bytes !== encoded.bytes) fail("STORAGE_CORRUPT", "Published object failed read verification");
      return { status, contentHash: encoded.contentHash };
    } finally { await unlink(staged); }
  }
  const lockDirectory = path.join(directory, ".writer-lock");
  async function exclusive<T>(work: (transaction: JobStorageTransaction) => Promise<T>): Promise<T> {
    const deadline = Date.now() + (config.lockWaitMs ?? 5000), token = randomUUID();
    for (;;) {
      try { await mkdir(lockDirectory, { mode: 0o700 }); break; }
      catch (error) {
        if (!isCode(error, "EEXIST")) throw error;
        if (Date.now() >= deadline) fail("STORAGE_LOCKED", "Another or abandoned writer owns the directory; no automatic stale-lock recovery");
        await delay(Math.min(25, Math.max(1, deadline - Date.now())));
      }
    }
    const ownerFile = path.join(lockDirectory, "owner.json");
    let active = true;
    const owner = JSON.stringify({ token, pid: process.pid });
    const ownerHandle = await open(ownerFile, "wx", 0o600);
    try { await ownerHandle.writeFile(owner); await ownerHandle.sync(); } finally { await ownerHandle.close(); }
    async function assertOwner() { if (!active || await readFile(ownerFile, "utf8") !== owner) fail("STORAGE_LOCK_REQUIRED", "Transaction is no longer the exclusive writer"); }
    const pending = new Set<Promise<unknown>>();
    let queue: Promise<unknown> = Promise.resolve();
    function guarded<R>(operation: () => Promise<R>): Promise<R> {
      const promise = queue.then(async () => { await assertOwner(); return operation(); });
      queue = promise.catch(() => {});
      pending.add(promise); promise.then(() => pending.delete(promise), () => pending.delete(promise)); return promise;
    }
    const tx: JobStorageTransaction = {
      readJson: <R>(key: string) => guarded(() => read<R>(key)),
      createJson: (key, value) => guarded(() => create(key, value)),
      putLatest: (key, value) => guarded(async () => {
        if (keyParts(key)[0] !== "latest" && key !== "regime-v2/indexes/latest.json") fail("STORAGE_INVALID_KEY", "Latest pointer must use the reviewed index namespace");
        latest(value);
        const observation = await read<{ observationId?: string }>(value.observationKey);
        if (!observation || observation.observationId !== value.observationId) fail("STORAGE_MISSING_OBSERVATION", "Publish and verify the matching immutable observation before latest");
        const prior = await read<JobLatest>(key);
        if (prior) {
          const order = compareJobLatest(prior, value);
          if (order !== "ADVANCED") return { status: order, latest: prior };
        }
        const target = await filename(key, true), encoded = encode(value), staged = await temporary(target, encoded.bytes);
        try { await assertOwner(); await rename(staged, target); }
        catch (error) { await unlink(staged).catch(() => {}); throw error; }
        if (encode(await read(key)).bytes !== encoded.bytes) fail("STORAGE_CORRUPT", "Latest publication failed read verification");
        return { status: prior ? "ADVANCED" : "CREATED", latest: value };
      }),
    };
    try { return await work(tx); }
    finally {
      await Promise.allSettled([...pending]); active = false;
      if (await readFile(ownerFile, "utf8") !== owner) fail("STORAGE_LOCK_REQUIRED", "Writer ownership changed; refusing to remove another lock");
      await unlink(ownerFile); await rmdir(lockDirectory);
    }
  }
  const kind = config.mode === "TEST" ? "TEST_FILESYSTEM" as const : "LOCAL_FILESYSTEM" as const;
  return { kind, operational: false, preflight: async () => ({ kind, operational: false, checks: { LOCAL_ONLY: "PASS" } }), readJson: read, createJson: create, putLatest: (key, value) => exclusive(tx => tx.putLatest(key, value)), withExclusive: exclusive };
}
