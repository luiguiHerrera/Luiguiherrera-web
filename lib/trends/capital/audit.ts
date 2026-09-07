import { createHash } from "node:crypto";
import type { CapitalDataset } from "./types.ts";

export function auditCapitalDataset(dataset: CapitalDataset): string[] {
  const issues: string[] = [];
  const expected = dataset.universe.managers.filter((manager) => manager.filing_expected && ["ACTIVE", "TEMPORARILY_UNAVAILABLE"].includes(manager.status));
  const eligible = dataset.current.filter((quarter) => quarter.status === "available" && expected.some((manager) => manager.manager_id === quarter.manager_id));
  if (dataset.coverage.expected_filers !== expected.length || dataset.coverage.disclosed_filers !== eligible.length || dataset.coverage.eligible_disclosed_managers !== eligible.length) issues.push("denominator_mismatch");
  for (const row of dataset.companies) {
    const holders = eligible.filter((quarter) => quarter.positions.some((holding) => `${holding.CUSIP.trim().toUpperCase()}|${holding.put_call ?? "LONG"}|${holding.share_type}` === row.id)).map((quarter) => quarter.manager_id).sort();
    if (JSON.stringify(holders) !== JSON.stringify(row.manager_ids) || row.managers !== holders.length || row.eligible_disclosed_managers !== eligible.length) issues.push(`unreconstructible_count:${row.id}`);
    if (row.managers > row.eligible_disclosed_managers || row.percent_disclosed > 100 || eligible.length > 0 && Math.abs(row.percent_disclosed - holders.length / eligible.length * 100) > 1e-10) issues.push(`invalid_percentage:${row.id}`);
    if (row.managers && row.source_urls.some((url) => !eligible.some((quarter) => quarter.positions.some((holding) => holding.source_url === url && `${holding.CUSIP.trim().toUpperCase()}|${holding.put_call ?? "LONG"}|${holding.share_type}` === row.id)))) issues.push(`historical_source_in_current_count:${row.id}`);
  }
  for (const issuer of dataset.issuers) {
    const holders = [...new Set(dataset.companies.filter((row) => row.issuer_id === issuer.issuer_id && !row.put_call && row.id.endsWith("|SH")).flatMap((row) => row.manager_ids))].sort();
    if (JSON.stringify(holders) !== JSON.stringify(issuer.manager_ids)) issues.push(`issuer_double_count:${issuer.issuer_id}`);
  }
  for (const movement of dataset.movements) {
    if (movement.state === "INDETERMINATE") {
      if (movement.confidence !== "INSUFFICIENT") issues.push("false_confidence");
      continue;
    }
    if (movement.confidence !== "REVIEWED" || !movement.review_source || !movement.corporate_action_adjustment || movement.normalized_previous_shares === null) issues.push("unsubstantiated_movement");
    if ([...dataset.current, ...dataset.previous].some((quarter) => quarter.manager_id === movement.manager_id && (quarter.status !== "available" || quarter.confidential))) issues.push("movement_from_missing_or_confidential_filing");
  }
  if (dataset.movement_publication === "READY" && dataset.movements.some((movement) => !movement.holding.put_call && movement.holding.share_type === "SH" && movement.state === "INDETERMINATE")) issues.push("incomplete_movement_ranking");
  return [...new Set(issues)];
}
export function digest(value: string | Buffer): string { return createHash("sha256").update(typeof value === "string" ? value : new Uint8Array(value)).digest("hex"); }
