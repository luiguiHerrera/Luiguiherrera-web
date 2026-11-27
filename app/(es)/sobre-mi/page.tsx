import { AboutPage } from "@/components/about/AboutPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/sobre-mi");

export default function AboutSpanishPage() {
  return <AboutPage locale="es" />;
}
