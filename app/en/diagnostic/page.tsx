import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DiagnosticMode } from "@/lib/diagnostic/types";

function modeFromSearchParam(mode: string | string[] | undefined): DiagnosticMode | undefined {
  if (mode === "quick" || mode === "complete") return mode;
  return undefined;
}

export default async function EnglishDiagnosticPage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const params = await searchParams;
  const initialMode = modeFromSearchParam(params?.mode);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <SectionHeader
          eyebrow="Investor diagnostic"
          title="Before reading the market, read the investor."
          subtitle="Choose a quick or complete path to organize knowledge, experience, psychological tolerance and real risk capacity. The calculation runs in your browser during this session."
        />
        <DisclaimerBox>
          We do not store answers, portfolios or individual results. Reloading the page resets the session. This diagnostic is an educational read of current preparation and is not financial advice or a personalized recommendation.
        </DisclaimerBox>
      </div>
      <DiagnosticFlow initialMode={initialMode} locale="en" />
    </div>
  );
}
