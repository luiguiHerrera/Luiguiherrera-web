import { TrendsMethodologyPage } from "@/components/trends/TrendsMethodologyPage";
import { getRouteMetadata } from "@/lib/seo/site";
export const revalidate = 86400;
export const metadata = getRouteMetadata("/tendencias/metodologia");
export default function MethodologyPage() { return <TrendsMethodologyPage locale="es" />; }
