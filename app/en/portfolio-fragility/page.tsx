import { PortfolioFragilityLab } from "@/components/portfolio-fragility/PortfolioFragilityLab";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/portfolio-fragility");
export default function EnglishPortfolioFragilityPage() { return <PortfolioFragilityLab locale="en" />; }
