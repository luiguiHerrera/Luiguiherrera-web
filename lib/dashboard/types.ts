import type { DashboardModuleId } from "@/lib/analytics/trackEvent";

export type DataStatus = "demo" | "manual" | "live_pending";

export type RegimeLabel = "Constructivo" | "Neutral" | "Defensivo" | "Estrés";
export type RegimeBias = "Risk-on" | "Mixto" | "Risk-off";
export type RegimeConfidence = "Baja" | "Media" | "Alta";

export type DashboardDataSource = {
  sourceName: string;
  sourceUrl?: string;
  lastUpdated: string;
  updateFrequency: string;
  dataStatus: DataStatus;
  reliabilityNote: string;
};

export type DashboardModuleData = DashboardDataSource & {
  id: DashboardModuleId;
  title: string;
  status: string;
  observedData: string[][];
  interpretation: {
    lookingAt: string;
    why: string;
    how: string;
    whatItDoesNotMean: string;
  };
};

export type RegimeSignal = {
  label: string;
  detail: string;
};

export type RegimeSummary = DashboardDataSource & {
  current: RegimeLabel;
  bias: RegimeBias;
  confidence: RegimeConfidence;
  riskSupportSignals: RegimeSignal[];
  cautionSignals: RegimeSignal[];
};

export type CrossSignalRadarRow = DashboardDataSource & {
  ticker: string;
  shortInterest: string;
  institutionalPresence: string;
  shortInterestDate: string;
  form13FDate: string;
  note: string;
};
