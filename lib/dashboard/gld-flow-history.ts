import type { GldFlowPressurePoint } from "./types";

export function buildGldFlowHistory(history: readonly GldFlowPressurePoint[]) {
  return history.slice(1).map((point, index) => ({
    date: point.date,
    // The first observation is a baseline, not a zero flow.
    impliedFlowMillions: (point.sharesOutstanding - history[index].sharesOutstanding) * point.nav / 1_000_000,
  }));
}
