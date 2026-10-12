/** Assemble an explicit operator plan from immutable existing capture records.
 * No provider fetches, implicit calendar generation or source substitution. */
import { readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readCapture } from "../lib/regime-engine-v2/capture.ts";
import { bytesHash } from "../lib/regime-engine-v2/math.ts";
import { externalDirectory } from "../lib/regime-engine-v2/operations/dashboard-shadow.ts";
import { prepareSourceInput, SOURCE_BUNDLE_VERSION } from "../lib/regime-engine-v2/operations/source-input.ts";
import type { SourceBundle, SourceCapture, CalendarPacket } from "../lib/regime-engine-v2/operations/source-input.ts";
const argument = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const planFile = argument("--plan"), output = argument("--output"), cut = argument("--as-of"), configured = process.env.V2_SHADOW_DIR;
if (!planFile || !output || !cut || !configured || !path.isAbsolute(output)) throw new Error("Usage: V2_SHADOW_DIR=/private/store regime-v2-prepare-bundle.mts --plan /private/plan.json --output /private/active-bundle.json --as-of UTC_INSTANT");
const store = await externalDirectory(configured, process.cwd());
await externalDirectory(path.dirname(output), process.cwd());
const plan = JSON.parse(await readFile(planFile, "utf8")) as { mode: SourceBundle["mode"]; captures: (Omit<SourceCapture, "capture" | "upstreamCapture"> & { captureId: string; upstreamCaptureId?: string })[]; calendars: Record<string, Omit<CalendarPacket, "capture"> & { captureId: string }> };
const getCapture = (id: string) => { if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid capture reference"); return readCapture(path.join(store, "captures", `${id}.json`)); };
const captures: SourceCapture[] = [];
for (const item of plan.captures) {
  const { captureId, upstreamCaptureId, ...fields } = item;
  captures.push({ ...fields, capture: await getCapture(captureId), ...(upstreamCaptureId ? { upstreamCapture: await getCapture(upstreamCaptureId) } : {}) });
}
const calendars: SourceBundle["calendars"] = {};
for (const [key, item] of Object.entries(plan.calendars)) {
  if (!["equity", "vix", "vx", "btc", "gld"].includes(key)) throw new Error("Unknown calendar family");
  const { captureId, ...fields } = item;
  calendars[key as keyof SourceBundle["calendars"]] = { ...fields, capture: await getCapture(captureId) };
}
const bundle: SourceBundle = { schemaVersion: SOURCE_BUNDLE_VERSION, mode: plan.mode, captures, calendars };
const prepared = prepareSourceInput(bundle, cut), bytes = JSON.stringify(bundle) + "\n", digest = bytesHash(bytes);
const temporary = path.join(path.dirname(output), `.bundle-${randomUUID()}.tmp`);
await writeFile(temporary, bytes, { flag: "wx", mode: 0o600 }); await rename(temporary, output);
process.stdout.write(JSON.stringify({ sourceBundleHash: digest, output, asOf: cut, issues: prepared.issues, sourceStatus: prepared.sourceStatus, notice: "Explicit input publication only. No runtime flag activation or public cutover." }) + "\n");
