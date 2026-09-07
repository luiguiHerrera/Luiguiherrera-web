import { securityKey, validSecUrl } from "./normalize.ts";
import type { CapitalCompany, CapitalDataset, CapitalIssuer, SecurityMapping } from "./types.ts";

export type CurrentPosition = Pick<CapitalCompany, "id" | "issuer" | "issuer_id" | "ticker" | "security_class" | "managers" | "eligible_disclosed_managers" | "percent_disclosed" | "manager_ids" | "trend_ids" | "source_urls">;

// This input deliberately cannot access previous quarters or comparison results.
export function aggregateCurrentPositions(dataset: Pick<CapitalDataset, "universe" | "current" | "quarter_end">, mappings: SecurityMapping[]) {
  const expected = dataset.universe.managers.filter((manager) => manager.filing_expected && ["ACTIVE", "TEMPORARILY_UNAVAILABLE"].includes(manager.status));
  const eligible = expected.filter((manager) => dataset.current.some((quarter) => quarter.manager_id === manager.manager_id && quarter.quarter_end === dataset.quarter_end && quarter.status === "available"));
  if (new Set(expected.map((manager) => manager.economic_group_id)).size !== expected.length) throw new Error("Duplicate reporting group");
  const rows = new Map<string, CurrentPosition>();
  for (const manager of eligible) {
    const quarter = dataset.current.find((item) => item.manager_id === manager.manager_id && item.quarter_end === dataset.quarter_end)!;
    for (const holding of quarter.positions) {
      if (holding.put_call || holding.share_type !== "SH" || holding.shares <= 0) continue;
      const id = securityKey(holding);
      const matches = mappings.filter((mapping) => mapping.CUSIP === holding.CUSIP && validSecUrl(mapping.source_url) && mapping.reviewed_at >= dataset.quarter_end);
      if (matches.length > 1) throw new Error(`Ambiguous security mapping: ${holding.CUSIP}`);
      const mapping = matches[0];
      const row = rows.get(id) ?? { id, issuer: mapping?.issuer ?? holding.issuer, issuer_id: mapping?.issuer_id ?? null, ticker: mapping?.ticker ?? null, security_class: mapping?.security_class ?? holding.security_class, managers: 0, eligible_disclosed_managers: eligible.length, percent_disclosed: 0, manager_ids: [], trend_ids: mapping?.trend_ids ?? [], source_urls: [] };
      row.manager_ids = [...new Set([...row.manager_ids, manager.manager_id])].sort();
      row.managers = row.manager_ids.length;
      row.percent_disclosed = row.managers / eligible.length * 100;
      row.source_urls = [...new Set([...row.source_urls, holding.source_url])].sort();
      rows.set(id, row);
    }
  }
  const companies = [...rows.values()].sort((a, b) => b.managers - a.managers || a.issuer.localeCompare(b.issuer) || a.id.localeCompare(b.id));
  const issuers = new Map<string, CapitalIssuer>();
  for (const row of companies) {
    if (!row.issuer_id) continue;
    const issuer = issuers.get(row.issuer_id) ?? { issuer_id: row.issuer_id, issuer: row.issuer, manager_ids: [], managers: 0, security_ids: [], eligible_disclosed_managers: eligible.length, percent_disclosed: 0 };
    issuer.manager_ids = [...new Set([...issuer.manager_ids, ...row.manager_ids])].sort();
    issuer.managers = issuer.manager_ids.length;
    issuer.security_ids.push(row.id); issuer.security_ids.sort();
    issuer.percent_disclosed = issuer.managers / eligible.length * 100;
    issuers.set(issuer.issuer_id, issuer);
  }
  return { companies, issuers: [...issuers.values()], eligible_disclosed_managers: eligible.length, universe_size: expected.length };
}
