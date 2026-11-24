import type { DashboardData } from "./types";
import type { CapitalFlowAssetPreview } from "./capital-flows-preview-types";
import { latestClosedFlowSession } from "./capital-flows-source.mjs";
import { sessionDates } from "../research/mcclellan-core.mjs";

export const PREVIEW_POLICY = Object.freeze({ version: "market-context-preview-1", flowWindows: [5, 20], maximumLagSessions: 1, weights: null });
export type ProposedRegime = "constructive" | "selective" | "mixed" | "caution" | "stress" | "incomplete";
export type Direction = "positive" | "negative" | "mixed" | "missing";
export type PreviewFlow = {
  id: CapitalFlowAssetPreview["id"]; date: string | null; five: number | null; twenty: number | null;
  direction: Direction; eligible: boolean; usable: boolean; vehicles: string[]; basis: string;
};
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const validDate = (value: string | null | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value + "T12:00Z")) && new Date(value + "T12:00Z").toISOString().slice(0, 10) === value;

function previousSession(expected: string) {
  const start = new Date(expected + "T12:00Z"); start.setUTCDate(start.getUTCDate() - 14);
  return sessionDates(start.toISOString().slice(0, 10), expected).at(-2)!;
}
function timely(date: string | null | undefined, expected: string) {
  return validDate(date) && date >= previousSession(expected) && date <= expected;
}

export function previewFlow(model: CapitalFlowAssetPreview | undefined, id: PreviewFlow["id"], expected: string): PreviewFlow {
  const date = model?.cutoffDate ?? null;
  const output: PreviewFlow = { id, date, five: null, twenty: null, direction: "missing", eligible: false, usable: false,
    vehicles: model?.vehicles ?? [], basis: model?.metricBasis ?? "daily-sum" };
  if (!model || !validDate(date) || date > expected) return output;
  const points = model.points.filter(point => point.date <= date);
  const tail = points.slice(-20);
  if (tail.length !== 20 || tail.at(-1)?.date !== date || tail.some(point => !point.complete || !finite(point.flow))) return output;
  const calendar = sessionDates(tail[0].date, date);
  if (calendar.length !== 20 || tail.some((point, i) => point.date !== calendar[i])) return output;
  function metric(sessions: number) {
    // Preserve GLD's endpoint-NAV convention; do not silently replace it with daily sums.
    if (model!.metricBasis === "ending-nav") return model!.comparisons?.find(value => value.sessions === sessions)?.current ?? null;
    return tail.slice(-sessions).reduce((sum, point) => sum + point.flow!, 0);
  }
  const five = metric(5), twenty = metric(20);
  const direction = !finite(five) || !finite(twenty) ? "missing" : five > 0 && twenty > 0 ? "positive"
    : five < 0 && twenty < 0 ? "negative" : "mixed";
  return { ...output, five, twenty, direction, eligible: date === expected && direction !== "missing", usable: timely(date, expected) && direction !== "missing" };
}

export function buildRegimeContextPreview(data: DashboardData) {
  const capturedAt = data.marketContext?.capturedAt;
  if (!capturedAt || !Number.isFinite(Date.parse(capturedAt))) throw new Error("PREVIEW_REQUIRES_CAPTURE_TIME");
  const expected = latestClosedFlowSession(capturedAt);
  const breadth = data.marketContext?.breadth;
  const point = breadth?.points.filter(value => value.date <= expected).at(-1);
  const breadthReady = !!breadth && timely(breadth.cutoffDate, expected) && !!point && point.date === breadth.cutoffDate
    && finite(point.oscillator) && finite(point.summation);
  const breadthState = !breadthReady ? "missing" : point.oscillator === 0 || point.summation === 0 ? "mixed"
    : point.oscillator > 0 ? point.summation > 0 ? "strong" : "recovering"
    : point.summation > 0 ? "deteriorating" : "weak";
  const spot = data.vix?.spot;
  const vixReady = spot?.dataStatus === "automated" && timely(spot.lastObservationDate, expected)
    && finite(spot.latestVix) && spot.latestVix >= 0
    && ["low", "normal", "watch", "elevated", "stress", "extreme"].includes(spot.vixSeverity)
    && ["falling", "stable", "rising", "rising_fast"].includes(spot.vixTrend);
  const curve = data.vixTermStructure;
  const backwardation = curve?.sourceStatus === "automated" && curve.lastUpdated?.slice(0, 10) === expected
    && curve.classification.startsWith("Backwardation");
  const severe = vixReady && ["stress", "extreme"].includes(spot.vixSeverity);
  const pressure = vixReady && (["watch", "elevated", "stress", "extreme"].includes(spot.vixSeverity)
    || spot.vixTrend === "rising_fast" || backwardation);
  const models = data.marketContext?.flows ?? [];
  const flows = (["sp500", "btc", "eth", "gold", "ewj"] as const).map(id => {
    const matches = models.filter(value => value.id === id);
    return previewFlow(matches.length === 1 ? matches[0] : undefined, id, expected);
  });
  const equity = flows[0];
  const crypto = flows.filter(row => row.id === "btc" || row.id === "eth");
  const cryptoOutflow = crypto.every(row => row.eligible && row.direction === "negative");
  const sectorDefensive = data.sectorRotation?.dataStatus === "automated"
    && data.sectorRotation.lastUpdated.slice(0, 10) === expected && data.sectorRotation.metrics.reading === "defensiva";
  let regime: ProposedRegime = "incomplete", rule = "required-inputs";
  if (breadthReady && vixReady) {
    if (severe && ["weak", "deteriorating"].includes(breadthState)) { regime = "stress"; rule = "stress-confirmed"; }
    else if (severe || breadthState === "weak" || (pressure && ["deteriorating", "recovering"].includes(breadthState))) { regime = "caution"; rule = "pressure"; }
    else if (breadthState === "strong" && !pressure && equity.usable && equity.direction === "positive") {
      regime = cryptoOutflow || sectorDefensive ? "selective" : "constructive";
      rule = cryptoOutflow ? "crypto-divergence" : sectorDefensive ? "leadership-divergence" : "broad-support";
    } else if (!pressure && ["strong", "recovering"].includes(breadthState)
      && (!equity.usable || equity.direction !== "negative")) { regime = "selective"; rule = "selective-support"; }
    else { regime = "mixed"; rule = "divergence"; }
  }
  const allCurrent = breadthReady && breadth!.cutoffDate === expected && vixReady && spot.lastObservationDate === expected && equity.eligible;
  if (regime === "constructive" && !allCurrent) { regime = "selective"; rule = "selective-support"; }
  return { version: PREVIEW_POLICY.version, regime, rule, expected, capturedAt, snapshot: data.marketContext!.id,
    quality: !breadthReady || !vixReady ? "insufficient" : allCurrent ? "complete" : "partial",
    breadth: { state: breadthState, ready: breadthReady, date: breadth?.cutoffDate ?? null,
      ramo: finite(point?.oscillator) ? point.oscillator : null, rasi: finite(point?.summation) ? point.summation : null },
    volatility: { ready: vixReady, date: spot?.lastObservationDate ?? null, value: vixReady ? spot.latestVix : null,
      state: !vixReady ? "missing" : severe ? "stress" : pressure ? "pressure" : "calm", backwardation },
    flows, cryptoOutflow, sectorDefensive };
}
