import { InvestorEntryPage } from "@/components/pathways/InvestorEntryPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/investor");

export default function EnglishInvestorPage() {
  return <InvestorEntryPage locale="en" />;
}
