import { DebtPlanner } from "@/components/debt/DebtPlanner";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/debt");

export default function EnglishDebtPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Avalanche", "Snowball", "Cash flow", "Real cost"]}
        description="An uncertain investment does not always compete well against expensive debt. This tool estimates the real cost of your debt, compares payoff methods, and checks whether your monthly cash flow has enough margin."
        eyebrow="Educational tool"
        note="It does not save your data. The calculations are approximate and are meant to organize questions, not make automatic decisions."
        title="Debt management"
        variant="educational"
      />

      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "An educational tool to compare debt, minimum payments, monthly cash flow, avalanche, snowball and extra payments." },
        { label: "What it is for", value: "It helps see whether debt is manageable or fragile and whether investing competes against the certain return of paying expensive debt." },
        { label: "Limits", value: "It does not replace financial, legal, tax or insolvency advice. Results depend on the data entered." },
        { label: "Next step", value: "After reviewing debt, move to the investor diagnostic or investor protection." },
      ]} />

      <DebtPlanner locale="en" />
    </div>
  );
}
