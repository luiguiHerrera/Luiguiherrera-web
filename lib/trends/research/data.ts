import "server-only";
import original from "./research-v2.es.json";
import enA from "./research-v2.en.01-06.json";
import enB from "./research-v2.en.07-12.json";
import enC from "./research-v2.en.13-17.json";
import enShared from "./research-v2.en.shared.json";
import { trendCatalog, type TrendDefinition } from "../catalog";
import type { Locale, ResearchShared, ResearchTrend, Source } from "./types";
import { editPublicResearchCopy } from "./editorial";
import { educationSources } from "./education";

const es = editPublicResearchCopy(original, "es") as unknown as ResearchShared & { trends: ResearchTrend[] };
const en = editPublicResearchCopy(enShared, "en") as unknown as ResearchShared;
const englishTrends = editPublicResearchCopy([...enA, ...enB, ...enC], "en") as unknown as ResearchTrend[];
const sharedResearch = {
  es: { ...es, sources: { ...es.sources, ...educationSources("es") } },
  en: { ...en, sources: { ...en.sources, ...educationSources("en") } },
};
export function getResearch(locale: Locale): ResearchShared { return sharedResearch[locale]; }
export function getResearchTrend(definition: TrendDefinition, locale: Locale) {
  const index = trendCatalog.findIndex(t => t.id === definition.id);
  const trend = (locale === "es" ? es.trends : englishTrends).find(t => t.id === index + 1);
  if (!trend) throw new Error(`Missing research ${definition.id}/${locale}`);
  return trend;
}
export function getSource(id: string, locale: Locale): Source | undefined {
  const data = getResearch(locale);
  return data.sources[id] ?? data.additional_vehicles.sources.find(s => s.id === id);
}
export function vehicleAnnex(id: number, locale: Locale) {
  return getResearch(locale).additional_vehicles.trends.find(t => t.trend_id === id)?.vehicles ?? [];
}
