import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import type { DiagnosticMode } from "@/lib/diagnostic/types";
import { DiagnosticReadingGuide } from "@/components/diagnostic/DiagnosticReadingGuide";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/diagnostic");

function modeFromSearchParam(mode: string | string[] | undefined): DiagnosticMode | undefined {
  if (mode === "quick" || mode === "complete") return mode;
  return undefined;
}

export default async function EnglishDiagnosticPage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[]; restart?: string | string[] }> }) {
  const params = await searchParams;
  const initialMode = modeFromSearchParam(params?.mode);
  const restartToken = Array.isArray(params?.restart) ? params.restart[0] : params?.restart;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Horizon", "Liquidity", "Tolerance", "Capacity"]}
        className="mb-10"
        description="Choose a quick or complete path to organize knowledge, experience, psychological tolerance and real risk capacity. The calculation runs in your browser during this session."
        eyebrow="Investor diagnostic"
        note="We do not store answers, portfolios or individual results. Reloading the page resets the session. This is an educational read, not financial advice."
        title="Before reading the market, read the investor."
        variant="educational"
      />
      <DiagnosticReadingGuide locale="en" />
      <DiagnosticFlow key={`${initialMode ?? "none"}:${restartToken ?? ""}`} initialMode={initialMode} locale="en" />
    </div>
  );
}
