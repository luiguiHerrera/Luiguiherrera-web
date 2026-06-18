import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";

const legalSections = [
  ["No personalized advice", "The content is educational and informational. It does not constitute financial, legal, tax, wealth or personalized advice."],
  ["No investment recommendations", "The platform does not recommend buying, selling, holding or contracting assets, financial products or strategies."],
  ["Third-party data", "Some sections use external data providers. Data may be delayed, incomplete, revised, incorrect or temporarily unavailable."],
  ["Market regime", "The market regime is an educational classification based on observable variables. It is not an operational instruction."],
  ["Fallbacks and pending states", "When a source fails or is unavailable, the site may show pending states, fallback views or clearly identified educational data."],
  ["Privacy", "The platform does not store diagnostic answers, portfolios, wealth data, risk tolerance or individual results."],
  ["Cookies and analytics", "Marketing cookies are not implemented. Any future analytics should be aggregate and anonymous."],
  ["User responsibility", "The user is responsible for checking information and consulting authorized professionals when appropriate."],
];

export default function EnglishLegalPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <SectionHeader
          eyebrow="Use framework"
          title="Legal notice and limits of use"
          subtitle="Educational scope, privacy, data sources and user responsibility."
        />
        <div className="border border-line bg-panel p-6 text-sm leading-7 text-muted">
          This page summarizes the educational scope of the platform, its limits of use, data treatment and user responsibility.
        </div>
      </div>
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {legalSections.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
      </section>
    </div>
  );
}
