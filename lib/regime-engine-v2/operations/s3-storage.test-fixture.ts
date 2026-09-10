// Offline CLI-shaped S3 service. It cannot make network requests or execute AWS.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createS3JobStore, type AwsCliExecutor, type AwsCliResult } from "./s3-storage.ts";
import { jobObjectCodec } from "./job-storage.ts";

export const TEST_S3_CONFIG = { region: "us-east-1", bucket: "lh-regime-v2-shadow-732159826922-us-east-1", roleArn: "arn:aws:iam::732159826922:role/RegimeV2ShadowWriter" };
type ObjectRecord = { bytes: string; etag: string; versionId: string };
export class FakeS3 {
  readonly objects = new Map<string, ObjectRecord>();
  readonly calls: { args: string[]; timeoutMs: number }[] = [];
  missing403 = true;
  jsonErrors = false;
  denyList = false;
  denyReads = new Set<string>();
  denyWrites = new Set<string>();
  corruptReads = new Set<string>();
  wrongReadVersions = new Set<string>();
  latestConflicts = 0;
  cliVersion = "aws-cli/2.36.40 Python/3 fake-offline";
  conditionalCli = true;
  callerRole = "RegimeV2ShadowWriter";
  versioning = "Enabled";
  publicAccess = true;
  encryption = "AES256";
  beforePut?: (key: string, args: readonly string[]) => Promise<void>;
  private sequence = 0;
  putRaw(key: string, bytes: string) {
    const object = { bytes, etag: `"${createHash("sha256").update(bytes).digest("hex")}"`, versionId: `version-${++this.sequence}` };
    this.objects.set(key, object); return object;
  }
  value(key: string) { const item = this.objects.get(key); return item ? jobObjectCodec.decode(item.bytes) : null; }
  store(options: { maxCasAttempts?: number } = {}) { return createS3JobStore({ ...TEST_S3_CONFIG, ...options, executor: this.execute }); }
  execute: AwsCliExecutor = async (arguments_, timeoutMs) => {
    const args = [...arguments_]; this.calls.push({ args, timeoutMs });
    const ok = (value: unknown): AwsCliResult => ({ exitCode: 0, stdout: JSON.stringify(value), stderr: "" });
    const error = (code: string): AwsCliResult => ({ exitCode: 254, stdout: "", stderr: this.jsonErrors ? JSON.stringify({ Error: { Code: code, Message: "PRIVATE_ERROR_DO_NOT_LOG" } }) : `An error occurred (${code}) when calling the operation: PRIVATE_ERROR_DO_NOT_LOG` });
    const option = (name: string) => args[args.indexOf(name) + 1];
    if (args[0] === "--version") return { exitCode: 0, stdout: this.cliVersion, stderr: "" };
    if (args.includes("--generate-cli-skeleton")) return ok(this.conditionalCli ? { IfNoneMatch: "", IfMatch: "", ExpectedBucketOwner: "" } : {});
    const operation = args[1];
    if (operation === "get-caller-identity") return ok({ Account: "732159826922", Arn: `arn:aws:sts::732159826922:assumed-role/${this.callerRole}/offline-session` });
    if (option("--bucket") !== TEST_S3_CONFIG.bucket || option("--expected-bucket-owner") !== "732159826922") throw new Error("FAKE_OWNER_BOUNDARY_FAILED");
    if (operation === "get-bucket-versioning") return ok({ Status: this.versioning });
    if (operation === "get-public-access-block") return ok({ PublicAccessBlockConfiguration: { BlockPublicAcls: this.publicAccess, IgnorePublicAcls: this.publicAccess, BlockPublicPolicy: this.publicAccess, RestrictPublicBuckets: this.publicAccess } });
    if (operation === "get-bucket-encryption") return ok({ ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: this.encryption } }] } });
    if (operation === "list-objects-v2") {
      if (this.denyList) return error("AccessDenied");
      if (option("--max-keys") !== "1" || !args.includes("--no-paginate")) throw new Error("FAKE_UNBOUNDED_LIST");
      const prefix = option("--prefix"), matches = [...this.objects.keys()].filter(key => key.startsWith(prefix)).sort();
      return ok({ KeyCount: Math.min(1, matches.length), IsTruncated: matches.length > 1, ...(matches.length ? { Contents: [{ Key: matches[0] }] } : {}) });
    }
    const key = option("--key");
    if (operation === "get-object") {
      const item = this.objects.get(key);
      if (this.denyReads.has(key)) return error("AccessDenied");
      if (!item) return error(this.missing403 ? "AccessDenied" : "NoSuchKey");
      const range = option("--range");
      if (range !== `bytes=0-${jobObjectCodec.maxBytes}`) throw new Error("FAKE_UNBOUNDED_READ");
      const bytes = Buffer.from(this.corruptReads.has(key) ? item.bytes + " " : item.bytes);
      await writeFile(args.at(-1)!, new Uint8Array(bytes.subarray(0, jobObjectCodec.maxBytes + 1)));
      return ok({ ETag: item.etag, VersionId: this.wrongReadVersions.has(key) ? "wrong-version" : item.versionId });
    }
    if (operation === "put-object") {
      const bytes = await readFile(option("--body"), "utf8");
      await this.beforePut?.(key, args);
      if (this.denyWrites.has(key)) return error("AccessDenied");
      if (key.endsWith("/indexes/latest.json") && this.latestConflicts-- > 0) return error("PreconditionFailed");
      const previous = this.objects.get(key);
      if (args.includes("--if-none-match")) {
        if (option("--if-none-match") !== "*") throw new Error("FAKE_IMMUTABLE_CONDITION_INVALID");
        if (previous) return error("PreconditionFailed");
      } else if (args.includes("--if-match")) {
        if (!previous || previous.etag !== option("--if-match")) return error("PreconditionFailed");
      } else return error("AccessDenied");
      const item = this.putRaw(key, bytes); return ok({ ETag: item.etag, VersionId: item.versionId });
    }
    throw new Error("FAKE_OPERATION_NOT_ALLOWED");
  };
}
