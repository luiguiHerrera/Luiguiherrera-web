import Link from "next/link";
import { InvestmentPractice } from "@/components/protection/InvestmentPractice";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/protection");

const protectionItems = [
  { title: "Money warning signs", href: "/en/protect-your-money", description: "Checklist, warning signs and filters before committing capital." },
  { title: "Cross-signal radar", href: "/en/dashboard", description: "The dashboard integrates regime signals to contrast context, stress and risk support." },
];

export default function EnglishProtectionPage() {
  return (
    <div className="mx-auto min-w-0 max-w-7xl overflow-hidden px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Decisions", "Liquidity", "Incentives", "Concentration"]}
        description="Educational cases for protecting the margin of error before committing capital."
        eyebrow="Risk control"
        note="The cases are illustrative and do not replace personalized financial, legal or regulatory analysis."
        title="Financial decision simulator"
        variant="educational"
      />
      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "An educational financial-decision simulator with cases about debt, referral-based products, real estate, ETFs and a family portfolio." },
        { label: "What it is for", value: "It helps practice decisions before putting money at risk and recognize liquidity, incentives, concentration, time frame and commercial pressure." },
        { label: "Limits", value: "The cases are illustrative. They do not recommend products, rate entities or replace personalized analysis." },
        { label: "Next step", value: "Use Money warning signs before reviewing a real proposal." },
      ]} />
      <InvestmentPractice locale="en" />
      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {protectionItems.map((item) => (
          <Link key={item.href} href={item.href} className="estate-card group flex min-h-[13rem] min-w-0 flex-col rounded-[6px] border border-line p-5 transition hover:border-petrol">
            <h2 className="break-words text-2xl font-semibold text-ink [overflow-wrap:anywhere]">{item.title}</h2>
            <p className="mt-3 break-words text-sm leading-6 text-muted [overflow-wrap:anywhere]">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Open &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
