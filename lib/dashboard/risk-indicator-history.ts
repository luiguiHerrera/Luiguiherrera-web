import { historicalSpyRisk, sectorAbsorptionRatio } from './historical-risk.ts';
import { indicatorReference, type IndicatorPoint } from './indicator-history.ts';
import type { RiskHistorySource } from './risk-history-source.ts';

/** Re-run the existing fixed models at past cutoffs; incomplete windows remain absent. */
export function buildRiskIndicatorReferences(source: RiskHistorySource, calendar: string[]) {
  const spy: IndicatorPoint[] = [], absorption: IndicatorPoint[] = [];
  // Calendar-year cap applies to indicator outputs, in addition to model warm-up.
  const anniversary = new Date(source.cutoffDate+'T12:00:00Z'); anniversary.setUTCFullYear(anniversary.getUTCFullYear()-5);
  const earliest = anniversary.toISOString().slice(0,10);
  for (let i=500; i<calendar.length; i++) {
    const date = calendar[i]; if (date < earliest) continue;
    if (i >= 1260 && date >= (source.spy[1260]?.date ?? '9999')) {
      const result = historicalSpyRisk(source.spy,calendar,date);
      if (result.var95 !== null) spy.push({date,value:result.var95});
    }
    if (source.sectors.every(s=>date >= (s.prices[500]?.date ?? '9999'))) {
      const result = sectorAbsorptionRatio(source.sectors,calendar,date);
      if (result.ratio !== null) absorption.push({date,value:result.ratio});
    }
  }
  return {var95:indicatorReference(spy,source.cutoffDate,calendar),absorption:indicatorReference(absorption,source.cutoffDate,calendar)};
}
