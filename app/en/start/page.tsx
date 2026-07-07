import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Cash flow",
    title: "Personal budget",
    href: "/en/budget",
    description: "Organize income, expenses, protection, enjoyment, investing, and growth.",
  },
  {
    label: "02",
    meta: "Debt",
    title: "Debt management",
    href: "/en/debt",
    description: "Check whether your debt is competing with cash flow and your ability to invest.",
  },
  {
    label: "03",
    meta: "For investing",
    title: "Investment diagnostic",
    href: "/en/diagnostic",
    description: "Use it once your cash flow, debt, and margin for risk are clearer.",
  },
  {
    label: "04",
    meta: "Risk",
    title: "Protect your money",
    href: "/en/protect-your-money",
    description: "Warning signs before committing capital.",
  },
  {
    label: "05",
    meta: "Practice",
    title: "Investment practice",
    href: "/en/protection",
    description: "Short cases to train better questions before putting money at risk.",
  },
  {
    label: "06",
    meta: "Context",
    title: "Trends without hype",
    href: "/en/trends",
    description: "Use world changes as hypotheses, not as recommendations.",
  },
];

export default function EnglishStartPage() {
  return (
    <EditorialPathPage
      actionLabel="Open"
      cards={cards}
      closingNote="This path does not oversimplify the work. It orders the process: margin of error first, then protection, then context."
      eyebrow="Guided path"
      intro="You do not need to start with z-scores, FedWatch, or quantitative models. You can begin with the essentials: understand cash flow, debt, margin of error, and then think about investing."
      primaryCta={{ href: "/en/budget", label: "Organize budget" }}
      secondaryCta={{ href: "/en/investor", label: "View investor mode" }}
      subtitle="A guided path for organizing decisions before jumping into metrics, models, or advanced reports."
      title="Start simple"
    />
  );
}
