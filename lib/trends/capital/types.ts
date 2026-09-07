export type Movement = "NEW" | "INCREASED" | "UNCHANGED" | "REDUCED" | "EXITED" | "INDETERMINATE";
export type CapitalTab = "shared" | "new" | "increased" | "reduced" | "exited" | "disagreement";
export type ManagerStatus = "ACTIVE" | "NOTICE_ONLY" | "TEMPORARILY_UNAVAILABLE" | "EXCLUDED" | "RETIRED";
export type Localized = { es: string; en: string };
export type Manager = {
  manager_id: string; display_name: string; legal_name: string; CIK: string;
  manager_type: string; inclusion_reason: Localized; inclusion_date: string;
  status: ManagerStatus; filing_expected: boolean; notes: Localized;
  economic_group_id: string; source_url: string;
  history_quarters?: number; pilot?: boolean;
};
export type ManagerRelationship = {
  type: "INCLUDED_REPORT"; notice_manager_id: string; reporting_manager_id: string;
  quarter_end: string; source_url: string; status: "VERIFIED";
};
export type Universe = { id: string; name: string; version: number; selection_as_of?: string; selection_policy?: string; managers: Manager[]; relationships?: ManagerRelationship[] };
export type Holding = {
  manager_id: string; manager_name: string; CIK: string; quarter_end: string; filing_date: string;
  accession_number: string; form_type: "13F-HR" | "13F-HR/A";
  issuer: string; ticker: string | null; CUSIP: string; security_class: string;
  shares: number; share_type: "SH" | "PRN"; reported_value: number; value_unit: "USD";
  put_call: "PUT" | "CALL" | null; investment_discretion: string; other_manager: string; source_url: string;
};
export type ManagerReference = { CIK: string | null; name: string; sequence_number: string | null; file_number: string | null };
export type Filing = {
  manager_id: string; CIK: string; quarter_end: string; filing_date: string; accession_number: string;
  form_type: "13F-HR" | "13F-HR/A" | "13F-NT" | "13F-NT/A"; source_url: string;
  amendment: "NONE" | "RESTATEMENT" | "NEW_HOLDINGS" | "UNKNOWN";
  confidential: boolean | null; complete: boolean; holdings: Holding[];
  report_type?: string; legal_name?: string; reporting_managers?: ManagerReference[]; included_managers?: ManagerReference[];
  additional_information?: string; table_entry_total?: number | null; table_value_total?: number | null;
};
export type ManagerQuarter = {
  manager_id: string; quarter_end: string;
  status: "available" | "unavailable" | "not_filed" | "not_separately_disclosed" | "unknown";
  filings: Filing[]; positions: Holding[]; confidential: boolean; issues: string[];
  included_report_source?: string;
};
export const corporateActionChecks = ["split", "reverse_split", "merger", "spin_off", "ticker_change", "CUSIP_change", "share_class_change", "amendment", "confidentiality", "missing_filing", "manager_relationship", "put_call", "permitted_omission"] as const;
export type CorporateActionCheck = typeof corporateActionChecks[number];
export type ComparisonReview = {
  manager_id: string; quarter_end: string; previous_key: string | null; current_key: string | null;
  share_factor: number; source_url: string; checked_at: string;
  previous_accessions: string[]; current_accessions: string[];
  previous_shares: number | null; current_shares: number | null;
  checks: Record<CorporateActionCheck, "CLEAR" | "ADJUSTED" | "UNRESOLVED">;
  action: "NONE" | "SPLIT" | "REVERSE_SPLIT" | "CONVERSION";
  evidence_urls: string[]; rationale: string;
  absence_verified: boolean;
};
export type SecurityMapping = {
  CUSIP: string; security_class: string; ticker: string; issuer: string; issuer_id: string;
  trend_ids: string[]; source_url: string; reviewed_at: string;
};
export type PositionMovement = {
  manager_id: string; security_key: string; holding: Holding; state: Movement; reason: string; review_source: string | null;
  previous_shares: number | null; current_shares: number | null; raw_delta: number | null;
  corporate_action_adjustment: { action: ComparisonReview["action"]; share_factor: number } | null;
  normalized_previous_shares: number | null; confidence: "REVIEWED" | "INSUFFICIENT";
  previous_sources: string[]; current_sources: string[];
};
export type CapitalCompany = {
  id: string; issuer: string; issuer_id: string | null; ticker: string | null; security_class: string; put_call: Holding["put_call"];
  managers: number; eligible_disclosed_managers: number; percent_disclosed: number;
  increased: number; reduced: number; new: number; exited: number; indeterminate: number; compared: number;
  manager_ids: string[]; trend_ids: string[]; source_urls: string[];
};
export type CapitalIssuer = { issuer_id: string; issuer: string; manager_ids: string[]; managers: number; security_ids: string[]; eligible_disclosed_managers: number; percent_disclosed: number };
export type CapitalDataset = {
  schema_version: 2; universe: Universe; quarter_end: string; previous_quarter_end: string; as_of: string;
  source: { name: "SEC EDGAR"; url: string };
  freshness: "current" | "stale" | "unavailable"; quality: "validated" | "partial" | "unavailable";
  coverage: {
    universe_size: number; expected_filers: number; disclosed_filers: number | null; notice_only: number;
    pending: number | null; failed: number | null; eligible_disclosed_managers: number | null;
    percent: number | null; comparable: number | null;
  };
  refresh_failure?: string;
  movement_publication: "READY" | "REVIEW_PENDING";
  current: ManagerQuarter[]; previous: ManagerQuarter[]; movements: PositionMovement[]; companies: CapitalCompany[]; issuers: CapitalIssuer[];
};
