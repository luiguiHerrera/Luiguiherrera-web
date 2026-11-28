import { DiagnosticPage, type DiagnosticSearch } from "@/components/diagnostic/DiagnosticPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/diagnostic");

export default async function EnglishDiagnosticPage({ searchParams }: { searchParams?: Promise<DiagnosticSearch> }) {
  return <DiagnosticPage locale="en" params={await searchParams} />;
}
