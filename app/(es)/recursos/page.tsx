import { ResourcesPage } from "@/components/resources/ResourcesPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/recursos");

export default function RecursosPage() {
  return <ResourcesPage locale="es" />;
}
