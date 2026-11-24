import type { McClellanPreviewPoint } from "./mcclellan-preview-types";
export const READING_POLICY: Readonly<{
  version: string; minimumHistory: number; confirmation: number;
  priorDecline: number; reboundRise: number; reboundLookback: number; lifetime: number;
}>;
export type Quadrant = "++" | "-+" | "+-" | "--";
export const SIGN_GUIDE: readonly { key: Quadrant; ramo: string; rasi: string; label: string }[];
export type MethodologySource = { title: string; url: string; published?: string };
export const MCCLELLAN_SOURCES: Readonly<Record<"structure" | "zero" | "oscillator", MethodologySource>>;
export type McClellanReading = {
  id: string; kind: string; priority: number; confirmedAt: string; onsetAt: string;
  asOf: string; title: string; body: string; criterion: string; source: MethodologySource;
  trough?: { date: string; value: number }; peak?: { date: string; value: number };
};
export function signQuadrant(point: Pick<McClellanPreviewPoint, "oscillator" | "summation">): Quadrant | null;
export function selectMcClellanReading(points: McClellanPreviewPoint[], options: { cutoffDate: string; stale?: boolean }): McClellanReading | null;
