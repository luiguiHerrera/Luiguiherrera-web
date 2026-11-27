import { MethodologyPage } from "@/components/methodology/MethodologyPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/methodology");

export default function EnglishMethodologyPage() {
  return <MethodologyPage locale="en" />;
}
