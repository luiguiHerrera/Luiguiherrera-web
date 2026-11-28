import { DiagnosticReviewPage } from "@/components/diagnostic/DiagnosticReviewPage";

export const metadata = { robots: { index: false, follow: false } };

export default async function Revision({ searchParams }: { searchParams: Promise<{ profile?: string | string[] }> }) {
  return <DiagnosticReviewPage locale="es" profile={(await searchParams).profile} />;
}
