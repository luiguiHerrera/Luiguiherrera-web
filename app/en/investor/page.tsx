import { EditorialPathPage } from "@/components/pathways/EditorialPathPage";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/investor");

const cards = [
  {
    label: "01",
    meta: "Regime",
    title: "Dashboard",
    href: "/en/dashboard",
    description: "Volatility, sector rotation, flows, and cross-readings in one structured view.",
  },
  {
    label: "02",
    meta: "Reports",
    title: "Reports",
    href: "/en/weekly-report",
    description: "Editorial read across regime, ETFs, sectors, volatility, flows, levels, and seasonality.",
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
    meta: "DRL",
    title: "TD3 research",
    href: "/en/research/td3",
    description: "Research on deep reinforcement learning under costs, cash, and statistical validation.",
  },
  {
    label: "06",
    meta: "Portfolio",
    title: "Portfolio fragility",
    href: "/en/portfolio-fragility",
    description: "Find capital and behavior concentration, run stress, and compare changes without uploading your portfolio.",
  },
];

export default function EnglishInvestorPage() {
  return (
    <EditorialPathPage
      actionLabel="Open"
      cards={cards}
      closingNote="Advanced tools help observe context and document process. Final judgment still depends on risk, criteria, and independent validation."
      eyebrow="Advanced path"
      heroChips={["Regime", "Reports", "Levels", "Hypotheses"]}
      heroVariant="executive"
      intro="This path gathers more advanced tools. They help observe context, compare hypotheses, and document process. They do not replace judgment, risk management, or independent validation."
      primaryCta={{ href: "/en/dashboard", label: "Open dashboard" }}
      secondaryCta={{ href: "/en/start", label: "Return to Start" }}
      subtitle="For exploring reports, metrics, statistical levels, trends, and quantitative research without turning them into automatic signals."
      title="Investor area"
    />
  );
}
