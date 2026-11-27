import { MethodologyPage } from "@/components/methodology/MethodologyPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/metodologia");

export default function MetodologiaPage() {
  return <MethodologyPage locale="es" />;
}
