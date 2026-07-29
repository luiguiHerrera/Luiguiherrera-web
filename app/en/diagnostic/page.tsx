import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import type { DiagnosticMode } from "@/lib/diagnostic/types";
import { ReadingCard } from "@/components/seo/ReadingCard";
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
      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "An educational investor diagnostic that organizes horizon, liquidity, experience, psychological tolerance, behavior and real capacity to take risk." },
        { label: "What it is for", value: "It helps separate the desire to invest, emotional tolerance and financial capacity before making decisions." },
        { label: "Limits", value: "It is not a regulatory suitability or appropriateness assessment and does not store personal answers." },
        { label: "Next step", value: "Use the result as a conversation starting point and review protection, debt or market context as needed." },
      ]} />
      <DiagnosticFlow key={`${initialMode ?? "none"}:${restartToken ?? ""}`} initialMode={initialMode} locale="en" />
    </div>
  );
}
