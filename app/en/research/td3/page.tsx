import { Td3InteractivePaper } from "@/components/research/Td3InteractivePaper";
import { td3PaperContent } from "@/lib/research/td3-paper";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/research/td3");

export default function EnglishTd3ResearchPage() {
  return <Td3InteractivePaper content={td3PaperContent.en} />;
}
