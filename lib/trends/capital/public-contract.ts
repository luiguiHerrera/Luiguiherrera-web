import type { CapitalTab } from "./types.ts";

export type PublicCapitalPosition = {
  security_id: string; issuer: string; issuer_id: string | null; ticker_verified: string | null; security_class: string;
  manager_count: number; eligible_disclosed_managers: number; percent_disclosed: number;
  theme_links: string[]; filing_source: string;
};
export type PublicCapitalView = { id: "shared"; rows: PublicCapitalPosition[] } | {
  id: Exclude<CapitalTab, "shared">; rows: (PublicCapitalPosition & { movement_count: number })[];
};
export type PublicCapital = {
  quarter_end: string; as_of: string; quality: "validated" | "partial" | "unavailable";
  freshness: "current" | "stale" | "unavailable"; refresh_failed: boolean;
  universe_name: string; universe_version: number; universe_size: number;
  coverage: { disclosed_filers: number | null; percent: number | null };
  views: PublicCapitalView[];
};

export const PUBLIC_CAPITAL_FIELDS_ALLOWED = {
  root: ["quarter_end", "as_of", "quality", "freshness", "refresh_failed", "universe_name", "universe_version", "universe_size", "coverage", "views"],
  coverage: ["disclosed_filers", "percent"],
  view: ["id", "rows"],
  position: ["security_id", "issuer", "issuer_id", "ticker_verified", "security_class", "manager_count", "eligible_disclosed_managers", "percent_disclosed", "theme_links", "filing_source"],
} as const;
export const PUBLIC_CAPITAL_FIELDS_BLOCKED = [
  "movement", "movement_count", "increase_count", "decrease_count", "new_count", "exit_count", "disagreement_count", "movement_rank",
  // Internal aliases and raw evidence must also stay behind the server boundary.
  "movements", "increased", "reduced", "new", "exited", "indeterminate", "compared", "comparable", "manager_ids",
  "previous_shares", "current_shares", "raw_delta", "corporate_action_adjustment", "normalized_previous_shares", "review_source", "confidence", "previous_sources", "current_sources", "reported_value", "accession_number",
] as const;

function allowOnly(value: object, fields: readonly string[]) {
  for (const key of Object.keys(value)) if (!fields.includes(key)) throw new Error(`Unpublished capital field: ${key}`);
}

const publicNumericFields = ["universe_version", "universe_size", "disclosed_filers", "percent", "manager_count", "eligible_disclosed_managers", "percent_disclosed"];
function checkNumbers(value: unknown, ready: boolean, key = "") {
  if (!ready && (PUBLIC_CAPITAL_FIELDS_BLOCKED as readonly string[]).includes(key)) throw new Error(`Unpublished capital field: ${key}`);
  if (typeof value === "number" && (!Number.isFinite(value) || !(ready ? [...publicNumericFields, "movement_count"] : publicNumericFields).includes(key))) throw new Error(`Unpublished numeric field: ${key}`);
  if (value && typeof value === "object") for (const [child, item] of Object.entries(value)) checkNumbers(item, ready, child);
}

// Runtime enforcement protects the RSC/client boundary, in addition to TS types.
// Anything other than the exact READY value is closed, including future states.
export function assertPublicCapitalPayload(data: PublicCapital, movementPublication: unknown) {
  allowOnly(data, PUBLIC_CAPITAL_FIELDS_ALLOWED.root);
  allowOnly(data.coverage, PUBLIC_CAPITAL_FIELDS_ALLOWED.coverage);
  checkNumbers(data, movementPublication === "READY");
  if (data.coverage.disclosed_filers !== null && data.coverage.percent !== data.coverage.disclosed_filers / data.universe_size * 100) throw new Error("Invalid universe coverage");
  if (data.views[0]?.id !== "shared" || new Set(data.views.map((view) => view.id)).size !== data.views.length) throw new Error("Invalid public capital views");
  if (movementPublication !== "READY" && data.views.some((view) => view.id !== "shared")) throw new Error("Movement publication is closed");
  for (const view of data.views) {
    allowOnly(view, PUBLIC_CAPITAL_FIELDS_ALLOWED.view);
    if (!["shared", "new", "increased", "reduced", "exited", "disagreement"].includes(view.id)) throw new Error("Unknown capital view");
    for (const row of view.rows) {
      allowOnly(row, movementPublication === "READY" && view.id !== "shared" ? [...PUBLIC_CAPITAL_FIELDS_ALLOWED.position, "movement_count"] : PUBLIC_CAPITAL_FIELDS_ALLOWED.position);
      for (const key of ["security_id", "issuer", "security_class", "filing_source"] as const) if (typeof row[key] !== "string") throw new Error(`Invalid position field: ${key}`);
      for (const key of ["issuer_id", "ticker_verified"] as const) if (row[key] !== null && typeof row[key] !== "string") throw new Error(`Invalid position field: ${key}`);
      if (!row.theme_links.every((id) => typeof id === "string")) throw new Error("Invalid theme links");
      if (!Number.isInteger(row.manager_count) || row.manager_count < 0 || row.eligible_disclosed_managers !== data.coverage.disclosed_filers || row.manager_count > row.eligible_disclosed_managers || row.percent_disclosed !== row.manager_count / row.eligible_disclosed_managers * 100) throw new Error("Invalid public position count");
    }
  }
}

export function assertPositionsOnlyHTML(html: string) {
  // Inspect ordinary JSON, HTML entities and escaped JSON in Next's RSC stream.
  const decoded = html.replace(/\\+"/g, '"').replace(/&quot;/g, '"');
  for (const field of PUBLIC_CAPITAL_FIELDS_BLOCKED) {
    if (new RegExp(`"${field}"\\s*:`).test(decoded)) throw new Error(`Unpublished field in HTML: ${field}`);
  }
  // NEW HOLDINGS is an SEC amendment label in the registry, not a movement result.
  if (/\b(?:NEW(?! HOLDINGS\b)|INCREASED|REDUCED|EXITED|INDETERMINATE)\b/.test(decoded) || /capital-(?:tab|panel)-(?:new|increased|reduced|exited|disagreement)/.test(decoded)) throw new Error("Movement result or control in HTML");
}
