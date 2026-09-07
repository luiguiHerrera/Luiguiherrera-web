import { TrendsExplorer } from "@/components/trends/TrendsExplorer";
import { getRouteMetadata } from "@/lib/seo/site";
export const revalidate = 86400;
export const metadata = getRouteMetadata("/tendencias");
export default function TendenciasPage() { return <TrendsExplorer locale="es" />; }
