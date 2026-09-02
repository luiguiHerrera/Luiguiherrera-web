import Image from "next/image";
import Link from "next/link";
import { HomeDashboardPreview } from "@/components/home/HomeDashboardPreview";
import { TypewriterPrinciples } from "@/components/home/TypewriterPrinciples";
import { ToolCard } from "@/components/ui/ToolCard";
import { getHomeDashboardPreviewData } from "@/lib/dashboard/get-home-dashboard-preview-data";
import { getRouteMetadata } from "@/lib/seo/site";

const principles = [
  ["Understand the context", "Read the board before moving a piece."],
  ["Manage risk", "Protect the margin for error before seeking returns."],
  ["Decide with judgment", "Less reaction. More method."],
];

const entryways = [
  {
    title: "Read the market",
    label: "01",
    href: "/en/dashboard",
    description: "Regime, levels and context.",
  },
  {
    title: "My profile",
    label: "02",
    href: "/en/diagnostic",
    description: "Risk, horizon and capacity.",
  },
  {
    title: "Strategies",
    label: "03",
    href: "/en/research/td3",
    description: "Reproducible models and backtests.",
  },
  {
    title: "Financial simulator",
    label: "04",
    href: "/en/protection",
    description: "Decisions and margin for error.",
  },
  {
    title: "Trends",
    label: "05",
    href: "/en/trends",
    description: "Global shifts as hypotheses.",
  },
  {
    title: "Resources",
    label: "06",
    href: "/en/resources",
    description: "Public scripts and tools.",
  },
];

const homePathways = [
  {
    title: "Know yourself",
    href: "/en/start",
    label: "Path 01",
    domain: "Personal finance",
    description: "Risk, horizon and capacity before putting capital to work.",
  },
  {
    title: "Know the market",
    href: "/en/investor",
    label: "Path 02",
    domain: "Investing",
    description: "Regime, volatility, strategies and trends.",
  },
];

export const metadata = getRouteMetadata("/en");

export default async function EnglishHomePage() {
  const { regimeSummary, sectorRotation, vix, vixTermStructure } = await getHomeDashboardPreviewData();

  return (
    <div>
      <section className="estate-hero home-estate-hero relative overflow-hidden border-b border-line" data-home-hero>
        <div className="mx-auto grid min-h-[470px] max-w-7xl grid-cols-1 px-4 pb-48 pt-10 md:min-h-[650px] md:px-5 md:py-20 lg:grid-cols-[0.7fr_1fr] lg:items-center">
          <div className="relative z-20 max-w-2xl">
            <p className="mb-4 w-fit rounded-full border border-petrol/20 bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-petrol">
              Quant discipline for investors
            </p>
            <h1 className="home-estate-heading text-3xl font-semibold leading-[1.04] text-ink sm:text-4xl">
              Before investing, understand how the market breathes.
            </h1>
            <TypewriterPrinciples
              eyebrow="Process before impulse"
              phrases={["Decide with data and less noise.", "Understand the context.", "Manage risk."]}
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8 md:gap-4">
              <Link href="/en/dashboard" className="inline-flex min-h-11 w-full items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(11,52,54,0.14)] transition hover:bg-panel hover:text-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:w-auto md:px-5">
                Read the market
              </Link>
              <Link href="/en/diagnostic" className="inline-flex min-h-11 w-full items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:w-auto md:px-5">
                Start diagnostic
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 block h-48 w-full md:inset-y-0 md:h-auto md:w-full">
            <Image
              src="/images/hero-family-sculptural-ascent.png"
              alt="Family ascending together on a sculptural staircase in a luminous space."
              fill
              priority
              sizes="100vw"
              className="object-cover object-[68%_50%] opacity-45 sm:opacity-55 md:object-[50%_50%] md:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-paper/10 via-paper/45 to-paper md:bg-gradient-to-r md:from-paper md:via-paper/82 md:via-45% md:to-paper/10" />
            <div className="absolute inset-y-0 left-0 w-1/3 bg-paper/55 md:w-1/2 md:bg-paper/35" />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper" data-home-paths>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-9 md:px-5 md:py-11 lg:grid-cols-[0.34fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Two paths</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink">You and the market</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {homePathways.map((pathway) => (
              <Link key={pathway.href} href={pathway.href} className="estate-card group flex min-h-[11rem] flex-col rounded-[6px] border border-line p-5 transition hover:border-petrol focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{pathway.label}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brass">{pathway.domain}</p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink">{pathway.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{pathway.description}</p>
                <span className="mt-auto pt-5 text-sm font-semibold text-petrol transition group-hover:translate-x-0.5">Explore <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="patrimonial-band border-b border-line" data-home-philosophy>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 md:grid-cols-[0.35fr_1fr_0.95fr] md:items-start md:px-5 md:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Our philosophy</p>
          <h2 className="border-l-2 border-brass/55 pl-5 text-lg font-medium leading-7 text-ink md:text-2xl md:leading-8">
            Markets change quickly. Risk does too. The edge is organizing information before deciding.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(([title, text]) => (
              <div key={title} className="border-l border-petrol/25 pl-5">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeDashboardPreview
        locale="en"
        regimeSummary={regimeSummary}
        sectorRotation={sectorRotation}
        vix={vix}
        vixTermStructure={vixTermStructure}
      />

      <section className="warm-section" aria-labelledby="home-goals-en" data-home-goals>
        <div className="mx-auto max-w-7xl px-4 py-11 md:px-5 md:py-14">
          <h2 id="home-goals-en" className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">Explore by goal</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entryways.map((tool) => <ToolCard key={tool.href} {...tool} actionLabel="Explore" headingLevel="h3" />)}
          </div>
        </div>
      </section>
    </div>
  );
}
