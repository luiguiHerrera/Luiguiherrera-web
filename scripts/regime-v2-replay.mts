/** Private exact replay; no network and no public endpoint. */
import { readSnapshot, replaySnapshot } from "../lib/regime-engine-v2/operations/snapshot.ts";
const index = process.argv.indexOf("--snapshot"), filename = index >= 0 ? process.argv[index + 1] : undefined;
if (!filename) throw new Error("Usage: regime-v2-replay.mts --snapshot /absolute/private/snapshot.json");
const snapshot = await readSnapshot(filename), result = replaySnapshot(snapshot);
process.stdout.write(JSON.stringify(result.status === "MATCH" ? { status: result.status, snapshotId: result.snapshotId, engineVersion: result.engineVersion, parameterSet: result.parameterSet, regime: result.output.regime, systemState: result.output.systemState, replayClass: result.output.replayClass, outputHash: result.outputHash } : result) + "\n");
