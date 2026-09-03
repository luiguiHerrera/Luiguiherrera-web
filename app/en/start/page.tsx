import { StartPathPage } from "@/components/pathways/StartPathPage";
import { personalFinanceEntryContent } from "@/lib/personal-finance/entry-content";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/start");

export default function EnglishStartPage() {
  return <StartPathPage content={personalFinanceEntryContent.en} />;
}
