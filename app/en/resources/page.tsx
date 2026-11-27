import { ResourcesPage } from "@/components/resources/ResourcesPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/resources");

export default function EnglishResourcesPage() {
  return <ResourcesPage locale="en" />;
}
