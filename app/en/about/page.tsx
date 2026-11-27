import { AboutPage } from "@/components/about/AboutPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/about");

export default function AboutEnglishPage() {
  return <AboutPage locale="en" />;
}
