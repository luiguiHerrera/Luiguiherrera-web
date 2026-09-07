import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildCapitalDataset } from "../lib/trends/capital/normalize.ts";
import { auditCapitalDataset, digest } from "../lib/trends/capital/audit.ts";
import type { CapitalDataset, ComparisonReview, Filing, SecurityMapping, Universe } from "../lib/trends/capital/types.ts";

const base = new URL("../lib/trends/capital/", import.meta.url);
const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(name, base), "utf8"));
const fetch = process.argv.includes("--fetch"), check = process.argv.includes("--check");
if (fetch && check) throw new Error("--fetch and --check are mutually exclusive");
const universe = read<Universe>("universe.json");
const config = read<{ quarter_end: string; previous_quarter_end: string; comparisons: ComparisonReview[]; security_mappings: SecurityMapping[]; accepted_issues?: { manager_id: string; quarter_end: string; issue: string; disposition: string; source_url: string; reviewed_at: string }[] }>("config.json");
const staged = fetch ? mkdtempSync(path.join(tmpdir(), "lhi-trends-sec-")) : new URL("generated/", base).pathname;
try {
  const parsed = execFileSync("python3", [new URL("./fetch-capital-disclosures.py", import.meta.url).pathname, "--output", staged, ...(fetch ? ["--fetch"] : [])], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const input = JSON.parse(parsed) as { as_of: string; filings: Filing[]; lookup_succeeded: string[]; diagnostics: unknown[]; identities: { manager_id: string; CIK: string; legal_name: string; history_quarters: number }[] };
  if (input.diagnostics.length) throw new Error(`SEC retrieval/parser anomalies (${input.diagnostics.length}); staged evidence: ${staged}`);
  for (const manager of universe.managers.filter((item) => !["EXCLUDED", "RETIRED"].includes(item.status))) {
    const identity = input.identities.find((item) => item.manager_id === manager.manager_id);
    if (!identity || identity.CIK !== manager.CIK || identity.legal_name !== manager.legal_name) throw new Error(`Registry identity requires review: ${manager.manager_id}`);
    if (identity.history_quarters < 8 && !universe.relationships?.some((relation) => relation.reporting_manager_id === manager.manager_id && relation.status === "VERIFIED")) throw new Error(`Insufficient filing history: ${manager.manager_id}`);
  }
  const dataset = buildCapitalDataset({ ...input, ...config, universe, reviews: config.comparisons, mappings: config.security_mappings });
  const sourceEvidence = JSON.parse(gunzipSync(readFileSync(path.join(staged, "sec-evidence.json.gz"))).toString("utf8")) as { responses: Record<string, {body: string; sha256: string}> };
  const actionEvidence = JSON.parse(gunzipSync(readFileSync(new URL("generated/corporate-actions-evidence.json.gz", base))).toString("utf8")) as { responses: Record<string, {body: string; sha256: string}> };
  const issuerEvidence = JSON.parse(gunzipSync(readFileSync(new URL("generated/issuer-reports-evidence.json.gz", base))).toString("utf8")) as { responses: Record<string, {body: string; sha256: string}> };
  const sources = { ...sourceEvidence.responses, ...actionEvidence.responses, ...issuerEvidence.responses };
  for (const mapping of config.security_mappings) {
    const cik = new URL(mapping.source_url).pathname.match(/\/data\/(\d+)\//)?.[1];
    if (!sources[mapping.source_url] || mapping.reviewed_at < config.quarter_end || !cik || mapping.issuer_id !== `sec-issuer-${Number(cik)}`) throw new Error(`Security mapping requires review: ${mapping.CUSIP}`);
  }
  for (const [url, response] of Object.entries(sources)) if (digest(response.body) !== response.sha256) throw new Error(`Evidence hash mismatch: ${url}`);
  for (const review of config.comparisons) {
    if (review.evidence_urls.some((url) => !sources[url])) throw new Error("Comparison evidence not retained");
    const movement = dataset.movements.find((row) => row.manager_id === review.manager_id && row.security_key === (review.current_key ?? review.previous_key));
    if (!movement || movement.confidence !== "REVIEWED") throw new Error(`Comparison requires renewed review: ${review.manager_id}`);
  }
  for (const quarter of dataset.current.filter((row) => row.status === "unavailable")) {
    for (const issue of quarter.issues) {
      const disposition = config.accepted_issues?.find((item) => item.manager_id === quarter.manager_id && item.quarter_end === quarter.quarter_end && item.issue === issue && item.disposition === "WITHHOLD_HOLDINGS" && quarter.filings.some((filing) => filing.source_url === item.source_url && item.reviewed_at >= filing.filing_date));
      if (!disposition) throw new Error(`Unreviewed material anomaly: ${quarter.manager_id}/${issue}`);
    }
  }
  const issues = auditCapitalDataset(dataset);
  if (issues.length) throw new Error(`Capital controls failed: ${issues.join(", ")}`);
  const output = new URL("generated/snapshot.json.gz", base);
  if (existsSync(output)) {
    const previous = JSON.parse(gunzipSync(readFileSync(output)).toString("utf8")) as CapitalDataset;
    if (previous.quarter_end === dataset.quarter_end) {
      const currentIds = new Set(dataset.current.filter((quarter) => quarter.status === "available").map((quarter) => quarter.manager_id));
      const lost = previous.current.filter((quarter) => quarter.status === "available" && universe.managers.some((manager) => manager.manager_id === quarter.manager_id && manager.filing_expected) && !currentIds.has(quarter.manager_id));
      if (lost.length) throw new Error(`Fetch degraded validated managers: ${lost.map((quarter) => quarter.manager_id).join(", ")}`);
    }
  }
  const serialized = JSON.stringify(dataset, null, 2) + "\n";
  const bytes = gzipSync(serialized);
  const manifest = JSON.stringify({ schema_version: 2, universe_id: dataset.universe.id, registry_sha256: digest(JSON.stringify(universe)), snapshot_sha256: digest(bytes), quarter_end: dataset.quarter_end, previous_quarter_end: dataset.previous_quarter_end, as_of: dataset.as_of, source: dataset.source, freshness: dataset.freshness, quality: dataset.quality, coverage: dataset.coverage, movement_publication: dataset.movement_publication, movement_counts: Object.fromEntries(["NEW", "INCREASED", "UNCHANGED", "REDUCED", "EXITED", "INDETERMINATE"].map((state) => [state, dataset.movements.filter((movement) => movement.state === state).length])), managers: dataset.current.map(({ manager_id, status, confidential, issues, included_report_source }) => ({ manager_id, status, confidential, issues, included_report_source })) }, null, 2) + "\n";
  if (check) {
    if (!existsSync(output) || gunzipSync(readFileSync(output)).toString("utf8") !== serialized || readFileSync(new URL("generated/manifest.json", base), "utf8") !== manifest) throw new Error("Snapshot or manifest is not reproducible from stored SEC evidence and registry");
  } else {
    // Manifest is the commit marker. A process interruption between renames causes
    // the loader's digest check to fail closed, never mixing source and totals.
    const files: [string, Buffer | string][] = [["snapshot.json.gz", bytes], ["manifest.json", manifest]];
    if (fetch) files.unshift(["sec-evidence.json.gz", readFileSync(path.join(staged, "sec-evidence.json.gz"))]);
    for (const [name, content] of files) writeFileSync(new URL(`generated/${name}.pending`, base), content);
    for (const [name] of files) renameSync(new URL(`generated/${name}.pending`, base), new URL(`generated/${name}`, base));
    if (fetch) writeFileSync(new URL("generated/refresh-status.json", base), JSON.stringify({ status: "SUCCESS", attempted_at: input.as_of }) + "\n");
  }
  console.log(JSON.stringify({ state: "PASS", quarter: dataset.quarter_end, quality: dataset.quality, coverage: dataset.coverage, movement_publication: dataset.movement_publication }));
} catch (error) {
  if (fetch) writeFileSync(new URL("generated/refresh-status.json", base), JSON.stringify({ status: "FAILED", attempted_at: new Date().toISOString() }) + "\n");
  throw error;
}
