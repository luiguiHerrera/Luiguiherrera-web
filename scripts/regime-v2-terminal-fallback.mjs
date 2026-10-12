// Dependency-free fallback for failed installation, boot, signal or step timeout.
// It records an attempt, never a market observation or a canonical snapshot.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const directory = process.argv[2];
if (process.argv.length !== 3 || !directory || !path.isAbsolute(directory)) throw new Error("One absolute diagnostic directory required");
const filename = path.join(directory, "terminal.json");
const states = new Set(["SUCCESS", "NO_NEW_SESSION", "INCOMPLETE", "SOURCE_FAILURE", "CALENDAR_FAILURE", "ENGINE_FAILURE", "STORAGE_FAILURE", "PUBLICATION_CONFLICT", "TIMEOUT", "OFF"]);
const validInstant = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
const nullableText = value => value === null || typeof value === "string" && value.length > 0;
const validTerminal = value => {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.code !== "string" || !value.code || !validInstant(value.completedAt) || value.shadowActivated !== false) return false;
  if (["regime-v2-shadow-job/1.0.0", "regime-v2-shadow-job/2.0.0"].includes(value.schemaVersion)) return states.has(value.state) && typeof value.attemptId === "string" && value.attemptId.length > 0 &&
    validInstant(value.startedAt) && Date.parse(value.startedAt) <= Date.parse(value.completedAt) && typeof value.terminalStored === "boolean" &&
    nullableText(value.expectedSession) && nullableText(value.observationId) && nullableText(value.observationKey) &&
    Number.isInteger(value.fetchCalls) && value.fetchCalls >= 0 && Array.isArray(value.stages) && value.stages.every(stage => typeof stage === "string") &&
    (!["SUCCESS", "NO_NEW_SESSION"].includes(value.state) || [value.expectedSession, value.observationId, value.observationKey].every(item => typeof item === "string" && item.length > 0));
  if (value.schemaVersion === "regime-v2-shadow-preflight/1.0.0") return value.state === "PREFLIGHT_VALIDATED" && value.code === "PREFLIGHT_VALIDATED" &&
    typeof value.attemptId === "string" && value.attemptId.length > 0 && typeof value.calendarRelease === "string" && typeof value.expectedSession === "string" &&
    value.evidenceKind === "PREFLIGHT_ONLY" && value.canonicalObservation === false && value.marketRequests === 0 && value.fetchCalls === 0 &&
    (value.durableStorage === "S3" && value.storageOperational === true || value.durableStorage === "NOT_CONFIGURED" && value.storageOperational === false);
  return ["regime-v2-shadow-job-bootstrap/1.0.0", "regime-v2-shadow-terminal-fallback/1.0.0"].includes(value.schemaVersion) &&
    value.state === "JOB_FAILURE" && value.evidenceKind === "ATTEMPT_ONLY" && value.canonicalObservation === false;
};
const failure = code => ({ schemaVersion: "regime-v2-shadow-terminal-fallback/1.0.0", state: "JOB_FAILURE", code, completedAt: new Date().toISOString(),
    githubRunId: process.env.GITHUB_RUN_ID ?? null, githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    stepOutcome: process.env.SHADOW_STEP_OUTCOME ?? "unknown", evidenceKind: "ATTEMPT_ONLY", canonicalObservation: false, shadowActivated: false });
let existing = false, invalid = false;
try { const bytes = await readFile(filename, "utf8"); existing = true; try { invalid = !validTerminal(JSON.parse(bytes)); } catch { invalid = true; } }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (invalid) {
  const terminal = { ...failure("INVALID_COORDINATOR_TERMINAL"), originalFilePreserved: true };
  try { await writeFile(path.join(directory, "terminal-fallback-failure.json"), JSON.stringify(terminal, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  process.stdout.write(JSON.stringify(terminal) + "\n"); process.exitCode = 1;
} else if (!existing) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const terminal = failure("NO_COORDINATOR_TERMINAL_BOOT_TIMEOUT_OR_CANCELLATION");
  await writeFile(filename, JSON.stringify(terminal, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify(terminal) + "\n");
}
