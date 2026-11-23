import type { McClellanPreviewData } from "./mcclellan-preview-types";
export class McClellanSourceError extends Error {}
export type McClellanSource = { snapshot: unknown; commit: string; blob: string };
export function buildMcClellanData(source: McClellanSource, asOf?: string): McClellanPreviewData;
export function fetchMcClellanSource(options?: { fetcher?: typeof fetch; asOf?: string }): Promise<McClellanSource>;
