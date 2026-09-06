export function closeLocationBucket(value: number | null | undefined): 0 | 1 | 2 | null;
export function commonPricePaths(series: Array<{ close: number; ma200: number | null }>, width?: number, height?: number): { close: string; ma200: string };
export function canonicalPeriodDate(date: string, frequency: 'daily' | 'weekly' | 'monthly'): string | null;
export function isCompletedPeriod(date: string, frequency: 'daily' | 'weekly' | 'monthly', asOf: string): boolean;
export type DatedObservation = { date: string; value: number | null | undefined; observedThrough?: string };
export function datedCorrelation(first: DatedObservation[], second: DatedObservation[], minimum?: number): { value: number | null; n: number };
export function datedCorrelationEvidence(first: DatedObservation[], second: DatedObservation[], minimum?: number): { value: number | null; n: number; effectiveThroughDate: string | null };
export const dailyReturnAliases: ReadonlyArray<{ oldAlias: '1W' | '1M' | '3M' | '6M' | '1Y'; periods: number; alias: string; es: string; en: string }>;
