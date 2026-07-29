import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/start");

const cards = [
  {
    label: "01",
    meta: "Quick",
    title: "Quick diagnostic",
    href: "/en/diagnostic?mode=quick",
    description: "A compact read on horizon, liquidity, tolerance and key biases.",
  },
  {
    label: "02",
    meta: "Full",
    title: "Full diagnostic",
    href: "/en/diagnostic?mode=complete",
    description: "A deeper assessment across capacity, goals, behavior and consistency.",
  },
  {
    label: "03",
    meta: "Cash flow",
    title: "Personal budget",
    href: "/en/budget",
    description: "Organize income, expenses, protection, enjoyment, investing, and growth.",
  },
  {
    label: "04",
    meta: "Debt",
    title: "Debt management",
    href: "/en/debt",
    description: "Check whether your debt is competing with cash flow and your ability to invest.",
  },
  {
    label: "05",
    meta: "Practice",
    title: "Financial decision simulator",
    href: "/en/protection",
    description: "Short cases to train better questions before putting money at risk.",
  },
  {
    label: "06",
    meta: "Warnings",
    title: "Money warning signs",
    href: "/en/protect-your-money",
    description: "Warning signs before committing capital.",
  },
];

export default function EnglishStartPage() {
  return (
    <EditorialPathPage
      actionLabel="Open"
      cards={cards}
      closingNote="This path does not oversimplify the work. It orders the process: margin of error first, then protection, then context."
      eyebrow="Guided path"
      heroChips={["Diagnostic", "Cash flow", "Debt", "Protection"]}
      intro="You do not need to start with z-scores, FedWatch, or quantitative models. You can begin with the essentials: understand cash flow, debt, margin of error, and then think about investing."
      primaryCta={{ href: "/en/diagnostic?mode=quick", label: "Start diagnostic" }}
      secondaryCta={{ href: "/en/investor", label: "View investor mode" }}
      subtitle="A guided path for organizing diagnostics, budget, debt and protection before investing."
      title="Build the foundation"
      readingCard={<ReadingCard title="Reading card" items={[
        { label: "What it is", value: "A guided path to organize diagnostics, budget, debt, financial decisions and warning signs before investing." },
        { label: "What it is for", value: "It starts with personal context, cash flow, debt, margin of safety and judgment." },
        { label: "Limits", value: "It does not evaluate a full personal situation or replace financial, tax or legal advice." },
        { label: "Next step", value: "Start with the quick diagnostic, then move to the full diagnostic, budget, debt and protection." },
      ]} />}
    />
  );
}
