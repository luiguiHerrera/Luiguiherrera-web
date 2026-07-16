import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";

const cards = [
  {
    label: "01",
    meta: "Report",
    title: "Weekly report",
    href: "/en/weekly-report",
    description: "Editorial read across regime, ETFs, sectors, volatility, flows, levels, and seasonality.",
  },
  {
    label: "02",
    meta: "Regime",
    title: "Dashboard",
    href: "/en/dashboard",
    description: "Volatility, sector rotation, flows, and cross-readings in one structured view.",
  },
  {
    label: "03",
    meta: "Historical",
    title: "Statistical levels",
    href: "/en/statistical-levels",
    description: "Percentiles, z-scores, extensions, drawdowns, and seasonality to place price in context.",
  },
  {
    label: "04",
    meta: "Hypotheses",
    title: "Trends",
    href: "/en/trends",
    description: "Structural changes translated into editorial maps and observable vehicles.",
  },
  {
    label: "05",
    meta: "Quant",
    title: "Quant Lab",
    href: "/en/quant-lab",
    description: "TD3 performance context and quantitative process notes.",
  },
  {
    label: "06",
    meta: "DRL",
    title: "DRL research",
    href: "/en/research/td3",
    description: "Research on deep reinforcement learning under costs, cash, and statistical validation.",
  },
  {
    label: "07",
    meta: "Support",
    title: "Resources",
    href: "/en/resources",
    description: "Public tools and scripts to support the process.",
  },
];

export default function EnglishInvestorPage() {
  return (
    <EditorialPathPage
      actionLabel="Open"
      cards={cards}
      closingNote="Advanced tools help observe context and document process. Final judgment still depends on risk, criteria, and independent validation."
      eyebrow="Advanced path"
      intro="This path gathers more advanced tools. They help observe context, compare hypotheses, and document process. They do not replace judgment, risk management, or independent validation."
      primaryCta={{ href: "/en/weekly-report", label: "Read weekly report" }}
      secondaryCta={{ href: "/en/start", label: "Return to simple path" }}
      subtitle="For exploring reports, metrics, statistical levels, trends, and quantitative research without turning them into automatic signals."
      title="Investor mode"
    />
  );
}
