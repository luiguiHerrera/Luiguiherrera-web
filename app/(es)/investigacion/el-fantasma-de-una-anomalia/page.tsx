import { TomDecayResearchPage } from "@/components/research/tom-decay/TomDecayResearchPage";
import { tomDecayContent } from "@/lib/research/tom-decay/content";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/investigacion/el-fantasma-de-una-anomalia");

export default function FantasmaAnomaliaPage() {
  return <TomDecayResearchPage content={tomDecayContent.es} />;
}
