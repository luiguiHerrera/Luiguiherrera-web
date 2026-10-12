export type ReplayClass = "R0" | "R1" | "R2" | "UNKNOWN";
export type Mode = ReplayClass | "SYNTHETIC";
export type Certainty = "EXACT" | "CONSERVATIVE_BOUND" | "UNKNOWN";
export type Direction = "FAVORABLE" | "MIXED" | "ADVERSE" | "UNAVAILABLE";
export type Volatility = "BENIGN" | "WATCH" | "ADVERSE" | "STRESS" | "UNAVAILABLE";
export type Fragility = "LOW" | "RISING" | "HIGH" | "UNAVAILABLE";
export type Regime = "RISK_ON_BROAD" | "RISK_ON_SELECTIVE" | "TRANSITION" | "DEFENSIVE" | "STRESS";
export type Level = "LOW" | "MEDIUM" | "HIGH";
export type Temporal = {
  observationDate?: string; observationEndAt?: string | null;
  observationEndCertainty?: Certainty; sourcePublishedAt?: string | null;
  availableAt?: string | null; capturedAt?: string | null;
  availabilityCertainty?: Certainty; replayClass?: ReplayClass;
  sourceId?: string; sourceVersion?: string; vintageHash?: string;
  status?: string; availabilityEvidence?: string;
};
export type Row = Temporal & { date?: string; [key: string]: unknown };
export type Packet = Temporal & {
  rows: Row[]; seriesType?: string; priceBasis?: string; currency?: string;
  sourceField?: string; declaredStart?: string;
  expectedFunds?: string[]; unitEventDates?: string[];
};
export type ContractIdentity = { symbol: string; expirationDate: string };
export type VxPacket = Temporal & {
  seriesType?: string; contracts: (ContractIdentity & Temporal & { settlement: unknown })[];
  expectedContracts: ContractIdentity[];
};
export type Calendar = Temporal & {
  id: string; version: string; timezone: string;
  kind: "OFFICIAL" | "R2_OBSERVED_PROXY" | "SYNTHETIC";
  coverageStart: string; coverageEnd: string; completeIntervalCoverage: boolean;
  sessions: { session: string; closedAt: string }[];
};
export type CoreInput = {
  mode: Mode; asOf: string; targetSession: string; expectedSessions: string[];
  equity: Record<string, Packet | undefined>; vix?: Packet; vx?: VxPacket;
};
export type EngineInput = Omit<CoreInput, "targetSession" | "expectedSessions" | "mode"> & {
  mode: ReplayClass;
  calendars: Partial<Record<"equity" | "vix" | "vx" | "btc" | "gld", Calendar>>;
  btc?: Packet; gld?: Packet;
  optionalFeatures?: string[];
};
export type NumericParameters = {
  k_weak: number; k_broad: number; leadership_gap: number;
  v_watch: number; v_adverse: number; v_stress: number;
  jump_1: number; jump_5: number; curve_flat: number; curve_adverse: number;
  rho_floor: number; rho_high: number; delta_rising: number;
};
export type CoreFeatures = {
  positive_5: number | null; positive_21: number | null; leadership_gap: number | null;
  rho21: number | null; rho63: number | null; corr_spread: number | null;
  vix: number | null; jump_1: number | null; jump_5: number | null;
  slope: number | null; realized_vol_21: number | null;
  group_returns_21?: Record<string, number>; returns_5?: Record<string, number>; returns_21?: Record<string, number>;
};
export type Pillars = { participation: Direction; leadership: Direction; equity: Direction; volatility: Volatility; fragility: Fragility };
export type FeatureEvidence = {
  featureId: string; role: string; family: string; unit: string;
  value: unknown; status: "AVAILABLE" | "UNAVAILABLE" | "EXCLUDED" | "PARKED";
  reasons: string[]; parents: readonly string[]; replayClass: ReplayClass;
};
