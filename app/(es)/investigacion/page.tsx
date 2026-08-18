import { ResearchIndex } from "@/components/research/ResearchIndex";
import { researchIndexContent } from "@/lib/research/research-index";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/investigacion");

export default function InvestigacionPage() {
  return <ResearchIndex content={researchIndexContent.es} locale="es" />;
}
