import { PortfolioFragilityLab } from "@/components/portfolio-fragility/PortfolioFragilityLab";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/fragilidad-de-portafolio");
export default function PortfolioFragilityPage() { return <PortfolioFragilityLab locale="es" />; }

