import "server-only";
import { trendCatalog } from "../catalog.ts";
import { aggregateCurrentPositions, type CurrentPosition } from "./positions.ts";
import { selectCapitalCompanies } from "./normalize.ts";
import { assertPublicCapitalPayload, type PublicCapital, type PublicCapitalPosition } from "./public-contract.ts";
import type { CapitalDataset, CapitalTab } from "./types.ts";
import config from "./config.json";

function projectPosition(row: CurrentPosition): PublicCapitalPosition {
  // Do not spread internal rows: every public field is selected deliberately.
  return {
    security_id: row.id, issuer: row.issuer, issuer_id: row.issuer_id, ticker_verified: row.ticker, security_class: row.security_class,
    manager_count: row.managers, eligible_disclosed_managers: row.eligible_disclosed_managers, percent_disclosed: row.percent_disclosed,
    theme_links: row.trend_ids.filter((id) => trendCatalog.some((trend) => trend.id === id)), filing_source: row.source_urls[0],
  };
}

export function getPublicCapital(dataset: CapitalDataset, themeId?: string): PublicCapital {
  const positions = aggregateCurrentPositions(dataset, config.security_mappings);
  const usable = dataset.quality !== "unavailable" && positions.eligible_disclosed_managers > 0
    && dataset.coverage.eligible_disclosed_managers === positions.eligible_disclosed_managers
    && dataset.coverage.disclosed_filers === positions.eligible_disclosed_managers
    && dataset.coverage.expected_filers === positions.universe_size;
  const payload: PublicCapital = {
    quarter_end: dataset.quarter_end, as_of: dataset.as_of, quality: usable ? dataset.quality : "unavailable",
    freshness: usable ? dataset.freshness : "unavailable", refresh_failed: Boolean(dataset.refresh_failure),
    universe_name: dataset.universe.name, universe_version: dataset.universe.version, universe_size: positions.universe_size,
    coverage: { disclosed_filers: usable ? positions.eligible_disclosed_managers : null, percent: usable ? positions.eligible_disclosed_managers / positions.universe_size * 100 : null },
    views: [{ id: "shared", rows: usable ? positions.companies.filter((row) => !themeId || row.trend_ids.includes(themeId)).slice(0, 8).map(projectPosition) : [] }],
  };
  // The one publication gate. Internal review records never imply permission.
  if (usable && dataset.movement_publication === "READY") {
    const tabs: Exclude<CapitalTab, "shared">[] = ["new", "increased", "reduced", "exited", "disagreement"];
    for (const tab of tabs) payload.views.push({ id: tab, rows: selectCapitalCompanies(dataset.companies, tab).filter((row) => !themeId || row.trend_ids.includes(themeId)).slice(0, 8).map((row) => ({ ...projectPosition(row), movement_count: tab === "disagreement" ? Math.min(row.increased + row.new, row.reduced + row.exited) : row[tab] })) });
  }
  assertPublicCapitalPayload(payload, dataset.movement_publication);
  return payload;
}
