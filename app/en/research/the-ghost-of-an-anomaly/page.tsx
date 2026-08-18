import { TomDecayResearchPage } from "@/components/research/tom-decay/TomDecayResearchPage";
import { tomDecayContent } from "@/lib/research/tom-decay/content";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/research/the-ghost-of-an-anomaly");

export default function GhostOfAnAnomalyPage() {
  return <TomDecayResearchPage content={tomDecayContent.en} />;
}
