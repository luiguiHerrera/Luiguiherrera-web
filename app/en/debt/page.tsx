import { DebtPlanner } from "@/components/debt/DebtPlanner";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/debt");

export default function EnglishDebtPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Avalanche", "Snowball", "Cash flow", "Estimated cost"]}
        description="Estimate your debt costs, compare payment methods and check your monthly cash flow. Explore how different payments affect your liquidity."
        eyebrow="Educational tool"
        note="It does not save your data. The calculations are approximate and are meant to organize questions, not make automatic decisions."
        subtitle="Compare payment methods, costs and liquidity before deciding."
        title="Debt management"
        variant="educational"
      />

      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "An educational tool to compare debt, minimum payments, monthly cash flow, avalanche, snowball and extra payments." },
        { label: "What it is for", value: "It helps estimate which costs could be avoided by paying early and weigh them against the liquidity used and the uncertain return of other options." },
        { label: "Limits", value: "It does not replace financial, legal, tax or insolvency advice. Results depend on the data entered." },
        { label: "Next step", value: "After reviewing debt, move to the investor diagnostic or investor protection." },
      ]} />

      <DebtPlanner locale="en" />
    </div>
  );
}
