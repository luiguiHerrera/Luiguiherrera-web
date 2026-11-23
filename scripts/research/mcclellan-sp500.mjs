// Local research only. No app imports, network calls, schedules or risk signals.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { researchSnapshot, compareSnapshots } from "../../lib/research/mcclellan-core.mjs";
export * from "../../lib/research/mcclellan-core.mjs";

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--input", "--as-of", "--compare", "--series-out"].includes(args[i]) || !args[i + 1]) throw new Error("Usage: --input PRIVATE_JSON [--as-of ISO] [--compare PRIVATE_JSON] [--series-out OUTSIDE_CHECKOUT]");
    options[args[i]] = args[i + 1];
  }
  if (!options["--input"]) throw new Error("--input is required; the PoC never fetches data");
  const raw = await readFile(options["--input"], "utf8");
  const result = researchSnapshot(JSON.parse(raw), { asOf: options["--as-of"] });
  result.audit.sourceSha256 = createHash("sha256").update(raw).digest("hex");
  if (options["--compare"]) result.audit.revisions = compareSnapshots(JSON.parse(raw), JSON.parse(await readFile(options["--compare"], "utf8")));
  if (options["--series-out"]) {
    const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
    const output = path.resolve(options["--series-out"]);
    const relative = path.relative(root, output);
    if (relative === "" || (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative))) throw new Error("Real research series must stay outside the checkout/public assets");
    await writeFile(output, JSON.stringify({ audit: result.audit, series: result.series }, null, 2) + "\n", { flag: "wx" });
    result.audit.localSeriesWritten = output;
  }
  process.stdout.write(JSON.stringify(result.audit, null, 2) + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(error.message + "\n"); process.exitCode = 1; });
}

