import { loadPublishedPage } from '@/lib/statistical-levels/published-data';
import { StatLevelsLab } from '@/components/statistical-levels/StatLevelsLab';
import { getRouteMetadata } from '@/lib/seo/site';

export const metadata = getRouteMetadata('/en/quantitative-analysis');

export default async function StatisticalLevelsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { data, snapshot } = await loadPublishedPage(await searchParams ?? {});
  const marketDate = new Date(`${data.manifest.generatedAt}T00:00:00Z`).getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const stale = Number.isFinite(marketDate) && Math.floor((today - marketDate) / 86400000) > 7;
  return <StatLevelsLab key={snapshot.id} initial={data} snapshot={snapshot} locale="en" stale={stale} />;
}
