/** One explicit existing Dashboard pipeline run, private capture only; no scheduler. */
import { getDashboardData } from "../lib/dashboard/get-dashboard-data.ts";
if (process.env.V2_SHADOW !== "ON" || !process.env.V2_SHADOW_DIR) throw new Error("Set V2_SHADOW=ON and an absolute private V2_SHADOW_DIR outside the repository. V2_SHADOW_INPUT is an optional versioned source bundle; absence records INCOMPLETE.");
const result = await getDashboardData();
process.stdout.write(JSON.stringify({ publicAuthority: "V1", publicOutputChanged: false, v1: { regime: result.regimeSummary.current, score: result.regimeSummary.regimeScore, confidence: result.regimeSummary.confidence }, shadowDirectory: process.env.V2_SHADOW_DIR, productionCutover: false }) + "\n");
