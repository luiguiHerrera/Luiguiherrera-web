import { StartPathPage } from "@/components/pathways/StartPathPage";
import { personalFinanceEntryContent } from "@/lib/personal-finance/entry-content";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/empezar");

export default function EmpezarPage() {
  return <StartPathPage content={personalFinanceEntryContent.es} />;
}
