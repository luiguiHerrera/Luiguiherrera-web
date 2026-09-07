import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { getRouteMetadata } from "@/lib/seo/site";
export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/trends");
export default function EnglishTrendsPage() { return <TrendsExplorer locale="en" />; }
