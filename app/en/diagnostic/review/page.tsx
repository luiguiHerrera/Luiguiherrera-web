import { DiagnosticReviewPage } from "@/components/diagnostic/DiagnosticReviewPage";

export const metadata = { robots: { index: false, follow: false } };

export default async function Review({ searchParams }: { searchParams: Promise<{ profile?: string | string[] }> }) {
  return <DiagnosticReviewPage locale="en" profile={(await searchParams).profile} />;
}
