import { DiagnosticFlow } from "@/components/diagnostic/DiagnosticFlow";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function EnglishDiagnosticPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <SectionHeader
          eyebrow="Investor diagnostic"
          title="Before reading the market, read the investor."
          subtitle="Choose a quick or complete path to organize knowledge, experience, psychological tolerance and real risk capacity. The calculation runs in your browser during this session."
        />
        <DisclaimerBox>
          We do not store answers, portfolios or individual results. Reloading the page resets the session. This diagnostic is educational and does not replace a formal suitability assessment.
        </DisclaimerBox>
      </div>
      <DiagnosticFlow />
    </div>
  );
}
