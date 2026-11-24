export type Locale = "es" | "en";
export type Source = { title: string; url: string; published_or_period?: string };
export type Measure = {
  id?: string; label?: string; period: string; value: number | null; unit?: string;
  kind?: string; source?: string; sources?: string[]; note?: string; geo?: string;
  display_value?: string | number; display_unit?: string; display_scale?: number;
  qualifier?: string; approximate?: boolean;
};
export type Chart = {
  type: string; title: string; unit?: string; display_unit?: string; display_scale?: number;
  rows?: Measure[]; data?: (Measure & { label: string })[];
  series?: { label: string; unit: string; source: string; rows: Measure[] }[];
  source?: string; sources?: string[]; source_ids?: string[]; note?: string; data_ref?: string;
};
export type Chain = {
  nodes: { id: string; label: string; actors?: string[] }[];
  edges: { source: string; target: string; label?: string; kind?: "funding" }[]; note: string;
};
export type Vehicle = {
  name: string; ticker: string; exchange: string; type: string; exposure: string; limitation: string;
  sources: string[]; verified_at?: string;
  alternative_listings?: { ticker: string; exchange: string; instrument: string }[];
  recent_changes?: { date: string; fact: string; source: string }[];
};
export type Position = {
  id: string; actor: string; asset: string; ticker: string; cusip: string;
  period_from: string; period_to: string; reported_at: string;
  quantity_from: number | null; quantity_to: number; delta: number | null; delta_pct: number | null;
  unit: string; direction: string; display_direction: string; evidence_type: string;
  comparison_eligible: boolean; newly_reported?: boolean; limitation: string;
  corporate_action_check: string; sources: string[]; theme_ids: number[];
};
export type CapitalEvent = {
  id: string; actor: string; action: string; asset: string; ticker?: string; period: string;
  amount?: number | null; unit: string | null; shares?: number; exchange_ratio?: number;
  evidence?: string; sources: string[]; limitation: string; theme_ids: number[]; note?: string; seller?: string | null;
};
export type GoldRow = {
  actor: string; period_from: string; period_to: string; quantity_from: number | null;
  quantity_to: number | null; delta: number | null; unit: string; sources: string[];
  direction?: string; evidence_type?: string; limitation?: string; note?: string; derived_tonnes?: number;
};
export type ResearchTrend = {
  id: number; name: string; slug: string; group: string; snapshot: string; change: string;
  evidence_text: string; metrics: Measure[];
  geography: { region: string; text: string; sources: string[] }[];
  policy: { jurisdiction: string; status: string; text: string; sources: string[] }[];
  chain: Chain; arguments: string[]; invalidation: string; value: string;
  moat_reading: string; moat_sources: string[];
  moats?: { actor?: string; ticker?: string; node?: string; advantage?: string; qualification?: string; value_test?: string; erosion?: string; sources?: string[]; segment?: string; barrier?: string; proof_status?: string; risk?: string; examples?: string[] }[];
  risks: { title: string; mechanism: string; evidence: string; watch: string; sources: string[]; interpretation: string }[];
  vehicles: Vehicle[]; chart: Chart; additional_charts: Chart[]; sources: string[]; further_analysis: string;
  capital: { intro: string; position_ids: string[]; all_position_ids: string[]; event_ids: string[]; coverage_note: string; country_data_ref?: string; direct_data_ref?: string };
  scope?: { layer: string; items: string[]; economic_question: string }[]; native_assets_note?: string;
  glossary?: { term: string; definition: string; sources?: string[] }[]; glossary_note?: string;
  fraud_context?: Record<string, unknown>;
};
export type ResearchShared = {
  sources: Record<string, Source>; capital_positions: Position[]; capital_events: CapitalEvent[];
  gold_capital_rows: GoldRow[]; gold_direct_evidence: GoldRow[];
  capital_methodology: Record<string, string>;
  additional_vehicles: { as_of: string; purpose: string; sources: { id: string; title: string; url: string }[]; trends: { trend_id: number; vehicles: Vehicle[] }[]; notes: string[] };
  political_disclosures: { text: string; publication_note: string; sources: string[] };
  capital_excluded_comparisons: { actor: string; ticker: string; period_from: string; period_to: string; quantity_from_raw: number; quantity_to_raw: number; reason: string; ui_behavior: string; sources: string[] }[];
};
