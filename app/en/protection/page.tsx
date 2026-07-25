import Link from "next/link";
import { InvestmentPractice } from "@/components/protection/InvestmentPractice";
import { ReadingCard } from "@/components/seo/ReadingCard";

const protectionItems = [
  { title: "Protect your money", href: "/en/protect-your-money", description: "Checklist, warning signs and filters before committing capital." },
  { title: "Cross-signal radar", href: "/en/dashboard", description: "The dashboard integrates regime signals to contrast context, stress and risk support." },
];

export default function EnglishProtectionPage() {
  return (
    <div className="mx-auto min-w-0 max-w-7xl overflow-hidden px-4 py-10 md:px-5 md:py-14">
      <section className="institutional-hero institutional-hero--educational px-5 py-7 md:px-7 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Risk control</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Protection</h1>
        <p className="mt-5 max-w-[calc(100vw-2rem)] break-words text-lg leading-8 text-muted [overflow-wrap:anywhere] md:max-w-3xl">
          Checklists and filters to protect the margin of error before committing capital.
        </p>
      </section>
      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "An educational financial-decision simulator with cases about debt, referral-based products, real estate, ETFs and a family portfolio." },
        { label: "What it is for", value: "It helps practice decisions before putting money at risk and recognize liquidity, incentives, concentration, time frame and commercial pressure." },
        { label: "Limits", value: "The cases are illustrative. They do not recommend products, rate entities or replace personalized analysis." },
        { label: "Next step", value: "Use the Protect your money checklist before reviewing a real proposal." },
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
