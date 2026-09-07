import { TrendsMethodologyPage } from "@/components/trends/TrendsMethodologyPage";
import { getRouteMetadata } from "@/lib/seo/site";
export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/trends/methodology");
export default function MethodologyPage() { return <TrendsMethodologyPage locale="en" />; }
