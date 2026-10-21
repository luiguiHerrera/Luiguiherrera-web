import type { VixSpotData } from "./types";

// Presentation only: retain real delayed observations and the adapter's finite,
// non-negative close / calendar-date contract. No new freshness or history cutoff.
export function hasVixObservation(spot: VixSpotData | null | undefined): spot is VixSpotData & { latestVix: number; lastObservationDate: string } {
  if (!spot || !["automated", "delayed"].includes(spot.dataStatus)
    || spot.latestVix === null || !Number.isFinite(spot.latestVix) || spot.latestVix < 0
    || !spot.lastObservationDate || !/^\d{4}-\d{2}-\d{2}$/.test(spot.lastObservationDate)) return false;
  const date = new Date(`${spot.lastObservationDate}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === spot.lastObservationDate;
}

export function vixTrendLabel(spot: VixSpotData | null | undefined, locale: "es" | "en") {
  const unavailable = locale === "en" ? "Unavailable" : "No disponible";
  if (!hasVixObservation(spot)) return unavailable;
  // The existing adapter derives momentum from 1D or 5D relative changes.
  // An explicit "stable" with neither usable comparison is still unsupported.
  const previous5d = spot.history?.at(-6)?.value;
  const has1d = Number.isFinite(spot.previousVix) && (spot.previousVix ?? 0) > 0 && Number.isFinite(spot.change1d);
  const has5d = Number.isFinite(previous5d) && (previous5d ?? 0) > 0 && Number.isFinite(spot.change5d);
  if (!has1d && !has5d) return unavailable;
  switch (spot.vixTrend) {
    case "rising_fast": return locale === "en" ? "Rising fast" : "Subiendo rápido";
    case "rising": return locale === "en" ? "Rising" : "Subiendo";
    case "falling": return locale === "en" ? "Falling" : "Bajando";
    case "stable": return locale === "en" ? "Stable" : "Estable";
    default: return unavailable;
  }
}
