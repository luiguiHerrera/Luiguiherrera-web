import { ResearchIndex } from "@/components/research/ResearchIndex";
import { researchIndexContent } from "@/lib/research/research-index";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/research");

export default function EnglishResearchPage() {
  return <ResearchIndex content={researchIndexContent.en} locale="en" />;
}
