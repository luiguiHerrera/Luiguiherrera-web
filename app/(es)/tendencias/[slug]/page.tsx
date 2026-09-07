import { notFound } from "next/navigation";
import { TrendDetailPage } from "@/components/trends/TrendDetailPage";
import { trendCatalog, trendPath } from "@/lib/trends/catalog";
import { getRouteMetadata } from "@/lib/seo/site";
export const revalidate = 86400;
export const dynamicParams = false;
export function generateStaticParams() { return trendCatalog.map((trend) => ({ slug: trend.slug.es })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = trendCatalog.find((item) => item.slug.es === slug);
  if (!trend) notFound();
  return getRouteMetadata(trendPath(trend, "es"));
}
export default async function TrendPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trend = trendCatalog.find((item) => item.slug.es === slug);
  if (!trend) notFound();
  return <TrendDetailPage definition={trend} locale="es" />;
}
