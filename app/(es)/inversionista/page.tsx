import { InvestorEntryPage } from "@/components/pathways/InvestorEntryPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/inversionista");

export default function InversionistaPage() {
  return <InvestorEntryPage locale="es" />;
}
