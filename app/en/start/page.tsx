import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Base",
    title: "Quick diagnostic",
    href: "/en/diagnostic",
    description: "Assess your starting point without saving answers.",
  },
  {
    label: "02",
    meta: "Cash flow",
    title: "Personal budget",
    href: "/en/budget",
    description: "Compare your current distribution with an ideal model and translate it into a realistic version.",
  },
  {
    label: "03",
    meta: "Next block",
    title: "Debt management",
    href: "/en/debt",
    description: "Expensive debt can compete with any uncertain investment. Organize cost, cash flow, and margin of safety.",
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
    description: "Realistic cases to practice decisions without putting money at risk.",
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
      intro="You do not need to start with z-scores, FedWatch, or quantitative models. You can begin with the essentials: understand your margin of error, spot obvious risks, and build a cleaner process."
      primaryCta={{ href: "/en/diagnostic", label: "Start quick diagnostic" }}
      secondaryCta={{ href: "/en/investor", label: "View investor mode" }}
      subtitle="A guided path for organizing decisions before jumping into metrics, models, or advanced reports."
      title="Start simple"
    />
  );
}
