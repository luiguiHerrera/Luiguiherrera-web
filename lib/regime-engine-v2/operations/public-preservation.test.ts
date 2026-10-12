import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { bytesHash } from "../math.ts";

test("actual Dashboard/home aggregators return identical V1 values with shadow ON/OFF, including source fallback", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-public-"));
  const oldFetch = globalThis.fetch, oldFlag = process.env.V2_SHADOW, oldDir = process.env.V2_SHADOW_DIR, oldBundle = process.env.V2_SHADOW_INPUT;
  const input = JSON.parse(await readFile("docs/regime-engine-v2/maintainer/input-manifest.json", "utf8"));
  let fetches = 0;
  globalThis.fetch = async () => { fetches++; return new Response("", { status: 404 }); };
  try {
    for (const [filename, exported] of [["get-dashboard-data.ts", "getDashboardData"], ["get-home-dashboard-preview-data.ts", "getHomeDashboardPreviewData"]]) {
      const sourcePath = path.join(process.cwd(), "lib/dashboard", filename), current = await readFile(sourcePath, "utf8");
      // Reconstruct the exact accepted input bytes, verified independently by SHA.
      const old = current.replace('import { withDashboardShadow } from "@/lib/regime-engine-v2/operations/dashboard-shadow";\n', "")
        .replace(`async function loadV1${exported}()`, `export async function ${exported}()`)
        .replace(`\nexport async function ${exported}() {\n  return withDashboardShadow(loadV1${exported});\n}\n`, "");
      assert.equal(bytesHash(old), input.all_input_files[`lib/dashboard/${filename}`]);
      const original = path.join(directory, filename); await writeFile(original, old);
      const baselineModule = await import(pathToFileURL(original).href), integratedModule = await import(pathToFileURL(sourcePath).href);
      process.env.V2_SHADOW = "OFF"; const start = fetches; const expected = await baselineModule[exported](); const baselineFetches = fetches - start;
      const offStart = fetches; const off = await integratedModule[exported](); assert.deepEqual(off, expected); assert.equal(fetches - offStart, baselineFetches);
      process.env.V2_SHADOW = "ON"; process.env.V2_SHADOW_DIR = path.join(directory, "private"); delete process.env.V2_SHADOW_INPUT;
      const onStart = fetches; const on = await integratedModule[exported](); assert.deepEqual(on, expected); assert.equal(fetches - onStart, baselineFetches);
      assert.deepEqual(on.regimeSummary, expected.regimeSummary);
    }
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of [["V2_SHADOW", oldFlag], ["V2_SHADOW_DIR", oldDir], ["V2_SHADOW_INPUT", oldBundle]]) if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    await rm(directory, { recursive: true, force: true });
  }
});
