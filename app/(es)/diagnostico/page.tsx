import { DiagnosticPage, type DiagnosticSearch } from "@/components/diagnostic/DiagnosticPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/diagnostico");

export default async function DiagnosticoPage({ searchParams }: { searchParams?: Promise<DiagnosticSearch> }) {
  return <DiagnosticPage locale="es" params={await searchParams} />;
}
