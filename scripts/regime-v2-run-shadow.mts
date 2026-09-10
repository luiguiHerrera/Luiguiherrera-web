import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { loadReviewedCalendars } from "../lib/regime-engine-v2/operations/calendar-package.ts";
import { createLocalJobStore, createProductionJobStore } from "../lib/regime-engine-v2/operations/job-storage.ts";
import { runShadowObservation } from "../lib/regime-engine-v2/operations/shadow-job.ts";

const argv = process.argv.slice(2);
function option(name: string) { const i = argv.indexOf(name); if (i < 0) return undefined; if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Missing ${name} value`); return argv[i + 1]; }
let diagnostics: string | undefined;
async function emit(value: unknown) {
  const text = JSON.stringify(value, null, 2) + "\n";
  if (diagnostics) { if (!path.isAbsolute(diagnostics)) throw new Error("Diagnostics directory must be absolute"); await mkdir(diagnostics, { recursive: true, mode: 0o700 }); await writeFile(path.join(diagnostics, "terminal.json"), text, { flag: "wx", mode: 0o600 }); }
  process.stdout.write(text);
}
try {
  diagnostics = option("--diagnostics-dir");
  const known = new Set(["--preflight", "--mode", "--confirm-canary", "--storage", "--local-store", "--diagnostics-dir"]), seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    if (!known.has(argv[i]) || seen.has(argv[i])) throw new Error("Unknown or duplicate job option");
    seen.add(argv[i]); if (argv[i] !== "--preflight") { option(argv[i]); i++; }
  }
  const local = option("--local-store"), storage = option("--storage"), selectedMode = option("--mode");
  const github = process.env.GITHUB_ACTIONS === "true", event = process.env.GITHUB_EVENT_NAME;
  const mode = selectedMode ?? (argv.includes("--preflight") || github && event === "workflow_dispatch" ? "preflight" : github && event === "schedule" ? "schedule" : "local");
  if (selectedMode && !["preflight", "schedule", "canary"].includes(selectedMode) || selectedMode && argv.includes("--preflight")) throw new Error("Invalid or conflicting mode");
  if (storage && storage !== "s3" || local && storage) throw new Error("Invalid or conflicting storage selection");
  if (local && github) throw new Error("LOCAL storage is not a GitHub Actions backing");
  if (mode === "schedule" && (!github || event !== "schedule")) throw new Error("Schedule mode requires the actual scheduled workflow context");
  if (mode === "canary" && (!github || event !== "workflow_dispatch" || option("--confirm-canary") !== "RUN_ONE_SHADOW_OBSERVATION")) throw new Error("Explicit manual canary confirmation required");
  if (mode !== "canary" && option("--confirm-canary")) throw new Error("Canary confirmation is only valid for canary mode");
  if (github && !["schedule", "canary", "preflight"].includes(mode)) throw new Error("Unsupported workflow context");
  const enabled = mode === "canary" ? "ON" : process.env.V2_SHADOW_JOB_ENABLED ?? "OFF";
  // An OFF scheduled invocation needs neither storage configuration nor credentials.
  if (github && (mode === "preflight" || enabled === "ON") && storage !== "s3") throw Object.assign(new Error("S3 selection required in GitHub Actions"), { code: "STORAGE_NOT_CONFIGURED" });
  if (mode === "preflight") {
    const calendar = loadReviewedCalendars(new Date().toISOString());
    let storageOperational = false;
    if (storage === "s3") {
      const store = await createProductionJobStore(), checked = await store.preflight();
      if (store.kind !== "S3" || store.operational !== true || checked.operational !== true) throw Object.assign(new Error("Durable S3 preflight required"), { code: "STORAGE_INVALID_CONFIG" });
      storageOperational = true;
    }
    await emit({ schemaVersion: "regime-v2-shadow-preflight/1.0.0", attemptId: randomUUID(), state: "PREFLIGHT_VALIDATED", code: "PREFLIGHT_VALIDATED", completedAt: new Date().toISOString(),
      calendarRelease: calendar.releaseIdentity, expectedSession: calendar.expectedSession, expiry: calendar.expiry,
      enabled: process.env.V2_SHADOW_JOB_ENABLED === "ON" ? "ON" : "OFF", durableStorage: storage === "s3" ? "S3" : "NOT_CONFIGURED", storageOperational,
      networkCalls: storage === "s3" ? null : 0, networkScope: storage === "s3" ? "STORAGE_PREFLIGHT_ONLY" : "NONE", marketRequests: 0, fetchCalls: 0, evidenceKind: "PREFLIGHT_ONLY", canonicalObservation: false, shadowActivated: false });
  } else {
    const terminal = await runShadowObservation({ enabled,
      trigger: mode === "schedule" ? "schedule" : "workflow_dispatch",
      ...(local ? { store: () => createLocalJobStore({ mode: "LOCAL", directory: local }) } : storage === "s3" ? { store: () => createProductionJobStore() } : {}), onTerminal: emit });
    if (!["SUCCESS", "NO_NEW_SESSION", "OFF"].includes(terminal.state)) process.exitCode = 1;
  }
} catch (error) {
  const suppliedCode = error && typeof error === "object" && "code" in error ? error.code : null;
  const code = typeof suppliedCode === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(suppliedCode) ? suppliedCode : "JOB_BOOT_FAILURE";
  const terminal = { schemaVersion: "regime-v2-shadow-job-bootstrap/1.0.0", attemptId: randomUUID(), state: "JOB_FAILURE", code,
    completedAt: new Date().toISOString(), evidenceKind: "ATTEMPT_ONLY", canonicalObservation: false, shadowActivated: false };
  // Only bounded codes reach diagnostics; provider messages or credentials never do.
  // An existing terminal is never overwritten; fallback retains a separate failure.
  try { await emit(terminal); } catch { process.stderr.write(JSON.stringify(terminal) + "\n"); }
  process.exitCode = 1;
}
