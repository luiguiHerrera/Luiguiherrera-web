import { StatLevelsLab } from '@/components/statistical-levels/StatLevelsLab';
import { getStatisticalLevelsPageData } from '@/lib/statistical-levels/get-statistical-levels-data';
import { getRouteMetadata } from '@/lib/seo/site';

export const metadata = getRouteMetadata('/en/statistical-levels');

export default async function StatisticalLevelsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getStatisticalLevelsPageData(searchParams ? await searchParams : {});
  const marketDate = new Date(`${data.manifest.generatedAt}T00:00:00Z`).getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const stale = Number.isFinite(marketDate) && Math.floor((today - marketDate) / 86400000) > 7;
  return <StatLevelsLab {...data} locale="en" stale={stale} />;
}
