// Operational boundary only: no engine imports, provider acquisition or shell.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compareJobLatest, jobObjectCodec, JobStorageError, type JobCreateResult, type JobLatest, type JobLatestResult, type JobStorage, type StoragePreflight } from "./job-storage.ts";

export const S3_LATEST_KEY = "regime-v2/indexes/latest.json";
export type AwsCliResult = { exitCode: number; stdout: string; stderr: string };
export type AwsCliExecutor = (arguments_: readonly string[], timeoutMs: number) => Promise<AwsCliResult>;
export type S3StorageConfig = { region: string; bucket: string; roleArn: string; timeoutMs?: number; maxCasAttempts?: number; executor?: AwsCliExecutor };
const ACCOUNT = "732159826922";
const BUCKET = "lh-regime-v2-shadow-732159826922-us-east-1";
const ROLE = `arn:aws:iam::${ACCOUNT}:role/RegimeV2ShadowWriter`;
function fail(code: ConstructorParameters<typeof JobStorageError>[0], detail: string): never { throw new JobStorageError(code, detail); }

/** The only production process boundary. Credential values and raw CLI errors
 * are never copied into diagnostics. AWS retries are disabled independently of
 * the explicitly bounded application-level latest CAS conflict loop. */
export const executeAwsCli: AwsCliExecutor = (arguments_, timeoutMs) => new Promise(resolve => {
  execFile("aws", [...arguments_], { timeout: timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true,
    env: { ...process.env, AWS_MAX_ATTEMPTS: "1", AWS_RETRY_MODE: "standard", AWS_EC2_METADATA_DISABLED: "true", AWS_PAGER: "", AWS_CLI_ERROR_FORMAT: "legacy" } },
  (error, stdout, stderr) => resolve({ exitCode: error ? typeof error.code === "number" ? error.code : 1 : 0, stdout: String(stdout), stderr: String(stderr) }));
});
function key(value: string, index = false) {
  jobObjectCodec.validateKey(value);
  if (index ? value !== S3_LATEST_KEY : !/^regime-v2\/(observations|runs)\//.test(value)) fail("STORAGE_INVALID_KEY", "Only reviewed observation, attempt and exact latest keys are allowed");
}
type Stored = { value: unknown; bytes: string; etag: string; versionId: string };

/** Constructor is side-effect free. Only preflight/operations invoke the CLI;
 * executor injection is for offline contract tests and is not a workflow input. */
export function createS3JobStore(config: S3StorageConfig): JobStorage {
  if (!config?.region || !config.bucket || !config.roleArn) fail("STORAGE_NOT_CONFIGURED", "Complete S3 writer configuration is required");
  if (config.region !== "us-east-1" || config.bucket !== BUCKET || config.roleArn !== ROLE) fail("STORAGE_INVALID_CONFIG", "S3 configuration differs from the approved shadow writer resources");
  const timeoutMs = config.timeoutMs ?? 15000, maxCasAttempts = config.maxCasAttempts ?? 4;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || !Number.isInteger(maxCasAttempts) || maxCasAttempts < 1 || maxCasAttempts > 8) fail("STORAGE_INVALID_CONFIG", "Bounded CLI timeout and CAS attempt count are required");
  const executor = config.executor ?? executeAwsCli;
  let preflightResult: Promise<StoragePreflight> | undefined;
  async function call(service: string, operation: string, args: string[] = [], expected: string[] = []) {
    let completed: AwsCliResult;
    try {
      completed = await executor([service, operation, "--region", config.region, "--output", "json", "--no-cli-pager", "--cli-connect-timeout", "10", "--cli-read-timeout", "10",
        ...(service === "s3api" ? ["--bucket", config.bucket, "--expected-bucket-owner", ACCOUNT] : []), ...args], timeoutMs);
    } catch { return fail("STORAGE_IO", `${operation}: CLI unavailable or timed out`); }
    if (completed.exitCode !== 0) {
      let code = /An error occurred \(([A-Za-z0-9_.-]{1,80})\)/.exec(completed.stderr)?.[1];
      if (!code) {
        try {
          const parsed = JSON.parse(completed.stderr);
          const candidate = parsed.Error?.Code ?? parsed.Code ?? parsed.code;
          if (typeof candidate === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(candidate)) code = candidate;
        } catch { /* Only a bounded error class may leave this boundary. */ }
      }
      code ??= "UNCLASSIFIED_AWS_ERROR";
      if (expected.includes(code)) return { awsError: code };
      return fail("STORAGE_IO", `${operation}: ${code}`);
    }
    try { return JSON.parse(completed.stdout || "{}") as Record<string, unknown>; }
    catch { return fail("STORAGE_IO", `${operation}: invalid CLI JSON`); }
  }
  async function verifyPreflight(): Promise<StoragePreflight> {
    try {
      const version = await executor(["--version"], timeoutMs);
      if (version.exitCode !== 0 || !/^aws-cli\/2\.[0-9]+\.[0-9]+(?:\s|$)/.test(version.stdout + version.stderr)) fail("STORAGE_PREFLIGHT_FAILED", "AWS CLI v2 is required");
      const skeleton = await executor(["s3api", "put-object", "--generate-cli-skeleton", "input"], timeoutMs);
      const fields = JSON.parse(skeleton.stdout);
      if (skeleton.exitCode !== 0 || !["IfNoneMatch", "IfMatch", "ExpectedBucketOwner"].every(field => field in fields)) fail("STORAGE_PREFLIGHT_FAILED", "AWS CLI conditional write support is required");
      const identity = await call("sts", "get-caller-identity");
      if (identity.Account !== ACCOUNT || typeof identity.Arn !== "string" || !identity.Arn.startsWith(`arn:aws:sts::${ACCOUNT}:assumed-role/RegimeV2ShadowWriter/`) || identity.Arn.slice(identity.Arn.lastIndexOf("/") + 1).length === 0) fail("STORAGE_PREFLIGHT_FAILED", "Caller must be the approved assumed shadow writer role");
      const versioning = await call("s3api", "get-bucket-versioning");
      if (versioning.Status !== "Enabled") fail("STORAGE_PREFLIGHT_FAILED", "Bucket versioning must be enabled");
      const publicAccess = (await call("s3api", "get-public-access-block")).PublicAccessBlockConfiguration as Record<string, unknown> | undefined;
      if (!["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"].every(field => publicAccess?.[field] === true)) fail("STORAGE_PREFLIGHT_FAILED", "All public access controls must be enabled");
      const encryption = (await call("s3api", "get-bucket-encryption")).ServerSideEncryptionConfiguration as { Rules?: { ApplyServerSideEncryptionByDefault?: { SSEAlgorithm?: string } }[] } | undefined;
      if (encryption?.Rules?.length !== 1 || encryption.Rules[0].ApplyServerSideEncryptionByDefault?.SSEAlgorithm !== "AES256") fail("STORAGE_PREFLIGHT_FAILED", "The approved SSE-S3 encryption policy is required");
      return { kind: "S3", operational: true, checks: { AWS_CLI_V2: "PASS", CONDITIONAL_CLI_SUPPORT: "PASS", SHADOW_WRITER_IDENTITY: "PASS", VERSIONING: "PASS", PUBLIC_ACCESS_BLOCK: "PASS", ENCRYPTION: "PASS" } };
    } catch (error) {
      if (error instanceof JobStorageError) throw error;
      return fail("STORAGE_PREFLIGHT_FAILED", "S3 preflight could not validate the approved configuration");
    }
  }
  function preflight() { return preflightResult ??= verifyPreflight(); }
  async function temporary<T>(work: (directory: string) => Promise<T>) {
    const directory = await mkdtemp(path.join(os.tmpdir(), "regime-v2-s3-"));
    try { return await work(directory); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }
  async function get(objectKey: string): Promise<Stored | null> {
    return temporary(async directory => {
      const filename = path.join(directory, "object.json");
      const response = await call("s3api", "get-object", ["--key", objectKey, "--range", `bytes=0-${jobObjectCodec.maxBytes}`, filename], ["NoSuchKey", "AccessDenied"]);
      if (response.awsError === "NoSuchKey") return null;
      if (response.awsError === "AccessDenied") {
        // Without unrestricted ListBucket, S3 can return 403 for an absent key.
        // Only the separately authorized exact-key bounded list can establish
        // absence. A present object or a failed list keeps the read failure.
        const listed = await call("s3api", "list-objects-v2", ["--prefix", objectKey, "--max-keys", "1", "--no-paginate"]);
        const entries = listed.Contents ?? [];
        if (!Array.isArray(entries) || entries.length > 1 || listed.KeyCount !== entries.length || listed.IsTruncated === true) fail("STORAGE_CORRUPT", "Exact-key existence response was ambiguous");
        if (entries.length === 0) return null;
        if (!entries[0] || typeof entries[0] !== "object" || entries[0].Key !== objectKey) fail("STORAGE_CORRUPT", "Existence response did not name the exact requested key");
        return fail("STORAGE_IO", "get-object: AccessDenied for an existing object");
      }
      if (typeof response.ETag !== "string" || !response.ETag || typeof response.VersionId !== "string" || !response.VersionId || response.VersionId === "null") fail("STORAGE_CORRUPT", "Read lacks versioned object identity");
      const info = await stat(filename);
      if (!info.isFile() || info.size > jobObjectCodec.maxBytes) fail("STORAGE_CORRUPT", "Stored object exceeds the read boundary");
      const raw = await readFile(filename), bytes = raw.toString("utf8");
      if (!Buffer.from(bytes).equals(new Uint8Array(raw))) fail("STORAGE_CORRUPT", "Stored object is not lossless UTF-8");
      return { value: jobObjectCodec.decode(bytes), bytes, etag: response.ETag, versionId: response.VersionId };
    });
  }
  async function put(objectKey: string, bytes: string, condition: string[]) {
    return temporary(async directory => {
      const filename = path.join(directory, "object.json");
      await writeFile(filename, bytes, { mode: 0o600, flag: "wx" });
      return call("s3api", "put-object", ["--key", objectKey, "--body", filename, "--content-type", "application/json", ...condition], ["PreconditionFailed", "ConditionalRequestConflict"]);
    });
  }
  async function readJson<T>(objectKey: string): Promise<T | null> {
    key(objectKey, objectKey === S3_LATEST_KEY); await preflight();
    return (await get(objectKey))?.value as T ?? null;
  }
  async function createJson(objectKey: string, value: unknown): Promise<JobCreateResult> {
    key(objectKey); const encoded = jobObjectCodec.encode(value); await preflight();
    const response = await put(objectKey, encoded.bytes, ["--if-none-match", "*"]);
    if (response.awsError === "ConditionalRequestConflict") fail("PUBLICATION_CONFLICT", "Concurrent immutable creation did not establish a canonical object");
    const existing = await get(objectKey);
    if (!existing) fail("STORAGE_CORRUPT", "Conditional create lacks immediate readback");
    if (existing.bytes !== encoded.bytes) fail("CRITICAL_IDENTITY_COLLISION", "Immutable identity contains incompatible canonical bytes");
    if (!response.awsError && (typeof response.VersionId !== "string" || response.VersionId !== existing.versionId)) fail("STORAGE_CORRUPT", "Created version differs from the readback version");
    return { status: response.awsError ? "UNCHANGED" : "CREATED", contentHash: encoded.contentHash };
  }
  async function putLatest(objectKey: string, value: JobLatest): Promise<JobLatestResult> {
    key(objectKey, true); jobObjectCodec.validateLatest(value); key(value.observationKey);
    if (!value.observationKey.startsWith("regime-v2/observations/") || !value.compatibility) fail("STORAGE_INVALID_KEY", "Latest requires a version-compatible observation identity");
    await preflight();
    async function verifyPointed(pointer: JobLatest) {
      jobObjectCodec.validateLatest(pointer); key(pointer.observationKey);
      if (!pointer.observationKey.startsWith("regime-v2/observations/")) fail("STORAGE_INVALID_KEY", "Latest requires an observation key");
      const observation = await get(pointer.observationKey);
      const data = observation?.value as { kind?: string; observationId?: string; expectedSession?: string; asOf?: string; compatibility?: string } | undefined;
      if (!data || data.kind !== "ECONOMIC_OBSERVATION" || data.observationId !== pointer.observationId || data.expectedSession !== pointer.expectedSession || data.asOf !== pointer.asOf || data.compatibility !== pointer.compatibility)
        fail("STORAGE_MISSING_OBSERVATION", "Read-verify the exact observation identity, compatibility and decision cut before latest");
    }
    await verifyPointed(value);
    const encoded = jobObjectCodec.encode(value);
    for (let attempt = 0; attempt < maxCasAttempts; attempt++) {
      const prior = await get(objectKey);
      if (prior) {
        const priorValue = prior.value as JobLatest; await verifyPointed(priorValue);
        const order = compareJobLatest(priorValue, value);
        if (order !== "ADVANCED") return { status: order, latest: priorValue };
      }
      const response = await put(objectKey, encoded.bytes, prior ? ["--if-match", prior.etag] : ["--if-none-match", "*"]);
      if (response.awsError) continue; // reread and reevaluate; never blind overwrite
      if (typeof response.VersionId !== "string" || !response.VersionId || response.VersionId === "null") fail("STORAGE_CORRUPT", "Latest write lacks a version identity");
      const actual = await get(objectKey);
      if (!actual) fail("STORAGE_CORRUPT", "Latest write lacks immediate readback");
      if (actual.bytes === encoded.bytes && actual.versionId === response.VersionId) return { status: prior ? "ADVANCED" : "CREATED", latest: value };
      // A cooperating newer writer may advance between our CAS and readback.
      // Verify its envelope, compatibility and order; retain it without rewind.
      const actualValue = actual.value as JobLatest; await verifyPointed(actualValue);
      const order = compareJobLatest(actualValue, value);
      if (order === "STALE" || order === "UNCHANGED") return { status: order, latest: actualValue };
      fail("STORAGE_CORRUPT", "Latest readback regressed or changed incompatible bytes");
    }
    return fail("PUBLICATION_CONFLICT", "Latest CAS attempts exhausted after bounded reread and monotonicity checks");
  }
  return { kind: "S3", operational: true, preflight, readJson, createJson, putLatest };
}
